// combat/damage.js — the ONLY place HP is reduced. dealDamage(src, tgt, amount, type, opts) → damage dealt.
// type: 'phys' (armor) | 'magic' (magicRes, blocked by magicImmune) | 'pure'. opts: {attackId, ability, silent, big}
function dealDamage(src, tgt, amt, type, o = {}) {
  if (!tgt || tgt.dead || isInvuln(tgt)) return 0;
  let d = amt;
  if (src && src.isIllusion) d *= src.illuOut;   // illusions: reduced damage dealt, extra damage taken (entities/illusions.js)
  if (tgt.isIllusion) d *= tgt.illuIn;
  if (tgt.isWard) { if (!o.attackId || !src || !src.isHero) return 0; d = 1; type = 'pure'; }   // wards: 1 HP per hero hit, immune to everything else
  else if (type === 'phys') d *= armorMult(tgt.armor);
  else if (type === 'magic') { if (hasState(tgt, 'magicImmune')) return 0; d *= 1 - (tgt.magicRes || 0); }
  if (tgt.dmgTakenPct) d *= 1 + tgt.dmgTakenPct / 100;
  if (type === 'magic' && tgt.mods.length && d > 0) d = absorbMagic(tgt, d);   // Pipe barrier
  if (d <= 0) return 0;
  tgt.hp -= d;
  if (G.god && tgt === G.player) tgt.hp = Math.max(1, tgt.hp);   // god mode: takes hits, never dies
  if (tgt.isNeutral && src) neutralHit(tgt, src);   // ai/neutral.js: camp aggro
  emit('damage', { src: src ? src.id : 0, srcKind: src ? src.kind : '', tgt: tgt.id, tgtKind: tgt.kind, amount: d, dtype: type, attackId: o.attackId || 0, ability: o.ability || '' });
  const P = G.player;
  if (src === P && !o.silent) addFloat(tgt, Math.round(d), type === 'phys' ? '#ffffff' : type === 'magic' ? '#82cfff' : '#ffe082', o.big ? 26 : (type === 'phys' ? 14 : 17));
  else if (tgt === P && !o.silent && d >= 1) addFloat(tgt, '-' + Math.round(d), '#ff6e6e', 13);
  const sh = ownerOf(src);   // summons / illusions credit their hero
  if (sh && tgt.isHero && sh.team !== tgt.team) { tgt.dmgBy[sh.id] = G.time; if (o.attackId && src.isHero) heroAggro(src, tgt); }
  if (sh && sh.isHero && isOwned(tgt) && sh.team !== tgt.team) tgt.lastHeroHit = G.time;   // Spirit Bear's Return
  if (tgt.mods.length) wakeOnDamage(tgt, src, o);   // sleep breaks on damage (abilities/cc.js)
  if (tgt.hp <= 0) { tgt.hp = 0; killUnit(tgt, src); }
  return d;
}
// magic damage barriers: modifier def.absorb === 'magic' with m.data.left (Pipe of Insight). Emits barrier{left}; removed when spent.
function absorbMagic(u, d) {
  for (const m of u.mods) if (m.def.absorb === 'magic' && m.data.left > 0) {
    const a = Math.min(d, m.data.left); m.data.left -= a; d -= a; emit('barrier', { unit: u.id, absorbed: a, left: m.data.left });
    if (m.data.left <= 0) m.t = 0;   // expires next modifier step
    if (d <= 0) break;
  }
  return d;
}
function killUnit(u, killer) {
  if (u.dead) return;
  if (u.isHero && G.god && u === G.player) { u.hp = 1; return; }
  if (u.isHero && !u.isIllusion && aegisSave(u)) return;   // entities/drops.js: Aegis reincarnation (no death, no bounty)
  interruptChannel(u, 'death');
  u.dead = true; u.target = null; u.atk = null; u.casting = null;
  for (const m of u.mods.slice()) if (m.def.onDeath) m.def.onDeath(u, m, killer);   // e.g. Track bounty
  for (const m of u.mods.slice()) removeModifier(u, m);
  emit('death', { unit: u.id, kind: u.kind, team: u.team, killer: killer ? killer.id : 0, name: u.name });
  const P = G.player;
  for (const x of units) if (x.target === u) x.target = null;
  if (u.isHero) { heroDeath(u, killer); return; }   // combat/kills.js
  if (u.isNeutral) { if (u.isRoshan) roshanDeath(u, killer); else neutralDeath(u, killer); return; }   // entities/roshan.js, entities/neutrals.js
  if (u.isCourier) { courierDeath(u, killer); return; }   // entities/courier.js
  if (u.isWard) { wardDeath(u, killer); return; }   // entities/wards.js
  if (isOwned(u)) { ownedDeath(u, killer); return; }   // entities/summons.js (summons + illusions)
  if (!u.isBuilding) {
    const kh = ownerOf(killer);   // last hits by summons / illusions count for their hero
    if (kh) {
      if (u.team !== kh.team) { kh.lh++; giveGold(u.gold, u, kh); }
      else { kh.dn++; if (kh === P) addFloat(u, '!', '#ffffff', 26, 1); }
    }
    shareXP(u.team, u.x, u.z, 16, u.xp * XP_MULT * (killer && killer.team === u.team ? 0.4 : 1));
    burst(u.x, 1, u.z, 8, u.team === RAD ? ['#9aa4ad', '#3fa34d'] : ['#3a2a2e', '#a32020'], 3, 0.7, 0.25, 2);
    corpses.push({ u, t: 0 });
    return;
  }
  setBlock(u.x, u.z, u.radius - 0.4, false);
  G.score[1 - u.team]++;
  burst(u.x, u.height * 0.5, u.z, 60, u.team === RAD ? ['#d8d2c0', '#3fa34d', '#7dffb0', '#888'] : ['#3a2f33', '#a32020', '#ff4a2a', '#222'], 9, 1.6, 0.6, 6);
  if (u.gold) for (const h of G.heroes) if (h.team !== u.team) giveGold(u.gold, h === P ? u : null, h);   // team bounty
  emit('buildingDestroyed', { unit: u.id, kind: u.kind, team: u.team, tier: u.tier || 0, lane: u.lane || null, name: u.name });
  if (u.team !== RAD) { msg(`我方摧毁了敌方${u.name}！` + (u.gold ? ` +${u.gold} 金` : ''), '#7cdc6a'); }
  else msg(`我方${u.name}被摧毁了！`, '#ff6b5b');
  if (u.kind === 'barracks') { G.superCreeps[1 - u.team][u.lane] = true; msg(`${u.team === RAD ? '敌方' : '我方'}${LANE_CN[u.lane]}将出现超级兵！`, '#ffd54f'); }
  corpses.push({ u, t: 0, building: true });
  if (u.kind === 'ancient') endGame(u.team !== RAD);
}
