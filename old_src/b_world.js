// ================= terrain meshes =================
const boxG = new T.BoxGeometry(1, 1, 1);
const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _v = new T.Vector3(), _s = new T.Vector3(), _c = new T.Color();
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
    case TT.BASE: { const chk = ((i + j) & 1) ? 0.05 : -0.03; base = inBase(x, z) === RAD ? [0.78 + chk, 0.76 + chk, 0.68 + chk] : [0.30 + chk, 0.22 + chk, 0.24 + chk]; break; }
    default: base = dire ? [0.36, 0.30, 0.30] : [0.48, 0.48, 0.48];
  }
  return [clamp(base[0] + v, 0, 1), clamp(base[1] + v, 0, 1), clamp(base[2] + v, 0, 1)];
}
const world = new T.Group(); scene.add(world);
(function buildTerrain() {
  const gmat = new T.MeshLambertMaterial();
  const wmat = new T.MeshPhongMaterial({ shininess: 90, specular: new T.Color('#9fd0ff') });
  let nW = 0; for (let k = 0; k < GN * GN; k++) if (tiles[k] === TT.WATER || tiles[k] === TT.FORD) nW++;
  const ground = new T.InstancedMesh(boxG, gmat, GN * GN - nW), water = new T.InstancedMesh(boxG, wmat, nW);
  let gi = 0, wi = 0;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const k = j * GN + i, h = hmap[k], col = tileColor(i, j); tileColorCache[k] = col;
    _m4.compose(_v.set(cc(i), h - 1, cc(j)), _q.identity(), _s.set(2, 2, 2));
    _c.setRGB(col[0], col[1], col[2]);
    if (tiles[k] === TT.WATER || tiles[k] === TT.FORD) { water.setMatrixAt(wi, _m4); water.setColorAt(wi++, _c); }
    else { ground.setMatrixAt(gi, _m4); ground.setColorAt(gi++, _c); }
  }
  ground.receiveShadow = true; water.receiveShadow = true;
  world.add(ground, water);
  // river bed below water (dark)
  // cliffs + trees + decor
  const cliffs = [], trunks = [], leaves = [], decor = [];
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const k = j * GN + i, x = cc(i), z = cc(j), r = hash2(i + 11, j + 5), dire = x > z;
    if (tiles[k] === TT.CLIFF) {
      const edge = Math.min(i, j, GN - 1 - i, GN - 1 - j);
      const n = 1 + Math.floor(r * 2) + (2 - edge);
      for (let s = 0; s < n; s++) { const g = 0.38 + hash2(i * 3 + s, j * 5) * 0.16; cliffs.push([x, 1 + s * 2, z, 2, 2, 2, dire ? g * 0.85 : g, dire ? g * 0.7 : g, dire ? g * 0.72 : g * 0.98]); }
    } else if (treeAt[k]) {
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
  inst(trunks, new T.MeshLambertMaterial(), true);
  inst(leaves, new T.MeshLambertMaterial(), true);
  inst(decor, new T.MeshLambertMaterial(), false);
})();

// ================= voxel models =================
const vmat = new T.MeshLambertMaterial({ vertexColors: true });
const vglow = new T.MeshBasicMaterial({ vertexColors: true });
const geoCache = {};
function voxGeo(boxes) {
  const pos = [], nor = [], col = [], idx = []; const c = new T.Color();
  for (const b of boxes) {
    const [x, y, z, w, h, d, color] = b; c.set(color);
    const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z);
    const p = g.attributes.position, n = g.attributes.normal, base = pos.length / 3;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i));
      const ny = n.getY(i), s = ny > 0.5 ? 1.0 : ny < -0.5 ? 0.6 : 0.88;
      col.push(c.r * s, c.g * s, c.b * s);
    }
    const ix = g.index; for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
    g.dispose();
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeBoundingSphere();
  return geo;
}
// def: { partName: {p:[px,py,pz], b:[boxes], g:[glow boxes]} }
function buildModel(key, def, scale) {
  const root = new T.Group(), inner = new T.Group(); root.add(inner);
  const parts = {};
  for (const name in def) {
    const pd = def[name], g = new T.Group(); g.position.set(pd.p[0], pd.p[1], pd.p[2]);
    if (pd.b && pd.b.length) { const ck = key + '|' + name; const m = new T.Mesh(geoCache[ck] || (geoCache[ck] = voxGeo(pd.b)), vmat); m.castShadow = true; g.add(m); }
    if (pd.g && pd.g.length) { const ck = key + '|' + name + '|g'; const m = new T.Mesh(geoCache[ck] || (geoCache[ck] = voxGeo(pd.g)), vglow); g.add(m); }
    inner.add(g); parts[name] = g;
  }
  if (scale) inner.scale.setScalar(scale);
  root.userData.parts = parts; root.userData.inner = inner;
  return root;
}
function humanoid(o) {
  // o: skin, shirt, pants, boots, hair..., extra parts
  const hw = o.hip || 0.32, sh = o.sh || 0.8, legH = o.legH || 1.2, bodyH = o.bodyH || 1.1;
  const def = {
    legL: { p: [-hw, legH, 0], b: [[0, -legH / 2, 0, o.legW || 0.45, legH, 0.5, o.pants], [0, -legH + 0.12, 0.06, (o.legW || 0.45) + 0.06, 0.25, 0.62, o.boots]] },
    legR: { p: [hw, legH, 0], b: [[0, -legH / 2, 0, o.legW || 0.45, legH, 0.5, o.pants], [0, -legH + 0.12, 0.06, (o.legW || 0.45) + 0.06, 0.25, 0.62, o.boots]] },
    body: { p: [0, legH, 0], b: o.body, g: o.bodyGlow },
    armL: { p: [-sh, legH + bodyH - 0.1, 0], b: o.armL || [[0, -0.45, 0, 0.38, 0.95, 0.42, o.sleeve || o.skin], [0, -0.85, 0, 0.36, 0.22, 0.4, o.skin]], g: o.armLGlow },
    armR: { p: [sh, legH + bodyH - 0.1, 0], b: o.armR || [[0, -0.45, 0, 0.38, 0.95, 0.42, o.sleeve || o.skin], [0, -0.85, 0, 0.36, 0.22, 0.4, o.skin]], g: o.armRGlow },
  };
  return def;
}
const MODEL_DEFS = {
  axe: () => humanoid({
    pants: '#3b2a1e', boots: '#1d1d1d', skin: '#b8352b', hip: 0.36, sh: 0.92, legH: 1.25, bodyH: 1.3, legW: 0.52,
    body: [[0, 0.65, 0, 1.35, 1.3, 0.8, '#b8352b'], [0, 0.12, 0, 1.42, 0.24, 0.86, '#5a3a1a'], [0, 0.12, 0.44, 0.3, 0.3, 0.06, '#d4af37'],
      [-0.78, 1.18, 0, 0.5, 0.36, 0.9, '#555a60'], [0.78, 1.18, 0, 0.5, 0.36, 0.9, '#555a60'], [0, 0.9, 0.41, 1.0, 0.12, 0.04, '#6b1d16'],
      [0, 1.75, 0, 0.9, 0.9, 0.9, '#c43a2e'], [0, 2.28, -0.12, 0.32, 0.4, 0.32, '#111'], [0, 2.05, 0, 0.94, 0.16, 0.94, '#111'],
      [0, 1.42, 0.42, 0.66, 0.36, 0.14, '#151515'], [0, 1.25, 0.45, 0.3, 0.3, 0.1, '#151515'],
      [-0.2, 1.8, 0.46, 0.16, 0.1, 0.02, '#ffe9a8'], [0.2, 1.8, 0.46, 0.16, 0.1, 0.02, '#ffe9a8'], [0, 1.93, 0.46, 0.6, 0.07, 0.02, '#111']],
    armR: [[0, -0.45, 0, 0.42, 0.95, 0.46, '#b8352b'], [0, -0.82, 0, 0.48, 0.28, 0.52, '#3a3a3a'],
      [0, -1.0, 0.4, 0.16, 0.16, 2.0, '#6b4423'], [0, -0.95, 1.25, 0.12, 1.3, 0.6, '#d8d8d8'], [0, -0.95, 1.58, 0.1, 1.5, 0.12, '#f0f0f0'], [0, -0.95, 0.98, 0.14, 0.5, 0.12, '#888']],
  }),
  lina: () => humanoid({
    pants: '#f2c9a0', boots: '#8a1f10', skin: '#f2c9a0', hip: 0.24, sh: 0.6, legH: 1.2, bodyH: 1.05, legW: 0.34,
    sleeve: '#f08a24',
    body: [[0, 0.18, 0, 0.98, 0.55, 0.72, '#e8641c'], [0, 0.72, 0, 0.74, 0.9, 0.48, '#f39a2c'], [0, 0.5, 0.25, 0.76, 0.12, 0.04, '#b71c1c'],
      [0, 1.55, 0, 0.78, 0.78, 0.78, '#f2c9a0'], [0, 1.95, -0.02, 0.88, 0.32, 0.88, '#d6261a'], [0, 1.4, -0.4, 0.9, 1.1, 0.18, '#d6261a'],
      [-0.42, 1.55, 0, 0.12, 0.7, 0.7, '#d6261a'], [0.42, 1.55, 0, 0.12, 0.7, 0.7, '#d6261a'], [0, 0.85, -0.5, 0.6, 1.2, 0.16, '#c41f14'],
      [-0.18, 1.58, 0.4, 0.14, 0.12, 0.02, '#3a1a0a'], [0.18, 1.58, 0.4, 0.14, 0.12, 0.02, '#3a1a0a'], [0, 1.85, 0.4, 0.7, 0.14, 0.04, '#d6261a']],
    bodyGlow: [[-0.3, 2.22, 0, 0.22, 0.32, 0.22, '#ff7a1f'], [0.3, 2.2, 0.05, 0.2, 0.3, 0.2, '#ff7a1f'], [0, 2.25, -0.2, 0.2, 0.36, 0.2, '#ffb000']],
    armLGlow: [[0, -1.08, 0.08, 0.3, 0.3, 0.3, '#ffb300']], armRGlow: [[0, -1.08, 0.08, 0.3, 0.3, 0.3, '#ffb300']],
  }),
  melee0: () => humanoid({
    pants: '#5b6a3a', boots: '#3a2a1a', skin: '#e0b48a', sleeve: '#9aa4ad', hip: 0.25, sh: 0.6, legH: 0.85, bodyH: 0.9, legW: 0.36,
    body: [[0, 0.45, 0, 0.9, 0.9, 0.56, '#aab4bd'], [0, 0.45, 0.29, 0.5, 0.5, 0.02, '#3fa34d'], [0, 1.25, 0, 0.62, 0.62, 0.62, '#e0b48a'], [0, 1.6, 0, 0.7, 0.2, 0.7, '#9aa4ad'], [0, 1.3, 0.32, 0.5, 0.1, 0.02, '#333']],
    armR: [[0, -0.35, 0, 0.3, 0.75, 0.32, '#9aa4ad'], [0, -0.75, 0.25, 0.1, 0.1, 0.6, '#6b4423'], [0, -0.75, 0.8, 0.12, 0.14, 1.0, '#e6e6e6']],
    armL: [[0, -0.35, 0, 0.3, 0.75, 0.32, '#9aa4ad'], [-0.12, -0.55, 0.15, 0.12, 0.7, 0.6, '#3fa34d']],
  }),
  ranged0: () => humanoid({
    pants: '#2b4f8a', boots: '#222', skin: '#e0b48a', sleeve: '#3367b0', hip: 0.22, sh: 0.55, legH: 0.85, bodyH: 0.9, legW: 0.32,
    body: [[0, 0.4, 0, 0.82, 0.95, 0.5, '#3367b0'], [0, 0.0, 0, 0.9, 0.3, 0.58, '#2b4f8a'], [0, 1.22, 0, 0.6, 0.6, 0.6, '#e0b48a'], [0, 1.6, 0, 0.66, 0.3, 0.66, '#264a85'], [0, 1.85, 0, 0.3, 0.3, 0.3, '#264a85']],
    armR: [[0, -0.35, 0, 0.28, 0.75, 0.3, '#3367b0'], [0, -0.3, 0.3, 0.12, 1.6, 0.12, '#6b4423']], armRGlow: [[0, 0.55, 0.3, 0.3, 0.3, 0.3, '#7fd7ff']],
  }),
  melee1: () => humanoid({
    pants: '#2a1e22', boots: '#111', skin: '#7a6a5a', sleeve: '#3a2a2e', hip: 0.25, sh: 0.62, legH: 0.85, bodyH: 0.95, legW: 0.38,
    body: [[0, 0.47, 0, 0.94, 0.95, 0.6, '#3a2a2e'], [-0.45, 0.95, 0, 0.2, 0.3, 0.2, '#888'], [0.45, 0.95, 0, 0.2, 0.3, 0.2, '#888'], [0, 1.3, 0, 0.64, 0.64, 0.64, '#5a4a44'], [-0.25, 1.75, 0, 0.12, 0.35, 0.12, '#ddd'], [0.25, 1.75, 0, 0.12, 0.35, 0.12, '#ddd']],
    bodyGlow: [[-0.15, 1.35, 0.33, 0.12, 0.08, 0.02, '#ff2a1a'], [0.15, 1.35, 0.33, 0.12, 0.08, 0.02, '#ff2a1a']],
    armR: [[0, -0.35, 0, 0.32, 0.75, 0.34, '#3a2a2e'], [0, -0.75, 0.6, 0.14, 0.4, 1.0, '#8a8a8a'], [0, -0.55, 1.05, 0.14, 0.4, 0.14, '#8a8a8a']],
  }),
  ranged1: () => humanoid({
    pants: '#3a1f4a', boots: '#111', skin: '#8a7a6a', sleeve: '#5a2a7a', hip: 0.22, sh: 0.55, legH: 0.85, bodyH: 0.9, legW: 0.32,
    body: [[0, 0.4, 0, 0.82, 0.95, 0.5, '#5a2a7a'], [0, 0.0, 0, 0.9, 0.3, 0.58, '#3a1f4a'], [0, 1.22, 0, 0.6, 0.6, 0.6, '#3a2a3a'], [0, 1.6, 0, 0.7, 0.24, 0.7, '#2a1530'], [0, 1.85, 0.1, 0.26, 0.36, 0.26, '#2a1530']],
    bodyGlow: [[-0.14, 1.26, 0.31, 0.12, 0.08, 0.02, '#9dff3a'], [0.14, 1.26, 0.31, 0.12, 0.08, 0.02, '#9dff3a']],
    armR: [[0, -0.35, 0, 0.28, 0.75, 0.3, '#5a2a7a'], [0, -0.3, 0.3, 0.12, 1.6, 0.12, '#3a2a1a']], armRGlow: [[0, 0.55, 0.3, 0.32, 0.32, 0.32, '#9dff3a']],
  }),
};
function towerDef(team) {
  const st = team === RAD ? ['#d8d2c0', '#bdb6a2', '#3fa34d', '#7dffb0'] : ['#3a2f33', '#2a2226', '#a32020', '#ff4a2a'];
  return {
    base: { p: [0, 0, 0], b: [[0, 0.5, 0, 3.4, 1, 3.4, st[1]], [0, 2.6, 0, 2.2, 3.4, 2.2, st[0]], [0, 2.6, 0, 2.5, 0.4, 2.5, st[1]], [0, 4.5, 0, 2.9, 0.5, 2.9, st[2]], [0, 5.1, 0, 2.4, 0.8, 2.4, st[0]],
      [-1.1, 5.8, -1.1, 0.5, 0.7, 0.5, st[1]], [1.1, 5.8, -1.1, 0.5, 0.7, 0.5, st[1]], [-1.1, 5.8, 1.1, 0.5, 0.7, 0.5, st[1]], [1.1, 5.8, 1.1, 0.5, 0.7, 0.5, st[1]], [0, 2.4, 1.12, 0.8, 1.2, 0.05, '#222']] },
    crystal: { p: [0, 6.8, 0], g: [[0, 0, 0, 0.9, 1.4, 0.9, st[3]], [0, 0, 0, 0.5, 2.0, 0.5, st[3]]] },
  };
}
function barracksDef(team) {
  const st = team === RAD ? ['#d8d2c0', '#bdb6a2', '#3fa34d', '#7dffb0'] : ['#3a2f33', '#2a2226', '#a32020', '#ff4a2a'];
  return { base: { p: [0, 0, 0], b: [[0, 1.1, 0, 5, 2.2, 4, st[0]], [0, 2.5, 0, 5.4, 0.6, 4.4, st[2]], [0, 3.1, 0, 4, 0.6, 3, st[2]], [0, 3.6, 0, 2.4, 0.4, 1.6, st[2]], [0, 0.8, 2.02, 1.2, 1.6, 0.05, '#2a1a10'], [-1.8, 1.4, 2.02, 0.6, 0.6, 0.05, '#222'], [1.8, 1.4, 2.02, 0.6, 0.6, 0.05, '#222'], [-2.6, 2.6, 0, 0.3, 3.6, 0.3, st[1]], [2.6, 2.6, 0, 0.3, 3.6, 0.3, st[1]]] },
    crystal: { p: [0, 4.4, 0], g: [[0, 0, 0, 0.6, 0.6, 0.6, st[3]]] } };
}
function ancientDef(team) {
  const st = team === RAD ? ['#f2eee0', '#d4af37', '#cfc8b2', '#6fffa8'] : ['#2a1e22', '#8a1010', '#3a2a2e', '#ff5a1a'];
  return { base: { p: [0, 0, 0], b: [[0, 0.75, 0, 9, 1.5, 9, st[2]], [0, 2.25, 0, 7, 1.5, 7, st[0]], [0, 3.6, 0, 5.2, 1.2, 5.2, st[1]], [0, 4.8, 0, 3.6, 1.2, 3.6, st[0]],
      [-4, 3, -4, 1, 6, 1, st[1]], [4, 3, -4, 1, 6, 1, st[1]], [-4, 3, 4, 1, 6, 1, st[1]], [4, 3, 4, 1, 6, 1, st[1]], [0, 5.8, 0, 1.6, 0.8, 1.6, st[1]]] },
    crystal: { p: [0, 8.6, 0], g: [[0, 0, 0, 2, 3, 2, st[3]], [0, 0, 0, 1.2, 4.2, 1.2, st[3]], [0, 0, 0, 2.6, 1, 0.6, st[3]], [0, 0, 0, 0.6, 1, 2.6, st[3]]] } };
}
function fountainDef(team) {
  const st = team === RAD ? ['#e8e2d0', '#3fa34d', '#7dffb0'] : ['#3a2f33', '#a32020', '#ff4a2a'];
  return { base: { p: [0, 0, 0], b: [[0, 0.3, 0, 7, 0.6, 7, st[0]], [0, 0.8, 0, 5, 0.6, 5, st[1]], [-3, 2, -3, 0.8, 4, 0.8, st[0]], [3, 2, -3, 0.8, 4, 0.8, st[0]], [-3, 2, 3, 0.8, 4, 0.8, st[0]], [3, 2, 3, 0.8, 4, 0.8, st[0]]],
      g: [[0, 1.15, 0, 4.4, 0.12, 4.4, st[2]]] }, crystal: { p: [0, 3.2, 0], g: [[0, 0, 0, 1.2, 1.2, 1.2, st[2]]] } };
}

// ================= particles (single InstancedMesh) =================
const PMAX = 4000;
const pMesh = new T.InstancedMesh(boxG, new T.MeshBasicMaterial({ transparent: true, opacity: 0.95, depthWrite: false }), PMAX);
pMesh.frustumCulled = false; pMesh.count = 0;
pMesh.setColorAt(0, _c.set('#fff')); scene.add(pMesh);
const parts = [];
function spawnP(x, y, z, vx, vy, vz, life, size, color, grav = 0) {
  if (parts.length >= PMAX) return;
  parts.push({ x, y, z, vx, vy, vz, life, max: life, size, col: new T.Color(color), grav, rot: Math.random() * 3 });
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
