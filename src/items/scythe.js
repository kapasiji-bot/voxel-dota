// items/scythe.js — 邪恶镰刀（羊刀）Scythe of Vyse: hex an enemy unit for 3.5 s (silence + disarm + slow, frog model: MODS.hex).
registerItem({ id: 'scythe', order: 46, name: '邪恶镰刀', en: 'Scythe of Vyse', icon: '羊', color: '#558b2f', cost: 5675, parts: ['ultimate_orb', 'staff', 'robe'],
  props: { str: 10, agi: 10, int: 35, manaRegen: 3 },
  desc: '极限法球 + 魔力法杖 + 法师长袍 + 2175。+10 力量/敏捷，+35 智力，+3 魔法恢复。主动·妖术：将 12 码内一名敌方单位变成青蛙 3.5 秒（沉默、缴械、减速，打断持续施法）。消耗 250 魔法，冷却 20 秒。',
  active: { target: 'unit', range: 12, cd: 20, mana: 250, onUse(c, t) {
    AB.hex(t, c.caster, 3.5); emit('scytheHex', { unit: c.caster.id, target: t.id });
  } } });
