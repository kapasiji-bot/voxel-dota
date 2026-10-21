// items/wards.js — 侦察守卫 / 岗哨守卫: stackable, team stock, ground-target placement (walks into range; preview circle =
// def.active.radius). The ward units themselves live in entities/wards.js.
registerItem({ id: 'ward_obs', order: 20, name: '侦察守卫', icon: '眼', color: '#f9a825', cost: 50, stack: true, consumable: true, keepInvis: true, maxCharges: 2,
  stock: { max: 2, every: 75, start: 2 },
  desc: '放置一个隐形的守卫，6 分钟内提供 16 码视野（敌方需真实视域才能看见）。全队共享库存：最多 2 个，每 75 秒补充 1 个。',
  active: { target: 'point', range: 10, radius: WARD_TYPES.obs.vision, cd: 0.3, onUse(c, pt) { return placeWard(c.caster, 'obs', pt) ? undefined : false; } } });
registerItem({ id: 'ward_sentry', order: 21, name: '岗哨守卫', icon: '哨', color: '#0288d1', cost: 50, stack: true, consumable: true, keepInvis: true, maxCharges: 3,
  stock: { max: 4, every: 45, start: 3 },
  desc: '放置一个隐形的守卫，7 分钟内提供 9 码真实视域，显现范围内的隐身单位和守卫。全队共享库存：最多 4 个，每 45 秒补充 1 个。',
  active: { target: 'point', range: 10, radius: WARD_TYPES.sentry.ts, cd: 0.3, onUse(c, pt) { return placeWard(c.caster, 'sentry', pt) ? undefined : false; } } });
