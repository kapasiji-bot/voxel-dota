// heroes/enigma.js — 谜团 Enigma (ranged intelligence). Malefice (3 mini-stuns over 4 s), Demonic Summoning (eidolons that split
// into a full-HP copy after 6 attacks — engine: summon def.split), Midnight Pulse (ground area: % max HP pure damage per second),
// Black Hole (channelled: enemies in the radius are disabled and pulled toward the centre — engine: AB.pull).
registerSummon({ id: 'enig_eidolon', name: '虚灵', hp: 200, armor: 0, dmg: [20, 24], bat: 1.4, range: 6, proj: 18, projColor: '#b388ff', speed: 7, radius: 0.5, height: 2.0,
  gold: 25, xp: 15, vision: 12, push: true, split: { after: 6 }, fx: ['#7c4dff', '#b388ff', '#311b92'], portrait: { headY: 1.4 },
  model: () => humanoid({ pants: '#311b92', boots: '#1a0033', skin: '#4527a0', sleeve: '#311b92', hip: 0.2, sh: 0.48, legH: 0.6, bodyH: 0.8, legW: 0.26,
    body: [[0, 0.4, 0, 0.7, 0.8, 0.5, '#311b92'], [0, 1.05, 0, 0.6, 0.55, 0.55, '#4527a0'], [0, 1.45, 0, 0.3, 0.3, 0.3, '#7c4dff']],
    bodyGlow: [[0, 1.1, 0.29, 0.34, 0.12, 0.02, '#ea80fc']] }) });
const ENIG_MALEFICE = { id: 'enig_malefice', tag: '魔化', color: '#7c4dff', debuff: true, tick: 2,
  onApply(u, m) { enigMaleficeHit(u, m); }, onTick(u, m) { enigMaleficeHit(u, m); } };
function enigMaleficeHit(u, m) { AB.stun(u, m.src, m.data.stun); AB.damage(m.src, u, m.data.dmg, 'magic', 'malefice'); AB.burst(u.x, 2.2, u.z, 12, ['#7c4dff', '#ea80fc'], 3, 0.4, 0.25, 1, 0); emit('malefice', { unit: u.id }); }
const ENIG_HOLE = { id: 'enig_hole', tag: '黑洞', color: '#311b92', states: ['stunned'] };   // not a debuff: pierces magic immunity (DOTA)
registerHero({
  id: 'enigma', order: 16, name: '谜团', title: '谜团', type: '远程 · 智力', color: '#4527a0', nameColor: '#b388ff',
  desc: '远程智力型先手。魔化反复眩晕目标，虚灵分裂推线，午夜凋零按最大生命值灼烧敌人，黑洞把整支敌队吸到一起无法行动。',
  stats: { primary: 'int', str: 17, strG: 2.5, agi: 14, agiG: 1, int: 22, intG: 3.6, dmg: 26, armor: 1, bat: 1.7, range: 11,
    atkPoint: 0.4, backswing: 0.5, speed: 6.8, proj: 18, projColor: '#b388ff', hpRegen: 0.8, manaRegen: 1, radius: 0.7, height: 3.5 },
  portrait: { headY: 2.9 },
  ai: { role: 'support', skills: [1, 0, 1, 2, 1, 3, 1, 0, 0, 0, 3, 2, 2, 2, 3], build: ['arcane', 'blink', 'pipe', 'scepter'],
    combos: [{ id: 'enig_blink_hole', steps: ['blink', { slot: 3, at: 'center' }], min: 2, radius: 5 }] },   // ai/bot/combos.js
  model: () => humanoid({ pants: '#1a0033', boots: '#000', skin: '#311b92', sleeve: '#1a0033', hip: 0.28, sh: 0.66, legH: 1.1, bodyH: 1.15, legW: 0.38,
    body: [[0, 0.5, 0, 1.0, 1.05, 0.6, '#1a0033'], [0, 1.2, 0, 1.25, 0.3, 0.7, '#311b92'], [0, 1.7, 0, 0.85, 0.8, 0.8, '#1a0033'],
      [-0.55, 1.45, 0, 0.3, 0.6, 0.3, '#4527a0'], [0.55, 1.45, 0, 0.3, 0.6, 0.3, '#4527a0'], [0, 2.25, 0, 0.4, 0.3, 0.4, '#311b92']],
    bodyGlow: [[0, 0.6, 0.31, 0.4, 0.4, 0.02, '#7c4dff'], [-0.18, 1.75, 0.41, 0.14, 0.14, 0.02, '#ea80fc'], [0.18, 1.75, 0.41, 0.14, 0.14, 0.02, '#ea80fc']] }),
  abilities: [
    { id: 'malefice', ai: { disable: true }, key: 'Q', name: '魔化', icon: '魔', color: '#7c4dff', target: 'unit', range: 10, castPoint: 0.3,
      mana: [100, 110, 120, 130], cd: [16, 15, 14, 13], values: { stun: [0.3, 0.5, 0.7, 0.9], dmg: [30, 50, 70, 90], n: 3 },
      text: L => `对一名敌人施加魔化：4 秒内共 ${L.n} 次（每 2 秒一次）眩晕 ${L.stun} 秒并造成 ${L.dmg} 点魔法伤害。`,
      onCast(c, t) { AB.addModifier(t, ENIG_MALEFICE, c.caster, { dur: 4.05, data: { stun: c.v('stun'), dmg: c.v('dmg') } }); } },
    { id: 'eidolons', ai: { summon: 'enig_eidolon' }, key: 'W', name: '恶魔召唤', icon: '灵', color: '#651fff', target: 'none', castPoint: 0.3,
      mana: 140, cd: 35, values: { n: [2, 2, 3, 3], hp: [180, 220, 260, 300], dmg: [20, 30, 40, 50], dur: 35 },
      text: L => `召唤 ${L.n} 个虚灵（${L.hp} 生命，${L.dmg} 攻击力，持续 ${L.dur} 秒）。每个虚灵攻击 6 次后分裂出一个满血的新虚灵，并恢复全部生命。`,
      onCast(c) { const h = c.caster, d = c.v('dmg');
        for (let i = 0; i < c.v('n'); i++) { const a = h.facing + (i - 1) * 0.9; AB.summon(h, 'enig_eidolon', h.x + Math.sin(a) * 2.2, h.z + Math.cos(a) * 2.2, { lvl: c.lvl, hp: c.v('hp'), dmg: [d, d + 4], dur: c.v('dur') }); } } },
    { id: 'pulse', ai: { aoe: 2 }, key: 'E', name: '午夜凋零', icon: '凋', color: '#4a148c', target: 'point', range: 14, castPoint: 0.1,
      mana: [95, 110, 125, 140], cd: 35, values: { radius: 5, pct: [0.03, 0.0375, 0.045, 0.0525], dur: [9, 10, 11, 12], dps: 1 }, fmt: { pct: v => (v * 100).toFixed(1) + '%' },
      text: L => `在目标区域制造午夜凋零（半径 ${L.radius} 码，持续 ${L.dur} 秒），每秒对区域内敌人造成其最大生命值 ${L.pct} 的纯粹伤害。`,
      onCast(c, pt) { const h = c.caster, pct = c.v('pct');
        AB.groundArea({ caster: h, x: pt.x, z: pt.z, radius: c.v('radius'), dur: c.v('dur'), tick: 1,
          onTick(list) { for (const u of list) AB.damage(h, u, u.maxHp * pct, 'pure', 'pulse', { silent: !u.isHero }); },
          fx(a) { for (let i = 0; i < 3; i++) { const an = Math.random() * 6.28, r = Math.sqrt(Math.random()) * a.r; spawnP(a.x + Math.cos(an) * r, 0.2, a.z + Math.sin(an) * r, 0, rnd(0.5, 2), 0, 0.8, 0.3, ['#4a148c', '#7c4dff', '#000000'][i]); } } }); } },
    { id: 'black_hole', ai: { ultAoe: { radius: 'radius', min: 2 }, commit: true }, scepter: { desc: '每秒伤害提升至 75/125/175，范围提升至 6 码。', values: { dps: [75, 125, 175], radius: 6 } }, key: 'R', name: '黑洞', icon: '洞', color: '#1a0033', ult: true, target: 'point', range: 10, castPoint: 0.3, channel: 4,
      mana: [300, 400, 500], cd: [180, 170, 160], values: { radius: 5, dps: [50, 100, 150], pull: 2.5 },
      text: L => `终极技能（持续施法 4 秒）：在目标点制造黑洞，${L.radius} 码内的敌人无法行动（无视魔法免疫）并被拉向中心，每秒受到 ${L.dps} 点纯粹伤害。谜团被打断则黑洞消失。`,
      onChannelStart(c, pt, ch) { ch.data.x = pt.x; ch.data.z = pt.z; ch.data.hit = new Set(); emit('blackHole', { unit: c.caster.id }); },
      onChannelTick(c, pt, dt, ch) { const h = c.caster, d = ch.data, R = c.v('radius');
        for (const u of enemiesInRadius(h.team, d.x, d.z, R)) {
          if (!getMod(u, 'enig_hole')) { AB.addModifier(u, ENIG_HOLE, h, { dur: ch.dur - ch.t + 0.1 }); d.hit.add(u); if (u.channel) interruptChannel(u, 'stun'); }
          AB.pull(u, d.x, d.z, c.v('pull') * dt); AB.damage(h, u, c.v('dps') * dt, 'pure', 'black_hole', { silent: true });
        }
        for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, r = rnd(0.5, R); spawnP(d.x + Math.cos(a) * r, rnd(0.2, 2.5), d.z + Math.sin(a) * r, -Math.cos(a) * r * 1.5, 0.3, -Math.sin(a) * r * 1.5, 0.6, 0.3, ['#1a0033', '#7c4dff', '#ea80fc', '#000000'][i % 4]); }
        spawnP(d.x, 1.2, d.z, 0, 0, 0, 0.12, 2.6, '#000000'); },
      onChannelEnd(c, pt, interrupted, ch) { for (const u of ch.data.hit) removeModById(u, 'enig_hole'); emit('blackHoleEnd', { unit: c.caster.id, n: ch.data.hit.size, interrupted }); } },
  ],
});
