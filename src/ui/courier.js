// ui/courier.js — B8 courier HUD row (under the gold row): status text + 运送 (F3) / 回家 / 神秘 buttons → courierOrder
// (entities/courier.js). F3 is bound in ui/input.js. Status shows the order, bag size and the respawn timer.
function playerCourierOrder(type) {
  const P = G.player; if (!P) return;
  const e = courierOrder(P, type); if (e) { err(e); return; }
  msg(`信使：${COURIER_CN[type]}`, '#80d8ff');
}
for (const [id, type] of [['cDeliver', 'deliver'], ['cHome', 'home'], ['cSecret', 'secret']]) {
  const b = $(id); if (b) b.addEventListener('mousedown', e => { e.stopPropagation(); playerCourierOrder(type); });
}
function updateCourierHUD() {
  const P = G.player, el = $('courierSt'); if (!P || !el) return;
  const c = P.courier;
  let t = '信使：无';
  if (c && c.dead) t = `信使：复活中 ${Math.max(0, Math.ceil(P.courierRespawn - G.time))}s`;
  else if (c) { const o = c.corder.type, sh = nearShopSite(c, 'secret') ? '（在神秘商店）' : ''; t = `信使：${COURIER_CN[o] || o}${sh}${c.bag.length ? ` · 背包 ${c.bag.length}` : ''}`; }
  setT(el, t);
}
