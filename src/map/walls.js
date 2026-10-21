// map/walls.js — temporary terrain walls (Fissure). A wall is a set of grid cells that block pathing (blockCount++) for `dur`
// seconds and blocks line of sight while it stands (B6; sightBlock + WALLS.gen in the static vision key). Units standing on a new wall are shoved to the side; every unit repaths.
// API: wallLine(x, z, dir, len) → cells; addWall(cells, dur, by, side{x,z}) → wall; tickWalls() expires them.
// Render side: WALLS.changes ({w, add}) → render/walls.js. Events: wallUp {cells, by}, wallDown {cells}.
const WALLS = { list: [], changes: [], gen: 0, cnt: new Uint8Array(GN * GN) };
function wallLine(x, z, dir, len) {
  const out = [], seen = new Set();
  for (let s = 0; s <= len; s += 0.5) {
    const i = cellOf(x + dir.x * s), j = cellOf(z + dir.z * s); if (i < 1 || j < 1 || i >= GN - 1 || j >= GN - 1) break;
    const k = j * GN + i; if (seen.has(k)) continue; seen.add(k);
    if (tiles[k] === TT.CLIFF || tiles[k] === TT.BASE || blockCount[k] > 0) continue; out.push(k);
  }
  return out;
}
const _wallWalk = k => { walk[k] = (blockCount[k] > 0 || treeAt[k] || tiles[k] === TT.CLIFF) ? 0 : 1; sightBlock[k] = (WALLS.cnt[k] > 0 || treeAt[k] || tiles[k] === TT.CLIFF) ? 1 : 0; };
function addWall(cells, dur, by, side) {
  const w = { cells, t: G.time + dur, by };
  for (const k of cells) { blockCount[k]++; WALLS.cnt[k]++; _wallWalk(k); }
  const set = new Set(cells);
  for (const u of units) {
    if (u.dead || u.isBuilding || u.isWard) continue;
    u.path = null; u.repathT = 0;
    if (set.has(cellOf(u.z) * GN + cellOf(u.x)) || !isWalk(u.x, u.z)) {
      const s = side ? Math.sign((u.x - by.x) * side.z - (u.z - by.z) * side.x) || 1 : 1;
      AB.shove(u, side ? -side.z * s : 1, side ? side.x * s : 0);
    }
  }
  WALLS.list.push(w); WALLS.changes.push({ w, add: true }); WALLS.gen++; FOG.dirty = true;
  emit('wallUp', { cells: cells.length, by: by ? by.id : 0 });
  return w;
}
function removeWall(w) {
  const i = WALLS.list.indexOf(w); if (i < 0) return; WALLS.list.splice(i, 1);
  for (const k of w.cells) { blockCount[k] = Math.max(0, blockCount[k] - 1); WALLS.cnt[k] = Math.max(0, WALLS.cnt[k] - 1); _wallWalk(k); }
  WALLS.changes.push({ w, add: false }); WALLS.gen++; FOG.dirty = true; emit('wallDown', { cells: w.cells.length });
}
function tickWalls() { for (const w of WALLS.list.slice()) if (G.time >= w.t) removeWall(w); }
