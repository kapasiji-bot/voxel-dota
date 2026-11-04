// entities/neutralitems.js — B29: camp-clear neutral item drops + dedicated h.neutral slot helpers.
// Last living camp unit's death may spawn a tiered token at the corpse (chance by camp kind, tier by game time).
// Heroes carry at most one neutral (replacing drops the old one on the ground). Slot index 6 in useItem/HUD.
const NEUTRAL_DROP_CHANCE = { small: 0.18, medium: 0.26, large: 0.34, ancient: 0.48 };
const NEUTRAL_POOL = {
  1: ['n_hobbit', 'n_armor'],
  2: ['n_swift', 'n_prism'],
  3: ['n_vambrace', 'n_mirror'],
};
const NEUTRAL_TIER_AT = t => (t < 7 * 60 ? 0 : t < 17 * 60 ? 1 : t < 27 * 60 ? 2 : 3);
const isNeutralItem = id => !!(ITEM_DEFS[id] && ITEM_DEFS[id].neutral);
const invItem = (h, slot) => (slot === 6 || slot === 'n' ? h.neutral : h.items[slot]) || null;
function setInvItem(h, slot, it) {
  if (slot === 6 || slot === 'n') h.neutral = it;
  else h.items[slot] = it;
}
function giveNeutral(h, id) {
  if (!h || !h.isHero || h.isIllusion) return '无法携带中立物品';
  const D = ITEM_DEFS[id]; if (!D || !D.neutral) return '不是中立物品';
  if (h.neutral) spawnDrop(h.neutral.id, h.x + rnd(-0.6, 0.6), h.z + rnd(-0.6, 0.6));
  h.neutral = newItem(h, id);
  refreshHero(h);
  emit('neutralPickup', { unit: h.id, item: id, tier: D.tier || 0 });
  return null;
}
function dropNeutral(h = G.player) {
  if (!h || !h.neutral) return '没有中立物品';
  const id = h.neutral.id;
  spawnDrop(id, h.x, h.z); h.neutral = null; refreshHero(h);
  emit('neutralDrop', { unit: h.id, item: id });
  if (h === G.player) msg(`丢弃了 ${ITEM_DEFS[id].name}`, '#bcaaa4');
  return null;
}
function pickNeutralId(tier, prefer) {
  const pool = NEUTRAL_POOL[tier]; if (!pool || !pool.length) return null;
  if (prefer && pool.includes(prefer)) return prefer;
  return pool[(Math.random() * pool.length) | 0];
}
function tryNeutralDrop(camp, killer, x, z) {
  if (!camp) return null;
  const size = camp.size || 'medium';
  const chance = NEUTRAL_DROP_CHANCE[size] || 0.2;
  const tier = NEUTRAL_TIER_AT(G.time);
  if (!tier) return null;
  if (Math.random() > chance) return null;
  const id = pickNeutralId(tier);
  if (!id) return null;
  const d = spawnDrop(id, x + rnd(-0.4, 0.4), z + rnd(-0.4, 0.4));
  emit('neutralItemDrop', { item: id, tier, camp: camp.id, kind: camp.kind, size, killer: killer ? killer.id : 0, x, z });
  if (killer && killer === G.player) msg(`野怪掉落了中立物品：${ITEM_DEFS[id].name}`, '#ffcc80');
  return d;
}
// force a drop for tests / debug (ignores chance; uses current tier unless forced)
function forceNeutralDrop(x, z, id) {
  const tier = id ? (ITEM_DEFS[id] && ITEM_DEFS[id].tier) || NEUTRAL_TIER_AT(G.time) : NEUTRAL_TIER_AT(Math.max(G.time, 7 * 60));
  const pick = id || pickNeutralId(tier || 1);
  if (!pick) return null;
  return spawnDrop(pick, x, z);
}
