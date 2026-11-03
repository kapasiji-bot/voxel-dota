// build/shots-b21.js — hero select search + attribute filter screenshots.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async (w = 1600, h = 900) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL);
    await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card').length >= 41, null, { timeout: 60000 });
    await p.waitForTimeout(300);
    return p;
  };

  let p = await page();
  info.str = await p.evaluate(() => {
    GameAPI.setHeroFilter({ attr: 'str', role: '', q: '' });
    return {
      n: document.querySelectorAll('.card:not(.hide)').length,
      ids: [...document.querySelectorAll('.card:not(.hide)')].map(c => c.dataset.id),
      badge: document.getElementById('heroFilterN').textContent,
    };
  });
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT('screenshot-79-select-filter-str.png') });
  await p.close();

  p = await page();
  info.search = await p.evaluate(() => {
    GameAPI.setHeroFilter({ q: 'queen', attr: '', role: '' });
    return {
      n: document.querySelectorAll('.card:not(.hide)').length,
      ids: [...document.querySelectorAll('.card:not(.hide)')].map(c => c.dataset.id),
      q: document.getElementById('heroSearch').value,
    };
  });
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT('screenshot-80-select-search-queen.png') });
  await p.close();

  p = await page();
  info.sup = await p.evaluate(() => {
    GameAPI.setHeroFilter({ role: 'support', attr: '', q: '' });
    return {
      n: document.querySelectorAll('.card:not(.hide)').length,
      badge: document.getElementById('heroFilterN').textContent,
    };
  });
  await p.waitForTimeout(250);
  await p.screenshot({ path: OUT('screenshot-81-select-filter-support.png') });
  await p.close();

  await b.close();
  if (errs.length) console.error('SHOT_ERR', errs.slice(0, 8));
  console.log(JSON.stringify({ info, errs: errs.length }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
