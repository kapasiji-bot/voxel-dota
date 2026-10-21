// items/daedalus.js — 代达罗斯之殇 Daedalus: +88 damage, 30% chance for a 2.25× critical strike (applyCrit: only the highest
// crit of an attack counts, evaded attacks never crit — combat/attack.js).
registerItem({ id: 'daedalus', order: 48, name: '代达罗斯之殇', en: 'Daedalus', icon: '殇', color: '#c62828', cost: 5150, parts: ['claymore', 'claymore', 'gloves'], unique: true,
  props: { dmg: 88 },
  desc: '大剑 ×2 + 加速手套 + 2000。+88 攻击力。被动·致命一击：30% 几率造成 225% 暴击伤害（与其它暴击取最高值）。',
  modifyAttack(c, t, info) { if (!t.isBuilding && Math.random() < 0.3) applyCrit(info, 2.25); } });
