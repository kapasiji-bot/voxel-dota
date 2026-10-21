// entities/creeps.js — lane creep stats, wave spawning (every 30 s, 3 melee + 1 ranged per lane per team).
const CREEP_STATS = {
  melee: { name: '近战小兵', hp: 550, armor: 2, dmgMin: 19, dmgMax: 23, range: 1.4, atkPoint: 0.47, backswing: 0.53, proj: 0, gold: 37, xp: 57 },
  ranged: { name: '远程小兵', hp: 300, armor: 0, dmgMin: 21, dmgMax: 26, range: 10, atkPoint: 0.5, backswing: 0.5, proj: 18, gold: 46, xp: 69 },
};
function spawnCreep(type, team, lane, x, z, o = {}) {
  const S = CREEP_STATS[type], sup = !!o.super, m = sup ? 1.5 : 1, upg = o.upg || 0;
  const pts = team === RAD ? lanes[lane].pts : lanes[lane].pts.slice().reverse();
  const model = buildModel(type + team, CREEP_MODELS[type + team](), sup ? 1.2 : 1);
  return addUnit({ kind: type, team, x, z, lane, wps: pts, wp: o.wp || 1, name: (sup ? '超级' : '') + S.name, radius: 0.6, height: 2.4 * (sup ? 1.2 : 1),
    hp: S.hp * m + upg * 12, maxHp: S.hp * m + upg * 12, armor: S.armor, dmgMin: (S.dmgMin + upg) * m, dmgMax: (S.dmgMax + upg) * m, range: S.range,
    atkInterval: 1, atkPoint: S.atkPoint, backswing: S.backswing, proj: S.proj, projColor: team === RAD ? '#7fd7ff' : '#b2ff59', speed: 6.2,
    gold: Math.round(S.gold + Math.random() * 6), xp: S.xp, facing: team === RAD ? Math.PI * 0.75 : -Math.PI * 0.25 }, model);
}
function spawnWave() {
  G.wave++;
  const upg = Math.floor(G.time / 300);
  for (const team of [RAD, DIRE]) for (const k of LANE_KEYS) for (let i = 0; i < 4; i++) {
    const p = placeOnLane(k, team, 10 - i * 1.5, (i % 2 ? 0.9 : -0.9));
    spawnCreep(i === 3 ? 'ranged' : 'melee', team, k, p.x, p.z, { super: G.superCreeps[team][k], upg });
  }
  emit('wave', { n: G.wave });
  if (G.wave === 1) msg('第一波小兵已出发！三条兵线即将交战', '#ffd54f');
}
