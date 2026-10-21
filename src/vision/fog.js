// vision/fog.js — team vision (fog of war), sim side. Each team has a GN×GN grid VIS[team] (1 = visible now), rebuilt
// every FOG.period seconds (or at once when FOG.dirty) by line-of-sight checks from every vision source. Trees and cliffs block
// line of sight (the blocking cell itself is seen). Buildings' vision is cached per day/night until a building dies.
// Day/night: 5 min each (G.time % 600 < 300 = day); night shrinks most vision radii. canSee(team, u) is THE visibility
// test for gameplay (targeting, acquisition, bots) — it also handles invisibility, true sight and reveal (vision/invis.js).
const VIS = [new Uint8Array(GN * GN), new Uint8Array(GN * GN)];
const FOG = { explored: [new Uint8Array(GN * GN), new Uint8Array(GN * GN)], t: 0, period: 0.2, dirty: true, off: false, updates: 0, staticKey: ['', ''], static: [new Uint8Array(GN * GN), new Uint8Array(GN * GN)] };
const sightBlock = new Uint8Array(GN * GN);
for (let k = 0; k < GN * GN; k++) sightBlock[k] = treeAt[k] || tiles[k] === TT.CLIFF ? 1 : 0;
const DAY_LEN = 300;
const isNight = (t = G.time) => (t % (2 * DAY_LEN)) >= DAY_LEN;
// vision radius in world units (DOTA-like ratios: hero 1800/800, creep 1400/800, tower 1900/800 scaled to this map)
function visionRadius(u) {
  const n = isNight(); let r;
  if (u.isWard) return WARD_TYPES[u.ward].vision;   // wards: same day and night
  if (u.isHero || u.isIllusion) r = n ? 14 : 22;
  else if (u.visionR) r = n ? Math.round(u.visionR * 0.65) : u.visionR;   // summons
  else if (u.kind === 'melee' || u.kind === 'ranged') r = n ? 9 : 14;
  else if (u.kind === 'tower') r = n ? 16 : 24;
  else if (u.kind === 'fountain') r = 26;
  else if (u.isBuilding) r = n ? 14 : 18;
  else r = 10;
  return r + (u.visionBonus || 0);
}
// LOS templates per radius (in cells): for every target offset within the radius, the cells whose CENTRAL area the line
// from the origin centre to the target centre passes through (grazing a tree's corner does not block). Built once per radius.
const _losCache = {};
function losTemplate(rc) {
  if (_losCache[rc]) return _losCache[rc];
  const out = [];   // flat: [di, dj, n, c0i, c0j, c1i, c1j, ...]
  for (let dj = -rc; dj <= rc; dj++) for (let di = -rc; di <= rc; di++) {
    const d = Math.hypot(di, dj); if (d > rc + 0.3 || (!di && !dj)) continue;
    const cells = [], seen = new Set();
    for (let s = 0.25; s < d - 0.5; s += 0.25) {
      const px = di * s / d, pz = dj * s / d, ci = Math.round(px), cj = Math.round(pz);
      if ((!ci && !cj) || Math.max(Math.abs(px - ci), Math.abs(pz - cj)) > 0.32) continue;
      const key = ci * 1000 + cj; if (!seen.has(key)) { seen.add(key); cells.push(ci, cj); }
    }
    out.push(di, dj, cells.length / 2, ...cells);
  }
  return (_losCache[rc] = new Int8Array(out));
}
function castVision(grid, x, z, r) {
  const ci = cellOf(x), cj = cellOf(z); if (ci < 0 || cj < 0 || ci >= GN || cj >= GN) return;
  grid[cj * GN + ci] = 1;
  const T = losTemplate(Math.round(r / TILE));
  for (let p = 0; p < T.length;) {
    const i = ci + T[p], j = cj + T[p + 1], n = T[p + 2]; p += 3;
    let ok = i >= 0 && j >= 0 && i < GN && j < GN;
    if (ok) for (let q = 0; q < n; q++) { const a = ci + T[p + q * 2], b = cj + T[p + q * 2 + 1]; if (a >= 0 && b >= 0 && a < GN && b < GN && sightBlock[b * GN + a]) { ok = false; break; } }
    p += n * 2;
    if (ok) grid[j * GN + i] = 1;
  }
}
const _srcStamp = new Int32Array(GN * GN); let _stampN = 1;
function updateVision() {
  FOG.updates++;
  for (let team = 0; team < 2; team++) {
    const grid = VIS[team], st = FOG.static[team];
    let key = (isNight() ? 'n' : 'd') + TREES.gen + '/' + WALLS.gen + ':'; for (const u of units) if (u.isBuilding && u.team === team && !u.dead) key += u.id + ',';
    if (FOG.staticKey[team] !== key) { FOG.staticKey[team] = key; st.fill(0); for (const u of units) if (u.isBuilding && u.team === team && !u.dead) castVision(st, u.x, u.z, visionRadius(u)); }
    grid.set(st); _stampN++;
    for (const u of units) {
      if (u.dead || u.isBuilding || u.team !== team) continue;
      const r = visionRadius(u), k = cellOf(u.z) * GN + cellOf(u.x);
      if (!u.isHero && !u.isWard && !u.owner && _srcStamp[k] === _stampN) continue;   // creeps sharing a cell add nothing new
      _srcStamp[k] = _stampN; castVision(grid, u.x, u.z, r);
    }
    for (const v of (FOG.wards || [])) if (v.team === team && v.t > G.time) castVision(grid, v.x, v.z, v.r);
    const ex = FOG.explored[team]; for (let k = 0; k < GN * GN; k++) ex[k] |= grid[k];
  }
}
function tickVision(dt) {
  FOG.t -= dt;
  if (FOG.t <= 0 || FOG.dirty) { FOG.t = FOG.period; FOG.dirty = false; updateVision(); }
}
// temporary vision at a point (e.g. spells): {team, x, z, r, t: expiry}
function addVisionAt(team, x, z, r, dur) { (FOG.wards = (FOG.wards || []).filter(v => v.t > G.time)).push({ team, x, z, r, t: G.time + dur }); FOG.dirty = true; }
const visAt = (team, x, z) => { const i = cellOf(x), j = cellOf(z); return i >= 0 && j >= 0 && i < GN && j < GN && VIS[team][j * GN + i] === 1; };
// gameplay visibility of unit u for `team`
function canSee(team, u) {
  if (!u) return false;
  if (u.team === team || u.isBuilding) return true;
  if (u.dead) return false;
  let ts = false;
  if (u.mods.length) for (const m of u.mods) {
    const d = m.def; if (d.states && d.states.includes('hidden')) return false;
    if (m.src && m.src.team === team) { if (d.reveal) return true; if (d.trueSight) ts = true; }
  }
  if (team === NEUTRAL) return !isInvisible(u);   // neutrals / Roshan: no fog of their own (map/jungle.js)
  if (u.blurHid && u.blurHid[team]) return false;   // vision/blur.js (Phantom Assassin's Blur)
  if (!ts && isInvisible(u)) return sentrySees(team, u);   // sentry wards: true sight (and detection) within their radius
  return FOG.off || visAt(team, u.x, u.z);
}
