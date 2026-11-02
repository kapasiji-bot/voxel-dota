// build/tests/b12.js — B12 mid-game polish: buyback, glyph, smoke, desolator/satanic/linken/lotus/bloodstone/shard,
// Spirit Bear inventory, bot buyback/glyph/smoke hooks.
module.exports = ({ test, boot, assert }) => {
  const NEW = ['smoke', 'desolator', 'satanic', 'linken', 'lotus', 'bloodstone', 'shard'];
  const HELPERS = () => {
    const A = GameAPI;
    window.H12 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000, team = 1) { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      only(id, h = A.G.player) { h.items = h.items.map(() => null); A.giveItem(id, h); h.mana = h.maxMana; return h.items[0]; },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(16); A.revealAll(true); for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return 1; });
  }

  test('B12 items: smoke + 6 mid-game items registered with recipes / Chinese names', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(NEW => {
      const D = GameAPI.ITEM_DEFS, o = { missing: NEW.filter(id => !D[id]), bad: [] };
      for (const id of NEW) {
        const d = D[id]; if (!/[\u4e00-\u9fff]/.test(d.name)) o.bad.push(id + ':name');
        if (d.parts) { const sum = d.parts.reduce((a, p) => a + D[p].cost, 0); if (!(d.cost >= sum) || d.parts.some(p => !D[p])) o.bad.push(id + ':recipe'); }
      }
      o.costs = Object.fromEntries(NEW.map(id => [id, D[id].cost]));
      o.cats = { smoke: GameAPI.itemCat(D.smoke), deso: GameAPI.itemCat(D.desolator), shard: GameAPI.itemCat(D.shard) };
      return o;
    }, NEW);
    assert(!r.missing.length && !r.bad.length, JSON.stringify(r));
    assert(r.cats.smoke === 'consumable' && r.cats.deso === 'upgrade', 'cats ' + JSON.stringify(r.cats));
    return JSON.stringify(r.costs);
  });

  test('B12 buyback: cost scales with level/time, revives at fountain, cooldown, death UI status', async page => {
    await start(page, 'axe');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      A.setLevel(12); A.simulate(120, 1 / 20);   // ~2 min
      o.cost = A.buybackCost(P);
      A.godMode(false); P.hp = 0; A.killUnit(P, null); A.step(2);
      o.dead = P.dead; o.ready = A.buybackReady(P); o.ui = document.getElementById('bbStatus').textContent;
      A.setGold(50); o.poor = A.canBuyback(P); o.err = A.doBuyback(P);
      A.setGold(o.cost + 500); o.ok = A.doBuyback(P); o.alive = !P.dead; o.spent = o.cost + 500 - P.gold;
      o.atBase = Math.hypot(P.x - (-67), P.z - 67) < 8;
      o.cd = A.buybackReady(P); A.godMode(false); P.hp = 0; A.killUnit(P, null); A.step(1); o.cdBlock = A.doBuyback(P);
      o.btn = !!document.getElementById('bbBtn');
      return o;
    });
    assert(r.cost >= 100 + 12 * 12 * 1.5, 'cost ' + r.cost);
    assert(r.dead && r.ready && r.ui.includes('买活'), 'ui ' + JSON.stringify(r));
    assert(r.poor === false && r.err === '金钱不足', 'poor');
    assert(r.ok === null && r.alive && r.atBase && r.spent === r.cost, 'buyback ' + JSON.stringify(r));
    assert(r.cd === false && r.cdBlock === '买活冷却中' && r.btn, 'cd ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B12 glyph: shared team cooldown, buildings invulnerable briefly, HUD button', async page => {
    await start(page, 'sven');
    const r = await page.evaluate(() => {
      const A = GameAPI, o = {};
      o.ready0 = A.glyphReady(0);
      const tw = A.units.find(u => u.kind === 'tower' && u.team === 0 && !u.dead);
      const foe = H12.dummy(tw.x + 3, tw.z + 3); A.step(1);
      o.cast = A.castGlyph(0); o.active = A.glyphActive(0); o.inv = A.isInvuln(tw);
      const d0 = tw.hp; A.dealDamage(foe, tw, 500, 'phys'); o.blocked = tw.hp === d0;
      A.simulate(A.GLYPH_DUR + 0.5, 1 / 20); o.after = A.glyphActive(0); o.inv2 = A.isInvuln(tw);
      o.again = A.castGlyph(0); o.cd = A.glyphState()[0].ready - A.G.time;
      o.btn = document.getElementById('glyphBtn').textContent;
      return o;
    });
    assert(r.ready0 && r.cast === null && r.active && r.inv && r.blocked, 'glyph on ' + JSON.stringify(r));
    assert(!r.after && !r.inv2 && r.again === '防御符文冷却中' && r.cd > 200, 'glyph cd ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B12 smoke: team invis, breaks near enemy hero / on cast; stock consumable', async page => {
    await start(page, 'axe');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H12.at(-30, -30);
      const ally = A.spawnBot('cm', 0, 'mid', 2); ally.x = P.x + 2; ally.z = P.z; if (ally.model) ally.model.position.set(ally.x, 0, ally.z); ally.respawn = 1e9;
      H12.only('smoke'); o.stock = A.stockOf(0, 'smoke');
      A.useItem(P, 0, null); A.simulate(0.5, 1 / 20);
      const ev = A.getLog('smoke')[0];
      o.me = A.isInvisible(P); o.ally = A.isInvisible(ally); o.n = ev ? ev.n : 0; o.ev = A.getLog('smoke').length;
      const foe = H12.dummy(P.x + 4, P.z, 'axe'); A.simulate(0.4, 1 / 20);
      o.broke = !A.isInvisible(P) && !A.isInvisible(ally);
      // move away from the foe so the new cloud is not instantly broken by proximity
      A.killUnit(foe, null); A.teleportHero(-40, -40); ally.x = P.x + 2; ally.z = P.z;
      A.giveItem('smoke', P); const sl = P.items.findIndex(i => i && i.id === 'smoke');
      A.useItem(P, sl, null); A.simulate(0.5, 1 / 20); o.mid = A.isInvisible(P);
      A.castAbility(0, null, P); A.simulate(0.4, 1 / 20);
      o.castBreak = !A.isInvisible(P);
      return o;
    });
    assert(r.me && r.ally && r.n >= 2 && r.ev === 1, 'apply ' + JSON.stringify(r));
    assert(r.broke && r.mid && r.castBreak, 'break ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B12 desolator / satanic / linken / lotus / bloodstone / shard effects', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H12.at(-20, -20);
      // Desolator armor shred
      const d = H12.dummy(-14, -20); const a0 = d.armor; H12.only('desolator');
      A.issueOrder(P, { type: 'attack', target: d }); A.simulate(2.5, 1 / 20);
      o.deso = { armor: +(d.armor - a0).toFixed(1), mod: !!A.getMod(d, 'deso') };
      A.killUnit(d, null);
      // Satanic lifesteal
      H12.at(-20, -20); const e = H12.dummy(-14, -20); H12.only('satanic'); P.hp = P.maxHp * 0.5; const hp0 = P.hp;
      A.issueOrder(P, { type: 'attack', target: e }); A.simulate(3, 1 / 20);
      o.satanic = { healed: P.hp > hp0 + 5 };
      A.useItem(P, 0, null); o.rage = !!A.getMod(P, 'satanic');
      // Linken's blocks unit-target spell
      H12.at(-20, -20); const lion = H12.dummy(-12, -20, 'lion'); A.setLevel(10, lion); for (let k = 0; k < 4; k++) A.learnSkill(1, lion); // hex? check lion skills
      // Lion: 0 spike, 1 hex, 2 mana drain, 3 finger — use hex (unit target)
      for (let k = 0; k < 4; k++) A.learnSkill(1, lion); lion.mana = lion.maxMana;
      H12.only('linken'); A.clearLog();
      A.castAbility(1, P, lion); A.simulate(0.8, 1 / 20);
      o.linken = { blocked: A.getLog('linkenBlock').length >= 1, hexed: !!P.hexed, cd: P.items[0].cd > 5 };
      // Lotus reflects
      H12.at(-20, -20); H12.only('lotus'); const foe2 = H12.dummy(-12, -20, 'lion'); A.setLevel(10, foe2);
      for (let k = 0; k < 4; k++) A.learnSkill(1, foe2); foe2.mana = foe2.maxMana;
      A.useItem(P, 0, P); A.step(2); o.lotusOn = A.hasState(P, 'reflect');
      A.castAbility(1, P, foe2); A.simulate(0.8, 1 / 20);
      o.lotus = { reflect: A.getLog('spellReflect').length >= 1, foeHex: !!foe2.hexed };
      // Bloodstone charges + pact
      H12.at(-20, -20); H12.only('bloodstone'); const v = H12.dummy(-10, -20); A.killUnit(v, P); A.step(2);
      o.bs = { charges: P.items[0].charges, pact: null };
      A.useItem(P, 0, null); o.bs.pact = A.getLog('bloodstone').slice(-1)[0];
      // Shard upgrades Lina Q
      H12.only('shard'); A.step(1); o.shard = { on: !!P.shard, dmg: P.abilities[0].def.values.dmg[0] };
      return o;
    });
    assert(r.deso.mod && r.deso.armor <= -5.5, 'deso ' + JSON.stringify(r.deso));
    assert(r.satanic.healed && r.rage, 'satanic ' + JSON.stringify(r.satanic));
    assert(r.linken.blocked && !r.linken.hexed && r.linken.cd, 'linken ' + JSON.stringify(r.linken));
    assert(r.lotusOn && r.lotus.reflect && r.lotus.foeHex, 'lotus ' + JSON.stringify(r.lotus));
    assert(r.bs.charges >= 1 && r.bs.pact && r.bs.pact.heal >= 30, 'bs ' + JSON.stringify(r.bs));
    assert(r.shard.on && r.shard.dmg === 165, 'shard ' + JSON.stringify(r.shard));
    return JSON.stringify(r).slice(0, 400);
  });

  test('B12 Spirit Bear inventory: 3 slots, item props apply, transfer from hero', async page => {
    await boot(page, 'ld'); await page.evaluate(HELPERS);
    const r = await page.evaluate(() => {
      const A = GameAPI; A.godMode(true); A.setLevel(10); A.revealAll(true);
      for (let k = 0; k < 4; k++) A.learnSkill(0);   // summon bear
      A.castAbility(0, null); A.simulate(1, 1 / 20);
      const bear = A.ownedUnits(A.G.player).find(u => u.type === 'ld_bear');
      const o = { slots: bear && bear.invSlots, items: bear && bear.items && bear.items.length };
      const dmg0 = bear.dmgMin;
      A.giveItem('claymore', bear); A.step(1);
      o.dmg = bear.dmgMin - dmg0; o.has = !!bear.items[0];
      const P = A.G.player; P.items = P.items.map(() => null); A.giveItem('phase', P);
      o.tr = A.transferItem(P, 0, bear); o.bearItems = bear.items.filter(Boolean).map(i => i.id);
      o.heroEmpty = !P.items[0];
      return o;
    });
    assert(r.slots === 3 && r.items === 3, 'slots ' + JSON.stringify(r));
    assert(r.has && r.dmg >= 20, 'props ' + JSON.stringify(r));
    assert(r.tr === null && r.bearItems.includes('phase') && r.bearItems.includes('claymore') && r.heroEmpty, 'transfer ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B12 bots: buyback when defending ancient, glyph under siege, smoke on gank', async page => {
    await start(page, 'axe');
    const r = await page.evaluate(() => {
      const A = GameAPI;
      const bot = A.spawnBot('sven', 0, 'mid', 2); A.setLevel(14, bot); bot.gold = 8000; bot.bot.d = A.DIFFS[2];
      A.killUnit(bot, null); A.step(2);
      const ancient = A.units.find(u => u.kind === 'ancient' && u.team === 0);
      A.setPlan(0, 'defend', { target: ancient });
      // put enemy heroes near ancient
      const e1 = A.spawnBot('lina', 1, 'mid', 2); e1.x = ancient.x + 5; e1.z = ancient.z; e1.respawn = 1e9;
      const e2 = A.spawnBot('cm', 1, 'mid', 2); e2.x = ancient.x - 5; e2.z = ancient.z; e2.respawn = 1e9;
      A.step(1); A.clearLog();
      const bb = A.botBuyback(bot, bot.bot);
      const o = { bb, alive: !bot.dead, ev: A.getLog('botBuyback').length };
      // glyph
      ancient.hp = ancient.maxHp * 0.5;
      A.G.glyph = [{ ready: 0, until: 0 }, { ready: 0, until: 0 }];
      const g = A.botGlyph(bot, bot.bot); o.glyph = g; o.gActive = A.glyphActive(0); o.gEv = A.getLog('botGlyph').length;
      // smoke — move to river so base enemies don't instantly break the cloud
      for (const e of [e1, e2]) { e.x = 50; e.z = 50; }
      bot.x = -20; bot.z = -20; if (bot.model) bot.model.position.set(bot.x, 0, bot.z);
      bot.items = bot.items.map(() => null); A.giveItem('smoke', bot);
      const foe = A.spawnBot('pa', 1, 'bot', 2); foe.x = bot.x + 25; foe.z = bot.z; foe.respawn = 1e9;
      bot.bot.gank = { target: foe, until: A.G.time + 12 };
      const ally = A.spawnBot('cm', 0, 'mid', 2); ally.x = bot.x + 1; ally.z = bot.z; ally.respawn = 1e9;
      const sense = { allies: [ally], foes: [], ecreeps: [], hpPct: 1 };
      o.smoke = A.botSmokeUse(bot, bot.bot, sense); A.simulate(0.5, 1 / 20); o.smoked = A.isInvisible(bot); o.sEv = A.getLog('botSmoke').length;
      return o;
    });
    assert(r.bb && r.alive && r.ev >= 1, 'buyback ' + JSON.stringify(r));
    assert(r.glyph && r.gActive && r.gEv >= 1, 'glyph ' + JSON.stringify(r));
    assert(r.smoke && r.smoked && r.sEv >= 1, 'smoke ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
