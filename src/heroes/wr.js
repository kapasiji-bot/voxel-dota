// heroes/wr.js — 风行者 Windranger (ranged intelligence). Powershot (channel → lineWave), Shackleshot (stun if tree/unit
// behind target), Windrun (haste + evasion), Focus Fire (AS steroid vs one target, reduced damage).
const WR_SHACKLE = { id: 'wr_shackle', tag: '风缚', color: '#81c784', debuff: true };
const WR_RUN = { id: 'wr_run', name: '风行', color: '#a5d6a7',
  fx(u) { if (Math.random() < 0.45) spawnP(u.x + rnd(-0.5, 0.5), rnd(0.3, 2), u.z + rnd(-0.5, 0.5), rnd(-2, 2), 0.5, rnd(-2, 2), 0.4, 0.2, '#c8e6c9'); } };
const WR_FOCUS = { id: 'wr_focus', name: '集中火力', color: '#66bb6a' };
function wrBehindLatch(h, t, reach) {
  const dx = t.x - h.x, dz = t.z - h.z, len = Math.hypot(dx, dz) || 1, dir = { x: dx / len, z: dz / len };
  let unit = null;
  for (const u of units) {
    if (u.dead || u === t || u === h || u.isBuilding || u.isWard) continue;
    const rx = u.x - t.x, rz = u.z - t.z, p = rx * dir.x + rz * dir.z, lat = Math.abs(rx * dir.z - rz * dir.x);
    if (p > 0.4 && p < reach && lat < 1.6 + u.radius) { if (!unit || p < Math.hypot(unit.x - t.x, unit.z - t.z)) unit = u; }
  }
  const trees = AB.treesNear(t.x + dir.x * (reach * 0.45), t.z + dir.z * (reach * 0.45), 2.8);
  return { unit, trees: trees.length, dir, reach };
}
registerHero({
  id: 'wr', order: 24, name: '风行者', title: '莱瑞蕾', type: '远程 · 智力', color: '#2e7d32', nameColor: '#a5d6a7',
  desc: '远程智力型英雄。强力击蓄力射出穿透箭矢，风缚将敌人钉在树木或单位上，风行疾跑闪避，集中火力对单体倾泻箭雨。',
  ai: { role: 'carry', aggr: 1.1, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'desolator', 'bkb', 'daedalus', 'mkb'],
    combos: [{ id: 'wr_shackle_shot', steps: [{ slot: 1 }, { slot: 0, at: 'target' }], min: 1, radius: 4 }] },
  stats: { primary: 'int', str: 17, strG: 2.6, agi: 17, agiG: 1.9, int: 22, intG: 2.8, dmg: 24, armor: 1, bat: 1.5, range: 12,
    atkPoint: 0.4, backswing: 0.3, speed: 7.2, proj: 26, projColor: '#a5d6a7', hpRegen: 0.8, manaRegen: 0.9, radius: 0.55, height: 3.15 },
  portrait: { headY: 2.7 },
  model: () => humanoid({ pants: '#1b5e20', boots: '#33691e', skin: '#ffe0b2', sleeve: '#43a047', hip: 0.2, sh: 0.52, legH: 1.1, bodyH: 1.0, legW: 0.3,
    body: [[0, 0.5, 0, 0.72, 1.0, 0.44, '#43a047'], [0, 0.15, 0, 0.85, 0.28, 0.55, '#2e7d32'], [0, 1.42, 0, 0.64, 0.64, 0.64, '#ffe0b2'],
      [0, 1.75, -0.05, 0.8, 0.4, 0.8, '#81c784'], [-0.35, 1.95, 0.1, 0.35, 0.15, 0.5, '#a5d6a7'], [0.35, 1.95, 0.1, 0.35, 0.15, 0.5, '#a5d6a7'],
      [0, 1.0, -0.3, 0.65, 1.2, 0.1, '#1b5e20']],
    bodyGlow: [[-0.14, 1.48, 0.33, 0.1, 0.07, 0.02, '#69f0ae'], [0.14, 1.48, 0.33, 0.1, 0.07, 0.02, '#69f0ae']],
    armR: [[0, -0.4, 0, 0.3, 0.85, 0.32, '#43a047'], [0, -0.82, 0, 0.3, 0.18, 0.32, '#ffe0b2'],
      [0, -0.5, 0.4, 0.1, 1.2, 0.1, '#5d4037'], [0, 0.2, 0.4, 0.08, 0.08, 1.0, '#a5d6a7']],
    armL: [[0, -0.4, 0, 0.3, 0.85, 0.32, '#43a047'], [0, -0.82, 0, 0.3, 0.18, 0.32, '#ffe0b2']] }),
  abilities: [
    { id: 'powershot', channel: 1, shard: { desc: '强力击伤害 +40。', values: { dmg: [180, 260, 340, 420] } },
      key: 'Q', name: '强力击', icon: '箭', color: '#66bb6a', target: 'direction', castPoint: 0,
      mana: [90, 100, 110, 120], cd: [12, 11, 10, 9], values: { dmg: [140, 220, 300, 380], len: 18, w0: 1.6, w1: 1.6, speed: 28 },
      text: L => `持续施法最多 1 秒后射出强力箭矢，对一条长 ${L.len} 码直线上的敌人造成最高 ${L.dmg} 点魔法伤害（蓄力不足则伤害降低）。`,
      ai: { nuke: true },
      onChannelTick(c, pt, dt, ch) { if (Math.random() < dt * 8) spawnP(c.caster.x, 1.5, c.caster.z, rnd(-0.5, 0.5), 1, rnd(-0.5, 0.5), 0.3, 0.15, '#a5d6a7'); },
      onChannelEnd(c, pt, interrupted, ch) {
        const h = c.caster, pct = Math.max(0.35, Math.min(1, ch.t / ch.dur)), dir = AB.dir(h, pt || { x: h.x + Math.sin(h.facing), z: h.z + Math.cos(h.facing) });
        AB.lineWave({ caster: h, x: h.x, z: h.z, dir, len: c.v('len'), speed: c.v('speed'), w0: c.v('w0'), w1: c.v('w1'),
          colors: ['#81c784', '#c8e6c9', '#ffffff', '#a5d6a7'],
          onHit(u) { AB.damage(h, u, c.v('dmg') * pct, 'magic', 'powershot'); } });
        emit('powershot', { unit: h.id, pct: +pct.toFixed(2) });
      } },
    { id: 'shackleshot', ai: { disable: true }, key: 'W', name: '风缚', icon: '缚', color: '#81c784', target: 'unit', range: 13, castPoint: 0.15,
      mana: [70, 80, 90, 100], cd: [16, 14, 12, 10], values: { stun: [1.6, 2.2, 2.8, 3.4], short: 0.6, reach: 7 },
      text: L => `射出束缚之箭。若目标身后有树木或其他单位，眩晕 ${L.stun} 秒（并短暂束缚后方单位）；否则仅眩晕 ${L.short} 秒。`,
      onCast(c, t) {
        const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 32, color: '#a5d6a7', size: 0.45, trail: '#c8e6c9', onHit(u) {
          const latch = wrBehindLatch(h, u, c.v('reach')), full = !!(latch.unit || latch.trees);
          AB.stun(u, h, full ? c.v('stun') : c.v('short'));
          if (latch.unit && latch.unit.team !== h.team) AB.stun(latch.unit, h, c.v('stun') * 0.75);
          if (latch.unit && latch.unit.team === h.team) AB.addModifier(latch.unit, WR_SHACKLE, h, { dur: 0.5 });
          AB.burst(u.x, 1.4, u.z, 14, ['#a5d6a7', '#ffffff', '#2e7d32'], 4, 0.4, 0.25, 2, 0);
          emit('shackleshot', { unit: h.id, target: u.id, full: !!full });
        } });
      } },
    { id: 'windrun', ai: { escape: 'aoe' }, key: 'E', name: '风行', icon: '风', color: '#a5d6a7', target: 'none', castPoint: 0,
      mana: 50, cd: [15, 14, 13, 12], values: { ms: [0.4, 0.5, 0.6, 0.7], evasion: 1, dur: [3, 3.5, 4, 4.5] },
      fmt: { ms: v => Math.round(v * 100) + '%', evasion: v => Math.round(v * 100) + '%' },
      text: L => `${L.dur} 秒内移动速度提升 ${L.ms}，并获得 ${L.evasion} 闪避。`,
      onCast(c) { const h = c.caster; AB.addModifier(h, WR_RUN, h, { dur: c.v('dur'), props: { msPct: c.v('ms'), evasion: c.v('evasion') } });
        AB.ringP(h.x, h.z, 0.5, 22, ['#c8e6c9', '#ffffff'], 0.4, 0.3, 0.6, 10); AB.float(h, '风行！', '#a5d6a7', 16, 1); } },
    { id: 'focus_fire', scepter: { desc: '伤害惩罚降至 25%，攻速 +600。', values: { as: 600, pen: 0.25 } }, key: 'R', name: '集中火力', icon: '火', color: '#1b5e20', ult: true, target: 'unit', range: 14, castPoint: 0,
      mana: [75, 100, 125], cd: [60, 50, 40], values: { as: [400, 500, 600], pen: [0.4, 0.35, 0.3], dur: 20 },
      fmt: { pen: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：对目标集中火力 ${L.dur} 秒，攻击速度 +${L.as}，但对该目标的攻击伤害降低 ${L.pen}。`,
      ai: { engage: true },
      modifyAttack(c, t, info) {
        const m = getMod(c.caster, 'wr_focus'); if (!m || !m.data.tgt || m.data.tgt !== t || t.dead) return;
        info.dmg *= 1 - m.data.pen;
      },
      onCast(c, t) { const h = c.caster;
        AB.addModifier(h, WR_FOCUS, h, { dur: c.v('dur'), props: { as: c.v('as') }, data: { tgt: t, pen: c.v('pen') } });
        issueOrder(h, { type: 'attack', target: t });
        AB.float(h, '集中火力！', '#81c784', 18, 1.1); emit('focusFire', { unit: h.id, target: t.id }); } },
  ],
});
