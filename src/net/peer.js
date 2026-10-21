// net/peer.js — B11 WebRTC data channels with NO signalling server and NO STUN/TURN (iceServers: []): LAN host / mDNS
// candidates only. The host makes one offer per invited player; the joiner turns it into an answer; codes are exchanged
// by copy-paste (net/sdp.js). ICE gathering is awaited before a code is produced (no trickle).
// A "chan" hides the transport: chanSend(ch, obj) (JSON, chunked above CHUNK chars), ch.onopen / ch.onmsg(obj) / ch.onclose(why, wasOpen).
// Tests (?netfake=1, NET.fake): the real RTCPeerConnections still create / accept the codes, but the bytes then travel over a
// BroadcastChannel named after the offer (the test sandbox's browser policy exposes no local network address).
const RTC_CFG = { iceServers: [] };
const CHUNK = 48000;
const NET_ERR = {
  nocand: '无法获取本机的局域网地址：浏览器禁止了 WebRTC 本地连接（隐私插件、企业策略或特殊浏览器）。请换用最新版 Chrome / Edge 并关闭相关插件后重试。',
  failed: '连接失败：两台设备无法直连。请确认 ① 连接的是同一个 Wi-Fi / 局域网（访客网络、AP 隔离会阻止连接）；② 双方都用最新版 Chrome / Edge；③ 重新生成邀请码再试（每个连接码只能用一次）。',
  timeout: '连接超时：在规定时间内没有连上。请确认双方在同一局域网，并重新生成邀请码再试（每个连接码只能用一次）。',
};
function waitIce(pc, ms = 5000) {
  return new Promise(res => {
    if (pc.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, ms);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}
function makeChan() { return { open: false, closed: false, last: performance.now(), onopen: null, onmsg: null, onclose: null, raw: null, shut: null, parts: null, sent: 0, recv: 0 }; }
function chanSend(ch, o) {
  if (!ch || !ch.open || ch.closed) return false;
  const s = JSON.stringify(o);
  try {
    if (s.length <= CHUNK) ch.raw(s);
    else { const n = Math.ceil(s.length / CHUNK); for (let i = 0; i < n; i++) ch.raw('\u0001' + i + '/' + n + '|' + s.slice(i * CHUNK, (i + 1) * CHUNK)); }
    ch.sent += s.length; return true;
  } catch (e) { chanClosed(ch, 'failed'); return false; }
}
function chanRecv(ch, s) {
  ch.last = performance.now();
  if (s[0] === '\u0001') {
    const bar = s.indexOf('|'), [i, n] = s.slice(1, bar).split('/').map(Number);
    if (i === 0) ch.parts = []; ch.parts.push(s.slice(bar + 1)); if (i < n - 1) return;
    s = ch.parts.join(''); ch.parts = null;
  }
  let o; try { o = JSON.parse(s); } catch (e) { return; }
  ch.recv += s.length; if (ch.onmsg) ch.onmsg(o);
}
function chanOpened(ch) { if (ch.open || ch.closed) return; ch.open = true; ch.last = performance.now(); clearTimeout(ch.timer); if (ch.onopen) ch.onopen(); }
function chanClosed(ch, why) {
  if (!ch || ch.closed) return; ch.closed = true; const was = ch.open; ch.open = false; clearTimeout(ch.timer);
  try { if (ch.shut) ch.shut(); } catch (e) { /* already closed */ }
  if (ch.onclose) ch.onclose(why, was);
}
function armTimeout(ch, ms) { clearTimeout(ch.timer); ch.timer = setTimeout(() => { if (!ch.open) chanClosed(ch, 'timeout'); }, ms); }
function bindDC(ch, pc, dc) {
  ch.raw = s => dc.send(s); ch.shut = () => { dc.close(); pc.close(); };
  dc.onopen = () => chanOpened(ch); dc.onmessage = e => chanRecv(ch, e.data); dc.onclose = () => chanClosed(ch, 'closed');
  pc.onconnectionstatechange = () => { const s = pc.connectionState; ch.state = s; if (s === 'failed') chanClosed(ch, 'failed'); else if (s === 'closed') chanClosed(ch, 'closed'); };
}
function bindFake(ch, name, side) {
  const bc = new BroadcastChannel(name), other = side === 'h' ? 'j' : 'h', post = d => bc.postMessage({ f: side, d });
  ch.raw = s => { if (NET.fakeLag) setTimeout(() => post(s), NET.fakeLag); else post(s); };
  ch.shut = () => { post('\u0002bye'); bc.close(); };
  bc.onmessage = e => {
    const m = e.data; if (m.f !== other || ch.closed) return;
    if (m.d === '\u0002hi') { post('\u0002hi2'); chanOpened(ch); } else if (m.d === '\u0002hi2') chanOpened(ch);
    else if (m.d === '\u0002bye') chanClosed(ch, 'closed'); else chanRecv(ch, m.d);
  };
  if (side === 'h') post('\u0002hi');
}
function newPC() { const pc = new RTCPeerConnection(RTC_CFG); return { pc, dc: pc.createDataChannel('vd', { negotiated: true, id: 0, ordered: true }) }; }
async function localInfo(pc) {
  await waitIce(pc); const info = sdpParse(pc.localDescription.sdp);
  if (!info.cands.length && !NET.fake) { pc.close(); throw new Error(NET_ERR.nocand); }
  return info;
}
// host: a new invite (one per joining player) → chan with .code (offer code) and .id
async function rtcOffer(id) {
  if (typeof RTCPeerConnection === 'undefined') throw new Error('当前浏览器不支持 WebRTC，无法联机。请使用最新版 Chrome / Edge。');
  const { pc, dc } = newPC(), ch = makeChan(); ch.pc = pc; ch.id = String(id);
  if (!NET.fake) bindDC(ch, pc, dc);
  await pc.setLocalDescription(await pc.createOffer());
  const info = await localInfo(pc); ch.ufrag = info.ufrag; ch.code = await encodeCode('O', ch.id, info);
  return ch;
}
// host: apply the joiner's answer (already decoded, kind 'A') to its invite chan
async function rtcAccept(ch, a) {
  await ch.pc.setRemoteDescription({ type: 'answer', sdp: sdpBuild(a) });
  if (NET.fake) { ch.pc.close(); bindFake(ch, 'vdnet-' + ch.ufrag + '-' + ch.id, 'h'); }
  armTimeout(ch, 20000);
}
// joiner: offer code → chan with .code (answer code to send back)
async function rtcJoin(text) {
  if (typeof RTCPeerConnection === 'undefined') throw new Error('当前浏览器不支持 WebRTC，无法联机。请使用最新版 Chrome / Edge。');
  const o = await decodeCode(text);
  if (o.kind !== 'O') throw new Error('这是应答码：请粘贴房主发给你的邀请码（以 VD1O 开头）');
  const { pc, dc } = newPC(), ch = makeChan(); ch.pc = pc;
  if (!NET.fake) bindDC(ch, pc, dc);
  await pc.setRemoteDescription({ type: 'offer', sdp: sdpBuild(o) });
  await pc.setLocalDescription(await pc.createAnswer());
  const info = await localInfo(pc); ch.code = await encodeCode('A', o.id, info);
  if (NET.fake) { pc.close(); bindFake(ch, 'vdnet-' + o.ufrag + '-' + o.id, 'j'); }
  armTimeout(ch, 180000);
  return ch;
}
