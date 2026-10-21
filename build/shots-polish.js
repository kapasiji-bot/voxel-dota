// build/shots-polish.js — screenshots for the polish batch: wards + fog (map and minimap), TP effect, hero select at 1280×720.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card').length >= 6); await p.waitForTimeout(300); return p; };
  // 1) wards: own observers + sentry, an enemy ward revealed by the sentry, fogged surroundings, placement preview circle
  let p = await page(1600, 900);
  info.wards = await p.evaluate(() => {
    const A = GameAPI; A.startGame('cm'); A.pause(); A.G.nextWave = 1e9; A.simulate(40, 1 / 20); A.godMode(true);
    const P = A.G.player; A.teleportHero(-31, 18);
    for (const [x, z] of [[-26, 10], [-40, -30], [-10, 2]]) A.placeWard(P, 'obs', { x, z });
    A.placeWard(P, 'sentry', { x: -35, z: 24 });
    const d = A.spawnUnit('hero', 1, -20, 22, { heroId: 'axe' }); A.placeWard(d, 'obs', { x: -31, z: 27 }); A.killUnit(d, null); d.respawn = 1e9;
    A.giveItem('ward_obs'); A.simulate(1, 1 / 20);
    A.G.cam.x = -29; A.G.cam.z = 19; A.G.cam.dist = 36; A.G.lock = false; A.setTimeScale(0); A.resume();
    document.getElementById('msgs').innerHTML = '';
    return { wards: A.liveWards(0).length + '+' + A.liveWards(1).length };
  });
  await p.waitForTimeout(400);
  await p.mouse.move(980, 330); await p.waitForTimeout(100);
  await p.keyboard.press('1'); await p.mouse.move(990, 335); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT('screenshot-16-wards-fog.png') }); await p.close();
  // 2) TP: player channels home while a Dire hero TPs onto its mid tower in the player's vision
  p = await page(1600, 900);
  info.tp = await p.evaluate(() => {
    const A = GameAPI; A.startGame('sven'); A.pause(); A.G.nextWave = 1e9; A.simulate(40, 1 / 20); A.godMode(true);
    const P = A.G.player, t1 = A.units.find(u => u.kind === 'tower' && u.team === 1 && u.lane === 'mid' && u.tier === 1);
    A.teleportHero(t1.x - 7, t1.z + 6); A.giveItem('tp'); A.useItem(P, P.items.findIndex(i => i && i.id === 'tp'), null);
    const d = A.spawnUnit('hero', 1, 50, -50, { heroId: 'lina' }); d.order = { type: 'hold' }; A.giveItem('tp', d);
    A.useItem(d, d.items.findIndex(i => i && i.id === 'tp'), { x: t1.x - 5, z: t1.z + 5 }); A.simulate(1.6, 1 / 20);
    A.G.cam.x = t1.x - 3; A.G.cam.z = t1.z + 5; A.G.cam.dist = 30; A.G.lock = false; A.setTimeScale(0); A.resume();
    document.getElementById('msgs').innerHTML = ''; return { tps: A.G.tps.map(t => [t.team, Math.round(t.x), Math.round(t.z), A.visAt(0, t.x, t.z)]), p: [Math.round(P.x), Math.round(P.z)], channel: !!P.channel };
  });
  await p.waitForTimeout(900); await p.screenshot({ path: OUT('screenshot-17-tp.png') }); await p.close();
  // 3) hero select at 1280×720 (stat line fix)
  p = await page(1280, 720); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT('screenshot-18-select-fixed.png') }); await p.close();
  console.log(JSON.stringify(info), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors');
  await b.close();
})();
