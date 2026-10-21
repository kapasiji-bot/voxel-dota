// render/terrain.js — instanced terrain/cliff/tree/decor meshes built from the grid. Call buildTerrain() once.
// ================= terrain meshes =================
const tileColorCache = new Array(GN * GN);
function tileColor(i, j) {
  const k = j * GN + i, t = tiles[k], x = cc(i), z = cc(j), dire = x > z, r = hash2(i * 7 + 3, j * 13 + 1);
  const v = (r - 0.5) * 0.12;
  let base;
  switch (t) {
    case TT.GRASS: base = dire ? [0.30, 0.36, 0.18] : [0.36, 0.62, 0.22]; break;
    case TT.LANE: base = dire ? [0.50, 0.40, 0.30] : [0.64, 0.52, 0.33]; break;
    case TT.WATER: base = [0.16, 0.45, 0.80]; break;
    case TT.FORD: base = [0.70, 0.66, 0.45]; break;
    case TT.PIT: base = [0.40, 0.36, 0.31]; break;   // Roshan pit floor
    case TT.BASE: { const chk = ((i + j) & 1) ? 0.05 : -0.03; base = inBase(x, z) === RAD ? [0.78 + chk, 0.76 + chk, 0.68 + chk] : [0.30 + chk, 0.22 + chk, 0.24 + chk]; break; }
    default: base = dire ? [0.36, 0.30, 0.30] : [0.48, 0.48, 0.48];
  }
  return [clamp(base[0] + v, 0, 1), clamp(base[1] + v, 0, 1), clamp(base[2] + v, 0, 1)];
}
const world = new T.Group(); scene.add(world);
// merged ground: a top quad per land tile + side quads only where the neighbour's top is lower (B6 perf pass)
function groundGeo() {
  const pos = [], nor = [], col = [], idx = [];
  const quad = (a, b, c, d, n, cl) => { const o = pos.length / 3; for (const v of [a, b, c, d]) { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); col.push(cl[0], cl[1], cl[2]); } idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };
  const isW = k => tiles[k] === TT.WATER || tiles[k] === TT.FORD;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const k = j * GN + i; if (isW(k)) continue;
    const h = hmap[k], x0 = cc(i) - 1, x1 = cc(i) + 1, z0 = cc(j) - 1, z1 = cc(j) + 1, cl = tileColorCache[k];
    quad([x0, h, z0], [x0, h, z1], [x1, h, z1], [x1, h, z0], [0, 1, 0], cl);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj, inside = ni >= 0 && nj >= 0 && ni < GN && nj < GN, hn = inside ? hmap[nj * GN + ni] : -99, lo = Math.max(hn, h - 2);
      if (lo >= h - 1e-4) continue;
      const sc = [cl[0] * 0.8, cl[1] * 0.8, cl[2] * 0.8];
      if (di === 1) quad([x1, h, z1], [x1, lo, z1], [x1, lo, z0], [x1, h, z0], [1, 0, 0], sc);
      else if (di === -1) quad([x0, h, z0], [x0, lo, z0], [x0, lo, z1], [x0, h, z1], [-1, 0, 0], sc);
      else if (dj === 1) quad([x0, h, z1], [x0, lo, z1], [x1, lo, z1], [x1, h, z1], [0, 0, 1], sc);
      else quad([x1, h, z0], [x1, lo, z0], [x0, lo, z0], [x0, h, z0], [0, 0, -1], sc);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeBoundingSphere(); return g;
}
function buildTerrain() {
  const gmat = new T.MeshLambertMaterial();
  const wmat = new T.MeshPhongMaterial({ shininess: 90, specular: new T.Color('#9fd0ff') });
  let nW = 0; for (let k = 0; k < GN * GN; k++) if (tiles[k] === TT.WATER || tiles[k] === TT.FORD) nW++;
  const water = new T.InstancedMesh(boxG, wmat, nW);
  let wi = 0;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const k = j * GN + i, h = hmap[k], col = tileColor(i, j); tileColorCache[k] = col;
    if (tiles[k] !== TT.WATER && tiles[k] !== TT.FORD) continue;
    _m4.compose(_v.set(cc(i), h - 1, cc(j)), _q.identity(), _s.set(2, 2, 2)); _c.setRGB(col[0], col[1], col[2]);
    water.setMatrixAt(wi, _m4); water.setColorAt(wi++, _c);
  }
  gmat.vertexColors = true;
  const ground = new T.Mesh(groundGeo(), gmat);   // B6 perf: one merged mesh of visible faces only (was 6400 instanced boxes, 77k tris)
  ground.receiveShadow = true; water.receiveShadow = true;
  world.add(ground, water);
  // river bed below water (dark)
  // cliffs + trees + decor
  const cliffs = [], trunks = [], leaves = [], decor = [];
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const k = j * GN + i, x = cc(i), z = cc(j), r = hash2(i + 11, j + 5), dire = x > z;
    if (tiles[k] === TT.CLIFF) {
      const edge = Math.min(i, j, GN - 1 - i, GN - 1 - j);
      const n = edge > 2 ? 1 + Math.floor(r * 1.6) : 1 + Math.floor(r * 2) + (2 - edge);   // inner cliffs (Roshan pit ring): 1–2 blocks
      for (let s = 0; s < n; s++) { const g = 0.38 + hash2(i * 3 + s, j * 5) * 0.16; cliffs.push([x, 1 + s * 2, z, 2, 2, 2, dire ? g * 0.85 : g, dire ? g * 0.7 : g, dire ? g * 0.72 : g * 0.98]); }
    } else if (treeAt[k]) {
      TREE_IDX[k] = [trunks.length, leaves.length];   // render/trees.js: hide / restore this tree's instances
      const th = 1.4 + r * 1.6, ox = (hash2(i, j + 99) - 0.5) * 0.5, oz = (hash2(i + 99, j) - 0.5) * 0.5;
      trunks.push([x + ox, th / 2, z + oz, 0.7, th, 0.7, 0.36, 0.25, 0.14]);
      const ls = 2.0 + hash2(i + 7, j + 7) * 0.6;
      let lc;
      if (dire) { const p = hash2(i + 1, j + 2); lc = p < 0.4 ? [0.30, 0.20, 0.30] : p < 0.75 ? [0.45, 0.22, 0.12] : [0.25, 0.30, 0.22]; }
      else { const p = hash2(i + 1, j + 2); lc = p < 0.5 ? [0.18, 0.50, 0.16] : p < 0.85 ? [0.25, 0.58, 0.20] : [0.40, 0.62, 0.18]; }
      leaves.push([x + ox, th + ls / 2 - 0.2, z + oz, ls, ls, ls, lc[0], lc[1], lc[2]]);
      leaves.push([x + ox, th + ls + 0.3, z + oz, ls * 0.6, ls * 0.6, ls * 0.6, lc[0] * 1.15, lc[1] * 1.15, lc[2] * 1.15]);
    } else if (tiles[k] === TT.GRASS && laneDist(x, z) > 3.6) {
      const p = hash2(i + 31, j + 17);
      if (p < 0.06) decor.push([x + (r - 0.5), 0.25, z + (p * 8 - 0.25), 0.3, 0.5, 0.3, dire ? 0.28 : 0.30, dire ? 0.42 : 0.70, 0.18]);
      else if (p < 0.085) decor.push([x, 0.15, z + 0.3, 0.3, 0.3, 0.3, 0.95, r < 0.5 ? 0.85 : 0.25, 0.2]);
      else if (p < 0.1) decor.push([x - 0.3, 0.3, z, 0.9, 0.6, 0.7, 0.5, 0.5, 0.52]);
    } else if (tiles[k] === TT.WATER && r < 0.04) {
      decor.push([x, -0.5, z, 0.6, 0.3, 0.6, 0.2, 0.6, 0.3]); // lily pad
    }
  }
  function inst(list, mat, cast) {
    const m = new T.InstancedMesh(boxG, mat, list.length);
    list.forEach((b, n) => { _m4.compose(_v.set(b[0], b[1], b[2]), _q.identity(), _s.set(b[3], b[4], b[5])); m.setMatrixAt(n, _m4); _c.setRGB(b[6], b[7], b[8]); m.setColorAt(n, _c); });
    m.castShadow = cast; m.receiveShadow = true; world.add(m); return m;
  }
  inst(cliffs, new T.MeshLambertMaterial(), true);
  TREE_MESH.trunk = inst(trunks, new T.MeshLambertMaterial(), true);
  TREE_MESH.leaves = inst(leaves, new T.MeshLambertMaterial(), true);
  inst(decor, new T.MeshLambertMaterial(), false);
}

