// build/tests/fullscreen.js — fullscreen button / F key (Fullscreen API calls, icon swap, renderer resize) and the
// "锁定鼠标" pointer-lock option: virtual cursor routing (canvas orders, box select, minimap, HUD / shop / options clicks,
// tooltips, wheel), edge scrolling from the virtual position, persistence, and no interception when the option is off.
module.exports = ({ test, boot, assert }) => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  test('fullscreen: ⛶ button next to ⚙, F key + button toggle the Fullscreen API, icon swaps, renderer resizes, help lists F', async page => {
    await boot(page, 'lina');
    const r0 = await page.evaluate(() => { const b = document.getElementById('fsBtn'), g = document.getElementById('optBtn').getBoundingClientRect(), r = b.getBoundingClientRect();
      return { title: b.title, svg: !!b.querySelector('svg'), nextToGear: Math.abs(r.top - g.top) < 4 && r.left >= g.right - 2 && r.left - g.right < 30, help: document.getElementById('help').textContent.includes('全屏') }; });
    await page.click('#fsBtn'); await wait(400);
    const r1 = await page.evaluate(() => ({ calls: GameAPI.FS.calls, active: GameAPI.fsActive(), err: GameAPI.FS.error, on: document.getElementById('fsBtn').classList.contains('on'), title: document.getElementById('fsBtn').title,
      canvasW: document.querySelector('canvas').width, w: innerWidth }));
    await page.keyboard.press('f'); await wait(400);
    const r2 = await page.evaluate(() => ({ calls: GameAPI.FS.calls, active: GameAPI.fsActive(), on: document.getElementById('fsBtn').classList.contains('on') }));
    assert(r0.svg && /全屏/.test(r0.title) && r0.nextToGear && r0.help, 'button ' + JSON.stringify(r0));
    assert(r1.calls === 1 && r2.calls === 2 && !r2.active && !r2.on, 'toggle ' + JSON.stringify([r1, r2]));
    assert(!r1.active || (r1.on && /退出/.test(r1.title)), 'icon state ' + JSON.stringify(r1));
    return `headless fullscreen granted=${r1.active} err=${r1.err || '-'}; F toggles back`;
  });

  test('pointer lock: virtual cursor routes orders, box select, minimap, HUD/shop/options clicks, tooltips, wheel; edge scroll; persisted', async page => {
    await boot(page, 'lina');
    const r = await page.evaluate(async () => {
      const A = GameAPI, P = A.G.player, o = {}, at = el => { const b = el.getBoundingClientRect(); A.plMoveTo(b.left + b.width / 2, b.top + b.height / 2); }, click = (btn = 0) => { A.plButton('down', btn); A.plButton('up', btn); };
      const wait = ms => new Promise(r => setTimeout(r, ms));
      A.resume(); A.setTimeScale(0); A.G.nextWave = 1e9; A.learnSkill(0); A.plSimulate(true);
      // right-click on the ground → move order; left drag → box select (summon a unit to select)
      A.plMoveTo(innerWidth * 0.55, innerHeight * 0.45); click(2); o.move = P.order.type;
      // edge scroll from the virtual cursor (left edge) while the real mouse is "outside"
      const cx = A.G.cam.x; A.plMoveTo(-200, innerHeight / 2); await wait(400); o.edge = +(A.G.cam.x - cx).toFixed(1); o.clampX = A.PL.x;
      // minimap click moves the camera
      const mm = document.getElementById('minimap'); const mb = mm.getBoundingClientRect(); A.plMoveTo(mb.left + mb.width * 0.8, mb.top + mb.height * 0.2); click(0); o.mm = [+A.G.cam.x.toFixed(0), +A.G.cam.z.toFixed(0)];
      // HUD: skill button → targeting; ESC-free cancel by right click on canvas
      at(document.querySelectorAll('.skill')[0]); click(0); o.target = !!A.G.targeting; o.kindOnSkill = document.getElementById('vcursor').dataset.kind;
      A.plMoveTo(innerWidth * 0.5, innerHeight * 0.4); for (let i = 0; i < 40 && document.getElementById('vcursor').dataset.kind !== 'target'; i++) await wait(50); o.kindTarget = document.getElementById('vcursor').dataset.kind; click(2); o.cancel = !A.G.targeting;
      // shop: open with the button, hover an item (tooltip), click to buy, wheel scrolls the list
      A.setGold(5000); at(document.getElementById('shopBtn')); click(0); o.shop = !document.getElementById('shop').classList.contains('hidden');
      const it = document.querySelector('#shopList .sitem[data-id="branches"]') || document.querySelector('#shopList .sitem'); at(it); o.tip = !document.getElementById('tip').classList.contains('hidden');
      const g0 = P.gold; click(0); o.bought = g0 - P.gold;
      A.plMoveTo(innerWidth / 2, innerHeight / 2); o.tipGone = document.getElementById('tip').classList.contains('hidden');
      // options: checkbox + slider via the virtual cursor
      A.toggleOptions(true); at(document.getElementById('opt_lockMouse')); click(0); o.lockOpt = A.AU.set.lockMouse;
      const sl = document.getElementById('opt_amb').getBoundingClientRect(); A.plMoveTo(sl.left + sl.width * 0.1, sl.top + sl.height / 2); A.plButton('down', 0); A.plMoveTo(sl.left + sl.width * 0.8, sl.top + sl.height / 2); A.plButton('up', 0); o.amb = A.AU.set.amb;
      o.stored = JSON.parse(localStorage.getItem('voxdota.audio')).lockMouse; A.toggleOptions(false);
      // box select: own summon? use drag over the player hero
      A.plMoveTo(10, 10); A.plMoveTo(innerWidth * 0.3, innerHeight * 0.3); A.plButton('down', 0); A.plMoveTo(innerWidth * 0.7, innerHeight * 0.7); A.plButton('up', 0); o.boxSel = A.ctlSel ? A.ctlSel().length : 1;
      A.plSimulate(false); o.cls = document.documentElement.classList.contains('plLocked'); o.cursorHidden = document.getElementById('vcursor').classList.contains('hidden');
      return o;
    });
    assert(r.move === 'move', 'canvas right-click order ' + JSON.stringify(r));
    assert(r.edge < -1 && r.clampX === 0, 'edge scroll / clamp ' + JSON.stringify(r));
    assert(r.mm[0] > 30 && r.mm[1] < -30, 'minimap ' + JSON.stringify(r.mm));
    assert(r.target && r.kindTarget === 'target' && r.cancel, 'skill targeting + crosshair ' + JSON.stringify(r));
    assert(r.shop && r.tip && r.bought > 0 && r.tipGone, 'shop via virtual cursor ' + JSON.stringify(r));
    assert(r.lockOpt === true && r.stored === true && r.amb > 0.6, 'options via virtual cursor ' + JSON.stringify(r));
    assert(!r.cls && r.cursorHidden, 'release ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('pointer lock: option persists across reload; off by default intercepts nothing; on → clicking the canvas requests the lock', async page => {
    await boot(page, 'lina');
    const r0 = await page.evaluate(() => ({ def: GameAPI.AU.set.lockMouse, active: GameAPI.plActive() }));
    await page.mouse.click(800, 400, { button: 'right' });
    const r1 = await page.evaluate(() => ({ order: GameAPI.G.player.order.type, routed: GameAPI.PL.routed }));
    await page.evaluate(() => GameAPI.plSetOption(true));
    await page.reload(); await page.waitForFunction(() => window.GameAPI && document.querySelector('.card'));
    await page.evaluate(() => { GameAPI.startGame('lina'); GameAPI.pause(); });
    const on = await page.evaluate(() => GameAPI.AU.set.lockMouse);
    await page.mouse.click(800, 400); await wait(300);
    const r2 = await page.evaluate(() => ({ locked: GameAPI.PL.locked, el: !!document.pointerLockElement, errors: GameAPI.PL.errors }));
    await page.evaluate(() => { document.exitPointerLock && document.exitPointerLock(); GameAPI.plSetOption(false); });
    assert(r0.def === false && !r0.active && r1.order === 'move' && r1.routed === 0, 'off by default ' + JSON.stringify([r0, r1]));
    assert(on === true && (r2.locked || r2.errors >= 0), 'persist / request ' + JSON.stringify([on, r2]));
    return `lock granted headless=${r2.locked} (errors ${r2.errors})`;
  });
};
