// items/heart.js — 恐鳌之心 Heart of Tarrasque: big strength / HP and a passive regeneration of 1.4% max HP per second, paused
// for 4 s after taking damage from an enemy hero (h.dmgBy).
registerItem({ id: 'heart', order: 45, name: '恐鳌之心', en: 'Heart of Tarrasque', icon: '心', color: '#b71c1c', cost: 5000, parts: ['reaver', 'vitality'], unique: true,
  props: { str: 45, hp: 250 },
  desc: '掠夺者之斧 + 活力之球 + 1200。+45 力量，+250 生命值。被动·健康：每秒恢复 1.4% 最大生命值（受到敌方英雄伤害后暂停 4 秒）。',
  tick(c, dt) {
    const h = c.caster; if (h.hp >= h.maxHp) return;
    for (const id in h.dmgBy) if (G.time - h.dmgBy[id] < 4) return;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.014 * dt);
  } });
