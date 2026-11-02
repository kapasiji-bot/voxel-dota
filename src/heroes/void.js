// heroes/void.js — 虚空假面 Faceless Void (melee agility). Time Walk (blink + heal recent dmg), Time Dilation (AoE slow + CD stretch),
// Time Lock (passive bash), Chronosphere (large pause zone; Void + his illusions free).
Events.on('damage', e => {
  const u = unitById(e.tgt); if (!u || u.dead || !u.isHero || u.isIllusion || !u.def || u.def.id !== 'void') return;
  const log = u._twLog || (u._twLog = []); log.push({ t: G.time, a: e.amount || 0 });
  while (log.length && G.time - log[0].t > 2.5) log.shift();
});
const VOID_DIL = { id: 'void_dil', tag: '时间膨胀', color: '#7e57c2', debuff: true };
registerHero({
  id: 'void', order: 30, name: '虚空假面', title: '暗影恶魔', type: '近战 · 敏捷', color: '#4527a0', nameColor: '#b39ddb',
  desc: '近战敏捷型先手。时间漫游闪现并回复近期受伤，时间膨胀拖慢敌人并拉长冷却，时间锁定被动重击，时间结界冻结战场。',
  ai: { role: 'carry', aggr: 1.2, skills: [0, 2, 0, 1, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'bfury', 'desolator', 'bkb', 'daedalus'],
    combos: [{ id: 'void_chrono', steps: ['blink', { slot: 3 }, { slot: 0 }], min: 2, radius: 7 }] },
  stats: { primary: 'agi', str: 22, strG: 2.4, agi: 21, agiG: 3.0, int: 15, intG: 1.5, dmg: 26, armor: 1, bat: 1.7, range: 2.6,
    atkPoint: 0.5, backswing: 0.56, speed: 7.2, proj: 0, hpRegen: 1.2, manaRegen: 0.6, radius: 0.65, height: 3.3 },
  portrait: { headY: 2.75 },
  model: () => humanoid({ pants: '#311b92', boots: '#1a1a1a', skin: '#7e57c2', sleeve: '#5e35b1', hip: 0.26, sh: 0.64, legH: 1.15, bodyH: 1.1, legW: 0.38,
    body: [[0, 0.5, 0, 0.9, 1.1, 0.55, '#5e35b1'], [0, 0.55, 0.28, 0.55, 0.5, 0.04, '#b39ddb'], [0, 0.1, 0, 0.95, 0.25, 0.6, '#311b92'],
      [0, 1.55, 0, 0.85, 0.8, 0.85, '#7e57c2'], [0, 1.95, -0.05, 1.0, 0.35, 1.0, '#4527a0'], [0, 1.7, 0.42, 0.7, 0.25, 0.05, '#212121'],
      [-0.22, 1.65, 0.44, 0.14, 0.1, 0.02, '#ce93d8'], [0.22, 1.65, 0.44, 0.14, 0.1, 0.02, '#ce93d8'], [0, 1.05, -0.4, 0.8, 1.3, 0.12, '#311b92']],
    armR: [[0, -0.45, 0, 0.36, 0.92, 0.4, '#5e35b1'], [0, -0.9, 0, 0.38, 0.24, 0.42, '#7e57c2'],
      [0, -1.0, 0.45, 0.14, 0.14, 0.9, '#b39ddb'], [0, -1.0, 1.4, 0.35, 0.55, 0.55, '#4527a0']],
    armL: [[0, -0.45, 0, 0.36, 0.92, 0.4, '#5e35b1'], [0, -0.9, 0, 0.38, 0.24, 0.42, '#7e57c2']] }),
  abilities: [
    { id: 'time_walk', ai: { escape: 'blink', engage: true }, shard: { desc: '回复比例 +15%，冷却 -2 秒。', cd: [12, 10, 8, 6], values: { heal: [0.85, 0.9, 0.95, 1] } },
      key: 'Q', name: '时间漫游', icon: '漫', color: '#7e57c2', target: 'point', clampRange: true, range: [10, 11, 12, 13], castPoint: 0.2,
      mana: 40, cd: [14, 12, 10, 8], values: { heal: [0.7, 0.75, 0.8, 0.85], window: 2 }, fmt: { heal: v => Math.round(v * 100) + '%' },
      text: L => `闪现到目标点（最远 ${L.range} 码），并回复过去 ${L.window} 秒内所受伤害的 ${L.heal}。`,
      onCast(c, pt) { const h = c.caster, log = h._twLog || [], cut = G.time - c.v('window');
        let dmg = 0; for (const x of log) if (x.t >= cut) dmg += x.a;
        const heal = Math.max(40, dmg * c.v('heal'));
        AB.teleport(h, pt, { maxR: c.v('range'), colors: ['#7e57c2', '#b39ddb', '#ffffff'] });
        h.hp = Math.min(h.maxHp, h.hp + heal); AB.float(h, '+' + Math.round(heal), '#b39ddb', 16, 1);
        AB.ringP(h.x, h.z, 0.5, 22, ['#7e57c2', '#e1bee7'], 0.4, 0.3, 0.6, 8); emit('timeWalk', { unit: h.id, heal: Math.round(heal) }); } },
    { id: 'time_dilation', ai: { disable: true }, key: 'W', name: '时间膨胀', icon: '胀', color: '#5e35b1', target: 'none', castPoint: 0.1,
      mana: [60, 70, 80, 90], cd: [20, 18, 16, 14], values: { radius: 8, slow: [0.4, 0.5, 0.6, 0.7], dur: [2.5, 3, 3.5, 4], cdAdd: [3, 4, 5, 6] },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `膨胀周围时间：${L.radius} 码内敌人减速 ${L.slow}，持续 ${L.dur} 秒，并将其正在冷却的技能剩余时间增加 ${L.cdAdd} 秒。`,
      onCast(c) { const h = c.caster;
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) {
          if (u.isBuilding) continue;
          AB.addModifier(u, VOID_DIL, h, { dur: c.v('dur'), props: { msPct: -c.v('slow'), as: -80 } });
          if (u.abilities) for (const ab of u.abilities) if (ab.cd > 0) ab.cd = Math.min((ab.cdMax || ab.cd) + c.v('cdAdd'), ab.cd + c.v('cdAdd'));
        }
        AB.ringP(h.x, h.z, 0.6, 36, ['#5e35b1', '#b39ddb', '#ffffff'], 0.55, 0.4, 0.7, c.v('radius') / 0.55);
        emit('timeDilation', { unit: h.id }); } },
    { id: 'time_lock', key: 'E', name: '时间锁定', icon: '锁', color: '#311b92', passive: true,
      values: { chance: [0.12, 0.16, 0.2, 0.24], stun: [0.65, 0.8, 0.95, 1.1], dmg: [25, 35, 45, 55] },
      fmt: { chance: v => Math.round(v * 100) + '%' },
      text: L => `被动：攻击有 ${L.chance} 几率时间锁定目标，造成 ${L.dmg} + 攻击力点额外魔法伤害并眩晕 ${L.stun} 秒。`,
      onAttackLand(c, t) {
        if (t.isBuilding || Math.random() >= c.v('chance')) return;
        const h = c.caster; AB.stun(t, h, c.v('stun')); AB.damage(h, t, c.v('dmg') + h.dmgBase, 'magic', 'time_lock');
        AB.burst(t.x, 1.3, t.z, 14, ['#7e57c2', '#ffffff', '#4527a0'], 4, 0.4, 0.25, 2, 0); emit('timeLock', { unit: h.id, target: t.id }); } },
    { id: 'chronosphere', ai: { ultAoe: { radius: 'radius', min: 2 }, disable: true },
      scepter: { desc: '持续时间 +1 秒，半径 +1。', values: { dur: [4.5, 5, 5.5], radius: 8 } },
      key: 'R', name: '时间结界', icon: '结', color: '#4a148c', ult: true, target: 'point', range: 12, castPoint: 0.3,
      mana: [150, 225, 300], cd: [140, 125, 110], values: { radius: 7, dur: [3.5, 4, 4.5] },
      text: L => `终极技能：在目标点展开时间结界（半径 ${L.radius} 码，持续 ${L.dur} 秒）。结界内除自身及己方幻象外的单位被时停（眩晕、沉默、无法行动）。`,
      onCast(c, pt) { const h = c.caster, R = c.v('radius'), owner = h;
        AB.groundArea({ caster: h, x: pt.x, z: pt.z, radius: R, dur: c.v('dur'), tick: 0.15,
          onTick(list) {
            for (const u of list) {
              if (u === owner || (u.isIllusion && u.owner === owner) || u.isBuilding) continue;
              AB.addModifier(u, MODS.chrono, owner, { dur: 0.35 });
            }
          },
          fx(a) { if (Math.random() < 0.55) { const ang = Math.random() * 6.28, r = Math.sqrt(Math.random()) * a.r;
            spawnP(a.x + Math.cos(ang) * r, rnd(0.3, 3.2), a.z + Math.sin(ang) * r, 0, 0.3, 0, 0.7, 0.2, ['#7e57c2', '#b39ddb', '#4a148c', '#e1bee7'][(Math.random() * 4) | 0]); } } });
        AB.ringP(pt.x, pt.z, 0.8, 48, ['#4a148c', '#7e57c2', '#e1bee7'], 0.7, 0.5, 0.8, R / 0.7);
        AB.float(h, '时间结界！', '#b39ddb', 20, 1.2); emit('chronosphere', { unit: h.id, x: pt.x, z: pt.z }); } },
  ],
});
