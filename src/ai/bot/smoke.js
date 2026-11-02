// ai/bot/smoke.js — B12: bots buy/use Smoke of Deceit for ganks (B10 follow-up). Supports buy smoke; any bot with smoke
// pops it when a gank is assigned and allies are nearby.
function botSmokeBuy(h, b) {
  if (botRole(h) !== 'support' && h.level < 8) return false;
  if (countItem(h, 'smoke') > 0 || teamBuys(h.team, 'smoke') >= 1 + Math.floor(G.time / 360)) return false;
  if (stockOf(h.team, 'smoke') <= 0 || h.gold < ITEM_DEFS.smoke.cost + 80) return false;
  if (!botRoom(h, 'smoke', 200)) return false;
  return botBuy(h, b, 'smoke');
}
function botSmokeUse(h, b, s) {
  const slot = h.items.findIndex(it => it && it.id === 'smoke'); if (slot < 0) return false;
  const g = b.gank; if (!(g && G.time < g.until && !g.target.dead)) return false;
  if (s.allies.filter(a => dst(a, h) < SMOKE_R - 1).length < 1 && aliveBots(h.team).length > 2) return false;
  if (s.foes.some(f => dst(f, h) < SMOKE_BREAK + 2)) return false;   // already too close
  if (getMod(h, 'smoke')) return false;
  if (useItem(h, slot, null)) return false;
  emit('botSmoke', { unit: h.id, target: g.target.id });
  return true;
}
