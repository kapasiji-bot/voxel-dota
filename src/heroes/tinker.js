// heroes/tinker.js — 修补匠 Tinker (ranged intelligence). Laser (blind+dmg), Heat-Seeking Missile,
// Defense Matrix (magic absorb on ally), Rearm (channel: reset ability/item CDs).
const TINK_BLIND = { id: 'tink_blind', tag: '致盲', color: '#ffeb3b', debuff: true };
const TINK_MATRIX = { id: 'tink_matrix', name: '防御矩阵', color: '#26c6da', absorb: 'magic',
  fx(u) { if (Math.random() < 0.35) { const a = Math.random() * 6.28; spawnP(u.x + Math.cos(a) * 1.1, rnd(0.4, 2.2), u.z + Math.sin(a) * 1.1, 0, 0.6, 0, 0.4, 0.18, '#80deea'); } } };
registerHero({
  id: 'tinker', order: 41, name: '修补匠', title: '波希', type: '远程 · 智力', color: '#00838f', nameColor: '#4dd0e1',
  desc: '远程智力型爆发。激光致盲，热导飞弹追踪英雄，防御矩阵吸收魔法，再装填重置冷却持续轰炸。',
  ai: { role: 'carry', aggr: 1.1, skills: [0, 1, 0, 2, 0, 3, 0, 1, 1, 1, 3, 2, 2, 2, 3], build: ['arcane', 'blink', 'dagon', 'bloodstone', 'scepter'],
    combos: [{ id: 'tinker_laser_missile', steps: [{ slot: 0 }, { slot: 1 }], min: 1, radius: 10 }] },
  stats: { primary: 'int', str: 17, strG: 2.2, agi: 13, agiG: 1.2, int: 28, intG: 3.5, dmg: 22, armor: 2, bat: 1.7, range: 11,
    atkPoint: 0.35, backswing: 0.65, speed: 6.7, proj: 22, projColor: '#4dd0e1', hpRegen: 0.75, manaRegen: 1.2, radius: 0.58, height: 3.0 },
  portrait: { headY: 2.5 },
  model: () => humanoid({ pants: '#37474f', boots: '#263238', skin: '#ffe0b2', sleeve: '#00838f', hip: 0.22, sh: 0.55, legH: 0.95, bodyH: 0.95, legW: 0.32,
    body: [[0, 0.45, 0, 0.85, 0.95, 0.55, '#00838f'], [0, 0.5, 0.28, 0.5, 0.4, 0.04, '#4dd0e1'], [0, 0.08, 0, 0.95, 0.22, 0.6, '#006064'],
      [0, 1.35, 0, 0.7, 0.7, 0.7, '#ffe0b2'], [0, 1.7, -0.05, 0.95, 0.45, 0.95, '#455a64'], [0, 2.05, 0.1, 0.55, 0.25, 0.7, '#90a4ae'],
      [-0.35, 1.85, 0.15, 0.35, 0.35, 0.35, '#ffeb3b'], [0.35, 1.85, 0.15, 0.35, 0.35, 0.35, '#ffeb3b'],
      [-0.16, 1.42, 0.38, 0.12, 0.08, 0.02, '#263238'], [0.16, 1.42, 0.38, 0.12, 0.08, 0.02, '#263238']],
    bodyGlow: [[-0.35, 1.85, 0.35, 0.2, 0.2, 0.05, '#fff59d'], [0.35, 1.85, 0.35, 0.2, 0.2, 0.05, '#fff59d'], [0, 0.7, 0.3, 0.4, 0.35, 0.04, '#80deea']],
    armR: [[0, -0.4, 0, 0.32, 0.85, 0.34, '#00838f'], [0, -0.85, 0, 0.5, 0.35, 0.5, '#455a64'], [0, -0.95, 0.35, 0.25, 0.25, 0.55, '#4dd0e1']],
    armL: [[0, -0.4, 0, 0.32, 0.85, 0.34, '#00838f'], [0, -0.85, 0, 0.34, 0.2, 0.36, '#ffe0b2']] }),
  abilities: [
    { id: 'laser', ai: { nuke: true, disable: true }, shard: { desc: '激光伤害 +40，致盲 +0.5 秒。', values: { dmg: [120, 200, 280, 360], dur: [3.5, 4, 4.5, 5] } },
      key: 'Q', name: '激光', icon: '光', color: '#ffeb3b', target: 'unit', range: 11, castPoint: 0.4,
      mana: [95, 110, 125, 140], cd: [20, 18, 16, 14], values: { dmg: [80, 160, 240, 320], miss: 1.0, dur: [3, 3.5, 4, 4.5] },
      fmt: { miss: v => Math.round(v * 100) + '%' },
      text: L => `发射激光，造成 ${L.dmg} 点纯粹伤害，并使目标攻击 ${L.miss} 落空，持续 ${L.dur} 秒。`,
      onCast(c, t) {
        const h = c.caster;
        AB.beam(h.x, h.height * 0.7, h.z, t.x, t.height * 0.5, t.z, '#ffeb3b', 0.35, 0.4);
        AB.beam(h.x, h.height * 0.7, h.z, t.x, t.height * 0.5, t.z, '#ffffff', 0.12, 0.35);
        AB.damage(h, t, c.v('dmg'), 'pure', 'laser', { big: true });
        AB.addModifier(t, TINK_BLIND, h, { dur: c.v('dur'), props: { miss: c.v('miss') } });
        AB.burst(t.x, 1.4, t.z, 18, ['#ffeb3b', '#ffffff', '#ffc107'], 5, 0.45, 0.25, 2, 0);
        emit('laser', { unit: h.id, target: t.id });
      } },
    { id: 'heat_missile', ai: { nuke: true, aoe: 2 }, key: 'W', name: '热导飞弹', icon: '弹', color: '#ef5350', target: 'none', castPoint: 0,
      mana: [80, 100, 120, 140], cd: [18, 16, 14, 12], values: { dmg: [125, 200, 275, 350], count: [2, 2, 2, 2], range: 40 },
      text: L => `发射 ${L.count} 枚热导飞弹，各自追踪 ${L.range} 码内最近的敌方英雄，造成 ${L.dmg} 点魔法伤害。`,
      onCast(c) {
        const h = c.caster, n = c.v('count'), dmg = c.v('dmg'), R = c.v('range');
        const foes = G.heroes.filter(u => !u.dead && u.team !== h.team && !u.isIllusion && dst(u, h) <= R && canSee(h.team, u))
          .sort((a, b) => dst(a, h) - dst(b, h));
        const targets = [];
        for (let i = 0; i < n; i++) targets.push(foes[i % Math.max(1, foes.length)]);
        if (!foes.length) { AB.float(h, '无目标', '#ef9a9a', 14, 0.8); AB.ringP(h.x, h.z, 1, 16, ['#ef5350'], 0.3, 0.2, 0.3); emit('heatMissile', { unit: h.id, n: 0 }); return; }
        targets.slice(0, n).forEach((t, i) => {
          AB.delay(i * 0.12, () => {
            if (t.dead) return;
            AB.projectile({ src: h, target: t, speed: 18, color: '#ef5350', size: 0.55, trail: '#ffcdd2', onHit(u) {
              AB.damage(h, u, dmg, 'magic', 'heat_missile');
              AB.burst(u.x, 1.3, u.z, 14, ['#ef5350', '#ffffff'], 4, 0.4, 0.25, 2, 0);
            } });
          });
        });
        emit('heatMissile', { unit: h.id, n: Math.min(n, foes.length) });
      } },
    { id: 'defense_matrix', ai: { allyBuff: true }, key: 'E', name: '防御矩阵', icon: '阵', color: '#26c6da', target: 'unit', targetTeam: 'ally', range: 12, castPoint: 0.2,
      mana: [80, 95, 110, 125], cd: [16, 14, 12, 10], values: { absorb: [100, 180, 260, 340], status: 0.3, dur: 12 },
      fmt: { status: v => Math.round(v * 100) + '%' },
      text: L => `为一名友军施加防御矩阵 ${L.dur} 秒：吸收 ${L.absorb} 点魔法伤害，并降低 ${L.status} 受到的负面状态时间。`,
      onCast(c, t) {
        removeModById(t, 'tink_matrix');
        AB.addModifier(t, TINK_MATRIX, c.caster, { dur: c.v('dur'), data: { left: c.v('absorb'), statusRed: c.v('status') } });
        AB.burst(t.x, 1.5, t.z, 20, ['#4dd0e1', '#ffffff', '#00acc1'], 5, 0.5, 0.3, 2, 0);
        AB.ringP(t.x, t.z, 0.5, 18, ['#80deea', '#e0f7fa'], 0.4, 0.25, 0.4, 6);
        emit('defenseMatrix', { unit: c.caster.id, target: t.id });
      } },
    { id: 'rearm', ai: { skip: true },
      scepter: { desc: '再装填引导时间缩短至 1.5/0.75/0 秒。', channel: [1.5, 0.75, 0.01] },
      key: 'R', name: '再装填', icon: '装', color: '#006064', ult: true, target: 'none', castPoint: 0,
      channel: [3.0, 1.5, 0.75], mana: [100, 150, 200], cd: [0, 0, 0],
      text: L => `终极技能（持续施法）：重置修补匠所有技能与物品的冷却时间。引导时间随等级缩短。`,
      onChannelEnd(c, t, interrupted) {
        if (interrupted) return;
        const h = c.caster;
        for (const ab of h.abilities) if (ab.def.id !== 'rearm') { ab.cd = 0; ab.cdMax = 0; }
        for (const it of h.items) if (it) {
          it.cd = 0;
          if (it.def.heroCd && h.icd) h.icd[it.id] = 0;
        }
        AB.burst(h.x, 1.5, h.z, 28, ['#4dd0e1', '#ffffff', '#00838f'], 7, 0.55, 0.3, 3, 0);
        AB.ringP(h.x, h.z, 0.5, 24, ['#26c6da', '#e0f7fa'], 0.45, 0.3, 0.5, 8);
        AB.float(h, '再装填！', '#4dd0e1', 20, 1.1);
        emit('rearm', { unit: h.id });
      } },
  ],
});
