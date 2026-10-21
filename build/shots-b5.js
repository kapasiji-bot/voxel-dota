// build/shots-b5.js — screenshots for B5: hero select (18 heroes), Enigma Black Hole, Earthshaker Fissure + Echo Slam,
// Witch Doctor Death Ward, Lich Chain Frost. Output: screenshot-24..28-*.png in the project root.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 18, null, { timeout: 60000 }); await p.waitForTimeout(300); return p; };
  // shared scene setup: hero at an open spot, level 18, all skills, enemies around
  const SETUP = (hero) => { const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(20, 1 / 20); A.godMode(true); A.setLevel(18);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(5);
    A.teleportHero(-20, -20); A.issueOrder(A.G.player, { type: 'hold' }); A.step(2); document.getElementById('msgs').innerHTML = '';
    window.EN = (x, z, id = 'axe') => { const d = A.spawnUnit('hero', 1, x, z, { heroId: id }); d.order = { type: 'hold' }; A.addModifier(d, { id: 'shot_hp', props: { hp: 20000 } }, d); A.step(1); d.hp = d.maxHp; return d; };
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); }; };
  // 1) hero select, 18 heroes
  let p = await page(1600, 900); await p.screenshot({ path: OUT('screenshot-24-select-18.png') }); await p.close();
  // 2) Enigma Black Hole pulling 4 enemies (mid-channel)
  p = await page(1600, 900);
  info.bh = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('enigma'); const A = GameAPI, P = A.G.player;
    const es = [EN(-10, -17, 'axe'), EN(-14, -23.5, 'lina'), EN(-8.5, -22, 'sven'), EN(-15.5, -17, 'cm')];
    A.castAbility(3, { x: -12, z: -20 }); A.simulate(1.6, 1 / 20); CAM(-14, -19, 30);
    return { chan: !!P.channel, held: es.filter(e => A.hasState(e, 'stunned')).length }; }, SETUP.toString());
  await p.waitForTimeout(900); await p.screenshot({ path: OUT('screenshot-25-enigma-black-hole.png') }); await p.close();
  // 3) Earthshaker: Fissure wall, then Echo Slam among stunned enemies
  p = await page(1600, 900);
  info.es = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('es'); const A = GameAPI, P = A.G.player;
    const es = [EN(-17, -14, 'axe'), EN(-23, -13, 'lina'), EN(-19, -11, 'sven'), EN(-24, -17, 'cm')];
    A.castAbility(0, { x: -20, z: -6 }); A.simulate(0.8, 1 / 20); A.teleportHero(-20.5, -15.5); A.step(1); A.castAbility(3, null); A.simulate(0.45, 1 / 20);
    CAM(-17, -14, 30); return { walls: A.WALLS.list.length, echo: A.getLog ? 0 : 0 }; }, SETUP.toString());
  await p.waitForTimeout(700); await p.screenshot({ path: OUT('screenshot-26-earthshaker-fissure-echo.png') }); await p.close();
  // 4) Witch Doctor Death Ward bouncing between enemies
  p = await page(1600, 900);
  info.wd = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('wd'); const A = GameAPI, P = A.G.player;
    EN(-12, -18, 'axe'); EN(-13, -24, 'lina'); EN(-10, -21, 'sven');
    A.castAbility(3, { x: -17, z: -20 }); A.simulate(2.35, 1 / 20); CAM(-15, -19, 26);
    return { ward: A.units.some(u => u.type === 'wd_ward' && !u.dead), chan: !!P.channel }; }, SETUP.toString());
  await p.waitForTimeout(500); await p.screenshot({ path: OUT('screenshot-27-witch-doctor-death-ward.png') }); await p.close();
  // 5) Lich Chain Frost bouncing between clustered enemies
  p = await page(1600, 900);
  info.lich = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('lich'); const A = GameAPI, P = A.G.player;
    const a = EN(-11, -18, 'axe'); EN(-9, -23, 'lina'); EN(-13, -24, 'sven');
    A.castAbility(3, a); A.simulate(1.7, 1 / 20); CAM(-14, -20, 26);
    return { orbs: 1 }; }, SETUP.toString());
  await p.waitForTimeout(500); await p.screenshot({ path: OUT('screenshot-28-lich-chain-frost.png') }); await p.close();
  console.log(JSON.stringify(info)); console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no console errors');
  await b.close();
})();
