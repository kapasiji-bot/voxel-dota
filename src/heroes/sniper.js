// heroes/sniper.js — 狙击手 Sniper (ranged agility). Shrapnel (delayed AoE DoT+slow), Headshot (passive proc),
// Take Aim (passive attack range), Assassinate (long-range channel nuke).
const SN_SHRAP = { id: 'sn_shrap', tag: '榴霰', color: '#ffcc80', debuff: true };
const SN_HEAD = { id: 'sn_head', tag: '爆头', color: '#ef9a9a', debuff: true };
registerHero({
  id: 'sniper', order: 28, name: '狙击手', title: '卡德尔', type: '远程 · 敏捷', color: '#5d4037', nameColor: '#ffcc80',
  desc: '远程敏捷型射手。榴霰弹区域持续伤害减速，爆头被动追加伤害，瞄准提升射程，暗杀进行远距离引导狙杀。',
  ai: { role: 'carry', aggr: 1.05, skills: [2, 0, 1, 2, 2, 3, 2, 0, 0, 0, 3, 1, 1, 1, 3], build: ['phase', 'desolator', 'daedalus', 'mkb', 'butterfly'],
    combos: [{ id: 'sn_shrap_ass', steps: [{ slot: 0, at: 'target' }, { slot: 3 }], min: 1, radius: 5 }] },
  stats: { primary: 'agi', str: 19, strG: 2.0, agi: 27, agiG: 3.2, int: 15, intG: 2.6, dmg: 22, armor: 0, bat: 1.7, range: 11,
    atkPoint: 0.17, backswing: 0.7, speed: 6.6, proj: 30, projColor: '#ffcc80', hpRegen: 0.7, manaRegen: 0.7, radius: 0.55, height: 3.15 },
  portrait: { headY: 2.7 },
  model: () => humanoid({ pants: '#3e2723', boots: '#212121', skin: '#d7ccc8', sleeve: '#6d4c41', hip: 0.22, sh: 0.55, legH: 1.1, bodyH: 1.0, legW: 0.32,
    body: [[0, 0.5, 0, 0.78, 1.0, 0.48, '#6d4c41'], [0, 0.15, 0, 0.9, 0.28, 0.58, '#5d4037'], [0, 0.75, 0.26, 0.5, 0.35, 0.04, '#ffcc80'],
      [0, 1.42, 0, 0.66, 0.66, 0.66, '#d7ccc8'], [0, 1.75, -0.05, 0.8, 0.35, 0.8, '#8d6e63'], [0, 2.0, 0.1, 0.55, 0.2, 0.55, '#ffcc80'],
      [0, 1.0, -0.32, 0.7, 1.2, 0.1, '#3e2723']],
    bodyGlow: [[-0.14, 1.48, 0.34, 0.1, 0.07, 0.02, '#ffab40'], [0.14, 1.48, 0.34, 0.1, 0.07, 0.02, '#ffab40']],
    armR: [[0, -0.4, 0, 0.3, 0.85, 0.34, '#6d4c41'], [0, -0.82, 0, 0.3, 0.18, 0.34, '#d7ccc8'],
      [0, -0.55, 0.55, 0.12, 0.12, 1.4, '#5d4037'], [0, -0.55, 1.4, 0.18, 0.18, 0.5, '#ffcc80']],
    armL: [[0, -0.4, 0, 0.3, 0.85, 0.34, '#6d4c41'], [0, -0.82, 0, 0.3, 0.18, 0.34, '#d7ccc8']] }),
  abilities: [
    { id: 'shrapnel', ai: { nuke: true }, shard: { desc: '榴霰弹伤害 +15/秒，减速 +5%。', values: { dps: [25, 40, 55, 70], slow: 0.25 } },
      key: 'Q', name: '榴霰弹', icon: '弹', color: '#ffb74d', target: 'point', range: 16, castPoint: 0.3,
      mana: [50, 60, 70, 80], cd: [8, 7, 6, 5], values: { radius: 5, delay: 0.8, dps: [15, 30, 45, 60], slow: 0.2, dur: 8 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `向目标区域发射榴霰弹，${L.delay} 秒后落地：${L.dur} 秒内每秒造成 ${L.dps} 点魔法伤害并减速 ${L.slow}（半径 ${L.radius}）。`,
      onCast(c, pt) { const h = c.caster, r = c.v('radius'), dps = c.v('dps'), sl = c.v('slow'), dur = c.v('dur');
        AB.delayedArea({ caster: h, x: pt.x, z: pt.z, radius: r, delay: c.v('delay'), colors: ['#ffcc80', '#ffb74d'],
          onLand() {
            AB.burst(pt.x, 1.2, pt.z, 22, ['#ffcc80', '#8d6e63', '#ffffff'], 6, 0.5, 0.3, 3, 0);
            AB.groundArea({ caster: h, x: pt.x, z: pt.z, radius: r, dur, tick: 0.5,
              onTick(enemies) {
                for (const e of enemies) if (!e.isBuilding) {
                  AB.damage(h, e, dps * 0.5, 'magic', 'shrapnel', { silent: true });
                  AB.addModifier(e, SN_SHRAP, h, { dur: 0.6, props: { msPct: -sl } });
                }
              },
              fx(a) { if (Math.random() < 0.35) { const ang = Math.random() * 6.28, rr = Math.random() * a.r; spawnP(a.x + Math.cos(ang) * rr, rnd(0.2, 1.2), a.z + Math.sin(ang) * rr, 0, 1, 0, 0.5, 0.18, '#ffe0b2'); } } });
            emit('shrapnel', { unit: h.id });
          } }); } },
    { id: 'headshot', key: 'W', name: '爆头', icon: '头', color: '#ef5350', passive: true,
      values: { chance: [0.25, 0.3, 0.35, 0.4], dmg: [30, 50, 70, 90], slow: 0.8, dur: 0.5 },
      fmt: { chance: v => Math.round(v * 100) + '%', slow: v => Math.round(v * 100) + '%' },
      text: L => `被动：攻击有 ${L.chance} 几率造成额外 ${L.dmg} 点物理伤害，并减速 ${L.slow}，持续 ${L.dur} 秒。`,
      modifyAttack(c, t, info) {
        if (t.isBuilding || Math.random() >= c.v('chance')) return;
        info.dmg += c.v('dmg');
        AB.addModifier(t, SN_HEAD, c.caster, { dur: c.v('dur'), props: { msPct: -c.v('slow') } });
        emit('headshot', { unit: c.caster.id, target: t.id });
      } },
    { id: 'take_aim', key: 'E', name: '瞄准', icon: '瞄', color: '#a1887f', passive: true,
      values: { range: [1.5, 2.5, 3.5, 4.5] },
      text: L => `被动：攻击距离增加 ${L.range} 码。`,
      passiveProps: c => ({ range: c.v('range') }) },
    { id: 'assassinate', ai: { engage: true, finisher: 'dmg' }, scepter: { desc: '伤害提升至 400/550/700，施法距离 +5。', values: { dmg: [400, 550, 700] }, range: 45 },
      key: 'R', name: '暗杀', icon: '狙', color: '#bf360c', ult: true, target: 'unit', range: 40, castPoint: 0, channel: 2,
      mana: [175, 250, 325], cd: [20, 15, 10], values: { dmg: [320, 440, 560] },
      text: L => `终极技能：瞄准一名敌人持续施法 2 秒，结束后造成 ${L.dmg} 点魔法伤害（被打断则取消）。施法距离极远。`,
      onChannelTick(c, t) {
        if (!t || t.dead) return false;
        if (Math.random() < 0.5) AB.tetherFx(c.caster, t.x, t.z, '#ffcc80');
        spawnP(c.caster.x, 1.8, c.caster.z, rnd(-0.3, 0.3), 0.5, rnd(-0.3, 0.3), 0.25, 0.12, '#ffcc80');
      },
      onChannelEnd(c, t, interrupted) {
        if (interrupted || !t || t.dead) return;
        const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 45, color: '#ffcc80', size: 0.55, trail: '#ffe0b2', onHit(u) {
          AB.damage(h, u, c.v('dmg'), 'magic', 'assassinate', { big: true });
          AB.burst(u.x, 1.5, u.z, 20, ['#ffcc80', '#bf360c', '#ffffff'], 6, 0.55, 0.3, 3, 0);
        } });
        emit('assassinate', { unit: h.id, target: t.id });
      } },
  ],
});
