// ai/bot/units.js — bots and their own units (generic, no per-hero code):
//   botSummon: cast abilities with ai.summon = '<summon type>' when we have none of that type (Nature's Call needs trees in range).
//   botUnits: every think tick, each owned summon / illusion attacks the bot's fight target, follows the bot when it retreats or
//   wanders off, otherwise push-type summons (sdef.push: treants, wolves) attack-move down the bot's lane in front of the creeps.
//   botFendUnits: an enemy summon / illusion hitting us while no hero fight is on gets attacked back.
function botSummon(h, b, s) {
  if (b.retreat || Math.random() > b.d.react) return false;
  for (let slot = 0; slot < h.abilities.length; slot++) {
    const ab = h.abilities[slot], ai = ab.def.ai || {}; if (!ai.summon || !castReady(h, ab)) continue;
    if (AB.owned(h, ai.summon).length && !(ai.summon === 'ld_bear' && AB.owned(h, 'ld_bear').some(x => x.hp < x.maxHp * 0.3 && dst(x, h) > 25))) continue;
    if (h.mana < (lvVal(ab.def, 'mana', ab.lvl) || 0) + 60 && s.foes.length) continue;   // keep mana for the fight
    if (ai.trees) { const t = treesNear(h.x, h.z, castRange(h, ab) + 2)[0]; if (!t) continue; return !orderCast(h, slot, { x: t.x, z: t.z }); }
    return !orderCast(h, slot, null);
  }
  return false;
}
function botUnits(h, b, s) {
  const list = ownedUnits(h, u => u.controllable); if (!list.length) return;
  const t = b.target && !b.target.dead && canSee(h.team, b.target) ? b.target : null;
  list.forEach((u, i) => {
    if (u.casting || u.channel) return;
    if (t && dst(u, t) < 26) { if (u.order.type !== 'attack' || u.order.target !== t) issueOrder(u, { type: 'attack', target: t }); return; }
    const d = dst(u, h), push = u.sdef && u.sdef.push && b.mode === 'lane' && !b.retreat;
    if (b.retreat || d > (push ? 34 : 14)) {   // regroup with the hero
      if (u.isSummon && u.type === 'ld_bear' && d > 30 && castReady(u, u.abilities[0]) && !u.lastHeroHit) { orderCast(u, 0, null); return; }
      const f = formation(i + 1, list.length + 1); if (u.order.type !== 'move' || Math.hypot(u.order.x - h.x - f.x, u.order.z - h.z - f.z) > 4) issueOrder(u, { type: 'move', x: h.x + f.x, z: h.z + f.z }); return;
    }
    if (push && b.front !== undefined) { const p = placeOnLane(b.lane, h.team, Math.max(10, (b.front > 0 ? b.front : laneS(b.lane, h.team, h.x, h.z)) + 5), (i - 1) * 1.5);
      if (u.order.type !== 'amove' || Math.hypot(u.order.x - p.x, u.order.z - p.z) > 5) issueOrder(u, { type: 'amove', x: p.x, z: p.z }); return; }
    if (d > 6 && u.order.type !== 'amove') { const f = formation(i + 1, list.length + 1); issueOrder(u, { type: 'amove', x: h.x + f.x, z: h.z + f.z }); }
  });
}
function botFendUnits(h, b, s) {
  if (b.retreat) return false;
  let best = null;
  for (const u of units) if (!u.dead && u.owner && u.team !== h.team && canSee(h.team, u) && dst(u, h) < 6 && u.atk && u.atk.target === h && (!best || u.hp < best.hp)) best = u;
  if (!best) return false; botAttack(h, best); return true;
}
