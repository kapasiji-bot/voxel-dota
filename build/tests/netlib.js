// build/tests/netlib.js — helpers for the B11 LAN tests: N pages in ONE browser context (BroadcastChannel needs a shared
// storage partition) running ?netfake=1, the real lobby UI driven by clicks / pasted codes.
const path = require('path');
const NURL = 'file://' + path.resolve(__dirname, '../../voxel-dota.html') + '?debug=1&netfake=1';
async function openPages(browser, n, errors, size = { width: 1280, height: 720 }, render = false) {
  const ctx = await browser.newContext({ viewport: size }), pages = [];
  for (let i = 0; i < n; i++) {
    const p = await ctx.newPage(); p._tag = i ? 'c' + i : 'host';
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(p._tag + ' ' + m.type() + ': ' + m.text()); });
    p.on('pageerror', e => errors.push(p._tag + ' pageerror: ' + e.message));
    await p.goto(NURL); await p.waitForFunction(() => window.GameAPI && document.querySelector('.card') && document.getElementById('mtHost'));
    if (!render) await p.evaluate(() => GameAPI.netNoRender(true));
    pages.push(p);
  }
  return { ctx, pages };
}
// host opens a room; every other page joins through one invite each (offer → answer codes copied between pages)
async function connectAll(pages, names) {
  const [host, ...cl] = pages;
  await host.fill('#lbName', names ? names[0] : '房主').catch(() => {});
  await host.evaluate(n => { document.getElementById('lbName').value = n; }, names ? names[0] : '房主');
  await host.click('#mtHost');
  for (let i = 0; i < cl.length; i++) {
    const c = cl[i];
    await c.evaluate(n => { document.getElementById('lbName').value = n; }, names ? names[i + 1] : '玩家' + (i + 1));
    await c.click('#mtJoin');
    if (i === 0) await host.click('#lbInvite'); else await host.click('#invNew');
    await host.waitForFunction(k => { const c = document.querySelector(`.inv[data-id="${k}"] .code`); return c && c.value.startsWith('VD1O'); }, i + 1);
    const offer = await host.$eval(`.inv[data-id="${i + 1}"] .code`, e => e.value);
    await c.fill('#jOffer', offer); await c.click('#jGo');
    await c.waitForFunction(() => document.getElementById('jAns').value.startsWith('VD1A'));
    const ans = await c.$eval('#jAns', e => e.value);
    await host.fill(`.inv[data-id="${i + 1}"] .ans`, ans); await host.click(`.inv[data-id="${i + 1}"] .ok`);
    await c.waitForFunction(() => !document.getElementById('lbRoom').classList.contains('hidden') && GameAPI.LOB.slots.some(s => s.k === 'h' && s.pid === GameAPI.NET.me), null, { timeout: 15000 });
  }
  await host.click('#invClose').catch(() => {});
  return { offerLen: 0 };
}
async function pick(page, hero) { await page.click(`.lbHero[data-id="${hero}"]`); await page.waitForFunction(h => { const m = GameAPI.LOB.slots.find(s => s.k === 'h' && s.pid === GameAPI.NET.me); return m && m.hero === h; }, hero); }
async function ready(page) { await page.click('#lbReady'); await page.waitForFunction(() => { const m = GameAPI.LOB.slots.find(s => s.k === 'h' && s.pid === GameAPI.NET.me); return m && m.ready; }); }
async function startMatch(pages) {
  await pages[0].waitForFunction(() => !document.getElementById('lbStart').disabled);
  await pages[0].click('#lbStart');
  for (const p of pages) await p.waitForFunction(() => GameAPI.G.started && GameAPI.NET.on);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
module.exports = { openPages, connectAll, pick, ready, startMatch, sleep, NURL };
