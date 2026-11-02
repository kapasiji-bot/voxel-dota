// build/shots-b12.js — B12 mid-game polish screenshots (1280×720):
//   screenshot-48-buyback-death.png  (death overlay with buyback ready)
//   screenshot-49-glyph-hud.png      (Glyph active — buildings glowing, HUD button cooling)
//   screenshot-50-smoke-shop.png     (Smoke + new mid-game items in the shop 升级/消耗品)
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL);
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 21, null, { timeout: 60000 });
    await p.waitForTimeout(300); return p;
  };
  const SETUP = (hero) => {
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(15, 1 / 20);
    A.godMode(true); A.setLevel(16); A.revealAll(true);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); A.step(4);
    document.getElementById('msgs').innerHTML = '';
    window.CAM = (x, z, dist) => {
      for (const id of ['msgs', 'announce']) { const e = document.getElementById(id); if (e) { e.innerHTML = ''; e.className = ''; } }
      A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume();
    };
  };

  // 1) Buyback death UI — player dead near mid, enough gold, button ready
  let p = await page();
  info.bb = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('axe');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-5, -5); A.simulate(90, 1 / 20); A.setLevel(14); A.setGold(5000);
    A.godMode(false); P.hp = 0; A.killUnit(P, null); A.step(3);
    A.updateDeathUI && A.updateDeathUI(P);
    // force death panel visible (hero.js path)
    const death = document.getElementById('death');
    if (death) death.classList.remove('hidden');
    if (typeof updateDeathUI === 'function') updateDeathUI(P);
    CAM(P.x, P.z + 2, 32);
    return {
      dead: P.dead, cost: A.buybackCost(P), ready: A.canBuyback(P),
      ui: document.getElementById('bbStatus').textContent,
      btn: document.getElementById('bbBtn').textContent,
      shown: !death.classList.contains('hidden')
    };
  }, SETUP.toString());
  await p.waitForTimeout(500);
  await p.screenshot({ path: OUT('screenshot-48-buyback-death.png') });
  await p.close();

  // 2) Glyph — mid T1 under "siege", glyph cast, buildings invuln, HUD button on CD
  p = await page();
  info.glyph = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('sven');
    const A = GameAPI;
    const tw = A.units.find(u => u.kind === 'tower' && u.team === 0 && u.lane === 'mid' && (u.tier || 1) === 1) ||
               A.units.find(u => u.kind === 'tower' && u.team === 0 && !u.dead);
    A.teleportHero(tw.x - 4, tw.z - 4);
    const foe = A.spawnUnit('hero', 1, tw.x + 4, tw.z + 4, { heroId: 'lina' });
    foe.order = { type: 'attack', target: tw }; A.step(2);
    A.castGlyph(0);
    CAM(tw.x, tw.z + 1, 28);
    return {
      active: A.glyphActive(0), inv: A.isInvuln(tw),
      btn: document.getElementById('glyphBtn').textContent,
      ready: A.glyphReady(0)
    };
  }, SETUP.toString());
  await p.waitForTimeout(600);
  await p.screenshot({ path: OUT('screenshot-49-glyph-hud.png') });
  await p.close();

  // 3) Smoke + new items shop — at base, shop open on 升级 with desolator/satanic/linken visible; smoke in consumables via give
  p = await page();
  info.shop = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('lina');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-68, 68); A.step(3);
    P.items = P.items.map(() => null);
    A.giveItem('smoke'); A.giveItem('desolator'); A.giveItem('shard'); A.setGold(9999);
    A.toggleShop(); A.setShopTab('upgrade'); A.updateShop();
    CAM(-60, 62, 40);
    const ids = [...document.querySelectorAll('#shopList .sitem')].map(e => e.dataset.id);
    return {
      atShop: A.atShop(P), smoke: !!P.items.find(it => it && it.id === 'smoke'),
      has: ['desolator', 'satanic', 'linken', 'lotus', 'bloodstone', 'shard'].filter(id => ids.includes(id)),
      visible: document.querySelectorAll('#shopList .sitem:not(.hide)').length
    };
  }, SETUP.toString());
  await p.waitForTimeout(350);
  // hover desolator for recipe tip if present
  const deso = await p.$('#shopList .sitem[data-id="desolator"]');
  if (deso) { await deso.hover(); await p.waitForTimeout(250); }
  await p.screenshot({ path: OUT('screenshot-50-smoke-shop.png') });
  await p.close();

  console.log(JSON.stringify(info));
  console.log(errs.length ? 'ERRORS\n' + errs.slice(0, 8).join('\n') : 'no console errors');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
