// abilities/cc.js — B4 crowd control: sleep (stunned until damaged: wakeOnDamage from combat/damage.js; m.data.noWake keeps it
// through damage, e.g. Song of the Siren which also makes the sleepers invulnerable) and fear (feared: silenced + disarmed,
// runs away from the source every step instead of acting: core/loop.js → fearStep). Helpers AB.sleep, AB.fear.
function zzzFx(u) { if (Math.random() < 0.08) addFloat(u, 'Z', '#b3e5fc', 12 + Math.random() * 6, 1.2); }
Object.assign(MODS, {
  sleep: { id: 'sleep', tag: '睡眠', color: '#90caf9', debuff: true, states: ['stunned', 'sleeping'], wake: true,
    onApply(u) { cancelAttack(u, 'stun'); cancelCasting(u); interruptChannel(u, 'stun'); }, fx: zzzFx },
  fear: { id: 'fear', tag: '恐惧', color: '#ffab91', debuff: true, states: ['feared', 'silenced', 'disarmed'],
    onApply(u) { cancelAttack(u, 'fear'); cancelCasting(u); interruptChannel(u, 'fear'); if (u.path) u.path = null; },
    fx(u) { if (Math.random() < 0.15) spawnP(u.x, u.height + 0.4, u.z, rnd(-1, 1), 1, rnd(-1, 1), 0.5, 0.18, '#ff7043'); } },
});
// damage wakes sleepers (not the sleep's own damage tick, not noWake sleeps)
function wakeOnDamage(u, src, o) {
  for (const m of u.mods.slice()) if (m.def.wake && !m.data.noWake && !(o && o.ability && o.ability === m.data.ability)) { removeModifier(u, m); emit('wake', { unit: u.id, src: src ? src.id : 0 }); }
}
function fearStep(u, dt) {
  const m = u.mods.find(x => x.def.states && x.def.states.includes('feared')), s = m && m.src;
  const dx = s ? u.x - s.x : Math.sin(u.facing), dz = s ? u.z - s.z : Math.cos(u.facing), d = Math.hypot(dx, dz) || 1;
  if (u.atk) cancelAttack(u, 'fear');
  moveStep(u, u.x + dx / d * 4, u.z + dz / d * 4, dt, 0);
}
Object.assign(AB, {
  sleep: (u, src, dur, o = {}) => (u.dead || hasState(u, 'magicImmune')) ? null : addModifier(u, o.def || MODS.sleep, src, { dur, data: Object.assign({}, o) }),
  fear: (u, src, dur) => addModifier(u, MODS.fear, src, { dur }),
});
