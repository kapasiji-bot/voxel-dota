// items/desolator.js — B12 黯灭 Desolator: attack damage + armor corruption debuff on hit (buildings included).
const DESO_MOD = { id: 'deso', name: '腐蚀', color: '#ef6c00', debuff: true, props: { armor: -6 },
  fx(u) { if (Math.random() < 0.2) spawnP(u.x + rnd(-0.5, 0.5), rnd(0.4, 1.8), u.z + rnd(-0.5, 0.5), 0, 0.5, 0, 0.4, 0.12, '#ff9800'); } };
registerItem({ id: 'desolator', order: 52, name: '黯灭', en: 'Desolator', icon: '黯', color: '#e65100', cost: 3500,
  parts: ['claymore', 'claymore'], unique: true, props: { dmg: 50 },
  desc: '大剑 ×2 + 800。+50 攻击力。被动·腐蚀：攻击降低目标 6 点护甲，持续 7 秒（对建筑也生效）。',
  onAttackLand(c, t) {
    if (t.dead || t.isWard) return;
    AB.addModifier(t, DESO_MOD, c.caster, { dur: 7 });
  } });
