// heroes/_template.js — COPY THIS FILE to heroes/<id>.js to add a hero. Files starting with "_" are NOT bundled.
// The build auto-globs heroes/*.js, so no other file needs editing. Run: node build/build.js && node build/run-tests.js
//
// Ability def reference:
//   id, key ('Q'|'W'|'E'|'R'), name, icon (one CJK char), color, ult (true for R: levels at 6/12/18, max 3)
//   target: 'none' | 'unit' | 'point' | 'direction'   (direction = cast toward cursor, no range check; uses values.len/w1 for the indicator)
//   targetTeam: 'enemy' (default) | 'ally' | 'any';  allowBuildings: false (default)
//   passive: true → never cast; use hooks below.  castPoint (sec, default 0.2)
//   mana, cd, range: number or per-level array. values: {key: number | per-level array}; fmt: {key: v => string} for tooltips
//   text(L): tooltip; L.key is a pre-formatted "a/b/c/d" string with the current level highlighted
//   onCast(ctx, target)  — target: unit (unit), {x,z} (point/direction) or null (none)
//   hooks (passives or any learned ability): onAttacked(ctx, attacker), onAttackLand(ctx, target, dealt), onAbilityCast(ctx, castAbility),
//     passiveProps(ctx) → {armor, dmg, dmgPct, as, ms, msPct, str, agi, int, hpRegen, manaRegen, ...}, aura: {radius, mod, props(ctx, unit), heroesOnly}
//   channel: seconds → onChannelStart(ctx,t), onChannelTick(ctx,t,dt,ch) (return false = break), onChannelEnd(ctx,t,interrupted,ch)
// ctx = {caster, ab, def, lvl, v(key)}  — v() returns the current-level value of mana/cd/range/values[key].
// Helpers: AB.* (abilities/api.js): enemiesIn, damage(src,tgt,amt,'phys'|'magic'|'pure',abilityId), stun, kill, addModifier, delay,
//   projectile, lineWave, delayedArea, beam, burst, ringP, float, chain, cleave, skyBolt, spikes, root, hex, silence, slow, knockup.
//   Common modifiers: MODS.stun / taunt / root / silence / hex / knockup / frozen / slowed (abilities/status.js).  Modifier def: abilities/modifiers.js
const TEMPLATE_SLOW = { id: 'tpl_slow', tag: '减速', color: '#4fc3f7', debuff: true };   // shown above health bar while active

registerHero({
  id: 'template', order: 99, name: '模板英雄', title: '示例', type: '远程 · 敏捷', color: '#1565c0', nameColor: '#64b5f6',
  desc: '一句话介绍。',
  stats: { primary: 'agi', str: 20, strG: 2, agi: 24, agiG: 3, int: 18, intG: 1.8, dmg: 20, armor: 2, bat: 1.7, range: 11,
    atkPoint: 0.4, backswing: 0.5, speed: 7, proj: 22, projColor: '#90caf9', hpRegen: 1.5, manaRegen: 1, radius: 0.65, height: 3.3 },
  portrait: { headY: 2.75 },
  // voxel model via humanoid(): parts legL/legR/body/armL/armR; boxes [cx,cy,cz,w,h,d,color] relative to each part pivot; face +Z
  model: () => humanoid({ pants: '#263238', boots: '#111', skin: '#f2c9a0', sleeve: '#1565c0', hip: 0.26, sh: 0.62, legH: 1.2, bodyH: 1.05, legW: 0.36,
    body: [[0, 0.5, 0, 0.8, 1.0, 0.5, '#1565c0'], [0, 1.5, 0, 0.75, 0.75, 0.75, '#f2c9a0'], [0, 1.9, 0, 0.8, 0.2, 0.8, '#333']] }),
  abilities: [
    { id: 'tpl_bolt', key: 'Q', name: '寒冰箭', icon: '冰', color: '#0288d1', target: 'unit', range: 10, castPoint: 0.3,
      mana: [80, 90, 100, 110], cd: [10, 9, 8, 7], values: { dmg: [80, 140, 200, 260], slow: 0.3, dur: 2 }, fmt: { slow: v => v * 100 + '%' },
      text: L => `发射寒冰箭，造成 ${L.dmg} 点魔法伤害并减速 ${L.slow}，持续 ${L.dur} 秒。`,
      onCast(c, t) {
        AB.projectile({ src: c.caster, target: t, speed: 25, color: '#81d4fa', size: 0.6, trail: '#e1f5fe', onHit(u) {
          AB.damage(c.caster, u, c.v('dmg'), 'magic', 'tpl_bolt');
          AB.addModifier(u, TEMPLATE_SLOW, c.caster, { dur: c.v('dur'), props: { msPct: -c.v('slow') } });
        } });
      } },
    { id: 'tpl_nova', key: 'W', name: '霜冻新星', icon: '霜', color: '#4dd0e1', target: 'point', range: 12,
      mana: 100, cd: 12, values: { radius: 4, delay: 0.4, dmg: [60, 100, 140, 180], stun: 1 },
      text: L => `${L.delay} 秒后对半径 ${L.radius} 码造成 ${L.dmg} 魔法伤害并眩晕 ${L.stun} 秒。`,
      onCast(c, pt) { AB.delayedArea({ caster: c.caster, x: pt.x, z: pt.z, radius: c.v('radius'), delay: c.v('delay'), colors: ['#80deea', '#e0f7fa'],
        onLand(hit) { for (const u of hit) { AB.damage(c.caster, u, c.v('dmg'), 'magic', 'tpl_nova'); AB.stun(u, c.caster, c.v('stun')); } } }); } },
    { id: 'tpl_passive', key: 'E', name: '寒霜之体', icon: '体', color: '#546e7a', passive: true, values: { armor: [2, 4, 6, 8] },
      text: L => `被动：增加 ${L.armor} 点护甲。`, passiveProps: c => ({ armor: c.v('armor') }) },
    { id: 'tpl_ult', key: 'R', name: '冰川', icon: '川', color: '#01579b', ult: true, target: 'none', castPoint: 0.4,
      mana: [150, 200, 250], cd: [60, 50, 40], values: { radius: 8, dmg: [200, 300, 400] },
      text: L => `对周围 ${L.radius} 码内敌人造成 ${L.dmg} 点魔法伤害。`,
      onCast(c) { const h = c.caster; for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) AB.damage(h, u, c.v('dmg'), 'magic', 'tpl_ult');
        AB.ringP(h.x, h.z, 1, 40, ['#b3e5fc', '#4fc3f7'], 0.5, 0.4, 0.5, 14); } },
  ],
});
