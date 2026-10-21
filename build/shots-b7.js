// build/shots-b7.js — screenshots for B7 items: the new shop (tabs, search, recipe-tree tooltip), Force Staff + Eul's Scepter in
// action (an ally pushed out, an enemy cycloned mid-air), and an Aghanim's Scepter ability tooltip. Output: screenshot-34..36-*.png.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 21, null, { timeout: 60000 }); await p.waitForTimeout(300); return p; };
  const SETUP = (hero) => { const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(20, 1 / 20); A.godMode(true); A.setLevel(18);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(5);
    A.teleportHero(-20, -20); A.issueOrder(A.G.player, { type: 'hold' }); A.step(2); document.getElementById('msgs').innerHTML = '';
    window.EN = (x, z, id = 'axe', team = 1) => { const d = A.spawnUnit('hero', team, x, z, { heroId: id }); d.order = { type: 'hold' }; A.addModifier(d, { id: 'shot_hp', props: { hp: 20000 } }, d); A.step(1); d.hp = d.maxHp; return d; };
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); }; };
  // 1) shop: 升级 tab with the new items, hovering Dagon 5 → nested recipe tree; the player owns a Dagon 2 + Staff (ticked parts)
  let p = await page(1600, 900);
  info.shop = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('lina'); const A = GameAPI, P = A.G.player; A.teleportHero(-68, 68); A.step(3);
    P.items = P.items.map(() => null); A.giveItem('dagon2'); A.giveItem('tp'); A.setGold(4321); A.toggleShop(); A.setShopTab('upgrade'); A.updateShop();
    CAM(-60, 62, 44); return { here: A.atShop(P), items: document.querySelectorAll('#shopList .sitem:not(.hide)').length }; }, SETUP.toString());
  await p.waitForTimeout(400); await p.hover('#shopList .sitem[data-id="dagon5"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT('screenshot-34-shop-tabs-recipe-tree.png') }); await p.close();
  // 2) Force Staff + Eul's: the player (Crystal Maiden) cyclones an enemy Enigma out of Black Hole and force-staffs an ally out
  p = await page(1600, 900);
  info.force = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('cm'); const A = GameAPI, P = A.G.player; A.revealAll(true);
    const en = EN(-12, -17, 'enigma'); A.setLevel(18, en); for (let k = 0; k < 3; k++) A.learnSkill(3, en); en.mana = en.maxMana;
    const al = EN(-15, -22, 'sven', 0); al.facing = Math.PI * 0.75; A.record(true);
    A.castAbility(3, { x: -14, z: -21 }, en); A.simulate(0.8, 1 / 20);
    P.items = P.items.map(() => null); A.giveItem('euls'); A.giveItem('force'); P.mana = P.maxMana;
    A.useItem(P, 0, en); A.simulate(0.05, 1 / 20); A.useItem(P, 1, al); A.simulate(0.25, 1 / 20);
    CAM(-15, -19, 24); return { cyclone: !!A.getMod(en, 'cyclone'), bhStopped: !en.channel, pushed: A.getLog('forceStaff').length }; }, SETUP.toString());
  await p.waitForTimeout(600); await p.screenshot({ path: OUT('screenshot-35-force-staff-euls.png') }); await p.close();
  // 3) Aghanim's Scepter tooltip on Lina's Laguna Blade (upgrade active: pure damage, longer range)
  p = await page(1600, 900);
  info.tip = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('lina'); const A = GameAPI, P = A.G.player; P.items = P.items.map(() => null); A.giveItem('scepter'); A.giveItem('dagon');
    CAM(-20, -20, 40); return { on: P.scepter, range: P.abilities[3].def.range }; }, SETUP.toString());
  await p.waitForTimeout(400); const sk = await p.$$('#skills .skill'); if (sk[3]) await sk[3].hover(); await p.waitForTimeout(300);
  info.tip.shown = await p.evaluate(() => document.getElementById('tip').innerText.includes('阿哈利姆神杖'));
  await p.screenshot({ path: OUT('screenshot-36-scepter-tooltip.png') }); await p.close();
  console.log(JSON.stringify(info)); console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no console errors');
  await b.close();
})();
