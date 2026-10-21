// ai/bot/teampush.js — B10 group push / siege for the team coordinator (team.js): pick the enemy structure to take
// (closest to the group, discounted where our lane creeps already are and for the ancient once attackable, penalised by
// known defenders), a rally point behind it on its lane, gather → siege, chain to the next structure, retreat together.
function pushTargets(team) { return units.filter(u => !u.dead && u.isBuilding && u.team !== team && u.kind !== 'fountain' && !isInvuln(u)); }
function pickPushTarget(team) {
  const hs = aliveBots(team); if (!hs.length) return null;
  const cx = hs.reduce((a, h) => a + h.x, 0) / hs.length, cz = hs.reduce((a, h) => a + h.z, 0) / hs.length;
  let best = null, bs = 1e9;
  for (const u of pushTargets(team)) {
    const creeps = units.some(c => !c.dead && c.team === team && isCreep(c) && dst(c, u) < 22);
    const sc = Math.hypot(u.x - cx, u.z - cz) - (creeps ? 22 : 0) - (u.kind === 'ancient' ? 60 : u.kind === 'barracks' ? 12 : 0) + knownEnemies(team, u.x, u.z, 22).length * 12;
    if (sc < bs) { bs = sc; best = u; }
  }
  return best;
}
function rallyFor(team, u) {
  if (u.lane) return placeOnLane(u.lane, team, Math.max(10, laneS(u.lane, team, u.x, u.z) - 19), 0);
  const f = G.fountains[team], d = Math.hypot(f.x - u.x, f.z - u.z) || 1;
  return { x: u.x + (f.x - u.x) / d * 18, z: u.z + (f.z - u.z) / d * 18 };
}
function startPush(team, go, why) {
  const t = pickPushTarget(team); if (!t) return setPlan(team, 'free', { cd: G.time + 20 });
  const p = setPlan(team, 'push', { target: t, rally: rallyFor(team, t), phase: go ? 'siege' : 'gather', go: !!go, why: why || (go ? 'won' : 'time') });
  if (go) emit('teamSiege', { team, target: t.id, n: p.members.length, won: true }); return p;
}
function pushTick(team, p, d, adv, mem) {
  if (!p.target) return startPush(team, true, p.why);
  const t = p.target;
  if (t.dead || isInvuln(t)) return mem.length >= 3 && groupHp(mem) > 0.5 ? startPush(team, mem.some(h => dst(h, t) < 25), 'chain') : setPlan(team, 'free', { cd: G.time + 25 });
  const foes = knownEnemies(team, t.x, t.z, 24), won = aliveHeroes(1 - team).length <= aliveHeroes(team).length - 2;
  const bad = (mem.length <= 1 && G.time - p.t0 > 8) || (mem.length && groupHp(mem) < 0.3) || (!won && foes.length && groupPower(foes, t.x, t.z, 24) > groupPower(mem, t.x, t.z, 400) * 1.6);
  if (bad) return setPlan(team, 'retreat', { until: G.time + 8, from: t });
  if (won && p.phase === 'gather') { p.phase = 'siege'; emit('teamSiege', { team, target: t.id, n: mem.length, won: true }); }   // enemies dead: convert the won fight now
  if (p.phase === 'gather') {
    const here = mem.filter(h => Math.hypot(h.x - p.rally.x, h.z - p.rally.z) < 14).length;
    if (here >= Math.min(3, mem.length) || G.time - p.t0 > 25) { p.phase = 'siege'; emit('teamSiege', { team, target: t.id, n: here }); }
  }
  if (G.time - p.t0 > 150) return setPlan(team, 'free', { cd: G.time + 30 });
  return p;
}
