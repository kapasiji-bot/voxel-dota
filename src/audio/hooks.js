// audio/hooks.js — maps game events (core/events.js) to sounds. Every world sound goes through auPlay's fog gate
// (the player's team must see the unit / point) and camera-distance volume; UI sounds (own buys, level ups, gold) are
// non-spatial. Lane-creep swings are skipped entirely (too many); creep impacts / deaths use their own throttled types.
const auU = id => id ? unitById(id) : null;
const auMine = u => u && G.player && (u === G.player || ownerOf(u) === G.player);
function initAudioHooks() {
  if (AU.hooked) return; AU.hooked = true;
  Events.on('attackStart', e => { const u = auU(e.unit); if (u && !u.proj && (u.isHero || u.isNeutral || isOwned(u))) auPlay('swing', { unit: u, p: { k: u.isHero ? 1 : 0.6 } }); });
  Events.on('attackImpact', e => {
    if (e.ranged) return; const u = auU(e.unit); if (!u) return;
    if (u.isHero || u.kind === 'roshan' || u.isRoshan) auPlay(u.def && u.def.stats.primary === 'agi' ? 'hitMetal' : 'hitMelee', { unit: u, p: { k: u.isRoshan ? 1.4 : 1, pitch: u.isRoshan ? 0.6 : 1 } });
    else auPlay('creepHit', { unit: u, vol: u.isNeutral || isOwned(u) ? 0.8 : 0.5 });
  });
  Events.on('projectileLaunch', e => {
    const u = auU(e.unit); if (!u) return;
    if (u.kind === 'tower' || u.kind === 'fountain') auPlay('towerShot', { unit: u });
    else auPlay('launch', { unit: u, vol: u.isHero ? 1 : 0.45, p: { magic: !!(u.def && u.def.stats.primary === 'int') } });
  });
  Events.on('projectileHit', e => { const u = auU(e.unit), t = auU(e.target); if (u && t && u.isHero) auPlay('projHit', { unit: t, p: { magic: !!(u.def && u.def.stats.primary === 'int') } }); });
  Events.on('crit', e => { const t = auU(e.target); if (t) auPlay('crit', { unit: t }); });
  Events.on('cast', e => { const h = auU(e.unit); if (!h) return; const ab = e.slot >= 0 && h.abilities ? h.abilities[e.slot] : null; auSpell(h, String(e.ability).split(':')[0], !!(ab && ab.def.ult && !e.passive)); });
  Events.on('itemUse', e => { const h = auU(e.unit); if (!h || /^(tp|ward_)/.test(e.item)) return; auSpell(h, e.item, false); });
  Events.on('death', e => { if (e.kind === 'hero') return; const u = auU(e.unit); if (u && !u.isBuilding) auPlay('creepDie', { unit: u, vol: isCreep(u) ? 0.6 : 1 }); });
  Events.on('heroKill', e => { const v = auU(e.victim); if (v) auPlay('heroDie', { x: v.x, z: v.z, global: auMine(v) }); });
  Events.on('buildingDestroyed', e => { const u = auU(e.unit); if (u) auPlay('collapse', { x: u.x, z: u.z, global: true, vol: 0.5 + 0.5 * auSpatial(u.x, u.z)[0] }); });
  Events.on('levelUp', e => { const h = auU(e.unit); if (h === G.player) sfxUI('levelUp'); else if (h && h.team === auTeam()) auPlay('levelUp', { unit: h, vol: 0.35 }); });
  Events.on('buy', e => { if (auU(e.unit) === G.player) sfxUI('buy'); });
  Events.on('sell', e => { if (auU(e.unit) === G.player) sfxUI('sell'); });
  Events.on('pickup', e => { const h = auU(e.unit); if (h) auPlay('pickup', { unit: h, global: h === G.player }); });
  Events.on('reincarnate', e => { const h = auU(e.unit); if (h) auPlay('sp_heal', { unit: h }); });
  Events.on('roshanSlam', () => { const R = rosh().unit; if (R) { auPlay('slam', { unit: R }); auPlay('roar', { unit: R, vol: 0.6 }); } });
  Events.on('roshanBash', e => { const t = auU(e.target); if (t) auPlay('sp_stun', { unit: t, vol: 0.7 }); });
  Events.on('roshanKill', () => auPlay('roar', { global: true, vol: 0.8 }));
  Events.on('tpStart', e => { const h = auU(e.unit); if (!h) return; const g = auPlay('tpLoop', { unit: h }); if (g && g !== true) (AU.tp || (AU.tp = {}))[h.id] = g; });
  Events.on('tpCancel', e => auTpStop(e.unit));
  Events.on('tpArrive', e => { auTpStop(e.unit); const h = auU(e.unit); if (h) auPlay('sp_blink', { unit: h }); });
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('button, .card, .slot, .shopItem, .cbtn'); if (b) sfxUI('click'); }, true);
}
function auTpStop(id) { const g = AU.tp && AU.tp[id]; if (g) { auFade(g); delete AU.tp[id]; } }
// TP channel: a 3 s pulsing hum (faded out early on cancel / arrival)
defSound('tpLoop', 'loop', 3.2, (t, o) => {
  const c = AU.ctx, os = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
  os.type = 'triangle'; os.frequency.setValueAtTime(220, t); os.frequency.linearRampToValueAtTime(440, t + 3);
  lfo.frequency.value = 7; lg.gain.value = 0.06; lfo.connect(lg); lg.connect(g.gain);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.3); g.gain.setValueAtTime(0.09, t + 2.9); g.gain.linearRampToValueAtTime(0.0001, t + 3.2);
  os.connect(g); g.connect(o); os.start(t); lfo.start(t); os.stop(t + 3.25); lfo.stop(t + 3.25);
  noiz(t, o, { dur: 3, vol: 0.03, filt: 'bandpass', f: 1500, f2: 4000, q: 6, a: 0.5 });
}, { vol: 1 });
