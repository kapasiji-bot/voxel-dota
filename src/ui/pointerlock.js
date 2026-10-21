// ui/pointerlock.js — optional "锁定鼠标" cursor confinement (options panel, AU.set.lockMouse, default off) with the Pointer
// Lock API. While locked the OS cursor is hidden and a software cursor (#vcursor) moves by movementX/Y, clamped to the
// window; ui/vcursor.js turns every real mouse event into a synthetic one at the virtual position, so canvas orders, box
// select, minimap, HUD / shop / options clicks, tooltips and edge scrolling keep working. Esc releases the lock (browser);
// with the option on, the next click on the game re-acquires it. With the option off nothing here intercepts anything.
const PL = { locked: false, sim: false, x: innerWidth / 2, y: innerHeight / 2, hover: null, down: null, btns: 0, moves: 0, routed: 0, errors: 0 };
const plOn = () => !!(AU.set && AU.set.lockMouse);
const plActive = () => PL.locked || PL.sim;   // PL.sim: tests / debug (no real lock possible headless)
function plClamp() { PL.x = clamp(PL.x, 0, innerWidth - 1); PL.y = clamp(PL.y, 0, innerHeight - 1); plDraw(); }
function plRequest(x, y) {
  if (plActive() || !plOn()) return false;
  const el = document.body, req = el.requestPointerLock || el.webkitRequestPointerLock; if (!req) return false;
  if (x != null) { PL.x = x; PL.y = y; }
  try { const p = req.call(el); if (p && p.catch) p.catch(() => { PL.errors++; }); } catch (e) { PL.errors++; }
  return true;
}
function plRelease() { if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); }
function plSetLocked(on) {
  if (PL.locked === on && !PL.sim) return; PL.locked = on;
  document.documentElement.classList.toggle('plLocked', plActive());
  if (!plActive()) { plHover(null); $('vcursor') && $('vcursor').classList.add('hidden'); } else { plClamp(); plMoveTo(PL.x, PL.y); }
  emit('pointerLock', { on: plActive() });
}
document.addEventListener('pointerlockchange', () => plSetLocked(document.pointerLockElement === document.body));
document.addEventListener('pointerlockerror', () => { PL.errors++; });
// option toggled in the options panel
function plSetOption(on) { AU.set.lockMouse = !!on; auSave(); if (!on) plRelease(); else if (G.started) msg('鼠标锁定已开启：点击游戏画面锁定，Esc 释放', '#ccc'); }
// cursor state: targeting crosshair / enemy hover / clickable UI / normal (mirrors canvas.style.cursor set by render/indicators.js)
function plCursorKind(el) {
  if (el === canvas) { const c = canvas.style.cursor; return c === 'crosshair' ? 'target' : c === 'pointer' ? 'attack' : 'arrow'; }
  return el && getComputedStyle(el).cursor === 'pointer' ? 'hand' : 'arrow';
}
function plDraw() {
  const v = $('vcursor'); if (!v) return;
  v.classList.toggle('hidden', !plActive()); if (!plActive()) return;
  v.style.transform = `translate(${PL.x}px, ${PL.y}px)`; v.dataset.kind = plCursorKind(PL.hover);
}
// edge scrolling (ui/camera.js): at the very window edge it also works over HUD panels when locked or fullscreen
function edgeAllowed(E) {
  if (plActive()) return true;
  if (!mouse.inside || !document.hasFocus()) return false;
  if (!mouse.overUI) return true;
  return fsActive() && (mouse.x <= E || mouse.y <= E || mouse.x >= innerWidth - E || mouse.y >= innerHeight - E);
}
addEventListener('resize', () => { if (plActive()) plClamp(); });
(function plTick() { if (plActive()) plDraw(); requestAnimationFrame(plTick); })();   // cursor kind follows targeting / hover changes
