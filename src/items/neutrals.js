// items/neutrals.js — B29 neutral/token items (camp drops). noShop + noSell; carried in dedicated h.neutral slot
// (entities/neutralitems.js). Three timed tiers (7 / 17 / 27 min). Chinese names for HUD/tooltips.
const N_SWIFT_MOD = { id: 'n_swift', name: '迅捷', color: '#81c784', props: { msPct: 0.22 } };
const N_MIRROR_MOD = { id: 'n_mirror', name: '镜盾', color: '#ce93d8', props: { magicRes: 0.45 } };

registerItem({ id: 'n_hobbit', order: 200, name: '旅者之靴', en: "Traveller's Boots", icon: '靴', color: '#8d6e63', cost: 0,
  noShop: true, noSell: true, neutral: true, tier: 1,
  props: { ms: 0.8 },
  desc: '中立物品·第1档（约7分钟起）。+0.8 移动速度。被动，无法出售，占据中立栏。' });

registerItem({ id: 'n_armor', order: 201, name: '丛林护甲', en: 'Grove Plate', icon: '甲', color: '#6d4c41', cost: 0,
  noShop: true, noSell: true, neutral: true, tier: 1,
  props: { armor: 4, hpRegen: 3 },
  desc: '中立物品·第1档（约7分钟起）。+4 护甲，+3 生命恢复。被动，占据中立栏。' });

registerItem({ id: 'n_swift', order: 202, name: '迅捷闪光', en: 'Swift Flash', icon: '迅', color: '#66bb6a', cost: 0,
  noShop: true, noSell: true, neutral: true, tier: 2,
  props: { ms: 0.4, as: 15 },
  desc: '中立物品·第2档（约17分钟起）。+0.4 移动速度，+15 攻击速度。主动·迅捷：4秒内移动速度 +22%。冷却 25 秒。',
  active: { target: 'none', cd: 25, onUse(c) {
    AB.addModifier(c.caster, N_SWIFT_MOD, c.caster, { dur: 4 });
    AB.burst(c.caster.x, 1, c.caster.z, 14, ['#a5d6a7', '#ffffff'], 4, 0.4, 0.22, 2, 0);
  } } });

registerItem({ id: 'n_prism', order: 203, name: '棱晶护符', en: 'Prism Charm', icon: '晶', color: '#29b6f6', cost: 0,
  noShop: true, noSell: true, neutral: true, tier: 2,
  props: { mana: 150, manaRegen: 1.5 },
  desc: '中立物品·第2档（约17分钟起）。+150 魔法，+1.5 魔法恢复。主动·净化：驱散自身负面效果并回复 180 生命。冷却 30 秒。',
  active: { target: 'none', cd: 30, onUse(c) {
    if (typeof purgeDebuffs === 'function') purgeDebuffs(c.caster);
    c.caster.hp = Math.min(c.caster.maxHp, c.caster.hp + 180);
    AB.burst(c.caster.x, 1.2, c.caster.z, 18, ['#81d4fa', '#e1f5fe', '#ffffff'], 5, 0.5, 0.25, 2, 0);
  } } });

registerItem({ id: 'n_vambrace', order: 204, name: '臂铠', en: 'Vambrace', icon: '臂', color: '#ef6c00', cost: 0,
  noShop: true, noSell: true, neutral: true, tier: 3,
  props: { str: 8, agi: 8, int: 8, armor: 2 },
  desc: '中立物品·第3档（约27分钟起）。+8 全属性，+2 护甲。被动，占据中立栏。' });

registerItem({ id: 'n_mirror', order: 205, name: '镜盾', en: 'Mirror Shield', icon: '镜', color: '#ab47bc', cost: 0,
  noShop: true, noSell: true, neutral: true, tier: 3,
  props: { hp: 200, magicRes: 0.1 },
  desc: '中立物品·第3档（约27分钟起）。+200 生命，+10% 魔法抗性。主动·镜盾：3.5秒内额外 +45% 魔法抗性。冷却 40 秒。',
  active: { target: 'none', cd: 40, onUse(c) {
    AB.addModifier(c.caster, N_MIRROR_MOD, c.caster, { dur: 3.5 });
    AB.burst(c.caster.x, 1.1, c.caster.z, 16, ['#ce93d8', '#f3e5f5', '#ffffff'], 5, 0.45, 0.25, 2, 0);
  } } });
