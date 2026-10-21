// abilities/aura.js — passive auras. Ability def field: aura: {radius, mod (modifier def), props(ctx, unit) → props, heroesOnly?}
// Every 0.25 s each living hero re-applies the aura modifier (0.6 s duration) to allied units in radius; leaving the radius expires it.
let auraT = 0;
function updateAuras(dt) {
  auraT -= dt; if (auraT > 0) return; auraT = 0.25;
  for (const h of units) {
    if (!h.isHero || h.dead || !h.abilities) continue;
    for (const ab of h.abilities) {
      const a = ab.def.aura; if (!a || ab.lvl === 0) continue;
      const ctx = abilityCtx(h, ab);
      for (const u of units) {
        if (u.dead || u.team !== h.team || u.isBuilding || u.isWard || (a.heroesOnly && !u.isHero) || (a.filter && !a.filter(ctx, u)) || dst(u, h) > a.radius) continue;
        addModifier(u, a.mod, h, { dur: 0.6, props: a.props(ctx, u) });
      }
    }
  }
}
