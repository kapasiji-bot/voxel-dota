// heroes/silencer.js — 沉默术士 Silencer (ranged intelligence). Arcane Curse (AoE DoT + slow, EXTENDED whenever a cursed unit casts:
// modifier onOwnerCast), Glaives of Wisdom (AUTOCAST ORB: bonus pure damage = int × mult; abilities/orb.js — right-click the icon),
// Last Word (delayed damage + silence; triggers at once if the target casts), Global Silence (ult: every enemy hero, any range/fog).
const SIL_CURSE = { id: 'sil_curse', tag: '奥术诅咒', color: '#ffca28', debuff: true, tick: 1,
  onTick(u, m) { AB.damage(m.src, u, m.data.dps, 'magic', 'arcane_curse', { silent: false }); },
  onOwnerCast(u, m) { m.t += m.data.ext; AB.float(u, '+' + m.data.ext + '秒', '#ffca28', 14, 0.8); emit('curseExtend', { unit: u.id, t: +m.t.toFixed(2) }); },
  fx(u) { if (Math.random() < 0.3) spawnP(u.x + rnd(-0.5, 0.5), u.height + 0.2, u.z + rnd(-0.5, 0.5), 0, -0.6, 0, 0.6, 0.2, '#ffca28'); } };
const SIL_LASTWORD = { id: 'sil_lastword', tag: '遗言', color: '#ffb300', debuff: true,
  onOwnerCast(u, m) { m.data.early = true; removeModifier(u, m); },
  onRemove(u, m) {
    if (u.dead || m.data.purged) return;
    AB.damage(m.src, u, m.data.dmg, 'magic', 'last_word'); AB.silence(u, m.src, m.data.sil);
    AB.burst(u.x, 1.6, u.z, 22, ['#ffd54f', '#ffffff', '#ff6f00'], 5, 0.5, 0.25, 2, 0); emit('lastWord', { unit: u.id, early: !!m.data.early });
  },
  fx(u, m) { if (Math.random() < 0.4) spawnP(u.x, u.height + 0.6 + Math.sin(G.time * 6) * 0.2, u.z, 0, 0, 0, 0.25, 0.3, '#ffb300'); } };
registerHero({
  id: 'silencer', order: 20, name: '沉默术士', title: '诺崇', type: '远程 · 智力', color: '#5e35b1', nameColor: '#b39ddb',
  desc: '远程智力型英雄。智慧之刃可自动施放（右键技能图标），按智力造成额外纯粹伤害；奥术诅咒惩罚施法者，全域沉默让整个战场陷入寂静。',
  stats: { primary: 'int', str: 19, strG: 2.4, agi: 19, agiG: 2.4, int: 25, intG: 3.1, dmg: 22, armor: 2, bat: 1.7, range: 12,
    atkPoint: 0.5, backswing: 0.5, speed: 7, proj: 22, projColor: '#b39ddb', hpRegen: 0.7, manaRegen: 1, radius: 0.62, height: 3.3 },
  portrait: { headY: 2.75 },
  ai: { role: 'support', skills: [1, 0, 1, 2, 1, 3, 1, 0, 0, 0, 3, 2, 2, 2, 3], build: ['arcane', 'force', 'glimmer', 'scepter', 'scythe'],
    combos: [{ id: 'sil_silence_curse', steps: [{ slot: 3 }, { slot: 0, at: 'center' }], min: 2, radius: 4.5 }] },
  model: () => humanoid({ pants: '#311b92', boots: '#1a1a1a', skin: '#b0bec5', sleeve: '#4527a0', hip: 0.25, sh: 0.62, legH: 1.15, bodyH: 1.05, legW: 0.36,
    body: [[0, 0.5, 0, 0.86, 1.0, 0.54, '#4527a0'], [0, 0.0, 0, 0.98, 0.3, 0.66, '#311b92'], [0, 0.9, 0, 1.1, 0.22, 0.6, '#ffca28'],
      [0, 1.5, 0, 0.7, 0.7, 0.7, '#b0bec5'], [0, 1.52, 0.36, 0.5, 0.18, 0.04, '#263238'], [0, 1.9, -0.05, 0.8, 0.25, 0.8, '#4527a0'], [0, 2.12, -0.1, 0.4, 0.3, 0.4, '#311b92'],
      [0, 0.6, -0.33, 0.8, 1.3, 0.08, '#311b92']],
    bodyGlow: [[-0.15, 1.56, 0.36, 0.12, 0.08, 0.02, '#ffd54f'], [0.15, 1.56, 0.36, 0.12, 0.08, 0.02, '#ffd54f']],
    armR: [[0, -0.45, 0, 0.36, 0.95, 0.4, '#4527a0'], [0, -0.88, 0, 0.34, 0.2, 0.38, '#b0bec5'], [0, -0.95, 0.5, 0.08, 0.5, 0.9, '#ffca28']],
    armL: [[0, -0.45, 0, 0.36, 0.95, 0.4, '#4527a0'], [0, -0.88, 0, 0.34, 0.2, 0.38, '#b0bec5'], [0, -0.95, 0.5, 0.08, 0.5, 0.9, '#ffca28']] }),
  abilities: [
    { id: 'arcane_curse', ai: { aoe: 1, debuffId: 'sil_curse' }, key: 'Q', name: '奥术诅咒', icon: '诅', color: '#ffb300', target: 'point', range: 13, castPoint: 0.3,
      mana: [95, 110, 125, 140], cd: [16, 15, 14, 13], values: { radius: 4.5, dps: [20, 30, 40, 50], dur: 6, ext: 3, slow: [0.12, 0.16, 0.2, 0.24] }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `诅咒 ${L.radius} 码范围内的敌人 ${L.dur} 秒：每秒 ${L.dps} 点魔法伤害并减速 ${L.slow}。被诅咒者每施放一次技能，持续时间延长 ${L.ext} 秒。`,
      onCast(c, pt) { const h = c.caster;
        AB.ringP(pt.x, pt.z, c.v('radius'), 36, ['#ffca28', '#ffe082', '#7e57c2'], 0.6, 0.35, 0.3); AB.burst(pt.x, 1, pt.z, 26, ['#ffca28', '#7e57c2'], 5, 0.6, 0.3, 2, 0);
        for (const u of AB.enemiesIn(h, pt.x, pt.z, c.v('radius'))) AB.addModifier(u, SIL_CURSE, h, { dur: c.v('dur'), props: { msPct: -c.v('slow') }, data: { dps: c.v('dps'), ext: c.v('ext') } }); } },
    { id: 'glaives', orb: true, orbColor: '#ffd54f', key: 'W', name: '智慧之刃', icon: '刃', color: '#ffa000', target: 'unit', range: 12,
      mana: [15, 15, 15, 15], cd: 0, values: { mult: [0.15, 0.3, 0.45, 0.6] }, fmt: { mult: v => Math.round(v * 100) + '%' },
      text: L => `法球（可自动施放：右键图标）：攻击额外造成相当于智力 ${L.mult} 的纯粹伤害。`,
      onOrbHit(c, t) { const d = AB.statDmg(c.caster, 'int', c.v('mult')); AB.burst(t.x, 1.5, t.z, 8, ['#ffd54f', '#ffffff'], 3, 0.3, 0.2, 1, 0); return AB.damage(c.caster, t, d, 'pure', 'glaives'); } },
    { id: 'last_word', ai: { disable: true, debuffId: 'sil_lastword' }, key: 'E', name: '遗言', icon: '遗', color: '#ff8f00', target: 'unit', range: 12, castPoint: 0.3,
      mana: 115, cd: [22, 18, 14, 10], values: { delay: 4, dmg: [100, 160, 220, 280], sil: [3, 3.5, 4, 4.5] },
      text: L => `对目标施加遗言：${L.delay} 秒后（或目标施法时立即）造成 ${L.dmg} 点魔法伤害并沉默 ${L.sil} 秒。`,
      onCast(c, t) { AB.addModifier(t, SIL_LASTWORD, c.caster, { dur: c.v('delay'), data: { dmg: c.v('dmg'), sil: c.v('sil') } }); AB.boltFx(c.caster, t, '#ffca28'); } },
    { id: 'global_silence', ai: { globalDisable: { min: 2 } }, scepter: { desc: '沉默持续时间提升至 5/6/7 秒。', values: { dur: [5, 6, 7] } }, key: 'R', name: '全域沉默', icon: '寂', color: '#4527a0', ult: true, target: 'none', castPoint: 0.3,
      mana: [250, 375, 500], cd: [130, 115, 100], values: { dur: [4, 5, 6] },
      text: L => `终极技能：沉默地图上所有敌方英雄 ${L.dur} 秒（无视距离与视野）。`,
      onCast(c) { const h = c.caster; let n = 0;
        for (const u of AB.globalEnemies(h, true)) { if (!AB.silence(u, h, c.v('dur'))) continue; n++; AB.beam(u.x, 0.3, u.z, u.x, 22, u.z, '#7e57c2', 0.7, 0.8); AB.ringP(u.x, u.z, 1.6, 20, ['#b39ddb', '#ffca28'], 0.6, 0.3, 0.4, 1.5); }
        AB.ringP(h.x, h.z, 1, 48, ['#7e57c2', '#b39ddb', '#ffca28'], 1.0, 0.45, 0.6, 22);
        if (h.team !== G.player.team && n) msg('沉默术士施放了全域沉默！', '#b39ddb'); else if (n) msg(`全域沉默：沉默了 ${n} 名敌方英雄`, '#b39ddb');
        emit('globalSilence', { unit: h.id, n }); } },
  ],
});
