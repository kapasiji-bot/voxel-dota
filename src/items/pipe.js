// items/pipe.js — 洞察烟斗 Pipe of Insight: aura +10% magic resistance; active barrier absorbing 400 magic damage on allied
// heroes nearby for 12 s (modifier absorb: 'magic', combat/damage.js absorbMagic).
const PIPE_AURA = { id: 'pipe_aura', name: '洞察光环', color: '#4db6ac', props: { magicRes: 0.1 } };
const PIPE_BARRIER = { id: 'pipe_barrier', name: '法术护盾', color: '#26a69a', absorb: 'magic',
  fx(u, m) { if (Math.random() < 0.35) { const a = Math.random() * Math.PI * 2; spawnP(u.x + Math.cos(a) * 1.1, rnd(0.3, 2.8), u.z + Math.sin(a) * 1.1, 0, 0.3, 0, 0.4, 0.2, '#80cbc4'); } } };
const PIPE_R = 12;
registerItem({ id: 'pipe', order: 47, name: '洞察烟斗', en: 'Pipe of Insight', icon: '斗', color: '#00897b', cost: 3475, parts: ['cloak', 'headdress', 'ring'],
  props: { hpRegen: 6, magicRes: 0.3, armor: 2 },
  desc: `抗魔斗篷 + 头巾 + 守护指环 + 2075。+6 生命恢复，+30% 魔法抗性，+2 护甲。光环（${PIPE_R} 码）：友方 +10% 魔法抗性。主动·法术护盾：为 ${PIPE_R} 码内的友方英雄提供吸收 400 点魔法伤害的护盾，持续 12 秒。消耗 100 魔法，冷却 60 秒。`,
  tick(c) { const h = c.caster; for (const u of units) if (!u.dead && u !== h && u.team === h.team && !u.isWard && !u.isBuilding && dst(u, h) < PIPE_R) AB.addModifier(u, PIPE_AURA, h, { dur: 0.75 }); },
  active: { target: 'none', cd: 60, mana: 100, onUse(c) {
    const h = c.caster; let n = 0;
    for (const u of G.heroes) if (!u.dead && u.team === h.team && dst(u, h) < PIPE_R) { AB.addModifier(u, PIPE_BARRIER, h, { dur: 12, data: { left: 400 } }); n++; AB.burst(u.x, 1.5, u.z, 10, ['#80cbc4', '#e0f2f1'], 3, 0.6, 0.22, 2, 0); }
    AB.ringP(h.x, h.z, 0.8, 40, ['#26a69a', '#80cbc4', '#ffffff'], 0.5, 0.4, 1.2, (PIPE_R - 0.8) / 0.5);
    emit('pipe', { unit: h.id, n });
  } } });
