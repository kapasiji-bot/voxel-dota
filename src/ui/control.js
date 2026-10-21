// ui/control.js — player unit control: selection (click / Shift+click / box drag), the active unit (HUD + QWER), control groups.
// Controllable = the player's hero + its summons / illusions (u.owner === G.player && u.controllable).
// Keys: F1 hero · F2 all other units · Tab (tap) next unit in the selection · Ctrl+1..5 store group · Shift+1..5 recall group.
// Right-click / A / S / H orders go to every selected unit (ui/input.js uses ctlSel()); QWER goes to ctlCaster().
const CTL = { sel: [], active: null, groups: {}, drag: null };
const isCtl = u => !!u && !u.dead && (u === G.player || (u.owner === G.player && u.controllable));
const ctlUnits = () => units.filter(isCtl);
function ctlPrune() { CTL.sel = CTL.sel.filter(isCtl); if (!CTL.sel.includes(CTL.active)) CTL.active = CTL.sel[0] || null; }
// selected units (defaults to the hero); hero first
function ctlSel() { ctlPrune(); return CTL.sel.length ? CTL.sel : (G.player ? [G.player] : []); }
const ctlActive = () => { ctlPrune(); return CTL.active || G.player; };
// who receives QWER: the active unit if it can cast something, otherwise the hero
const ctlCaster = () => { const a = ctlActive(); return a && a !== G.player && a.abilities && a.abilities.some(x => x.lvl > 0 && !x.def.passive) && !a.isIllusion ? a : G.player; };
function selectUnits(list, add) {
  list = list.filter(isCtl);
  if (add) { for (const u of list) { const i = CTL.sel.indexOf(u); if (i >= 0 && list.length === 1) CTL.sel.splice(i, 1); else if (i < 0) CTL.sel.push(u); } }
  else CTL.sel = list.slice();
  CTL.sel.sort((a, b) => (b === G.player) - (a === G.player));
  CTL.active = CTL.sel[0] || null; G.targeting = null;
  emit('select', { units: CTL.sel.map(u => u.id), active: CTL.active ? CTL.active.id : 0 });
}
function cycleActive() { const s = ctlSel(); if (s.length < 2) return false; CTL.active = s[(s.indexOf(ctlActive()) + 1) % s.length]; emit('select', { units: s.map(u => u.id), active: CTL.active.id }); return true; }
function ctlGroup(n, store) {
  if (store) { CTL.groups[n] = ctlSel().slice(); msg(`编队 ${n}：${CTL.groups[n].length} 个单位`, '#90caf9'); return; }
  const g = (CTL.groups[n] || []).filter(isCtl); if (!g.length) return;
  const again = CTL.sel.length === g.length && g.every(u => CTL.sel.includes(u)); selectUnits(g);
  if (again) { G.cam.x = g[0].x; G.cam.z = g[0].z - 4; G.lock = false; }
}
// small formation offsets so a group order doesn't stack every unit on one point
const formation = (i, n) => i === 0 || n < 2 ? { x: 0, z: 0 } : { x: Math.cos(i * 2.4) * (1.2 + i * 0.35), z: Math.sin(i * 2.4) * (1.2 + i * 0.35) };
function orderSel(o, pt) {
  const s = ctlSel();
  s.forEach((u, i) => { if (u.dead) return; const f = pt ? formation(i, s.length) : { x: 0, z: 0 }; issueOrder(u, pt ? Object.assign({}, o, { x: pt.x + f.x, z: pt.z + f.z }) : o); });
}
// ---- box select (left drag on the 3D view) ----
const selBox = document.createElement('div'); selBox.id = 'selBox'; selBox.className = 'hidden'; document.body.appendChild(selBox);
function boxStart(x, y) { CTL.drag = { x0: x, y0: y, x, y }; }
function boxMove(x, y) {
  const d = CTL.drag; if (!d) return; d.x = x; d.y = y;
  const big = Math.abs(d.x - d.x0) + Math.abs(d.y - d.y0) > 8; selBox.classList.toggle('hidden', !big);
  if (big) Object.assign(selBox.style, { left: Math.min(d.x0, x) + 'px', top: Math.min(d.y0, y) + 'px', width: Math.abs(x - d.x0) + 'px', height: Math.abs(y - d.y0) + 'px' });
}
// returns true if it was a drag (box select done); false → treat as a click
function boxEnd(x, y, add) {
  const d = CTL.drag; CTL.drag = null; selBox.classList.add('hidden'); if (!d) return false;
  if (Math.abs(x - d.x0) + Math.abs(y - d.y0) <= 8) return false;
  const x0 = Math.min(d.x0, x), x1 = Math.max(d.x0, x), y0 = Math.min(d.y0, y), y1 = Math.max(d.y0, y);
  const inBox = ctlUnits().filter(u => { const s = toScreen(u.x, (u.model ? u.model.position.y : 0) + u.height * 0.5, u.z); return s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1; });
  if (inBox.length) selectUnits(inBox, add);
  return true;
}
// a left click on a unit: own controllable → (add to) selection; anything else → inspect (target info)
function clickSelect(u, add) {
  if (u && isCtl(u)) { selectUnits([u], add); G.selected = null; return; }
  G.selected = u;
}
// key handling (called from ui/input.js keydown); returns true if handled
function ctlKey(e, k) {
  if (k === 'F1') { e.preventDefault(); selectUnits([G.player]); if (G.player) { G.cam.x = G.player.x; G.cam.z = G.player.z - 4; } return true; }
  if (k === 'F2') { e.preventDefault(); const o = ctlUnits().filter(u => u !== G.player); if (o.length) selectUnits(o); return true; }
  const dg = /^Digit([1-5])$/.exec(e.code || '');
  if (dg && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ctlGroup(+dg[1], true); return true; }
  if (dg && e.shiftKey) { e.preventDefault(); ctlGroup(+dg[1], false); return true; }
  return false;
}
