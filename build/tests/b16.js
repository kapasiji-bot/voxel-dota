// build/tests/b16.js — B16 classic heroes: Faceless Void, Mirana, Centaur, Slardar
module.exports = ({ test, boot, assert }) => {
  const IDS = ['void', 'mirana', 'cent', 'slardar'];
  const HELPERS = () => {
    const A = GameAPI;
    window.H16 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000, team = 1) { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      learnAll(h = A.G.player) { for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i, h); },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); H16.learnAll(); return 1; });
  }

  test('B16 heroes registered: void/mirana/cent/slardar with Chinese names, QWER, scepter+shard', async page => {
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
    assert(r.n >= 33 && r.cards === r.n, 'count ' + JSON.stringify({ n: r.n, cards: r.cards }));
    assert(!r.bad.length, 'bad ' + r.bad.join(','));
    return JSON.stringify(r.ok);
  });

  test('B16 void: Time Walk heal/blink; Dilation CD stretch; Chronosphere pause', async page => {
    await start(page, 'void');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H16.at(-10, -10); P.mana = P.maxMana;
      // take damage then Time Walk
      P.hp = P.maxHp; A.dealDamage(H16.dummy(-8, -10), P, 200, 'pure'); A.step(1);
      const hp0 = P.hp; A.castAbility(0, { x: -6, z: -10 }); A.simulate(0.8, 1 / 20);
      o.walk = Math.hypot(P.x + 6, P.z + 10) < 2 || Math.abs(P.x - (-6)) < 2.5;
      o.heal = P.hp > hp0 || A.getLog('timeWalk').length >= 1;
      // dilation
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f = H16.dummy(-9, -9, 'lina', 8000);
      A.setLevel(18, f); for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i, f);
      const ab0 = f.abilities[0]; ab0.cd = ab0.cdMax = 10; const cd0 = ab0.cd;
      A.castAbility(1, null); A.simulate(0.6, 1 / 20);
      o.dil = A.getLog('timeDilation').length >= 1 && !!A.getMod(f, 'void_dil');
      o.cdStretch = ab0.cd > cd0;
      // chronosphere
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f2 = H16.dummy(-8, -10, 'axe', 8000);
      A.castAbility(3, { x: -8, z: -10 }); A.simulate(0.8, 1 / 20);
      o.chrono = A.getLog('chronosphere').length >= 1;
      o.paused = !!A.getMod(f2, 'chrono') || A.hasState(f2, 'stunned');
      o.selfFree = !A.getMod(P, 'chrono') && !A.hasState(P, 'stunned');
      return o;
    });
    assert(r.walk && r.heal, 'walk ' + JSON.stringify(r));
    assert(r.dil && r.cdStretch, 'dil ' + JSON.stringify(r));
    assert(r.chrono && r.paused && r.selfFree, 'chrono ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B16 mirana: Starstorm; Sacred Arrow stun; Leap; Moonlight invis', async page => {
    await start(page, 'mirana');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H16.at(-12, -12); P.mana = P.maxMana;
      const f = H16.dummy(-10, -12, 'axe', 8000);
      A.castAbility(0, null); A.simulate(1.2, 1 / 20);
      o.star = A.getLog('starstorm').length >= 1 || A.getLog('damage').some(e => e.ability === 'starstorm');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(1, { x: -4, z: -12 }); A.simulate(2.5, 1 / 20);
      o.arrow = A.getLog('sacredArrow').length >= 1 || A.hasState(f, 'stunned') || A.getLog('damage').some(e => e.ability === 'sacred_arrow');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
      const x0 = P.x; A.castAbility(2, null); A.simulate(0.5, 1 / 20);
      o.leap = Math.abs(P.x - x0) > 2 || !!A.getMod(P, 'mir_leap');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(3, null); A.simulate(1.2, 1 / 20);
      o.moon = A.getLog('moonlight').length >= 1 && !!A.getMod(P, 'mir_moon');
      return o;
    });
    assert(r.star, 'star ' + JSON.stringify(r));
    assert(r.arrow, 'arrow ' + JSON.stringify(r));
    assert(r.leap, 'leap ' + JSON.stringify(r));
    assert(r.moon, 'moon ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B16 cent: Hoof Stomp; Double Edge self-safe; Retaliate; Stampede trampling', async page => {
    await start(page, 'cent');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H16.at(-10, -10); P.mana = P.maxMana;
      const f = H16.dummy(-8, -10, 'axe', 8000);
      A.castAbility(0, null); A.simulate(1, 1 / 20);
      o.stomp = A.getLog('hoofStomp').length >= 1 && (A.hasState(f, 'stunned') || A.getLog('damage').some(e => e.ability === 'hoof_stomp'));
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      P.hp = 50; A.castAbility(1, f); A.simulate(0.8, 1 / 20);
      o.edge = A.getLog('doubleEdge').length >= 1 && P.hp >= 1 && !P.dead;
      for (const ab of P.abilities) ab.cd = 0;
      A.issueOrder(f, { type: 'attack', target: P });
      for (let i = 0; i < 60 && !A.getLog('retaliate').length; i++) A.step(2);
      o.ret = A.getLog('retaliate').length >= 1 || A.getLog('damage').some(e => e.ability === 'retaliate');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f2 = H16.dummy(-9, -9, 'sven', 8000);
      A.castAbility(3, null); A.step(2);
      // move into foe
      A.teleportHero(f2.x, f2.z); A.step(8);
      o.stamp = A.getLog('stampede').length >= 1;
      o.tramp = A.getLog('damage').some(e => e.ability === 'stampede') || !!A.getMod(P, 'cent_stamp');
      return o;
    });
    assert(r.stomp, 'stomp ' + JSON.stringify(r));
    assert(r.edge, 'edge ' + JSON.stringify(r));
    assert(r.ret, 'ret ' + JSON.stringify(r));
    assert(r.stamp && r.tramp, 'stamp ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B16 slardar: Sprint; Crush stun; Bash stacks; Haze armor+reveal', async page => {
    await start(page, 'slardar');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H16.at(-10, -10); P.mana = P.maxMana;
      A.castAbility(0, null); A.step(2);
      o.sprint = !!A.getMod(P, 'slar_sprint');
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      const f = H16.dummy(-8, -10, 'axe', 8000);
      A.castAbility(1, null); A.simulate(0.8, 1 / 20);
      o.crush = A.getLog('slithereenCrush').length >= 1 && A.hasState(f, 'stunned');
      for (const ab of P.abilities) ab.cd = 0;
      A.issueOrder(P, { type: 'attack', target: f });
      for (let i = 0; i < 100 && !A.getLog('bashDeep').length; i++) A.step(2);
      o.bash = A.getLog('bashDeep').length >= 1;
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(3, f); A.simulate(1.0, 1 / 20);
      o.haze = !!A.getMod(f, 'slar_haze') && A.getLog('corrosiveHaze').length >= 1;
      const hm = A.getMod(f, 'slar_haze'); o.armor = !!(hm && hm.props && hm.props.armor < 0);
      return o;
    });
    assert(r.sprint, 'sprint ' + JSON.stringify(r));
    assert(r.crush, 'crush ' + JSON.stringify(r));
    assert(r.bash, 'bash ' + JSON.stringify(r));
    assert(r.haze && r.armor, 'haze ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B16 shard/scepter apply on new heroes', async page => {
    await start(page, 'void');
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
