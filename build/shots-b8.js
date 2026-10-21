// build/shots-b8.js — screenshots for B8 jungle content (1280×720): a Roshan fight in the pit, a neutral camp fight (centaur
// stomp), a courier delivering items to its hero, the secret shop with its exclusive items + tooltip. Output: screenshot-37..40-*.png.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async () => { const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 21, null, { timeout: 60000 }); await p.waitForTimeout(300); return p; };
  const SETUP = (hero) => { const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(62, 1 / 20); A.godMode(true); A.setLevel(18);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && (u.kind === 'melee' || u.kind === 'ranged')) A.killUnit(u, null); A.step(5);
    document.getElementById('msgs').innerHTML = '';
    window.BOT = (id, x, z, team = 0) => { const h = A.spawnBot(id, team, 'mid', 2); A.setLevel(16, h); for (let k = 0; k < 4; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, h); h.x = x; h.z = z; h.hp = h.maxHp; h.mana = h.maxMana; return h; };
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); }; };
  // 1) Roshan fight: Lina + Sven + Anti-Mage in the pit, Roshan slamming
  let p = await page();
  info.roshan = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('lina'); const A = GameAPI, P = A.G.player, PIT = A.PIT; A.revealAll(true); A.record(true);
    const sv = BOT('sven', PIT.x + 2, PIT.z - 1), am = BOT('am', PIT.x - 1, PIT.z + 2); A.giveItem('bfury', am); A.giveItem('heart', sv);
    A.teleportHero(PIT.x + 3, PIT.z + 3); A.issueAttack(A.rosh().unit); A.issueOrder(sv, { type: 'attack', target: A.rosh().unit }); A.issueOrder(am, { type: 'attack', target: A.rosh().unit });
    A.simulate(7.6, 1 / 20); A.castAbility(0, { x: PIT.x, z: PIT.z }); A.simulate(0.4, 1 / 20);
    CAM(PIT.x + 1, PIT.z - 3, 30); const R = A.rosh().unit; return { hp: Math.round(R.hp), max: R.maxHp, slams: A.getLog('roshanSlam').length, hits: A.getLog('damage').filter(e => e.src === R.id).length }; }, SETUP.toString());
  await p.waitForTimeout(600); await p.screenshot({ path: OUT('screenshot-37-roshan-fight.png') }); await p.close();
  // 2) neutral camp: Phantom Assassin fighting the Radiant large camp (centaurs) — Khan's stomp ring
  p = await page();
  info.camp = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('pa'); const A = GameAPI, P = A.G.player, c = A.jg().camps.find(c => c.id === 'r2'); A.record(true);
    A.teleportHero(c.x + 2.5, c.z + 1); const cu = c.units.filter(u => !u.dead); A.issueAttack(cu[0]); A.simulate(2.2, 1 / 20);
    const khan = cu.find(u => u.nt === 'centaur_khan'); khan.abCd = 0; A.simulate(0.25, 1 / 20);
    CAM(c.x + 1, c.z - 3, 24); return { alive: cu.filter(u => !u.dead).length, stomp: A.getLog('neutralCast').map(e => e.ab) }; }, SETUP.toString());
  await p.waitForTimeout(600); await p.screenshot({ path: OUT('screenshot-38-neutral-camp.png') }); await p.close();
  // 3) courier delivering: the stash (bought away from base) flies to the hero in the jungle
  p = await page();
  info.courier = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('cm'); const A = GameAPI, P = A.G.player; A.setGold(9000);
    A.teleportHero(-58, -30); A.issueOrder(P, { type: 'stand' }); A.buyItem('blink'); A.buyItem('robe'); A.buyItem('salve'); A.record(true);
    A.courierOrder(P, 'deliver'); const c = P.courier; let t = 0; while (t < 60 && Math.hypot(c.x - P.x, c.z - P.z) > 6.5) { A.simulate(0.25, 1 / 20); t += 0.25; }
    CAM((c.x + P.x) / 2, (c.z + P.z) / 2 + 1, 24); A.updateCourierHUD(); return { t, bag: c.bag.map(s => s.id), hud: document.getElementById('courierSt').textContent }; }, SETUP.toString());
  await p.waitForTimeout(600); await p.screenshot({ path: OUT('screenshot-39-courier-delivering.png') }); await p.close();
  // 4) secret shop UI: hero at the Radiant secret shop, 基础 tab with the 「秘」 items, hovering Ultimate Orb
  p = await page();
  info.shop = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('am'); const A = GameAPI, P = A.G.player, s = A.JUNGLE.shops.find(s => s.id === 'secret0');
    A.teleportHero(s.x + 2, s.z + 3); A.issueOrder(P, { type: 'hold' }); A.step(2); P.items = P.items.map(() => null); A.giveItem('tp'); A.giveItem('blade'); A.setGold(3200);
    A.toggleShop(); A.setShopTab('basic'); A.updateShop(); CAM(s.x + 6, s.z - 2, 30);
    return { site: A.shopSiteHere(P), hint: document.getElementById('shopHint').textContent }; }, SETUP.toString());
  await p.waitForTimeout(400); await p.hover('#shopList .sitem[data-id="ultimate_orb"]'); await p.waitForTimeout(300);
  info.shop.tip = await p.evaluate(() => document.getElementById('tip').innerText.includes('神秘商店'));
  await p.screenshot({ path: OUT('screenshot-40-secret-shop-ui.png') }); await p.close();
  console.log(JSON.stringify(info));
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'no errors');
  await b.close();
})();
