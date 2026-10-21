// build/tests/heroes-b2.js — B2 hero scenarios (Sven, Zeus, Crystal Maiden, Lion). Loaded by run-tests.js.
// Every scenario: start as the hero at level 18 (god mode), spawn stationary Dire creeps / dummy heroes, cast via GameAPI, inspect the event log.
module.exports = ({ test, boot, assert }) => {
  // page-side helpers (installed after boot)
  const HELPERS = () => {
    const A = GameAPI;
    window.H2 = {
      A, P: A.G.player,
      clear() { for (const u of A.units) if (!u.dead && !u.isBuilding && u.team === 1) A.killUnit(u, null); A.step(70); },
      creeps(pts, kind = 'melee') { return pts.map(([x, z]) => { const c = A.spawnUnit(kind, 1, x, z); c.wps = [{ x, z }]; c.wp = 0; return c; }); },
      dummy(x, z, heroId = 'axe') { const h = A.spawnUnit('hero', 1, x, z, { heroId }); h.order = { type: 'hold' }; return h; },
      fresh(pts) { this.clear(); const cs = this.creeps(pts || [[-40, 33], [-38, 34], [-42, 34], [-40, 36]]); A.teleportHero(-40, 40); A.step(1); A.clearLog(); return cs; },
      learnAll() { const P = A.G.player; for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return P.abilities.map(a => a.lvl); },
      reset(slot) { const P = A.G.player, ab = P.abilities[slot]; ab.cd = 0; P.mana = P.maxMana; },
      log: f => A.getLog(f), byAb: (L, id) => L.filter(e => e.type === 'damage' && e.ability === id),
      sum: arr => Math.round(arr.reduce((a, e) => a + e.amount, 0)),
      mods: (L, type, mod) => L.filter(e => e.type === type && e.mod === mod),
    };
  };
  async function start(page, hero) {
    await boot(page, hero);
    await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); return H2.learnAll(); });
  }

  test('B2 Sven: Storm Hammer AoE stun, Great Cleave, Warcry, God\'s Strength', async page => {
    await start(page, 'sven');
    const r = await page.evaluate(() => {
      const { A, P } = H2, o = {};
      let cs = H2.fresh(); A.castAbility(0, cs[0]); A.simulate(1.5);
      let L = H2.log(); const stunned = new Set(H2.mods(L, 'modifierAdd', 'stun').map(e => e.unit));
      o.hammer = { casts: L.filter(e => e.type === 'cast' && e.ability === 'hammer').length, hit: new Set(H2.byAb(L, 'hammer').map(e => e.tgt)).size, stunned: stunned.size,
        starsFx: cs.filter(c => c._fx && c._fx.stars).length };
      A.simulate(2.5); o.hammer.stillStunned = cs.filter(c => !c.dead && A.hasState(c, 'stunned')).length; o.hammer.starsAfter = cs.filter(c => c._fx && c._fx.stars).length;
      cs = H2.fresh([[-40, 37], [-39, 35.6], [-41, 35.6], [-40, 35]]); A.teleportHero(-40, 40); for (const c of cs) c.hp = c.maxHp = 5000; A.issueAttack(cs[0]); A.simulate(4);
      L = H2.log(); const cl = H2.byAb(L, 'cleave');
      o.cleave = { events: cl.length, targets: new Set(cl.map(e => e.tgt)).size, onPrimary: cl.filter(e => e.tgt === cs[0].id).length, withAttackId: cl.filter(e => e.attackId).length, impacts: L.filter(e => e.type === 'attackImpact' && e.unit === P.id).length };
      H2.fresh(); const a0 = P.armor, s0 = P.speed; A.castAbility(2, null); A.step(2);
      o.warcry = { armor: +(P.armor - a0).toFixed(1), msPct: +(P.speed / s0 - 1).toFixed(2), mod: !!A.getMod(P, 'sven_warcry') }; A.simulate(8.5); o.warcry.after = !!A.getMod(P, 'sven_warcry');
      const d0 = P.dmgMin; A.castAbility(3, null); A.simulate(0.5);
      o.gods = { dmgGain: Math.round(P.dmgMin - d0), scale: +P.model.scale.x.toFixed(2) }; A.simulate(25.5); o.gods.after = !!A.getMod(P, 'sven_gods'); o.gods.scaleAfter = P.model.scale.x;
      return o;
    });
    assert(r.hammer.casts === 1 && r.hammer.hit >= 3 && r.hammer.stunned >= 3 && r.hammer.starsFx >= 3, 'hammer ' + JSON.stringify(r.hammer));
    assert(r.hammer.stillStunned === 0 && r.hammer.starsAfter === 0, 'hammer stun not removed ' + JSON.stringify(r.hammer));
    assert(r.cleave.events > 0 && r.cleave.targets >= 2 && r.cleave.onPrimary === 0 && r.cleave.withAttackId === 0, 'cleave ' + JSON.stringify(r.cleave));
    assert(r.warcry.armor >= 13.9 && r.warcry.msPct >= 0.19 && r.warcry.mod && !r.warcry.after, 'warcry ' + JSON.stringify(r.warcry));
    assert(r.gods.dmgGain > 100 && r.gods.scale > 1.1 && !r.gods.after && r.gods.scaleAfter === 1, 'gods ' + JSON.stringify(r.gods));
    return JSON.stringify(r);
  });

  test('B2 Zeus: Arc Lightning chain, Lightning Bolt mini-stun, Static Field, Thundergod\'s Wrath global', async page => {
    await start(page, 'zeus');
    const r = await page.evaluate(() => {
      const { A, P } = H2, o = {};
      const line = [[-40, 33], [-36, 33], [-32, 33], [-28, 33], [-24, 33], [-20, 33]];   // 4 apart → chain must hop along the line
      let cs = H2.fresh(line); for (const c of cs) c.hp = c.maxHp = 3000;
      A.castAbility(0, cs[0]); A.simulate(1.5); let L = H2.log();
      o.arc = { jumps: L.filter(e => e.type === 'chainJump').length, targets: new Set(H2.byAb(L, 'arc').map(e => e.tgt)).size, dmg: H2.sum(H2.byAb(L, 'arc')), static: H2.byAb(L, 'static').length };
      cs = H2.fresh(); for (const c of cs) c.hp = c.maxHp = 3000; A.castAbility(1, cs[0]); A.simulate(1); L = H2.log();
      o.bolt = { dmg: H2.sum(H2.byAb(L, 'bolt')), stunAdd: H2.mods(L, 'modifierAdd', 'stun').length, stunRemove: H2.mods(L, 'modifierRemove', 'stun').length };
      const t = L.find(e => e.type === 'modifierAdd' && e.mod === 'stun'), t2 = L.find(e => e.type === 'modifierRemove' && e.mod === 'stun'); o.bolt.stunLen = t && t2 ? +(t2.t - t.t).toFixed(2) : null;
      // Wrath: dummy enemy hero across the map, creeps near Zeus, one creep far from every Radiant hero
      cs = H2.fresh(); const far = H2.creeps([[20, -20]])[0], dummy = H2.dummy(55, -55); A.step(1); A.clearLog();
      A.castAbility(3, null); A.simulate(1.5); L = H2.log(); const wr = H2.byAb(L, 'wrath');
      o.wrath = { heroHit: wr.some(e => e.tgt === dummy.id), nearHit: cs.filter(c => wr.some(e => e.tgt === c.id)).length, farHit: wr.some(e => e.tgt === far.id), heroDmg: Math.round(wr.filter(e => e.tgt === dummy.id).reduce((a, e) => a + e.amount, 0)) };
      return o;
    });
    assert(r.arc.jumps >= 5 && r.arc.targets >= 5 && r.arc.dmg > 0 && r.arc.static > 0, 'arc/static ' + JSON.stringify(r.arc));
    assert(r.bolt.dmg > 0 && r.bolt.stunAdd === 1 && r.bolt.stunRemove === 1 && r.bolt.stunLen <= 0.4, 'bolt ' + JSON.stringify(r.bolt));
    assert(r.wrath.heroHit && r.wrath.nearHit === 4 && !r.wrath.farHit && r.wrath.heroDmg > 0, 'wrath ' + JSON.stringify(r.wrath));
    return JSON.stringify(r);
  });

  test('B2 Crystal Maiden: Nova slow, Frostbite root+DoT, Arcane Aura, Freezing Field channel + interrupts', async page => {
    await start(page, 'cm');
    const r = await page.evaluate(() => {
      const { A, P } = H2, o = {};
      let cs = H2.fresh(); for (const c of cs) c.hp = c.maxHp = 3000; const s0 = cs[0].speed;
      A.castAbility(0, { x: cs[0].x, z: cs[0].z }); A.step(12); let L = H2.log();
      o.nova = { dmg: H2.sum(H2.byAb(L, 'nova')), slowed: H2.mods(L, 'modifierAdd', 'slowed').length, speedK: +(cs[0].speed / s0).toFixed(2), asK: +cs[0].atkSpeedMult.toFixed(2) };
      A.simulate(5); o.nova.after = cs.filter(c => A.getMod(c, 'slowed')).length;
      // Frostbite on a creep that wants to walk: stays rooted, can't attack, takes DoT, ice visual removed after
      cs = H2.fresh(); const c = cs[0]; c.hp = c.maxHp = 3000; c.wps = [{ x: -40, z: 0 }]; A.castAbility(1, c); A.step(12);
      const x0 = c.x, z0 = c.z; A.simulate(3); L = H2.log();
      o.frost = { moved: +Math.hypot(c.x - x0, c.z - z0).toFixed(2), attacks: L.filter(e => e.type === 'attackStart' && e.unit === c.id && e.t > L[0].t + 0.6).length, dot: H2.byAb(L, 'frostbite').length, ice: !!(c._fx && c._fx.ice), rooted: c.rooted };
      A.simulate(2.5); o.frost.after = !!A.getMod(c, 'cm_frostbite'); o.frost.iceAfter = !!(c._fx && c._fx.ice);
      o.aura = { mod: !!A.getMod(P, 'cm_arcane'), regenBonus: +(P.manaRegen - (P.def.stats.manaRegen + P.int * 0.05)).toFixed(2) };
      // Freezing Field: interrupt by move order
      cs = H2.fresh(); for (const x of cs) x.hp = x.maxHp = 5000;
      A.castAbility(3, null); A.simulate(2.5); L = H2.log();
      o.field = { start: L.filter(e => e.type === 'channelStart').length, dmg: H2.sum(H2.byAb(L, 'field')), slow: H2.mods(L, 'modifierAdd', 'slowed').length, armor: !!A.getMod(P, 'cm_field'), channeling: !!P.channel };
      A.issueMove(-40, 45); A.step(2); L = H2.log(); const e1 = L.find(e => e.type === 'channelEnd');
      o.field.moveEnd = e1 && e1.reason; o.field.armorAfter = !!A.getMod(P, 'cm_field');
      // interrupt by stun
      H2.reset(3); A.teleportHero(-40, 40); A.clearLog(); A.castAbility(3, null); A.simulate(1); A.stun(P, 1); A.step(1); L = H2.log();
      const e2 = L.find(e => e.type === 'channelEnd'); o.field.stunEnd = e2 && e2.reason; A.simulate(1.2);
      // full channel completes
      H2.reset(3); A.clearLog(); A.castAbility(3, null); A.simulate(7); L = H2.log(); const e3 = L.find(e => e.type === 'channelEnd');
      o.field.fullEnd = e3 && e3.reason; o.field.fullLen = e3 && e3.elapsed;
      return o;
    });
    assert(r.nova.dmg > 0 && r.nova.slowed >= 3 && r.nova.speedK < 0.6 && r.nova.asK < 0.6 && r.nova.after === 0, 'nova ' + JSON.stringify(r.nova));
    assert(r.frost.moved < 0.3 && r.frost.attacks === 0 && r.frost.dot >= 4 && r.frost.ice && !r.frost.after && !r.frost.iceAfter, 'frostbite ' + JSON.stringify(r.frost));
    assert(r.aura.mod && r.aura.regenBonus >= 4.9, 'aura ' + JSON.stringify(r.aura));
    assert(r.field.start === 1 && r.field.dmg > 0 && r.field.slow > 0 && r.field.armor && r.field.channeling, 'field ' + JSON.stringify(r.field));
    assert(r.field.moveEnd === 'order' && !r.field.armorAfter && r.field.stunEnd === 'stun' && r.field.fullEnd === 'done' && Math.abs(r.field.fullLen - 6) < 0.1, 'field interrupts ' + JSON.stringify(r.field));
    return JSON.stringify(r);
  });

  test('B2 Lion: Earth Spike knockup+stun, Hex frog, Mana Drain channel + interrupts, Finger of Death', async page => {
    await start(page, 'lion');
    const r = await page.evaluate(() => {
      const { A, P } = H2, o = {};
      let cs = H2.fresh([[-40, 36], [-40, 32], [-40, 28], [-30, 36]]); for (const c of cs) c.hp = c.maxHp = 3000;
      A.castAbility(0, { x: -40, z: 20 }); let air = 0, L;
      for (let i = 0; i < 30; i++) { A.step(1); air = Math.max(air, ...cs.slice(0, 3).map(c => c.model.userData.inner.position.y)); } L = H2.log();
      o.spike = { knock: H2.mods(L, 'modifierAdd', 'knockup').length, stun: H2.mods(L, 'modifierAdd', 'stun').length, hit: new Set(H2.byAb(L, 'spike').map(e => e.tgt)).size, air: +air.toFixed(2), offLine: H2.byAb(L, 'spike').some(e => e.tgt === cs[3].id) };
      A.simulate(3); o.spike.stillStunned = cs.filter(c => A.hasState(c, 'stunned')).length; o.spike.yAfter = Math.max(...cs.map(c => c.model.userData.inner.position.y));
      // Hex a creep next to Lion: frog model, no attacks, slow
      cs = H2.fresh([[-40, 38]]); const c = cs[0]; A.castAbility(1, c); A.step(3); const t0 = A.G.time;
      o.hex = { frog: !!(c._fx && c._fx.frog), innerHidden: !c.model.userData.inner.visible, speed: +c.speed.toFixed(2) };
      A.simulate(2); L = H2.log(); o.hex.attacks = L.filter(e => e.type === 'attackStart' && e.unit === c.id).length;
      A.simulate(2.5); o.hex.after = !!A.getMod(c, 'hex'); o.hex.frogAfter = !!(c._fx && c._fx.frog); o.hex.innerAfter = c.model.userData.inner.visible;
      // Mana Drain on an enemy hero: steals mana; on a creep: damage instead; interrupted by move; broken by range
      H2.fresh([[-40, 33]]); const d = H2.dummy(-36, 36); A.step(1); P.mana = 100; const dm0 = d.mana; A.clearLog();
      A.castAbility(2, d); A.step(1); P.mana = 100; A.simulate(2); L = H2.log();
      o.drain = { start: L.filter(e => e.type === 'channelStart').length, stolen: Math.round(dm0 - d.mana), lionGain: Math.round(P.mana - 100), slowed: !!A.getMod(d, 'slowed') };
      A.issueMove(-41, 41); A.step(2); L = H2.log(); o.drain.moveEnd = (L.find(e => e.type === 'channelEnd') || {}).reason;
      H2.reset(2); A.clearLog(); A.castAbility(2, d); A.simulate(1); d.x = 0; d.z = 0; A.step(2); L = H2.log(); o.drain.rangeEnd = (L.find(e => e.type === 'channelEnd') || {}).reason;
      H2.reset(2); const cr = H2.creeps([[-38, 37]])[0]; cr.hp = cr.maxHp = 3000; A.clearLog(); A.castAbility(2, cr); A.simulate(2); L = H2.log();
      o.drain.creepDmg = H2.sum(H2.byAb(L, 'drain')); A.stun(P, 0.5); A.step(1); o.drain.stunEnd = (H2.log().find(e => e.type === 'channelEnd') || {}).reason;
      // Finger vs creep (kills) and vs hero (magic resist 25%)
      cs = H2.fresh(); A.castAbility(3, cs[0]); A.simulate(1); L = H2.log();
      o.finger = { creepKilled: cs[0].dead, delay: (() => { const c0 = L.find(e => e.type === 'cast' && e.ability === 'finger'), dd = H2.byAb(L, 'finger')[0]; return c0 && dd ? +(dd.t - c0.t).toFixed(2) : null; })() };
      const d2 = H2.dummy(-37, 37); d2.hp = d2.maxHp = 5000; A.step(1); H2.reset(3); A.clearLog(); A.castAbility(3, d2); A.simulate(1); o.finger.heroDmg = H2.sum(H2.byAb(H2.log(), 'finger'));
      return o;
    });
    assert(r.spike.knock >= 3 && r.spike.stun >= 3 && r.spike.hit >= 3 && r.spike.air > 1 && !r.spike.offLine, 'spike ' + JSON.stringify(r.spike));
    assert(r.spike.stillStunned === 0 && r.spike.yAfter === 0, 'spike cleanup ' + JSON.stringify(r.spike));
    assert(r.hex.frog && r.hex.innerHidden && r.hex.speed <= 2.8 && r.hex.attacks === 0 && !r.hex.after && !r.hex.frogAfter && r.hex.innerAfter, 'hex ' + JSON.stringify(r.hex));
    assert(r.drain.start === 1 && r.drain.stolen > 100 && r.drain.lionGain > 100 && r.drain.slowed, 'drain ' + JSON.stringify(r.drain));
    assert(r.drain.moveEnd === 'order' && r.drain.rangeEnd === 'broken' && r.drain.creepDmg > 0 && r.drain.stunEnd === 'stun', 'drain interrupts ' + JSON.stringify(r.drain));
    assert(r.finger.creepKilled && r.finger.delay >= 0.2 && r.finger.heroDmg >= 600, 'finger ' + JSON.stringify(r.finger));
    return JSON.stringify(r);
  });
};
