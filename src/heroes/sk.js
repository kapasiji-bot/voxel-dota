// heroes/sk.js — 沙王 Sand King (melee strength). Burrowstrike (blink-line stun), Sand Storm (timed invis AoE DPS),
// Caustic Finale (attack debuff explodes on death/timeout), Epicenter (channel then pulses of slow+dmg).
const SK_CAUSTIC = { id: 'sk_caustic', tag: '腐蚀', color: '#c0a060', debuff: true,
  onDeath(u, m) { skCausticBoom(u, m); m.data.done = 1; },
  onRemove(u, m) { if (!m.data.done) skCausticBoom(u, m); },
  fx(u) { if (Math.random() < 0.2) spawnP(u.x + rnd(-0.4, 0.4), rnd(0.5, 1.8), u.z + rnd(-0.4, 0.4), 0, 0.6, 0, 0.4, 0.15, '#d7ccc8'); } };
const SK_SAND = { id: 'sk_sand', name: '沙尘暴', color: '#a1887f', invis: true, breakOn: 'pause', fadeIn: 0.3, refade: () => 0.8 };
const SK_EPI = { id: 'sk_epi', tag: '地震', color: '#8d6e63', debuff: true };
function skCausticBoom(u, m) {
  if (!m || !m.data || m.data.boom) return; m.data.boom = 1;
  const src = m.src; if (!src || src.dead) return;
  const r = m.data.r || 4, dmg = m.data.dmg || 100;
  for (const e of AB.enemiesIn(src, u.x, u.z, r)) if (e !== u) AB.damage(src, e, dmg, 'magic', 'caustic_finale', { silent: true });
  if (!u.dead) AB.damage(src, u, dmg, 'magic', 'caustic_finale', { silent: true });
  AB.ringP(u.x, u.z, 0.5, 24, ['#d7ccc8', '#a1887f', '#efebe9'], 0.4, 0.3, 0.45, r / 0.4);
  emit('causticFinale', { unit: src.id, target: u.id });
}
registerHero({
  id: 'sk', order: 27, name: '沙王', title: '克里奚斯', type: '近战 · 力量', color: '#6d4c41', nameColor: '#d7ccc8',
  desc: '近战力量型先手。掘地穿刺闪现眩晕，沙尘暴隐身持续伤害，腐蚀外表在敌人死亡时爆炸，地震持续脉冲减速与伤害。',
  ai: { role: 'tank', aggr: 1.1, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'blink', 'bkb', 'scepter', 'heart'],
    combos: [{ id: 'sk_burrow_epi', steps: [{ slot: 0, at: 'center' }, { slot: 3 }], min: 2, radius: 6 }] },
  stats: { primary: 'str', str: 22, strG: 2.7, agi: 19, agiG: 2.0, int: 16, intG: 1.8, dmg: 26, armor: 0, bat: 1.7, range: 2.5,
    atkPoint: 0.5, backswing: 0.5, speed: 6.9, proj: 0, hpRegen: 1.2, manaRegen: 0.7, radius: 0.7, height: 3.2 },
  portrait: { headY: 2.7 },
  model: () => humanoid({ pants: '#5d4037', boots: '#3e2723', skin: '#a1887f', sleeve: '#8d6e63', hip: 0.28, sh: 0.7, legH: 1.05, bodyH: 1.1, legW: 0.4,
    body: [[0, 0.5, 0, 1.05, 1.1, 0.7, '#8d6e63'], [0, 0.55, 0.36, 0.6, 0.45, 0.04, '#d7ccc8'], [0, 0.05, 0, 1.15, 0.28, 0.8, '#5d4037'],
      [0, 1.55, 0, 0.8, 0.75, 0.8, '#a1887f'], [0, 1.85, 0, 1.1, 0.35, 0.9, '#6d4c41'], [-0.5, 1.95, 0.15, 0.35, 0.2, 0.55, '#d7ccc8'],
      [0.5, 1.95, 0.15, 0.35, 0.2, 0.55, '#d7ccc8'], [0, 1.0, -0.4, 0.9, 1.2, 0.12, '#4e342e']],
    bodyGlow: [[-0.18, 1.62, 0.4, 0.12, 0.08, 0.02, '#ffcc80'], [0.18, 1.62, 0.4, 0.12, 0.08, 0.02, '#ffcc80']],
    armR: [[0, -0.42, 0, 0.38, 0.9, 0.42, '#8d6e63'], [0, -0.88, 0, 0.4, 0.24, 0.44, '#a1887f'],
      [0, -0.95, 0.5, 0.5, 0.35, 0.9, '#6d4c41']],
    armL: [[0, -0.42, 0, 0.38, 0.9, 0.42, '#8d6e63'], [0, -0.88, 0, 0.4, 0.24, 0.44, '#a1887f']] }),
  abilities: [
    { id: 'burrowstrike', ai: { disable: true, engage: true }, shard: { desc: '掘地穿刺距离 +2，眩晕 +0.2 秒。', values: { len: [7, 8, 9, 10], stun: [1.7, 1.9, 2.1, 2.3] } },
      key: 'Q', name: '掘地穿刺', icon: '掘', color: '#a1887f', target: 'point', range: [6, 7, 8, 9], castPoint: 0,
      mana: [110, 120, 130, 140], cd: [14, 13, 12, 11], values: { len: [5, 6, 7, 8], w1: 2.4, dmg: [100, 160, 220, 280], stun: [1.5, 1.7, 1.9, 2.1] },
      text: L => `潜入地下并冲向目标点（最远 ${L.len} 码），对路径上的敌人造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒，然后从终点现身。`,
      onCast(c, pt) { const h = c.caster, ox = h.x, oz = h.z, d = AB.dir(h, pt), L = Math.min(c.v('len'), Math.hypot(pt.x - h.x, pt.z - h.z) || c.v('len'));
        const dest = AB.clampPoint(h, { x: ox + d.x * L, z: oz + d.z * L }, L + 0.5);
        for (const u of AB.enemiesIn(h, ox, oz, L + 2)) {
          const rx = u.x - ox, rz = u.z - oz, p = rx * d.x + rz * d.z, lat = Math.abs(rx * d.z - rz * d.x);
          if (p >= -0.5 && p <= L + 0.5 && lat <= c.v('w1') / 2 + u.radius) {
            AB.damage(h, u, c.v('dmg'), 'magic', 'burrowstrike'); AB.stun(u, h, c.v('stun'));
          }
        }
        AB.teleport(h, dest, { colors: ['#d7ccc8', '#8d6e63', '#efebe9'] });
        AB.spikes && AB.spikes(ox, oz, d, L, 28, '#a1887f');
        emit('burrowstrike', { unit: h.id }); } },
    { id: 'sand_storm', ai: { escape: 'invis', selfAoe: true }, key: 'W', name: '沙尘暴', icon: '沙', color: '#bcaaa4', target: 'none', castPoint: 0,
      mana: [60, 70, 80, 90], cd: [34, 28, 22, 16], values: { radius: 6.5, dps: [25, 40, 55, 70], dur: [10, 15, 20, 25] },
      text: L => `制造沙尘暴 ${L.dur} 秒：自身隐身，并对周围 ${L.radius} 码敌人每秒造成 ${L.dps} 点魔法伤害。离开沙尘或攻击会显形。`,
      onCast(c) { const h = c.caster, r = c.v('radius'), dps = c.v('dps'), dur = c.v('dur');
        AB.invis(h, SK_SAND, h, dur, 0.35);
        AB.groundArea({ caster: h, x: h.x, z: h.z, radius: r, dur, tick: 0.5,
          onTick(enemies, a) {
            a.x = h.x; a.z = h.z;
            if (h.dead || !getMod(h, 'sk_sand')) { a.t = 1e9; return; }
            if (dst(h, a) > r) { removeModById(h, 'sk_sand'); a.t = 1e9; return; }
            for (const e of enemies) if (!e.isBuilding) AB.damage(h, e, dps * 0.5, 'magic', 'sand_storm', { silent: true });
          },
          fx(a) { if (Math.random() < 0.5) { const ang = Math.random() * 6.28, rr = Math.random() * a.r; spawnP(a.x + Math.cos(ang) * rr, rnd(0.2, 1.5), a.z + Math.sin(ang) * rr, rnd(-1, 1), 1, rnd(-1, 1), 0.5, 0.2, '#d7ccc8'); } },
          onEnd() { removeModById(h, 'sk_sand'); } });
        AB.ringP(h.x, h.z, 0.5, 24, ['#d7ccc8', '#8d6e63'], 0.4, 0.3, 0.5, 10); emit('sandStorm', { unit: h.id }); } },
    { id: 'caustic_finale', key: 'E', name: '腐蚀外表', icon: '腐', color: '#c0a060', passive: true,
      values: { dmg: [70, 100, 130, 160], radius: 4.5, dur: 6 },
      text: L => `被动：攻击使敌人附着腐蚀，持续 ${L.dur} 秒；目标死亡或效果结束时爆炸，对周围 ${L.radius} 码造成 ${L.dmg} 点魔法伤害。`,
      onAttackLand(c, t) {
        if (t.isBuilding || t.isWard || t.dead) return;
        AB.addModifier(t, SK_CAUSTIC, c.caster, { dur: c.v('dur'), data: { dmg: c.v('dmg'), r: c.v('radius') } });
      } },
    { id: 'epicenter', ai: { ultAoe: { radius: 'radius', min: 2 } }, scepter: { desc: '脉冲次数 +3，减速 +8%。', values: { pulses: [9, 12, 15], slow: [0.38, 0.46, 0.54] } },
      key: 'R', name: '地震', icon: '震', color: '#5d4037', ult: true, target: 'none', castPoint: 0, channel: 2,
      mana: [150, 225, 300], cd: [120, 110, 100], values: { radius: 8, dmg: [110, 140, 170], pulses: [6, 9, 12], slow: [0.3, 0.38, 0.46], pulse: 0.35 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：持续施法 2 秒后引发地震，共 ${L.pulses} 次脉冲，每次对 ${L.radius} 码内敌人造成 ${L.dmg} 点魔法伤害并减速 ${L.slow}（可移动）。`,
      onChannelTick(c) { if (Math.random() < 0.4) spawnP(c.caster.x + rnd(-1, 1), 0.3, c.caster.z + rnd(-1, 1), 0, 1.5, 0, 0.4, 0.15, '#a1887f'); },
      onChannelEnd(c, _t, interrupted) {
        if (interrupted) return;
        const h = c.caster, n = c.v('pulses'), gap = c.v('pulse'), R = c.v('radius'), dmg = c.v('dmg'), sl = c.v('slow');
        let i = 0;
        const pulse = () => {
          if (h.dead || i >= n) return; i++;
          for (const u of AB.enemiesIn(h, h.x, h.z, R)) {
            if (u.isBuilding) continue;
            AB.damage(h, u, dmg, 'magic', 'epicenter', { silent: true });
            AB.addModifier(u, SK_EPI, h, { dur: 3, props: { msPct: -sl, as: -sl * 80 } });
          }
          AB.ringP(h.x, h.z, 0.5, 28, ['#8d6e63', '#d7ccc8', '#efebe9'], 0.35, 0.3, 0.4, R / 0.35);
          if (i < n) AB.delay(gap, pulse);
        };
        pulse(); AB.float(h, '地震！', '#d7ccc8', 18, 1.1); emit('epicenter', { unit: h.id, pulses: n });
      } },
  ],
});
