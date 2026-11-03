// build/shots-b25.js — render perf screenshots (90–92): skinned fight, shadow zoom, hero close-up.
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
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.godMode(true); A.setLevel(10); A.revealAll(true);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
    A.step(4);
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.updateCamera(0.05); A.setTimeScale(0); A.resume(); };
  };

  let p = await page();
  info.fight = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0);
    for (let i = 0; i < 14; i++) {
      const a = A.spawnUnit('melee', 0, -4 + (i % 5), -2 + Math.floor(i / 5));
      const e = A.spawnUnit('melee', 1, 2 + (i % 5), -2 + Math.floor(i / 5));
      a.order = { type: 'hold' }; e.order = { type: 'hold' };
    }
    A.simulate(0.8); CAM(0, 0, 34);
    const ri = A.renderInfo();
    return { calls: ri.calls, tris: ri.tris, live: ri.live, skinned: !!(P.model.userData.body && P.model.userData.body.isSkinnedMesh) };
  }, SETUP.toString());
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-90-skinned-teamfight.png') });
  await p.close();

  p = await page();
  info.zoom = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('axe');
    const A = GameAPI;
    A.teleportHero(-20, -20);
    A.G.cam.dist = 52; A.updateCamera(0.05);
    const far = A.sun.shadow.camera.right;
    CAM(-20, -20, 52);
    return { shadowHalf: far, skinned: !!(A.G.player.model.userData.body && A.G.player.model.userData.body.isSkinnedMesh) };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-91-shadow-zoom-out.png') });
  await p.close();

  p = await page();
  info.close = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('pa');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-15, -15); A.issueOrder(P, { type: 'move', x: -10, z: -15 }); A.simulate(0.8);
    A.G.cam.dist = 26; A.updateCamera(0.05);
    CAM(P.x, P.z, 26);
    return { shadowHalf: A.sun.shadow.camera.right, leg: +P.parts.legL.rotation.x.toFixed(3) };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-92-hero-skinned-close.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.length }, null, 2));
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });
