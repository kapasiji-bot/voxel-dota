// ui/vcursor.js — event routing for the pointer-lock software cursor (ui/pointerlock.js). While locked, trusted mouse
// events (which all target the lock element with a frozen clientX/Y) are swallowed in the capture phase and re-dispatched
// as synthetic events at the virtual cursor on document.elementFromPoint: mousemove (+ mouseover/out/enter/leave for
// tooltips), mousedown / mouseup / click / contextmenu, wheel (canvas zoom, or scrolls the panel under the cursor). Range
// sliders are dragged by setting their value; text inputs get focus. With the option on and not locked, a click on the
// game canvas re-acquires the lock (the click itself still goes through normally).
const plHit = (x, y) => document.elementFromPoint(x, y) || document.body;
function plEv(type, el, o = {}, Ctor = MouseEvent) {
  const e = new Ctor(type, Object.assign({ bubbles: type !== 'mouseenter' && type !== 'mouseleave', cancelable: true, view: window, clientX: PL.x, clientY: PL.y,
    screenX: PL.x, screenY: PL.y, buttons: PL.btns }, o));
  PL.routed++; return el.dispatchEvent(e);
}
const plChain = el => { const a = []; for (let n = el; n && n !== document; n = n.parentNode) a.push(n); return a; };
function plHover(el) {
  const old = PL.hover; if (old === el) return; PL.hover = el;
  const oc = old ? plChain(old) : [], nc = el ? plChain(el) : [];
  if (old && old.isConnected) { plEv('mouseout', old, { relatedTarget: el }); for (const n of oc) if (!nc.includes(n)) plEv('mouseleave', n, { relatedTarget: el }); }
  if (el) { plEv('mouseover', el, { relatedTarget: old }); for (const n of nc.slice().reverse()) if (!oc.includes(n)) plEv('mouseenter', n, { relatedTarget: old }); }
}
function plRange(el) { const r = el.getBoundingClientRect(), f = clamp((PL.x - r.left) / Math.max(1, r.width), 0, 1), lo = +el.min || 0, hi = +el.max || 100; el.value = lo + f * (hi - lo); el.dispatchEvent(new Event('input', { bubbles: true })); }
function plMoveTo(x, y, mods) {
  PL.x = clamp(x, 0, innerWidth - 1); PL.y = clamp(y, 0, innerHeight - 1); PL.moves++;
  const el = plHit(PL.x, PL.y); plHover(el);
  if (PL.range) plRange(PL.range);
  plEv('mousemove', el, mods || {}); plDraw();
}
function plButton(type, button = 0, mods = {}) {
  const el = plHit(PL.x, PL.y), o = Object.assign({ button }, mods);
  if (type === 'down') {
    PL.btns |= 1 << (button === 2 ? 1 : button === 1 ? 2 : 0); PL.down = { el, button };
    if (el.tagName === 'INPUT' && el.type === 'range' && button === 0) { PL.range = el; plRange(el); }
    if (el.tagName === 'INPUT' && el.type === 'text') el.focus(); else if (document.activeElement && document.activeElement.tagName === 'INPUT') document.activeElement.blur();
    plEv('mousedown', el, o);
  } else {
    PL.btns &= ~(1 << (button === 2 ? 1 : button === 1 ? 2 : 0));
    if (PL.range && button === 0) { PL.range.dispatchEvent(new Event('change', { bubbles: true })); PL.range = null; }
    plEv('mouseup', el, o);
    const d = PL.down; PL.down = null;
    if (d && d.button === button && (d.el === el || d.el.contains(el) || el.contains(d.el))) plEv(button === 2 ? 'contextmenu' : 'click', d.el.contains(el) ? el : d.el, o);
  }
  plDraw();
}
function plWheel(dy) {
  const el = plHit(PL.x, PL.y), ok = plEv('wheel', el, { deltaY: dy, deltaMode: 0 }, WheelEvent);
  if (!ok || el === canvas) return;
  for (let n = el; n && n !== document.body; n = n.parentElement) if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) { n.scrollTop += dy; return; }
}
const plMods = e => ({ shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey });
function plIntercept(e) {
  if (!e.isTrusted) return;
  if (!plActive()) { if (e.type === 'mousedown' && plOn() && G.started && e.target === canvas) plRequest(e.clientX, e.clientY); return; }
  e.stopImmediatePropagation(); e.preventDefault();
  if (e.type === 'mousemove') plMoveTo(PL.x + (e.movementX || 0), PL.y + (e.movementY || 0), plMods(e));
  else if (e.type === 'mousedown') plButton('down', e.button, plMods(e));
  else if (e.type === 'mouseup') plButton('up', e.button, plMods(e));
  else if (e.type === 'wheel') plWheel(e.deltaY);
}
for (const t of ['mousemove', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel']) addEventListener(t, plIntercept, { capture: true, passive: false });
