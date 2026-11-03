// items/shard.js — B12 阿哈利姆魔晶 Aghanim's Shard. Cheaper scepter-lite: stats + unlocks ability `shard` upgrades
// (abilities/shard.js). One per hero (unique).
registerItem({ id: 'shard', order: 57, name: '阿哈利姆魔晶', en: "Aghanim's Shard", icon: '晶', color: '#5c6bc0', cost: 1400,
  shard: true, unique: true, giftable: true, props: { hp: 150, mana: 150 },
  desc: '+150 生命值，+150 魔法值。被动·魔晶升级：强化持有者的一项技能（每个英雄效果不同；若该英雄无魔晶升级则仅提供属性）。可按 T 赠予友方英雄（远处由信使运送）。' });
