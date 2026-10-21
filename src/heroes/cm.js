// heroes/cm.js — 水晶室女 Crystal Maiden (ranged intelligence). Crystal Nova slow, Frostbite root+DoT, Arcane Aura, Freezing Field (channel).
const CM_FROSTBITE = Object.assign({}, MODS.frozen, { id: 'cm_frostbite', tick: 0.25,
  onTick(u, m) { AB.damage(m.src, u, m.data.dps * 0.25, 'magic', 'frostbite', { silent: m.data.n++ % 4 !== 0 }); } });
const CM_AURA = { id: 'cm_arcane', name: '奥术光环', color: '#4fc3f7' };
const CM_FIELD_ARMOR = { id: 'cm_field', name: '极寒领域', color: '#81d4fa' };

registerHero({
  id: 'cm', order: 5, name: '水晶室女', title: '莉莱', type: '远程 · 智力', color: '#0288d1', nameColor: '#b3e5fc',
  desc: '远程智力型辅助。冰霜新星减速敌群，冰封禁制将敌人冻在原地，奥术光环为队友回复魔法，极寒领域持续施法冰封整片区域。',
  stats: { primary: 'int', str: 18, strG: 2.2, agi: 16, agiG: 1.6, int: 16, intG: 3.3, dmg: 24, armor: 0, bat: 1.7, range: 12,
    atkPoint: 0.45, backswing: 0.5, speed: 6.6, proj: 22, projColor: '#b3e5fc', hpRegen: 0.8, manaRegen: 1.0, radius: 0.62, height: 3.3 },
  portrait: { headY: 2.7 },
  ai: { build: ['arcane', 'glimmer', 'force', 'scepter'], skills: [1, 0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 2] },   // optional bot hints
  model: () => humanoid({
    pants: '#e3f2fd', boots: '#1565c0', skin: '#fde0c5', sleeve: '#1976d2', hip: 0.24, sh: 0.58, legH: 1.15, bodyH: 1.05, legW: 0.34,
    body: [[0, 0.2, 0, 1.0, 0.6, 0.76, '#1976d2'], [0, 0.72, 0, 0.74, 0.9, 0.48, '#1e88e5'], [0, 0.0, 0, 1.08, 0.18, 0.84, '#ffffff'],
      [0, 1.12, 0, 0.9, 0.18, 0.62, '#ffffff'], [0, 0.85, -0.42, 0.9, 1.6, 0.14, '#0d47a1'],
      [0, 1.55, 0, 0.76, 0.76, 0.76, '#fde0c5'], [0, 1.6, -0.1, 0.92, 0.95, 0.75, '#1565c0'], [0, 2.02, 0.05, 0.92, 0.16, 0.92, '#1565c0'],
      [0, 1.58, 0.42, 0.8, 0.12, 0.06, '#ffffff'], [-0.3, 1.25, 0.36, 0.2, 0.5, 0.06, '#ffe082'], [0.3, 1.25, 0.36, 0.2, 0.5, 0.06, '#ffe082'],
      [-0.17, 1.55, 0.39, 0.13, 0.1, 0.02, '#0d47a1'], [0.17, 1.55, 0.39, 0.13, 0.1, 0.02, '#0d47a1']],
    armR: [[0, -0.45, 0, 0.36, 0.95, 0.4, '#1976d2'], [0, -0.85, 0, 0.34, 0.22, 0.38, '#fde0c5'], [0, -0.95, 0.15, 0.14, 0.14, 0.14, '#5d4037'],
      [0, -0.2, 0.25, 0.12, 2.4, 0.12, '#90a4ae']],
    armRGlow: [[0, 1.1, 0.25, 0.36, 0.5, 0.36, '#80d8ff'], [0, 1.45, 0.25, 0.16, 0.3, 0.16, '#e1f5fe']],
  }),
  abilities: [
    { id: 'nova', key: 'Q', name: '冰霜新星', icon: '星', color: '#4fc3f7', target: 'point', range: 14, castPoint: 0.3,
      mana: [100, 120, 140, 160], cd: [11, 10, 9, 8], values: { radius: 5, dmg: [100, 150, 200, 250], slow: [0.2, 0.3, 0.4, 0.5], dur: 4.5 }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `在目标区域爆发冰霜，对半径 ${L.radius} 码内的敌人造成 ${L.dmg} 点魔法伤害，并降低 ${L.slow} 移动和攻击速度，持续 ${L.dur} 秒。`,
      onCast(c, pt) {
        const h = c.caster;
        for (const u of AB.enemiesIn(h, pt.x, pt.z, c.v('radius'))) { AB.damage(h, u, c.v('dmg'), 'magic', 'nova'); AB.slow(u, h, c.v('dur'), c.v('slow'), c.v('slow')); }
        AB.ringP(pt.x, pt.z, 0.6, 40, ['#e1f5fe', '#81d4fa', '#ffffff'], 0.45, 0.3, 0.4, c.v('radius') / 0.45);
        for (let i = 0; i < 50; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * c.v('radius'); spawnP(pt.x + Math.cos(a) * r, rnd(0, 0.5), pt.z + Math.sin(a) * r, 0, rnd(3, 8), 0, rnd(0.4, 0.8), rnd(0.25, 0.5), ['#ffffff', '#b3e5fc', '#4fc3f7'][i % 3]); }
      } },
    { id: 'frostbite', ai: { disable: true }, key: 'W', name: '冰封禁制', icon: '冰', color: '#0288d1', target: 'unit', range: 11, castPoint: 0.3,
      mana: [140, 145, 150, 155], cd: [9, 8, 7, 6], values: { dmg: [150, 200, 250, 300], dur: [1.5, 2, 2.5, 3], durCreep: 5 },
      text: L => `将一名敌人冰封，${L.dur} 秒内无法移动和攻击（对小兵 ${L.durCreep} 秒），期间共受到 ${L.dmg} 点魔法伤害。`,
      onCast(c, t) {
        const dur = t.isHero ? c.v('dur') : c.v('durCreep');
        AB.addModifier(t, CM_FROSTBITE, c.caster, { dur, data: { dps: c.v('dmg') / c.v('dur'), n: 0 } });
        AB.burst(t.x, 1.5, t.z, 20, ['#e1f5fe', '#4fc3f7', '#ffffff'], 4, 0.6, 0.3, 2, 0);
      } },
    { id: 'arcane', key: 'E', name: '奥术光环', icon: '光', color: '#29b6f6', passive: true, values: { regen: [1, 1.5, 2, 2.5], radius: 60 },
      aura: { radius: 60, heroesOnly: true, mod: CM_AURA, props: (c, u) => ({ manaRegen: c.v('regen') * (u === c.caster ? 2 : 1) }) },
      text: L => `被动光环：使 ${L.radius} 码内的友方英雄每秒额外回复 ${L.regen} 点魔法（水晶室女自身效果翻倍）。` },
    { id: 'field', scepter: { desc: '冰爆伤害提升至 105/165/225。', values: { dmg: [105, 165, 225] } }, key: 'R', name: '极寒领域', icon: '寒', color: '#01579b', ult: true, target: 'none', castPoint: 0.3, channel: 6,
      mana: [200, 400, 600], cd: [110, 100, 90], values: { radius: 9, dmg: [70, 110, 150], boom: 2.5, slow: 0.3, armor: 20 }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `终极技能（持续施法 6 秒）：在周围 ${L.radius} 码内不断引发冰爆，每次对 ${L.boom} 码内敌人造成 ${L.dmg} 点魔法伤害；区域内敌人减速 ${L.slow}。施法期间获得 ${L.armor} 点护甲。移动或被眩晕会打断。`,
      onChannelStart(c) { AB.addModifier(c.caster, CM_FIELD_ARMOR, c.caster, { dur: 7, props: { armor: c.v('armor') } }); },
      onChannelTick(c, t, dt, ch) {
        const h = c.caster, R = c.v('radius'), d = ch.data; d.b = (d.b || 0) + dt; d.s = (d.s || 0) + dt;
        for (let i = 0; i < 4; i++) spawnP(h.x + rnd(-R, R), rnd(6, 10), h.z + rnd(-R, R), rnd(-1, 1), -rnd(4, 8), rnd(-1, 1), 1.4, 0.18, '#ffffff', 0);
        if (d.s >= 0.25) { d.s = 0; for (const u of AB.enemiesIn(h, h.x, h.z, R)) AB.slow(u, h, 1, c.v('slow'), c.v('slow')); }
        while (d.b >= 0.15) {
          d.b -= 0.15; d.n = (d.n || 0) + 1;
          // alternate: random spot in the ring / spot near a random enemy inside the field (keeps hits frequent like DOTA's quadrant pattern)
          const foes = d.n % 2 ? AB.enemiesIn(h, h.x, h.z, R) : [], f = foes.length ? foes[(Math.random() * foes.length) | 0] : null;
          const a = Math.random() * 6.28, r = rnd(2.5, R), x = f ? f.x + rnd(-1.5, 1.5) : h.x + Math.cos(a) * r, z = f ? f.z + rnd(-1.5, 1.5) : h.z + Math.sin(a) * r;
          for (const u of AB.enemiesIn(h, x, z, c.v('boom'))) AB.damage(h, u, c.v('dmg'), 'magic', 'field', { silent: true });
          AB.burst(x, 0.6, z, 12, ['#ffffff', '#b3e5fc', '#4fc3f7'], 5, 0.5, 0.35, 4, -4); AB.ringP(x, z, 0.4, 10, ['#e1f5fe'], 0.3, 0.25, 0.2, 6);
        }
      },
      onChannelEnd(c) { removeModById(c.caster, CM_FIELD_ARMOR.id); } },
  ],
});
