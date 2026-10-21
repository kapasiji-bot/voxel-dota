// build/shots-fullscreen.js — screenshot of the ⛶ fullscreen button (top bar, next to ⚙) with the options panel open
// (锁定鼠标 checkbox) and the software cursor shown. Output: screenshot-44-fullscreen-button.png (1280×720).
const { chromium } = require('playwright-core'), path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '../voxel-dota.html'));
  await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 21, null, { timeout: 60000 });
  await p.evaluate(() => { const A = GameAPI; A.startGame('cm', { enemies: 2, allies: 1 }); A.pause(); A.simulate(40, 1 / 20); document.getElementById('msgs').innerHTML = '';
    A.toggleOptions(true); A.plSimulate(true); const r = document.getElementById('fsBtn').getBoundingClientRect(); A.plMoveTo(r.left + r.width * 0.6, r.top + r.height * 0.7); A.resume(); A.setTimeScale(0); });
  await p.waitForTimeout(500); await p.screenshot({ path: path.resolve(__dirname, '../screenshot-44-fullscreen-button.png') });
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors'); await b.close();
})();
