// vision/invis.js — invisibility, true sight and reveal.
// A modifier def with `invis: true` makes its unit invisible to enemies once its fade (m.data.fade, s) has run out.
//   breakOn: 'remove' (default: attacking or casting removes it; def.onBreak(u, m, why, target) fires first)
//          | 'pause' (permanent invisibility: m.data.brk = def.refade(u, m) seconds visible, then fades back — Riki)
//   keepOnCast: true → casting does not break it.  Abilities with keepInvis: true never break invisibility.
// Detection: a modifier with `trueSight: true` (dust) lets the source's team see the unit through invisibility (normal vision
// still needed); `reveal: true` (Track) shows it to the source's team anywhere, through fog and invisibility.
// 'hidden' state (Phase Shift, Tricks of the Trade): nobody else can see/target the unit; pair with 'invulnerable'.
// Ability passiveMod: a learned ability whose def has `passiveMod` keeps that modifier on its (living) hero.
function isInvisible(u) {
  if (!u.mods.length) return false;
  for (const m of u.mods) if (m.def.invis && !(m.data.fade > 0) && !(m.data.brk > 0)) return true;
  return false;
}
const invisMod = u => u.mods.find(m => m.def.invis) || null;
// why: 'attack' | 'cast'
function breakInvis(u, why, target) {
  if (!u.mods.length) return;
  for (const m of u.mods.slice()) {
    const d = m.def; if (!d.invis || (why === 'cast' && d.keepOnCast)) continue;
    const wasInvis = !(m.data.fade > 0) && !(m.data.brk > 0);
    if (d.breakOn === 'pause') { m.data.brk = d.refade ? d.refade(u, m) : 2; if (wasInvis) emit('invisBreak', { unit: u.id, mod: d.id, why }); continue; }
    if (d.onBreak) d.onBreak(u, m, why, target);
    emit('invisBreak', { unit: u.id, mod: d.id, why }); removeModifier(u, m);
  }
}
function tickInvis(u, dt) {
  if (u.isHero && u.abilities) for (const ab of u.abilities) {
    const pm = ab.def.passiveMod; if (!pm || ab.lvl === 0 || u.dead) continue;
    const m = getMod(u, pm.id); if (!m) addModifier(u, pm, u, { data: { fade: pm.fadeIn !== undefined ? pm.fadeIn : 1, ab } }); else m.data.ab = ab;
  }
  if (!u.mods.length) return;
  for (const m of u.mods) if (m.def.invis) {
    const was = isInvisible(u);
    if (m.data.fade > 0) m.data.fade -= dt;
    if (m.data.brk > 0) m.data.brk -= dt;
    if (!was && isInvisible(u)) emit('invisStart', { unit: u.id, mod: m.def.id });
  }
}
Object.assign(MODS, {
  // dust: true sight on the unit + slow (enemy invisible heroes cannot hide while dusted)
  dusted: { id: 'dusted', tag: '显影', color: '#fff59d', debuff: true, trueSight: true, props: { msPct: -0.2 },
    fx(u) { if (Math.random() < 0.3) spawnP(u.x + rnd(-0.6, 0.6), rnd(0.3, 2.5), u.z + rnd(-0.6, 0.6), 0, 0.3, 0, 0.6, 0.15, '#fff59d'); } },
  // brief reveal (e.g. Zeus's ult on hit heroes)
  revealed: { id: 'revealed', debuff: false, reveal: true },
});
