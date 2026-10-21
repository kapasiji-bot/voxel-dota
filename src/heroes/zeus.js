// heroes/zeus.js — 宙斯 Zeus (ranged intelligence). Arc Lightning chain, Lightning Bolt mini-stun, Static Field, Thundergod's Wrath (global).
registerHero({
  id: 'zeus', order: 4, name: '宙斯', title: '奥林匹斯之王', type: '远程 · 智力', color: '#0277bd', nameColor: '#80d8ff',
  desc: '远程智力型英雄。弧光闪电在敌群中跳跃，雷击精准打击并短暂眩晕，每次施法都会触发静电场，雷神之怒则轰击全图的敌方英雄。',
  ai: { build: ['arcane', 'euls', 'scepter', 'dagon', 'scythe'] },   // B7 bot build (ai/bot/shop.js)
  stats: { primary: 'int', str: 19, strG: 2.1, agi: 11, agiG: 1.2, int: 22, intG: 3.4, dmg: 21, armor: 1, bat: 1.7, range: 12,
    atkPoint: 0.45, backswing: 0.55, speed: 6.8, proj: 24, projColor: '#80d8ff', hpRegen: 1.0, manaRegen: 1.2, radius: 0.65, height: 3.4 },
  portrait: { headY: 2.8 },
  model: () => humanoid({
    pants: '#eceff1', boots: '#8d6e63', skin: '#f1c27d', sleeve: '#eceff1', hip: 0.26, sh: 0.64, legH: 1.15, bodyH: 1.1, legW: 0.38,
    body: [[0, 0.5, 0, 0.9, 1.1, 0.6, '#eceff1'], [0, 0.2, 0, 1.0, 0.5, 0.7, '#cfd8dc'], [0, 0.85, 0.31, 0.2, 0.7, 0.03, '#ffd54f'],
      [0, 1.1, 0, 0.96, 0.12, 0.66, '#ffd54f'], [-0.35, 0.8, 0.15, 0.4, 0.5, 0.4, '#ffd54f'],
      [0, 1.6, 0, 0.8, 0.8, 0.8, '#f1c27d'], [0, 2.02, 0, 0.84, 0.2, 0.84, '#fafafa'], [0, 1.3, 0.38, 0.72, 0.55, 0.2, '#fafafa'],
      [0, 1.0, 0.36, 0.5, 0.45, 0.12, '#fafafa'], [-0.42, 1.75, 0, 0.1, 0.5, 0.7, '#fafafa'], [0.42, 1.75, 0, 0.1, 0.5, 0.7, '#fafafa'],
      [-0.18, 1.7, 0.41, 0.14, 0.08, 0.02, '#1565c0'], [0.18, 1.7, 0.41, 0.14, 0.08, 0.02, '#1565c0'], [0, 1.82, 0.41, 0.6, 0.08, 0.02, '#e0e0e0']],
    bodyGlow: [[-0.25, 2.2, 0.1, 0.12, 0.25, 0.12, '#80d8ff'], [0.25, 2.2, 0.1, 0.12, 0.25, 0.12, '#80d8ff'], [0, 2.25, 0.2, 0.12, 0.3, 0.12, '#e1f5fe']],
    armLGlow: [[0, -1.0, 0.05, 0.32, 0.32, 0.32, '#40c4ff']], armRGlow: [[0, -1.0, 0.05, 0.32, 0.32, 0.32, '#40c4ff']],
  }),
  abilities: [
    { id: 'arc', key: 'Q', name: '弧光', icon: '弧', color: '#29b6f6', target: 'unit', range: 14, castPoint: 0.2,
      mana: [65, 70, 75, 80], cd: [1.6, 1.6, 1.6, 1.6], values: { dmg: [85, 100, 115, 145], jumps: [5, 7, 9, 15], radius: 6 },
      text: L => `释放一道在敌人之间跳跃的闪电，最多命中 ${L.jumps} 个单位，每个造成 ${L.dmg} 点魔法伤害（跳跃范围 ${L.radius} 码）。`,
      onCast(c, t) { const h = c.caster; AB.chain({ caster: h, first: t, jumps: c.v('jumps'), radius: c.v('radius'), delay: 0.1, ability: 'arc', color: '#80d8ff',
        onHit(u) { AB.damage(h, u, c.v('dmg'), 'magic', 'arc'); } }); } },
    { id: 'bolt', key: 'W', name: '雷击', icon: '雷', color: '#0288d1', target: 'unit', range: 14, castPoint: 0.3,
      mana: [100, 115, 130, 145], cd: [6, 6, 6, 6], values: { dmg: [120, 185, 250, 315], stun: 0.35 },
      text: L => `召唤雷电劈向一名敌人，造成 ${L.dmg} 点魔法伤害并使其眩晕 ${L.stun} 秒。`,
      onCast(c, t) { const h = c.caster; AB.skyBolt(t, '#81d4fa'); AB.damage(h, t, c.v('dmg'), 'magic', 'bolt', { big: true }); AB.stun(t, h, c.v('stun')); } },
    { id: 'static', key: 'E', name: '静电场', icon: '静', color: '#4fc3f7', passive: true,
      values: { pct: [0.04, 0.06, 0.08, 0.1], radius: 12 }, fmt: { pct: v => Math.round(v * 100) + '%' },
      text: L => `被动：每次施放技能时，对周围 ${L.radius} 码内所有敌人造成相当于其当前生命值 ${L.pct} 的魔法伤害。`,
      onAbilityCast(c) {
        const h = c.caster; emit('cast', { unit: h.id, ability: 'static', passive: true });
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) { AB.damage(h, u, u.hp * c.v('pct'), 'magic', 'static', { silent: true });
          for (let i = 0; i < 3; i++) spawnP(u.x + rnd(-0.4, 0.4), u.height * rnd(0.3, 1), u.z + rnd(-0.4, 0.4), rnd(-2, 2), rnd(0, 2), rnd(-2, 2), 0.25, 0.15, '#e1f5fe'); }
      } },
    { id: 'wrath', ai: { global: true }, scepter: { desc: '伤害提升至 400/500/600。', values: { dmg: [400, 500, 600] } }, key: 'R', name: '雷神之怒', icon: '怒', color: '#01579b', ult: true, target: 'none', castPoint: 0.4,
      mana: [225, 325, 425], cd: [90, 85, 80], values: { dmg: [300, 400, 500], near: 16 },
      text: L => `终极技能：雷电轰击全地图所有敌方英雄，以及友方英雄 ${L.near} 码内我方视野中可见的敌方单位（命中的英雄会暴露 1 秒），各造成 ${L.dmg} 点魔法伤害。`,
      onCast(c) {
        const h = c.caster, allies = units.filter(u => u.isHero && !u.dead && u.team === h.team), hit = [];
        for (const u of units) {
          if (u.dead || u.team === h.team || u.isBuilding || u.kind === 'fountain') continue;
          if (u.isHero || (canSee(h.team, u) && allies.some(a => dst(a, u) <= c.v('near')))) hit.push(u);   // heroes: global, even in fog / invisible
        }
        hit.forEach((u, i) => delay(i * 0.03, () => { if (u.dead) return; AB.skyBolt(u, '#b3e5fc'); AB.damage(h, u, c.v('dmg'), 'magic', 'wrath', { big: u.isHero }); if (u.isHero && !u.dead) AB.reveal(u, h, 1); }));
        AB.burst(h.x, 3, h.z, 40, ['#e1f5fe', '#4fc3f7', '#ffffff'], 6, 0.6, 0.3, 8, 0); AB.float(h, '雷神之怒！', '#80d8ff', 22, 1.3);
        emit('wrathTargets', { unit: h.id, n: hit.length, heroes: hit.filter(u => u.isHero).length });
      } },
  ],
});
