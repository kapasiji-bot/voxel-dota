// ai/bot/teamexec.js — B10: what a bot does for its team plan (team.js) — called from botJungle after Aegis / Cheese loot and
// before camp farming; returns a mode name or null (free play). Also: pick-off ganks (b.gank) on a lone visible enemy hero
// (2–3 nearest free bots whose power beats it), the tower-dive allowance during a siege, and the TP destination.
function assignGank(team, d) {
  const T = teamPlan(team); if (G.time < 300 || G.time < (T.gankCd || 0) || Math.random() > d.gank) return;   // no ganks during the first 5 min of laning
  for (const e of G.heroes) {
    if (e.team === team || e.dead || !canSee(team, e) || enemyTowerAt(team, e.x, e.z, 2)) continue;
    if (knownEnemies(team, e.x, e.z, 20).length > 1) continue;
    const free = aliveBots(team).filter(h => !h.bot.retreat && !(h.bot.gank && G.time < h.bot.gank.until) && dst(h, e) < 32 && !(T.mode === 'roshan' && T.members.includes(h.id))).sort((a, c) => dst(a, e) - dst(c, e)).slice(0, 3);
    if (free.length < 2 || free.reduce((a, h) => a + heroPower(h), 0) < heroPower(e) * 1.4) continue;
    for (const h of free) h.bot.gank = { target: e, until: G.time + 12 };
    T.gankCd = G.time + 8; (G.teamGanks || (G.teamGanks = [0, 0]))[team]++; emit('teamGank', { team, target: e.id, n: free.length }); return;
  }
}
const inPlan = (h, p) => p.members && p.members.includes(h.id);
// siege: allowed to fight / stand under the target's tower when ≥ 2 allied heroes are with us
const teamDive = h => { const p = teamPlan(h.team); return p.mode === 'push' && p.phase === 'siege' && inPlan(h, p) && G.heroes.filter(a => a.team === h.team && !a.dead && dst(a, h) < 14).length >= 3; };
function teamDest(h) { const p = teamPlan(h.team); if (!inPlan(h, p) || !p.target) return null; return p.mode === 'push' ? (p.phase === 'gather' ? p.rally : p.target) : p.mode === 'defend' ? p.target : null; }
function botTeam(h, b, s) {
  const p = teamTick(h.team); if (h.bot === b && b.thinks % 5 === 0) assignGank(h.team, b.d);
  const g = b.gank;
  if (g && G.time < g.until && !g.target.dead && knownFoe(h, g.target)) { if (canSee(h.team, g.target)) botAttack(h, g.target); else { const m = b.mem[g.target.id]; botMove(h, m.x, m.z); } return 'gank'; }
  b.gank = null;
  if (!inPlan(h, p) || b.retreat) return null;
  if (p.mode === 'roshan') return botRoshanGo(h, b, s, p);
  if (p.mode === 'retreat') { const tw = units.filter(u => !u.dead && u.kind === 'tower' && u.team === h.team).sort((a, c) => dst(a, h) - dst(c, h))[0] || G.fountains[h.team]; if (s.hpPct < 0.5) b.retreat = true; botMove(h, tw.x + b.off, tw.z - b.off); return 'regroup'; }
  if (p.mode === 'defend') { if (dst(h, p.target) > 50 && !s.foes.length && botTp(h, b, p.target, 'defend')) return 'tp'; if (h.order.type !== 'amove' || dst(h.order, p.target) > 4) issueOrder(h, { type: 'amove', x: p.target.x, z: p.target.z }); return 'defend'; }
  if (p.mode !== 'push' || !p.target || !p.rally) return null;
  const dest = p.phase === 'gather' ? p.rally : p.target;
  if (dst(h, dest) > 55 && !s.foes.length && botTp(h, b, dest, 'group')) return 'tp';
  if (p.phase === 'gather') { botMove(h, p.rally.x + b.off * 2, p.rally.z - b.off * 2); return 'group'; }
  if (botCastOnCreeps(h, b, s)) return 'siege';
  const c = s.ecreeps.filter(c => edgeDist(h, c) <= h.range + 2).sort((a, c2) => a.hp - c2.hp)[0];
  if (c && (h.proj || s.ecreeps.length >= 3)) botAttack(h, c); else botAttack(h, p.target);
  return 'siege';
}
