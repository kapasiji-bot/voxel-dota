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
  p.slot = h.netSlot; p.synced = false; p.ack = -1; p.spectate = false;
  chanSend(p.ch, { t: 'resume', spec: NET.spec, slot: p.slot, log: LS.log, upto: LS.n - 1, speed: NET.speed, paused: NET.paused, pid: p.pid, spectate: false, cps: LS.cps || [] });
  LS.pend.push({ k: 'human', s: p.slot, p: -1, name: p.name });
  chatLine({ sys: true, text: `${p.name} 正在重新加入（接管 ${h.def.name}，同步进度中…）` });
}
NET_H.resume = (_, m) => {
  NET.me = m.pid; NET.speed = m.speed || 1; NET.spectating = !!m.spectate;
  // mark FF before netBegin so pollers never see started&&!ff with work still pending
  const upto = Math.max(0, m.upto | 0);
  const logMap = new Map(m.log || []);
  NET.ff = true; NET.ffSkipVis = true; NET.ffTotal = upto + 1; NET.ffMs = 0; NET.ffTicks = 0;
  netBegin(m.spec, m.slot);   // lsReset clears ffTo — re-apply below
  cpLoad(m.cps || []);
  LS.ffLog = logMap; LS.ffTo = upto;
  if (m.paused) netSetPause(true);
  const o = $('netFF'); if (o) o.classList.remove('hidden');
};
// rejoin / spectator catch-up: re-simulate ticks; skip-vis + larger budget vs the original 45 ms path
function ffRun() {
  const t0 = performance.now(), budget = document.hidden ? 800 : (NET.ffSkipVis ? 250 : 45);
  let n0 = LS.n;
  while (LS.n <= LS.ffTo && performance.now() - t0 < budget) {
    const n = LS.n;
    execTick(n, LS.ffLog.get(n) || []);
    if (n && LS.cps && LS.cps.length && n % CP_EVERY === 0) cpVerify(n, stateHash());
  }
  NET.ffMs += performance.now() - t0; NET.ffTicks += LS.n - n0;
  const cp = cpLatest(), pct = Math.floor(LS.n / NET.ffTotal * 100);
  const el = $('netFFTxt'); if (el) el.textContent = `正在同步对局进度… ${pct}%（${fmtTime(G.time)}）` + (cp ? ` · 检查点 ${LS.cpHits}/${LS.cps.length}` : '');
  if (LS.n > LS.ffTo) {
    LS.ffTo = -1; LS.ffLog = null; NET.ff = false; LS.acc = 0; NET.ffSkipVis = false;
    const o = $('netFF'); if (o) o.classList.add('hidden');
    floats.length = 0;
    if (NET.spectating) { spectateSetup(); msg('观战同步完成', '#7cdc6a'); }
    else msg('同步完成，欢迎回来！', '#7cdc6a');
    netToHost({ t: 'a', n: LS.n - 1 });
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
