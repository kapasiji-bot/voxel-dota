// items/mkb.js — 金箍棒 Monkey King Bar: true strike (attacks ignore evasion / miss chance: prop trueStrike → combat/attack.js)
// and a 40% chance per attack for 70 bonus magic damage.
registerItem({ id: 'mkb', order: 50, name: '金箍棒', en: 'Monkey King Bar', icon: '棒', color: '#ffb300', cost: 4975, parts: ['claymore', 'gloves', 'gloves'], unique: true,
  props: { dmg: 40, as: 45, trueStrike: 1 },
  desc: '大剑 + 加速手套 ×2 + 2725。+40 攻击力，+45 攻击速度。被动·克敌先机：攻击无法被闪避（无视闪避与致盲）；40% 几率附加 70 点魔法伤害。',
  onAttackLand(c, t) { if (!t.isBuilding && !t.dead && Math.random() < 0.4) { dealDamage(c.caster, t, 70, 'magic', { ability: 'mkb' }); AB.burst(t.x, 1.2, t.z, 6, ['#ffd54f', '#fff8e1'], 3, 0.3, 0.2, 1, 0); } } });
