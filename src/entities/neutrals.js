// entities/neutrals.js — B8 neutral creep camps (team NEUTRAL = 2). Camp spots: map/jungle.js; AI: ai/neutral.js; models:
// render/neutralmodels.js. Rules (DOTA-like):
//   • every full minute (first at 1:00) a camp spawns again if it is EMPTY (no neutral inside its spawn box) and NOT BLOCKED
//     (no other unit — hero, summon, ward, courier — inside the box). Neutrals pulled out of the box at the minute mark do not
//     count, so a second group spawns on top of them → stacking works naturally.
//   • bounty: gold to the killing hero (owner for summons / illusions; counts as a last hit), XP shared by the KILLER'S team
//     only. No bounty when a lane creep / tower kills a neutral. Emits neutralKill / campSpawn / campBlocked.
const NEUTRAL_TYPES = {   // hp, armor, dmg [min, max], range (0 = melee 1.3), proj speed, gold, xp, ab (ai/neutral.js), r radius, h height, s model scale
  kobold:         { name: '狗头人', hp: 240, armor: 0, dmg: [10, 12], gold: 14, xp: 25, r: 0.45, h: 1.5, speed: 5.4 },
  kobold_foreman: { name: '狗头人工头', hp: 400, armor: 1, dmg: [16, 19], gold: 22, xp: 35, r: 0.5, h: 1.7, s: 1.15, speed: 5.4 },
  wolf:           { name: '巨狼', hp: 450, armor: 1, dmg: [20, 24], gold: 26, xp: 50, r: 0.55, h: 1.5, speed: 6.4 },
  alpha_wolf:     { name: '头狼', hp: 650, armor: 2, dmg: [28, 33], gold: 36, xp: 70, r: 0.65, h: 1.8, speed: 6.4, ab: 'crit' },
  satyr:          { name: '萨特放逐者', hp: 320, armor: 0, dmg: [14, 18], range: 8, proj: 16, projColor: '#b388ff', gold: 22, xp: 40, r: 0.5, h: 2.0, ab: 'purge' },
  satyr_big:      { name: '萨特苦难使者', hp: 900, armor: 2, dmg: [30, 36], gold: 45, xp: 90, r: 0.6, h: 2.3, s: 1.2, ab: 'shock' },
  centaur:        { name: '半人马猎手', hp: 450, armor: 1, dmg: [18, 22], gold: 25, xp: 45, r: 0.7, h: 2.2, speed: 6.0 },
  centaur_khan:   { name: '半人马征服者', hp: 1100, armor: 3, dmg: [40, 48], gold: 60, xp: 120, r: 0.85, h: 2.8, ab: 'stomp' },
  drake:          { name: '远古黑蜉蝣', hp: 950, armor: 2, dmg: [32, 38], range: 7, proj: 15, projColor: '#ff9100', gold: 50, xp: 110, r: 0.8, h: 2.0 },
  dragon:         { name: '远古黑龙', hp: 2000, armor: 4, dmg: [65, 75], range: 8, proj: 14, projColor: '#ff3d00', gold: 120, xp: 250, r: 1.1, h: 2.6, ab: 'splash' },
  golem:          { name: '远古岩石傀儡', hp: 800, armor: 3, dmg: [30, 36], gold: 40, xp: 100, r: 0.8, h: 2.6, s: 0.8, speed: 5.2 },
  golem_big:      { name: '远古花岗岩傀儡', hp: 1900, armor: 5, dmg: [60, 70], gold: 115, xp: 240, r: 1.1, h: 3.4, s: 1.1, speed: 5.2, ab: 'stomp' },
};
const CAMP_KINDS = {
  kobold: ['kobold', 'kobold', 'kobold_foreman'], wolf: ['wolf', 'wolf', 'alpha_wolf'], satyr: ['satyr', 'satyr', 'satyr_big'],
  centaur: ['centaur', 'centaur', 'centaur_khan'], dragon: ['drake', 'drake', 'dragon'], golem: ['golem', 'golem', 'golem_big'],
};
const CAMP_CN = { small: '小型野怪营地', medium: '中型野怪营地', large: '大型野怪营地', ancient: '远古野怪营地' };
const CAMP_OFF = [[0, 1.4], [1.4, -0.9], [-1.4, -0.9], [0, -2]];
const jg = () => G.jg || (G.jg = { nextCamp: 60, camps: JUNGLE.camps.map(c => Object.assign({ units: [], spawns: 0, blocked: 0 }, c)), farm: [0, 0], nkills: 0 });
function spawnNeutral(type, camp, x, z) {
  const S = NEUTRAL_TYPES[type];
  const model = buildModel('neu_' + type, NEUTRAL_MODELS[type](), S.s || 1);
  return addUnit({ kind: 'neutral', team: NEUTRAL, isNeutral: true, nt: type, camp, hx: x, hz: z, x, z, name: S.name, radius: S.r || 0.6, height: S.h || 2,
    hp: S.hp, maxHp: S.hp, armor: S.armor, dmgMin: S.dmg[0], dmgMax: S.dmg[1], range: S.range || 1.3, atkInterval: 1.25, atkPoint: 0.4, backswing: 0.45,
    proj: S.proj || 0, projColor: S.projColor, speed: S.speed || 5.6, gold: S.gold, xp: S.xp, facing: rnd(0, 6.28), abCd: rnd(1, 3), path: null, repathT: 0, onHit: S.ab === 'crit' || S.ab === 'splash' ? neutralOnHit : null }, model);
}
// units of this camp's own neutrals inside the spawn box / any other unit blocking it
const campOccupied = c => units.some(u => !u.dead && u.isNeutral && !u.isRoshan && Math.hypot(u.x - c.x, u.z - c.z) < CAMP_BOX);
const campBlocker = c => units.find(u => !u.dead && !u.isNeutral && !u.isBuilding && !u.isCourier && Math.hypot(u.x - c.x, u.z - c.z) < CAMP_BOX + (u.radius || 0)) || null;
function spawnCamp(c) {
  const list = CAMP_KINDS[c.kind], rot = rnd(0, 6.28), cs = Math.cos(rot), sn = Math.sin(rot);
  c.units = c.units.filter(u => !u.dead);
  list.forEach((t, i) => { const [ox, oz] = CAMP_OFF[i]; c.units.push(spawnNeutral(t, c, c.x + ox * cs - oz * sn, c.z + ox * sn + oz * cs)); });
  c.spawns++; emit('campSpawn', { camp: c.id, kind: c.kind, n: list.length, stack: c.units.length > list.length });
}
function tickCamps() {
  const J = jg(); if (G.time < J.nextCamp) return;
  J.nextCamp += 60;
  for (const c of J.camps) {
    if (campOccupied(c)) continue;
    const b = campBlocker(c);
    if (b) { c.blocked++; emit('campBlocked', { camp: c.id, by: b.id }); continue; }
    spawnCamp(c);
  }
}
function neutralDeath(u, killer) {
  const kh = ownerOf(killer), J = jg();
  if (kh) {
    kh.lh++; giveGold(u.gold, u, kh); kh.neutralGold = (kh.neutralGold || 0) + u.gold; kh.nkills = (kh.nkills || 0) + 1;
    J.farm[kh.team] += u.gold; J.nkills++;
    shareXP(1 - kh.team, u.x, u.z, 16, u.xp * XP_MULT);   // shareXP excludes the given team → only the killer's team
  }
  emit('neutralKill', { unit: u.id, type: u.nt, camp: u.camp ? u.camp.id : '', killer: kh ? kh.id : 0, team: kh ? kh.team : -1, gold: kh ? u.gold : 0 });
  burst(u.x, 1, u.z, 10, ['#8d6e63', '#a1887f', '#ffd54f'], 3, 0.7, 0.25, 2);
  corpses.push({ u, t: 0 });
}
