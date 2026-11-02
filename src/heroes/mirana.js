// heroes/mirana.js — 米拉娜 Mirana (ranged agility). Starstorm (nearby nuke + secondary), Sacred Arrow (long skillshot stun by travel),
// Leap (blink forward + MS), Moonlight Shadow (team invis).
const MIR_LEAP = { id: 'mir_leap', name: '跳跃', color: '#90caf9',
  fx(u) { if (Math.random() < 0.4) spawnP(u.x + rnd(-0.4, 0.4), rnd(0.3, 1.8), u.z + rnd(-0.4, 0.4), rnd(-1, 1), 1, rnd(-1, 1), 0.35, 0.18, '#e3f2fd'); } };
const MIR_MOON = { id: 'mir_moon', name: '月之暗面', color: '#90a4ae', invis: true, breakOn: 'pause', fadeIn: 0.5, refade: () => 1.2,
  fx(u) { if (Math.random() < 0.2) spawnP(u.x + rnd(-0.6, 0.6), rnd(0.4, 2.2), u.z + rnd(-0.6, 0.6), 0, 0.4, 0, 0.6, 0.16, '#cfd8dc'); } };
registerHero({
  id: 'mirana', order: 31, name: '米拉娜', title: '月之女祭司', type: '远程 · 敏捷', color: '#1565c0', nameColor: '#90caf9',
  desc: '远程敏捷型英雄。星落打击周围并二次命中最近目标，神圣之箭远程眩晕，跳跃突进加速，月之暗面让全队隐身。',
  ai: { role: 'carry', aggr: 1.05, skills: [1, 0, 2, 1, 1, 3, 1, 0, 0, 0, 3, 2, 2, 2, 3], build: ['phase', 'desolator', 'bkb', 'daedalus', 'mkb'],
    combos: [{ id: 'mir_arrow_star', steps: [{ slot: 1, at: 'target' }, { slot: 0 }], min: 1, radius: 6 }] },
  stats: { primary: 'agi', str: 18, strG: 2.2, agi: 20, agiG: 3.2, int: 19, intG: 1.9, dmg: 22, armor: 0, bat: 1.7, range: 12,
    atkPoint: 0.35, backswing: 0.7, speed: 7.1, proj: 24, projColor: '#90caf9', hpRegen: 0.9, manaRegen: 0.8, radius: 0.55, height: 3.2 },
  portrait: { headY: 2.7 },
  model: () => humanoid({ pants: '#0d47a1', boots: '#1a237e', skin: '#ffe0b2', sleeve: '#1976d2', hip: 0.2, sh: 0.52, legH: 1.15, bodyH: 1.0, legW: 0.3,
    body: [[0, 0.5, 0, 0.7, 1.0, 0.42, '#1976d2'], [0, 0.15, 0, 0.85, 0.28, 0.55, '#0d47a1'], [0, 1.42, 0, 0.62, 0.62, 0.62, '#ffe0b2'],
      [0, 1.75, -0.05, 0.75, 0.35, 0.75, '#90caf9'], [-0.3, 1.95, 0.05, 0.28, 0.12, 0.45, '#e3f2fd'], [0.3, 1.95, 0.05, 0.28, 0.12, 0.45, '#e3f2fd'],
      [0, 1.0, -0.28, 0.6, 1.15, 0.1, '#0d47a1'], [0, 0.7, 0.22, 0.35, 0.4, 0.04, '#fff59d']],
    armR: [[0, -0.4, 0, 0.28, 0.85, 0.3, '#1976d2'], [0, -0.82, 0, 0.28, 0.18, 0.3, '#ffe0b2'],
      [0, -0.5, 0.35, 0.1, 1.15, 0.1, '#5d4037'], [0, 0.15, 0.35, 0.08, 0.08, 0.9, '#90caf9']],
    armL: [[0, -0.4, 0, 0.28, 0.85, 0.3, '#1976d2'], [0, -0.82, 0, 0.28, 0.18, 0.3, '#ffe0b2']] }),
  abilities: [
    { id: 'starstorm', ai: { selfAoe: true, nuke: true }, shard: { desc: '星落主伤害 +40，二次打击 +30。', values: { dmg: [115, 190, 265, 340], sec: [105, 155, 205, 255] } },
      key: 'Q', name: '星落', icon: '星', color: '#42a5f5', target: 'none', castPoint: 0.35,
      mana: [80, 95, 110, 125], cd: [12, 11, 10, 9], values: { radius: 8, dmg: [75, 150, 225, 300], sec: [75, 125, 175, 225] },
      text: L => `召唤星辰坠落，对周围 ${L.radius} 码敌人造成 ${L.dmg} 点魔法伤害；随后对最近的一名敌人再造成 ${L.sec} 点魔法伤害。`,
      onCast(c) { const h = c.caster, foes = AB.enemiesIn(h, h.x, h.z, c.v('radius')).filter(u => !u.isBuilding);
        for (const u of foes) { AB.damage(h, u, c.v('dmg'), 'magic', 'starstorm'); AB.skyBolt(u, '#90caf9'); }
        let best = null, bd = 1e9; for (const u of foes) { if (u.dead) continue; const d = dst(h, u); if (d < bd) { bd = d; best = u; } }
        if (best) delay(0.35, () => { if (best.dead) return; AB.damage(h, best, c.v('sec'), 'magic', 'starstorm'); AB.skyBolt(best, '#e3f2fd'); AB.burst(best.x, 1.5, best.z, 16, ['#90caf9', '#ffffff'], 5, 0.5, 0.25, 2, 0); });
        AB.ringP(h.x, h.z, 0.5, 28, ['#42a5f5', '#e3f2fd'], 0.45, 0.35, 0.5, c.v('radius') / 0.45); emit('starstorm', { unit: h.id, n: foes.length }); } },
    { id: 'sacred_arrow', ai: { disable: true }, key: 'W', name: '神圣之箭', icon: '箭', color: '#1e88e5', target: 'direction', castPoint: 0.4,
      mana: 100, cd: [18, 16, 14, 12], values: { dmg: [80, 150, 220, 290], len: 28, speed: 18, w1: 1.6, stunMin: 0.4, stunMax: [2.8, 3.2, 3.6, 4] },
      text: L => `射出神圣之箭，飞行最远 ${L.len} 码。命中第一个敌人造成 ${L.dmg} 点魔法伤害，眩晕随飞行距离从 ${L.stunMin} 增至 ${L.stunMax} 秒。`,
      onCast(c, pt) {
        const h = c.caster, dir = AB.dir(h, pt), len = c.v('len'), hit = new Set();
        let trav = 0; const sx = h.x, sz = h.z;
        const mat = new T.MeshBasicMaterial({ color: '#90caf9' }), core = new T.Mesh(boxG, mat); core.scale.set(0.35, 0.35, 1.2); scene.add(core);
        effects.push({ update(dt) {
          const prev = trav; trav = Math.min(len, trav + c.v('speed') * dt);
          const x = sx + dir.x * trav, z = sz + dir.z * trav;
          core.position.set(x, 1.3, z); core.lookAt(x + dir.x, 1.3, z + dir.z);
          spawnP(x, 1.3, z, -dir.x * 2, 0.2, -dir.z * 2, 0.35, 0.2, '#e3f2fd', 0);
          for (const u of units) {
            if (u.dead || u.team === h.team || u.isBuilding || hit.has(u)) continue;
            const rx = u.x - sx, rz = u.z - sz, p = rx * dir.x + rz * dir.z, lat = Math.abs(rx * dir.z - rz * dir.x);
            if (p >= prev - 1 && p <= trav + 0.6 && lat <= c.v('w1') / 2 + u.radius) {
              hit.add(u); const pct = Math.min(1, p / len), stun = c.v('stunMin') + (c.v('stunMax') - c.v('stunMin')) * pct;
              AB.damage(h, u, c.v('dmg'), 'magic', 'sacred_arrow'); AB.stun(u, h, stun);
              AB.burst(u.x, 1.4, u.z, 18, ['#42a5f5', '#ffffff', '#1565c0'], 5, 0.5, 0.28, 2, 0);
              emit('sacredArrow', { unit: h.id, target: u.id, stun: +stun.toFixed(2), dist: +p.toFixed(1) });
              scene.remove(core); mat.dispose(); return true;
            }
          }
          if (trav >= len) { scene.remove(core); mat.dispose(); return true; } return false;
        } });
      } },
    { id: 'leap', ai: { escape: 'blink', engage: true }, key: 'E', name: '跳跃', icon: '跃', color: '#64b5f6', target: 'none', castPoint: 0,
      mana: [40, 35, 30, 20], cd: [20, 16, 12, 8], values: { dist: [5, 5.5, 6, 6.5], ms: [0.3, 0.4, 0.5, 0.6], dur: 2.5 },
      fmt: { ms: v => Math.round(v * 100) + '%' },
      text: L => `向前跳跃 ${L.dist} 码，并获得 ${L.ms} 移动速度，持续 ${L.dur} 秒。`,
      onCast(c) { const h = c.caster, d = c.v('dist'), dest = { x: h.x + Math.sin(h.facing) * d, z: h.z + Math.cos(h.facing) * d };
        AB.teleport(h, dest, { maxR: d + 0.5, colors: ['#90caf9', '#e3f2fd', '#ffffff'] });
        AB.addModifier(h, MIR_LEAP, h, { dur: c.v('dur'), props: { msPct: c.v('ms') } });
        AB.float(h, '跳跃！', '#90caf9', 16, 1); emit('leap', { unit: h.id }); } },
    { id: 'moonlight', ai: { escape: 'invis' }, keepInvis: true,
      scepter: { desc: '持续时间 +10 秒，渐隐时间缩短。', values: { dur: [25, 30, 35], fade: 0.3 } },
      key: 'R', name: '月之暗面', icon: '月', color: '#546e7a', ult: true, target: 'none', castPoint: 0.3,
      mana: [75, 100, 125], cd: [140, 120, 100], values: { radius: 50, dur: [15, 20, 25], fade: 1.2 },
      text: L => `终极技能：使全图友方英雄进入隐身，持续 ${L.dur} 秒（攻击/施法会短暂显形后再次隐身）。`,
      onCast(c) { const h = c.caster; let n = 0;
        for (const a of G.heroes) if (!a.dead && a.team === h.team) {
          AB.invis(a, MIR_MOON, h, c.v('dur'), c.v('fade')); n++;
          AB.burst(a.x, 1.2, a.z, 12, ['#90a4ae', '#cfd8dc', '#ffffff'], 3, 0.5, 0.22, 1.5, 0);
        }
        AB.float(h, '月之暗面！', '#cfd8dc', 18, 1.1); emit('moonlight', { unit: h.id, n }); } },
  ],
});
