// entities/buyback.js — B12 mid-game buyback. Gold cost scales with level² and game time; shared per-hero cooldown.
// doBuyback revives at the fountain instantly (same as a normal respawn). Death overlay (ui/death.js) shows cost / status.
const BB_CD = 180;   // seconds after a buyback before the next one is allowed
// DOTA-like: 100 + level²·1.5 + time·0.25 (shortened for ~30 min games)
const buybackCost = h => Math.floor(100 + h.level * h.level * 1.5 + G.time * 0.25);
const buybackReady = h => !!h && h.dead && (!h.bbCd || G.time >= h.bbCd);
const canBuyback = h => buybackReady(h) && h.gold >= buybackCost(h);
function doBuyback(h = G.player) {
  if (!h || !h.dead) return '英雄未阵亡';
  if (h.bbCd && G.time < h.bbCd) return '买活冷却中';
  const cost = buybackCost(h); if (h.gold < cost) return '金钱不足';
  h.gold -= cost; h.bbCd = G.time + BB_CD; h.bbUsed = (h.bbUsed || 0) + 1;
  emit('buyback', { unit: h.id, team: h.team, cost });
  if (h === G.player) msg(`买活！花费 ${cost} 金`, '#ffd54f');
  respawnHero(h);
  return null;
}
