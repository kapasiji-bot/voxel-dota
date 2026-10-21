// build/shots-b2.js — screenshots for batch B2: hero select (6 heroes) + in-game ability effects. Usage: node build/shots-b2.js
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html');
const OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  const open = async () => { const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); }); p.on('pageerror', e => errors.push(e.message)); await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card').length >= 6); await p.waitForTimeout(500); return p; };
  let p = await open();
  await p.screenshot({ path: OUT('screenshot-5-hero-select-6.png') });
  // freeze visuals between sim steps: timeScale 0 + running loop, so particles/beams stay where the sim left them
  const setup = (hero) => p.evaluate(h => {
    const A = GameAPI; A.startGame(h); A.setTimeScale(0); A.godMode(true); A.setLevel(18);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    A.simulate(1); for (const u of A.units) if (!u.dead && !u.isBuilding && u.team === 1) A.killUnit(u, null); A.simulate(3);
    A.teleportHero(-22, 22); const P = A.G.player; P.facing = Math.PI * 0.75;
    const cs = [[-17, 16], [-15, 18], [-18, 18], [-13, 15], [-16, 13], [-12, 19], [-20, 14]].map(([x, z]) => { const c = A.spawnUnit(x % 2 ? 'melee' : 'ranged', 1, x, z); c.wps = [{ x, z }]; c.wp = 0; c.hp = c.maxHp = 4000; return c; });
    const G = A.G; G.cam.x = P.x + 3; G.cam.z = P.z - 2; G.cam.dist = 34; A.step(2); window._cs = cs; document.getElementById('msgs').innerHTML = ''; return cs.length;
  }, hero);
  await setup('lion');
  await p.evaluate(() => { const A = GameAPI, cs = window._cs; A.castAbility(1, cs[5]); A.step(4); A.castAbility(0, { x: -15, z: 16 }); A.step(20); });
  await p.waitForTimeout(400); await p.screenshot({ path: OUT('screenshot-6-lion-spike-hex.png') });
  await p.close(); p = await open();
  await setup('cm');
  await p.evaluate(() => { const A = GameAPI, cs = window._cs, P = A.G.player; A.castAbility(1, cs[3]); A.step(12); A.teleportHero(-19, 19); A.castAbility(3, null); A.simulate(2.2); });
  await p.waitForTimeout(400); await p.screenshot({ path: OUT('screenshot-7-cm-freezing-field.png') });
  await p.close(); p = await open();
  await setup('zeus');
  await p.evaluate(() => { const A = GameAPI, cs = window._cs; A.castAbility(0, cs[0]); A.step(10); A.castAbility(1, cs[2]); A.step(9); });
  await p.waitForTimeout(300); await p.screenshot({ path: OUT('screenshot-8-zeus-arc.png') });
  await b.close();
  console.log(errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no console errors');
})();
