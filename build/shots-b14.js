// build/shots-b14.js — B14 classic carries screenshots (1280×720):
//   screenshot-54-select-b14.png      (hero select with 25 heroes incl. jugg/sf/wr/wk)
//   screenshot-55-jugg-omnislash.png  (Juggernaut mid Omnislash)
//   screenshot-56-sf-requiem.png      (Shadow Fiend Requiem of Souls)
//   screenshot-57-wk-reincarnate.png  (Wraith King reincarnation flash)
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
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 25, null, { timeout: 60000 });
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

  // 54) Select screen
  let p = await page();
  info.select = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.card')];
    const names = cards.map(c => (c.querySelector('.name') || c).textContent.trim()).filter(Boolean);
    const ids = Object.keys(GameAPI.HERO_DEFS);
    // scroll so new heroes are visible if grid is long
    const last = cards[cards.length - 1]; if (last) last.scrollIntoView({ block: 'center' });
    return { n: cards.length, heroes: ids.length, has: ['jugg', 'sf', 'wr', 'wk'].every(id => !!GameAPI.HERO_DEFS[id]),
      labels: ['主宰', '影魔', '风行者', '冥魂大帝'].map(n => names.some(t => t.includes(n))) };
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-54-select-b14.png') });
  await p.close();

  // 55) Jugg Omnislash
  p = await page();
  info.jugg = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('jugg');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-4, -4); P.mana = P.maxMana;
    const foes = [];
    for (let i = 0; i < 3; i++) {
      const f = A.spawnUnit('hero', 1, -2 + i * 1.2, -3, { heroId: 'axe' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp; foes.push(f);
    }
    A.step(1);
    A.castAbility(3, foes[1]);
    for (let i = 0; i < 20; i++) A.step(2);
    if (typeof msg === 'function') msg('主宰 · 无敌斩', '#ffab91');
    CAM(P.x, P.z + 1, 22);
    return { omni: !!A.getMod(P, 'jugg_omni'), inv: A.hasState(P, 'invulnerable'), hits: A.getLog('damage').filter(e => e.ability === 'omnislash').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-55-jugg-omnislash.png') });
  await p.close();

  // 56) SF Requiem
  p = await page();
  info.sf = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('sf');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(0, 0); P.mana = P.maxMana; P.souls = 14; A.refreshHero && A.refreshHero(P);
    if (typeof refreshHero === 'function') refreshHero(P);
    for (let i = 0; i < 4; i++) {
      const ang = i * 1.57, f = A.spawnUnit('hero', 1, Math.sin(ang) * 4, Math.cos(ang) * 4, { heroId: 'sven' });
      f.order = { type: 'hold' }; f.respawn = 1e9;
      A.addModifier(f, { id: 'test_hp', props: { hp: 6000 } }, f); f.hp = f.maxHp;
    }
    A.step(1); A.castAbility(3, null);
    for (let i = 0; i < 30; i++) A.step(2);
    if (typeof msg === 'function') msg('影魔 · 魂之挽歌', '#ce93d8');
    CAM(P.x, P.z + 1, 28);
    return { req: A.getLog('requiem').length, dmg: Math.round(A.getLog('damage').filter(e => e.ability === 'requiem').reduce((a, e) => a + e.amount, 0)), souls: P.souls };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-56-sf-requiem.png') });
  await p.close();

  // 57) WK reincarnation
  p = await page();
  info.wk = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('wk');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-6, -6); P.mana = P.maxMana; A.godMode(false);
    const foe = A.spawnUnit('hero', 1, -4, -6, { heroId: 'axe' });
    foe.order = { type: 'hold' }; foe.respawn = 1e9;
    A.addModifier(foe, { id: 'test_hp', props: { hp: 5000 } }, foe); foe.hp = foe.maxHp;
    A.step(1);
    A.killUnit(P, foe);
    A.step(2);
    if (typeof msg === 'function') msg('冥魂大帝 · 重生', '#ef9a9a');
    CAM(-6, -5, 24);
    return { dead: P.dead, reinc: !!P.reincarnate, delay: P.respawn, ev: A.getLog('reincarnateSkill').length };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-57-wk-reincarnate.png') });
  await p.close();

  console.log(JSON.stringify(info, null, 2));
  const real = errs.filter(e => !/favicon|Deferred/.test(e));
  if (real.length) { console.error('ERRS', real.slice(0, 10)); process.exit(1); }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
