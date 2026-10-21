// map/path.js — A* pathfinding on the walk grid + line-of-sight smoothing.
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
