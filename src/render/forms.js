// render/forms.js — model swaps for shapeshifts (Lycan wolf form, Lone Druid True Form): setForm(u, key, def, scale) replaces
// the unit's model with a new buildModel(key, def) (ring + status fx move over), clearForm(u) restores the original.
// quadruped(o) builds a 4-legged part model (legFL/legFR/legBL/legBR/body/head); animQuad animates it (called by render/animate.js).
function moveModelExtras(from, to, u) {
  if (u.ringMesh) { from.remove(u.ringMesh); to.add(u.ringMesh); }
  if (u._fx) for (const k in u._fx) if (u._fx[k]) { from.remove(u._fx[k]); to.add(u._fx[k]); }
  to.position.copy(from.position); to.rotation.y = from.rotation.y; to.visible = from.visible;
}
function initParts(u, m) { u.parts = m.userData.parts; for (const k in u.parts) u.parts[k].userData.p0 = u.parts[k].position.clone(); }
function setForm(u, key, def, scale) {
  if (!u.model) return; if (u._formBase) clearForm(u);
  const m = buildModel(key, def, scale), old = u.model;
  moveModelExtras(old, m, u); scene.remove(old); scene.add(m);
  u._formBase = { model: old }; u.model = m; initParts(u, m); u._ghost = false; u._tint = false; u.form = key;
}
function clearForm(u) {
  const b = u._formBase; if (!b || !u.model) return;
  const m = b.model; moveModelExtras(u.model, m, u); scene.remove(u.model); scene.add(m);
  u.model = m; initParts(u, m); u._formBase = null; u._ghost = false; u._tint = false; u.form = null;
}
// o: {len, w, h (torso height), legH, legW, c (fur), c2 (belly / accents), head: [boxes relative to head pivot], tail: [boxes], extra: [torso boxes]}
function quadruped(o) {
  const L = o.len, W = o.w, H = o.h, lh = o.legH, lw = o.legW || 0.32, leg = (x, z) => ({ p: [x, lh, z], b: [[0, -lh / 2, 0, lw, lh, lw, o.c], [0, -lh + 0.08, 0.04, lw + 0.06, 0.16, lw + 0.1, o.c2]] });
  return {
    body: { p: [0, lh, 0], b: [[0, H / 2, 0, W, H, L, o.c], [0, 0.12, 0, W * 0.8, 0.22, L * 0.8, o.c2], ...(o.tail || []), ...(o.extra || [])], g: o.glow },
    head: { p: [0, lh + H * 0.65, L / 2], b: o.head, g: o.headGlow },
    legFL: leg(-W / 2 + lw / 2, L / 2 - lw), legFR: leg(W / 2 - lw / 2, L / 2 - lw), legBL: leg(-W / 2 + lw / 2, -L / 2 + lw), legBR: leg(W / 2 - lw / 2, -L / 2 + lw),
  };
}
function animQuad(u, p, sw, lk, moving) {
  p.legFL.rotation.x += (sw - p.legFL.rotation.x) * lk; p.legBR.rotation.x += (sw - p.legBR.rotation.x) * lk;
  p.legFR.rotation.x += (-sw - p.legFR.rotation.x) * lk; p.legBL.rotation.x += (-sw - p.legBL.rotation.x) * lk;
  const a = u.atk; let lunge = 0;
  if (a) { const k = a.phase === 'windup' ? a.t / Math.max(1e-4, a.point) : 1 - Math.min(1, (a.t - a.point) / a.back); lunge = Math.sin(Math.min(1, k) * Math.PI / 2); }
  else if (u.casting) lunge = 0.6;
  p.head.rotation.x = lunge * 0.5 - (moving ? 0 : Math.sin(G.time * 1.7 + u.id) * 0.05);
  p.head.position.z = p.head.userData.p0.z + lunge * 0.45;
  p.body.position.y = p.body.userData.p0.y + (moving ? Math.abs(Math.sin(u.anim.walk)) * 0.1 : Math.sin(G.time * 2.2 + u.id) * 0.03);
  p.body.rotation.x = -lunge * 0.08;
}
