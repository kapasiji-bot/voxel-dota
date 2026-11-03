// items/refresher.js — 刷新球 Refresher Orb: active resets ability + item cooldowns (except itself), mirroring Tinker Rearm.
registerItem({ id: 'refresher', order: 70, name: '刷新球', en: 'Refresher Orb', icon: '刷', color: '#00bcd4', cost: 5000,
  parts: ['point_booster', 'vitality', 'staff'], unique: true, props: { hp: 250, mana: 250, manaRegen: 3 },
  desc: '精气之球 + 活力之球 + 魔力法杖 + 1800。+250 生命值，+250 魔法值，+3 魔法恢复。主动·刷新：重置自身所有技能与物品冷却（本物品除外）。消耗 350 魔法，冷却 180 秒。',
  active: { target: 'none', cd: 180, mana: 350, onUse(c) {
    const h = c.caster, self = c.item;
    for (const ab of h.abilities) { ab.cd = 0; ab.cdMax = 0; }
    for (const it of h.items) if (it && it !== self) {
      it.cd = 0;
      if (it.def.heroCd && h.icd) h.icd[it.id] = 0;
    }
    AB.burst(h.x, 1.6, h.z, 32, ['#4dd0e1', '#e0f7fa', '#ffffff'], 8, 0.6, 0.3, 3.5, 0);
    AB.ringP(h.x, h.z, 0.6, 28, ['#26c6da', '#80deea'], 0.5, 0.35, 0.55, 10);
    AB.float(h, '刷新！', '#4dd0e1', 20, 1.2);
    emit('refresher', { unit: h.id });
  } } });
