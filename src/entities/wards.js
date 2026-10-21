// entities/wards.js — 侦察守卫 Observer / 岗哨守卫 Sentry wards: units with kind 'ward', isWard, ward: 'obs'|'sentry'.
// Always invisible to enemies (MODS.wardInvis, no fade); only true sight (sentry, dust) or reveal shows them.
// Observer: vision source (vision/fog.js visionRadius) for 6 min. Sentry: true sight radius 9 (canSee → sentrySees) for 7 min.
// Only hero attacks hurt wards (1 HP per hit: dealDamage); creeps/towers/spells ignore them. Kill = small bounty, deny = half.
// Enemy teams that SEE a ward being placed remember the spot (G.wardIntel[team]: [{x, z, t}]) — bots use it for sentries.
const WARD_TYPES = {
  obs: { name: '侦察守卫', hp: 3, life: 360, vision: 16, ts: 0, gold: 50, color: '#ffd54f', glow: '#fff59d' },
  sentry: { name: '岗哨守卫', hp: 3, life: 420, vision: 4, ts: 9, gold: 30, color: '#29b6f6', glow: '#b3e5fc' },
};
MODS.wardInvis = { id: 'ward_invis', invis: true };
const liveWards = (team, type) => units.filter(u => u.isWard && !u.dead && (team === undefined || u.team === team) && (!type || u.ward === type));
function wardModel(type) {
  const W = WARD_TYPES[type];
  return buildModel('ward_' + type, {
    pole: { p: [0, 0, 0], b: [[0, 0.65, 0, 0.18, 1.3, 0.18, '#5d4037'], [0, 0.05, 0, 0.6, 0.1, 0.6, '#4e342e']] },
    eye: { p: [0, 1.55, 0], b: [[0, 0, 0, 0.62, 0.5, 0.62, W.color]], g: [[0, 0, 0.32, 0.3, 0.26, 0.04, W.glow], [0, 0, -0.32, 0.3, 0.26, 0.04, W.glow]] },
  });
}
function placeWard(h, type, pt) {
  const W = WARD_TYPES[type]; let x = pt.x, z = pt.z;
  if (!isWalk(x, z)) { const c = nearestWalkCell(cellOf(x), cellOf(z)); if (!c) return null; x = cc(c[0]); z = cc(c[1]); }
  const u = addUnit({ kind: 'ward', isWard: true, ward: type, name: W.name, team: h.team, x, z, hp: W.hp, maxHp: W.hp, radius: 0.45, height: 1.9,
    dmgMin: 0, dmgMax: 0, range: 0, speed: 0, owner: h.id, expire: G.time + W.life, gold: W.gold, xp: 0 }, wardModel(type));
  addModifier(u, MODS.wardInvis, u, { data: { fade: 0 } });
  emit('wardPlaced', { unit: u.id, ward: type, team: h.team, x: +x.toFixed(1), z: +z.toFixed(1), by: h.id });
  const en = 1 - h.team;
  if (FOG.off || visAt(en, x, z) || visAt(en, h.x, h.z)) ((G.wardIntel || (G.wardIntel = [[], []]))[en]).push({ x, z, t: G.time, type });
  AB.ringP(x, z, 0.5, 14, [W.color, W.glow], 0.5, 0.2, 0.3, 3);
  return u;
}
// sentry true sight: invisible unit u is visible to `team` if within a live sentry's radius
function sentrySees(team, u) {
  for (const w of units) if (w.isWard && !w.dead && w.team === team && w.ward === 'sentry' && Math.hypot(w.x - u.x, w.z - u.z) <= WARD_TYPES.sentry.ts) return true;
  return false;
}
function tickWards() {
  for (const u of units) if (u.isWard && !u.dead && G.time >= u.expire) { emit('wardExpire', { unit: u.id, ward: u.ward, team: u.team }); killUnit(u, null); }
  if (G.wardIntel) for (let t = 0; t < 2; t++) G.wardIntel[t] = G.wardIntel[t].filter(w => G.time - w.t < 360);
}
function wardDeath(u, killer) {
  const W = WARD_TYPES[u.ward], deny = !!killer && killer.team === u.team;
  if (killer && killer.isHero) giveGold(deny ? W.gold / 2 : W.gold, u, killer);
  emit('wardKill', { unit: u.id, ward: u.ward, team: u.team, killer: killer ? killer.id : 0, deny });
  if (killer === G.player) msg(deny ? `反补了${W.name}` : `摧毁了敌方${W.name}！+${W.gold} 金`, '#ffd54f');
  else if (killer && u.team === RAD && !deny) msg(`我方${W.name}被摧毁了`, '#ff6b5b');
  if (G.wardIntel) G.wardIntel[1 - u.team] = G.wardIntel[1 - u.team].filter(w => Math.hypot(w.x - u.x, w.z - u.z) > 3);
  corpses.push({ u, t: 0 });
}
