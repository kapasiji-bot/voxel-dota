// ui/fullscreen.js — video-player-style fullscreen toggle: the ⛶ button next to the ⚙ settings button and the F key
// (also Alt+Enter). Fullscreen API on document.documentElement with the webkit fallback; fullscreenchange (incl. Esc exit)
// swaps the icon and resizes the renderer / camera (render/renderer.js onResize). Edge scrolling at the screen edge then
// works even over HUD panels (ui/pointerlock.js edgeAllowed).
const FS_ICON_ENTER = '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" fill="none" stroke="#fff" stroke-width="2"/></svg>';
const FS_ICON_EXIT = '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M6 1v5H1M15 6h-5V1M10 15v-5h5M1 10h5v5" fill="none" stroke="#fff" stroke-width="2"/></svg>';
const FS = { calls: 0, last: '', error: '' };   // debug / tests: API calls made, last action, last error
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const fsActive = () => !!fsElement();
function fsEnter() {
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  FS.calls++; FS.last = 'enter';
  if (!req) { FS.error = 'unsupported'; err('当前浏览器不支持全屏'); return false; }
  try { const p = req.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(e => { FS.error = String(e && e.message || e); }); } catch (e) { FS.error = String(e.message || e); }
  return true;
}
function fsExit() {
  const ex = document.exitFullscreen || document.webkitExitFullscreen; FS.calls++; FS.last = 'exit';
  if (!ex || !fsElement()) return false;
  try { const p = ex.call(document); if (p && p.catch) p.catch(e => { FS.error = String(e && e.message || e); }); } catch (e) { FS.error = String(e.message || e); }
  return true;
}
const toggleFullscreen = () => (fsActive() ? fsExit() : fsEnter());
function syncFsButton() {
  const b = $('fsBtn'); if (!b) return; const on = fsActive();
  b.innerHTML = on ? FS_ICON_EXIT : FS_ICON_ENTER; b.title = on ? '退出全屏 (F / Esc)' : '全屏 (F / Alt+Enter)'; b.classList.toggle('on', on);
}
function onFsChange() { syncFsButton(); onResize(); if (typeof plClamp === 'function') plClamp(); }
document.addEventListener('fullscreenchange', onFsChange); document.addEventListener('webkitfullscreenchange', onFsChange);
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  const altEnter = e.key === 'Enter' && e.altKey;
  if ((((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.altKey && !e.metaKey) || altEnter) && !e.repeat) { e.preventDefault(); toggleFullscreen(); }
});
function buildFsButton() { const b = $('fsBtn'); if (!b || b.dataset.built) return; b.dataset.built = 1; b.addEventListener('click', () => toggleFullscreen()); syncFsButton(); }
