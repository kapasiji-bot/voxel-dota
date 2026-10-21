// entities/illusions.js — illusions of a hero (Naga Siren's Mirror Image). An illusion copies the hero's model, name, level, HP %,
// stats and learned abilities (passive hooks such as Rip Tide fire from it; it cannot cast), but is NOT in G.heroes:
// kind 'illusion', isIllusion, owner, illuOut (damage dealt multiplier), illuIn (damage taken multiplier), expire.
// Enemies see it exactly like the hero (same model, health bar, minimap icon); the owner's team sees it tinted blue
// (render/fogrender.js). Death gives no bounty. o: {x, z, dur, out (0.35), inc (3.5), hpPct}
function makeIllusion(h, o = {}) {
  const d = h.def, model = buildModel(d.id, d.model());
  const ring = new T.Mesh(new T.RingGeometry(0.95, 1.2, 32), new T.MeshBasicMaterial({ color: h.ringColor, transparent: true, opacity: 0.8, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; model.add(ring);
  const p = AB.clampPoint(h, { x: o.x !== undefined ? o.x : h.x, z: o.z !== undefined ? o.z : h.z }, 0), hpk = o.hpPct !== undefined ? o.hpPct : h.hp / h.maxHp;
  const u = addUnit({ kind: 'illusion', isIllusion: true, owner: h, def: d, heroId: d.id, name: h.name, team: h.team, x: p.x, z: p.z, facing: h.facing,
    radius: h.radius, height: h.height, level: h.level, hp: h.maxHp * hpk, maxHp: h.maxHp, mana: h.mana, maxMana: h.maxMana,
    armor: h.armor, dmgMin: h.dmgMin, dmgMax: h.dmgMax, dmgBase: h.dmgBase, str: h.str, agi: h.agi, int: h.int, atkInterval: h.atkInterval, atkSpeedMult: h.atkSpeedMult,
    range: h.range, atkPoint: h.atkPoint, backswing: h.backswing, proj: h.proj, projColor: h.projColor, speed: h.speed, magicRes: h.magicRes, hpRegen: h.hpRegen * 0.5,
    base: { hpRegen: h.hpRegen * 0.5, armor: h.armor, speed: h.speed, dmgMin: h.dmgMin, dmgMax: h.dmgMax, bat: d.stats.bat, as: Math.round(h.atkSpeedMult * 100 - 100), magicRes: h.magicRes },
    illuOut: o.out !== undefined ? o.out : 0.35, illuIn: o.inc !== undefined ? o.inc : 3.5, expire: G.time + (o.dur || 25), controllable: true,
    abilities: h.abilities.map(a => ({ def: a.def, lvl: a.lvl, cd: 0, cdMax: 1 })), items: h.items.map(it => it && { id: it.id, def: it.def, cd: 0, charges: 0 }),
    order: { type: 'idle' }, path: null, repathT: 0, dmgBy: {}, ringColor: h.ringColor, ringMesh: ring }, model);
  if (h.form && h.formDef) setForm(u, h.form, h.formDef(), h.formScale);   // copy a shapeshift (wolf / bear form)
  emit('illusion', { unit: u.id, owner: h.id });
  return u;
}
const illusionsOf = h => ownedUnits(h, u => u.isIllusion);
