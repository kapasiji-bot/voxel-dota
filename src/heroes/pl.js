// heroes/pl.js — 幻影长矛手 Phantom Lancer (melee agility). Spirit Lance (proj+slow+illusion), Doppelganger
// (brief invuln + illusions), Phantom Rush (blink toward far attack target), Juxtapose (passive illusions).
const PL_LANCE = { id: 'pl_lance', tag: '灵魂之矛', color: '#80cbc4', debuff: true };
const PL_HIDE = { id: 'pl_hide', states: ['hidden', 'invulnerable'] };
const PL_RUSH = { id: 'pl_rush', name: '幻影冲锋', color: '#4db6ac', tick: 0.12,
  onTick(u, m) {
    if (u.isIllusion || u.dead || (u._rushCd || 0) > G.time) return;
    const ab = m.data.ab; if (!ab || ab.lvl < 1) return;
    const t = (u.atk && u.atk.target) || (u.order && u.order.type === 'attack' && u.order.target);
    if (!t || t.dead || t.team === u.team || t.isBuilding) return;
    const d = dst(u, t), minR = 4, maxR = lvVal(ab.def, 'range', ab.lvl);
    if (d < minR || d > maxR) return;
    const ang = Math.atan2(t.x - u.x, t.z - u.z);
    AB.teleport(u, { x: t.x - Math.sin(ang) * 1.3, z: t.z - Math.cos(ang) * 1.3 }, { colors: ['#80cbc4', '#e0f7fa', '#00897b'] });
    u.facing = ang; u._rushCd = G.time + lvVal(ab.def, 'cd', ab.lvl);
    AB.addModifier(u, { id: 'pl_rush_as', name: '冲锋', color: '#4db6ac' }, u, { dur: lvVal(ab.def, 'asDur', ab.lvl), props: { as: lvVal(ab.def, 'as', ab.lvl) } });
    emit('phantomRush', { unit: u.id, target: t.id });
  } };
function plSpawnIllu(h, x, z, out, inc, dur) {
  const n = illusionsOf(h).length, cap = h._juxtaCap || 6;
  if (n >= cap) return null;
  return AB.illusion(h, { x, z, out, inc, dur });
}
registerHero({
  id: 'pl', order: 29, name: '幻影长矛手', title: '阿兹拉法', type: '近战 · 敏捷', color: '#00695c', nameColor: '#80cbc4',
  desc: '近战敏捷型幻象核心。灵魂之矛减速并生成幻象，分则能成短暂无敌后重现，幻影冲锋拉近距离，并列在攻击时制造幻象。',
  ai: { role: 'carry', aggr: 1.1, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'bfury', 'butterfly', 'heart', 'daedalus'],
    combos: [{ id: 'pl_lance_doppel', steps: [{ slot: 0 }, { slot: 1 }], min: 1, radius: 5 }] },
  stats: { primary: 'agi', str: 19, strG: 2.2, agi: 26, agiG: 3.2, int: 19, intG: 2.0, dmg: 24, armor: 1, bat: 1.7, range: 2.6,
    atkPoint: 0.5, backswing: 0.5, speed: 7.2, proj: 0, hpRegen: 1.2, manaRegen: 0.7, radius: 0.6, height: 3.2 },
  portrait: { headY: 2.7 },
  model: () => humanoid({ pants: '#004d40', boots: '#263238', skin: '#80cbc4', sleeve: '#00897b', hip: 0.24, sh: 0.58, legH: 1.15, bodyH: 1.05, legW: 0.34,
    body: [[0, 0.5, 0, 0.8, 1.05, 0.5, '#00897b'], [0, 0.55, 0.27, 0.5, 0.4, 0.04, '#ffd54f'], [0, 0.1, 0, 0.9, 0.28, 0.6, '#00695c'],
      [0, 1.45, 0, 0.7, 0.7, 0.7, '#80cbc4'], [0, 1.78, -0.05, 0.85, 0.35, 0.85, '#26a69a'],
      [-0.4, 1.9, 0.1, 0.25, 0.2, 0.45, '#ffd54f'], [0.4, 1.9, 0.1, 0.25, 0.2, 0.45, '#ffd54f'],
      [0, 1.0, -0.35, 0.75, 1.3, 0.12, '#004d40']],
    armR: [[0, -0.42, 0, 0.32, 0.88, 0.36, '#00897b'], [0, -0.85, 0, 0.32, 0.2, 0.36, '#80cbc4'],
      [0, -0.9, 0.4, 0.1, 0.1, 0.9, '#b0bec5'], [0, -0.9, 1.5, 0.12, 0.5, 1.5, '#eceff1']],
    armL: [[0, -0.42, 0, 0.32, 0.88, 0.36, '#00897b'], [0, -0.85, 0, 0.32, 0.2, 0.36, '#80cbc4']] }),
  abilities: [
    { id: 'spirit_lance', ai: { disable: true }, shard: { desc: '灵魂之矛伤害 +40，减速 +5%。', values: { dmg: [140, 210, 280, 350], slow: 0.2 } },
      key: 'Q', name: '灵魂之矛', icon: '矛', color: '#26a69a', target: 'unit', range: 12, castPoint: 0.3,
      mana: [110, 120, 130, 140], cd: [7, 6.5, 6, 5.5], values: { dmg: [100, 160, 220, 280], slow: 0.15, dur: 3.5, out: 0.2, inc: 4, illuDur: 8 },
      fmt: { slow: v => Math.round(v * 100) + '%', out: v => Math.round(v * 100) + '%' },
      text: L => `投出灵魂之矛，造成 ${L.dmg} 点魔法伤害并减速 ${L.slow}，持续 ${L.dur} 秒，并在目标身旁生成一个幻象（造成 ${L.out} 伤害）。`,
      onCast(c, t) { const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 26, color: '#80cbc4', size: 0.55, trail: '#e0f7fa', onHit(u) {
          AB.damage(h, u, c.v('dmg'), 'magic', 'spirit_lance');
          AB.addModifier(u, PL_LANCE, h, { dur: c.v('dur'), props: { msPct: -c.v('slow') } });
          const ang = Math.random() * 6.28;
          const ill = plSpawnIllu(h, u.x + Math.cos(ang) * 1.6, u.z + Math.sin(ang) * 1.6, c.v('out'), c.v('inc'), c.v('illuDur'));
          if (ill) issueOrder(ill, { type: 'attack', target: u });
          emit('spiritLance', { unit: h.id, target: u.id });
        } }); } },
    { id: 'doppelganger', ai: { escape: 'aoe' }, key: 'W', name: '分则能成', icon: '分', color: '#00897b', target: 'point', range: 8, castPoint: 0.1,
      mana: 50, cd: [20, 18, 16, 14], values: { delay: 1, out: [0.2, 0.25, 0.3, 0.35], inc: 5, dur: 8, n: 2 },
      fmt: { out: v => Math.round(v * 100) + '%' },
      text: L => `消失 ${L.delay} 秒（无敌），在目标点附近重新出现并带有 ${L.n} 个幻象，持续 ${L.dur} 秒（幻象造成 ${L.out} 伤害）。`,
      onCast(c, pt) {
        const h = c.caster; AB.addModifier(h, PL_HIDE, h, { dur: c.v('delay') + 0.05 });
        AB.burst(h.x, 1.5, h.z, 24, ['#80cbc4', '#e0f7fa', '#00897b'], 5, 0.5, 0.3, 2, 0);
        const dest = AB.clampPoint(h, pt, c.ab.def.range);
        AB.delay(c.v('delay'), () => {
          if (h.dead) return;
          removeModById(h, 'pl_hide');
          AB.teleport(h, dest, { colors: ['#80cbc4', '#ffffff'] });
          for (let i = 0; i < c.v('n'); i++) {
            const a = Math.random() * 6.28;
            plSpawnIllu(h, dest.x + Math.cos(a) * 1.8, dest.z + Math.sin(a) * 1.8, c.v('out'), c.v('inc'), c.v('dur'));
          }
          emit('doppelganger', { unit: h.id });
        });
      } },
    { id: 'phantom_rush', key: 'E', name: '幻影冲锋', icon: '冲', color: '#4db6ac', passive: true, passiveMod: PL_RUSH,
      values: { range: [7, 9, 11, 13], cd: [10, 8, 6, 4], as: [100, 125, 150, 175], asDur: 1.5 },
      text: L => `被动：攻击 ${L.range} 码内较远的敌人时，冲向目标并获得 ${L.as} 攻击速度，持续 ${L.asDur} 秒（冷却 ${L.cd} 秒）。` },
    { id: 'juxtapose', scepter: { desc: '幻象上限 +2，生成几率 +5%。', values: { chance: [0.5, 0.55, 0.6], cap: [10, 12, 14] } },
      key: 'R', name: '并列', icon: '列', color: '#004d40', ult: true, passive: true,
      values: { chance: [0.4, 0.45, 0.5], out: 0.18, inc: 5, dur: 8, cap: [6, 8, 10], hitChance: 0.1 },
      fmt: { chance: v => Math.round(v * 100) + '%', hitChance: v => Math.round(v * 100) + '%', out: v => Math.round(v * 100) + '%' },
      text: L => `被动·终极：攻击时有 ${L.chance} 几率生成幻象（造成 ${L.out} 伤害），最多 ${L.cap} 个；被攻击时也有 ${L.hitChance} 几率生成。`,
      passiveProps: c => { c.caster._juxtaCap = c.v('cap'); return {}; },
      onAttackLand(c, t) {
        const h = c.caster; if (h.isIllusion || t.isBuilding) return;
        if (Math.random() >= c.v('chance')) return;
        const a = Math.random() * 6.28;
        const ill = plSpawnIllu(h, h.x + Math.cos(a) * 1.5, h.z + Math.sin(a) * 1.5, c.v('out'), c.v('inc'), c.v('dur'));
        if (ill) { if (t && !t.dead) issueOrder(ill, { type: 'attack', target: t }); emit('juxtapose', { unit: h.id }); }
      },
      onAttacked(c, att) {
        const h = c.caster; if (h.isIllusion || Math.random() >= c.v('hitChance')) return;
        const a = Math.random() * 6.28;
        plSpawnIllu(h, h.x + Math.cos(a) * 1.5, h.z + Math.sin(a) * 1.5, c.v('out'), c.v('inc'), c.v('dur'));
      } },
  ],
});
