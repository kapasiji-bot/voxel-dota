// build/shots-b23.js — bot stack + Tinker Rearm + courier snipe screenshots.
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
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.godMode(true); A.setLevel(16); A.revealAll(true);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
    A.step(4);
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); };
  };

  let p = await page();
  info.stack = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('cm');
    const A = GameAPI, P = A.G.player;
    A.record(true); A.clearLog();
    A.jg().nextCamp = 60; A.G.time = 59.5; A.campNow();
    const c = A.jg().camps.find(x => x.id === 'r0');
    A.teleportHero(c.x + 2, c.z); A.dealDamage(P, c.units.find(u => !u.dead), 20, 'pure');
    A.teleportHero(c.x + 9, c.z); A.simulate(1.2);
    A.campNow();
    CAM(c.x + 2, c.z + 2, 36);
    return { alive: c.units.filter(u => !u.dead).length, stack: A.getLog('campSpawn').filter(e => e.camp === c.id && e.stack).length };
  }, SETUP.toString());
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-84-bot-stack-camp.png') });
  await p.close();

  p = await page();
  info.rearm = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('tinker');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-15, -15); A.record(true); A.clearLog();
    P.abilities[0].cd = 10; P.abilities[1].cd = 10; P.mana = P.maxMana;
    A.castAbility(3, null); A.simulate(3.5);
    CAM(P.x, P.z, 32);
    return { rearm: A.getLog('rearm').length, laser: P.abilities[0].cd, ai: !!(P.abilities[3].def.ai && P.abilities[3].def.ai.rearm) };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-85-tinker-rearm.png') });
  await p.close();

  p = await page();
  info.snipe = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI, P = A.G.player;
    const foe = A.spawnUnit('hero', 1, 50, -50, { heroId: 'axe' }); foe.order = { type: 'hold' };
    const c = A.spawnCourier(foe); c.x = 2; c.z = 2; c.corder = { type: 'idle' };
    A.teleportHero(0, 0); A.issueAttack(c); A.step(4);
    CAM(1, 1, 30);
    return { order: P.order.type, courier: !!(P.order.target && P.order.target.isCourier) };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-86-courier-snipe.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.length }, null, 2));
  if (errs.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
