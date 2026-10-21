// build/shots-b6.js — screenshots for B6: hero select (21 heroes), Queen of Pain Sonic Wave, Phantom Assassin Coup de Grace crit,
// Silencer Global Silence, and a bot combo moment (Earthshaker blink → Fissure → Echo Slam). Output: screenshot-29..33-*.png.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async (w, h) => { const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 21, null, { timeout: 60000 }); await p.waitForTimeout(300); return p; };
  // shared scene setup: hero at an open spot, level 18, all skills, enemies around
  const SETUP = (hero) => { const A = GameAPI; A.startGame(hero); A.pause(); A.G.nextWave = 1e9; A.simulate(20, 1 / 20); A.godMode(true); A.setLevel(18);
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(5);
    A.teleportHero(-20, -20); A.issueOrder(A.G.player, { type: 'hold' }); A.step(2); document.getElementById('msgs').innerHTML = '';
    window.EN = (x, z, id = 'axe') => { const d = A.spawnUnit('hero', 1, x, z, { heroId: id }); d.order = { type: 'hold' }; A.addModifier(d, { id: 'shot_hp', props: { hp: 20000 } }, d); A.step(1); d.hp = d.maxHp; return d; };
    window.CAM = (x, z, dist) => { A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); }; };
  // 1) hero select, 21 heroes
  let p = await page(1600, 900); await p.screenshot({ path: OUT('screenshot-29-select-21.png') }); await p.close();
  // 2) Queen of Pain: Sonic Wave cone sweeping through 4 enemies
  p = await page(1600, 900);
  info.wave = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('qop'); const A = GameAPI, P = A.G.player;
    EN(-13, -21, 'axe'); EN(-10, -17, 'lina'); EN(-8, -23, 'sven'); EN(-15, -18.5, 'cm'); A.record(true);
    A.castAbility(3, { x: -5, z: -20 }); A.simulate(0.95, 1 / 20); CAM(-13, -19, 30);
    return { hits: A.getLog('damage').filter(e => e.ability === 'sonic_wave').length }; }, SETUP.toString());
  await p.waitForTimeout(700); await p.screenshot({ path: OUT('screenshot-30-qop-sonic-wave.png') }); await p.close();
  // 3) Phantom Assassin: Coup de Grace — huge red crit number + blood
  p = await page(1600, 900);
  info.crit = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('pa'); const A = GameAPI, P = A.G.player;
    const e = EN(-17.5, -20, 'sven'); A.record(true); const R = Math.random; let n = 0; Math.random = () => (n++ % 7 === 0 ? 0.05 : R());
    A.issueOrder(P, { type: 'attack', target: e }); for (let i = 0; i < 80 && !A.getLog('crit').length; i++) A.simulate(0.05, 1 / 20); Math.random = R; A.simulate(0.12, 1 / 20);
    CAM(-18.5, -18.5, 17); return { crit: A.getLog('crit').map(c => Math.round(c.amount)) }; }, SETUP.toString());
  await p.waitForTimeout(500); await p.screenshot({ path: OUT('screenshot-31-pa-coup-de-grace-crit.png') }); await p.close();
  // 4) Silencer: Global Silence — pillars on every enemy hero (incl. ones far away), silenced tags
  p = await page(1600, 900);
  info.gs = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('silencer'); const A = GameAPI, P = A.G.player;
    const es = [EN(-12, -19, 'axe'), EN(-14, -24, 'lina'), EN(-9, -22, 'zeus'), EN(40, 40, 'cm')]; A.castAbility(0, { x: -12, z: -21 }); A.simulate(0.6, 1 / 20);
    A.castAbility(3, null); A.simulate(0.5, 1 / 20); CAM(-15, -19, 30); return { silenced: es.filter(e => A.hasState(e, 'silenced')).length }; }, SETUP.toString());
  await p.waitForTimeout(500); await p.screenshot({ path: OUT('screenshot-32-silencer-global-silence.png') }); await p.close();
  // 5) combo moment: a Dire Earthshaker bot blinks into three Radiant heroes → Fissure → Echo Slam
  p = await page(1600, 900);
  info.combo = await p.evaluate(SETUP => { eval('(' + SETUP + ')')('lina'); const A = GameAPI, P = A.G.player; A.revealAll(true);
    const al = [P]; for (const [id, x, z] of [['cm', -17, -18], ['sven', -18.5, -22.5]]) { const d = A.spawnUnit('hero', 0, x, z, { heroId: id }); d.order = { type: 'hold' }; A.addModifier(d, { id: 'shot_hp', props: { hp: 20000 } }, d); A.step(1); d.hp = d.maxHp; al.push(d); }
    const es = A.spawnBot('es', 1, 'mid', 2); es.respawn = 1e9; A.setLevel(16, es); es.x = -2; es.z = -16; if (es.model) es.model.position.set(es.x, 0, es.z);
    for (let k = 0; k < 4; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, es); A.giveItem('blink', es); es.mana = es.maxMana; A.record(true);
    for (let i = 0; i < 120 && !A.getLog('echoSlam').length; i++) A.simulate(0.05, 1 / 20); A.simulate(0.3, 1 / 20);
    CAM(-17, -18, 30); return { steps: A.getLog('botCombo').map(e => e.step).join(''), echo: A.getLog('echoSlam').length, walls: A.WALLS.list.length }; }, SETUP.toString());
  await p.waitForTimeout(700); await p.screenshot({ path: OUT('screenshot-33-combo-es-blink-fissure-echo.png') }); await p.close();
  console.log(JSON.stringify(info)); console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no console errors');
  await b.close();
})();
