// heroes/qop.js — 痛苦女王 Queen of Pain (ranged intelligence). Shadow Strike (dagger: hit + DoT every 3 s + decaying slow),
// Blink (short teleport), Scream of Pain (AoE around her), Sonic Wave (ult: travelling CONE of pure damage — AB.coneWave).
// Bot combo: Blink next to a cluster → Sonic Wave (ai.combos, ai/bot/combos.js).
const QOP_STRIKE = { id: 'qop_strike', tag: '暗影突袭', color: '#d500f9', debuff: true, tick: 0.5,
  onTick(u, m) {
    m.data.n = (m.data.n || 0) + 1; if (m.props) m.props.msPct = -m.data.slow * Math.max(0, m.t / m.data.dur);   // slow decays to 0
    if (m.data.n % 6 === 0) { AB.damage(m.src, u, m.data.dot, 'magic', 'shadow_strike'); AB.burst(u.x, 1.4, u.z, 8, ['#d500f9', '#4a148c'], 3, 0.4, 0.2, 1, 0); }
  },
  fx(u) { if (Math.random() < 0.25) spawnP(u.x + rnd(-0.4, 0.4), rnd(0.8, 2.2), u.z + rnd(-0.4, 0.4), 0, 0.6, 0, 0.5, 0.18, '#aa00ff'); } };
registerHero({
  id: 'qop', order: 19, name: '痛苦女王', title: '阿卡莎', type: '远程 · 智力', color: '#ad1457', nameColor: '#f48fb1',
  desc: '远程智力型爆发英雄。闪烁切入，痛苦尖叫与暗影突袭消耗敌人，超声冲击波以扇形冲击造成大量纯粹伤害。',
  stats: { primary: 'int', str: 18, strG: 2.3, agi: 22, agiG: 2.5, int: 25, intG: 2.9, dmg: 24, armor: 1, bat: 1.6, range: 11,
    atkPoint: 0.4, backswing: 0.5, speed: 7.4, proj: 24, projColor: '#e040fb', hpRegen: 0.8, manaRegen: 1, radius: 0.6, height: 3.2 },
  portrait: { headY: 2.7 },
  ai: { role: 'carry', aggr: 1.15, skills: [0, 1, 0, 2, 0, 3, 2, 2, 2, 0, 3, 1, 1, 1, 3], build: ['arcane', 'dagon', 'scepter', 'bkb', 'scythe'],
    combos: [{ id: 'qop_blink_wave', steps: [{ slot: 1, at: 'near' }, { slot: 3, at: 'center' }], min: 2, radius: 5 }] },
  model: () => humanoid({ pants: '#4a148c', boots: '#212121', skin: '#e1bee7', sleeve: '#880e4f', hip: 0.22, sh: 0.56, legH: 1.1, bodyH: 1.0, legW: 0.3,
    body: [[0, 0.5, 0, 0.74, 1.0, 0.46, '#880e4f'], [0, 0.95, 0.05, 0.8, 0.22, 0.5, '#4a148c'], [0, 1.45, 0, 0.66, 0.66, 0.66, '#e1bee7'],
      [0, 1.72, -0.06, 0.74, 0.32, 0.72, '#311b92'], [0, 1.25, -0.32, 0.6, 0.9, 0.18, '#311b92'],
      [-0.26, 1.95, 0, 0.12, 0.3, 0.12, '#212121'], [0.26, 1.95, 0, 0.12, 0.3, 0.12, '#212121'],
      [-0.75, 1.0, -0.4, 0.9, 0.9, 0.08, '#6a1b9a'], [0.75, 1.0, -0.4, 0.9, 0.9, 0.08, '#6a1b9a'], [-1.1, 1.45, -0.42, 0.4, 0.5, 0.06, '#4a148c'], [1.1, 1.45, -0.42, 0.4, 0.5, 0.06, '#4a148c']],
    bodyGlow: [[-0.14, 1.48, 0.34, 0.12, 0.08, 0.02, '#ff4081'], [0.14, 1.48, 0.34, 0.12, 0.08, 0.02, '#ff4081']],
    armR: [[0, -0.42, 0, 0.3, 0.85, 0.32, '#e1bee7'], [0, -0.85, 0, 0.32, 0.18, 0.34, '#880e4f']], armRGlow: [[0, -1.0, 0.1, 0.26, 0.26, 0.26, '#e040fb']] }),
  abilities: [
    { id: 'shadow_strike', ai: { debuffId: 'qop_strike' }, key: 'Q', name: '暗影突袭', icon: '影', color: '#aa00ff', target: 'unit', range: 15, castPoint: 0.4,
      mana: 110, cd: [13, 10, 7, 4], values: { dmg: [50, 75, 100, 125], dot: [30, 45, 60, 75], slow: [0.2, 0.3, 0.4, 0.5], dur: 15 }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `掷出淬毒匕首，造成 ${L.dmg} 点魔法伤害，之后每 3 秒造成 ${L.dot} 点魔法伤害，持续 ${L.dur} 秒；减速 ${L.slow}，逐渐衰减。`,
      onCast(c, t) { const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 28, color: '#d500f9', size: 0.6, trail: '#ea80fc', onHit(u) {
          AB.damage(h, u, c.v('dmg'), 'magic', 'shadow_strike');
          AB.addModifier(u, QOP_STRIKE, h, { dur: c.v('dur'), props: { msPct: -c.v('slow') }, data: { dot: c.v('dot'), slow: c.v('slow'), dur: c.v('dur'), n: 0 } }); } }); } },
    { id: 'qop_blink', ai: { escape: 'blink', engage: true }, key: 'W', name: '闪烁', icon: '闪', color: '#ec407a', target: 'point', clampRange: true, range: [13, 15, 17, 19], castPoint: 0.33,
      mana: 60, cd: [15, 12, 10, 8],
      text: L => `瞬间传送到最远 ${L.range} 码外的目标位置。`,
      onCast(c, pt) { AB.teleport(c.caster, pt, { maxR: c.v('range'), colors: ['#f50057', '#ff80ab', '#4a148c'] }); } },
    { id: 'scream', key: 'E', name: '痛苦尖叫', icon: '叫', color: '#c51162', target: 'none', castPoint: 0,
      mana: [80, 90, 100, 110], cd: 7, values: { dmg: [75, 150, 225, 300], radius: 5.5 },
      text: L => `发出尖叫，对周围 ${L.radius} 码内所有敌人造成 ${L.dmg} 点魔法伤害。`,
      onCast(c) { const h = c.caster;
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) AB.projectile({ src: h, target: u, speed: 30, color: '#ff4081', size: 0.45, glow: true, onHit(v) { AB.damage(h, v, c.v('dmg'), 'magic', 'scream'); } });
        AB.ringP(h.x, h.z, 0.6, 32, ['#ff4081', '#f50057', '#ffffff'], 0.4, 0.35, 1.4, c.v('radius') / 0.4); } },
    { id: 'sonic_wave', cone: true, ai: { ultAoe: { radius: 5, min: 2 } }, scepter: { desc: '冷却时间降低为 40 秒，伤害提升至 350/475/600。', cd: [40, 40, 40], values: { dmg: [350, 475, 600] } }, key: 'R', name: '超声冲击波', icon: '波', color: '#6a1b9a', ult: true, target: 'direction', castPoint: 0.45,
      mana: [250, 360, 500], cd: [110, 95, 80], values: { dmg: [290, 390, 490], len: 15, w0: 2.5, w1: 9, speed: 20 },
      text: L => `终极技能：朝目标方向释放扇形音波（长 ${L.len} 码，末端宽 ${L.w1} 码），对波及的所有敌人造成 ${L.dmg} 点纯粹伤害。`,
      onCast(c, pt) { const h = c.caster, dir = AB.dir(h, pt);
        AB.coneWave({ caster: h, x: h.x, z: h.z, dir, len: c.v('len'), w0: c.v('w0'), w1: c.v('w1'), speed: c.v('speed'), ability: 'sonic_wave',
          onHit(u) { AB.damage(h, u, c.v('dmg'), 'pure', 'sonic_wave'); AB.burst(u.x, 1.4, u.z, 14, ['#e1bee7', '#ab47bc', '#ffffff'], 5, 0.4, 0.25, 2, 0); } }); } },
  ],
});
