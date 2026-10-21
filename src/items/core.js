// items/core.js — core items with recipes (def.parts: components consumed on purchase, price reduced by what you own; see
// entities/inventory.js). def.uniqueGroup: only one item of the group gives stats (boots). def.tick(ctx, dt): passive every 0.5 s
// (auras); def.onAttackLand(ctx, target, dealt): attack passive (cleave). Illusions never get item passives/actives.
const PHASE_MOD = { id: 'phase', name: '相位移动', color: '#ff7043', props: { msPct: 0.22 } };
const SHADOW_MOD = { id: 'shadow_invis', name: '暗影步', color: '#455a64', invis: true, props: { msPct: 0.1 },
  onBreak(u, m, why, t) { if (why === 'attack' && t) AB.addModifier(u, { id: 'shadow_crit', name: '暗影偷袭', color: '#455a64', props: { dmg: 150 } }, u, { dur: 0.6 }); } };
const VEIL_MOD = { id: 'veil', name: '纷争', color: '#7b1fa2', debuff: true, props: { magicRes: -0.25 } };
const ASSAULT_AURA = { id: 'assault_aura', name: '强袭光环', color: '#ffb300', props: { as: 15, armor: 4 } };
const ASSAULT_CURSE = { id: 'assault_curse', name: '强袭光环（敌）', color: '#bf360c', debuff: true, props: { armor: -4 } };
registerItem({ id: 'phase', order: 20, name: '相位鞋', icon: '相', color: '#e64a19', cost: 1150, parts: ['boots'], unique: true, uniqueGroup: 'boots',
  props: { ms: 1.8, dmg: 18, armor: 2 }, desc: '速度之靴 + 650。+1.8 移动速度，+18 攻击力，+2 护甲。主动·相位：3 秒内移动速度 +22%。冷却 8 秒。',
  active: { target: 'none', cd: 8, keepInvis: true, onUse(c) { AB.addModifier(c.caster, PHASE_MOD, c.caster, { dur: 3 }); AB.burst(c.caster.x, 0.6, c.caster.z, 10, ['#ff7043', '#ffab91'], 2, 0.5, 0.2, 2, 0); } } });
registerItem({ id: 'arcane', order: 21, name: '法力靴', icon: '法', color: '#1976d2', cost: 1100, parts: ['boots'], unique: true, uniqueGroup: 'boots',
  props: { ms: 1.5, int: 8 }, desc: '速度之靴 + 600。+1.5 移动速度，+8 智力。主动·补充法力：为 12 码内的友方英雄恢复 160 点魔法。冷却 55 秒。',
  active: { target: 'none', cd: 55, onUse(c) {
    for (const a of G.heroes) if (!a.dead && a.team === c.caster.team && dst(a, c.caster) < 12) { a.mana = Math.min(a.maxMana, a.mana + 160); AB.float(a, '+160', '#64b5f6', 13, 1); }
    AB.burst(c.caster.x, 1, c.caster.z, 26, ['#42a5f5', '#bbdefb'], 6, 0.7, 0.25, 4, 0); } } });
registerItem({ id: 'shadow', order: 22, name: '暗影护符', icon: '影', color: '#37474f', cost: 1000, props: { as: 25, dmg: 12 },
  desc: '+25 攻击速度，+12 攻击力。主动·暗影步：0.8 秒后隐身 12 秒（+10% 移速），攻击打破隐身并附加 150 点伤害。冷却 25 秒。',
  active: { target: 'none', cd: 25, onUse(c) { AB.addModifier(c.caster, SHADOW_MOD, c.caster, { dur: 12.8, data: { fade: 0.8 } }); } } });
registerItem({ id: 'veil', order: 23, name: '纷争面纱', icon: '纱', color: '#6a1b9a', cost: 1500, parts: ['circlet', 'ring'],
  props: { str: 6, agi: 6, int: 8, armor: 3, hpRegen: 2 }, desc: '圆环 + 守护指环 + 1170。+6 力量/敏捷，+8 智力，+3 护甲。主动·纷争：6 码范围内敌人 16 秒内受到的魔法伤害提高约 25%。冷却 30 秒。',
  active: { target: 'point', range: 16, cd: 30, onUse(c, pt) {
    for (const u of units) if (!u.dead && u.team !== c.caster.team && !u.isBuilding && !u.isWard && Math.hypot(u.x - pt.x, u.z - pt.z) < 6) AB.addModifier(u, VEIL_MOD, c.caster, { dur: 16 });
    AB.burst(pt.x, 1, pt.z, 40, ['#8e24aa', '#ce93d8', '#4a148c'], 7, 0.8, 0.3, 4, 0); emit('veil', { unit: c.caster.id }); } } });
registerItem({ id: 'bfury', order: 24, name: '狂战斧', icon: '狂', color: '#c62828', cost: 2900, parts: ['claymore'],
  props: { dmg: 45, hpRegen: 6, manaRegen: 2 }, desc: '大剑 + 1550。+45 攻击力，+6 生命恢复，+2 魔法恢复。被动·分裂（近战）：对目标周围 3.5 码的敌人造成 50% 攻击伤害。',
  onAttackLand(c, t, dealt) {
    const h = c.caster; if (h.proj || !t || t.isBuilding) return; let n = 0;
    for (const u of units) if (u !== t && !u.dead && u.team !== h.team && !u.isBuilding && !u.isWard && Math.hypot(u.x - t.x, u.z - t.z) < 3.5) { dealDamage(h, u, dealt * 0.5, 'pure', { ability: 'bfury', silent: true }); n++; }
    if (n) { AB.burst(t.x, 1, t.z, 6, ['#ef5350', '#ffcdd2'], 3, 0.3, 0.2, 2, 0); emit('cleave', { unit: h.id, n }); }
  } });
registerItem({ id: 'assault', order: 25, name: '强袭胸甲', icon: '袭', color: '#ff8f00', cost: 3600, parts: ['platemail', 'gloves'],
  props: { as: 30, armor: 10 }, desc: '板甲 + 加速手套 + 1750。+30 攻击速度，+10 护甲。光环（15 码）：友方 +15 攻击速度、+4 护甲；敌方 −4 护甲。',
  tick(c) { const h = c.caster;
    for (const u of units) if (!u.dead && !u.isWard && dst(u, h) < 15) AB.addModifier(u, u.team === h.team ? ASSAULT_AURA : ASSAULT_CURSE, h, { dur: 0.75 }); } });
registerItem({ id: 'vanguard', order: 26, name: '先锋盾', icon: '锋', color: '#5d4037', cost: 1500, parts: ['gauntlets'],
  props: { hp: 250, hpRegen: 5, str: 3 }, desc: '力量手套 + 1360。+250 生命值，+5 生命恢复，+3 力量。被动·格挡：50% 几率格挡 40 点攻击伤害（近战英雄）。',
  block: 40 });
