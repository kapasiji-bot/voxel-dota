// net/spectate.js — B11 follow-up: watch a LAN match without controlling a hero (mid-match late join, or replay).
// Spectator: NET.spectating, netSlot -1, G.player is a camera/HUD follow target only; netCmd rejects all player commands.
// Mid-match: if hello arrives and no dropped human hero is free, host sends resume with spectate:true (see net/drop.js).
function netIsSpectating() { return !!(NET.spectating || NET.role === 'replay'); }
function netCanCommand() { return NET.on && !netIsSpectating() && NET.role !== 'replay'; }
function spectateFollow(h) {
  if (!h || h.dead && !G.heroes.some(x => !x.dead)) { /* keep */ }
  if (!h) h = G.heroes.find(x => !x.dead) || G.heroes[0];
  if (!h) return;
  G.player = h; G.selected = h;
  if (typeof selectUnits === 'function') try { selectUnits([h]); } catch (e) { /* ctl may be mid-init */ }
  msg(`观战：跟随 ${h.netName || h.def.name}`, '#80d8ff');
}
function spectateCycle(dir) {
  if (!G.heroes.length) return;
  const live = G.heroes.slice();
  let i = live.indexOf(G.player); if (i < 0) i = 0;
  i = (i + (dir || 1) + live.length * 8) % live.length;
  spectateFollow(live[i]);
}
function spectateSetup(followTeam) {
  NET.spectating = true; NET.mySlot = -1;
  const pref = followTeam === undefined ? RAD : followTeam;
  const h = G.heroes.find(x => x.team === pref && !x.dead) || G.heroes.find(x => !x.dead) || G.heroes[0];
  spectateFollow(h);
  msg('观战模式：无法下达指令。点击英雄或按 [ / ] 切换跟随目标。F1 跟随自己阵营首位。', '#80d8ff');
}
// host: late join with no free dropped hero → spectator
function netSpectateJoin(p) {
  if (G.over) { chanSend(p.ch, { t: 'bye', why: '对局已经结束' }); setTimeout(() => chanClosed(p.ch, 'full'), 300); return; }
  p.slot = -1; p.synced = false; p.ack = -1; p.spectate = true;
  chanSend(p.ch, { t: 'resume', spec: NET.spec, slot: -1, log: LS.log, upto: LS.n - 1, speed: NET.speed, paused: NET.paused, pid: p.pid, spectate: true, cps: LS.cps || [] });
  chatLine({ sys: true, text: `${p.name} 以观战身份加入` });
}
function spectateOnKey(e) {
  if (!netIsSpectating() || !G.started) return false;
  if (e.code === 'BracketLeft') { spectateCycle(-1); return true; }
  if (e.code === 'BracketRight') { spectateCycle(1); return true; }
  if (e.code === 'F1') { spectateFollow(G.heroes.find(h => h.team === (G.player && G.player.team)) || G.heroes[0]); return true; }
  return false;
}
