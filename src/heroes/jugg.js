// heroes/jugg.js — 主宰 Juggernaut (melee agility). Blade Fury (spin: magic immune + magic DPS, disarmed), Healing Ward
// (summon that pulses % max-HP heal), Blade Dance (passive crit), Omnislash (jump between nearby enemies dealing phys hits).
const JUGG_FURY = { id: 'jugg_fury', name: '剑刃风暴', color: '#ff8a65', states: ['magicImmune', 'disarmed'], tick: 0.2,
  onTick(u, m) { for (const e of AB.enemiesIn(u, u.x, u.z, m.data.r)) if (!e.isBuilding) AB.damage(u, e, m.data.dps * 0.2, 'magic', 'blade_fury', { silent: true }); },
  fx(u) { if (Math.random() < 0.45) spawnP(u.x + rnd(-0.9, 0.9), rnd(0.4, 2.4), u.z + rnd(-0.9, 0.9), rnd(-1, 1), 1, rnd(-1, 1), 0.35, 0.18, '#ffccbc'); } };
const JUGG_HW = { id: 'jugg_hw', tick: 0.5,
  onTick(u, m) {
    for (const a of units) if (!a.dead && a.team === u.team && !a.isBuilding && !a.isWard && dst(a, u) <= m.data.r && a.hp < a.maxHp)
      a.hp = Math.min(a.maxHp, a.hp + a.maxHp * m.data.pct * 0.5);
    if (Math.random() < 0.3) { const ang = Math.random() * 6.28, rr = Math.random() * m.data.r; spawnP(u.x + Math.cos(ang) * rr, 0.3, u.z + Math.sin(ang) * rr, 0, 1.5, 0, 0.6, 0.18, '#a5d6a7'); }
  } };
const JUGG_OMNI = { id: 'jugg_omni', name: '无敌斩', color: '#eceff1', states: ['invulnerable', 'disarmed'], tick: 0.35,
  onTick(u, m) {
    const foes = AB.enemiesIn(u, u.x, u.z, m.data.r).filter(e => !e.isBuilding && !isInvuln(e));
    if (!foes.length) { m.t = 0; return; }
    const t = foes[(Math.random() * foes.length) | 0];
    AB.teleport(u, { x: t.x + rnd(-0.7, 0.7), z: t.z + rnd(-0.7, 0.7) }, { colors: ['#eceff1', '#90a4ae', '#ffffff'] });
    u.facing = Math.atan2(t.x - u.x, t.z - u.z);
    AB.damage(u, t, m.data.dmg, 'phys', 'omnislash', { big: true });
    AB.burst(t.x, 1.4, t.z, 12, ['#ffffff', '#b0bec5', '#ff8a65'], 4, 0.4, 0.22, 2, 0);
  } };
registerSummon({ id: 'jugg_ward', name: '治疗守卫', hp: 1, armor: 0, dmg: [0, 0], bat: 1, range: 0, speed: 0.01, radius: 0.4, height: 2.2,
  gold: 0, xp: 0, vision: 10, stationary: true, fx: ['#81c784', '#ffffff'], portrait: { headY: 1.8 },
  model: () => ({ body: { p: [0, 0, 0], b: [[0, 0.4, 0, 0.35, 0.8, 0.35, '#5d4037'], [0, 1.2, 0, 0.7, 0.7, 0.2, '#81c784'], [0, 1.55, 0, 0.35, 0.35, 0.35, '#c8e6c9']],
    g: [[0, 1.2, 0.12, 0.5, 0.5, 0.04, '#a5d6a7']] } }) });
registerHero({
  id: 'jugg', order: 22, name: '主宰', title: '尤尔奈罗', type: '近战 · 敏捷', color: '#bf360c', nameColor: '#ffab91',
  desc: '近战敏捷型英雄。剑刃风暴旋转免疫魔法并撕裂周围敌人，治疗守卫脉冲回血，剑舞暴击，无敌斩在敌群中连续跳跃斩击。',
  ai: { role: 'carry', aggr: 1.15, skills: [0, 2, 0, 1, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'bfury', 'bkb', 'daedalus', 'mkb'],
    combos: [{ id: 'jugg_fury_omni', steps: [{ slot: 0 }, { slot: 3 }], min: 1, radius: 5 }] },
  stats: { primary: 'agi', str: 21, strG: 2.2, agi: 26, agiG: 2.8, int: 14, intG: 1.4, dmg: 24, armor: 2, bat: 1.4, range: 2.6,
    atkPoint: 0.33, backswing: 0.5, speed: 7.5, proj: 0, hpRegen: 1.5, manaRegen: 0.7, radius: 0.62, height: 3.2 },
  portrait: { headY: 2.65 },
  model: () => humanoid({ pants: '#3e2723', boots: '#212121', skin: '#e0ac69', sleeve: '#bf360c', hip: 0.24, sh: 0.6, legH: 1.1, bodyH: 1.05, legW: 0.36,
    body: [[0, 0.5, 0, 0.82, 1.05, 0.5, '#bf360c'], [0, 0.55, 0.26, 0.55, 0.45, 0.04, '#ffcc80'], [0, 0.1, 0, 0.9, 0.25, 0.55, '#5d4037'],
      [0, 1.45, 0, 0.7, 0.7, 0.7, '#e0ac69'], [0, 1.78, -0.05, 0.85, 0.35, 0.85, '#eceff1'], [0, 2.05, 0, 0.25, 0.45, 0.25, '#eceff1'],
      [-0.45, 1.85, 0, 0.2, 0.55, 0.15, '#eceff1'], [0.45, 1.85, 0, 0.2, 0.55, 0.15, '#eceff1'], [0, 1.1, -0.35, 0.7, 1.2, 0.12, '#6d4c41']],
    armR: [[0, -0.42, 0, 0.34, 0.88, 0.38, '#bf360c'], [0, -0.85, 0, 0.36, 0.22, 0.4, '#e0ac69'],
      [0, -0.95, 0.35, 0.12, 0.12, 0.7, '#5d4037'], [0, -0.95, 1.3, 0.14, 0.55, 1.6, '#cfd8dc'], [0, -0.95, 2.2, 0.1, 0.35, 0.25, '#eceff1']],
    armL: [[0, -0.42, 0, 0.34, 0.88, 0.38, '#bf360c'], [0, -0.85, 0, 0.36, 0.22, 0.4, '#e0ac69']] }),
  abilities: [
    { id: 'blade_fury', ai: { selfAoe: true, escape: 'aoe' }, shard: { desc: '剑刃风暴伤害 +20/秒，持续 +1 秒。', values: { dps: [100, 130, 160, 190], dur: 6 } },
      key: 'Q', name: '剑刃风暴', icon: '刃', color: '#ff8a65', target: 'none', castPoint: 0,
      mana: [120, 110, 100, 90], cd: [30, 26, 22, 18], values: { dps: [80, 110, 140, 170], radius: 4.5, dur: 5 },
      text: L => `旋转刀刃 ${L.dur} 秒：获得魔法免疫，每秒对周围 ${L.radius} 码敌人造成 ${L.dps} 点魔法伤害；期间无法普通攻击。`,
      onCast(c) { const h = c.caster; AB.addModifier(h, JUGG_FURY, h, { dur: c.v('dur'), data: { dps: c.v('dps'), r: c.v('radius') } });
        AB.ringP(h.x, h.z, 0.6, 28, ['#ff8a65', '#ffffff', '#bf360c'], 0.5, 0.35, 0.8, c.v('radius') / 0.5); AB.float(h, '剑刃风暴！', '#ffab91', 18, 1.1); } },
    { id: 'healing_ward', ai: { summon: 'jugg_ward' }, key: 'W', name: '治疗守卫', icon: '疗', color: '#66bb6a', target: 'point', range: 10, castPoint: 0.3,
      mana: [120, 130, 140, 150], cd: [60, 55, 50, 45], values: { heal: [2, 3, 4, 5], radius: 7, dur: 25 }, fmt: { heal: v => v + '%' },
      text: L => `召唤治疗守卫，每秒为周围 ${L.radius} 码友军恢复最大生命值的 ${L.heal}，持续 ${L.dur} 秒。重新召唤会替换旧守卫。`,
      onCast(c, pt) { const h = c.caster; for (const w of AB.owned(h, 'jugg_ward')) { w.expired = true; AB.kill(w, null); }
        const w = AB.summon(h, 'jugg_ward', pt.x, pt.z, { lvl: c.lvl, dur: c.v('dur'), invuln: true, control: false, gold: 0, xp: 0 });
        AB.addModifier(w, JUGG_HW, h, { dur: Infinity, data: { r: c.v('radius'), pct: c.v('heal') / 100 } });
        AB.ringP(pt.x, pt.z, 0.5, 20, ['#81c784', '#ffffff'], 0.45, 0.3, 0.4, 10); emit('healingWard', { unit: h.id, ward: w.id }); } },
    { id: 'blade_dance', key: 'E', name: '剑舞', icon: '舞', color: '#ffcc80', passive: true, values: { chance: [0.2, 0.25, 0.3, 0.35], mult: 2 },
      fmt: { chance: v => Math.round(v * 100) + '%', mult: v => v + '×' },
      text: L => `被动：攻击有 ${L.chance} 几率造成 ${L.mult} 暴击（对建筑无效）。`,
      modifyAttack(c, t, info) { if (t.isBuilding || Math.random() >= c.v('chance')) return; if (applyCrit(info, c.v('mult'))) emit('bladeDance', { unit: c.caster.id, target: t.id }); } },
    { id: 'omnislash', scepter: { desc: '持续时间 5/6/7 秒，跳跃范围 +2。', values: { dur: [5, 6, 7], radius: 7 } }, key: 'R', name: '无敌斩', icon: '斩', color: '#eceff1', ult: true, target: 'unit', range: 7, castPoint: 0.3,
      mana: [200, 275, 350], cd: [120, 100, 80], values: { dur: [3, 3.5, 4], dmg: [200, 250, 300], radius: 5 },
      text: L => `终极技能：进入无敌斩状态 ${L.dur} 秒，不断跳跃攻击 ${L.radius} 码内敌人，每次造成 ${L.dmg} 点物理伤害；期间无敌且无法普通攻击。`,
      ai: { engage: true },
      onCast(c, t) { const h = c.caster; AB.teleport(h, { x: t.x + 0.5, z: t.z }, { colors: ['#eceff1', '#ffffff'] });
        AB.addModifier(h, JUGG_OMNI, h, { dur: c.v('dur'), data: { dmg: c.v('dmg'), r: c.v('radius') } });
        AB.damage(h, t, c.v('dmg'), 'phys', 'omnislash', { big: true }); AB.float(h, '无敌斩！', '#eceff1', 20, 1.2); emit('omnislash', { unit: h.id, target: t.id }); } },
  ],
});
