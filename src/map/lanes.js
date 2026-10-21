// map/lanes.js — lane polylines (Radiant→Dire), lane geometry queries, base/river tests.
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

