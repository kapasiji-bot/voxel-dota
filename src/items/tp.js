// items/tp.js — 回城卷轴 Town Portal Scroll: 3 s channel, then teleport next to the friendly building closest to the chosen
// point (no point / second key press = fountain). Interrupted by stun, hex, death and new orders — not by silence or root.
// Hero cooldown 60 s (def.heroCd). The swirl is visible at both ends to whichever team has vision there (render gated per frame).
const TP_CH = { id: 'tp', name: '回城卷轴', item: true, channel: 3, keepOn: ['silence', 'root'],
  onChannelStart(c, t, ch) { const h = c.caster; ch.data.fx = [tpFx(h.team, h.x, h.z), tpFx(h.team, t.x, t.z)]; G.tps.push(ch.data.tp = { team: h.team, x: t.x, z: t.z, from: { x: h.x, z: h.z }, t0: G.time }); },
  onChannelEnd(c, t, interrupted, ch) {
    const h = c.caster; for (const f of ch.data.fx) f.done = true; G.tps = G.tps.filter(x => x !== ch.data.tp);
    if (interrupted) { emit('tpCancel', { unit: h.id }); return; }
    AB.teleport(h, t, { colors: [h.team === RAD ? '#80deea' : '#ff8a80', '#ffffff'] }); emit('tpArrive', { unit: h.id, x: +h.x.toFixed(1), z: +h.z.toFixed(1), building: t.b });
  } };
const TP_GEO = new T.CylinderGeometry(1.1, 1.4, 5, 16, 1, true);
function tpFx(team, x, z) {
  const col = team === RAD ? '#4dd0e1' : '#ff5252', m = new T.Mesh(TP_GEO, new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
  m.position.set(x, heightAt(x, z) + 2.5, z); scene.add(m);
  const e = { done: false, t: 0, update(dt) {
    e.t += dt; const P = G.player, show = !!P && (P.team === team || FOG.off || visAt(P.team, x, z));
    m.visible = show; m.rotation.y += dt * 3; m.material.opacity = 0.25 + 0.15 * Math.sin(e.t * 9);
    if (show && vrand() < 0.7) { const a = vrand() * 6.28; spawnP(x + Math.cos(a) * 1.3, vrnd(0.2, 1), z + Math.sin(a) * 1.3, -Math.cos(a) * 0.3, vrnd(2, 4), -Math.sin(a) * 0.3, 0.7, 0.2, vrand() < 0.5 ? col : '#ffffff'); }   // visual randomness only (shown per local team; B11 lockstep)
    if (e.done) { scene.remove(m); m.material.dispose(); return true; } return false; } };
  effects.push(e); return e;
}
// destination: next to the own building nearest to pt (default: fountain)
function tpDest(h, pt) {
  let b = G.fountains[h.team], bd = 1e9;
  if (pt) for (const u of units) if (u.isBuilding && !u.dead && u.team === h.team && u.kind !== 'ancient') { const d = Math.hypot(u.x - pt.x, u.z - pt.z); if (d < bd) { bd = d; b = u; } }
  const fx = G.fountains[h.team], dir = pt && b !== fx ? AB.dir(b, pt) : AB.dir(b, { x: 0, z: 0 }), off = b.radius + 2.5;
  return { x: b.x + dir.x * off, z: b.z + dir.z * off, b: b.id, kind: b.kind };
}
registerItem({ id: 'tp', order: 0, name: '回城卷轴', icon: '回', color: '#5c6bc0', cost: 90, stack: true, consumable: true, heroCd: true, maxCharges: 3, keepInvis: true,
  desc: '持续施法 3 秒后传送到指定位置附近的友方建筑（再按一次物品键 = 泉水）。眩晕/妖术会打断，沉默不会。冷却 60 秒。',
  active: { target: 'point', optional: true, range: 0, cd: 60, onUse(c, pt) {
    const h = c.caster, d = tpDest(h, pt); if (h.channel || h.casting) return false;
    startChannel(h, { def: TP_CH, lvl: 1 }, d); emit('tpStart', { unit: h.id, x: +d.x.toFixed(1), z: +d.z.toFixed(1), building: d.b, kind: d.kind });
  } } });
