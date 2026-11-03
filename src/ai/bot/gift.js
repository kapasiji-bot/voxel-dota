// ai/bot/gift.js — supports gift Scepter / Shard to the team's carry when gold bought one.
function giftCarry(team) {
  return G.heroes.filter(h => h.team === team && !h.dead && h.isHero && !h.isIllusion)
    .sort((a, c) => (botRole(c) === 'carry') - (botRole(a) === 'carry') || c.level - a.level || (c.gold || 0) - (a.gold || 0))[0] || null;
}
function botGift(h, b) {
  if (!h || h.dead || botRole(h) !== 'support') return false;
  if (h.channel || h.casting) return false;
  const carry = giftCarry(h.team); if (!carry || carry === h) return false;
  for (const id of ['scepter', 'shard']) {
    const slot = h.items.findIndex(it => it && it.id === id);
    if (slot < 0) continue;
    if (countItem(carry, id) > 0) continue;
    if (carry.items.indexOf(null) < 0) continue;
    const far = dst(h, carry) > GIFT_RANGE + 6;
    const e = (far && h.courier && !h.courier.dead) ? giftViaCourier(h, slot, carry) : giftItem(h, slot, carry);
    if (!e) { b.gifts = (b.gifts || 0) + 1; emit('botGift', { from: h.id, to: carry.id, item: id }); return true; }
  }
  return false;
}
