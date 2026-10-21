// net/invite.js — B11 copy-paste code exchange UI.
// Host (#netInv panel, in the lobby and in a match for rejoins): 生成邀请码 → one card per invited player with the offer
//   code (复制) and a box for the joiner's answer code (连接). Joiner (#lbJoin): paste the offer → 生成应答码 → 复制 it back.
function copyText(text, btn) {
  const done = ok => { if (btn) { const t = btn.textContent; btn.textContent = ok ? '已复制 ✔' : '请手动复制'; setTimeout(() => btn.textContent = t, 1500); } };
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove(); done(ok); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => done(true), fallback); else fallback();
}
function invOpen(show = true) { const p = $('netInv'); p.classList.toggle('hidden', !show); if (show && !$('invList').children.length) invNew(); }
async function invNew() {
  const id = NET.nextInv++, card = document.createElement('div'); card.className = 'inv'; card.dataset.id = id;
  card.innerHTML = `<div class="invT">邀请 #${id} <span class="st">正在生成邀请码…</span></div>
    <div class="lbStep"><b>①</b> 把邀请码复制发给朋友（微信 / QQ 均可）：</div><div class="row"><textarea class="code" readonly></textarea><button class="mcbtn cp" disabled>复制邀请码</button></div>
    <div class="lbStep"><b>②</b> 粘贴朋友发回的<em>应答码</em>，然后点「连接」：</div><div class="row"><textarea class="ans" placeholder="VD1A……"></textarea><button class="mcbtn ok" disabled>连接</button></div>`;
  $('invList').prepend(card);
  const st = t => { card.querySelector('.st').textContent = t; };
  try {
    const ch = await rtcOffer(id); NET.invites[id] = ch; ch.card = card;
    card.querySelector('.code').value = ch.code; card.querySelector('.cp').disabled = false; card.querySelector('.ok').disabled = false;
    st(`等待应答码…（邀请码 ${ch.code.length} 个字符）`);
    ch.onopen = () => { const p = netAddPeer(ch); st('✔ 已连接'); card.classList.add('done'); p.inv = id; };
    ch.onclose = (why, was) => { if (!was) { st('✘ ' + (NET_ERR[why] || '连接已关闭')); card.classList.add('bad'); } };
  } catch (e) { st('✘ ' + e.message); card.classList.add('bad'); }
}
async function invAccept(card) {
  const st = t => { card.querySelector('.st').textContent = t; };
  try {
    const a = await decodeCode(card.querySelector('.ans').value);
    if (a.kind !== 'A') throw new Error('这是邀请码：请粘贴朋友生成的应答码（以 VD1A 开头）');
    const ch = NET.invites[a.id];
    if (!ch) throw new Error('该应答码不属于本房间的任何邀请（可能来自旧的邀请码），请让朋友重新粘贴最新的邀请码');
    if (ch.answered) throw new Error(`邀请 #${a.id} 已经使用过了：每个邀请码只能连接一位玩家，请生成新的邀请码`);
    ch.answered = true; await rtcAccept(ch, a);
    (ch.card ? ch.card.querySelector('.st') : card.querySelector('.st')).textContent = '正在连接…';
  } catch (e) { st('✘ ' + e.message); }
}
function bindInvite() {
  $('invNew').addEventListener('click', () => invNew());
  $('invClose').addEventListener('click', () => invOpen(false));
  $('invList').addEventListener('click', e => {
    const card = e.target.closest('.inv'); if (!card) return;
    if (e.target.classList.contains('cp')) copyText(card.querySelector('.code').value, e.target);
    if (e.target.classList.contains('ok')) invAccept(card);
  });
  $('jGo').addEventListener('click', joinGo);
  $('jCopy').addEventListener('click', e => copyText($('jAns').value, e.target));
}
// ---- joiner ----
const jStatus = (t, bad) => { const s = $('jStatus'); s.textContent = t; s.classList.toggle('bad', !!bad); };
async function joinGo() {
  if (NET.hostCh && !NET.hostCh.closed) { jStatus('正在等待房主连接…如需重试请刷新页面'); return; }
  $('jGo').disabled = true; jStatus('正在生成应答码…');
  try {
    const ch = await rtcJoin($('jOffer').value);
    netSetHost(ch, lbName());
    $('jAns').value = ch.code; $('jAnsBox').classList.remove('hidden');
    jStatus(`应答码已生成（${ch.code.length} 个字符）：复制发回给房主，等待房主粘贴并点「连接」…（3 分钟内有效）`);
  } catch (e) { jStatus('✘ ' + e.message, true); $('jGo').disabled = false; }
}
function joinConnected() { jStatus('✔ 已连接到房主！'); $('lbJoin').classList.add('hidden'); $('lbRoom').classList.remove('hidden'); $('lbRole').textContent = '玩家'; }
function joinFailed(why) {
  jStatus('✘ ' + (NET.byeWhy || NET_ERR[why] || '连接已关闭'), true);
  NET.hostCh = null; $('jGo').disabled = false; $('jAnsBox').classList.add('hidden');
}
