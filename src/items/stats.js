// items/stats.js — basic stat items / recipe components (shop tab 基础). Pure `props`, no actives.
// B8: SECRET_SHOP_ITEMS are sold only at the 神秘商店 secret shops (entities/shopsites.js).
const SECRET_SHOP_ITEMS = ['vitality', 'point_booster', 'talisman', 'ultimate_orb', 'reaver'];
for (const [id, order, name, icon, color, cost, props, desc] of [
  ['gauntlets', 8, '力量手套', '力', '#8d6e63', 140, { str: 3 }, '+3 力量。'],
  ['slippers', 9, '敏捷便鞋', '敏', '#43a047', 140, { agi: 3 }, '+3 敏捷。'],
  ['mantle', 10, '智力斗篷', '智', '#1e88e5', 140, { int: 3 }, '+3 智力。'],
  ['circlet', 11, '圆环', '环', '#bdbdbd', 155, { str: 2, agi: 2, int: 2 }, '+2 全属性。'],
  ['ring', 12, '守护指环', '甲', '#78909c', 175, { armor: 2 }, '+2 护甲。'],
  ['gloves', 13, '加速手套', '速', '#ef6c00', 450, { as: 20 }, '+20 攻击速度。'],
  ['ogre', 14, '食人魔之斧', '斧', '#6d4c41', 1000, { str: 10 }, '+10 力量。'],
  ['blade', 15, '欢欣之刃', '刃', '#2e7d32', 1000, { agi: 10 }, '+10 敏捷。'],
  ['staff', 16, '魔力法杖', '杖', '#1565c0', 1000, { int: 10 }, '+10 智力。'],
  ['platemail', 17, '板甲', '铠', '#546e7a', 1400, { armor: 10 }, '+10 护甲。'],
  // B7 components for the new recipe items
  ['robe', 18, '法师长袍', '袍', '#3949ab', 450, { int: 6 }, '+6 智力。'],
  ['headdress', 19, '头巾', '巾', '#689f38', 425, { hpRegen: 2.5 }, '+2.5 生命恢复。'],
  ['cloak', 30, '抗魔斗篷', '篷', '#00897b', 800, { magicRes: 0.15 }, '+15% 魔法抗性。'],
  ['vitality', 31, '活力之球', '活', '#c62828', 1000, { hp: 250 }, '+250 生命值。'],
  ['point_booster', 32, '精气之球', '精', '#5e35b1', 1200, { hp: 175, mana: 175 }, '+175 生命值，+175 魔法值。'],
  ['talisman', 33, '闪避护符', '避', '#43a047', 1300, { evasion: 0.15 }, '+15% 闪避。'],
  ['ultimate_orb', 34, '极限法球', '极', '#7e57c2', 2050, { str: 10, agi: 10, int: 10 }, '+10 全属性。'],
  ['reaver', 35, '掠夺者之斧', '掠', '#4e342e', 2800, { str: 25 }, '+25 力量。'],
]) registerItem({ id, order, name, icon, color, cost, props, desc, basic: true, shop: SECRET_SHOP_ITEMS.includes(id) ? 'secret' : undefined });
