// heroes/ember.js — 灰烬之灵 Ember Spirit (melee agility). Searing Chains (AoE root), Flame Guard (magic barrier + DPS),
// Sleight of Fist (AoE jump-hits then return), Fire Remnant (place charges; recast activates dash through remnants).
const EMB_CHAIN = { id: 'emb_chain', tag: '袖中一剑', color: '#ff6f00', debuff: true, states: ['rooted'],
  fx(u, m) { if (m.src && Math.random() < 0.5) AB.tetherFx(u, m.src.x, m.src.z, '#ffab40'); } };
const EMB_GUARD = { id: 'emb_guard', name: '烈火罩', color: '#ff6e40', absorb: 'magic', tick: 0.25,
  onTick(u, m) {
    for (const e of AB.enemiesIn(u, u.x, u.z, m.data.r)) if (!e.isBuilding) AB.damage(u, e, m.data.dps * 0.25, 'magic', 'flame_guard', { silent: true });
  },
  fx(u) { if (Math.random() < 0.4) { const a = Math.random() * 6.28; spawnP(u.x + Math.cos(a) * 1.2, rnd(0.3, 2.2), u.z + Math.sin(a) * 1.2, 0, 0.8, 0, 0.4, 0.2, '#ffab40'); } } };
const EMB_SLEIGHT = { id: 'emb_sleight', name: '火之余烬', color: '#ff3d00', states: ['invulnerable', 'disarmed'] };
function emberRemnantFx(r) {
  const mat = new T.MeshBasicMaterial({ color: '#ff6e40', transparent: true, opacity: 0.85 }), core = new T.Mesh(boxG, mat);
  core.scale.set(0.7, 1.4, 0.7); scene.add(core);
  return { update(dt) { core.position.set(r.x, 1.0 + Math.sin(G.time * 6) * 0.15, r.z); core.rotation.y += dt * 4;
    if (Math.random() < 0.5) spawnP(r.x + rnd(-0.3, 0.3), rnd(0.4, 2), r.z + rnd(-0.3, 0.3), 0, 1, 0, 0.4, 0.18, '#ffab40'); },
    end() { scene.remove(core); mat.dispose(); } };
}
function emberActivate(h, c) {
  const list = (h._remnants || []).slice(); h._remnants = []; h._frPlaceUntil = 0;
  if (!list.length) return;
  const dmg = c.v('dmg'), hit = new Set();
  let i = 0;
  const dash = () => {
    if (h.dead || i >= list.length) {
      for (const r of list) { if (r.fx) r.fx.end(); }
      AB.burst(h.x, 1.5, h.z, 20, ['#ff6e40', '#ffffff'], 5, 0.5, 0.25, 2, 0);
      emit('activateRemnant', { unit: h.id, n: list.length });
      return;
    }
    const r = list[i++];
    AB.teleport(h, { x: r.x, z: r.z }, { colors: ['#ff3d00', '#ffab40', '#ffffff'] });
    for (const u of AB.enemiesIn(h, h.x, h.z, 4)) {
      if (u.isBuilding || hit.has(u)) continue; hit.add(u);
      AB.damage(h, u, dmg, 'magic', 'fire_remnant');
    }
    AB.ringP(h.x, h.z, 0.5, 20, ['#ff6e40', '#ffab40'], 0.35, 0.25, 0.5, 6);
    if (r.fx) r.fx.end();
    AB.delay(0.12, dash);
  };
  AB.float(h, '激活残焰！', '#ffab40', 18, 1.1);
  dash();
}
registerHero({
  id: 'ember', order: 37, name: '灰烬之灵', title: '辛', type: '近战 · 敏捷', color: '#e65100', nameColor: '#ffab40',
  desc: '近战敏捷型连招。袖中一剑禁锢周围敌人，烈火罩吸收魔法并灼烧，火之余烬跳跃打击区域内全体，残焰放置后激活冲刺。',
  ai: { role: 'carry', aggr: 1.2, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'bfury', 'desolator', 'bkb', 'daedalus'],
    combos: [{ id: 'ember_chain_sleight', steps: [{ slot: 0 }, { slot: 2, at: 'target' }], min: 2, radius: 5 }] },
  stats: { primary: 'agi', str: 20, strG: 2.4, agi: 22, agiG: 2.6, int: 18, intG: 1.8, dmg: 26, armor: 1, bat: 1.7, range: 2.6,
    atkPoint: 0.4, backswing: 0.5, speed: 7.4, proj: 0, hpRegen: 1.5, manaRegen: 0.7, radius: 0.6, height: 3.2 },
  portrait: { headY: 2.7 },
  model: () => humanoid({ pants: '#bf360c', boots: '#3e2723', skin: '#ffab91', sleeve: '#e65100', hip: 0.24, sh: 0.6, legH: 1.1, bodyH: 1.05, legW: 0.36,
    body: [[0, 0.5, 0, 0.82, 1.05, 0.5, '#e65100'], [0, 0.55, 0.26, 0.5, 0.4, 0.04, '#ffd54f'], [0, 0.1, 0, 0.9, 0.25, 0.55, '#bf360c'],
      [0, 1.45, 0, 0.72, 0.72, 0.72, '#ffab91'], [0, 1.8, -0.05, 0.85, 0.35, 0.85, '#ff6f00'], [0, 2.05, 0, 0.3, 0.4, 0.3, '#ffd54f'],
      [-0.18, 1.55, 0.38, 0.12, 0.08, 0.02, '#212121'], [0.18, 1.55, 0.38, 0.12, 0.08, 0.02, '#212121'],
      [0, 1.0, -0.35, 0.7, 1.2, 0.1, '#bf360c']],
    bodyGlow: [[0, 0.7, 0.28, 0.4, 0.5, 0.04, '#ffab40']],
    armR: [[0, -0.42, 0, 0.34, 0.88, 0.38, '#e65100'], [0, -0.85, 0, 0.36, 0.22, 0.4, '#ffab91'],
      [0, -0.95, 0.4, 0.12, 0.12, 0.8, '#ff6f00'], [0, -0.95, 1.3, 0.35, 0.35, 0.5, '#ffd54f']],
    armL: [[0, -0.42, 0, 0.34, 0.88, 0.38, '#e65100'], [0, -0.85, 0, 0.36, 0.22, 0.4, '#ffab91']] }),
  abilities: [
    { id: 'searing_chains', ai: { disable: true, selfAoe: true }, shard: { desc: '禁锢时间 +0.5 秒，伤害 +40。', values: { dur: [2.5, 3, 3.5, 4], dmg: [120, 180, 240, 300] } },
      key: 'Q', name: '袖中一剑', icon: '链', color: '#ff6f00', target: 'none', castPoint: 0,
      mana: [110, 110, 110, 110], cd: [14, 12, 10, 8], values: { radius: 4.5, dur: [2, 2.5, 3, 3.5], dmg: [80, 120, 160, 200], max: 3 },
      text: L => `用火焰锁链禁锢周围 ${L.radius} 码内最多 ${L.max} 名敌人 ${L.dur} 秒，并造成 ${L.dmg} 点魔法伤害。`,
      onCast(c) {
        const h = c.caster, foes = AB.enemiesIn(h, h.x, h.z, c.v('radius')).filter(u => !u.isBuilding)
          .sort((a, b) => (b.isHero - a.isHero) || dst(a, h) - dst(b, h)).slice(0, c.v('max'));
        for (const u of foes) {
          AB.root(u, h, c.v('dur')); AB.damage(h, u, c.v('dmg'), 'magic', 'searing_chains');
          AB.addModifier(u, EMB_CHAIN, h, { dur: c.v('dur') });
          AB.tetherFx(u, h.x, h.z, '#ffab40');
        }
        AB.ringP(h.x, h.z, 0.5, 28, ['#ff6f00', '#ffab40', '#ffffff'], 0.4, 0.3, 0.5, c.v('radius') / 0.5);
        emit('searingChains', { unit: h.id, n: foes.length });
      } },
    { id: 'flame_guard', ai: { selfAoe: true }, key: 'W', name: '烈火罩', icon: '罩', color: '#ff3d00', target: 'none', castPoint: 0,
      mana: [80, 90, 100, 110], cd: [35, 30, 25, 20], values: { absorb: [100, 200, 300, 400], dps: [30, 40, 50, 60], radius: 4.5, dur: 12 },
      text: L => `环绕烈焰 ${L.dur} 秒：吸收 ${L.absorb} 点魔法伤害，并对周围 ${L.radius} 码敌人每秒造成 ${L.dps} 点魔法伤害。护盾耗尽时效果结束。`,
      onCast(c) {
        const h = c.caster;
        removeModById(h, 'emb_guard');
        AB.addModifier(h, EMB_GUARD, h, { dur: c.v('dur'), data: { left: c.v('absorb'), dps: c.v('dps'), r: c.v('radius') } });
        AB.ringP(h.x, h.z, 0.6, 24, ['#ff3d00', '#ffab40'], 0.45, 0.3, 0.6, c.v('radius') / 0.6);
        emit('flameGuard', { unit: h.id });
      } },
    { id: 'sleight_of_fist', ai: { aoe: 2, engage: true }, key: 'E', name: '火之余烬', icon: '余', color: '#ffab40', target: 'point', range: 10, castPoint: 0.1,
      mana: [50, 60, 70, 80], cd: [15, 12, 9, 6], values: { radius: 4.5, bonus: [30, 60, 90, 120] },
      text: L => `标记目标区域 ${L.radius} 码内的敌人，瞬间跳跃攻击每一位（额外 ${L.bonus} 点物理伤害），然后回到原位。`,
      onCast(c, pt) {
        const h = c.caster, ox = h.x, oz = h.z, foes = AB.enemiesIn(h, pt.x, pt.z, c.v('radius')).filter(u => !u.isBuilding && !isInvuln(u));
        if (!foes.length) { AB.ringP(pt.x, pt.z, c.v('radius'), 24, ['#ffab40', '#ffcc80'], 0.4, 0.25, 0.3); return; }
        AB.addModifier(h, EMB_SLEIGHT, h, { dur: 0.15 + foes.length * 0.12 });
        let i = 0;
        const hitNext = () => {
          if (h.dead || i >= foes.length) {
            removeModById(h, 'emb_sleight');
            AB.teleport(h, { x: ox, z: oz }, { colors: ['#ff6e40', '#ffffff'], stop: false });
            emit('sleightOfFist', { unit: h.id, n: foes.length });
            return;
          }
          const t = foes[i++];
          if (t.dead) { hitNext(); return; }
          AB.teleport(h, { x: t.x + rnd(-0.5, 0.5), z: t.z + rnd(-0.5, 0.5) }, { colors: ['#ffab40', '#ff3d00'], stop: false });
          h.facing = Math.atan2(t.x - h.x, t.z - h.z);
          AB.damage(h, t, h.dmgBase + c.v('bonus'), 'phys', 'sleight_of_fist', { big: true });
          AB.burst(t.x, 1.3, t.z, 12, ['#ffab40', '#ffffff', '#ff3d00'], 4, 0.35, 0.2, 2, 0);
          AB.delay(0.1, hitNext);
        };
        AB.ringP(pt.x, pt.z, c.v('radius'), 28, ['#ff6f00', '#ffab40'], 0.4, 0.3, 0.35);
        hitNext();
      } },
    { id: 'fire_remnant', ai: { engage: true },
      scepter: { desc: '残焰伤害 +80，充能时间 -4 秒。', values: { dmg: [180, 260, 340], chargeCd: 12 } },
      key: 'R', name: '火炸弹', icon: '焰', color: '#bf360c', ult: true, target: 'point', range: 18, castPoint: 0.1, clampRange: true,
      mana: 0, cd: 0.5, values: { dmg: [100, 180, 260], max: 3, chargeCd: 16, dur: 45 },
      text: L => `终极技能：在目标点放置残焰（最多 ${L.max} 个，每 ${L.chargeCd} 秒回复 1 充能）。残焰存在时再次施放：激活并依次冲过所有残焰，对沿途敌人造成 ${L.dmg} 点魔法伤害。短时间内可连续放置。`,
      recast: h => {
        const r = h._remnants; if (!r || !r.length) return false;
        if (r.length < 3 && G.time < (h._frPlaceUntil || 0)) return false;
        return true;
      },
      onRecast(c) { emberActivate(c.caster, c); },
      onCast(c, pt) {
        const h = c.caster;
        if (!h._frCharges && h._frCharges !== 0) h._frCharges = 3;
        if (h._frCharges <= 0) { AB.float(h, '充能不足', '#ffab40', 14, 0.8); return; }
        h._frCharges--;
        const rem = { x: pt.x, z: pt.z, fx: emberRemnantFx({ x: pt.x, z: pt.z }), t: G.time + c.v('dur') };
        (h._remnants || (h._remnants = [])).push(rem);
        h._frPlaceUntil = G.time + 2.5;
        AB.burst(pt.x, 1.2, pt.z, 14, ['#ff6e40', '#ffab40'], 4, 0.4, 0.25, 2, 0);
        emit('fireRemnant', { unit: h.id, n: h._remnants.length, charges: h._frCharges });
        // expire remnant
        AB.delay(c.v('dur'), () => {
          const i = (h._remnants || []).indexOf(rem);
          if (i >= 0) { h._remnants.splice(i, 1); if (rem.fx) rem.fx.end(); }
        });
        // charge regen
        AB.delay(c.v('chargeCd'), () => { h._frCharges = Math.min(3, (h._frCharges || 0) + 1); });
      } },
  ],
});
