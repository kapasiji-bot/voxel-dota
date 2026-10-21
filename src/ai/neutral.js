// ai/neutral.js — neutral creep behaviour: sleep at the camp spot; when any camp member is damaged the whole camp (within 8)
// aggros the attacker (neutralHit, called by combat/damage.js). Chases with A* (heroNav). Leash: farther than LEASH from
// its spawn spot, or no damage taken by the camp for NEUTRAL_CHASE s → walks home ignoring everything and regenerates fast.
// Simple abilities by NEUTRAL_TYPES[..].ab: stomp (AoE stun), shock (AoE magic damage), purge (slow), crit, splash.
// Towers never target neutrals (combat/attack.js findEnemy); lane creeps may fight them (pulling).
const LEASH = 14, NEUTRAL_CHASE = 6;
function neutralHit(u, src) {
  if (!src || src.team === u.team || src.dead || u.returning) return;
  const mates = u.camp ? u.camp.units : [u];
  for (const n of mates) if (!n.dead && !n.returning && Math.hypot(n.x - u.x, n.z - u.z) < 8) { if (!n.aggro || n.aggro.dead || n.aggro.isBuilding || (src.isHero && !n.aggro.isHero)) n.aggro = src; n.aggroT = G.time; }
  if (!u.aggro || u.aggro.dead) u.aggro = src; u.aggroT = G.time;
}
function neutralLeash(u) {
  u.aggro = null; u.returning = true; u.path = null;
  if (u.atk) cancelAttack(u, 'leash');
  emit('neutralLeash', { unit: u.id, camp: u.camp ? u.camp.id : '' });
}
function neutralAbility(u, t) {
  const ab = NEUTRAL_TYPES[u.nt].ab; if (!ab || u.abCd > 0 || u.silenced) return false;
  const near = r => enemiesInRadius(NEUTRAL, u.x, u.z, r).filter(e => !e.isCourier);
  if (ab === 'stomp' && dst(u, t) < 3.4) {
    u.abCd = 12; for (const e of near(3.4)) { AB.stun(e, u, 1.4); AB.damage(u, e, 60, 'magic', 'neutral_stomp'); }
    ringP(u.x, u.z, 3.4, 30, ['#a1887f', '#ffe082'], 0.5, 0.3, 0.2); emit('neutralCast', { unit: u.id, ab }); return true;
  }
  if (ab === 'shock' && dst(u, t) < 3.2) {
    u.abCd = 9; for (const e of near(3.2)) AB.damage(u, e, 90, 'magic', 'neutral_shock');
    ringP(u.x, u.z, 3.2, 26, ['#ea80fc', '#7c4dff'], 0.45, 0.25, 0.4); emit('neutralCast', { unit: u.id, ab }); return true;
  }
  if (ab === 'purge' && dst(u, t) < 9 && !t.isBuilding) {
    u.abCd = 10; AB.slow(t, u, 2.5, 0.6);
    burst(t.x, 1.2, t.z, 12, ['#b388ff', '#e1bee7'], 3, 0.5, 0.2, 2); emit('neutralCast', { unit: u.id, ab, target: t.id }); return true;
  }
  return false;
}
// passive on-hit effects (called from combat/attack.js attackLand via src.onHit)
function neutralOnHit(src, tgt, dealt) {
  const ab = NEUTRAL_TYPES[src.nt] && NEUTRAL_TYPES[src.nt].ab;
  if (ab === 'splash') for (const e of enemiesInRadius(NEUTRAL, tgt.x, tgt.z, 2.5)) if (e !== tgt && !e.isCourier) dealDamage(src, e, dealt * 0.5, 'phys', { ability: 'neutral_splash' });
  if (ab === 'crit' && Math.random() < 0.2 && !tgt.dead) dealDamage(src, tgt, dealt, 'phys', { ability: 'neutral_crit' });
}
function neutralAI(u, dt) {
  if (u.isRoshan) { roshanAI(u, dt); return; }   // entities/roshan.js
  u.abCd -= dt;
  const away = Math.hypot(u.x - u.hx, u.z - u.hz);
  if (u.returning) {
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.35 * dt);
    if (heroNav(u, u.hx, u.hz, dt, 0.3) || away < 0.4) { u.returning = false; u.path = null; }
    return;
  }
  let t = u.aggro;
  if (t && (t.dead || isInvuln(t) || !canSee(NEUTRAL, t))) {
    t = u.aggro = findEnemy(u, 5, { noBuild: true });   // keep fighting whoever else is next to us
    if (t && t.isCourier) t = u.aggro = null;
  }
  if (t && (away > LEASH || G.time - (u.aggroT || 0) > NEUTRAL_CHASE)) { neutralLeash(u); return; }
  if (!t) {
    if (away > 0.8) { neutralLeash(u); return; }
    if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.02 * dt);
    return;
  }
  if (u.atk) { if (u.atk.target !== t && u.atk.phase === 'windup') cancelAttack(u, 'retarget'); else return; }
  if (neutralAbility(u, t)) return;
  if (inRange(u, t, u.range)) { u.path = null; startAttack(u, t); }
  else heroNav(u, t.x, t.z, dt, 0);
}
