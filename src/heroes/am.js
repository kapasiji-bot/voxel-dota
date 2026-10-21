// heroes/am.js — 敌法师 Anti-Mage (melee agility). Mana Break (burn on hit), Blink, Counterspell (magic resistance + active
// spell reflect), Mana Void (damage from the target's missing mana, AoE).
const AM_SHIELD = { id: 'am_shield', name: '法术护盾', color: '#00c853', states: ['reflect'],
  fx(u) { if (Math.random() < 0.6) { const a = Math.random() * 6.283; spawnP(u.x + Math.cos(a) * 1.1, rnd(0.3, 3), u.z + Math.sin(a) * 1.1, 0, 0.5, 0, 0.3, 0.16, '#69f0ae'); } } };
registerHero({
  id: 'am', order: 8, name: '敌法师', title: '憎恶魔法者', type: '近战 · 敏捷', color: '#00695c', nameColor: '#64ffda',
  desc: '近战敏捷型英雄。每次攻击燃烧敌人魔法，闪烁神出鬼没，法术护盾反弹指向性法术，法力虚空让魔法枯竭的敌人付出代价。',
  ai: { build: ['phase', 'bfury', 'mkb', 'butterfly'], aggr: 1.5 },
  stats: { primary: 'agi', str: 21, strG: 1.8, agi: 24, agiG: 2.8, int: 12, intG: 1.8, dmg: 29, armor: 1, bat: 1.4, range: 2.6,
    atkPoint: 0.3, backswing: 0.6, speed: 7.5, proj: 0, hpRegen: 1.5, manaRegen: 0.6, radius: 0.65, height: 3.5 },
  portrait: { headY: 2.85 },
  model: () => humanoid({
    pants: '#3e2723', boots: '#212121', skin: '#c9a27e', sleeve: '#c9a27e', hip: 0.27, sh: 0.66, legH: 1.2, bodyH: 1.1, legW: 0.4,
    body: [[0, 0.5, 0, 0.88, 1.05, 0.55, '#c9a27e'], [0, 0.55, 0.28, 0.5, 0.7, 0.03, '#00897b'], [0, 0.12, 0, 0.94, 0.26, 0.6, '#4e342e'],
      [-0.5, 1.05, 0, 0.4, 0.3, 0.7, '#5d4037'], [0.5, 1.05, 0, 0.4, 0.3, 0.7, '#5d4037'],
      [0, 1.6, 0, 0.78, 0.8, 0.78, '#c9a27e'], [0, 1.72, 0.4, 0.62, 0.12, 0.03, '#004d40'], [-0.18, 1.62, 0.4, 0.14, 0.07, 0.02, '#00e676'], [0.18, 1.62, 0.4, 0.14, 0.07, 0.02, '#00e676'],
      [0, 2.05, -0.05, 0.84, 0.18, 0.84, '#6a1b9a'], [0, 2.4, -0.2, 0.3, 0.5, 0.3, '#6a1b9a'], [-0.44, 1.75, -0.05, 0.12, 0.28, 0.4, '#c9a27e'], [0.44, 1.75, -0.05, 0.12, 0.28, 0.4, '#c9a27e']],
    armR: [[0, -0.45, 0, 0.38, 0.95, 0.42, '#c9a27e'], [0, -0.85, 0, 0.42, 0.22, 0.46, '#5d4037'], [0, -1.0, 0.45, 0.12, 0.14, 0.9, '#3e2723']],
    armRGlow: [[0, -1.0, 1.05, 0.06, 0.55, 0.7, '#64ffda'], [0, -1.0, -0.15, 0.06, 0.45, 0.45, '#64ffda']],
    armL: [[0, -0.45, 0, 0.38, 0.95, 0.42, '#c9a27e'], [0, -0.85, 0, 0.42, 0.22, 0.46, '#5d4037'], [0, -1.0, 0.45, 0.12, 0.14, 0.9, '#3e2723']],
    armLGlow: [[0, -1.0, 1.05, 0.06, 0.55, 0.7, '#64ffda'], [0, -1.0, -0.15, 0.06, 0.45, 0.45, '#64ffda']],
  }),
  abilities: [
    { id: 'manabreak', key: 'Q', name: '法力损毁', icon: '损', color: '#1e88e5', passive: true, values: { burn: [25, 35, 45, 55], pct: 0.5 }, fmt: { pct: v => v * 100 + '%' },
      text: L => `被动：每次攻击燃烧目标 ${L.burn} 点魔法，并额外造成燃烧量 ${L.pct} 的物理伤害。`,
      onAttackLand(c, t) {
        if (t.isBuilding || !t.maxMana) return; const h = c.caster, b = AB.manaBurn(t, c.v('burn')); if (b <= 0) return;
        emit('manaBurn', { unit: h.id, target: t.id, amount: Math.round(b) });
        AB.damage(h, t, b * c.v('pct'), 'phys', 'manabreak', { silent: true });
        for (let i = 0; i < 5; i++) spawnP(t.x + rnd(-0.4, 0.4), t.height * rnd(0.4, 0.9), t.z + rnd(-0.4, 0.4), rnd(-2, 2), rnd(1, 3), rnd(-2, 2), 0.4, 0.18, '#448aff', -6);
      } },
    { id: 'amblink', ai: { escape: 'blink', engage: true }, key: 'W', name: '闪烁', icon: '烁', color: '#00bfa5', target: 'point', clampRange: true, range: [15, 18, 21, 24], castPoint: 0.25,
      mana: 60, cd: [12, 10, 8, 6],
      text: L => `瞬间传送到最远 ${L.range} 码外的目标位置。`,
      onCast(c, pt) { AB.teleport(c.caster, pt, { maxR: c.v('range'), colors: ['#64ffda', '#1de9b6', '#ffffff'] }); } },
    { id: 'counter', ai: { reflect: true }, keepInvis: true, key: 'E', name: '法术护盾', icon: '盾', color: '#00c853', target: 'none', castPoint: 0,
      mana: 50, cd: [15, 11, 7, 4], values: { res: [0.15, 0.22, 0.29, 0.36], dur: 1.2 }, fmt: { res: v => Math.round(v * 100) + '%' },
      text: L => `被动：增加 ${L.res} 魔法抗性。主动：${L.dur} 秒内反弹所有指向你的敌方单体法术（法术对你无效，转而作用于施法者）。`,
      passiveProps: c => ({ magicRes: c.v('res') }),
      onCast(c) { const h = c.caster; AB.addModifier(h, AM_SHIELD, h, { dur: c.v('dur') }); AB.ringP(h.x, h.z, 1.3, 24, ['#69f0ae', '#00e676'], 0.5, 0.3, 1.6); } },
    { id: 'void', ai: { killDmg: (h, ab, t) => (t.maxMana - t.mana) * lvVal(ab.def, 'mult', ab.lvl) * (1 - (t.magicRes || 0)) },
      scepter: { desc: '冷却时间降低为 50/40/30 秒，作用范围提升至 7 码。', cd: [50, 40, 30], values: { radius: 7 } }, key: 'R', name: '法力虚空', icon: '虚', color: '#2962ff', ult: true, target: 'unit', range: 12, castPoint: 0.3,
      mana: [100, 150, 200], cd: [70, 60, 50], values: { mult: [0.8, 0.95, 1.1], radius: 5, stun: 0.3 },
      text: L => `终极技能：对目标造成其已损失魔法值 × ${L.mult} 的魔法伤害，并波及其周围 ${L.radius} 码内的敌人；目标被眩晕 ${L.stun} 秒。`,
      onCast(c, t) {
        const h = c.caster, dmg = Math.max(0, (t.maxMana || 0) - (t.mana || 0)) * c.v('mult');
        AB.stun(t, h, c.v('stun'));
        for (const u of AB.enemiesIn(h, t.x, t.z, c.v('radius'))) AB.damage(h, u, dmg, 'magic', 'void', { big: u === t });
        emit('manaVoid', { unit: h.id, target: t.id, dmg: Math.round(dmg) });
        AB.burst(t.x, 2, t.z, 50, ['#2962ff', '#82b1ff', '#ffffff', '#304ffe'], 8, 0.8, 0.4, 3, 0); AB.ringP(t.x, t.z, 1, 40, ['#448aff', '#e3f2fd'], 0.5, 0.35, 0.5, 10);
      } },
  ],
});
