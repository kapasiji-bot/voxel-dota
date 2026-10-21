// heroes/sven.js — 斯温 Sven (melee strength). Storm Hammer AoE stun, Great Cleave, Warcry, God's Strength.
const SVEN_WARCRY = { id: 'sven_warcry', name: '战吼', color: '#1e88e5',
  fx(u) { if (Math.random() < 0.25) spawnP(u.x + rnd(-0.6, 0.6), rnd(0.5, 2.5), u.z + rnd(-0.6, 0.6), 0, 1.2, 0, 0.5, 0.18, '#64b5f6'); } };
const SVEN_GODS = { id: 'sven_gods', name: '神之力量', color: '#d50000',
  onApply(u) { if (u.model) u.model.scale.setScalar(1.18); }, onRemove(u) { if (u.model) u.model.scale.setScalar(1); },
  fx(u) { if (Math.random() < 0.6) spawnP(u.x + rnd(-0.8, 0.8), rnd(0.3, 3.5), u.z + rnd(-0.8, 0.8), 0, rnd(1, 3), 0, 0.5, 0.25, Math.random() < 0.5 ? '#ff1744' : '#ff8a80'); } };

registerHero({
  id: 'sven', order: 3, name: '斯温', title: '流浪剑客', type: '近战 · 力量', color: '#1565c0', nameColor: '#82b1ff',
  desc: '近战力量型英雄。风暴之锤眩晕成群敌人，巨力挥击让每一剑都横扫一片，神之力量开启后伤害惊人。',
  ai: { build: ['phase', 'bkb', 'daedalus', 'heart'] },   // B7 bot build (ai/bot/shop.js)
  stats: { primary: 'str', str: 23, strG: 3.2, agi: 21, agiG: 2.0, int: 16, intG: 1.3, dmg: 31, armor: 1, bat: 1.8, range: 2.6,
    atkPoint: 0.4, backswing: 0.4, speed: 7.2, proj: 0, hpRegen: 2.0, manaRegen: 0.6, radius: 0.75, height: 3.7 },
  portrait: { headY: 3.05 },
  model: () => humanoid({
    pants: '#263238', boots: '#37474f', skin: '#e0ac69', sleeve: '#546e7a', hip: 0.34, sh: 0.9, legH: 1.25, bodyH: 1.3, legW: 0.5,
    body: [[0, 0.65, 0, 1.3, 1.3, 0.8, '#546e7a'], [0, 0.65, 0.41, 0.9, 0.9, 0.04, '#78909c'], [0, 0.65, 0.44, 0.3, 0.5, 0.04, '#ffca28'],
      [0, 0.1, 0, 1.38, 0.22, 0.86, '#3e2723'], [-0.8, 1.2, 0, 0.55, 0.42, 0.95, '#90a4ae'], [0.8, 1.2, 0, 0.55, 0.42, 0.95, '#90a4ae'],
      [-0.8, 1.45, 0, 0.3, 0.12, 0.6, '#ffca28'], [0.8, 1.45, 0, 0.3, 0.12, 0.6, '#ffca28'], [0, 0.7, -0.5, 1.2, 1.6, 0.12, '#0d47a1'],
      [0, 1.75, 0, 0.88, 0.9, 0.88, '#78909c'], [0, 1.72, 0.45, 0.66, 0.14, 0.04, '#111'], [0, 1.55, 0.45, 0.14, 0.4, 0.04, '#111'],
      [0, 2.3, 0, 0.18, 0.3, 0.9, '#c62828'], [-0.52, 1.95, 0, 0.16, 0.5, 0.16, '#ffca28'], [0.52, 1.95, 0, 0.16, 0.5, 0.16, '#ffca28']],
    armR: [[0, -0.45, 0, 0.44, 0.95, 0.48, '#546e7a'], [0, -0.85, 0, 0.48, 0.3, 0.52, '#37474f'],
      [0, -1.0, 0.25, 0.16, 0.16, 0.7, '#3e2723'], [0, -1.0, 0.65, 0.5, 0.18, 0.18, '#ffca28'], [0, -1.0, 1.9, 0.14, 0.62, 2.4, '#cfd8dc'], [0, -1.0, 3.2, 0.12, 0.4, 0.3, '#eceff1']],
    armL: [[0, -0.45, 0, 0.44, 0.95, 0.48, '#546e7a'], [0, -0.85, 0, 0.48, 0.3, 0.52, '#37474f']],
  }),
  abilities: [
    { id: 'hammer', key: 'Q', name: '风暴之锤', icon: '锤', color: '#1e88e5', target: 'unit', range: 12, castPoint: 0.3,
      mana: [110, 115, 120, 125], cd: [18, 16, 14, 12], values: { dmg: [80, 160, 230, 300], stun: [1.4, 1.6, 1.8, 2.0], radius: 5 },
      text: L => `掷出风暴之锤，命中后对目标周围 ${L.radius} 码内的敌人造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒。`,
      onCast(c, t) {
        const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 20, color: '#90caf9', size: 0.9, trail: '#e3f2fd', onHit(u) {
          for (const e of AB.enemiesIn(h, u.x, u.z, c.v('radius'))) { AB.damage(h, e, c.v('dmg'), 'magic', 'hammer'); AB.stun(e, h, c.v('stun')); }
          AB.ringP(u.x, u.z, 0.5, 30, ['#90caf9', '#e3f2fd', '#1e88e5'], 0.4, 0.4, 0.4, c.v('radius') / 0.4);
          AB.burst(u.x, 1.5, u.z, 26, ['#e3f2fd', '#64b5f6', '#ffffff'], 7, 0.6, 0.3, 3, 0);
        } });
      } },
    { id: 'cleave', key: 'W', name: '巨力挥击', icon: '击', color: '#78909c', passive: true,
      values: { pct: [0.4, 0.55, 0.7, 0.85], len: 6.5, w1: 6 }, fmt: { pct: v => Math.round(v * 100) + '%' },
      text: L => `被动：攻击时对目标身后 ${L.len} 码锥形区域内的敌人造成 ${L.pct} 攻击伤害的溅射（无视护甲）。`,
      onAttackLand(c, tgt, dealt) { const h = c.caster; AB.cleave(h, tgt, (h.dmgMin + h.dmgMax) / 2 * c.v('pct'), { len: c.v('len'), w1: c.v('w1'), ability: 'cleave', color: '#b0bec5' }); } },
    { id: 'warcry', key: 'E', name: '战吼', icon: '吼', color: '#1565c0', target: 'none', castPoint: 0,
      mana: [30, 35, 40, 45], cd: [32, 28, 24, 20], values: { radius: 12, armor: [5, 8, 11, 14], ms: [0.08, 0.12, 0.16, 0.2], dur: 8 }, fmt: { ms: v => Math.round(v * 100) + '%' },
      text: L => `振臂高呼，使 ${L.radius} 码内的友方英雄获得 ${L.armor} 点护甲和 ${L.ms} 移动速度，持续 ${L.dur} 秒。`,
      onCast(c) {
        const h = c.caster;
        for (const u of units) if (!u.dead && u.isHero && u.team === h.team && dst(u, h) <= c.v('radius'))
          AB.addModifier(u, SVEN_WARCRY, h, { dur: c.v('dur'), props: { armor: c.v('armor'), msPct: c.v('ms') } });
        AB.ringP(h.x, h.z, 0.8, 30, ['#64b5f6', '#1e88e5', '#ffffff'], 0.5, 0.4, 1.0, 14); AB.float(h, '战吼！', '#82b1ff', 18, 1.1);
      } },
    { id: 'gods', scepter: { desc: '攻击力加成提升至 140%/200%/260%。', values: { pct: [1.4, 2.0, 2.6] } }, key: 'R', name: '神之力量', icon: '神', color: '#d50000', ult: true, target: 'none', castPoint: 0.3,
      mana: [100, 150, 200], cd: [110, 105, 100], values: { pct: [1.0, 1.5, 2.0], dur: 25 }, fmt: { pct: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：引导神之力量，${L.dur} 秒内基础攻击力提升 ${L.pct}。`,
      onCast(c) {
        const h = c.caster; AB.addModifier(h, SVEN_GODS, h, { dur: c.v('dur'), props: { dmgPct: c.v('pct') } });
        AB.burst(h.x, 2, h.z, 50, ['#ff1744', '#d50000', '#ff8a80', '#ffffff'], 9, 0.9, 0.4, 6, 0); AB.float(h, '神之力量！', '#ff5252', 22, 1.3);
      } },
  ],
});
