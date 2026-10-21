// build/tests/b8.js — B8 jungle: neutral camps (minute spawn, respawn when empty, spawn-box block, leash, stacking, bounty to
// the killer's team only), Roshan (pit-only aggro, kill → team gold + Aegis + chat, Aegis revives once and expires, Cheese
// from the 2nd kill, 8–11 min respawn, time scaling), side / secret shops (exclusivity, recipes, courier bag, shop UI tags),
// courier (stash delivery via F3 / HUD, death bounty + respawn keeping the bag), bots (farm camps, team Roshan + Aegis carry).
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H8 = {
      A, P: () => A.G.player,
      camp: id => A.jg().camps.find(c => c.id === id),
      alive: c => c.units.filter(u => !u.dead).length,
      ev: (t, f) => A.getLog(t).filter(f || (() => true)),
      tp(x, z) { A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'stand' }); A.step(1); },   // stand: no auto-attack
      dummy(x, z, team = 1, heroId = 'axe') { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; return h; },
      wipe(c) { for (const u of c.units) if (!u.dead) A.killUnit(u, null); A.step(70); },
    };
  };
  async function start(page, hero = 'axe') {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.G.nextWave = 1e9; A.godMode(true); A.revealAll(true); return 1; });
  }

  test('B8 neutral camps: spawn at 1:00, respawn only when empty, blocked by a unit in the box, leash home, stacking, bounty to killer team', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const { A, camp, alive, ev, tp, dummy, wipe } = H8, P = H8.P(), o = {};
      A.simulate(59); o.before = A.jg().camps.map(alive).reduce((a, b) => a + b, 0);
      A.simulate(2); o.after = A.jg().camps.map(c => alive(c)); o.kinds = [...new Set(A.units.filter(u => u.isNeutral && !u.isRoshan).map(u => u.nt))].length;
      // respawn when empty (only that camp)
      const c0 = camp('r0'); wipe(c0); A.campNow(); o.respawn = { c0: alive(c0), spawns: c0.spawns, other: camp('r1').spawns };
      // block: hero standing in the spawn box
      const c1 = camp('r1'); wipe(c1); tp(c1.x, c1.z); A.clearLog(); A.campNow(); o.block = { alive: alive(c1), ev: ev('campBlocked', e => e.camp === 'r1').length };
      tp(c1.x + 10, c1.z); A.campNow(); o.unblocked = alive(c1);
      // leash: aggro the centaur camp, run far away → they walk home and heal up
      const c2 = camp('r2'), cu = c2.units.filter(u => !u.dead); tp(c2.x + 3, c2.z);
      A.dealDamage(P, cu[0], 300, 'pure'); A.step(2); o.aggro = cu.filter(u => u.aggro === P).length;
      tp(c2.x + 26, c2.z); A.simulate(9);
      o.leash = { home: cu.map(u => +Math.hypot(u.x - u.hx, u.z - u.hz).toFixed(1)), full: cu.every(u => u.hp >= u.maxHp - 1), ev: ev('neutralLeash').length };
      // stacking: pull the small camp out of its box at the minute mark → a second group spawns
      const c3 = camp('r0'); tp(c3.x + 2, c3.z); A.dealDamage(P, c3.units.find(u => !u.dead), 1, 'pure'); A.step(3);
      tp(c3.x + 9, c3.z); A.simulate(1.5); o.out = c3.units.filter(u => !u.dead && Math.hypot(u.x - c3.x, u.z - c3.z) < A.CAMP_BOX).length;
      A.campNow(); o.stack = alive(c3);
      // bounty: killer gets gold + lh, XP only for the killer's team (enemy hero standing next to it gets none)
      tp(-20, -20); A.simulate(10); const n = c3.units.find(u => !u.dead); tp(n.x + 2, n.z); const foe = dummy(n.x + 1, n.z + 1); A.step(1);
      const g0 = P.gold, x0 = P.xp, fx = foe.xp, lh0 = P.lh; A.clearLog(); A.killUnit(n, P);
      o.bounty = { gold: P.gold - g0, def: n.gold, xp: +(P.xp - x0).toFixed(1), foeXp: foe.xp - fx, lh: P.lh - lh0, ev: ev('neutralKill').length };
      return o;
    });
    assert(r.before === 0 && r.after.every(n => n === 3) && r.after.length === 8 && r.kinds === 12, 'spawn ' + JSON.stringify(r));
    assert(r.respawn.c0 === 3 && r.respawn.spawns === 2 && r.respawn.other === 1, 'respawn ' + JSON.stringify(r.respawn));
    assert(r.block.alive === 0 && r.block.ev === 1 && r.unblocked === 3, 'block ' + JSON.stringify(r));
    assert(r.aggro === 3 && r.leash.home.every(d => d < 1.5) && r.leash.full && r.leash.ev >= 3, 'leash ' + JSON.stringify(r));
    assert(r.out === 0 && r.stack === 6, 'stack ' + JSON.stringify(r));
    assert(r.bounty.gold === r.bounty.def && r.bounty.xp > 0 && r.bounty.foeXp === 0 && r.bounty.lh === 1 && r.bounty.ev === 1, 'bounty ' + JSON.stringify(r.bounty));
    return `camps=8×3 kinds=${r.kinds} stack=${r.stack} leash=${r.leash.home} bounty=${JSON.stringify(r.bounty)}`;
  });

  test('B8 Roshan: pit-only aggro, kill → team gold + Aegis + chat, Aegis revives once then expires, Cheese on 2nd kill, 8–11 min respawn, scaling', async page => {
    await start(page);
    const r = await page.evaluate(() => {
      const { A, ev, tp, dummy } = H8, P = H8.P(), o = {}, PIT = A.PIT, R = () => A.rosh().unit;
      A.step(1); o.spawn = !!R() && R().maxHp; A.setLevel(18);
      tp(PIT.x - 11, PIT.z - 11); A.clearLog(); A.simulate(3); o.outside = { aggro: !!R().aggro, hits: ev('damage', e => e.src === R().id).length };
      tp(PIT.x + 1.5, PIT.z + 1.5); A.simulate(4); o.inside = ev('damage', e => e.src === R().id && e.tgt === P.id).length;
      const ally = dummy(-60, 60, 0, 'lina'), g0 = P.gold, ga = ally.gold; A.clearLog();
      const rx = R().x, rz = R().z; A.killUnit(R(), P);
      o.kill = { k: A.rosh().kills, me: P.gold - g0, ally: ally.gold - ga, ev: ev('roshanKill').length, drops: A.drops.map(d => d.item), feed: [...document.querySelectorAll('#killfeed .kf')].map(d => d.textContent).join('|'),
        respawnIn: A.rosh().respawnAt - A.G.time };
      // pick up the Aegis (pickup order), then die twice: the first death reincarnates on the spot, the second is real
      A.issueOrder(P, { type: 'pickup', drop: A.drops[0] }); A.simulate(3);
      o.pick = { has: A.countItem(P, 'aegis'), feed: [...document.querySelectorAll('#killfeed .kf')].map(d => d.textContent).join('|') };
      A.godMode(false); const killer = dummy(P.x + 2, P.z, 1); const px = P.x, pz = P.z; A.clearLog();
      A.killUnit(P, killer); o.d1 = { dead: P.dead, deaths: P.deaths, heroKill: ev('heroKill').length, aegis: A.countItem(P, 'aegis'), used: ev('aegisUsed').length };
      A.simulate(5.3); o.revive = { dead: P.dead, d: +Math.hypot(P.x - px, P.z - pz).toFixed(1), hp: P.hp === P.maxHp, ev: ev('reincarnate').length };
      A.killUnit(P, killer); o.d2 = { dead: P.dead, deaths: P.deaths, heroKill: ev('heroKill').length };
      A.simulate(P.respawn + 1); A.godMode(true);
      // 2nd kill drops Cheese too; Aegis expiry after 5 minutes
      A.rosh().respawnAt = A.G.time; A.step(1); o.again = !!R(); A.killUnit(R(), P); o.drops2 = A.drops.map(d => d.item).sort();
      const ag = A.drops.find(d => d.item === 'aegis'); tp(ag.x + 1, ag.z); A.issueOrder(P, { type: 'pickup', drop: ag }); A.simulate(2);
      const ch = A.drops.find(d => d.item === 'cheese'); A.issueOrder(P, { type: 'pickup', drop: ch }); A.simulate(2);
      o.cheese = A.countItem(P, 'cheese'); P.hp = 100; const ci = P.items.findIndex(i => i && i.id === 'cheese'); A.useItem(P, ci); o.cheeseHeal = P.hp; o.cheeseGone = A.countItem(P, 'cheese');
      P.aegisT = A.G.time - 299; A.simulate(1.5); o.expire = { has: A.countItem(P, 'aegis'), ev: ev('aegisExpire').length };
      // scaling: minute 20 → 4000 + 110·20 HP
      A.rosh().respawnAt = A.G.time; A.step(1); A.G.time = 1200.5; A.step(1); o.scale = R().maxHp;
      return o;
    });
    assert(r.spawn === 4000 && !r.outside.aggro && r.outside.hits === 0 && r.inside > 0, 'pit aggro ' + JSON.stringify(r));
    assert(r.kill.k === 1 && r.kill.ally === 180 && r.kill.me === 330 && r.kill.ev === 1 && r.kill.drops.join() === 'aegis' && /肉山/.test(r.kill.feed) && r.kill.respawnIn >= 480 && r.kill.respawnIn <= 660, 'kill ' + JSON.stringify(r.kill));
    assert(r.pick.has === 1 && /不朽之守护/.test(r.pick.feed), 'pickup ' + JSON.stringify(r.pick));
    assert(r.d1.dead && r.d1.deaths === 0 && r.d1.heroKill === 0 && r.d1.aegis === 0 && r.d1.used === 1, 'aegis death ' + JSON.stringify(r.d1));
    assert(!r.revive.dead && r.revive.d < 0.5 && r.revive.hp && r.revive.ev === 1, 'revive ' + JSON.stringify(r.revive));
    assert(r.d2.dead && r.d2.deaths === 1 && r.d2.heroKill === 1, 'second death is real ' + JSON.stringify(r.d2));
    assert(r.again && r.drops2.join() === 'aegis,cheese' && r.cheese === 1 && r.cheeseHeal >= 1800 && r.cheeseGone === 0, 'cheese ' + JSON.stringify(r));
    assert(r.expire.has === 0 && r.expire.ev === 1 && r.scale === 6200, 'expire/scale ' + JSON.stringify(r));
    return `kill gold me=${r.kill.me} ally=${r.kill.ally} respawn=${r.kill.respawnIn.toFixed(0)}s revive d=${r.revive.d} scale=${r.scale}`;
  });

  test('B8 shops: secret items only at a secret shop (hero or courier → bag), side shop direct buys, recipes with secret parts, shop UI tags / hint / tooltip', async page => {
    await start(page);
    const r = await page.evaluate(() => {
      const { A, tp } = H8, P = H8.P(), o = {}, S = id => A.JUNGLE.shops.find(s => s.id === id), clr = () => { P.items = P.items.map(() => null); P.stash = []; };
      A.setGold(99999); A.step(1); clr();
      o.base = { orb: A.buyItem('ultimate_orb'), boots: A.buyItem('boots'), inv: A.countItem(P, 'boots') };
      clr(); tp(-20, -20); o.away = { boots: A.buyItem('boots'), stash: P.stash.length, orb: A.buyItem('ultimate_orb') };
      clr(); const sd = S('side0'); tp(sd.x + 1, sd.z + 1); o.side = { g: A.buyItem('gauntlets'), inv: A.countItem(P, 'gauntlets'), blink: A.buyItem('blink'), stash: P.stash.map(s => s.id).join(), site: A.shopSiteHere(P) };
      clr(); const sc = S('secret0'); tp(sc.x + 1, sc.z + 1); o.secret = { orb: A.buyItem('ultimate_orb'), inv: A.countItem(P, 'ultimate_orb'), boots: A.buyItem('boots'), stash: P.stash.map(s => s.id).join(), site: A.shopSiteHere(P) };
      clr(); o.heartHere = A.buyItem('heart') === null && A.countItem(P, 'heart') === 1;
      clr(); tp(-62, 62); o.heartBase = A.buyItem('heart'); o.needs = A.needsSecret(A.ITEM_DEFS.heart, []);
      // courier at the secret shop: the hero (in base) buys a secret item into the courier bag
      const c = P.courier; A.courierOrder(P, 'secret'); for (let i = 0; i < 40 && !A.nearShopSite(c, 'secret'); i++) A.simulate(1);
      o.courierAt = !!A.nearShopSite(c, 'secret'); o.bagBuy = A.buyItem('talisman'); o.bag = c.bag.map(s => s.id).join(); tp(-20, -20);
      // UI
      A.toggleShop(); A.setShopTab('basic'); A.updateShop();
      const tag = id => { const e = document.querySelector(`.sitem[data-id="${id}"] .loc`); return e ? e.className + ':' + e.textContent : ''; };
      o.ui = { orb: tag('ultimate_orb'), gaunt: tag('gauntlets'), blink: tag('blink'), tip: A.itemTip('reaver', false).includes('神秘商店'), hint: document.getElementById('shopHint').textContent, noAegis: !document.querySelector('.sitem[data-id="aegis"]') };
      return o;
    });
    assert(/神秘商店/.test(r.base.orb) && r.base.boots === null && r.base.inv === 1, 'base ' + JSON.stringify(r.base));
    assert(r.away.boots === null && r.away.stash === 1 && /神秘商店/.test(r.away.orb), 'away ' + JSON.stringify(r.away));
    assert(r.side.g === null && r.side.inv === 1 && r.side.blink === null && r.side.stash === 'blink' && r.side.site === 'side', 'side ' + JSON.stringify(r.side));
    assert(r.secret.orb === null && r.secret.inv === 1 && r.secret.boots === null && r.secret.stash === 'boots' && r.secret.site === 'secret', 'secret ' + JSON.stringify(r.secret));
    assert(r.heartHere && /神秘商店/.test(r.heartBase) && r.needs, 'recipe ' + JSON.stringify(r));
    assert(r.courierAt && r.bagBuy === null && r.bag === 'talisman', 'courier bag ' + JSON.stringify(r));
    assert(/secret:秘/.test(r.ui.orb) && /side:边/.test(r.ui.gaunt) && r.ui.blink === '' && r.ui.tip && /信使在神秘商店/.test(r.ui.hint) && r.ui.noAegis, 'ui ' + JSON.stringify(r.ui));
    await page.evaluate(() => GameAPI.A || 0);
    return `base=${r.base.orb} side=${r.side.site} secret=${r.secret.site} bag=${r.bag} hint="${r.ui.hint.slice(0, 16)}…"`;
  });

  test('B8 courier: F3 delivers the stash to the hero, HUD buttons, killable (bounty), respawns after 60 s keeping its bag', async page => {
    await start(page);
    await page.evaluate(() => { const { A, tp } = H8, P = H8.P(); A.setGold(5000); tp(-20, -20); A.buyItem('boots'); A.buyItem('circlet'); A.clearLog(); A.resume(); });
    await page.keyboard.press('F3');
    await page.evaluate(() => GameAPI.pause());
    const r = await page.evaluate(() => {
      const { A, ev, dummy } = H8, P = H8.P(), c = P.courier, o = { order: c.corder.type };
      const inv = id => P.items.filter(i => i && i.id === id).length; let t = 0; while (t < 40 && !inv('boots')) { A.simulate(1); t++; }
      o.deliver = { t, boots: inv('boots'), circlet: inv('circlet'), stash: P.stash.length, ev: ev('courierDeliver').length };
      A.simulate(20); o.homeAfter = c.corder.type;
      A.courierBagAdd(c, 'mantle'); const foe = dummy(c.x + 2, c.z, 1, 'lina'), g0 = foe.gold; A.killUnit(c, foe);
      o.kill = { dead: c.dead, bounty: foe.gold - g0, ev: ev('courierKill').length };
      A.updateCourierHUD(); o.hud = document.getElementById('courierSt').textContent;
      o.orderDead = A.courierOrder(P, 'deliver');
      A.simulate(61); const c2 = P.courier; o.respawn = { alive: !c2.dead && c2 !== c, bag: c2.bag.map(s => s.id).join() };
      return o;
    });
    await page.click('#cSecret');
    const r2 = await page.evaluate(() => H8.P().courier.corder.type);
    assert(r.order === 'deliver' && r.deliver.boots === 1 && r.deliver.circlet === 1 && r.deliver.stash === 0 && r.deliver.ev === 1 && r.deliver.t < 40, 'deliver ' + JSON.stringify(r));
    assert(r.homeAfter === 'idle' || r.homeAfter === 'home', 'home ' + r.homeAfter);
    assert(r.kill.dead && r.kill.bounty === 125 && r.kill.ev === 1 && /复活中/.test(r.hud) && /复活/.test(r.orderDead), 'kill ' + JSON.stringify(r));
    assert(r.respawn.alive && r.respawn.bag === 'mantle' && r2 === 'secret', 'respawn ' + JSON.stringify(r.respawn) + ' ' + r2);
    return `delivered in ${r.deliver.t}s, bounty ${r.kill.bounty}, respawned with bag=${r.respawn.bag}`;
  });

  test('B8 bots: a carry farms its jungle camps; a level-16 team calls Roshan, kills it and the carry picks up the Aegis', async page => {
    await start(page);
    const r = await page.evaluate(() => {
      const { A, ev } = H8, o = {}, P = H8.P(); A.godMode(false); A.teleportHero(-70, 70); P.respawn = 1e9;
      A.simulate(61);
      const am = A.spawnBot('am', 0, 'top', 1); A.setLevel(8, am); const c = A.JUNGLE.camps.find(c => c.id === 'r0'); am.x = c.x + 6; am.z = c.z; A.clearLog();
      A.G.time = 300; A.simulate(40);
      o.farm = { kills: ev('neutralKill', e => e.killer === am.id).length, mode: ev('botMode', e => e.unit === am.id && e.to === 'farm').length, gold: am.neutralGold || 0 };
      // Roshan: three strong bots (one carry) next to the pit, late game
      const team = [['am', am], ['axe2', null], ['lina', null]].map(([id, h]) => h || A.spawnBot(id === 'axe2' ? 'sven' : id, 0, 'mid', 2));
      const PIT = A.PIT, items = { am: ['bfury', 'daedalus'], sven: ['heart', 'assault'], lina: ['dagon5', 'scythe'] };
      for (const h of team) { A.setLevel(16, h); for (let k = 0; k < 4; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, h); h.items = h.items.map(() => null); for (const it of items[h.def.id]) A.giveItem(it, h);
        h.hp = h.maxHp; h.mana = h.maxMana; h.x = PIT.x + 14 + Math.random(); h.z = PIT.z + 14; h.bot.retreat = false; h.bot.farmCamp = null; h.gold = 0; }
      A.G.time = 1260; A.clearLog();
      let t = 0; while (t < 150 && !ev('pickup', e => e.item === 'aegis').length) { A.simulate(2); t += 2; }
      o.rosh = { call: ev('roshCall', e => e.team === 0).length, hits: ev('damage', e => e.tgt === (A.rosh().log[0] ? -1 : A.rosh().unit && A.rosh().unit.id) ).length, kill: ev('roshanKill', e => e.team === 0).length, t,
        aegis: team.filter(h => A.countItem(h, 'aegis')).map(h => h.def.id).join() };
      return o;
    });
    assert(r.farm.kills >= 2 && r.farm.mode >= 1 && r.farm.gold > 0, 'farm ' + JSON.stringify(r.farm));
    assert(r.rosh.call >= 1 && r.rosh.kill === 1 && r.rosh.aegis === 'am', 'roshan ' + JSON.stringify(r.rosh));
    return `farm kills=${r.farm.kills} gold=${r.farm.gold}; Roshan killed in ${r.rosh.t}s, Aegis → ${r.rosh.aegis}`;
  });

  test('B8 sim: 5v5 bots for 14 min (+ levels boosted) farm neutrals, use couriers / secret shop and attempt Roshan; no errors', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI; A.startGame('axe', { enemies: 5, allies: 4, diff: 1 }); A.pause(); A.setPlayerBot(true, 1, 'mid'); A.record(false);
      const calls = []; A.on('roshCall', e => calls.push(e)); const hits = { n: 0 }; A.on('roshanSlam', () => hits.n++);
      for (let m = 0; m < 12; m++) A.simulate(60, 1 / 20);
      for (const h of A.G.heroes) if (h.level < 13) A.setLevel(13, h);
      A.G.time = Math.max(A.G.time, 1200);
      for (let m = 0; m < 4; m++) A.simulate(60, 1 / 20);
      const J = A.jg(); const secret = A.G.heroes.reduce((a, h) => a + h.items.concat((h.courier ? h.courier.bag : []).map(s => ({ id: s.id }))).filter(x => x && A.ITEM_DEFS[x.id].shop === 'secret' || x && A.needsSecret(A.ITEM_DEFS[x.id], [])).length, 0);
      return { nkills: J.nkills, farm: J.farm, deliveries: A.G.courierDeliveries || 0, calls: calls.length, slams: hits.n, roshKills: A.rosh().kills, secret };
    });
    assert(r.nkills >= 15 && r.deliveries >= 10, 'farm/courier ' + JSON.stringify(r));
    assert(r.calls >= 1 && (r.slams >= 1 || r.roshKills >= 1), 'roshan attempt ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
