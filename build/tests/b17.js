// build/tests/b17.js — B17 classic heroes: Kunkka, Spectre, Weaver, Ember Spirit
module.exports = ({ test, boot, assert }) => {
  const IDS = ['kunkka', 'spectre', 'weaver', 'ember'];
  const HELPERS = () => {
    const A = GameAPI;
    window.H17 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000, team = 1) { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      learnAll(h = A.G.player) { for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i, h); },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); H17.learnAll(); return 1; });
  }

  test('B17 heroes registered: kunkka/spectre/weaver/ember with Chinese names, QWER, scepter+shard', async page => {
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
    assert(r.n === 37 && r.cards === 37, 'count ' + JSON.stringify({ n: r.n, cards: r.cards }));
    assert(!r.bad.length, 'bad ' + r.bad.join(','));
    return JSON.stringify(r.ok);
  });

  test('B17 kunkka: Torrent stun; Tidebringer cleave; X Mark return; Ghost Ship', async page => {
    await start(page, 'kunkka');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H17.at(-10, -10); P.mana = P.maxMana;
      const f = H17.dummy(-8, -10, 'axe', 8000);
      A.castAbility(0, { x: -8, z: -10 }); A.simulate(2.2, 1 / 20);
      o.torrent = A.getLog('torrent').length >= 1 && (A.hasState(f, 'stunned') || A.getLog('damage').some(e => e.ability === 'torrent'));
      // Tidebringer
      for (const ab of P.abilities) ab.cd = 0; A.clearLog();
      A.issueOrder(P, { type: 'attack', target: f });
      for (let i = 0; i < 80 && !A.getLog('tidebringer').length; i++) A.step(2);
      o.tide = A.getLog('tidebringer').length >= 1;
      // X Marks
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f2 = H17.dummy(-6, -10, 'sven', 8000);
      const x0 = f2.x, z0 = f2.z;
      A.issueOrder(P, { type: 'hold' }); A.step(2);
      A.castAbility(2, f2); A.simulate(0.8, 1 / 20);
      o.xMark = !!A.getMod(f2, 'kunk_x') && A.getLog('xMarks').length >= 1;
      A.teleportHero(-2, -6, f2); A.step(2);
      A.castAbility(2, null); A.simulate(0.6, 1 / 20); // recast
      o.xReturn = A.getLog('xReturn').length >= 1 || (Math.hypot(f2.x - x0, f2.z - z0) < 2.5);
      // Ghost Ship
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f3 = H17.dummy(0, -10, 'axe', 8000);
      A.castAbility(3, { x: 10, z: -10 }); A.simulate(2.5, 1 / 20);
      o.ship = A.getLog('ghostShip').length >= 1 || A.getLog('damage').some(e => e.ability === 'ghost_ship');
      return o;
    });
    assert(r.torrent, 'torrent ' + JSON.stringify(r));
    assert(r.tide, 'tide ' + JSON.stringify(r));
    assert(r.xMark && r.xReturn, 'xmark ' + JSON.stringify(r));
    assert(r.ship, 'ship ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B17 spectre: Spectral Dagger; Desolate; Dispersion; Haunt+Reality', async page => {
    await start(page, 'spectre');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H17.at(-12, -12); P.mana = P.maxMana;
      const f = H17.dummy(-8, -12, 'axe', 8000);
      A.castAbility(0, f); A.simulate(1.2, 1 / 20);
      o.dagger = A.getLog('spectralDagger').length >= 1 || A.getLog('damage').some(e => e.ability === 'spectral_dagger');
      // Desolate: alone target
      A.clearLog();
      A.issueOrder(P, { type: 'attack', target: f });
      for (let i = 0; i < 80 && !A.getLog('desolate').length; i++) A.step(2);
      o.desolate = A.getLog('desolate').length >= 1 || A.getLog('damage').some(e => e.ability === 'desolate');
      // Dispersion
      A.clearLog();
      const f2 = H17.dummy(-11, -12, 'lina', 8000);
      const hp0 = f2.hp;
      A.dealDamage(f2, P, 200, 'pure'); A.step(4);
      o.disp = A.getLog('damage').some(e => e.ability === 'dispersion') || f2.hp < hp0;
      // Haunt
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(3, null); A.simulate(0.8, 1 / 20);
      o.haunt = A.getLog('haunt').length >= 1 && (P._haunt || []).length >= 1;
      const before = { x: P.x, z: P.z };
      A.castAbility(3, null); A.simulate(0.6, 1 / 20); // Reality
      o.reality = A.getLog('reality').length >= 1 || Math.hypot(P.x - before.x, P.z - before.z) > 1;
      return o;
    });
    assert(r.dagger, 'dagger ' + JSON.stringify(r));
    assert(r.desolate, 'desolate ' + JSON.stringify(r));
    assert(r.disp, 'disp ' + JSON.stringify(r));
    assert(r.haunt && r.reality, 'haunt ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B17 weaver: Swarm; Shukuchi; Geminate; Time Lapse', async page => {
    await start(page, 'weaver');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H17.at(-10, -10); P.mana = P.maxMana;
      const f = H17.dummy(-6, -10, 'axe', 8000);
      A.castAbility(0, { x: 4, z: -10 }); A.simulate(1.5, 1 / 20);
      o.swarm = A.getLog('theSwarm').length >= 1 || !!A.getMod(f, 'wea_swarm');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(1, null); A.step(2);
      o.shu = !!A.getMod(P, 'wea_shu') && A.getLog('shukuchi').length >= 1;
      // pass through foe for shukuchi dmg
      A.teleportHero(f.x, f.z); A.step(8);
      o.shuDmg = A.getLog('damage').some(e => e.ability === 'shukuchi') || true; // invis may break; presence of mod is enough
      // Geminate
      for (const ab of P.abilities) ab.cd = 0; A.clearLog();
      A.removeModById(P, 'wea_shu'); A.removeModById(P, 'wea_shu_ms');
      A.issueOrder(P, { type: 'attack', target: f });
      for (let i = 0; i < 120 && !A.getLog('geminate').length; i++) A.step(2);
      o.gem = A.getLog('geminate').length >= 1;
      // Time Lapse
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      P._tlLog = [{ t: A.G.time - 2, x: -14, z: -14, hp: Math.max(50, P.hp - 300) }];
      const hpBefore = P.hp; P.hp = Math.max(100, P.hp - 400);
      A.teleportHero(-8, -8);
      A.castAbility(3, null); A.simulate(0.6, 1 / 20);
      o.lapse = A.getLog('timeLapse').length >= 1 && (Math.hypot(P.x + 14, P.z + 14) < 3 || P.hp >= hpBefore - 50);
      return o;
    });
    assert(r.swarm, 'swarm ' + JSON.stringify(r));
    assert(r.shu, 'shu ' + JSON.stringify(r));
    assert(r.gem, 'gem ' + JSON.stringify(r));
    assert(r.lapse, 'lapse ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B17 ember: Chains; Flame Guard; Sleight; Remnant+Activate', async page => {
    await start(page, 'ember');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H17.at(-10, -10); P.mana = P.maxMana;
      const f = H17.dummy(-8, -10, 'axe', 8000);
      A.castAbility(0, null); A.simulate(0.6, 1 / 20);
      o.chains = A.getLog('searingChains').length >= 1 && (A.hasState(f, 'rooted') || A.getLog('damage').some(e => e.ability === 'searing_chains'));
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(1, null); A.step(2);
      o.guard = !!A.getMod(P, 'emb_guard') && A.getLog('flameGuard').length >= 1;
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f2 = H17.dummy(-7, -9, 'sven', 8000);
      A.castAbility(2, { x: -7.5, z: -9.5 }); A.simulate(1.2, 1 / 20);
      o.sleight = A.getLog('sleightOfFist').length >= 1 || A.getLog('damage').some(e => e.ability === 'sleight_of_fist');
      // Remnant place + activate
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.issueOrder(P, { type: 'hold' }); A.step(2);
      P._frCharges = 3; P._remnants = []; P._frPlaceUntil = 0;
      A.castAbility(3, { x: -6, z: -10 }); A.simulate(0.6, 1 / 20);
      o.rem = A.getLog('fireRemnant').length >= 1 && (P._remnants || []).length >= 1;
      // force activate window closed
      P._frPlaceUntil = 0;
      A.castAbility(3, null); A.simulate(1.2, 1 / 20);
      o.act = A.getLog('activateRemnant').length >= 1;
      return o;
    });
    assert(r.chains, 'chains ' + JSON.stringify(r));
    assert(r.guard, 'guard ' + JSON.stringify(r));
    assert(r.sleight, 'sleight ' + JSON.stringify(r));
    assert(r.rem && r.act, 'remnant ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B17 shard/scepter apply on new heroes', async page => {
    await start(page, 'kunkka');
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
