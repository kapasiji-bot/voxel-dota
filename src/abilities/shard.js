// abilities/shard.js — Aghanim's Shard upgrades (mirror of abilities/scepter.js). Ability field `shard: {desc, values?, ...}`.
// Called from refreshHero after applyScepter so shard merges onto the current (possibly scepter-upgraded) def.
const hasShard = h => !!h.items && h.items.some(it => it && it.def.shard);
function applyShard(h) {
  const on = hasShard(h);
  // always rebuild from the non-upgraded base so toggling shard/scepter stays consistent
  for (const ab of h.abilities) {
    const base = ab.base || ab.def; ab.base = base;
    let d = base;
    if (hasScepter(h) && base.scepter) d = scepterDef(base);
    if (on && base.shard) {
      const S = base.shard, m = Object.assign({}, d);
      for (const k in S) if (k !== 'desc' && k !== 'values') m[k] = S[k];
      m.values = Object.assign({}, d.values || {}, S.values || {}); m.shardOn = !!on; m.scepterOn = !!d.scepterOn;
      d = m;
    }
    ab.def = d;
  }
  if (on !== !!h.shard) { h.shard = on; emit('shard', { unit: h.id, on }); }
}
