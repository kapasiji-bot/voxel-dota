// render/animate.js — per-unit model sync: walk bob, attack swing keyed to u.atk phase, cast pose, spin, building crystals, corpses.
function syncModel(u, dt) {
  const a0 = u.atk;   // impact keyframe event is emitted even for fog-hidden models (pose is a pure function of u.atk)
  if (a0 && a0.phase === 'backswing' && u._swingId !== a0.id) { u._swingId = a0.id; emit('swingImpact', { unit: u.id, kind: u.kind, attackId: a0.id }); }
  const m = u.model; if (!m) return;
  const gy = heightAt(u.x, u.z) * 0.7; m.position.y += (gy - m.position.y) * Math.min(1, dt * 10);   // also while fog-hidden: projectiles launch / aim at this height (B11 lockstep)
  if (!m.visible) return;
  m.position.x = u.x; m.position.z = u.z;
  const p = u.parts;
  if (u.isWard) { p.eye.rotation.y += dt * 1.2; p.eye.position.y = p.eye.userData.p0.y + Math.sin(G.time * 2 + u.id) * 0.08; return; }
  if (u.isBuilding) { if (p.crystal) { p.crystal.rotation.y += dt * 1.3; p.crystal.position.y = p.crystal.userData.p0.y + Math.sin(G.time * 2 + u.id) * 0.25; } return; }
  m.rotation.y = lerpAngle(m.rotation.y, u.facing, Math.min(1, dt * 14));
  const moving = (u.moveDist || 0) > 0.01; u.moveDist = 0;
  if (moving) u.anim.walk += dt * u.speed * 1.5;
  const sw = moving ? Math.sin(u.anim.walk) * 0.75 : 0, lk = Math.min(1, dt * 14);
  if (p.legFL) { animQuad(u, p, sw, lk, moving); return; }
  if (!p.legL) return;   // static models (Death Ward)   // 4-legged models (render/forms.js)
  p.legL.rotation.x += (sw - p.legL.rotation.x) * lk; p.legR.rotation.x += (-sw - p.legR.rotation.x) * lk;
  p.armL.rotation.x += (-sw * 0.7 - p.armL.rotation.x) * lk;
  const a = u.atk, c = u.casting;
  if (a) {
    const k = a.phase === 'windup' ? a.t / Math.max(1e-4, a.point) : Math.min(1, (a.t - a.point) / a.back);
    if (u.proj) p.armR.rotation.x = a.phase === 'windup' ? -1.6 * k : -1.6 * (1 - k);          // ranged: raise staff → release at impact
    else p.armR.rotation.x = a.phase === 'windup' ? (k < 0.75 ? -2.7 * k / 0.75 : -2.7 + 1.6 * (k - 0.75) / 0.25) // melee: raise → slam
      : -1.1 * (1 - k);                                                                          // impact pose (-1.1) → rest
  } else if (u.channel) {   // channel pose: both arms raised, trembling
    const w = Math.sin(G.time * 18) * 0.12; p.armR.rotation.x = -2.5 + w; p.armL.rotation.x = -2.5 - w;
  } else if (c) {
    c.t2 = (c.t2 || 0) + dt; const k = Math.min(1, c.t2 / c.total);
    p.armR.rotation.x = -1.8 * (k < 0.5 ? k * 2 : Math.max(0, 1 - (k - 0.5) * 2));
  } else p.armR.rotation.x += (sw * 0.7 - p.armR.rotation.x) * lk;
  const inner = m.userData.inner;
  if (u.anim.spin > 0) { u.anim.spin -= dt; inner.rotation.y += dt * 20; if (u.anim.spin <= 0) inner.rotation.y = 0; }
  p.body.position.y = p.body.userData.p0.y + (moving ? Math.abs(Math.sin(u.anim.walk)) * 0.08 : Math.sin(G.time * 2.2 + u.id) * 0.025);
}
function updateCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i]; c.t += dt; const m = c.u.model, inner = m.userData.inner;
    if (c.building) {
      if (c.t < 2.5) { m.position.y = -c.u.height * 0.65 * (c.t / 2.5); m.rotation.z = Math.sin(c.t * 30) * 0.02; if (Math.random() < 0.5) spawnP(c.u.x + rnd(-2, 2), rnd(0, 2), c.u.z + rnd(-2, 2), 0, rnd(1, 3), 0, 0.8, 0.5, '#9e9e9e'); }
      else { if (c.u.parts.crystal) c.u.parts.crystal.visible = false; corpses.splice(i, 1); const k = units.indexOf(c.u); if (k >= 0) units.splice(k, 1); }
    } else {
      inner.rotation.x = -Math.min(1, c.t / 0.4) * Math.PI / 2;
      if (c.t > 1.0) m.position.y = -(c.t - 1.0) * 1.5;
      if (c.t > 2.0) { scene.remove(m); corpses.splice(i, 1); const k = units.indexOf(c.u); if (k >= 0) units.splice(k, 1); }
    }
  }
}
