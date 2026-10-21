// ai/hero.js — executes the player's current order: idle (auto-attack), move, attack, amove, hold, cast.
// All orders go through issueOrder() so attack windup / casting are cancelled consistently.
function issueOrder(h, o) {
  if (!h || h.dead) return;
  const keep = o.type === 'attack' && h.atk && h.atk.target === o.target;   // re-clicking the same target doesn't restart the swing
  if (!keep) cancelAttack(h, 'order');
  cancelCasting(h); interruptChannel(h, 'order');
  h.order = o; h.path = null;
}
function validAttackTarget(h, t) {
  if (!t || t.dead || isInvuln(t) || t.kind === 'fountain') return false;
  if (t.team !== h.team) return canSee(h.team, t);   // no attacking what your team cannot see
  if (t.isWard) return true;   // deny own ward any time
  return !t.isBuilding && !t.isHero && t.hp < t.maxHp * 0.5; // deny
}
// attack t: start/continue swing when in range; chase otherwise (chasing cancels backswing, never windup)
function heroAttack(h, t, dt, chase = true) {
  if (h.atk && h.atk.target !== t && h.atk.phase === 'windup') cancelAttack(h, 'retarget');
  if (inRange(h, t, h.range)) { h.path = null; startAttack(h, t); return; }
  if (h.atk) { if (!backswingCancelable(h.atk)) return; h.atk = null; }
  if (chase) heroNav(h, t.x, t.z, dt, 0);
}
function heroAI(h, dt) {
  if (h.channel) { updateChannel(h, dt); return; }
  if (h.casting) { updateCasting(h, dt); return; }
  const o = h.order;
  switch (o.type) {
    case 'move': if (h.atk) { if (!backswingCancelable(h.atk)) break; h.atk = null; } if (heroNav(h, o.x, o.z, dt, 0.15)) h.order = { type: h.bot ? 'stand' : 'idle' }; break;
    case 'attack': if (!validAttackTarget(h, o.target)) { h.order = { type: h.bot ? 'stand' : 'idle' }; break; } heroAttack(h, o.target, dt); break;
    case 'amove': {
      if (!o.cur || !validAttackTarget(h, o.cur) || o.cur.team === h.team || dst(h, o.cur) > 18) o.cur = findEnemy(h, Math.max(8, h.range + 2));
      if (o.cur) heroAttack(h, o.cur, dt);
      else if (!h.atk && heroNav(h, o.x, o.z, dt, 0.3)) h.order = { type: 'idle' };
      break;
    }
    case 'cast': stepCastOrder(h, o, dt); break;
    case 'useItem': {   // point item with a range (wards) / unit item (Dagon, Force Staff, ...): walk into range, then use
      const it = h.items[o.slot]; if (!it) { h.order = { type: h.bot ? 'stand' : 'idle' }; break; }
      if (o.target) {
        if (itemTargetError(h, it.def.active, o.target)) { h.order = { type: h.bot ? 'stand' : 'idle' }; break; }
        if (dst(h, o.target) <= o.range + h.radius + o.target.radius) { h.order = { type: h.bot ? 'stand' : 'idle' }; const e = useItem(h, o.slot, o.target); if (e && h === G.player) err(e); }
        else heroNav(h, o.target.x, o.target.z, dt, 0);
        break;
      }
      if (Math.hypot(o.x - h.x, o.z - h.z) <= o.range) { h.order = { type: h.bot ? 'stand' : 'idle' }; const e = useItem(h, o.slot, { x: o.x, z: o.z }); if (e && h === G.player) err(e); }
      else heroNav(h, o.x, o.z, dt, o.range - 0.4);
      break;
    }
    case 'pickup': {   // B8: walk to a ground item (entities/drops.js) and pick it up
      if (!drops.includes(o.drop)) { h.order = { type: h.bot ? 'stand' : 'idle' }; break; }
      if (heroNav(h, o.drop.x, o.drop.z, dt, 1.0)) { h.order = { type: h.bot ? 'stand' : 'idle' }; const e = pickupDrop(h, o.drop); if (e && h === G.player) err(e); }
      break;
    }
    case 'stand': break;   // bots: wait without auto-attacking (keeps last-hit control)
    default: { // idle / hold: auto-attack nearby non-building enemies
      const hold = o.type === 'hold', extra = hold ? 0 : h.isHero ? 1.2 : 5;   // summons / illusions acquire a little further
      if (!o.cur || !validAttackTarget(h, o.cur) || o.cur.team === h.team || !inRange(h, o.cur, h.range + extra + 2)) o.cur = findEnemy(h, h.range + extra, { noBuild: true });
      if (o.cur) heroAttack(h, o.cur, dt, !hold);
    }
  }
}
