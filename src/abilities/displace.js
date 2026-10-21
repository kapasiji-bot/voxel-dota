// abilities/displace.js — displacement and bouncing projectiles.
//   AB.pull(u, x, z, dist): move u up to `dist` toward (x, z) over walkable cells (Black Hole, Sinister Gaze). Cancels its attack/path.
//   AB.shove(u, dx, dz): instant offset to the nearest walkable spot (units standing where a Fissure wall rises).
//   AB.bounce(o): projectile that hops between units. o: {src, first, jumps, radius, speed, color, size, trail, delay,
//     rebounce (true: may return to the unit it came from — Chain Frost between 2 heroes; never hits the same unit twice in a row),
//     unique (true: never the same unit twice), filter(u), pick(cands, cur) → unit, onHit(u, n)}. Emits bounce {unit, target, n, ability}.
function displaceTo(u, nx, nz) {
  if (isWalk(nx, nz)) { u.x = nx; u.z = nz; return true; }
  if (isWalk(nx, u.z)) { u.x = nx; return true; }
  if (isWalk(u.x, nz)) { u.z = nz; return true; }
  return false;
}
Object.assign(AB, {
  pull(u, x, z, dist) {
    if (u.dead || u.isBuilding) return;
    const dx = x - u.x, dz = z - u.z, d = Math.hypot(dx, dz); if (d < 0.05) return;
    const s = Math.min(d, dist); u.path = null; if (u.atk) cancelAttack(u, 'pull');
    displaceTo(u, u.x + dx / d * s, u.z + dz / d * s); if (u.model) u.model.position.x = u.x, u.model.position.z = u.z;
  },
  shove(u, dx, dz) {
    for (let r = 1; r <= 4; r++) { const nx = u.x + dx * r, nz = u.z + dz * r; if (isWalk(nx, nz)) { u.x = nx; u.z = nz; u.path = null; return true; } }
    const c = nearestWalkCell(cellOf(u.x), cellOf(u.z)); if (c) { u.x = cc(c[0]); u.z = cc(c[1]); u.path = null; } return !!c;
  },
  bounce(o) {
    const hit = new Set(); let n = 0, prev = null;
    const fly = (from, t) => fireProjectile(o.src, t, { from, speed: o.speed || 20, color: o.color, size: o.size || 0.6, trail: o.trail, onHit(u) {
      hit.add(u); emit('bounce', { unit: o.src.id, target: u.id, n, ability: o.ability || '' }); o.onHit(u, n);
      if (++n >= o.jumps) return;
      const cands = enemiesInRadius(o.src.team, u.x, u.z, o.radius).filter(e => e !== u && !(o.unique && hit.has(e)) && (!o.filter || o.filter(e)) && (o.rebounce || e !== prev));
      prev = u; if (!cands.length) return;
      const next = o.pick ? o.pick(cands, u) : cands.sort((a, b) => (b.isHero - a.isHero) || dst(a, u) - dst(b, u))[0];
      const at = { x: u.x, z: u.z, height: u.height, model: u.model };
      if (o.delay) delay(o.delay, () => { if (!next.dead) fly(at, next); }); else fly(at, next);
    } });
    fly(o.from || o.src, o.first);
  },
});
