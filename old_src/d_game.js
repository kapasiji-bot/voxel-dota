// ================= AI / simulation =================
function creepAI(u, dt) {
  if (u.taunt) { u.taunt.t -= dt; if (u.taunt.t <= 0 || u.taunt.src.dead) u.taunt = null; }
  let t = u.taunt ? u.taunt.src : u.target;
  if (!u.taunt) {
    if (t && (t.dead || isInvuln(t) || dst(u, t) > 16)) t = u.target = null;
    u.acq -= dt;
    if (u.acq <= 0) { u.acq = 0.25 + Math.random() * 0.15; if (!t || t.isBuilding) { const n = findEnemy(u, 9); if (n && (!t || !n.isBuilding)) t = u.target = n; } }
  }
  if (t) { if (inRange(u, t, u.range)) tryAttack(u, t); else if (u.windup <= 0) moveStep(u, t.x, t.z, dt, 0); return; }
  const wp = u.wps[u.wp]; if (!wp) return;
  if (moveStep(u, wp.x, wp.z, dt, 1.0) && u.wp < u.wps.length - 1) u.wp++;
}
function towerAI(u, dt) {
  let t = u.target;
  if (t && (t.dead || isInvuln(t) || !inRange(u, t, u.range))) t = u.target = null;
  if (!t) { u.acq -= dt; if (u.acq <= 0) { u.acq = 0.1; t = u.target = findEnemy(u, u.range, { noBuild: true, heroPen: 30 }); } }
  if (t) tryAttack(u, t);
}
function heroAI(h, dt) {
  const o = h.order;
  const autoAtk = (extra, chase) => {
    if (!o.cur || !validAttackTarget(h, o.cur) || o.cur.team === h.team || !inRange(h, o.cur, h.range + extra + 2)) o.cur = findEnemy(h, h.range + extra, { noBuild: true });
    if (o.cur) { if (inRange(h, o.cur, h.range)) tryAttack(h, o.cur); else if (chase && h.windup <= 0) moveStep(h, o.cur.x, o.cur.z, dt, 0); }
  };
  switch (o.type) {
    case 'move': if (heroNav(h, o.x, o.z, dt, 0.15)) h.order = { type: 'idle' }; break;
    case 'attack': {
      const t = o.target;
      if (!validAttackTarget(h, t)) { h.order = { type: 'idle' }; break; }
      if (inRange(h, t, h.range)) { h.path = null; tryAttack(h, t); } else if (h.windup <= 0) heroNav(h, t.x, t.z, dt, 0);
      break;
    }
    case 'amove': {
      if (!o.cur || !validAttackTarget(h, o.cur) || o.cur.team === h.team || dst(h, o.cur) > 18) o.cur = findEnemy(h, Math.max(8, h.range + 2));
      if (o.cur) { if (inRange(h, o.cur, h.range)) { h.path = null; tryAttack(h, o.cur); } else if (h.windup <= 0) heroNav(h, o.cur.x, o.cur.z, dt, 0); }
      else if (heroNav(h, o.x, o.z, dt, 0.3)) h.order = { type: 'idle' };
      break;
    }
    case 'cast': {
      const range = o.range;
      if (o.target) {
        if (!validSpellTarget(h, o.target)) { h.order = { type: 'idle' }; break; }
        if (inRange(h, o.target, range)) { h.path = null; doCast(h, o); h.order = { type: 'idle' }; } else heroNav(h, o.target.x, o.target.z, dt, 0);
      } else {
        if (Math.hypot(o.x - h.x, o.z - h.z) <= range) { h.path = null; doCast(h, o); h.order = { type: 'idle' }; } else heroNav(h, o.x, o.z, dt, range - 0.3);
      }
      break;
    }
    case 'hold': autoAtk(0, false); break;
    default: autoAtk(1.2, true);
  }
}
function updateHeroTimers(h, dt) {
  for (const s of h.skills) if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
  for (const it of h.items) if (it && it.cd > 0) it.cd = Math.max(0, it.cd - dt);
  if (h.dead) {
    h.respawn -= dt; $('deathTxt').textContent = `你已阵亡 —— ${Math.ceil(h.respawn)} 秒后复活`;
    if (h.respawn <= 0) respawnHero(h);
    return;
  }
  h.callT = Math.max(0, h.callT - dt); h.bkbT = Math.max(0, h.bkbT - dt); h.helixCd -= dt;
  if (h.fieryT > 0) { h.fieryT -= dt; if (h.fieryT <= 0) h.fiery = 0; }
  let regen = h.hpRegen, mregen = h.manaRegen;
  if (h.salveT > 0) { h.salveT -= dt; regen += 40; }
  const f = G.fountains[h.team];
  if (dst(h, f) < 12) { regen += h.maxHp * 0.06; mregen += h.maxMana * 0.06; }
  h.hp = Math.min(h.maxHp, h.hp + regen * dt); h.mana = Math.min(h.maxMana, h.mana + mregen * dt);
  if (h.fiery > 0 && Math.random() < 0.3) spawnP(h.x + rnd(-0.5, 0.5), rnd(1, 2.5), h.z + rnd(-0.5, 0.5), 0, rnd(1, 3), 0, 0.5, 0.2, ['#ff6d00', '#ffab00'][h.fiery % 2]);
  if (h.bkbT > 0 && Math.random() < 0.5) spawnP(h.x + rnd(-0.8, 0.8), rnd(0, 3), h.z + rnd(-0.8, 0.8), 0, rnd(1, 2), 0, 0.5, 0.18, '#ffd54f');
  if (h.callT > 0 && Math.random() < 0.3) spawnP(h.x + rnd(-0.7, 0.7), rnd(1, 3), h.z + rnd(-0.7, 0.7), 0, 1, 0, 0.4, 0.15, '#ff5252');
}
function separate(dt) {
  const n = units.length;
  for (let i = 0; i < n; i++) {
    const a = units[i]; if (a.dead) continue;
    for (let j = i + 1; j < n; j++) {
      const b = units[j]; if (b.dead || (a.isBuilding && b.isBuilding)) continue;
      const dx = b.x - a.x, dz = b.z - a.z, r = a.radius + b.radius, dd = dx * dx + dz * dz;
      if (dd >= r * r || dd < 1e-6) continue;
      const d = Math.sqrt(dd), ov = r - d, nx = dx / d, nz = dz / d;
      if (a.isBuilding) tryMove(b, b.x + nx * ov, b.z + nz * ov);
      else if (b.isBuilding) tryMove(a, a.x - nx * ov, a.z - nz * ov);
      else {
        const k = Math.min(1, dt * 8) * ov, wa = a.isHero ? 0.25 : 0.5, wb = b.isHero ? 0.25 : 0.5;
        tryMove(a, a.x - nx * k * wa, a.z - nz * k * wa); tryMove(b, b.x + nx * k * wb, b.z + nz * k * wb);
      }
    }
  }
}
function syncModel(u, dt) {
  const m = u.model; if (!m || !m.visible) return;
  m.position.x = u.x; m.position.z = u.z;
  const gy = heightAt(u.x, u.z) * 0.7; m.position.y += (gy - m.position.y) * Math.min(1, dt * 10);
  const p = u.parts;
  if (u.isBuilding) { if (p.crystal) { p.crystal.rotation.y += dt * 1.3; p.crystal.position.y = p.crystal.userData.p0.y + Math.sin(G.time * 2 + u.id) * 0.25; } return; }
  let df = u.facing - m.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); m.rotation.y += df * Math.min(1, dt * 14);
  if (u.moving) u.anim.walk += dt * effSpeed(u) * 1.5;
  const sw = u.moving ? Math.sin(u.anim.walk) * 0.75 : 0, lk = Math.min(1, dt * 14);
  p.legL.rotation.x += (sw - p.legL.rotation.x) * lk; p.legR.rotation.x += (-sw - p.legR.rotation.x) * lk;
  p.armL.rotation.x += (-sw * 0.7 - p.armL.rotation.x) * lk;
  if (u.anim.atk > 0) {
    u.anim.atk += dt; const k = u.anim.atk / u.anim.atkDur;
    if (k >= 1) u.anim.atk = 0;
    p.armR.rotation.x = k < 0.55 ? -2.5 * (k / 0.55) : -2.5 * Math.max(0, 1 - (k - 0.55) / 0.45) + (k > 0.7 ? 0.0 : 0);
    if (u.proj) p.armR.rotation.x = k < 0.6 ? -1.6 * (k / 0.6) : -1.6 * Math.max(0, 1 - (k - 0.6) / 0.4);
  } else p.armR.rotation.x += (sw * 0.7 - p.armR.rotation.x) * lk;
  const inner = m.userData.inner;
  if (u.anim.spin > 0) { u.anim.spin -= dt; inner.rotation.y += dt * 20; if (u.anim.spin <= 0) inner.rotation.y = 0; }
  p.body.position.y = p.body.userData.p0.y + (u.moving ? Math.abs(Math.sin(u.anim.walk)) * 0.08 : Math.sin(G.time * 2.2 + u.id) * 0.025);
  if (u.stun > 0 && Math.random() < 0.2) spawnP(u.x + rnd(-0.4, 0.4), u.height + 0.3, u.z + rnd(-0.4, 0.4), rnd(-1, 1), 0.5, rnd(-1, 1), 0.4, 0.15, '#ffee58');
}
function updateCorpses(dt) {
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i]; c.t += dt; const m = c.u.model, inner = m.userData.inner;
    if (c.building) {
      if (c.t < 2.5) { m.position.y = -c.u.height * 0.65 * (c.t / 2.5); m.rotation.z = Math.sin(c.t * 30) * 0.02; if (Math.random() < 0.5) spawnP(c.u.x + rnd(-2, 2), rnd(0, 2), c.u.z + rnd(-2, 2), 0, rnd(1, 3), 0, 0.8, 0.5, '#9e9e9e'); }
      else { if (c.u.parts.crystal) c.u.parts.crystal.visible = false; corpses.splice(i, 1); const k = units.indexOf(c.u); if (k >= 0) units.splice(k, 1); }
    } else {
      inner.rotation.x = -Math.min(1, c.t / 0.4) * Math.PI / 2;
      if (c.t > 1.0) m.position.y = -(c.t - 1.0) * 1.5;
      if (c.t > 2.0) { scene.remove(m); corpses.splice(i, 1); const k = units.indexOf(c.u); if (k >= 0) units.splice(k, 1); }
    }
  }
}
function step(dt) {
  G.time += dt;
  const P = G.player;
  if (G.time >= G.nextWave) { spawnWave(); G.nextWave += 30; }
  P.goldF += 1.6 * dt; if (P.goldF >= 1) { const g = Math.floor(P.goldF); P.goldF -= g; P.gold += g; G.goldEarned += g; }
  updateHeroTimers(P, dt);
  if (!P.dead) recalcHero(P);
  for (const u of units) {
    if (u.dead) continue;
    u.moving = false; u.atkCd -= dt;
    if (u.slowT > 0) u.slowT -= dt;
    if (u.hunger) {
      const hg = u.hunger; hg.t -= dt; hg.tick -= dt; u.slowT = Math.max(u.slowT, 0.1); u.slowPct = 0.12;
      if (Math.random() < 0.2) spawnP(u.x + rnd(-0.3, 0.3), u.height + 0.2, u.z + rnd(-0.3, 0.3), 0, 1.5, 0, 0.5, 0.2, '#e040fb');
      if (hg.tick <= 0) { hg.tick += 1; dealDamage(hg.src, u, hg.dps, 'magic'); }
      if (hg.t <= 0 && !u.dead) u.hunger = null;
      if (u.dead) continue;
    }
    if (u.stun > 0) { u.stun -= dt; u.windup = 0; continue; }
    if (u.windup > 0) { u.windup -= dt; if (u.windup <= 0) finishWindup(u); }
    if (u.isHero) heroAI(u, dt);
    else if (u.kind === 'melee' || u.kind === 'ranged') creepAI(u, dt);
    else if (u.kind === 'tower' || u.kind === 'fountain') towerAI(u, dt);
  }
  separate(dt);
  updateProjectiles(dt);
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  for (let i = effects.length - 1; i >= 0; i--) if (effects[i].update(dt)) effects.splice(i, 1);
  updateCorpses(dt);
  for (const u of units) if (!u.dead) syncModel(u, dt);
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t >= floats[i].life) floats.splice(i, 1); }
  updateParticles(dt);
}
function endGame(win) {
  if (G.over) return; G.over = true;
  const P = G.player;
  setTimeout(() => {
    $('end').classList.remove('hidden');
    const t = $('endTitle'); t.textContent = win ? '胜利！' : '失败'; t.style.color = win ? '#ffd54f' : '#ff5252';
    $('endStats').innerHTML = `${win ? '夜魇遗迹已被摧毁，天辉获得了胜利！' : '天辉遗迹已陷落……'}<br>英雄：${P.def.name}　等级：${P.level}<br>游戏时间：${fmtTime(G.time)}<br>击杀/死亡/助攻：${P.kills}/${P.deaths}/${P.assists}　正补/反补：${P.lh}/${P.dn}<br>总获得金钱：${Math.floor(G.goldEarned)}　摧毁建筑：${G.score[RAD]}`;
  }, 1500);
}

// ================= floating text / messages =================
function addFloat(u, text, color, size = 15, life = 1.0, gold = false) {
  floats.push({ x: u.x + rnd(-0.4, 0.4), y: (u.isBuilding ? u.height : u.height * 0.9) + 0.3, z: u.z, text: String(text), color, size, t: 0, life, gold });
  if (floats.length > 120) floats.shift();
}
function msg(text, color = '#fff') {
  const box = $('msgs'), d = document.createElement('div'); d.textContent = text; d.style.color = color; box.appendChild(d);
  while (box.children.length > 5) box.removeChild(box.firstChild);
  setTimeout(() => d.remove(), 3600);
}
let errTimer = 0;
function err(text) { const e = $('errmsg'); e.textContent = text; e.style.opacity = 1; clearTimeout(errTimer); errTimer = setTimeout(() => e.style.opacity = 0, 1300); }

// ================= camera =================
const CAM_PITCH = 58 * Math.PI / 180;
function updateCamera(dt) {
  const c = G.cam, P = G.player;
  if (G.started) {
    const sp = c.dist * 1.3 * dt;
    let mx = 0, mz = 0;
    if (keys.ArrowLeft) mx -= 1; if (keys.ArrowRight) mx += 1; if (keys.ArrowUp) mz -= 1; if (keys.ArrowDown) mz += 1;
    if (mouse.inside && document.hasFocus() && !mouse.overUI) {
      const E = 6; if (mouse.x <= E) mx -= 1; if (mouse.x >= innerWidth - E) mx += 1; if (mouse.y <= E) mz -= 1; if (mouse.y >= innerHeight - E) mz += 1;
    }
    c.x += mx * sp; c.z += mz * sp;
    if (P && (keys[' '] || G.lock) && !P.dead) { c.x += (P.x - c.x) * Math.min(1, dt * 10); c.z += (P.z - c.z) * Math.min(1, dt * 10); }
  } else { c.x = Math.sin(performance.now() / 9000) * 40; c.z = Math.cos(performance.now() / 11000) * 30 + 10; }
  c.x = clamp(c.x, -78, 78); c.z = clamp(c.z, -78, 78);
  camera.position.set(c.x, c.dist * Math.sin(CAM_PITCH), c.z + c.dist * Math.cos(CAM_PITCH));
  camera.lookAt(c.x, 0, c.z);
  sun.position.set(c.x + 40, 90, c.z + 25); sun.target.position.set(c.x, 0, c.z);
}

// ================= input =================
const keys = {}, mouse = { x: innerWidth / 2, y: innerHeight / 2, inside: false, overUI: false };
const raycaster = new T.Raycaster(), groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0), _ndc = new T.Vector2(), _hit = new T.Vector3();
function groundAt(sx, sy) {
  _ndc.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); raycaster.setFromCamera(_ndc, camera);
  return raycaster.ray.intersectPlane(groundPlane, _hit) ? { x: _hit.x, z: _hit.z } : null;
}
const _pv = new T.Vector3();
function toScreen(x, y, z) { _pv.set(x, y, z).project(camera); return { x: (_pv.x + 1) / 2 * innerWidth, y: (1 - _pv.y) / 2 * innerHeight, z: _pv.z }; }
function pickUnit(sx, sy) {
  const upp = 2 * G.cam.dist * Math.tan(camera.fov * Math.PI / 360) / innerHeight;
  let best = null, bs = 1e9;
  for (const u of units) {
    if (u.dead || (u.model && !u.model.visible) || u === G.player) continue;
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
function issueMove(x, z) { const P = G.player; P.order = { type: 'move', x, z }; P.path = null; if (P.windup > 0) { P.windup = 0; P.atkCd = 0; } clickMarker(x, z, '#4cff4c'); }
function issueAttack(t) { const P = G.player; P.order = { type: 'attack', target: t }; P.path = null; addFloatMarker(t); }
function addFloatMarker(t) { ringP(t.x, t.z, t.radius + 0.4, 14, '#ff3b3b', 0.4, 0.2, 0.15); }
function handleRight(sx, sy) {
  const P = G.player; if (!P) return;
  if (G.targeting) { G.targeting = null; return; }
  if (P.dead) return;
  const u = pickUnit(sx, sy);
  if (u && validAttackTarget(P, u)) { issueAttack(u); return; }
  if (u && u.team !== P.team && isInvuln(u)) err('该建筑处于无敌状态（需先摧毁前置防御塔）');
  const g = groundAt(sx, sy); if (g) issueMove(g.x, g.z);
}
function handleLeftTarget(sx, sy) {
  const P = G.player, tg = G.targeting; G.targeting = null;
  if (P.dead) return;
  const g = groundAt(sx, sy), u = pickUnit(sx, sy);
  if (tg.kind === 'amove') {
    if (u && validAttackTarget(P, u)) issueAttack(u);
    else if (g) { P.order = { type: 'amove', x: g.x, z: g.z }; P.path = null; clickMarker(g.x, g.z, '#ff3b3b'); }
    return;
  }
  if (tg.kind === 'item') { if (g) useItem(P, tg.slot, { x: g.x, z: g.z }); return; }
  const sk = P.skills[tg.idx], d = sk.def;
  if (tg.mode === 'unit') {
    if (!validSpellTarget(P, u)) { err(u && u.isBuilding ? '无法对建筑施放' : '无效目标'); G.targeting = tg; return; }
    P.order = { type: 'cast', idx: tg.idx, target: u, range: d.range }; P.path = null;
  } else if (g) {
    if (d.instantDir) doCast(P, { idx: tg.idx, x: g.x, z: g.z });
    else { P.order = { type: 'cast', idx: tg.idx, x: g.x, z: g.z, range: d.range }; P.path = null; }
  }
}
function pressSkill(i) {
  const P = G.player, sk = P.skills[i], d = sk.def;
  if (d.passive) { err(sk.lvl ? '这是被动技能' : '技能尚未学习'); return; }
  const e = canCast(P, sk); if (e) { err(e); return; }
  if (d.target === 'none') doCast(P, { idx: i });
  else G.targeting = { kind: 'skill', idx: i, mode: d.target, range: d.range, radius: d.radius, def: d };
}
function pressItem(slot) {
  const P = G.player, it = P.items[slot]; if (!it) return;
  const D = ITEMS[it.id];
  if (!D.active) { err('该物品没有主动效果'); return; }
  if (it.cd > 0) { err('物品冷却中'); return; }
  if (D.target === 'point') G.targeting = { kind: 'item', slot, mode: 'point', range: D.range };
  else useItem(P, slot, {});
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousedown', e => {
  if (!G.started || G.over) return;
  if (e.button === 2) handleRight(e.clientX, e.clientY);
  else if (e.button === 0) {
    if (G.targeting) handleLeftTarget(e.clientX, e.clientY);
    else { G.selected = pickUnit(e.clientX, e.clientY); }
  }
});
addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true; mouse.overUI = e.target !== canvas; });
document.addEventListener('mouseleave', () => mouse.inside = false);
canvas.addEventListener('wheel', e => { e.preventDefault(); G.cam.dist = clamp(G.cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 26, 100); }, { passive: false });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'F1') { e.preventDefault(); $('help').classList.toggle('hidden'); return; }
  if (!G.started || G.over) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Tab'].includes(k) || e.altKey) e.preventDefault();
  keys[k] = true;
  const P = G.player;
  const si = 'qwer'.indexOf(k);
  if (si >= 0 && k.length === 1) { if (e.altKey) learnSkill(si); else if (!G.paused) pressSkill(si); return; }
  const ii = '123456'.indexOf(k);
  if (ii >= 0 && k.length === 1) { if (!G.paused) pressItem(ii); return; }
  switch (k) {
    case 'b': toggleShop(); break;
    case 'a': if (!P.dead) G.targeting = { kind: 'amove' }; break;
    case 's': P.order = { type: 'idle' }; P.path = null; P.windup = 0; G.targeting = null; break;
    case 'h': P.order = { type: 'hold' }; P.path = null; break;
    case 'y': G.lock = !G.lock; msg(G.lock ? '镜头锁定英雄' : '镜头解锁', '#ccc'); break;
    case 'p': G.paused = !G.paused; $('pause').classList.toggle('hidden', !G.paused); break;
    case 'Escape': G.targeting = null; $('shop').classList.add('hidden'); $('help').classList.add('hidden'); break;
    case 'F2': break;
  }
});
addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });

// ================= minimap =================
const mm = $('minimap'), mmx = mm.getContext('2d'), MMS = mm.width;
const mmBg = document.createElement('canvas'); mmBg.width = mmBg.height = MMS;
(function () {
  const c = mmBg.getContext('2d'), s = MMS / GN;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
    const k = j * GN + i; let col = tileColorCache[k];
    if (treeAt[k]) col = cc(i) > cc(j) ? [0.2, 0.22, 0.14] : [0.12, 0.33, 0.12];
    c.fillStyle = `rgb(${col[0] * 255 | 0},${col[1] * 255 | 0},${col[2] * 255 | 0})`; c.fillRect(Math.floor(i * s), Math.floor(j * s), Math.ceil(s), Math.ceil(s));
  }
})();
const w2m = v => (v + MAPH) / (2 * MAPH) * MMS, m2w = v => v / MMS * 2 * MAPH - MAPH;
function drawMinimap() {
  mmx.drawImage(mmBg, 0, 0);
  for (const u of units) {
    if (u.dead) continue;
    const x = w2m(u.x), y = w2m(u.z);
    if (u.isBuilding) { const s = u.kind === 'ancient' ? 9 : u.kind === 'fountain' ? 0 : u.kind === 'barracks' ? 6 : 5; if (!s) continue; mmx.fillStyle = '#000'; mmx.fillRect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2); mmx.fillStyle = u.team === RAD ? '#5cff5c' : '#ff3b30'; mmx.fillRect(x - s / 2, y - s / 2, s, s); }
    else if (!u.isHero) { mmx.fillStyle = u.team === RAD ? '#8bff6a' : '#ff6a5a'; mmx.fillRect(x - 1.5, y - 1.5, 3, 3); }
  }
  const P = G.player;
  if (P && !P.dead) { const x = w2m(P.x), y = w2m(P.z); mmx.fillStyle = '#000'; mmx.fillRect(x - 5, y - 5, 10, 10); mmx.fillStyle = '#ffeb3b'; mmx.fillRect(x - 4, y - 4, 8, 8); }
  // camera trapezoid
  const cs = [[0, 0], [innerWidth, 0], [innerWidth, innerHeight], [0, innerHeight]].map(p => groundAt(p[0], p[1]) || { x: G.cam.x, z: G.cam.z - 80 });
  mmx.strokeStyle = '#fff'; mmx.lineWidth = 1.5; mmx.beginPath();
  cs.forEach((p, i) => { const x = w2m(p.x), y = w2m(p.z); i ? mmx.lineTo(x, y) : mmx.moveTo(x, y); }); mmx.closePath(); mmx.stroke();
}
let mmDrag = false;
function mmToWorld(e) { const r = mm.getBoundingClientRect(); return { x: m2w((e.clientX - r.left) / r.width * MMS), z: m2w((e.clientY - r.top) / r.height * MMS) }; }
mm.addEventListener('mousedown', e => {
  if (!G.started) return; const w = mmToWorld(e);
  if (e.button === 0) { mmDrag = true; G.cam.x = w.x; G.cam.z = w.z; G.lock = false; }
  else if (e.button === 2 && !G.player.dead) issueMove(w.x, w.z);
});
addEventListener('mousemove', e => { if (mmDrag) { const w = mmToWorld(e); G.cam.x = w.x; G.cam.z = w.z; } });
addEventListener('mouseup', () => mmDrag = false);
