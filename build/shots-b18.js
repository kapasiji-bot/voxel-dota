// build/shots-b18.js — B18 classic heroes screenshots (1280×720):
//   screenshot-70-select-b18.png       (hero select with 41 heroes)
//   screenshot-71-storm-ball.png       (Storm Ball Lightning / Remnant)
//   screenshot-72-disruptor-storm.png  (Disruptor Static Storm / Field)
//   screenshot-73-tinker-rearm.png     (Tinker Laser / Missile / Matrix)
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
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 41, null, { timeout: 60000 });
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

  // 70) Select
  let p = await page();
  info.select = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')];
    const last = cards[cards.length - 1]; if (last) last.scrollIntoView({ block: 'center' });
    const names = cards.map(c => (c.querySelector('.name') || c).textContent.trim());
    return { n: cards.length, heroes: Object.keys(GameAPI.HERO_DEFS).length,
      has: ['storm', 'disruptor', 'sshaman', 'tinker'].every(id => !!GameAPI.HERO_DEFS[id]),
      labels: ['风暴之灵', '干扰者', '暗影萨满', '修补匠'].map(n => names.some(t => t.includes(n))) };
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-70-select-b18.png') });
  await p.close();

  // 71) Storm Ball + Remnant
  p = await page();
  info.storm = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('storm');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 4; i++) {
      const ang = i * 1.57, f = A.spawnUnit('hero', 1, Math.sin(ang) * 3.5, Math.cos(ang) * 3.5, { heroId: 'axe' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp;
    }
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(0, null);
    for (let i = 0; i < 15; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.castAbility(3, { x: 8, z: 0 });
    for (let i = 0; i < 40; i++) A.step(2);
    if (typeof msg === 'function') msg('风暴之灵 · 球状闪电', '#80d8ff');
    CAM(2, 0, 28);
    return { rem: A.getLog('staticRemnant').length, ball: A.getLog('ballLightning').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-71-storm-ball.png') });
  await p.close();

  // 72) Disruptor Field + Storm
  p = await page();
  info.disruptor = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('disruptor');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 4; i++) {
      const ang = i * 1.57, f = A.spawnUnit('hero', 1, Math.sin(ang) * 2.5, Math.cos(ang) * 2.5, { heroId: 'sven' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 6000 } }, f); f.hp = f.maxHp;
    }
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(2, { x: 0, z: 0 });
    for (let i = 0; i < 25; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.castAbility(3, { x: 0, z: 0 });
    for (let i = 0; i < 50; i++) A.step(2);
    if (typeof msg === 'function') msg('干扰者 · 静态风暴', '#b39ddb');
    CAM(0, 0, 28);
    return { field: A.getLog('kineticField').length, storm: A.getLog('staticStorm').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-72-disruptor-storm.png') });
  await p.close();

  // 73) Tinker kit
  p = await page();
  info.tinker = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('tinker');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana;
    for (let i = 0; i < 3; i++) {
      const f = A.spawnUnit('hero', 1, 4 + i * 1.2, (i - 1) * 1.5, { heroId: 'axe' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp;
    }
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.step(1); A.castAbility(2, P);
    for (let i = 0; i < 10; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    const foe = A.G.heroes.find(h => h.team === 1 && !h.dead);
    A.castAbility(0, foe);
    for (let i = 0; i < 20; i++) A.step(2);
    for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
    A.castAbility(1, null);
    for (let i = 0; i < 30; i++) A.step(2);
    if (typeof msg === 'function') msg('修补匠 · 热导飞弹', '#4dd0e1');
    CAM(2, 0, 26);
    return { laser: A.getLog('laser').length, missile: A.getLog('heatMissile').length, matrix: A.getLog('defenseMatrix').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-73-tinker-rearm.png') });
  await p.close();

  await b.close();
  console.log(JSON.stringify({ info, errs: errs.slice(0, 8) }, null, 2));
  if (errs.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
