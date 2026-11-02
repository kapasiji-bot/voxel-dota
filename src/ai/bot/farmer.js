// ai/bot/farmer.js — B12 QoL: reduce late-game empty lanes. While the team pushes or is free, leave one bot farming a
// safe lane (or TP back to an empty lane). Never peel off during Roshan / defend / retreat — those need the full squad.
// Assigned to the lowest-id non-support bot on the team (skip if they hold Aegis).
function emptyLane(team) {
  for (const lane of ['top', 'mid', 'bot']) {
    const t2 = units.find(u => !u.dead && u.kind === 'tower' && u.team === team && u.lane === lane && (u.tier || 0) >= 2)
      || units.find(u => !u.dead && u.kind === 'tower' && u.team === team && u.lane === lane);
    if (!t2) continue;
    if (!G.heroes.some(h => h.team === team && !h.dead && dst(h, t2) < 42)) return { lane, tower: t2 };
  }
  return null;
}
function botFarmer(h, b, s) {
  if (G.time < 720 || h.level < 8) return null;
  const p = teamPlan(h.team);
  if (!(p.mode === 'push' || p.mode === 'free')) return null;
  if (typeof countItem === 'function' && countItem(h, 'aegis')) return null;   // Aegis holder stays with the fight
  const cands = aliveBots(h.team).filter(x => botRole(x) !== 'support' && !(typeof countItem === 'function' && countItem(x, 'aegis'))).sort((a, c) => a.id - c.id);
  if (!cands.length || cands[0] !== h) return null;
  if (p.mode === 'push' && p.members && p.members.includes(h.id) && p.members.length <= 4) return null;
  const empty = emptyLane(h.team); if (!empty) return null;
  if (!b.farmLane || G.time > (b.farmUntil || 0)) { b.farmLane = empty.lane; b.farmUntil = G.time + 45; }
  const dest = empty.tower;
  if (dst(h, dest) > 50 && !s.foes.length && botTp(h, b, dest, 'lane')) return 'farm-tp';
  const creep = s.ecreeps.filter(c => c.lane === b.farmLane || dst(c, dest) < 28).sort((a, c) => a.hp - c.hp)[0];
  if (creep && creep.hp < h.dmgMax * 1.2) botAttack(h, creep);
  else botMove(h, dest.x + b.off * 3, dest.z - b.off * 3);
  return 'farm';
}
