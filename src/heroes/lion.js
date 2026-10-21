// heroes/lion.js — 莱恩 Lion (ranged intelligence). Earth Spike line stun+knockup, Hex (voxel frog), Mana Drain (channel), Finger of Death.
registerHero({
  id: 'lion', order: 6, name: '莱恩', title: '恶魔巫师', type: '远程 · 智力', color: '#6a1b9a', nameColor: '#ea80fc',
  desc: '远程智力型英雄。穿刺将一排敌人掀上天空，妖术把敌人变成青蛙，法力汲取持续吸取魔法，穿心幽魂刃一击毙命。',
  stats: { primary: 'int', str: 18, strG: 2.4, agi: 15, agiG: 1.5, int: 18, intG: 3.5, dmg: 24, armor: 1, bat: 1.7, range: 12,
    atkPoint: 0.43, backswing: 0.74, speed: 6.8, proj: 22, projColor: '#ce93d8', hpRegen: 1.0, manaRegen: 1.0, radius: 0.65, height: 3.5 },
  portrait: { headY: 2.85 },
  ai: { build: ['arcane', 'force', 'dagon', 'scepter', 'scythe'], combos: [{ id: 'lion_hex_spike', steps: [{ slot: 1 }, { slot: 0, at: 'target' }], min: 1, radius: 4 }] },   // ai/bot/combos.js
  model: () => humanoid({
    pants: '#311b92', boots: '#1a1a1a', skin: '#9e9e9e', sleeve: '#4a148c', hip: 0.26, sh: 0.62, legH: 1.2, bodyH: 1.1, legW: 0.38,
    body: [[0, 0.3, 0, 1.0, 0.8, 0.7, '#4a148c'], [0, 0.8, 0, 0.8, 0.8, 0.52, '#6a1b9a'], [0, 0.05, 0, 1.06, 0.18, 0.76, '#b71c1c'],
      [0, 0.9, 0.27, 0.16, 0.9, 0.03, '#ffd54f'], [0, 0.9, -0.45, 0.95, 1.6, 0.12, '#311b92'],
      [0, 1.6, 0, 0.8, 0.8, 0.8, '#bdbdbd'], [0, 1.55, 0.41, 0.6, 0.4, 0.04, '#424242'], [0, 2.05, -0.05, 0.86, 0.2, 0.86, '#4a148c'],
      [-0.48, 2.25, -0.1, 0.18, 0.55, 0.18, '#3e2723'], [0.48, 2.25, -0.1, 0.18, 0.55, 0.18, '#3e2723'], [-0.56, 2.6, -0.2, 0.14, 0.3, 0.14, '#5d4037'], [0.56, 2.6, -0.2, 0.14, 0.3, 0.14, '#5d4037'],
      [0, 1.25, 0.38, 0.5, 0.3, 0.12, '#9e9e9e']],
    bodyGlow: [[-0.18, 1.7, 0.42, 0.14, 0.1, 0.02, '#ff1744'], [0.18, 1.7, 0.42, 0.14, 0.1, 0.02, '#ff1744']],
    armR: [[0, -0.45, 0, 0.4, 0.95, 0.44, '#4a148c'], [0, -0.95, 0, 0.6, 0.5, 0.6, '#5d4037'], [-0.18, -1.3, 0.15, 0.12, 0.35, 0.12, '#3e2723'], [0.18, -1.3, 0.15, 0.12, 0.35, 0.12, '#3e2723']],
    armRGlow: [[0, -1.0, 0.31, 0.3, 0.3, 0.04, '#e040fb']],
  }),
  abilities: [
    { id: 'spike', key: 'Q', name: '穿刺', icon: '刺', color: '#8d6e63', target: 'direction', castPoint: 0.3,
      mana: [100, 120, 140, 160], cd: [12, 12, 12, 12], values: { dmg: [80, 140, 200, 260], stun: [1.4, 1.8, 2.2, 2.6], len: 16, w0: 3, w1: 3, speed: 30, air: 0.5 },
      text: L => `从地面召唤一排尖刺，长度 ${L.len} 码，将沿途敌人击飞 ${L.air} 秒，造成 ${L.dmg} 点魔法伤害并共眩晕 ${L.stun} 秒。`,
      onCast(c, pt) {
        const h = c.caster, dir = AB.dir(h, pt);
        AB.spikes(h.x + dir.x * 1.5, h.z + dir.z * 1.5, dir, c.v('len'), c.v('speed'));
        AB.lineWave({ caster: h, x: h.x, z: h.z, dir, len: c.v('len'), speed: c.v('speed'), w0: c.v('w0'), w1: c.v('w1'), noFx: true,
          onHit(u) { if (hasState(u, 'magicImmune')) return; AB.knockup(u, h, c.v('air'), 2.8); AB.stun(u, h, c.v('stun')); AB.damage(h, u, c.v('dmg'), 'magic', 'spike'); } });
      } },
    { id: 'hex', ai: { disable: true }, key: 'W', name: '妖术', icon: '蛙', color: '#64dd17', target: 'unit', range: 10, castPoint: 0,
      mana: [125, 150, 175, 200], cd: [30, 24, 18, 12], values: { dur: [2.5, 3, 3.5, 4] },
      text: L => `把一名敌人变成青蛙，持续 ${L.dur} 秒：无法攻击和施法，移动速度大幅降低。`,
      onCast(c, t) { AB.hex(t, c.caster, c.v('dur')); AB.float(t, '呱！', '#b2ff59', 18, 1); } },
    { id: 'drain', ai: { mana: true }, key: 'E', name: '法力汲取', icon: '汲', color: '#7c4dff', target: 'unit', range: 10, castPoint: 0.2, channel: 5,
      mana: 10, cd: [16, 13, 10, 7], values: { rate: [30, 45, 60, 75], slow: [0.14, 0.16, 0.18, 0.2], breakR: 15 }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `持续施法 5 秒：每秒从目标吸取 ${L.rate} 点魔法并减速 ${L.slow}；目标没有魔法时改为造成等量魔法伤害。距离超过 ${L.breakR} 码或被打断即结束。`,
      onChannelTick(c, t, dt, ch) {
        const h = c.caster;
        if (dst(h, t) > c.v('breakR') || hasState(t, 'magicImmune')) return false;
        const amt = c.v('rate') * dt, got = Math.min(t.mana || 0, amt);
        if (got > 0) t.mana -= got; else AB.damage(h, t, amt, 'magic', 'drain', { silent: true });
        h.mana = Math.min(h.maxMana, h.mana + amt); AB.slow(t, h, 0.3, c.v('slow'));
        ch.data.fx = (ch.data.fx || 0) - dt;
        if (ch.data.fx <= 0) { ch.data.fx = 0.07; AB.beam(h.x, h.height * 0.6, h.z, t.x, t.height * 0.5, t.z, '#7c4dff', 0.2, 0.12); spawnP(t.x, t.height * 0.6, t.z, (h.x - t.x) * 1.5, 0.5, (h.z - t.z) * 1.5, 0.6, 0.18, '#b388ff', 0); }
      } },
    { id: 'finger', scepter: { desc: '伤害提升至 725/875/1025，冷却时间 60/45/30 秒。', cd: [60, 45, 30], values: { dmg: [725, 875, 1025] } }, key: 'R', name: '穿心幽魂刃', icon: '指', color: '#b71c1c', ult: true, target: 'unit', range: 14, castPoint: 0.3,
      mana: [200, 300, 400], cd: [90, 70, 50], values: { dmg: [600, 725, 850], delay: 0.25 },
      text: L => `终极技能：撕裂一名敌人的灵魂，${L.delay} 秒后造成 ${L.dmg} 点魔法伤害。`,
      onCast(c, t) {
        const h = c.caster;
        AB.beam(h.x, h.height * 0.6, h.z, t.x, t.height * 0.5, t.z, '#ff1744', 0.6, 0.5); AB.beam(h.x, h.height * 0.6, h.z, t.x, t.height * 0.5, t.z, '#e040fb', 0.25, 0.6);
        delay(c.v('delay'), () => { if (t.dead) return; AB.damage(h, t, c.v('dmg'), 'magic', 'finger', { big: true }); AB.burst(t.x, 1.5, t.z, 40, ['#ff1744', '#e040fb', '#4a148c'], 7, 0.8, 0.35, 4); });
      } },
  ],
});
