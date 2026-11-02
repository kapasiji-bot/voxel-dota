// build/shots-b15.js — B15 classic heroes screenshots (1280×720):
//   screenshot-58-select-b15.png      (hero select with 29 heroes)
//   screenshot-59-tide-ravage.png     (Tidehunter Ravage)
//   screenshot-60-sk-epicenter.png    (Sand King Epicenter)
//   screenshot-61-pl-illusions.png    (Phantom Lancer illusions)
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
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 29, null, { timeout: 60000 });
    await p.waitForTimeout(250); return p;
  };
  const SETUP = (hero) => {
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(12, 1 / 20);
    A.godMode(true); A.setLevel(18); A.revealAll(true);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); A.step(4);
    document.getElementById('msgs').innerHTML = '';
    window.CAM = (x, z, dist) => {
      for (const id of ['msgs', 'announce']) { const e = document.getElementById(id); if (e) { e.innerHTML = ''; e.className = ''; } }
      A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume();
    };
  };

  // 58) Select
  let p = await page();
  info.select = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')];
    const last = cards[cards.length - 1]; if (last) last.scrollIntoView({ block: 'center' });
    const names = cards.map(c => (c.querySelector('.name') || c).textContent.trim());
    return { n: cards.length, heroes: Object.keys(GameAPI.HERO_DEFS).length,
      has: ['tide', 'sk', 'sniper', 'pl'].every(id => !!GameAPI.HERO_DEFS[id]),
      labels: ['潮汐猎人', '沙王', '狙击手', '幻影长矛手'].map(n => names.some(t => t.includes(n))) };
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-58-select-b15.png') });
  await p.close();

  // 59) Tide Ravage
  p = await page();
  info.tide = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('tide');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 5; i++) {
      const ang = i * 1.256, f = A.spawnUnit('hero', 1, Math.sin(ang) * 5, Math.cos(ang) * 5, { heroId: 'axe' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 6000 } }, f); f.hp = f.maxHp;
    }
    A.step(1); A.castAbility(3, null);
    for (let i = 0; i < 18; i++) A.step(2);
    if (typeof msg === 'function') msg('潮汐猎人 · 毁灭', '#4fc3f7');
    CAM(P.x, P.z + 1, 30);
    return { ravage: A.getLog('ravage').length, dmg: A.getLog('damage').filter(e => e.ability === 'ravage').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-59-tide-ravage.png') });
  await p.close();

  // 60) SK Epicenter
  p = await page();
  info.sk = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('sk');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 4; i++) {
      const ang = i * 1.57, f = A.spawnUnit('hero', 1, Math.sin(ang) * 4, Math.cos(ang) * 4, { heroId: 'sven' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp;
    }
    A.step(1); A.castAbility(3, null);
    for (let i = 0; i < 80; i++) A.step(2);
    if (typeof msg === 'function') msg('沙王 · 地震', '#d7ccc8');
    CAM(P.x, P.z + 1, 26);
    return { epi: A.getLog('epicenter').length, dmg: A.getLog('damage').filter(e => e.ability === 'epicenter').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-60-sk-epicenter.png') });
  await p.close();

  // 61) PL illusions
  p = await page();
  info.pl = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('pl');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-2, -2); P.mana = P.maxMana;
    const f = A.spawnUnit('hero', 1, 2, -2, { heroId: 'axe' });
    f.order = { type: 'hold' }; f.respawn = 1e9;
    A.addModifier(f, { id: 'test_hp', props: { hp: 10000 } }, f); f.hp = f.maxHp;
    A.step(1);
    A.castAbility(0, f);
    for (let i = 0; i < 25; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.castAbility(1, { x: -2, z: -2 });
    for (let i = 0; i < 40; i++) A.step(2);
    A.issueOrder(P, { type: 'attack', target: f });
    for (let i = 0; i < 60; i++) A.step(2);
    if (typeof msg === 'function') msg('幻影长矛手 · 幻象', '#80cbc4');
    CAM(P.x, P.z + 1, 22);
    return { illus: A.units.filter(u => u.isIllusion && !u.dead && u.owner === P).length, lance: A.getLog('spiritLance').length, doppel: A.getLog('doppelganger').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-61-pl-illusions.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.slice(0, 8) }, null, 2));
  if (errs.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
