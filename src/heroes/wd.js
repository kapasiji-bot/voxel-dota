// heroes/wd.js — 巫医 Witch Doctor (ranged intelligence). Paralyzing Cask (bouncing stun, may rebounce), Voodoo Restoration (toggle:
// heal aura, drains mana per second — engine: abilities/toggle.js), Maledict (DoT + bursts based on HP lost since cast),
// Death Ward (channelled ward: invulnerable stationary summon that lives only while WD channels; its attacks bounce).
const WD_WARD_BOUNCE = { id: 'wd_bounce', passive: true, name: '弹射', icon: '弹', color: '#76ff03',
  onAttackLand(c, t, dealt) { const w = c.caster; if (!w.owner || !(w.bounces > 0)) return;
    AB.bounce({ src: w, from: t, first: enemiesInRadius(w.team, t.x, t.z, 8).filter(e => e !== t).sort((a, b) => (b.isHero - a.isHero) || dst(a, t) - dst(b, t))[0] || t, jumps: w.bounces, radius: 8, speed: 30, color: '#b2ff59', size: 0.45, unique: true, ability: 'death_ward',
      filter: e => e !== t, onHit(u) { if (u !== t) AB.damage(w, u, dealt, 'phys', 'death_ward', { silent: true }); } }); } };
registerSummon({ id: 'wd_ward', name: '死亡守卫', hp: 1, armor: 0, dmg: [90, 90], bat: 0.45, range: 14, proj: 30, projColor: '#76ff03', speed: 0.01, radius: 0.5, height: 2.6,
  gold: 0, xp: 0, vision: 14, stationary: true, abilities: [WD_WARD_BOUNCE], fx: ['#76ff03', '#33691e', '#ffffff'], portrait: { headY: 2.0 },
  model: () => ({ body: { p: [0, 0, 0], b: [[0, 0.5, 0, 0.5, 1.0, 0.5, '#5d4037'], [0, 1.4, 0, 0.7, 0.8, 0.6, '#3e2723'], [0, 2.1, 0, 0.9, 0.6, 0.2, '#efebe9'], [-0.5, 2.3, 0, 0.2, 0.6, 0.2, '#8d6e63'], [0.5, 2.3, 0, 0.2, 0.6, 0.2, '#8d6e63']],
    g: [[-0.18, 2.15, 0.11, 0.14, 0.14, 0.02, '#76ff03'], [0.18, 2.15, 0.11, 0.14, 0.14, 0.02, '#76ff03']] } }) });
const WD_MALEDICT = { id: 'wd_maledict', tag: '诅咒', color: '#7cb342', debuff: true, tick: 1,
  onApply(u, m) { m.data.hp0 = u.hp; m.data.n = 0; },
  onTick(u, m) { AB.damage(m.src, u, m.data.dot, 'magic', 'maledict', { silent: true });
    if (++m.data.n % 4 === 0) { const lost = Math.max(0, m.data.hp0 - u.hp), d = lost * m.data.pct;
      if (d > 0) { AB.damage(m.src, u, d, 'magic', 'maledict_burst', { big: true }); AB.burst(u.x, 2, u.z, 18, ['#7cb342', '#33691e', '#c5e1a5'], 4, 0.5, 0.3, 2, 0); emit('maledictBurst', { unit: u.id, dmg: Math.round(d) }); } } } };
registerHero({
  id: 'wd', order: 17, name: '巫医', title: '扎瓦扎', type: '远程 · 智力', color: '#558b2f', nameColor: '#c5e1a5',
  desc: '远程智力型辅助。麻痹药剂在敌人之间弹射眩晕，巫毒疗法持续治疗队友，诅咒按损失的生命值爆发伤害，死亡守卫持续施法造成巨额弹射伤害。',
  stats: { primary: 'int', str: 18, strG: 2.3, agi: 13, agiG: 1.4, int: 22, intG: 3.3, dmg: 24, armor: 1, bat: 1.7, range: 12,
    atkPoint: 0.4, backswing: 0.5, speed: 6.4, proj: 20, projColor: '#9ccc65', hpRegen: 0.8, manaRegen: 1, radius: 0.62, height: 3.2 },
  portrait: { headY: 2.6 },
  ai: { build: ['arcane', 'glimmer', 'force', 'scepter'], role: 'support', skills: [0, 2, 0, 1, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3] },
  model: () => humanoid({ pants: '#33691e', boots: '#3e2723', skin: '#6d4c41', sleeve: '#6d4c41', hip: 0.24, sh: 0.58, legH: 1.0, bodyH: 1.0, legW: 0.32,
    body: [[0, 0.5, 0, 0.82, 0.95, 0.5, '#6d4c41'], [0, 0.1, 0, 0.95, 0.3, 0.62, '#33691e'], [0, 0.95, 0, 0.9, 0.18, 0.55, '#fdd835'],
      [0, 1.45, 0, 0.68, 0.68, 0.68, '#6d4c41'], [0, 1.6, 0.2, 0.82, 0.55, 0.4, '#efebe9'], [0, 2.05, 0, 0.3, 0.6, 0.3, '#e53935'], [-0.3, 2.0, 0, 0.18, 0.45, 0.18, '#43a047'], [0.3, 2.0, 0, 0.18, 0.45, 0.18, '#fdd835']],
    bodyGlow: [[-0.15, 1.62, 0.41, 0.12, 0.1, 0.02, '#76ff03'], [0.15, 1.62, 0.41, 0.12, 0.1, 0.02, '#76ff03']],
    armR: [[0, -0.45, 0, 0.32, 0.9, 0.34, '#6d4c41'], [0, -0.2, 0.25, 0.1, 2.0, 0.1, '#8d6e63'], [0, 0.85, 0.25, 0.4, 0.4, 0.4, '#efebe9']] }),
  abilities: [
    { id: 'cask', ai: { disable: true }, key: 'Q', name: '麻痹药剂', icon: '药', color: '#9ccc65', target: 'unit', range: 12, castPoint: 0.35,
      mana: [110, 120, 130, 140], cd: [20, 18, 16, 14], values: { jumps: [2, 4, 6, 8], stun: 1, stunCreep: 5, dmg: 75, dmgCreep: 50, bounce: 8 },
      text: L => `掷出药剂，在 ${L.bounce} 码内的敌人之间弹射 ${L.jumps} 次（可来回弹射），每次眩晕英雄 ${L.stun} 秒、小兵 ${L.stunCreep} 秒，并造成 ${L.dmg} 点伤害（小兵 ${L.dmgCreep}）。`,
      onCast(c, t) { const h = c.caster;
        AB.bounce({ src: h, first: t, jumps: c.v('jumps'), radius: c.v('bounce'), speed: 18, color: '#9ccc65', size: 0.6, trail: '#c5e1a5', delay: 0.25, rebounce: true, ability: 'cask',
          onHit(u) { AB.damage(h, u, u.isHero ? c.v('dmg') : c.v('dmgCreep'), 'magic', 'cask'); AB.stun(u, h, u.isHero ? c.v('stun') : c.v('stunCreep')); AB.burst(u.x, 1.6, u.z, 10, ['#9ccc65', '#ffffff'], 3, 0.4, 0.2, 2, 0); } }); } },
    { id: 'voodoo', ai: { toggle: 'heal' }, toggle: true, key: 'W', name: '巫毒疗法', icon: '疗', color: '#66bb6a', target: 'none', castPoint: 0,
      mana: 35, cd: 0.5, values: { heal: [16, 24, 32, 40], drain: [8, 12, 16, 20], radius: 7 },
      text: L => `开关技能：开启后每秒为 ${L.radius} 码内的友方单位恢复 ${L.heal} 点生命值，每秒消耗 ${L.drain} 点魔法。魔法耗尽时自动关闭。`,
      onToggleTick(c, dt) { const h = c.caster, r = c.v('radius');
        for (const u of units) if (!u.dead && u.team === h.team && !u.isBuilding && !u.isWard && dst(u, h) <= r && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + c.v('heal') * dt);
        if (Math.random() < dt * 20) { const a = Math.random() * 6.28, rr = Math.random() * r; spawnP(h.x + Math.cos(a) * rr, 0.3, h.z + Math.sin(a) * rr, 0, 2, 0, 0.7, 0.2, '#b2ff59'); } },
      onToggle(c, on) { AB.ringP(c.caster.x, c.caster.z, 0.5, 20, [on ? '#b2ff59' : '#9e9e9e'], 0.4, 0.25, 0.3, 14); } },
    { id: 'maledict', ai: { aoe: 1 }, key: 'E', name: '诅咒', icon: '咒', color: '#7cb342', target: 'point', range: 12, castPoint: 0.35,
      mana: [105, 110, 115, 120], cd: [30, 26, 22, 18], values: { radius: 3.5, dot: [8, 16, 24, 32], pct: [0.16, 0.24, 0.32, 0.4], dur: 12.2 }, fmt: { pct: v => Math.round(v * 100) + '%' },
      text: L => `诅咒目标区域 ${L.radius} 码内的敌人 12 秒：每秒受到 ${L.dot} 点魔法伤害，每 4 秒额外受到相当于施法后所损失生命值 ${L.pct} 的爆发伤害。`,
      onCast(c, pt) { const h = c.caster; for (const u of AB.enemiesIn(h, pt.x, pt.z, c.v('radius'))) AB.addModifier(u, WD_MALEDICT, h, { dur: c.v('dur'), data: { dot: c.v('dot'), pct: c.v('pct') } });
        AB.ringP(pt.x, pt.z, 0.5, 26, ['#7cb342', '#33691e'], 0.45, 0.3, 0.3, c.v('radius') / 0.45); } },
    { id: 'death_ward', ai: { channelWard: true }, scepter: { desc: '死亡守卫的攻击弹射 4 次。', values: { bounces: 4 } }, key: 'R', name: '死亡守卫', icon: '守', color: '#33691e', ult: true, target: 'point', range: 6, castPoint: 0.35, channel: 8,
      mana: [200, 250, 300], cd: [80, 70, 60], values: { dmg: [90, 140, 190], reach: 14, bounces: 2 },
      text: L => `终极技能（持续施法 8 秒）：召唤一个无敌的死亡守卫，以每秒约 2 次的速度攻击 ${L.reach} 码内的敌人（优先英雄），每次造成 ${L.dmg} 点伤害并弹射 ${L.bounces} 个额外目标。巫医停止施法则守卫消失。`,
      onChannelStart(c, pt, ch) { const h = c.caster, d = c.v('dmg');
        const w = AB.summon(h, 'wd_ward', pt.x, pt.z, { lvl: c.lvl, dmg: [d, d], channel: true, invuln: true, control: false, gold: 0, xp: 0 });
        w.bounces = c.v('bounces'); w.order = { type: 'hold' }; ch.data.ward = w; emit('deathWard', { unit: h.id, ward: w.id }); },
      onChannelTick(c, pt, dt, ch) { const w = ch.data.ward; if (!w || w.dead) return false;
        if ((ch.data.rt = (ch.data.rt || 0) - dt) > 0) return; ch.data.rt = 0.25;
        const cur = w.order.target, list = enemiesInRadius(w.team, w.x, w.z, c.v('reach')).filter(e => canSee(w.team, e));
        const best = list.sort((a, b) => (b.isHero - a.isHero) || dst(a, w) - dst(b, w))[0];
        if (best && (!cur || cur.dead || (best.isHero && !cur.isHero) || dst(cur, w) > c.v('reach'))) issueOrder(w, { type: 'attack', target: best }); },
      onChannelEnd(c, pt, interrupted, ch) { const w = ch.data.ward; if (w && !w.dead) { w.expired = true; killUnit(w, null); } } },
  ],
});
