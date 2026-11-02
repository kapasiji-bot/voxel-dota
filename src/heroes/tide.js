// heroes/tide.js — 潮汐猎人 Tidehunter (melee strength). Gush (projectile slow+armor), Kraken Shell (block+purge),
// Anchor Smash (AoE dmg + attack reduction), Ravage (large AoE stun/knockup).
const TIDE_GUSH = { id: 'tide_gush', tag: '巨浪', color: '#4fc3f7', debuff: true };
const TIDE_ANCHOR = { id: 'tide_anchor', tag: '锚击', color: '#0277bd', debuff: true };
Events.on('damage', e => {
  const u = unitById(e.tgt); if (!u || u.dead || !u.isHero || u.isIllusion || !u.def || u.def.id !== 'tide') return;
  const ab = u.abilities && u.abilities.find(a => a.def.id === 'kraken_shell' && a.lvl > 0); if (!ab) return;
  if ((u._krakenCd || 0) > G.time) return;
  u._krakenDmg = (u._krakenDmg || 0) + (e.amount || 0);
  const thr = lvVal(ab.def, 'threshold', ab.lvl);
  if (u._krakenDmg < thr) return;
  u._krakenDmg = 0; u._krakenCd = G.time + lvVal(ab.def, 'pcd', ab.lvl);
  purgeDebuffs(u);
  AB.burst(u.x, 1.5, u.z, 18, ['#4fc3f7', '#0277bd', '#ffffff'], 5, 0.5, 0.25, 2, 0);
  emit('krakenPurge', { unit: u.id });
});
registerHero({
  id: 'tide', order: 26, name: '潮汐猎人', title: '利维坦', type: '近战 · 力量', color: '#01579b', nameColor: '#4fc3f7',
  desc: '近战力量型先手。巨浪减速破甲，海妖外壳格挡并净化强控，锚击削弱周围攻击，毁灭掀起大范围眩晕巨浪。',
  ai: { role: 'tank', aggr: 1.0, skills: [0, 2, 1, 0, 0, 3, 0, 2, 2, 2, 3, 1, 1, 1, 3], build: ['phase', 'blink', 'vanguard', 'pipe', 'heart'],
    combos: [{ id: 'tide_ravage', steps: ['blink', { slot: 3 }, { slot: 0 }], min: 2, radius: 8 }] },
  stats: { primary: 'str', str: 27, strG: 3.5, agi: 15, agiG: 1.5, int: 18, intG: 1.7, dmg: 28, armor: 1, bat: 1.7, range: 2.6,
    atkPoint: 0.6, backswing: 0.5, speed: 6.8, proj: 0, hpRegen: 1.5, manaRegen: 0.6, radius: 0.8, height: 3.4 },
  portrait: { headY: 2.85 },
  model: () => humanoid({ pants: '#004d40', boots: '#263238', skin: '#26a69a', sleeve: '#00838f', hip: 0.32, sh: 0.85, legH: 1.1, bodyH: 1.2, legW: 0.48,
    body: [[0, 0.55, 0, 1.25, 1.2, 0.85, '#00838f'], [0, 0.6, 0.44, 0.7, 0.55, 0.04, '#4fc3f7'], [0, 0.1, 0, 1.3, 0.3, 0.9, '#00695c'],
      [0, 1.65, 0, 0.9, 0.85, 0.9, '#26a69a'], [-0.35, 1.85, 0.35, 0.2, 0.15, 0.15, '#004d40'], [0.35, 1.85, 0.35, 0.2, 0.15, 0.15, '#004d40'],
      [0, 2.15, 0, 1.0, 0.35, 1.0, '#01579b'], [-0.55, 2.0, 0.1, 0.35, 0.2, 0.5, '#4fc3f7'], [0.55, 2.0, 0.1, 0.35, 0.2, 0.5, '#4fc3f7'],
      [0, 1.1, -0.5, 1.1, 1.4, 0.15, '#006064']],
    armR: [[0, -0.45, 0, 0.42, 0.95, 0.48, '#00838f'], [0, -0.9, 0, 0.44, 0.28, 0.5, '#26a69a'],
      [0, -1.0, 0.4, 0.16, 0.16, 1.0, '#455a64'], [0, -1.0, 1.6, 0.55, 0.55, 0.7, '#607d8b'], [0, -1.0, 2.1, 0.25, 0.9, 0.25, '#90a4ae']],
    armL: [[0, -0.45, 0, 0.42, 0.95, 0.48, '#00838f'], [0, -0.9, 0, 0.44, 0.28, 0.5, '#26a69a']] }),
  abilities: [
    { id: 'gush', ai: { disable: true }, shard: { desc: '巨浪伤害 +40，护甲降低 +1。', values: { dmg: [150, 220, 290, 360], armor: [4, 5, 6, 7] } },
      key: 'Q', name: '巨浪', icon: '浪', color: '#29b6f6', target: 'unit', range: 12, castPoint: 0.3,
      mana: [100, 110, 120, 130], cd: [12, 11, 10, 9], values: { dmg: [110, 160, 210, 260], slow: 0.4, armor: [3, 4, 5, 6], dur: 4 },
      fmt: { slow: v => Math.round(v * 100) + '%' },
      text: L => `发射潮汐波浪，造成 ${L.dmg} 点魔法伤害，减速 ${L.slow} 并降低 ${L.armor} 点护甲，持续 ${L.dur} 秒。`,
      onCast(c, t) { const h = c.caster;
        AB.projectile({ src: h, target: t, speed: 22, color: '#4fc3f7', size: 0.75, trail: '#b3e5fc', onHit(u) {
          AB.damage(h, u, c.v('dmg'), 'magic', 'gush');
          AB.addModifier(u, TIDE_GUSH, h, { dur: c.v('dur'), props: { msPct: -c.v('slow'), armor: -c.v('armor') } });
          AB.burst(u.x, 1.3, u.z, 16, ['#4fc3f7', '#0277bd', '#e1f5fe'], 5, 0.5, 0.25, 2, 0);
        } }); } },
    { id: 'kraken_shell', key: 'W', name: '海妖外壳', icon: '壳', color: '#006064', passive: true,
      values: { block: [12, 24, 36, 48], threshold: [600, 550, 500, 450], pcd: 10 },
      text: L => `被动：格挡 ${L.block} 点攻击伤害。累计受到 ${L.threshold} 点伤害后清除自身负面状态（冷却 ${L.pcd} 秒）。`,
      passiveProps: c => ({ block: c.v('block') }) },
    { id: 'anchor_smash', key: 'E', name: '锚击', icon: '锚', color: '#0277bd', target: 'none', castPoint: 0.4,
      mana: [40, 50, 60, 70], cd: [7, 6.5, 6, 5.5], values: { radius: 5, dmg: [50, 100, 150, 200], red: [0.3, 0.4, 0.5, 0.6], dur: 6 },
      fmt: { red: v => Math.round(v * 100) + '%' },
      text: L => `挥动船锚，对周围 ${L.radius} 码敌人造成 ${L.dmg} + 攻击力的物理伤害，并使其攻击力降低 ${L.red}，持续 ${L.dur} 秒。`,
      ai: { selfAoe: true },
      onCast(c) { const h = c.caster, dmg = c.v('dmg') + h.dmgBase;
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) {
          if (u.isBuilding) continue;
          AB.damage(h, u, dmg, 'phys', 'anchor_smash');
          AB.addModifier(u, TIDE_ANCHOR, h, { dur: c.v('dur'), props: { dmgPct: -c.v('red') } });
        }
        AB.ringP(h.x, h.z, 0.6, 32, ['#0277bd', '#4fc3f7', '#ffffff'], 0.45, 0.35, 0.5, c.v('radius') / 0.45);
        emit('anchorSmash', { unit: h.id }); } },
    { id: 'ravage', ai: { ultAoe: { radius: 'radius', min: 2 }, disable: true }, scepter: { desc: '眩晕 +0.5 秒，伤害 +80。', values: { stun: [2.5, 2.9, 3.3], dmg: [280, 360, 440] } },
      key: 'R', name: '毁灭', icon: '灭', color: '#01579b', ult: true, target: 'none', castPoint: 0.3,
      mana: [150, 225, 300], cd: [130, 120, 110], values: { radius: 14, dmg: [200, 280, 360], stun: [2.0, 2.4, 2.8] },
      text: L => `终极技能：掀起毁灭浪潮，对 ${L.radius} 码内敌人造成 ${L.dmg} 点魔法伤害并击飞眩晕 ${L.stun} 秒。`,
      onCast(c) { const h = c.caster, R = c.v('radius');
        for (const u of AB.enemiesIn(h, h.x, h.z, R)) {
          if (u.isBuilding) continue;
          AB.damage(h, u, c.v('dmg'), 'magic', 'ravage');
          AB.knockup(u, h, Math.min(1.2, c.v('stun') * 0.45), 2.4);
          AB.stun(u, h, c.v('stun'));
        }
        for (let i = 1; i <= 3; i++) AB.ringP(h.x, h.z, 0.8, 40, ['#01579b', '#4fc3f7', '#e1f5fe'], 0.2 * i, 0.4, 0.4, R / (0.2 * i));
        AB.float(h, '毁灭！', '#4fc3f7', 20, 1.2); emit('ravage', { unit: h.id }); } },
  ],
});
