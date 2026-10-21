// abilities/combo.js — more AB helpers: chain lightning, cleave, sky bolt, earth spikes, area pulse.
Object.assign(AB, {
  // status helpers (all respect magic immunity through addModifier's debuff check)
  root: (u, src, dur) => addModifier(u, MODS.root, src, { dur }),
  hex: (u, src, dur) => addModifier(u, MODS.hex, src, { dur }),
  silence: (u, src, dur) => addModifier(u, MODS.silence, src, { dur }),
  slow: (u, src, dur, msPct, asPct = 0) => addModifier(u, MODS.slowed, src, { dur, props: { msPct: -msPct, as: -asPct * 100 } }),
  knockup: (u, src, dur, h = 2.5) => addModifier(u, MODS.knockup, src, { dur, data: { h } }),
  // jumping lightning. o: {caster, first, jumps, radius, delay, color, onHit(u, i)} — never hits the same unit twice
  chain(o) {
    const hit = new Set(); let cur = o.first, prev = o.caster, i = 0;
    const jump = () => {
      if (!cur || cur.dead) return;
      hit.add(cur); AB.boltFx(prev, cur, o.color || '#80d8ff'); o.onHit(cur, i);
      emit('chainJump', { unit: o.caster.id, target: cur.id, n: i, ability: o.ability || '' });
      if (++i >= o.jumps) return;
      let best = null, bd = 1e9;
      for (const u of enemiesInRadius(o.caster.team, cur.x, cur.z, o.radius)) { if (hit.has(u)) continue; const d = dst(u, cur); if (d < bd) { bd = d; best = u; } }
      prev = cur; cur = best; if (cur) delay(o.delay || 0.12, jump);
    };
    jump();
  },
  // zig-zag lightning segment between two units/points
  boltFx(a, b, color) {
    const ay = (a.model ? a.model.position.y : 0) + (a.height || 2) * 0.6, by = (b.model ? b.model.position.y : 0) + (b.height || 2) * 0.5;
    let px = a.x, py = ay, pz = a.z; const n = 4;
    for (let k = 1; k <= n; k++) {
      const f = k / n, j = k < n ? 0.6 : 0, nx = a.x + (b.x - a.x) * f + rnd(-j, j), ny = ay + (by - ay) * f + rnd(-j, j), nz = a.z + (b.z - a.z) * f + rnd(-j, j);
      AB.beam(px, py, pz, nx, ny, nz, color, 0.4, 0.45); AB.beam(px, py, pz, nx, ny, nz, '#ffffff', 0.14, 0.35); px = nx; py = ny; pz = nz;
    }
    burst(b.x, by, b.z, 8, [color, '#ffffff'], 4, 0.3, 0.2, 1, 0);
  },
  // vertical bolt from the sky onto a unit
  skyBolt(u, color = '#b3e5fc') {
    let y = 28, px = u.x + rnd(-1, 1), pz = u.z + rnd(-1, 1);
    for (let k = 0; k < 4; k++) { const ny = y - 7, nx = k < 3 ? u.x + rnd(-1, 1) : u.x, nz = k < 3 ? u.z + rnd(-1, 1) : u.z; AB.beam(px, y, pz, nx, Math.max(ny, 0.5), nz, color, 0.45, 0.4); px = nx; pz = nz; y = ny; }
    AB.beam(u.x, 0.5, u.z, u.x, 28, u.z, '#ffffff', 0.15, 0.25);
    burst(u.x, 1, u.z, 22, [color, '#ffffff', '#4fc3f7'], 6, 0.5, 0.3, 3, 0);
  },
  // DOTA-style cleave: splash `amount` (pure) to enemies in a cone in front of the attacker around the target (excludes target & buildings)
  cleave(src, tgt, amount, o = {}) {
    const len = o.len || 6, w0 = o.w0 || 3, w1 = o.w1 || 6, fx = Math.sin(src.facing), fz = Math.cos(src.facing), out = [];
    for (const u of units) {
      if (u === tgt || u.dead || u.team === src.team || u.isBuilding || u.kind === 'fountain') continue;
      const rx = u.x - src.x, rz = u.z - src.z, p = rx * fx + rz * fz, lat = Math.abs(rx * fz - rz * fx);
      if (p < 0 || p > len + u.radius) continue;
      if (lat > (w0 + (w1 - w0) * Math.min(1, p / len)) / 2 + u.radius) continue;
      dealDamage(src, u, amount, 'pure', { ability: o.ability || 'cleave', silent: true }); out.push(u);
    }
    for (let i = 0; i < 10; i++) { const a = src.facing + rnd(-0.6, 0.6), r = rnd(1.5, len * 0.8); spawnP(src.x + Math.sin(a) * r, rnd(0.8, 1.8), src.z + Math.cos(a) * r, Math.sin(a) * 4, 0.5, Math.cos(a) * 4, 0.25, 0.25, o.color || '#e0e0e0'); }
    return out;
  },
  // earth spikes erupting along a line (visual only; pair with lineWave for hits)
  spikes(x, z, dir, len, speed, color = '#8d6e63') {
    const mat = fxMat(color), tip = fxMat('#d7ccc8'), list = []; let trav = 0, t = 0;
    effects.push({ update(dt) {
      t += dt; const nt = Math.min(len, trav + speed * dt);
      for (let p = trav; p < nt; p += 1.1) for (let s = -1; s <= 1; s++) {
        const g = new T.Group(), b = new T.Mesh(boxG, mat), c = new T.Mesh(boxG, tip), hgt = rnd(1.6, 2.8) * (s ? 0.65 : 1);
        b.scale.set(0.55, hgt, 0.55); b.position.y = hgt / 2; c.scale.set(0.3, 0.6, 0.3); c.position.y = hgt + 0.25; g.add(b, c);
        g.position.set(x + dir.x * p - dir.z * s * 0.8 + rnd(-0.2, 0.2), -hgt, z + dir.z * p + dir.x * s * 0.8 + rnd(-0.2, 0.2)); g.rotation.set(rnd(-0.25, 0.25), rnd(0, 3), rnd(-0.25, 0.25));
        scene.add(g); list.push({ g, born: t, h: hgt });
      }
      trav = nt;
      for (const s of list) { const a = t - s.born; s.g.position.y = a < 0.12 ? -s.h * (1 - a / 0.12) : a < 0.9 ? 0 : -(a - 0.9) * s.h * 2.5; }
      while (list.length && t - list[0].born > 1.3) scene.remove(list.shift().g);
      if (trav >= len && !list.length) return true;
      return false;
    } });
  },
});
