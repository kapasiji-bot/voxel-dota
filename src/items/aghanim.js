// items/aghanim.js — 阿哈利姆神杖 Aghanim's Scepter: stats + upgrades the holder's ultimate. The upgrade itself lives in each
// hero file (ability field `scepter`, see abilities/scepter.js); def.scepter marks the item. Not unique-stat: one is enough.
registerItem({ id: 'scepter', order: 41, name: '阿哈利姆神杖', en: "Aghanim's Scepter", icon: '杖', color: '#1e88e5', cost: 4200, scepter: true, unique: true,
  parts: ['point_booster', 'ogre', 'blade', 'staff'], props: { str: 10, agi: 10, int: 10, hp: 175, mana: 175 },
  desc: '精气之球 + 食人魔之斧 + 欢欣之刃 + 魔力法杖。+10 全属性，+175 生命值，+175 魔法值。被动·升级：强化持有者的终极技能（每个英雄效果不同，见技能说明中的“阿哈利姆神杖”）。' });
