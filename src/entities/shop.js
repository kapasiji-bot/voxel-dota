// entities/shop.js — DOTA shop rule + stash + team stock.
// Buying is allowed anywhere, but items only go straight into the inventory inside the own base (atShop). Bought elsewhere
// (or with a full inventory) they wait in the stash (h.stash, max 6 entries) and move into free slots when the hero is in base.
// Selling only works in base. Team stock (wards): ITEM_DEFS[id].stock = {max, every (s per restock), start} → G.stock[team][id].
const STASH_MAX = 6;
const atShop = h => !!h && !h.dead && inBase(h.x, h.z) === h.team;
function stockOf(team, id) {
  const D = ITEM_DEFS[id]; if (!D.stock) return Infinity;
  const S = G.stock || (G.stock = [{}, {}]);
  if (!S[team][id]) S[team][id] = { n: D.stock.start !== undefined ? D.stock.start : D.stock.max, t: D.stock.every };
  return S[team][id].n;
}
function tickShop(dt) {
  if (G.stock) for (let team = 0; team < 2; team++) for (const id in G.stock[team]) {
    const s = G.stock[team][id], D = ITEM_DEFS[id];
    if (s.n < D.stock.max && (s.t -= dt) <= 0) { s.n++; s.t = D.stock.every; }
  }
  for (const h of G.heroes) if (h.stash && h.stash.length && atShop(h)) deliverStash(h);
}
function stashAdd(h, id) {
  const st = h.stash || (h.stash = []), D = ITEM_DEFS[id];
  const ex = D.stack && st.find(s => s.id === id); if (ex) { ex.n++; return null; }
  if (st.length >= STASH_MAX) return '储藏处已满';
  st.push({ id, n: 1 }); return null;
}
function deliverStash(h) {
  for (let i = 0; i < h.stash.length;) {
    const s = h.stash[i];
    if (freeSlotFor(h, s.id)) { giveItem(h, s.id, s.n); h.stash.splice(i, 1); emit('stashDeliver', { unit: h.id, item: s.id, n: s.n }); if (h === G.player) msg(`从储藏处取出 ${ITEM_DEFS[s.id].name}`, '#ffd54f'); }
    else i++;
  }
}
