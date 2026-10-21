// map/grid.js — 80x80 tile grid: tile types, trees, walkability, building occupancy.
// ================= grid =================
const TT = { GRASS: 0, LANE: 1, WATER: 2, FORD: 3, BASE: 4, CLIFF: 5, PIT: 6 };   // PIT: Roshan pit floor (map/jungle.js)
const tiles = new Uint8Array(GN * GN), treeAt = new Uint8Array(GN * GN), walk = new Uint8Array(GN * GN), hmap = new Float32Array(GN * GN);
const blockCount = new Uint8Array(GN * GN); // building occupancy counter
const cc = i => -MAPH + (i + 0.5) * TILE;
const cellOf = v => Math.floor((v + MAPH) / TILE);
function isWalk(x, z) { const i = cellOf(x), j = cellOf(z); if (i < 0 || j < 0 || i >= GN || j >= GN) return false; return walk[j * GN + i] === 1; }
function heightAt(x, z) { const i = cellOf(x), j = cellOf(z); if (i < 0 || j < 0 || i >= GN || j >= GN) return 0; return hmap[j * GN + i]; }
for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
  const x = cc(i), z = cc(j), k = j * GN + i;
  const b = inBase(x, z), ld = laneDist(x, z), rd = riverDist(x, z);
  let t;
  if (i < 3 || j < 3 || i >= GN - 3 || j >= GN - 3) t = TT.CLIFF;
  else if (b >= 0) t = TT.BASE;
  else if (jungleTile(x, z)) t = jungleTile(x, z) === 1 ? TT.PIT : TT.CLIFF;   // map/jungle.js: Roshan pit + cliff ring
  else if (rd < 4.6) t = ld < 3.4 ? TT.FORD : TT.WATER;
  else if (ld < 3.4) t = TT.LANE;
  else t = TT.GRASS;
  tiles[k] = t;
  hmap[k] = t === TT.WATER ? -0.55 : t === TT.FORD ? -0.3 : t === TT.PIT ? -0.4 : 0;
  walk[k] = t === TT.CLIFF ? 0 : 1;
  if (t === TT.GRASS && ld > 5.5 && rd > 6.5) {
    const n = (Math.sin(x * 0.13) + Math.sin(z * 0.11 + 1.3) + Math.sin((x + z) * 0.07 + 0.5)) / 3;
    const outer = (x < -71 || x > 71 || z < -71 || z > 71);
    const clearing = jungleClear(x, z) || (Math.hypot(x + 30, z + 25) < 6) || (Math.hypot(x - 30, z - 25) < 6) || (Math.hypot(x + 25, z - 30) < 5) || (Math.hypot(x - 25, z + 30) < 5);
    const p = outer ? 0.9 : clearing ? 0 : 0.28 + n * 0.32;
    if (hash2(i, j) < p) { treeAt[k] = 1; walk[k] = 0; }
  }
}
function setBlock(x, z, r, add) {
  const i0 = cellOf(x - r), i1 = cellOf(x + r), j0 = cellOf(z - r), j1 = cellOf(z + r);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (i < 0 || j < 0 || i >= GN || j >= GN) continue;
    if (Math.hypot(cc(i) - x, cc(j) - z) > r + 0.4) continue;
    const k = j * GN + i; blockCount[k] += add ? 1 : -1;
    walk[k] = (blockCount[k] > 0 || treeAt[k] || tiles[k] === TT.CLIFF) ? 0 : 1;
  }
}

