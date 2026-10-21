// net/nethud.js — B11 in-game LAN panel (top right, under the K/D/A box): role, players, ping, waiting-for-players notice,
// and for the host the 邀请 / 重连 button (opens the invite panel; a joiner who connects mid-match takes over a dropped hero).
function netHudShow() {
  const el = $('netHud'); if (!el) return; el.classList.remove('hidden');
  el.innerHTML = `<span id="nhTxt">联机</span>${NET.role === 'host' ? '<button class="mcbtn" id="nhInv" title="生成邀请码：掉线的玩家可以用它重新加入">邀请 / 重连</button>' : ''}`;
  if ($('nhInv')) $('nhInv').addEventListener('click', () => invOpen($('netInv').classList.contains('hidden')));
  netHudTick();
}
function netHudTick() {
  const t = $('nhTxt'); if (!t || !NET.started) return;
  const live = NET.peers.filter(p => !p.gone && p.slot >= 0);
  let s;
  if (NET.role === 'host') {
    const worst = live.reduce((a, p) => Math.max(a, p.rtt), 0);
    s = `房主 · ${live.length + 1} 名玩家` + (live.length ? ` · 延迟 ≤${Math.round(worst)} ms` : '');
    if (LS.waitT > 1) { const slow = live.filter(p => p.synced && LS.n - p.ack > NAHEAD).map(p => p.name); s += ` · 等待 ${slow.join('、') || '玩家'}…`; }
  } else s = `联机 · 延迟 ${NET.myPing !== undefined ? NET.myPing + ' ms' : '…'}`;
  if (NET.desync.length) s += ' · ⚠ 不同步';
  t.textContent = s; t.classList.toggle('warn', LS.waitT > 1 || NET.desync.length > 0);
}
