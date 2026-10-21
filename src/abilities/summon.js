// abilities/summon.js — AB helpers for B4: summons, illusions, trees, shapeshift forms, global targeting.
//   AB.summon(owner, type, x, z, o) → unit (entities/summons.js)      AB.illusion(hero, o) → unit (entities/illusions.js)
//   AB.owned(h, type?) → owner's living summons/illusions             AB.sproutRing(x, z, r, dur) → cells created (map/trees.js)
//   AB.treesNear(x, z, r), AB.destroyTree(k, by)                      AB.formMod({id, name, key, def, scale, props, ...}) → modifier def
//   AB.allEnemyHeroes(caster) → visible living enemy heroes (global spells)
Object.assign(AB, {
  summon: (owner, type, x, z, o) => spawnSummon(owner, type, x, z, o),
  illusion: (h, o) => makeIllusion(h, o),
  owned: (h, type) => ownedUnits(h, u => !type || u.type === type),
  treesNear: (x, z, r) => treesNear(x, z, r),
  destroyTree: (k, by) => destroyTree(k, by),
  // ring of temporary trees around (x, z): one per free cell on the circle
  sproutRing(x, z, r, dur) {
    const out = [], n = Math.max(8, Math.round(r * 2 * Math.PI / TILE));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = sproutTree(x + Math.cos(a) * r, z + Math.sin(a) * r, dur); if (k >= 0 && !out.includes(k)) out.push(k); }
    return out;
  },
  allEnemyHeroes: c => G.heroes.filter(e => e.team !== c.team && !e.dead && canSee(c.team, e) && !isInvuln(e)),
  // modifier def that swaps the model while active (shapeshift). o: {id, name, color, key, def() → model def, scale, props, states, height, onApply, onRemove}
  formMod(o) {
    return { id: o.id, name: o.name, color: o.color, props: o.props, states: o.states, fx: o.fx,
      onApply(u, m) { u.formDef = o.def; u.formScale = o.scale; if (o.height) { m.data.h0 = u.height; u.height = o.height; } setForm(u, o.key, o.def(), o.scale);
        burst(u.x, 1.5, u.z, 30, o.colors || ['#8d6e63', '#ffffff', '#bcaaa4'], 6, 0.7, 0.35, 3); if (o.onApply) o.onApply(u, m); },
      onRemove(u, m) { clearForm(u); u.formDef = null; if (m.data.h0) u.height = m.data.h0; if (!u.dead) burst(u.x, 1.5, u.z, 20, o.colors || ['#8d6e63', '#ffffff'], 5, 0.6, 0.3, 3); if (o.onRemove) o.onRemove(u, m); } };
  },
});
