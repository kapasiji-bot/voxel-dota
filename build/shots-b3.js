// build/shots-b3.js — screenshots for the fog-of-war + B3 batch: fog on map + minimap, hero select (10 heroes),
// Puck Dream Coil, Riki Smoke Screen + invisibility (own-team ghost). One page per shot (a second page in one browser can stall).
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  async function page() {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card').length >= 10); await p.waitForTimeout(400); return p;
  }
  // 1) hero select with 10 heroes
  let p = await page(); info.cards = await p.evaluate(() => document.querySelectorAll('.card').length);
  await p.screenshot({ path: OUT('screenshot-13-select-10.png') }); await p.close();
  // 2) fog of war: bot match, player (bot-controlled) in the Radiant jungle edge; dark unseen terrain + minimap fog
  p = await page();
  await p.click('#matchOpts [data-k="enemies"] [data-v="5"]'); await p.click('#matchOpts [data-k="allies"] [data-v="4"]'); await p.click('#pick-bh .btn');
  info.fog = await p.evaluate(() => {
    const A = GameAPI; A.pause(); A.setPlayerBot(true, 1, 'mid'); A.setTimeScale(0); A.resume();
    A.simulate(150, 1 / 20); A.setPlayerBot(false); const P = A.G.player; A.teleportHero(-22, 6); A.issueOrder(P, { type: 'hold' }); A.step(10, 1 / 20);
    A.G.cam.x = -14; A.G.cam.z = 2; A.G.cam.dist = 58; A.G.lock = false; document.getElementById('msgs').innerHTML = '';
    const seen = A.VIS[0].reduce((a, v) => a + v, 0);
    return { t: Math.round(A.G.time), radiantCells: seen, of: 6400, hiddenEnemies: A.G.heroes.filter(h => h.team === 1 && !h.dead && !A.isVisible(h, 0)).length };
  });
  await p.waitForTimeout(1200); await p.screenshot({ path: OUT('screenshot-12-fog.png') }); await p.close();
  // 3) Puck Dream Coil latched on three Dire heroes
  p = await page(); await p.click('#pick-puck .btn');
  info.coil = await p.evaluate(() => {
    const A = GameAPI; A.pause(); A.setTimeScale(0); A.resume(); A.godMode(true); A.setLevel(18); A.G.nextWave = 1e9;
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(40, 1 / 20);
    A.teleportHero(-40, 40); const hs = [['axe', -40, 32], ['sven', -36, 33], ['lina', -43, 31]].map(([id, x, z]) => { const h = A.spawnUnit('hero', 1, x, z, { heroId: id }); h.order = { type: 'hold' }; h.hp = h.maxHp = 5000; return h; });
    A.castAbility(3, { x: -40, z: 32 }); A.step(12, 1 / 20); A.castAbility(0, { x: -40, z: 20 }); A.step(14, 1 / 20);
    A.G.cam.x = -40; A.G.cam.z = 33; A.G.cam.dist = 30; A.G.lock = false; document.getElementById('msgs').innerHTML = '';
    return { latched: hs.filter(h => A.getMod(h, 'puck_coil')).length };
  });
  await p.waitForTimeout(500); await p.screenshot({ path: OUT('screenshot-14-puck-coil.png') }); await p.close();
  // 4) Riki: Smoke Screen on Dire creeps + hero, Riki invisible (semi-transparent for his own team)
  p = await page(); await p.click('#pick-riki .btn');
  info.smoke = await p.evaluate(() => {
    const A = GameAPI; A.pause(); A.setTimeScale(0); A.resume(); A.record(true); A.godMode(true); A.setLevel(18); A.G.nextWave = 1e9;
    for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i);
    for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(40, 1 / 20);
    A.teleportHero(-40, 40); A.step(50, 1 / 20);
    const d = A.spawnUnit('hero', 1, -40, 33, { heroId: 'lion' }); d.order = { type: 'hold' }; d.hp = d.maxHp = 5000;
    for (const [x, z] of [[-38, 34], [-42, 34], [-41, 31.5], [-38.5, 31.5]]) { const c = A.spawnUnit('melee', 1, x, z); c.wps = [{ x, z }]; c.wp = 0; c.order = { type: 'hold' }; }
    A.issueOrder(A.G.player, { type: 'hold' }); A.castAbility(0, { x: -40, z: 33 }); A.step(10, 1 / 20); A.issueOrder(A.G.player, { type: 'move', x: -33, z: 39 }); A.step(20, 1 / 20); A.issueOrder(A.G.player, { type: 'hold' }); A.step(60, 1 / 20);
    A.G.cam.x = -37; A.G.cam.z = 35; A.G.cam.dist = 30; A.G.lock = false; document.getElementById('msgs').innerHTML = '';
    const m = A.getMod(A.G.player, 'riki_cloak'); return { br: A.getLog('invisBreak').slice(-4).map(e => e.why + '@' + e.t.toFixed(1)), now: A.G.time.toFixed(1), rikiInvis: A.isInvisible(A.G.player), m: m && JSON.stringify({ f: m.data.fade, b: m.data.brk }), lv: A.G.player.abilities.map(a => a.lvl), silenced: A.hasState(d, 'silenced') };
  });
  await p.waitForTimeout(500); await p.screenshot({ path: OUT('screenshot-15-riki-smoke.png') }); await p.close();
  console.log(JSON.stringify(info), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors');
  await b.close();
})();
