// abilities/scepter.js — Aghanim's Scepter upgrades. A hero ability may carry `scepter: {desc, values?, <top-level overrides>}`
// (usually only the ult). While the hero holds an item with def.scepter (items/aghanim.js), ab.def is swapped for a merged def:
// top-level keys (cd, mana, range, channel, flags like refreshOnKill) replace the base ones, `values` are merged key by key.
// Everything reads ab.def, so numbers change everywhere (casting, tooltips, bot heuristics). ab.base keeps the original def.
const _sdefs = new Map();
function scepterDef(base) {
  if (_sdefs.has(base)) return _sdefs.get(base);
  const S = base.scepter, d = Object.assign({}, base);
  for (const k in S) if (k !== 'desc' && k !== 'values') d[k] = S[k];
  d.values = Object.assign({}, base.values || {}, S.values || {}); d.scepterOn = true;
  _sdefs.set(base, d); return d;
}
const hasScepter = h => !!h.items && h.items.some(it => it && it.def.scepter);
// called from refreshHero (inventory changes, level ups): swap ability defs; keeps level / cooldown / toggle state
function applyScepter(h) {
  const on = hasScepter(h);
  if (on === !!h.scepter) return;
  h.scepter = on;
  for (const ab of h.abilities) {
    const base = ab.base || ab.def; if (!base.scepter) continue;
    ab.base = base; ab.def = on ? scepterDef(base) : base;
  }
  emit('scepter', { unit: h.id, on });
}
