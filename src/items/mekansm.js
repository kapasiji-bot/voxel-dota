// items/mekansm.js — 梅肯斯姆 Mekansm: heals allied heroes and units nearby + temporary armor.
const MEK_MOD = { id: 'mek_armor', name: '梅肯斯姆', color: '#aed581', props: { armor: 2 } };
const MEK_R = 12;
registerItem({ id: 'mekansm', order: 40, name: '梅肯斯姆', en: 'Mekansm', icon: '梅', color: '#7cb342', cost: 1775, parts: ['headdress', 'ring', 'circlet'],
  props: { hpRegen: 2.5, armor: 2, str: 2, agi: 2, int: 2 },
  desc: `头巾 + 守护指环 + 圆环 + 1020。+2.5 生命恢复，+2 护甲，+2 全属性。主动·恢复：为 ${MEK_R} 码内的友方单位恢复 275 点生命，并在 10 秒内提供 +2 护甲。消耗 100 魔法，冷却 50 秒。`,
  active: { target: 'none', cd: 50, mana: 100, onUse(c) {
    const h = c.caster; let n = 0;
    for (const u of units) if (!u.dead && u.team === h.team && !u.isBuilding && !u.isWard && dst(u, h) < MEK_R) {
      const before = u.hp; u.hp = Math.min(u.maxHp, u.hp + 275); AB.addModifier(u, MEK_MOD, h, { dur: 10 }); n++;
      if (u.hp > before) AB.float(u, '+' + Math.round(u.hp - before), '#aed581', 14, 1);
      AB.burst(u.x, 1.5, u.z, 8, ['#c5e1a5', '#ffffff'], 3, 0.6, 0.22, 3, 0);
    }
    AB.ringP(h.x, h.z, 0.8, 40, ['#aed581', '#dcedc8', '#ffffff'], 0.5, 0.4, 0.8, (MEK_R - 0.8) / 0.5);
    emit('mekansm', { unit: h.id, n });
  } } });
