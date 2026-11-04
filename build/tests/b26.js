// build/tests/b26.js — B11 follow-ups: order-log replay, spectator mode, checkpoints + accelerated FF.
const path = require('path');
const L = require('./netlib.js');
module.exports = ({ test, boot, assert }) => {
  const multi = (name, n, fn) => test(name, async page => {
    const errors = [], { ctx, pages } = await L.openPages(page.context().browser(), n, errors, { width: 800, height: 450 });
    try { const info = await fn(pages, errors); if (errors.length) throw new Error('console errors: ' + errors.slice(0, 6).join(' | ')); return info; }
    finally { await ctx.close(); }
  });
  const waitTick = (p, n) => p.waitForFunction(k => GameAPI.LS.n >= k, n, { timeout: 120000 });

  test('B26 replay: capture lockstep log, play back, final hash matches', async page => {
    await boot(page);
    const r = await page.evaluate(async () => {
      const A = GameAPI;
      document.getElementById('lbName').value = 'RecHost';
      document.getElementById('mtHost').click();
      A.lobbyAct('fill', { diff: 0 });
      A.lobbyAct('pick', { hero: 'lina' });
      A.netStartGame();
      A.netNoRender(true);
      A.netSpeed(8);
      for (let i = 0; i < 4; i++) A.netLearn(i);
      A.netOrder({ type: 'move', x: A.G.player.x + 10, z: A.G.player.z + 4 });
      const target = A.CP_EVERY + 60;
      const t0 = performance.now();
      while (A.LS.n < target && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 20));
      A.netSetPause(true);
      const rec = A.replayCapture();
      return { rec, hashLive: A.stateHash(), tickLive: A.LS.n, cps: A.cpInfo(), x: A.G.player.x, z: A.G.player.z };
    });
    assert(r.rec && r.rec.log && r.rec.spec, 'capture');
    assert(r.cps.count >= 1 && r.cps.latest.n === r.cps.every, 'checkpoint ' + JSON.stringify(r.cps));
    assert(r.tickLive >= r.cps.every, 'ticks ' + r.tickLive);

    const browser = page.context().browser();
    const ctx2 = await browser.newContext({ viewport: { width: 800, height: 450 } });
    const page2 = await ctx2.newPage();
    const errors2 = [];
    page2.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors2.push(m.text()); });
    page2.on('pageerror', e => errors2.push(e.message));
    await page2.goto('file://' + path.resolve(__dirname, '../../voxel-dota.html') + '?debug=1');
    await page2.waitForFunction(() => window.GameAPI && document.querySelector('.card'));
    const play = await page2.evaluate(async rec => {
      const A = GameAPI;
      A.netNoRender(true);
      const ok = A.replayStart(rec);
      A.NET.speed = 16;
      const end = rec.meta.ticks;
      const t0 = performance.now();
      while (A.LS.n < end && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 20));
      A.NET.paused = true; A.G.paused = true;
      const blocked = A.netOrder({ type: 'move', x: (A.G.player ? A.G.player.x : 0) + 1, z: A.G.player ? A.G.player.z : 0 });
      return { ok, n: A.LS.n, hash: A.stateHash(), spectating: A.netIsSpectating(), role: A.NET.role, cmdsBlocked: blocked, hasPlayer: !!A.G.player, x: A.G.player && A.G.player.x };
    }, r.rec);
    await ctx2.close();
    if (errors2.length) throw new Error('replay page: ' + errors2.slice(0, 4).join(' | '));
    assert(play.ok && play.role === 'replay' && play.spectating && play.hasPlayer, 'replay role ' + JSON.stringify(play));
    assert(play.n >= r.rec.meta.ticks, 'played to end ' + JSON.stringify(play));
    assert(play.hash === r.hashLive, 'hash match ' + JSON.stringify({ live: r.hashLive, play: play.hash, nLive: r.tickLive, nPlay: play.n }));
    assert(play.cmdsBlocked === '观战中', 'blocked got ' + play.cmdsBlocked);
    return `rec ${r.tickLive} ticks / ${r.rec.log.length} cmd-frames / cp@${r.cps.latest.n} · replay hash ok · cmds blocked`;
  });

  multi('B26 spectator: late join watches without commands; state matches host', 2, async pages => {
    const [h, s] = pages;
    await Promise.all(pages.map(p => p.evaluate(() => GameAPI.netNoRender(true))));
    await L.connectAll([h], ['Host']);
    await L.pick(h, 'axe');
    await h.evaluate(() => GameAPI.lobbyAct('fill', { diff: 0 }));
    await L.startMatch([h]);
    await h.evaluate(() => GameAPI.netSpeed(6));
    await waitTick(h, 120);
    const hostN0 = await h.evaluate(() => GameAPI.LS.n);
    await s.evaluate(() => { document.getElementById('lbName').value = 'Viewer'; });
    await s.click('#mtJoin');
    await h.click('#nhInv');
    await h.waitForFunction(() => { const c = document.querySelector('#invList .inv .code'); return c && c.value.startsWith('VD1O'); });
    const offer = await h.$eval('#invList .inv .code', e => e.value);
    await s.fill('#jOffer', offer); await s.click('#jGo');
    await s.waitForFunction(() => document.getElementById('jAns').value.startsWith('VD1A'));
    await h.fill('#invList .inv .ans', await s.$eval('#jAns', e => e.value));
    await h.click('#invList .inv .ok');
    await s.waitForFunction(() => GameAPI.NET.ff === true || (GameAPI.G.started && GameAPI.NET.spectating), null, { timeout: 30000 });
    await s.waitForFunction(() => GameAPI.G.started && !GameAPI.NET.ff, null, { timeout: 120000 });
    const info = await s.evaluate(() => {
      if (!GameAPI.G.player && GameAPI.G.heroes[0]) GameAPI.spectateFollow(GameAPI.G.heroes[0]);
      const P = GameAPI.G.player;
      return {
        spectating: GameAPI.netIsSpectating(), slot: GameAPI.NET.mySlot,
        blocked: GameAPI.netOrder({ type: 'move', x: (P ? P.x : 0) + 5, z: P ? P.z : 0 }),
        hero: P && P.def.id, n: GameAPI.LS.n, ffMs: GameAPI.NET.ffMs, ffTicks: GameAPI.NET.ffTicks, hasPlayer: !!P,
      };
    });
    assert(info.spectating && info.slot < 0 && info.hasPlayer, 'flags ' + JSON.stringify(info));
    assert(info.blocked === '观战中', 'blocked ' + JSON.stringify(info));
    assert(info.ffTicks >= hostN0 - 5 && info.n >= hostN0 - 5, 'FF caught up from host tick ' + hostN0 + ' ' + JSON.stringify(info));
    await h.evaluate(() => GameAPI.netSetPause(true));
    const hn = await h.evaluate(() => GameAPI.LS.n);
    await waitTick(s, hn);
    const hashes = await Promise.all([h, s].map(p => p.evaluate(() => GameAPI.stateHash())));
    assert(hashes[0] === hashes[1], 'hash ' + JSON.stringify(hashes));
    return `spectator FF ${info.ffTicks} ticks in ${info.ffMs.toFixed(0)}ms · synced@${hn} · cmds blocked`;
  });

  multi('B26 checkpoints: host records cps; rejoin FF verifies; final state matches', 2, async pages => {
    const [h, c] = pages;
    await Promise.all(pages.map(p => p.evaluate(() => GameAPI.netNoRender(true))));
    await L.connectAll(pages, ['Alice', 'Bob']);
    await L.pick(h, 'sven'); await L.pick(c, 'zeus'); await L.ready(c);
    await L.startMatch(pages);
    await c.evaluate(() => GameAPI.netAutoplay(true));
    await h.evaluate(() => GameAPI.netSpeed(6));
    const every = await h.evaluate(() => GameAPI.CP_EVERY);
    await waitTick(h, every + 40);
    const before = await h.evaluate(() => GameAPI.cpInfo());
    assert(before.count >= 1, 'host cps ' + JSON.stringify(before));
    await c.evaluate(() => GameAPI.netKill());
    await h.waitForFunction(() => GameAPI.G.heroes.find(x => x.def.id === 'zeus').netGone);
    await waitTick(h, (await h.evaluate(() => GameAPI.LS.n)) + 60);

    const ctx = pages[0].context();
    const r = await ctx.newPage();
    const errors = [];
    r.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    r.on('pageerror', e => errors.push(e.message));
    await r.goto(L.NURL); await r.waitForFunction(() => window.GameAPI && document.getElementById('mtJoin'));
    await r.evaluate(() => GameAPI.netNoRender(true));
    await r.evaluate(() => { document.getElementById('lbName').value = 'Bob'; });
    await r.click('#mtJoin');
    await h.click('#nhInv');
    await h.waitForFunction(() => { const c = document.querySelector('#invList .inv .code'); return c && c.value.startsWith('VD1O'); });
    const offer = await h.$eval('#invList .inv .code', e => e.value);
    await r.fill('#jOffer', offer); await r.click('#jGo');
    await r.waitForFunction(() => document.getElementById('jAns').value.startsWith('VD1A'));
    await h.fill('#invList .inv .ans', await r.$eval('#jAns', e => e.value));
    await h.click('#invList .inv .ok');
    await r.waitForFunction(() => GameAPI.NET.ff === true || GameAPI.G.started, null, { timeout: 30000 });
    await r.waitForFunction(() => GameAPI.G.started && !GameAPI.NET.ff, null, { timeout: 180000 });
    await h.waitForFunction(() => { const z = GameAPI.G.heroes.find(x => x.def.id === 'zeus'); return z && !z.netGone && !z.bot; }, null, { timeout: 20000 });
    const after = await r.evaluate(() => ({
      info: GameAPI.netInfo(), cp: GameAPI.cpInfo(), hero: GameAPI.G.player.def.id, gone: !!GameAPI.G.player.netGone, bot: !!GameAPI.G.player.bot,
    }));
    if (errors.length) throw new Error('rejoin: ' + errors.slice(0, 4).join(' | '));
    assert(after.hero === 'zeus' && !after.gone && !after.bot, 'retook ' + JSON.stringify(after));
    assert(after.cp.count >= 1, 'cps ' + JSON.stringify(after.cp));
    assert(after.info.ffTicks > every, 'FF span ' + JSON.stringify(after.info));
    assert(after.info.cpHits + after.info.cpMiss >= 1, 'cp verify ran ' + JSON.stringify(after.info));
    assert(after.info.cpMiss === 0, 'cp hashes match during FF ' + JSON.stringify(after.info));
    await h.evaluate(() => GameAPI.netSetPause(true));
    const hn = await h.evaluate(() => GameAPI.LS.n);
    await waitTick(r, hn);
    const hashes = await Promise.all([h, r].map(p => p.evaluate(() => GameAPI.stateHash())));
    assert(hashes[0] === hashes[1], 'post-rejoin hash ' + JSON.stringify(hashes));
    await r.close();
    return `cps ${before.count} · FF ${after.info.ffTicks}t/${after.info.ffMs.toFixed(0)}ms · hits ${after.info.cpHits} · resynced@${hn}`;
  });
};
