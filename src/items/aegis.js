// items/aegis.js — B8 Roshan drops (never sold in shops: noShop). 不朽之守护 Aegis: reincarnation on death (entities/drops.js
// aegisSave), expires 5 min after pickup, cannot be sold. 奶酪 Cheese: consumable, instantly restores 2500 HP / 1500 mana.
registerItem({ id: 'aegis', order: 95, name: '不朽之守护', en: 'Aegis of the Immortal', icon: '盾', color: '#ffca28', cost: 0, noShop: true, noSell: true,
  desc: '被动：持有者死亡后 5 秒在原地复活（消耗）。拾取后 5 分钟消失。肉山掉落，无法出售。' });
registerItem({ id: 'cheese', order: 96, name: '奶酪', en: 'Cheese', icon: '酪', color: '#ffd54f', cost: 0, noShop: true, consumable: true,
  desc: '主动（消耗品）：立即恢复 2500 点生命值和 1500 点魔法值。第二次及以后击杀肉山掉落。',
  active: { target: 'none', cd: 0, onUse(c) { const h = c.caster; h.hp = Math.min(h.maxHp, h.hp + 2500); h.mana = Math.min(h.maxMana, h.mana + 1500);
    AB.burst(h.x, 1.5, h.z, 24, ['#ffd54f', '#fff59d'], 3, 0.8, 0.3, 3, 0); } } });
