// build/shots-b22.js — Roshan 3rd-drop Refresher Shard + ground Aegis deny.
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
  const SETUP = () => {
    const A = GameAPI; A.startGame('lina'); A.pause(); A.G.nextWave = 1e9; A.godMode(true); A.setLevel(16); A.revealAll(true);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
    A.step(4);
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); };
  };

  let p = await page();
  info.drop = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')();
    const A = GameAPI, P = A.G.player, R = A.rosh();
    R.kills = 2; R.respawnAt = 0; if (R.unit && !R.unit.dead) A.killUnit(R.unit, null);
    A.step(1); A.spawnRoshan();
    A.drops.length = 0;
    const u = A.rosh().unit; A.teleportHero(u.x + 2, u.z + 2); u.hp = 1; A.killUnit(u, P); A.step(2);
    const pit = A.PIT; CAM(pit.x, pit.z, 40);
    return { kills: R.kills, drops: A.drops.map(d => d.item).sort() };
  }, SETUP.toString());
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-82-roshan-third-drops.png') });
  await p.close();

  p = await page();
  info.deny = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')();
    const A = GameAPI, P = A.G.player;
    A.record(true); A.clearLog();
    A.teleportHero(-20, -20); A.drops.length = 0;
    const d = A.spawnDrop('aegis', -18, -20); A.step(1);
    CAM(-19, -20, 34);
    const err = A.denyDrop(P, d); A.step(2);
    return { drops: A.drops.length, denied: A.getLog('aegisDeny').length, err, tip: A.ITEM_DEFS.aegis.desc.includes('反补') };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.screenshot({ path: OUT('screenshot-83-aegis-deny.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.length }, null, 2));
  if (errs.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
