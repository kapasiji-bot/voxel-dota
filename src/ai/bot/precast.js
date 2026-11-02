// ai/bot/precast.js — B13 item-aware prep: pop BKB before channel ults (Black Hole / Death Ward / Freezing Field), and
// skip unit-target spells into an enemy with Lotus Echo Shell / spell reflect. Used by combos.js, ults.js, abilities.js.
function needsBkbChannel(ab) {
  if (!ab || !ab.def) return false;
  const d = ab.def, ai = d.ai || {};
  return !!(d.channel && (ai.commit || ai.channelWard || d.ult));
}
function botPopBkb(h, b, why) {
  const bk = itemSlot(h, 'bkb');
  if (bk < 0 || h.items[bk].cd > 0 || hasState(h, 'magicImmune')) return false;
  if (useItem(h, bk, null)) return false;
  (b.itemUses = b.itemUses || {}).bkb = (b.itemUses.bkb || 0) + 1;
  emit('botBkb', { unit: h.id, why: why || 'channel' });
  return true;
}
// true if we should avoid casting a unit-target spell/item at this foe (Lotus shell / reflect / Linken will waste it)
function foeHasSpellBlock(f) {
  return !!(f && !f.dead && (hasState(f, 'reflect') || getMod(f, 'lotus') || (typeof linkenSlot === 'function' && linkenSlot(f) >= 0 && !(f.items[linkenSlot(f)].cd > 0))));
}
