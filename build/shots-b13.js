// build/shots-b13.js — B13 polish screenshots (1280×720):
//   screenshot-51-shard-tooltip.png   (Sven with Shard equipped; shard ability values applied)
//   screenshot-52-bkb-blackhole.png   (Enigma magic-immune mid Black Hole)
//   screenshot-53-courier-burst.png   (courier delivering with upgrade + burst HUD)
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
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 21, null, { timeout: 60000 });
    await p.waitForTimeout(250); return p;
  };
  const SETUP = (hero) => {
    const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(12, 1 / 20);
    A.godMode(true); A.setLevel(16); A.revealAll(true);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); A.step(4);
    document.getElementById('msgs').innerHTML = '';
    window.CAM = (x, z, dist) => {
      for (const id of ['msgs', 'announce']) { const e = document.getElementById(id); if (e) { e.innerHTML = ''; e.className = ''; } }
      A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume();
    };
  };

  // 51) Shard on Sven
  let p = await page();
  info.shard = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('sven');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-8, -8); A.giveItem('shard'); A.giveItem('blink'); A.step(2);
    const ab = P.abilities.find(a => a.def.shard);
    // flash a message so the scene reads clearly
    if (typeof msg === 'function') msg('阿哈利姆魔晶 · ' + (ab && ab.def.shard.desc), '#5c6bc0');
    CAM(P.x, P.z + 2, 28);
    return { has: A.hasShard(P), ab: ab && ab.def.id, desc: ab && ab.def.shard.desc, armor: ab && ab.def.values.armor };
  }, SETUP.toString());
  await p.waitForTimeout(450);
  await p.screenshot({ path: OUT('screenshot-51-shard-tooltip.png') });
  await p.close();

  // 52) Enigma Black Hole + BKB
  p = await page();
  info.bkb = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('enigma');
    const A = GameAPI, P = A.G.player;
    A.teleportHero(-3, -3); A.giveItem('bkb'); P.mana = P.maxMana;
    for (let i = 0; i < 3; i++) {
      const f = A.spawnUnit('hero', 1, -1.5 + i * 1.0, -1.5, { heroId: 'sven' });
      f.order = { type: 'hold' }; f.respawn = 1e9; f.bot = null;
      A.addModifier(f, { id: 'test_hp', props: { hp: 8000 } }, f); f.hp = f.maxHp;
    }
    A.step(1);
    const bi = P.items.findIndex(it => it && it.id === 'bkb');
    A.useItem(P, bi, null);
    const slot = P.abilities.findIndex(a => a.def.id === 'black_hole');
    A.castAbility(slot, { x: -1.5, z: -1.5 });
    // advance through cast point into channel
    for (let i = 0; i < 25; i++) A.step(2);
    if (typeof msg === 'function') msg('BKB → 黑洞（B13 物品连招）', '#ffeb3b');
    CAM(P.x, P.z + 1, 24);
    return {
      mi: A.hasState(P, 'magicImmune'),
      channel: !!(P.channel && P.channel.ab && P.channel.ab.def.id === 'black_hole'),
      casting: !!(P.casting && P.casting.ab && P.casting.ab.def.id === 'black_hole'),
      bkbCd: P.items[bi] && +P.items[bi].cd.toFixed(1)
    };
  }, SETUP.toString());
  await p.waitForTimeout(500);
  await p.screenshot({ path: OUT('screenshot-52-bkb-blackhole.png') });
  await p.close();

  // 53) Courier upgrade + burst mid-deliver
  p = await page();
  info.courier = await p.evaluate(SETUP => {
    eval('(' + SETUP + ')')('axe');
    const A = GameAPI, P = A.G.player;
    // Park hero mid-map; put courier at fountain with bag; upgrade; deliver; step until flying mid-route
    A.teleportHero(5, 5); A.setGold(2000);
    let c = P.courier; if (!c || c.dead) c = A.spawnCourier(P);
    // ensure alive and at home
    c.dead = false; c.hp = c.maxHp;
    const home = { x: -63, z: 63 }; c.x = home.x; c.z = home.z;
    c.bag = [{ id: 'circlet', n: 1 }];
    A.courierUpgrade(P);
    A.courierOrder(P, 'deliver');
    // fly partway: ~2–3 seconds of burst flight toward (5,5)
    for (let i = 0; i < 30; i++) A.step(3);
    A.updateCourierHUD && A.updateCourierHUD();
    if (typeof msg === 'function') msg('信使加速运送（永久升级 + 爆发）', '#80d8ff');
    CAM(c.x, c.z + 2, 36);
    return {
      upgraded: !!c.upgraded, burst: !!(c.burstUntil && A.G.time < c.burstUntil),
      speed: +c.speed.toFixed(2), hud: document.getElementById('courierSt').textContent,
      order: c.corder && c.corder.type, alive: !c.dead, x: +c.x.toFixed(1), z: +c.z.toFixed(1)
    };
  }, SETUP.toString());
  await p.waitForTimeout(400);
  await p.screenshot({ path: OUT('screenshot-53-courier-burst.png') });
  await p.close();

  console.log(JSON.stringify(info, null, 2));
  const real = errs.filter(e => !/favicon|Deferred/.test(e));
  if (real.length) { console.error('ERRS', real.slice(0, 10)); process.exit(1); }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
