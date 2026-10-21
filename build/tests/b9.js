// build/tests/b9.js — B9 sound: Web Audio module boots headless and every synthesized recipe plays without throwing,
// throttle + voice pool cap a teamfight burst, settings (mute / volumes) persist in localStorage across reloads, options
// panel (F10 / ⚙ / M), and world sounds only fire for events the player's team can see (fog / invisibility) and in earshot.
module.exports = ({ test, boot, assert }) => {
  const unlock = page => page.evaluate(async () => { const A = GameAPI; const ok = A.auUnlock(); await new Promise(r => setTimeout(r, 150)); return { ok, state: A.AU.ctx && A.AU.ctx.state }; });

  test('B9 audio: boots headless, all recipes + spell families synthesize, ambience ticks, options panel F10 / M', async page => {
    await boot(page); const u = await unlock(page);
    await page.evaluate(() => { GameAPI.startGame('lina', { enemies: 2, allies: 1 }); GameAPI.pause(); });
    const r = await page.evaluate(async () => {
      const A = GameAPI, o = { fams: {} };
      for (const id in A.SPELL_SFX) o.fams[A.spellFamily(id)] = 1;
      A.audioReset(); let n = 0;
      for (const k in A.SOUNDS) { A.AU.last = {}; A.AU.voices.length = 0; if (A.auPlay(k, { bus: 'ui', p: { h: 0.4, fam: 'fire', n: 2 } })) n++; }
      o.n = n; o.total = Object.keys(A.SOUNDS).length;
      for (const f in o.fams) o.fams[f] = !!A.SOUNDS['sp_' + f];
      A.G.paused = false; for (let i = 0; i < 30; i++) A.tickAudio(0.05); o.bed = !!(A.AU.ctx && A.AU.ctx.state === 'running');
      await new Promise(r => setTimeout(r, 400));
      return o;
    });
    await page.keyboard.press('F10');
    const p1 = await page.evaluate(() => ({ open: !document.getElementById('options').classList.contains('hidden'), sliders: document.querySelectorAll('#options input[type=range]').length }));
    await page.keyboard.press('m');
    const p2 = await page.evaluate(() => ({ muted: GameAPI.AU.set.muted, box: document.getElementById('opt_muted').checked, btn: document.getElementById('optBtn').textContent }));
    await page.keyboard.press('F10');
    const p3 = await page.evaluate(() => document.getElementById('options').classList.contains('hidden'));
    assert(u.ok && r.n === r.total && r.total >= 40, 'recipes ' + JSON.stringify([u, r.n, r.total]));
    assert(Object.keys(r.fams).length >= 12 && Object.values(r.fams).every(Boolean), 'families ' + JSON.stringify(r.fams));
    assert(p1.open && p1.sliders === 4 && p2.muted && p2.box && p2.btn.includes('🔇') && p3, 'panel ' + JSON.stringify([p1, p2, p3]));
    return `ctx=${u.state} recipes ${r.n}/${r.total} families=${Object.keys(r.fams).join(',')} panel ok`;
  });

  test('B9 audio: per-type throttle + voice pool keep a teamfight burst small', async page => {
    await boot(page, 'sven'); await unlock(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player; A.G.cam.x = P.x; A.G.cam.z = P.z; A.audioReset(); const o = {};
      let n = 0; for (let i = 0; i < 40; i++) if (A.auPlay('hitMelee', { unit: P })) n++; o.sameInstant = n; o.thr = A.AU.stats.throttle;
      A.audioReset(); n = 0; for (let i = 0; i < 40; i++) { A.AU.last = {}; if (A.auPlay('hitMelee', { unit: P })) n++; } o.maxConcurrent = n;   // ignore min-gap: concurrency cap
      A.audioReset(); n = 0; const names = ['swing', 'hitMelee', 'creepHit', 'launch', 'projHit', 'towerShot', 'crit', 'sp_fire', 'sp_ice', 'sp_magic', 'creepDie', 'heroDie'];
      for (let i = 0; i < 200; i++) { A.AU.last = {}; if (A.auPlay(names[i % names.length], { unit: P })) n++; }
      o.mixed = n; o.voices = A.AU.voices.length; o.pool = A.AU.stats.pool;
      return o;
    });
    assert(r.sameInstant === 1 && r.thr === 39, 'min gap ' + JSON.stringify(r));
    assert(r.maxConcurrent === 5, 'per-type cap ' + JSON.stringify(r));
    assert(r.voices <= 24 && r.mixed <= 24 && r.pool > 0, 'voice pool ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B9 audio: mute + volumes persist in localStorage across reloads; muted plays nothing', async page => {
    await boot(page);
    await page.evaluate(() => { const A = GameAPI; A.AU.set.sfx = 0.33; A.AU.set.amb = 0.1; A.auSetMuted(true); });
    await page.reload(); await page.waitForFunction(() => window.GameAPI && document.querySelector('.card'));
    const r = await page.evaluate(() => { const A = GameAPI; A.startGame('axe'); A.pause(); A.audioReset(); const played = A.auPlay('levelUp', { bus: 'ui' }); return { set: A.AU.set, played, muted: A.AU.stats.muted, ls: localStorage.getItem('voxdota.audio') }; });
    await page.evaluate(() => GameAPI.auSetMuted(false));
    await page.reload(); await page.waitForFunction(() => window.GameAPI && document.querySelector('.card'));
    const r2 = await page.evaluate(() => GameAPI.AU.set);
    assert(r.set.muted === true && r.set.sfx === 0.33 && r.set.amb === 0.1 && r.played === false && r.muted === 1, 'persist ' + JSON.stringify(r));
    assert(r2.muted === false && r2.sfx === 0.33, 'unmute persist ' + JSON.stringify(r2));
    return `stored ${r.ls}`;
  });

  test('B9 audio: world sounds only for events the player team sees (fog, invisibility), volume / pan by camera distance', async page => {
    await boot(page, 'lina'); await unlock(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {}; A.G.nextWave = 1e9; A.godMode(true);
      const e = A.spawnUnit('hero', 1, 40, -40, { heroId: 'zeus' }); e.order = { type: 'hold' }; A.updateVision();
      A.G.cam.x = e.x; A.G.cam.z = e.z; A.audioReset(); A.audioLog(true);
      A.Events.emit('cast', { unit: e.id, ability: 'bolt', slot: 1 }); A.Events.emit('projectileLaunch', { unit: e.id, kind: 'hero', target: P.id });
      o.fogged = { log: A.AU.log.length, fog: A.AU.stats.fog };
      A.teleportHero(e.x - 4, e.z); A.issueOrder(P, { type: 'stand' }); A.step(0.3); A.updateVision(); A.AU.last = {};
      A.Events.emit('cast', { unit: e.id, ability: 'bolt', slot: 1 }); o.seen = A.AU.log.map(l => l.name);
      // invisible ally-side check: an enemy Riki (invisible) next to us stays silent
      const rk = A.spawnUnit('hero', 1, P.x + 5, P.z, { heroId: 'riki' }); rk.abilities[2].lvl = 4; rk.order = { type: 'stand' }; A.issueOrder(P, { type: 'stand' }); A.simulate(1.5, 1 / 20); A.updateVision(); A.audioLog(true); A.AU.last = {};
      A.Events.emit('attackStart', { unit: rk.id, kind: 'hero', target: P.id }); o.invis = { log: A.AU.log.length, inv: A.isInvisible(rk) };
      // distance falloff + pan: own hero at camera vs 20 to the right vs off-screen
      A.revealAll(true); A.G.cam.x = P.x; A.G.cam.z = P.z; A.audioLog(true); A.AU.last = {}; A.auPlay('sp_fire', { x: P.x, z: P.z });
      A.AU.last = {}; A.auPlay('sp_fire', { x: P.x + 20, z: P.z }); A.AU.last = {}; o.farOk = A.auPlay('sp_fire', { x: P.x + 90, z: P.z });
      o.vols = A.AU.log.map(l => [l.vol, l.pan]); return o;
    });
    assert(r.fogged.log === 0 && r.fogged.fog >= 2, 'fogged enemy must be silent ' + JSON.stringify(r));
    assert(r.seen.includes('sp_lightning'), 'visible enemy cast audible ' + JSON.stringify(r));
    assert(r.invis.inv && r.invis.log === 0, 'invisible attacker silent ' + JSON.stringify(r.invis));
    assert(r.vols.length === 2 && r.vols[0][0] > r.vols[1][0] && r.vols[1][1] > 0.3 && r.farOk === false, 'falloff/pan ' + JSON.stringify(r.vols));
    return JSON.stringify(r);
  });
};
