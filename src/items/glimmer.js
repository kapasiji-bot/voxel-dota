// items/glimmer.js — 微光披风 Glimmer Cape: an ally (self included: press twice) fades into invisibility after 0.6 s for 5 s and
// gains +45% magic resistance (kept even if the invisibility breaks / is seen through by true sight).
const GLIMMER_INVIS = { id: 'glimmer', name: '微光', color: '#b39ddb', invis: true };
const GLIMMER_MR = { id: 'glimmer_mr', name: '微光护盾', color: '#b39ddb', props: { magicRes: 0.45 },
  fx(u) { if (Math.random() < 0.3) spawnP(u.x + rnd(-0.6, 0.6), rnd(0.3, 2.5), u.z + rnd(-0.6, 0.6), 0, 0.8, 0, 0.5, 0.15, '#d1c4e9'); } };
registerItem({ id: 'glimmer', order: 44, name: '微光披风', en: 'Glimmer Cape', icon: '光', color: '#7e57c2', cost: 2150, parts: ['cloak', 'gloves'],
  props: { as: 20, magicRes: 0.15 },
  desc: '抗魔斗篷 + 加速手套 + 900。+20 攻击速度，+15% 魔法抗性。主动·微光：使 16 码内一名友方英雄（含自己，连按两次）在 0.6 秒后隐身 5 秒，并获得 45% 魔法抗性。消耗 90 魔法，冷却 14 秒。',
  active: { target: 'unit', targetTeam: 'ally', heroOnly: true, range: 16, cd: 14, mana: 90, onUse(c, t) {
    AB.addModifier(t, GLIMMER_INVIS, c.caster, { dur: 5.6, data: { fade: 0.6 } });
    AB.addModifier(t, GLIMMER_MR, c.caster, { dur: 5.6 });
    AB.burst(t.x, 1.5, t.z, 18, ['#b39ddb', '#ede7f6', '#7e57c2'], 3, 0.6, 0.22, 2, 0);
    emit('glimmer', { unit: c.caster.id, target: t.id });
  } } });
