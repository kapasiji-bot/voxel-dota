// combat/movement.js — stepping, wall sliding, hero navigation (A* + repath), soft unit separation.
function tryMove(u, nx, nz) {
  if (!isWalk(u.x, u.z)) { u.x = nx; u.z = nz; return true; }
  if (isWalk(nx, nz)) { u.x = nx; u.z = nz; return true; }
  if (isWalk(nx, u.z)) { u.x = nx; return true; }
  if (isWalk(u.x, nz)) { u.z = nz; return true; }
  return false;
}
// move toward (tx,tz); returns true when within `stop`. Sets u.moving only if the unit actually advanced
function moveStep(u, tx, tz, dt, stop = 0) {
  const dx = tx - u.x, dz = tz - u.z, d = Math.hypot(dx, dz);
  if (d <= stop + 0.01) return true;
  if (u.rooted) return false;   // rooted / stunned: can turn but not move
  const step = Math.min(u.speed * dt, d - stop), ox = u.x, oz = u.z;
  tryMove(u, u.x + dx / d * step, u.z + dz / d * step);
  u.moveDist = (u.moveDist || 0) + Math.hypot(u.x - ox, u.z - oz);
  u.facing = Math.atan2(dx, dz);
  return d - step <= stop + 0.02;
}
function heroNav(h, x, z, dt, stop) {
  if (Math.hypot(x - h.x, z - h.z) <= stop) { h.path = null; return true; }
  h.repathT -= dt;
  if (!h.path || h.repathT <= 0 || Math.hypot(h.pathGoal.x - x, h.pathGoal.z - z) > 1.5) {
    h.repathT = 0.4; h.pathGoal = { x, z };
    h.path = los(h.x, h.z, x, z) ? [{ x, z }] : (findPath(h.x, h.z, x, z) || [{ x, z }]);
  }
  const wp = h.path[0], last = h.path.length === 1;
  if (moveStep(h, wp.x, wp.z, dt, last ? stop : 0)) { if (last) { h.path = null; return true; } h.path.shift(); }
  return false;
}
function separate(dt) {
  const n = units.length;
  for (let i = 0; i < n; i++) {
    const a = units[i]; if (a.dead || a.isWard || a.flying) continue;   // couriers fly over everything
    for (let j = i + 1; j < n; j++) {
      const b = units[j]; if (b.dead || b.isWard || b.flying || (a.isBuilding && b.isBuilding)) continue;
      const dx = b.x - a.x, dz = b.z - a.z, r = a.radius + b.radius, dd = dx * dx + dz * dz;
      if (dd >= r * r || dd < 1e-6) continue;
      const d = Math.sqrt(dd), ov = r - d, nx = dx / d, nz = dz / d;
      if (a.isBuilding) tryMove(b, b.x + nx * ov, b.z + nz * ov);
      else if (b.isBuilding) tryMove(a, a.x - nx * ov, a.z - nz * ov);
      else {
        const k = Math.min(1, dt * 8) * ov, wa = a.isHero ? 0.25 : 0.5, wb = b.isHero ? 0.25 : 0.5;
        tryMove(a, a.x - nx * k * wa, a.z - nz * k * wa); tryMove(b, b.x + nx * k * wb, b.z + nz * k * wb);
      }
    }
  }
}
