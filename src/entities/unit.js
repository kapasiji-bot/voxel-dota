// entities/unit.js — generic unit record, stat refresh from base stats + modifiers, small queries.
// Unit fields: id, kind ('hero'|'melee'|'ranged'|'tower'|'barracks'|'ancient'|'fountain'), team, x, z, facing,
//   radius, height, hp/maxHp, mana/maxMana, base{armor,speed,dmgMin,dmgMax,bat,as}, effective armor/speed/dmgMin/dmgMax/atkInterval/atkSpeedMult,
//   range, atkPoint, backswing, proj (projectile speed, 0 = melee), atk (attack-cycle state), atkCd, mods[], model, parts
let UID = 1;
function addUnit(o, model) {
  const u = Object.assign({ id: UID++, x: 0, z: 0, facing: 0, radius: 0.6, hp: 100, maxHp: 100, mana: 0, maxMana: 0, armor: 0, dmgMin: 10, dmgMax: 12,
    range: 2, atkInterval: 1, atkSpeedMult: 1, atkPoint: 0.3, backswing: 0.3, proj: 0, speed: 6, atkCd: 0, atk: null, casting: null, target: null, dead: false,
    isBuilding: false, height: 2, moving: false, mods: [], anim: { walk: 0, spin: 0, cast: 0 }, magicRes: 0, missChance: 0, evasion: 0, acq: Math.random() * 0.3, hpRegen: 0 }, o);
  if (!u.base) u.base = { armor: u.armor, speed: u.speed, dmgMin: u.dmgMin, dmgMax: u.dmgMax, bat: u.atkInterval, as: 0, magicRes: u.magicRes };
  u.model = model || null;
  if (model) {
    model.position.set(u.x, heightAt(u.x, u.z), u.z); model.rotation.y = u.facing; scene.add(model); u.parts = model.userData.parts;
    for (const k in u.parts) u.parts[k].userData.p0 = u.parts[k].position.clone();
  }
  units.push(u); if (typeof FOG !== 'undefined') FOG.dirty = true; return u;
}
const _props = {};
function gatherProps(u) { for (const k in _props) _props[k] = 0; return modProps(u, _props); }
// recompute effective stats for non-hero units (heroes: refreshHero in entities/hero.js)
function refreshUnit(u) {
  if (u.isHero) return refreshHero(u);
  if (!u.mods.length && !u._modded) return;
  const P = gatherProps(u), b = u.base;
  u.armor = b.armor + (P.armor || 0);
  u.speed = Math.max(0.5, b.speed * (1 + (P.msPct || 0)) + (P.ms || 0));
  u.dmgMin = b.dmgMin + (P.dmg || 0); u.dmgMax = b.dmgMax + (P.dmg || 0);
  u.atkSpeedMult = (100 + b.as + (P.as || 0)) / 100; u.atkInterval = b.bat / u.atkSpeedMult;
  u.dmgTakenPct = P.dmgTakenPct || 0; u.hpRegen = (b.hpRegen || 0) + (P.hpRegen || 0);
  if (P.dmgPct) { u.dmgMin += b.dmgMin * P.dmgPct; u.dmgMax += b.dmgMax * P.dmgPct; }
  u.magicRes = 1 - (1 - (b.magicRes || 0)) * (1 - (P.magicRes || 0)); u.missChance = P.miss || 0; u.evasion = P.evasion || 0;
  u._modded = u.mods.length > 0;
}
function isInvuln(u) {
  if (u.kind === 'fountain') return true;
  if (u.mods.length && hasState(u, 'invulnerable')) return true;
  if (u.req && u.req.some(r => !r.dead)) return true;
  if (u.reqAny && u.reqAny.every(r => !r.dead)) return true;
  return false;
}
const armorMult = a => 1 - (0.06 * a) / (1 + 0.06 * Math.abs(a));
const edgeDist = (a, b) => dst(a, b) - a.radius - b.radius;
const inRange = (a, b, r) => edgeDist(a, b) <= r;
const unitById = id => units.find(u => u.id === id) || null;
function enemiesInRadius(team, x, z, r, o = {}) {
  const out = [];
  for (const u of units) if (!u.dead && u.team !== team && !u.isWard && (o.buildings || !u.isBuilding) && u.kind !== 'fountain' && Math.hypot(u.x - x, u.z - z) <= r + u.radius) out.push(u);
  return out;
}
