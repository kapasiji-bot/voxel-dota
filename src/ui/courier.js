// ui/courier.js — B8 courier HUD + polish batch 6 shared ally control: F3 / buttons command the focused team
// courier (own by default; click courier or Shift+F3 / click status to cycle). Deliver still loads the owner's stash
// into that owner's bag — teammates issue orders only, never gold/items.
const COURIER_UI = { focus: 0 };
function teamCourierOwners(team) {
  return G.heroes.filter(h => h.team === team && h.courier);
}
function focusedCourierOwner() {
  const P = G.player; if (!P) return null;
  const a = typeof ctlActive === 'function' ? ctlActive() : null;
  if (a && a.isCourier && a.team === P.team && a.owner && !a.dead) { COURIER_UI.focus = a.owner.id; return a.owner; }
  if (COURIER_UI.focus) {
    const h = unitById(COURIER_UI.focus);
    if (h && h.isHero && h.team === P.team && h.courier) return h;
  }
  return P;
}
function cycleTeamCourierFocus() {
  const P = G.player; if (!P) return false;
  const owners = teamCourierOwners(P.team); if (owners.length < 2) return false;
  const cur = focusedCourierOwner(), i = Math.max(0, owners.indexOf(cur));
  const next = owners[(i + 1) % owners.length];
  COURIER_UI.focus = next.id;
  if (next.courier && !next.courier.dead && typeof selectUnits === 'function') selectUnits([next.courier]);
  msg(`指挥：${heroLabel(next)}的信使`, '#80d8ff');
  return true;
}
function playerCourierOrder(type) {
  const P = G.player; if (!P) return;
  const owner = focusedCourierOwner() || P;
  const e = courierOrder(owner, type, P); if (e) { err(e); return; }
  const whose = owner === P ? '信使' : `${heroLabel(owner)}的信使`;
  msg(`${whose}：${COURIER_CN[type]}`, '#80d8ff');
}
for (const [id, type] of [['cDeliver', 'deliver'], ['cHome', 'home'], ['cSecret', 'secret']]) {
  const b = $(id); if (b) b.addEventListener('mousedown', e => { e.stopPropagation(); playerCourierOrder(type); });
}
{ const el = $('courierSt'); if (el) el.addEventListener('mousedown', e => { e.stopPropagation(); if (!cycleTeamCourierFocus()) msg('仅己方信使', '#80d8ff'); }); }
function updateCourierHUD() {
  const P = G.player, el = $('courierSt'); if (!P || !el) return;
  const owner = focusedCourierOwner() || P, c = owner.courier;
  const tag = owner === P ? '信使' : `友军信使（${owner.def.name}）`;
  let t = `${tag}：无`;
  if (c && c.dead) t = `${tag}：复活中 ${Math.max(0, Math.ceil(owner.courierRespawn - G.time))}s`;
  else if (c) {
    const o = c.corder.type, sh = nearShopSite(c, 'secret') ? '（在神秘商店）' : '';
    const burst = c.burstUntil && G.time < c.burstUntil ? ' · 加速' : '', up = c.upgraded ? ' · 已升级' : '';
    t = `${tag}：${COURIER_CN[o] || o}${sh}${c.bag.length ? ` · 背包 ${c.bag.length}` : ''}${up}${burst}`;
  }
  setT(el, t);
  el.title = teamCourierOwners(P.team).length > 1 ? '点击切换友军信使（Shift+F3）' : '信使状态';
}
