// build/tests/b18.js — B18 classic heroes: Storm Spirit, Disruptor, Shadow Shaman, Tinker
module.exports = ({ test, boot, assert }) => {
  const IDS = ['storm', 'disruptor', 'sshaman', 'tinker'];
  const HELPERS = () => {
    const A = GameAPI;
    window.H18 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000, team = 1) { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      learnAll(h = A.G.player) { for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i, h); },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); H18.learnAll(); return 1; });
  }

  test('B18 heroes registered: storm/disruptor/sshaman/tinker with Chinese names, QWER, scepter+shard', async page => {
    await boot(page);
    const r = await page.evaluate(IDS => {
      const D = GameAPI.HERO_DEFS, o = { n: Object.keys(D).length, cards: document.querySelectorAll('.card').length, bad: [], ok: [] };
      for (const id of IDS) {
        const d = D[id]; if (!d) { o.bad.push(id + ':missing'); continue; }
        if (!/[\u4e00-\u9fff]/.test(d.name)) o.bad.push(id + ':name');
        const keys = d.abilities.map(a => a.key).join('');
        if (keys !== 'QWER') o.bad.push(id + ':keys:' + keys);
        if (!d.abilities.some(a => a.ult && a.scepter && a.scepter.desc)) o.bad.push(id + ':scepter');
        if (!d.abilities.some(a => a.shard && a.shard.desc)) o.bad.push(id + ':shard');
        o.ok.push({ id, name: d.name, abs: d.abilities.map(a => a.id) });
      }
      return o;
    }, IDS);
    assert(r.n === 41 && r.cards === 41, 'count ' + JSON.stringify({ n: r.n, cards: r.cards }));
    assert(!r.bad.length, 'bad ' + r.bad.join(','));
    return JSON.stringify(r.ok);
  });

  test('B18 storm: Remnant; Vortex; Overload; Ball Lightning', async page => {
    await start(page, 'storm');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H18.at(-10, -10); P.mana = P.maxMana;
      A.castAbility(0, null); A.simulate(1.3, 1 / 20);
      o.rem = A.getLog('staticRemnant').length >= 1 && (P._remnants || []).length >= 1;
      const rem = (P._remnants || [])[0];
      const f = H18.dummy(rem ? rem.x : -10, rem ? rem.z : -10, 'axe', 8000);
      A.simulate(0.8, 1 / 20);
      o.remBoom = A.getLog('staticRemnant').some(e => e.explode) || A.getLog('damage').some(e => e.ability === 'static_remnant');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f2 = H18.dummy(-8, -10, 'sven', 8000);
      A.castAbility(1, f2); A.simulate(1.0, 1 / 20);
      o.vortex = A.getLog('electricVortex').length >= 1 && (A.hasState(f2, 'rooted') || A.hasState(f2, 'stunned') || Math.hypot(f2.x + 10, f2.z + 10) < 4);
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(0, null); A.step(4);
      o.ovReady = !!P._overload || !!A.getMod(P, 'storm_ov');
      A.issueOrder(P, { type: 'attack', target: f2 });
      for (let i = 0; i < 100 && !A.getLog('overload').length; i++) A.step(2);
      o.overload = A.getLog('overload').length >= 1 || A.getLog('damage').some(e => e.ability === 'overload');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.issueOrder(P, { type: 'hold' }); A.step(2);
      A.castAbility(3, { x: 0, z: -10 }); A.simulate(1.5, 1 / 20);
      o.ball = A.getLog('ballLightning').length >= 1 || A.getLog('ballLightningEnd').length >= 1;
      return o;
    });
    assert(r.rem && r.remBoom, 'remnant ' + JSON.stringify(r));
    assert(r.vortex, 'vortex ' + JSON.stringify(r));
    assert(r.ovReady && r.overload, 'overload ' + JSON.stringify(r));
    assert(r.ball, 'ball ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B18 disruptor: Thunder Strike; Glimpse; Kinetic Field; Static Storm', async page => {
    await start(page, 'disruptor');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H18.at(-10, -10); P.mana = P.maxMana;
      const f = H18.dummy(-7, -10, 'axe', 8000);
      A.castAbility(0, f); A.simulate(0.8, 1 / 20);
      o.strike = A.getLog('thunderStrike').length >= 1 || A.getLog('damage').some(e => e.ability === 'thunder_strike');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f2 = H18.dummy(-6, -10, 'sven', 8000);
      f2._glLog = [{ t: A.G.time - 4.2, x: 4, z: -10 }, { t: A.G.time - 1, x: -6, z: -10 }];
      A.castAbility(1, f2); A.simulate(0.8, 1 / 20);
      o.glimpse = A.getLog('glimpse').length >= 1 || Math.hypot(f2.x - 4, f2.z + 10) < 3;
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(2, { x: -4, z: -10 }); A.simulate(1.4, 1 / 20);
      o.field = A.getLog('kineticField').length >= 1;
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f3 = H18.dummy(-2, -10, 'axe', 8000);
      A.castAbility(3, { x: -2, z: -10 }); A.simulate(1.5, 1 / 20);
      o.storm = A.getLog('staticStorm').length >= 1 && (A.hasState(f3, 'silenced') || A.getLog('damage').some(e => e.ability === 'static_storm'));
      return o;
    });
    assert(r.strike, 'strike ' + JSON.stringify(r));
    assert(r.glimpse, 'glimpse ' + JSON.stringify(r));
    assert(r.field, 'field ' + JSON.stringify(r));
    assert(r.storm, 'storm ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B18 sshaman: Ether Shock; Hex; Shackles; Serpent Ward', async page => {
    await start(page, 'sshaman');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H18.at(-10, -10); P.mana = P.maxMana;
      const f = H18.dummy(-7, -10, 'axe', 8000);
      A.castAbility(0, f); A.simulate(0.8, 1 / 20);
      o.shock = A.getLog('etherShock').length >= 1 || A.getLog('damage').some(e => e.ability === 'ether_shock');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(1, f); A.simulate(0.5, 1 / 20);
      o.hex = A.getLog('ssHex').length >= 1 || A.hasState(f, 'hexed');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f2 = H18.dummy(-8, -10, 'sven', 8000);
      A.castAbility(2, f2); A.simulate(1.0, 1 / 20);
      o.shackle = A.getLog('shackles').length >= 1 && (A.hasState(f2, 'stunned') || !!A.getMod(f2, 'ss_shackle'));
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(3, { x: -5, z: -10 }); A.simulate(0.8, 1 / 20);
      o.wards = A.getLog('serpentWard').length >= 1 && A.units.filter(u => !u.dead && u.isSummon && u.type === 'ss_ward').length >= 4;
      return o;
    });
    assert(r.shock, 'shock ' + JSON.stringify(r));
    assert(r.hex, 'hex ' + JSON.stringify(r));
    assert(r.shackle, 'shackle ' + JSON.stringify(r));
    assert(r.wards, 'wards ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B18 tinker: Laser; Missile; Matrix; Rearm', async page => {
    await start(page, 'tinker');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H18.at(-10, -10); P.mana = P.maxMana;
      const f = H18.dummy(-7, -10, 'axe', 8000);
      A.castAbility(0, f); A.simulate(0.8, 1 / 20);
      o.laser = A.getLog('laser').length >= 1 && (!!A.getMod(f, 'tink_blind') || A.getLog('damage').some(e => e.ability === 'laser'));
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      H18.dummy(0, -10, 'sven', 8000);
      A.castAbility(1, null); A.simulate(1.2, 1 / 20);
      o.missile = A.getLog('heatMissile').length >= 1 || A.getLog('damage').some(e => e.ability === 'heat_missile');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(2, P); A.simulate(0.5, 1 / 20);
      o.matrix = A.getLog('defenseMatrix').length >= 1 && !!A.getMod(P, 'tink_matrix');
      for (const ab of P.abilities) { ab.cd = 5; ab.cdMax = 5; }
      P.abilities[3].cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(3, null); A.simulate(4.0, 1 / 20);
      o.rearm = A.getLog('rearm').length >= 1 && P.abilities.slice(0, 3).every(a => a.cd === 0);
      return o;
    });
    assert(r.laser, 'laser ' + JSON.stringify(r));
    assert(r.missile, 'missile ' + JSON.stringify(r));
    assert(r.matrix, 'matrix ' + JSON.stringify(r));
    assert(r.rearm, 'rearm ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B18 shard/scepter apply on new heroes', async page => {
    await start(page, 'storm');
    const r = await page.evaluate(IDS => {
      const A = GameAPI, out = [];
      for (const id of IDS) {
        const h = A.spawnUnit('hero', 0, -30, -30, { heroId: id });
        A.setLevel(18, h); for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i, h);
        const sh = h.abilities.find(a => a.def.shard), sc = h.abilities.find(a => a.def.ult && a.def.scepter);
        A.giveItem('shard', h); A.giveItem('scepter', h); A.step(2);
        out.push({ id, shard: A.hasShard(h), scepter: A.hasScepter(h), shardOn: !!(sh && sh.def.shard), scOn: !!(sc && sc.def.scepterOn) });
        A.killUnit(h, null);
      }
      return out;
    }, IDS);
    assert(r.every(x => x.shard && x.scepter && x.shardOn && x.scOn), JSON.stringify(r));
    return JSON.stringify(r);
  });
};
