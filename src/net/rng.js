// net/rng.js — B11 deterministic randomness for LAN lockstep. In multiplayer every peer runs the same simulation from the same
// seed, so Math.random must return the same sequence on every peer INSIDE the simulation (step(), command execution, match
// setup: RNG.sim > 0) and must not be consumed by anything that differs per peer (particles, floating numbers, audio, the
// announcer — all of which depend on the local camera / team / fog). Those run in a "visual scope" (RNG.vis > 0) that uses
// the browser's native generator. Singleplayer never installs the patch (rngInstall is only called by netBegin).
const NATIVE_RANDOM = Math.random;
const vrand = () => NATIVE_RANDOM();
const vrnd = (a, b) => a + NATIVE_RANDOM() * (b - a);
const RNG = { on: false, sim: 0, vis: 0, a: 1, b: 2, c: 3, d: 4, n: 0 };
// sfc32 seeded through splitmix32
function rngSeed(seed) {
  let s = seed >>> 0;
  const sm = () => { s = (s + 0x9e3779b9) | 0; let z = s; z = Math.imul(z ^ (z >>> 16), 0x85ebca6b); z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35); return (z ^ (z >>> 16)) >>> 0; };
  RNG.a = sm(); RNG.b = sm(); RNG.c = sm(); RNG.d = sm(); RNG.n = 0;
}
function simRandom() {
  const a = RNG.a, b = RNG.b, c = RNG.c, d = RNG.d, t = (((a + b) | 0) + d) | 0;
  if (RNG.trace) RNG.trace.push(new Error().stack.split('\n').slice(2, 5).map(l => l.trim().replace(/^at /, '').replace(/\(?file:.*voxel-dota.html[^:]*:/, '@').replace(/\)$/, '')).join(' < '));   // debug only
  RNG.d = (d + 1) | 0; RNG.a = b ^ (b >>> 9); RNG.b = (c + (c << 3)) | 0; RNG.c = (((c << 21) | (c >>> 11)) + t) | 0; RNG.n++;
  return (t >>> 0) / 4294967296;
}
function rngInstall() {
  if (RNG.on) return; RNG.on = true;
  Math.random = () => (RNG.sim > 0 && RNG.vis === 0 ? simRandom() : NATIVE_RANDOM());
}
// run fn inside the deterministic simulation scope
function simRun(fn) { RNG.sim++; try { return fn(); } finally { RNG.sim--; } }
// wrap a visual / audio function so randomness inside it never touches the simulation sequence
function visScope(fn) { return function () { RNG.vis++; try { return fn.apply(this, arguments); } finally { RNG.vis--; } }; }
// subscribe event handlers registered inside fn (audio hooks, announcer) in the visual scope
function visHooks(fn) {
  const on = Events.on;
  Events.on = function (type, f) { return on.call(this, type, visScope(f)); };
  try { fn(); } finally { Events.on = on; }
}
