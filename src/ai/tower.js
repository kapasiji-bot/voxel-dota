// ai/tower.js — towers & fountains: keep target while in range, otherwise nearest enemy (creeps strongly preferred over heroes).
function towerAI(u, dt) {
  let t = u.target;
  if (t && (t.dead || isInvuln(t) || !inRange(u, t, u.range) || !canSee(u.team, t))) t = u.target = null;
  if (!t) { u.acq -= dt; if (u.acq <= 0) { u.acq = 0.1; t = u.target = findEnemy(u, u.range, { noBuild: true, heroPen: 30 }); } }
  if (t && !u.atk) startAttack(u, t);
}
