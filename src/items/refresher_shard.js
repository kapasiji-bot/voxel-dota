// items/refresher_shard.js — 刷新碎片 Refresher Shard: Roshan 3rd+ kill drop. Consumable; refreshes ability CDs only
// (not items — unlike 刷新球). noShop / noSell; pick up from the pit like Aegis / Cheese (entities/drops.js).
registerItem({ id: 'refresher_shard', order: 97, name: '刷新碎片', en: 'Refresher Shard', icon: '碎', color: '#26c6da', cost: 0,
  noShop: true, noSell: true, consumable: true,
  desc: '肉山第 3 次及以后击杀掉落。主动·刷新：重置自身所有技能冷却（不影响物品）。消耗后消失。',
  active: { target: 'none', cd: 0, mana: 0, onUse(c) {
    const h = c.caster;
    for (const ab of h.abilities) { ab.cd = 0; ab.cdMax = 0; }
    AB.burst(h.x, 1.5, h.z, 28, ['#4dd0e1', '#e0f7fa', '#ffd54f'], 7, 0.55, 0.28, 3.2, 0);
    AB.ringP(h.x, h.z, 0.5, 24, ['#26c6da', '#80deea'], 0.45, 0.3, 0.5, 9);
    AB.float(h, '碎片刷新！', '#4dd0e1', 18, 1.1);
    emit('refresherShard', { unit: h.id });
  } } });
