// ai/bot/jungle.js — B8/B10 bot jungle behaviour (botJungle is called from brain.js after the fight check, before lane play):
//   botLoot — Aegis for the team's carry (aegisTaker), Cheese for the carry if it has no Aegis, else a support (cheeseTaker).
//   botTeam (teamexec.js) — the team plan: Roshan (B10: called by team.js; members gather at the pit opening, enter together
//     when ≥ 3 are there or after 20 s, commit until Roshan dies unless team.js aborts on danger), group push, defend, ganks.
//   botFarm — carries / tanks (level ≥ 5, from 4:00) farm their own side's camps while no enemy hero is seen and HP > 55 %:
//     a session lasts ≤ 45 s (then ≥ 25 s laning), camps sized to the hero (large ≥ 7, ancient ≥ 11), one bot per camp.
// Mode names: 'farm', 'roshan', 'gather', 'aegis'. Stats: b.farmT (s spent farming), b.roshHits.
const ROSH_DOOR = () => ({ x: PIT.x + PIT.dx * (PIT.ring + 2.5), z: PIT.z + PIT.dz * (PIT.ring + 2.5) });
const roshCallFor = team => { const p = teamPlan(team); return p.mode === 'roshan' ? p : null; };
const nearPit = team => G.heroes.filter(h => h.team === team && !h.dead && h.bot && dst(h, PIT) < 26);
function aegisTaker(team) { return nearPit(team).sort((a, c) => (botRole(c) === 'carry') - (botRole(a) === 'carry') || c.level - a.level)[0] || null; }
function cheeseTaker(team) {
  const hs = nearPit(team).filter(h => h.items.indexOf(null) >= 0 && !countItem(h, 'cheese'));
  const pref = h => (botRole(h) === 'carry' && !countItem(h, 'aegis') ? 2 : botRole(h) === 'support' ? 1 : 0);
  return hs.sort((a, c) => pref(c) - pref(a) || c.level - a.level)[0] || null;
}
function botLoot(h, b) {
  for (const d of drops) {
    if (dst(h, d) > 26 || (d.item === 'aegis' ? aegisTaker(h.team) : cheeseTaker(h.team)) !== h) continue;
    if (h.order.type !== 'pickup' || h.order.drop !== d) issueOrder(h, { type: 'pickup', drop: d });
    return 'aegis';
  }
  return null;
}
function botRoshanGo(h, b, s, c) {
  if (s.foes.length) return null;   // fight first (brain.js already handled visible enemies in range)
  const R = rosh().unit, door = ROSH_DOOR(); if (!R || R.dead) return null;
  if (!c.go) {
    const here = c.members.map(unitById).filter(m => m && !m.dead && (dst(m, door) < 8 || inPit(m.x, m.z)));
    if (here.length >= 3 || G.time - c.t0 > 20) c.go = true;
  }
  if (!c.go) { botMove(h, door.x + b.off, door.z - b.off); return 'gather'; }
  b.roshHits = (b.roshHits || 0) + 1;
  if (canSee(h.team, R)) botAttack(h, R); else botMove(h, PIT.x + b.off, PIT.z - b.off);   // the cliff ring blocks vision until inside
  return 'roshan';
}
const FARM_LEVEL = { small: 5, medium: 5, large: 7, ancient: 11 };
function campTaken(c, h) { return G.heroes.some(o => o !== h && o.team === h.team && o.bot && !o.dead && o.bot.farmCamp === c); }
function pickCamp(h) {
  const J = jg(); let best = null, bd = 1e9;
  for (const c of J.camps) {
    if (c.side !== h.team || h.level < FARM_LEVEL[c.size] || campTaken(c, h) || !c.units.some(u => !u.dead)) continue;
    const d = dst(h, c) - (c.size === 'ancient' ? 10 : c.size === 'large' ? 5 : 0); if (d < bd) { bd = d; best = c; }
  }
  return best && bd < 60 ? best : null;
}
function botFarm(h, b, s) {
  const role = botRole(h);
  if (b.farmCamp && (s.foes.length || s.hpPct < 0.4 || G.time > b.farmUntil)) { b.farmCamp = null; b.farmCd = G.time + 25; return null; }
  if (!b.farmCamp) {
    if (role === 'support' || h.level < 5 || G.time < 240 || s.foes.length || s.hpPct < 0.55 || G.time < (b.farmCd || 0)) return null;
    if (s.ecreeps.length >= 2) return null;   // a wave to farm in lane first
    const c = pickCamp(h); if (!c) return null;
    b.farmCamp = c; b.farmUntil = G.time + 45; emit('botFarm', { unit: h.id, camp: c.id });
  }
  const c = b.farmCamp, foes = c.units.filter(u => !u.dead && dst(u, c) < 16);
  if (!foes.length) { b.farmCamp = pickCamp(h); if (!b.farmCamp) { b.farmCd = G.time + 25; return null; } return 'farm'; }
  b.farmT = (b.farmT || 0) + b.d.tick;
  const cur = h.atk && foes.includes(h.atk.target) ? h.atk.target : null, t = cur || foes.filter(u => canSee(h.team, u)).sort((a, c2) => a.hp - c2.hp)[0];
  if (t) botAttack(h, t); else botMove(h, c.x, c.z);
  return 'farm';
}
function botJungle(h, b, s) {
  return botLoot(h, b) || botTeam(h, b, s) || botFarm(h, b, s);   // loot → team plan (teamexec.js) → camps
}
