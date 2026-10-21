// ai/bot/tp.js — bot Town Portal use: back to the lane after respawning / healing in base, and to defend a tower under siege.
const BOT_TP_GAP = { lane: 200, defend: 140, home: 200, group: 120 };   // group: B10 team push / rally (teamexec.js)
const tpSlot = h => { const i = itemSlot(h, 'tp'); return i >= 0 && h.items[i].cd <= 0 && !h.channel ? i : -1; };
function botTp(h, b, pt, why) {
  // a global teleport ability (Nature's Prophet, ai.tp) lands exactly on pt and saves the scroll
  const ti = h.abilities.findIndex(a => a.def.ai && a.def.ai.tp && castReady(h, a));
  if (ti >= 0 && dst(h, pt) > 40 && !orderCast(h, ti, AB.clampPoint(h, pt, 0))) { b.lastTp = G.time; emit('botTp', { unit: h.id, why, ability: true }); return true; }
  // scrolls cost gold + a slot: at most one per BOT_TP_GAP[why] s (home only when badly hurt), and only if it saves a long walk
  const sl = tpSlot(h); if (sl < 0) return false;
  if (G.time - (b.lastScroll || -999) < BOT_TP_GAP[why] || (why === 'home' && h.hp > h.maxHp * 0.3)) return false;
  const d = tpDest(h, pt); if (dst(h, pt) - Math.hypot(d.x - pt.x, d.z - pt.z) < (why === 'defend' ? 40 : 55)) return false;   // walking is about as fast
  if (useItem(h, sl, pt)) return false;
  b.lastScroll = G.time;
  emit('botTp', { unit: h.id, why, x: +d.x.toFixed(0), z: +d.z.toFixed(0) }); return true;
}
// healed up in base → TP to the lane position (lands at the own building closest to it)
function botTpLane(h, b, s) {
  if (G.time < 60 || !atShop(h) || b.retreat || h.hp < h.maxHp * 0.85 || s.foes.length) return false;
  const td = teamDest(h); return td ? botTp(h, b, td, 'group') : botTp(h, b, lanePos(h, b), 'lane');   // B10: straight to the team's rally / siege
}
// an own tower (any lane) under attack by enemy heroes + creeps, far away from us
function defendTarget(h) {
  let best = null;
  for (const u of units) {
    if (u.dead || u.kind !== 'tower' || u.team !== h.team || u.hp > u.maxHp * 0.92) continue;
    let heroes = 0, n = 0; for (const e of units) if (!e.dead && e.team !== h.team && !e.isBuilding && !e.isWard && dst(e, u) < 16) { n++; if (e.isHero) heroes++; }
    if (heroes >= 1 && n >= 3 && (!best || dst(h, u) < dst(h, best))) best = u;
  }
  return best;
}
