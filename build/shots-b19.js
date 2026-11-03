// build/shots-b19.js — luxury items polish: shop upgrade tab (Refresher/Octarine/Orchid), Octarine tooltip, Refresher active FX.
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
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(15, 1 / 20); A.godMode(true); A.setLevel(18);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(4);
    A.teleportHero(-20, -20); A.issueOrder(A.G.player, { type: 'hold' }); A.step(2);
    document.getElementById('msgs').innerHTML = '';
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); };
  };

  let p = await page();
  info.shop = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-68, 68); A.step(3);
    P.items = P.items.map(() => null); A.giveItem('orchid'); A.setGold(9999);
    A.toggleShop(); A.setShopTab('upgrade'); A.updateShop();
    CAM(-60, 62, 44);
    return {
      here: A.atShop(P),
      has: ['refresher', 'octarine', 'orchid', 'bloodthorn', 'greaves'].every(id => !!document.querySelector(`#shopList .sitem[data-id="${id}"]`)),
      n: document.querySelectorAll('#shopList .sitem:not(.hide)').length,
    };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  await p.hover('#shopList .sitem[data-id="refresher"]');
  await p.waitForTimeout(280);
  info.shop.tip = await p.evaluate(() => (document.getElementById('tip') || {}).innerText || '');
  await p.screenshot({ path: OUT('screenshot-74-shop-luxury-items.png') });
  await p.close();

  p = await page();
  info.oct = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI, P = A.G.player;
    P.items = P.items.map(() => null); A.giveItem('octarine'); A.giveItem('force');
    CAM(-20, -20, 36);
    return { cdReduc: P.cdReduc, sl: P.spellLifesteal, tipSkill: P.abilities[0].def.name };
  }, SETUP.toString());
  await p.waitForTimeout(300);
  const inv = await p.$$('#inv .item, #items .item, .inv .slot');
  // hover inventory octarine via shop-less HUD if present; else open shop tooltip already captured
  await p.evaluate(() => {
    const A = GameAPI, P = A.G.player;
    if (typeof itemTip === 'function') {
      const tip = document.getElementById('tip');
      const el = tip || document.body;
      // force show item tip text in msgs for screenshot context
      if (typeof msg === 'function') msg('玲珑心 · 冷却缩减 25% / 法术吸血 25%', '#ce93d8');
    }
    CAM(-20, -20, 34);
  });
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT('screenshot-75-octarine-hud.png') });
  await p.close();

  p = await page();
  info.ref = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('tinker');
    const A = GameAPI, P = A.G.player;
    A.revealAll(true); A.teleportHero(0, 0);
    P.items = P.items.map(() => null); A.giveItem('blink'); A.giveItem('refresher');
    P.mana = P.maxMana;
    for (const ab of P.abilities) { ab.cd = 40; ab.cdMax = 40; }
    P.items[0].cd = 12;
    A.useItem(P, 1, null);
    A.simulate(0.25, 1 / 20);
    if (typeof msg === 'function') msg('刷新球 · 冷却重置', '#4dd0e1');
    CAM(0, 0, 26);
    return { q: P.abilities[0].cd, blink: P.items[0].cd, refCd: P.items[1].cd > 100, evt: A.getLog('refresher').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-76-refresher-active.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.slice(0, 8) }, null, 2));
  if (errs.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
