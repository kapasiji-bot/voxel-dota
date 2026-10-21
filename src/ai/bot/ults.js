// ai/bot/ults.js — bot rules for "big" spells that the generic rotation (abilities.js) must not waste:
//   ai.ultAoe {radius: value key | number, min: heroes, units?: alt. count of enemy units incl. creeps}: only when enough enemy heroes
//     are clustered (Black Hole / Echo Slam / Chain Frost), or a single hero is killable-low and alone.
//   ai.channelWard: Death Ward — channel only when safe (HP > 50 %, nobody on top of us) with an enemy hero in reach.
//   ai.allyBuff: ally-target buff (Frost Shield) on an ally hero / own tower under attack.
//   ai.toggle: 'heal' — Voodoo Restoration on while hurt allies are near and mana allows, off otherwise.
//   botKeepChannel: generic channel management — keep channelling while it still hits something; stop an AoE channel with no
//     enemy heroes inside for ~1.2 s; break off when in danger unless ai.commit (Black Hole).
const ultRadius = (ab, ai) => typeof ai.radius === 'number' ? ai.radius : lvVal(ab.def, ai.radius || 'radius', ab.lvl) || 6;
function heroesNear(list, x, z, r) { return list.filter(f => f.isHero && Math.hypot(f.x - x, f.z - z) <= r).length; }
function botBigSpells(h, b, s) {
  if (Math.random() > b.d.react) return false;
  for (let slot = 0; slot < h.abilities.length; slot++) {
    const ab = h.abilities[slot], ai = ab.def.ai || {}; if (!castReady(h, ab)) continue;
    if (ai.ultAoe) {
      const r = ultRadius(ab, ai.ultAoe), min = ai.ultAoe.min || 2, tgt = ab.def.target, range = castRange(h, ab);
      const near = s.foes.filter(f => !f.dead && dst(f, h) < (tgt === 'none' ? r : range + r));
      let best = null, bn = 0;
      for (const f of near) {
        const c = tgt === 'none' ? h : f, n = heroesNear(near, c.x, c.z, r * 0.85), cr = s.ecreeps.filter(e => dst(e, c) <= r).length;
        const score = n + (ai.ultAoe.units && cr + n * 2 >= ai.ultAoe.units ? 1 : 0);
        if (tgt === 'none' && dst(f, h) > r * 0.85) continue;
        if (tgt !== 'none' && dst(f, h) > range + 1) continue;
        if (score > bn) { bn = score; best = f; }
      }
      const lone = best && bn < min && best.hp / best.maxHp < 0.3 && s.foes.length === 1 && h.level >= 6;
      if (!best || (bn < min && !lone)) continue;
      emit('botUlt', { unit: h.id, ability: ab.def.id, heroes: bn });
      if (tgt === 'none') return !orderCast(h, slot, null);
      if (tgt === 'unit') return !orderCast(h, slot, best);
      // point: centroid of the heroes around the best one
      const g = near.filter(f => dst(f, best) <= r); const x = g.reduce((a, f) => a + f.x, 0) / g.length, z = g.reduce((a, f) => a + f.z, 0) / g.length;
      return !orderCast(h, slot, AB.clampPoint(h, { x, z }, range));
    }
    if (ai.allyBuff) {   // Frost Shield: an ally hero (or our tower) that enemies are hitting
      const range = castRange(h, ab) + 2, hitBy = u => units.some(e => !e.dead && e.team !== h.team && e.atk && e.atk.target === u);
      const t = [h, ...s.allies].filter(u => !u.dead && dst(u, h) <= range && u.hp < u.maxHp * 0.85 && hitBy(u))[0]
        || units.find(u => !u.dead && u.kind === 'tower' && u.team === h.team && dst(u, h) <= range && s.foes.some(f => f.atk && f.atk.target === u));
      if (t) return !orderCast(h, slot, t);
      continue;
    }
    if (ai.globalDisable) {   // Global Silence: ≥ min enemy heroes fighting our team (near any of our heroes), or a kill chance
      const near = G.heroes.filter(e => e.team !== h.team && !e.dead && knownFoe(h, e) && G.heroes.some(a => a.team === h.team && !a.dead && dst(a, e) < 14));
      if (near.length < (ai.globalDisable.min || 2) && !(near.length && near[0].hp / near[0].maxHp < 0.25)) continue;
      emit('botUlt', { unit: h.id, ability: ab.def.id, heroes: near.length }); return !orderCast(h, slot, null);
    }
    if (ai.channelWard) {
      const reach = lvVal(ab.def, 'reach', ab.lvl) || 12, t = s.foes.filter(f => f.isHero && dst(f, h) < reach + 3).sort((a, c) => a.hp - c.hp)[0];
      if (!t || s.hpPct < 0.5 || s.foes.some(f => dst(f, h) < 4) || s.foes.length > s.allies.length + 2) continue;
      const d = AB.dir(h, t); emit('botUlt', { unit: h.id, ability: ab.def.id, heroes: 1 });
      return !orderCast(h, slot, { x: h.x + d.x * 2, z: h.z + d.z * 2 });
    }
  }
  return false;
}
function botToggles(h, b, s) {
  for (const ab of h.abilities) {
    const ai = ab.def.ai || {}; if (!ab.def.toggle || ab.lvl === 0 || ai.toggle !== 'heal') continue;
    const r = lvVal(ab.def, 'radius', ab.lvl) || 7, on = isToggled(h, ab.def.id);
    const hurt = units.some(u => !u.dead && u.team === h.team && (u.isHero || u.isSummon) && dst(u, h) <= r && u.hp < u.maxHp * (on ? 0.95 : 0.8));
    const want = hurt && h.mana > h.maxMana * (on ? 0.12 : 0.3);
    if (want !== on && !canCast(h, ab)) { executeCast(h, ab, null); return true; }   // instant, no cast point (castPoint 0)
  }
  return false;
}
// true → keep channelling (caller returns), false → channel was stopped / we should act
function botKeepChannel(h, b, s) {
  const ch = h.channel, d = ch.ab.def, ai = d.ai || {};
  if (s.hpPct < b.d.retreat * 0.7 && !ai.commit) { botRetreat(h, b, s); return false; }
  if (d.item) return true;
  const r = lvVal(d, 'radius', ch.ab.lvl) || lvVal(d, 'reach', ch.ab.lvl) || 0;
  if (r && !(ch.target && ch.target.id)) {
    const c = ch.data.x !== undefined ? ch.data : ch.data.ward || h;
    const any = s.foes.some(f => f.isHero && Math.hypot(f.x - c.x, f.z - c.z) <= r + 1);
    ch.data.idle = any ? 0 : (ch.data.idle || 0) + b.d.tick;
    if (ch.data.idle > 1.2) { emit('botChannelStop', { unit: h.id, ability: d.id }); issueOrder(h, { type: 'stand' }); return false; }
  }
  return true;
}
