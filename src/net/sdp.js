// net/sdp.js — B11 copy-paste signalling codes. A WebRTC offer / answer SDP is stripped to what a data channel needs
// (ICE ufrag + pwd, DTLS fingerprint, setup role, UDP candidates), packed into a short text, deflated (CompressionStream
// 'deflate-raw' when the browser has it) and base64url-encoded:  VD1 + O|A (offer / answer) + z|p (deflated / plain) + data.
// mDNS host candidates (<uuid>.local, what browsers expose on a LAN) are stored as 16 raw bytes.
const CODE_RE = /VD1([OA])([zp])([A-Za-z0-9_-]+)/;
const b64u = bytes => { let s = ''; for (const x of bytes) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(t, c => c.charCodeAt(0)); };
function sdpParse(sdp) {
  const get = k => { const m = new RegExp('^a=' + k + ':(.*)$', 'm').exec(sdp); return m ? m[1].trim() : ''; };
  const fp = get('fingerprint').split(' ')[1] || '';
  const cands = [];
  for (const m of sdp.matchAll(/^a=candidate:\S+ (\d) (\S+) \d+ (\S+) (\d+) typ (\S+)/gm)) {
    if (m[1] !== '1' || m[2].toLowerCase() !== 'udp' || cands.length >= 6) continue;
    if (!cands.some(c => c.addr === m[3] && c.port === +m[4])) cands.push({ addr: m[3], port: +m[4], typ: m[5] });
  }
  return { ufrag: get('ice-ufrag'), pwd: get('ice-pwd'), fp: fp.split(':').map(h => parseInt(h, 16)), setup: get('setup'), cands };
}
const UUID_LOCAL = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/i;
function packAddr(a) {
  const m = UUID_LOCAL.exec(a); if (!m) return a;
  const hex = m.slice(1).join(''), b = []; for (let i = 0; i < 32; i += 2) b.push(parseInt(hex.substr(i, 2), 16)); return '~' + b64u(b);
}
function unpackAddr(a) {
  if (a[0] !== '~') return a;
  const h = [...unb64u(a.slice(1))].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}.local`;
}
const SETUP_C = { actpass: 'x', active: 'a', passive: 'p' }, SETUP_N = { x: 'actpass', a: 'active', p: 'passive' };
// info → compact text (one field per line)
function sdpPackText(info, id) {
  return [id, info.ufrag, info.pwd, b64u(info.fp), SETUP_C[info.setup] || 'a', ...info.cands.map(c => `${packAddr(c.addr)} ${c.port.toString(36)} ${c.typ[0]}`)].join('\n');
}
function sdpUnpackText(t) {
  const L = t.split('\n'); if (L.length < 5) throw new Error('bad');
  const typ = { h: 'host', s: 'srflx', p: 'prflx', r: 'relay' };
  return { id: L[0], ufrag: L[1], pwd: L[2], fp: [...unb64u(L[3])], setup: SETUP_N[L[4]] || 'active',
    cands: L.slice(5).filter(Boolean).map(l => { const [a, p, ty] = l.split(' '); return { addr: unpackAddr(a), port: parseInt(p, 36), typ: typ[ty] || 'host' }; }) };
}
// rebuild a minimal data-channel SDP from the packed info
function sdpBuild(info) {
  const fp = info.fp.map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(':');
  const cl = info.cands.map((c, i) => `a=candidate:${i + 1} 1 udp ${c.typ === 'host' ? 2122260223 - i : 1686052607 - i} ${c.addr} ${c.port} typ ${c.typ}${c.typ === 'host' ? '' : ' raddr 0.0.0.0 rport 0'}`);
  return ['v=0', `o=- ${Date.now()} 2 IN IP4 127.0.0.1`, 's=-', 't=0 0', 'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0', ...cl, ...(cl.length ? ['a=end-of-candidates'] : []),
    `a=ice-ufrag:${info.ufrag}`, `a=ice-pwd:${info.pwd}`, `a=fingerprint:sha-256 ${fp}`, `a=setup:${info.setup}`, 'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144', ''].join('\r\n');
}
async function zipBytes(str, inflate) {
  const CS = inflate ? window.DecompressionStream : window.CompressionStream; if (!CS) return null;
  const data = inflate ? str : new TextEncoder().encode(str);
  const buf = await new Response(new Blob([data]).stream().pipeThrough(new CS('deflate-raw'))).arrayBuffer();
  return new Uint8Array(buf);
}
async function encodeCode(kind, id, info) {
  const t = sdpPackText(info, id); let z = null;
  try { z = await zipBytes(t); } catch (e) { z = null; }
  const plain = new TextEncoder().encode(t);
  return z && z.length < plain.length ? `VD1${kind}z${b64u(z)}` : `VD1${kind}p${b64u(plain)}`;
}
// returns {kind:'O'|'A', id, ufrag, pwd, fp, setup, cands} or throws an Error with a Chinese message
async function decodeCode(text) {
  const m = CODE_RE.exec(String(text || '').replace(/\s+/g, ''));
  if (!m) throw new Error('无法识别的连接码：请完整复制以 VD1 开头的整段文字');
  let bytes;
  try { bytes = unb64u(m[3]); if (m[2] === 'z') { bytes = await zipBytes(bytes, true); if (!bytes) throw new Error('nozip'); } }
  catch (e) { throw new Error(e.message === 'nozip' ? '当前浏览器无法解压该连接码（请升级浏览器）' : '连接码已损坏：请重新复制完整的连接码'); }
  try { return Object.assign({ kind: m[1] }, sdpUnpackText(new TextDecoder().decode(bytes))); }
  catch (e) { throw new Error('连接码已损坏：请重新复制完整的连接码'); }
}
