// entities/inventory.js — 6 item slots: give / buy / sell / use. Item instance = {id, def, cd, charges}.
// def.stack: charges stack in one slot (wards, TP); def.consumable: using it spends a charge (slot freed at 0).
// def.heroCd: the cooldown belongs to the hero (h.icd[id]) so it survives the slot emptying and re-buying (TP scroll).
// Shop rule (entities/shop.js): purchases land in the inventory only inside the own base, otherwise in the stash.
function newItem(h, id, n = 1) {
  const D = ITEM_DEFS[id];
  return { id, def: D, cd: D.heroCd && h && h.icd ? Math.max(0, (h.icd[id] || 0) - G.time) : 0, charges: D.stack ? n : 0 };
}
const freeSlotFor = (h, id) => (ITEM_DEFS[id].stack && h.items.some(i => i && i.id === id)) || h.items.indexOf(null) >= 0;
function giveItem(h, id, n = 1) {
  const D = ITEM_DEFS[id]; if (!D) return '未知物品';
  if (D.stack) { const it = h.items.find(i => i && i.id === id); if (it) { it.charges += n; return null; } }
  const slot = h.items.indexOf(null); if (slot < 0) return '物品栏已满';
  h.items[slot] = newItem(h, id, n); refreshHero(h);
  return null;
}
const countItem = (h, id) => h.items.reduce((a, i) => a + (i && i.id === id ? (i.def.stack ? i.charges : 1) : 0), 0) + (h.stash || []).reduce((a, s) => a + (s.id === id ? s.n : 0), 0);
// recipes: def.parts are consumed from the inventory / stash when buying; the price drops by the owned parts' cost
function recipeParts(h, D) {
  const used = [], taken = new Set(), st = (h && h.stash) || [];
  for (const p of D.parts || []) {
    const slot = h.items.findIndex((it, i) => it && it.id === p && !taken.has('i' + i));
    if (slot >= 0) { taken.add('i' + slot); used.push({ id: p, slot }); continue; }
    const si = st.findIndex((s, i) => s.id === p && !taken.has('s' + i)); if (si >= 0) { taken.add('s' + si); used.push({ id: p, stash: si }); }
  }
  return used;
}
const itemPrice = (h, id) => { const D = ITEM_DEFS[id]; return D.cost - recipeParts(h, D).reduce((a, p) => a + ITEM_DEFS[p.id].cost, 0); };
function buyItem(id, h = G.player) {
  const D = ITEM_DEFS[id]; if (!h || !D) return '未知物品';
  const me = h === G.player, fail = e => { if (me) err(e); return e; };
  const parts = recipeParts(h, D), price = D.cost - parts.reduce((a, p) => a + ITEM_DEFS[p.id].cost, 0);
  if (h.gold < price) return fail('金钱不足');
  const W = buyWhere(h, D, parts); if (W.err) return fail(W.err);   // entities/shopsites.js: secret / side shops, courier bag
  if (parts.length && !W.direct && !W.bag && (h.stash || []).length >= STASH_MAX && !parts.some(p => p.stash !== undefined)) return fail('储藏处已满');
  if (parts.length) {   // consume the components (stash entries back to front so indices stay valid)
    for (const p of parts.filter(p => p.slot !== undefined)) h.items[p.slot] = null;
    for (const p of parts.filter(p => p.stash !== undefined).sort((a, b) => b.stash - a.stash)) { const s = h.stash[p.stash]; if (--s.n <= 0) h.stash.splice(p.stash, 1); }
    refreshHero(h); h.gold -= price; h.gold += D.cost;   // the generic path below charges the full cost
    emit('combine', { unit: h.id, item: id, parts: parts.map(p => p.id) });
  }
  if (D.stock && stockOf(h.team, id) <= 0) return fail('库存不足（等待补货）');
  if (D.maxCharges && countItem(h, id) >= D.maxCharges) return fail(`${D.name}最多携带 ${D.maxCharges} 个`);
  const toInv = W.direct && freeSlotFor(h, id), toBag = !toInv && W.bag;
  if (toBag) courierBagAdd(W.bag, id); else if (!toInv) { const e = stashAdd(h, id); if (e) return fail(e); } else giveItem(h, id);
  h.gold -= D.cost; if (D.stock) G.stock[h.team][id].n--;
  emit('buy', { unit: h.id, item: id, cost: price, stash: !toInv && !toBag, courier: !!toBag, site: W.site || '' });
  if (me) msg(toInv ? `购买了 ${D.name}` : toBag ? `购买了 ${D.name}（已放入信使背包，按 F3 运送）` : `购买了 ${D.name}（已存入储藏处，回到基地或用信使运送）`, '#ffd54f');
  return null;
}
// item passives with def.tick (Assault Cuirass aura): every 0.5 s, once per item id per hero
let _itemTickT = 0;
function tickItemPassives(dt) {
  if ((_itemTickT -= dt) > 0) return; _itemTickT = 0.5;
  for (const h of G.heroes) if (!h.dead) fireItemHook(h, 'tick', 0.5);
}
function sellItem(slot, h = G.player) {
  const it = h.items[slot]; if (!it) return '空物品栏';
  if (it.def.noSell) { if (h === G.player) err('该物品无法出售'); return '无法出售'; }
  if (!atShop(h)) { if (h === G.player) err('只能在基地商店出售物品'); return '不在商店'; }
  const v = Math.floor(it.def.cost / 2 * (it.def.stack ? it.charges : 1)); h.gold += v; h.items[slot] = null; refreshHero(h);
  emit('sell', { unit: h.id, item: it.id, gold: v });
  if (h === G.player) msg(`出售 ${it.def.name}，获得 ${v} 金`, '#ffd54f');
  return null;
}
// unit-target item validity. A.targetTeam: 'enemy' (default) | 'ally' (self included) | 'any'. Enemies: visible, not invulnerable,
// not magic immune (unless A.pierce), no buildings / wards.
function itemTargetError(h, A, t) {
  if (!t || t.dead || !t.id) return '需要目标单位';
  if (t.isBuilding || t.isWard || isInvuln(t)) return '无效目标';
  const tt = A.targetTeam || 'enemy';
  if (tt === 'enemy' && t.team === h.team) return '只能对敌方单位使用';
  if (tt === 'ally' && t.team !== h.team) return '只能对友方单位使用';
  if (t.team !== h.team && (!canSee(h.team, t) || (!A.pierce && hasState(t, 'magicImmune')))) return '无效目标';
  if (A.heroOnly && !t.isHero) return '只能对英雄使用';
  return null;
}
// target: {x,z} for point items, a unit for unit items, ignored otherwise. Returns null or error string.
// Point items with a range (wards) walk into range first (order 'useItem'); def.active.clamp items (blink) clamp instead.
function useItem(h, slot, target) {
  const it = h.items[slot]; if (!it) return '空物品栏';
  const D = it.def, A = D.active;
  if (!A) return '该物品没有主动效果';
  if (h.dead) return '英雄已阵亡';
  if (it.cd > 0) return '物品冷却中';
  if (hasState(h, 'stunned') || h.hexed) return '无法使用物品';   // B7: stunned / hexed units cannot use items (DOTA)
  if (A.mana && h.mana < A.mana) return '魔法不足';
  if (A.target === 'unit') {   // B7: unit-target items (Dagon, Force Staff, Eul's, Glimmer, Scythe): walk into range, then use
    const e = itemTargetError(h, A, target); if (e) return e;
    if (dst(h, target) > (A.range || 0) + h.radius + target.radius + 0.3) {
      if (h.order.type !== 'useItem' || h.order.slot !== slot || h.order.target !== target) issueOrder(h, { type: 'useItem', slot, target, range: A.range });
      return null;
    }
  }
  if (A.target === 'point' && !target && !A.optional) return '需要目标点';
  if (A.target === 'point' && A.range && !A.clamp && Math.hypot(target.x - h.x, target.z - h.z) > A.range + 0.3) {
    if (h.order.type !== 'useItem' || h.order.slot !== slot) issueOrder(h, { type: 'useItem', slot, x: target.x, z: target.z, range: A.range });
    return null;
  }
  if (!D.keepInvis) breakInvis(h, 'cast');
  if (A.onUse({ caster: h, item: it, def: D }, target) === false) return '无法使用';
  if (A.mana) h.mana -= A.mana;
  emit('itemUse', { unit: h.id, item: D.id, slot, target: target && target.id ? target.id : 0 });
  if (D.heroCd) (h.icd = h.icd || {})[D.id] = G.time + (A.cd || 0);
  if (D.consumable) { if (D.stack && it.charges > 1) { it.charges--; it.cd = A.cd || 0; } else { h.items[slot] = null; refreshHero(h); } } else it.cd = A.cd || 0;
  return null;
}
