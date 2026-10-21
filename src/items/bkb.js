// items/bkb.js — 黑皇杖: +10 str +24 dmg; active magic immunity (purges debuffs, blocks magic dmg/stuns/slows) + 25% less damage (prototype tweak).
const BKB_MOD = { id: 'bkb', name: '魔法免疫', color: '#f9a825', states: ['magicImmune'], props: { dmgTakenPct: -25 },
  onApply(u) { purgeDebuffs(u); },
  fx(u) { if (Math.random() < 0.5) spawnP(u.x + rnd(-0.8, 0.8), rnd(0, 3), u.z + rnd(-0.8, 0.8), 0, rnd(1, 2), 0, 0.5, 0.18, '#ffd54f'); } };
registerItem({ id: 'bkb', order: 3, name: '黑皇杖', icon: '黑', color: '#263238', cost: 4050, parts: ['ogre'], props: { str: 10, dmg: 24 },
  desc: '食人魔之斧 + 3050。+10 力量，+24 攻击力。主动·天神下凡：9 秒魔法免疫（免疫魔法伤害与眩晕/减速），原型中额外减少 25% 所受伤害。冷却 70 秒。',
  active: { target: 'none', cd: 70, onUse(c) {
    AB.addModifier(c.caster, BKB_MOD, c.caster, { dur: 9 });
    AB.burst(c.caster.x, 2, c.caster.z, 40, ['#ffd54f', '#ffecb3', '#ffffff'], 5, 0.8, 0.3, 4, 0); AB.float(c.caster, '天神下凡！', '#ffd54f', 18, 1.2);
  } } });
