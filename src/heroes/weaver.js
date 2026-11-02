// heroes/weaver.js — 编织者 Weaver (melee agility). The Swarm (armor-reducing beetles), Shukuchi (invis haste + pass dmg),
// Geminate Attack (passive double hit), Time Lapse (rewind pos + HP from recent samples).
const WEA_SWARM = { id: 'wea_swarm', tag: '虫群', color: '#c0ca33', debuff: true, tick: 0.75,
  onTick(u, m) {
    if (u.dead) return;
    AB.damage(m.src, u, m.data.dps * 0.75, 'phys', 'the_swarm', { silent: true });
    m.data.armor = (m.data.armor || 0) + m.data.armorStep;
    m.props = m.props || {}; m.props.armor = -m.data.armor;
    if (Math.random() < 0.4) spawnP(u.x + rnd(-0.4, 0.4), rnd(0.5, 1.8), u.z + rnd(-0.4, 0.4), rnd(-1, 1), 1, rnd(-1, 1), 0.35, 0.16, '#cddc39');
  } };
const WEA_SHU = { id: 'wea_shu', name: '缩地', color: '#9ccc65', invis: true, breakOn: 'remove', props: { msPct: 0.5 },
  fx(u) { if (Math.random() < 0.35) spawnP(u.x + rnd(-0.5, 0.5), rnd(0.3, 1.6), u.z + rnd(-0.5, 0.5), rnd(-2, 2), 0.5, rnd(-2, 2), 0.3, 0.18, '#aed581'); } };
// position + HP samples for Time Lapse
function weaverSample(h) {
  if (!h || h.dead || h.isIllusion || !h.def || h.def.id !== 'weaver') return;
  const log = h._tlLog || (h._tlLog = []);
  log.push({ t: G.time, x: h.x, z: h.z, hp: h.hp });
  while (log.length && G.time - log[0].t > 5.5) log.shift();
}
// sample every ~0.25 s via a lightweight global tick using the damage/cast bus isn't enough — hook modifiers tick through Events on loop
Events.on('cast', e => { const h = unitById(e.unit); if (h && h.def && h.def.id === 'weaver') weaverSample(h); });
// Also sample on a repeating effect when weaver exists — start on first ability learn via passiveProps side effect is messy.
// Use damage + attackStart as frequent enough anchors, plus an interval effect started once.
Events.on('attackStart', e => { const h = unitById(e.unit); if (h && h.def && h.def.id === 'weaver') weaverSample(h); });
Events.on('damage', e => { const h = unitById(e.tgt); if (h && h.def && h.def.id === 'weaver') weaverSample(h); });
registerHero({
  id: 'weaver', order: 36, name: '编织者', title: '斯吉茨戈尔', type: '近战 · 敏捷', color: '#558b2f', nameColor: '#aed581',
  desc: '近战敏捷型游击。虫群附着减甲，缩地隐身疾跑并擦伤敌人，连击被动二次攻击，时光倒流回到数秒前的位置与生命。',
  ai: { role: 'carry', aggr: 1.1, skills: [1, 2, 1, 0, 1, 3, 1, 2, 2, 2, 3, 0, 0, 0, 3], build: ['phase', 'desolator', 'bkb', 'daedalus', 'mkb'],
    combos: [{ id: 'wea_shu_swarm', steps: [{ slot: 1 }, { slot: 0, at: 'target' }], min: 1, radius: 5 }] },
  stats: { primary: 'agi', str: 16, strG: 1.8, agi: 19, agiG: 3.1, int: 14, intG: 1.8, dmg: 20, armor: 1, bat: 1.55, range: 2.6,
    atkPoint: 0.4, backswing: 0.4, speed: 7.5, proj: 0, hpRegen: 1.5, manaRegen: 0.7, radius: 0.55, height: 2.8 },
  portrait: { headY: 2.35 },
  model: () => humanoid({ pants: '#33691e', boots: '#1b5e20', skin: '#9ccc65', sleeve: '#689f38', hip: 0.2, sh: 0.5, legH: 0.95, bodyH: 0.9, legW: 0.4,
    body: [[0, 0.4, 0, 0.95, 0.9, 0.7, '#689f38'], [0, 0.45, 0.36, 0.5, 0.35, 0.04, '#cddc39'], [0, 0.05, 0, 1.0, 0.25, 0.75, '#558b2f'],
      [0, 1.2, 0, 0.85, 0.65, 0.85, '#9ccc65'], [-0.35, 1.15, 0.35, 0.35, 0.25, 0.3, '#33691e'], [0.35, 1.15, 0.35, 0.35, 0.25, 0.3, '#33691e'],
      [-0.22, 1.25, 0.42, 0.12, 0.1, 0.02, '#212121'], [0.22, 1.25, 0.42, 0.12, 0.1, 0.02, '#212121'],
      [0, 0.7, -0.5, 0.5, 0.4, 0.8, '#7cb342'], [0, 0.5, -1.1, 0.35, 0.25, 0.5, '#9ccc65']],
    armR: [[0, -0.35, 0, 0.3, 0.7, 0.34, '#689f38'], [0, -0.7, 0, 0.32, 0.2, 0.36, '#9ccc65']],
    armL: [[0, -0.35, 0, 0.3, 0.7, 0.34, '#689f38'], [0, -0.7, 0, 0.32, 0.2, 0.36, '#9ccc65']] }),
  abilities: [
    { id: 'the_swarm', ai: { debuffId: 'wea_swarm', disable: true }, shard: { desc: '虫群护甲削减加快，伤害 +5/跳。', values: { dps: [25, 40, 55, 70], armorStep: [1.2, 1.4, 1.6, 1.8] } },
      key: 'Q', name: '虫群', icon: '虫', color: '#c0ca33', target: 'direction', castPoint: 0.3,
      mana: [70, 80, 90, 100], cd: [14, 12, 10, 8], values: { dps: [20, 30, 40, 50], armorStep: [0.8, 1.0, 1.2, 1.4], dur: 8, len: 16, speed: 14, w1: 3 },
      text: L => `放出虫群沿直线飞行 ${L.len} 码。命中敌人时附着：每秒造成 ${L.dps} 点物理伤害并持续降低护甲，持续 ${L.dur} 秒。`,
      onCast(c, pt) {
        const h = c.caster, dir = AB.dir(h, pt), hit = new Set();
        AB.lineWave({ caster: h, x: h.x, z: h.z, dir, len: c.v('len'), speed: c.v('speed'), w0: 2, w1: c.v('w1'),
          colors: ['#cddc39', '#aed581', '#827717', '#f0f4c3'],
          onHit(u) {
            if (hit.has(u) || u.isBuilding) return; hit.add(u);
            AB.addModifier(u, WEA_SWARM, h, { dur: c.v('dur'), props: { armor: 0 }, data: { dps: c.v('dps'), armorStep: c.v('armorStep'), armor: 0 } });
            emit('theSwarm', { unit: h.id, target: u.id });
          } });
      } },
    { id: 'shukuchi', ai: { escape: 'invis', engage: true }, keepInvis: true, key: 'W', name: '缩地', icon: '缩', color: '#9ccc65', target: 'none', castPoint: 0,
      mana: 60, cd: [12, 10, 8, 6], values: { dur: 4, dmg: [80, 110, 140, 170], radius: 2.2 },
      text: L => `隐身并加速 ${L.dur} 秒。隐身期间接触敌人造成 ${L.dmg} 点魔法伤害（每名敌人一次）。`,
      onCast(c) {
        const h = c.caster, hit = new Set(), dmg = c.v('dmg'), r = c.v('radius');
        AB.invis(h, WEA_SHU, h, c.v('dur'), 0);
        AB.addModifier(h, { id: 'wea_shu_ms', name: '缩地', color: '#9ccc65', props: { msPct: 0.55 } }, h, { dur: c.v('dur') });
        h._shuHit = hit;
        AB.burst(h.x, 1.2, h.z, 16, ['#aed581', '#ffffff'], 4, 0.5, 0.25, 1, 0);
        emit('shukuchi', { unit: h.id });
        let t = 0; const dur = c.v('dur');
        effects.push({ update(dt) {
          t += dt; if (h.dead || t >= dur || !getMod(h, 'wea_shu')) return true;
          weaverSample(h);
          for (const u of AB.enemiesIn(h, h.x, h.z, r)) {
            if (u.isBuilding || hit.has(u)) continue; hit.add(u);
            AB.damage(h, u, dmg, 'magic', 'shukuchi');
            AB.burst(u.x, 1.2, u.z, 10, ['#cddc39', '#ffffff'], 3, 0.35, 0.2, 1, 0);
          }
          return false;
        } });
      } },
    { id: 'geminate', key: 'E', name: '连击', icon: '连', color: '#7cb342', passive: true,
      values: { chance: [0.3, 0.4, 0.5, 0.6] }, fmt: { chance: v => Math.round(v * 100) + '%' },
      text: L => `被动：攻击有 ${L.chance} 几率立即再攻击一次（对建筑无效）。`,
      onAttackLand(c, t) {
        if (t.isBuilding || t.dead || c.caster._geminating) return;
        if (Math.random() >= c.v('chance')) return;
        const h = c.caster;
        AB.delay(0.05, () => {
          if (h.dead || t.dead) return;
          h._geminating = true; attackLand(h, t, 0); h._geminating = false;
          emit('geminate', { unit: h.id, target: t.id });
          AB.burst(t.x, 1.3, t.z, 8, ['#aed581', '#ffffff'], 3, 0.3, 0.18, 1, 0);
        });
      } },
    { id: 'time_lapse', ai: { escape: 'blink' },
      scepter: { desc: '倒流窗口 +1 秒，冷却 -20 秒。', cd: [40, 30, 20], values: { window: 6 } },
      key: 'R', name: '时光倒流', icon: '时', color: '#33691e', ult: true, target: 'none', castPoint: 0.3,
      mana: [100, 150, 200], cd: [60, 50, 40], values: { window: 5 },
      text: L => `终极技能：将自身位置与生命值倒流至最多 ${L.window} 秒前的状态。`,
      onCast(c) {
        const h = c.caster; weaverSample(h);
        const log = h._tlLog || [], cut = G.time - c.v('window');
        let best = null;
        for (const s of log) if (s.t >= cut) { best = s; break; }
        if (!best && log.length) best = log[0];
        if (!best) { best = { x: h.x, z: h.z, hp: h.hp }; }
        AB.burst(h.x, 1.5, h.z, 22, ['#aed581', '#cddc39', '#ffffff'], 6, 0.6, 0.3, 2, 0);
        AB.teleport(h, { x: best.x, z: best.z }, { colors: ['#9ccc65', '#f0f4c3', '#ffffff'] });
        h.hp = Math.min(h.maxHp, Math.max(1, best.hp));
        AB.float(h, '时光倒流！', '#aed581', 20, 1.2);
        AB.ringP(h.x, h.z, 0.5, 24, ['#689f38', '#cddc39'], 0.45, 0.3, 0.5, 8);
        emit('timeLapse', { unit: h.id, hp: Math.round(h.hp) });
        h._tlLog = [];
      } },
  ],
});
// keep sampling while weaver is alive
effects.push({ update(dt) {
  if (!G || !G.heroes) return false;
  for (const h of G.heroes) if (!h.dead && h.def && h.def.id === 'weaver' && !h.isIllusion) {
    h._tlAcc = (h._tlAcc || 0) + dt;
    if (h._tlAcc >= 0.25) { h._tlAcc = 0; weaverSample(h); }
  }
  return false;
} });
