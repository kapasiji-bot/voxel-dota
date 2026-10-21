// ================= data =================
const HEROES = {
  axe: { id: 'axe', name: '斧王', title: '蒙格斯', primary: 'str', type: '近战 · 力量', str: 25, strG: 3.4, agi: 20, agiG: 2.2, int: 18, intG: 1.6, dmg: 28, armor: 1, bat: 1.7, range: 2.6, atkPoint: 0.4, speed: 7.0, proj: 0, hpRegen: 2.5, manaRegen: 0.8, radius: 0.75, height: 3.6, color: '#c62828',
    desc: '近战力量型英雄。以狂战士之吼嘲讽成群的敌人，被围攻时以反击螺旋绞杀四周，再用淘汰之刃终结残血目标。' },
  lina: { id: 'lina', name: '莉娜', title: '秀逗魔导士', primary: 'int', type: '远程 · 智力', str: 18, strG: 2.4, agi: 23, agiG: 2.0, int: 30, intG: 3.7, dmg: 22, armor: 0, bat: 1.6, range: 12.5, atkPoint: 0.45, speed: 6.8, proj: 22, projColor: '#ffab40', hpRegen: 1.2, manaRegen: 1.2, radius: 0.65, height: 3.3, color: '#ef6c00',
    desc: '远程智力型英雄。龙破斩与光击阵能瞬间清空兵线，炽魂让她越战越快，神灭斩则造成毁灭性的单体伤害。' },
};
const SKILLS = {
  axe: [
    { id: 'call', key: 'Q', name: '狂战士之吼', icon: '吼', color: '#c62828', target: 'none', mana: [80, 90, 100, 110], cd: [16, 14, 12, 10], radius: 6, dur: [2, 2.4, 2.8, 3.2], armor: [12, 13, 14, 15],
      text: L => `嘲讽周围 6 码内的敌方单位，强迫它们攻击斧王，持续 ${L.dur} 秒；期间斧王获得 ${L.armor} 点额外护甲。` },
    { id: 'hunger', key: 'W', name: '战斗饥渴', icon: '饥', color: '#8e24aa', target: 'unit', range: 9, mana: [50, 60, 70, 80], cd: [20, 18, 16, 14], dps: [16, 24, 32, 40], dur: 10,
      text: L => `使一名敌人陷入饥渴，10 秒内每秒受到 ${L.dps} 点魔法伤害并减速 12%；每个受影响的敌人使斧王移动速度提升 12%。` },
    { id: 'helix', key: 'E', name: '反击螺旋', icon: '旋', color: '#6d4c41', passive: true, chance: 0.25, dmg: [60, 90, 120, 150], radius: 4.5,
      text: L => `被动：受到攻击时有 25% 几率旋转战斧，对周围 4.5 码内所有敌人造成 ${L.dmg} 点纯粹伤害。` },
    { id: 'cull', key: 'R', name: '淘汰之刃', icon: '斩', color: '#b71c1c', ult: true, target: 'unit', range: 3.5, mana: [60, 120, 180], cd: [40, 32, 24], thr: [250, 350, 450], dmg: [150, 250, 300],
      text: L => `终极技能：挥斧斩向一名敌人。若目标生命值低于 ${L.thr}，直接将其斩杀；否则造成 ${L.dmg} 点魔法伤害。` },
  ],
  lina: [
    { id: 'slave', key: 'Q', name: '龙破斩', icon: '龙', color: '#ef6c00', target: 'point', range: 20, len: 20, speed: 30, mana: [90, 100, 110, 120], cd: [10, 9, 8, 7], dmg: [85, 160, 235, 310], instantDir: true,
      text: L => `向指定方向释放一道龙形火焰波，长度 20 码，对沿途所有敌人造成 ${L.dmg} 点魔法伤害。` },
    { id: 'lsa', key: 'W', name: '光击阵', icon: '光', color: '#fbc02d', target: 'point', range: 13, radius: 4.5, mana: [100, 110, 120, 130], cd: [7, 7, 7, 7], dmg: [80, 120, 160, 200], stun: [1.6, 1.9, 2.2, 2.5],
      text: L => `在目标区域召唤一道火柱，0.5 秒后对半径 4.5 码内的敌人造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒。` },
    { id: 'fiery', key: 'E', name: '炽魂', icon: '魂', color: '#d84315', passive: true, as: [40, 55, 70, 85], ms: [0.05, 0.06, 0.07, 0.08], max: 3, dur: 10,
      text: L => `被动：每次施放技能获得一层炽魂（最多 3 层，持续 10 秒），每层提升 ${L.as} 点攻击速度和 ${L.ms}移动速度。` , fmt: { ms: v => Math.round(v * 100) + '%' } },
    { id: 'laguna', key: 'R', name: '神灭斩', icon: '灭', color: '#c62828', ult: true, target: 'unit', range: 12, mana: [150, 250, 350], cd: [40, 35, 30], dmg: [450, 675, 950],
      text: L => `终极技能：向一名敌人释放巨大的雷电光束，短暂延迟后造成 ${L.dmg} 点魔法伤害。` },
  ],
};
const ITEMS = {
  boots: { id: 'boots', name: '速度之靴', icon: '靴', color: '#8d6e63', cost: 500, ms: 1.5, desc: '+1.5 移动速度（多双不叠加）。' },
  blink: { id: 'blink', name: '闪烁匕首', icon: '闪', color: '#3949ab', cost: 2250, active: true, target: 'point', range: 24, cd: 12, desc: '主动·闪烁：瞬间传送到最远 24 码外的目标位置。冷却 12 秒。' },
  bkb: { id: 'bkb', name: '黑皇杖', icon: '黑', color: '#263238', cost: 4050, str: 10, dmg: 24, active: true, cd: 70, dur: 9, desc: '+10 力量，+24 攻击力。主动·天神下凡：9 秒魔法免疫（免疫魔法伤害与眩晕/减速），原型中额外减少 25% 所受伤害。冷却 70 秒。' },
  claymore: { id: 'claymore', name: '大剑', icon: '剑', color: '#757575', cost: 1350, dmg: 21, desc: '+21 攻击力。' },
  salve: { id: 'salve', name: '治疗药膏', icon: '药', color: '#2e7d32', cost: 110, active: true, consumable: true, cd: 0.5, desc: '主动（消耗品）：10 秒内恢复 400 点生命值。' },
};
const SHOP_ORDER = ['boots', 'blink', 'bkb', 'claymore', 'salve'];

// ================= game state =================
const G = { started: false, over: false, paused: false, time: 0, timeScale: 1, nextWave: 1.5, wave: 0, player: null, score: [0, 0], goldEarned: 0,
  superCreeps: [{ top: false, mid: false, bot: false }, { top: false, mid: false, bot: false }], cam: { x: 0, z: 0, dist: 62 }, targeting: null, lock: false, hover: null, selected: null, ancients: [] };
const units = [], projectiles = [], effects = [], timers = [], floats = [], corpses = [];
let UID = 1;
function addUnit(o, model) {
  const u = Object.assign({ id: UID++, x: 0, z: 0, facing: 0, radius: 0.6, hp: 100, maxHp: 100, mana: 0, maxMana: 0, armor: 0, dmgMin: 10, dmgMax: 12, range: 2, atkInterval: 1, atkPoint: 0.3, proj: 0,
    speed: 6, atkCd: 0, windup: 0, wtarget: null, target: null, dead: false, stun: 0, slowT: 0, slowPct: 0, taunt: null, hunger: null, isBuilding: false, height: 2, moving: false,
    anim: { walk: 0, atk: 0, atkDur: 0.5, spin: 0 }, magicRes: 0, acq: Math.random() * 0.3, hpRegen: 0 }, o);
  u.model = model || null;
  if (model) {
    model.position.set(u.x, heightAt(u.x, u.z), u.z); model.rotation.y = u.facing; scene.add(model); u.parts = model.userData.parts;
    for (const k in u.parts) u.parts[k].userData.p0 = u.parts[k].position.clone();
  }
  units.push(u); return u;
}
function isInvuln(u) {
  if (u.kind === 'fountain') return true;
  if (u.req && u.req.some(r => !r.dead)) return true;
  if (u.reqAny && u.reqAny.every(r => !r.dead)) return true;
  return false;
}
const armorMult = a => 1 - (0.06 * a) / (1 + 0.06 * Math.abs(a));
const effSpeed = u => u.isHero ? u.speed : u.speed * (u.slowT > 0 ? 1 - u.slowPct : 1);
const edgeDist = (a, b) => dst(a, b) - a.radius - b.radius;
const inRange = (a, b, r) => edgeDist(a, b) <= r;

// ================= buildings =================
const BDEF = { tower: towerDef, barracks: barracksDef, ancient: ancientDef, fountain: fountainDef };
function makeBuilding(kind, team, x, z, o) {
  const model = buildModel(kind + team, BDEF[kind](team));
  const u = addUnit(Object.assign({ kind, team, x, z, isBuilding: true, facing: Math.atan2(-x, -z) }, o), model);
  u.model.rotation.y = Math.round(u.facing / (Math.PI / 2)) * (Math.PI / 2);
  setBlock(x, z, u.radius - 0.4, true);
  return u;
}
function setupBuildings() {
  const TIERS = { 1: { hp: 1800, armor: 12, dmg: 100, gold: 180 }, 2: { hp: 2100, armor: 14, dmg: 125, gold: 220 }, 3: { hp: 2400, armor: 16, dmg: 145, gold: 250 }, 4: { hp: 2400, armor: 16, dmg: 145, gold: 250 } };
  const tierCN = ['', '一', '二', '三', '四'];
  for (const team of [RAD, DIRE]) {
    const sg = team === RAD ? 1 : -1, t3s = [];
    const tower = (k, tier, p) => { const s = TIERS[tier]; return makeBuilding('tower', team, p.x, p.z, { name: (k ? LANE_CN[k] : '基地') + tierCN[tier] + '塔', tier, lane: k, hp: s.hp, maxHp: s.hp, armor: s.armor, dmgMin: s.dmg - 8, dmgMax: s.dmg + 8, range: 14, atkInterval: 1, atkPoint: 0.01, proj: 26, projColor: team === RAD ? '#a6ffcf' : '#ff7043', radius: 1.8, height: 7.6, gold: s.gold }); };
    for (const k of LANE_KEYS) {
      const L = lanes[k], f1 = 0.40, f2 = k === 'mid' ? 0.27 : 0.27;
      const t1 = tower(k, 1, placeOnLane(k, team, L.len * f1, 4));
      const t2 = tower(k, 2, placeOnLane(k, team, L.len * f2, 4));
      const t3 = tower(k, 3, placeOnLane(k, team, k === 'mid' ? 22 : 24, 4));
      const br = makeBuilding('barracks', team, ...Object.values(placeOnLane(k, team, k === 'mid' ? 15 : 16, 5)), { name: LANE_CN[k] + '兵营', lane: k, hp: 1800, maxHp: 1800, armor: 10, radius: 2.8, height: 4.5, gold: 160 });
      t2.req = [t1]; t3.req = [t2]; br.req = [t3]; t3s.push(t3);
    }
    const a1 = tower(null, 4, { x: -54 * sg, z: 62 * sg }), a2 = tower(null, 4, { x: -62 * sg, z: 54 * sg });
    a1.reqAny = t3s; a2.reqAny = t3s;
    const anc = makeBuilding('ancient', team, -62 * sg, 62 * sg, { name: TEAM_NAME[team] + '遗迹', hp: 5000, maxHp: 5000, armor: 13, radius: 4.5, height: 10.5, gold: 0 });
    anc.req = [a1, a2]; G.ancients[team] = anc;
    makeBuilding('fountain', team, -71 * sg, 71 * sg, { name: TEAM_NAME[team] + '泉水', hp: 1, maxHp: 1, radius: 3, height: 4, range: 15, dmgMin: 170, dmgMax: 190, atkInterval: 0.4, atkPoint: 0.01, proj: 34, projColor: team === RAD ? '#a6ffcf' : '#ff7043' });
  }
}
const TEAM_NAME = ['天辉', '夜魇'];

// ================= creeps =================
function spawnWave() {
  G.wave++;
  const upg = Math.floor(G.time / 300);
  for (const team of [RAD, DIRE]) for (const k of LANE_KEYS) {
    const pts = team === RAD ? lanes[k].pts : lanes[k].pts.slice().reverse();
    const sup = G.superCreeps[team][k], m = sup ? 1.5 : 1;
    for (let i = 0; i < 4; i++) {
      const ranged = i === 3, type = ranged ? 'ranged' : 'melee';
      const p = placeOnLane(k, team, 10 - i * 1.5, (i % 2 ? 0.9 : -0.9));
      const model = buildModel(type + team, MODEL_DEFS[type + team](), sup ? 1.2 : 1);
      addUnit({ kind: type, team, x: p.x, z: p.z, lane: k, wps: pts, wp: 1, name: (sup ? '超级' : '') + (ranged ? '远程小兵' : '近战小兵'), radius: 0.6, height: 2.4 * (sup ? 1.2 : 1),
        hp: (ranged ? 300 : 550) * m + upg * 12, maxHp: (ranged ? 300 : 550) * m + upg * 12, armor: ranged ? 0 : 2,
        dmgMin: ((ranged ? 21 : 19) + upg) * m, dmgMax: ((ranged ? 26 : 23) + upg) * m, range: ranged ? 10 : 1.4, atkInterval: 1, atkPoint: ranged ? 0.5 : 0.47, proj: ranged ? 18 : 0,
        projColor: team === RAD ? '#7fd7ff' : '#b2ff59', speed: 6.2, gold: Math.round((ranged ? 46 : 37) + Math.random() * 6), xp: ranged ? 69 : 57, facing: team === RAD ? Math.PI * 0.75 : -Math.PI * 0.25 }, model);
    }
  }
  if (G.wave === 1) msg('第一波小兵已出发！三条兵线即将交战', '#ffd54f');
}

// ================= hero =================
function createHero(id) {
  const d = HEROES[id];
  const model = buildModel(id, MODEL_DEFS[id]());
  const ring = new T.Mesh(new T.RingGeometry(0.95, 1.2, 32), new T.MeshBasicMaterial({ color: '#4cff4c', transparent: true, opacity: 0.8, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; model.add(ring);
  const h = addUnit({ kind: 'hero', isHero: true, name: d.name, team: RAD, x: -67, z: 67, radius: d.radius, height: d.height, def: d, level: 1, xp: 0, gold: 600, goldF: 0,
    skills: SKILLS[id].map(s => ({ def: s, lvl: 0, cd: 0 })), items: [null, null, null, null, null, null], range: d.range, atkPoint: d.atkPoint, proj: d.proj, projColor: d.projColor,
    magicRes: 0.25, order: { type: 'idle' }, path: null, repathT: 0, kills: 0, deaths: 0, assists: 0, lh: 0, dn: 0, respawn: 0, callT: 0, callArmor: 0, fiery: 0, fieryT: 0, bkbT: 0, salveT: 0, helixCd: 0, facing: Math.PI * 0.75 }, model);
  recalcHero(h); h.hp = h.maxHp; h.mana = h.maxMana;
  return h;
}
function recalcHero(h) {
  const d = h.def, lv = h.level - 1;
  let bStr = 0, bDmg = 0, bMs = 0, bAs = 0, msPct = 0, bArm = 0;
  for (const it of h.items) if (it) { const D = ITEMS[it.id]; bStr += D.str || 0; bDmg += D.dmg || 0; if (D.ms) bMs = Math.max(bMs, D.ms); }
  h.str = d.str + d.strG * lv + bStr; h.agi = d.agi + d.agiG * lv; h.int = d.int + d.intG * lv;
  const pm = h.maxHp || 0, pmm = h.maxMana || 0;
  h.maxHp = Math.round(200 + h.str * 20); h.maxMana = Math.round(75 + h.int * 12);
  if (pm && pm !== h.maxHp && !h.dead) h.hp = h.hp * h.maxHp / pm;
  if (pmm && pmm !== h.maxMana) h.mana = h.mana * h.maxMana / pmm;
  if (h.callT > 0) bArm += h.callArmor;
  const fs = h.skills.find(s => s.def.id === 'fiery');
  if (fs && fs.lvl > 0 && h.fiery > 0) { bAs += fs.def.as[fs.lvl - 1] * h.fiery; msPct += fs.def.ms[fs.lvl - 1] * h.fiery; }
  let hung = 0; for (const u of units) if (!u.dead && u.hunger && u.hunger.src === h) hung++;
  msPct += 0.12 * hung;
  h.armor = d.armor + h.agi * 0.16 + bArm;
  h.dmgBase = d.dmg + h[d.primary] + bDmg; h.dmgMin = h.dmgBase - 2; h.dmgMax = h.dmgBase + 2;
  h.bonusAS = bAs; h.atkInterval = d.bat / ((100 + h.agi + bAs) / 100);
  h.speed = (d.speed + bMs) * (1 + msPct) * (h.slowT > 0 && !(h.bkbT > 0) ? 1 - h.slowPct : 1);
  h.hpRegen = d.hpRegen + h.str * 0.1; h.manaRegen = d.manaRegen + h.int * 0.05;
}
const skillPoints = h => h.level - h.skills.reduce((a, s) => a + s.lvl, 0);
function canLearn(h, i) {
  const s = h.skills[i]; if (skillPoints(h) <= 0) return false;
  if (s.def.ult) return s.lvl < 3 && h.level >= 6 + s.lvl * 6;
  return s.lvl < 4 && h.level >= s.lvl * 2 + 1;
}
function learnSkill(i) {
  const h = G.player; if (!h || !canLearn(h, i)) return;
  h.skills[i].lvl++; recalcHero(h);
  burst(h.x, 2, h.z, 12, ['#ffd54f', '#fff59d'], 4, 0.6, 0.25, 3);
}
function gainXP(h, amt) {
  if (h.level >= MAX_LEVEL) return;
  h.xp += amt;
  while (h.level < MAX_LEVEL && h.xp >= XP_TABLE[h.level]) {
    h.level++; recalcHero(h);
    h.hp = Math.min(h.maxHp, h.hp + 60);
    for (let i = 0; i < 26; i++) spawnP(h.x + rnd(-1, 1), rnd(0, 1), h.z + rnd(-1, 1), 0, rnd(4, 9), 0, rnd(0.6, 1.1), rnd(0.2, 0.4), ['#ffd54f', '#fff176', '#ffffff'][i % 3]);
    addFloat(h, '升级！ Lv' + h.level, '#ffd54f', 22, 1.6);
    msg(`升到 ${h.level} 级！获得 1 点技能点`, '#ffd54f');
  }
}
function giveGold(amt, at) {
  const P = G.player; P.gold += amt; G.goldEarned += amt;
  if (at) addFloat(at, '+' + amt, '#ffd54f', 16, 1.2, true);
}
function respawnHero(h) {
  h.dead = false; h.x = -67; h.z = 67; h.hp = h.maxHp; h.mana = h.maxMana; h.order = { type: 'idle' }; h.path = null; h.stun = 0; h.slowT = 0;
  h.model.visible = true; h.model.userData.inner.rotation.set(0, 0, 0); h.model.userData.inner.position.y = 0;
  $('death').classList.add('hidden');
  msg('英雄已复活', '#7cdc6a'); G.cam.x = h.x; G.cam.z = h.z - 4;
}

// ================= damage / death =================
function dealDamage(src, tgt, amt, type, o = {}) {
  if (!tgt || tgt.dead || isInvuln(tgt)) return 0;
  let d = amt;
  if (type === 'phys') d *= armorMult(tgt.armor);
  else if (type === 'magic') { if (tgt.bkbT > 0) return 0; d *= 1 - (tgt.magicRes || 0); }
  if (tgt.bkbT > 0) d *= 0.75;
  if (d <= 0) return 0;
  tgt.hp -= d;
  const P = G.player;
  if (src === P && !o.silent) addFloat(tgt, Math.round(d), type === 'phys' ? '#ffffff' : type === 'magic' ? '#82cfff' : '#ffe082', o.big ? 26 : (type === 'phys' ? 14 : 17));
  else if (tgt === P && !o.silent && d >= 1) addFloat(tgt, '-' + Math.round(d), '#ff6e6e', 13);
  if (tgt.hp <= 0) { tgt.hp = 0; killUnit(tgt, src); }
  return d;
}
function killUnit(u, killer) {
  if (u.dead) return;
  u.dead = true; u.target = null; u.windup = 0; u.hunger = null; u.taunt = null;
  const P = G.player;
  if (u.isHero) {
    u.deaths++; u.respawn = 4 + u.level * 1.6; u.order = { type: 'idle' }; u.path = null;
    burst(u.x, 1.5, u.z, 30, ['#c62828', '#7f0000', '#555'], 6, 1, 0.35, 4);
    u.model.visible = false; $('death').classList.remove('hidden');
    msg(`你被${killer && killer.name ? killer.name : '敌人'}击杀了！`, '#ff6b5b');
    for (const x of units) if (x.target === u) x.target = null;
    return;
  }
  if (!u.isBuilding) {
    if (P && killer === P) {
      if (u.team !== P.team) { P.lh++; giveGold(u.gold, u); }
      else { P.dn++; addFloat(u, '!', '#ffffff', 26, 1); }
    }
    if (P && !P.dead && u.team !== P.team && dst(P, u) <= 16) gainXP(P, u.xp * XP_MULT * (killer && killer.team === u.team ? 0.4 : 1));
    burst(u.x, 1, u.z, 8, u.team === RAD ? ['#9aa4ad', '#3fa34d'] : ['#3a2a2e', '#a32020'], 3, 0.7, 0.25, 2);
    corpses.push({ u, t: 0 });
  } else {
    setBlock(u.x, u.z, u.radius - 0.4, false);
    G.score[1 - u.team]++;
    burst(u.x, u.height * 0.5, u.z, 60, u.team === RAD ? ['#d8d2c0', '#3fa34d', '#7dffb0', '#888'] : ['#3a2f33', '#a32020', '#ff4a2a', '#222'], 9, 1.6, 0.6, 6);
    if (u.team !== RAD) { if (u.gold) giveGold(u.gold, u); msg(`我方摧毁了敌方${u.name}！` + (u.gold ? ` +${u.gold} 金` : ''), '#7cdc6a'); }
    else msg(`我方${u.name}被摧毁了！`, '#ff6b5b');
    if (u.kind === 'barracks') { G.superCreeps[1 - u.team][u.lane] = true; msg(`${u.team === RAD ? '敌方' : '我方'}${LANE_CN[u.lane]}将出现超级兵！`, '#ffd54f'); }
    corpses.push({ u, t: 0, building: true });
    if (u.kind === 'ancient') endGame(u.team !== RAD);
  }
  for (const x of units) if (x.target === u) x.target = null;
}

// ================= combat =================
const projMats = {};
function projMat(c) { return projMats[c] || (projMats[c] = new T.MeshBasicMaterial({ color: c })); }
function fireProjectile(src, tgt, o = {}) {
  const m = new T.Mesh(boxG, projMat(o.color || src.projColor || '#fff'));
  const s = o.size || (src.isBuilding ? 0.7 : src.isHero ? 0.5 : 0.35); m.scale.setScalar(s);
  const y = (src.model ? src.model.position.y : 0) + (src.isBuilding ? src.height - 0.6 : src.height * 0.6);
  m.position.set(src.x, y, src.z); scene.add(m);
  projectiles.push({ src, tgt, mesh: m, speed: o.speed || src.proj, onHit: o.onHit, trail: o.trail || (src.isHero ? src.projColor : null) });
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i], m = p.mesh, t = p.tgt;
    const ty = (t.model ? t.model.position.y : 0) + t.height * 0.5;
    const dx = t.x - m.position.x, dy = ty - m.position.y, dz = t.z - m.position.z, d = Math.hypot(dx, dy, dz);
    const step = p.speed * dt;
    if (t.dead && !t.isHero) { scene.remove(m); projectiles.splice(i, 1); continue; }
    if (d <= step + 0.3) {
      scene.remove(m); projectiles.splice(i, 1);
      if (!t.dead) { if (p.onHit) p.onHit(t); else attackLand(p.src, t); }
      continue;
    }
    m.position.x += dx / d * step; m.position.y += dy / d * step; m.position.z += dz / d * step;
    m.rotation.x += dt * 8; m.rotation.y += dt * 6;
    if (p.trail && Math.random() < 0.6) spawnP(m.position.x, m.position.y, m.position.z, rnd(-0.5, 0.5), rnd(0, 1), rnd(-0.5, 0.5), 0.3, 0.2, p.trail);
  }
}
function tryAttack(u, t) {
  u.facing = Math.atan2(t.x - u.x, t.z - u.z);
  if (u.windup <= 0 && u.atkCd <= 0) {
    u.windup = u.atkPoint; u.wtarget = t; u.atkCd = u.atkInterval; u.anim.atk = 1e-4; u.anim.atkDur = Math.min(u.atkInterval * 0.9, u.atkPoint + 0.3);
    if (u.atkPoint <= 0.02) finishWindup(u);
  }
}
function finishWindup(u) {
  const t = u.wtarget; u.windup = 0;
  if (!t || t.dead || u.dead) return;
  if (u.proj > 0) fireProjectile(u, t); else attackLand(u, t);
}
function attackLand(src, tgt) {
  if (tgt.dead || src.dead && !src.isBuilding) return;
  const dmg = rnd(src.dmgMin, src.dmgMax);
  dealDamage(src, tgt, dmg, 'phys');
  if (!src.proj) for (let i = 0; i < 3; i++) spawnP(tgt.x + rnd(-0.3, 0.3), tgt.height * 0.5, tgt.z + rnd(-0.3, 0.3), rnd(-2, 2), rnd(1, 3), rnd(-2, 2), 0.3, 0.15, src.isHero ? '#ffffff' : '#ddd', -10);
  else if (src.isHero) burst(tgt.x, tgt.height * 0.5, tgt.z, 5, ['#ffab40', '#ff6d00', '#ffd180'], 3, 0.35, 0.2, 1, 0);
  if (tgt.isHero && !tgt.dead && tgt.def.id === 'axe') counterHelix(tgt);
}
function findEnemy(u, r, o = {}) {
  let best = null, bs = 1e9;
  for (const e of units) {
    if (e.dead || e.team === u.team || e.kind === 'fountain' || isInvuln(e)) continue;
    if (o.noBuild && e.isBuilding) continue;
    const d = edgeDist(u, e); if (d > r) continue;
    const s = d + (e.isBuilding ? 6 : 0) + (e.isHero ? (o.heroPen || 1.5) : 0);
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
function tryMove(u, nx, nz) {
  if (!isWalk(u.x, u.z)) { u.x = nx; u.z = nz; return true; }
  if (isWalk(nx, nz)) { u.x = nx; u.z = nz; return true; }
  if (isWalk(nx, u.z)) { u.x = nx; return true; }
  if (isWalk(u.x, nz)) { u.z = nz; return true; }
  return false;
}
function moveStep(u, tx, tz, dt, stop = 0) {
  const dx = tx - u.x, dz = tz - u.z, d = Math.hypot(dx, dz);
  if (d <= stop + 0.01) return true;
  const step = Math.min(effSpeed(u) * dt, d - stop);
  tryMove(u, u.x + dx / d * step, u.z + dz / d * step);
  u.moving = true; u.facing = Math.atan2(dx, dz);
  return d - step <= stop + 0.02;
}
function heroNav(h, x, z, dt, stop) {
  if (Math.hypot(x - h.x, z - h.z) <= stop) { h.path = null; return true; }
  h.repathT -= dt;
  if (!h.path || h.repathT <= 0 || Math.hypot(h.pathGoal.x - x, h.pathGoal.z - z) > 1.5) {
    h.repathT = 0.4; h.pathGoal = { x, z };
    h.path = los(h.x, h.z, x, z) ? [{ x, z }] : (findPath(h.x, h.z, x, z) || [{ x, z }]);
  }
  const wp = h.path[0], last = h.path.length === 1;
  if (moveStep(h, wp.x, wp.z, dt, last ? stop : 0)) { if (last) { h.path = null; return true; } h.path.shift(); }
  return false;
}

// ================= skills =================
function lv(sk, k) { const v = sk.def[k]; return Array.isArray(v) ? v[Math.max(0, sk.lvl - 1)] : v; }
function canCast(h, sk) {
  if (h.dead) return '英雄已阵亡';
  if (sk.lvl === 0) return '技能尚未学习';
  if (sk.cd > 0) return '技能冷却中';
  if (h.mana < lv(sk, 'mana')) return '魔法不足';
  if (h.stun > 0) return '眩晕中，无法施法';
  return null;
}
function validSpellTarget(h, u) { return u && !u.dead && u.team !== h.team && !u.isBuilding && !isInvuln(u); }
function validAttackTarget(h, t) {
  if (!t || t.dead || isInvuln(t) || t.kind === 'fountain') return false;
  if (t.team !== h.team) return true;
  return !t.isBuilding && !t.isHero && t.hp < t.maxHp * 0.5; // deny
}
function doCast(h, o) {
  const sk = h.skills[o.idx], d = sk.def, e = canCast(h, sk);
  if (e) { err(e); return false; }
  if (o.target && !validSpellTarget(h, o.target)) { err('无效目标'); return false; }
  h.mana -= lv(sk, 'mana'); sk.cd = lv(sk, 'cd');
  const tx = o.target ? o.target.x : o.x, tz = o.target ? o.target.z : o.z;
  if (tx !== undefined) h.facing = Math.atan2(tx - h.x, tz - h.z);
  h.anim.atk = 1e-4; h.anim.atkDur = 0.45; h.windup = 0;
  SKILL_FX[d.id](h, sk, o);
  // Lina passive
  const fs = h.skills.find(s => s.def.id === 'fiery');
  if (fs && fs.lvl > 0) { h.fiery = Math.min(3, h.fiery + 1); h.fieryT = 10; }
  return true;
}
const SKILL_FX = {
  call(h, sk) {
    const r = sk.def.radius, dur = lv(sk, 'dur'); let n = 0;
    for (const u of units) if (!u.dead && u.team !== h.team && !u.isBuilding && dst(h, u) <= r + u.radius) {
      u.taunt = { src: h, t: dur }; u.target = h; u.windup = 0; n++; addFloat(u, '!', '#ff3b3b', 22, 0.9);
    }
    h.callT = dur; h.callArmor = lv(sk, 'armor');
    ringP(h.x, h.z, 0.8, 36, ['#ff3b3b', '#b71c1c', '#ff8a65'], 0.45, 0.45, 0.6, (r - 0.8) / 0.45);
    ringP(h.x, h.z, 0.8, 24, ['#ff1744', '#d50000'], 0.5, 0.35, 1.6, (r - 0.8) / 0.5);
    addFloat(h, '狂战士之吼！', '#ff5252', 18, 1.2);
  },
  hunger(h, sk, o) {
    const t = o.target; t.hunger = { src: h, t: sk.def.dur, dps: lv(sk, 'dps'), tick: 1 };
    burst(t.x, 2, t.z, 16, ['#ab47bc', '#7b1fa2', '#ff1744'], 3, 0.6, 0.3, 2, 0);
  },
  cull(h, sk, o) {
    const t = o.target, thr = lv(sk, 'thr');
    for (let i = 0; i < 20; i++) { const a = h.facing + (i / 20 - 0.5) * 2; spawnP(h.x + Math.sin(a) * 2.5, 2.5 - i * 0.08, h.z + Math.cos(a) * 2.5, 0, 0, 0, 0.35, 0.4, '#eeeeee'); }
    if (t.hp <= thr) {
      addFloat(t, '淘汰！', '#ff1744', 30, 1.4);
      burst(t.x, 1.5, t.z, 40, ['#b71c1c', '#ff1744', '#880e4f'], 8, 1.0, 0.35, 5);
      dealDamage(h, t, t.hp + 1e6, 'pure', { silent: true }); if (!t.dead) killUnit(t, h);
    } else { dealDamage(h, t, lv(sk, 'dmg'), 'magic', { big: true }); burst(t.x, 1.5, t.z, 16, ['#b71c1c', '#ff5252'], 5, 0.6, 0.3, 3); }
  },
  slave(h, sk, o) {
    let dx = o.x - h.x, dz = o.z - h.z, dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const ox = h.x, oz = h.z, len = sk.def.len, speed = sk.def.speed, dmg = lv(sk, 'dmg'), hit = new Set();
    let trav = 0;
    effects.push({ update(dt) {
      const prev = trav; trav = Math.min(len, trav + speed * dt);
      const w = 3 + trav / len * 2;
      for (const u of units) {
        if (u.dead || u.team === h.team || u.isBuilding || hit.has(u)) continue;
        const rx = u.x - ox, rz = u.z - oz, p = rx * dx + rz * dz, lat = Math.abs(rx * dz - rz * dx);
        if (p >= prev - 1.5 && p <= trav + 0.5 && lat <= w / 2 + u.radius) { hit.add(u); dealDamage(h, u, dmg, 'magic'); burst(u.x, 1.5, u.z, 6, ['#ff6d00', '#ffab00'], 3, 0.4, 0.3, 2, 0); }
      }
      const fx = ox + dx * trav, fz = oz + dz * trav;
      for (let i = 0; i < 9; i++) { const l = rnd(-w / 2, w / 2); spawnP(fx - dz * l, rnd(0.4, 2.2), fz + dx * l, dx * rnd(2, 8), rnd(1, 4), dz * rnd(2, 8), rnd(0.4, 0.8), rnd(0.35, 0.8), ['#ff3d00', '#ff6d00', '#ffab00', '#ffd740'][i % 4]); }
      // dragon head
      spawnP(fx, 1.8, fz, dx * 3, 0, dz * 3, 0.15, 1.3, '#ffea00');
      return trav >= len;
    } });
  },
  lsa(h, sk, o) {
    const x = o.x, z = o.z, r = sk.def.radius, dmg = lv(sk, 'dmg'), stun = lv(sk, 'stun');
    ringP(x, z, r, 40, ['#ffd740', '#ffab00'], 0.55, 0.35, 0.2);
    ringP(x, z, r * 0.5, 20, ['#fff59d'], 0.55, 0.25, 0.2);
    timers.push({ t: 0.5, fn() {
      for (const u of units) if (!u.dead && u.team !== h.team && !u.isBuilding && Math.hypot(u.x - x, u.z - z) <= r + u.radius) {
        dealDamage(h, u, dmg, 'magic'); if (!u.dead && !(u.bkbT > 0)) { u.stun = Math.max(u.stun, stun); u.windup = 0; }
      }
      for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28, rr = Math.sqrt(Math.random()) * r; spawnP(x + Math.cos(a) * rr, rnd(0, 1), z + Math.sin(a) * rr, 0, rnd(6, 16), 0, rnd(0.4, 0.9), rnd(0.3, 0.7), ['#ffffff', '#fff59d', '#ffd740', '#ff9100', '#ff3d00'][i % 5]); }
      burst(x, 0.5, z, 30, ['#ff6d00', '#ffab00'], 10, 0.7, 0.4, 2, -6);
    } });
  },
  laguna(h, sk, o) {
    const t = o.target, dmg = lv(sk, 'dmg');
    const hx = h.x + Math.sin(h.facing) * 0.6, hz = h.z + Math.cos(h.facing) * 0.6, ty = t.height * 0.5;
    beam(hx, 2.4, hz, t.x, ty, t.z, '#ff3d00', 1.3, 0.7);
    beam(hx, 2.4, hz, t.x, ty, t.z, '#ffffff', 0.5, 0.6);
    for (let i = 0; i < 30; i++) { const k = Math.random(); spawnP(hx + (t.x - hx) * k, 2.4 + (ty - 2.4) * k, hz + (t.z - hz) * k, rnd(-2, 2), rnd(-2, 2), rnd(-2, 2), rnd(0.3, 0.7), rnd(0.2, 0.45), ['#ffffff', '#ffccbc', '#ff3d00'][i % 3]); }
    timers.push({ t: 0.25, fn() { if (!t.dead) { dealDamage(h, t, dmg, 'magic', { big: true }); burst(t.x, ty, t.z, 40, ['#ffffff', '#ff3d00', '#ffab00'], 8, 0.8, 0.4, 3); } } });
  },
};
function counterHelix(h) {
  const sk = h.skills.find(s => s.def.id === 'helix');
  if (!sk || sk.lvl === 0 || h.helixCd > 0 || Math.random() > sk.def.chance) return;
  h.helixCd = 0.3; h.anim.spin = 0.35;
  const dmg = lv(sk, 'dmg'), r = sk.def.radius;
  for (const u of units) if (!u.dead && u.team !== h.team && !u.isBuilding && dst(h, u) <= r + u.radius) dealDamage(h, u, dmg, 'pure');
  for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; spawnP(h.x + Math.cos(a) * 1.6, 1.4, h.z + Math.sin(a) * 1.6, Math.cos(a) * 8, rnd(0, 1), Math.sin(a) * 8, 0.35, 0.3, ['#e0e0e0', '#b71c1c', '#ff5252'][i % 3]); }
}
function beam(ax, ay, az, bx, by, bz, color, thick, life) {
  const len = Math.hypot(bx - ax, by - ay, bz - az);
  const mat = new T.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, blending: T.AdditiveBlending });
  const m = new T.Mesh(boxG, mat); m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); m.scale.set(thick, thick, len); m.lookAt(bx, by, bz); scene.add(m);
  let t = 0;
  effects.push({ update(dt) { t += dt; const k = t / life; mat.opacity = Math.max(0, 1 - k); m.scale.x = m.scale.y = thick * (1 + Math.sin(t * 40) * 0.15) * (1 - k * 0.6); if (k >= 1) { scene.remove(m); mat.dispose(); return true; } return false; } });
}

// ================= items =================
function useItem(h, slot, o) {
  const it = h.items[slot]; if (!it) return;
  const D = ITEMS[it.id];
  if (!D.active) { err('该物品没有主动效果'); return; }
  if (h.dead) { err('英雄已阵亡'); return; }
  if (it.cd > 0) { err('物品冷却中'); return; }
  if (D.id === 'blink') {
    let dx = o.x - h.x, dz = o.z - h.z, d = Math.hypot(dx, dz);
    if (d > D.range) { dx *= D.range / d; dz *= D.range / d; }
    let nx = clamp(h.x + dx, -73, 73), nz = clamp(h.z + dz, -73, 73);
    if (!isWalk(nx, nz)) { const c = nearestWalkCell(cellOf(nx), cellOf(nz)); if (c) { nx = cc(c[0]); nz = cc(c[1]); } }
    burst(h.x, 1.5, h.z, 26, ['#7c4dff', '#b388ff', '#ffffff'], 5, 0.6, 0.3, 2, 0);
    h.x = nx; h.z = nz; h.path = null; h.order = { type: 'idle' }; h.windup = 0;
    if (h.model) h.model.position.set(nx, heightAt(nx, nz), nz);
    burst(nx, 1.5, nz, 26, ['#7c4dff', '#b388ff', '#ffffff'], 5, 0.6, 0.3, 2, 0);
  } else if (D.id === 'salve') {
    h.salveT = 10; h.items[slot] = null; recalcHero(h); burst(h.x, 1.5, h.z, 14, ['#66bb6a', '#a5d6a7'], 2, 0.8, 0.25, 3, 0);
    return;
  } else if (D.id === 'bkb') {
    h.bkbT = D.dur; h.stun = 0; h.slowT = 0; burst(h.x, 2, h.z, 40, ['#ffd54f', '#ffecb3', '#ffffff'], 5, 0.8, 0.3, 4, 0); addFloat(h, '天神下凡！', '#ffd54f', 18, 1.2);
  }
  it.cd = D.cd;
}
function buyItem(id) {
  const h = G.player, D = ITEMS[id]; if (!h) return;
  if (h.gold < D.cost) { err('金钱不足'); return; }
  const slot = h.items.indexOf(null); if (slot < 0) { err('物品栏已满'); return; }
  h.gold -= D.cost; h.items[slot] = { id, cd: 0 }; recalcHero(h);
  msg(`购买了 ${D.name}`, '#ffd54f');
}
function sellItem(slot) {
  const h = G.player, it = h.items[slot]; if (!it) return;
  const v = Math.floor(ITEMS[it.id].cost / 2); h.gold += v; h.items[slot] = null; recalcHero(h); msg(`出售 ${ITEMS[it.id].name}，获得 ${v} 金`, '#ffd54f');
}
