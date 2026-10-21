// ai/bot/team.js — B10 team coordinator: one plan per team, re-evaluated every TEAM_TICK s (teamTick, from botTeam).
// Plan modes (priority order):
//   defend  — an important own structure (tier ≥ 2 / barracks / ancient) attacked by ≥ 2 enemy heroes: every bot goes there.
//   roshan  — committed until Roshan dies; aborts only on danger (known enemies near the pit stronger than us, < 2 members).
//   retreat — a push went bad (≤ 1 member left, low average HP, a stronger enemy group at the target): fall back together.
//   push    — mid/late game (diff.group s, earlier when ahead, at once after a won fight or Roshan): gather at a rally point
//             behind the target structure, then siege it (fights under the tower allowed); next structure while healthy.
//   free    — normal individual play (lane, farm, wards). Pick-offs (lone visible enemy hero) are assigned in teamexec.js.
// Started when: Roshan up, ≥ 3 bots of level ≥ 9 alive, (advantage or ≥ 15 min), enemies dead or not seen near the pit.
const TEAM_TICK = 1;
const plans = () => G.teamAI || (G.teamAI = [{ mode: 'free', next: 0 }, { mode: 'free', next: 0 }]);
const teamPlan = team => plans()[team];
const aliveBots = team => G.heroes.filter(h => h.team === team && h.bot && !h.dead);
const aliveHeroes = team => G.heroes.filter(h => h.team === team && !h.dead);
const teamDiff = team => { const b = aliveBots(team)[0] || G.heroes.find(h => h.team === team && h.bot); return b ? b.bot.d : DIFFS[1]; };
// enemy heroes the team knows about near a point: visible now, or remembered by any bot (≤ BOT_MEMORY s)
function knownEnemies(team, x, z, r) {
  const out = new Set();
  for (const e of G.heroes) if (e.team !== team && !e.dead && canSee(team, e) && Math.hypot(e.x - x, e.z - z) <= r) out.add(e);
  for (const h of G.heroes) if (h.team === team && h.bot && h.bot.mem) for (const id in h.bot.mem) { const m = h.bot.mem[id]; if (!m.u.dead && Math.hypot(m.x - x, m.z - z) <= r) out.add(m.u); }
  return [...out];
}
// advantage: alive heroes, kills, levels, structures, Aegis
function teamAdv(team) {
  const sum = (t, f) => G.heroes.filter(h => h.team === t).reduce((a, h) => a + f(h), 0), n = t => Math.max(1, G.heroes.filter(h => h.team === t).length);
  const lv = sum(team, h => h.level) / n(team) - sum(1 - team, h => h.level) / n(1 - team);
  return aliveHeroes(team).length - aliveHeroes(1 - team).length + (sum(team, h => h.kills) - sum(1 - team, h => h.kills)) / 8 + lv / 2
    + (G.score[team] - G.score[1 - team]) / 3 + (G.heroes.some(h => h.team === team && !h.dead && countItem(h, 'aegis')) ? 1 : 0);
}
function setPlan(team, mode, o = {}) {
  const P = plans(); P[team] = Object.assign({ mode, t0: G.time, next: G.time + TEAM_TICK, members: G.heroes.filter(h => h.team === team && h.bot).map(h => h.id) }, o);   // dead bots join on respawn
  (G.teamLog || (G.teamLog = [])).push({ t: Math.round(G.time), team, mode, target: o.target ? o.target.name : '' });
  emit('teamPlan', { team, mode, target: o.target ? o.target.id : 0, n: P[team].members.length });
  if (mode === 'roshan') emit('roshCall', { team, n: P[team].members.length });
  return P[team];
}
const groupHp = hs => hs.length ? hs.reduce((a, h) => a + h.hp / h.maxHp, 0) / hs.length : 0;
const members = p => (p.members || []).map(unitById).filter(h => h && !h.dead && h.bot && !h.bot.retreat);
function threatened(team) {
  for (const u of units) {
    if (u.dead || !u.isBuilding || u.team !== team || u.kind === 'fountain' || u.hp >= u.maxHp * 0.97) continue;
    if (!(u.kind === 'ancient' || u.kind === 'barracks' || (u.tier || 0) >= 2)) continue;
    if (knownEnemies(team, u.x, u.z, 18).length >= 2) return u;
  }
  return null;
}
function roshReady(team, adv, d) {
  const R = rosh().unit; if (!R || R.dead) return false;
  const able = aliveBots(team).filter(h => h.level >= 9 && !h.bot.retreat), eAlive = aliveHeroes(1 - team).length;
  if (able.length < 3 || !(adv >= 2 || G.time >= d.rosh)) return false;
  return eAlive <= 2 || knownEnemies(team, PIT.x, PIT.z, 40).length === 0;
}
function teamTick(team) {
  let p = teamPlan(team); if (G.time < p.next) return p; p.next = G.time + TEAM_TICK;
  const d = teamDiff(team), adv = teamAdv(team), mem = members(p);
  const thr = threatened(team);
  if (thr) return p.mode === 'defend' && p.target === thr ? p : setPlan(team, 'defend', { target: thr });
  if (p.mode === 'defend') p = setPlan(team, 'free', { cd: G.time + 5 });
  if (p.mode === 'roshan') {
    const R = rosh().unit, near = knownEnemies(team, PIT.x, PIT.z, 28);
    if (!R || R.dead) return setPlan(team, 'push', { go: true, why: 'aegis' });   // follow-up push with the Aegis
    const ep = groupPower(near, PIT.x, PIT.z, 28), mp = groupPower(mem, PIT.x, PIT.z, 400);
    if (mem.length >= 2 && (ep === 0 || ep < mp * 1.2)) return p;
    return setPlan(team, 'retreat', { until: G.time + 10 });
  }
  if (p.mode === 'retreat') { if (G.time < p.until) return p; p = setPlan(team, 'free', { cd: G.time + 15 }); }
  if (roshReady(team, adv, d)) return setPlan(team, 'roshan', {});
  if (p.mode === 'push') return pushTick(team, p, d, adv, mem);
  const won = aliveHeroes(1 - team).length <= aliveHeroes(team).length - 2 && aliveBots(team).length >= 3;
  if ((G.time >= (p.cd || 0) || won) && aliveBots(team).length >= 2 && (G.time >= d.group || (G.time >= d.group * 0.6 && adv >= 2) || (won && G.time >= 360)))
    return startPush(team, won);
  return p;
}
