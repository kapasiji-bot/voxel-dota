// items/dagon.js — 达贡之神力 Dagon 1-5. Each level is its own item whose recipe is the previous level (+1250 gold), so buying
// "Dagon 3" with a Dagon 1 in the bag consumes it and charges the difference twice over (entities/inventory.js recipes).
// Active: magic burst on one enemy unit (beam + flash); range grows per level. Mana cost per level.
const DAGON_DMG = [400, 500, 600, 700, 800], DAGON_CD = [35, 30, 25, 20, 15], DAGON_MANA = [120, 140, 160, 180, 200], DAGON_RANGE = [14, 15, 16, 17, 18];
for (let L = 1; L <= 5; L++) {
  const i = L - 1, id = L === 1 ? 'dagon' : 'dagon' + L;
  registerItem({ id, order: 60 + L, name: L === 1 ? '达贡之神力' : `达贡之神力 ${L}`, en: 'Dagon ' + L, icon: '达', color: ['#e65100', '#ef6c00', '#f57c00', '#fb8c00', '#ffa000'][i],
    cost: 2750 + 1250 * i, parts: L === 1 ? ['staff', 'circlet', 'robe'] : [L === 2 ? 'dagon' : 'dagon' + (L - 1)], level: L, unique: true,
    props: { str: 3, agi: 3, int: 15 + 3 * i },
    desc: `${L === 1 ? '魔力法杖 + 圆环 + 法师长袍 + 1145' : `达贡之神力${L === 2 ? '' : ' ' + (L - 1)} + 1250（升级）`}。+3 力量/敏捷，+${15 + 3 * i} 智力。主动·能量冲击：对 ${DAGON_RANGE[i]} 码内一名敌方单位造成 ${DAGON_DMG[i]} 点魔法伤害。消耗 ${DAGON_MANA[i]} 魔法，冷却 ${DAGON_CD[i]} 秒。可用配方升级至 5 级。`,
    active: { target: 'unit', range: DAGON_RANGE[i], cd: DAGON_CD[i], mana: DAGON_MANA[i], onUse(c, t) {
      const h = c.caster;
      AB.beam(h.x, h.height * 0.7, h.z, t.x, t.height * 0.6, t.z, '#ff6d00', 0.35 + 0.08 * L, 0.35);
      AB.beam(h.x, h.height * 0.7, h.z, t.x, t.height * 0.6, t.z, '#ffe082', 0.12 + 0.03 * L, 0.3);
      AB.burst(t.x, t.height * 0.6, t.z, 18 + 4 * L, ['#ff6d00', '#ffab40', '#fff3e0'], 5, 0.5, 0.25, 2, 0);
      const d = AB.damage(h, t, DAGON_DMG[i], 'magic', id, { big: true });
      emit('dagon', { unit: h.id, target: t.id, level: L, dmg: Math.round(d) });
    } } });
}
