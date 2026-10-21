// abilities/cast.js — generic ability pipeline used by every hero:
//   orderCast(h, slot, target) → hero walks into range → beginCasting (cast point, cancellable) → executeCast
//   → spends mana, starts cooldown, emits 'cast', calls def.onCast(ctx, target), fires passive onAbilityCast hooks.
// Ability def fields: see heroes/_template.js.  Per-level values: def.mana/cd/range/castPoint or def.values[key] (number or array by level).
function lvVal(def, key, lvl) {
  let v = def[key] !== undefined ? def[key] : (def.values ? def.values[key] : undefined);
  if (Array.isArray(v)) v = v[clamp(lvl, 1, v.length) - 1];
  return v;
}
function abilityCtx(h, ab) { return { caster: h, ab, def: ab.def, lvl: ab.lvl, v: k => lvVal(ab.def, k, ab.lvl) }; }
// call a hook (onAttacked, onAbilityCast, ...) on every learned ability of a hero
function fireHeroHook(h, hook, ...args) { if (!h.abilities) return; for (const ab of h.abilities) if (ab.lvl > 0 && ab.def[hook] && !(h.isIllusion && ab.def.noIllusion)) ab.def[hook](abilityCtx(h, ab), ...args); }
// item passives: def.onAttackLand(ctx{caster, item, def}, target, dealt) — once per item id (unique)
function fireItemHook(h, hook, ...args) { if (h.isIllusion) return; const seen = {}; for (const it of h.items) if (it && it.def[hook] && !seen[it.id]) { seen[it.id] = 1; it.def[hook]({ caster: h, item: it, def: it.def }, ...args); } }
function canCast(h, ab) {
  if (h.dead) return '英雄已阵亡';
  if (h.isIllusion) return '幻象无法施放技能';
  if (ab.lvl === 0) return '技能尚未学习';
  if (ab.def.passive) return '这是被动技能';
  const re = isRecast(h, ab);   // e.g. Puck's Ethereal Jaunt: free re-cast while the orb flies
  if (!re && ab.cd > 0) return '技能冷却中';
  if (!re && h.mana < (lvVal(ab.def, 'mana', ab.lvl) || 0)) return '魔法不足';
  if (hasState(h, 'stunned')) return '眩晕中，无法施法';
  if (hasState(h, 'silenced')) return '沉默中，无法施法';
  return null;
}
// after every successful spell cast: hero passives (Aftershock, Static Field) + the caster's modifiers' onOwnerCast(u, m, ab)
// (Arcane Curse extends, Last Word triggers)
function afterCast(h, ab) { fireHeroHook(h, 'onAbilityCast', ab); if (h.mods.length) for (const m of h.mods.slice()) if (m.def.onOwnerCast && !h.dead) m.def.onOwnerCast(h, m, ab); }
const isRecast = (h, ab) => !!(ab.def.recast && ab.lvl > 0 && ab.def.recast(h, ab));
function validSpellTarget(h, ab, u) {
  const d = ab.def;
  if (!u || u.dead || isInvuln(u) || u.kind === 'fountain') return false;
  const tt = d.targetTeam || 'enemy';
  if (tt === 'enemy' && u.team === h.team) return false;
  if (tt === 'ally' && u.team !== h.team) return false;
  if (u.isBuilding && !d.allowBuildings) return false;
  if (u.team !== h.team && !canSee(h.team, u)) return false;   // fog / invisibility
  return true;
}
const castRange = (h, ab) => (ab.def.target === 'none' || ab.def.target === 'direction') ? Infinity : (lvVal(ab.def, 'range', ab.lvl) || 0);
// returns null on success or a Chinese error string
function orderCast(h, slot, target) {
  const ab = h.abilities[slot]; if (!ab) return '没有该技能';
  const e = canCast(h, ab); if (e) return e;
  const d = ab.def;
  if (isRecast(h, ab)) { issueOrder(h, { type: 'cast', slot, recast: true }); return null; }
  if (d.check) { const ce = d.check(h, ab, target); if (ce) return ce; }   // ability-specific precondition (e.g. Nature's Call needs trees)
  if (d.orb) { if (!validSpellTarget(h, ab, target) || !validAttackTarget(h, target)) return '无效目标'; issueOrder(h, { type: 'attack', target, orb: slot }); return null; }   // abilities/orb.js
  if (d.target === 'unit') { if (!validSpellTarget(h, ab, target)) return target && target.isBuilding ? '无法对建筑施放' : '无效目标'; issueOrder(h, { type: 'cast', slot, target }); }
  else if (d.target === 'point' || d.target === 'direction') { if (!target) return '需要目标点'; issueOrder(h, { type: 'cast', slot, x: target.x, z: target.z }); }
  else issueOrder(h, { type: 'cast', slot });
  return null;
}
function stepCastOrder(h, o, dt) {
  const ab = h.abilities[o.slot], range = castRange(h, ab);
  if (o.target) {
    if (!validSpellTarget(h, ab, o.target)) { h.order = { type: 'idle' }; return; }
    if (inRange(h, o.target, range)) beginCasting(h, ab, o.target); else heroNav(h, o.target.x, o.target.z, dt, 0);
  } else if (o.x !== undefined) {
    if (Math.hypot(o.x - h.x, o.z - h.z) <= range || ab.def.clampRange) beginCasting(h, ab, { x: o.x, z: o.z }); else heroNav(h, o.x, o.z, dt, range - 0.3);
  } else beginCasting(h, ab, null);
}
function beginCasting(h, ab, target) {
  h.order = { type: 'idle' };
  const e = canCast(h, ab); if (e) { if (h === G.player) err(e); return; }
  h.path = null; cancelAttack(h, 'cast');
  const pt = lvVal(ab.def, 'castPoint', ab.lvl); const cp = isRecast(h, ab) ? 0 : pt === undefined ? 0.2 : pt;
  h.casting = { ab, target, t: cp, total: Math.max(cp, 0.3) }; h.anim.cast = 1e-4;
  if (target) h.facing = Math.atan2(target.x - h.x, target.z - h.z);
  if (cp <= 0) finishCasting(h);
}
function updateCasting(h, dt) {
  const c = h.casting; if (!c) return;
  if (c.target && c.target.id && !validSpellTarget(h, c.ab, c.target)) return cancelCasting(h);
  if (c.target) h.facing = Math.atan2(c.target.x - h.x, c.target.z - h.z);
  c.t -= dt; if (c.t <= 0) finishCasting(h);
}
function cancelCasting(u) { if (u.casting) { emit('castCancel', { unit: u.id, ability: u.casting.ab.def.id }); u.casting = null; } }
function finishCasting(h) { const c = h.casting; h.casting = null; executeCast(h, c.ab, c.target); }
function executeCast(h, ab, target) {
  const e = canCast(h, ab); if (e) { if (h === G.player) err(e); return false; }
  if (isRecast(h, ab)) { emit('cast', { unit: h.id, ability: ab.def.id + ':recast', slot: h.abilities.indexOf(ab), target: 0 }); ab.def.onRecast(abilityCtx(h, ab)); return true; }
  if (ab.def.toggle) { emit('cast', { unit: h.id, ability: ab.def.id, slot: h.abilities.indexOf(ab), target: 0 }); toggleAbility(h, ab); afterCast(h, ab); return true; }   // abilities/toggle.js
  h.mana -= lvVal(ab.def, 'mana', ab.lvl) || 0;
  ab.cd = ab.cdMax = lvVal(ab.def, 'cd', ab.lvl) || 0;
  emit('cast', { unit: h.id, ability: ab.def.id, slot: h.abilities.indexOf(ab), target: target && target.id ? target.id : 0, x: target ? target.x : null, z: target ? target.z : null });
  if (!ab.def.keepInvis) breakInvis(h, 'cast', target);
  // spell reflect (Counterspell): an enemy unit-target spell is blocked and bounced back at its caster
  if (target && target.id && target.team !== h.team && hasState(target, 'reflect')) {
    emit('spellReflect', { unit: target.id, caster: h.id, ability: ab.def.id });
    AB.ringP(target.x, target.z, 1.4, 18, ['#69f0ae', '#b9f6ca'], 0.4, 0.25, 1.5); AB.float(target, '反射！', '#69f0ae', 18, 1);
    if (ab.def.onCast && !ab.def.channel && validSpellTarget(target, ab, h)) ab.def.onCast(Object.assign(abilityCtx(h, ab), { caster: target, reflected: true }), h);
    afterCast(h, ab);
    return true;
  }
  if (ab.def.onCast) ab.def.onCast(abilityCtx(h, ab), target);
  if (ab.def.channel) startChannel(h, ab, target);
  afterCast(h, ab);
  return true;
}
