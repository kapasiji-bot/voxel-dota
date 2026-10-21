// build/shots-b4.js — screenshots for B4: hero select (14 heroes), Naga illusions + Song, Lycan wolf form + wolves,
// Lone Druid + Spirit Bear, Nature's Prophet Sprout + treants. Output: screenshot-19..23-*.png in the project root.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 14, null, { timeout: 60000 }); await p.waitForTimeout(300); return p; };
  // shared scene setup: hero at an open spot, level 18, all skills, enemies around
  const SETUP = (hero) => { const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(20, 1 / 20); A.godMode(true); A.setLevel(18);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(5);
    A.teleportHero(-20, -20); A.issueOrder(A.G.player, { type: 'hold' }); A.step(2); document.getElementById('msgs').innerHTML = '';
    window.EN = (x, z, id = 'axe') => { const d = A.spawnUnit('hero', 1, x, z, { heroId: id }); d.order = { type: 'hold' }; A.addModifier(d, { id: 'shot_hp', props: { hp: 20000 } }, d); A.step(1); d.hp = d.maxHp; return d; };
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); }; };
  // 1) hero select, 14 heroes
  let p = await page(1600, 900); await p.screenshot({ path: OUT('screenshot-19-select-14.png') }); await p.close();
  // 2) Naga: 3 illusions (own team sees them blue-tinted) + Song of the Siren on enemies
  p = await page(1600, 900);
  info.naga = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('naga'); const A = GameAPI, P = A.G.player;
    const es = [EN(-12, -18, 'axe'), EN(-14, -25, 'lina'), EN(-26, -13, 'sven')];
    A.castAbility(0, null); A.simulate(1, 1 / 20); const il = A.ownedUnits(P, u => u.isIllusion); il.forEach((u, i) => A.issueOrder(u, { type: 'attack', target: es[i] }));
    A.simulate(1.5, 1 / 20); A.castAbility(3, null); A.simulate(1.2, 1 / 20); A.selectUnits([P, ...il]);
    CAM(-19, -17, 34); return { ill: il.length, asleep: es.filter(e => A.hasState(e, 'sleeping')).length }; }, SETUP.toString());
  await p.waitForTimeout(900); await p.screenshot({ path: OUT('screenshot-20-naga-illusions-song.png') }); await p.close();
  // 3) Lycan: Shapeshift wolf form + 2 wolves attacking, Howl
  p = await page(1600, 900);
  info.lycan = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('lycan'); const A = GameAPI, P = A.G.player;
    const e = EN(-15, -20, 'cm'); A.castAbility(0, null); A.simulate(1, 1 / 20); A.castAbility(1, null); A.simulate(0.5, 1 / 20); A.castAbility(3, null); A.simulate(1, 1 / 20);
    const w = A.ownedUnits(P); A.issueOrder(P, { type: 'attack', target: e }); A.simulate(1.2, 1 / 20); w.forEach((u, i) => { A.teleportUnit ? 0 : 0; u.x = e.x + (i ? 1.2 : -0.8); u.z = e.z + (i ? -2.4 : 2.6); A.issueOrder(u, { type: 'attack', target: e }); }); A.simulate(0.6, 1 / 20);
    A.selectUnits([P, ...w]); CAM(-16, -17, 28); return { form: P.form, wolves: w.length }; }, SETUP.toString());
  await p.waitForTimeout(900); await p.screenshot({ path: OUT('screenshot-21-lycan-wolves.png') }); await p.close();
  // 4) Lone Druid + Spirit Bear (selected, HUD shows the bear), entangle on an enemy
  p = await page(1600, 900);
  info.ld = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('ld'); const A = GameAPI, P = A.G.player;
    const e = EN(-15, -21, 'lion'); A.castAbility(0, null); A.simulate(1, 1 / 20); const bear = A.ownedUnits(P)[0];
    const R = Math.random; Math.random = () => 0.1; A.issueOrder(bear, { type: 'attack', target: e }); A.issueOrder(P, { type: 'attack', target: e }); A.simulate(3, 1 / 20); Math.random = R;
    A.selectUnits([bear]); CAM(-18, -18, 24); return { bear: !!bear, rooted: A.hasState(e, 'rooted') }; }, SETUP.toString());
  await p.waitForTimeout(900); await p.screenshot({ path: OUT('screenshot-22-druid-bear.png') }); await p.close();
  // 5) Nature's Prophet: Sprout ring trapping an enemy + treants from Nature's Call
  p = await page(1600, 900);
  info.np = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('np'); const A = GameAPI, P = A.G.player;
    const t = A.treesNear(P.x, P.z, 30)[0]; A.teleportHero(t.x + 4, t.z + 4); A.step(2);
    A.castAbility(2, { x: t.x, z: t.z }); A.simulate(1, 1 / 20);
    const e = EN(P.x + 9, P.z - 3, 'puck'); A.castAbility(0, { x: e.x, z: e.z }); A.simulate(1.2, 1 / 20);
    const ts = A.ownedUnits(P); ts.forEach(u => A.issueOrder(u, { type: 'move', x: e.x - 4 + Math.random() * 2, z: e.z + 3 })); A.simulate(1.2, 1 / 20);
    CAM(P.x + 5, P.z, 30); return { treants: ts.length, sprout: A.TREES.temp.length }; }, SETUP.toString());
  await p.waitForTimeout(1300); await p.screenshot({ path: OUT('screenshot-23-prophet-sprout-treants.png') }); await p.close();
  console.log(JSON.stringify(info)); console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no console errors');
  await b.close();
})();
