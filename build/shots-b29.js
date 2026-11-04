// build/shots-b29.js — neutral slot HUD + camp drop (98–99).
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
  let p = await page();
  await p.evaluate(() => {
    const A = GameAPI; A.startGame('axe'); A.pause(); A.godMode(true); A.revealAll(true); A.setLevel(10);
    A.G.nextWave = 1e9; A.teleportHero(0, 0);
    A.giveItem('n_swift', A.G.player);
    A.G.cam.x = 0; A.G.cam.z = -4; A.G.cam.dist = 42; A.updateCamera(0.05); A.setTimeScale(0); A.resume();
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-98-neutral-slot.png') });
  await p.close();

  p = await page();
  await p.evaluate(() => {
    const A = GameAPI; A.startGame('lina'); A.pause(); A.godMode(true); A.revealAll(true);
    A.G.time = 20 * 60; A.G.nextWave = 1e9;
    const camp = A.jg().camps.find(c => c.size === 'large');
    A.teleportHero(camp.x, camp.z);
    A.forceNeutralDrop(camp.x + 1.2, camp.z + 0.5, 'n_prism');
    A.forceNeutralDrop(camp.x - 1.0, camp.z + 1.0, 'n_vambrace');
    A.G.cam.x = camp.x; A.G.cam.z = camp.z - 2; A.G.cam.dist = 38; A.updateCamera(0.05); A.setTimeScale(0); A.resume();
  });
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-99-neutral-drop.png') });
  await p.close();
  await b.close();
  if (errs.length) { console.error(errs); process.exit(1); }
  console.log('shots-b29: screenshot-98-neutral-slot.png, screenshot-99-neutral-drop.png');
})().catch(e => { console.error(e); process.exit(1); });
