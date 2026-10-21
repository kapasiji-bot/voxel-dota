// heroes/lycan.js — 狼人 Lycan (melee strength). Summon Wolves, Howl (team damage buff incl. units), Feral Impulse (aura for
// Lycan + his units: damage % and regen), Shapeshift (voxel wolf form: max speed + crits for Lycan and his wolves).
const LYC_WOLF_CRIT = { id: 'lyc_wcrit', passive: true, noIllusion: true, name: '变身暴击', icon: '暴', color: '#6d4c41',
  modifyAttack(c, t, info) { const o = c.caster.owner, f = o && getMod(o, 'lyc_form'); if (!f || t.isBuilding || Math.random() > 0.3) return; info.dmg *= f.data.crit; info.crit = f.data.crit; } };
const LYC_WOLF_MODEL = (c, c2, eye, s) => quadruped({ len: 1.8 * s, w: 0.7 * s, h: 0.7 * s, legH: 0.6 * s, legW: 0.24 * s, c, c2,
  head: [[0, 0, 0.3 * s, 0.55 * s, 0.5 * s, 0.65 * s, c], [0, -0.1 * s, 0.75 * s, 0.34 * s, 0.28 * s, 0.4 * s, c2], [-0.17 * s, 0.33 * s, 0.2 * s, 0.12 * s, 0.26 * s, 0.12 * s, c], [0.17 * s, 0.33 * s, 0.2 * s, 0.12 * s, 0.26 * s, 0.12 * s, c]],
  headGlow: [[-0.14 * s, 0.08 * s, 0.63 * s, 0.08 * s, 0.07 * s, 0.03, eye], [0.14 * s, 0.08 * s, 0.63 * s, 0.08 * s, 0.07 * s, 0.03, eye]],
  tail: [[0, 0.55 * s, -1.05 * s, 0.18 * s, 0.18 * s, 0.6 * s, c]] });
registerSummon({ id: 'lyc_wolf', name: '狼', hp: 250, armor: 1, dmg: [22, 26], bat: 1.2, range: 2.2, speed: 7.6, radius: 0.55, height: 1.6, gold: 30, xp: 15,
  vision: 14, push: true, quad: true, fx: ['#9e9e9e', '#ffffff'], portrait: { headY: 1.3 }, abilities: [LYC_WOLF_CRIT],
  model: () => LYC_WOLF_MODEL('#8d8d8d', '#d6d6d6', '#ffeb3b', 1) });
const LYC_HOWL = { id: 'lyc_howl', name: '嚎叫', color: '#8d6e63' };
const LYC_FERAL = { id: 'lyc_feral', name: '野性驱使', color: '#a1887f' };
const LYC_FORM = AB.formMod({ id: 'lyc_form', name: '变身', color: '#4e342e', key: 'lyc_wolf_form', height: 2.6, colors: ['#4e342e', '#8d6e63', '#ffffff'],
  def: () => LYC_WOLF_MODEL('#4e342e', '#8d6e63', '#ff1744', 1.55) });
registerHero({
  id: 'lycan', order: 13, name: '狼人', title: '狼人', type: '近战 · 力量', color: '#5d4037', nameColor: '#bcaaa4',
  desc: '近战力量型英雄。召唤狼群推进，嚎叫增强全队攻击，野性驱使强化自己与召唤物，变身为巨狼后极速奔袭并造成暴击。',
  ai: { role: 'carry', skills: [0, 2, 0, 1, 0, 2, 0, 2, 2, 1, 1, 1], build: ['phase', 'bfury', 'daedalus', 'bkb'] },
  stats: { primary: 'str', str: 24, strG: 3.4, agi: 18, agiG: 2.2, int: 17, intG: 1.6, dmg: 26, armor: 1, bat: 1.7, range: 2.6,
    atkPoint: 0.55, backswing: 0.5, speed: 7.0, proj: 0, hpRegen: 2, manaRegen: 0.7, radius: 0.65, height: 3.3 },
  portrait: { headY: 2.6 },
  model: () => humanoid({ pants: '#3e2723', boots: '#212121', skin: '#a1887f', sleeve: '#5d4037', hip: 0.26, sh: 0.64, legH: 1.1, bodyH: 1.05, legW: 0.4,
    body: [[0, 0.5, 0, 0.92, 1.04, 0.56, '#616161'], [0, 0.55, 0.29, 0.6, 0.6, 0.04, '#8d6e63'], [-0.5, 1.0, 0, 0.36, 0.34, 0.6, '#9e9e9e'], [0.5, 1.0, 0, 0.36, 0.34, 0.6, '#9e9e9e'],
      [0, 1.42, 0, 0.72, 0.68, 0.72, '#a1887f'], [-0.16, 1.48, 0.37, 0.12, 0.08, 0.02, '#ffeb3b'], [0.16, 1.48, 0.37, 0.12, 0.08, 0.02, '#ffeb3b'], [0, 1.85, -0.05, 0.84, 0.3, 0.84, '#757575'],
      [0, 1.3, -0.4, 0.8, 0.8, 0.14, '#757575']],
    armR: [[0, -0.42, 0, 0.36, 0.86, 0.4, '#5d4037'], [0, -0.85, 0, 0.36, 0.2, 0.4, '#a1887f'], [0, -1.0, 0.25, 0.3, 0.12, 0.4, '#eeeeee']],
    armL: [[0, -0.42, 0, 0.36, 0.86, 0.4, '#5d4037'], [0, -0.85, 0, 0.36, 0.2, 0.4, '#a1887f'], [0, -1.0, 0.25, 0.3, 0.12, 0.4, '#eeeeee']] }),
  abilities: [
    { id: 'wolves', ai: { summon: 'lyc_wolf' }, key: 'Q', name: '召唤狼', icon: '狼', color: '#757575', target: 'none', castPoint: 0.3,
      mana: [125, 130, 135, 140], cd: 30, values: { n: 2, hp: [200, 260, 320, 380], dmg: [18, 25, 32, 39], dur: 55 },
      text: L => `召唤 ${L.n} 只狼（生命 ${L.hp}，攻击 ${L.dmg}，持续 ${L.dur} 秒）。重新召唤会替换旧的狼。`,
      onCast(c) { const h = c.caster; for (const w of AB.owned(h, 'lyc_wolf')) { w.expired = true; AB.kill(w, null); }
        for (let i = 0; i < c.v('n'); i++) { const a = h.facing + (i ? 0.8 : -0.8); const w = AB.summon(h, 'lyc_wolf', h.x + Math.sin(a) * 2, h.z + Math.cos(a) * 2, { lvl: c.lvl, hp: c.v('hp'), dmg: [c.v('dmg'), c.v('dmg') + 4], dur: c.v('dur') });
          if (h.order.type === 'attack') issueOrder(w, { type: 'attack', target: h.order.target }); } } },
    { id: 'howl', key: 'W', name: '嚎叫', icon: '嚎', color: '#8d6e63', target: 'none', castPoint: 0.3,
      mana: [30, 35, 40, 45], cd: [50, 45, 40, 35], values: { dmg: [10, 16, 22, 28], dur: 8 },
      text: L => `全地图友方英雄攻击力 +${L.dmg}，附近的友方单位（召唤物）获得一半加成，持续 ${L.dur} 秒。`,
      onCast(c) { const h = c.caster;
        for (const u of units) { if (u.dead || u.team !== h.team || u.isBuilding || u.isWard || !(u.isHero || dst(u, h) < 20)) continue; AB.addModifier(u, LYC_HOWL, h, { dur: c.v('dur'), props: { dmg: u.isHero ? c.v('dmg') : c.v('dmg') / 2 } }); }
        AB.ringP(h.x, h.z, 3, 30, ['#bcaaa4', '#ffffff'], 0.7, 0.4, 1.2, 10); AB.float(h, '嗷呜——', '#bcaaa4', 18, 1.2); emit('howl', { unit: h.id }); } },
    { id: 'feral', key: 'E', name: '野性驱使', icon: '野', color: '#a1887f', passive: true, values: { dmg: [0.1, 0.18, 0.26, 0.34], regen: [2, 4, 6, 8], radius: 14 },
      fmt: { dmg: v => Math.round(v * 100) + '%' },
      text: L => `光环：狼人和他的召唤物（半径 ${L.radius} 码）攻击力提高 ${L.dmg}，生命恢复 +${L.regen}/秒。`,
      aura: { radius: 14, mod: LYC_FERAL, filter: (c, u) => u === c.caster || u.owner === c.caster, props: c => ({ dmgPct: c.v('dmg'), hpRegen: c.v('regen') }) } },
    { id: 'shapeshift', scepter: { desc: '持续时间 24/28/32 秒，暴击倍率 175%/200%/225%。', values: { dur: [24, 28, 32], crit: [1.75, 2, 2.25] } }, key: 'R', name: '变身', icon: '变', color: '#4e342e', ult: true, target: 'none', castPoint: 0.3,
      mana: 100, cd: [120, 100, 80], values: { dur: [18, 22, 26], ms: 4, crit: [1.5, 1.75, 2], chance: 0.3 }, fmt: { crit: v => v + '×', chance: v => Math.round(v * 100) + '%' },
      text: L => `终极技能：变身为巨狼 ${L.dur} 秒，移动速度大幅提升（+${L.ms}），狼人和他的狼有 ${L.chance} 几率造成 ${L.crit} 暴击。`,
      modifyAttack(c, t, info) { const f = getMod(c.caster, 'lyc_form'); if (!f || t.isBuilding || Math.random() > c.v('chance')) return; info.dmg *= c.v('crit'); info.crit = c.v('crit'); },
      onCast(c) { const h = c.caster; AB.addModifier(h, LYC_FORM, h, { dur: c.v('dur'), props: { ms: c.v('ms') }, data: { crit: c.v('crit') } }); emit('shapeshift', { unit: h.id }); } },
  ],
});
