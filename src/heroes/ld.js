// heroes/ld.js — 德鲁伊 Lone Druid (ranged agility). Spirit Bear (permanent controllable bear: entangles on attack, can return to
// the druid; dies → re-summon after the cooldown), Spirit Link (lifesteal shared between druid and bear), Savage Roar (fear around
// the druid and the bear), True Form (the druid becomes a melee bear: armor + HP).
const LD_BEAR_MODEL = (c, c2, glow, s) => quadruped({ len: 2.3 * s, w: 1.4 * s, h: 1.25 * s, legH: 0.85 * s, legW: 0.45 * s, c, c2,
  head: [[0, 0, 0.35 * s, 0.85 * s, 0.75 * s, 0.75 * s, c], [0, -0.15 * s, 0.85 * s, 0.45 * s, 0.38 * s, 0.35 * s, c2], [-0.33 * s, 0.42 * s, 0.2 * s, 0.22 * s, 0.22 * s, 0.14 * s, c], [0.33 * s, 0.42 * s, 0.2 * s, 0.22 * s, 0.22 * s, 0.14 * s, c]],
  headGlow: [[-0.2 * s, 0.1 * s, 0.73 * s, 0.1 * s, 0.08 * s, 0.03, glow], [0.2 * s, 0.1 * s, 0.73 * s, 0.1 * s, 0.08 * s, 0.03, glow]],
  glow: [[0, 1.27 * s, 0, 0.5 * s, 0.06, 0.9 * s, glow], [-0.71 * s, 0.7 * s, 0.3 * s, 0.04, 0.3 * s, 0.6 * s, glow], [0.71 * s, 0.7 * s, 0.3 * s, 0.04, 0.3 * s, 0.6 * s, glow]] });
const LD_ROOT = { id: 'ld_entangle', tag: '缠绕', color: '#9ccc65', debuff: true, states: ['rooted'], tick: 0.5, onTick(u, m) { AB.damage(m.src, u, m.data.dps * 0.5, 'magic', 'entangle', { silent: true }); } };
const LD_LINK = c => { const h = c.caster.isHero ? c.caster : c.caster.owner, ab = h && h.abilities[1]; return ab && ab.lvl ? lvVal(ab.def, 'ls', ab.lvl) : 0; };
// lifesteal shared: the attacker heals ls × damage, its partner (druid ↔ bear) heals half of that
function ldLifesteal(c, dealt) {
  const ls = LD_LINK(c); if (!ls) return; const u = c.caster, h = u.isHero ? u : u.owner, mate = u.isHero ? AB.owned(h, 'ld_bear')[0] : h, heal = dealt * ls;
  u.hp = Math.min(u.maxHp, u.hp + heal); if (mate && !mate.dead) mate.hp = Math.min(mate.maxHp, mate.hp + heal * 0.5);
}
registerSummon({ id: 'ld_bear', name: '战熊', hp: 1100, armor: 2, dmg: [30, 35], bat: 1.6, range: 2.6, speed: 7.0, radius: 0.9, height: 2.6, gold: 300, xp: 100,
  vision: 16, quad: true, fx: ['#9ccc65', '#ffffff', '#795548'], portrait: { headY: 2.0 },
  abilities: [
    { id: 'bear_return', key: 'Q', name: '返回', icon: '返', color: '#9ccc65', target: 'none', castPoint: 0, cd: 10, values: { calm: 3 },
      text: L => `战熊瞬间回到德鲁伊身边（${L.calm} 秒内受到英雄伤害则无法使用）。`,
      check: b => G.time - (b.lastHeroHit || -9) < 3 ? '战熊刚受到英雄伤害，无法返回' : null,
      onCast(c) { const b = c.caster, h = b.owner; if (!h || h.dead) return;
        AB.teleport(b, { x: h.x - Math.sin(h.facing) * 2, z: h.z - Math.cos(h.facing) * 2 }, { colors: ['#9ccc65', '#c5e1a5', '#ffffff'] }); emit('bearReturn', { unit: b.id }); } },
    { id: 'bear_entangle', key: 'E', name: '缠绕', icon: '缠', color: '#689f38', passive: true, values: { chance: 0.2, dur: 1.5, dps: 40 }, fmt: { chance: v => Math.round(v * 100) + '%' },
      text: L => `被动：攻击有 ${L.chance} 几率缠绕目标 ${L.dur} 秒（定身并每秒受到 ${L.dps} 点魔法伤害）。`,
      onAttackLand(c, t, dealt) { ldLifesteal(c, dealt); if (t.isBuilding || getMod(t, 'ld_entangle') || Math.random() > c.v('chance')) return;
        if (AB.addModifier(t, LD_ROOT, c.caster, { dur: c.v('dur'), data: { dps: c.v('dps') } })) emit('entangle', { unit: c.caster.id, target: t.id }); } },
  ],
  model: () => LD_BEAR_MODEL('#6d4c41', '#4e342e', '#b2ff59', 1) });
const LD_FORM = AB.formMod({ id: 'ld_form', name: '真熊形态', color: '#795548', key: 'ld_true_form', height: 3.0, colors: ['#795548', '#b2ff59', '#ffffff'],
  def: () => LD_BEAR_MODEL('#8d6e63', '#5d4037', '#ffd54f', 1.15),
  onApply(u, m) { m.data.r0 = u.range; m.data.p0 = u.proj; u.range = 2.6; u.proj = 0; }, onRemove(u, m) { u.range = m.data.r0; u.proj = m.data.p0; } });
registerHero({
  id: 'ld', order: 14, name: '德鲁伊', title: '独行德鲁伊', type: '远程 · 敏捷', color: '#558b2f', nameColor: '#c5e1a5',
  desc: '远程敏捷型英雄。召唤可操控的战熊并肩作战，野性连接让二者共享吸血，野性咆哮使周围敌人恐惧逃跑，真熊形态化身巨熊近身搏斗。',
  ai: { role: 'carry', skills: [0, 1, 0, 2, 0, 1, 0, 1, 1, 2, 2, 2], build: ['phase', 'vanguard', 'heart', 'scepter'] },
  stats: { primary: 'agi', str: 18, strG: 2.4, agi: 22, agiG: 2.8, int: 13, intG: 1.4, dmg: 22, armor: 1, bat: 1.7, range: 10,
    atkPoint: 0.33, backswing: 0.5, speed: 6.9, proj: 24, projColor: '#c5e1a5', hpRegen: 1.5, manaRegen: 0.6, radius: 0.6, height: 3.1 },
  portrait: { headY: 2.45 },
  model: () => humanoid({ pants: '#4e342e', boots: '#3e2723', skin: '#e0b48a', sleeve: '#6d4c41', hip: 0.24, sh: 0.58, legH: 1.05, bodyH: 1.0, legW: 0.36,
    body: [[0, 0.48, 0, 0.82, 1.0, 0.52, '#6d4c41'], [0, 0.6, 0.27, 0.5, 0.5, 0.03, '#9ccc65'], [0, 1.36, 0, 0.68, 0.66, 0.68, '#e0b48a'], [-0.15, 1.42, 0.35, 0.12, 0.08, 0.02, '#33691e'], [0.15, 1.42, 0.35, 0.12, 0.08, 0.02, '#33691e'],
      [0, 1.72, -0.05, 0.92, 0.5, 0.86, '#795548'], [-0.32, 2.02, 0.05, 0.22, 0.2, 0.2, '#795548'], [0.32, 2.02, 0.05, 0.22, 0.2, 0.2, '#795548'], [0, 1.1, -0.35, 0.9, 1.3, 0.14, '#795548']],
    armR: [[0, -0.4, 0, 0.34, 0.84, 0.38, '#6d4c41'], [0, -0.82, 0, 0.32, 0.2, 0.36, '#e0b48a'], [0, -0.7, 0.3, 0.12, 1.4, 0.12, '#5d4037']], armRGlow: [[0, 0.05, 0.3, 0.3, 0.3, 0.3, '#b2ff59']] }),
  abilities: [
    { id: 'bear', ai: { summon: 'ld_bear' }, key: 'Q', name: '召唤战熊', icon: '熊', color: '#795548', target: 'none', castPoint: 0.4,
      mana: 75, cd: [30, 26, 22, 18], values: { hp: [1100, 1400, 1700, 2000], armor: [2, 3, 4, 5], dmg: [30, 40, 50, 60] },
      text: L => `召唤可操控的战熊（生命 ${L.hp}，护甲 ${L.armor}，攻击 ${L.dmg}）。战熊存活时再次施放：战熊回到身边并恢复全部生命。战熊阵亡后可重新召唤。`,
      onCast(c) { const h = c.caster, b = AB.owned(h, 'ld_bear')[0], o = { lvl: c.lvl, hp: c.v('hp'), armor: c.v('armor'), dmg: [c.v('dmg'), c.v('dmg') + 5] };
        const p = { x: h.x + Math.sin(h.facing) * 2.2, z: h.z + Math.cos(h.facing) * 2.2 };
        if (b) { AB.teleport(b, p, { colors: ['#9ccc65', '#ffffff'] }); b.hp = b.maxHp; emit('bearRecall', { unit: b.id }); return; }
        AB.summon(h, 'ld_bear', p.x, p.z, o); } },
    { id: 'link', key: 'W', name: '野性连接', icon: '连', color: '#9ccc65', passive: true, values: { ls: [0.15, 0.25, 0.35, 0.45], as: [20, 30, 40, 50] },
      fmt: { ls: v => Math.round(v * 100) + '%' },
      text: L => `被动：德鲁伊攻击速度 +${L.as}。德鲁伊与战熊的攻击吸血 ${L.ls}，吸取的生命一半同时分享给对方。`,
      passiveProps: c => ({ as: c.v('as') }), onAttackLand(c, t, dealt) { ldLifesteal(c, dealt); } },
    { id: 'roar', ai: { selfAoe: true, disable: true }, key: 'E', name: '野性咆哮', icon: '咆', color: '#8d6e63', target: 'none', castPoint: 0.1,
      mana: 50, cd: [38, 32, 26, 20], values: { radius: 7, dur: [1.2, 1.6, 2, 2.4] },
      text: L => `德鲁伊（和战熊）发出咆哮，使周围 ${L.radius} 码内的敌人恐惧 ${L.dur} 秒：无法攻击和施法，只能逃跑。`,
      onCast(c) { const h = c.caster, srcs = [h, ...AB.owned(h, 'ld_bear')], hit = new Set();
        for (const s of srcs) { AB.ringP(s.x, s.z, c.v('radius'), 36, ['#bcaaa4', '#ffffff', '#8d6e63'], 0.5, 0.35, 0.4, 5);
          for (const u of AB.enemiesIn(h, s.x, s.z, c.v('radius'))) if (!u.isBuilding && !hit.has(u)) { hit.add(u); AB.fear(u, s, c.v('dur')); } }
        emit('savageRoar', { unit: h.id, n: hit.size }); } },
    { id: 'trueform', scepter: { desc: '冷却时间降低为 60 秒，护甲 +12/14/16，生命值 +500/700/900。', cd: [60, 60, 60], values: { armor: [12, 14, 16], hp: [500, 700, 900] } }, key: 'R', name: '真熊形态', icon: '真', color: '#5d4037', ult: true, target: 'none', castPoint: 0.5,
      mana: 25, cd: [100, 90, 80], values: { dur: 40, armor: [8, 10, 12], hp: [300, 500, 700] },
      text: L => `终极技能：化身为巨熊 ${L.dur} 秒，变为近战，护甲 +${L.armor}，生命上限 +${L.hp}。`,
      onCast(c) { const h = c.caster; AB.addModifier(h, LD_FORM, h, { dur: c.v('dur'), props: { armor: c.v('armor'), hp: c.v('hp') } }); emit('trueForm', { unit: h.id }); } },
  ],
});
