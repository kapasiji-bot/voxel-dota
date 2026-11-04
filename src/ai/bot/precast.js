// ai/bot/precast.js — B13/B29 item-aware prep: pop BKB before channel ults (Black Hole / Death Ward / Freezing Field),
// skip unit-target into Lotus/Linken, Blink→Eul/Force escape + initiate setup, Force-save allies under towers.
// Used by combos.js, ults.js, abilities.js, items.js, teamexec.js.
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
// B29: Force-Staff an ally out from under an enemy tower (face them toward fountain first)
function botForceSave(h, b) {
  const fi = itemSlot(h, 'force');
  if (fi < 0 || h.items[fi].cd > 0 || h.mana < (h.items[fi].def.active.mana || 0)) return false;
  for (const a of G.heroes) {
    if (a.team !== h.team || a.dead || a === h || dst(a, h) > 11) continue;
    if (a.hp / a.maxHp > 0.42) continue;
    if (!enemyTowerAt(h.team, a.x, a.z, 0) && !(a.bot && a.bot.retreat && G.heroes.some(e => e.team !== h.team && !e.dead && dst(e, a) < 7))) continue;
    const sp = heroSpawn(h.team);
    a.facing = Math.atan2(sp.x - a.x, sp.z - a.z);
    if (botItemUse(h, b, fi, a)) { emit('botForceSave', { unit: h.id, target: a.id }); return true; }
  }
  return false;
}
// B29: after a fight blink, cyclone the target or Force self toward them (Blink→setup chain)
function botBlinkSetup(h, b, target) {
  if (b.blinkInit == null || G.time - b.blinkInit > 1.6 || !target || target.dead) return false;
  if (foeHasSpellBlock(target) || hasState(target, 'magicImmune')) { b.blinkInit = null; return false; }
  const ei = itemReady(h, id => id === 'euls');
  if (ei >= 0 && dst(h, target) < 12) {
    b.blinkInit = null;
    emit('botBlinkEul', { unit: h.id, target: target.id });
    return botItemUse(h, b, ei, target);
  }
  const fi = itemReady(h, id => id === 'force');
  if (fi >= 0 && dst(h, target) < 11) {
    h.facing = Math.atan2(target.x - h.x, target.z - h.z);
    b.blinkInit = null;
    emit('botBlinkForce', { unit: h.id, target: target.id });
    return botItemUse(h, b, fi, h);
  }
  return false;
}
// B29 high-ground structure?
const isHighGround = t => !!(t && (t.tier >= 3 || t.kind === 'barracks' || t.kind === 'ancient'));
