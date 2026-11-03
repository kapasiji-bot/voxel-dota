// ai/bot/courier.js — B8 bot courier use (called every think from brain.js, never takes the bot's turn):
//   • stash has items and the bot is away from base → order 'deliver' (courier idle / home);
//   • the shop logic hit a secret-shop item (b.wantSecret, set by botBuy in ai/bot/shop.js) → send the courier to the own
//     secret shop; once something is in its bag (bought there via entities/shopsites.js) and nothing more is wanted, deliver;
//     give up after 60 s waiting.
//   botCourierSnipe — attack a visible enemy courier when safe-ish (no nearby enemy hero, not under their tower).
function botCourier(h, b) {
  const c0 = h.courier;
  if (c0 && !c0.dead && !c0.upgraded && (h.gold || 0) >= COURIER_UPGRADE_COST + 400 && h.level >= 6) courierUpgrade(h);
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
function botCourierSnipe(h, b, s) {
  if (b.retreat || s.hpPct < 0.4 || s.foes.some(f => dst(f, h) < 9)) return false;
  let best = null, bd = 1e9;
  for (const u of units) {
    if (!u.isCourier || u.dead || u.team === h.team || !canSee(h.team, u)) continue;
    const d = dst(h, u); if (d > 14 || d >= bd) continue;
    if (enemyTowerAt(h.team, u.x, u.z, 0.5)) continue;
    best = u; bd = d;
  }
  if (!best) return false;
  emit('botCourierSnipe', { unit: h.id, courier: best.id, owner: best.owner && best.owner.id });
  botAttack(h, best); return true;
}
