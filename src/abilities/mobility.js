// abilities/mobility.js — AB helpers for B3: teleport/blink, "behind the target" checks, persistent ground areas,
// tethers, mana burn, invisibility/reveal application. All are engine-agnostic sim helpers (visuals use particles/beams).
Object.assign(AB, {
  // clamp a point to maxR from u and snap it to the nearest walkable cell
  clampPoint(u, pt, maxR) {
    let dx = pt.x - u.x, dz = pt.z - u.z; const d = Math.hypot(dx, dz);
    if (maxR && d > maxR) { dx *= maxR / d; dz *= maxR / d; }
    let x = clamp(u.x + dx, -73, 73), z = clamp(u.z + dz, -73, 73);
    if (!isWalk(x, z)) { const c = nearestWalkCell(cellOf(x), cellOf(z)); if (c) { x = cc(c[0]); z = cc(c[1]); } }
    return { x, z };
  },
  // instant reposition (keeps current order unless o.stop). o: {maxR, color, stop, noFx}
  teleport(u, pt, o = {}) {
    const p = AB.clampPoint(u, pt, o.maxR), cols = o.colors || ['#7c4dff', '#b388ff', '#ffffff'];
    if (!o.noFx) burst(u.x, 1.5, u.z, 22, cols, 5, 0.6, 0.3, 2, 0);
    if (o.stop !== false) issueOrder(u, { type: u.bot ? 'stand' : 'idle' });
    u.x = p.x; u.z = p.z; u.path = null; if (u.model) u.model.position.set(p.x, heightAt(p.x, p.z), p.z);
    if (!o.noFx) burst(p.x, 1.5, p.z, 22, cols, 5, 0.6, 0.3, 2, 0);
    FOG.dirty = true; emit('teleport', { unit: u.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2) });
    return p;
  },
  // point `d` units behind target t (relative to t's facing)
  behindPoint(t, d = 1.6) { return { x: t.x - Math.sin(t.facing) * (d + t.radius), z: t.z - Math.cos(t.facing) * (d + t.radius) }; },
  // is `src` behind `tgt`? (angle between tgt's facing and tgt→src greater than `deg`)
  isBehind(src, tgt, deg = 105) {
    const fx = Math.sin(tgt.facing), fz = Math.cos(tgt.facing), dx = src.x - tgt.x, dz = src.z - tgt.z, d = Math.hypot(dx, dz) || 1;
    return (fx * dx + fz * dz) / d < Math.cos(deg * Math.PI / 180);
  },
  // persistent ground area. o: {caster, x, z, radius, dur, tick (s), onTick(enemiesInside[], area), fx(area, dt), onEnd(area)}
  groundArea(o) {
    const a = { x: o.x, z: o.z, r: o.radius, t: 0, tickT: 0, data: {} };
    effects.push({ update(dt) {
      a.t += dt; a.tickT -= dt;
      if (a.tickT <= 0) { a.tickT += o.tick || 0.2; o.onTick && o.onTick(enemiesInRadius(o.caster.team, a.x, a.z, a.r), a); }
      if (o.fx) o.fx(a, dt);
      if (a.t >= o.dur) { o.onEnd && o.onEnd(a); return true; }
      return false;
    } });
    return a;
  },
  // burn up to `amt` mana; returns the amount burned
  manaBurn(t, amt) { const b = Math.max(0, Math.min(t.mana || 0, amt)); if (b > 0) t.mana -= b; return b; },
  // apply an invisibility modifier (def.invis) with a fade time
  invis(u, def, src, dur, fade = 0.5) { return addModifier(u, def, src, { dur, data: { fade } }); },
  reveal(u, src, dur) { return addModifier(u, MODS.revealed, src, { dur }); },
  // tether line visual from unit to point (call every frame or so)
  tetherFx(u, x, z, color) { AB.beam(u.x, 1.2, u.z, x, 1.2, z, color, 0.18, 0.12); },
});
