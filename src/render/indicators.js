// render/indicators.js — ground rings / cones / lines while targeting a skill, item, A-move, or hovering a unit.
// Shapes: cast-range ring (green / red if out of range), AoE disk, direction line, trapezoid cone (w0→w1), attack-range ring.
function indMat(c, o) { return new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: T.DoubleSide }); }
function flat(geo) { geo.rotateX(-Math.PI / 2); return geo; }
const rangeRing = new T.Mesh(flat(new T.RingGeometry(0.975, 1, 128)), indMat('#9cff9c', 0.55));
const atkRing = new T.Mesh(flat(new T.RingGeometry(0.97, 1, 96)), indMat('#80d8ff', 0.45));
const aoeRing = new T.Group();
aoeRing.add(new T.Mesh(flat(new T.CircleGeometry(1, 48)), indMat('#ffcc33', 0.2)), new T.Mesh(flat(new T.RingGeometry(0.93, 1, 64)), indMat('#ffdd55', 0.75)));
const lineGeo = flat(new T.PlaneGeometry(1, 1)); lineGeo.translate(0, 0, 0.5);
const lineInd = new T.Mesh(lineGeo, indMat('#ff8a3d', 0.34));
const coneInd = new T.Mesh(new T.BufferGeometry(), indMat('#ce93d8', 0.32)); let _coneKey = '';
const hoverRing = new T.Mesh(flat(new T.RingGeometry(0.9, 1.15, 40)), indMat('#ff4444', 0.85));
const dashInd = new T.Mesh(lineGeo.clone(), indMat('#fff59d', 0.28));   // unit-target aim line caster → hover
for (const m of [rangeRing, atkRing, aoeRing, lineInd, coneInd, hoverRing, dashInd]) { m.visible = false; m.position.y = 0.08; m.renderOrder = 5; scene.add(m); }
const IND = { range: false, aoe: false, line: false, cone: false, atk: false, hover: false, dash: false, oor: false };
function indInfo() { return Object.assign({}, IND, { tg: G.targeting ? { kind: G.targeting.kind, mode: G.targeting.mode, range: G.targeting.range || 0, radius: G.targeting.radius || 0, line: !!(G.targeting.line), w0: G.targeting.line && G.targeting.line.w0 } : null }); }
function updateIndicators() {
  const P = G.player, tg = G.targeting;
  rangeRing.visible = atkRing.visible = aoeRing.visible = lineInd.visible = coneInd.visible = hoverRing.visible = dashInd.visible = false;
  IND.range = IND.aoe = IND.line = IND.cone = IND.atk = IND.hover = IND.dash = IND.oor = false;
  if (!G.started || !P) return;
  const hv = G.hover = mouse.overUI ? null : pickUnit(mouse.x, mouse.y);
  if (hv) {
    hoverRing.visible = IND.hover = true;
    hoverRing.position.set(hv.x, (hv.model ? hv.model.position.y : 0) + 0.1, hv.z);
    const s = hv.radius + 0.5; hoverRing.scale.set(s, 1, s);
    hoverRing.material.color.set(hv.team === P.team ? '#55ff55' : '#ff4444');
  }
  canvas.style.cursor = tg ? 'crosshair' : (hv && hv.team !== P.team ? 'pointer' : 'default');
  if (!tg || P.dead) return;
  const g = groundAt(mouse.x, mouse.y), caster = tg.caster || tg.owner || P;
  const cx = caster.x, cz = caster.z;
  // A-move / bare attack-range ring
  if (tg.kind === 'amove') {
    const r = (caster.range || 0) + (caster.radius || 0);
    if (r > 0) { atkRing.visible = IND.atk = true; atkRing.position.set(cx, 0.09, cz); atkRing.scale.set(r, 1, r); }
    return;
  }
  if (!g && !(tg.mode === 'unit' && hv)) {
    if (tg.range) { rangeRing.visible = IND.range = true; rangeRing.position.set(cx, 0.1, cz); rangeRing.scale.set(tg.range, 1, tg.range); rangeRing.material.color.set('#9cff9c'); rangeRing.material.opacity = 0.55; }
    return;
  }
  const aimX = (tg.mode === 'unit' && hv) ? hv.x : g.x, aimZ = (tg.mode === 'unit' && hv) ? hv.z : g.z;
  if (tg.range) {
    rangeRing.visible = IND.range = true; rangeRing.position.set(cx, 0.1, cz); rangeRing.scale.set(tg.range, 1, tg.range);
    const oor = Math.hypot(aimX - cx, aimZ - cz) > tg.range + 0.05;
    IND.oor = oor; rangeRing.material.color.set(oor ? '#ff6e6e' : '#9cff9c'); rangeRing.material.opacity = oor ? 0.7 : 0.55;
  }
  if (tg.line && tg.line.w0 != null) {
    const k = tg.line.w0 + ':' + tg.line.w + ':' + tg.line.len;
    if (k !== _coneKey) { _coneKey = k; coneInd.geometry.dispose(); coneInd.geometry = coneGeo(tg.line.w0, tg.line.w, tg.line.len); }
    coneInd.visible = IND.cone = true; coneInd.position.set(cx, 0.12, cz); coneInd.rotation.y = Math.atan2(aimX - cx, aimZ - cz);
  } else if (tg.line) {
    lineInd.visible = IND.line = true; lineInd.position.set(cx, 0.12, cz);
    lineInd.rotation.y = Math.atan2(aimX - cx, aimZ - cz); lineInd.scale.set(tg.line.w || 2.5, 1, tg.line.len);
    // direction skillshots: hide cast-range ring; point+line (掘地穿刺) keeps it
    if (tg.mode !== 'point') { rangeRing.visible = IND.range = false; }
  } else if (tg.radius && (tg.mode === 'point' || (tg.mode === 'unit' && (hv || g)))) {
    aoeRing.visible = IND.aoe = true; aoeRing.position.set(aimX, 0.12, aimZ); aoeRing.scale.set(tg.radius, 1, tg.radius);
  }
  // unit-target aim dashed line (Laguna etc.)
  if (tg.mode === 'unit' && hv && !tg.line) {
    const dx = hv.x - cx, dz = hv.z - cz, len = Math.hypot(dx, dz) || 0.01;
    dashInd.visible = IND.dash = true; dashInd.position.set(cx, 0.11, cz); dashInd.rotation.y = Math.atan2(dx, dz); dashInd.scale.set(0.35, 1, len);
    dashInd.material.color.set(IND.oor || (tg.range && len > tg.range) ? '#ff8a80' : '#fff59d');
  }
}
