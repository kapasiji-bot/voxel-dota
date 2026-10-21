// audio/engine.js — B9 Web Audio core: lazy AudioContext (created on the first user gesture — autoplay policy), buses
// master → {sfx, amb, ui}, persisted settings, voice pool + per-type throttle, camera-distance volume / stereo pan, fog gate.
// Every sound is synthesized (audio/synth.js recipes in SOUNDS); nothing is loaded. auPlay() decides first (mute, fog, distance,
// throttle, pool) and only then synthesizes, so the gating works (and is counted in AU.stats) even without an AudioContext.
const AU_KEY = 'voxdota.audio';
const AU_DEFAULT = { master: 0.8, sfx: 0.8, amb: 0.5, ui: 0.7, muted: false, lockMouse: false };   // lockMouse: ui/pointerlock.js
const AU = {
  ctx: null, bus: {}, set: Object.assign({}, AU_DEFAULT), voices: [], last: {}, MAX_VOICES: 24,
  stats: { played: 0, fog: 0, far: 0, throttle: 0, pool: 0, muted: 0, byName: {} }, log: [], logOn: false,
};
// per-type throttle: min seconds between two plays + max simultaneous voices (types group many sound names)
const AU_TYPES = {
  swing: [0.05, 4], hit: [0.04, 5], creep: [0.09, 3], proj: [0.05, 4], tower: [0.12, 2], spell: [0.03, 6], ult: [0.2, 2],
  death: [0.08, 3], big: [0.3, 2], item: [0.05, 3], ui: [0.03, 4], gold: [0.04, 3], amb: [0, 8], loop: [0, 3],
};
function auLoad() { try { const s = JSON.parse(localStorage.getItem(AU_KEY) || 'null'); if (s) for (const k in AU_DEFAULT) if (typeof s[k] === typeof AU_DEFAULT[k]) AU.set[k] = s[k]; } catch (e) { /* private mode */ } }
function auSave() { try { localStorage.setItem(AU_KEY, JSON.stringify(AU.set)); } catch (e) { /* ignore */ } auApply(); }
function auApply() {
  if (!AU.ctx) return; const s = AU.set, t = AU.ctx.currentTime;
  AU.bus.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.03);
  for (const k of ['sfx', 'amb', 'ui']) AU.bus[k].gain.setTargetAtTime(s[k], t, 0.03);
}
function auSetMuted(on) { AU.set.muted = on === undefined ? !AU.set.muted : !!on; auSave(); return AU.set.muted; }
// create the context on the first gesture (also callable from tests). Returns true if audio is available.
function auUnlock() {
  if (!AU.ctx) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    try { AU.ctx = new C(); } catch (e) { return false; }
    const c = AU.ctx, comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(c.destination);
    AU.bus.master = c.createGain(); AU.bus.master.connect(comp);
    for (const k of ['sfx', 'amb', 'ui']) { AU.bus[k] = c.createGain(); AU.bus[k].connect(AU.bus.master); }
    auApply(); auNoise();
  }
  if (AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => {});
  return true;
}
const auNow = () => performance.now() / 1000;
const auTeam = () => G.player ? G.player.team : RAD;
// spatial factor for a world point: [volume 0..1, pan -1..1]; 0 volume = out of earshot
function auSpatial(x, z) {
  const c = G.cam, R = 34 + c.dist * 0.45, d = Math.hypot(x - c.x, z - c.z);
  if (d >= R) return [0, 0];
  const v = 1 - d / R; return [0.15 + 0.85 * v * v, clamp((x - c.x) / 36, -1, 1)];
}
// o: { x, z } world point (omit = non-spatial), unit (fog-gated through canSee), vol, bus ('sfx'|'ui'|'amb'), p (recipe params)
function auPlay(name, o = {}) {
  const S = AU.stats, rec = SOUNDS[name]; if (!rec) return false;
  if (AU.set.muted) { S.muted++; return false; }
  const u = o.unit, x = u ? u.x : o.x, z = u ? u.z : o.z;
  if (u && !canSee(auTeam(), u)) { S.fog++; return false; }
  if (!u && x != null && !o.global && !(FOG.off || visAt(auTeam(), x, z))) { S.fog++; return false; }
  let vol = o.vol === undefined ? 1 : o.vol, pan = 0;
  if (x != null && !o.global) { const sp = auSpatial(x, z); if (sp[0] <= 0) { S.far++; return false; } vol *= sp[0]; pan = sp[1]; }
  const type = rec.type || 'spell', th = AU_TYPES[type] || [0.05, 4], now = auNow();
  if (now - (AU.last[type] || -9) < th[0]) { S.throttle++; return false; }
  AU.voices = AU.voices.filter(v => v.end > now);
  if (AU.voices.filter(v => v.type === type).length >= th[1]) { S.throttle++; return false; }
  if (AU.voices.length >= AU.MAX_VOICES && type !== 'ui') { S.pool++; return false; }
  AU.last[type] = now; S.played++; S.byName[name] = (S.byName[name] || 0) + 1;
  if (AU.logOn) { AU.log.push({ name, type, vol: +vol.toFixed(2), pan: +pan.toFixed(2), t: G.time }); if (AU.log.length > 500) AU.log.shift(); }
  const dur = rec.dur || 0.3; AU.voices.push({ type, end: now + dur });
  if (!AU.ctx || AU.ctx.state !== 'running') return true;
  try { return auVoice(rec, vol, pan, o.bus || rec.bus || 'sfx', o.p || {}); } catch (e) { return true; /* never let audio break the game */ }
}
// one voice: recipe → voice gain → stereo panner → bus; nodes are released by the browser after they stop
function auVoice(rec, vol, pan, bus, p) {
  const c = AU.ctx, g = c.createGain(); g.gain.value = vol * (rec.vol || 1);
  let out = g; if (pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = pan; g.connect(pn); out = pn; }
  out.connect(AU.bus[bus] || AU.bus.sfx);
  rec.play(c.currentTime + 0.005, g, p);
  setTimeout(() => { try { out.disconnect(); g.disconnect(); } catch (e) { /* already gone */ } }, ((rec.dur || 0.3) + 0.5) * 1000);
  return g;   // callers may fade it out early (TP channel cancelled)
}
const auFade = g => { if (g && g.gain && AU.ctx) g.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.04); };
const sfxUI = (name, p) => auPlay(name, { bus: 'ui', p });
auLoad();
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => auUnlock(), { capture: true, passive: true }));
