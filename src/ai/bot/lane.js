// ai/bot/lane.js — laning: stand behind own creep wave, stay out of enemy tower aggro, last-hit / deny, push structures.
// lane structures of a team, as [{u, s}] sorted by progress (s in the *viewer's* lane coordinates)
function laneStructs(lane, ownerTeam, viewTeam) {
  const out = [];
  for (const u of units) if (!u.dead && u.isBuilding && u.team === ownerTeam && u.lane === lane) out.push({ u, s: laneS(lane, viewTeam, u.x, u.z) });
  return out.sort((a, b) => a.s - b.s);
}
// where a laning bot wants to stand
function lanePos(h, b) {
  const lane = b.lane, team = h.team;
  let front = -1;
  for (const u of units) if (!u.dead && isCreep(u) && u.team === team && u.lane === lane) { const v = laneS(lane, team, u.x, u.z); if (v > front) front = v; }
  const own = laneStructs(lane, team, team), en = laneStructs(lane, 1 - team, team);
  const ownS = own.length ? own[own.length - 1].s : 18, et = en.length ? en[0] : null;
  let s = front >= ownS - 6 ? front - (h.proj ? 5 : 2.5) : ownS - 3;
  if (et && et.u.kind === 'tower' && s > et.s - 17.5 && !(towerTanked(et.u, team) && et.u.target !== h)) s = et.s - 17.5;
  b.front = front; b.enemyStruct = et; b.ownS = ownS;
  return placeOnLane(lane, team, Math.max(8, s), b.off);
}
function botMove(h, x, z) {
  const o = h.order;
  if ((o.type === 'move' && Math.hypot(o.x - x, o.z - z) < 1.5) || Math.hypot(h.x - x, h.z - z) < 1.2) return;
  issueOrder(h, { type: 'move', x, z });
}
function botAttack(h, t) { if (h.order.type !== 'attack' || h.order.target !== t) issueOrder(h, { type: 'attack', target: t }); }
// best last-hit / deny target: a creep that our next attack will kill when it lands
function lastHitTarget(h, b, s) {
  if (Math.random() < b.d.lhMiss) return null;
  let best = null, bp = 1e9;
  for (const c of s.ecreeps.concat(s.acreeps)) {
    const deny = c.team === h.team; if (deny && c.hp >= c.maxHp * 0.5) continue;
    const ed = edgeDist(h, c); if (ed > h.range + 6) continue;
    const tw = enemyTowerAt(h.team, c.x, c.z, 0.5); if (tw && (tw.target === h || !towerTanked(tw, h.team))) continue;
    const dmg = h.dmgMin * armorMult(c.armor) * b.d.lhMargin;
    const tt = Math.max(0, ed - h.range) / h.speed + h.atkPoint / h.atkSpeedMult + (h.proj ? Math.max(0, ed) / h.proj : 0) + Math.max(0, h.atkCd);
    let inc = 0;
    for (const u of units) if (!u.dead && u !== h && u.team !== c.team && (u.target === c || (u.atk && u.atk.target === c))) inc += (u.dmgMin + u.dmgMax) / 2 * armorMult(c.armor) / u.atkInterval;
    const pred = c.hp - inc * tt;
    if (pred <= dmg && pred < bp) { bp = pred; best = c; }
  }
  return best;
}
// attackable enemy structure near the lane front (pushing)
function pushTarget(h, b, s) {
  let best = null, bd = 1e9;
  for (const u of units) {
    if (u.dead || !u.isBuilding || u.team === h.team || u.kind === 'fountain' || isInvuln(u)) continue;
    const d = dst(h, u); if (d > 30 || d >= bd) continue;
    if (u.kind === 'tower' && u.target === h && !towerTanked(u, h.team) && s.hpPct < 0.8) continue;
    best = u; bd = d;
  }
  return best;
}
function botLane(h, b, s) {
  if (h.atk && h.atk.phase === 'windup') return 'lane';
  // pushed into enemy tower aggro without creep cover → step out
  const tw = enemyTowerAt(h.team, h.x, h.z, 1.5);
  if (tw && (tw.target === h || !towerTanked(tw, h.team))) { const p = lanePos(h, b); botMove(h, p.x, p.z); return 'lane'; }
  const lh = lastHitTarget(h, b, s); if (lh) { botAttack(h, lh); return 'lane'; }
  // a creep will be last-hittable soon: walk into attack range and wait for it
  const soon = s.ecreeps.filter(c => c.hp < h.dmgMin * armorMult(c.armor) * 2.2 && edgeDist(h, c) > h.range && edgeDist(h, c) < h.range + 7 && !enemyTowerAt(h.team, c.x, c.z, 0.5)).sort((a, c) => a.hp - c.hp)[0];
  if (soon) { const d = AB.dir(h, soon), k = edgeDist(h, soon) - h.range + 0.4; botMove(h, h.x + d.x * k, h.z + d.z * k); return 'lane'; }
  const pushing = !s.foes.length && (G.time > 480 || (b.enemyStruct && b.front > b.enemyStruct.s - 16));
  if (pushing) {
    if (botCastOnCreeps(h, b, s)) return 'push';
    const c = s.ecreeps.filter(c => edgeDist(h, c) <= h.range + 4).sort((a, c2) => a.hp - c2.hp)[0];
    if (c) { botAttack(h, c); return 'push'; }
    const t = pushTarget(h, b, s); if (t && (t.kind !== 'tower' || towerTanked(t, h.team) || s.hpPct > 0.7)) { botAttack(h, t); return 'push'; }
  }
  // harass the enemy laner
  const f = s.foes.find(f => edgeDist(h, f) <= h.range + 0.5);
  if (f && Math.random() < b.d.aggr * 0.12 && !enemyTowerAt(h.team, f.x, f.z, 0) && s.ecreeps.filter(c => dst(c, h) < 9).length <= 2) { botAttack(h, f); return 'harass'; }
  const p = lanePos(h, b); botMove(h, p.x, p.z);
  if (Math.hypot(h.x - p.x, h.z - p.z) < 1.3 && h.order.type !== 'stand') issueOrder(h, { type: 'stand' });
  return 'lane';
}
