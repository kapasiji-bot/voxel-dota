// build/tests/b19.js — polish batch 1 luxury items: Refresher, Octarine, Orchid, Bloodthorn, Guardian Greaves.
module.exports = ({ test, boot, assert }) => {
  const NEW = ['refresher', 'octarine', 'orchid', 'bloodthorn', 'greaves'];
  const HELPERS = () => {
    const A = GameAPI;
    window.H19 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000, team = 1) { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      only(id, h = A.G.player) { h.items = h.items.map(() => null); A.giveItem(id, h); h.mana = h.maxMana; return h.items[0]; },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return 1; });
  }

  test('B19 items: 5 luxury items registered with Chinese names and valid recipes', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(NEW => {
      const D = GameAPI.ITEM_DEFS, o = { missing: NEW.filter(id => !D[id]), bad: [], costs: {} };
      for (const id of NEW) {
        const d = D[id]; if (!d) continue;
        o.costs[id] = d.cost;
        if (!/[\u4e00-\u9fff]/.test(d.name)) o.bad.push(id + ':name');
        if (!d.parts) o.bad.push(id + ':parts');
        else {
          const sum = d.parts.reduce((a, p) => a + D[p].cost, 0);
          if (!(d.cost >= sum) || d.parts.some(p => !D[p])) o.bad.push(id + ':recipe');
        }
        if (GameAPI.itemCat(d) !== 'upgrade') o.bad.push(id + ':cat');
      }
      o.nItems = Object.keys(D).length;
      o.nHeroes = Object.keys(GameAPI.HERO_DEFS).length;
      return o;
    }, NEW);
    assert(!r.missing.length && !r.bad.length, JSON.stringify(r));
    assert(r.nItems === 65 && r.nHeroes === 41, 'counts ' + JSON.stringify(r));
    return JSON.stringify(r.costs);
  });

  test('B19 Refresher: resets ability and other item CDs, keeps own CD', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H19.at(-20, -20);
      P.items = P.items.map(() => null);
      A.giveItem('blink', P); A.giveItem('refresher', P);
      P.mana = P.maxMana;
      for (const ab of P.abilities) { ab.cd = ab.cdMax = 30; }
      P.items[0].cd = 12;
      o.before = { q: P.abilities[0].cd, blink: P.items[0].cd, ref: P.items[1].cd };
      o.err = A.useItem(P, 1, null);
      o.after = { q: P.abilities[0].cd, blink: P.items[0].cd, ref: P.items[1].cd > 100, evt: A.getLog('refresher').length };
      return o;
    });
    assert(r.err === null && r.before.q === 30 && r.after.q === 0 && r.after.blink === 0 && r.after.ref && r.after.evt === 1, JSON.stringify(r));
    return JSON.stringify(r.after);
  });

  test('B19 Octarine: CD reduction on spells/items + spell lifesteal on magic damage', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H19.at(-20, -20);
      // baseline CD without octarine
      for (const ab of P.abilities) ab.cd = 0;
      P.mana = P.maxMana;
      const foe0 = H19.dummy(-14, -20);
      A.castAbility(0, { x: -14, z: -20 }); // LSA
      A.simulate(0.5, 1 / 20);
      o.cd0 = +P.abilities[0].cd.toFixed(2);
      A.killUnit(foe0, null);
      H19.only('octarine');
      o.cdReduc = P.cdReduc; o.sl = P.spellLifesteal;
      for (const ab of P.abilities) ab.cd = 0;
      P.mana = P.maxMana; P.hp = P.maxHp * 0.5;
      const foe = H19.dummy(-14, -20);
      A.clearLog();
      A.castAbility(0, { x: -14, z: -20 });
      A.simulate(0.6, 1 / 20);
      o.cd1 = +P.abilities[0].cd.toFixed(2);
      const dmg = A.getLog('damage').filter(e => e.src === P.id && e.dtype === 'magic').reduce((a, e) => a + e.amount, 0);
      o.dmg = Math.round(dmg); o.hpGain = Math.round(P.hp - P.maxHp * 0.5);
      // item CD reduction: force staff
      A.giveItem('force', P); P.mana = P.maxMana;
      const fi = P.items.findIndex(it => it && it.id === 'force');
      A.useItem(P, fi, P); A.simulate(0.1, 1 / 20);
      o.forceCd = +P.items[fi].cd.toFixed(2);
      return o;
    });
    assert(r.cdReduc === 0.25 && r.sl === 0.25, 'props ' + JSON.stringify(r));
    assert(r.cd0 > 0 && r.cd1 < r.cd0 * 0.82 && r.cd1 > r.cd0 * 0.68, 'spell cd ' + JSON.stringify(r));
    assert(r.dmg > 50 && r.hpGain >= Math.floor(r.dmg * 0.2) - 2, 'lifesteal ' + JSON.stringify(r));
    assert(r.forceCd > 13 && r.forceCd < 15.5, 'item cd ' + r.forceCd);
    return JSON.stringify(r);
  });

  test('B19 Orchid/Bloodthorn: silence + soul burn; Bloodthorn upgrades Orchid and crits', async page => {
    await start(page, 'cm');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H19.at(-20, -20);
      const foe = H19.dummy(-13, -20, 'enigma');
      H19.only('orchid');
      o.e = A.useItem(P, 0, foe); A.simulate(0.2, 1 / 20);
      o.sil = !!foe.silenced; o.mod = !!A.getMod(foe, 'orchid');
      const hp0 = foe.hp; A.dealDamage(P, foe, 200, 'phys'); o.amp = Math.round(hp0 - foe.hp);
      A.simulate(5.2, 1 / 20);
      o.pop = A.getLog('damage').some(e => e.ability === 'orchid' && e.tgt === foe.id);
      // recipe upgrade orchid → bloodthorn
      H19.at(-20, -20); A.teleportHero(-75, -75); A.step(2);
      P.items = P.items.map(() => null); A.setGold(20000);
      A.buyItem('orchid', P); const g1 = P.gold;
      A.buyItem('bloodthorn', P);
      o.up = { hasBt: A.countItem(P, 'bloodthorn') === 1, noOrchid: A.countItem(P, 'orchid') === 0, paid: g1 - P.gold };
      // bloodthorn crit vs silenced
      H19.at(-20, -20); H19.only('bloodthorn');
      const f2 = H19.dummy(-14, -20); A.useItem(P, 0, f2); A.simulate(0.15, 1 / 20);
      A.clearLog(); A.issueAttack(f2); A.simulate(2, 1 / 20);
      o.crit = A.getLog('crit').length > 0;
      return o;
    });
    assert(r.e === null && r.sil && r.mod && r.amp > 200 && r.pop, 'orchid ' + JSON.stringify(r));
    assert(r.up.hasBt && r.up.noOrchid && r.up.paid === 3325, 'upgrade ' + JSON.stringify(r.up));
    assert(r.crit, 'bloodthorn crit');
    return JSON.stringify(r);
  });

  test('B19 Greaves: heal+mana+purge; bots can buy luxury items from builds', async page => {
    await start(page, 'cm');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H19.at(-20, -20);
      A.addModifier(P, A.MODS.silence, P, { dur: 5 });
      const ally = H19.dummy(-17, -20, 'axe', 0, 0); ally.hp = 200; ally.mana = 10;
      P.hp = P.maxHp - 400; P.mana = 20;
      H19.only('greaves');
      o.err = A.useItem(P, 0, null); A.simulate(0.15, 1 / 20);
      o.healAlly = Math.round(ally.hp); o.manaAlly = Math.round(ally.mana);
      o.purged = !A.getMod(P, 'silence'); o.armor = !!A.getMod(ally, 'greaves_armor');
      o.evt = A.getLog('greaves').length;
      // bot buy path: own fountain + gold; support EXTRA includes orchid/refresher/octarine
      const bot = A.spawnBot('cm', 1, 'mid', 2); bot.respawn = 1e9; A.setLevel(16, bot);
      const sp = { x: 67, z: -67 }; bot.x = sp.x; bot.z = sp.z; if (bot.model) bot.model.position.set(bot.x, 0, bot.z);
      bot.gold = 30000; bot.items = bot.items.map(() => null); bot.stash = [];
      bot.bot = bot.bot || {};
      for (let k = 0; k < 80; k++) { A.botShop(bot, bot.bot); A.step(1); }
      o.botBuys = bot.bot.buys || {};
      o.build = A.botBuild(bot);
      o.hasLuxury = ['orchid', 'refresher', 'octarine'].some(id => o.build.includes(id));
      o.boughtAny = Object.keys(o.botBuys).filter(id => !/^(tp|ward_|salve|smoke|dust)$/.test(id));
      o.atShop = A.atShop(bot);
      // support default build includes greaves; CM override still gets EXTRA luxuries
      o.supportBuild = A.BOT_BUILDS.support;
      o.supportHasGreaves = o.supportBuild.includes('greaves');
      return o;
    });
    assert(r.err === null && r.healAlly >= 500 && r.manaAlly >= 160 && r.purged && r.armor && r.evt === 1, 'greaves ' + JSON.stringify(r));
    assert(r.hasLuxury && r.supportHasGreaves && r.boughtAny.length >= 2, 'bot build/buy ' + JSON.stringify(r));
    return JSON.stringify({ heal: r.healAlly, buys: r.botBuys, bought: r.boughtAny, build: r.build });
  });
};
