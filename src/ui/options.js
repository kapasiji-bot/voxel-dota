// ui/options.js — B9 options panel (F10 or the ⚙ button): master / SFX / ambience / UI volume sliders + mute (also the M key).
// Values live in AU.set (audio/engine.js) and persist in localStorage ('voxdota.audio').
const OPT_ROWS = [['master', '主音量'], ['sfx', '音效'], ['amb', '环境音'], ['ui', '界面音']];
function buildOptions() {
  const p = $('options'); if (!p || p.dataset.built) return; p.dataset.built = 1;
  p.innerHTML = `<h3><span>设置</span><button class="mcbtn" id="optClose">关闭</button></h3>` +
    OPT_ROWS.map(([k, n]) => `<label class="optRow"><span>${n}</span><input type="range" min="0" max="100" step="1" id="opt_${k}"><b id="optv_${k}"></b></label>`).join('') +
    `<label class="optRow"><span>静音 (M)</span><input type="checkbox" id="opt_muted"><b></b></label>
    <label class="optRow" title="使用指针锁定，鼠标不会移出游戏窗口（软件光标）。Esc 释放，点击游戏画面重新锁定。"><span>锁定鼠标</span><input type="checkbox" id="opt_lockMouse"><b></b></label>
    <div id="optNote">所有声音均由浏览器实时合成（Web Audio），无需任何外部文件。只会听到己方视野内的事件。</div>`;
  for (const [k] of OPT_ROWS) $('opt_' + k).addEventListener('input', e => { AU.set[k] = +e.target.value / 100; auSave(); syncOptions(); });
  $('opt_muted').addEventListener('change', e => { auSetMuted(e.target.checked); syncOptions(); });
  $('opt_lockMouse').addEventListener('change', e => { plSetOption(e.target.checked); syncOptions(); });   // ui/pointerlock.js
  $('optClose').addEventListener('click', () => toggleOptions(false));
  syncOptions();
}
function syncOptions() {
  if (!$('opt_master')) return;
  for (const [k] of OPT_ROWS) { $('opt_' + k).value = Math.round(AU.set[k] * 100); $('optv_' + k).textContent = Math.round(AU.set[k] * 100); }
  $('opt_muted').checked = AU.set.muted; $('opt_lockMouse').checked = !!AU.set.lockMouse; const b = $('optBtn'); if (b) b.textContent = (AU.set.muted ? '🔇' : '⚙') + ' 设置 (F10)';
}
function toggleOptions(on) { buildOptions(); const p = $('options'), show = on === undefined ? p.classList.contains('hidden') : !!on; p.classList.toggle('hidden', !show); syncOptions(); return show; }
function toggleMute() { const m = auSetMuted(); syncOptions(); msg(m ? '声音：已静音 (M)' : '声音：已开启 (M)', '#ccc'); return m; }
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') return;
  if (e.key === 'F10') { e.preventDefault(); toggleOptions(); }
  else if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.altKey) toggleMute();
  else if (e.key === 'Escape') toggleOptions(false);
});
