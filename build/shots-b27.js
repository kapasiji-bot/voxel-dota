// build/shots-b27.js — indicators / feel screenshots (93–95): AoE, cone, line skillshot.
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
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.godMode(true); A.setLevel(10); A.revealAll(true);
    for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
    A.step(2);
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.updateCamera(0.05); A.setTimeScale(0); A.resume(); };
  };

  let p = await page();
  await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI; A.teleportHero(-20, 0); CAM(-20, 0, 48);
    A.pressSkill(1); // 光击阵 AoE
    const scr = A.toScreen(A.G.player.x + 7, 0, A.G.player.z);
    A.mouse.x = scr.x; A.mouse.y = scr.y; A.mouse.inside = true; A.mouse.overUI = false;
    A.updateIndicators();
  }, SETUP.toString());
  await p.mouse.move(900, 450);
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    const A = GameAPI, scr = A.toScreen(A.G.player.x + 7, 0, A.G.player.z);
    A.mouse.x = scr.x; A.mouse.y = scr.y; A.mouse.overUI = false; A.updateIndicators();
  });
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT('screenshot-93-indicator-aoe.png') });
  await p.close();

  p = await page();
  await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI; A.teleportHero(-20, 0); CAM(-20, 0, 48);
    A.pressSkill(0); // 龙破斩 cone
    const scr = A.toScreen(A.G.player.x + 10, 0, A.G.player.z + 2);
    A.mouse.x = scr.x; A.mouse.y = scr.y; A.mouse.inside = true; A.mouse.overUI = false;
    A.updateIndicators();
  }, SETUP.toString());
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT('screenshot-94-indicator-cone.png') });
  await p.close();

  p = await page();
  await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('mirana');
    const A = GameAPI; A.teleportHero(0, 0); CAM(0, 0, 52);
    A.pressSkill(1); // 神圣之箭 line
    const scr = A.toScreen(12, 0, 2);
    A.mouse.x = scr.x; A.mouse.y = scr.y; A.mouse.inside = true; A.mouse.overUI = false;
    A.updateIndicators();
  }, SETUP.toString());
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT('screenshot-95-indicator-line.png') });
  await p.close();

  await b.close();
  if (errs.length) { console.error('ERRS', errs.slice(0, 8)); process.exit(1); }
  console.log('shots-b27 ok → screenshot-93/94/95');
})().catch(e => { console.error(e); process.exit(1); });
