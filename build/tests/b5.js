// build/tests/b5.js — B5: Lich, Enigma, Witch Doctor, Earthshaker + the engine features they need (toggle abilities with mana drain,
// rebounce projectiles, pull/displacement, temporary walls, splitting summons, spell-cast passives, channelled wards) and the bot
// rules for big spells (clustered ults, safe Death Ward, Voodoo toggling). Loaded by run-tests.js.
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H5 = {
      A, P: A.G.player,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead && h.team === 1) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000) { const h = A.spawnUnit('hero', 1, x, z, { heroId }); h.order = { type: 'hold' }; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      creep(x, z, team = 1, hp = 0) { const c = A.spawnUnit('melee', team, x, z); c.wps = [{ x, z }]; c.wp = 0; if (hp) { if (c.base) c.base.hp = hp; c.hp = c.maxHp = hp; } return c; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      learnAll() { for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return A.G.player.abilities.map(a => a.lvl); },
      reset(slot) { const P = A.G.player; P.abilities[slot].cd = 0; P.mana = P.maxMana; },
      ev: (t, f) => A.getLog(t).filter(f || (() => true)),
      dmg: (id, tgt) => Math.round(A.getLog('damage').filter(e => e.ability === id && (!tgt || e.tgt === tgt.id)).reduce((a, e) => a + e.amount, 0)),
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); return H5.learnAll(); });
  }

  test('boot (B5): 18+ hero cards, Death Ward + Eidolon summon types', async page => {
    await boot(page);
    const r = await page.evaluate(() => ({ heroes: Object.keys(GameAPI.HERO_DEFS), cards: document.querySelectorAll('.card').length, summons: Object.keys(GameAPI.SUMMON_TYPES) }));
    assert(r.heroes.length >= 18 && r.cards === r.heroes.length && ['lich', 'enigma', 'wd', 'es'].every(h => r.heroes.includes(h)), 'heroes ' + JSON.stringify(r));
    assert(r.summons.includes('wd_ward') && r.summons.includes('enig_eidolon'), 'summons ' + r.summons);
    return JSON.stringify({ heroes: r.heroes.length, summons: r.summons });
  });

  test('B5 Lich: Frost Blast nuke + AoE slow, Frost Shield on a tower (less attack damage, attackers slowed), Sinister Gaze pull + interrupt, Chain Frost rebounces 11 times between 2 heroes', async page => {
    await start(page, 'lich');
    const r = await page.evaluate(() => {
      const { A, P } = H5, o = {}; H5.at();
      const a = H5.dummy(-14, -20), b = H5.dummy(-12.5, -18, 'lina');
      A.castAbility(0, a); A.simulate(1.5, 1 / 20); o.blast = { a: H5.dmg('frost_blast', a), b: H5.dmg('frost_blast', b), slowA: !!A.getMod(a, 'lich_slow'), slowB: !!A.getMod(b, 'lich_slow') };
      // Frost Shield on an own tower: a creep's hits deal less, the creep is slowed
      const tw = A.units.find(u => u.kind === 'tower' && u.team === 0 && !u.dead && u.lane === 'mid' && u.tier === 1);
      H5.at(tw.x - 4, tw.z + 4); tw.hp = tw.maxHp; const c = H5.creep(tw.x + 1.6, tw.z, 1, 99999); A.issueOrder(c, { type: 'attack', target: tw }); tw.target = null;
      A.clearLog(); A.simulate(6, 1 / 20); const hits0 = A.getLog('damage').filter(e => e.src === c.id && e.tgt === tw.id); const per0 = hits0.reduce((s, e) => s + e.amount, 0) / Math.max(1, hits0.length);
      o.shieldErr = A.castAbility(1, tw); A.simulate(0.5, 1 / 20); A.clearLog(); A.simulate(4, 1 / 20);
      const hits1 = A.getLog('damage').filter(e => e.src === c.id && e.tgt === tw.id); const per1 = hits1.reduce((s, e) => s + e.amount, 0) / Math.max(1, hits1.length);
      o.shield = { per0: +per0.toFixed(1), per1: +per1.toFixed(1), slowed: A.getLog('modifierAdd').some(e => e.unit === c.id && e.mod === 'slowed'), mod: !!A.getMod(tw, 'lich_shield'), pulse: H5.dmg('frost_shield', c) };
      // Sinister Gaze: target can't act, pulled toward Lich; stunning Lich ends it
      H5.at(); const g = H5.dummy(-12, -20, 'lina'); const d0 = Math.hypot(g.x - P.x, g.z - P.z);
      A.castAbility(2, g); A.simulate(1.2, 1 / 20); o.gaze = { stunned: A.hasState(g, 'stunned'), pulled: +(d0 - Math.hypot(g.x - P.x, g.z - P.z)).toFixed(2), chan: !!P.channel };
      A.stun(P, 0.5); A.step(2); o.gaze.after = { chan: !!P.channel, mod: !!A.getMod(g, 'lich_gaze'), interrupted: A.getLog('channelEnd').filter(e => e.ability === 'gaze' && e.interrupted).length };
      // Chain Frost: exactly `jumps` hits, alternating between the 2 heroes
      H5.at(); const x = H5.dummy(-14, -20), y = H5.dummy(-12, -16, 'lina'); A.simulate(1, 1 / 20); A.clearLog();
      A.castAbility(3, x); A.simulate(9, 1 / 20); const bs = H5.ev('bounce', e => e.ability === 'chain_frost');
      o.frost = { n: bs.length, seq: bs.map(e => e.target === x.id ? 'x' : 'y').join(''), dmgX: H5.dmg('chain_frost', x) };
      return o;
    });
    assert(r.blast.a > r.blast.b && r.blast.b > 0 && r.blast.slowA && r.blast.slowB, 'frost blast ' + JSON.stringify(r));
    assert(!r.shieldErr && r.shield.mod && r.shield.per1 < r.shield.per0 * 0.6 && r.shield.slowed, 'frost shield ' + JSON.stringify(r.shield));
    assert(r.gaze.stunned && r.gaze.pulled > 1 && r.gaze.chan && !r.gaze.after.chan && !r.gaze.after.mod && r.gaze.after.interrupted === 1, 'gaze ' + JSON.stringify(r.gaze));
    assert(r.frost.n === 11 && /^(xy)+x?$/.test(r.frost.seq), 'chain frost ' + JSON.stringify(r.frost));
    return JSON.stringify(r);
  });

  test('B5 Enigma: Malefice 3 mini-stuns, Eidolons split after 6 attacks, Midnight Pulse % max HP, Black Hole pulls + disables, ends on interrupt', async page => {
    await start(page, 'enigma');
    const r = await page.evaluate(() => {
      const { A, P } = H5, o = {}; H5.at();
      const a = H5.dummy(-14, -20); A.castAbility(0, a); A.simulate(4.5, 1 / 20);
      o.malefice = { n: H5.ev('malefice').length, stuns: A.getLog('modifierAdd').filter(e => e.unit === a.id && e.mod === 'stun').length };
      H5.at(); const t = H5.creep(-15, -20, 1, 99999); t.order = { type: 'hold' };
      A.castAbility(1, null); A.simulate(1, 1 / 20); const n0 = A.ownedUnits(P, u => u.type === 'enig_eidolon').length;
      for (const u of A.ownedUnits(P)) A.issueOrder(u, { type: 'attack', target: t }); A.simulate(14, 1 / 20);
      o.eidolons = { n0, n1: A.ownedUnits(P, u => u.type === 'enig_eidolon').length, splits: H5.ev('summonSplit').length };
      H5.at(); const p = H5.dummy(-12, -20, 'lina'); A.clearLog(); A.castAbility(2, { x: p.x, z: p.z }); A.simulate(3.3, 1 / 20);
      const ticks = A.getLog('damage').filter(e => e.ability === 'pulse' && e.tgt === p.id); o.pulse = { ticks: ticks.length, per: Math.round(ticks[0] ? ticks[0].amount : 0), maxHp: p.maxHp };
      // Black Hole: 3 heroes around the point get pulled + disabled; stunning Enigma ends it and frees them
      H5.at(); const hs = [H5.dummy(-12, -20), H5.dummy(-9, -17.5, 'lina'), H5.dummy(-9, -22.5, 'sven')], c = { x: -10, z: -20 };
      const dd = () => hs.map(h => Math.hypot(h.x - c.x, h.z - c.z)); const d0 = dd();
      A.castAbility(3, c); A.simulate(2.2, 1 / 20); const d1 = dd();
      o.hole = { d0: d0.map(v => +v.toFixed(1)), d1: d1.map(v => +v.toFixed(1)), disabled: hs.every(h => A.hasState(h, 'stunned')), chan: !!P.channel, dmg: H5.dmg('black_hole') };
      A.stun(P, 0.3); A.step(2); o.hole.after = { chan: !!P.channel, free: hs.every(h => !A.getMod(h, 'enig_hole')), end: H5.ev('blackHoleEnd', e => e.interrupted).length };
      return o;
    });
    assert(r.malefice.n === 3, 'malefice ' + JSON.stringify(r.malefice));
    assert(r.eidolons.splits >= 1 && r.eidolons.n1 > r.eidolons.n0, 'eidolons ' + JSON.stringify(r.eidolons));
    assert(r.pulse.ticks >= 3 && Math.abs(r.pulse.per - r.pulse.maxHp * 0.0525) < 3, 'pulse ' + JSON.stringify(r.pulse));
    assert(r.hole.d1.every((d, i) => d < r.hole.d0[i] - 1) && r.hole.disabled && r.hole.chan && r.hole.dmg > 500, 'black hole ' + JSON.stringify(r.hole));
    assert(!r.hole.after.chan && r.hole.after.free && r.hole.after.end === 1, 'black hole interrupt ' + JSON.stringify(r.hole.after));
    return JSON.stringify(r);
  });

  test('B5 Witch Doctor: Cask bounces (rebounce) with stuns, Voodoo toggle heals + drains mana + auto-off, Maledict burst from HP lost, Death Ward attacks/bounces and dies on interrupt', async page => {
    await start(page, 'wd');
    const r = await page.evaluate(() => {
      const { A, P } = H5, o = {}; H5.at();
      const a = H5.dummy(-14, -20), b = H5.dummy(-12, -16, 'lina'); A.castAbility(0, a); A.simulate(5, 1 / 20);
      const cb = H5.ev('bounce', e => e.ability === 'cask'); o.cask = { n: cb.length, seq: cb.map(e => e.target === a.id ? 'a' : 'b').join(''), stuns: A.getLog('modifierAdd').filter(e => e.mod === 'stun').length };
      // Voodoo: heals a hurt ally, drains mana, switches off at 0 mana
      H5.at(); A.godMode(false); const al = A.spawnUnit('hero', 0, -18, -20, { heroId: 'axe' }); al.order = { type: 'hold' }; al.hp = al.maxHp * 0.3; P.mana = 300;
      const hp0 = al.hp, m0 = P.mana; A.castAbility(1, null); P.mana = 300; A.simulate(2, 1 / 20);
      o.voodoo = { on: A.isToggled(P, 'voodoo'), healed: Math.round(al.hp - hp0), drained: Math.round(300 - P.mana) };
      P.mana = 5; A.simulate(1, 1 / 20); o.voodoo.offAtZero = !A.isToggled(P, 'voodoo'); o.voodoo.events = H5.ev('toggle').map(e => e.on).join(','); A.godMode(true);
      // Maledict: a burst every 4 s = pct × HP lost since the cast
      H5.at(); const m = H5.dummy(-14, -20); A.castAbility(2, { x: m.x, z: m.z }); A.simulate(1, 1 / 20); A.dealDamage(P, m, 1000, 'pure'); A.simulate(4, 1 / 20);
      o.maledict = H5.ev('maledictBurst').map(e => e.dmg);
      // Death Ward: invulnerable, attacks + bounces, removed when the channel is interrupted
      H5.at(); const d1 = H5.dummy(-12, -20), d2 = H5.dummy(-11, -17, 'lina'), d3 = H5.dummy(-13, -24, 'sven');
      A.castAbility(3, { x: -18, z: -20 }); A.simulate(3, 1 / 20); const w = A.units.find(u => u.type === 'wd_ward' && !u.dead);
      o.ward = { alive: !!w, inv: w && A.hasState(w, 'invulnerable'), wardDmg: Math.round(A.getLog('damage').filter(e => e.src === (w && w.id)).reduce((s, e) => s + e.amount, 0)), bounceHits: H5.ev('bounce', e => e.ability === 'death_ward').length, targets: new Set(A.getLog('damage').filter(e => e.src === (w && w.id)).map(e => e.tgt)).size };
      A.stun(P, 0.3); A.step(3); o.ward.after = { dead: !w || w.dead, chan: !!P.channel };
      return o;
    });
    assert(r.cask.n === 8 && /^(ab)+a?$/.test(r.cask.seq) && r.cask.stuns >= 8, 'cask ' + JSON.stringify(r.cask));
    assert(r.voodoo.on && r.voodoo.healed > 50 && r.voodoo.drained >= 30 && r.voodoo.offAtZero, 'voodoo ' + JSON.stringify(r.voodoo));
    assert(r.maledict.length >= 1 && r.maledict[0] >= 300 && r.maledict[0] <= 900, 'maledict ' + JSON.stringify(r.maledict));
    assert(r.ward.alive && r.ward.inv && r.ward.wardDmg > 1000 && r.ward.bounceHits >= 2 && r.ward.targets >= 2 && r.ward.after.dead && !r.ward.after.chan, 'death ward ' + JSON.stringify(r.ward));
    return JSON.stringify(r);
  });

  test('B5 Earthshaker: Fissure stuns a line, raises a wall that blocks pathing (units shoved aside) and expires, Enchant Totem, Aftershock on every cast, Echo Slam scales with units', async page => {
    await start(page, 'es');
    const r = await page.evaluate(() => {
      const { A, P } = H5, o = {}; H5.at(-20, -20);
      const a = H5.dummy(-20, -14); const before = A.findPath(-23, -12, -17, -12);
      A.castAbility(0, { x: -20, z: -6 }); A.simulate(0.8, 1 / 20);
      const cells = A.WALLS.list[0] ? A.WALLS.list[0].cells.length : 0, blocked = [-15, -12, -10].filter(z => !A.isWalk(-20, z)).length;
      const during = A.findPath(-23, -12, -17, -12);
      o.fissure = { cells, blocked, stun: A.hasState(a, 'stunned'), onWall: !A.isWalk(a.x, a.z), dmg: H5.dmg('fissure', a), lenBefore: before ? before.length : -1, lenDuring: during ? during.length : -1, aftershock: H5.ev('aftershock').length };
      A.simulate(7, 1 / 20); o.fissure.expired = { walls: A.WALLS.list.length, walk: [-15, -12, -10].every(z => A.isWalk(-20, z)) };
      // Totem: next attack +400% base damage, consumed
      H5.at(); const t = H5.dummy(-18, -20); H5.reset(1); A.castAbility(1, null); A.simulate(0.8, 1 / 20); A.clearLog();
      A.issueOrder(P, { type: 'attack', target: t }); A.simulate(3, 1 / 20); const hits = A.getLog('damage').filter(e => e.src === P.id && e.tgt === t.id && e.attackId).map(e => Math.round(e.amount));
      o.totem = { hits: hits.slice(0, 3), ev: H5.ev('totemHit').length, mod: !!A.getMod(P, 'es_totem') };
      // Echo Slam: 1 enemy vs 1 enemy + 4 creeps around
      H5.at(); const e1 = H5.dummy(-17, -20); A.castAbility(3, null); A.simulate(1, 1 / 20); const solo = H5.dmg('echo', e1) + H5.dmg('echo_wave', e1);
      H5.at(); P.abilities[3].cd = 0; const e2 = H5.dummy(-17, -20); for (let i = 0; i < 4; i++) H5.creep(-20 + Math.cos(i * 1.6) * 3, -20 + Math.sin(i * 1.6) * 3, 1, 5000);
      A.castAbility(3, null); A.simulate(1, 1 / 20); const crowd = H5.dmg('echo', e2) + H5.dmg('echo_wave', e2);
      o.echo = { solo, crowd, ev: H5.ev('echoSlam').map(e => e.echoes) };
      return o;
    });
    assert(r.fissure.cells >= 5 && r.fissure.blocked === 3 && r.fissure.stun && !r.fissure.onWall && r.fissure.dmg > 0 && r.fissure.aftershock >= 1, 'fissure ' + JSON.stringify(r.fissure));
    assert(r.fissure.lenDuring > r.fissure.lenBefore || r.fissure.lenDuring === -1, 'wall blocks path ' + JSON.stringify(r.fissure));
    assert(r.fissure.expired.walls === 0 && r.fissure.expired.walk, 'wall expires ' + JSON.stringify(r.fissure.expired));
    assert(r.totem.ev === 1 && !r.totem.mod && r.totem.hits.length >= 2 && r.totem.hits[0] > r.totem.hits[1] * 3, 'totem ' + JSON.stringify(r.totem));
    assert(r.echo.crowd > r.echo.solo + 250, 'echo slam ' + JSON.stringify(r.echo));
    return JSON.stringify(r);
  });

  test('bots (B5): Black Hole / Echo Slam only on clustered heroes, Chain Frost on 2+ heroes, Death Ward when safe, Voodoo toggled for hurt allies, channel kept / stopped', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, o = {};
      A.startGame('axe', { enemies: 0, allies: 0 }); A.pause(); A.G.nextWave = 1e9; A.godMode(true); A.revealAll(true);
      for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(5);
      const P = A.G.player; A.teleportHero(-60, 60);
      const bot = (id, x, z) => { const h = A.spawnBot(id, 1, 'mid', 2); h.respawn = 1e9; A.setLevel(16, h); h.x = x; h.z = z; for (let k = 0; k < 4; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, h); h.mana = h.maxMana; return h; };
      const foe = (id, x, z) => { const d = A.spawnUnit('hero', 0, x, z, { heroId: id }); d.order = { type: 'hold' }; A.addModifier(d, { id: 'thp', props: { hp: 20000 } }, d); A.step(1); d.hp = d.maxHp * 0.9; return d; };
      const casts = (h, id) => A.getLog('cast').filter(e => e.unit === h.id && e.ability === id).length;
      A.record(true);
      // one lone healthy enemy: no ult
      const en = bot('enigma', 0, 0), f1 = foe('lina', 4, 0); A.simulate(4, 1 / 20); o.enigmaLone = casts(en, 'black_hole');
      const f2 = foe('cm', 5, 2), f3 = foe('sven', 3.5, -2); A.simulate(4, 1 / 20); o.enigmaCluster = casts(en, 'black_hole'); o.channelEnd = A.getLog('channelEnd').filter(e => e.ability === 'black_hole').map(e => e.reason).join(',');
      for (const u of [en, f1, f2, f3]) A.killUnit(u, null); A.step(2);
      const es = bot('es', 20, 20), g1 = foe('lina', 23, 20); A.simulate(3, 1 / 20); o.esLone = casts(es, 'echo');
      const g2 = foe('cm', 22, 23), g3 = foe('zeus', 21, 17); A.simulate(4, 1 / 20); o.esCluster = casts(es, 'echo');
      for (const u of [es, g1, g2, g3]) A.killUnit(u, null); A.step(2);
      const li = bot('lich', -20, 20), l1 = foe('lina', -12, 20), l2 = foe('cm', -11, 23); A.simulate(5, 1 / 20); o.chainFrost = casts(li, 'chain_frost');
      for (const u of [li, l1, l2]) A.killUnit(u, null); A.step(2);
      const wd = bot('wd', 20, -20), w1 = foe('lina', 29, -20); A.simulate(4, 1 / 20); o.deathWard = casts(wd, 'death_ward');
      o.wardKept = A.getLog('channelEnd').filter(e => e.unit === wd.id && e.ability === 'death_ward').map(e => e.reason).join(',') || (wd.channel ? 'channelling' : 'none');
      A.killUnit(w1, null); A.simulate(4, 1 / 20); o.wardStop = A.getLog('botChannelStop').filter(e => e.unit === wd.id).length;
      const al = A.spawnBot('axe', 1, 'mid', 1); al.respawn = 1e9; al.x = wd.x + 2; al.z = wd.z; al.hp = al.maxHp * 0.4; al.bot.retreat = false; wd.mana = wd.maxMana;
      A.simulate(2, 1 / 20); o.voodoo = A.getLog('toggle').filter(e => e.unit === wd.id).map(e => e.on).join(',');
      return o;
    });
    assert(r.enigmaLone === 0 && r.enigmaCluster === 1, 'black hole ' + JSON.stringify(r));
    assert(r.esLone === 0 && r.esCluster === 1, 'echo slam ' + JSON.stringify(r));
    assert(r.chainFrost === 1 && r.deathWard === 1 && r.wardStop >= 1, 'lich/wd ' + JSON.stringify(r));
    assert(r.voodoo.startsWith('true'), 'voodoo ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
