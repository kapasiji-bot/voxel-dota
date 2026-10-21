// items/salve.js — 治疗药膏: consumable, +40 HP/s for 10 s.
const SALVE_MOD = { id: 'salve', name: '治疗药膏', color: '#2e7d32', props: { hpRegen: 40 } };
registerItem({ id: 'salve', order: 5, name: '治疗药膏', icon: '药', color: '#2e7d32', cost: 110, consumable: true, keepInvis: true,
  desc: '主动（消耗品）：10 秒内恢复 400 点生命值。',
  active: { target: 'none', cd: 0.5, onUse(c) { AB.addModifier(c.caster, SALVE_MOD, c.caster, { dur: 10 }); AB.burst(c.caster.x, 1.5, c.caster.z, 14, ['#66bb6a', '#a5d6a7'], 2, 0.8, 0.25, 3, 0); } } });
