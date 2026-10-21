// audio/ambience.js — tickAudio(rdt), called every rendered frame (core/loop.js frame):
//   ambience bed — looped brown-noise wind (lowpass; darker and quieter at night, core day/night = 5 min each) plus random
//   birds by day, crickets / an owl at night; low-HP heartbeat for the player's hero (< 25 % HP, faster < 12 %).
// Ambience is non-spatial (amb bus) and stops while paused, before the match and after it ends.
const AMB = { bed: null, flt: null, g: null, nextEv: 0, nextBeat: 0 };
function ambBed() {
  const c = AU.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = AU.brown; src.loop = true; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0;
  src.connect(f); f.connect(g); g.connect(AU.bus.amb); src.start();
  AMB.bed = src; AMB.flt = f; AMB.g = g;
}
function tickAudio(rdt) {
  if (!AU.ctx || AU.ctx.state !== 'running' || !AU.noise) return;
  if (!AMB.bed) ambBed();
  const c = AU.ctx, t = c.currentTime, live = G.started && !G.over && !G.paused, night = isNight();
  const wind = live ? (night ? 0.18 : 0.26) * (0.8 + 0.2 * Math.sin(t * 0.37)) : 0.06;
  AMB.g.gain.setTargetAtTime(wind, t, 0.8); AMB.flt.frequency.setTargetAtTime(night ? 320 : 520 + 120 * Math.sin(t * 0.21), t, 1.2);
  if (!live) return;
  const now = auNow();
  if (now >= AMB.nextEv) {
    if (night) { auPlay(Math.random() < 0.08 ? 'owl' : 'cricket', { bus: 'amb' }); AMB.nextEv = now + rnd(0.6, 1.8); }
    else { auPlay('bird', { bus: 'amb', p: { f: rnd(2200, 3600) } }); AMB.nextEv = now + rnd(2.5, 7); }
  }
  const P = G.player;
  if (P && !P.dead && P.hp < P.maxHp * 0.25 && now >= AMB.nextBeat) { const crit = P.hp < P.maxHp * 0.12; auPlay('heart', { bus: 'ui', vol: crit ? 1 : 0.6 }); AMB.nextBeat = now + (crit ? 0.62 : 0.9); }
}
