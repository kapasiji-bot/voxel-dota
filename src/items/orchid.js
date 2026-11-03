// items/orchid.js — 紫怨 Orchid Malevolence: silence + Soul Burn (amp + end pop = 30% of damage taken while silenced).
const ORCHID_BURN = { id: 'orchid', name: '灵魂燃烧', color: '#ab47bc', debuff: true, states: ['silenced'],
  props: { dmgTakenPct: 30 },
  onApply(u, m) { cancelCasting(u); interruptChannel(u, 'silence'); m.data.taken = 0; },
  onRemove(u, m) {
    const pop = (m.data.taken || 0) * 0.3;
    if (pop > 0 && m.src && !u.dead) {
      dealDamage(m.src, u, pop, 'magic', { ability: 'orchid' });
      AB.burst(u.x, 1.4, u.z, 16, ['#ce93d8', '#ab47bc', '#ffffff'], 4, 0.45, 0.22, 2, 0);
      AB.float(u, Math.round(pop), '#ce93d8', 16, 1);
    }
  },
  fx(u) { if (Math.random() < 0.35) spawnP(u.x + rnd(-0.5, 0.5), rnd(0.8, 2.4), u.z + rnd(-0.5, 0.5), 0, 0.8, 0, 0.4, 0.15, '#ce93d8'); } };
Events.on('damage', e => {
  if (e.amount <= 0) return;
  const t = unitById(e.tgt); if (!t) return;
  const m = getMod(t, 'orchid') || getMod(t, 'bloodthorn');
  if (m) m.data.taken = (m.data.taken || 0) + e.amount;
});
registerItem({ id: 'orchid', order: 72, name: '紫怨', en: 'Orchid Malevolence', icon: '怨', color: '#6a1b9a', cost: 3475,
  parts: ['staff', 'gloves', 'robe'], unique: true, props: { int: 20, as: 30, dmg: 20, manaRegen: 2.5 },
  desc: '魔力法杖 + 加速手套 + 法师长袍 + 1575。+20 智力，+30 攻击速度，+20 攻击力，+2.5 魔法恢复。主动·灵魂燃烧：沉默 12 码内一名敌人 5 秒，期间其受到伤害 +30%；结束时额外造成期间所受伤害 30% 的魔法伤害。消耗 100 魔法，冷却 18 秒。',
  active: { target: 'unit', range: 12, cd: 18, mana: 100, onUse(c, t) {
    AB.addModifier(t, ORCHID_BURN, c.caster, { dur: 5 });
    AB.burst(t.x, 1.5, t.z, 18, ['#ab47bc', '#ce93d8', '#ffffff'], 5, 0.5, 0.25, 2, 0);
    emit('orchid', { unit: c.caster.id, target: t.id });
  } } });
