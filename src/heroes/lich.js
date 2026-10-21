// heroes/lich.js — 巫妖 Lich (ranged intelligence). Frost Blast (nuke + small AoE slow), Frost Shield (ally / building: less attack
// damage taken, slows attackers, pulses damage), Sinister Gaze (channel: target hypnotized, pulled toward Lich, mana drained),
// Chain Frost (orb that bounces between enemies — may rebounce between two targets; bounce count per level).
const LICH_SLOW = { id: 'lich_slow', tag: '寒霜', color: '#81d4fa', debuff: true };
const LICH_SHIELD = { id: 'lich_shield', name: '冰霜护盾', color: '#4fc3f7', tick: 1,
  onTick(u, m) { for (const e of enemiesInRadius(u.team, u.x, u.z, 4)) AB.damage(m.src, e, m.data.pulse, 'magic', 'frost_shield', { silent: true }); AB.ringP(u.x, u.z, 0.5, 14, ['#b3e5fc', '#ffffff'], 0.35, 0.25, 0.3, 8); },
  onAttacked(u, m, att) { if (!att.isBuilding && att.team !== u.team) AB.slow(att, m.src, 1, 0.3, 0.3); },
  fx(u) { if (Math.random() < 0.4) spawnP(u.x + rnd(-1, 1), rnd(0.5, 2.5), u.z + rnd(-1, 1), 0, 0.5, 0, 0.5, 0.2, '#b3e5fc'); } };
const LICH_GAZE = { id: 'lich_gaze', tag: '凝视', color: '#7e57c2', debuff: true, states: ['stunned'] };
registerHero({
  id: 'lich', order: 15, name: '巫妖', title: '埃斯克', type: '远程 · 智力', color: '#4fc3f7', nameColor: '#b3e5fc',
  desc: '远程智力型辅助。寒霜爆发与冰霜护盾在对线期压制敌人，邪恶凝视把敌人拉到身边，连环霜冻在扎堆的敌人之间反复弹射。',
  stats: { primary: 'int', str: 20, strG: 2.2, agi: 15, agiG: 2, int: 24, intG: 3.3, dmg: 22, armor: 1, bat: 1.7, range: 12,
    atkPoint: 0.46, backswing: 0.54, speed: 6.6, proj: 20, projColor: '#81d4fa', hpRegen: 0.6, manaRegen: 1.1, radius: 0.62, height: 3.4 },
  portrait: { headY: 2.8 },
  ai: { build: ['arcane', 'mekansm', 'glimmer', 'scepter'], role: 'support', skills: [0, 1, 0, 2, 0, 3, 0, 1, 1, 1, 3, 2, 2, 2, 3] },
  model: () => humanoid({ pants: '#263238', boots: '#0d47a1', skin: '#cfd8dc', sleeve: '#1565c0', hip: 0.24, sh: 0.6, legH: 1.15, bodyH: 1.1, legW: 0.32,
    body: [[0, 0.5, 0, 0.9, 1.0, 0.56, '#1565c0'], [0, 0.0, 0, 1.0, 0.22, 0.7, '#0d47a1'], [0, 1.0, 0, 1.3, 0.24, 0.66, '#90caf9'],
      [0, 1.55, 0, 0.72, 0.72, 0.72, '#cfd8dc'], [0, 1.6, -0.08, 0.8, 0.8, 0.66, '#eceff1'], [0, 2.05, 0, 0.5, 0.3, 0.5, '#4fc3f7'],
      [-0.42, 2.0, 0, 0.14, 0.5, 0.14, '#81d4fa'], [0.42, 2.0, 0, 0.14, 0.5, 0.14, '#81d4fa'], [0, 0.6, -0.36, 0.9, 1.4, 0.1, '#0d47a1']],
    bodyGlow: [[-0.16, 1.6, 0.37, 0.14, 0.1, 0.02, '#4dd0e1'], [0.16, 1.6, 0.37, 0.14, 0.1, 0.02, '#4dd0e1']],
    armR: [[0, -0.45, 0, 0.32, 0.95, 0.36, '#1565c0'], [0, -0.9, 0, 0.3, 0.2, 0.32, '#cfd8dc']],
    armRGlow: [[0, -1.05, 0.15, 0.36, 0.36, 0.36, '#b3e5fc']] }),
  abilities: [
    { id: 'frost_blast', key: 'Q', name: '寒霜爆发', icon: '霜', color: '#4fc3f7', target: 'unit', range: 14, castPoint: 0.4,
      mana: [100, 125, 150, 175], cd: [8, 7, 6, 5], values: { dmg: [50, 100, 150, 200], aoe: [80, 120, 160, 200], radius: 3.5, slow: 0.3, dur: 4 }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `寒冰爆炸，对目标造成 ${L.dmg} 点魔法伤害，并对 ${L.radius} 码内所有敌人（含目标）造成 ${L.aoe} 点魔法伤害、降低 ${L.slow} 移动与攻击速度，持续 ${L.dur} 秒。`,
      onCast(c, t) { const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 26, color: '#b3e5fc', size: 0.7, trail: '#e1f5fe', onHit(u) {
          AB.damage(h, u, c.v('dmg'), 'magic', 'frost_blast');
          for (const e of AB.enemiesIn(h, u.x, u.z, c.v('radius'))) { AB.damage(h, e, c.v('aoe'), 'magic', 'frost_blast'); AB.addModifier(e, LICH_SLOW, h, { dur: c.v('dur'), props: { msPct: -c.v('slow'), as: -c.v('slow') * 100 } }); }
          AB.burst(u.x, 1.2, u.z, 30, ['#ffffff', '#b3e5fc', '#4fc3f7'], 6, 0.6, 0.3, 3, 0); AB.ringP(u.x, u.z, 0.5, 20, ['#e1f5fe'], 0.35, 0.3, 0.3, c.v('radius') / 0.35); } }); } },
    { id: 'frost_shield', ai: { allyBuff: true }, key: 'W', name: '冰霜护盾', icon: '盾', color: '#29b6f6', target: 'unit', targetTeam: 'ally', allowBuildings: true, range: 14, castPoint: 0.3,
      mana: [70, 80, 90, 100], cd: [18, 16, 14, 12], values: { red: [0.3, 0.4, 0.5, 0.6], pulse: [20, 30, 40, 50], dur: 6 }, fmt: { red: v => Math.round(v * 100) + '%' },
      text: L => `为一名友方单位或建筑施加冰霜护盾 ${L.dur} 秒：受到的攻击伤害降低 ${L.red}，攻击者被减速 30%，每秒对 4 码内敌人造成 ${L.pulse} 点魔法伤害。`,
      onCast(c, t) { AB.addModifier(t, LICH_SHIELD, c.caster, { dur: c.v('dur'), data: { atkRed: c.v('red'), pulse: c.v('pulse') } }); AB.burst(t.x, 1.5, t.z, 24, ['#e1f5fe', '#4fc3f7'], 4, 0.6, 0.3, 2, 0); emit('frostShield', { unit: c.caster.id, target: t.id }); } },
    { id: 'gaze', ai: { disable: true }, key: 'E', name: '邪恶凝视', icon: '凝', color: '#7e57c2', target: 'unit', range: 9, castPoint: 0.3, channel: [1.6, 1.8, 2.0, 2.2],
      mana: [90, 100, 110, 120], cd: [22, 20, 18, 16], values: { pull: 1.8, drain: [0.2, 0.25, 0.3, 0.35] }, fmt: { drain: v => Math.round(v * 100) + '%' },
      text: L => `持续施法：催眠一名敌人，使其无法行动并被缓缓拉向巫妖，期间吸取其 ${L.drain} 的最大魔法值。巫妖被打断则效果结束。`,
      onChannelStart(c, t, ch) { AB.addModifier(t, LICH_GAZE, c.caster, { dur: ch.dur + 0.1 }); ch.data.mana = (t.maxMana || 0) * c.v('drain') / ch.dur; },
      onChannelTick(c, t, dt, ch) { const h = c.caster; if (!getMod(t, 'lich_gaze')) return false;
        if (dst(t, h) > 2.2) AB.pull(t, h.x, h.z, c.v('pull') * dt);
        const m = Math.min(t.mana || 0, ch.data.mana * dt); if (m > 0) { t.mana -= m; h.mana = Math.min(h.maxMana, h.mana + m); }
        if (Math.random() < 0.5) AB.tetherFx(h, t.x, t.z, '#b388ff'); },
      onChannelEnd(c, t) { if (t) removeModById(t, 'lich_gaze'); } },
    { id: 'chain_frost', ai: { ultAoe: { radius: 'bounce', min: 2 } }, scepter: { desc: '伤害提升至 300/400/500，弹射次数 10/13/16。', values: { dmg: [300, 400, 500], jumps: [10, 13, 16] } }, key: 'R', name: '连环霜冻', icon: '链', color: '#0277bd', ult: true, target: 'unit', range: 13, castPoint: 0.3,
      mana: [180, 250, 320], cd: [100, 80, 60], values: { dmg: [250, 350, 450], jumps: [7, 9, 11], bounce: 9, slow: 0.65, dur: 2.5 }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：释放一颗寒冰球，在 ${L.bounce} 码内的敌人之间弹射共 ${L.jumps} 次（可在两名敌人之间来回弹射），每次造成 ${L.dmg} 点魔法伤害并减速 ${L.slow}，持续 ${L.dur} 秒。`,
      onCast(c, t) { const h = c.caster;
        AB.bounce({ src: h, first: t, jumps: c.v('jumps'), radius: c.v('bounce'), speed: 13, color: '#e1f5fe', size: 1.0, trail: '#81d4fa', delay: 0.2, rebounce: true, ability: 'chain_frost',
          onHit(u) { AB.damage(h, u, c.v('dmg'), 'magic', 'chain_frost'); AB.addModifier(u, LICH_SLOW, h, { dur: c.v('dur'), props: { msPct: -c.v('slow'), as: -c.v('slow') * 100 } });
            AB.burst(u.x, 1.4, u.z, 22, ['#ffffff', '#b3e5fc', '#4fc3f7'], 5, 0.5, 0.3, 2, 0); } }); } },
  ],
});
