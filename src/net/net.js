// net/net.js — B11 LAN session core: roles, peers, message dispatch. Star topology: the host (pid 0) holds one chan per
// joiner (pid 1..9); joiners only talk to the host, which relays (lobby state, lockstep frames, chat).
// Message handlers live in NET_H[type](peer | null, msg) and are registered by the other net/*.js modules.
const NET_VER = 'b11-' + (typeof BUILD_ID === 'string' ? BUILD_ID : 'dev');
function browserTag() {
  const u = navigator.userAgent;
  return /Firefox\//.test(u) ? 'Firefox' : /Edg\//.test(u) ? 'Edge' : /(QQBrowser|MicroMessenger|360SE|MetaSr)/.test(u) ? 'Chromium系' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : '其他';
}
const engineOf = t => t === 'Firefox' ? 'gecko' : t === 'Safari' ? 'webkit' : t === '其他' ? 'other' : 'blink';
const NET = {
  on: false, role: '', me: -1, mySlot: -1, name: '', peers: [], hostCh: null, nextPid: 1, invites: {}, nextInv: 1,
  fake: /[?&]netfake=1/.test(location.search), fakeLag: 0, speed: 1, started: false, paused: false, ff: false,
  spec: null, ua: browserTag(), desync: [], ended: false, stats: { cmds: 0, frames: 0 },
};
const NET_H = {};
const netPeer = pid => NET.peers.find(p => p.pid === pid) || null;
function netBroadcast(m, except) { for (const p of NET.peers) if (p !== except && !p.gone) chanSend(p.ch, m); }
function netToHost(m) { return chanSend(NET.hostCh, m); }
function netDispatch(from, m) { const f = m && NET_H[m.t]; if (f) f(from, m); }
// ---- host ----
function netHostRoom(name) {
  NET.role = 'host'; NET.me = 0; NET.name = name; lobbyInit(); lobbyAdd(0, name, NET.ua); netTimers();
}
// an invite's chan opened → a peer record (it introduces itself with 'hello')
function netAddPeer(ch) {
  const p = { pid: NET.nextPid++, ch, name: '玩家', ua: '?', slot: -1, rtt: 0, ack: -1, synced: true, gone: false };
  NET.peers.push(p);
  ch.onmsg = m => netDispatch(p, m);
  ch.onclose = why => netPeerLost(p, why);   // net/drop.js
  return p;
}
NET_H.hello = (p, m) => {
  p.name = String(m.name || '玩家').slice(0, 16); p.ua = String(m.ua || '?').slice(0, 12);
  if (m.v !== NET_VER) { chanSend(p.ch, { t: 'bye', why: '游戏版本不一致：请所有人打开同一个游戏文件 / 网址，并刷新页面后重试。' }); setTimeout(() => chanClosed(p.ch, 'version'), 300); return; }
  if (NET.started) { netRejoin(p); return; }   // net/drop.js
  if (lobbyAdd(p.pid, p.name, p.ua) < 0) { chanSend(p.ch, { t: 'bye', why: '房间已满（最多 10 名玩家）' }); setTimeout(() => chanClosed(p.ch, 'full'), 300); return; }
  chanSend(p.ch, { t: 'welcome', pid: p.pid, host: NET.name });
  lobbyChanged(); netSys(`${p.name} 加入了房间`);
};
// ---- joiner ----
function netSetHost(ch, name) {
  NET.role = 'client'; NET.name = name; NET.hostCh = ch;
  ch.onmsg = m => netDispatch(null, m);
  ch.onclose = (why, was) => netHostLost(why, was);   // net/drop.js
  ch.onopen = () => { chanSend(ch, { t: 'hello', name, ua: NET.ua, v: NET_VER }); netTimers(); joinConnected(); };   // net/invite.js
}
NET_H.welcome = (_, m) => { NET.me = m.pid; NET.hostName = m.host; };
NET_H.bye = (_, m) => { NET.byeWhy = m.why; };
// system line in the lobby log / in-game chat
function netSys(text) { if (NET.started) chatLine({ sys: true, text }); else lobbyLog(text); }
