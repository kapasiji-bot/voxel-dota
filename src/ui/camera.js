// ui/camera.js — RTS camera: arrow keys / edge pan, Space or Y follow, wheel zoom (in input.js).
// ================= camera =================
const CAM_PITCH = 58 * Math.PI / 180;
function updateCamera(dt) {
  const c = G.cam, P = G.player;
  if (G.started) {
    const sp = c.dist * 1.3 * dt;
    let mx = 0, mz = 0;
    if (keys.ArrowLeft) mx -= 1; if (keys.ArrowRight) mx += 1; if (keys.ArrowUp) mz -= 1; if (keys.ArrowDown) mz += 1;
    if (edgeAllowed(6)) {   // ui/pointerlock.js: normal rule, plus the screen edge over HUD panels when locked / fullscreen
      const E = 6; if (mouse.x <= E) mx -= 1; if (mouse.x >= innerWidth - E) mx += 1; if (mouse.y <= E) mz -= 1; if (mouse.y >= innerHeight - E) mz += 1;
    }
    c.x += mx * sp; c.z += mz * sp;
    if (P && (keys[' '] || G.lock) && !P.dead) { c.x += (P.x - c.x) * Math.min(1, dt * 10); c.z += (P.z - c.z) * Math.min(1, dt * 10); }
  } else { c.x = Math.sin(performance.now() / 9000) * 40; c.z = Math.cos(performance.now() / 11000) * 30 + 10; }
  c.x = clamp(c.x, -78, 78); c.z = clamp(c.z, -78, 78);
  camera.position.set(c.x, c.dist * Math.sin(CAM_PITCH), c.z + c.dist * Math.cos(CAM_PITCH));
  camera.lookAt(c.x, 0, c.z);
  sun.position.set(c.x + 40, 90, c.z + 25); sun.target.position.set(c.x, 0, c.z);
  updateShadowCam(c);
}
// Fit the orthographic shadow frustum to the RTS camera so the 2048 map covers the view, not ±70 of the whole map.
function updateShadowCam(c) {
  const half = clamp(c.dist * 0.7 + 12, 28, 56), sc = sun.shadow.camera;
  if (Math.abs(sc.right - half) < 0.25) return;
  sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 10; sc.far = 220;
  sc.updateProjectionMatrix();
}

