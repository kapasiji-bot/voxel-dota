// audio/spells.js — per-ability-type spell sounds + hero-specific ultimate stingers.
// SPELL_SFX maps ability / item ids to a sound family; unknown ids fall back to 'magic'. Ults also play 'ult' (a short chord
// whose root note is hashed from the hero id and whose timbre follows the family) on top of the family sound.
const SPELL_SFX = {
  amblink: 'blink', counter: 'magic', void: 'dark', call: 'roar', hunger: 'fire', helix: 'phys', cull: 'phys',
  shuriken: 'phys', shadowwalk: 'invis', track: 'magic', nova: 'ice', frostbite: 'ice', field: 'ice',
  malefice: 'dark', eidolons: 'summon', black_hole: 'dark', fissure: 'earth', totem: 'earth', echo: 'earth',
  bear: 'summon', link: 'magic', roar: 'roar', trueform: 'buff', frost_blast: 'ice', frost_shield: 'ice', gaze: 'magic', chain_frost: 'ice',
  slave: 'fire', lsa: 'fire', laguna: 'fire', spike: 'earth', hex: 'magic', drain: 'magic', finger: 'dark',
  wolves: 'summon', howl: 'roar', shapeshift: 'buff', mirror: 'summon', ensnare: 'magic', riptide: 'phys', song: 'magic',
  sprout: 'earth', np_tp: 'blink', ncall: 'summon', wrath: 'lightning', dagger: 'phys', phantom_strike: 'blink', blur: 'invis',
  orb: 'magic', rift: 'stun', phase: 'blink', coil: 'magic', shadow_strike: 'dark', qop_blink: 'blink', scream: 'dark', sonic_wave: 'wind',
  smoke: 'magic', cloak: 'invis', tricks: 'phys', arcane_curse: 'magic', glaives: 'magic', last_word: 'magic', global_silence: 'magic',
  hammer: 'stun', warcry: 'buff', gods: 'buff', cask: 'magic', voodoo: 'heal', maledict: 'dark', death_ward: 'summon',
  arc: 'lightning', bolt: 'lightning', static: 'lightning',
  // items
  blink: 'blink', bkb: 'buff', salve: 'heal', mekansm: 'heal', cheese: 'heal', dagon: 'lightning', euls: 'wind', force: 'wind',
  glimmer: 'invis', scythe: 'magic', pipe: 'buff', dust: 'magic', phase_boots: 'buff',
};
const spellFamily = id => SPELL_SFX[id] || SPELL_SFX[String(id).replace(/[0-9]+$/, '')] || 'magic';
defSound('sp_fire', 'spell', 0.7, (t, o) => { noiz(t, o, { dur: 0.6, vol: 0.4, filt: 'lowpass', f: 400, f2: 2600, a: 0.08 }); for (let i = 0; i < 5; i++) noiz(t, o, { at: 0.1 + i * 0.09, dur: 0.04, vol: 0.12, filt: 'highpass', f: 3000 }); tone(t, o, { f: 110, f2: 70, dur: 0.5, vol: 0.2 }); });
defSound('sp_ice', 'spell', 0.8, (t, o) => { chord(t, o, [1568, 2093, 2637], { dur: 0.6, vol: 0.05, arp: 0.04 }); noiz(t, o, { dur: 0.5, vol: 0.15, filt: 'highpass', f: 4000, f2: 7000 }); tone(t, o, { type: 'triangle', f: 330, f2: 220, dur: 0.3, vol: 0.12 }); });
defSound('sp_lightning', 'spell', 0.6, (t, o) => { noiz(t, o, { dur: 0.12, vol: 0.55, filt: 'highpass', f: 1500 }); for (let i = 0; i < 4; i++) tone(t, o, { type: 'sawtooth', f: 1800 - i * 300, f2: 200, dur: 0.06, vol: 0.06, at: i * 0.05 }); noiz(t, o, { at: 0.1, dur: 0.45, vol: 0.3, filt: 'lowpass', f: 800, f2: 90, brown: true }); });
defSound('sp_earth', 'spell', 0.9, (t, o) => { noiz(t, o, { dur: 0.8, vol: 0.6, filt: 'lowpass', f: 500, f2: 60, brown: true, a: 0.02 }); tone(t, o, { f: 75, f2: 35, dur: 0.6, vol: 0.4 }); noiz(t, o, { at: 0.05, dur: 0.15, vol: 0.2, filt: 'bandpass', f: 600, q: 2 }); });
defSound('sp_magic', 'spell', 0.6, (t, o, p) => { const r = p.r || 1; chord(t, o, [660, 880, 1320, 1760].map(f => f * r), { dur: 0.35, vol: 0.06, arp: 0.045 }); noiz(t, o, { dur: 0.3, vol: 0.07, filt: 'bandpass', f: 3000, f2: 6000, q: 3 }); });
defSound('sp_dark', 'spell', 0.9, (t, o) => { for (const d of [-12, 0, 9]) tone(t, o, { type: 'sawtooth', f: 110, f2: 55, dur: 0.8, vol: 0.06, a: 0.1, det: d * 10 }); noiz(t, o, { dur: 0.6, vol: 0.12, filt: 'lowpass', f: 900, f2: 200, a: 0.1 }); });
defSound('sp_stun', 'spell', 0.7, (t, o) => { noiz(t, o, { dur: 0.1, vol: 0.5, filt: 'lowpass', f: 2500, f2: 300 }); tone(t, o, { type: 'square', f: 140, f2: 60, dur: 0.18, vol: 0.15 }); for (let i = 0; i < 3; i++) tone(t, o, { f: 2400 + i * 300, dur: 0.12, vol: 0.03, at: 0.15 + i * 0.12 }); });
defSound('sp_heal', 'spell', 0.8, (t, o) => chord(t, o, [392, 494, 587, 784], { type: 'sine', dur: 0.55, vol: 0.08, arp: 0.08, a: 0.05 }));
defSound('sp_blink', 'spell', 0.35, (t, o) => { tone(t, o, { f: 400, f2: 2400, dur: 0.18, vol: 0.12 }); noiz(t, o, { dur: 0.2, vol: 0.18, filt: 'bandpass', f: 1000, f2: 5000, q: 2 }); });
defSound('sp_summon', 'spell', 0.9, (t, o) => { tone(t, o, { type: 'triangle', f: 110, f2: 440, dur: 0.6, vol: 0.15, a: 0.1 }); chord(t, o, [440, 554, 659], { dur: 0.3, vol: 0.06, arp: 0.08, at: 0.35 }); });
defSound('sp_wind', 'spell', 0.7, (t, o) => noiz(t, o, { dur: 0.6, vol: 0.35, filt: 'bandpass', f: 300, f2: 2500, q: 4, a: 0.12 }));
defSound('sp_roar', 'spell', 0.8, (t, o) => { for (const f of [160, 240]) tone(t, o, { type: 'sawtooth', f, f2: f * 0.7, dur: 0.6, vol: 0.09, a: 0.06 }); noiz(t, o, { dur: 0.5, vol: 0.2, filt: 'bandpass', f: 700, f2: 300, q: 1.5 }); });
defSound('sp_buff', 'spell', 0.7, (t, o) => { chord(t, o, [220, 277, 330, 440], { type: 'sawtooth', dur: 0.5, vol: 0.04, arp: 0.05, glide: 1.5 }); });
defSound('sp_invis', 'spell', 0.6, (t, o) => { chord(t, o, [2093, 1568, 1175], { dur: 0.4, vol: 0.04, arp: 0.08 }); noiz(t, o, { dur: 0.5, vol: 0.08, filt: 'highpass', f: 6000, f2: 2000 }); });
defSound('sp_phys', 'spell', 0.4, (t, o) => { noiz(t, o, { dur: 0.12, vol: 0.3, filt: 'bandpass', f: 600, f2: 3000 }); noiz(t, o, { at: 0.1, dur: 0.12, vol: 0.4, filt: 'lowpass', f: 1500, f2: 200 }); tone(t, o, { at: 0.1, type: 'triangle', f: 120, f2: 50, dur: 0.15, vol: 0.3 }); });
// ultimate stinger: three-note chord, root from the hero id, timbre from the family
const ULT_WAVE = { fire: 'sawtooth', dark: 'sawtooth', lightning: 'square', earth: 'triangle', ice: 'sine', magic: 'triangle', summon: 'triangle', buff: 'sawtooth' };
defSound('ult', 'ult', 1.4, (t, o, p) => {
  const root = semis(110, Math.floor((p.h || 0) * 12)), minor = /dark|fire|earth/.test(p.fam);
  chord(t, o, [root, semis(root, minor ? 3 : 4), semis(root, 7), root * 2], { type: ULT_WAVE[p.fam] || 'triangle', dur: 1.2, vol: 0.06, arp: 0.06, a: 0.04 });
  tone(t, o, { f: root / 2, dur: 1.1, vol: 0.25, a: 0.02 });
});
// a cast heard by the player's team (fog-gated at the caster): family sound (+ ult stinger)
function auSpell(h, id, ult) {
  const fam = spellFamily(id);
  if (!auPlay('sp_' + fam, { unit: h, p: { r: 0.8 + strHash(id) * 0.5 } })) return false;
  if (ult) auPlay('ult', { unit: h, vol: 0.9, p: { h: strHash(h.def ? h.def.id : id), fam } });
  return true;
}
