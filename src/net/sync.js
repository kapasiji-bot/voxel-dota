// net/sync.js — B11 desync detection, ping and liveness.
//  • Every 30 ticks each peer hashes the simulation (unit ids / positions / HP / mana / gold / XP, RNG state, frame);
//    joiners send {t:'h', n, h}; the host compares with its own hash of the same tick and announces a mismatch.
//  • The host pings every joiner once a second ({t:'pi'} → {t:'po'}), shares the table ({t:'pings'}) every 2 s.
//  • A chan silent for NET_DEAD ms counts as disconnected (host: player dropped → bot; joiner: host gone).
const NET_DEAD = 15000;   // a slow machine's first match frame (shader compile) must not count as a disconnect
function stateHash() {
  let h = 2166136261 >>> 0;
  const mix = v => { h = Math.imul(h ^ (v | 0), 16777619) >>> 0; };
  mix(G.frame); mix(RNG.n); mix(RNG.a); mix(units.length); mix(projectiles.length);
  for (const u of units) {
    mix(u.id); mix(Math.round(u.x * 1000)); mix(Math.round(u.z * 1000)); mix(Math.round(u.hp * 100)); mix(Math.round((u.mana || 0) * 100)); mix(u.dead ? 1 : 0);
    if (u.isHero) { mix(u.gold); mix(u.xp); mix(u.level); mix(u.items.filter(Boolean).length); }
  }
  return h;
}
function syncTick(n) {
  const h = stateHash();
  if (NET.role === 'host') { LS.hashes[n] = h; delete LS.hashes[n - 30 * 40]; }
  else if (!NET.ff) netToHost({ t: 'h', n, h });
}
NET_H.h = (p, m) => {
  const mine = LS.hashes[m.n]; if (mine === undefined || mine === m.h || p.desync) return;
  p.desync = m.n; netBroadcast({ t: 'desync', name: p.name, n: m.n }); netDesyncShow(p.name, m.n);
};
NET_H.desync = (_, m) => netDesyncShow(m.name, m.n);
function netDesyncShow(name, n) {
  if (NET.desync.includes(name)) return; NET.desync.push(name);
  chatLine({ sys: true, warn: true, text: `⚠ 检测到不同步：${name} 的游戏状态与房主不一致（第 ${n} 帧）。双方画面可能出现差异，建议所有人使用同一种浏览器（Chrome / Edge）重新开局。` });
}
let netTimer = 0;
function netTimers() {
  if (netTimer) return;
  let k = 0;
  netTimer = setInterval(() => {
    const now = performance.now(); k++;
    if (NET.role === 'host') {
      for (const p of NET.peers) {
        if (p.gone) continue;
        if (now - p.ch.last > NET_DEAD) { chanClosed(p.ch, 'timeout'); continue; }
        chanSend(p.ch, { t: 'pi', ts: now });
      }
      if (k % 2 === 0) netBroadcast({ t: 'pings', v: NET.peers.filter(p => !p.gone).map(p => [p.pid, Math.round(p.rtt)]) });
      if (document.hidden) netPump();
    } else if (NET.hostCh && NET.hostCh.open && now - NET.hostCh.last > NET_DEAD) chanClosed(NET.hostCh, 'timeout');
    netHudTick();   // net/nethud.js
  }, 1000);
}
NET_H.pi = (_, m) => { netToHost({ t: 'po', ts: m.ts }); };
NET_H.po = (p, m) => { const r = performance.now() - m.ts; p.rtt = p.rtt ? p.rtt * 0.6 + r * 0.4 : r; };
NET_H.pings = (_, m) => { NET.pings = m.v; const me = m.v.find(x => x[0] === NET.me); NET.myPing = me ? me[1] : 0; };
