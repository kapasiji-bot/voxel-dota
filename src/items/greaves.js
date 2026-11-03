// items/greaves.js — 守护仙灵 Guardian Greaves: Mekansm + Arcane Boots upgrade. AoE heal + mana + self purge; boots uniqueGroup.
const GREAVES_ARMOR = { id: 'greaves_armor', name: '守护仙灵', color: '#aed581', props: { armor: 3 } };
const GREAVES_R = 12;
registerItem({ id: 'greaves', order: 74, name: '守护仙灵', en: 'Guardian Greaves', icon: '灵', color: '#558b2f', cost: 4950,
  parts: ['mekansm', 'arcane'], unique: true, uniqueGroup: 'boots',
  props: { ms: 1.5, int: 8, hpRegen: 3, armor: 4, str: 2, agi: 2 },
  desc: `梅肯斯姆 + 法力靴 + 1700。+1.5 移动速度，+8 智力，+3 生命恢复，+4 护甲，+2 力量/敏捷。主动·恢复：为 ${GREAVES_R} 码内友军恢复 300 生命与 160 魔法，并获得 +3 护甲 12 秒；对自己额外驱散负面状态。消耗 0 魔法，冷却 40 秒。`,
  active: { target: 'none', cd: 40, onUse(c) {
    const h = c.caster; let n = 0;
    purgeDebuffs(h);
    for (const u of units) if (!u.dead && u.team === h.team && !u.isBuilding && !u.isWard && dst(u, h) < GREAVES_R) {
      const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + 300);
      if (u.maxMana) u.mana = Math.min(u.maxMana, (u.mana || 0) + 160);
      AB.addModifier(u, GREAVES_ARMOR, h, { dur: 12 }); n++;
      if (u.hp > before) AB.float(u, '+' + Math.round(u.hp - before), '#aed581', 14, 1);
      AB.burst(u.x, 1.5, u.z, 10, ['#c5e1a5', '#81c784', '#ffffff'], 3, 0.55, 0.22, 3, 0);
    }
    AB.ringP(h.x, h.z, 0.8, 42, ['#aed581', '#dcedc8', '#ffffff'], 0.55, 0.4, 0.85, (GREAVES_R - 0.8) / 0.5);
    emit('greaves', { unit: h.id, n });
  } } });
