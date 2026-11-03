// items/octarine.js — 玲珑心 Octarine Core: +HP/mana, 25% cooldown reduction (cast.js / inventory.js), 25% spell lifesteal on magic/pure ability damage.
Events.on('damage', e => {
  if (!e.ability || e.dtype === 'phys' || e.amount <= 0) return;
  const src = unitById(e.src); if (!src || !src.isHero || src.isIllusion || !(src.spellLifesteal > 0)) return;
  const tgt = unitById(e.tgt); if (!tgt || tgt.isBuilding || tgt.isWard || tgt.team === src.team) return;
  const heal = e.amount * src.spellLifesteal;
  if (heal <= 0) return;
  src.hp = Math.min(src.maxHp, src.hp + heal);
  if (heal > 10) AB.float(src, '+' + Math.round(heal), '#ce93d8', 13, 0.75);
});
registerItem({ id: 'octarine', order: 71, name: '玲珑心', en: 'Octarine Core', icon: '玲', color: '#8e24aa', cost: 5900,
  parts: ['point_booster', 'vitality', 'ultimate_orb'], unique: true,
  props: { hp: 425, mana: 425, str: 10, agi: 10, int: 10, cdReduc: 0.25, spellLifesteal: 0.25 },
  desc: '精气之球 + 活力之球 + 极限法球 + 650。+425 生命值，+425 魔法值，+10 全属性。被动·冷却缩减：技能与物品冷却时间减少 25%。被动·法术吸血：造成的魔法/纯粹技能伤害回复 25% 生命。' });
