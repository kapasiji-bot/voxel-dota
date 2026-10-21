// net/lobbyui.js — B11 lobby screen: 5 + 5 seats, hero picks (unique), ready / start, host seat tools (computer players with
// difficulty, fill / clear, kick), browser warning, lobby log + chat. All clicks go through lobbyAct (net/lobby.js).
const LB_ESC = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function lbSlotHTML(s, i) {
  const host = NET.role === 'host', me = s.k === 'h' && s.pid === NET.me;
  const ping = s.k === 'h' && s.pid !== 0 && NET.pings ? (NET.pings.find(x => x[0] === s.pid) || [])[1] : undefined;
  const pt = s.hero && PORTRAITS[s.hero] ? `<img class="px" src="${PORTRAITS[s.hero].head}">` : '<div class="nohero">?</div>';
  if (s.k === 'e') return `<div class="lbSlot k-e" data-i="${i}"><div class="nohero"></div><div class="nm">空位</div><div class="hero">${host ? '<button class="mcbtn addBot">+ 电脑</button>' : ''}<button class="mcbtn moveHere">换到这里</button></div></div>`;
  if (s.k === 'b') return `<div class="lbSlot k-b" data-i="${i}">${pt}<div class="nm">电脑</div><div class="hero">${host ? `<select class="diff">${DIFF_CN.map((d, j) => `<option value="${j}"${j === s.diff ? ' selected' : ''}>${d}</option>`).join('')}</select> <button class="mcbtn rmBot">移除</button>` : DIFF_CN[s.diff]}</div><div class="st">随机英雄</div></div>`;
  const hn = s.hero ? HERO_DEFS[s.hero].name : '未选择英雄';
  return `<div class="lbSlot k-h${me ? ' me' : ''}${s.ready ? ' ready' : ''}" data-i="${i}">${pt}<div class="nm">${LB_ESC(s.name)}${s.pid === 0 ? ' <small>房主</small>' : ''}${me ? ' <small>你</small>' : ''}</div>
    <div class="hero">${hn} <small class="ua">${LB_ESC(s.ua || '')}</small></div><div class="st">${s.pid === 0 ? '' : s.ready ? '✔ 已准备' : '未准备'}${ping !== undefined ? ` · ${ping} ms` : ''}${host && s.pid !== 0 ? ' <button class="mcbtn kick">移出</button>' : ''}</div></div>`;
}
function renderLobby() {
  if (!$('lbRad')) return;
  $('lbRad').innerHTML = '<h3 class="rad">天辉</h3>' + LOB.slots.slice(0, 5).map((s, i) => lbSlotHTML(s, i)).join('');
  $('lbDire').innerHTML = '<h3 class="dire">夜魇</h3>' + LOB.slots.slice(5).map((s, i) => lbSlotHTML(s, i + 5)).join('');
  const mine = lobbyMine(), mi = lobbyIdx(NET.me);
  for (const el of $('lbHeroes').children) {
    const id = el.dataset.id; el.classList.toggle('mine', !!mine && mine.hero === id); el.classList.toggle('taken', lobbyTaken(id, mi));
  }
  const host = NET.role === 'host', se = host ? lobbyStartError() : null;
  $('lbStart').classList.toggle('hidden', !host); $('lbHostTools').classList.toggle('hidden', !host);
  $('lbStart').disabled = !!se; $('lbStart').title = se || '开始游戏';
  $('lbReady').classList.toggle('hidden', host || !mine);
  if (mine) $('lbReady').textContent = mine.ready ? '取消准备' : '准备';
  $('lbWarn').textContent = (se && host ? se + '　' : '') + (lobbyEngineWarn() ? '⚠ 玩家使用了不同内核的浏览器（如 Chrome 与 Firefox / Safari），可能导致不同步；建议所有人使用 Chrome 或 Edge。' : '');
}
function renderLobbyLog() { const el = $('lbLog'); if (!el) return; el.innerHTML = LOB.log.map(t => `<div>${LB_ESC(t)}</div>`).join(''); el.scrollTop = 1e9; }
function buildLobbyHeroes() {
  const box = $('lbHeroes'); box.innerHTML = '';
  for (const d of heroList()) {
    const el = document.createElement('div'); el.className = 'lbHero'; el.dataset.id = d.id; el.title = `${d.name} · ${d.title}`;
    el.innerHTML = `<img class="px" src="${PORTRAITS[d.id] ? PORTRAITS[d.id].head : ''}"><span>${d.name}</span>`;
    box.appendChild(el);
  }
}
function bindLobby() {
  buildLobbyHeroes();
  $('lbHeroes').addEventListener('click', e => { const el = e.target.closest('.lbHero'); if (el && !el.classList.contains('taken')) lobbyAct('pick', { hero: el.dataset.id }); });
  $('lbTeams').addEventListener('click', e => {
    const sl = e.target.closest('.lbSlot'); if (!sl) return; const i = +sl.dataset.i, c = e.target.classList;
    if (c.contains('addBot')) lobbyAct('bot', { i, diff: +$('lbFillDiff').value });
    else if (c.contains('rmBot')) lobbyAct('bot', { i });
    else if (c.contains('kick')) lobbyAct('kick', { i });
    else if (c.contains('moveHere')) lobbyAct('move', { i });
  });
  $('lbTeams').addEventListener('change', e => { const sl = e.target.closest('.lbSlot'); if (sl && e.target.classList.contains('diff')) lobbyAct('diff', { i: +sl.dataset.i, diff: +e.target.value }); });
  $('lbReady').addEventListener('click', () => { const m = lobbyMine(); if (m) lobbyAct('ready', { on: !m.ready }); });
  $('lbStart').addEventListener('click', netStartGame);
  $('lbInvite').addEventListener('click', () => invOpen(true));
  $('lbFill').addEventListener('click', () => lobbyAct('fill', { diff: +$('lbFillDiff').value }));
  $('lbClear').addEventListener('click', () => lobbyAct('clear'));
  $('lbChat').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && e.target.value.trim()) { chatSend(e.target.value.trim(), true); e.target.value = ''; } });
}
