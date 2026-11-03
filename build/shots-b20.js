// build/shots-b20.js — Scepter/Shard gift: ally receive FX + HELP line.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async (w = 1600, h = 900) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL);
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 41, null, { timeout: 60000 });
    await p.waitForTimeout(250);
    return p;
  };
  const SETUP = (hero) => {
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(15, 1 / 20); A.godMode(true); A.setLevel(16);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier) A.killUnit(u, null); A.step(4);
    A.teleportHero(-20, -20); A.issueOrder(A.G.player, { type: 'hold' }); A.step(2);
    document.getElementById('msgs').innerHTML = '';
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); };
  };

  let p = await page();
  info.gift = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('cm');
    const A = GameAPI, P = A.G.player;
    P.items = P.items.map(() => null); A.giveItem('scepter', P);
    const ally = A.spawnUnit('hero', P.team, -16, -20, { heroId: 'sven' });
    ally.order = { type: 'hold' }; ally.items = ally.items.map(() => null);
    A.giftItem(P, 0, ally); A.step(2);
    CAM(-18, -20, 34);
    return { allyOn: !!ally.scepter, allyItem: ally.items.filter(Boolean).map(i => i.id), tip: (A.ITEM_DEFS.scepter.desc || '').includes('赠予') };
  }, SETUP.toString());
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-77-scepter-gift.png') });
  await p.close();

  p = await page();
  info.help = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    document.getElementById('help').classList.remove('hidden');
    const t = document.getElementById('help').innerText || '';
    return { hasGift: t.includes('神杖') && t.includes('赠予'), hasT: t.includes('T') };
  }, SETUP.toString());
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT('screenshot-78-gift-help.png') });
  await p.close();

  await b.close();
  if (errs.length) console.error('SHOT_ERR', errs.slice(0, 8));
  console.log(JSON.stringify({ info, errs: errs.length }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
