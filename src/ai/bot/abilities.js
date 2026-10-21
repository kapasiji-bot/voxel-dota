// ai/bot/abilities.js — generic spell usage driven by ability metadata (target type, values.dmg/dps/stun/radius, ult, channel).
// Optional per-ability hints in hero files: ai: { disable, selfAoe, global, finisher: '<value key>', mana (mana-drain style), skip,
//   killDmg(h, ab, t) → predicted damage (cast only as a kill), aoe: n (point AoE: wait for n heroes or a low target),
//   debuffId (don't re-apply), hpBelow (only on targets under this HP fraction), engage (gap closer / blink in),
//   escape: 'blink'|'invis'|'orb' (used by botEscape; nuke: true keeps it in the offensive rotation too), dodge (Phase Shift), reflect (Counterspell) }
const _abInfo = new Map();
function abilityInfo(def) {
  if (_abInfo.has(def)) return _abInfo.get(def);
  const v = def.values || {}, ai = def.ai || {};
  const i = { def, ai, passive: !!def.passive || !!ai.skip || !!def.toggle || !!ai.ultAoe || !!ai.channelWard || !!ai.allyBuff || !!ai.globalDisable || !!def.orb, tgt: def.target, ally: def.targetTeam === 'ally', ult: !!def.ult, channel: !!def.channel,
    dmg: v.dmg !== undefined || v.dps !== undefined, disable: !!(v.stun || ai.disable), global: !!ai.global, finisher: ai.finisher || null, mana: !!ai.mana };
  i.selfAoe = def.target === 'none' && (ai.selfAoe || (i.dmg && !i.global));
  i.special = !!((ai.escape && !ai.nuke) || ai.dodge || ai.reflect);   // never cast by the generic offensive rules (except engage); nuke: also offensive
  i.buff = def.target === 'none' && !i.selfAoe && !i.global && !i.special;
  _abInfo.set(def, i); return i;
}
function abDamage(h, ab) {
  const d = ab.def, v = k => lvVal(d, k, ab.lvl);
  const raw = v('dmg') !== undefined ? v('dmg') : v('dps') !== undefined ? v('dps') * (v('dur') || 3) : 0;
  return raw * 0.75;   // assume 25% magic resistance
}
// predicted position of u after t seconds (bots remember last-seen positions)
function predictPos(b, u, t) {
  const m = b.seen[u.id]; if (!m || !(G.time - m.t > 0)) return { x: u.x, z: u.z };
  const vx = (u.x - m.x) / (G.time - m.t), vz = (u.z - m.z) / (G.time - m.t), k = t * b.d.lead;
  return { x: u.x + vx * k, z: u.z + vz * k };
}
const aimErr = (b, p) => ({ x: p.x + rnd(-b.d.aimErr, b.d.aimErr), z: p.z + rnd(-b.d.aimErr, b.d.aimErr) });
const castReady = (h, ab) => ab.lvl > 0 && !canCast(h, ab);
// try to use a spell against hero `t` in a fight. Returns true if an order was issued.
function botCastOnHero(h, b, s, t, o = {}) {
  if (Math.random() > b.d.react) return false;
  const dist = dst(h, t), dis = disabledFor(t);
  const order = h.abilities.map((ab, slot) => ({ ab, slot, i: abilityInfo(ab.def) })).filter(o => !o.i.passive && castReady(h, o.ab))
    .sort((a, b2) => (b2.i.disable && dis < 0.4) - (a.i.disable && dis < 0.4) || a.i.ult - b2.i.ult);
  for (const { ab, slot, i } of order) {
    const d = ab.def, lv = k => lvVal(d, k, ab.lvl), range = castRange(h, ab);
    if (i.ally || (o.onlyDisable && !i.disable) || isRecast(h, ab)) continue;   // recasts (Puck jaunt) only from botEscape
    if (i.special) {   // gap closers: AM blink onto the target, BH shadow walk to approach unseen
      if (!i.ai.engage || o.onlyDisable || s.hpPct < 0.5 || dist < 7 || enemyTowerAt(h.team, t.x, t.z, 0)) continue;
      if (i.tgt === 'point') { if (dist > range + 1) continue; return !orderCast(h, slot, { x: t.x, z: t.z }); }
      if (i.tgt === 'none' && !isInvisible(h) && dist < 20) return !orderCast(h, slot, null);
      continue;
    }
    if (i.ai.debuffId && getMod(t, i.ai.debuffId)) continue;
    if (i.ai.hpBelow && t.hp / t.maxHp > i.ai.hpBelow) continue;
    if (i.ai.killDmg) { if (dist > range + 3 || t.hp > i.ai.killDmg(h, ab, t) * 0.9) continue; return !orderCast(h, slot, t); }
    if (i.disable && dis > 0.5 && !i.dmg) continue;               // don't overlap pure disables
    if (i.finisher) { if (t.hp > lv(i.finisher) || dist > range + 3) continue; return !orderCast(h, slot, t); }
    if (i.global) { if (G.heroes.some(e => e.team !== h.team && !e.dead && knownFoe(h, e) && e.hp < abDamage(h, ab) * 1.05) || t.hp / t.maxHp < 0.45) return !orderCast(h, slot, null); continue; }
    if (i.mana) { if (s.foes.length > 1 || (t.mana || 0) < 60 || h.mana > h.maxMana * 0.6 || dist > range) continue; return !orderCast(h, slot, t); }
    if (i.ult && i.dmg && !i.selfAoe && !i.ai.aoe && t.hp > abDamage(h, ab) * 1.15 + h.dmgMax * 2 && t.hp / t.maxHp > 0.4) continue;   // save ults for kills
    if (i.channel && i.selfAoe) { if (dist > (lv('radius') || 6) * 0.55 || (dis < 1 && s.foes.length < 2) || s.hpPct < 0.45) continue; return !orderCast(h, slot, null); }
    if (i.buff) { if (dist > Math.max(8, h.range + 4)) continue; return !orderCast(h, slot, null); }
    if (i.selfAoe) { if (dist > (lv('radius') || 5) * 0.8) continue; return !orderCast(h, slot, null); }
    if (i.tgt === 'unit') { if (dist > range + 3) continue; return !orderCast(h, slot, t); }
    const cp = (lv('castPoint') || 0.2) + (lv('delay') || 0) + (i.tgt === 'direction' ? dist / (lv('speed') || 30) : 0);
    const p = aimErr(b, predictPos(b, t, cp));
    if (i.tgt === 'point') {
      if (Math.hypot(p.x - h.x, p.z - h.z) > range + 1) continue;
      if (i.ai.aoe && t.hp / t.maxHp > 0.5 && s.foes.filter(f => Math.hypot(f.x - p.x, f.z - p.z) <= (lv('radius') || 5)).length < i.ai.aoe) continue;
      return !orderCast(h, slot, p);
    }
    if (i.tgt === 'direction') { if (dist > (lv('len') || 15) - 1) continue; return !orderCast(h, slot, p); }
  }
  return false;
}
// AoE nukes on a creep wave (pushing / farming) when mana is plentiful
function botCastOnCreeps(h, b, s) {
  if (s.ecreeps.length < 3 || h.mana < h.maxMana * 0.7 || Math.random() > b.d.react * 0.5) return false;
  for (let slot = 0; slot < h.abilities.length; slot++) {
    const ab = h.abilities[slot], i = abilityInfo(ab.def); if (i.passive || i.ult || !i.dmg || i.channel || !castReady(h, ab) || isRecast(h, ab)) continue;
    const r = lvVal(ab.def, 'radius', ab.lvl) || lvVal(ab.def, 'w1', ab.lvl) || 0; if (!r || i.tgt === 'unit') continue;
    const c = s.ecreeps.map(c => ({ c, n: s.ecreeps.filter(o => dst(o, c) <= r).length })).sort((a, b2) => b2.n - a.n)[0];
    if (c.n < 3) continue;
    if (i.selfAoe) { if (dst(h, c.c) > r * 0.7) continue; return !orderCast(h, slot, null); }
    if (i.tgt === 'point' && dst(h, c.c) > castRange(h, ab)) continue;
    if (i.tgt === 'direction' && dst(h, c.c) > (lvVal(ab.def, 'len', ab.lvl) || 15) - 2) continue;
    return !orderCast(h, slot, { x: c.c.x, z: c.c.z });
  }
  return false;
}
// escape abilities while retreating (hints ai.escape): blink / invisibility / orb + jaunt; Phase Shift as a last resort
function botEscape(h, b, s) {
  const near = s.foes.filter(f => dst(f, h) < 14); if (!near.length) return false;
  const sp = heroSpawn(h.team), d = AB.dir(h, sp);
  for (let slot = 0; slot < h.abilities.length; slot++) {
    const ab = h.abilities[slot], i = abilityInfo(ab.def); if (!castReady(h, ab)) continue;
    const e = i.ai.escape, far = lvVal(ab.def, 'range', ab.lvl) || lvVal(ab.def, 'len', ab.lvl) || 15;
    if (e === 'orb') {
      if (isRecast(h, ab)) { if (h._orb.trav > h._orb.len * 0.8) return !orderCast(h, slot, null); continue; }
      return !orderCast(h, slot, { x: h.x + d.x * far, z: h.z + d.z * far });
    }
    if (e === 'blink') return !orderCast(h, slot, { x: h.x + d.x * far, z: h.z + d.z * far });
    if (e === 'invis' && !isInvisible(h)) return !orderCast(h, slot, null);
    if (e === 'aoe' && !isRecast(h, ab) && near.filter(f => dst(f, h) < (lvVal(ab.def, 'radius', ab.lvl) || 8) * 0.8).length) return !orderCast(h, slot, null);   // Song of the Siren
    if (i.ai.dodge && s.hpPct < 0.3 && near.some(f => (f.atk && f.atk.target === h) || (f.casting && f.casting.target === h))) return !orderCast(h, slot, null);
  }
  return false;
}
// react to an enemy unit-target spell / attacks aimed at us: Counterspell reflect, Phase Shift dodge
function botReact(h, b, s) {
  const incoming = s.foes.some(f => f.casting && f.casting.target === h && f.casting.t < 0.35);
  const focused = s.foes.filter(f => f.atk && f.atk.target === h).length >= 2 && s.hpPct < 0.35;
  if (!incoming && !focused) return false;
  if (Math.random() > b.d.react) return false;
  for (let slot = 0; slot < h.abilities.length; slot++) {
    const ab = h.abilities[slot], i = abilityInfo(ab.def); if (!castReady(h, ab)) continue;
    if ((i.ai.reflect && incoming) || (i.ai.dodge && (incoming || focused))) return !orderCast(h, slot, null);
  }
  return false;
}
