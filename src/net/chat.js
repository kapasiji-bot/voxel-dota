// net/chat.js — B11 chat. In a LAN match: Enter = team chat, Shift+Enter = all chat (Esc cancels); in the lobby the room
// chat box. Joiners send {t:'chat', all, text}; the host relays {t:'chatm', name, team, all, text} only to the recipients
// (team chat never reaches the other team) and shows its own copy.
function chatSend(text, all) {
  text = String(text).slice(0, 120); if (!text) return;
  if (NET.role === 'host') chatRoute({ name: NET.name, slot: NET.mySlot }, all, text); else netToHost({ t: 'chat', all: !!all, text });
}
NET_H.chat = (p, m) => chatRoute(p, !!m.all, String(m.text || '').slice(0, 120));
function chatRoute(from, all, text) {
  if (!NET.started) { lobbyLog(`${from.name}：${text}`); return; }
  const fh = heroBySlot(from.slot), team = fh ? fh.team : -1;
  const m = { t: 'chatm', name: from.name, hero: fh ? fh.def.name : '', team, all, text };
  for (const p of NET.peers) { if (p.gone || p.slot < 0) continue; const h = heroBySlot(p.slot); if (all || (h && h.team === team)) chanSend(p.ch, m); }
  if (all || G.player.team === team) chatLine(m);
}
NET_H.chatm = (_, m) => chatLine(m);
function chatLine(m) {
  const box = $('chatLog'); if (!box) return;
  const el = document.createElement('div');
  if (m.sys) { el.className = 'sys' + (m.warn ? ' warn' : ''); el.textContent = m.text; }
  else {
    const col = m.team === (G.player ? G.player.team : RAD) ? '#7cdc6a' : '#ff6b5b';
    el.innerHTML = `<span class="tag">[${m.all ? '所有人' : '队伍'}]</span> <b style="color:${col}">${LB_ESC(m.name)}${m.hero ? `（${LB_ESC(m.hero)}）` : ''}</b>：${LB_ESC(m.text)}`;
    if (!NET.ff) sfxUI('click');
  }
  box.appendChild(el); while (box.children.length > 8) box.firstChild.remove();
  NET.chatN = (NET.chatN || 0) + 1;
  setTimeout(() => el.classList.add('old'), m.warn ? 30000 : 12000);
}
function chatOpen(all) {
  const b = $('chatBox'), i = $('chatIn'); b.classList.remove('hidden'); b.dataset.all = all ? '1' : '';
  $('chatMode').textContent = all ? '所有人' : '队伍'; i.value = ''; i.focus();
}
function chatClose() { $('chatBox').classList.add('hidden'); $('chatIn').blur(); }
function bindChat() {
  addEventListener('keydown', e => {
    if (!NET.on || !G.started || e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    e.preventDefault(); chatOpen(e.shiftKey);
  });
  $('chatIn').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') chatClose();
    else if (e.key === 'Enter') { const t = e.target.value.trim(); if (t) chatSend(t, !!$('chatBox').dataset.all); chatClose(); }
    else if (e.key === 'Tab') { e.preventDefault(); chatOpen(!$('chatBox').dataset.all); }
  });
  $('chatIn').addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== $('chatIn')) $('chatBox').classList.add('hidden'); }, 0));
}
