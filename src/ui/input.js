// ui/input.js — mouse/keyboard → orders. Picking (pickUnit/groundAt), targeting mode (G.targeting), hotkeys.
// ================= input =================
const keys = {}, mouse = { x: innerWidth / 2, y: innerHeight / 2, inside: false, overUI: false };
const raycaster = new T.Raycaster(), groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0), _ndc = new T.Vector2(), _hit = new T.Vector3();
function groundAt(sx, sy) {
  _ndc.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); raycaster.setFromCamera(_ndc, camera);
  return raycaster.ray.intersectPlane(groundPlane, _hit) ? { x: _hit.x, z: _hit.z } : null;
}
const _pv = new T.Vector3();
function toScreen(x, y, z) { _pv.set(x, y, z).project(camera); return { x: (_pv.x + 1) / 2 * innerWidth, y: (1 - _pv.y) / 2 * innerHeight, z: _pv.z }; }
function pickUnit(sx, sy, self) {
  const upp = 2 * G.cam.dist * Math.tan(camera.fov * Math.PI / 360) / innerHeight;
  let best = null, bs = 1e9;
  for (const u of units) {
    if (u.dead || (u.model && !u.model.visible) || (u === G.player && !self)) continue;
    const by = u.model ? u.model.position.y : 0, f = toScreen(u.x, by, u.z), hd = toScreen(u.x, by + u.height, u.z);
    if (f.z > 1) continue;
    const rp = Math.max(12, (u.radius + 0.3) / upp);
    if (Math.abs(sx - f.x) > rp || sy > f.y + rp * 0.5 || sy < hd.y - 4) continue;
    const s = Math.abs(sx - f.x) + Math.abs(sy - (f.y + hd.y) / 2) * 0.5 + (u.isBuilding ? 30 : 0);
    if (s < bs) { bs = s; best = u; }
  }
  return best;
}
function clickMarker(x, z, col) { ringP(x, z, 0.6, 10, col, 0.4, 0.18, 0.15, -1.2); }
function issueMove(x, z) { issueOrder(G.player, { type: 'move', x, z }); clickMarker(x, z, '#4cff4c'); }
function issueAttack(t) { issueOrder(G.player, { type: 'attack', target: t }); ringP(t.x, t.z, t.radius + 0.4, 14, '#ff3b3b', 0.4, 0.2, 0.15); }
function handleRight(sx, sy) {
  const P = G.player; if (!P) return;
  if (G.targeting) { G.targeting = null; return; }
  if (ctlSel().every(u => u.dead)) return;
  const u = pickUnit(sx, sy), sel = ctlSel();   // orders go to every selected unit (ui/control.js)
  if (u && sel.some(s => validAttackTarget(s, u))) { for (const s of sel) if (validAttackTarget(s, u)) issueOrder(s, { type: 'attack', target: u }); ringP(u.x, u.z, u.radius + 0.4, 14, '#ff3b3b', 0.4, 0.2, 0.15); return; }
  if (u && u.team !== P.team && isInvuln(u)) err('该建筑处于无敌状态（需先摧毁前置防御塔）');
  const g = groundAt(sx, sy), d = g && dropNear(g.x, g.z, 1.6); if (!g) return;   // B8: right-click Aegis / Cheese → pick up
  if (d && !P.dead) { issueOrder(P, { type: 'pickup', drop: d }); clickMarker(d.x, d.z, '#ffca28'); } else { orderSel({ type: 'move' }, g); clickMarker(g.x, g.z, '#4cff4c'); }
}
function handleLeftTarget(sx, sy) {
  const P = G.player, tg = G.targeting; G.targeting = null;
  if ((tg.caster || P).dead && tg.kind !== 'amove') return;
  const g = groundAt(sx, sy), u = pickUnit(sx, sy);
  if (tg.kind === 'amove') {
    if (u && validAttackTarget(P, u)) { for (const s of ctlSel()) if (validAttackTarget(s, u)) issueOrder(s, { type: 'attack', target: u }); }
    else if (g) { orderSel({ type: 'amove' }, g); clickMarker(g.x, g.z, '#ff3b3b'); }
    return;
  }
  if (tg.kind === 'item' && tg.mode === 'unit') { const e = useItem(P, tg.slot, u || null); if (e) { err(e); G.targeting = tg; } return; }
  if (tg.kind === 'item') { if (g) { const e = useItem(P, tg.slot, { x: g.x, z: g.z }); if (e) err(e); } return; }
  const e = orderCast(tg.caster || P, tg.slot, tg.mode === 'unit' ? u : g);
  if (e) { err(e); if (tg.mode === 'unit') G.targeting = tg; }
}
// keyboard/HUD entry: no-target abilities cast at once, others enter targeting mode
function pressSkill(i) {
  const P = ctlCaster(), ab = P.abilities[i]; if (!ab) return;   // the active unit if it can cast (Spirit Bear), else the hero
  const d = ab.def, e = canCast(P, ab); if (e) { err(e); return; }
  if (d.target === 'none' || isRecast(P, ab)) { orderCast(P, i, null); return; }
  G.targeting = { kind: 'skill', caster: P, slot: i, mode: d.target === 'unit' ? 'unit' : 'point', def: d,
    range: d.target === 'direction' ? 0 : castRange(P, ab) + (d.target === 'unit' ? P.radius : 0), radius: lvVal(d, 'radius', ab.lvl),
    line: d.target === 'direction' ? { len: lvVal(d, 'len', ab.lvl), w: lvVal(d, 'w1', ab.lvl) || 4, w0: d.cone ? lvVal(d, 'w0', ab.lvl) : undefined } : null };
}
function pressItem(slot) {
  const P = G.player, it = P.items[slot]; if (!it) return;
  const A = it.def.active;
  if (!A) { err('该物品没有主动效果'); return; }
  if (it.cd > 0) { err('物品冷却中'); return; }
  if (A.target === 'unit') {   // B7: press again = self-cast (ally / any items: Force Staff, Eul's, Glimmer)
    if (G.targeting && G.targeting.kind === 'item' && G.targeting.slot === slot && (A.targetTeam === 'ally' || A.targetTeam === 'any')) { G.targeting = null; const e = useItem(P, slot, P); if (e) err(e); return; }
    G.targeting = { kind: 'item', slot, mode: 'unit', range: A.range + P.radius };
    return;
  }
  if (A.target === 'point') {
    // optional-point items (TP): pressing the key again while targeting uses the default (fountain)
    if (A.optional && G.targeting && G.targeting.kind === 'item' && G.targeting.slot === slot) { G.targeting = null; const e = useItem(P, slot, null); if (e) err(e); return; }
    G.targeting = { kind: 'item', slot, mode: 'point', range: A.range, radius: A.radius };   // radius → placement preview circle (wards)
    if (A.optional) msg('选择传送目标：点击地面或小地图上的友方建筑附近（再按一次 = 泉水）', '#90caf9');
  }
  else { const e = useItem(P, slot, null); if (e) err(e); }
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
  if (!G.started || G.over) return;
  if (e.button === 2) handleRight(e.clientX, e.clientY);
  else if (e.button === 0) {
    if (G.targeting) handleLeftTarget(e.clientX, e.clientY);
    else boxStart(e.clientX, e.clientY);   // click or box select on mouseup (ui/control.js)
  }
});
addEventListener('mouseup', e => { if (e.button !== 0 || !CTL.drag) return; if (!boxEnd(e.clientX, e.clientY, e.shiftKey)) clickSelect(pickUnit(e.clientX, e.clientY, true), e.shiftKey); });
addEventListener('mousemove', e => { boxMove(e.clientX, e.clientY); mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true; mouse.overUI = e.target !== canvas; });
document.addEventListener('mouseleave', () => mouse.inside = false);
canvas.addEventListener('wheel', e => { e.preventDefault(); G.cam.dist = clamp(G.cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 26, 100); }, { passive: false });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;   // typing in the shop search box
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'F3') { e.preventDefault(); playerCourierOrder('deliver'); return; }   // ui/courier.js (B8)
  if (k === 'F9') { e.preventDefault(); $('help').classList.toggle('hidden'); return; }
  if (!G.started || G.over) return;
  if (ctlKey(e, k)) return;   // F1 / F2 / control groups (ui/control.js)
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Tab'].includes(k) || e.altKey) e.preventDefault();
  keys[k] = true;
  if (k === 'Tab') { if (!e.repeat && cycleActive()) G.tabT = performance.now(); else if (!G.tabT || performance.now() - G.tabT > 250) showScoreboard(true); return; }
  const P = G.player;
  const si = 'qwer'.indexOf(k);
  if (si >= 0 && k.length === 1) { if (e.altKey) learnSkill(si); else if (!G.paused) pressSkill(si); return; }
  const ii = '123456'.indexOf(k);
  if (ii >= 0 && k.length === 1) { if (!G.paused) pressItem(ii); return; }
  switch (k) {
    case 'b': toggleShop(); break;
    case 'a': if (ctlSel().some(u => !u.dead)) G.targeting = { kind: 'amove' }; break;
    case 's': orderSel({ type: 'idle' }); G.targeting = null; break;
    case 'h': orderSel({ type: 'hold' }); break;
    case 'y': G.lock = !G.lock; msg(G.lock ? '镜头锁定英雄' : '镜头解锁', '#ccc'); break;
    case 'p': togglePause(); break;   // net/lockstep.js (LAN: host only)
    case 'Escape': G.targeting = null; $('shop').classList.add('hidden'); $('help').classList.add('hidden'); break;
  }
});
addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; if (k === 'Tab') showScoreboard(false); });

