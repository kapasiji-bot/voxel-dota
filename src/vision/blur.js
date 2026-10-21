// vision/blur.js — Phantom Assassin's Blur: a hero with prop `blur` (radius) is hidden from an enemy team — 3D model, minimap,
// targeting and bot perception (canSee) — unless one of that team's units or buildings stands within the radius. Track / Dust
// reveals still apply (fog.js checks reveal modifiers first). Recomputed 4× per second; u.blurHid[team] = true while hidden.
let _blurT = 0;
function tickBlur(dt) {
  _blurT -= dt; if (_blurT > 0) return; _blurT = 0.25;
  for (const h of G.heroes) {
    if (!h.blurR || h.dead) { h.blurHid = null; continue; }
    const was = h.blurHid, hid = [false, false];
    for (let team = 0; team < 2; team++) {
      if (team === h.team) continue; const r2 = h.blurR * h.blurR;
      hid[team] = !units.some(e => !e.dead && e.team === team && e.kind !== 'fountain' && (e.x - h.x) * (e.x - h.x) + (e.z - h.z) * (e.z - h.z) <= r2 + (e.radius || 0));
    }
    h.blurHid = hid;
    if (!was || was[1 - h.team] !== hid[1 - h.team]) { emit('blur', { unit: h.id, hidden: hid[1 - h.team] }); FOG.dirty = true; }
  }
}
const blurHidden = (team, u) => !!(u.blurHid && u.blurHid[team]);
