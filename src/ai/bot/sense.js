// ai/bot/sense.js — perception for bots: nearby heroes/creeps/towers, lane progress, power estimates.
// Bots use their OWN TEAM's vision only (canSee: fog of war + invisibility); enemy heroes seen recently are remembered
// for BOT_MEMORY seconds (s.ghosts: last-seen position and power) for retreat / danger estimates, never as targets.
// lane progress s (0 = own ancient … lane length = enemy ancient) of a world point for a team
function laneS(lane, team, x, z) {
  const L = lanes[lane]; let best = 1e9, bs = 0;
  for (let i = 1; i < L.pts.length; i++) {
    const a = L.pts[i - 1], b = L.pts[i], vx = b.x - a.x, vz = b.z - a.z, sl = L.cum[i] - L.cum[i - 1];
    const t = clamp(((x - a.x) * vx + (z - a.z) * vz) / (sl * sl), 0, 1), d = Math.hypot(x - a.x - vx * t, z - a.z - vz * t);
    if (d < best) { best = d; bs = L.cum[i - 1] + sl * t; }
  }
  return team === RAD ? bs : L.len - bs;
}
const isCreep = u => u.kind === 'melee' || u.kind === 'ranged';
const BOT_MEMORY = 3;
function sense(h, R = 24) {
  const s = { foes: [], allies: [], ecreeps: [], acreeps: [], etowers: [], atowers: [], ghosts: [] };
  for (const u of units) {
    if (u.dead || u === h || (u.team !== h.team && !canSee(h.team, u))) continue;
    const d = dst(h, u);
    if (u.isHero) { if (d <= R) (u.team === h.team ? s.allies : s.foes).push(u); }
    else if (isCreep(u)) { if (d <= 18) (u.team === h.team ? s.acreeps : s.ecreeps).push(u); }
    else if (u.kind === 'tower' && d <= 32) (u.team === h.team ? s.atowers : s.etowers).push(u);
  }
  s.hpPct = h.hp / h.maxHp;
  const b = h.bot;
  if (b) {
    b.mem = b.mem || {};
    for (const f of s.foes) b.mem[f.id] = { x: f.x, z: f.z, t: G.time, p: heroPower(f), u: f };
    for (const id in b.mem) { const m = b.mem[id]; if (G.time - m.t > BOT_MEMORY || m.u.dead) { delete b.mem[id]; continue; }
      if (m.t < G.time && Math.hypot(m.x - h.x, m.z - h.z) <= R) s.ghosts.push(m); }
  }
  return s;
}
// rough fighting strength: effective HP × DPS proxy (+ spells available)
function heroPower(h) {
  if (h.dead) return 0;
  const dps = (h.dmgMin + h.dmgMax) / 2 / h.atkInterval;
  let spells = 0; for (const a of h.abilities) if (a.lvl && !a.def.passive && a.cd <= 0 && h.mana >= (lvVal(a.def, 'mana', a.lvl) || 0)) spells += a.def.ult ? 2 : 1;
  return (h.hp / 600) * (dps / 40 + spells * 0.5 + 0.5) * (hasState(h, 'stunned') || h.hexed ? 0.3 : 1);
}
const knownFoe = (h, u) => canSee(h.team, u) || !!(h.bot && h.bot.mem && h.bot.mem[u.id]);
const groupPower = (list, x, z, r) => list.reduce((a, u) => a + (Math.hypot(u.x - x, u.z - z) <= r ? heroPower(u) : 0), 0);
// is position (x,z) inside an enemy tower's attack range (+pad)?
function enemyTowerAt(team, x, z, pad = 1.5) {
  for (const t of units) if (!t.dead && t.team !== team && (t.kind === 'tower' || t.kind === 'fountain') && Math.hypot(t.x - x, t.z - z) <= t.range + t.radius + pad) return t;
  return null;
}
// is a tower "tanked" by our creeps (they are in its range, so it will shoot them first)?
const towerTanked = (t, team) => units.some(u => !u.dead && u.team === team && isCreep(u) && inRange(t, u, t.range));
const disabledFor = u => { let m = 0; for (const x of u.mods) if (x.def.states && (x.def.states.includes('stunned') || x.def.states.includes('hexed') || x.def.states.includes('rooted'))) m = Math.max(m, x.t); return m; };
