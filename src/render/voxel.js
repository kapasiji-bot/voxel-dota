// render/voxel.js — merge boxes into vertex-coloured geometry; build animated part-based models; humanoid() helper.
// Box format: [cx, cy, cz, w, h, d, '#color'] relative to the part pivot. Models face +Z.
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
