// heroes/storm.js — 风暴之灵 Storm Spirit (ranged intelligence). Static Remnant (place+auto explode),
// Electric Vortex (pull), Overload (next-attack AoE after cast), Ball Lightning (mana-cost dash).
const STORM_OV = { id: 'storm_ov', name: '超负荷', color: '#80d8ff' };
function stormRemnantFx(r) {
  const mat = new T.MeshBasicMaterial({ color: '#40c4ff', transparent: true, opacity: 0.8 }), core = new T.Mesh(boxG, mat);
  core.scale.set(0.65, 1.3, 0.65); scene.add(core);
  return { update(dt) { core.position.set(r.x, 1.0 + Math.sin(G.time * 7) * 0.12, r.z); core.rotation.y += dt * 5;
    if (Math.random() < 0.45) spawnP(r.x + rnd(-0.3, 0.3), rnd(0.4, 2), r.z + rnd(-0.3, 0.3), 0, 1, 0, 0.35, 0.16, '#e1f5fe'); },
    end() { scene.remove(core); mat.dispose(); } };
}
function stormDetonate(h, rem, dmg, radius) {
  if (!rem || rem.dead) return; rem.dead = true;
  if (rem.fx) rem.fx.end();
  const list = h._remnants; if (list) { const i = list.indexOf(rem); if (i >= 0) list.splice(i, 1); }
  for (const u of AB.enemiesIn(h, rem.x, rem.z, radius)) if (!u.isBuilding) AB.damage(h, u, dmg, 'magic', 'static_remnant');
  AB.burst(rem.x, 1.4, rem.z, 28, ['#40c4ff', '#ffffff', '#0277bd'], 6, 0.55, 0.3, 3, 0);
  AB.ringP(rem.x, rem.z, 0.5, 24, ['#80d8ff', '#e1f5fe'], 0.4, 0.28, 0.45, radius / 0.5);
  emit('staticRemnant', { unit: h.id, explode: true });
}
registerHero({
  id: 'storm', order: 38, name: '风暴之灵', title: '莱卡洛斯', type: '远程 · 智力', color: '#0277bd', nameColor: '#80d8ff',
  desc: '远程智力型游走。残影静待引爆，电能漩涡拉扯敌人，施法后超负荷强化普攻，球状闪电穿梭战场。',
  ai: { role: 'carry', aggr: 1.15, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['arcane', 'blink', 'bloodstone', 'scepter', 'scythe'],
    combos: [{ id: 'storm_vortex_ball', steps: [{ slot: 1, at: 'target' }, { slot: 3, at: 'near' }], min: 1, radius: 6 }] },
  stats: { primary: 'int', str: 19, strG: 1.8, agi: 22, agiG: 1.8, int: 24, intG: 3.2, dmg: 22, armor: 2, bat: 1.7, range: 9,
    atkPoint: 0.5, backswing: 0.3, speed: 7.1, proj: 22, projColor: '#80d8ff', hpRegen: 1.0, manaRegen: 1.0, radius: 0.6, height: 3.2 },
  portrait: { headY: 2.7 },
  model: () => humanoid({ pants: '#01579b', boots: '#0d47a1', skin: '#b3e5fc', sleeve: '#0288d1', hip: 0.24, sh: 0.58, legH: 1.05, bodyH: 1.0, legW: 0.34,
    body: [[0, 0.48, 0, 0.78, 1.0, 0.5, '#0288d1'], [0, 0.55, 0.26, 0.45, 0.35, 0.04, '#80d8ff'], [0, 0.08, 0, 0.88, 0.22, 0.55, '#01579b'],
      [0, 1.4, 0, 0.7, 0.7, 0.7, '#b3e5fc'], [0, 1.75, -0.05, 0.85, 0.3, 0.85, '#0277bd'], [0, 2.0, 0, 0.28, 0.35, 0.28, '#40c4ff'],
      [-0.16, 1.48, 0.38, 0.12, 0.08, 0.02, '#01579b'], [0.16, 1.48, 0.38, 0.12, 0.08, 0.02, '#01579b'],
      [-0.55, 1.1, -0.15, 0.55, 1.1, 0.06, '#4fc3f7'], [0.55, 1.1, -0.15, 0.55, 1.1, 0.06, '#4fc3f7']],
    bodyGlow: [[0, 0.7, 0.28, 0.35, 0.4, 0.04, '#e1f5fe'], [0, 1.9, 0.1, 0.2, 0.25, 0.2, '#80d8ff']],
    armR: [[0, -0.4, 0, 0.32, 0.85, 0.36, '#0288d1'], [0, -0.85, 0, 0.34, 0.2, 0.38, '#b3e5fc']],
    armL: [[0, -0.4, 0, 0.32, 0.85, 0.36, '#0288d1'], [0, -0.85, 0, 0.34, 0.2, 0.38, '#b3e5fc']] }),
  abilities: [
    { id: 'static_remnant', ai: { selfAoe: true, nuke: true }, shard: { desc: '残影伤害 +40，引爆半径 +0.5。', values: { dmg: [140, 190, 240, 290], radius: 3.5 } },
      key: 'Q', name: '残影', icon: '影', color: '#29b6f6', target: 'none', castPoint: 0,
      mana: [70, 80, 90, 100], cd: [3.5, 3.5, 3.5, 3.5], values: { dmg: [100, 150, 200, 250], radius: 3, arm: 1.0, life: 12, near: 2.4 },
      text: L => `在当前位置留下残影。${L.arm} 秒后激活：敌人靠近 ${L.near} 码即引爆，对 ${L.radius} 码内造成 ${L.dmg} 点魔法伤害（最多存在 ${L.life} 秒）。`,
      onCast(c) {
        const h = c.caster, rem = { x: h.x, z: h.z, dead: false, armed: false };
        rem.fx = stormRemnantFx(rem);
        (h._remnants || (h._remnants = [])).push(rem);
        emit('staticRemnant', { unit: h.id, place: true });
        AB.burst(h.x, 1.2, h.z, 12, ['#40c4ff', '#ffffff'], 3, 0.35, 0.2, 1.5, 0);
        AB.delay(c.v('arm'), () => { if (!rem.dead) rem.armed = true; });
        const dmg = c.v('dmg'), radius = c.v('radius'), near = c.v('near');
        effects.push({ update(dt) {
          if (rem.dead || h.dead) { if (!rem.dead && rem.fx) rem.fx.end(); rem.dead = true; return true; }
          rem.fx && rem.fx.update(dt);
          if (rem.armed) {
            for (const u of AB.enemiesIn(h, rem.x, rem.z, near)) if (!u.isBuilding) { stormDetonate(h, rem, dmg, radius); return true; }
          }
          return false;
        } });
        AB.delay(c.v('life'), () => { if (!rem.dead) stormDetonate(h, rem, dmg, radius); });
      } },
    { id: 'electric_vortex', ai: { disable: true }, key: 'W', name: '电能漩涡', icon: '涡', color: '#0277bd', target: 'unit', range: 5.5, castPoint: 0.3,
      mana: [80, 100, 120, 140], cd: [21, 18, 15, 12], values: { pull: [180, 220, 260, 300], dur: [1.0, 1.3, 1.6, 1.9] },
      text: L => `将一名敌人拉向自己，并禁锢 ${L.dur} 秒。`,
      onCast(c, t) {
        const h = c.caster, dur = c.v('dur');
        AB.pull(t, h.x, h.z, Math.min(c.v('pull') / 40, dst(t, h) - 1.2));
        AB.root(t, h, dur); AB.stun(t, h, Math.min(0.35, dur));
        AB.tetherFx(t, h.x, h.z, '#40c4ff');
        AB.burst(t.x, 1.3, t.z, 16, ['#40c4ff', '#ffffff'], 4, 0.4, 0.25, 2, 0);
        emit('electricVortex', { unit: h.id, target: t.id });
        let left = dur;
        effects.push({ update(dt) {
          left -= dt; if (left <= 0 || t.dead || h.dead) return true;
          if (dst(t, h) > 2.0) AB.pull(t, h.x, h.z, 6 * dt);
          if (Math.random() < 0.5) AB.tetherFx(t, h.x, h.z, '#80d8ff');
          return false;
        } });
      } },
    { id: 'overload', key: 'E', name: '超负荷', icon: '荷', color: '#4fc3f7', passive: true,
      values: { dmg: [40, 60, 80, 100], radius: 3.5, slow: 0.8, dur: 0.6 }, fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `被动：每次施法后，下一次攻击额外造成 ${L.dmg} 点魔法伤害（半径 ${L.radius}），并减速 ${L.slow}，持续 ${L.dur} 秒。`,
      onAbilityCast(c, ab) {
        if (!ab || ab.def.id === 'overload') return;
        const h = c.caster; h._overload = { dmg: c.v('dmg'), r: c.v('radius'), slow: c.v('slow'), dur: c.v('dur') };
        AB.addModifier(h, STORM_OV, h, { dur: 12 });
      },
      onAttackLand(c, t) {
        const h = c.caster, o = h._overload; if (!o || t.isBuilding) return;
        h._overload = null; removeModById(h, 'storm_ov');
        for (const u of AB.enemiesIn(h, t.x, t.z, o.r)) {
          if (u.isBuilding) continue;
          AB.damage(h, u, o.dmg, 'magic', 'overload');
          AB.slow(u, h, o.dur, o.slow);
        }
        AB.burst(t.x, 1.3, t.z, 18, ['#80d8ff', '#ffffff', '#0277bd'], 5, 0.45, 0.25, 2, 0);
        emit('overload', { unit: h.id, target: t.id });
      } },
    { id: 'ball_lightning', ai: { escape: 'blink', engage: true },
      scepter: { desc: '球状闪电伤害 +40，每 100 码耗蓝 -4。', values: { dmg: [120, 160, 200], manaPer: 8 } },
      key: 'R', name: '球状闪电', icon: '球', color: '#01579b', ult: true, target: 'point', range: 40, castPoint: 0.3, clampRange: true,
      mana: 30, cd: [0, 0, 0], values: { speed: 28, dmg: [8, 12, 16], radius: 2.5, manaPer: 12, tree: true },
      text: L => `终极技能：化作闪电飞向目标点，途中对 ${L.radius} 码敌人造成 ${L.dmg} 点魔法伤害（每 100 码）。每飞行 100 码额外消耗 ${L.manaPer} 点魔法；魔法耗尽时提前落地。`,
      onCast(c, pt) {
        const h = c.caster, dest = AB.clampPoint(h, pt, 40), sx = h.x, sz = h.z;
        const dx = dest.x - sx, dz = dest.z - sz, len = Math.hypot(dx, dz) || 0.1, dirx = dx / len, dirz = dz / len;
        const speed = c.v('speed'), radius = c.v('radius'), dmgPer = c.v('dmg'), manaPer = c.v('manaPer');
        const hit = new Set(); let trav = 0, manaSpent = 0;
        AB.addModifier(h, { id: 'storm_ball', name: '球状闪电', color: '#40c4ff', states: ['invulnerable', 'disarmed'] }, h, { dur: len / speed + 0.5 });
        emit('ballLightning', { unit: h.id, len: +len.toFixed(1) });
        AB.float(h, '球状闪电！', '#80d8ff', 18, 1.0);
        effects.push({ update(dt) {
          if (h.dead) { removeModById(h, 'storm_ball'); return true; }
          const step = Math.min(speed * dt, len - trav); trav += step;
          const nx = sx + dirx * trav, nz = sz + dirz * trav;
          const need = (step / 100) * manaPer;
          if (need > 0) {
            if (h.mana < need) { removeModById(h, 'storm_ball'); AB.teleport(h, { x: nx, z: nz }, { colors: ['#40c4ff', '#ffffff'], stop: false }); return true; }
            h.mana -= need; manaSpent += need;
          }
          AB.teleport(h, { x: nx, z: nz }, { noFx: true, stop: false });
          for (const u of AB.enemiesIn(h, h.x, h.z, radius)) {
            if (u.isBuilding || hit.has(u)) continue; hit.add(u);
            AB.damage(h, u, dmgPer * (len / 100), 'magic', 'ball_lightning');
          }
          if (Math.random() < 0.7) spawnP(h.x + rnd(-0.4, 0.4), rnd(0.5, 2.2), h.z + rnd(-0.4, 0.4), 0, 1.2, 0, 0.35, 0.2, '#e1f5fe');
          if (trav >= len - 0.01) {
            removeModById(h, 'storm_ball');
            AB.burst(h.x, 1.5, h.z, 24, ['#40c4ff', '#ffffff'], 6, 0.5, 0.3, 2, 0);
            emit('ballLightningEnd', { unit: h.id, n: hit.size, mana: Math.round(manaSpent) });
            return true;
          }
          return false;
        } });
      } },
  ],
});
