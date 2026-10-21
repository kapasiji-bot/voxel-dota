// heroes/es.js — 撼地者 Earthshaker (melee strength). Fissure (line stun + temporary impassable voxel wall — engine: map/walls.js),
// Enchant Totem (next attack deals bonus % damage), Aftershock (passive: every spell cast stuns + damages nearby enemies —
// onAbilityCast hook), Echo Slam (damage grows with the number of enemy units nearby; heroes echo twice).
const ES_TOTEM = { id: 'es_totem', name: '强化图腾', color: '#ffb300' };
registerHero({
  id: 'es', order: 18, name: '撼地者', title: '撼地神牛', type: '近战 · 力量', color: '#8d6e63', nameColor: '#ffcc80',
  desc: '近战力量型先手。沟壑眩晕一条直线并升起岩墙阻断道路，每次施法都会引发余震，回音击在敌人扎堆时造成毁灭性伤害。',
  stats: { primary: 'str', str: 22, strG: 3.2, agi: 12, agiG: 1.4, int: 16, intG: 2.1, dmg: 30, armor: 2, bat: 1.7, range: 2.3,
    atkPoint: 0.47, backswing: 0.53, speed: 6.9, proj: 0, hpRegen: 1.5, manaRegen: 0.6, radius: 0.75, height: 3.5 },
  portrait: { headY: 2.8 },
  ai: { role: 'tank', skills: [0, 2, 0, 1, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'blink', 'mekansm', 'scepter'],
    combos: [{ id: 'es_blink_fissure_echo', steps: ['blink', { slot: 0, at: 'center' }, { slot: 3 }], min: 2, radius: 5 }] },   // ai/bot/combos.js
  model: () => humanoid({ pants: '#5d4037', boots: '#3e2723', skin: '#a1887f', sleeve: '#a1887f', hip: 0.3, sh: 0.72, legH: 1.05, bodyH: 1.2, legW: 0.42,
    body: [[0, 0.55, 0, 1.2, 1.1, 0.75, '#8d6e63'], [0, 1.15, 0, 1.4, 0.3, 0.85, '#6d4c41'], [0, 0.0, 0, 1.1, 0.3, 0.7, '#4e342e'],
      [0, 1.65, 0.05, 0.8, 0.75, 0.8, '#a1887f'], [-0.55, 1.95, 0, 0.35, 0.18, 0.18, '#efebe9'], [0.55, 1.95, 0, 0.35, 0.18, 0.18, '#efebe9'],
      [0, 1.45, 0.45, 0.5, 0.25, 0.1, '#5d4037']],
    bodyGlow: [[-0.18, 1.72, 0.46, 0.14, 0.1, 0.02, '#ffab40'], [0.18, 1.72, 0.46, 0.14, 0.1, 0.02, '#ffab40']],
    armR: [[0, -0.45, 0, 0.44, 0.95, 0.46, '#a1887f'], [0, -0.95, 0.35, 0.16, 0.16, 1.6, '#6d4c41'], [0, -0.95, 1.2, 0.5, 0.5, 0.6, '#8d6e63']] }),
  abilities: [
    { id: 'fissure', key: 'Q', name: '沟壑', icon: '沟', color: '#8d6e63', target: 'direction', castPoint: 0.55,
      mana: [110, 120, 130, 140], cd: [21, 19, 17, 15], values: { len: 13, w1: 2.5, dmg: [110, 160, 210, 260], stun: [1, 1.25, 1.5, 1.75], dur: 6.5 },
      text: L => `用图腾猛击地面，形成长 ${L.len} 码的沟壑，对沿线敌人造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒。沟壑升起岩墙，${L.dur} 秒内任何单位都无法通过。`,
      onCast(c, pt) { const h = c.caster, d = AB.dir(h, pt), x0 = h.x + d.x * 1.5, z0 = h.z + d.z * 1.5, L = c.v('len');
        for (const u of AB.enemiesIn(h, h.x, h.z, L + 2)) { const rx = u.x - x0, rz = u.z - z0, p = rx * d.x + rz * d.z, lat = Math.abs(rx * d.z - rz * d.x);
          if (p >= -1 && p <= L + 0.5 && lat <= c.v('w1') / 2 + u.radius) { AB.damage(h, u, c.v('dmg'), 'magic', 'fissure'); AB.stun(u, h, c.v('stun')); } }
        const w = addWall(wallLine(x0, z0, d, L), c.v('dur'), h, d); emit('fissure', { unit: h.id, cells: w.cells.length });
        AB.spikes && AB.spikes(x0, z0, d, L, 40, '#8d6e63'); } },
    { id: 'totem', key: 'W', name: '强化图腾', icon: '图', color: '#ffb300', target: 'none', castPoint: 0.5,
      mana: [35, 40, 45, 50], cd: 5, values: { mult: [1, 2, 3, 4], dur: 14 }, fmt: { mult: v => Math.round(v * 100) + '%' },
      text: L => `强化图腾：${L.dur} 秒内的下一次攻击额外造成 ${L.mult} 基础攻击力的伤害。`,
      onCast(c) { const h = c.caster; AB.addModifier(h, ES_TOTEM, h, { dur: c.v('dur'), data: { mult: c.v('mult') } }); AB.burst(h.x, 3.5, h.z, 20, ['#ffb300', '#ffe082', '#8d6e63'], 4, 0.5, 0.3, 3, 0); },
      modifyAttack(c, t, info) { const h = c.caster, m = getMod(h, 'es_totem'); if (!m || t.isBuilding) return;
        info.dmg += h.dmgBase * m.data.mult; info.crit = 1 + m.data.mult; removeModById(h, 'es_totem'); emit('totemHit', { unit: h.id, target: t.id });
        AB.burst(t.x, 0.5, t.z, 24, ['#ffb300', '#8d6e63', '#ffffff'], 6, 0.5, 0.3, 4, 0); } },
    { id: 'aftershock', key: 'E', name: '余震', icon: '震', color: '#a1887f', passive: true, values: { radius: 4.5, stun: [0.6, 0.9, 1.2, 1.5], dmg: [50, 75, 100, 125] },
      text: L => `被动：每次施放技能时，对周围 ${L.radius} 码内的敌人造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒。`,
      onAbilityCast(c) { const h = c.caster;
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) { AB.damage(h, u, c.v('dmg'), 'magic', 'aftershock'); AB.stun(u, h, c.v('stun')); }
        AB.ringP(h.x, h.z, 0.6, 30, ['#a1887f', '#d7ccc8', '#6d4c41'], 0.4, 0.3, 0.3, c.v('radius') / 0.4); emit('aftershock', { unit: h.id }); } },
    { id: 'echo', ai: { ultAoe: { radius: 'radius', min: 2, units: 5 } }, scepter: { desc: '每个回音的伤害提升至 75/100/125。', values: { echo: [75, 100, 125] } }, key: 'R', name: '回音击', icon: '回', color: '#5d4037', ult: true, target: 'none', castPoint: 0,
      mana: [145, 205, 265], cd: [130, 110, 90], values: { radius: 8, dmg: [100, 140, 180], echo: [50, 70, 90] },
      text: L => `终极技能：震撼大地，对 ${L.radius} 码内的敌人造成 ${L.dmg} 点魔法伤害；范围内每个其他敌方单位（英雄算两次）再为每名敌人带来 ${L.echo} 点回音伤害。`,
      onCast(c) { const h = c.caster, R = c.v('radius'), list = AB.enemiesIn(h, h.x, h.z, R); let echoes = 0;
        for (const u of list) { AB.damage(h, u, c.v('dmg'), 'magic', 'echo');
          const n = list.reduce((a, o) => a + (o === u ? 0 : o.isHero ? 2 : 1), 0); echoes += n;
          if (n) delay(0.35, () => { if (!u.dead) { AB.damage(h, u, c.v('echo') * n, 'magic', 'echo_wave'); AB.burst(u.x, 1, u.z, 10, ['#8d6e63', '#ffcc80'], 4, 0.4, 0.25, 2, 0); } }); }
        for (let r = 1; r <= 3; r++) AB.ringP(h.x, h.z, 0.6, 40, ['#8d6e63', '#d7ccc8', '#ffcc80'], 0.25 * r, 0.35, 0.35, R / (0.25 * r));
        emit('echoSlam', { unit: h.id, n: list.length, echoes }); } },
  ],
});
