// net/match.js — B11 match start. The host turns the lobby into a spec {seed, build, slots:[{i, team, ti, k:'h'|'b', pid,
// name, hero, diff, lane}]} (bots get random unused heroes; lanes by team size like singleplayer), broadcasts {t:'start'} and
// every peer runs netBegin(spec, mySlot): seed the shared RNG, install the command wrappers (net/wrap.js), create every hero
// in slot order inside the simulation scope, couriers, HUD. From then on the sim only advances in lockstep ticks.
function netBuildSpec() {
  const used = new Set(LOB.slots.filter(s => s.hero).map(s => s.hero));
  const pool = heroList().map(d => d.id).filter(id => !used.has(id));
  for (let i = pool.length - 1; i > 0; i--) { const j = (vrand() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const slots = [];
  for (const team of [RAD, DIRE]) {
    const list = LOB.slots.map((s, i) => ({ s, i })).filter(x => slotTeam(x.i) === team && x.s.k !== 'e');
    const lanes = LANES_BY_COUNT[list.length] || [];
    list.forEach((x, ti) => slots.push({ i: x.i, team, ti, k: x.s.k, pid: x.s.k === 'h' ? x.s.pid : -1, name: x.s.k === 'h' ? x.s.name : '电脑', hero: x.s.hero || pool.shift(), diff: x.s.k === 'b' ? x.s.diff : 1, lane: lanes[ti] || 'mid' }));
  }
  return { seed: (vrand() * 4294967296) >>> 0, build: NET_VER, slots };
}
function netStartGame() {
  if (NET.role !== 'host' || NET.started) return;
  const e = lobbyStartError(); if (e) { lobbyLog('无法开始：' + e); return; }
  const spec = netBuildSpec();
  for (const p of NET.peers) { const s = spec.slots.find(x => x.pid === p.pid); p.slot = s ? s.i : -1; p.ack = -1; }
  netBroadcast({ t: 'start', spec });
  netBegin(spec, spec.slots.find(s => s.pid === 0).i);
}
NET_H.start = (_, m) => { const s = m.spec.slots.find(x => x.pid === NET.me); if (s) netBegin(m.spec, s.i); };
function netBegin(spec, mySlot) {
  if (G.started) return;
  NET.on = true; NET.started = true; NET.spec = spec; NET.mySlot = mySlot;
  rngInstall(); netInstall(); rngSeed(spec.seed); lsReset();
  const me = spec.slots.find(s => s.i === mySlot);
  simRun(() => {
    for (const u of units) u.acq = Math.random() * 0.3;   // boot-time randomness (buildings) → shared sequence
    for (const s of spec.slots) {
      const ring = s.i === mySlot ? '#4cff4c' : s.team === me.team ? '#40c4ff' : '#ff4040';
      const h = createHero(s.hero, s.team, { slot: s.ti, bot: s.k === 'b', ring });
      Object.assign(h, { netSlot: s.i, netName: s.name, netLane: s.lane, netDiff: s.diff, netHuman: s.k === 'h' });
      if (s.k === 'b') h.bot = makeBot(h, s.lane, s.diff);
      if (s.i === mySlot) G.player = h;
    }
    for (const h of G.heroes) spawnCourier(h);
  });
  G.started = true;
  for (const id of ['lobby', 'select', 'netInv']) { const el = $(id); if (el) el.classList.add('hidden'); }
  $('game').classList.remove('hidden');
  buildHUD(); netHudShow();   // net/nethud.js
  const sx = G.player.x < 0 ? 1 : -1; G.cam.x = G.player.x + 6 * sx; G.cam.z = G.player.z - 8 * sx; G.cam.dist = 58;
  const n = t => spec.slots.filter(s => s.team === t).length;
  msg(`局域网对局：天辉 ${n(RAD)} 名英雄 vs 夜魇 ${n(DIRE)} 名英雄 · 你在${TEAM_NAME[me.team]}`, '#80d8ff');
  msg(me.team === RAD ? '摧毁夜魇遗迹即可获胜！' : '摧毁天辉遗迹即可获胜！', '#ffd54f');
  msg('Enter 队伍聊天 · Shift+Enter 全体聊天', '#b0bec5');
  emit('netStart', { slots: spec.slots.length });
}
