// items/lotus.js — B12 洛萨之锋 Lotus Orb. Active Echo Shell: briefly gives the ally the `reflect` state (Counterspell path
// in abilities/cast.js), so the next unit-target spell is bounced back at its caster.
const LOTUS_SHELL = { id: 'lotus', name: '回音护盾', color: '#26c6da', states: ['reflect'],
  fx(u) { if (Math.random() < 0.3) spawnP(u.x + rnd(-0.6, 0.6), rnd(0.4, 2.2), u.z + rnd(-0.6, 0.6), 0, 0.8, 0, 0.5, 0.15, '#80deea'); } };
registerItem({ id: 'lotus', order: 55, name: '洛萨之锋', en: 'Lotus Orb', icon: '莲', color: '#00acc1', cost: 3850,
  parts: ['platemail', 'staff', 'ring'], unique: true, props: { armor: 10, int: 10, hpRegen: 4, manaRegen: 1.5 },
  desc: '板甲 + 魔力法杖 + 守护指环 + 1275。+10 护甲，+10 智力，+4 生命恢复，+1.5 魔法恢复。主动·回音护盾：使 18 码内一名友方英雄（含自己，连按两次）在 6 秒内反射下一次敌方单体指向性技能。消耗 75 魔法，冷却 15 秒。',
  active: { target: 'unit', targetTeam: 'ally', heroOnly: true, range: 18, cd: 15, mana: 75, onUse(c, t) {
    AB.addModifier(t, LOTUS_SHELL, c.caster, { dur: 6 });
    AB.burst(t.x, 1.5, t.z, 16, ['#26c6da', '#e0f7fa', '#ffffff'], 3, 0.55, 0.22, 2, 0);
    emit('lotus', { unit: c.caster.id, target: t.id });
  } } });
