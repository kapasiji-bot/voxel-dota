// render/trees.js — renders tree changes from the sim (map/trees.js TREES.changes): hides / restores the instanced natural
// tree (terrain.js records each tree cell's instance indices in TREE_IDX) and grows small voxel trees for Sprout cells.
const TREE_IDX = {}, TREE_MESH = { trunk: null, leaves: null }, SPROUTS = {};
const _m4zero = new T.Matrix4().makeScale(0, 0, 0);
function setTreeInst(k, show) {
  const ix = TREE_IDX[k], tm = TREE_MESH; if (!ix || !tm.trunk) return false;
  if (!ix.save) { ix.save = [new T.Matrix4(), new T.Matrix4(), new T.Matrix4()]; tm.trunk.getMatrixAt(ix[0], ix.save[0]); tm.leaves.getMatrixAt(ix[1], ix.save[1]); tm.leaves.getMatrixAt(ix[1] + 1, ix.save[2]); }
  tm.trunk.setMatrixAt(ix[0], show ? ix.save[0] : _m4zero); tm.leaves.setMatrixAt(ix[1], show ? ix.save[1] : _m4zero); tm.leaves.setMatrixAt(ix[1] + 1, show ? ix.save[2] : _m4zero);
  tm.trunk.instanceMatrix.needsUpdate = tm.leaves.instanceMatrix.needsUpdate = true;
  return true;
}
let SPROUT_GEO = null;
function addSproutMesh(k) {
  if (SPROUTS[k]) return;
  SPROUT_GEO = SPROUT_GEO || voxGeo([[0, 0.7, 0, 0.6, 1.4, 0.6, '#6d4c41'], [0, 2.1, 0, 1.9, 1.6, 1.9, '#43a047'], [0, 3.1, 0, 1.1, 0.8, 1.1, '#66bb6a'], [0.5, 1.7, 0.5, 0.6, 0.6, 0.6, '#2e7d32']]);
  const m = new T.Mesh(SPROUT_GEO, vmat), p = treeXZ(k); m.castShadow = true; m.position.set(p.x, -3.4, p.z); m.rotation.y = hash2(k, 3) * 3; scene.add(m);
  SPROUTS[k] = { m, t: 0 }; burst(p.x, 1, p.z, 10, ['#66bb6a', '#a5d6a7', '#8d6e63'], 4, 0.5, 0.25, 2);
}
function removeSproutMesh(k) { const s = SPROUTS[k]; if (!s) return false; scene.remove(s.m); delete SPROUTS[k]; return true; }
function renderTrees(rdt) {
  while (TREES.changes.length) {
    const k = TREES.changes.shift(), v = treeAt[k], p = treeXZ(k);
    if (v === 1) { if (!setTreeInst(k, true)) addSproutMesh(k); }
    else if (v === 2) addSproutMesh(k);
    else { const had = removeSproutMesh(k) | setTreeInst(k, false); if (had) burst(p.x, 2, p.z, 14, ['#2e7d32', '#66bb6a', '#795548'], 5, 0.7, 0.3, 3); }
    mmTreeCell(k);   // ui/minimap.js
  }
  for (const k in SPROUTS) { const s = SPROUTS[k]; if (s.t < 1) { s.t = Math.min(1, s.t + rdt * 4); s.m.position.y = -3.4 * (1 - s.t); } }
}
