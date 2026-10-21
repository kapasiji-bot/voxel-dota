// render/walls.js — voxel rock pillars for map/walls.js walls: rise from the ground when a wall goes up, sink and vanish when it expires.
let WALL_GEO = null; const WALL_FX = [];
function renderWalls(rdt) {
  while (WALLS.changes.length) {
    const c = WALLS.changes.shift();
    if (c.add) {
      WALL_GEO = WALL_GEO || voxGeo([[0, 0.9, 0, 1.9, 1.8, 1.9, '#6d4c41'], [0.2, 2.1, -0.1, 1.4, 1.0, 1.5, '#8d6e63'], [-0.3, 2.8, 0.2, 0.8, 0.7, 0.8, '#a1887f'], [0.5, 0.3, 0.5, 0.8, 0.6, 0.8, '#5d4037']]);
      c.w.meshes = c.w.cells.map(k => { const p = treeXZ(k), m = new T.Mesh(WALL_GEO, vmat); m.castShadow = true; m.position.set(p.x, -3.2 + heightAt(p.x, p.z), p.z); m.rotation.y = hash2(k, 7) * 3; scene.add(m);
        burst(p.x, 0.5, p.z, 6, ['#8d6e63', '#bcaaa4', '#5d4037'], 4, 0.6, 0.3, 4); return m; });
      WALL_FX.push({ w: c.w, t: 0, dir: 1 });
    } else { const f = WALL_FX.find(f => f.w === c.w); if (f) f.dir = -1; }
  }
  for (let i = WALL_FX.length - 1; i >= 0; i--) {
    const f = WALL_FX[i]; f.t = clamp(f.t + rdt * (f.dir > 0 ? 6 : 2.5) * f.dir, 0, 1);
    for (const m of f.w.meshes) m.position.y = heightAt(m.position.x, m.position.z) - 3.2 * (1 - f.t);
    if (f.dir < 0 && f.t <= 0) { for (const m of f.w.meshes) scene.remove(m); WALL_FX.splice(i, 1); }
  }
}
