// items/butterfly.js — 蝴蝶 Butterfly: agility, attack speed and 35% evasion (adds to Blur etc.; capped at 90%, entities/hero.js).
registerItem({ id: 'butterfly', order: 49, name: '蝴蝶', en: 'Butterfly', icon: '蝶', color: '#43a047', cost: 5450, parts: ['talisman', 'blade', 'gloves'], unique: true,
  props: { agi: 35, dmg: 25, as: 30, evasion: 0.35 },
  desc: '闪避护符 + 欢欣之刃 + 加速手套 + 2700。+35 敏捷，+25 攻击力，+30 攻击速度，+35% 闪避。' });
