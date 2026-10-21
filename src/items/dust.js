// items/dust.js — 显影之尘 Dust of Appearance: consumable; reveals invisible enemies around the user (true sight) and slows them.
registerItem({ id: 'dust', order: 6, name: '显影之尘', icon: '尘', color: '#f9a825', cost: 80, consumable: true, keepInvis: true,
  desc: '主动（消耗品）：显现周围 11 码内的隐身敌人（真实视域），持续 12 秒，并使其减速 20%。',
  active: { target: 'none', cd: 0.5, onUse(c) {
    const h = c.caster, hit = AB.enemiesIn(h, h.x, h.z, 11);
    for (const u of hit) AB.addModifier(u, MODS.dusted, h, { dur: 12 });
    AB.ringP(h.x, h.z, 1, 46, ['#fff59d', '#ffe082', '#ffffff'], 0.8, 0.35, 0.8, 13);
    AB.burst(h.x, 1.5, h.z, 30, ['#fff59d', '#ffe082'], 4, 1, 0.3, 2, -2);
    emit('dust', { unit: h.id, revealed: hit.filter(u => u.isHero).map(u => u.id) });
  } } });
