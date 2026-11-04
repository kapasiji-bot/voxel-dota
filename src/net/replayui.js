// net/replayui.js — menu tab + in-game HUD for LAN replays / spectator follow hints.
function replayHudShow(on) {
  const el = $('repHud'); if (!el) return;
  el.classList.toggle('hidden', !on);
  if (on) {
    el.innerHTML = `<span id="repTxt">录像</span>
      <button class="mcbtn" id="repPause">暂停</button>
      <button class="mcbtn" id="repSlow">减速</button>
      <button class="mcbtn" id="repFast">加速</button>
      <button class="mcbtn" id="repSave">保存录像</button>
      <button class="mcbtn" id="repQuit">退出</button>`;
    $('repPause').onclick = () => { NET.paused = G.paused = !NET.paused; replayHudTick(); };
    $('repSlow').onclick = () => { NET.speed = Math.max(0.25, +(NET.speed / 2).toFixed(2)); replayHudTick(); };
    $('repFast').onclick = () => { NET.speed = Math.min(16, +(NET.speed * 2).toFixed(2)); replayHudTick(); };
    $('repSave').onclick = () => replayExport();
    $('repQuit').onclick = () => replayStop();
    replayHudTick();
  }
}
function replayHudTick() {
  const t = $('repTxt'); if (!t) return;
  if (NET.role === 'replay') {
    t.textContent = `录像 ${fmtTime(G.time)} · ×${NET.speed}${NET.paused ? ' · 暂停' : ''}`;
    if ($('repPause')) $('repPause').textContent = NET.paused ? '继续' : '暂停';
  } else if (NET.spectating) t.textContent = `观战 · 跟随 ${(G.player && (G.player.netName || G.player.def.name)) || '?'}`;
}
function buildReplayMenu() {
  const tabs = $('modeTabs'); if (!tabs) return;
  const t = document.createElement('div'); t.className = 'mt'; t.id = 'mtReplay'; t.dataset.m = 'replay'; t.textContent = '观看录像';
  tabs.appendChild(t);
  t.addEventListener('click', () => {
    if (G.started) return;
    $('lobby').classList.add('hidden');
    const box = $('repLoad'); if (!box) return;
    box.classList.remove('hidden');
  });
  let box = $('repLoad');
  if (!box) {
    box = document.createElement('div'); box.id = 'repLoad'; box.className = 'hidden panel';
    box.innerHTML = `<h2>观看录像</h2>
      <div class="lbNote">选择本机保存的 <code>.json</code> 录像文件（联机对局中可点「保存录像」导出）。回放不连接网络。</div>
      <input type="file" id="repFile" accept="application/json,.json">
      <div id="repStatus"></div>
      <button class="mcbtn" id="repBack">返回</button>`;
    document.body.appendChild(box);
    $('repBack').onclick = () => box.classList.add('hidden');
    $('repFile').onchange = async ev => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      const st = $('repStatus');
      try {
        const text = await f.text(); const r = replayValidate(JSON.parse(text));
        st.textContent = `已加载：${(r.meta && r.meta.names || []).join('、') || '录像'} · ${fmtTime((r.meta && r.meta.duration) || 0)} · ${(r.log || []).length} 条指令`;
        st.classList.remove('bad');
        replayStart(r);
      } catch (e) { st.textContent = '✘ ' + e.message; st.classList.add('bad'); }
    };
  }
}
function bindReplayKeys() {
  addEventListener('keydown', e => {
    if (!G.started) return;
    if (spectateOnKey(e)) { e.preventDefault(); return; }
    if (NET.role !== 'replay') return;
    if (e.code === 'Escape') { e.preventDefault(); replayStop(); return; }
    if (e.code === 'Minus') { NET.speed = Math.max(0.25, +(NET.speed / 2).toFixed(2)); replayHudTick(); }
    if (e.code === 'Equal') { NET.speed = Math.min(16, +(NET.speed * 2).toFixed(2)); replayHudTick(); }
  });
}
