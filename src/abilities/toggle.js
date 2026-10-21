// abilities/toggle.js — toggle abilities (Voodoo Restoration). Def: toggle: true, mana (paid when switching on), drain (mana per second
// while on, lvVal), cd (starts when switched off), onToggle(ctx, on), onToggleTick(ctx, dt). Casting flips the state (executeCast →
// toggleAbility). Switches off by itself when mana runs out or the hero dies. State: h.toggles[id] = ctx. Event: toggle {unit, ability, on}.
const isToggled = (h, id) => !!(h && h.toggles && h.toggles[id]);
function toggleAbility(h, ab, on = !isToggled(h, ab.def.id)) {
  const id = ab.def.id, TG = h.toggles || (h.toggles = {});
  if (!!TG[id] === on) return false;
  if (on) { h.mana -= lvVal(ab.def, 'mana', ab.lvl) || 0; TG[id] = abilityCtx(h, ab); }
  else { delete TG[id]; ab.cd = ab.cdMax = lvVal(ab.def, 'cd', ab.lvl) || 0; }
  emit('toggle', { unit: h.id, ability: id, on });
  if (ab.def.onToggle) ab.def.onToggle(abilityCtx(h, ab), on);
  return true;
}
function tickToggles(dt) {
  for (const h of G.heroes) {
    if (!h.toggles) continue;
    for (const id in h.toggles) {
      const c = h.toggles[id], dr = (lvVal(c.def, 'drain', c.ab.lvl) || 0) * dt;
      if (h.dead || h.mana < dr) { toggleAbility(h, c.ab, false); continue; }
      h.mana -= dr; if (c.def.onToggleTick) c.def.onToggleTick(c, dt);
    }
  }
}
