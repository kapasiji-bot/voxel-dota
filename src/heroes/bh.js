// heroes/bh.js — 赏金猎人 Bounty Hunter (melee agility). Shuriken Toss (mini-stun, bounces between Tracked enemies),
// Jinada (cooldown crit + gold steal), Shadow Walk (invisibility; attacking out of it deals bonus damage + stun), Track
// (reveals the target through fog and invisibility; bonus gold for BH and nearby allies when it dies).
const BH_WALK = { id: 'bh_walk', name: '暗影步', color: '#5d4037', invis: true, breakOn: 'remove', props: { msPct: 0.2 },
  onBreak(u, m, why, t) {
    if (why !== 'attack' || !t || t.isBuilding || t.dead) return;
    AB.damage(u, t, m.data.bonus || 0, 'phys', 'bh_walk', { big: true }); AB.stun(t, u, 0.4);
    AB.burst(t.x, 1.5, t.z, 20, ['#ffab00', '#5d4037', '#fff'], 5, 0.5, 0.25, 2);
  } };
const BH_TRACK = { id: 'bh_track', tag: '追踪', color: '#ffab00', debuff: true, reveal: true,
  onApply(u) { attachFx(u, 'track', () => { const m = new T.Mesh(boxG, fxMat('#ffab00')); m.scale.set(0.45, 0.45, 0.45); m.position.y = u.height + 1.1; return m; }); },
  onRemove(u) { detachFx(u, 'track'); },
  fx(u, m, dt) { const f = u._fx && u._fx.track; if (f) { f.rotation.y += dt * 4; f.rotation.x += dt * 2; } },
  onDeath(u, m, killer) {
    const h = m.src; if (!u.isHero || !h || h.team === u.team || (killer && killer.team === u.team)) return;
    giveGold(m.data.self, u, h);
    const allies = G.heroes.filter(a => a !== h && a.team === h.team && !a.dead && dst(a, u) <= 24); for (const a of allies) giveGold(m.data.ally, null, a);
    emit('trackBounty', { unit: h.id, victim: u.id, self: m.data.self, ally: m.data.ally, allies: allies.length });
  } };
registerHero({
  id: 'bh', order: 10, name: '赏金猎人', title: '刚德尔', type: '近战 · 敏捷', color: '#e65100', nameColor: '#ffb74d',
  desc: '近战敏捷型游走英雄。暗影步隐身接近猎物，忍术暴击并偷取金钱，标记让目标无处藏身，击杀被标记者还能获得额外赏金。',
  ai: { role: 'carry' },
  stats: { primary: 'agi', str: 20, strG: 2.5, agi: 23, agiG: 2.6, int: 19, intG: 1.9, dmg: 26, armor: 2, bat: 1.7, range: 2.6,
    atkPoint: 0.59, backswing: 0.59, speed: 7.4, proj: 0, hpRegen: 1.5, manaRegen: 0.8, radius: 0.6, height: 3.0 },
  portrait: { headY: 2.45 },
  model: () => humanoid({
    pants: '#4e342e', boots: '#212121', skin: '#a1887f', sleeve: '#6d4c41', hip: 0.24, sh: 0.6, legH: 1.0, bodyH: 1.0, legW: 0.36,
    body: [[0, 0.5, 0, 0.84, 1.0, 0.55, '#6d4c41'], [0, 0.5, 0.29, 0.6, 0.5, 0.03, '#bf360c'], [0, 0.1, 0, 0.9, 0.2, 0.6, '#3e2723'],
      [0, 1.4, 0, 0.76, 0.76, 0.76, '#a1887f'], [0, 1.42, 0.39, 0.76, 0.3, 0.04, '#212121'], [-0.18, 1.46, 0.41, 0.14, 0.08, 0.02, '#ffab00'], [0.18, 1.46, 0.41, 0.14, 0.08, 0.02, '#ffab00'],
      [-0.5, 1.55, 0, 0.3, 0.12, 0.3, '#a1887f'], [0.5, 1.55, 0, 0.3, 0.12, 0.3, '#a1887f'], [0, 0.8, -0.38, 0.7, 0.9, 0.2, '#bf360c'],
      [-0.25, 1.2, -0.52, 0.5, 0.5, 0.06, '#9e9e9e'], [0.25, 1.2, -0.52, 0.5, 0.5, 0.06, '#9e9e9e']],
    armR: [[0, -0.42, 0, 0.36, 0.85, 0.4, '#6d4c41'], [0, -0.82, 0, 0.38, 0.22, 0.42, '#a1887f'], [0, -0.9, 0.55, 0.12, 0.12, 0.9, '#e0e0e0'], [0, -0.9, 1.0, 0.36, 0.06, 0.18, '#e0e0e0']],
    armL: [[0, -0.42, 0, 0.36, 0.85, 0.4, '#6d4c41'], [0, -0.82, 0, 0.38, 0.22, 0.42, '#a1887f'], [0, -0.9, 0.55, 0.12, 0.12, 0.9, '#e0e0e0'], [0, -0.9, 1.0, 0.36, 0.06, 0.18, '#e0e0e0']],
  }),
  abilities: [
    { id: 'shuriken', key: 'Q', name: '水魔飞镖', icon: '镖', color: '#ff6f00', target: 'unit', range: 13, castPoint: 0.3,
      mana: [100, 110, 120, 130], cd: 8, values: { dmg: [90, 160, 230, 300], stun: 0.25, bounce: 24 },
      text: L => `掷出飞镖，造成 ${L.dmg} 点魔法伤害并短暂眩晕 ${L.stun} 秒。飞镖会在 ${L.bounce} 码内被标记的敌人之间弹射。`,
      onCast(c, t) {
        const h = c.caster, hitSet = new Set();
        const throwAt = (src, u) => AB.projectile({ src, target: u, speed: 30, color: '#ffab00', size: 0.55, trail: '#ffe0b2', onHit(v) {
          hitSet.add(v); AB.damage(h, v, c.v('dmg'), 'magic', 'shuriken'); AB.stun(v, h, c.v('stun'));
          const nxt = units.find(o => !o.dead && o.team !== h.team && !hitSet.has(o) && getMod(o, 'bh_track') && dst(o, v) <= c.v('bounce'));
          if (nxt) { emit('shurikenBounce', { unit: h.id, from: v.id, to: nxt.id }); throwAt(v, nxt); }
        } });
        throwAt(h, t);
      } },
    { id: 'jinada', key: 'W', name: '忍术', icon: '忍', color: '#bf360c', passive: true,
      cd: [9, 8, 7, 6], values: { crit: [1.5, 1.75, 2.0, 2.25], steal: [12, 20, 28, 36] }, fmt: { crit: v => Math.round(v * 100) + '%' },
      text: L => `被动：冷却完毕时，下一次攻击造成 ${L.crit} 暴击伤害，并从敌方英雄身上偷取 ${L.steal} 金钱。`,
      modifyAttack(c, t, info) {
        if (c.ab.cd > 0 || t.isBuilding) return; const h = c.caster;
        applyCrit(info, c.v('crit')); c.ab.cd = c.ab.cdMax = c.v('cd');
        if (t.isHero) { const g = Math.min(Math.floor(t.gold), c.v('steal')); t.gold -= g; giveGold(g, t, h); emit('goldSteal', { unit: h.id, target: t.id, amount: g }); }
        emit('jinada', { unit: h.id, target: t.id, mult: c.v('crit') });
        AB.burst(t.x, 1.5, t.z, 14, ['#ffab00', '#ffd54f'], 4, 0.4, 0.25, 2);
      } },
    { id: 'shadowwalk', ai: { escape: 'invis', engage: true }, keepInvis: true, key: 'E', name: '暗影步', icon: '影', color: '#4e342e', target: 'none', castPoint: 0,
      mana: 50, cd: 15, values: { dur: [20, 25, 30, 35], fade: 1, bonus: [30, 60, 90, 120] },
      text: L => `隐身 ${L.dur} 秒（${L.fade} 秒渐隐），移动速度 +20%。从隐身中攻击会显形，造成 ${L.bonus} 点额外物理伤害并眩晕 0.4 秒。施法也会显形。`,
      onCast(c) { const h = c.caster, m = AB.invis(h, BH_WALK, h, c.v('dur'), c.v('fade')); if (m) m.data.bonus = c.v('bonus'); AB.burst(h.x, 1.5, h.z, 20, ['#5d4037', '#8d6e63', '#212121'], 3, 0.8, 0.3, 1, 0); } },
    { id: 'track', ai: { debuffId: 'bh_track', hpBelow: 0.75 }, keepInvis: true, scepter: { desc: '标记赏金提升：赏金猎人 250/350/450，友方 100/150/200。', values: { self: [250, 350, 450], ally: [100, 150, 200] } }, key: 'R', name: '标记', icon: '标', color: '#ffab00', ult: true, target: 'unit', range: 16, castPoint: 0.3,
      mana: 65, cd: [4, 4, 4], values: { dur: 30, self: [150, 250, 350], ally: [50, 100, 150] },
      text: L => `终极技能：标记一名敌人 ${L.dur} 秒：其对你的队伍完全可见（无视战争迷雾与隐身）。目标阵亡时你获得 ${L.self} 金钱，附近队友各获得 ${L.ally} 金钱。`,
      onCast(c, t) { const h = c.caster; AB.addModifier(t, BH_TRACK, h, { dur: c.v('dur'), data: { self: c.v('self'), ally: c.v('ally') } });
        AB.beam(h.x, h.height * 0.6, h.z, t.x, t.height * 0.6, t.z, '#ffab00', 0.15, 0.4); AB.float(t, '标记！', '#ffab00', 16, 1); } },
  ],
});
