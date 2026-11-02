// heroes/kunkka.js — 昆卡 Kunkka (melee strength). Torrent (delayed geyser stun+lift), Tidebringer (next-attack cleave),
// X Marks the Spot (mark + return; recast early), Ghost Ship (long ship stun/dmg + rum buff to allies).
const KUNK_X = { id: 'kunk_x', tag: 'X标记', color: '#ffd54f' };
const KUNK_RUM = { id: 'kunk_rum', name: '朗姆酒', color: '#ffb74d' };
function kunkkaReturn(u, src) {
  const m = getMod(u, 'kunk_x'); if (!m || !m.data) return;
  const { x, z } = m.data; removeModifier(u, m);
  if (u.dead) return;
  AB.teleport(u, { x, z }, { colors: ['#ffd54f', '#4fc3f7', '#ffffff'], stop: false });
  AB.burst(u.x, 1.4, u.z, 18, ['#ffd54f', '#4fc3f7'], 5, 0.5, 0.25, 2, 0);
  emit('xReturn', { unit: src ? src.id : 0, target: u.id });
}
registerHero({
  id: 'kunkka', order: 34, name: '昆卡', title: '舰队统帅', type: '近战 · 力量', color: '#01579b', nameColor: '#4fc3f7',
  desc: '近战力量型先手。洪流延迟喷泉眩晕击飞，潮汐使者下次攻击溅射，X标记强制回位，幽灵船远距撞击并赠朗姆酒。',
  ai: { role: 'tank', aggr: 1.05, skills: [0, 1, 0, 2, 0, 3, 0, 1, 1, 1, 3, 2, 2, 2, 3], build: ['phase', 'blink', 'bkb', 'heart', 'assault'],
    combos: [{ id: 'kunk_ship_torrent', steps: [{ slot: 3, at: 'target' }, { slot: 0, at: 'target' }, { slot: 2, at: 'target' }], min: 2, radius: 6 }] },
  stats: { primary: 'str', str: 24, strG: 3.3, agi: 14, agiG: 1.6, int: 18, intG: 1.8, dmg: 28, armor: 2, bat: 1.7, range: 2.6,
    atkPoint: 0.4, backswing: 0.5, speed: 7.0, proj: 0, hpRegen: 1.5, manaRegen: 0.7, radius: 0.7, height: 3.4 },
  portrait: { headY: 2.85 },
  model: () => humanoid({ pants: '#37474f', boots: '#1a237e', skin: '#ffe0b2', sleeve: '#0277bd', hip: 0.3, sh: 0.75, legH: 1.15, bodyH: 1.15, legW: 0.42,
    body: [[0, 0.55, 0, 1.05, 1.15, 0.7, '#0277bd'], [0, 0.6, 0.36, 0.55, 0.4, 0.04, '#ffd54f'], [0, 0.1, 0, 1.1, 0.28, 0.75, '#01579b'],
      [0, 1.6, 0, 0.85, 0.8, 0.85, '#ffe0b2'], [0, 2.0, -0.05, 1.0, 0.4, 1.0, '#b71c1c'], [0, 2.25, 0.1, 0.35, 0.25, 0.55, '#ffd54f'],
      [-0.2, 1.7, 0.42, 0.14, 0.1, 0.02, '#263238'], [0.2, 1.7, 0.42, 0.14, 0.1, 0.02, '#263238'], [0, 1.05, -0.45, 0.9, 1.3, 0.12, '#01579b']],
    armR: [[0, -0.45, 0, 0.4, 0.95, 0.45, '#0277bd'], [0, -0.9, 0, 0.42, 0.26, 0.48, '#ffe0b2'],
      [0, -1.0, 0.4, 0.14, 0.14, 0.9, '#5d4037'], [0, -1.0, 1.5, 0.2, 0.55, 1.1, '#90a4ae'], [0, -1.0, 2.2, 0.55, 0.7, 0.55, '#607d8b']],
    armL: [[0, -0.45, 0, 0.4, 0.95, 0.45, '#0277bd'], [0, -0.9, 0, 0.42, 0.26, 0.48, '#ffe0b2']] }),
  abilities: [
    { id: 'torrent', ai: { disable: true, aoe: 1 }, shard: { desc: '洪流伤害 +40，眩晕 +0.3 秒。', values: { dmg: [160, 230, 300, 370], stun: [1.7, 1.9, 2.1, 2.3] } },
      key: 'Q', name: '洪流', icon: '洪', color: '#29b6f6', target: 'point', range: 14, castPoint: 0.4,
      mana: [100, 110, 120, 130], cd: [12, 11, 10, 9], values: { radius: 3.5, delay: 1.6, dmg: [120, 180, 240, 300], stun: [1.4, 1.6, 1.8, 2.0] },
      text: L => `${L.delay} 秒后目标点喷发洪流（半径 ${L.radius} 码）：造成 ${L.dmg} 点魔法伤害，击飞并眩晕 ${L.stun} 秒。`,
      onCast(c, pt) { const h = c.caster;
        AB.delayedArea({ caster: h, x: pt.x, z: pt.z, radius: c.v('radius'), delay: c.v('delay'), colors: ['#4fc3f7', '#e1f5fe'],
          onLand(hit) {
            for (const u of hit) { if (u.isBuilding) continue;
              AB.damage(h, u, c.v('dmg'), 'magic', 'torrent'); AB.knockup(u, h, Math.min(1.0, c.v('stun') * 0.5), 3.2); AB.stun(u, h, c.v('stun')); }
            AB.burst(pt.x, 2, pt.z, 36, ['#4fc3f7', '#0277bd', '#ffffff'], 8, 0.7, 0.35, 4, 0);
            emit('torrent', { unit: h.id, n: hit.length });
          } }); } },
    { id: 'tidebringer', key: 'W', name: '潮汐使者', icon: '潮', color: '#0277bd', passive: true,
      cd: [13, 10, 7, 4], values: { dmg: [25, 50, 75, 100], len: [8, 9, 10, 11], w1: 7 },
      text: L => `被动：冷却完毕时，下一次攻击造成 ${L.dmg} 点额外物理伤害，并对前方锥形敌人溅射同等伤害。`,
      modifyAttack(c, t, info) {
        if (c.ab.cd > 0 || t.isBuilding) return; const h = c.caster;
        info.dmg += c.v('dmg'); c.ab.cd = c.ab.cdMax = c.v('cd'); h._tbCleave = c.v('len'); h._tbW = c.v('w1');
        emit('tidebringer', { unit: h.id, target: t.id });
      },
      onAttackLand(c, t, dealt) {
        const h = c.caster; if (t.isBuilding || !(h._tbCleave > 0)) return;
        const len = h._tbCleave, w1 = h._tbW || 7; h._tbCleave = 0;
        AB.cleave(h, t, dealt, { len, w0: 3, w1, ability: 'tidebringer', color: '#4fc3f7' });
        AB.ringP(t.x, t.z, 0.4, 16, ['#4fc3f7', '#ffffff'], 0.35, 0.25, 0.4, 8);
      } },
    { id: 'x_marks', ai: { disable: true }, key: 'E', name: 'X标记', icon: 'X', color: '#ffd54f', target: 'unit', targetTeam: 'any', range: 10, castPoint: 0.3,
      mana: 50, cd: [18, 16, 14, 12], values: { delay: [3, 3.5, 4, 4.5] },
      text: L => `标记一个单位：记录其当前位置，${L.delay} 秒后强制回到标记点。再次施放可提前召回。对友军与敌军皆有效。`,
      recast: h => !!(h._xMark && h._xMark.u && !h._xMark.u.dead && getMod(h._xMark.u, 'kunk_x')),
      onRecast(c) { const h = c.caster, xm = h._xMark; if (!xm) return; kunkkaReturn(xm.u, h); h._xMark = null; },
      onCast(c, t) {
        const h = c.caster, delay = c.v('delay');
        removeModById(t, 'kunk_x');
        AB.addModifier(t, KUNK_X, h, { dur: delay + 0.05, data: { x: t.x, z: t.z } });
        h._xMark = { u: t, end: G.time + delay };
        AB.float(t, 'X', '#ffd54f', 22, 1.2); AB.burst(t.x, 1.5, t.z, 14, ['#ffd54f', '#fff59d'], 4, 0.4, 0.25, 2, 0);
        emit('xMarks', { unit: h.id, target: t.id });
        AB.delay(delay, () => { if (h._xMark && h._xMark.u === t) { kunkkaReturn(t, h); h._xMark = null; } });
      } },
    { id: 'ghost_ship', ai: { ultAoe: { radius: 6, min: 2 }, disable: true },
      scepter: { desc: '撞击伤害 +80，眩晕 +0.4 秒。', values: { dmg: [400, 500, 600], stun: [1.6, 1.8, 2.0] } },
      key: 'R', name: '幽灵船', icon: '船', color: '#0d47a1', ult: true, target: 'direction', castPoint: 0.3,
      mana: [125, 175, 225], cd: [80, 70, 60], values: { dmg: [300, 400, 500], stun: [1.2, 1.4, 1.6], len: 26, speed: 14, w0: 4, w1: 5, rumDur: 8 },
      text: L => `终极技能：召唤幽灵船沿直线航行 ${L.len} 码。撞击处对敌人造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒；航线内友军获得朗姆酒（移速提升）持续 ${L.rumDur} 秒。`,
      onCast(c, pt) {
        const h = c.caster, dir = AB.dir(h, pt), len = c.v('len'), sx = h.x, sz = h.z;
        const alliesHit = new Set(), endX = sx + dir.x * len, endZ = sz + dir.z * len;
        AB.lineWave({ caster: h, x: sx, z: sz, dir, len, speed: c.v('speed'), w0: c.v('w0'), w1: c.v('w1'),
          colors: ['#4fc3f7', '#0277bd', '#90caf9', '#e1f5fe'], onHit() {} });
        let trav = 0; const speed = c.v('speed'), rumDur = c.v('rumDur'), w1 = c.v('w1');
        effects.push({ update(dt) {
          trav = Math.min(len, trav + speed * dt);
          for (const a of units) {
            if (a.dead || a.team !== h.team || a.isBuilding || alliesHit.has(a)) continue;
            const rx = a.x - sx, rz = a.z - sz, p = rx * dir.x + rz * dir.z, lat = Math.abs(rx * dir.z - rz * dir.x);
            if (p >= 0 && p <= trav + 1 && lat <= w1 / 2 + a.radius) {
              alliesHit.add(a); AB.addModifier(a, KUNK_RUM, h, { dur: rumDur, props: { msPct: 0.15 } });
            }
          }
          if (trav < len) return false;
          for (const u of AB.enemiesIn(h, endX, endZ, w1 * 0.75)) {
            if (u.isBuilding) continue;
            AB.damage(h, u, c.v('dmg'), 'magic', 'ghost_ship'); AB.stun(u, h, c.v('stun'));
          }
          AB.ringP(endX, endZ, 0.8, 40, ['#0d47a1', '#4fc3f7', '#ffffff'], 0.6, 0.45, 0.7, 8);
          AB.burst(endX, 2, endZ, 40, ['#0277bd', '#ffd54f', '#e1f5fe'], 8, 0.8, 0.4, 4, 0);
          AB.float(h, '幽灵船！', '#4fc3f7', 20, 1.2); emit('ghostShip', { unit: h.id });
          return true;
        } });
      } },
  ],
});
