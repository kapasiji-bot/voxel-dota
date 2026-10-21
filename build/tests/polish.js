// build/tests/polish.js — wards, Town Portal, shop/stash rule, hero-select layout, minimap fog. Loaded by run-tests.js.
module.exports = ({ test, boot, assert }) => {
  const CLEAR = () => { const A = GameAPI; A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(70, 1 / 20); A.godMode(true); };

  test('wards: observer vision, invisible to enemies, sentry true sight (wards + invisible heroes), hero hits kill / deny, stock, expiry, walk-to-place', async page => {
    await boot(page, 'cm');
    await page.evaluate(CLEAR);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {}, S = { x: -26, z: 10 };
      // stock: 2 observers in stock, max 2 carried
      o.buy = [A.buyItem('ward_obs', P), A.buyItem('ward_obs', P), A.buyItem('ward_obs', P)]; o.stockAfter = A.stockOf(0, 'ward_obs');
      const sl = P.items.findIndex(i => i && i.id === 'ward_obs'); o.charges = P.items[sl].charges;
      // walk-to-place: point 30 away → 'useItem' order, hero walks, then places
      A.teleportHero(S.x + 28, S.z); A.useItem(P, sl, S); o.orderType = P.order.type; A.simulate(8, 1 / 20);
      const w = A.liveWards(0, 'obs')[0]; o.placed = !!w && Math.hypot(w.x - S.x, w.z - S.z) < 2; o.chargesLeft = P.items[sl] && P.items[sl].charges;
      A.teleportHero(-60, 60); A.updateVision();
      const c = A.spawnUnit('melee', 1, S.x + 2.5, S.z); c.wps = [{ x: c.x, z: c.z }]; c.wp = 0; A.step(2, 1 / 20);
      o.vision = { cell: A.visAt(0, S.x, S.z), creepSeen: A.isVisible(c, 0), wardSeenByDire: A.isVisible(w, 1), direCellSeen: A.visAt(1, w.x, w.z), dbg: [Math.round(c.x), Math.round(c.z), c.dead, A.visAt(1, c.x, c.z), c.def && c.def.sight] };
      o.stockRestock = (A.simulate(76, 1 / 20), A.stockOf(0, 'ward_obs'));
      A.killUnit(c, null);
      // an enemy (Dire) ward next to the player: hidden; a Radiant sentry reveals it and an invisible Riki
      A.teleportHero(-30, 30); const dd = A.spawnUnit('hero', 1, -20, 22, { heroId: 'axe' }); dd.order = { type: 'hold' };
      const ew = A.placeWard(dd, 'obs', { x: -27, z: 27 }); A.killUnit(dd, null); dd.respawn = 1e9;
      const rk = A.spawnUnit('hero', 1, -25, 25, { heroId: 'riki' }); rk.abilities[2].lvl = 1; rk.order = { type: 'hold' }; A.simulate(2, 1 / 20);
      o.enemyWard = { seen: A.isVisible(ew, 0), cellSeen: A.visAt(0, ew.x, ew.z), rikiInvis: A.isInvisible(rk), rikiSeen: A.isVisible(rk, 0), canAttack: (A.issueAttack(ew), A.step(1, 1 / 20), P.order.type === 'attack') };
      A.issueOrder(P, { type: 'hold' }); A.giveItem('ward_sentry'); const ss = P.items.findIndex(i => i && i.id === 'ward_sentry'); A.useItem(P, ss, { x: -27, z: 29 }); A.step(3, 1 / 20);
      o.sentry = { placed: A.liveWards(0, 'sentry').length, wardSeen: A.isVisible(ew, 0), rikiSeen: A.isVisible(rk, 0) };
      A.killUnit(rk, null); rk.respawn = 1e9;
      // spells / creeps don't hurt wards; hero attacks: 1 per hit → 3 hits
      const cr = A.spawnUnit('melee', 0, ew.x + 1, ew.z); o.creepDmg = A.dealDamage(cr, ew, 200, 'phys', { attackId: 99 }) + A.dealDamage(P, ew, 500, 'magic'); A.killUnit(cr, null);
      const g0 = P.gold; A.clearLog(); A.issueAttack(ew); A.simulate(6, 1 / 20); let L = A.getLog();
      o.kill = { dead: ew.dead, hits: L.filter(e => e.type === 'damage' && e.tgt === ew.id).length, evt: L.filter(e => e.type === 'wardKill' && !e.deny).length, gold: Math.round(P.gold - g0 - 0) };
      // deny own observer
      const g1 = P.gold; A.issueAttack(w); A.teleportHero(w.x + 1.5, w.z); A.issueAttack(w); A.simulate(6, 1 / 20); L = A.getLog('wardKill');
      o.deny = { dead: w.dead, evt: L.some(e => e.deny && e.unit === w.id), gold: Math.round(P.gold - g1) };
      // expiry
      const s2 = A.liveWards(0, 'sentry')[0]; s2.expire = A.G.time + 0.2; A.simulate(0.5, 1 / 20); o.expired = s2.dead && A.getLog('wardExpire').length === 1;
      return o;
    });
    assert(r.buy[0] === null && r.buy[1] === null && r.buy[2] && r.stockAfter === 0 && r.charges === 2, 'stock ' + JSON.stringify(r));
    assert(r.orderType === 'useItem' && r.placed && r.chargesLeft === 1, 'walk to place ' + JSON.stringify(r));
    assert(r.vision.cell && r.vision.creepSeen && !r.vision.wardSeenByDire && r.vision.direCellSeen, 'observer vision / invisible ' + JSON.stringify(r.vision));
    assert(r.stockRestock === 1, 'restock ' + r.stockRestock);
    assert(!r.enemyWard.seen && r.enemyWard.cellSeen && r.enemyWard.rikiInvis && !r.enemyWard.rikiSeen && !r.enemyWard.canAttack, 'enemy ward hidden ' + JSON.stringify(r.enemyWard));
    assert(r.sentry.placed === 1 && r.sentry.wardSeen && r.sentry.rikiSeen, 'sentry ' + JSON.stringify(r.sentry));
    assert(r.creepDmg === 0 && r.kill.dead && r.kill.hits === 3 && r.kill.evt === 1 && r.kill.gold >= 50, 'kill ' + JSON.stringify(r));
    assert(r.deny.dead && r.deny.evt && r.deny.gold >= 25, 'deny ' + JSON.stringify(r.deny));
    assert(r.expired, 'expiry');
    return JSON.stringify(r);
  });

  test('wards render: enemy ward model hidden, own ward + fog on minimap (darker fog where never explored)', async page => {
    await boot(page, 'cm');
    await page.evaluate(CLEAR);
    await page.evaluate(() => { const A = GameAPI; A.resume(); A.setTimeScale(0); const P = A.G.player; A.teleportHero(-30, 30);
      window._own = A.placeWard(P, 'obs', { x: -36, z: 36 }); const d = A.spawnUnit('hero', 1, -20, 22, { heroId: 'axe' }); window._en = A.placeWard(d, 'obs', { x: -28, z: 28 }); A.killUnit(d, null); d.respawn = 1e9; A.updateVision(); });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const A = GameAPI, mm = document.getElementById('minimap'), S = mm.width, w2m = v => Math.round((v + 80) / 160 * S);
      const D = mm.getContext('2d').getImageData(0, 0, S, mm.height).data;
      const px = (wx, wz) => { const i = (w2m(wz) * S + w2m(wx)) * 4; return [D[i], D[i + 1], D[i + 2]]; };
      const lum = c => Math.round(c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11);
      return { ownModel: _own.model.visible, enemyModel: _en.model.visible, ownPix: px(_own.x, _own.z), seenLum: lum(px(-62, 62)), unseenLum: lum(px(62, -40)), farLum: lum(px(40, 40)) };
    });
    assert(r.ownModel && !r.enemyModel, 'models ' + JSON.stringify(r));
    assert(r.ownPix[0] > 180 && r.ownPix[1] > 150, 'own ward icon on minimap ' + JSON.stringify(r));
    assert(r.unseenLum < r.seenLum * 0.35, 'minimap fog strong ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('TP scroll: 3 s channel → fountain / chosen tower, stun interrupts, silence does not, hero cooldown, enemy sees it only in vision', async page => {
    await boot(page, 'sven');
    await page.evaluate(CLEAR);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {}, F = A.G.fountains[0];
      const use = (pt) => { const sl = P.items.findIndex(i => i && i.id === 'tp'); return A.useItem(P, sl, pt); };
      A.giveItem('tp'); A.giveItem('tp'); A.teleportHero(0, 2); A.clearLog();
      o.first = use(null); A.simulate(1.5, 1 / 20); o.mid = { channel: !!P.channel, tps: A.G.tps.length, x: Math.round(P.x) }; A.simulate(1.7, 1 / 20);
      o.home = { arrive: A.getLog('tpArrive').length, dFountain: +Math.hypot(P.x - F.x, P.z - F.z).toFixed(1), tps: A.G.tps.length, cdErr: use(null) };
      // stun interrupts
      P.icd = {}; for (const it of P.items) if (it) it.cd = 0; A.teleportHero(0, 2); A.clearLog(); use(null); A.simulate(1, 1 / 20); A.stun(P, 0.5); A.simulate(3, 1 / 20);
      o.stun = { cancel: A.getLog('tpCancel').length, arrive: A.getLog('tpArrive').length, x: Math.round(P.x), z: Math.round(P.z) };
      // silence + chosen tower: point near Radiant top T1 → lands next to it
      P.icd = {}; for (const it of P.items) if (it) it.cd = 0; A.giveItem('tp');
      const t1 = A.units.find(u => u.kind === 'tower' && u.team === 0 && u.lane === 'top' && u.tier === 1);
      A.teleportHero(0, 2); A.clearLog(); use({ x: t1.x + 3, z: t1.z - 6 }); A.simulate(1, 1 / 20); A.addModifier(P, A.MODS.silence, null, { dur: 1 }); A.simulate(2.3, 1 / 20);
      o.tower = { arrive: A.getLog('tpArrive').length, dTower: +Math.hypot(P.x - t1.x, P.z - t1.z).toFixed(1), cancel: A.getLog('tpCancel').length };
      // a Dire hero TPs to its T1 mid: Radiant sees the swirl only while that spot is in Radiant vision
      const d = A.spawnUnit('hero', 1, 40, -40, { heroId: 'axe' }); d.order = { type: 'hold' }; A.giveItem('tp', d);
      const dt1 = A.units.find(u => u.kind === 'tower' && u.team === 1 && u.lane === 'mid' && u.tier === 1);
      A.teleportHero(-60, 60); A.useItem(d, d.items.findIndex(i => i && i.id === 'tp'), { x: dt1.x, z: dt1.z }); A.step(10, 1 / 20);
      const tp = A.G.tps.find(t => t.team === 1); o.enemy = { tp: !!tp, visibleToRad: tp ? A.visAt(0, tp.x, tp.z) : null };
      A.teleportHero(dt1.x - 14, dt1.z + 14); A.updateVision(); o.enemy.visibleNear = tp ? A.visAt(0, tp.x, tp.z) : null;
      return o;
    });
    assert(r.first === null && r.mid.channel && r.mid.tps === 1 && r.mid.x === 0, 'channel ' + JSON.stringify(r));
    assert(r.home.arrive === 1 && r.home.dFountain < 8 && r.home.tps === 0 && r.home.cdErr, 'arrive fountain + cooldown ' + JSON.stringify(r.home));
    assert(r.stun.cancel === 1 && r.stun.arrive === 0 && r.stun.x === 0, 'stun interrupt ' + JSON.stringify(r.stun));
    assert(r.tower.arrive === 1 && r.tower.cancel === 0 && r.tower.dTower < 6, 'tower + silence ' + JSON.stringify(r.tower));
    assert(r.enemy.tp && r.enemy.visibleToRad === false && r.enemy.visibleNear === true, 'enemy tp vision ' + JSON.stringify(r.enemy));
    return JSON.stringify(r);
  });

  test('shop rule: buy in base → inventory; away → stash, delivered on return; selling only in base; bots TP + ward in a short match', async page => {
    await boot(page, 'axe');
    await page.evaluate(CLEAR);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {}; A.setGold(5000); A.clearLog();
      o.inBase = { atShop: A.atShop(P), r: A.buyItem('boots', P), inv: P.items.filter(Boolean).map(i => i.id).join() };
      A.teleportHero(0, 2); A.step(2, 1 / 20);
      o.away = { atShop: A.atShop(P), r: A.buyItem('claymore', P), inv: P.items.filter(Boolean).length, stash: (P.stash || []).map(s => s.id).join(), stashEvt: A.getLog('buy').slice(-1)[0].stash, sell: A.sellItem(0, P), gold: P.gold };
      A.teleportHero(-62, 62); A.step(2, 1 / 20);
      o.back = { inv: P.items.filter(Boolean).map(i => i.id).join(), stash: P.stash.length, deliver: A.getLog('stashDeliver').length, sell: A.sellItem(P.items.findIndex(i => i && i.id === 'claymore'), P), gold: P.gold };
      // full inventory in base → stash until a slot frees up
      for (let i = 0; i < 6; i++) A.giveItem('circlet'); A.buyItem('ring', P); o.full = { stash: P.stash.length };
      A.sellItem(5, P); A.step(1, 1 / 20); o.full.after = P.stash.length; o.full.ring = P.items.some(i => i && i.id === 'ring');
      return o;
    });
    assert(r.inBase.atShop && r.inBase.r === null && r.inBase.inv.includes('boots'), 'in base ' + JSON.stringify(r));
    assert(!r.away.atShop && r.away.r === null && r.away.inv === 1 && r.away.stash === 'claymore' && r.away.stashEvt === true && r.away.sell, 'away ' + JSON.stringify(r.away));
    assert(r.back.inv.includes('claymore') && r.back.stash === 0 && r.back.deliver === 1 && r.back.sell === null, 'back ' + JSON.stringify(r.back));
    assert(r.full.stash === 1 && r.full.after === 0 && r.full.ring, 'full inventory ' + JSON.stringify(r.full));
    // bots: buy TP, return to lane by TP, place observer wards
    const b = await page.evaluate(() => {
      const A = GameAPI, out = {};
      A.G.nextWave = A.G.time + 1; for (const [id, team, lane] of [['cm', 1, 'mid'], ['lion', 0, 'bot'], ['sven', 1, 'top']]) A.spawnBot(id, team, lane, 1);
      A.simulate(150, 1 / 20); const bots = A.G.heroes.filter(h => h.bot);
      for (const h of bots) { A.killUnit(h, null); h.respawn = 1; }
      A.simulate(90, 1 / 20); const L = A.getLog();
      out.tp = L.filter(e => e.type === 'botTp').map(e => e.why); out.arrive = L.filter(e => e.type === 'tpArrive').length;
      out.wards = L.filter(e => e.type === 'wardPlaced').map(e => e.ward + '@' + e.team);
      out.buys = bots.map(h => h.def.id + ':' + Object.entries(h.bot.buys || {}).map(([k, v]) => k + v).join('/'));
      return out;
    });
    assert(b.tp.includes('lane') && b.arrive >= 1, 'bot TP to lane ' + JSON.stringify(b));
    assert(b.wards.some(w => w.startsWith('obs')), 'bots ward ' + JSON.stringify(b));
    return JSON.stringify({ r, b });
  });

  test('hero select: no clipped text on cards at 1280×720, 1366×768, 1600×900, 1920×1080', async page => {
    await boot(page);
    const out = {};
    for (const [w, h] of [[1280, 720], [1366, 768], [1600, 900], [1920, 1080]]) {
      await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(150);
      out[w] = await page.evaluate(() => { const bad = [];
        for (const el of document.querySelectorAll('.card h2, .card .attr span, .card .sk, .card .btn')) { const c = el.getBoundingClientRect(), pc = el.closest('.card').getBoundingClientRect(); if (el.scrollWidth > el.clientWidth + 1 || c.right > pc.right - 3) bad.push(el.textContent.slice(0, 12)); }
        const cards = [...document.querySelectorAll('.card')].map(c => c.getBoundingClientRect()); return { bad, inView: cards.every(c => c.right <= innerWidth && c.left >= 0) }; });
    }
    for (const [w, v] of Object.entries(out)) assert(!v.bad.length && v.inView, 'select ' + w + ' ' + JSON.stringify(v));
    return JSON.stringify(out);
  });
};
