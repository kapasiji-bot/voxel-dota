// items/linken.js — B12 林肯法球 Linken's Sphere. Blocks one enemy unit-target spell (or unit-target item) every LINK_CD s.
// trySpellBlock is called from abilities/cast.js and entities/inventory.js before the effect lands.
const LINK_CD = 13;
function linkenSlot(u) {
  if (!u || !u.items) return -1;
  for (let i = 0; i < u.items.length; i++) { const it = u.items[i]; if (it && it.id === 'linken' && it.cd <= 0) return i; }
  return -1;
}
// returns true if the targeted unit blocked the effect (caller must skip onCast / onUse)
function trySpellBlock(tgt, caster, name) {
  if (!tgt || tgt.dead || tgt.team === caster.team) return false;
  const i = linkenSlot(tgt); if (i < 0) return false;
  tgt.items[i].cd = LINK_CD;
  AB.ringP(tgt.x, tgt.z, 1.5, 20, ['#4fc3f7', '#e1f5fe', '#0277bd'], 0.4, 0.3, 1.6);
  AB.float(tgt, '格挡！', '#4fc3f7', 18, 1);
  emit('linkenBlock', { unit: tgt.id, caster: caster.id, ability: name || '' });
  return true;
}
registerItem({ id: 'linken', order: 54, name: '林肯法球', en: "Linken's Sphere", icon: '林', color: '#0288d1', cost: 4600,
  parts: ['ultimate_orb', 'headdress', 'ring'], unique: true, props: { str: 14, agi: 14, int: 14, hpRegen: 5, manaRegen: 2 },
  desc: `极限法球 + 头巾 + 守护指环 + 1200。+14 全属性，+5 生命恢复，+2 魔法恢复。被动·法术阻挡：阻挡一次敌方单体指向性技能或物品（冷却 ${LINK_CD} 秒）。` });
