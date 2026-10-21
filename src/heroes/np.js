// heroes/np.js — 先知 Nature's Prophet (ranged intelligence). Sprout (ring of temporary trees: blocks pathing + vision),
// Teleportation (global channelled teleport), Nature's Call (turns trees into treants), Wrath of Nature (global bouncing damage).
registerSummon({ id: 'np_treant', name: '树人', hp: 550, armor: 2, dmg: [20, 24], bat: 1.5, range: 2.2, speed: 6.2, radius: 0.6, height: 2.8, gold: 20, xp: 12,
  vision: 12, push: true, fx: ['#66bb6a', '#a5d6a7', '#8d6e63'], portrait: { headY: 2.2 },
  model: () => humanoid({ pants: '#5d4037', boots: '#3e2723', skin: '#8d6e63', sleeve: '#6d4c41', hip: 0.26, sh: 0.62, legH: 0.9, bodyH: 0.95, legW: 0.4,
    body: [[0, 0.48, 0, 0.92, 0.98, 0.62, '#6d4c41'], [0, 0.5, 0.32, 0.5, 0.5, 0.04, '#8d6e63'], [0, 1.3, 0, 0.66, 0.6, 0.62, '#795548'],
      [0, 1.9, 0, 1.3, 0.62, 1.2, '#43a047'], [0.3, 2.25, 0.2, 0.7, 0.4, 0.7, '#66bb6a'], [-0.4, 1.5, 0, 0.3, 0.3, 0.3, '#2e7d32']],
    bodyGlow: [[-0.14, 1.32, 0.32, 0.12, 0.08, 0.02, '#c6ff00'], [0.14, 1.32, 0.32, 0.12, 0.08, 0.02, '#c6ff00']] }) });
const NP_TP = { id: 'np_tpfx' };
registerHero({
  id: 'np', order: 11, name: '先知', title: '自然先知', type: '远程 · 智力', color: '#2e7d32', nameColor: '#9ccc65',
  desc: '远程智力型英雄。发芽用树木困住敌人，传送可前往地图任意位置，自然之召把树木变成树人，自然之怒在全图敌人之间弹射。',
  ai: { role: 'carry', skills: [2, 1, 2, 0, 2, 1, 2, 1, 1, 0, 0, 0], build: ['phase', 'shadow', 'daedalus', 'bkb'] },
  stats: { primary: 'int', str: 19, strG: 2.5, agi: 20, agiG: 2.6, int: 24, intG: 3.3, dmg: 22, armor: 1, bat: 1.7, range: 11,
    atkPoint: 0.4, backswing: 0.75, speed: 6.6, proj: 22, projColor: '#c5e1a5', hpRegen: 1.2, manaRegen: 1.0, radius: 0.6, height: 3.2 },
  portrait: { headY: 2.55 },
  model: () => humanoid({ pants: '#33691e', boots: '#3e2723', skin: '#d7b38c', sleeve: '#558b2f', hip: 0.24, sh: 0.58, legH: 1.05, bodyH: 1.0, legW: 0.36,
    body: [[0, 0.48, 0, 0.82, 1.0, 0.52, '#558b2f'], [0, -0.05, 0, 0.92, 0.5, 0.6, '#33691e'], [0, 0.95, 0, 0.95, 0.24, 0.62, '#7cb342'],
      [0, 1.38, 0, 0.7, 0.68, 0.7, '#d7b38c'], [0, 1.2, 0.36, 0.5, 0.36, 0.04, '#eeeeee'], [-0.16, 1.45, 0.36, 0.12, 0.08, 0.02, '#1b5e20'], [0.16, 1.45, 0.36, 0.12, 0.08, 0.02, '#1b5e20'],
      [0, 1.82, 0, 0.8, 0.2, 0.8, '#5d4037'], [-0.4, 2.15, 0, 0.12, 0.6, 0.12, '#8d6e63'], [-0.62, 2.4, 0, 0.4, 0.1, 0.1, '#8d6e63'], [0.4, 2.15, 0, 0.12, 0.6, 0.12, '#8d6e63'], [0.62, 2.4, 0, 0.4, 0.1, 0.1, '#8d6e63'],
      [0, 0.8, -0.32, 0.86, 1.1, 0.12, '#33691e']],
    armR: [[0, -0.4, 0, 0.34, 0.85, 0.38, '#558b2f'], [0, -0.82, 0, 0.32, 0.2, 0.36, '#d7b38c'], [0, -0.6, 0.3, 0.14, 2.2, 0.14, '#6d4c41']], armRGlow: [[0, 0.55, 0.3, 0.36, 0.36, 0.36, '#c6ff00']] }),
  abilities: [
    { id: 'sprout', ai: { disable: true }, key: 'Q', name: '发芽', icon: '芽', color: '#43a047', target: 'point', range: 14, castPoint: 0.35,
      mana: [70, 80, 90, 100], cd: [11, 10, 9, 8], values: { dur: [3, 3.75, 4.5, 5.25], ring: 3 },
      text: L => `在目标位置周围长出一圈树木（半径 ${L.ring} 码），阻挡移动与视野，持续 ${L.dur} 秒，并提供该处视野。`,
      onCast(c, pt) { const k = AB.sproutRing(pt.x, pt.z, c.v('ring'), c.v('dur')); addVisionAt(c.caster.team, pt.x, pt.z, 6, c.v('dur'));
        AB.ringP(pt.x, pt.z, c.v('ring'), 24, ['#66bb6a', '#c5e1a5'], 0.5, 0.3, 0.6); emit('sprout', { unit: c.caster.id, trees: k.length }); } },
    { id: 'np_tp', ai: { skip: true, tp: true }, key: 'W', name: '传送', icon: '传', color: '#9ccc65', target: 'point', range: 999, castPoint: 0.2,
      channel: [3, 2.75, 2.5, 2.25], mana: [50, 60, 70, 80], cd: [50, 40, 30, 20], keepInvis: true,
      text: L => `持续施法后传送到地图上任意位置（施法时间 ${L.channel} 秒，可被眩晕打断）。起点与终点都有可见的光柱。`,
      onChannelStart(c, pt, ch) { const h = c.caster; ch.data.dest = AB.clampPoint(h, pt, 0); ch.data.fx = [tpFx(h.team, h.x, h.z), tpFx(h.team, ch.data.dest.x, ch.data.dest.z)];
        G.tps.push(ch.data.tp = { team: h.team, x: ch.data.dest.x, z: ch.data.dest.z, from: { x: h.x, z: h.z }, t0: G.time }); },
      onChannelEnd(c, pt, interrupted, ch) { for (const f of ch.data.fx) f.done = true; G.tps = G.tps.filter(x => x !== ch.data.tp);
        if (!interrupted) { AB.teleport(c.caster, ch.data.dest, { colors: ['#9ccc65', '#c5e1a5', '#ffffff'] }); emit('npTeleport', { unit: c.caster.id }); } } },
    { id: 'ncall', ai: { summon: 'np_treant', trees: true }, key: 'E', name: '自然之召', icon: '召', color: '#689f38', target: 'point', range: 12, castPoint: 0.3,
      mana: [100, 110, 120, 130], cd: 37, values: { n: [2, 3, 4, 5], radius: 4.5, hp: [450, 550, 650, 750], dmg: [18, 24, 30, 36], dur: 50 },
      text: L => `把目标区域（半径 ${L.radius} 码）内最多 ${L.n} 棵树变成树人（生命 ${L.hp}，攻击 ${L.dmg}，持续 ${L.dur} 秒）。树木会被消耗。`,
      check: (h, ab, pt) => pt && treesNear(pt.x, pt.z, lvVal(ab.def, 'radius', ab.lvl)).length ? null : '目标区域附近没有树木',
      onCast(c, pt) {
        const h = c.caster, list = AB.treesNear(pt.x, pt.z, c.v('radius')).slice(0, c.v('n')), dmg = c.v('dmg');
        for (const t of list) { AB.destroyTree(t.k, h); AB.summon(h, 'np_treant', t.x, t.z, { lvl: c.lvl, hp: c.v('hp'), dmg: [dmg, dmg + 4], dur: c.v('dur') }); }
        emit('natureCall', { unit: h.id, n: list.length });
      } },
    { id: 'wrath', ai: { global: true }, scepter: { desc: '伤害提升至 140/180/220，弹射 16/18/20 次。', values: { dmg: [140, 180, 220], jumps: [16, 18, 20] } }, key: 'R', name: '自然之怒', icon: '怒', color: '#33691e', ult: true, target: 'none', castPoint: 0.5,
      mana: [175, 225, 275], cd: [90, 75, 60], values: { dmg: [110, 140, 170], jumps: [12, 14, 16], grow: 0.07 }, fmt: { grow: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：一股自然之力从离你最近的敌人开始，在全地图的敌人之间弹射 ${L.jumps} 次，造成 ${L.dmg} 点魔法伤害，每次弹射伤害提高 ${L.grow}（优先英雄）。`,
      onCast(c) {
        const h = c.caster, hit = new Set(); let cur = { x: h.x, z: h.z, height: 2 }, n = 0, dmg = c.v('dmg');
        const next = () => { let best = null, bs = 1e9;
          for (const u of units) { if (u.dead || u.team === h.team || u.isBuilding || u.isWard || hit.has(u) || isInvuln(u) || hasState(u, 'hidden')) continue;
            const s = Math.hypot(u.x - cur.x, u.z - cur.z) * (u.isHero ? 0.35 : 1); if (s < bs) { bs = s; best = u; } }
          return best; };
        const jump = () => { const u = next(); if (!u) return; hit.add(u); AB.boltFx(cur, u, '#9ccc65'); AB.skyBolt(u, '#c5e1a5');
          AB.damage(h, u, dmg, 'magic', 'wrath'); emit('wrathBounce', { unit: h.id, target: u.id, n, dmg: Math.round(dmg) });
          dmg *= 1 + c.v('grow'); cur = u; if (++n < c.v('jumps')) AB.delay(0.25, jump); };
        jump();
      } },
  ],
});
