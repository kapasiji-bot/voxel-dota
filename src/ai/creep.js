// ai/creep.js — lane creep behaviour: follow waypoints, acquire nearest enemy (units over buildings), attack; taunt forces target.
function creepAI(u, dt) {
  const tm = getMod(u, 'taunt');
  let t = tm ? tm.src : u.target;
  if (tm && t.dead) t = null;
  if (!tm) {
    if (t && t.isHero && u.aggroT && G.time - u.aggroT > 2.5) { t = u.target = null; u.aggroT = 0; }   // hero-attack aggro wears off
    if (t && (t.dead || isInvuln(t) || dst(u, t) > 16 || !canSee(u.team, t))) t = u.target = null;
    u.acq -= dt;
    if (u.acq <= 0) { u.acq = 0.25 + Math.random() * 0.15; if (!t || t.isBuilding) { const n = findEnemy(u, 9); if (n && (!t || !n.isBuilding)) t = u.target = n; } }
  }
  if (u.atk) { if (u.atk.target !== t && u.atk.phase === 'windup') cancelAttack(u, 'retarget'); else return; }   // stand still while swinging
  if (t) { if (inRange(u, t, u.range)) startAttack(u, t); else moveStep(u, t.x, t.z, dt, 0); return; }
  const wp = u.wps[u.wp]; if (!wp) return;
  if (moveStep(u, wp.x, wp.z, dt, 1.0) && u.wp < u.wps.length - 1) u.wp++;
}
