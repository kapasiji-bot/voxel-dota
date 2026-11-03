// items/bloodthorn.js — 血棘 Bloodthorn: Orchid upgrade. Stronger Soul Burn + attacks vs the silenced target always crit.
const BLOODTHORN_BURN = { id: 'bloodthorn', name: '血棘沉默', color: '#c62828', debuff: true, states: ['silenced'],
  props: { dmgTakenPct: 30 },
  onApply(u, m) { cancelCasting(u); interruptChannel(u, 'silence'); m.data.taken = 0; },
  onRemove(u, m) {
    const pop = (m.data.taken || 0) * 0.3;
    if (pop > 0 && m.src && !u.dead) {
      dealDamage(m.src, u, pop, 'magic', { ability: 'bloodthorn' });
      AB.burst(u.x, 1.5, u.z, 20, ['#ef5350', '#c62828', '#ffffff'], 5, 0.5, 0.25, 2.5, 0);
      AB.float(u, Math.round(pop), '#ef5350', 17, 1);
    }
  },
  fx(u) { if (Math.random() < 0.4) spawnP(u.x + rnd(-0.55, 0.55), rnd(0.7, 2.5), u.z + rnd(-0.55, 0.55), 0, 1, 0, 0.45, 0.16, '#ef5350'); } };
registerItem({ id: 'bloodthorn', order: 73, name: '血棘', en: 'Bloodthorn', icon: '棘', color: '#b71c1c', cost: 6800,
  parts: ['orchid'], unique: true, props: { int: 25, as: 40, dmg: 30, manaRegen: 2.5 },
  desc: '紫怨 + 3325。+25 智力，+40 攻击速度，+30 攻击力，+2.5 魔法恢复。主动·灵魂燃烧：沉默并增伤 5 秒（同紫怨），结束时结算 30% 所受伤害。被动：攻击处于血棘沉默中的目标必定暴击（175%）。消耗 125 魔法，冷却 15 秒。',
  modifyAttack(c, t, info) {
    if (t && getMod(t, 'bloodthorn')) applyCrit(info, 1.75);
  },
  active: { target: 'unit', range: 12, cd: 15, mana: 125, onUse(c, t) {
    removeModById(t, 'orchid');
    AB.addModifier(t, BLOODTHORN_BURN, c.caster, { dur: 5 });
    AB.burst(t.x, 1.5, t.z, 22, ['#ef5350', '#ffcdd2', '#ffffff'], 6, 0.55, 0.28, 2.5, 0);
    emit('bloodthorn', { unit: c.caster.id, target: t.id });
  } } });
