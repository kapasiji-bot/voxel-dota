// heroes/axe.js — 斧王 Axe (melee strength). Self-contained: stats + voxel model + abilities.
// Hunger: target debuff (DoT + slow) that also stacks a speed buff on Axe.
const AXE_HUNGER_SELF = { id: 'axe_hunger_self', name: '战斗饥渴', color: '#8e24aa', dur: Infinity, stackProps: true, props: { msPct: 0.12 } };
const AXE_HUNGER = { id: 'axe_hunger', tag: '饥渴', color: '#e040fb', debuff: true, tick: 1,
  onTick(u, m) { AB.damage(m.src, u, m.data.dps, 'magic', 'hunger'); },
  onApply(u, m) { const s = getMod(m.src, AXE_HUNGER_SELF.id); if (s) s.stacks++; else AB.addModifier(m.src, AXE_HUNGER_SELF, m.src); },
  onRemove(u, m) { const s = getMod(m.src, AXE_HUNGER_SELF.id); if (s && --s.stacks <= 0) removeModifier(m.src, s); },
  fx(u) { if (Math.random() < 0.2) spawnP(u.x + rnd(-0.3, 0.3), u.height + 0.2, u.z + rnd(-0.3, 0.3), 0, 1.5, 0, 0.5, 0.2, '#e040fb'); } };
const AXE_CALL_ARMOR = { id: 'axe_call', name: '狂战士之吼', color: '#c62828',
  fx(u) { if (Math.random() < 0.3) spawnP(u.x + rnd(-0.7, 0.7), rnd(1, 3), u.z + rnd(-0.7, 0.7), 0, 1, 0, 0.4, 0.15, '#ff5252'); } };

registerHero({
  id: 'axe', order: 1, name: '斧王', title: '蒙格斯', type: '近战 · 力量', color: '#b71c1c', nameColor: '#ff6b5b',
  desc: '近战力量型英雄。以狂战士之吼嘲讽成群的敌人，被围攻时以反击螺旋绞杀四周，再用淘汰之刃终结残血目标。',
  ai: { build: ['phase', 'vanguard', 'blink', 'scepter', 'heart'] },   // B7 bot build (ai/bot/shop.js)
  stats: { primary: 'str', str: 25, strG: 3.4, agi: 20, agiG: 2.2, int: 18, intG: 1.6, dmg: 28, armor: 1, bat: 1.7, range: 2.6,
    atkPoint: 0.4, backswing: 0.5, speed: 7.0, proj: 0, hpRegen: 2.5, manaRegen: 0.8, radius: 0.75, height: 3.6 },
  portrait: { headY: 3.0 },
  model: () => humanoid({
    pants: '#3b2a1e', boots: '#1d1d1d', skin: '#b8352b', hip: 0.36, sh: 0.92, legH: 1.25, bodyH: 1.3, legW: 0.52,
    body: [[0, 0.65, 0, 1.35, 1.3, 0.8, '#b8352b'], [0, 0.12, 0, 1.42, 0.24, 0.86, '#5a3a1a'], [0, 0.12, 0.44, 0.3, 0.3, 0.06, '#d4af37'],
      [-0.78, 1.18, 0, 0.5, 0.36, 0.9, '#555a60'], [0.78, 1.18, 0, 0.5, 0.36, 0.9, '#555a60'], [0, 0.9, 0.41, 1.0, 0.12, 0.04, '#6b1d16'],
      [0, 1.75, 0, 0.9, 0.9, 0.9, '#c43a2e'], [0, 2.28, -0.12, 0.32, 0.4, 0.32, '#111'], [0, 2.05, 0, 0.94, 0.16, 0.94, '#111'],
      [0, 1.42, 0.42, 0.66, 0.36, 0.14, '#151515'], [0, 1.25, 0.45, 0.3, 0.3, 0.1, '#151515'],
      [-0.2, 1.8, 0.46, 0.16, 0.1, 0.02, '#ffe9a8'], [0.2, 1.8, 0.46, 0.16, 0.1, 0.02, '#ffe9a8'], [0, 1.93, 0.46, 0.6, 0.07, 0.02, '#111']],
    armR: [[0, -0.45, 0, 0.42, 0.95, 0.46, '#b8352b'], [0, -0.82, 0, 0.48, 0.28, 0.52, '#3a3a3a'],
      [0, -1.0, 0.4, 0.16, 0.16, 2.0, '#6b4423'], [0, -0.95, 1.25, 0.12, 1.3, 0.6, '#d8d8d8'], [0, -0.95, 1.58, 0.1, 1.5, 0.12, '#f0f0f0'], [0, -0.95, 0.98, 0.14, 0.5, 0.12, '#888']],
  }),
  abilities: [
    { id: 'call', ai: { selfAoe: true, disable: true }, key: 'Q', name: '狂战士之吼', icon: '吼', color: '#c62828', target: 'none', castPoint: 0,
      mana: [80, 90, 100, 110], cd: [16, 14, 12, 10], values: { radius: 6, dur: [2, 2.4, 2.8, 3.2], armor: [12, 13, 14, 15] },
      text: L => `嘲讽周围 ${L.radius} 码内的敌方单位，强迫它们攻击斧王，持续 ${L.dur} 秒；期间斧王获得 ${L.armor} 点额外护甲。`,
      onCast(c) {
        const h = c.caster, dur = c.v('dur'), r = c.v('radius');
        for (const u of AB.enemiesIn(h, h.x, h.z, r)) { AB.addModifier(u, MODS.taunt, h, { dur }); AB.float(u, '!', '#ff3b3b', 22, 0.9); }
        AB.addModifier(h, AXE_CALL_ARMOR, h, { dur, props: { armor: c.v('armor') } });
        AB.ringP(h.x, h.z, 0.8, 36, ['#ff3b3b', '#b71c1c', '#ff8a65'], 0.45, 0.45, 0.6, (r - 0.8) / 0.45);
        AB.ringP(h.x, h.z, 0.8, 24, ['#ff1744', '#d50000'], 0.5, 0.35, 1.6, (r - 0.8) / 0.5);
        AB.float(h, '狂战士之吼！', '#ff5252', 18, 1.2);
      } },
    { id: 'hunger', key: 'W', name: '战斗饥渴', icon: '饥', color: '#8e24aa', target: 'unit', range: 9, castPoint: 0.3,
      mana: [50, 60, 70, 80], cd: [20, 18, 16, 14], values: { dps: [16, 24, 32, 40], dur: 10, slow: 0.12 }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `使一名敌人陷入饥渴，${L.dur} 秒内每秒受到 ${L.dps} 点魔法伤害并减速 ${L.slow}；每个受影响的敌人使斧王移动速度提升 12%。`,
      onCast(c, t) {
        AB.addModifier(t, AXE_HUNGER, c.caster, { dur: c.v('dur'), data: { dps: c.v('dps') }, props: { msPct: -c.v('slow') } });
        AB.burst(t.x, 2, t.z, 16, ['#ab47bc', '#7b1fa2', '#ff1744'], 3, 0.6, 0.3, 2, 0);
      } },
    { id: 'helix', key: 'E', name: '反击螺旋', icon: '旋', color: '#6d4c41', passive: true,
      values: { chance: 0.25, dmg: [60, 90, 120, 150], radius: 4.5 }, fmt: { chance: v => Math.round(v * 100) + '%' },
      text: L => `被动：受到攻击时有 ${L.chance} 几率旋转战斧，对周围 ${L.radius} 码内所有敌人造成 ${L.dmg} 点纯粹伤害。`,
      onAttacked(c, attacker) {
        const h = c.caster;
        if ((h._helixT || 0) > G.time || Math.random() > c.v('chance')) return;
        h._helixT = G.time + 0.3; h.anim.spin = 0.35;
        emit('cast', { unit: h.id, ability: 'helix', passive: true });
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) AB.damage(h, u, c.v('dmg'), 'pure', 'helix');
        for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; spawnP(h.x + Math.cos(a) * 1.6, 1.4, h.z + Math.sin(a) * 1.6, Math.cos(a) * 8, rnd(0, 1), Math.sin(a) * 8, 0.35, 0.3, ['#e0e0e0', '#b71c1c', '#ff5252'][i % 3]); }
      } },
    { id: 'cull', ai: { finisher: 'thr' }, scepter: { desc: '斩杀阈值提升至 300/425/550；成功斩杀时立即刷新冷却。', cd: [30, 24, 18], refreshOnKill: true, values: { thr: [300, 425, 550] } }, key: 'R', name: '淘汰之刃', icon: '斩', color: '#b71c1c', ult: true, target: 'unit', range: 3.5, castPoint: 0.3,
      mana: [60, 120, 180], cd: [40, 32, 24], values: { thr: [250, 350, 450], dmg: [150, 250, 300] },
      text: L => `终极技能：挥斧斩向一名敌人。若目标生命值低于 ${L.thr}，直接将其斩杀；否则造成 ${L.dmg} 点魔法伤害。`,
      onCast(c, t) {
        const h = c.caster;
        for (let i = 0; i < 20; i++) { const a = h.facing + (i / 20 - 0.5) * 2; spawnP(h.x + Math.sin(a) * 2.5, 2.5 - i * 0.08, h.z + Math.cos(a) * 2.5, 0, 0, 0, 0.35, 0.4, '#eeeeee'); }
        if (t.hp <= c.v('thr')) {
          AB.float(t, '淘汰！', '#ff1744', 30, 1.4); AB.burst(t.x, 1.5, t.z, 40, ['#b71c1c', '#ff1744', '#880e4f'], 8, 1.0, 0.35, 5);
          AB.damage(h, t, t.hp + 1e6, 'pure', 'cull', { silent: true }); AB.kill(t, h);
          if (c.def.refreshOnKill) { c.ab.cd = 0; AB.float(h, '冷却刷新！', '#64b5f6', 16, 1); emit('cullRefresh', { unit: h.id }); }   // Aghanim's Scepter
        } else { AB.damage(h, t, c.v('dmg'), 'magic', 'cull', { big: true }); AB.burst(t.x, 1.5, t.z, 16, ['#b71c1c', '#ff5252'], 5, 0.6, 0.3, 3); }
      } },
  ],
});
