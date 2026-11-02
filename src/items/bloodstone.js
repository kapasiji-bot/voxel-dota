// items/bloodstone.js — B12 血精石 Bloodstone. Charges from hero kills / assists; mana regen scales with charges.
// Active Bloodpact: spend all charges to heal (charge × 30) and gain brief magic resistance.
const BS_CAP = 20;
function bsCharges(it) { return it.charges || 0; }
function bsAddCharge(h, n = 1) {
  const it = h.items && h.items.find(i => i && i.id === 'bloodstone'); if (!it) return;
  it.charges = Math.min(BS_CAP, (it.charges || 0) + n);
}
Events.on('heroKill', e => {
  const kh = unitById(e.killer); if (kh && kh.isHero) bsAddCharge(kh, 1);
  for (const id of e.assists || []) { const a = unitById(id); if (a) bsAddCharge(a, 1); }
});
registerItem({ id: 'bloodstone', order: 56, name: '血精石', en: 'Bloodstone', icon: '血', color: '#ad1457', cost: 4400,
  parts: ['point_booster', 'vitality', 'staff'], unique: true, props: { hp: 425, mana: 425 },
  desc: `精气之球 + 活力之球 + 魔力法杖 + 950。+425 生命值，+425 魔法值。被动·充能：击杀或助攻击杀敌方英雄获得 1 层充能（最多 ${BS_CAP}），每层 +0.3 魔法恢复。主动·血契：消耗全部充能，恢复 充能×30 生命并获得 40% 魔法抗性 6 秒。冷却 30 秒。`,
  tick(c) {
    const n = bsCharges(c.item); if (n > 0) c.caster.mana = Math.min(c.caster.maxMana, c.caster.mana + n * 0.3 * 0.5);
  },
  active: { target: 'none', cd: 30, onUse(c) {
    const it = c.item, n = bsCharges(it); it.charges = 0;
    const heal = n * 30; c.caster.hp = Math.min(c.caster.maxHp, c.caster.hp + heal);
    if (heal) AB.float(c.caster, '+' + heal, '#f48fb1', 16, 1);
    AB.addModifier(c.caster, { id: 'bloodpact', name: '血契', color: '#ad1457', props: { magicRes: 0.4 } }, c.caster, { dur: 6 });
    AB.burst(c.caster.x, 1.4, c.caster.z, 20, ['#f48fb1', '#ad1457', '#ffffff'], 4, 0.6, 0.25, 3, 0);
    emit('bloodstone', { unit: c.caster.id, charges: n, heal });
  } } });
