// build/tests/b29.js — neutral item drops/pickup + bot HG dive/abort + Blink→setup / Force-save micro.
module.exports = ({ test, boot, assert }) => {
  test('B29 neutrals: defs, dedicated slot pickup/replace, active use', async page => {
    await boot(page, 'axe');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      A.godMode(true); A.revealAll(true);
      const ids = ['n_hobbit', 'n_armor', 'n_swift', 'n_prism', 'n_vambrace', 'n_mirror'];
      o.defs = ids.every(id => A.ITEM_DEFS[id] && A.ITEM_DEFS[id].neutral && A.ITEM_DEFS[id].noShop);
      o.tiers = ids.map(id => A.ITEM_DEFS[id].tier);
      A.G.time = 8 * 60; o.tierAt8 = A.NEUTRAL_TIER_AT(A.G.time);
      A.G.time = 20 * 60; o.tierAt20 = A.NEUTRAL_TIER_AT(A.G.time);
      A.G.time = 30 * 60; o.tierAt30 = A.NEUTRAL_TIER_AT(A.G.time);
      A.teleportHero(0, 0);
      for (const id of ['boots', 'circlet', 'gauntlets', 'slippers', 'mantle', 'ring']) A.giveItem(id, P);
      o.invFull = P.items.every(Boolean);
      const e1 = A.giveItem('n_hobbit', P);
      o.got1 = !e1 && P.neutral && P.neutral.id === 'n_hobbit';
      o.msBoost = P.speed > P.def.stats.speed;
      const beforeDrops = A.drops.length;
      const e2 = A.giveItem('n_swift', P);
      o.replaced = !e2 && P.neutral && P.neutral.id === 'n_swift';
      o.oldDropped = A.drops.length === beforeDrops + 1 && A.drops.some(d => d.item === 'n_hobbit');
      P.mana = P.maxMana;
      const ue = A.useItem(P, 6, null);
      o.used = !ue && P.neutral.cd > 0 && !!A.getMod(P, 'n_swift');
      A.dropNeutral(P);
      o.empty = !P.neutral;
      const d = A.forceNeutralDrop(P.x + 0.5, P.z + 0.5, 'n_armor');
      const pe = A.pickupDrop(P, d);
      o.picked = !pe && P.neutral && P.neutral.id === 'n_armor';
      return o;
    });
    assert(r.defs, 'neutral defs ' + JSON.stringify(r));
    assert(r.tierAt8 === 1 && r.tierAt20 === 2 && r.tierAt30 === 3, 'tiers ' + JSON.stringify(r));
    assert(r.invFull && r.got1 && r.replaced && r.oldDropped, 'slot replace ' + JSON.stringify(r));
    assert(r.used && r.picked, 'use/pickup ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B29 neutrals: camp clear drops token when chance hits', async page => {
    await boot(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player;
      A.godMode(true); A.revealAll(true); A.G.nextWave = 1e9;
      A.G.time = 10 * 60;
      const J = A.jg();
      const camp = J.camps.find(c => c.size === 'large') || J.camps[0];
      for (const u of A.units) if (u.isNeutral && !u.isRoshan && !u.dead) A.killUnit(u, null);
      A.step(1);
      camp.units = [];
      A.spawnCamp(camp);
      const units = camp.units.filter(u => !u.dead);
      A.teleportHero(camp.x, camp.z);
      for (let i = 0; i < units.length - 1; i++) A.killUnit(units[i], P);
      const last = units[units.length - 1];
      const real = Math.random;
      Math.random = () => 0;   // always succeed chance + pick first pool item
      const before = A.getLog('neutralItemDrop').length;
      A.killUnit(last, P);
      Math.random = real;
      const log = A.getLog('neutralItemDrop');
      const neu = A.drops.filter(d => A.isNeutralItem(d.item));
      // API path too
      const real2 = Math.random; Math.random = () => 0;
      const d2 = A.tryNeutralDrop(camp, P, camp.x + 1, camp.z + 1);
      Math.random = real2;
      return {
        n: units.length, after: neu.length, item: neu[0] && neu[0].item,
        tier: neu[0] && A.ITEM_DEFS[neu[0].item].tier, size: camp.size,
        chance: A.NEUTRAL_DROP_CHANCE[camp.size], logGrowth: log.length - before,
        apiDrop: !!(d2 && d2.item),
      };
    });
    assert(r.chance === 0.34 && r.size === 'large', 'chance table ' + JSON.stringify(r));
    assert(r.logGrowth >= 1 && r.after >= 1 && r.tier === 1, 'camp drop ' + JSON.stringify(r));
    assert(r.apiDrop, 'tryNeutralDrop API ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B29 bot micro: HG teamDive + Blink→setup + Force-save', async page => {
    await boot(page, 'axe');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
      A.godMode(true); A.revealAll(true); A.G.nextWave = 1e9;
      A.setLevel(16);
      for (const h of A.G.heroes.slice()) if (h !== P) A.killUnit(h, null);
      // enemy heroes so HG "won" is false (otherwise dive skips creep check)
      for (let i = 0; i < 5; i++) A.spawnUnit('hero', 1, 40 + i * 2, 40, { heroId: 'lina' });
      A.giveItem('blink', P); A.giveItem('force', P); A.giveItem('euls', P);
      P.mana = P.maxMana;
      P.bot = { lane: 'mid', role: 'tank', itemUses: {}, thinks: 0, off: 0, d: { gank: 0 }, mem: {}, retreat: false };
      o.hasHg = typeof A.isHighGround === 'function' && typeof A.botForceSave === 'function' && typeof A.botBlinkSetup === 'function';
      const anc = A.units.find(u => u.kind === 'ancient' && u.team === 1);
      const t1 = A.units.find(u => u.kind === 'tower' && u.team === 1 && u.tier === 1);
      o.ancHg = A.isHighGround(anc);
      o.t1Hg = A.isHighGround(t1);
      A.teleportHero(anc.x - 6, anc.z - 6);
      A.setPlan(0, 'push', { target: anc, rally: { x: anc.x - 20, z: anc.z - 20 }, phase: 'siege', members: [P.id], t0: A.G.time });
      o.diveAlone = A.teamDive(P);
      const allies = [];
      for (let i = 0; i < 4; i++) {
        const b = A.spawnUnit('hero', 0, anc.x - 4 - (i % 2), anc.z - 3 - Math.floor(i / 2), { heroId: 'sven', bot: true });
        b.bot = { lane: 'off', role: 'tank', itemUses: {}, thinks: 0, off: 0, d: { gank: 0 }, mem: {}, retreat: false };
        allies.push(b);
      }
      o.diveNoCreep = A.teamDive(P);
      for (let i = 0; i < 3; i++) A.spawnUnit('melee', 0, anc.x - 2, anc.z - 1 + i * 0.5);
      o.nearAllies = A.G.heroes.filter(a => a.team === 0 && !a.dead && dist(a, P) < 14).length;
      o.creepsNear = A.units.filter(c => !c.dead && c.team === 0 && (c.kind === 'melee' || c.kind === 'ranged') && dist(c, anc) < 20).length;
      o.diveOk = A.teamDive(P);
      // Blink→setup
      const foe = A.spawnUnit('hero', 1, P.x + 3, P.z + 1, { heroId: 'lina' });
      const ei = P.items.findIndex(it => it && it.id === 'euls');
      if (ei >= 0) { P.items[ei].cd = 0; }
      P.mana = P.maxMana;
      P.bot.blinkInit = A.G.time;
      o.setup = A.botBlinkSetup(P, P.bot, foe);
      o.setupEv = A.getLog('botBlinkEul').length + A.getLog('botBlinkForce').length;
      o.cyclone = !!A.getMod(foe, 'cyclone');
      // Force-save
      const ally = allies[0];
      ally.hp = ally.maxHp * 0.25;
      ally.x = t1.x; ally.z = t1.z;
      const fi = P.items.findIndex(it => it && it.id === 'force');
      if (fi >= 0) P.items[fi].cd = 0;
      P.x = ally.x - 2; P.z = ally.z; P.mana = P.maxMana;
      o.save = A.botForceSave(P, P.bot);
      o.saveEv = A.getLog('botForceSave').length;
      return o;
    });
    assert(r.hasHg && r.ancHg && !r.t1Hg, 'hg helpers ' + JSON.stringify(r));
    assert(r.diveAlone === false && r.diveNoCreep === false, 'strict HG dive ' + JSON.stringify(r));
    assert(r.diveOk === true, 'dive with 4+ and creeps ' + JSON.stringify(r));
    assert(r.setup === true && (r.setupEv >= 1 || r.cyclone), 'blink setup ' + JSON.stringify(r));
    assert(r.save === true && r.saveEv >= 1, 'force save ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
