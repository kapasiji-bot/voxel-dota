// audio/sounds.js — combat / world / UI recipes (spell recipes: audio/spells.js). p = per-call params from hooks.js.
// --- attacks ---
defSound('swing', 'swing', 0.16, (t, o, p) => noiz(t, o, { dur: 0.15, vol: 0.18 * (p.k || 1), filt: 'bandpass', f: 500, f2: 2200, q: 0.8, a: 0.04 }));
defSound('hitMelee', 'hit', 0.2, (t, o, p) => { noiz(t, o, { dur: 0.09, vol: 0.4 * (p.k || 1), filt: 'lowpass', f: 1800, f2: 300 }); tone(t, o, { type: 'triangle', f: 140 * (p.pitch || 1), f2: 60, dur: 0.12, vol: 0.35 * (p.k || 1) }); });
defSound('hitMetal', 'hit', 0.25, (t, o) => { noiz(t, o, { dur: 0.06, vol: 0.3, filt: 'highpass', f: 2500 }); tone(t, o, { type: 'square', f: 780, f2: 520, dur: 0.18, vol: 0.06 }); tone(t, o, { f: 1170, dur: 0.2, vol: 0.05 }); });
defSound('creepHit', 'creep', 0.12, (t, o) => noiz(t, o, { dur: 0.07, vol: 0.18, filt: 'lowpass', f: 1200, f2: 250 }));
defSound('launch', 'proj', 0.18, (t, o, p) => p.magic
  ? tone(t, o, { type: 'sine', f: 900, f2: 380, dur: 0.14, vol: 0.12 })
  : (noiz(t, o, { dur: 0.08, vol: 0.14, filt: 'highpass', f: 1800 }), tone(t, o, { type: 'triangle', f: 330, f2: 180, dur: 0.1, vol: 0.12 })));
defSound('projHit', 'proj', 0.16, (t, o, p) => { noiz(t, o, { dur: 0.08, vol: 0.2, filt: 'bandpass', f: p.magic ? 2400 : 900, q: 1.5 }); if (p.magic) tone(t, o, { f: 1300, f2: 600, dur: 0.1, vol: 0.06 }); });
defSound('towerShot', 'tower', 0.45, (t, o) => { tone(t, o, { type: 'sawtooth', f: 220, f2: 70, dur: 0.35, vol: 0.12 }); noiz(t, o, { dur: 0.3, vol: 0.18, filt: 'lowpass', f: 900, f2: 120, brown: true }); });
defSound('crit', 'hit', 0.35, (t, o) => { noiz(t, o, { dur: 0.12, vol: 0.45, filt: 'lowpass', f: 3000, f2: 400 }); tone(t, o, { type: 'square', f: 300, f2: 90, dur: 0.25, vol: 0.12 }); tone(t, o, { f: 1600, f2: 900, dur: 0.15, vol: 0.06 }); });
// --- deaths / structures ---
defSound('creepDie', 'death', 0.35, (t, o) => { tone(t, o, { type: 'sawtooth', f: 260, f2: 90, dur: 0.28, vol: 0.06 }); noiz(t, o, { dur: 0.2, vol: 0.12, filt: 'lowpass', f: 700, f2: 150 }); });
defSound('heroDie', 'death', 0.9, (t, o) => { tone(t, o, { type: 'sawtooth', f: 180, f2: 55, dur: 0.8, vol: 0.12 }); noiz(t, o, { dur: 0.5, vol: 0.2, filt: 'lowpass', f: 600, f2: 80, brown: true }); });
defSound('collapse', 'big', 2.2, (t, o) => { noiz(t, o, { dur: 2.0, vol: 0.7, filt: 'lowpass', f: 500, f2: 40, brown: true, a: 0.05 }); for (let i = 0; i < 6; i++) noiz(t, o, { at: 0.1 + i * 0.22, dur: 0.18, vol: 0.25, filt: 'bandpass', f: 300 + i * 90, q: 2 }); tone(t, o, { f: 70, f2: 30, dur: 1.6, vol: 0.35 }); }, { vol: 1.2 });
defSound('roar', 'big', 1.6, (t, o) => { for (const [f, d] of [[95, 0], [142, 7], [190, -9]]) tone(t, o, { type: 'sawtooth', f, f2: f * 0.6, dur: 1.4, vol: 0.12, a: 0.15, det: d }); noiz(t, o, { dur: 1.3, vol: 0.3, filt: 'bandpass', f: 380, f2: 180, q: 1.2, a: 0.12 }); });
defSound('slam', 'big', 0.9, (t, o) => { tone(t, o, { f: 60, f2: 28, dur: 0.8, vol: 0.5 }); noiz(t, o, { dur: 0.6, vol: 0.4, filt: 'lowpass', f: 400, f2: 60, brown: true }); });
// --- progression / economy ---
defSound('levelUp', 'ui', 0.9, (t, o) => chord(t, o, [523, 659, 784, 1047], { type: 'triangle', dur: 0.5, vol: 0.12, arp: 0.07 }));
defSound('coin', 'gold', 0.3, (t, o) => { tone(t, o, { type: 'square', f: 1568, dur: 0.07, vol: 0.05 }); tone(t, o, { type: 'square', f: 2093, dur: 0.18, vol: 0.05, at: 0.06 }); });
defSound('buy', 'item', 0.35, (t, o) => { tone(t, o, { type: 'triangle', f: 880, dur: 0.08, vol: 0.12 }); tone(t, o, { type: 'triangle', f: 1320, dur: 0.2, vol: 0.12, at: 0.07 }); noiz(t, o, { dur: 0.1, vol: 0.06, filt: 'highpass', f: 5000, at: 0.05 }); });
defSound('sell', 'item', 0.3, (t, o) => { tone(t, o, { type: 'triangle', f: 1320, dur: 0.08, vol: 0.1 }); tone(t, o, { type: 'triangle', f: 880, dur: 0.18, vol: 0.1, at: 0.07 }); });
defSound('denied', 'ui', 0.2, (t, o) => tone(t, o, { type: 'square', f: 180, dur: 0.16, vol: 0.06 }));
defSound('click', 'ui', 0.06, (t, o) => tone(t, o, { type: 'square', f: 2200, f2: 1600, dur: 0.035, vol: 0.04 }));
defSound('hover', 'ui', 0.05, (t, o) => tone(t, o, { f: 3000, dur: 0.02, vol: 0.015 }));
defSound('pickup', 'item', 0.6, (t, o) => chord(t, o, [660, 990, 1320], { type: 'sine', dur: 0.4, vol: 0.12, arp: 0.05 }));
// --- announcer chimes (text shown by ui/announce.js) ---
defSound('chimeFirst', 'big', 1.4, (t, o) => { chord(t, o, [392, 494, 587, 784], { type: 'sawtooth', dur: 1.1, vol: 0.05, arp: 0.09 }); tone(t, o, { f: 98, dur: 1.2, vol: 0.3 }); }, { bus: 'ui' });
defSound('chimeStreak', 'big', 1.0, (t, o, p) => chord(t, o, [0, 4, 7, 12].map(n => semis(440 * Math.pow(2, (p.n || 0) / 12), n)), { type: 'triangle', dur: 0.7, vol: 0.09, arp: 0.06 }), { bus: 'ui' });
defSound('chimeBad', 'big', 1.0, (t, o) => chord(t, o, [330, 311, 262], { type: 'sawtooth', dur: 0.7, vol: 0.06, arp: 0.12 }), { bus: 'ui' });
defSound('chimeGood', 'big', 1.0, (t, o) => chord(t, o, [523, 659, 784], { type: 'square', dur: 0.6, vol: 0.05, arp: 0.1 }), { bus: 'ui' });
// --- ambience pieces (scheduled by audio/ambience.js) ---
defSound('bird', 'amb', 0.5, (t, o, p) => { const f = p.f || 2800; for (let i = 0; i < 3; i++) tone(t, o, { f: f * (1 + i * 0.05), f2: f * 1.4, dur: 0.07, vol: 0.03, at: i * 0.11 }); }, { bus: 'amb' });
defSound('cricket', 'amb', 0.6, (t, o) => { for (let i = 0; i < 6; i++) tone(t, o, { f: 4400, dur: 0.03, vol: 0.02, at: i * 0.06 }); }, { bus: 'amb' });
defSound('owl', 'amb', 1.0, (t, o) => { tone(t, o, { f: 420, f2: 380, dur: 0.35, vol: 0.05, a: 0.06 }); tone(t, o, { f: 400, f2: 350, dur: 0.5, vol: 0.05, a: 0.06, at: 0.45 }); }, { bus: 'amb' });
defSound('heart', 'ui', 0.5, (t, o) => { tone(t, o, { f: 70, f2: 45, dur: 0.14, vol: 0.4 }); tone(t, o, { f: 62, f2: 40, dur: 0.16, vol: 0.3, at: 0.22 }); });
