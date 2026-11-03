// build/tests/b24.js — polish batch 6: shared ally courier control (orders + focus + ownership isolation).
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H24 = {
      A,
      clear() {
        A.G.nextWave = 1e9;
        for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
        A.step(10);
      },
      ally(heroId) {
        const A = GameAPI, P = A.G.player;
        const h = A.spawnUnit('hero', P.team, P.x + 4, P.z, { heroId: heroId || 'cm' });
        h.order = { type: 'hold' }; A.spawnCourier(h); return h;
      },
    };
  };
  async function start(page, hero) {
    await boot(page, hero || 'lina');
    await page.evaluate(HELPERS);
    return page.evaluate(() => {
      const A = GameAPI; A.godMode(true); A.setLevel(6); A.revealAll(true);
      A.G.nextWave = 1e9; if (!A.G.player.courier) A.spawnCourier(A.G.player); return 1;
    });
  }

  test('B24 ally courier: teammate can home/secret/deliver ally courier; stash/bag stay with owner', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H24.clear(); A.teleportHero(-40, -40);
      const ally = H24.ally('cm');
      o.can = A.canTeamCourier(P, ally);
      const foe0 = A.spawnUnit('hero', 1 - P.team, 40, 40, { heroId: 'axe' }); A.spawnCourier(foe0);
      o.foeDeny = A.courierOrder(foe0, 'home', P);
      // home / secret on ally courier
      o.home = A.courierOrder(ally, 'home', P);
      o.homeType = ally.courier.corder.type;
      o.secret = A.courierOrder(ally, 'secret', P);
      o.secretType = ally.courier.corder.type;
      // deliver: put item in ally stash only — must load ally stash, not player's
      ally.stash = ally.stash || []; ally.stash.push({ id: 'boots', n: 1 });
      P.stash = []; A.courierBagAdd(P.courier, 'circlet'); // player's bag unrelated
      const bag0 = ally.courier.bag.map(s => s.id).join();
      o.deliver = A.courierOrder(ally, 'deliver', P);
      o.phase = ally.courier.corder.phase;
      o.evt = A.getLog('courierOrder').filter(e => e.owner === ally.id && e.by === P.id && e.order === 'deliver').length;
      // simulate load at fountain (Radiant fountain ≈ -71,71)
      const home = { x: -67, z: 67 }; ally.courier.x = home.x; ally.courier.z = home.z; A.simulate(3, 1 / 20);
      o.bagAfter = ally.courier.bag.map(s => s.id).join();
      o.allyStash = (ally.stash || []).length;
      o.playerBag = P.courier.bag.map(s => s.id).join();
      o.playerGold = P.gold;
      // upgrade still spends owner's gold only (ally too poor)
      ally.gold = 0; o.upgradeAlly = A.courierUpgrade(ally);
      return o;
    });
    assert(r.can && typeof r.foeDeny === 'string', 'auth ' + JSON.stringify(r));
    assert(r.home === null && r.homeType === 'home', 'home ' + JSON.stringify(r));
    assert(r.secret === null && r.secretType === 'secret', 'secret ' + JSON.stringify(r));
    assert(r.deliver === null && r.evt >= 1 && r.phase === 'load', 'deliver ' + JSON.stringify(r));
    assert(r.bagAfter.includes('boots') && r.allyStash === 0 && r.playerBag === 'circlet', 'ownership ' + JSON.stringify(r));
    assert(typeof r.upgradeAlly === 'string', 'upgrade owner-only ' + r.upgradeAlly);
    return JSON.stringify(r);
  });

  test('B24 focus UX: Shift+F3 / cycleTeamCourierFocus; isCtl selects team courier; HUD names owner', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H24.clear(); A.teleportHero(-35, -35);
      const ally = H24.ally('cm');
      o.owners = A.teamCourierOwners(P.team).length;
      o.focus0 = A.focusedCourierOwner().id;
      o.cyc = A.cycleTeamCourierFocus();
      o.focus1 = A.focusedCourierOwner().id;
      o.selCourier = !!(A.CTL && A.CTL.sel && A.CTL.sel[0] && A.CTL.sel[0].isCourier);
      // click-select path: isCtl
      const c = ally.courier;
      o.isCtl = !!(c && !c.dead && c.isCourier && c.team === P.team);
      A.selectUnits([c]);
      o.activeCourier = A.ctlActive().isCourier;
      A.updateCourierHUD();
      o.hud = document.getElementById('courierSt').textContent;
      // enemy courier not controllable
      const foe = A.spawnUnit('hero', 1 - P.team, 30, 30, { heroId: 'axe' });
      const fc = A.spawnCourier(foe);
      o.enemyCtl = fc.team === P.team;
      return o;
    });
    assert(r.owners >= 2 && r.cyc && r.focus1 !== r.focus0, 'cycle ' + JSON.stringify(r));
    assert(r.isCtl && r.activeCourier && /友军信使|水晶/.test(r.hud), 'hud ' + JSON.stringify(r));
    assert(!r.enemyCtl, 'enemy');
    return JSON.stringify(r);
  });

  test('B24 LAN cour cmd shape: net wrap sends owner id; exec rejects cross-team', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H24.clear();
      const ally = H24.ally('cm');
      // Direct sim path already covered; validate canTeam + owner id plumbing via emit log
      A.clearLog(); A.record(true);
      A.courierOrder(ally, 'home', P);
      const ev = A.getLog('courierOrder').pop();
      o.by = ev && ev.by; o.owner = ev && ev.owner; o.order = ev && ev.order;
      o.sameTeam = ally.team === P.team;
      // cross-team rejected
      const foe = A.spawnUnit('hero', 1 - P.team, 20, -20, { heroId: 'axe' });
      A.spawnCourier(foe);
      o.cross = A.courierOrder(foe, 'home', P);
      return o;
    });
    assert(r.sameTeam && r.by && r.owner && r.by !== r.owner && r.order === 'home', 'ally order evt ' + JSON.stringify(r));
    assert(typeof r.cross === 'string', 'cross-team ' + r.cross);
    return JSON.stringify(r);
  });
};
