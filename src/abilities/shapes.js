// abilities/shapes.js — B6 area shapes and targeting helpers for hero files:
//   AB.inCone(caster, x, z, dir, len, w0, w1) → enemies inside a trapezoid cone (width w0 at the caster, w1 at len)
//   AB.coneWave({caster, x, z, dir, len, w0, w1, speed, onHit(u), colors, ability}) → travelling cone (Sonic Wave); visible ground fan
//   AB.globalEnemies(caster, heroesOnly) → every living enemy (global spells ignore fog and range; Global Silence)
//   AB.statDmg(h, stat, mult) → attribute-based damage (Glaives of Wisdom: int × mult)
const coneMats = {};
function coneGeo(w0, w1, len) {   // flat trapezoid along +Z, origin at the narrow end
  const s = new T.Shape(); s.moveTo(-w0 / 2, 0); s.lineTo(w0 / 2, 0); s.lineTo(w1 / 2, len); s.lineTo(-w1 / 2, len); s.closePath();
  const g = new T.ShapeGeometry(s); g.rotateX(Math.PI / 2); return g;
}
function inConeAt(u, x, z, dir, len, w0, w1) {
  const rx = u.x - x, rz = u.z - z, p = rx * dir.x + rz * dir.z, lat = Math.abs(rx * dir.z - rz * dir.x);
  return p >= -u.radius && p <= len + u.radius && lat <= (w0 + (w1 - w0) * clamp(p / len, 0, 1)) / 2 + u.radius;
}
Object.assign(AB, {
  inCone(caster, x, z, dir, len, w0, w1) { return units.filter(u => !u.dead && u.team !== caster.team && !u.isBuilding && !u.isWard && u.kind !== 'fountain' && !isInvuln(u) && inConeAt(u, x, z, dir, len, w0, w1)); },
  coneWave(o) {
    const hit = new Set(), c = o.caster, cols = o.colors || ['#ce93d8', '#ab47bc', '#f3e5f5'];
    const mat = coneMats[cols[1]] || (coneMats[cols[1]] = new T.MeshBasicMaterial({ color: cols[1], transparent: true, opacity: 0.4, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
    const fan = new T.Mesh(coneGeo(o.w0, o.w1, o.len), mat.clone()); fan.position.set(o.x, heightAt(o.x, o.z) + 0.25, o.z); fan.rotation.y = Math.atan2(o.dir.x, o.dir.z); fan.scale.z = 0.01; scene.add(fan);
    let trav = 0, fade = 0;
    effects.push({ update(dt) {
      if (trav >= o.len) { fade += dt; fan.material.opacity = Math.max(0, 0.4 * (1 - fade / 0.4)); if (fade >= 0.4) { scene.remove(fan); fan.geometry.dispose(); fan.material.dispose(); return true; } return false; }
      const prev = trav; trav = Math.min(o.len, trav + o.speed * dt); fan.scale.z = Math.max(0.01, trav / o.len);
      for (const u of units) {
        if (u.dead || u.team === c.team || u.isBuilding || u.isWard || hit.has(u) || isInvuln(u)) continue;
        const p = (u.x - o.x) * o.dir.x + (u.z - o.z) * o.dir.z;
        if (p >= prev - 1.5 && p <= trav + 0.5 && inConeAt(u, o.x, o.z, o.dir, o.len, o.w0, o.w1)) { hit.add(u); o.onHit(u); }
      }
      const w = o.w0 + (o.w1 - o.w0) * trav / o.len, fx = o.x + o.dir.x * trav, fz = o.z + o.dir.z * trav;
      for (let i = 0; i < 16; i++) { const l = (i / 15 - 0.5) * w, bend = -Math.abs(l) * 0.25; spawnP(fx - o.dir.z * l + o.dir.x * bend, rnd(0.5, 2.4), fz + o.dir.x * l + o.dir.z * bend, o.dir.x * 6, rnd(0, 1.5), o.dir.z * 6, rnd(0.3, 0.55), rnd(0.35, 0.7), cols[i % cols.length]); }
      return false;
    } });
    emit('coneWave', { unit: c.id, ability: o.ability || '', len: o.len });
  },
  globalEnemies(caster, heroesOnly) { return units.filter(u => !u.dead && u.team !== caster.team && (heroesOnly ? u.isHero : !u.isBuilding && !u.isWard && u.kind !== 'fountain')); },
  statDmg: (h, stat, mult) => (h[stat] || 0) * mult,
});
