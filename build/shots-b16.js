// build/shots-b16.js — B16 classic heroes screenshots (1280×720):
//   screenshot-62-select-b16.png      (hero select with 33 heroes)
//   screenshot-63-void-chrono.png     (Faceless Void Chronosphere)
//   screenshot-64-mirana-arrow.png    (Mirana Sacred Arrow)
//   screenshot-65-cent-stampede.png   (Centaur Stampede / Stomp)
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
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 33, null, { timeout: 60000 });
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

  // 62) Select
  let p = await page();
  info.select = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')];
    const last = cards[cards.length - 1]; if (last) last.scrollIntoView({ block: 'center' });
    const names = cards.map(c => (c.querySelector('.name') || c).textContent.trim());
    return { n: cards.length, heroes: Object.keys(GameAPI.HERO_DEFS).length,
      has: ['void', 'mirana', 'cent', 'slardar'].every(id => !!GameAPI.HERO_DEFS[id]),
      labels: ['虚空假面', '米拉娜', '半人马酋长', '斯拉达'].map(n => names.some(t => t.includes(n))) };
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-62-select-b16.png') });
  await p.close();

  // 63) Void Chronosphere
  p = await page();
  info.void = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('void');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 5; i++) {
      const ang = i * 1.256, f = A.spawnUnit('hero', 1, Math.sin(ang) * 4, Math.cos(ang) * 4, { heroId: 'axe' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 6000 } }, f); f.hp = f.maxHp;
    }
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(3, { x: 0, z: 0 });
    for (let i = 0; i < 40; i++) A.step(2);
    if (typeof msg === 'function') msg('虚空假面 · 时间结界', '#b39ddb');
    CAM(0, 0, 28);
    return { chrono: A.getLog('chronosphere').length, paused: A.units.filter(u => u.isHero && u.team === 1 && !u.dead && A.getMod(u, 'chrono')).length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-63-void-chrono.png') });
  await p.close();

  // 64) Mirana Arrow
  p = await page();
  info.mirana = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('mirana');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-6, 0); P.mana = P.maxMana; P.facing = Math.PI / 2;
    const f = A.spawnUnit('hero', 1, 4, 0, { heroId: 'axe' });
    f.order = { type: 'hold' }; f.respawn = 1e9;
    A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp;
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(1, { x: 20, z: 0 });
    for (let i = 0; i < 80; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.castAbility(0, null);
    for (let i = 0; i < 30; i++) A.step(2);
    if (typeof msg === 'function') msg('米拉娜 · 神圣之箭', '#90caf9');
    CAM(-1, 0, 28);
    return { arrow: A.getLog('sacredArrow').length, star: A.getLog('starstorm').length, stun: A.hasState(f, 'stunned') };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-64-mirana-arrow.png') });
  await p.close();

  // 65) Centaur Stampede / Stomp
  p = await page();
  info.cent = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('cent');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 4; i++) {
      const ang = i * 1.57, f = A.spawnUnit('hero', 1, Math.sin(ang) * 3.5, Math.cos(ang) * 3.5, { heroId: 'sven' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp;
    }
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(0, null);
    for (let i = 0; i < 30; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.castAbility(3, null);
    for (let i = 0; i < 30; i++) A.step(2);
    if (typeof msg === 'function') msg('半人马酋长 · 奔袭冲撞', '#ffab91');
    CAM(P.x, P.z + 1, 26);
    return { stomp: A.getLog('hoofStomp').length, stamp: A.getLog('stampede').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-65-cent-stampede.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.slice(0, 8) }, null, 2));
  if (errs.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
