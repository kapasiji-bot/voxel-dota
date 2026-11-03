// heroes/sshaman.js — 暗影萨满 Shadow Shaman (ranged intelligence). Ether Shock (chain), Hex, Shackles (channel stun),
// Mass Serpent Ward (stationary attacking summons).
registerSummon({ id: 'ss_ward', name: '蛇棒', hp: 150, armor: 0, dmg: [40, 40], bat: 1.0, range: 9, proj: 24, projColor: '#81c784',
  speed: 0.01, radius: 0.4, height: 2.2, gold: 20, xp: 10, vision: 8, stationary: true, fx: ['#66bb6a', '#1b5e20', '#ffffff'],
  portrait: { headY: 1.6 },
  model: () => ({ body: { p: [0, 0, 0], b: [[0, 0.4, 0, 0.35, 0.9, 0.35, '#5d4037'], [0, 1.1, 0, 0.55, 0.7, 0.45, '#2e7d32'],
    [0, 1.7, 0, 0.35, 0.45, 0.35, '#81c784'], [-0.12, 1.55, 0.2, 0.1, 0.1, 0.02, '#ffeb3b'], [0.12, 1.55, 0.2, 0.1, 0.1, 0.02, '#ffeb3b']],
    g: [[0, 1.85, 0, 0.2, 0.25, 0.2, '#aed581']] } }) });
const SS_SHACKLE = { id: 'ss_shackle', tag: '枷锁', color: '#8d6e63', debuff: true, states: ['stunned'] };
registerHero({
  id: 'sshaman', order: 40, name: '暗影萨满', title: '拉什塔泽尔', type: '远程 · 智力', color: '#2e7d32', nameColor: '#aed581',
  desc: '远程智力型控制。以太冲击跳跃打击，妖术变蛙，枷锁持续禁锢，集群蛇棒输出建筑与英雄。',
  ai: { role: 'support', aggr: 1.0, skills: [1, 0, 2, 1, 1, 3, 1, 0, 0, 0, 3, 2, 2, 2, 3], build: ['arcane', 'blink', 'force', 'scepter', 'scythe'],
    combos: [{ id: 'ss_hex_shackle', steps: [{ slot: 1 }, { slot: 2, at: 'target' }], min: 1, radius: 4 }] },
  stats: { primary: 'int', str: 19, strG: 2.0, agi: 16, agiG: 1.6, int: 23, intG: 3.2, dmg: 22, armor: 1, bat: 1.7, range: 11,
    atkPoint: 0.3, backswing: 0.5, speed: 6.6, proj: 20, projColor: '#aed581', hpRegen: 0.8, manaRegen: 1.0, radius: 0.6, height: 3.1 },
  portrait: { headY: 2.55 },
  model: () => humanoid({ pants: '#1b5e20', boots: '#3e2723', skin: '#81c784', sleeve: '#33691e', hip: 0.24, sh: 0.55, legH: 1.0, bodyH: 0.95, legW: 0.34,
    body: [[0, 0.45, 0, 0.8, 0.95, 0.5, '#33691e'], [0, 0.5, 0.26, 0.45, 0.35, 0.04, '#c5e1a5'], [0, 0.08, 0, 0.9, 0.22, 0.55, '#1b5e20'],
      [0, 1.35, 0, 0.68, 0.68, 0.68, '#81c784'], [0, 1.7, -0.05, 0.9, 0.4, 0.85, '#5d4037'], [0, 2.05, 0.1, 0.55, 0.35, 0.55, '#8d6e63'],
      [-0.2, 1.9, 0.15, 0.2, 0.45, 0.15, '#ffeb3b'], [0.2, 1.9, 0.15, 0.2, 0.45, 0.15, '#ffeb3b'],
      [-0.15, 1.42, 0.36, 0.12, 0.08, 0.02, '#1b5e20'], [0.15, 1.42, 0.36, 0.12, 0.08, 0.02, '#1b5e20']],
    bodyGlow: [[0, 1.95, 0.3, 0.25, 0.2, 0.05, '#ffeb3b']],
    armR: [[0, -0.4, 0, 0.32, 0.85, 0.34, '#33691e'], [0, -0.15, 0.2, 0.1, 1.6, 0.1, '#5d4037'], [0, 0.7, 0.2, 0.35, 0.35, 0.35, '#efebe9']],
    armL: [[0, -0.4, 0, 0.32, 0.85, 0.34, '#33691e'], [0, -0.85, 0, 0.34, 0.2, 0.36, '#81c784']] }),
  abilities: [
    { id: 'ether_shock', ai: { nuke: true }, shard: { desc: '以太冲击伤害 +40，跳跃 +1。', values: { dmg: [180, 240, 300, 360], jumps: [2, 4, 6, 8] } },
      key: 'Q', name: '以太冲击', icon: '冲', color: '#66bb6a', target: 'unit', range: 11, castPoint: 0.3,
      mana: [95, 105, 135, 160], cd: [14, 12, 10, 8], values: { dmg: [140, 200, 260, 320], jumps: [1, 3, 5, 7], radius: 6 },
      text: L => `释放跳跃闪电，最多命中 ${L.jumps} 个额外敌人（共最多 ${L.jumps}+1），每个造成 ${L.dmg} 点魔法伤害。`,
      onCast(c, t) {
        const h = c.caster;
        AB.chain({ caster: h, first: t, jumps: c.v('jumps') + 1, radius: c.v('radius'), delay: 0.1, ability: 'ether_shock', color: '#aed581',
          onHit(u) { AB.damage(h, u, c.v('dmg'), 'magic', 'ether_shock'); } });
        emit('etherShock', { unit: h.id, target: t.id });
      } },
    { id: 'ss_hex', ai: { disable: true }, key: 'W', name: '妖术', icon: '蛙', color: '#8bc34a', target: 'unit', range: 10, castPoint: 0,
      mana: [70, 110, 150, 190], cd: [20, 16, 12, 8], values: { dur: [1.25, 1.75, 2.25, 2.75] },
      text: L => `把一名敌人变成小动物，持续 ${L.dur} 秒：无法攻击和施法，移动速度大幅降低。`,
      onCast(c, t) { AB.hex(t, c.caster, c.v('dur')); AB.float(t, '呱！', '#c5e1a5', 18, 1); emit('ssHex', { unit: c.caster.id, target: t.id }); } },
    { id: 'shackles', ai: { disable: true, commit: true }, key: 'E', name: '枷锁', icon: '锁', color: '#6d4c41', target: 'unit', range: 7, castPoint: 0.3,
      channel: [2.75, 3.5, 4.25, 5.0], mana: [125, 140, 155, 170], cd: [16, 14, 12, 10],
      values: { dps: [60, 80, 100, 120], breakR: 12 },
      text: L => `持续施法：用枷锁禁锢一名敌人并每秒造成 ${L.dps} 点魔法伤害。距离超过 ${L.breakR} 码或被打断则结束。`,
      onChannelStart(c, t, ch) {
        AB.addModifier(t, SS_SHACKLE, c.caster, { dur: ch.dur + 0.1 });
        emit('shackles', { unit: c.caster.id, target: t.id });
      },
      onChannelTick(c, t, dt, ch) {
        const h = c.caster;
        if (!t || t.dead || dst(h, t) > c.v('breakR') || hasState(t, 'magicImmune')) return false;
        if (!getMod(t, 'ss_shackle')) return false;
        AB.damage(h, t, c.v('dps') * dt, 'magic', 'shackles', { silent: true });
        if ((ch.data.fx = (ch.data.fx || 0) - dt) <= 0) {
          ch.data.fx = 0.08; AB.tetherFx(t, h.x, h.z, '#a1887f');
          spawnP(t.x + rnd(-0.3, 0.3), rnd(0.5, 2), t.z + rnd(-0.3, 0.3), 0, 0.5, 0, 0.35, 0.15, '#8d6e63');
        }
      },
      onChannelEnd(c, t) { if (t) removeModById(t, 'ss_shackle'); } },
    { id: 'serpent_ward', ai: { summon: 'ss_ward', ultAoe: { radius: 5, min: 1, units: true } },
      scepter: { desc: '蛇棒攻击力 +25，数量 +2。', values: { count: [10, 12, 14], dmg: [65, 85, 105] } },
      key: 'R', name: '群蛇守卫', icon: '蛇', color: '#1b5e20', ult: true, target: 'point', range: 9, castPoint: 0.3,
      mana: [200, 300, 400], cd: [110, 100, 90], values: { count: [8, 10, 12], dmg: [40, 60, 80], dur: 45, spread: 9 },
      text: L => `终极技能：在目标点周围召唤 ${L.count} 根蛇棒，持续 ${L.dur} 秒。每根攻击力 ${L.dmg}，射程 ${L.reach} 码，优先攻击英雄与建筑。`,
      onCast(c, pt) {
        const h = c.caster, n = c.v('count'), dmg = c.v('dmg'), dur = c.v('dur');
        for (const w of AB.owned(h, 'ss_ward')) { w.expired = true; AB.kill(w, null); }
        const wards = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.28, r = 1.2 + (i % 3) * 0.55;
          const wx = pt.x + Math.cos(a) * r, wz = pt.z + Math.sin(a) * r;
          const w = AB.summon(h, 'ss_ward', wx, wz, { lvl: c.lvl, dmg: [dmg, dmg], dur, gold: 20, xp: 10 });
          w.order = { type: 'hold' }; wards.push(w);
        }
        AB.ringP(pt.x, pt.z, 0.5, 28, ['#66bb6a', '#c5e1a5'], 0.45, 0.3, 0.4, 8);
        AB.float(h, '群蛇守卫！', '#aed581', 20, 1.1);
        emit('serpentWard', { unit: h.id, n: wards.length });
      } },
  ],
});
