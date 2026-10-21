// ui/minimap.js — 2D minimap: terrain image, unit dots, camera trapezoid, click to pan / right-click to move.
// ================= minimap =================
const mm = $('minimap'), mmx = mm.getContext('2d'), MMS = mm.width;
const mmBg = document.createElement('canvas'); mmBg.width = mmBg.height = MMS;
function mmTreeCell(k) {   // (re)draw one grid cell of the terrain image (trees change at runtime: map/trees.js)
  const c = mmBg.getContext('2d'), s = MMS / GN, i = k % GN, j = (k / GN) | 0; let col = tileColorCache[k];
  if (treeAt[k]) col = cc(i) > cc(j) ? [0.2, 0.22, 0.14] : [0.12, 0.33, 0.12];
  c.fillStyle = `rgb(${col[0] * 255 | 0},${col[1] * 255 | 0},${col[2] * 255 | 0})`; c.fillRect(Math.floor(i * s), Math.floor(j * s), Math.ceil(s), Math.ceil(s));
}
function buildMinimapBg() { for (let k = 0; k < GN * GN; k++) mmTreeCell(k); }
// fog layer: GN×GN canvas, drawn smoothed over the terrain image. Seen now = clear, explored before = dark, never seen = darker.
const mmFog = document.createElement('canvas'); mmFog.width = mmFog.height = GN;
const mmFogX = mmFog.getContext('2d'), mmFogImg = mmFogX.createImageData(GN, GN);
function drawMinimapFog() {
  const d = mmFogImg.data;
  const ex = FOG.explored[G.player ? G.player.team : RAD];
  for (let k = 0; k < GN * GN; k++) { d[k * 4] = 2; d[k * 4 + 1] = 5; d[k * 4 + 2] = 16; d[k * 4 + 3] = (1 - FOW_CUR[k]) * (FOG.off || ex[k] ? 185 : 228); }
  mmFogX.putImageData(mmFogImg, 0, 0); mmx.imageSmoothingEnabled = true; mmx.drawImage(mmFog, 0, 0, MMS, MMS);
}
const w2m = v => (v + MAPH) / (2 * MAPH) * MMS, m2w = v => v / MMS * 2 * MAPH - MAPH;
function drawMinimap() {
  mmx.drawImage(mmBg, 0, 0); drawMinimapFog();
  const PT = G.player ? G.player.team : RAD;
  if (WALLS.list.length) { const cs = MMS / GN; mmx.fillStyle = '#8d6e63'; for (const w of WALLS.list) for (const k of w.cells) mmx.fillRect((k % GN) * cs, ((k / GN) | 0) * cs, cs + 0.5, cs + 0.5); }   // B6: Fissure walls
  for (const u of units) {
    if (u.dead || (!u.isBuilding && !canSee(PT, u))) continue;   // enemies outside our vision are not shown
    const x = w2m(u.x), y = w2m(u.z);
    if (u.isBuilding) { const s = u.kind === 'ancient' ? 9 : u.kind === 'fountain' ? 0 : u.kind === 'barracks' ? 6 : 5; if (!s) continue; mmx.fillStyle = '#000'; mmx.fillRect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2); mmx.fillStyle = u.team === RAD ? '#5cff5c' : '#ff3b30'; mmx.fillRect(x - s / 2, y - s / 2, s, s); }
    else if (u.isWard) { const c = u.ward === 'obs' ? '#ffd54f' : '#4fc3f7'; mmx.fillStyle = u.team === PT ? '#000' : '#ff1744'; mmx.beginPath(); mmx.moveTo(x, y - 5); mmx.lineTo(x + 5, y); mmx.lineTo(x, y + 5); mmx.lineTo(x - 5, y); mmx.fill();
      mmx.fillStyle = c; mmx.beginPath(); mmx.moveTo(x, y - 3.5); mmx.lineTo(x + 3.5, y); mmx.lineTo(x, y + 3.5); mmx.lineTo(x - 3.5, y); mmx.fill(); }
    else if (u.isSummon) { mmx.fillStyle = '#000'; mmx.fillRect(x - 3, y - 3, 6, 6); mmx.fillStyle = u.team === PT ? '#b2ff59' : '#ff8a65'; mmx.fillRect(x - 2, y - 2, 4, 4); }
    else if (u.isCourier) { mmx.fillStyle = '#000'; mmx.beginPath(); mmx.arc(x, y, 3.6, 0, 6.29); mmx.fill(); mmx.fillStyle = u.owner === G.player ? '#ffeb3b' : u.team === RAD ? '#4fc3f7' : '#ef5350'; mmx.beginPath(); mmx.arc(x, y, 2.4, 0, 6.29); mmx.fill(); }
    else if (u.isNeutral) { if (!u.isRoshan) { mmx.fillStyle = '#ffb74d'; mmx.fillRect(x - 1.5, y - 1.5, 3, 3); } }   // camps / pit icons: ui/minimapjungle.js
    else if (!u.isHero && !u.isIllusion) { mmx.fillStyle = u.team === RAD ? '#8bff6a' : '#ff6a5a'; mmx.fillRect(x - 1.5, y - 1.5, 3, 3); }
  }
  drawMinimapJungle(PT);   // ui/minimapjungle.js (B8)
  const P = G.player;
  // hero icons: team-coloured frame + hero colour + first character of the name; player in yellow, drawn last
  mmx.font = 'bold 9px sans-serif'; mmx.textAlign = 'center'; mmx.textBaseline = 'middle';
  for (const h of [...G.heroes.filter(h => h !== P), ...units.filter(u => u.isIllusion), P]) {   // illusions look like their hero
    if (!h || h.dead || !canSee(PT, h)) continue; const x = w2m(h.x), y = w2m(h.z), me = h === P;
    mmx.fillStyle = '#000'; mmx.fillRect(x - 7, y - 7, 14, 14);
    mmx.fillStyle = me ? '#ffeb3b' : h.team === RAD ? '#4cff4c' : '#ff3b30'; mmx.fillRect(x - 6, y - 6, 12, 12);
    mmx.fillStyle = h.def.color; mmx.fillRect(x - 4, y - 4, 8, 8);
    mmx.fillStyle = '#fff'; mmx.fillText(h.def.name[0], x, y + 0.5);
  }
  // town portals in progress (visible to the team that has vision at the destination)
  for (const tp of G.tps) {
    if (tp.team !== PT && !FOG.off && !visAt(PT, tp.x, tp.z)) continue;
    const r = 5 + 3 * Math.abs(Math.sin((G.time - tp.t0) * 4)); mmx.strokeStyle = tp.team === PT ? '#4dd0e1' : '#ff5252'; mmx.lineWidth = 2;
    mmx.beginPath(); mmx.arc(w2m(tp.x), w2m(tp.z), r, 0, 6.29); mmx.stroke();
  }
  // camera trapezoid
  const cs = [[0, 0], [innerWidth, 0], [innerWidth, innerHeight], [0, innerHeight]].map(p => groundAt(p[0], p[1]) || { x: G.cam.x, z: G.cam.z - 80 });
  mmx.strokeStyle = '#fff'; mmx.lineWidth = 1.5; mmx.beginPath();
  cs.forEach((p, i) => { const x = w2m(p.x), y = w2m(p.z); i ? mmx.lineTo(x, y) : mmx.moveTo(x, y); }); mmx.closePath(); mmx.stroke();
}
let mmDrag = false;
function mmToWorld(e) { const r = mm.getBoundingClientRect(); return { x: m2w((e.clientX - r.left) / r.width * MMS), z: m2w((e.clientY - r.top) / r.height * MMS) }; }
mm.addEventListener('mousedown', e => {
  if (!G.started) return; const w = mmToWorld(e);
  const tg = G.targeting;
  if (e.button === 0 && tg && tg.kind === 'item' && !G.player.dead) { G.targeting = null; const er = useItem(G.player, tg.slot, w); if (er) err(er); return; }   // TP / wards via minimap
  if (e.button === 0) { mmDrag = true; G.cam.x = w.x; G.cam.z = w.z; G.lock = false; }
  else if (e.button === 2 && !G.player.dead) issueMove(w.x, w.z);
});
addEventListener('mousemove', e => { if (mmDrag) { const w = mmToWorld(e); G.cam.x = w.x; G.cam.z = w.z; } });
addEventListener('mouseup', () => mmDrag = false);
