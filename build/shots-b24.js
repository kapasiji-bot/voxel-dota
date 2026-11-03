// build/shots-b24.js — shared ally courier control screenshots (87–89).
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async () => {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL);
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card').length >= 41, null, { timeout: 60000 });
    return p;
  };
  const SETUP = (hero) => {
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.godMode(true); A.setLevel(8); A.revealAll(true);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
    A.step(4);
    if (!A.G.player.courier) A.spawnCourier(A.G.player);
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); };
  };

  let p = await page();
  info.ally = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-45, -45);
    const ally = A.spawnUnit('hero', P.team, -42, -48, { heroId: 'cm' }); ally.order = { type: 'hold' };
    const c = A.spawnCourier(ally); c.x = -40; c.z = -42; c.corder = { type: 'idle' };
    ally.stash = [{ id: 'boots', n: 1 }];
    A.courierOrder(ally, 'deliver', P);
    A.selectUnits([c]); A.COURIER_UI && (A.COURIER_UI.focus = ally.id);
    A.updateCourierHUD();
    CAM(-42, -44, 34);
    return { type: c.corder.type, hud: document.getElementById('courierSt').textContent, by: A.getLog('courierOrder').slice(-1)[0] };
  }, SETUP.toString());
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-87-ally-courier-order.png') });
  await p.close();

  p = await page();
  info.cycle = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-50, -50);
    const ally = A.spawnUnit('hero', P.team, -47, -52, { heroId: 'cm' }); ally.order = { type: 'hold' };
    A.spawnCourier(ally); A.spawnCourier(P);
    P.courier.x = -52; P.courier.z = -48;
    ally.courier.x = -46; ally.courier.z = -50;
    A.cycleTeamCourierFocus(); A.updateCourierHUD();
    CAM(-49, -50, 32);
    return { focus: A.focusedCourierOwner().def.name, hud: document.getElementById('courierSt').textContent, sel: A.ctlActive() && A.ctlActive().isCourier };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-88-courier-focus-cycle.png') });
  await p.close();

  p = await page();
  info.secret = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI, P = A.G.player;
    const ally = A.spawnUnit('hero', P.team, -30, -30, { heroId: 'cm' }); ally.order = { type: 'hold' };
    const c = A.spawnCourier(ally);
    A.courierOrder(ally, 'secret', P);
    const shop = A.JUNGLE.shops.find(s => s.type === 'secret' && s.side === P.team);
    c.x = shop.x + 1.5; c.z = shop.z + 1.5; A.simulate(0.5);
    A.selectUnits([c]); A.updateCourierHUD();
    CAM(shop.x, shop.z, 36);
    return { type: c.corder.type, at: A.nearShopSite(c, 'secret'), hud: document.getElementById('courierSt').textContent };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-89-ally-courier-secret.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.length }, null, 2));
  if (errs.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
