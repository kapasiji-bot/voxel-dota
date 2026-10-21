// build/shots-bots.js — screenshots for the bot batch: select screen with match options, an in-game teamfight, Tab scoreboard.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card').length >= 6); await p.waitForTimeout(400);
  await p.click('#matchOpts [data-k="enemies"] [data-v="5"]'); await p.click('#matchOpts [data-k="allies"] [data-v="4"]'); await p.click('#matchOpts [data-k="diff"] [data-v="2"]');
  await p.screenshot({ path: OUT('screenshot-9-select-options.png') });
  await p.click('#pick-lina .btn');
  // run the match as bots until a real teamfight (≥2 heroes per side within 12 of each other), then freeze visuals
  const info = await p.evaluate(() => {
    const A = GameAPI; A.pause(); A.setPlayerBot(true, 2, 'mid'); A.setTimeScale(0); A.resume();
    let fight = null;
    for (let i = 0; i < 30000 && !fight; i++) {
      A.step(1, 1 / 20);
      if (A.G.time < 420 || i % 2) continue;
      for (const h of A.G.heroes) {
        if (h.dead || Math.abs(h.x) > 56 || Math.abs(h.z) > 56) continue;   // keep the camera away from the map edge
        const near = A.G.heroes.filter(o => !o.dead && Math.hypot(o.x - h.x, o.z - h.z) < 12);
        const big = near.length >= (i > 12000 ? 4 : 5);
        if (big && near.filter(o => o.team === 0).length >= 2 && near.filter(o => o.team === 1).length >= 2 && near.some(o => o.casting || o.channel)) { fight = h; break; }
      }
    }
    if (fight) { A.step(3, 1 / 20); A.G.cam.x = fight.x; A.G.cam.z = fight.z - 3; A.G.cam.dist = 40; A.G.lock = false; }
    document.getElementById('msgs').innerHTML = '';
    return { t: A.G.time, at: fight && [fight.x, fight.z] };
  });
  await p.waitForTimeout(500); await p.screenshot({ path: OUT('screenshot-10-teamfight.png') });
  await p.keyboard.down('Tab'); await p.waitForTimeout(700); await p.screenshot({ path: OUT('screenshot-11-scoreboard.png') }); await p.keyboard.up('Tab');
  console.log(JSON.stringify(info), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no console errors');
  await b.close();
})();
