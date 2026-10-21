// render/particles.js — single InstancedMesh particle system: spawnP / burst / ringP.
// ================= particles (single InstancedMesh) =================
const PMAX = 4000;
const pMesh = new T.InstancedMesh(boxG, new T.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false }), PMAX);
pMesh.frustumCulled = false; pMesh.count = 0;
pMesh.setColorAt(0, _c.set('#fff')); scene.add(pMesh);
const parts = [], PCOL = {};   // B6 perf: shared Color per colour string (no allocation per particle)
function spawnP(x, y, z, vx, vy, vz, life, size, color, grav = 0) {
  if (parts.length >= PMAX) return;
  parts.push({ x, y, z, vx, vy, vz, life, max: life, size, col: PCOL[color] || (PCOL[color] = new T.Color(color)), grav, rot: Math.random() * 3 });
}
function burst(x, y, z, n, color, spd, life, size, up = 0, grav = -12) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.6); spawnP(x, y, z, Math.cos(a) * s, up + Math.random() * spd * 0.8, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.6), Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color, grav); }
}
function ringP(x, z, r, n, color, life, size, y = 0.3, out = 0) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; spawnP(x + Math.cos(a) * r, y, z + Math.sin(a) * r, Math.cos(a) * out, 0, Math.sin(a) * out, life, size, Array.isArray(color) ? color[i % color.length] : color, 0); }
}
function updateParticles(dt) {
  let n = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += dt * 3;
    if (p.grav && p.y < 0.05) { p.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7; }
  }
  for (const p of parts) {
    const s = p.size * Math.min(1, p.life / p.max * 1.6);
    _q.setFromAxisAngle(_v.set(0, 1, 0), p.rot);
    _m4.compose(_v.set(p.x, p.y, p.z), _q, _s.set(s, s, s));
    pMesh.setMatrixAt(n, _m4); pMesh.setColorAt(n, p.col); n++;
  }
  pMesh.count = n; pMesh.instanceMatrix.needsUpdate = true; if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true;
}
