// net/wrap.js — B11 installs the multiplayer wrappers (only when a LAN match starts; singleplayer never calls netInstall).
//  • Simulation entry points called by the local UI (outside the sim scope: RNG.sim === 0) become commands (net/cmds.js):
//    issueOrder, useItem, buyItem, sellItem, learnSkill, toggleAutocast, courierOrder. The quick local checks keep the
//    instant Chinese error feedback; the real call runs at the lockstep tick on every peer (NET_ORIG.*).
//  • Visual / audio functions run in the visual RNG scope (net/rng.js) and are silenced while catching up (NET.ff).
const NET_ORIG = {};
const netUI = () => NET.on && RNG.sim === 0;
function netItemCheck(h, slot, t) {
  const it = h && h.items[slot]; if (!it) return '空物品栏';
  const A = it.def.active; if (!A) return '该物品没有主动效果';
  if (h.dead) return '英雄已阵亡';
  if (it.cd > 0) return '物品冷却中';
  if (A.mana && h.mana < A.mana) return '魔法不足';
  if (A.target === 'unit') return itemTargetError(h, A, t);
  if (A.target === 'point' && !t && !A.optional) return '需要目标点';
  return null;
}
function netInstall() {
  if (NET_ORIG.issueOrder) return;
  const O = NET_ORIG;
  O.issueOrder = issueOrder; O.useItem = useItem; O.buyItem = buyItem; O.sellItem = sellItem; O.learnSkill = learnSkill; O.toggleAutocast = toggleAutocast; O.courierOrder = courierOrder;
  issueOrder = (h, o) => (netUI() ? (h && !h.dead && o ? netCmd({ k: 'o', u: h.id, o: netSer(o) }) : null) : O.issueOrder(h, o));
  useItem = (h, slot, t) => { if (!netUI()) return O.useItem(h, slot, t); const e = netItemCheck(h, slot, t); return e || netCmd({ k: 'use', s: slot, t: netSer(t === undefined ? null : t) }); };
  buyItem = (id, h = G.player) => {
    if (!netUI()) return O.buyItem(id, h);
    if (!h || !ITEM_DEFS[id]) return '未知物品';
    if (h.gold < itemPrice(h, id)) { err('金钱不足'); return '金钱不足'; }
    return netCmd({ k: 'buy', id });
  };
  sellItem = (slot, h = G.player) => (netUI() ? (h && h.items[slot] ? netCmd({ k: 'sell', s: slot }) : '空物品栏') : O.sellItem(slot, h));
  learnSkill = (i, h = G.player) => { if (!netUI()) return O.learnSkill(i, h); if (!h || !canLearn(h, i)) return false; netCmd({ k: 'learn', i }); return true; };
  toggleAutocast = (h, slot, on) => {
    if (!netUI()) return O.toggleAutocast(h, slot, on);
    const ab = h && h.abilities && h.abilities[slot]; if (!ab || !ab.def.orb || ab.lvl === 0) return false;
    netCmd({ k: 'auto', u: h.id, i: slot }); return true;
  };
  courierOrder = (h, type) => {
    if (!netUI()) return O.courierOrder(h, type);
    const c = h && h.courier; if (!c) return '没有信使';
    if (c.dead) return `信使正在复活（${Math.ceil(h.courierRespawn - G.time)} 秒）`;
    if (type === 'deliver' && !c.bag.length && !(h.stash || []).length) return '没有需要运送的物品';
    return netCmd({ k: 'cour', type });
  };
  // visual scope + silent while fast-forwarding a rejoin
  const vis = (f, quiet) => { const w = visScope(f); return quiet ? function () { return NET.ff ? undefined : w.apply(this, arguments); } : w; };
  spawnP = vis(spawnP, true); burst = vis(burst, true); ringP = vis(ringP, true); addFloat = vis(addFloat, true); auPlay = vis(auPlay, true);
  updateParticles = vis(updateParticles); updateFloats = vis(updateFloats); updateCorpses = vis(updateCorpses); syncModel = vis(syncModel);
  O.msg = msg; O.err = err; O.killFeed = killFeed;
  msg = function () { return NET.ff ? undefined : O.msg.apply(this, arguments); };
  err = function () { return NET.ff ? undefined : O.err.apply(this, arguments); };
  killFeed = function () { return NET.ff ? undefined : O.killFeed.apply(this, arguments); };
}
