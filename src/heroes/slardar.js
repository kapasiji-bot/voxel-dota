// heroes/slardar.js — 斯拉达 Slardar (melee strength). Guardian Sprint (self haste), Slithereen Crush (AoE stun+slow),
// Bash of the Deep (passive bash stacks), Corrosive Haze (armor crush + reveal).
const SLAR_SPRINT = { id: 'slar_sprint', name: '冲刺', color: '#29b6f6',
  fx(u) { if (Math.random() < 0.4) spawnP(u.x + rnd(-0.4, 0.4), rnd(0.2, 1.5), u.z + rnd(-0.4, 0.4), rnd(-2, 2), 0.4, rnd(-2, 2), 0.35, 0.18, '#81d4fa'); } };
const SLAR_CRUSH = { id: 'slar_crush', tag: '碎击缓', color: '#0288d1', debuff: true };
const SLAR_HAZE = { id: 'slar_haze', tag: '腐蚀雾霾', color: '#006064', debuff: true, reveal: true,
  fx(u) { if (Math.random() < 0.3) spawnP(u.x + rnd(-0.5, 0.5), rnd(0.5, 2), u.z + rnd(-0.5, 0.5), 0, 0.5, 0, 0.5, 0.16, '#4db6ac'); } };
registerHero({
  id: 'slardar', order: 33, name: '斯拉达', title: '斯拉达', type: '近战 · 力量', color: '#01579b', nameColor: '#4fc3f7',
  desc: '近战力量型先手。守卫冲刺疾跑，鱼人碎击范围眩晕并减速，野性穿刺被动重击，腐蚀雾霾破甲并显影。',
  ai: { role: 'tank', aggr: 1.2, skills: [1, 2, 1, 0, 1, 3, 1, 2, 2, 2, 3, 0, 0, 0, 3], build: ['phase', 'blink', 'assault', 'vanguard', 'heart'],
    combos: [{ id: 'slar_crush_haze', steps: [{ slot: 1 }, { slot: 3, at: 'target' }], min: 1, radius: 4 }] },
  stats: { primary: 'str', str: 21, strG: 3.6, agi: 17, agiG: 2.4, int: 15, intG: 1.5, dmg: 28, armor: 2, bat: 1.7, range: 2.6,
    atkPoint: 0.36, backswing: 0.64, speed: 7.1, proj: 0, hpRegen: 1.2, manaRegen: 0.5, radius: 0.7, height: 3.3 },
  portrait: { headY: 2.75 },
  model: () => humanoid({ pants: '#006064', boots: '#004d40', skin: '#26a69a', sleeve: '#0277bd', hip: 0.3, sh: 0.75, legH: 1.1, bodyH: 1.15, legW: 0.42,
    body: [[0, 0.52, 0, 1.05, 1.15, 0.75, '#0277bd'], [0, 0.55, 0.38, 0.55, 0.45, 0.04, '#4fc3f7'], [0, 0.08, 0, 1.15, 0.28, 0.85, '#004d40'],
      [0, 1.6, 0, 0.85, 0.8, 0.85, '#26a69a'], [0, 1.95, 0, 1.0, 0.35, 0.9, '#01579b'], [0, 1.7, 0.42, 0.65, 0.2, 0.04, '#004d40'],
      [-0.35, 2.05, 0.2, 0.3, 0.25, 0.5, '#4fc3f7'], [0.35, 2.05, 0.2, 0.3, 0.25, 0.5, '#4fc3f7'], [0, 1.05, -0.45, 0.9, 1.3, 0.15, '#006064']],
    armR: [[0, -0.45, 0, 0.4, 0.95, 0.44, '#0277bd'], [0, -0.92, 0, 0.42, 0.26, 0.46, '#26a69a'],
      [0, -1.0, 0.4, 0.35, 0.35, 0.7, '#455a64']],
    armL: [[0, -0.45, 0, 0.4, 0.95, 0.44, '#0277bd'], [0, -0.92, 0, 0.42, 0.26, 0.46, '#26a69a']] }),
  abilities: [
    { id: 'guardian_sprint', ai: { escape: 'aoe', engage: true }, shard: { desc: '冲刺移速 +10%，持续 +1 秒。', values: { ms: [0.35, 0.45, 0.55, 0.65], dur: 11 } },
      key: 'Q', name: '守卫冲刺', icon: '冲', color: '#29b6f6', target: 'none', castPoint: 0,
      mana: 25, cd: [20, 18, 16, 14], values: { ms: [0.25, 0.35, 0.45, 0.55], dur: 10 },
      fmt: { ms: v => Math.round(v * 100) + '%' },
      text: L => `进入冲刺状态 ${L.dur} 秒，移动速度提升 ${L.ms}。`,
      onCast(c) { const h = c.caster; AB.addModifier(h, SLAR_SPRINT, h, { dur: c.v('dur'), props: { msPct: c.v('ms') } });
        AB.ringP(h.x, h.z, 0.4, 20, ['#4fc3f7', '#ffffff'], 0.4, 0.28, 0.5, 8); AB.float(h, '冲刺！', '#4fc3f7', 16, 1); emit('guardianSprint', { unit: h.id }); } },
    { id: 'slithereen_crush', ai: { disable: true, selfAoe: true }, key: 'W', name: '鱼人碎击', icon: '碎', color: '#0288d1', target: 'none', castPoint: 0.25,
      mana: [80, 95, 110, 125], cd: [8, 7.5, 7, 6.5], values: { radius: 5, dmg: [80, 140, 200, 260], stun: [1.2, 1.4, 1.6, 1.8], slow: 0.2, slowDur: 2 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `猛砸地面，对周围 ${L.radius} 码敌人造成 ${L.dmg} 点物理伤害并眩晕 ${L.stun} 秒；结束后再减速 ${L.slow}，持续 ${L.slowDur} 秒。`,
      onCast(c) { const h = c.caster;
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) {
          if (u.isBuilding) continue;
          AB.damage(h, u, c.v('dmg'), 'phys', 'slithereen_crush'); AB.stun(u, h, c.v('stun'));
          delay(c.v('stun'), () => { if (!u.dead) AB.addModifier(u, SLAR_CRUSH, h, { dur: c.v('slowDur'), props: { msPct: -c.v('slow') } }); });
        }
        AB.ringP(h.x, h.z, 0.5, 32, ['#0288d1', '#4fc3f7', '#e1f5fe'], 0.45, 0.35, 0.55, c.v('radius') / 0.45);
        emit('slithereenCrush', { unit: h.id }); } },
    { id: 'bash_deep', key: 'E', name: '野性穿刺', icon: '刺', color: '#006064', passive: true,
      values: { stacks: 3, stun: [1.0, 1.1, 1.2, 1.3], dmg: [50, 75, 100, 125] },
      text: L => `被动：攻击累积层数，达到 ${L.stacks} 层时触发穿刺：造成 ${L.dmg} 点物理伤害并眩晕 ${L.stun} 秒（对建筑无效）。`,
      onAttackLand(c, t) {
        if (t.isBuilding) return; const h = c.caster; h._bashSt = (h._bashSt || 0) + 1;
        if (h._bashSt < c.v('stacks')) return; h._bashSt = 0;
        AB.stun(t, h, c.v('stun')); AB.damage(h, t, c.v('dmg'), 'phys', 'bash_deep');
        AB.burst(t.x, 1.2, t.z, 14, ['#4fc3f7', '#006064', '#ffffff'], 4, 0.4, 0.25, 2, 0);
        emit('bashDeep', { unit: h.id, target: t.id }); } },
    { id: 'corrosive_haze', ai: { debuffId: 'slar_haze' },
      scepter: { desc: '护甲降低 +5，持续时间 +5 秒。', values: { armor: [15, 20, 25], dur: [23, 23, 23] } },
      key: 'R', name: '腐蚀雾霾', icon: '霾', color: '#004d40', ult: true, target: 'unit', range: 12, castPoint: 0.2,
      mana: [25, 25, 25], cd: [5, 5, 5], values: { armor: [10, 15, 20], dur: 18 },
      text: L => `终极技能：覆盖目标腐蚀雾霾，降低 ${L.armor} 点护甲并提供真实视域（显隐），持续 ${L.dur} 秒。`,
      onCast(c, t) { const h = c.caster;
        AB.addModifier(t, SLAR_HAZE, h, { dur: c.v('dur'), props: { armor: -c.v('armor') } });
        AB.burst(t.x, 1.5, t.z, 22, ['#26a69a', '#004d40', '#4fc3f7'], 5, 0.5, 0.28, 2, 0);
        AB.float(t, '破甲！', '#4db6ac', 16, 1); emit('corrosiveHaze', { unit: h.id, target: t.id }); } },
  ],
});
