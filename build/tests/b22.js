// build/tests/b22.js — Roshan polish batch 4: Refresher Shard (3rd+ kill) + ground Aegis deny/contest.
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H22 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard && !u.isCourier && !(u.isRoshan)) A.killUnit(u, null); A.step(30); },
      pit() { const P = A.PIT; A.teleportHero(P.x + 2, P.z + 2); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); },
      killRosh() {
        const R = A.rosh().unit; if (!R || R.dead) { A.spawnRoshan(); }
        const u = A.rosh().unit; u.hp = 1;
        A.killUnit(u, A.G.player); A.step(2);
        return A.rosh().kills;
      },
    };
  };
  async function start(page) {
    await boot(page, 'lina'); await page.evaluate(HELPERS);
    return page.evaluate(() => {
      const A = GameAPI; A.godMode(true); A.setLevel(16); A.revealAll(true);
      for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
      A.G.nextWave = 1e9; return 1;
    });
  }

  test('B22 refresher_shard registered; Roshan 1/2/3 drop tables', async page => {
    await start(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, D = A.ITEM_DEFS, o = {};
      o.def = !!(D.refresher_shard && D.refresher_shard.noShop && D.refresher_shard.consumable && D.refresher_shard.active);
      o.deniable = !!(D.aegis && D.aegis.deniable);
      o.nItems = Object.keys(D).length;
      H22.clear(); H22.pit();
      // ensure fresh rosh state
      const R = A.rosh(); R.kills = 0; R.respawnAt = 0; if (R.unit && !R.unit.dead) A.killUnit(R.unit, null);
      A.step(2); if (!A.rosh().unit) A.spawnRoshan();
      // clear existing drops
      while (A.drops.length) A.drops.slice().forEach(d => { /* remove via deny/pick path */ const i = A.drops.indexOf(d); if (i >= 0) { A.scene && A.scene.remove(d.mesh); A.drops.splice(i, 1); } });
      // hack: empty drops array safely
      A.drops.length = 0;
      R.kills = 0;
      o.k1 = H22.killRosh(); o.d1 = A.drops.map(d => d.item).slice().sort();
      A.drops.length = 0; R.respawnAt = 0; A.spawnRoshan();
      o.k2 = H22.killRosh(); o.d2 = A.drops.map(d => d.item).slice().sort();
      A.drops.length = 0; R.respawnAt = 0; A.spawnRoshan();
      o.k3 = H22.killRosh(); o.d3 = A.drops.map(d => d.item).slice().sort();
      return o;
    });
    assert(r.def && r.deniable && r.nItems === 65, 'def ' + JSON.stringify(r));
    assert(r.k1 === 1 && r.d1.join() === 'aegis', 'k1 ' + JSON.stringify(r));
    assert(r.k2 === 2 && r.d2.join() === 'aegis,cheese', 'k2 ' + JSON.stringify(r));
    assert(r.k3 === 3 && r.d3.join() === 'aegis,cheese,refresher_shard', 'k3 ' + JSON.stringify(r));
    return JSON.stringify({ d1: r.d1, d2: r.d2, d3: r.d3 });
  });

  test('B22 Refresher Shard refreshes abilities only; Aegis deny destroys ground drop', async page => {
    await start(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H22.clear(); A.teleportHero(-20, -20);
      P.items = P.items.map(() => null);
      A.giveItem('refresher_shard', P); A.giveItem('blink', P);
      for (const ab of P.abilities) { ab.cd = ab.cdMax = 25; }
      P.items[1].cd = 12;
      o.before = { q: P.abilities[0].cd, blink: P.items[1].cd };
      o.use = A.useItem(P, 0, null);
      o.after = { q: P.abilities[0].cd, blink: P.items[1].cd, gone: !P.items[0], ev: A.getLog('refresherShard').length };

      // ground Aegis deny
      A.drops.length = 0;
      const d = A.spawnDrop('aegis', P.x + 1, P.z);
      o.deniable = A.isDeniableDrop(d);
      o.deny = A.denyDrop(P, d);
      o.goneDrop = A.drops.length === 0;
      o.denyEv = A.getLog('aegisDeny').length;
      o.noAegis = A.countItem(P, 'aegis') === 0;

      // contest: enemy can also pick (spawn new drop, enemy picks)
      const d2 = A.spawnDrop('aegis', P.x + 2, P.z);
      const foe = A.spawnUnit('hero', 1 - P.team, P.x + 2.2, P.z, { heroId: 'axe' });
      foe.order = { type: 'hold' }; foe.items = foe.items.map(() => null);
      o.enemyPick = A.pickupDrop(foe, d2);
      o.enemyHas = A.countItem(foe, 'aegis') === 1;
      return o;
    });
    assert(r.use === null && r.after.q === 0 && r.after.blink === 12 && r.after.gone && r.after.ev === 1, 'shard ' + JSON.stringify(r));
    assert(r.deniable && r.deny === null && r.goneDrop && r.denyEv === 1 && r.noAegis, 'deny ' + JSON.stringify(r));
    assert(r.enemyPick === null && r.enemyHas, 'contest ' + JSON.stringify(r));
    return JSON.stringify({ shard: r.after, deny: r.denyEv, contest: r.enemyHas });
  });
};
