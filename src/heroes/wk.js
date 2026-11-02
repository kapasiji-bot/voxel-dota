// heroes/wk.js — 冥魂大帝 Wraith King / Skeleton King (melee strength). Wraithfire Blast (projectile stun + DoT slow),
// Vampiric Aura (ally lifesteal via modifier onAttackLand), Mortal Strike (passive crit), Reincarnation (skill save on death).
const WK_BLAST_SLOW = { id: 'wk_blast', tag: '冥火', color: '#ef5350', debuff: true, tick: 1,
  onTick(u, m) { AB.damage(m.src, u, m.data.dot, 'magic', 'wraithfire', { silent: true }); },
  fx(u) { if (Math.random() < 0.25) spawnP(u.x + rnd(-0.4, 0.4), rnd(0.8, 2), u.z + rnd(-0.4, 0.4), 0, 0.8, 0, 0.4, 0.15, '#ef9a9a'); } };
const WK_VAMP = { id: 'wk_vamp', name: '吸血', color: '#e53935',
  onAttackLand(u, m, t, dealt) {
    if (!dealt || t.isBuilding || t.isWard) return;
    const heal = dealt * (m.data.ls || 0); if (heal <= 0) return;
    u.hp = Math.min(u.maxHp, u.hp + heal);
    if (heal > 10 && (u === G.player || (u.owner && u.owner === G.player))) AB.float(u, '+' + Math.round(heal), '#ef5350', 12, 0.7);
  } };
registerHero({
  id: 'wk', order: 25, name: '冥魂大帝', title: '奥斯塔里昂', type: '近战 · 力量', color: '#b71c1c', nameColor: '#ef9a9a',
  desc: '近战力量型英雄。冥火爆击眩晕并灼烧，吸血光环强化队友普攻回复，致命一击暴击，重生让他在冷却就绪时死后原地归来。',
  ai: { role: 'tank', aggr: 1.05, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'vanguard', 'bkb', 'heart', 'assault'] },
  stats: { primary: 'str', str: 24, strG: 3.0, agi: 18, agiG: 1.8, int: 18, intG: 1.8, dmg: 30, armor: 1, bat: 1.7, range: 2.6,
    atkPoint: 0.5, backswing: 0.5, speed: 7.0, proj: 0, hpRegen: 1.5, manaRegen: 0.7, radius: 0.7, height: 3.5 },
  portrait: { headY: 2.95 },
  model: () => humanoid({ pants: '#212121', boots: '#111', skin: '#eeeeee', sleeve: '#757575', hip: 0.3, sh: 0.8, legH: 1.2, bodyH: 1.2, legW: 0.45,
    body: [[0, 0.6, 0, 1.1, 1.2, 0.7, '#616161'], [0, 0.65, 0.36, 0.7, 0.7, 0.04, '#b71c1c'], [0, 0.15, 0, 1.2, 0.25, 0.8, '#37474f'],
      [0, 1.7, 0, 0.85, 0.85, 0.85, '#eeeeee'], [0, 1.75, 0.4, 0.7, 0.25, 0.05, '#212121'], [-0.2, 1.8, 0.42, 0.12, 0.1, 0.02, '#ef5350'], [0.2, 1.8, 0.42, 0.12, 0.1, 0.02, '#ef5350'],
      [0, 2.25, 0, 0.95, 0.35, 0.95, '#b71c1c'], [-0.55, 2.15, 0, 0.2, 0.55, 0.2, '#eeeeee'], [0.55, 2.15, 0, 0.2, 0.55, 0.2, '#eeeeee'],
      [0, 1.2, -0.45, 1.0, 1.5, 0.12, '#b71c1c']],
    armR: [[0, -0.45, 0, 0.4, 0.95, 0.44, '#757575'], [0, -0.9, 0, 0.42, 0.28, 0.46, '#eeeeee'],
      [0, -1.0, 0.3, 0.14, 0.14, 0.7, '#5d4037'], [0, -1.0, 1.5, 0.2, 0.7, 1.8, '#cfd8dc'], [0, -1.0, 2.5, 0.35, 0.35, 0.35, '#b71c1c']],
    armL: [[0, -0.45, 0, 0.4, 0.95, 0.44, '#757575'], [0, -0.9, 0, 0.42, 0.28, 0.46, '#eeeeee']] }),
  abilities: [
    { id: 'wraithfire', ai: { disable: true }, shard: { desc: '冥火爆击伤害 +40，眩晕 +0.2 秒。', values: { dmg: [140, 220, 300, 380], stun: [1.6, 1.8, 2.0, 2.2] } },
      key: 'Q', name: '冥火爆击', icon: '火', color: '#e53935', target: 'unit', range: 10, castPoint: 0.35,
      mana: [100, 110, 120, 130], cd: [11, 10, 9, 8], values: { dmg: [100, 160, 220, 280], stun: [1.4, 1.6, 1.8, 2.0], dot: [15, 25, 35, 45], slow: 0.2, dur: 2 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `发射冥火骷髅，造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒，随后减速 ${L.slow} 并每秒受到 ${L.dot} 点魔法伤害，持续 ${L.dur} 秒。`,
      onCast(c, t) { const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 18, color: '#ef5350', size: 0.7, trail: '#ffcdd2', onHit(u) {
          AB.damage(h, u, c.v('dmg'), 'magic', 'wraithfire'); AB.stun(u, h, c.v('stun'));
          AB.addModifier(u, WK_BLAST_SLOW, h, { dur: c.v('dur'), props: { msPct: -c.v('slow') }, data: { dot: c.v('dot') } });
          AB.burst(u.x, 1.5, u.z, 18, ['#ef5350', '#b71c1c', '#ffffff'], 5, 0.5, 0.25, 2, 0);
        } }); } },
    { id: 'vampiric', key: 'W', name: '吸血光环', icon: '血', color: '#c62828', passive: true,
      values: { ls: [0.12, 0.18, 0.24, 0.3], radius: 14 }, fmt: { ls: v => Math.round(v * 100) + '%' },
      text: L => `光环：${L.radius} 码内友方单位攻击吸血 ${L.ls}。`,
      aura: { radius: 14, mod: WK_VAMP, props: () => ({}), data: c => ({ ls: c.v('ls') }) } },
    { id: 'mortal_strike', key: 'E', name: '致命一击', icon: '击', color: '#ffcdd2', passive: true, values: { chance: [0.1, 0.15, 0.2, 0.25], mult: [1.5, 2.0, 2.5, 3.0] },
      fmt: { chance: v => Math.round(v * 100) + '%', mult: v => v + '×' },
      text: L => `被动：攻击有 ${L.chance} 几率造成 ${L.mult} 暴击（对建筑无效）。`,
      modifyAttack(c, t, info) { if (t.isBuilding || Math.random() >= c.v('chance')) return; if (applyCrit(info, c.v('mult'))) emit('mortalStrike', { unit: c.caster.id, target: t.id }); } },
    { id: 'reincarnation', reincarnate: true, scepter: { desc: '重生延迟降至 1.5 秒，冷却 40/30/20 秒。', cd: [40, 30, 20], values: { delay: 1.5 } },
      key: 'R', name: '重生', icon: '生', color: '#bdbdbd', ult: true, passive: true,
      mana: [140, 180, 220], cd: [60, 50, 40], values: { delay: 3, slow: 0.5, radius: 9, dur: 3 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `被动·终极：死亡时若魔法充足且不在冷却，消耗魔法并在 ${L.delay} 秒后原地重生（不计入死亡与赏金）。重生时周围 ${L.radius} 码敌人减速 ${L.slow}，持续 ${L.dur} 秒。`,
      onReincarnate(c) {
        const h = c.caster, dly = c.v('delay'), r = c.v('radius'), sl = c.v('slow'), dur = c.v('dur');
        delay(dly + 0.05, () => {
          if (h.dead) return;
          for (const u of AB.enemiesIn(h, h.x, h.z, r)) AB.slow(u, h, dur, sl);
          AB.ringP(h.x, h.z, 1, 30, ['#eeeeee', '#b71c1c', '#bdbdbd'], 0.6, 0.4, 1.0, r / 0.6);
        });
      } },
  ],
});
