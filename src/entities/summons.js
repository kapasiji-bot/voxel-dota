// entities/summons.js — summoned units owned by a hero (treants, wolves, Spirit Bear). Registry SUMMON_TYPES (registerSummon).
// Type def: {id, name, hp, armor, dmg:[min,max], bat, range, proj, projColor, speed, radius, height, gold, xp, vision, magicRes,
//   atkPoint, backswing, model(team, o) → buildModel def, portrait {headY}, abilities?: [ability defs] (passives / castable, lvl = o.lvl),
//   onDeath(u, killer), push (bots send it down the lane), quad (4-legged animation), split: {after: n attacks} (Eidolons: one full-HP
//   copy after n attacks, once per original line), stationary (never moves: wards)}.
// spawn o.channel: lives only while the owner keeps channelling the ability that spawned it (Death Ward). o.invuln: untargetable.
// Units: kind 'summon', isSummon, owner (hero), controllable, expire (G.time, 0 = permanent), order/path like heroes (run by heroAI).
// Kills by summons/illusions credit the owner (gold, last hits, hero-kill credit). Events: summon{unit,owner,type}, summonDeath{unit,owner,killer,expired}.
const SUMMON_TYPES = {};
const SUMMON_INVULN = { id: 'summon_invuln', states: ['invulnerable'] };
function registerSummon(def) { SUMMON_TYPES[def.id] = def; }
const isOwned = u => !!(u.isSummon || u.isIllusion);   // wards also carry .owner but are not units of the hero
const ownerOf = u => u ? (u.isHero ? u : (isOwned(u) && u.owner) || null) : null;   // the hero behind a unit (summons / illusions)
const ownedUnits = (h, pred) => units.filter(u => !u.dead && isOwned(u) && u.owner === h && (!pred || pred(u)));
// o: {lvl, hp, dmg:[min,max], armor, speed, dur (s), control (default true), gold, xp, variant (model cache key), stats{...}}
function spawnSummon(owner, type, x, z, o = {}) {
  const d = SUMMON_TYPES[type], dmg = o.dmg || d.dmg, key = 'summon_' + type + (o.variant || '') + owner.team;
  const model = buildModel(key, d.model(owner.team, o));
  const ring = new T.Mesh(new T.RingGeometry(d.radius + 0.15, d.radius + 0.35, 24), new T.MeshBasicMaterial({ color: owner.ringColor || (owner.team === RAD ? '#4cff4c' : '#ff4040'), transparent: true, opacity: 0.55, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; model.add(ring);
  const p = AB.clampPoint(owner, { x, z }, 0);
  const u = addUnit(Object.assign({ kind: 'summon', isSummon: true, sdef: d, type, name: d.name, owner, team: owner.team, x: p.x, z: p.z, facing: owner.facing,
    radius: d.radius, height: d.height, hp: o.hp || d.hp, maxHp: o.hp || d.hp, armor: o.armor !== undefined ? o.armor : d.armor, dmgMin: dmg[0], dmgMax: dmg[1],
    atkInterval: d.bat || 1.4, range: d.range || 2, proj: d.proj || 0, projColor: d.projColor, speed: o.speed || d.speed, atkPoint: d.atkPoint || 0.35, backswing: d.backswing || 0.4,
    magicRes: d.magicRes || 0, gold: o.gold !== undefined ? o.gold : d.gold, xp: o.xp !== undefined ? o.xp : d.xp, visionR: d.vision || 14, controllable: o.control !== false,
    expire: o.dur ? G.time + o.dur : 0, ringMesh: ring, order: { type: 'idle' }, path: null, repathT: 0, dmgBy: {}, level: o.lvl || 1,
    abilities: (d.abilities || []).map(a => ({ def: a, lvl: o.lvl || 1, cd: 0, cdMax: 1 })), spawnO: o, chan: o.channel ? owner.channel : null, atkN: 0, noSplit: !!o.noSplit }, o.stats || {}), model);
  if (o.invuln) addModifier(u, SUMMON_INVULN, u);
  emit('summon', { unit: u.id, owner: owner.id, stype: type });
  burst(u.x, 1, u.z, 14, d.fx || ['#a5d6a7', '#ffffff'], 4, 0.5, 0.25, 2);
  return u;
}
function tickSummons() {
  for (const u of units) {
    if (u.dead || !isOwned(u)) continue;
    if ((u.expire && G.time >= u.expire) || (u.owner.dead && u.sdef && u.sdef.dieWithOwner) || (u.chan && u.owner.channel !== u.chan)) { u.expired = true; killUnit(u, null); continue; }
  }
}
// split summons (sdef.split): after `after` landed attacks the summon spawns a full-HP copy of itself (the copy never splits)
function summonSplit(u) {
  const sp = u.sdef.split; if (!sp || u.noSplit || ++u.atkN < sp.after) return;
  u.noSplit = true; u.hp = u.maxHp;
  const a = Math.random() * 6.28, c = spawnSummon(u.owner, u.type, u.x + Math.cos(a) * 1.5, u.z + Math.sin(a) * 1.5, Object.assign({}, u.spawnO, { noSplit: true, dur: u.expire ? u.expire - G.time : 0 }));
  if (u.order && u.order.target) issueOrder(c, { type: 'attack', target: u.order.target });
  emit('summonSplit', { unit: u.id, copy: c.id, stype: u.type });
}
function updateUnitTimers(u, dt) { if (u.abilities) for (const ab of u.abilities) if (ab.cd > 0) ab.cd = Math.max(0, ab.cd - dt); if (u.hpRegen && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.hpRegen * dt); }
// killUnit branch (combat/damage.js) for summons and illusions
function ownedDeath(u, killer) {
  const kh = ownerOf(killer), exp = !!u.expired;
  if (u.isSummon) {
    if (!exp && kh && kh.team !== u.team) { if (u.gold) giveGold(u.gold, u, kh); shareXP(u.team, u.x, u.z, 16, (u.xp || 0) * XP_MULT); }
    if (u.sdef.onDeath) u.sdef.onDeath(u, killer);
    emit('summonDeath', { unit: u.id, owner: u.owner.id, stype: u.type, killer: killer ? killer.id : 0, expired: exp });
    burst(u.x, 1, u.z, 10, ['#795548', '#a5d6a7', '#555'], 3, 0.6, 0.25, 2); corpses.push({ u, t: 0 });
  } else {
    emit('illusionDeath', { unit: u.id, owner: u.owner.id, killer: killer ? killer.id : 0, expired: exp });
    burst(u.x, 1.5, u.z, 22, ['#80d8ff', '#e1f5fe', '#ffffff'], 5, 0.6, 0.3, 2, 0); u.model.visible = false; corpses.push({ u, t: 1.98 });
  }
  if (CTL.sel.includes(u)) ctlPrune();   // ui/control.js
}
