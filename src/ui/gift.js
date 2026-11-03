// ui/gift.js — T (no summon selected): gift Aghanim's Scepter / Shard to an ally hero.
// In range → giftItem; far click → giftViaCourier when a live courier exists. Keeps ui/input.js small.
function pressGift() {
  const P = G.player; if (!P || P.dead) return;
  if (G.targeting && G.targeting.kind === 'gift') { G.targeting = null; return; }
  const slot = P.items.findIndex(it => isGiftable(it));
  if (slot < 0) { err('物品栏没有可赠予的神杖/魔晶'); return; }
  G.targeting = { kind: 'gift', slot, mode: 'unit', range: GIFT_RANGE + P.radius, owner: P };
  msg('选择友方英雄赠予神杖/魔晶（远处 = 信使运送；再按 T / Esc 取消）', '#80d8ff');
}
function resolveGiftClick(sx, sy, tg) {
  const P = (tg && tg.owner) || G.player; if (!P || P.dead) return;
  const slot = tg.slot;
  const it = P.items[slot]; if (!it || !isGiftable(it)) { err('没有可赠予物品'); return; }
  const u = pickUnit(sx, sy, true);
  if (!u) { err('需要友方英雄目标'); return; }
  const te = giftTargetError(P, u); if (te) { err(te); return; }
  const need = GIFT_RANGE + P.radius + u.radius;
  const far = dst(P, u) > need * 2.2;
  const e = (far && P.courier && !P.courier.dead) ? giftViaCourier(P, slot, u) : giftItem(P, slot, u);
  if (e) err(e);
}
