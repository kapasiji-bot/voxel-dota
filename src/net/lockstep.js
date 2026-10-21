// net/lockstep.js — B11 host-relayed deterministic lockstep. The simulation advances ONLY in fixed ticks of NSTEP s.
// Host: each tick n it takes every command received since the last tick (its own + joiners'), broadcasts
//   {t:'f', n, c:[cmds]} and runs execTick(n). It never runs more than NAHEAD ticks ahead of the slowest joiner's ack.
// Joiner: queues frames and runs them in order at real-time pace (catching up when behind); acks every few ticks and
//   sends a state hash every 30 ticks (net/sync.js). Hidden tabs keep pumping from network messages (no rAF there).
// Rendering interpolates unit positions between the last two ticks (lsInterp / lsRestore around the real values).
const NSTEP = 1 / 30, NAHEAD = 15;
const LS = { n: 0, acc: 0, q: [], pend: [], log: [], hashes: {}, last: 0, ackSent: -1, ip: null, waitT: 0, ffTo: -1, ffLog: null };
function lsReset() { Object.assign(LS, { n: 0, acc: 0, q: [], pend: [], log: [], hashes: {}, last: performance.now(), ackSent: -1, ip: null, waitT: 0, ffTo: -1, ffLog: null }); }
function execTick(n, cmds) {
  lsRestore();
  if (NET.rngLog) { RNG.trace = []; NET.rngLog.set(n, RNG.trace); NET.rngLog.delete(n - 400); }   // debug: who called Math.random per tick
  simRun(() => {
    for (const c of cmds) execCmd(c);   // net/cmds.js
    for (const u of units) { u._px = u.x; u._pz = u.z; }
    step(NSTEP);
  });
  LS.n = n + 1; NET.stats.frames++;
  if (n % 30 === 0) syncTick(n);   // net/sync.js
  if (NET.trace) NET.trace.push([n, stateHash(), RNG.n]);   // debug: per-tick hashes (GameAPI.NET.trace = [])
  if (NET.dumpAll) (NET.dump || (NET.dump = [])).push(units.map(u => [u.id, u.kind, u.team, u.x, u.z, u.hp, u.mana, u.dead, u.order && u.order.type, u.atk && u.atk.phase, u.target && u.target.id, u.atk && u.atk.t, u.model && u.model.position.y, u.facing]));
}
// called every animation frame (core/loop.js) and from network messages while the tab is hidden
function netFrame() { netPump(); if (!document.hidden) lsInterp(); }
function netPump() {
  const now = performance.now(), rdt = Math.min(0.25, Math.max(0, (now - LS.last) / 1000)); LS.last = now;
  if (!G.started || G.over) return;
  if (LS.ffTo >= 0) { ffRun(); return; }   // net/drop.js: rejoin catch-up
  if (NET.role === 'host') hostTicks(rdt); else clientTicks(rdt);
}
function minAck() { let m = Infinity; for (const p of NET.peers) if (!p.gone && p.slot >= 0 && p.synced) m = Math.min(m, p.ack); return m; }
function hostTicks(rdt) {
  if (NET.paused) { LS.acc = 0; return; }
  LS.acc = Math.min(LS.acc + rdt * NET.speed, NSTEP * 10 * NET.speed);
  let k = 0;
  while (LS.acc >= NSTEP && !G.over && k < 40 * NET.speed) {
    if (LS.n - minAck() > NAHEAD) { LS.waitT += rdt; LS.acc = Math.min(LS.acc, NSTEP * 2); break; }
    LS.waitT = 0;
    const n = LS.n, c = LS.pend; LS.pend = [];
    netBroadcast(c.length ? { t: 'f', n, c } : { t: 'f', n });
    if (c.length) LS.log.push([n, c]);
    execTick(n, c); LS.acc -= NSTEP; k++;
  }
}
NET_H.f = (_, m) => { LS.q.push(m); if (document.hidden) netPump(); };
function clientTicks(rdt) {
  LS.acc += rdt * NET.speed;
  let k = 0;
  while (LS.q.length && k < 300) {
    const behind = LS.q.length > 3;
    if (LS.acc < NSTEP && !behind && !document.hidden) break;
    const f = LS.q.shift(); if (f.n < LS.n) continue;
    execTick(f.n, f.c || []); LS.acc = Math.max(0, LS.acc - NSTEP); k++;
  }
  if (!LS.q.length) LS.acc = Math.min(LS.acc, NSTEP);
  if (LS.n - 1 - LS.ackSent >= 3 || (k && document.hidden)) { LS.ackSent = LS.n - 1; netToHost({ t: 'a', n: LS.n - 1 }); }
}
NET_H.a = (p, m) => { p.ack = Math.max(p.ack, m.n | 0); if (!p.synced && LS.n - p.ack <= NAHEAD) p.synced = true; if (document.hidden) netPump(); };
// render-time interpolation: show units between their previous and current tick positions
function lsInterp() {
  lsRestore();   // never interpolate from already-interpolated positions
  const a = NET.paused ? 1 : clamp(LS.acc / NSTEP, 0, 1), ip = [];
  for (const u of units) {
    if (u.dead || u._px === undefined || u.isBuilding) continue;
    const dx = u.x - u._px, dz = u.z - u._pz; if (!dx && !dz) continue;
    if (dx * dx + dz * dz > 9) continue;   // blink / teleport: no sliding
    ip.push(u, u.x, u.z); u.x = u._px + dx * a; u.z = u._pz + dz * a;
    if (u.model) { u.model.position.x = u.x; u.model.position.z = u.z; }
  }
  LS.ip = ip;
}
function lsRestore() {
  const ip = LS.ip; if (!ip) return; LS.ip = null;
  for (let i = 0; i < ip.length; i += 3) { const u = ip[i]; u.x = ip[i + 1]; u.z = ip[i + 2]; if (u.model) { u.model.position.x = u.x; u.model.position.z = u.z; } }
}
// P key: singleplayer pause as before; in a LAN match only the host pauses (for everyone)
function togglePause() {
  if (!NET.on) { G.paused = !G.paused; $('pause').classList.toggle('hidden', !G.paused); return; }
  if (NET.role !== 'host') { err('只有房主可以暂停游戏'); return; }
  netSetPause(!NET.paused);
}
function netSetPause(on) {
  NET.paused = G.paused = !!on; $('pause').textContent = on ? '游戏已被房主暂停' + (NET.role === 'host' ? ' (P 继续)' : '') : '已暂停 (P)';
  $('pause').classList.toggle('hidden', !on);
  if (NET.role === 'host') { netBroadcast({ t: 'pause', on: !!on }); netSys(on ? '房主暂停了游戏' : '房主继续了游戏'); }
}
NET_H.pause = (_, m) => netSetPause(m.on);
