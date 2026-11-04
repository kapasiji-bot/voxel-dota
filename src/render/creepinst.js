// render/creepinst.js — GPU InstancedMesh LOD for identical lane creeps (melee/ranged × team).
// Near camera (or attacking/casting): keep per-unit SkinnedMesh + syncModel bones. Far: hide skinned
// body/glow meshes and pack transforms into a shared InstancedMesh (1–2 draws per archetype).
const CREEP_INST_MAX = 48, CREEP_LOD_MUL = 0.42, CREEP_LOD_PAD = 8, CREEP_INST_MUL = 1.15, CREEP_INST_PAD = 12;
const _ciPools = {}, _ciDummy = new T.Object3D();
const CREEP_INST = { on: true, far: 0, near: 0, pools: 0, draws: 0 };

function bakePartBoxes(def, glow) {
  const out = [];
  for (const name in def) {
    const pd = def[name], boxes = glow ? pd.g : pd.b; if (!boxes) continue;
    const px = pd.p[0], py = pd.p[1], pz = pd.p[2];
    for (const b of boxes) out.push([b[0] + px, b[1] + py, b[2] + pz, b[3], b[4], b[5], b[6]]);
  }
  return out;
}
function creepInstPool(key) {
  let p = _ciPools[key]; if (p) return p;
  const def = CREEP_MODELS[key]();
  const geo = geoCache['ci|' + key] || (geoCache['ci|' + key] = voxGeo(bakePartBoxes(def, false)));
  const mesh = new T.InstancedMesh(geo, vmat, CREEP_INST_MAX);
  mesh.castShadow = false; mesh.receiveShadow = true; mesh.frustumCulled = false; // units frustum-filtered before packing
  mesh.count = 0; mesh.visible = false; scene.add(mesh);
  let glow = null;
  const gb = bakePartBoxes(def, true);
  if (gb.length) {
    const ggeo = geoCache['ci|' + key + '|g'] || (geoCache['ci|' + key + '|g'] = voxGeo(gb));
    glow = new T.InstancedMesh(ggeo, vglow, CREEP_INST_MAX);
    glow.castShadow = false; glow.frustumCulled = false; glow.count = 0; glow.visible = false;
    scene.add(glow);
  }
  return (_ciPools[key] = { mesh, glow, n: 0 });
}
function showCreepSkinned(u, on) {
  const m = u.model; if (!m) return;
  const body = m.userData.body, glow = m.userData.glow;
  if (body && body.visible !== on) body.visible = on;
  if (glow && glow.visible !== on) glow.visible = on;
}
function clearCreepLod(u) {
  if (!u._lodInst) return; u._lodInst = false; showCreepSkinned(u, true);
}
function creepInstEligible(u) {
  return !!(CREEP_INST.on && u && !u.dead && (u.kind === 'melee' || u.kind === 'ranged') && u.model && !u.form && !u._fx);
}
function creepLodR2() { return (G.cam.dist * CREEP_LOD_MUL + CREEP_LOD_PAD) ** 2; }
function creepInstR2() { return (G.cam.dist * CREEP_INST_MUL + CREEP_INST_PAD) ** 2; }  // beyond: leave skinned for frustum cull
function updateCreepInst() {
  for (const k in _ciPools) _ciPools[k].n = 0;
  CREEP_INST.far = CREEP_INST.near = 0;
  if (!G.started || !CREEP_INST.on) {
    for (const u of units) clearCreepLod(u);
    for (const k in _ciPools) { const p = _ciPools[k]; p.mesh.count = 0; p.mesh.visible = false; if (p.glow) { p.glow.count = 0; p.glow.visible = false; } }
    return;
  }
  const cx = G.cam.x, cz = G.cam.z, lodR2 = creepLodR2();
  for (const u of units) {
    if (!creepInstEligible(u)) { clearCreepLod(u); continue; }
    const m = u.model;
    if (!m.visible) { clearCreepLod(u); continue; }   // fog-hidden: no instance slot; skinned stays parent-hidden
    const forceNear = u.atk || u.casting || u.channel || (u.anim && u.anim.spin > 0);
    const d2 = (u.x - cx) ** 2 + (u.z - cz) ** 2;
    // RTS cam looks at (cx,cz): keep instances inside a view disc so we do not draw off-screen packs
    const viewR2 = (G.cam.dist * 0.78 + 6) ** 2;
    if (d2 > viewR2 || d2 > creepInstR2()) { CREEP_INST.near++; clearCreepLod(u); continue; }
    const far = !forceNear && d2 > lodR2;
    if (!far) { CREEP_INST.near++; clearCreepLod(u); continue; }
    const key = u.kind + u.team, pool = creepInstPool(key);
    if (pool.n >= CREEP_INST_MAX) { CREEP_INST.near++; clearCreepLod(u); continue; }
    const i = pool.n++, sc = (m.userData.inner && m.userData.inner.scale.x) || 1;
    _ciDummy.position.set(u.x, m.position.y, u.z);
    _ciDummy.rotation.set(0, m.rotation.y, 0);
    _ciDummy.scale.set(sc, sc, sc);
    _ciDummy.updateMatrix();
    pool.mesh.setMatrixAt(i, _ciDummy.matrix);
    if (pool.glow) pool.glow.setMatrixAt(i, _ciDummy.matrix);
    if (!u._lodInst) { u._lodInst = true; showCreepSkinned(u, false); }
    CREEP_INST.far++;
  }
  let draws = 0;
  for (const k in _ciPools) {
    const p = _ciPools[k], on = p.n > 0;
    p.mesh.count = p.n; p.mesh.visible = on; if (on) { p.mesh.instanceMatrix.needsUpdate = true; draws++; }
    if (p.glow) { p.glow.count = p.n; p.glow.visible = on; if (on) { p.glow.instanceMatrix.needsUpdate = true; draws++; } }
  }
  CREEP_INST.pools = Object.keys(_ciPools).length; CREEP_INST.draws = draws;
}
