// heroes/disruptor.js — 干扰者 Disruptor (ranged intelligence). Thunder Strike (multi-pulse), Glimpse (rewind),
// Kinetic Field (circular barrier), Static Storm (channel silence + escalating damage).
const DIS_STRIKE = { id: 'dis_strike', tag: '雷击', color: '#7e57c2', debuff: true };
const DIS_FIELD = { id: 'dis_field', tag: '力场', color: '#b39ddb', debuff: true, states: ['rooted'] };
function disruptorSample(u) {
  const log = u._glLog || (u._glLog = []);
  log.push({ t: G.time, x: u.x, z: u.z });
  while (log.length && log[0].t < G.time - 5.5) log.shift();
}
registerHero({
  id: 'disruptor', order: 39, name: '干扰者', title: '干扰者', type: '远程 · 智力', color: '#5e35b1', nameColor: '#b39ddb',
  desc: '远程智力型控制。雷霆一击反复轰击，时光窥视强制回位，动能力场困住敌人，静态风暴沉默并持续伤害。',
  ai: { role: 'support', aggr: 0.95, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['arcane', 'force', 'glimmer', 'scepter', 'scythe'],
    combos: [{ id: 'dis_field_storm', steps: [{ slot: 2, at: 'target' }, { slot: 3, at: 'center' }, { slot: 0, at: 'target' }], min: 2, radius: 5 }] },
  stats: { primary: 'int', str: 19, strG: 2.1, agi: 13, agiG: 1.4, int: 22, intG: 2.9, dmg: 24, armor: 0, bat: 1.7, range: 12,
    atkPoint: 0.4, backswing: 0.5, speed: 6.7, proj: 22, projColor: '#b39ddb', hpRegen: 0.75, manaRegen: 0.9, radius: 0.62, height: 3.3 },
  portrait: { headY: 2.75 },
  model: () => humanoid({ pants: '#311b92', boots: '#1a237e', skin: '#ce93d8', sleeve: '#7e57c2', hip: 0.26, sh: 0.6, legH: 1.1, bodyH: 1.05, legW: 0.36,
    body: [[0, 0.5, 0, 0.85, 1.05, 0.52, '#7e57c2'], [0, 0.55, 0.27, 0.5, 0.4, 0.04, '#e1bee7'], [0, 0.1, 0, 0.95, 0.25, 0.6, '#4527a0'],
      [0, 1.5, 0, 0.72, 0.72, 0.72, '#ce93d8'], [0, 1.9, -0.05, 0.95, 0.4, 0.95, '#5e35b1'], [0, 2.2, 0, 0.35, 0.35, 0.35, '#b39ddb'],
      [-0.18, 1.58, 0.38, 0.12, 0.08, 0.02, '#311b92'], [0.18, 1.58, 0.38, 0.12, 0.08, 0.02, '#311b92'],
      [0, 1.0, -0.4, 0.8, 1.3, 0.1, '#4527a0']],
    bodyGlow: [[0, 2.15, 0.15, 0.25, 0.3, 0.25, '#ea80fc'], [-0.4, 1.9, 0, 0.15, 0.5, 0.15, '#b39ddb'], [0.4, 1.9, 0, 0.15, 0.5, 0.15, '#b39ddb']],
    armR: [[0, -0.42, 0, 0.34, 0.9, 0.38, '#7e57c2'], [0, -0.9, 0, 0.45, 0.35, 0.45, '#5e35b1']],
    armL: [[0, -0.42, 0, 0.34, 0.9, 0.38, '#7e57c2'], [0, -0.9, 0, 0.36, 0.22, 0.4, '#ce93d8']] }),
  abilities: [
    { id: 'thunder_strike', ai: { nuke: true }, shard: { desc: '雷击次数 +1，伤害 +20。', values: { strikes: 4, dmg: [65, 90, 115, 140] } },
      key: 'Q', name: '雷霆一击', icon: '雷', color: '#7e57c2', target: 'unit', range: 14, castPoint: 0.05,
      mana: [125, 130, 135, 140], cd: [18, 15, 12, 9], values: { dmg: [45, 70, 95, 120], strikes: 3, interval: 2, radius: 3.5, slow: 0.5, slowDur: 1 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `标记一名敌人，共 ${L.strikes} 次雷击（间隔 ${L.interval} 秒）：每次对目标及 ${L.radius} 码敌人造成 ${L.dmg} 点魔法伤害并减速 ${L.slow}，持续 ${L.slowDur} 秒。`,
      onCast(c, t) {
        const h = c.caster, n = c.v('strikes'), iv = c.v('interval'), dmg = c.v('dmg'), r = c.v('radius');
        AB.addModifier(t, DIS_STRIKE, h, { dur: n * iv + 0.2 });
        emit('thunderStrike', { unit: h.id, target: t.id });
        let i = 0;
        const boom = () => {
          if (t.dead || i >= n) return;
          const cx = t.x, cz = t.z;
          for (const u of AB.enemiesIn(h, cx, cz, r)) {
            if (u.isBuilding) continue;
            AB.damage(h, u, dmg, 'magic', 'thunder_strike');
            AB.slow(u, h, c.v('slowDur'), c.v('slow'));
          }
          AB.skyBolt(t, '#ea80fc'); AB.burst(cx, 1.5, cz, 20, ['#b39ddb', '#ffffff', '#7e57c2'], 5, 0.5, 0.25, 2.5, 0);
          AB.ringP(cx, cz, 0.4, 18, ['#ce93d8', '#e1bee7'], 0.35, 0.25, 0.35, r / 0.4);
          i++; if (i < n) AB.delay(iv, boom);
        };
        boom();
      } },
    { id: 'glimpse', ai: { disable: true }, key: 'W', name: '时光窥视', icon: '视', color: '#9575cd', target: 'unit', range: 14, castPoint: 0.2,
      mana: 100, cd: [48, 38, 28, 18], values: { lookback: 4 },
      text: L => `将一名敌方英雄送回 ${L.lookback} 秒前所在的位置。`,
      onCast(c, t) {
        const h = c.caster; if (!t.isHero) { AB.float(h, '仅限英雄', '#b39ddb', 14, 0.8); return; }
        const log = t._glLog || [], cut = G.time - c.v('lookback');
        let best = null;
        for (const s of log) if (s.t <= cut) best = s;
        if (!best && log.length) best = log[0];
        if (!best) best = { x: t.x - Math.sin(t.facing) * 8, z: t.z - Math.cos(t.facing) * 8 };
        const dest = { x: best.x, z: best.z }, ox = t.x, oz = t.z;
        AB.burst(ox, 1.4, oz, 16, ['#b39ddb', '#e1bee7'], 4, 0.45, 0.25, 2, 0);
        AB.beam(ox, 1.5, oz, dest.x, 1.5, dest.z, '#ea80fc', 0.25, 0.5);
        AB.delay(0.3, () => {
          if (t.dead) return;
          AB.teleport(t, dest, { colors: ['#7e57c2', '#e1bee7', '#ffffff'] });
          AB.float(t, '窥视！', '#b39ddb', 18, 1.0);
          emit('glimpse', { unit: h.id, target: t.id });
        });
      } },
    { id: 'kinetic_field', ai: { aoe: 2, disable: true }, key: 'E', name: '动能力场', icon: '场', color: '#673ab7', target: 'point', range: 12, castPoint: 0.05,
      mana: [70, 70, 70, 70], cd: [19, 16, 13, 10], values: { radius: 4.2, delay: 1.0, dur: [2.6, 3.0, 3.4, 3.8] },
      text: L => `${L.delay} 秒后在目标点形成半径 ${L.radius} 码的力场，持续 ${L.dur} 秒：敌人无法穿越边界。`,
      onCast(c, pt) {
        const h = c.caster, R = c.v('radius'), dur = c.v('dur'), delay = c.v('delay');
        AB.ringP(pt.x, pt.z, R, 40, ['#b39ddb', '#7e57c2'], 0.5, delay, 0.25);
        emit('kineticField', { unit: h.id });
        AB.delay(delay, () => {
          AB.ringP(pt.x, pt.z, R, 48, ['#ea80fc', '#ffffff'], 0.55, 0.35, 0.4);
          AB.groundArea({ caster: h, x: pt.x, z: pt.z, radius: R + 1.2, dur, tick: 0.05,
            onTick(list) {
              for (const u of list) {
                if (u.isBuilding || u.isWard) continue;
                const d = Math.hypot(u.x - pt.x, u.z - pt.z), ang = Math.atan2(u.x - pt.x, u.z - pt.z);
                if (d < R - 0.2) {
                  // inside near rim: keep inside
                  if (d > R - 0.55) {
                    const nx = pt.x + Math.sin(ang) * (R - 0.7), nz = pt.z + Math.cos(ang) * (R - 0.7);
                    AB.pull(u, nx, nz, Math.min(1.8, d - (R - 0.7)));
                    if (!getMod(u, 'dis_field')) AB.addModifier(u, DIS_FIELD, h, { dur: 0.15 });
                  }
                } else if (d < R + 0.9) {
                  // outside pressing in: keep outside
                  const nx = pt.x + Math.sin(ang) * (R + 0.55), nz = pt.z + Math.cos(ang) * (R + 0.55);
                  AB.pull(u, nx, nz, Math.min(1.8, (R + 0.55) - d + 1.2));
                  if (!getMod(u, 'dis_field')) AB.addModifier(u, DIS_FIELD, h, { dur: 0.15 });
                }
              }
            },
            fx(a, dt) {
              if (Math.random() < dt * 12) {
                const ang = Math.random() * 6.28;
                spawnP(pt.x + Math.cos(ang) * R, rnd(0.2, 1.8), pt.z + Math.sin(ang) * R, 0, 0.4, 0, 0.4, 0.18, '#ce93d8');
              }
            } });
        });
      } },
    { id: 'static_storm', ai: { ultAoe: { radius: 'radius', min: 2 }, commit: true },
      scepter: { desc: '风暴伤害 +40，沉默贯穿魔免。', values: { dpsEnd: [240, 300, 360] } },
      key: 'R', name: '静态风暴', icon: '暴', color: '#4527a0', ult: true, target: 'point', range: 12, castPoint: 0.05, channel: 5,
      mana: [125, 175, 225], cd: [90, 80, 70], values: { radius: 5, dpsStart: 40, dpsEnd: [170, 220, 270], silence: true },
      text: L => `终极技能（持续施法 5 秒）：在目标点形成静态风暴（半径 ${L.radius}）。期间敌人被沉默，伤害从 ${L.dpsStart} 升至 ${L.dpsEnd} 点/秒。`,
      onChannelStart(c, pt, ch) {
        const h = c.caster; ch.data.pt = { x: pt.x, z: pt.z }; ch.data.t = 0;
        AB.ringP(pt.x, pt.z, c.v('radius'), 40, ['#7e57c2', '#ea80fc'], 0.5, 0.4, 0.45);
        emit('staticStorm', { unit: h.id });
        AB.float(h, '静态风暴！', '#b39ddb', 20, 1.1);
      },
      onChannelTick(c, pt, dt, ch) {
        const h = c.caster, p = ch.data.pt, R = c.v('radius');
        ch.data.t = (ch.data.t || 0) + dt;
        const frac = Math.min(1, ch.data.t / 5), dps = c.v('dpsStart') + (c.v('dpsEnd') - c.v('dpsStart')) * frac;
        for (const u of AB.enemiesIn(h, p.x, p.z, R)) {
          if (u.isBuilding) continue;
          AB.silence(u, h, 0.35);
          AB.damage(h, u, dps * dt, 'magic', 'static_storm', { silent: true });
        }
        if (Math.random() < dt * 18) {
          const a = Math.random() * 6.28, rr = Math.random() * R;
          spawnP(p.x + Math.cos(a) * rr, rnd(0.3, 2.5), p.z + Math.sin(a) * rr, 0, 2, 0, 0.5, 0.2, '#e1bee7');
        }
        if ((ch.data.ring = (ch.data.ring || 0) - dt) <= 0) { ch.data.ring = 0.4; AB.ringP(p.x, p.z, 0.6, 20, ['#7e57c2', '#b39ddb'], 0.35, 0.25, 0.3, R / 0.6); }
      },
      onChannelEnd(c, pt, interrupted, ch) { emit('staticStormEnd', { unit: c.caster.id, interrupted }); } },
  ],
});
// sample positions for Glimpse while disruptor is alive
effects.push({ update(dt) {
  if (!G || !G.heroes) return false;
  const has = G.heroes.some(h => h.def && h.def.id === 'disruptor' && !h.isIllusion);
  if (!has) return false;
  for (const u of G.heroes) {
    if (u.dead || u.isIllusion) continue;
    u._glAcc = (u._glAcc || 0) + dt;
    if (u._glAcc >= 0.25) { u._glAcc = 0; disruptorSample(u); }
  }
  return false;
} });
