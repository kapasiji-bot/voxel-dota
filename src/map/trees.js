// map/trees.js — destructible / creatable trees (sim side). treeAt[k]: 0 none, 1 natural tree, 2 temporary (Sprout).
// Every change updates walkability (walk), line of sight (sightBlock, vision/fog.js) and bumps TREES.gen (building vision cache key);
// TREES.changes is a queue of changed cells for the renderer (render/trees.js) and minimap. Destroyed natural trees regrow
// after TREE_REGROW seconds once nobody stands on the cell. Events: treeDestroyed{x,z,by}, treeSprout{x,z}.
const TREE_REGROW = 300;
const TREES = { gen: 0, changes: [], regrow: [], temp: [] };
const treeXZ = k => ({ x: cc(k % GN), z: cc((k / GN) | 0) });
function setTreeCell(k, v) {
  treeAt[k] = v;
  walk[k] = (blockCount[k] > 0 || v || tiles[k] === TT.CLIFF) ? 0 : 1;
  sightBlock[k] = v || tiles[k] === TT.CLIFF || WALLS.cnt[k] ? 1 : 0;
  TREES.gen++; TREES.changes.push(k); FOG.dirty = true;
}
// remove the tree at cell k (natural trees regrow later). Returns true if there was one.
function destroyTree(k, by, regrow = true) {
  if (k < 0 || k >= GN * GN || !treeAt[k]) return false;
  const nat = treeAt[k] === 1; setTreeCell(k, 0);
  TREES.temp = TREES.temp.filter(t => t.k !== k);
  if (nat && regrow) TREES.regrow.push({ k, t: G.time + TREE_REGROW });
  const p = treeXZ(k); emit('treeDestroyed', { x: +p.x.toFixed(1), z: +p.z.toFixed(1), by: by ? by.id : 0 });
  return true;
}
const unitOnCell = (k, pad = 0.4) => { const p = treeXZ(k); return units.some(u => !u.dead && !u.isWard && Math.max(Math.abs(u.x - p.x), Math.abs(u.z - p.z)) < TILE / 2 + u.radius * 0.5 + pad); };
// temporary tree at world point (Sprout) on a free walkable cell; returns the cell or -1
function sproutTree(x, z, dur) {
  const i = cellOf(x), j = cellOf(z); if (i < 1 || j < 1 || i >= GN - 1 || j >= GN - 1) return -1;
  const k = j * GN + i; if (treeAt[k] || !walk[k] || tiles[k] === TT.BASE || unitOnCell(k)) return -1;
  setTreeCell(k, 2); TREES.temp.push({ k, t: G.time + dur }); emit('treeSprout', { x: +cc(i).toFixed(1), z: +cc(j).toFixed(1) });
  return k;
}
// tree cells (natural or temporary) within r of (x,z), nearest first
function treesNear(x, z, r) {
  const out = [], i0 = Math.max(0, cellOf(x - r)), i1 = Math.min(GN - 1, cellOf(x + r)), j0 = Math.max(0, cellOf(z - r)), j1 = Math.min(GN - 1, cellOf(z + r));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * GN + i, d = Math.hypot(cc(i) - x, cc(j) - z); if (treeAt[k] && d <= r) out.push({ k, d, x: cc(i), z: cc(j) }); }
  return out.sort((a, b) => a.d - b.d);
}
function tickTrees() {
  if (TREES.temp.length) for (const t of TREES.temp.slice()) if (G.time >= t.t) { TREES.temp.splice(TREES.temp.indexOf(t), 1); if (treeAt[t.k] === 2) setTreeCell(t.k, 0); }
  if (TREES.regrow.length && G.frame % 20 === 0) for (const r of TREES.regrow.slice()) if (G.time >= r.t && !treeAt[r.k] && !unitOnCell(r.k, 1)) { TREES.regrow.splice(TREES.regrow.indexOf(r), 1); setTreeCell(r.k, 1); }
}
