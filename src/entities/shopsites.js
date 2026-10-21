// entities/shopsites.js — B8 shop locations (map/jungle.js JUNGLE.shops) and where an item may be bought:
//   • 基地商店 (own base, entities/shop.js atShop): everything except secret-shop items; straight into the inventory.
//   • 边路商店 side shops (one per side lane): basic components + consumables (sideSells) straight into the inventory.
//   • 神秘商店 secret shops (one per jungle): ONLY they sell def.shop === 'secret' items (Ultimate Orb, Reaver, Point Booster,
//     Vitality Booster, Talisman). Buying one needs the hero OR its courier (entities/courier.js → courier bag) at a secret
//     shop; a recipe whose missing parts include a secret item needs the same.
//   • anywhere else: non-secret items go to the stash as before.
const SIDE_EXTRA = { boots: 1, tp: 1, salve: 1, dust: 1, ward_obs: 1, ward_sentry: 1 };
const sideSells = D => !D.shop && !D.noShop && (D.basic || !!SIDE_EXTRA[D.id]);
const nearShopSite = (u, type) => !!u && !u.dead && JUNGLE.shops.find(s => s.type === type && Math.hypot(u.x - s.x, u.z - s.z) <= SHOP_R) || null;
const containsSecret = id => ITEM_DEFS[id].shop === 'secret' || (ITEM_DEFS[id].parts || []).some(containsSecret);
// does buying D (given the recipe parts the buyer already owns) require secret-shop access?
function needsSecret(D, parts) {
  if (D.shop === 'secret') return true;
  const have = parts.map(p => p.id);
  for (const p of D.parts || []) { const i = have.indexOf(p); if (i >= 0) { have.splice(i, 1); continue; } if (containsSecret(p)) return true; }
  return false;
}
// → { direct } (inventory if a slot is free, else stash) | { bag: courier } | { err }
function buyWhere(h, D, parts) {
  if (needsSecret(D, parts)) {
    if (nearShopSite(h, 'secret')) return { direct: true, site: 'secret' };
    const c = h.courier; if (c && !c.dead && nearShopSite(c, 'secret') && c.bag.length < COURIER_BAG) return { bag: c, site: 'secret' };
    return { err: '只能在神秘商店购买（英雄或信使需在神秘商店旁）' };
  }
  if (atShop(h)) return { direct: true, site: 'base' };
  if (sideSells(D) && nearShopSite(h, 'side')) return { direct: true, site: 'side' };
  return { direct: false };
}
// shop UI / tooltip: where can this item be bought?
const shopLocLabel = D => D.shop === 'secret' ? '神秘商店（丛林深处，紫色）' : sideSells(D) ? '基地商店 / 边路商店' : '基地商店';
function shopSiteHere(h) { return atShop(h) ? 'base' : nearShopSite(h, 'secret') ? 'secret' : nearShopSite(h, 'side') ? 'side' : (h.courier && !h.courier.dead && nearShopSite(h.courier, 'secret')) ? 'courier' : null; }
