// abilities/modifiers.js — buff/debuff system. Every unit has u.mods = [instances].
// Modifier def fields (all optional except id):
//   id, name (HUD label; omit = hidden), color, dur (sec, Infinity ok), debuff (blocked by magic immunity from enemies),
//   props: {armor, dmg, as, ms, msPct, str, agi, int, hpRegen, manaRegen, dmgTakenPct}  (numbers; per-instance override via opts.props)
//   stackProps (multiply props by stacks), maxStacks, perSource (separate instance per caster),
//   states: ['stunned'|'taunted'|'magicImmune'], tick (sec), onTick(u,m), onApply(u,m), onRemove(u,m), fx(u,m,dt)
// Instance: {def, src, t, stacks, props, data, tickT}
function addModifier(u, def, src, o = {}) {
  if (!u || u.dead) return null;
  if (def.debuff && src && src.team !== u.team && (hasState(u, 'magicImmune') || hasState(u, 'invulnerable'))) return null;
  let m = u.mods.find(x => x.def.id === def.id && (!def.perSource || x.src === src));
  const dur = o.dur !== undefined ? o.dur : (def.dur !== undefined ? def.dur : Infinity);
  if (m) {
    m.t = Math.max(m.t, dur); if (def.maxStacks) m.stacks = Math.min(def.maxStacks, m.stacks + 1);
    if (o.props) m.props = o.props; if (o.data) Object.assign(m.data, o.data);
    if (def.onRefresh) def.onRefresh(u, m);
    return m;
  }
  m = { def, src, t: dur, stacks: o.stacks || 1, props: o.props || def.props || null, data: o.data || {}, tickT: def.tick || 0 };
  u.mods.push(m);
  if (def.onApply) def.onApply(u, m);
  emit('modifierAdd', { unit: u.id, mod: def.id, src: src ? src.id : 0, dur });
  return m;
}
function removeModifier(u, m) {
  const i = u.mods.indexOf(m); if (i < 0) return;
  u.mods.splice(i, 1);
  if (m.def.onRemove) m.def.onRemove(u, m);
  emit('modifierRemove', { unit: u.id, mod: m.def.id });
}
function removeModById(u, id) { const m = getMod(u, id); if (m) removeModifier(u, m); }
function getMod(u, id) { for (const m of u.mods) if (m.def.id === id) return m; return null; }
function hasState(u, s) { for (const m of u.mods) if (m.def.states && m.def.states.includes(s)) return true; return false; }
function purgeDebuffs(u) { for (const m of u.mods.slice()) if (m.def.debuff) removeModifier(u, m); }
function updateModifiers(u, dt) {
  for (const m of u.mods.slice()) {
    if (u.dead) return;
    if (m.def.tick) { m.tickT -= dt; while (m.tickT <= 1e-6 && m.t > -1e-6) { m.tickT += m.def.tick; m.def.onTick(u, m); if (u.dead) return; } }
    if (m.def.fx) m.def.fx(u, m, dt);
    m.t -= dt;
    if (m.t <= 0) removeModifier(u, m);
  }
}
// sum one prop over modifiers
function modProps(u, out) {
  for (const m of u.mods) { const p = m.props; if (!p) continue; const k = m.def.stackProps ? m.stacks : 1; for (const key in p) out[key] = (out[key] || 0) + p[key] * k; }
  return out;
}

// ---------- common modifiers shared by abilities ----------
const MODS = {
  stun: { id: 'stun', debuff: true, states: ['stunned'], onApply(u) { cancelAttack(u, 'stun'); cancelCasting(u); },
    fx(u) { if (Math.random() < 0.2) spawnP(u.x + rnd(-0.4, 0.4), u.height + 0.3, u.z + rnd(-0.4, 0.4), rnd(-1, 1), 0.5, rnd(-1, 1), 0.4, 0.15, '#ffee58'); } },
  taunt: { id: 'taunt', debuff: true, states: ['taunted'], onApply(u, m) { cancelAttack(u, 'taunt'); u.target = m.src; } },
  slow: { id: 'slow', debuff: true, perSource: true },
};
// convenience
function stunUnit(u, src, dur) { const m = getMod(u, 'stun'); if (m) { m.t = Math.max(m.t, dur); return m; } return addModifier(u, MODS.stun, src, { dur }); }
