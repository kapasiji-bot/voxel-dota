// audio/synth.js — tiny synthesis toolkit for the recipes in sounds.js / spells.js: oscillator tones with pitch glides,
// filtered noise bursts (from one procedurally generated noise buffer — the only "sample cache"), chords and envelopes.
// A recipe is SOUNDS[name] = { type (throttle group, engine.js AU_TYPES), dur (s), vol, bus, play(t, out, p) }.
const SOUNDS = {};
function defSound(name, type, dur, play, extra) { SOUNDS[name] = Object.assign({ type, dur, play }, extra || {}); }
// cached 2 s of white noise and 2 s of brown noise (rumbles), generated once per context
function auNoise() {
  const c = AU.ctx; if (!c || AU.noise) return;
  const n = c.sampleRate * 2, w = c.createBuffer(1, n, c.sampleRate), b = c.createBuffer(1, n, c.sampleRate);
  const wd = w.getChannelData(0), bd = b.getChannelData(0); let last = 0;
  for (let i = 0; i < n; i++) { const r = Math.random() * 2 - 1; wd[i] = r; last = (last + 0.02 * r) / 1.02; bd[i] = last * 3.5; }
  AU.noise = w; AU.brown = b;
}
// gain envelope: linear attack to peak, exponential decay to silence at t + dur
function auEnv(param, t, a, peak, dur) {
  param.setValueAtTime(0.0001, t); param.linearRampToValueAtTime(peak, t + a);
  param.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
}
// o: { type, f, f2 (glide target), dur, vol, a (attack), det (cents), at (delay) }
function tone(t, out, o) {
  const c = AU.ctx, os = c.createOscillator(), g = c.createGain(), s = t + (o.at || 0), d = o.dur || 0.2;
  os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, s); if (o.det) os.detune.value = o.det;
  if (o.f2) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), s + d);
  auEnv(g.gain, s, o.a || 0.005, o.vol || 0.3, d);
  os.connect(g); g.connect(out); os.start(s); os.stop(s + d + 0.05);
}
// o: { dur, vol, a, filt ('bandpass'|'lowpass'|'highpass'), f, f2, q, brown, at }
function noiz(t, out, o) {
  const c = AU.ctx, src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), s = t + (o.at || 0), d = o.dur || 0.2;
  src.buffer = o.brown ? AU.brown : AU.noise;
  fl.type = o.filt || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1200, s); fl.Q.value = o.q || 1;
  if (o.f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), s + d);
  auEnv(g.gain, s, o.a || 0.004, o.vol || 0.3, d);
  src.connect(fl); fl.connect(g); g.connect(out); src.start(s, Math.random() * 1.2, d + 0.05);
}
const chord = (t, out, fs, o) => fs.forEach((f, i) => tone(t, out, Object.assign({}, o, { f, f2: o.glide ? f * o.glide : 0, at: (o.at || 0) + i * (o.arp || 0) })));
const semis = (f, n) => f * Math.pow(2, n / 12);
// stable pseudo-random in [0,1) from a string (per-hero ult stinger pitch)
const strHash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003; return (h % 997) / 997; };
