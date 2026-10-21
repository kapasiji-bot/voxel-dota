const BEAM_POOL = [];   // reusable additive beam meshes (bolts, tethers, Global Silence pillars)
// abilities/api.js — AB: helper toolkit for ability/item code (keeps hero files short and engine-agnostic).
const AB = {
  enemiesIn: (caster, x, z, r, o) => enemiesInRadius(caster.team, x, z, r, o),
  damage: (src, tgt, amt, type, ability, o = {}) => dealDamage(src, tgt, amt, type, Object.assign({ ability }, o)),
  stun: (tgt, src, dur) => (tgt.dead || hasState(tgt, 'magicImmune')) ? null : stunUnit(tgt, src, dur),
  kill: (tgt, src) => { if (!tgt.dead) { tgt.hp = 0; killUnit(tgt, src); } },
  addModifier, removeModifier, getMod, hasState, purgeDebuffs, delay, MODS,
  burst, ringP, spawnP, float: addFloat,
  dir(caster, pt) { const dx = pt.x - caster.x, dz = pt.z - caster.z, d = Math.hypot(dx, dz) || 1; return { x: dx / d, z: dz / d }; },
  // homing projectile with custom hit: {src, target, speed, color, size, trail, onHit(target)}
  projectile: o => fireProjectile(o.src, o.target, o),
  // travelling line wave. o: {caster, x, z, dir:{x,z}, len, speed, w0, w1, ability, onHit(u), colors, noFx (skip fire particles)}
  lineWave(o) {
    const hit = new Set(), c = o.caster, cols = o.colors || ['#ff3d00', '#ff6d00', '#ffab00', '#ffd740'];
    let trav = 0;
    effects.push({ update(dt) {
      const prev = trav; trav = Math.min(o.len, trav + o.speed * dt);
      const w = o.w0 + (o.w1 - o.w0) * trav / o.len;
      for (const u of units) {
        if (u.dead || u.team === c.team || u.isBuilding || hit.has(u)) continue;
        const rx = u.x - o.x, rz = u.z - o.z, p = rx * o.dir.x + rz * o.dir.z, lat = Math.abs(rx * o.dir.z - rz * o.dir.x);
        if (p >= prev - 1.5 && p <= trav + 0.5 && lat <= w / 2 + u.radius) { hit.add(u); o.onHit(u); }
      }
      const fx = o.x + o.dir.x * trav, fz = o.z + o.dir.z * trav;
      if (o.noFx) return trav >= o.len;
      for (let i = 0; i < 9; i++) { const l = rnd(-w / 2, w / 2); spawnP(fx - o.dir.z * l, rnd(0.4, 2.2), fz + o.dir.x * l, o.dir.x * rnd(2, 8), rnd(1, 4), o.dir.z * rnd(2, 8), rnd(0.4, 0.8), rnd(0.35, 0.8), cols[i % cols.length]); }
      spawnP(fx, 1.8, fz, o.dir.x * 3, 0, o.dir.z * 3, 0.15, 1.3, '#ffea00');
      return trav >= o.len;
    } });
  },
  // ground-targeted area that lands after a delay. o: {caster, x, z, radius, delay, onLand(unitsHit[]), colors}
  delayedArea(o) {
    const cols = o.colors || ['#ffd740', '#ffab00'];
    ringP(o.x, o.z, o.radius, 40, cols, o.delay + 0.05, 0.35, 0.2);
    ringP(o.x, o.z, o.radius * 0.5, 20, ['#fff59d'], o.delay + 0.05, 0.25, 0.2);
    delay(o.delay, () => o.onLand(enemiesInRadius(o.caster.team, o.x, o.z, o.radius)));
  },
  // instant visual beam between two points
  beam(ax, ay, az, bx, by, bz, color, thick, life) {
    const len = Math.hypot(bx - ax, by - ay, bz - az);
    const m = BEAM_POOL.pop() || (() => { const b = new T.Mesh(boxG, new T.MeshBasicMaterial({ transparent: true, opacity: 1, depthWrite: false, blending: T.AdditiveBlending })); scene.add(b); return b; })(), mat = m.material;   // B6: pooled
    mat.color.set(color); mat.opacity = 1; m.visible = true; m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); m.scale.set(thick, thick, len); m.lookAt(bx, by, bz);
    let t = 0;
    effects.push({ update(dt) { t += dt; const k = t / life; mat.opacity = Math.max(0, 1 - k); m.scale.x = m.scale.y = thick * (1 + Math.sin(t * 40) * 0.15) * (1 - k * 0.6); if (k >= 1) { m.visible = false; BEAM_POOL.push(m); return true; } return false; } });
  },
};
