// render/voxel.js — merge boxes into vertex-coloured geometry; buildModel packs parts into 1–2 SkinnedMeshes
// (Lambert + optional glow) so a humanoid is ~2 draw calls instead of ~5–10. Part pivots are Bones; syncModel still
// writes rotation/position on u.parts.*. Geometry is cached per model key. Tradeoff: first bind costs a bit more RAM
// per unique key; animations/fog ghost/illusion tint keep working via shared materials + bone transforms.
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
function skinGeo(partsBoxes) {
  const pos = [], nor = [], col = [], idx = [], skinI = [], skinW = []; const c = new T.Color();
  for (const [bi, boxes] of partsBoxes) {
    for (const b of boxes) {
      const [x, y, z, w, h, d, color] = b; c.set(color);
      const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z);
      const p = g.attributes.position, n = g.attributes.normal, base = pos.length / 3;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i));
        const ny = n.getY(i), s = ny > 0.5 ? 1.0 : ny < -0.5 ? 0.6 : 0.88;
        col.push(c.r * s, c.g * s, c.b * s);
        skinI.push(bi, 0, 0, 0); skinW.push(1, 0, 0, 0);
      }
      const ix = g.index; for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
      g.dispose();
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(skinI, 4));
  geo.setAttribute('skinWeight', new T.Float32BufferAttribute(skinW, 4));
  geo.setIndex(idx); geo.computeBoundingSphere();
  return geo;
}
// def: { partName: {p:[px,py,pz], b:[boxes], g:[glow boxes]} }
function buildModel(key, def, scale) {
  const root = new T.Group(), inner = new T.Group(); root.add(inner);
  const parts = {}, bones = [];
  const rootBone = new T.Bone(); rootBone.name = '_root'; bones.push(rootBone);
  const lambert = [], glow = [];
  for (const name in def) {
    const pd = def[name], bone = new T.Bone(); bone.name = name;
    bone.position.set(pd.p[0], pd.p[1], pd.p[2]); rootBone.add(bone); bones.push(bone); parts[name] = bone;
    const bi = bones.length - 1;
    if (pd.b && pd.b.length) lambert.push([bi, pd.b]);
    if (pd.g && pd.g.length) glow.push([bi, pd.g]);
  }
  const skel = new T.Skeleton(bones);
  inner.add(rootBone);
  if (lambert.length) {
    const ck = key + '|skin'; const geo = geoCache[ck] || (geoCache[ck] = skinGeo(lambert));
    const m = new T.SkinnedMesh(geo, vmat); m.castShadow = true; m.bind(skel); inner.add(m); root.userData.body = m;
  }
  if (glow.length) {
    const ck = key + '|skin|g'; const geo = geoCache[ck] || (geoCache[ck] = skinGeo(glow));
    const m = new T.SkinnedMesh(geo, vglow); m.bind(skel); inner.add(m); root.userData.glow = m;
  }
  if (scale) inner.scale.setScalar(scale);
  root.userData.parts = parts; root.userData.inner = inner; root.userData.skeleton = skel;
  return root;
}
function humanoid(o) {
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
