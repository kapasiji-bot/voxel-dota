// build/shots-b17.js — B17 classic heroes screenshots (1280×720):
//   screenshot-66-select-b17.png       (hero select with 37 heroes)
//   screenshot-67-kunkka-ship.png      (Kunkka Ghost Ship / Torrent)
//   screenshot-68-spectre-haunt.png    (Spectre Haunt)
//   screenshot-69-ember-sleight.png    (Ember Sleight / Remnant)
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async () => {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', e => errs.push('PE:' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('CE:' + m.text()); });
    await p.goto(URL);
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 37, null, { timeout: 60000 });
    await p.waitForTimeout(250); return p;
  };
  const SETUP = (hero) => {
    const A = GameAPI; A.startGame(hero); A.pause(); A.record(true); A.G.nextWave = 1e9; A.simulate(12, 1 / 20);
    A.godMode(true); A.setLevel(18); A.revealAll(true);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); A.step(4);
    document.getElementById('msgs').innerHTML = '';
    window.CAM = (x, z, dist) => {
      for (const id of ['msgs', 'announce']) { const e = document.getElementById(id); if (e) { e.innerHTML = ''; e.className = ''; } }
      A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume();
    };
  };

  // 66) Select
  let p = await page();
  info.select = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')];
    const last = cards[cards.length - 1]; if (last) last.scrollIntoView({ block: 'center' });
    const names = cards.map(c => (c.querySelector('.name') || c).textContent.trim());
    return { n: cards.length, heroes: Object.keys(GameAPI.HERO_DEFS).length,
      has: ['kunkka', 'spectre', 'weaver', 'ember'].every(id => !!GameAPI.HERO_DEFS[id]),
      labels: ['昆卡', '幽鬼', '编织者', '灰烬之灵'].map(n => names.some(t => t.includes(n))) };
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-66-select-b17.png') });
  await p.close();

  // 67) Kunkka Ghost Ship + Torrent
  p = await page();
  info.kunkka = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('kunkka');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-4, 0); P.mana = P.maxMana; P.facing = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const f = A.spawnUnit('hero', 1, 2 + i * 1.5, (i - 1.5) * 1.2, { heroId: 'axe' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp;
    }
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(0, { x: 4, z: 0 });
    for (let i = 0; i < 20; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.castAbility(3, { x: 20, z: 0 });
    for (let i = 0; i < 70; i++) A.step(2);
    if (typeof msg === 'function') msg('昆卡 · 幽灵船', '#4fc3f7');
    CAM(2, 0, 28);
    return { torrent: A.getLog('torrent').length, ship: A.getLog('ghostShip').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-67-kunkka-ship.png') });
  await p.close();

  // 68) Spectre Haunt
  p = await page();
  info.spectre = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('spectre');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 5; i++) {
      const ang = i * 1.256, f = A.spawnUnit('hero', 1, Math.sin(ang) * 6, Math.cos(ang) * 6, { heroId: 'sven' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 6000 } }, f); f.hp = f.maxHp;
    }
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(3, null);
    for (let i = 0; i < 40; i++) A.step(2);
    if (typeof msg === 'function') msg('幽鬼 · 缠绕', '#b39ddb');
    CAM(0, 0, 30);
    return { haunt: A.getLog('haunt').length, illu: (P._haunt || []).filter(u => u && !u.dead).length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-68-spectre-haunt.png') });
  await p.close();

  // 69) Ember Sleight + Remnants
  p = await page();
  info.ember = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('ember');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 4; i++) {
      const ang = i * 1.57, f = A.spawnUnit('hero', 1, Math.sin(ang) * 3.5, Math.cos(ang) * 3.5, { heroId: 'axe' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp;
    }
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(0, null);
    for (let i = 0; i < 20; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.castAbility(2, { x: 0, z: 0 });
    for (let i = 0; i < 40; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P._frCharges = 3;
    A.castAbility(3, { x: 4, z: 2 });
    for (let i = 0; i < 10; i++) A.step(2);
    A.castAbility(3, { x: -3, z: 3 });
    for (let i = 0; i < 10; i++) A.step(2);
    if (typeof msg === 'function') msg('灰烬之灵 · 火之余烬', '#ffab40');
    CAM(0, 0, 26);
    return { chains: A.getLog('searingChains').length, sleight: A.getLog('sleightOfFist').length, rem: A.getLog('fireRemnant').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-69-ember-sleight.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.slice(0, 8) }, null, 2));
  if (errs.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
