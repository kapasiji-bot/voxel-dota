// heroes/cent.js — 半人马酋长 Centaur Warrunner (melee strength). Hoof Stomp (AoE stun), Double Edge (self+target magic),
// Retaliate (return damage on hit), Stampede (team haste + trampling dmg).
const CENT_RET = { id: 'cent_ret', tag: '反击', color: '#ef6c00' };
const CENT_STAMP = { id: 'cent_stamp', name: '奔袭', color: '#ff7043',
  fx(u) { if (Math.random() < 0.4) spawnP(u.x + rnd(-0.5, 0.5), 0.2, u.z + rnd(-0.5, 0.5), rnd(-2, 2), 0.5, rnd(-2, 2), 0.35, 0.2, '#ffab91'); },
  tick: 0.15,
  onTick(u, m) {
    const src = m.src || u, dmg = m.data.dmg || 100, r = m.data.r || 2.2, hit = m.data.hit;
    for (const e of AB.enemiesIn(u, u.x, u.z, r)) {
      if (e.isBuilding || hit.has(e.id)) continue; hit.add(e.id);
      AB.damage(src, e, dmg, 'magic', 'stampede'); AB.burst(e.x, 1, e.z, 10, ['#ff7043', '#ffffff'], 3, 0.35, 0.2, 1.5, 0);
    }
  } };
registerHero({
  id: 'cent', order: 32, name: '半人马酋长', title: '布拉德沃卡', type: '近战 · 力量', color: '#bf360c', nameColor: '#ffab91',
  desc: '近战力量型坦克。马蹄践踏范围眩晕，双刃剑与目标同伤，反击反弹伤害，奔袭冲撞全队疾跑并践踏敌人。',
  ai: { role: 'tank', aggr: 1.15, skills: [0, 2, 0, 1, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'blink', 'vanguard', 'pipe', 'heart'],
    combos: [{ id: 'cent_stomp_edge', steps: [{ slot: 0 }, { slot: 1, at: 'target' }], min: 1, radius: 4 }] },
  stats: { primary: 'str', str: 27, strG: 4.0, agi: 15, agiG: 1.5, int: 15, intG: 1.6, dmg: 30, armor: 0, bat: 1.7, range: 2.6,
    atkPoint: 0.3, backswing: 0.3, speed: 7.0, proj: 0, hpRegen: 1.5, manaRegen: 0.5, radius: 0.8, height: 3.5 },
  portrait: { headY: 2.9 },
  model: () => humanoid({ pants: '#5d4037', boots: '#3e2723', skin: '#a1887f', sleeve: '#bf360c', hip: 0.34, sh: 0.9, legH: 1.15, bodyH: 1.25, legW: 0.5,
    body: [[0, 0.55, 0, 1.3, 1.25, 0.9, '#bf360c'], [0, 0.6, 0.46, 0.7, 0.5, 0.04, '#ffcc80'], [0, 0.1, 0, 1.4, 0.35, 1.0, '#6d4c41'],
      [0, 1.7, 0, 0.95, 0.9, 0.95, '#a1887f'], [0, 2.15, 0, 1.05, 0.4, 1.05, '#5d4037'], [-0.4, 2.0, 0.35, 0.25, 0.4, 0.25, '#a1887f'],
      [0.4, 2.0, 0.35, 0.25, 0.4, 0.25, '#a1887f'], [0, 1.15, -0.55, 1.1, 1.5, 0.2, '#4e342e'], [0, 0.3, -0.7, 0.5, 0.4, 0.7, '#8d6e63']],
    armR: [[0, -0.5, 0, 0.45, 1.0, 0.5, '#bf360c'], [0, -1.0, 0, 0.48, 0.3, 0.52, '#a1887f']],
    armL: [[0, -0.5, 0, 0.45, 1.0, 0.5, '#bf360c'], [0, -1.0, 0, 0.48, 0.3, 0.52, '#a1887f']] }),
  abilities: [
    { id: 'hoof_stomp', ai: { disable: true, selfAoe: true }, shard: { desc: '践踏眩晕 +0.3 秒，伤害 +40。', values: { stun: [2.0, 2.3, 2.6, 2.9], dmg: [140, 220, 300, 380] } },
      key: 'Q', name: '马蹄践踏', icon: '踏', color: '#ef6c00', target: 'none', castPoint: 0.4,
      mana: [100, 110, 120, 130], cd: [16, 15, 14, 13], values: { radius: 5, dmg: [100, 180, 260, 340], stun: [1.7, 2.0, 2.3, 2.6] },
      text: L => `用力践踏地面，对周围 ${L.radius} 码敌人造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒。`,
      onCast(c) { const h = c.caster;
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) {
          if (u.isBuilding) continue; AB.damage(h, u, c.v('dmg'), 'magic', 'hoof_stomp'); AB.stun(u, h, c.v('stun'));
        }
        AB.ringP(h.x, h.z, 0.5, 36, ['#ef6c00', '#ffcc80', '#ffffff'], 0.45, 0.35, 0.6, c.v('radius') / 0.45);
        AB.burst(h.x, 0.5, h.z, 24, ['#bf360c', '#ffab91'], 5, 0.5, 0.3, 2, 0); emit('hoofStomp', { unit: h.id }); } },
    { id: 'double_edge', ai: { nuke: true }, key: 'W', name: '双刃剑', icon: '刃', color: '#d84315', target: 'unit', range: 3.5, castPoint: 0.3,
      mana: 0, cd: [5, 4.5, 4, 3.5], values: { dmg: [150, 225, 300, 375] },
      text: L => `与目标对砍：对目标造成 ${L.dmg} + 力量×2 点魔法伤害，自身承受等量伤害（不会致死，至少保留 1 点生命）。`,
      onCast(c, t) { const h = c.caster, dmg = c.v('dmg') + h.str * 2;
        AB.damage(h, t, dmg, 'magic', 'double_edge', { big: true });
        const self = Math.min(dmg, Math.max(0, h.hp - 1));
        if (self > 0) AB.damage(h, h, self, 'pure', 'double_edge', { silent: true });
        AB.beam(h.x, 1.4, h.z, t.x, 1.2, t.z, '#ff7043', 0.35, 0.35);
        AB.burst(t.x, 1.3, t.z, 20, ['#ef6c00', '#ffffff', '#bf360c'], 6, 0.5, 0.28, 2.5, 0);
        emit('doubleEdge', { unit: h.id, target: t.id, dmg: Math.round(dmg) }); } },
    { id: 'retaliate', key: 'E', name: '反击', icon: '反', color: '#e65100', passive: true,
      values: { ret: [20, 30, 40, 50], str: [0.2, 0.3, 0.4, 0.5] }, fmt: { str: v => Math.round(v * 100) + '%' },
      text: L => `被动：受到攻击时对攻击者造成 ${L.ret} + 力量×${L.str} 点物理伤害。`,
      onAttacked(c, att) {
        if (!att || att.dead || att.isBuilding || att.team === c.caster.team) return;
        const h = c.caster; if ((h._retT || 0) > G.time) return; h._retT = G.time + 0.05;
        const dmg = c.v('ret') + h.str * c.v('str');
        AB.damage(h, att, dmg, 'phys', 'retaliate', { silent: true });
        spawnP(att.x, 1.2, att.z, rnd(-2, 2), 2, rnd(-2, 2), 0.3, 0.18, '#ff7043', -4);
        emit('retaliate', { unit: h.id, target: att.id, dmg: Math.round(dmg) }); } },
    { id: 'stampede', ai: { allyBuff: true },
      scepter: { desc: '践踏伤害 +80，移速再 +15%。', values: { dmg: [180, 260, 340], ms: 1.15 } },
      key: 'R', name: '奔袭冲撞', icon: '奔', color: '#bf360c', ult: true, target: 'none', castPoint: 0,
      mana: [100, 150, 200], cd: [100, 90, 80], values: { dur: [3.5, 4, 4.5], ms: 1.0, dmg: [100, 180, 260], radius: 2.4 },
      fmt: { ms: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：全队获得巨大加速（+${L.ms}）持续 ${L.dur} 秒；碰撞敌人造成 ${L.dmg} 点魔法伤害（每名敌人每场奔袭仅一次）。`,
      onCast(c) { const h = c.caster, hit = new Set(); let n = 0;
        for (const a of G.heroes) if (!a.dead && a.team === h.team) {
          AB.addModifier(a, CENT_STAMP, h, { dur: c.v('dur'), props: { msPct: c.v('ms') }, data: { dmg: c.v('dmg'), r: c.v('radius'), hit } });
          n++; AB.burst(a.x, 1, a.z, 10, ['#ff7043', '#ffffff'], 3, 0.4, 0.2, 1.5, 0);
        }
        AB.float(h, '奔袭！', '#ffab91', 20, 1.2); emit('stampede', { unit: h.id, n }); } },
  ],
});
