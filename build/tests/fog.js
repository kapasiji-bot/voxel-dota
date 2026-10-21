// build/tests/fog.js — fog of war / vision / invisibility & detection scenarios. Loaded by run-tests.js.
module.exports = ({ test, boot, assert }) => {
  const CLEAR = () => { const A = GameAPI; A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(70, 1 / 20); };

  test('fog: enemies hidden outside team vision (3D model, minimap), revealed inside; trees block sight; night shrinks vision', async page => {
    await boot(page, 'axe');
    const r = await page.evaluate(CLEAR).then(() => page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      A.teleportHero(-67, 67); A.step(2, 1 / 20);
      const c = A.spawnUnit('melee', 1, 22, -24); c.wps = [{ x: c.x, z: c.z }]; c.wp = 0; c.hp = c.maxHp = 9999; A.step(2, 1 / 20);
      o.farVisible = A.isVisible(c, 0); o.canAttackFar = A.G.player && (A.issueAttack(c), A.step(2, 1 / 20), P.order.type === 'attack');
      window._c = c; return o;
    }));
    await page.waitForFunction(() => !_c.model.visible, null, { timeout: 4000 }).catch(() => {}); // a render frame can be slow (shader compile on swiftshader)
    const r1 = await page.evaluate(() => ({ modelHidden: !_c.model.visible }));
    const r2 = await page.evaluate(() => { const A = GameAPI; A.teleportHero(22 - 8, -24 + 4); A.step(2, 1 / 20); return { nearVisible: A.isVisible(_c, 0) }; });
    await page.waitForFunction(() => _c.model.visible, null, { timeout: 4000 }).catch(() => {});
    const r3 = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = { modelShown: _c.model.visible }; A.killUnit(_c, null); A.step(40, 1 / 20);
      // trees: hero in the jungle; classify cells 6–18 away by whether the straight line to them crosses a tree / cliff
      const spots = [[-36, 22], [-24, 30], [30, -24], [-20, -46], [24, 40]]; let blockedSeen = 0, blocked = 0, clearSeen = 0, clear = 0, pick = null;
      for (const [sx, sz] of spots) {
        if (!A.isWalk(sx, sz)) continue;
        A.teleportHero(-67, 67); A.updateVision(); const base = new Uint8Array(A.VIS[0]);
        A.teleportHero(sx, sz); A.updateVision();
        for (let dx = -18; dx <= 18; dx += 2) for (let dz = -18; dz <= 18; dz += 2) {
          const x = P.x + dx, z = P.z + dz, d = Math.hypot(dx, dz); if (d < 6 || d > 18 || Math.abs(x) > 74 || Math.abs(z) > 74) continue;
          const k = (Math.floor((z + 80) / 2)) * 80 + Math.floor((x + 80) / 2); if (base[k] || A.sightBlocked(x, z)) continue;
          const hx = (Math.floor((P.x + 80) / 2) * 2 - 79), hz = (Math.floor((P.z + 80) / 2) * 2 - 79), tx = (Math.floor((x + 80) / 2) * 2 - 79), tz = (Math.floor((z + 80) / 2) * 2 - 79), dd = Math.hypot(tx - hx, tz - hz);
          let crosses = false; for (let s = 1; s < dd - 1; s += 0.25) { const px = hx + (tx - hx) * s / dd, pz = hz + (tz - hz) * s / dd, cx = Math.floor((px + 80) / 2) * 2 - 79, cz = Math.floor((pz + 80) / 2) * 2 - 79; if (Math.max(Math.abs(px - cx), Math.abs(pz - cz)) < 0.6 && A.sightBlocked(px, pz)) { crosses = true; break; } }
          const seen = A.visAt(0, x, z);
          if (crosses) { blocked++; if (seen) blockedSeen++; else if (!pick && A.isWalk(x, z)) pick = { x, z, hx: P.x, hz: P.z }; } else { clear++; if (seen) clearSeen++; }
        }
      }
      o.trees = { blocked, blockedSeenPct: +(blockedSeen / Math.max(1, blocked)).toFixed(2), clear, clearSeenPct: +(clearSeen / Math.max(1, clear)).toFixed(2) };
      if (pick) {   // an enemy standing behind trees stays hidden although it is close
        A.teleportHero(pick.hx, pick.hz); const e = A.spawnUnit('melee', 1, pick.x, pick.z); e.wps = [{ x: e.x, z: e.z }]; e.wp = 0; A.step(1, 1 / 20);
        o.behindTree = { dist: +Math.hypot(e.x - P.x, e.z - P.z).toFixed(1), visible: A.isVisible(e, 0) }; A.killUnit(e, null);
      }
      // night vision
      A.teleportHero(-36, 22); A.G.time = 100; A.updateVision(); const cnt = () => A.VIS[0].reduce((a, v) => a + v, 0); const day = cnt();
      A.G.time = 320; A.updateVision(); o.night = { day, night: cnt(), isNight: A.isNight() }; A.G.time = 101; A.updateVision();
      // revealAll toggle
      const f = A.spawnUnit('melee', 1, 10, -10); f.wps = [{ x: f.x, z: f.z }]; f.wp = 0; A.teleportHero(-67, 67); A.step(1, 1 / 20); o.revealOff = A.isVisible(f, 0);
      A.revealAll(true); A.step(1, 1 / 20); o.revealOn = A.isVisible(f, 0); A.revealAll(false); A.step(1, 1 / 20); o.revealBack = A.isVisible(f, 0);
      // minimap: hidden enemies are skipped (draw count proxy: canSee) — and fog layer drawn
      o.minimapFog = !!document.getElementById('minimap');
      return o;
    });
    const o = Object.assign(r, r1, r2, r3);
    assert(!o.farVisible && !o.canAttackFar && o.modelHidden, 'far enemy hidden ' + JSON.stringify(o));
    assert(o.nearVisible && o.modelShown, 'near enemy shown ' + JSON.stringify(o));
    assert(o.trees.blocked >= 10 && o.trees.blockedSeenPct <= 0.25 && o.trees.clearSeenPct >= 0.9, 'trees block ' + JSON.stringify(o.trees));
    assert(o.behindTree && !o.behindTree.visible && o.behindTree.dist < 18, 'behind tree ' + JSON.stringify(o.behindTree));
    assert(o.night.isNight && o.night.night < o.night.day * 0.8, 'night ' + JSON.stringify(o.night));
    assert(!o.revealOff && o.revealOn && !o.revealBack, 'revealAll ' + JSON.stringify(o));
    return JSON.stringify(o);
  });

  test('fog: bots only use their team vision (no target / fight on unseen or invisible heroes)', async page => {
    await boot(page, 'axe');
    await page.evaluate(CLEAR);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {}; A.godMode(true);
      A.G.time = 320;   // night: Dire hero vision 14 < 19 → the player at 19 is in the fog
      const run = (reveal, px, pz) => {
        for (const h of A.G.heroes) if (h.bot) { A.killUnit(h, null); h.respawn = 1e9; h.bot = null; }
        A.revealAll(reveal); A.teleportHero(px, pz); A.issueOrder(P, { type: 'hold' });
        const b = A.spawnBot('lina', 1, 'mid', 2); A.setLevel(8, b); A.teleportHero(4, -4, b); A.clearLog(); A.simulate(1.5, 1 / 20);
        const L = A.getLog();
        return { mode: b.bot.mode, target: b.bot.target === P, castsOnP: L.filter(e => e.type === 'cast' && e.unit === b.id).length, atkOnP: L.filter(e => e.type === 'attackStart' && e.unit === b.id && e.target === P.id).length, sees: A.isVisible(P, 1) };
      };
      o.fogged = run(false, -9.5, 9.5);     // 19 away: within fight range but outside Dire (night) vision
      o.revealed = run(true, -9.5, 9.5);       // fog off: the same bot engages
      o.close = run(false, -4, 4);          // in vision → engages
      return o;
    });
    assert(!r.fogged.sees && !r.fogged.target && r.fogged.castsOnP === 0 && r.fogged.atkOnP === 0, 'fogged ' + JSON.stringify(r));
    assert(r.revealed.sees && (r.revealed.target || r.revealed.castsOnP > 0), 'revealed ' + JSON.stringify(r));
    assert(r.close.sees && (r.close.target || r.close.castsOnP > 0), 'close ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('invisibility: Riki permanent invis (towers/bots ignore), attack reveal + refade, Dust true sight, Track reveal + bounty, Shadow Walk break', async page => {
    await boot(page, 'bh');
    await page.evaluate(CLEAR);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {}; A.godMode(true); A.setLevel(18); for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
      const tw = A.units.find(u => u.kind === 'tower' && u.team === 0 && u.lane === 'mid' && u.tier === 1);
      const rk = A.spawnUnit('hero', 1, tw.x + 5, tw.z - 5, { heroId: 'riki' }); rk.abilities[2].lvl = 4; rk.order = { type: 'hold' }; rk.hp = rk.maxHp = 5000;
      A.teleportHero(tw.x + 2, tw.z - 2); A.issueOrder(P, { type: 'hold' }); A.clearLog(); A.simulate(1.5, 1 / 20);
      o.cloak = { invis: A.isInvisible(rk), cellSeen: A.visAt(0, rk.x, rk.z), visibleToRad: A.isVisible(rk, 0), towerShot: false };
      A.simulate(1, 1 / 20); A.clearLog(); A.simulate(3, 1 / 20); o.cloak.towerShot = A.getLog('damage').some(e => e.src === tw.id && e.tgt === rk.id); o.cloak.canTarget = (A.issueAttack(rk), A.step(1, 1 / 20), P.order.type === 'attack');
      A.issueOrder(P, { type: 'hold' });
      // attacking reveals Riki for the fade delay, then he vanishes again
      const c = A.spawnUnit('melee', 0, rk.x + 1.5, rk.z); c.wps = [{ x: c.x, z: c.z }]; c.wp = 0; c.hp = c.maxHp = 9000;
      A.issueOrder(rk, { type: 'attack', target: c }); let seenAfter = false; for (let i = 0; i < 40 && !seenAfter; i++) { A.step(1, 1 / 20); seenAfter = A.isVisible(rk, 0); }
      A.issueOrder(rk, { type: 'hold' }); A.killUnit(c, null); const t0 = A.G.time; let back = 0; for (let i = 0; i < 120 && !back; i++) { A.step(1, 1 / 20); if (!A.isVisible(rk, 0)) back = A.G.time - t0; }
      o.reveal = { seenAfterAttack: seenAfter, invisAgainAfter: +back.toFixed(2), breakEvt: A.getLog('invisBreak').some(e => e.unit === rk.id) };
      // dust: true sight + slow
      A.giveItem('dust'); const ds = P.items.findIndex(i => i && i.id === 'dust'); const s0 = rk.speed; A.useItem(P, ds, null); A.step(1, 1 / 20);
      o.dust = { dusted: !!A.getMod(rk, 'dusted'), visible: A.isVisible(rk, 0), slowed: rk.speed < s0, consumed: !P.items.some(i => i && i.id === 'dust') };
      // track while dusted, then Riki runs far away into the fog: still visible to Radiant
      A.castAbility(3, rk); A.simulate(0.6, 1 / 20); A.removeModById(rk, 'dusted'); A.teleportHero(40, -40, rk); A.step(2, 1 / 20);
      o.track = { mod: !!A.getMod(rk, 'bh_track'), visibleFar: A.isVisible(rk, 0), invis: A.isInvisible(rk), cellSeen: A.visAt(0, rk.x, rk.z) };
      const g0 = P.gold; A.dealDamage(P, rk, 1e6, 'pure'); const tb = A.getLog('trackBounty')[0];
      o.track.bounty = tb ? tb.self : 0; o.track.goldGain = Math.round(P.gold - g0);
      // Shadow Walk: invisible after fade; attacking breaks it with bonus damage + mini-stun
      A.issueOrder(P, { type: 'hold' }); const d = A.spawnUnit('hero', 1, P.x + 6, P.z, { heroId: 'axe' }); d.order = { type: 'hold' }; d.hp = d.maxHp = 9000; const cr = A.castAbility(2, null); A.simulate(1.3, 1 / 20);
      o.walk = { invis: A.isInvisible(P), seenByDire: A.isVisible(P, 1) }; A.clearLog(); A.issueAttack(d); A.simulate(2.5, 1 / 20); const L = A.getLog();
      o.walk.broke = L.some(e => e.type === 'invisBreak' && e.unit === P.id); o.walk.bonus = L.filter(e => e.type === 'damage' && e.ability === 'bh_walk').length; o.walk.stun = L.some(e => e.type === 'modifierAdd' && e.unit === d.id && e.mod === 'stun'); o.walk.after = A.isInvisible(P);
      return o;
    });
    assert(r.cloak.invis && r.cloak.cellSeen && !r.cloak.visibleToRad && !r.cloak.towerShot && !r.cloak.canTarget, 'cloak ' + JSON.stringify(r.cloak));
    assert(r.reveal.seenAfterAttack && r.reveal.breakEvt && r.reveal.invisAgainAfter > 1.5 && r.reveal.invisAgainAfter < 4, 'reveal ' + JSON.stringify(r.reveal));
    assert(r.dust.dusted && r.dust.visible && r.dust.slowed && r.dust.consumed, 'dust ' + JSON.stringify(r.dust));
    assert(r.track.mod && r.track.visibleFar && r.track.invis && !r.track.cellSeen && r.track.bounty === 350 && r.track.goldGain >= 350, 'track ' + JSON.stringify(r.track));
    assert(r.walk.invis && !r.walk.seenByDire && r.walk.broke && r.walk.bonus === 1 && r.walk.stun && !r.walk.after, 'shadow walk ' + JSON.stringify(r.walk));
    return JSON.stringify(r);
  });
};
