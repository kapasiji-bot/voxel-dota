// heroes/sf.js — 影魔 Shadow Fiend (ranged agility). Three Shadowrazes (Q/W/E near/mid/far), Necromastery (soul stacks
// on kill → bonus damage via passiveProps; lose half on death), Presence of the Dark Lord (enemy armor aura on Q),
// Requiem of Souls (R: ring damage + slow scales with soul count).
const SF_PRESENCE = { id: 'sf_presence', tag: '威压', color: '#6a1b9a', debuff: true };
const SF_REQ_SLOW = { id: 'sf_req_slow', tag: '挽歌', color: '#ce93d8', debuff: true };
const SF_SOUL_MAX = h => 18 + Math.floor((h.level || 1) * 0.5);
function sfAddSoul(h, n) {
  if (!h || !h.def || h.def.id !== 'sf' || h.dead || h.isIllusion) return;
  h.souls = Math.min(SF_SOUL_MAX(h), (h.souls || 0) + n); refreshHero(h);
  emit('sfSoul', { unit: h.id, souls: h.souls, add: n });
}
Events.on('death', e => {
  const vic = unitById(e.unit), kh = ownerOf(e.killer && unitById(e.killer));
  if (kh && kh.def && kh.def.id === 'sf') sfAddSoul(kh, 1);
  if (vic && vic.def && vic.def.id === 'sf' && !vic.isIllusion) { vic.souls = Math.floor((vic.souls || 0) / 2); refreshHero(vic); emit('sfSoulLost', { unit: vic.id, souls: vic.souls }); }
});
function makeRaze(id, key, name, icon, color, dist, extra) {
  return Object.assign({
    id, key, name, icon, color, target: 'none', castPoint: 0.5, mana: [75, 80, 85, 90], cd: 6,
    values: Object.assign({ dmg: [90, 160, 230, 300], radius: 3.5, dist }, (extra && extra.values) || {}),
    text: L => `在身前 ${L.dist} 码处释放影压，对半径 ${L.radius} 码内敌人造成 ${L.dmg} 点魔法伤害（叠加灵魂攻击加成）。`,
    onCast(c) {
      const h = c.caster, d = c.v('dist'), x = h.x + Math.sin(h.facing) * d, z = h.z + Math.cos(h.facing) * d, bonus = (h.souls || 0) * 2;
      AB.ringP(x, z, c.v('radius'), 36, ['#6a1b9a'], 0.4, 0.2, 0.15);
      delay(0.35, () => {
        for (const u of AB.enemiesIn(h, x, z, c.v('radius'))) AB.damage(h, u, c.v('dmg') + bonus, 'magic', id);
        AB.ringP(x, z, 0.4, 28, ['#7b1fa2', '#ce93d8', '#212121'], 0.45, 0.35, 0.5, c.v('radius') / 0.45);
        AB.burst(x, 1.2, z, 22, ['#4a148c', '#ce93d8', '#ffffff'], 5, 0.5, 0.3, 3, 0);
      });
    },
  }, extra || {});
}
registerHero({
  id: 'sf', order: 23, name: '影魔', title: '从未出生的一生', type: '远程 · 敏捷', color: '#4a148c', nameColor: '#ce93d8',
  desc: '远程敏捷型核心。三段影压点杀，杀戮积攒灵魂提升攻击，威压削弱周围护甲，魂之挽歌释放灵魂造成环形爆发。',
  ai: { role: 'carry', aggr: 1.2, skills: [0, 1, 2, 0, 1, 3, 2, 0, 1, 2, 3, 0, 1, 2, 3], build: ['phase', 'desolator', 'bkb', 'daedalus', 'satanic'],
    combos: [{ id: 'sf_razes', steps: [{ slot: 0 }, { slot: 1 }, { slot: 2 }], min: 1, radius: 6 }] },
  stats: { primary: 'agi', str: 19, strG: 2.5, agi: 25, agiG: 3.3, int: 18, intG: 2.0, dmg: 22, armor: 0, bat: 1.7, range: 10,
    atkPoint: 0.5, backswing: 0.5, speed: 7.2, proj: 22, projColor: '#ce93d8', hpRegen: 0.8, manaRegen: 0.7, radius: 0.6, height: 3.1 },
  portrait: { headY: 2.55 },
  model: () => humanoid({ pants: '#212121', boots: '#111', skin: '#311b92', sleeve: '#4a148c', hip: 0.22, sh: 0.58, legH: 1.05, bodyH: 1.0, legW: 0.32,
    body: [[0, 0.48, 0, 0.78, 1.0, 0.48, '#4a148c'], [0, 0.9, 0.05, 0.9, 0.2, 0.55, '#212121'], [0, 1.4, 0, 0.72, 0.72, 0.72, '#311b92'],
      [-0.2, 1.55, 0.3, 0.2, 0.14, 0.08, '#ce93d8'], [0.2, 1.55, 0.3, 0.2, 0.14, 0.08, '#ce93d8'], [0, 1.85, -0.1, 0.9, 0.4, 0.9, '#1a237e'],
      [-0.55, 1.9, 0, 0.25, 0.7, 0.2, '#6a1b9a'], [0.55, 1.9, 0, 0.25, 0.7, 0.2, '#6a1b9a'], [0, 1.0, -0.4, 0.85, 1.3, 0.15, '#212121']],
    bodyGlow: [[-0.18, 1.48, 0.38, 0.14, 0.1, 0.02, '#e040fb'], [0.18, 1.48, 0.38, 0.14, 0.1, 0.02, '#e040fb']],
    armR: [[0, -0.4, 0, 0.32, 0.85, 0.34, '#4a148c'], [0, -0.82, 0, 0.34, 0.2, 0.36, '#311b92']],
    armL: [[0, -0.4, 0, 0.32, 0.85, 0.34, '#4a148c'], [0, -0.82, 0, 0.34, 0.2, 0.36, '#311b92']] }),
  abilities: [
    makeRaze('raze_near', 'Q', '影压·近', '近', '#7b1fa2', 2.5, {
      shard: { desc: '近距影压伤害 +40。', values: { dmg: [130, 200, 270, 340] } },
      values: { dmg: [90, 160, 230, 300], radius: 3.5, dist: 2.5, armor: [2, 3, 4, 5] },
      aura: { radius: 12, enemies: true, mod: SF_PRESENCE, props: c => ({ armor: -c.v('armor') }) },
      passiveProps: c => ({ dmg: (c.caster.souls || 0) * 2 }),
      text: L => `在身前 ${L.dist} 码处释放影压（半径 ${L.radius}），造成 ${L.dmg} 点魔法伤害。学习后获得魔王降临：降低附近敌人 ${L.armor} 点护甲。击杀叠加灵魂提升攻击，死亡失去一半灵魂。`,
    }),
    makeRaze('raze_mid', 'W', '影压·中', '中', '#8e24aa', 5.5),
    makeRaze('raze_far', 'E', '影压·远', '远', '#9c27b0', 8.5),
    { id: 'requiem', scepter: { desc: '挽歌每魂伤害提升，冷却降至 80/70/60 秒。', cd: [80, 70, 60], values: { per: [50, 65, 80] } },
      key: 'R', name: '魂之挽歌', icon: '挽', color: '#311b92', ult: true, target: 'none', castPoint: 1.0,
      mana: [150, 200, 250], cd: [120, 110, 100], values: { per: [40, 55, 70], slow: 0.25, dur: 1.5, radius: 14 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：释放灵魂冲击波，对周围 ${L.radius} 码敌人造成 灵魂数×${L.per} 点魔法伤害并减速 ${L.slow}，持续 ${L.dur} 秒（不消耗灵魂）。`,
      ai: { ultAoe: { radius: 'radius', min: 2 } },
      onCast(c) {
        const h = c.caster, n = h.souls || 0, dmg = Math.max(c.v('per'), n * c.v('per')), r = c.v('radius');
        for (const u of AB.enemiesIn(h, h.x, h.z, r)) {
          AB.damage(h, u, dmg, 'magic', 'requiem');
          AB.addModifier(u, SF_REQ_SLOW, h, { dur: c.v('dur'), props: { msPct: -c.v('slow') } });
        }
        AB.ringP(h.x, h.z, 1, 48, ['#ce93d8', '#4a148c', '#ffffff', '#212121'], 0.8, 0.5, 1.5, r / 0.8);
        AB.burst(h.x, 2, h.z, 50, ['#7b1fa2', '#ce93d8', '#ffffff'], 8, 0.9, 0.4, 6, 0);
        AB.float(h, `挽歌·${n}魂`, '#ce93d8', 20, 1.3); emit('requiem', { unit: h.id, souls: n, dmg });
      } },
  ],
});
