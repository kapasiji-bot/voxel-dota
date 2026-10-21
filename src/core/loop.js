// core/loop.js — fixed-ish simulation step + render loop. step(dt) advances the whole game by dt seconds.
function step(dt) {
  G.time += dt; G.frame++;
  if (G.time >= G.nextWave) { spawnWave(); G.nextWave += 30; }
  tickVision(dt);   // vision/fog.js (5 Hz team vision grids)
  tickShop(dt); tickItemPassives(dt); tickWards(); tickTrees(); tickSummons(); tickWalls(); tickToggles(dt); tickBlur(dt);   // entities/shop.js (stock, stash delivery), entities/wards.js (expiry)
  tickCamps(); tickRoshan(); tickDrops(dt); tickCouriers();   // B8: entities/neutrals.js, roshan.js, drops.js, courier.js
  for (const h of G.heroes) {   // passive gold, cooldowns, regen, respawn for every hero
    h.goldF += 1.6 * dt; if (h.goldF >= 1) { const g = Math.floor(h.goldF); h.goldF -= g; h.gold += g; h.goldEarned = (h.goldEarned || 0) + g; if (h === G.player) G.goldEarned += g; }
    updateHeroTimers(h, dt);
  }
  for (const u of units) {
    if (u.dead) continue;
    updateModifiers(u, dt); if (u.dead) continue;
    tickInvis(u, dt);
    refreshUnit(u); updateStatusFlags(u);
    u.atkCd -= dt;
    if (isOwned(u)) updateUnitTimers(u, dt);   // summons / illusions: ability cooldowns, regen
    if (hasState(u, 'stunned')) { if (u.atk) cancelAttack(u, 'stun'); if (u.casting) cancelCasting(u); if (u.channel) interruptChannel(u, 'stun'); continue; }
    if (u.feared) { fearStep(u, dt); continue; }   // abilities/cc.js: run away, no actions
    updateAttack(u, dt);
    if (u.isHero) { if (u.bot) botUpdate(u, dt); heroAI(u, dt); }
    else if (isOwned(u)) heroAI(u, dt);   // summons / illusions take orders like heroes (player control or ai/bot/units.js)
    else if (u.kind === 'melee' || u.kind === 'ranged') creepAI(u, dt);
    else if (u.kind === 'tower' || u.kind === 'fountain') towerAI(u, dt);
    else if (u.isNeutral) neutralAI(u, dt);   // ai/neutral.js (Roshan: entities/roshan.js)
    else if (u.isCourier) courierAI(u, dt);   // entities/courier.js
  }
  updateAuras(dt);
  separate(dt);
  updateProjectiles(dt);
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  for (let i = effects.length - 1; i >= 0; i--) if (effects[i].update(dt)) effects.splice(i, 1);
  updateCorpses(dt);
  for (const u of units) if (!u.dead) syncModel(u, dt);
  updateFloats(dt);
  updateParticles(dt);
}
function endGame(win) {
  if (G.over) return; G.over = true; G.winner = win ? RAD : DIRE;
  emit('gameOver', { win });
  const P = G.player, radWin = win; if (P && P.team === DIRE) win = !win;   // win = Radiant won; LAN Dire players see their own result
  setTimeout(() => {
    $('end').classList.remove('hidden');
    const t = $('endTitle'); t.textContent = win ? '胜利！' : '失败'; t.style.color = win ? '#ffd54f' : '#ff5252';
    $('endStats').innerHTML = `${radWin ? '夜魇遗迹已被摧毁，天辉获得了胜利！' : (P && P.team === DIRE ? '天辉遗迹已被摧毁，夜魇获得了胜利！' : '天辉遗迹已陷落……')}<br>英雄：${P ? P.def.name : '-'}　等级：${P ? P.level : '-'}<br>游戏时间：${fmtTime(G.time)}<br>击杀/死亡/助攻：${P ? `${P.kills}/${P.deaths}/${P.assists}` : '-'}　正补/反补：${P ? `${P.lh}/${P.dn}` : '-'}<br>总获得金钱：${Math.floor(G.goldEarned)}　摧毁建筑：${G.score[P ? P.team : RAD]}`;
  }, 1500);
}
let last = performance.now(), fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  if (NET.on && G.started && !G.over && !G.halt) netFrame();   // B11 LAN match: fixed lockstep ticks (net/lockstep.js)
  else if (G.started && !G.paused && !G.halt && !G.over) { let t = rdt * G.timeScale; while (t > 1e-6) { const s = Math.min(0.05, t); step(s); t -= s; } }
  else if (!G.paused) { for (let i = effects.length - 1; i >= 0; i--) if (effects[i].update(rdt)) effects.splice(i, 1); updateCorpses(rdt); updateParticles(rdt); for (const u of units) if (u.isBuilding && !u.dead) syncModel(u, rdt); }
  updateCamera(rdt); updateIndicators(); tickAudio(rdt);   // audio/ambience.js (B9)
  if (G.started) { renderFog(rdt); renderTrees(rdt); renderWalls(rdt); animJungleProps(rdt); }
  renderer.render(scene, camera);
  drawOverlay();
  if (G.started) { drawMinimap(); updateHUD(); updateChannelBar(); updateScoreboard(rdt); }
  fpsN++; fpsT += rdt; if (fpsT >= 0.5) { $('fps').textContent = 'FPS ' + Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
}
