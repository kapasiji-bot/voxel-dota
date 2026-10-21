// items/blink.js — 闪烁匕首: point-target teleport (clamped to range, snapped to walkable).
registerItem({ id: 'blink', order: 2, name: '闪烁匕首', icon: '闪', color: '#3949ab', cost: 2250,
  desc: '主动·闪烁：瞬间传送到最远 24 码外的目标位置。冷却 12 秒。',
  active: { target: 'point', clamp: true, range: 24, cd: 12, onUse(c, pt) { AB.teleport(c.caster, pt, { maxR: 24 }); } } });
