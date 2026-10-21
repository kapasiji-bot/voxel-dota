// abilities/status.js — shared crowd-control statuses with visuals: root, disarm, silence, hex, knockup, slow.
// Engine reads states once per step (core/loop.js → updateStatusFlags): u.rooted (no movement), u.disarmed (no attacks),
// u.silenced (no spells), u.hexed (silenced + disarmed + speed capped, model swapped). stunned is in modifiers.js.
const HEX_SPEED = 2.8;
// attach/detach a small mesh to a unit's model (status visuals). make() → Object3D
function attachFx(u, key, make) {
  if (!u.model) return null; u._fx = u._fx || {};
  if (!u._fx[key]) { u._fx[key] = make(); u.model.add(u._fx[key]); }
  return u._fx[key];
}
function detachFx(u, key) { if (u._fx && u._fx[key]) { u.model.remove(u._fx[key]); u._fx[key] = null; } }
const fxMat = (color, opacity = 1) => new T.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
function stunStars(u) {
  const g = new T.Group(), m = fxMat('#ffee58');
  for (let i = 0; i < 3; i++) { const s = new T.Mesh(boxG, m); s.scale.setScalar(0.28); const a = i / 3 * Math.PI * 2; s.position.set(Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6); g.add(s); }
  g.position.y = u.height + 0.5; return g;
}
// voxel frog used by hex (Lion). Built once, cloned per target.
let FROG = null;
function frogModel(u) {
  if (!FROG) FROG = buildModel('frog', { body: { p: [0, 0, 0], b: [
    [0, 0.35, 0, 1.1, 0.6, 1.2, '#43a047'], [0, 0.75, 0.35, 0.9, 0.45, 0.6, '#4caf50'], [0, 0.32, 0.05, 0.9, 0.3, 1.0, '#c5e1a5'],
    [-0.3, 1.05, 0.5, 0.3, 0.3, 0.3, '#fff'], [0.3, 1.05, 0.5, 0.3, 0.3, 0.3, '#fff'], [-0.3, 1.07, 0.66, 0.14, 0.16, 0.04, '#111'], [0.3, 1.07, 0.66, 0.14, 0.16, 0.04, '#111'],
    [0, 0.62, 0.66, 0.6, 0.06, 0.04, '#1b5e20'], [-0.62, 0.15, -0.3, 0.35, 0.3, 0.7, '#388e3c'], [0.62, 0.15, -0.3, 0.35, 0.3, 0.7, '#388e3c'],
    [-0.45, 0.1, 0.55, 0.25, 0.2, 0.35, '#388e3c'], [0.45, 0.1, 0.55, 0.25, 0.2, 0.35, '#388e3c']] } });
  const f = FROG.clone(); f.scale.setScalar(Math.max(0.8, u.radius * 1.5)); return f;
}
function iceBlock(u) {
  const m = new T.Mesh(boxG, fxMat('#b3e5fc', 0.45)); m.scale.set(u.radius * 2.6, u.height * 1.05, u.radius * 2.6); m.position.y = u.height * 0.5; return m;
}
Object.assign(MODS, {
  root: { id: 'root', tag: '缠绕', color: '#80deea', debuff: true, states: ['rooted'],
    fx(u) { if (Math.random() < 0.15) spawnP(u.x + rnd(-0.6, 0.6), 0.3, u.z + rnd(-0.6, 0.6), 0, 0.6, 0, 0.5, 0.18, '#a1887f'); } },
  silence: { id: 'silence', tag: '沉默', color: '#ce93d8', debuff: true, states: ['silenced'], onApply(u) { cancelCasting(u); interruptChannel(u, 'silence'); } },
  hex: { id: 'hex', tag: '妖术', color: '#76ff03', debuff: true, states: ['hexed', 'silenced', 'disarmed'],
    onApply(u) { cancelAttack(u, 'hex'); cancelCasting(u); interruptChannel(u, 'hex'); if (u.model) { u.model.userData.inner.visible = false; attachFx(u, 'frog', () => frogModel(u)); }
      burst(u.x, 1, u.z, 18, ['#76ff03', '#b2ff59', '#ffffff'], 4, 0.6, 0.3, 2, 0); },
    onRemove(u) { detachFx(u, 'frog'); if (u.model) u.model.userData.inner.visible = true; if (!u.dead) burst(u.x, 1, u.z, 10, ['#76ff03', '#fff'], 3, 0.5, 0.25, 2, 0); },
    fx(u, m, dt) { const f = u._fx && u._fx.frog; if (!f) return; m.data.hop = (m.data.hop || 0) + dt * (u.moveDist > 0.01 ? 9 : 2); f.position.y = Math.abs(Math.sin(m.data.hop)) * (u.moveDist > 0.01 ? 0.5 : 0.08); } },
  // airborne stun: o.data.h = peak height
  knockup: { id: 'knockup', debuff: true, states: ['stunned'], onApply(u, m) { m.data.T = m.t; cancelAttack(u, 'stun'); cancelCasting(u); interruptChannel(u, 'stun'); },
    fx(u, m) { if (!u.model) return; const k = clamp(1 - m.t / m.data.T, 0, 1); u.model.userData.inner.position.y = 4 * (m.data.h || 2.5) * k * (1 - k); },
    onRemove(u) { if (u.model) u.model.userData.inner.position.y = 0; } },
  frozen: { id: 'frozen', tag: '冰封', color: '#4fc3f7', debuff: true, perSource: false, states: ['rooted', 'disarmed'],
    onApply(u) { cancelAttack(u, 'root'); interruptChannel(u, 'root'); attachFx(u, 'ice', () => iceBlock(u)); }, onRemove(u) { detachFx(u, 'ice'); } },
  slowed: { id: 'slowed', tag: '减速', color: '#4fc3f7', debuff: true,
    fx(u) { if (Math.random() < 0.25) spawnP(u.x + rnd(-0.5, 0.5), rnd(0.2, 1.2), u.z + rnd(-0.5, 0.5), 0, -0.4, 0, 0.6, 0.15, '#e1f5fe'); } },
});
// stun visual (stars) is attached by the stun modifier's fx
const _stunFx = MODS.stun.fx;
MODS.stun.fx = function (u, m, dt) { _stunFx(u, m, dt); const s = attachFx(u, 'stars', () => stunStars(u)); if (s) s.rotation.y += dt * 6; };
MODS.stun.onRemove = u => detachFx(u, 'stars');
const _stunApply = MODS.stun.onApply; MODS.stun.onApply = (u, m) => { _stunApply(u, m); interruptChannel(u, 'stun'); };
function updateStatusFlags(u) {
  u.rooted = u.disarmed = u.silenced = u.hexed = u.feared = false;
  for (const m of u.mods) { const s = m.def.states; if (!s) continue;
    for (const k of s) { if (k === 'rooted' || k === 'stunned') u.rooted = true; else if (k === 'disarmed') u.disarmed = true; else if (k === 'silenced') u.silenced = true; else if (k === 'hexed') u.hexed = true; else if (k === 'feared') u.feared = true; } }
  if (u.hexed) u.speed = Math.min(u.speed, HEX_SPEED);
  if (u.disarmed && u.atk && u.atk.phase === 'windup') cancelAttack(u, 'disarm');
}
