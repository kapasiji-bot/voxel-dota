// entities/buildings.js — towers (tiers 1-4), barracks, ancients, fountains + invulnerability chain.
const BDEF = { tower: towerDef, barracks: barracksDef, ancient: ancientDef, fountain: fountainDef };
const TOWER_TIERS = { 1: { hp: 1800, armor: 12, dmg: 100, gold: 180 }, 2: { hp: 2100, armor: 14, dmg: 125, gold: 220 }, 3: { hp: 2400, armor: 16, dmg: 145, gold: 250 }, 4: { hp: 2400, armor: 16, dmg: 145, gold: 250 } };
function makeBuilding(kind, team, x, z, o) {
  const model = buildModel(kind + team, BDEF[kind](team));
  const u = addUnit(Object.assign({ kind, team, x, z, isBuilding: true, facing: Math.atan2(-x, -z), backswing: 0.3 }, o), model);
  u.model.rotation.y = Math.round(u.facing / (Math.PI / 2)) * (Math.PI / 2);
  setBlock(x, z, u.radius - 0.4, true);
  return u;
}
function setupBuildings() {
  const tierCN = ['', '一', '二', '三', '四'];
  for (const team of [RAD, DIRE]) {
    const sg = team === RAD ? 1 : -1, t3s = [];
    const pc = team === RAD ? '#a6ffcf' : '#ff7043';
    const tower = (k, tier, p) => { const s = TOWER_TIERS[tier]; return makeBuilding('tower', team, p.x, p.z, { name: (k ? LANE_CN[k] : '基地') + tierCN[tier] + '塔', tier, lane: k, hp: s.hp, maxHp: s.hp, armor: s.armor, dmgMin: s.dmg - 8, dmgMax: s.dmg + 8, range: 14, atkInterval: 1, atkPoint: 0, proj: 26, projColor: pc, radius: 1.8, height: 7.6, gold: s.gold }); };
    for (const k of LANE_KEYS) {
      const L = lanes[k];
      const t1 = tower(k, 1, placeOnLane(k, team, L.len * 0.40, 4));
      const t2 = tower(k, 2, placeOnLane(k, team, L.len * 0.27, 4));
      const t3 = tower(k, 3, placeOnLane(k, team, k === 'mid' ? 22 : 24, 4));
      const bp = placeOnLane(k, team, k === 'mid' ? 15 : 16, 5);
      const br = makeBuilding('barracks', team, bp.x, bp.z, { name: LANE_CN[k] + '兵营', lane: k, hp: 1800, maxHp: 1800, armor: 10, radius: 2.8, height: 4.5, gold: 160 });
      t2.req = [t1]; t3.req = [t2]; br.req = [t3]; t3s.push(t3);
    }
    const a1 = tower(null, 4, { x: -54 * sg, z: 62 * sg }), a2 = tower(null, 4, { x: -62 * sg, z: 54 * sg });
    a1.reqAny = t3s; a2.reqAny = t3s;
    const anc = makeBuilding('ancient', team, -62 * sg, 62 * sg, { name: TEAM_NAME[team] + '遗迹', hp: 5000, maxHp: 5000, armor: 13, radius: 4.5, height: 10.5, gold: 0 });
    anc.req = [a1, a2]; G.ancients[team] = anc;
    G.fountains[team] = makeBuilding('fountain', team, -71 * sg, 71 * sg, { name: TEAM_NAME[team] + '泉水', hp: 1, maxHp: 1, radius: 3, height: 4, range: 15, dmgMin: 170, dmgMax: 190, atkInterval: 0.4, atkPoint: 0, backswing: 0.1, proj: 34, projColor: pc });
  }
}
