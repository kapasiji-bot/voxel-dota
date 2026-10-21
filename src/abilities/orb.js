// abilities/orb.js — autocast "orb" abilities (Silencer's Glaives of Wisdom). Ability def: orb: true, target: 'unit',
//   onOrbHit(ctx, target, dealt) after the attack lands, orbColor (projectile colour). Mana and cooldown are paid at the attack
//   impact (the launch, for ranged heroes); a missed attack still spends them. Orbs never hit buildings or wards.
//  • Manual cast (key / click on an enemy) → an attack order whose NEXT attack uses the orb (o.orb = slot), then plain attacks.
//  • Autocast: right-click the skill icon (ui/hud.js) or toggleAutocast(h, slot) → every attack uses it while mana / cooldown allow.
//    Bots turn autocast on as soon as it is learned and only spend it on heroes.
// Orb attacks are not spell casts (no onAbilityCast / Arcane Curse extension). Events: autocast{unit,ability,on}, orbFire, orbHit{dmg}.
function toggleAutocast(h, slot, on) {
  const ab = h && h.abilities && h.abilities[slot]; if (!ab || !ab.def.orb || ab.lvl === 0) return false;
  ab.auto = on === undefined ? !ab.auto : !!on;
  emit('autocast', { unit: h.id, ability: ab.def.id, on: ab.auto });
  return true;
}
function orbReady(h, ab, t) {
  return ab.lvl > 0 && ab.cd <= 0 && (h.mana || 0) >= (lvVal(ab.def, 'mana', ab.lvl) || 0) && !hasState(h, 'silenced')
    && !!t && !t.isBuilding && !t.isWard && t.team !== h.team;
}
// which orb (if any) this attack uses
function pickOrb(u, t) {
  if (!u.abilities || u.isIllusion) return null;
  const o = u.order;
  if (o && o.type === 'attack' && o.orb !== undefined && o.target === t) { const ab = u.abilities[o.orb]; delete o.orb; if (ab && orbReady(u, ab, t)) return ab; }
  for (const ab of u.abilities) if (ab.def.orb && ab.auto && orbReady(u, ab, t) && (!u.bot || t.isHero)) return ab;
  return null;
}
function payOrb(u, ab, t) {
  u.mana -= lvVal(ab.def, 'mana', ab.lvl) || 0; ab.cd = ab.cdMax = lvVal(ab.def, 'cd', ab.lvl) || 0;
  emit('orbFire', { unit: u.id, ability: ab.def.id, target: t.id });
}
function orbLand(src, ab, t, dealt) {
  if (!ab.def.onOrbHit || t.dead) return;
  const d = ab.def.onOrbHit(abilityCtx(src, ab), t, dealt) || 0;
  emit('orbHit', { unit: src.id, ability: ab.def.id, target: t.id, dmg: +d.toFixed(1) });
}
// bots: autocast every learned orb
function botAutocast(h) { for (let i = 0; i < h.abilities.length; i++) { const ab = h.abilities[i]; if (ab.def.orb && ab.lvl > 0 && ab.auto === undefined) toggleAutocast(h, i, true); } }
