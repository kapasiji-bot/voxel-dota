// heroes/pa.js — 幻影刺客 Phantom Assassin (melee agility). Stifling Dagger (slow + part of her attack damage; can crit),
// Phantom Strike (blink to any unit; vs enemies: attack it with bonus attack speed), Blur (passive evasion; hidden from the
// enemy — model, minimap, targeting — unless an enemy unit is within range: vision/blur.js), Coup de Grace (passive crit:
// huge red crit number; only the highest crit applies — applyCrit — and evaded attacks never crit).
const PA_STRIKE = { id: 'pa_strike', name: '幻影突袭', color: '#90a4ae' };
const PA_DAGGER_SLOW = { id: 'pa_dagger', tag: '窒息', color: '#b0bec5', debuff: true };
const PA_BLUR = { id: 'pa_blur', color: '#78909c',   // passiveMod: shimmer while hidden from the enemy
  fx(u) { if (u.blurHid && u.blurHid[1 - u.team] && Math.random() < 0.5) spawnP(u.x + rnd(-0.5, 0.5), rnd(0.4, 2.6), u.z + rnd(-0.5, 0.5), rnd(-0.6, 0.6), 0.2, rnd(-0.6, 0.6), 0.35, 0.22, '#cfd8dc'); } };
registerHero({
  id: 'pa', order: 21, name: '幻影刺客', title: '茉崔蒂', type: '近战 · 敏捷', color: '#455a64', nameColor: '#b0bec5',
  desc: '近战敏捷型刺客。窒息之刃减速猎物，幻影突袭瞬间贴身，模糊让她在远处从敌人视野与小地图上消失，恩赐解脱打出致命的巨额暴击。',
  stats: { primary: 'agi', str: 21, strG: 2, agi: 23, agiG: 3.2, int: 15, intG: 1.7, dmg: 26, armor: 2, bat: 1.7, range: 2.6,
    atkPoint: 0.3, backswing: 0.7, speed: 7.6, proj: 0, hpRegen: 1, manaRegen: 0.6, radius: 0.6, height: 3.1 },
  portrait: { headY: 2.6 },
  ai: { build: ['phase', 'bfury', 'bkb', 'daedalus', 'mkb'], role: 'carry', aggr: 1.2, skills: [0, 1, 0, 2, 0, 3, 0, 1, 1, 1, 3, 2, 2, 2, 3],
    combos: [{ id: 'pa_dagger_strike', steps: [{ slot: 0 }, { slot: 1 }], min: 1, radius: 4 }] },
  model: () => humanoid({ pants: '#263238', boots: '#111', skin: '#cfd8dc', sleeve: '#37474f', hip: 0.22, sh: 0.56, legH: 1.1, bodyH: 1.0, legW: 0.32,
    body: [[0, 0.5, 0, 0.76, 1.0, 0.46, '#37474f'], [0, 0.05, 0, 0.9, 0.3, 0.6, '#263238'], [0, 0.85, 0.24, 0.5, 0.2, 0.04, '#00838f'],
      [0, 1.42, 0, 0.66, 0.66, 0.66, '#cfd8dc'], [0, 1.46, 0.31, 0.68, 0.36, 0.06, '#263238'], [0, 1.78, -0.05, 0.78, 0.36, 0.78, '#455a64'],
      [0, 2.02, -0.2, 0.3, 0.5, 0.3, '#546e7a'], [0, 0.7, -0.3, 0.7, 1.3, 0.1, '#263238']],
    bodyGlow: [[-0.14, 1.52, 0.35, 0.12, 0.07, 0.02, '#18ffff'], [0.14, 1.52, 0.35, 0.12, 0.07, 0.02, '#18ffff']],
    armR: [[0, -0.42, 0, 0.32, 0.85, 0.36, '#37474f'], [0, -0.84, 0, 0.32, 0.2, 0.36, '#cfd8dc'], [0, -0.9, 0.7, 0.12, 0.16, 1.3, '#eceff1'], [0, -0.9, 0.06, 0.4, 0.12, 0.14, '#00838f']],
    armL: [[0, -0.42, 0, 0.32, 0.85, 0.36, '#37474f'], [0, -0.84, 0, 0.32, 0.2, 0.36, '#cfd8dc']] }),
  abilities: [
    { id: 'dagger', key: 'Q', name: '窒息之刃', icon: '刃', color: '#90a4ae', target: 'unit', range: 12, castPoint: 0.3,
      mana: 30, cd: [6, 5, 4, 3], values: { dmg: 65, pct: [0.3, 0.45, 0.6, 0.75], slow: 0.5, dur: [1.2, 1.8, 2.4, 3] }, fmt: { pct: v => Math.round(v * 100) + '%', slow: v => Math.round(v * 100) + '%' },
      text: L => `掷出匕首，造成 ${L.dmg} + ${L.pct} 攻击力的物理伤害（可触发恩赐解脱暴击），并减速 ${L.slow}，持续 ${L.dur} 秒。`,
      onCast(c, t) { const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 32, color: '#eceff1', size: 0.5, trail: '#b0bec5', onHit(u) {
          const info = { dmg: c.v('dmg') + c.v('pct') * h.dmgBase, crit: 0 }; fireHeroHook(h, 'modifyAttack', u, info);   // Coup de Grace can crit the dagger
          const d = AB.damage(h, u, info.dmg, 'phys', 'dagger', { silent: info.crit > 0, big: info.crit > 0 }); if (info.crit) critFloat(u, d, info.crit);
          AB.addModifier(u, PA_DAGGER_SLOW, h, { dur: c.v('dur'), props: { msPct: -c.v('slow') } }); } }); } },
    { id: 'phantom_strike', ai: { engage: true }, key: 'W', name: '幻影突袭', icon: '突', color: '#607d8b', target: 'unit', targetTeam: 'any', range: 12, castPoint: 0.25,
      mana: 50, cd: [11, 9, 7, 5], values: { as: [100, 125, 150, 175], dur: 2 },
      text: L => `瞬间闪烁到任意单位身边。若目标为敌人，立即攻击它，并在 ${L.dur} 秒内获得 ${L.as} 点攻击速度。`,
      onCast(c, t) { const h = c.caster, p = t.team === h.team ? { x: t.x + 1, z: t.z } : AB.behindPoint(t, 0.6);
        AB.teleport(h, p, { colors: ['#b0bec5', '#eceff1', '#455a64'] }); h.facing = Math.atan2(t.x - h.x, t.z - h.z);
        if (t.team !== h.team) { AB.addModifier(h, PA_STRIKE, h, { dur: c.v('dur'), props: { as: c.v('as') } }); issueOrder(h, { type: 'attack', target: t }); }
        emit('phantomStrike', { unit: h.id, target: t.id }); } },
    { id: 'blur', key: 'E', name: '模糊', icon: '糊', color: '#78909c', passive: true, passiveMod: PA_BLUR, values: { evasion: [0.2, 0.3, 0.4, 0.5], radius: 14 }, fmt: { evasion: v => Math.round(v * 100) + '%' },
      text: L => `被动：${L.evasion} 几率闪避攻击。附近 ${L.radius} 码内没有敌方单位时，幻影刺客从敌人的视野与小地图上消失。`,
      passiveProps: c => ({ evasion: c.v('evasion'), blur: c.v('radius') }) },
    { id: 'coup', scepter: { desc: '暴击几率提升至 20%。', values: { chance: 0.2 } }, key: 'R', name: '恩赐解脱', icon: '恩', color: '#b71c1c', ult: true, passive: true, values: { chance: 0.15, mult: [2.0, 3.25, 4.5] }, fmt: { chance: v => Math.round(v * 100) + '%', mult: v => Math.round(v * 100) + '%' },
      text: L => `被动：攻击有 ${L.chance} 几率造成 ${L.mult} 的致命暴击（对建筑无效）。`,
      modifyAttack(c, t, info) { if (t.isBuilding || Math.random() >= c.v('chance')) return; if (applyCrit(info, c.v('mult'))) emit('coup', { unit: c.caster.id, target: t.id, mult: c.v('mult') }); } },
  ],
});
