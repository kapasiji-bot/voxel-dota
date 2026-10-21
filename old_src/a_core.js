'use strict';
const T = THREE;
const $ = id => document.getElementById(id);
const MAPH = 80, TILE = 2, GN = 80;
const RAD = 0, DIRE = 1;
const XP_MULT = 1.4;
const XP_TABLE = [0,240,640,1160,1760,2440,3200,4000,4900,5900,7000,8200,9500,10900,12400,14000,15700,17500,19400,21400,23600,26000,28600,31400,34400];
const MAX_LEVEL = 25;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hash2(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function d2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function dst(a, b) { return Math.sqrt(d2(a, b)); }
function fmtTime(t) { const n = Math.floor(Math.abs(t)); return (t < 0 ? '-' : '') + String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); }

// ================= renderer / scene =================
const canvas = $('gl');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
const scene = new T.Scene();
scene.background = new T.Color('#8cc0ec');
scene.fog = new T.Fog('#8cc0ec', 150, 320);
const camera = new T.PerspectiveCamera(42, innerWidth / innerHeight, 1, 600);
scene.add(new T.HemisphereLight('#ffffff', '#4a5a3a', 0.62));
const sun = new T.DirectionalLight('#fff1d6', 0.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 260 });
sun.shadow.bias = -0.0006;
scene.add(sun); scene.add(sun.target);
const ovc = $('ov'), ov = ovc.getContext('2d');
function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  ovc.width = innerWidth; ovc.height = innerHeight;
}
addEventListener('resize', onResize); onResize();

// ================= lanes =================
const LANE_DEF = {
  top: [[-64, 64], [-68, 50], [-68, -60], [-60, -68], [50, -68], [64, -64]],
  mid: [[-64, 64], [64, -64]],
  bot: [[-64, 64], [-50, 68], [60, 68], [68, 60], [68, -50], [64, -64]],
};
const LANE_KEYS = ['top', 'mid', 'bot'];
const LANE_CN = { top: '上路', mid: '中路', bot: '下路' };
const lanes = {};
for (const k of LANE_KEYS) {
  const pts = LANE_DEF[k].map(p => ({ x: p[0], z: p[1] }));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dst(pts[i - 1], pts[i]));
  lanes[k] = { pts, cum, len: cum[cum.length - 1] };
}
function lanePoint(L, s) {
  s = clamp(s, 0, L.len);
  for (let i = 1; i < L.pts.length; i++) {
    if (s <= L.cum[i] || i === L.pts.length - 1) {
      const a = L.pts[i - 1], b = L.pts[i], sl = L.cum[i] - L.cum[i - 1];
      const t = (s - L.cum[i - 1]) / sl;
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / sl, dz: (b.z - a.z) / sl };
    }
  }
}
function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az, wx = px - ax, wz = pz - az;
  const t = clamp((wx * vx + wz * vz) / (vx * vx + vz * vz), 0, 1);
  const dx = px - (ax + vx * t), dz = pz - (az + vz * t);
  return Math.sqrt(dx * dx + dz * dz);
}
function laneDist(x, z) {
  let m = 1e9;
  for (const k of LANE_KEYS) { const p = lanes[k].pts; for (let i = 1; i < p.length; i++) m = Math.min(m, segDist(x, z, p[i - 1].x, p[i - 1].z, p[i].x, p[i].z)); }
  return m;
}
const riverDist = (x, z) => Math.abs(x - z) / Math.SQRT2;
function inBase(x, z) {
  if (Math.max(Math.abs(x + 63), Math.abs(z - 63)) < 17) return RAD;
  if (Math.max(Math.abs(x - 63), Math.abs(z + 63)) < 17) return DIRE;
  return -1;
}
// position on lane measured from a team's own ancient, offset toward map centre
function placeOnLane(k, team, s, off) {
  const L = lanes[k]; const p = lanePoint(L, team === RAD ? s : L.len - s);
  let nx = -p.dz, nz = p.dx;
  if (nx * (0 - p.x) + nz * (0 - p.z) < 0) { nx = -nx; nz = -nz; }
  if (k === 'mid') { nx = team === RAD ? Math.SQRT1_2 : -Math.SQRT1_2; nz = nx; }
  return { x: p.x + nx * off, z: p.z + nz * off };
}

// ================= grid =================
const TT = { GRASS: 0, LANE: 1, WATER: 2, FORD: 3, BASE: 4, CLIFF: 5 };
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
  else if (rd < 4.6) t = ld < 3.4 ? TT.FORD : TT.WATER;
  else if (ld < 3.4) t = TT.LANE;
  else t = TT.GRASS;
  tiles[k] = t;
  hmap[k] = t === TT.WATER ? -0.55 : t === TT.FORD ? -0.3 : 0;
  walk[k] = t === TT.CLIFF ? 0 : 1;
  if (t === TT.GRASS && ld > 5.5 && rd > 6.5) {
    const n = (Math.sin(x * 0.13) + Math.sin(z * 0.11 + 1.3) + Math.sin((x + z) * 0.07 + 0.5)) / 3;
    const outer = (x < -71 || x > 71 || z < -71 || z > 71);
    const clearing = (Math.hypot(x + 30, z + 25) < 6) || (Math.hypot(x - 30, z - 25) < 6) || (Math.hypot(x + 25, z - 30) < 5) || (Math.hypot(x - 25, z + 30) < 5);
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

// ================= pathfinding (A*) =================
const gScore = new Float32Array(GN * GN), fromA = new Int32Array(GN * GN), closedA = new Uint32Array(GN * GN), openTag = new Uint32Array(GN * GN);
let searchId = 1;
function nearestWalkCell(i, j) {
  if (i >= 0 && j >= 0 && i < GN && j < GN && walk[j * GN + i]) return [i, j];
  for (let r = 1; r < 12; r++) {
    let best = null, bd = 1e9;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= GN || b >= GN) continue;
      if (walk[b * GN + a]) { const d = di * di + dj * dj; if (d < bd) { bd = d; best = [a, b]; } }
    }
    if (best) return best;
  }
  return null;
}
function los(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.5);
  for (let s = 1; s <= n; s++) { const t = s / n; if (!isWalk(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}
function findPath(sx, sz, tx, tz) {
  let si = clamp(cellOf(sx), 0, GN - 1), sj = clamp(cellOf(sz), 0, GN - 1);
  const s0 = nearestWalkCell(si, sj); if (!s0) return null; [si, sj] = s0;
  const t0 = nearestWalkCell(clamp(cellOf(tx), 0, GN - 1), clamp(cellOf(tz), 0, GN - 1)); if (!t0) return null;
  const [ti, tj] = t0; const exact = isWalk(tx, tz);
  if (los(sx, sz, exact ? tx : cc(ti), exact ? tz : cc(tj))) return [{ x: exact ? tx : cc(ti), z: exact ? tz : cc(tj) }];
  searchId++;
  const heap = []; // [f, k]
  const push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const h = (i, j) => { const dx = Math.abs(i - ti), dy = Math.abs(j - tj); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  const sk = sj * GN + si, tk = tj * GN + ti;
  gScore[sk] = 0; fromA[sk] = -1; openTag[sk] = searchId; push(h(si, sj), sk);
  let found = false, iter = 0;
  while (heap.length && iter++ < 7000) {
    const [, k] = pop();
    if (closedA[k] === searchId) continue; closedA[k] = searchId;
    if (k === tk) { found = true; break; }
    const ci = k % GN, cj = (k / GN) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GN || nj >= GN) continue;
      const nk = nj * GN + ni; if (!walk[nk] || closedA[nk] === searchId) continue;
      if (di && dj && (!walk[cj * GN + ni] || !walk[nj * GN + ci])) continue;
      const g = gScore[k] + (di && dj ? Math.SQRT2 : 1);
      if (openTag[nk] !== searchId || g < gScore[nk]) { openTag[nk] = searchId; gScore[nk] = g; fromA[nk] = k; push(g + h(ni, nj), nk); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = tk; k !== -1; k = fromA[k]) cells.push(k); cells.reverse();
  const pts = cells.map(k => ({ x: cc(k % GN), z: cc((k / GN) | 0) }));
  if (exact) pts[pts.length - 1] = { x: tx, z: tz };
  // smoothing
  const out = []; let cur = { x: sx, z: sz }, idx = 0;
  while (idx < pts.length) {
    let far = idx;
    for (let j = pts.length - 1; j > idx; j--) if (los(cur.x, cur.z, pts[j].x, pts[j].z)) { far = j; break; }
    out.push(pts[far]); cur = pts[far]; idx = far + 1;
  }
  return out;
}
