// build/shots-b28.js — creep instancing screenshots (96–97): mid fight with LOD packs.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [];
  const page = async () => {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL);
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card').length >= 41, null, { timeout: 60000 });
    return p;
  };
  const SETUP = (hero) => {
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.godMode(true); A.setLevel(6); A.revealAll(true);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
    A.step(2);
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.updateCamera(0.05); A.setTimeScale(0); A.resume(); };
  };

  let p = await page();
  const info = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI; A.teleportHero(0, 0);
    for (let i = 0; i < 40; i++) {
      const team = i < 20 ? 0 : 1;
      const c = A.spawnUnit(i % 2 ? 'ranged' : 'melee', team, (team ? 5 : -8) + (i % 5) * 1.4, -6 + Math.floor((i % 20) / 5) * 1.6);
      c.order = { type: 'hold' };
    }
    // other-lane packs for instancing
    for (let i = 0; i < 20; i++) {
      const c = A.spawnUnit(i % 2 ? 'ranged' : 'melee', i < 10 ? 0 : 1, -18 + (i % 5) * 2, 28 + Math.floor(i / 5));
      c.order = { type: 'hold' };
    }
    CAM(0, 0, 42); A.CREEP_INST.on = true; A.updateCreepInst();
    const ri = A.renderInfo();
    return { calls: ri.calls, ci: ri.creepInst, live: ri.live };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-96-creep-inst-midfight.png') });
  await p.close();

  p = await page();
  await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('axe');
    const A = GameAPI; A.teleportHero(0, 0);
    const lod = Math.sqrt(A.creepLodR2()), viewR = A.G.cam.dist * 0.78 + 6;
    A.G.cam.dist = 50; A.updateCamera(0.05);
    const rad = (Math.sqrt(A.creepLodR2()) + A.G.cam.dist * 0.78 + 6) * 0.5;
    for (let i = 0; i < 28; i++) {
      const c = A.spawnUnit(i % 2 ? 'ranged' : 'melee', i < 14 ? 0 : 1, -12 + (i % 7) * 3.5, -rad - Math.floor((i % 14) / 7) * 3);
      c.order = { type: 'hold' };
    }
    CAM(0, 0, 50); A.updateCreepInst();
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-97-creep-inst-lodband.png') });
  await p.close();

  await b.close();
  if (errs.length) { console.error('ERRS', errs.slice(0, 6)); process.exit(1); }
  console.log('shots-b28 ok', JSON.stringify(info));
})().catch(e => { console.error(e); process.exit(1); });
