// net/drop.js — B11 disconnects and rejoining.
//  • Host loses a joiner: in the lobby the seat is freed; in a match a {k:'drop'} command hands the hero to a bot (same
//    lane / difficulty AI as singleplayer computer heroes) at the same tick on every peer.
//  • Rejoin: the host makes a new invite code (in-game 联机 panel); a joiner who connects during a match takes over a dropped
//    hero (same name preferred). It receives the match spec + every command so far and re-simulates the whole match at full
//    speed (deterministic lockstep), then a {k:'human'} command gives the hero back.
//  • Joiner loses the host: the match cannot continue (the host runs the clock) → clear message, back to the menu.
function netPeerLost(p, why) {
  if (p.gone) return; p.gone = true;
  if (!NET.started) { lobbyRemove(p.pid); NET.peers.splice(NET.peers.indexOf(p), 1); lobbyChanged(); lobbyLog(`${p.name} 离开了房间`); return; }
  if (p.slot >= 0 && heroBySlot(p.slot) && !heroBySlot(p.slot).netGone) LS.pend.push({ k: 'drop', s: p.slot, p: -1, why: String(why || '') });
  if (document.hidden) netPump();
}
function netExecDrop(c) {
  const h = heroBySlot(c.s); if (!h || h.netGone) return;
  h.netGone = true; h.isBot = true; h.bot = makeBot(h, h.netLane || 'mid', h.netDiff === undefined ? 1 : h.netDiff);
  msg(`${h.netName} 断开了连接，${h.def.name} 由电脑接管`, '#ffab40');
  chatLine({ sys: true, text: `${h.netName} 断开了连接（${h.def.name} 由电脑接管，可用新的邀请码重新加入）` });
  emit('netDrop', { unit: h.id, slot: c.s });
}
function netExecHuman(c) {
  const h = heroBySlot(c.s); if (!h || !h.netGone) return;
  h.netGone = false; h.isBot = false; h.bot = null; h.netName = c.name || h.netName; NET_ORIG.issueOrder(h, { type: 'idle' });
  msg(`${h.netName} 重新连接，继续控制 ${h.def.name}`, '#7cdc6a');
  emit('netRejoin', { unit: h.id, slot: c.s });
}
// host: a hello during a match
function netRejoin(p) {
  const free = G.heroes.filter(h => h.netGone && h.netHuman);
  const h = free.find(x => x.netName === p.name) || free[0];
  if (!h || G.over) { chanSend(p.ch, { t: 'bye', why: G.over ? '对局已经结束' : '对局进行中，没有可接管的掉线英雄' }); setTimeout(() => chanClosed(p.ch, 'full'), 300); return; }
  p.slot = h.netSlot; p.synced = false; p.ack = -1;
  chanSend(p.ch, { t: 'resume', spec: NET.spec, slot: p.slot, log: LS.log, upto: LS.n - 1, speed: NET.speed, paused: NET.paused, pid: p.pid });
  LS.pend.push({ k: 'human', s: p.slot, p: -1, name: p.name });
  chatLine({ sys: true, text: `${p.name} 正在重新加入（接管 ${h.def.name}，同步进度中…）` });
}
NET_H.resume = (_, m) => {
  NET.me = m.pid; NET.speed = m.speed || 1;
  netBegin(m.spec, m.slot);
  LS.ffLog = new Map(m.log); LS.ffTo = m.upto; NET.ff = true; NET.ffTotal = m.upto + 1;
  if (m.paused) netSetPause(true);
  const o = $('netFF'); if (o) o.classList.remove('hidden');
};
// rejoin catch-up: re-simulate every tick up to the host's tick at the time of joining, ~45 ms of work per frame
function ffRun() {
  const t0 = performance.now(), budget = document.hidden ? 200 : 45;
  while (LS.n <= LS.ffTo && performance.now() - t0 < budget) execTick(LS.n, LS.ffLog.get(LS.n) || []);
  const el = $('netFFTxt'); if (el) el.textContent = `正在同步对局进度… ${Math.floor(LS.n / NET.ffTotal * 100)}%（${fmtTime(G.time)}）`;
  if (LS.n > LS.ffTo) {
    LS.ffTo = -1; LS.ffLog = null; NET.ff = false; LS.acc = 0;
    const o = $('netFF'); if (o) o.classList.add('hidden');
    floats.length = 0;
    msg('同步完成，欢迎回来！', '#7cdc6a'); netToHost({ t: 'a', n: LS.n - 1 });
  }
}
// joiner: the host's chan closed
function netHostLost(why, was) {
  if (!was) { joinFailed(why); return; }   // net/invite.js: never connected → explain why
  if (NET.ended) return; NET.ended = true;
  const reason = NET.byeWhy || (why === 'timeout' ? '与房主的连接超时' : '房主已离开房间或网络已断开');
  netShowEnd(NET.started ? `${reason}，对局无法继续（房主负责运行游戏）。` : `${reason}。`);
}
function netShowEnd(text) {
  if (NET.started) { G.halt = true; G.paused = true; }
  const b = $('netEnd'); if (!b) return;
  $('netEndTxt').textContent = text; b.classList.remove('hidden');
}
