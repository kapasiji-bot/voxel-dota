// render/indicators.js — ground rings/lines shown while targeting an ability or hovering a unit.
function indMat(c, o) { return new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: T.DoubleSide }); }
function flat(geo) { geo.rotateX(-Math.PI / 2); return geo; }
const rangeRing = new T.Mesh(flat(new T.RingGeometry(0.975, 1, 128)), indMat('#9cff9c', 0.6));
const aoeRing = new T.Group(); aoeRing.add(new T.Mesh(flat(new T.CircleGeometry(1, 48)), indMat('#ffcc33', 0.22)), new T.Mesh(flat(new T.RingGeometry(0.94, 1, 64)), indMat('#ffdd55', 0.8)));
const lineGeo = flat(new T.PlaneGeometry(1, 1)); lineGeo.translate(0, 0, 0.5);
const lineInd = new T.Mesh(lineGeo, indMat('#ff8a3d', 0.32));
const coneInd = new T.Mesh(new T.BufferGeometry(), indMat('#ce93d8', 0.3)); let _coneKey = '';   // cone spells (Sonic Wave): trapezoid w0 → w1
const hoverRing = new T.Mesh(flat(new T.RingGeometry(0.9, 1.15, 40)), indMat('#ff4444', 0.85));
for (const m of [rangeRing, aoeRing, lineInd, coneInd, hoverRing]) { m.visible = false; m.position.y = 0.08; m.renderOrder = 5; scene.add(m); }
function updateIndicators() {
  const P = G.player, tg = G.targeting;
  rangeRing.visible = aoeRing.visible = lineInd.visible = coneInd.visible = hoverRing.visible = false;
  if (!G.started || !P) return;
  const hv = G.hover = mouse.overUI ? null : pickUnit(mouse.x, mouse.y);
  if (hv) { hoverRing.visible = true; hoverRing.position.set(hv.x, (hv.model ? hv.model.position.y : 0) + 0.1, hv.z); const s = hv.radius + 0.5; hoverRing.scale.set(s, 1, s); hoverRing.material.color.set(hv.team === P.team ? '#55ff55' : '#ff4444'); }
  canvas.style.cursor = tg ? 'crosshair' : (hv && hv.team !== P.team ? 'pointer' : 'default');
  if (!tg || P.dead) return;
  const g = groundAt(mouse.x, mouse.y);
  if (tg.range) { rangeRing.visible = true; rangeRing.position.set(P.x, 0.1, P.z); rangeRing.scale.set(tg.range, 1, tg.range); }
  if (!g) return;
  if (tg.line && tg.line.w0 !== undefined) {
    const k = tg.line.w0 + ':' + tg.line.w + ':' + tg.line.len; if (k !== _coneKey) { _coneKey = k; coneInd.geometry.dispose(); coneInd.geometry = coneGeo(tg.line.w0, tg.line.w, tg.line.len); }
    coneInd.visible = true; coneInd.position.set(P.x, 0.12, P.z); coneInd.rotation.y = Math.atan2(g.x - P.x, g.z - P.z); rangeRing.visible = false;
  } else if (tg.line) { lineInd.visible = true; lineInd.position.set(P.x, 0.12, P.z); lineInd.rotation.y = Math.atan2(g.x - P.x, g.z - P.z); lineInd.scale.set(tg.line.w, 1, tg.line.len); rangeRing.visible = false; }
  else if (tg.radius && tg.mode === 'point') { aoeRing.visible = true; aoeRing.position.set(g.x, 0.12, g.z); aoeRing.scale.set(tg.radius, 1, tg.radius); }
}
