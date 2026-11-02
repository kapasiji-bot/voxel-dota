// heroes/spectre.js — 幽鬼 Spectre (melee agility). Spectral Dagger (path slow + trail), Desolate (alone bonus),
// Dispersion (reflect % dmg), Haunt (illusions on enemy heroes; Reality recast blinks to one).
const SPEC_PATH = { id: 'spec_path', tag: '荒芜', color: '#7e57c2', debuff: true };
const SPEC_DAG = { id: 'spec_dag', tag: '幽鬼之刃', color: '#b39ddb', debuff: true };
Events.on('damage', e => {
  const u = unitById(e.tgt); if (!u || u.dead || !u.isHero || u.isIllusion || !u.def || u.def.id !== 'spectre') return;
  if (e.src === u.id || !e.amount) return;
  const ab = u.abilities && u.abilities.find(a => a.def.id === 'dispersion' && a.lvl > 0); if (!ab) return;
  if (e.ability === 'dispersion') return;
  const pct = lvVal(ab.def, 'pct', ab.lvl), r = lvVal(ab.def, 'radius', ab.lvl);
  const reflect = e.amount * pct; if (reflect < 1) return;
  const foes = AB.enemiesIn(u, u.x, u.z, r).filter(x => !x.isBuilding && !x.isWard);
  if (!foes.length) return;
  const each = reflect / foes.length;
  for (const f of foes) AB.damage(u, f, each, 'pure', 'dispersion', { silent: true });
  if (Math.random() < 0.25) AB.ringP(u.x, u.z, 0.3, 10, ['#7e57c2', '#e1bee7'], 0.25, 0.2, 0.3, r / 0.3);
});
registerHero({
  id: 'spectre', order: 35, name: '幽鬼', title: '墨丘利', type: '近战 · 敏捷', color: '#4527a0', nameColor: '#b39ddb',
  desc: '近战敏捷型收割。荒芜匕首留下减速轨迹，独处时额外伤害，折射反弹周围伤害，缠绕对所有敌方英雄制造幽鬼幻象。',
  ai: { role: 'carry', aggr: 1.15, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'desolator', 'bfury', 'heart', 'butterfly'],
    combos: [{ id: 'spec_haunt', steps: [{ slot: 3 }, { slot: 0, at: 'target' }], min: 1, radius: 8 }] },
  stats: { primary: 'agi', str: 21, strG: 2.5, agi: 22, agiG: 2.8, int: 16, intG: 1.7, dmg: 24, armor: 1, bat: 1.7, range: 2.6,
    atkPoint: 0.3, backswing: 0.7, speed: 7.2, proj: 0, hpRegen: 1.2, manaRegen: 0.6, radius: 0.62, height: 3.2 },
  portrait: { headY: 2.7 },
  model: () => humanoid({ pants: '#311b92', boots: '#1a1a1a', skin: '#9575cd', sleeve: '#5e35b1', hip: 0.24, sh: 0.58, legH: 1.15, bodyH: 1.05, legW: 0.34,
    body: [[0, 0.5, 0, 0.8, 1.05, 0.48, '#5e35b1'], [0, 0.55, 0.26, 0.5, 0.4, 0.04, '#e1bee7'], [0, 0.1, 0, 0.9, 0.22, 0.55, '#311b92'],
      [0, 1.5, 0, 0.72, 0.72, 0.72, '#9575cd'], [0, 1.85, -0.05, 0.9, 0.35, 0.9, '#4527a0'], [0, 1.55, 0.38, 0.65, 0.25, 0.05, '#212121'],
      [-0.2, 1.6, 0.4, 0.12, 0.08, 0.02, '#ce93d8'], [0.2, 1.6, 0.4, 0.12, 0.08, 0.02, '#ce93d8'],
      [-0.55, 1.2, -0.1, 0.7, 1.4, 0.08, '#7e57c2'], [0.55, 1.2, -0.1, 0.7, 1.4, 0.08, '#7e57c2']],
    armR: [[0, -0.42, 0, 0.34, 0.88, 0.38, '#5e35b1'], [0, -0.85, 0, 0.36, 0.22, 0.4, '#9575cd'],
      [0, -0.95, 0.5, 0.1, 0.12, 1.0, '#b39ddb']],
    armL: [[0, -0.42, 0, 0.34, 0.88, 0.38, '#5e35b1'], [0, -0.85, 0, 0.36, 0.22, 0.4, '#9575cd']] }),
  abilities: [
    { id: 'spectral_dagger', ai: { nuke: true, engage: true }, shard: { desc: '匕首伤害 +40，减速 +5%。', values: { dmg: [140, 200, 260, 320], slow: [0.25, 0.3, 0.35, 0.4] } },
      key: 'Q', name: '幽鬼之刃', icon: '刃', color: '#7e57c2', target: 'unit', range: 14, castPoint: 0.3,
      mana: [110, 120, 130, 140], cd: [16, 14, 12, 10], values: { dmg: [100, 150, 200, 250], slow: [0.2, 0.25, 0.3, 0.35], pathDur: 8, trailR: 2.2 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `掷出幽鬼之刃，造成 ${L.dmg} 点魔法伤害并减速 ${L.slow}。沿途留下荒芜轨迹（${L.pathDur} 秒）：敌人减速，幽鬼可在轨迹上加速穿行。`,
      onCast(c, t) {
        const h = c.caster, sx = h.x, sz = h.z, pathDur = c.v('pathDur'), trailR = c.v('trailR'), slow = c.v('slow');
        AB.projectile({ src: h, target: t, speed: 22, color: '#b39ddb', size: 0.7, trail: '#e1bee7', onHit(u) {
          AB.damage(h, u, c.v('dmg'), 'magic', 'spectral_dagger');
          AB.addModifier(u, SPEC_DAG, h, { dur: 4, props: { msPct: -slow } });
          emit('spectralDagger', { unit: h.id, target: u.id });
        } });
        // trail corridor from cast point toward target
        const dx = t.x - sx, dz = t.z - sz, len = Math.hypot(dx, dz) || 1, dirx = dx / len, dirz = dz / len;
        AB.groundArea({ caster: h, x: sx + dirx * len * 0.5, z: sz + dirz * len * 0.5, radius: Math.max(trailR, len * 0.15), dur: pathDur, tick: 0.2,
          onTick(list, a) {
            for (const u of list) {
              if (u.isBuilding) continue;
              if (u.team !== h.team) AB.addModifier(u, SPEC_PATH, h, { dur: 0.35, props: { msPct: -slow } });
              else if (u === h || (u.isIllusion && u.owner === h)) AB.addModifier(u, { id: 'spec_haste', name: '荒芜加速', color: '#ce93d8' }, h, { dur: 0.35, props: { msPct: 0.2 } });
            }
          },
          fx(a) { if (Math.random() < 0.4) { const ang = Math.random() * 6.28, r = Math.sqrt(Math.random()) * a.r;
            spawnP(a.x + Math.cos(ang) * r, rnd(0.2, 2.2), a.z + Math.sin(ang) * r, 0, 0.4, 0, 0.7, 0.18, ['#7e57c2', '#b39ddb', '#311b92'][(Math.random() * 3) | 0]); } } });
      } },
    { id: 'desolate', key: 'W', name: '荒芜', icon: '荒', color: '#5e35b1', passive: true,
      values: { dmg: [25, 35, 45, 55], alone: 5 },
      text: L => `被动：攻击附近 ${L.alone} 码内没有其他敌方单位的目标时，额外造成 ${L.dmg} 点纯粹伤害。`,
      onAttackLand(c, t) {
        if (t.isBuilding || t.isWard) return;
        const h = c.caster, R = c.v('alone');
        const near = units.some(u => u !== t && !u.dead && u.team === t.team && !u.isBuilding && !u.isWard && dst(u, t) <= R);
        if (near) return;
        AB.damage(h, t, c.v('dmg'), 'pure', 'desolate');
        AB.burst(t.x, 1.3, t.z, 10, ['#7e57c2', '#ffffff'], 3, 0.35, 0.2, 1, 0);
        emit('desolate', { unit: h.id, target: t.id });
      } },
    { id: 'dispersion', key: 'E', name: '折射', icon: '折', color: '#311b92', passive: true,
      values: { pct: [0.12, 0.16, 0.2, 0.24], radius: 7 }, fmt: { pct: v => Math.round(v * 100) + '%' },
      text: L => `被动：受到伤害时，将其中 ${L.pct} 以纯粹伤害折射给周围 ${L.radius} 码内的敌人。` },
    { id: 'haunt', ai: { ultAoe: { radius: 999, min: 1 } },
      scepter: { desc: '幻象持续时间 +2 秒，输出 +5%。', values: { dur: [7, 8, 9], out: [0.45, 0.5, 0.55] } },
      key: 'R', name: '缠绕', icon: '缠', color: '#4a148c', ult: true, target: 'none', castPoint: 0.3,
      mana: [150, 200, 250], cd: [140, 120, 100], values: { dur: [5, 6, 7], out: [0.4, 0.45, 0.5], inc: 2.0 },
      fmt: { out: v => Math.round(v * 100) + '%', inc: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：对每个敌方英雄制造一个幽鬼幻象（造成 ${L.out} 伤害、承受 ${L.inc} 伤害），持续 ${L.dur} 秒并自动攻击。再次施放：现身到最近的缠绕幻象处。`,
      recast: h => !!(h._haunt && h._haunt.length && h._haunt.some(u => u && !u.dead)),
      onRecast(c) {
        const h = c.caster, list = (h._haunt || []).filter(u => u && !u.dead);
        if (!list.length) { h._haunt = null; return; }
        let best = list[0], bd = 1e9;
        for (const u of list) { const d = dst(h, u); if (d < bd) { bd = d; best = u; } }
        const tx = best.x, tz = best.z;
        for (const u of list) AB.kill(u, null);
        h._haunt = null;
        AB.teleport(h, { x: tx, z: tz }, { colors: ['#7e57c2', '#e1bee7', '#ffffff'] });
        AB.float(h, '现身！', '#b39ddb', 18, 1); emit('reality', { unit: h.id });
      },
      onCast(c) {
        const h = c.caster;
        for (const u of illusionsOf(h)) if (u._hauntIllu) AB.kill(u, null);
        const made = [];
        for (const e of G.heroes) {
          if (e.dead || e.team === h.team || e.isIllusion) continue;
          const u = AB.illusion(h, { x: e.x + rnd(-0.8, 0.8), z: e.z + rnd(-0.8, 0.8), out: c.v('out'), inc: c.v('inc'), dur: c.v('dur') });
          if (!u) continue; u._hauntIllu = true; made.push(u);
          issueOrder(u, { type: 'attack', target: e });
          AB.burst(u.x, 1.4, u.z, 12, ['#7e57c2', '#b39ddb'], 4, 0.4, 0.25, 2, 0);
        }
        h._haunt = made;
        AB.float(h, '缠绕！', '#b39ddb', 20, 1.2); emit('haunt', { unit: h.id, n: made.length });
        AB.delay(c.v('dur') + 0.1, () => { if (h._haunt === made) h._haunt = null; });
      } },
  ],
});
