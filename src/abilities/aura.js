// abilities/aura.js — passive auras. Ability def field: aura: {radius, mod (modifier def), props(ctx, unit) → props,
// data?(ctx, unit) → data, heroesOnly?, enemies? (apply to foes instead of allies), filter?(ctx, unit)}.
// Every 0.25 s each living hero re-applies the aura modifier (0.6 s duration) to units in radius; leaving the radius expires it.
let auraT = 0;
function updateAuras(dt) {
  auraT -= dt; if (auraT > 0) return; auraT = 0.25;
  for (const h of units) {
    if (!h.isHero || h.dead || !h.abilities) continue;
    for (const ab of h.abilities) {
      const a = ab.def.aura; if (!a || ab.lvl === 0) continue;
      const ctx = abilityCtx(h, ab);
      for (const u of units) {
        if (u.dead || u.isBuilding || u.isWard || (a.heroesOnly && !u.isHero) || dst(u, h) > a.radius) continue;
        if (a.enemies ? u.team === h.team : u.team !== h.team) continue;
        if (a.filter && !a.filter(ctx, u)) continue;
        addModifier(u, a.mod, h, { dur: 0.6, props: a.props ? a.props(ctx, u) : undefined, data: a.data ? a.data(ctx, u) : undefined });
      }
    }
  }
}
