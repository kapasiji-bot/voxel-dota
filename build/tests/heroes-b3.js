// build/tests/heroes-b3.js — B3 hero scenarios (Riki, Anti-Mage, Puck, Bounty Hunter). Loaded by run-tests.js.
// Same pattern as heroes-b2: level 18 + god mode, fog off (revealAll) so only the mechanic under test decides visibility.
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H3 = {
      A, P: A.G.player,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && true) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead && h.team === 1) A.killUnit(h, null); A.step(70); },
      creeps(pts, kind = 'melee', hp = 0) { return pts.map(([x, z]) => { const c = A.spawnUnit(kind, 1, x, z); c.wps = [{ x, z }]; c.wp = 0; if (hp) c.hp = c.maxHp = hp; return c; }); },
      dummy(x, z, heroId = 'axe', hp = 0) { const h = A.spawnUnit('hero', 1, x, z, { heroId }); h.order = { type: 'hold' }; if (hp) h.hp = h.maxHp = hp; return h; },
      at(x = -40, z = 40) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      learnAll() { for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return A.G.player.abilities.map(a => a.lvl); },
      reset(slot) { const P = A.G.player; P.abilities[slot].cd = 0; P.mana = P.maxMana; },
      byAb: (L, id) => L.filter(e => e.type === 'damage' && e.ability === id),
      sum: arr => Math.round(arr.reduce((a, e) => a + e.amount, 0)),
      mods: (L, type, mod) => L.filter(e => e.type === type && e.mod === mod),
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); return H3.learnAll(); });
  }

  test('B3 Riki: Smoke Screen silence + miss, Blink Strike behind target, Cloak & Dagger backstab only from behind, Tricks of the Trade', async page => {
    const lv = await start(page, 'riki');
    const r = await page.evaluate(() => {
      const { A, P } = H3, o = {};
      // smoke: enemy hero inside is silenced (cannot cast) and misses attacks on Riki
      H3.at(); const d = H3.dummy(-40, 37.5, 'lina', 9000); A.setLevel(10, d); A.castAbility(0, { x: -40, z: 37.5 }); A.step(8);
      o.smoke = { silenced: A.hasState(d, 'silenced'), mod: !!A.getMod(d, 'riki_smoke'), dCast: A.castAbility(0, P, d) };
      o.smoke.missChance = +d.missChance.toFixed(2); const ac = H3.creeps([[-39, 37], [-41, 37], [-40, 36.5], [-39.5, 38.5]], 'melee', 9000); A.step(2); for (const c of ac) A.issueOrder(c, { type: 'attack', target: P });
      A.clearLog(); A.issueAttack(P, d); A.issueOrder(d, { type: 'attack', target: P }); for (let i = 0; i < 135; i++) { A.step(1); for (const c of ac) if (!c.atk || c.atk.target !== P) A.issueOrder(c, { type: 'attack', target: P }); }
      let L = A.getLog(); const ids = new Set([d.id, ...ac.map(c => c.id)]), att = L.filter(e => e.type === 'attackImpact' && ids.has(e.unit) && e.target === P.id).length, miss = L.filter(e => e.type === 'attackMiss' && ids.has(e.unit)).length;
      o.smoke.impacts = att; o.smoke.misses = miss; o.smoke.missRate = +(miss / Math.max(1, att)).toFixed(2); o.smoke.dCasts = L.filter(e => e.type === 'cast' && e.unit === d.id).length;
      o.smoke.stillInvis = A.isInvisible(P) || !!A.getMod(P, 'riki_cloak');
      // blink strike: lands behind the target (relative to its facing), damages it
      H3.at(); const t = H3.creeps([[-40, 30]], 'melee', 5000)[0]; A.stun(t, 3); t.facing = 0; A.clearLog(); A.castAbility(1, t); A.step(6);
      L = A.getLog(); const dx = P.x - t.x, dz = P.z - t.z;
      o.bstrike = { teleports: L.filter(e => e.type === 'teleport' && e.unit === P.id).length, dmg: H3.sum(H3.byAb(L, 'bstrike')), dist: +Math.hypot(dx, dz).toFixed(2), behind: dz < -0.5, isBehind: A.AB.isBehind(P, t) };
      // backstab: stunned creep facing +z; Riki attacks from behind (−z) vs from the front (+z)
      const stab = (dzs) => { H3.at(-40, 40); const c = H3.creeps([[-40, 34]], 'melee', 9000)[0]; c.facing = 0; A.teleportHero(-40, 34 + dzs); P.facing = dzs > 0 ? Math.PI : 0;
        A.issueAttack(c); A.clearLog(); for (let i = 0; i < 120; i++) { A.stun(c, 0.5); c.facing = 0; A.step(1); } const L = A.getLog(); return { impacts: L.filter(e => e.type === 'attackImpact' && e.unit === P.id).length, backstabs: L.filter(e => e.type === 'backstab').length, bonus: (L.find(e => e.type === 'backstab') || {}).bonus || 0 }; };
      o.backstab = { behind: stab(-1.3), front: stab(1.3), agi: Math.round(P.agi || 0) };
      // tricks: channel; Riki hidden + invulnerable; repeated attacks on enemies in the circle
      H3.at(); const cs = H3.creeps([[-40, 34], [-38, 35], [-42, 35], [-40, 37]], 'melee', 3000); A.castAbility(3, { x: -40, z: 35 }); A.step(10);
      o.tricks = { hidden: A.hasState(P, 'hidden'), invuln: A.hasState(P, 'invulnerable'), visibleToDire: A.isVisible(P, 1) };
      const hp0 = P.hp; A.dealDamage(cs[0], P, 300, 'magical'); o.tricks.tookDmg = Math.round(hp0 - P.hp);
      A.simulate(4.5); L = A.getLog(); o.tricks.hits = L.filter(e => e.type === 'tricksHit').length; o.tricks.targets = new Set(L.filter(e => e.type === 'tricksHit').map(e => e.target)).size;
      o.tricks.done = L.some(e => e.type === 'channelEnd' && e.unit === P.id) || !A.getMod(P, 'riki_tricks'); o.tricks.after = A.hasState(P, 'hidden');
      return o;
    });
    assert(r.smoke.silenced && r.smoke.mod && r.smoke.dCasts === 0 && r.smoke.missChance >= 0.5 && r.smoke.missRate >= 0.25 && r.smoke.impacts >= 8, 'smoke ' + JSON.stringify(r.smoke));
    assert(r.bstrike.teleports === 1 && r.bstrike.dmg > 50 && r.bstrike.behind && r.bstrike.dist < 3.5, 'blink strike ' + JSON.stringify(r.bstrike));
    assert(r.backstab.behind.backstabs >= 2 && r.backstab.behind.bonus > 50 && r.backstab.front.impacts >= 2 && r.backstab.front.backstabs === 0, 'backstab ' + JSON.stringify(r.backstab));
    assert(r.tricks.hidden && r.tricks.invuln && !r.tricks.visibleToDire && r.tricks.tookDmg === 0 && r.tricks.hits >= 6 && r.tricks.targets >= 2 && r.tricks.done && !r.tricks.after, 'tricks ' + JSON.stringify(r.tricks));
    return JSON.stringify({ lv, ...r });
  });

  test('B3 Anti-Mage: Mana Break burn, Blink range, Counterspell resist + reflect, Mana Void scales with missing mana', async page => {
    await start(page, 'am');
    const r = await page.evaluate(() => {
      const { A, P } = H3, o = {};
      H3.at(); const d = H3.dummy(-40, 38.6, 'cm', 9000); A.setLevel(12, d); d.mana = d.maxMana; const m0 = d.mana; A.issueAttack(d); A.simulate(3);
      let L = A.getLog(); const mb = L.filter(e => e.type === 'manaBurn');
      o.manabreak = { events: mb.length, burned: Math.round(m0 - d.mana), perHit: mb[0] && mb[0].amount, dmg: H3.sum(H3.byAb(L, 'manabreak')) };
      H3.at(); A.castAbility(1, { x: -40, z: 0 }); A.step(15); L = A.getLog();
      o.blink = { moved: +(40 - P.z).toFixed(1), teleports: L.filter(e => e.type === 'teleport').length };
      o.counter = { magicRes: +P.magicRes.toFixed(2) };
      // reflect: an enemy Zeus casts Lightning Bolt (unit target) on the shielded Anti-Mage → it hits Zeus instead
      H3.at(); const z = H3.dummy(-40, 33, 'zeus', 9000); A.setLevel(10, z); A.castAbility(2, null); A.step(1); const hp0 = P.hp, zh = z.hp;
      A.castAbility(1, P, z); A.step(12); L = A.getLog();
      o.counter.reflected = L.filter(e => e.type === 'spellReflect').length; o.counter.zeusHit = Math.round(zh - z.hp); o.counter.amHit = Math.round(hp0 - P.hp);
      A.simulate(2); o.counter.shieldAfter = A.hasState(P, 'reflect');
      // void: target at 10% mana takes more than at 100%; AoE hits a neighbour
      const vd = (frac) => { H3.at(); const t = H3.dummy(-40, 33, 'cm', 50000); A.setLevel(18, t); const n = H3.dummy(-38, 32, 'axe', 50000); t.mana = t.maxMana * frac; A.castAbility(3, t); A.step(15); const L = A.getLog(); const v = L.find(e => e.type === 'manaVoid'); return { dmg: v ? v.dmg : 0, onT: H3.sum(H3.byAb(L, 'void').filter(e => e.tgt === t.id)), onN: H3.sum(H3.byAb(L, 'void').filter(e => e.tgt === n.id)), stun: H3.mods(L, 'modifierAdd', 'stun').length }; };
      o.void = { low: vd(0.1), full: vd(1) };
      return o;
    });
    assert(r.manabreak.events >= 2 && r.manabreak.burned >= 100 && r.manabreak.dmg > 0, 'mana break ' + JSON.stringify(r.manabreak));
    assert(r.blink.teleports === 1 && r.blink.moved > 22 && r.blink.moved < 25.5, 'blink ' + JSON.stringify(r.blink));
    assert(Math.abs(r.counter.magicRes - (1 - 0.75 * 0.64)) < 0.02, 'magic res ' + JSON.stringify(r.counter));
    assert(r.counter.reflected === 1 && r.counter.zeusHit > 50 && r.counter.amHit <= 0 && !r.counter.shieldAfter, 'reflect ' + JSON.stringify(r.counter));
    assert(r.void.low.dmg > 500 && r.void.full.dmg < 5 && r.void.low.onN > 0 && r.void.low.stun >= 1, 'void ' + JSON.stringify(r.void));
    return JSON.stringify(r);
  });

  test('B3 Puck: Illusory Orb + jaunt, Waning Rift silence, Phase Shift invulnerable, Dream Coil stun + break', async page => {
    await start(page, 'puck');
    const r = await page.evaluate(() => {
      const { A, P } = H3, o = {};
      H3.at(); const cs = H3.creeps([[-40, 35], [-40, 31], [-40, 27]], 'melee', 3000); A.castAbility(0, { x: -40, z: 0 }); A.simulate(1.1);
      let L = A.getLog(); const before = { x: P.x, z: P.z }, orb = P._orb && { x: P._orb.x, z: P._orb.z };
      o.orb = { hits: new Set(H3.byAb(L, 'orb').map(e => e.tgt)).size, orbAt: orb && +orb.z.toFixed(1) };
      A.castAbility(0, null); A.step(2); L = A.getLog();
      o.orb.jaunts = L.filter(e => e.type === 'jaunt').length; o.orb.jumped = +(before.z - P.z).toFixed(1);
      A.simulate(2.5); o.orb.orbGone = !P._orb || !P._orb.alive;
      H3.at(); const d = H3.dummy(-40, 35, 'lina', 9000); A.castAbility(1, null); A.step(6); L = A.getLog();
      o.rift = { dmg: H3.sum(H3.byAb(L, 'rift')), silenced: A.hasState(d, 'silenced'), dCast: A.castAbility(0, P, d) };
      H3.at(); A.castAbility(2, null); A.step(4); const hp0 = P.hp; const e = H3.dummy(-40, 37, 'axe'); A.dealDamage(e, P, 500, 'magical');
      o.phase = { invuln: A.hasState(P, 'invulnerable'), hidden: A.hasState(P, 'hidden'), seen: A.isVisible(P, 1), took: Math.round(hp0 - P.hp) }; A.simulate(4); o.phase.after = A.hasState(P, 'invulnerable');
      // coil: two heroes latched; one stays (no break), one is teleported away → break damage + long stun
      H3.at(); const a = H3.dummy(-40, 30, 'axe', 9000), b = H3.dummy(-38, 31, 'sven', 9000); A.castAbility(3, { x: -39, z: 30.5 }); A.step(6); L = A.getLog();
      o.coil = { latched: [a, b].filter(u => A.getMod(u, 'puck_coil')).length, stuns: H3.mods(L, 'modifierAdd', 'stun').length, dmg: H3.sum(H3.byAb(L, 'coil')), coilEvt: (L.find(e => e.type === 'coil') || {}).n };
      A.clearLog(); A.teleportHero(-30, 15, b); A.step(4); L = A.getLog();
      o.coil.breaks = L.filter(e => e.type === 'coilBreak').length; o.coil.breakTarget = (L.find(e => e.type === 'coilBreak') || {}).target === b.id; o.coil.bStunned = A.hasState(b, 'stunned'); o.coil.aStill = !!A.getMod(a, 'puck_coil');
      return o;
    });
    assert(r.orb.hits >= 3 && r.orb.jaunts === 1 && r.orb.jumped > 10 && r.orb.orbGone, 'orb ' + JSON.stringify(r.orb));
    assert(r.rift.dmg > 100 && r.rift.silenced && r.rift.dCast !== true, 'rift ' + JSON.stringify(r.rift));
    assert(r.phase.invuln && r.phase.hidden && !r.phase.seen && r.phase.took === 0 && !r.phase.after, 'phase ' + JSON.stringify(r.phase));
    assert(r.coil.latched === 2 && r.coil.stuns >= 2 && r.coil.dmg > 100 && r.coil.breaks === 1 && r.coil.breakTarget && r.coil.bStunned && r.coil.aStill, 'coil ' + JSON.stringify(r.coil));
    return JSON.stringify(r);
  });

  test('B3 Bounty Hunter: Shuriken bounces between tracked enemies, Jinada crit + gold steal + cooldown', async page => {
    await start(page, 'bh');
    const r = await page.evaluate(() => {
      const { A, P } = H3, o = {};
      H3.at(); const t1 = H3.dummy(-40, 30, 'axe', 9000), t2 = H3.dummy(-34, 28, 'cm', 9000), t3 = H3.dummy(-46, 28, 'lina', 9000);
      A.castAbility(3, t1); A.step(15); H3.reset(3); A.castAbility(3, t2); A.step(15); o.tracked = [t1, t2, t3].map(u => !!A.getMod(u, 'bh_track')); A.clearLog(); A.castAbility(0, t1); A.simulate(3);
      let L = A.getLog(); const hit = new Set(H3.byAb(L, 'shuriken').map(e => e.tgt));
      o.shuriken = { hit: [...hit].map(id => id === t1.id ? 't1' : id === t2.id ? 't2' : 't3').sort().join(','), bounces: L.filter(e => e.type === 'shurikenBounce').length, stuns: H3.mods(L, 'modifierAdd', 'stun').length };
      H3.at(); const d = H3.dummy(-40, 38.6, 'axe', 9000); d.gold = 500; const g0 = P.gold; A.issueAttack(d); for (let i = 0; i < 330; i++) { A.step(1); d.hp = d.maxHp; }
      L = A.getLog(); const j = L.filter(e => e.type === 'jinada'), gs = L.filter(e => e.type === 'goldSteal'), imp = L.filter(e => e.type === 'attackImpact' && e.unit === P.id);
      o.jinada = { procs: j.length, crits: L.filter(e => e.type === 'crit' && e.unit === P.id).length, impacts: imp.length, stolen: gs.reduce((a, e) => a + e.amount, 0), dGold: d.gold, gap: j.length > 1 ? +(L.filter(e => e.type === 'jinada')[1].t - j[0].t).toFixed(1) : 0 };
      return o;
    });
    assert(r.shuriken.hit === 't1,t2' && r.shuriken.bounces === 1 && r.shuriken.stuns >= 2, 'shuriken ' + JSON.stringify(r.shuriken));
    assert(r.jinada.procs === 2 && r.jinada.crits === 2 && r.jinada.impacts > 4 && r.jinada.stolen === 72 && r.jinada.gap >= 5.9, 'jinada ' + JSON.stringify(r.jinada));
    return JSON.stringify(r);
  });
};
