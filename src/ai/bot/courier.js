// ai/bot/courier.js — B8 bot courier use (called every think from brain.js, never takes the bot's turn):
//   • stash has items and the bot is away from base → order 'deliver' (courier idle / home);
//   • the shop logic hit a secret-shop item (b.wantSecret, set by botBuy in ai/bot/shop.js) → send the courier to the own
//     secret shop; once something is in its bag (bought there via entities/shopsites.js) and nothing more is wanted, deliver;
//     give up after 60 s waiting.
function botCourier(h, b) {
  const c = h.courier; if (!c || c.dead) return;
  const o = c.corder.type, idle = o === 'idle' || o === 'home';
  if (b.wantSecret) {
    if (!idle && o !== 'secret') return;
    if (o !== 'secret') { courierOrder(h, 'secret'); b.secretT = G.time; return; }
    if (G.time - (b.secretT || G.time) > 60) { b.wantSecret = null; courierOrder(h, c.bag.length ? 'deliver' : 'home'); }
    return;
  }
  if (o === 'secret') { courierOrder(h, c.bag.length || (h.stash || []).length ? 'deliver' : 'home'); return; }
  if (idle && (c.bag.length || ((h.stash || []).length && !atShop(h))) && !h.dead) courierOrder(h, 'deliver');
}
