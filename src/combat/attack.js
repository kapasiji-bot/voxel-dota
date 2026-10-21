// combat/attack.js — DOTA-style attack cycle + projectiles.
//   startAttack → windup (attackPoint / attackSpeedMult) → IMPACT (melee: damage now; ranged: launch projectile)
//   → backswing (backswing / attackSpeedMult) → done.  Attack cooldown (atkInterval) starts at startAttack.
// Windup is cancelled (no damage, cooldown refunded) if the target dies / leaves range+buffer / unit is stunned/taunted / order changes.
// u.atk = {id, target, phase:'windup'|'backswing', t, point, back}. Animation (render/animate.js) reads u.atk only.
const ATTACK_RANGE_BUFFER = 2.0;
let ATK_ID = 1;
function attackTiming(u) {
  const m = u.atkSpeedMult || 1;
  let point = u.atkPoint / m, back = u.backswing / m;
  const tot = point + back; if (tot > u.atkInterval * 0.98) { const k = u.atkInterval * 0.98 / tot; point *= k; back *= k; }
  return { point, back: Math.max(0.06, back) };
}
// begin an attack if ready; returns true while an attack on t is in progress
function startAttack(u, t) {
  u.facing = Math.atan2(t.x - u.x, t.z - u.z);
  if (u.atk) return u.atk.target === t;
  if (u.atkCd > 0 || u.disarmed) return false;
  const tm = attackTiming(u);
  u.atk = { id: ATK_ID++, target: t, phase: 'windup', t: 0, point: tm.point, back: tm.back };
  u.atkCd = u.atkInterval;
  emit('attackStart', { unit: u.id, kind: u.kind, target: t.id, attackId: u.atk.id, point: tm.point, back: tm.back });
  if (tm.point <= 1e-3) attackImpact(u);
  return true;
}
// backswing may be cut short (move/chase) but never on the impact frame itself, so the impact pose is always shown
const backswingCancelable = a => a.phase === 'backswing' && a.impactF < G.frame;
function cancelAttack(u, reason) {
  const a = u.atk; if (!a) return;
  if (a.phase === 'windup') { u.atkCd = 0; emit('attackCancel', { unit: u.id, kind: u.kind, attackId: a.id, reason }); }
  u.atk = null;
}
function updateAttack(u, dt) {
  const a = u.atk; if (!a) return;
  a.t += dt;
  if (a.phase === 'windup') {
    const t = a.target;
    if (!t || t.dead || isInvuln(t) || !canSee(u.team, t)) return cancelAttack(u, 'target');   // lost vision / invisible
    if (!u.isBuilding && edgeDist(u, t) > u.range + ATTACK_RANGE_BUFFER) return cancelAttack(u, 'range');
    u.facing = Math.atan2(t.x - u.x, t.z - u.z);
    if (a.t >= a.point) attackImpact(u);
  } else if (a.t >= a.point + a.back) u.atk = null;
}
function attackImpact(u) {
  const a = u.atk, t = a.target; a.phase = 'backswing'; a.impactF = G.frame;
  if (u.mods.length) breakInvis(u, 'attack', t);
  emit('attackImpact', { unit: u.id, kind: u.kind, target: t.id, attackId: a.id, ranged: u.proj > 0 });
  const orb = u.abilities ? pickOrb(u, t) : null; if (orb) payOrb(u, orb, t);   // abilities/orb.js (Glaives of Wisdom)
  if (u.proj > 0) fireProjectile(u, t, { attackId: a.id, orb, color: orb ? orb.def.orbColor : undefined, glow: !!orb, size: orb ? 0.7 : undefined }); else attackLand(u, t, a.id, orb);
}
// an attack connects (melee impact or projectile arrival); orb = autocast orb ability used by this attack (abilities/orb.js)
function attackLand(src, tgt, attackId, orb) {
  if (tgt.dead) return;
  const miss = src.trueStrike && !tgt.isBuilding ? 0 : 1 - (1 - (src.missChance || 0)) * (1 - (tgt.evasion || 0));   // smoke screen / evasion; true strike (MKB) never misses
  if (miss > 0 && Math.random() < miss) { emit('attackMiss', { unit: src.id, target: tgt.id, attackId }); if (src === G.player || tgt === G.player) addFloat(tgt, '未命中', '#bdbdbd', 14, 0.8); return; }
  const info = { dmg: rnd(src.dmgMin, src.dmgMax), crit: 0, attackId };
  if (src.abilities) fireHeroHook(src, 'modifyAttack', tgt, info);   // crits (Jinada), backstab, ...
  if (src.items && !tgt.isBuilding) fireItemHook(src, 'modifyAttack', tgt, info);   // item crits (Daedalus) — applyCrit keeps the highest
  if (tgt.items && !tgt.isIllusion && !tgt.proj && Math.random() < 0.5) { const bl = tgt.items.reduce((a, it) => Math.max(a, (it && it.def.block) || 0), 0); if (bl) info.dmg = Math.max(0, info.dmg - bl); }   // Vanguard damage block
  if (tgt.mods.length) for (const m of tgt.mods) if (m.data.atkRed) info.dmg *= 1 - m.data.atkRed;   // modifier data.atkRed: less attack damage taken (Frost Shield)
  const dealt = dealDamage(src, tgt, info.dmg, 'phys', { attackId, big: info.crit > 0, silent: info.crit > 0 });
  if (info.crit > 0 && dealt > 0) {   // crit number: red, big; huge + punch/shake + blood for crits ≥ 2.5× (Coup de Grace)
    emit('crit', { unit: src.id, target: tgt.id, amount: dealt, attackId, mult: info.crit });
    critFloat(tgt, dealt, info.crit);
  }
  if (orb && !tgt.dead) orbLand(src, orb, tgt, dealt);
  if (src.onHit && dealt > 0) src.onHit(src, tgt, dealt);   // neutral / Roshan passives (ai/neutral.js, entities/roshan.js)
  if (src.abilities && dealt > 0) { fireHeroHook(src, 'onAttackLand', tgt, dealt); if (src.items) fireItemHook(src, 'onAttackLand', tgt, dealt); if (src.isSummon) summonSplit(src); }   // e.g. cleave (abilities, Battle Fury)
  if (!src.proj) for (let i = 0; i < 3; i++) spawnP(tgt.x + rnd(-0.3, 0.3), tgt.height * 0.5, tgt.z + rnd(-0.3, 0.3), rnd(-2, 2), rnd(1, 3), rnd(-2, 2), 0.3, 0.15, src.isHero ? '#ffffff' : '#ddd', -10);
  else if (src.isHero) burst(tgt.x, tgt.height * 0.5, tgt.z, 5, ['#ffab40', '#ff6d00', '#ffd180'], 3, 0.35, 0.2, 1, 0);
  if (tgt.abilities && !tgt.dead) fireHeroHook(tgt, 'onAttacked', src);
  if (tgt.mods.length && !tgt.dead) for (const m of tgt.mods.slice()) if (m.def.onAttacked) m.def.onAttacked(tgt, m, src);   // modifier hook (Frost Shield slows attackers)
}
// ---------- projectiles ----------
const projMats = {}, haloMats = {}, projPool = [];
function projMat(c) { return projMats[c] || (projMats[c] = new T.MeshBasicMaterial({ color: c })); }
function haloMat(c) { return haloMats[c] || (haloMats[c] = new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.38, depthWrite: false, blending: T.AdditiveBlending })); }
// pooled projectile meshes (B6 perf): a core box + an additive halo child; released meshes are hidden, not removed
function projMesh(color, size, glow) {
  let m = projPool.pop();
  if (!m) { m = new T.Mesh(boxG, projMat(color)); const h = new T.Mesh(boxG, haloMat(color)); h.scale.setScalar(2.3); m.add(h); scene.add(m); }
  m.material = projMat(color); m.children[0].material = haloMat(color); m.children[0].visible = !!glow; m.scale.setScalar(size); m.visible = true;
  return m;
}
function releaseProj(m) { m.visible = false; projPool.push(m); }
// o: {attackId, speed, color, size, trail, onHit(target)}  — without onHit it is a normal attack (attackLand)
function fireProjectile(src, tgt, o = {}) {
  const glow = o.glow !== undefined ? o.glow : !!o.onHit;   // ability projectiles glow (halo + denser trail) so they read at a distance
  const m = projMesh(o.color || src.projColor || '#fff', Math.max(o.size || (src.isBuilding ? 0.7 : src.isHero ? 0.5 : 0.35), glow ? 0.6 : 0), glow);
  const fp = o.from || src;   // o.from: launch from another unit / point (bouncing projectiles)
  const y = fp.height ? (fp.model ? fp.model.position.y : 0) + (fp.isBuilding ? fp.height - 0.6 : fp.height * 0.6) : 1.5;
  m.position.set(fp.x, y, fp.z);
  projectiles.push({ src, tgt, mesh: m, speed: o.speed || src.proj, onHit: o.onHit, attackId: o.attackId || 0, orb: o.orb || null, glow, trail: o.trail || (glow ? o.color : null) || (src.isHero ? src.projColor : null) });
  emit('projectileLaunch', { unit: src.id, kind: src.kind, target: tgt.id, attackId: o.attackId || 0 });
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i], m = p.mesh, t = p.tgt;
    if (t.dead && !t.isHero) { releaseProj(m); projectiles.splice(i, 1); emit('projectileLost', { attackId: p.attackId }); continue; }
    const ty = (t.model ? t.model.position.y : 0) + t.height * 0.5;
    const dx = t.x - m.position.x, dy = ty - m.position.y, dz = t.z - m.position.z, d = Math.hypot(dx, dy, dz), step = p.speed * dt;
    if (d <= step + 0.3) {
      releaseProj(m); projectiles.splice(i, 1);
      if (!t.dead) { emit('projectileHit', { unit: p.src.id, target: t.id, attackId: p.attackId }); if (p.onHit) p.onHit(t); else attackLand(p.src, t, p.attackId, p.orb); }
      else emit('projectileLost', { attackId: p.attackId });
      continue;
    }
    m.position.x += dx / d * step; m.position.y += dy / d * step; m.position.z += dz / d * step;
    m.rotation.x += dt * 8; m.rotation.y += dt * 6;
    if (p.glow) { m.children[0].scale.setScalar(2.1 + Math.sin(G.time * 18 + i) * 0.35); for (let k = 0; k < 2; k++) spawnP(m.position.x + rnd(-0.2, 0.2), m.position.y + rnd(-0.2, 0.2), m.position.z + rnd(-0.2, 0.2), rnd(-0.4, 0.4), rnd(0, 0.6), rnd(-0.4, 0.4), 0.45, 0.32, k ? '#ffffff' : p.trail || '#fff'); }
    else if (p.trail && Math.random() < 0.6) spawnP(m.position.x, m.position.y, m.position.z, rnd(-0.5, 0.5), rnd(0, 1), rnd(-0.5, 0.5), 0.3, 0.2, p.trail);
  }
}
// nearest attackable enemy within edge-distance r. o: {noBuild, heroPen}
