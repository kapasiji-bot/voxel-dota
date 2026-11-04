// net/replay.js — B11 follow-up: record the lockstep order log during a LAN (or local lockstep) match and play it back.
// Format {v:1, build, spec, log:[[n,cmds],...], cps:[{n,hash,i}], meta:{t,names,duration}}. Playback uses role 'replay'
// (host-like ticks driven by the log, spectator controls). No WebRTC. Hotkeys while playing: P pause, -/= speed, Esc end.
const REPLAY = { rec: null, last: null };
function replayCapture() {
  if (!NET.spec || !LS) return null;
  const names = (NET.spec.slots || []).map(s => s.name + ':' + (s.hero || '?'));
  return {
    v: 1, build: NET_VER, spec: NET.spec, log: LS.log.slice(), cps: (LS.cps || []).slice(),
    meta: { t: Date.now(), duration: G.time, names, ticks: LS.n, seed: NET.spec.seed },
  };
}
function replaySaveMem() { REPLAY.last = replayCapture(); return REPLAY.last; }
function replayExport() {
  const r = REPLAY.last || replayCapture(); if (!r) { err('没有可保存的录像'); return null; }
  REPLAY.last = r;
  const blob = new Blob([JSON.stringify(r)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `voxel-dota-replay-${r.meta.ticks || 0}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  msg('录像已下载', '#7cdc6a'); return r;
}
function replayValidate(r) {
  if (!r || r.v !== 1 || !r.spec || !Array.isArray(r.log)) throw new Error('无效的录像文件');
  if (r.build && r.build !== NET_VER) throw new Error('录像版本与当前游戏不一致，请使用同一版本打开');
  return r;
}
function replayStart(r) {
  r = replayValidate(r);
  if (G.started) { err('请先结束当前对局再播放录像'); return false; }
  REPLAY.rec = r; NET.on = true; NET.role = 'replay'; NET.me = -1; NET.spectating = true; NET.started = false; NET.speed = 1; NET.paused = false;
  NET.spec = r.spec; NET.ffSkipVis = false;   // play with visuals
  rngInstall(); netInstall(); rngSeed(r.spec.seed); lsReset(); cpLoad(r.cps || []);
  const map = new Map(r.log);
  LS.ffLog = map;   // reused as the source of commands per tick
  simRun(() => {
    for (const u of units) u.acq = Math.random() * 0.3;
    for (const s of r.spec.slots) {
      const ring = s.team === RAD ? '#40c4ff' : '#ff4040';
      const h = createHero(s.hero, s.team, { slot: s.ti, bot: s.k === 'b', ring });
      Object.assign(h, { netSlot: s.i, netName: s.name, netLane: s.lane, netDiff: s.diff, netHuman: s.k === 'h' });
      if (s.k === 'b') h.bot = makeBot(h, s.lane, s.diff);
    }
    for (const h of G.heroes) spawnCourier(h);
  });
  G.started = true; NET.started = true; NET.mySlot = -1;
  for (const id of ['lobby', 'select', 'netInv', 'repLoad']) { const el = $(id); if (el) el.classList.add('hidden'); }
  $('game').classList.remove('hidden');
  spectateSetup(RAD); buildHUD(); netHudShow(); replayHudShow(true);
  const h0 = G.player; if (h0) { const sx = h0.x < 0 ? 1 : -1; G.cam.x = h0.x + 6 * sx; G.cam.z = h0.z - 8 * sx; G.cam.dist = 58; }
  msg(`录像回放 · ${fmtTime(r.meta.duration || 0)} · ${r.meta.names ? r.meta.names.join('、') : ''}`, '#80d8ff');
  msg('P 暂停 · -/= 减速/加速 · [ / ] 切换跟随 · Esc 退出录像', '#b0bec5');
  emit('replayStart', { ticks: r.meta.ticks });
  return true;
}
function replayTicks(rdt) {
  if (NET.paused) { LS.acc = 0; return; }
  const end = REPLAY.rec ? (REPLAY.rec.meta.ticks | 0) : -1;
  if (end >= 0 && LS.n >= end) { LS.acc = 0; if (!NET.replayEnded) { NET.replayEnded = true; msg('录像播放完毕', '#ffd54f'); NET.paused = G.paused = true; replayHudTick(); } return; }
  LS.acc = Math.min(LS.acc + rdt * NET.speed, NSTEP * 10 * NET.speed);
  let k = 0;
  while (LS.acc >= NSTEP && !G.over && k < 40 * NET.speed && (end < 0 || LS.n < end)) {
    const n = LS.n, c = (LS.ffLog && LS.ffLog.get(n)) || [];
    execTick(n, c); LS.acc -= NSTEP; k++;
  }
  if (end >= 0 && LS.n >= end && !NET.replayEnded) { NET.replayEnded = true; msg('录像播放完毕', '#ffd54f'); NET.paused = G.paused = true; replayHudTick(); }
}
function replayStop() { location.reload(); }
