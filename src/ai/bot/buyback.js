// ai/bot/buyback.js — B12: dead bots buy back when the team is defending high ground / the ancient, or a high-value fight
// is on and they can afford it. Called from botUpdate while h.dead.
function botBuyback(h, b) {
  if (!canBuyback(h)) return false;
  const cost = buybackCost(h);
  // keep a gold cushion so the bot isn't broke after buyback
  if (h.gold < cost + 200) return false;
  const p = teamPlan(h.team), thr = p.mode === 'defend' ? p.target : null;
  const ancient = units.find(u => !u.dead && u.kind === 'ancient' && u.team === h.team);
  const hg = thr && (thr.kind === 'ancient' || thr.kind === 'barracks' || (thr.tier || 0) >= 3);
  const fight = aliveHeroes(1 - h.team).filter(e => !e.dead && ancient && dst(e, ancient) < 36).length >= 2;
  const alliesFight = G.heroes.filter(a => a.team === h.team && !a.dead && a !== h).some(a => {
    const foes = G.heroes.filter(e => e.team !== h.team && !e.dead && dst(e, a) < 16);
    return foes.length >= 2 && foes.reduce((s, e) => s + heroPower(e), 0) > heroPower(a) * 0.8;
  });
  if (!(hg || fight || (alliesFight && h.level >= 10 && G.time > 600))) return false;
  const e = doBuyback(h); if (e) return false;
  (b.buys = b.buys || {}).buyback = (b.buys.buyback || 0) + 1;
  emit('botBuyback', { unit: h.id, cost, why: hg ? 'defend' : fight ? 'ancient' : 'fight' });
  return true;
}
