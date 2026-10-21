const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text()); });
  page.on('pageerror', e => console.log('pageerror', e.message, e.stack.split('\n').slice(0,3).join(' | ')));
  await page.goto('file:///workspace/voxel-dota/voxel-dota.html?debug=1');
  await page.waitForTimeout(1500);
  await page.click('#pick-axe');
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => { GameAPI.simulate(40); return GameAPI.getState(); });
  console.log(JSON.stringify(r).slice(0, 900));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/smoke.png' });
  await browser.close();
})();
