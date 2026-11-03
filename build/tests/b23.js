// build/tests/b23.js — polish batch 5: bot jungle stack + courier snipe + Tinker Rearm (ai.rearm).
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H23 = {
      A,
      clear() {
        A.G.nextWave = 1e9;
        for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
        A.step(20);
      },
      sense(h) { return A.sense ? A.sense(h) : ({ foes: [], allies: [], ecreeps: [], acreeps: [], etowers: [], atowers: [], ghosts: [], hpPct: h.hp / h.maxHp }); },
    };
  };
  async function start(page, hero) {
    await boot(page, hero || 'cm');
    await page.evaluate(HELPERS);
    return page.evaluate(() => {
      const A = GameAPI; A.godMode(true); A.setLevel(10); A.revealAll(true);
      for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
      A.G.nextWave = 1e9; return 1;
    });
  }

  test('B23 rearm: ai.rearm (not skip); botBigSpells orders Rearm; channel resets Laser/Missile CD', async page => {
    await start(page, 'tinker');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      const ab = P.abilities.find(a => a.def.id === 'rearm');
      o.ai = !!(ab && ab.def.ai && ab.def.ai.rearm && !ab.def.ai.skip);
      o.combos = (P.def.ai.combos || []).map(c => c.id);
      H23.clear();
      A.teleportHero(-20, -20); A.issueOrder(P, { type: 'hold' });
      P.abilities[0].cd = P.abilities[0].cdMax = 12;
      P.abilities[1].cd = P.abilities[1].cdMax = 10;
      P.mana = P.maxMana;
      // no P.bot: botUpdate would overwrite the cast order on the next step; brain returns after botBigSpells in real play
      const b = { lane: 'mid', d: { tick: 0.2, react: 1, retreat: 0.25, aimErr: 0, lead: 0 }, seen: {}, off: 0, mode: 'lane', target: null, retreat: false };
      A.record(true); A.clearLog();
      const s = { foes: [], allies: [], ecreeps: [], acreeps: [], etowers: [], atowers: [], ghosts: [], hpPct: 1 };
      o.cast = A.botBigSpells(P, b, s);
      o.order = P.order.type; o.slot = P.order.slot;
      o.ultEvt = A.getLog('botUlt').filter(e => e.ability === 'rearm').length;
      // execute the channel without a bot brain stealing the order (lvl-1 Rearm channels 3s)
      A.setLevel(16); for (let k = 0; k < 3; k++) A.learnSkill(3);
      P.abilities[0].cd = 12; P.abilities[1].cd = 10; P.mana = P.maxMana;
      A.castAbility(3, null); A.simulate(5, 1 / 20);
      o.rearmEvt = A.getLog('rearm').length;
      o.laserCd = P.abilities[0].cd;
      o.missileCd = P.abilities[1].cd;
      o.done = !P.channel;
      return o;
    });
    assert(r.ai, 'ai.rearm ' + JSON.stringify(r));
    assert(r.combos.includes('tinker_rearm_burst') && r.combos.includes('tinker_laser_missile'), 'combos ' + JSON.stringify(r.combos));
    assert(r.cast && r.order === 'cast' && r.slot === 3 && r.ultEvt >= 1, 'cast ' + JSON.stringify(r));
    assert(r.rearmEvt >= 1 && r.laserCd === 0 && r.missileCd === 0 && r.done, 'reset ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B23 botStack: support drags camp out of CAMP_BOX before minute spawn → stack', async page => {
    await start(page, 'cm');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H23.clear();
      A.jg().nextCamp = 60; A.G.time = 59.5; A.campNow();
      const c = A.jg().camps.find(x => x.id === 'r0');
      o.spawned = c.units.filter(u => !u.dead).length;
      A.G.time = A.jg().nextCamp - 7.2;
      P.bot = { lane: 'bot', d: { tick: 0.25, react: 1, retreat: 0.25, aimErr: 0, lead: 0 }, seen: {}, off: 0.2, mode: 'lane', target: null, retreat: false, thinks: 0 };
      A.teleportHero(c.x + 2, c.z + 1); A.revealAll(true); A.updateVision();
      A.record(true); A.clearLog();
      const empty = () => ({ foes: [], allies: [], ecreeps: [], acreeps: [], etowers: [], atowers: [], ghosts: [], hpPct: 1 });
      o.mode1 = A.botStack(P, P.bot, empty());
      o.evt = A.getLog('botStack').length;
      o.camp = P.bot.stackCamp && P.bot.stackCamp.id;
      // help aggro then let botStack drag; natural spawn ticks inside step()
      const u0 = c.units.find(u => !u.dead); if (u0) A.dealDamage(P, u0, 5, 'pure');
      const until = A.jg().nextCamp + 0.5; let n = 0;
      while (A.G.time < until && n++ < 500) {
        const rem = A.jg().nextCamp - A.G.time;
        if (rem > 0.05) A.botStack(P, P.bot, empty());
        A.step(2, 1 / 20);
      }
      o.alive = c.units.filter(u => !u.dead).length;
      o.stackEv = A.getLog('campSpawn').filter(e => e.camp === c.id && e.stack).length;
      o.spawns = c.spawns;
      return o;
    });
    assert(r.spawned === 3 && r.mode1 === 'stack' && r.evt >= 1 && r.camp === 'r0', 'start ' + JSON.stringify(r));
    assert(r.alive >= 6 || r.stackEv >= 1, 'stacked ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B23 botCourierSnipe: attacks visible enemy courier when safe', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H23.clear();
      A.teleportHero(0, 0); A.revealAll(true);
      const foe = A.spawnUnit('hero', 1, 40, -40, { heroId: 'axe' });
      foe.order = { type: 'hold' }; foe.respawn = 1e9;
      const c = A.spawnCourier(foe);
      // park both mid-map (away from towers) so snipe is "safe-ish"
      c.x = 4; c.z = 2; c.corder = { type: 'idle' };
      A.teleportHero(0, 0);
      A.updateVision();
      P.bot = { lane: 'mid', d: { tick: 0.2, react: 1, retreat: 0.25, aimErr: 0, lead: 0 }, seen: {}, off: 0, mode: 'lane', target: null, retreat: false };
      A.record(true); A.clearLog();
      const s = { foes: [], allies: [], ecreeps: [], acreeps: [], etowers: [], atowers: [], ghosts: [], hpPct: 1 };
      o.ok = A.botCourierSnipe(P, P.bot, s);
      o.order = P.order.type;
      o.targetCourier = !!(P.order.target && P.order.target.isCourier);
      o.evt = A.getLog('botCourierSnipe').length;
      // unsafe: enemy hero nearby → refuse
      const near = A.spawnUnit('hero', 1, P.x + 5, P.z, { heroId: 'axe' });
      near.order = { type: 'hold' };
      A.updateVision();
      const s2 = { foes: [near], allies: [], ecreeps: [], acreeps: [], etowers: [], atowers: [], ghosts: [], hpPct: 1 };
      A.issueOrder(P, { type: 'hold' });
      o.unsafe = A.botCourierSnipe(P, P.bot, s2);
      return o;
    });
    assert(r.ok && r.order === 'attack' && r.targetCourier && r.evt >= 1, 'snipe ' + JSON.stringify(r));
    assert(!r.unsafe, 'unsafe ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
