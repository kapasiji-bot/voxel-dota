// heroes/lina.js — 莉娜 Lina (ranged intelligence). Self-contained: stats + voxel model + abilities.
const LINA_FIERY = { id: 'lina_fiery', name: '炽魂', color: '#e65100', maxStacks: 3, stackProps: true,
  fx(u) { if (Math.random() < 0.3) spawnP(u.x + rnd(-0.5, 0.5), rnd(1, 2.5), u.z + rnd(-0.5, 0.5), 0, rnd(1, 3), 0, 0.5, 0.2, '#ff8f00'); } };

registerHero({
  id: 'lina', order: 2, name: '莉娜', title: '秀逗魔导士', type: '远程 · 智力', color: '#e65100', nameColor: '#ffab40',
  desc: '远程智力型英雄。龙破斩与光击阵能瞬间清空兵线，炽魂让她越战越快，神灭斩则造成毁灭性的单体伤害。',
  ai: { build: ['arcane', 'euls', 'dagon', 'scepter', 'scythe'] },   // B7 bot build (ai/bot/shop.js)
  stats: { primary: 'int', str: 18, strG: 2.4, agi: 23, agiG: 2.0, int: 30, intG: 3.7, dmg: 22, armor: 0, bat: 1.6, range: 12.5,
    atkPoint: 0.45, backswing: 0.6, speed: 6.8, proj: 22, projColor: '#ffab40', hpRegen: 1.2, manaRegen: 1.2, radius: 0.65, height: 3.3 },
  portrait: { headY: 2.75 },
  model: () => humanoid({
    pants: '#f2c9a0', boots: '#8a1f10', skin: '#f2c9a0', hip: 0.24, sh: 0.6, legH: 1.2, bodyH: 1.05, legW: 0.34,
    sleeve: '#f08a24',
    body: [[0, 0.18, 0, 0.98, 0.55, 0.72, '#e8641c'], [0, 0.72, 0, 0.74, 0.9, 0.48, '#f39a2c'], [0, 0.5, 0.25, 0.76, 0.12, 0.04, '#b71c1c'],
      [0, 1.55, 0, 0.78, 0.78, 0.78, '#f2c9a0'], [0, 1.95, -0.02, 0.88, 0.32, 0.88, '#d6261a'], [0, 1.4, -0.4, 0.9, 1.1, 0.18, '#d6261a'],
      [-0.42, 1.55, 0, 0.12, 0.7, 0.7, '#d6261a'], [0.42, 1.55, 0, 0.12, 0.7, 0.7, '#d6261a'], [0, 0.85, -0.5, 0.6, 1.2, 0.16, '#c41f14'],
      [-0.18, 1.58, 0.4, 0.14, 0.12, 0.02, '#3a1a0a'], [0.18, 1.58, 0.4, 0.14, 0.12, 0.02, '#3a1a0a'], [0, 1.85, 0.4, 0.7, 0.14, 0.04, '#d6261a']],
    bodyGlow: [[-0.3, 2.22, 0, 0.22, 0.32, 0.22, '#ff7a1f'], [0.3, 2.2, 0.05, 0.2, 0.3, 0.2, '#ff7a1f'], [0, 2.25, -0.2, 0.2, 0.36, 0.2, '#ffb000']],
    armLGlow: [[0, -1.08, 0.08, 0.3, 0.3, 0.3, '#ffb300']], armRGlow: [[0, -1.08, 0.08, 0.3, 0.3, 0.3, '#ffb300']],
  }),
  abilities: [
    { id: 'slave', key: 'Q', name: '龙破斩', icon: '龙', color: '#ef6c00', target: 'direction', castPoint: 0.2,
      mana: [90, 100, 110, 120], cd: [10, 9, 8, 7], values: { dmg: [85, 160, 235, 310], len: 20, speed: 30, w0: 3, w1: 5 },
      text: L => `向指定方向释放一道龙形火焰波，长度 ${L.len} 码，对沿途所有敌人造成 ${L.dmg} 点魔法伤害。`,
      onCast(c, pt) {
        const h = c.caster, dmg = c.v('dmg');
        AB.lineWave({ caster: h, x: h.x, z: h.z, dir: AB.dir(h, pt), len: c.v('len'), speed: c.v('speed'), w0: c.v('w0'), w1: c.v('w1'),
          onHit(u) { AB.damage(h, u, dmg, 'magic', 'slave'); AB.burst(u.x, 1.5, u.z, 6, ['#ff6d00', '#ffab00'], 3, 0.4, 0.3, 2, 0); } });
      } },
    { id: 'lsa', key: 'W', name: '光击阵', icon: '光', color: '#fbc02d', target: 'point', range: 13, castPoint: 0.2,
      mana: [100, 110, 120, 130], cd: 7, values: { radius: 4.5, delay: 0.5, dmg: [80, 120, 160, 200], stun: [1.6, 1.9, 2.2, 2.5] },
      text: L => `在目标区域召唤一道火柱，${L.delay} 秒后对半径 ${L.radius} 码内的敌人造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒。`,
      onCast(c, pt) {
        const h = c.caster, dmg = c.v('dmg'), stun = c.v('stun'), r = c.v('radius');
        AB.delayedArea({ caster: h, x: pt.x, z: pt.z, radius: r, delay: c.v('delay'), onLand(hit) {
          for (const u of hit) { AB.damage(h, u, dmg, 'magic', 'lsa'); AB.stun(u, h, stun); }
          for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * r; spawnP(pt.x + Math.cos(a) * rr, rnd(0, 1), pt.z + Math.sin(a) * rr, 0, rnd(6, 16), 0, rnd(0.4, 0.9), rnd(0.3, 0.7), ['#ffffff', '#fff59d', '#ffd740', '#ff9100', '#ff3d00'][i % 5]); }
          AB.burst(pt.x, 0.5, pt.z, 30, ['#ff6d00', '#ffab00'], 10, 0.7, 0.4, 2, -6);
        } });
      } },
    { id: 'fiery', key: 'E', name: '炽魂', icon: '魂', color: '#d84315', passive: true,
      values: { as: [40, 55, 70, 85], ms: [0.05, 0.06, 0.07, 0.08], max: 3, dur: 10 }, fmt: { ms: v => Math.round(v * 100) + '%' },
      text: L => `被动：每次施放技能获得一层炽魂（最多 ${L.max} 层，持续 ${L.dur} 秒），每层提升 ${L.as} 点攻击速度和 ${L.ms} 移动速度。`,
      onAbilityCast(c) { AB.addModifier(c.caster, LINA_FIERY, c.caster, { dur: c.v('dur'), props: { as: c.v('as'), msPct: c.v('ms') } }); } },
    { id: 'laguna', scepter: { desc: '神灭斩造成纯粹伤害，施法距离提升至 14 码。', range: 14, values: { pure: 1 } }, key: 'R', name: '神灭斩', icon: '灭', color: '#c62828', ult: true, target: 'unit', range: 12, castPoint: 0.3,
      mana: [150, 250, 350], cd: [40, 35, 30], values: { dmg: [450, 675, 950], delay: 0.25 },
      text: L => `终极技能：向一名敌人释放巨大的雷电光束，${L.delay} 秒后造成 ${L.dmg} 点魔法伤害。`,
      onCast(c, t) {
        const h = c.caster, dmg = c.v('dmg');
        const hx = h.x + Math.sin(h.facing) * 0.6, hz = h.z + Math.cos(h.facing) * 0.6, ty = t.height * 0.5;
        AB.beam(hx, 2.4, hz, t.x, ty, t.z, '#ff3d00', 1.3, 0.7); AB.beam(hx, 2.4, hz, t.x, ty, t.z, '#ffffff', 0.5, 0.6);
        for (let i = 0; i < 30; i++) { const k = Math.random(); spawnP(hx + (t.x - hx) * k, 2.4 + (ty - 2.4) * k, hz + (t.z - hz) * k, rnd(-2, 2), rnd(-2, 2), rnd(-2, 2), rnd(0.3, 0.7), rnd(0.2, 0.45), ['#ffffff', '#ffccbc', '#ff3d00'][i % 3]); }
        AB.delay(c.v('delay'), () => { if (!t.dead) { AB.damage(h, t, dmg, c.v('pure') ? 'pure' : 'magic', 'laguna', { big: true }); AB.burst(t.x, ty, t.z, 40, ['#ffffff', '#ff3d00', '#ffab00'], 8, 0.8, 0.4, 3); } });
      } },
  ],
});
