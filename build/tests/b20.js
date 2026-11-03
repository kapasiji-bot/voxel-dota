// build/tests/b20.js — polish batch 2: Aghanim's Scepter / Shard ally gifting + courier deliver + support bot gift.
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H20 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard && !u.isCourier) A.killUnit(u, null); A.step(40); },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      ally(x, z, heroId = 'sven') {
        const h = A.spawnUnit('hero', A.G.player.team, x, z, { heroId });
        h.order = { type: 'hold' }; h.respawn = 1e9; h.bot = null;
        A.step(1); return h;
      },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(16); A.revealAll(true); for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return 1; });
  }

  test('B20 giftable flags on scepter/shard; giftItem hands item and applies upgrade', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H20.at(-20, -20);
      o.gifS = !!(A.ITEM_DEFS.scepter.giftable && A.ITEM_DEFS.scepter.scepter);
      o.gifH = !!(A.ITEM_DEFS.shard.giftable && A.ITEM_DEFS.shard.shard);
      o.notBlink = !A.isGiftable({ def: A.ITEM_DEFS.blink });
      P.items = P.items.map(() => null); A.giveItem('scepter', P);
      const ally = H20.ally(-18, -20, 'axe');
      ally.items = ally.items.map(() => null);
      o.before = { giver: !!P.scepter, ally: !!ally.scepter, slot: P.items[0] && P.items[0].id };
      o.err = A.giftItem(P, 0, ally);
      o.after = {
        err: o.err, giverHas: !!P.items[0], allyHas: ally.items.some(i => i && i.id === 'scepter'),
        giverOn: !!P.scepter, allyOn: !!ally.scepter, evt: A.getLog('gift').length,
      };
      // reject duplicate / enemy / non-giftable
      P.items = P.items.map(() => null); A.giveItem('scepter', P); A.giveItem('blink', P);
      o.dup = A.giftItem(P, 0, ally);
      o.blink = A.giftItem(P, 1, ally);
      const foe = A.spawnUnit('hero', 1 - P.team, -10, -20, { heroId: 'sven' }); foe.order = { type: 'hold' };
      o.foe = A.giftTargetError(P, foe);
      return o;
    });
    assert(r.gifS && r.gifH && r.notBlink, 'flags ' + JSON.stringify(r));
    assert(r.after.err === null && !r.after.giverHas && r.after.allyHas && !r.after.giverOn && r.after.allyOn && r.after.evt === 1, 'gift ' + JSON.stringify(r.after));
    assert(r.dup && r.blink && r.foe, 'rejects ' + JSON.stringify({ dup: r.dup, blink: r.blink, foe: r.foe }));
    return JSON.stringify(r.after);
  });

  test('B20 gift walks into range; far giftViaCourier delivers to ally', async page => {
    await start(page, 'cm');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H20.at(-30, -30);
      P.items = P.items.map(() => null); A.giveItem('shard', P);
      const ally = H20.ally(-10, -30, 'sven'); ally.items = ally.items.map(() => null);
      // out of gift range → order gift, then walk in
      o.dist = Math.hypot(P.x - ally.x, P.z - ally.z);
      o.walk = A.giftItem(P, 0, ally);
      o.order = P.order && P.order.type;
      A.simulate(8, 1 / 20);
      o.afterWalk = { hasGiver: P.items.some(i => i && i.id === 'shard'), hasAlly: ally.items.some(i => i && i.id === 'shard'), on: !!ally.shard, order: P.order && P.order.type };

      // courier path
      H20.at(-40, -40);
      P.items = P.items.map(() => null); A.giveItem('scepter', P);
      if (!P.courier || P.courier.dead) A.spawnCourier(P);
      const far = H20.ally(10, 10, 'jugg'); far.items = far.items.map(() => null);
      o.bag0 = P.courier.bag.length;
      o.cerr = A.giftViaCourier(P, 0, far);
      o.bag1 = P.courier.bag.map(s => s.id);
      o.giftTo = P.courier.giftTo && P.courier.giftTo.id === far.id;
      o.corder = P.courier.corder && P.courier.corder.type;
      // fly deliver
      for (let i = 0; i < 200 && P.courier.bag.length; i++) A.step(3);
      o.delivered = far.items.some(i => i && i.id === 'scepter') && !!far.scepter;
      o.bagDone = P.courier.bag.length;
      o.evtC = A.getLog('giftCourier').length;
      return o;
    });
    assert(r.walk === null && r.order === 'gift' && r.afterWalk.hasAlly && r.afterWalk.on && !r.afterWalk.hasGiver, 'walk ' + JSON.stringify(r));
    assert(r.cerr === null && r.bag1.includes('scepter') && r.giftTo && r.corder === 'deliver', 'courier load ' + JSON.stringify(r));
    assert(r.delivered && r.bagDone === 0 && r.evtC === 1, 'courier deliver ' + JSON.stringify(r));
    return JSON.stringify({ walk: r.afterWalk, courier: r.delivered });
  });

  test('B20 support botGift gives scepter to carry', async page => {
    await start(page, 'cm');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H20.at(-20, -20);
      // player as CM support; spawn carry ally
      const carry = H20.ally(-18, -20, 'jugg');
      carry.items = carry.items.map(() => null);
      P.items = P.items.map(() => null); A.giveItem('scepter', P);
      // ensure botRole sees CM as support
      o.role = A.botRole(P);
      P.bot = A.makeBot ? null : { mode: 'lane', d: { tick: 0.2 }, t: 0 };
      // makeBot may not be exported — set minimal bot state
      if (!P.bot) P.bot = { mode: 'lane', d: { tick: 0.2 }, t: 0, thinks: 0 };
      o.ok = A.botGift(P, P.bot);
      o.after = {
        ok: o.ok, gifts: P.bot.gifts, giver: P.items.some(i => i && i.id === 'scepter'),
        carry: carry.items.some(i => i && i.id === 'scepter'), carryOn: !!carry.scepter,
        evt: A.getLog('botGift').length,
      };
      return o;
    });
    assert(r.role === 'support', 'role ' + r.role);
    assert(r.after.ok && r.after.gifts === 1 && !r.after.giver && r.after.carry && r.after.carryOn && r.after.evt === 1, JSON.stringify(r.after));
    return JSON.stringify(r.after);
  });
};
