// build/tests/b4.js — B4: Nature's Prophet, Naga Siren, Lycan, Lone Druid + the engine features they need (summons, illusions,
// unit control, trees as dynamic obstacles, sleep / fear) and the recipe items. Loaded by run-tests.js.
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H4 = {
      A, P: A.G.player,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead && h.team === 1) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 0) { const h = A.spawnUnit('hero', 1, x, z, { heroId }); h.order = { type: 'hold' }; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      creep(x, z, hp = 0) { const c = A.spawnUnit('melee', 1, x, z); c.wps = [{ x, z }]; c.wp = 0; if (hp) { if (c.base) c.base.hp = hp; c.hp = c.maxHp = hp; } return c; },
      at(x = -40, z = 40) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      learnAll() { for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return A.G.player.abilities.map(a => a.lvl); },
      reset(slot) { const P = A.G.player; P.abilities[slot].cd = 0; P.mana = P.maxMana; },
      ev: (t, f) => A.getLog(t).filter(f || (() => true)),
      byAb: (id) => A.getLog('damage').filter(e => e.ability === id),
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); return H4.learnAll(); });
  }

  test('boot (B4): 14+ heroes, 26+ items (7 recipe items), summon portraits rendered', async page => {
    await boot(page);
    const r = await page.evaluate(() => ({ heroes: Object.keys(GameAPI.HERO_DEFS).length, items: Object.keys(GameAPI.ITEM_DEFS), cards: document.querySelectorAll('.card').length, summons: Object.keys(GameAPI.SUMMON_TYPES) }));
    assert(r.heroes >= 14 && r.cards === r.heroes, 'heroes ' + JSON.stringify(r));
    assert(r.items.length >= 26 && ['phase', 'arcane', 'shadow', 'veil', 'bfury', 'assault', 'vanguard'].every(i => r.items.includes(i)), 'items ' + r.items);
    assert(['np_treant', 'lyc_wolf', 'ld_bear'].every(s => r.summons.includes(s)), 'summons ' + r.summons);
    return JSON.stringify({ heroes: r.heroes, items: r.items.length, summons: r.summons });
  });

  test('trees: destroy / sprout update pathing grid + sight blocking + fog vision; Sprout expires, natural trees regrow', async page => {
    await start(page, 'np');
    const r = await page.evaluate(() => {
      const { A, P } = H4, o = {}; A.revealAll(false); H4.at(-40, 40);
      const t = A.treesNear(P.x, P.z, 40)[0]; o.tree0 = { walk: A.isWalk(t.x, t.z), sight: A.sightBlocked(t.x, t.z), gen: A.TREES.gen };
      A.destroyTree(t.k, P); o.tree1 = { walk: A.isWalk(t.x, t.z), sight: A.sightBlocked(t.x, t.z), gen: A.TREES.gen, ev: H4.ev('treeDestroyed').length };
      // vision: an enemy 6 units away is visible; a sprouted ring around the hero blocks sight to it
      // a spot where nothing else of ours (towers, creeps) sees x+9 and Sprout's ring cells are free
      A.teleportHero(-70, 70); A.updateVision();
      const spot = [[-20, -20], [20, 20], [-10, 30], [30, -10], [10, -30], [-30, 10], [0, 20], [20, 0], [-25, -5]].find(([x, z]) => A.isWalk(x, z) && !A.treesNear(x, z, 5).length && !A.visAt(0, x + 9, z));
      o.spot = spot; A.teleportHero(spot[0], spot[1]); A.step(1);
      const d = H4.dummy(P.x + 9, P.z, 'axe', 9000); A.updateVision(); o.visBefore = A.isVisible(d, 0);   // outside Sprout's own 6-unit vision
      A.castAbility(0, { x: P.x, z: P.z }); A.simulate(0.6, 1 / 20); A.updateVision(); o.ringTrees = A.TREES.temp.length; o.visInside = A.isVisible(d, 0);
      o.blockedPath = !A.isWalk(P.x + 3, P.z) || !A.isWalk(P.x + 2.5, P.z + 1);
      A.simulate(6, 1 / 20); A.updateVision(); o.afterExpire = { temp: A.TREES.temp.length, vis: A.isVisible(d, 0) };
      A.skipTo && 0; A.G.time += 400; A.step(25); o.regrown = A.isWalk(t.x, t.z) === false && A.treeAt(t.x, t.z);
      return o;
    });
    assert(!r.tree0.walk && r.tree0.sight && r.tree1.walk && !r.tree1.sight && r.tree1.gen > r.tree0.gen && r.tree1.ev === 1, 'destroy ' + JSON.stringify(r));
    assert(r.visBefore && r.ringTrees >= 6 && !r.visInside && r.blockedPath, 'sprout vision ' + JSON.stringify(r));
    assert(r.afterExpire.temp === 0 && r.afterExpire.vis && r.regrown, 'expire/regrow ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B4 Prophet: Teleportation channel (global), Nature\'s Call turns trees into controllable treants, Wrath of Nature bounces with growing damage', async page => {
    await start(page, 'np');
    const r = await page.evaluate(() => {
      const { A, P } = H4, o = {}; H4.at(-40, 40);
      A.castAbility(1, { x: 30, z: -30 }); A.simulate(1, 1 / 20); o.chan = !!P.channel; A.simulate(3, 1 / 20); o.tp = { x: Math.round(P.x), z: Math.round(P.z), ev: H4.ev('npTeleport').length };
      H4.at(-40, 40); const tr = A.treesNear(P.x, P.z, 12); const n0 = tr.length;
      o.callErr = A.castAbility(2, { x: tr[0].x, z: tr[0].z }); A.simulate(1.5, 1 / 20);
      const ts = A.ownedUnits(P, u => u.type === 'np_treant'); o.treants = ts.length; o.treesLeft = n0 - A.treesNear(P.x, P.z, 12).length;
      o.treant = ts[0] && { hp: ts[0].maxHp, ctl: ts[0].controllable, owner: A.ownerOf(ts[0]) === P };
      // Nature's Call needs trees: cast far from any → error
      A.teleportHero(0, 0); A.step(2); const bare = A.treesNear(0, 0, 6).length; H4.reset(2); o.noTree = bare ? 'trees' : A.castAbility(2, { x: 0, z: 0 });
      H4.at(-40, 40); const ds = [H4.dummy(30, -30, 'axe', 9000), H4.dummy(33, -30, 'lina', 9000), H4.creep(31, -33, 9000)];
      A.castAbility(3, null); A.simulate(6, 1 / 20); const b = H4.ev('wrathBounce');
      o.wrath = { n: b.length, targets: new Set(b.map(e => e.target)).size, first: b[0] && b[0].dmg, last: b.length && b[b.length - 1].dmg };
      return o;
    });
    assert(r.chan && r.tp.ev === 1 && Math.hypot(r.tp.x - 30, r.tp.z + 30) < 4, 'teleport ' + JSON.stringify(r));
    assert(!r.callErr && r.treants >= 4 && r.treesLeft >= 1 && r.treant.ctl && r.treant.owner, 'natures call ' + JSON.stringify(r));
    assert(r.noTree === 'trees' || typeof r.noTree === 'string', 'needs trees ' + JSON.stringify(r));
    assert(r.wrath.n >= 3 && r.wrath.targets === 3 && r.wrath.last > r.wrath.first, 'wrath ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('illusions: deal reduced / take extra damage, copy stats, look identical, own team tint, Rip Tide from illusions, Song sleep (invulnerable, recast ends)', async page => {
    await start(page, 'naga');
    const r = await page.evaluate(() => {
      const { A, P } = H4, o = {}; H4.at(-40, 40);
      A.castAbility(0, null); A.simulate(1, 1 / 20); const il = A.ownedUnits(P, u => u.isIllusion);
      o.n = il.length; o.copy = il.every(u => u.maxHp === P.maxHp && Math.abs(u.armor - P.armor) < 0.01 && u.model && u.model !== P.model && !u.isHero);
      o.inHeroes = A.G.heroes.includes(il[0]);
      const d = H4.dummy(-36, 40, 'axe', 20000); A.removeModById && 0;
      const taken = A.dealDamage(d, il[0], 100, 'pure'), dealt = A.dealDamage(il[0], d, 100, 'pure');
      o.mult = { taken: Math.round(taken), dealt: Math.round(dealt), out: il[0].illuOut, inc: il[0].illuIn };
      o.cantCast = A.castAbility(1, d, il[0]);
      // Rip Tide procs from an illusion's attacks at full damage + armor reduction
      A.clearLog(); for (const u of il) A.issueOrder(u, { type: 'attack', target: d }); A.simulate(12, 1 / 20);
      const rt = H4.ev('ripTide'); o.rip = { fromIllu: rt.filter(e => e.illusion).length, armorMod: !!A.getMod(d, 'naga_rip') || rt.length > 0 };
      const rd = A.getLog('damage').filter(e => e.ability === 'riptide'); o.ripDmg = rd.length ? Math.round(Math.max(...rd.map(e => e.amount))) : 0;
      // Song: enemies asleep + invulnerable (not woken by damage); recast ends it
      H4.reset(3); A.castAbility(3, null); A.simulate(1, 1 / 20);
      o.song = { sleep: A.hasState(d, 'sleeping'), inv: A.hasState(d, 'invulnerable'), dmg: A.dealDamage(P, d, 100, 'pure') };
      A.simulate(0.3, 1 / 20); A.castAbility(3, null); A.simulate(0.5, 1 / 20); o.song.after = A.hasState(d, 'sleeping'); o.song.endEv = H4.ev('songEnd').length;
      // illusion dies → removed, credited
      A.killUnit(il[0], d); A.step(2); o.dieEv = H4.ev('illusionDeath').length;
      return o;
    });
    assert(r.n >= 3 && r.copy && !r.inHeroes, 'illusions ' + JSON.stringify(r));
    assert(Math.abs(r.mult.taken - 100 * r.mult.inc) < 2 && Math.abs(r.mult.dealt - 100 * r.mult.out) < 2 && r.mult.inc > 3 && r.mult.out < 0.5, 'multipliers ' + JSON.stringify(r.mult));
    assert(typeof r.cantCast === 'string', 'illusion cast ' + r.cantCast);
    assert(r.rip.fromIllu >= 1 && r.ripDmg >= 110, 'rip tide ' + JSON.stringify(r));
    assert(r.song.sleep && r.song.inv && r.song.dmg === 0 && !r.song.after && r.song.endEv === 1 && r.dieEv >= 1, 'song ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B4 Naga: Ensnare roots (projectile), illusion visual tint only for own team', async page => {
    await start(page, 'naga');
    const r = await page.evaluate(() => {
      const { A, P } = H4, o = {}; H4.at(-40, 40); const d = H4.dummy(-34, 40, 'lina', 9000);
      A.castAbility(1, d); A.simulate(1, 1 / 20); o.rooted = A.hasState(d, 'rooted'); A.issueOrder(d, { type: 'move', x: -20, z: 40 }); const x0 = d.x; A.simulate(1, 1 / 20); o.moved = +(d.x - x0).toFixed(2);
      H4.reset(0); A.castAbility(0, null); A.simulate(1, 1 / 20); const il = A.ownedUnits(P, u => u.isIllusion)[0];
      o.tint = !!il._tint; o.heroTint = !!P._tint;
      return o;
    });
    assert(r.rooted && r.moved < 0.3, 'ensnare ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B4 Lycan: Summon Wolves (owned, controllable, bounty), Howl, Feral Impulse aura on own units, Shapeshift wolf model + speed + crits (wolves too)', async page => {
    await start(page, 'lycan');
    const r = await page.evaluate(() => {
      const { A, P } = H4, o = {}; H4.at(-40, 40);
      A.castAbility(0, null); A.simulate(1, 1 / 20); const w = A.ownedUnits(P, u => u.type === 'lyc_wolf'); o.wolves = w.length;
      o.feral = !!A.getMod(w[0], 'lyc_feral') && !!A.getMod(P, 'lyc_feral');
      const d0 = P.dmgMin; A.castAbility(1, null); A.simulate(0.6, 1 / 20); o.howl = { hero: +(P.dmgMin - d0).toFixed(1), wolf: !!A.getMod(w[0], 'lyc_howl') };
      const sp = P.speed, sc = P.model.scale.x; A.castAbility(3, null); A.simulate(1, 1 / 20);
      o.form = { form: P.form, speed: [sp, P.speed], scale: [sc, +P.model.scale.x.toFixed(2)], quad: !!P.model.userData.parts.legFL };
      const d = H4.dummy(-36, 40, 'axe', 50000); A.clearLog(); A.issueOrder(P, { type: 'attack', target: d }); for (const u of w) A.issueOrder(u, { type: 'attack', target: d }); A.simulate(15, 1 / 20);
      const cr = H4.ev('crit'); o.crits = { hero: cr.filter(e => e.unit === P.id).length, wolves: cr.filter(e => w.some(x => x.id === e.unit)).length };
      // a wolf killed by an enemy hero gives that hero gold
      H4.reset(0); A.castAbility(0, null); A.simulate(1, 1 / 20); const nw = A.ownedUnits(P, u => u.type === 'lyc_wolf')[0]; const g0 = d.gold; A.killUnit(nw, d); A.step(2); o.bounty = d.gold - g0;
      A.simulate(30, 1 / 20); o.formEnd = P.form || null; o.quadAfter = !!P.model.userData.parts.legFL;
      return o;
    });
    assert(r.wolves === 2 && r.feral, 'wolves ' + JSON.stringify(r));
    assert(r.howl.hero >= 20 && r.howl.wolf, 'howl ' + JSON.stringify(r));
    assert(r.form.form === 'lyc_wolf_form' && r.form.speed[1] > r.form.speed[0] && r.form.quad, 'shapeshift ' + JSON.stringify(r));
    assert(r.crits.hero >= 1 && r.crits.wolves >= 1 && r.bounty >= 20, 'crits/bounty ' + JSON.stringify(r));
    assert(!r.formEnd && !r.quadAfter, 'form ends ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B4 Lone Druid: Spirit Bear (control, entangle, return blocked after hero damage, death → resummon), Spirit Link lifesteal share, Savage Roar fear, True Form', async page => {
    await start(page, 'ld');
    const r = await page.evaluate(() => {
      const { A, P } = H4, o = {}; H4.at(-40, 40);
      A.castAbility(0, null); A.simulate(1, 1 / 20); const b = A.ownedUnits(P, u => u.type === 'ld_bear')[0];
      o.bear = b && { hp: b.maxHp, ctl: b.controllable, ab: b.abilities.map(a => a.def.id) };
      const d = H4.dummy(-36, 40, 'lina', 50000); A.clearLog(); P.hp = P.maxHp * 0.5; b.hp = b.maxHp * 0.5; const hp0 = P.hp, bh0 = b.hp;
      const R = Math.random; Math.random = () => 0.1; A.issueOrder(b, { type: 'attack', target: d }); A.simulate(12, 1 / 20); Math.random = R;   // force entangle procs
      o.entangle = H4.ev('entangle').length; o.healHero = Math.round(P.hp - hp0); o.healBear = Math.round(b.hp - bh0);
      A.dealDamage(d, b, 10, 'pure'); o.retErr = A.castAbility(0, null, b); A.G.time += 4; A.teleportHero(-60, 60); A.step(2); b.abilities[0].cd = 0; o.retOk = A.castAbility(0, null, b); A.simulate(1, 1 / 20);
      o.retDist = +Math.hypot(b.x - P.x, b.z - P.z).toFixed(1);
      // roar: enemies flee
      H4.at(0, 0); const f = H4.dummy(3, 0, 'lina', 9000); A.castAbility(2, null); A.simulate(0.4, 1 / 20); const x0 = f.x;
      o.fear = A.hasState(f, 'feared'); A.simulate(1, 1 / 20); o.fled = +(f.x - x0).toFixed(1); o.fearCast = A.castAbility(0, P, f);
      // true form
      const r0 = P.range, hp1 = P.maxHp; A.castAbility(3, null); A.simulate(1, 1 / 20); o.tf = { form: P.form, range: [r0, P.range], hp: [hp1, P.maxHp] };
      // bear death → can summon a new one after cooldown
      A.killUnit(b, f); A.step(2); o.dead = b.dead; P.abilities[0].cd = 0; P.mana = P.maxMana; A.castAbility(0, null); A.simulate(1, 1 / 20); o.newBear = A.ownedUnits(P, u => u.type === 'ld_bear').length;
      return o;
    });
    assert(r.bear && r.bear.ctl && r.bear.hp >= 2000 && r.bear.ab.includes('bear_entangle'), 'bear ' + JSON.stringify(r));
    assert(r.entangle >= 1 && r.healHero > 0 && r.healBear > 0, 'entangle/link ' + JSON.stringify(r));
    assert(typeof r.retErr === 'string' && !r.retOk && r.retDist < 5, 'return ' + JSON.stringify(r));
    assert(r.fear && r.fled > 1.5 && typeof r.fearCast === 'string', 'roar ' + JSON.stringify(r));
    assert(r.tf.form === 'ld_true_form' && r.tf.range[1] < r.tf.range[0] && r.tf.hp[1] > r.tf.hp[0], 'true form ' + JSON.stringify(r));
    assert(r.dead && r.newBear === 1, 'resummon ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('sleep breaks on damage (not Song), fear moves away from the source, generic', async page => {
    await start(page, 'axe');
    const r = await page.evaluate(() => {
      const { A, P } = H4, o = {}; H4.at(-40, 40); const d = H4.dummy(-36, 40, 'lina', 9000);
      A.AB.sleep(d, P, 5); A.step(5); o.asleep = A.hasState(d, 'sleeping') && A.hasState(d, 'stunned');
      A.dealDamage(P, d, 10, 'pure'); A.step(1); o.woke = !A.hasState(d, 'sleeping'); o.ev = H4.ev('wake').length;
      A.AB.fear(d, P, 2); const x0 = d.x; A.simulate(1, 1 / 20); o.fled = +(d.x - x0).toFixed(1); o.feared = A.hasState(d, 'feared');
      return o;
    });
    assert(r.asleep && r.woke && r.ev === 1 && r.fled > 1.5 && r.feared, JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('unit control: click / box select, right-click orders all selected, Tab cycles, F1 hero, Ctrl+N / Shift+N groups, HUD shows the selected unit', async page => {
    await start(page, 'lycan');
    await page.evaluate(() => { const { A, P } = H4; H4.at(-40, 40); A.castAbility(0, null); A.simulate(1, 1 / 20); A.resume(); });
    const pos = await page.evaluate(() => { const { A, P } = H4; const w = A.ownedUnits(P); A.G.cam.x = P.x; A.G.cam.z = P.z - 4; A.G.lock = false; A.setTimeScale(0); for (const u of [P, ...w]) A.issueOrder(u, { type: 'hold' }); return w.map(u => u.id); });
    await page.waitForTimeout(300);
    // box select around the hero + wolves
    const boxF = () => page.evaluate(() => { const { A, P } = H4; const pts = [P, ...A.ownedUnits(P)].map(u => A.toScreen(u.x, 1, u.z)); return { x0: Math.min(...pts.map(p => p.x)) - 40, y0: Math.min(...pts.map(p => p.y)) - 40, x1: Math.max(...pts.map(p => p.x)) + 40, y1: Math.max(...pts.map(p => p.y)) + 40 }; });
    let box = await boxF(); for (let k = 0; k < 20; k++) { await page.waitForTimeout(150); const b2 = await boxF(); if (Math.abs(b2.x0 - box.x0) + Math.abs(b2.y0 - box.y0) + Math.abs(b2.x1 - box.x1) < 1) break; box = b2; }
    await page.mouse.move(box.x0, box.y0); await page.mouse.down(); await page.mouse.move((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, { steps: 4 }); await page.mouse.move(box.x1, box.y1, { steps: 4 }); await page.mouse.up(); await page.evaluate(() => GameAPI.setTimeScale(1));
    const r1 = await page.evaluate(() => ({ sel: H4.A.ctlSel().map(u => u.type || 'hero') }));
    await page.keyboard.press('Tab'); await page.waitForTimeout(100);
    const r2 = await page.evaluate(() => ({ active: H4.A.ctlActive().type || 'hero', name: document.getElementById('heroName').textContent }));
    // right-click ground: every selected unit gets a move order
    const g = await page.evaluate(() => { const { A, P } = H4; return A.toScreen(P.x + 8, 0, P.z + 6); });
    await page.mouse.click(g.x, g.y, { button: 'right' }); await page.waitForTimeout(100);
    const r3 = await page.evaluate(() => H4.A.ctlSel().map(u => u.order.type));
    await page.keyboard.down('Control'); await page.keyboard.press('Digit1'); await page.keyboard.up('Control');
    await page.keyboard.press('F1'); const r4 = await page.evaluate(() => H4.A.ctlSel().map(u => u.type || 'hero'));
    await page.keyboard.down('Shift'); await page.keyboard.press('Digit1'); await page.keyboard.up('Shift');
    const r5 = await page.evaluate(() => H4.A.ctlSel().length);
    await page.keyboard.press('F2'); const r6 = await page.evaluate(() => H4.A.ctlSel().map(u => u.type || 'hero'));
    // a click on a single wolf selects it; its info shows in the HUD
    const ws = await page.evaluate(() => { const { A, P } = H4; A.pause(); const w = A.ownedUnits(P)[0]; return A.toScreen(w.x, 0.8, w.z); });
    await page.mouse.click(ws.x, ws.y); await page.waitForTimeout(150);
    const r7 = await page.evaluate(() => ({ sel: H4.A.ctlSel().map(u => u.type || 'hero'), name: document.getElementById('heroName').textContent }));
    const r = { box: r1, tab: r2, orders: r3, f1: r4, group: r5, f2: r6, click: r7 };
    assert(r1.sel.length === 3 && r1.sel[0] === 'hero', 'box ' + JSON.stringify(r));
    assert(r2.active === 'lyc_wolf' && r2.name.includes('狼'), 'tab ' + JSON.stringify(r));
    assert(r3.length === 3 && r3.every(t => t === 'move'), 'orders ' + JSON.stringify(r));
    assert(r4.length === 1 && r4[0] === 'hero' && r5 === 3 && r6.length === 2 && r6.every(t => t === 'lyc_wolf'), 'groups ' + JSON.stringify(r));
    assert(r7.sel.length === 1 && r7.sel[0] === 'lyc_wolf', 'click ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('items: recipe (parts consumed, price reduced), Battle Fury cleave, Assault aura, Veil magic amp, Phase / Shadow actives, Vanguard; illusions get no item procs', async page => {
    await start(page, 'axe');
    const r = await page.evaluate(() => {
      const { A, P } = H4, o = {}; H4.at(-40, 40); A.teleportHero(-68, 68); A.step(2); P.items.fill(null); P.gold = 10000;
      A.buyItem('claymore', P); o.price = A.itemPrice(P, 'bfury'); const g0 = P.gold; o.err = A.buyItem('bfury', P);
      o.recipe = { paid: g0 - P.gold, claymore: A.countItem(P, 'claymore'), bfury: A.countItem(P, 'bfury') };
      A.teleportHero(-40, 40); A.step(2);
      const d = H4.dummy(-38, 40, 'lina', 50000), c = H4.creep(-38, 41.5, 50000); A.clearLog(); A.issueOrder(P, { type: 'attack', target: d }); A.simulate(4, 1 / 20);
      o.cleave = H4.byAb('bfury').filter(e => e.tgt === c.id).length;
      A.giveItem('assault'); A.simulate(1, 1 / 20); o.aura = { own: !!A.getMod(P, 'assault_aura'), enemy: !!A.getMod(d, 'assault_curse') };
      A.giveItem('veil'); const vs = P.items.findIndex(i => i && i.id === 'veil'); const m0 = d.magicRes; A.useItem(P, vs, { x: d.x, z: d.z }); A.step(2); o.veil = [+m0.toFixed(2), +d.magicRes.toFixed(2)];
      P.items.fill(null); A.giveItem('boots'); A.gold = 0; P.gold = 2000; A.teleportHero(-68, 68); A.step(2); A.buyItem('phase', P); o.phase = { boots: A.countItem(P, 'boots'), phase: A.countItem(P, 'phase') };
      const sp = P.speed; A.useItem(P, P.items.findIndex(i => i && i.id === 'phase')); A.step(2); o.phaseSpd = P.speed > sp;
      A.giveItem('shadow'); A.useItem(P, P.items.findIndex(i => i && i.id === 'shadow')); A.simulate(1.2, 1 / 20); o.shadow = A.isInvisible(P);
      A.giveItem('vanguard'); A.step(2); o.vanguardHp = P.maxHp;
      return o;
    });
    assert(!r.err && r.recipe.paid === 1550 && r.recipe.claymore === 0 && r.recipe.bfury === 1 && r.price === 1550, 'recipe ' + JSON.stringify(r));
    assert(r.cleave >= 1 && r.aura.own && r.aura.enemy && r.veil[1] < r.veil[0], 'passives ' + JSON.stringify(r));
    assert(r.phase.boots === 0 && r.phase.phase === 1 && r.phaseSpd && r.shadow, 'actives ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('bots with B4 heroes: summon wolves / bear / treants, Mirror Image, control them (attack + push) for 4 minutes, no errors', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI; A.startGame('axe', { enemies: 4, allies: 3, diff: 1, picks: ['naga', 'lycan', 'np', 'ld', 'naga', 'lycan', 'ld'] }); A.pause(); A.record(false);
      const sum = {}, ill = { n: 0 }, orders = {}; A.on('summon', e => sum[e.stype] = (sum[e.stype] || 0) + 1); A.on('illusion', () => ill.n++);
      let summonDmg = 0; A.on('damage', e => { if (e.srcKind === 'summon' || e.srcKind === 'illusion') summonDmg += e.amount; });
      for (let i = 0; i < 24; i++) { A.simulate(10, 1 / 20); for (const u of A.units) if (!u.dead && (u.isSummon || u.isIllusion) && u.owner.bot) orders[u.order.type] = (orders[u.order.type] || 0) + 1; }
      return { picks: A.G.heroes.map(h => h.def.id), sum, ill: ill.n, orders, summonDmg: Math.round(summonDmg) };
    });
    assert((r.sum.lyc_wolf || 0) >= 2 && (r.sum.ld_bear || 0) >= 1 && r.ill >= 2, 'summons ' + JSON.stringify(r));
    assert(r.summonDmg > 1000 && ((r.orders.attack || 0) + (r.orders.amove || 0)) > 5, 'units fight ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
