// net/lobby.js — B11 lobby state (host-authoritative). LOB.slots[0..4] = 天辉, [5..9] = 夜魇; a slot is
//   {k:'e'} empty | {k:'h', pid, name, ua, hero, ready} human | {k:'b', diff, hero:null} computer (hero random at start).
// Joiners send requests {t:'lreq', a:'pick'|'ready'|'move'|'name'}; the host applies them (and its own host-only actions
// 'bot' / 'diff' / 'fill' / 'kick') and broadcasts {t:'lobby', s:slots}. Heroes are unique across the whole lobby.
const LOB = { slots: [], log: [] };
const slotTeam = i => (i < 5 ? RAD : DIRE);
function lobbyInit() { LOB.slots = Array.from({ length: 10 }, () => ({ k: 'e' })); LOB.log = []; }
const lobbyIdx = pid => LOB.slots.findIndex(s => s.k === 'h' && s.pid === pid);
const lobbyMine = () => LOB.slots[lobbyIdx(NET.me)] || null;
const lobbyTaken = (hero, except) => LOB.slots.some((s, j) => j !== except && s.k !== 'e' && s.hero === hero);
function lobbyFreeSlot() {
  const hum = t => LOB.slots.filter((s, i) => slotTeam(i) === t && s.k === 'h').length;
  const order = hum(RAD) <= hum(DIRE) ? [RAD, DIRE] : [DIRE, RAD];
  for (const t of order) for (let i = t * 5; i < t * 5 + 5; i++) if (LOB.slots[i].k === 'e') return i;
  for (const t of order) for (let i = t * 5; i < t * 5 + 5; i++) if (LOB.slots[i].k === 'b') return i;   // a bot gives its seat to a human
  return -1;
}
function lobbyAdd(pid, name, ua) {
  const i = lobbyFreeSlot(); if (i < 0) return -1;
  LOB.slots[i] = { k: 'h', pid, name, ua, hero: null, ready: pid === 0 };
  return i;
}
function lobbyRemove(pid) { const i = lobbyIdx(pid); if (i >= 0) LOB.slots[i] = { k: 'e' }; }
function lobbyReq(pid, m) {
  const i = lobbyIdx(pid), s = LOB.slots[i], host = pid === 0, t = LOB.slots[m.i];
  if (!s) return;
  switch (m.a) {
    case 'pick': if (HERO_DEFS[m.hero] && !lobbyTaken(m.hero, i)) { s.hero = m.hero; if (!host) s.ready = false; } break;
    case 'ready': s.ready = !!m.on && !!s.hero; break;
    case 'name': s.name = String(m.name || '玩家').slice(0, 16); { const p = netPeer(pid); if (p) p.name = s.name; } break;
    case 'move': if (t && t.k === 'e') { LOB.slots[m.i] = s; LOB.slots[i] = { k: 'e' }; } break;
    case 'bot': if (host && t) { if (t.k === 'e') LOB.slots[m.i] = { k: 'b', diff: m.diff === undefined ? 1 : clamp(m.diff | 0, 0, 2), hero: null }; else if (t.k === 'b') LOB.slots[m.i] = { k: 'e' }; } break;
    case 'diff': if (host && t && t.k === 'b') t.diff = clamp(m.diff | 0, 0, 2); break;
    case 'fill': if (host) LOB.slots.forEach((x, j) => { if (x.k === 'e') LOB.slots[j] = { k: 'b', diff: clamp(m.diff | 0, 0, 2), hero: null }; }); break;
    case 'clear': if (host) LOB.slots.forEach((x, j) => { if (x.k === 'b') LOB.slots[j] = { k: 'e' }; }); break;
    case 'kick': if (host && t && t.k === 'h' && t.pid !== 0) { const p = netPeer(t.pid); if (p) { chanSend(p.ch, { t: 'bye', why: '你被房主移出了房间' }); setTimeout(() => chanClosed(p.ch, 'kick'), 300); } } break;
    default: return;
  }
  lobbyChanged();
}
// local action: the host applies it, a joiner asks the host
function lobbyAct(a, o = {}) { if (NET.role === 'host') lobbyReq(0, Object.assign({ a }, o)); else netToHost(Object.assign({ t: 'lreq', a }, o)); }
NET_H.lreq = (p, m) => { if (!NET.started) lobbyReq(p.pid, m); };
NET_H.lobby = (_, m) => { LOB.slots = m.s; renderLobby(); };
NET_H.llog = (_, m) => lobbyLog(m.text, true);
function lobbyChanged() { if (NET.role !== 'host') return; netBroadcast({ t: 'lobby', s: LOB.slots }); renderLobby(); }
function lobbyLog(text, remote) {
  LOB.log.push(text); if (LOB.log.length > 40) LOB.log.shift();
  if (NET.role === 'host' && !remote) netBroadcast({ t: 'llog', text });
  renderLobbyLog();
}
// null when the host may start, else the reason (Chinese)
function lobbyStartError() {
  const hum = LOB.slots.filter(s => s.k === 'h'), all = LOB.slots.filter(s => s.k !== 'e');
  if (hum.some(s => !s.hero)) return '还有玩家没有选择英雄';
  if (hum.some(s => !s.ready && s.pid !== 0)) return '还有玩家没有准备';
  if (all.length < 2) return '至少需要 2 名英雄（可以添加电脑）';
  if (LOB.slots.filter(s => s.k === 'b').length + hum.length > heroList().length) return '英雄数量不足';
  return null;
}
// engines differ (Chrome vs Firefox vs Safari) → floating-point maths may differ → lockstep desync risk
function lobbyEngineWarn() { const e = new Set(LOB.slots.filter(s => s.k === 'h').map(s => engineOf(s.ua))); return e.size > 1; }
