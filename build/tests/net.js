// build/tests/net.js — B11 LAN multiplayer: signalling codes, 2-player lobby → match (identical state, client orders,
// purchases, chat, pause, ping), disconnect → bot + rejoin, 3 humans + bots smoke at speed. Pages share one browser context
// and run ?netfake=1 (net/peer.js): codes are produced / applied by real RTCPeerConnections, the bytes then travel over a
// BroadcastChannel — this sandbox's Chrome policy (WebRtcIPHandling) exposes no local address for a real ICE connection.
const L = require('./netlib.js');
module.exports = ({ test, boot, assert }) => {
  const multi = (name, n, fn) => test(name, async page => {
    const errors = [], { ctx, pages } = await L.openPages(page.context().browser(), n, errors, { width: 800, height: 450 });
    try { const info = await fn(pages, errors); if (errors.length) throw new Error('console errors: ' + errors.slice(0, 6).join(' | ')); return info; }
    finally { await ctx.close(); }
  });
  const waitTick = (p, n) => p.waitForFunction(k => GameAPI.LS.n >= k, n, { timeout: 120000 });
  // pause the host, let every joiner drain its queue, then compare the real simulation state
  async function frozenCompare(pages) {
    const [h, ...cl] = pages;
    await h.evaluate(() => GameAPI.netSetPause(true));
    const n = await h.evaluate(() => GameAPI.LS.n);
    for (const c of cl) await waitTick(c, n);
    const ref = await h.evaluate(() => ({ u: GameAPI.netUnits(), hash: GameAPI.stateHash(), n: GameAPI.LS.n }));
    const out = [];
    for (const c of cl) {
      const r = await c.evaluate(() => ({ u: GameAPI.netUnits(), hash: GameAPI.stateHash(), n: GameAPI.LS.n }));
      let maxd = 0; const byId = new Map(r.u.map(x => [x[0], x]));
      for (const a of ref.u) { const b = byId.get(a[0]); if (!b) { maxd = 1e9; break; } maxd = Math.max(maxd, Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]), Math.abs(a[3] - b[3])); }
      out.push({ n: r.n, hostN: ref.n, units: r.u.length, hostUnits: ref.u.length, maxd, same: r.hash === ref.hash });
    }
    await h.evaluate(() => GameAPI.netSetPause(false));
    return out;
  }
  test('LAN codes: SDP strip/pack round trip, mDNS candidates, short codes, rebuilt SDP accepted, clear errors', async page => {
    await boot(page);
    const r = await page.evaluate(async () => {
      const pc = new RTCPeerConnection({ iceServers: [] }); pc.createDataChannel('vd', { negotiated: true, id: 0 });
      await pc.setLocalDescription(await pc.createOffer());
      const info = GameAPI.sdpParse(pc.localDescription.sdp);
      info.cands = [{ addr: '3f8c2a10-5b7e-4c1d-9a2b-0e6f4d8c7b21.local', port: 54321, typ: 'host' }, { addr: '192.168.1.23', port: 61000, typ: 'host' }];
      const code = await GameAPI.encodeCode('O', '3', info), back = await GameAPI.decodeCode('  请粘贴：\n' + code + '\n ');
      const pc2 = new RTCPeerConnection({ iceServers: [] }); pc2.createDataChannel('vd', { negotiated: true, id: 0 });
      let accepted = true; try { await pc2.setRemoteDescription({ type: 'offer', sdp: GameAPI.sdpBuild(back) }); await pc2.setLocalDescription(await pc2.createAnswer()); } catch (e) { accepted = e.message; }
      const errs = [];
      for (const bad of ['hello', 'VD1Oz!!!', code.slice(0, 40)]) { try { await GameAPI.decodeCode(bad); errs.push('no error'); } catch (e) { errs.push(e.message); } }
      pc.close(); pc2.close();
      return { len: code.length, code: code.slice(0, 12), same: back.ufrag === info.ufrag && back.pwd === info.pwd && back.fp.join() === info.fp.join() && back.setup === info.setup && back.id === '3',
        cands: back.cands, accepted, errs };
    });
    assert(r.same && r.accepted === true, 'round trip ' + JSON.stringify(r));
    assert(r.cands[0].addr === '3f8c2a10-5b7e-4c1d-9a2b-0e6f4d8c7b21.local' && r.cands[0].port === 54321 && r.cands[1].addr === '192.168.1.23', 'cands ' + JSON.stringify(r.cands));
    assert(r.len < 260 && r.code.startsWith('VD1O'), 'code length ' + r.len);
    assert(r.errs.every(e => /连接码/.test(e)), 'errors ' + JSON.stringify(r.errs));
    return `offer code ${r.len} chars (${r.code}…), rebuilt SDP accepted, errors: ${r.errs[0]}`;
  });
  multi('LAN 2 players: lobby → match, identical state, client move/attack orders, shop purchase, chat, host pause, ping', 2, async pages => {
    const [h, c] = pages;
    await L.connectAll(pages, ['Alice', 'Bob']);
    await L.pick(h, 'lina'); await L.pick(c, 'axe');
    const dup = await c.evaluate(() => document.querySelector('.lbHero[data-id="lina"]').classList.contains('taken'));
    await L.ready(c);
    await h.evaluate(() => { GameAPI.lobbyAct('bot', { i: 1, diff: 1 }); GameAPI.lobbyAct('bot', { i: 6, diff: 2 }); });
    await c.waitForFunction(() => GameAPI.LOB.slots.filter(s => s.k === 'b').length === 2);
    await L.startMatch(pages);
    const roles = await c.evaluate(() => ({ me: GameAPI.G.player.def.id, team: GameAPI.G.player.team, heroes: GameAPI.G.heroes.map(h => h.def.id + (h.bot ? '*' : '')) }));
    await waitTick(h, 60); await waitTick(c, 60);
    const s0 = await c.evaluate(() => { const P = GameAPI.G.player; return { x: P.x, z: P.z, gold: P.gold }; });
    // a real right-click on the client's 3D view (ui/input.js handleRight → wrapped issueOrder → LAN command)
    const tgt = { x: 330, y: 150 };   // ground above the HUD, near the camera focus
    await c.mouse.click(tgt.x, tgt.y, { button: 'right' });
    await c.waitForFunction(() => GameAPI.NET.stats.cmds >= 1).catch(async e => { throw new Error('right-click cmd: ' + JSON.stringify(await c.evaluate(() => [GameAPI.NET.stats, GameAPI.G.player.order, document.elementFromPoint(330, 150)?.id || document.elementFromPoint(330, 150)?.tagName]))); });
    // purchase through the real shop UI (B → click 治疗药膏)
    await c.keyboard.press('b'); await c.click('.stab[data-tab="consumable"]'); await c.click('.sitem[data-id="salve"]'); await c.keyboard.press('Escape');
    await waitTick(c, 150);
    const cmp1 = await frozenCompare(pages);
    const s1 = await h.evaluate(() => GameAPI.netHeroes().find(x => x.hero === 'axe'));
    // attack order on a unit (unit reference travels as an id)
    const att = await c.evaluate(() => { const P = GameAPI.G.player, e = GameAPI.units.filter(u => u.team === 0 && !u.dead && u.kind === 'melee').sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0]; GameAPI.netOrder({ type: 'attack', target: e }); return e.id; });
    await h.waitForFunction(id => { const o = GameAPI.LS.lastOrd, a = GameAPI.G.heroes.find(x => x.def.id === 'axe'); return o && o.u === a.id && o.type === 'attack' && o.t === id; }, att).catch(async e => { throw new Error('attack order: ' + att + ' ' + JSON.stringify(await h.evaluate(() => GameAPI.LS.lastOrd))); });   // the creep may die quickly, so check the executed order record
    // chat: team (Enter) from the client must not reach the enemy host; all chat (Shift+Enter) must
    await c.keyboard.press('Enter'); await c.keyboard.type('team secret'); await c.keyboard.press('Enter');
    await c.keyboard.press('Shift+Enter'); await c.keyboard.type('gg all'); await c.keyboard.press('Enter');
    await h.waitForFunction(() => document.getElementById('chatLog').textContent.includes('gg all')).catch(async e => { throw new Error('chat: ' + JSON.stringify(await h.evaluate(() => document.getElementById('chatLog').textContent)) + JSON.stringify(await c.evaluate(() => document.getElementById('chatLog').textContent))); });
    const chat = await h.evaluate(() => document.getElementById('chatLog').textContent);
    // client cannot pause; host pause stops everyone
    await c.keyboard.press('p'); const cErr = await c.evaluate(() => document.getElementById('errmsg').textContent);
    await h.keyboard.press('p'); await c.waitForFunction(() => GameAPI.G.paused && !document.getElementById('pause').classList.contains('hidden'));
    const nP = await h.evaluate(() => GameAPI.LS.n); await L.sleep(800); const nP2 = await h.evaluate(() => GameAPI.LS.n);
    await h.keyboard.press('p'); await c.waitForFunction(() => !GameAPI.G.paused);
    await L.sleep(2500);
    const ping = await c.evaluate(() => ({ ping: GameAPI.NET.myPing, hud: document.getElementById('nhTxt').textContent }));
    const info = await c.evaluate(() => GameAPI.netInfo());
    assert(dup, 'hero taken by the host must be disabled for the client');
    assert(roles.me === 'axe' && roles.team === 1 && roles.heroes.length === 4 && roles.heroes.filter(x => x.endsWith('*')).length === 2, 'roles ' + JSON.stringify(roles));
    assert(cmp1.every(x => x.same && x.maxd === 0 && x.n === x.hostN), 'state ' + JSON.stringify(cmp1));
    assert(Math.hypot(s1.x - s0.x, s1.z - s0.z) > 4, 'client hero moved on the host ' + JSON.stringify([s0, s1]));
    assert(s1.items.includes('salve') && s1.gold < s0.gold + 200, 'purchase ' + JSON.stringify(s1));
    assert(chat.includes('gg all') && !chat.includes('team secret'), 'chat ' + chat);
    assert(/只有房主/.test(cErr) && nP2 === nP, 'pause ' + JSON.stringify([cErr, nP, nP2]));
    assert(ping.ping !== undefined && /延迟/.test(ping.hud) && !info.desync.length, 'ping ' + JSON.stringify([ping, info]));
    return `roles ${roles.heroes.join(',')} · state equal at tick ${cmp1[0].n} (${cmp1[0].units} units) · axe moved ${Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(1)} · items ${s1.items.filter(Boolean)} · ${ping.hud}`;
  });
  multi('LAN disconnect → bot takes the hero; rejoin with a new code re-simulates and resyncs; host leaving ends the session', 3, async pages => {
    const [h, c, r] = pages;
    await L.connectAll([h, c], ['Alice', 'Bob']);
    await L.pick(h, 'sven'); await L.pick(c, 'zeus'); await L.ready(c);
    await L.startMatch([h, c]);
    await c.evaluate(() => GameAPI.netAutoplay(true));
    await waitTick(c, 200);
    if (process.env.NETDBG) console.log('  … playing');
    await c.evaluate(() => GameAPI.netKill());   // the joiner leaves (closes its connection)
    await h.waitForFunction(() => { const z = GameAPI.G.heroes.find(x => x.def.id === 'zeus'); return z.bot && z.netGone; }, null, { timeout: 15000 });
    const endC = await c.evaluate(() => !document.getElementById('netEnd').classList.contains('hidden') && document.getElementById('netEndTxt').textContent);
    const z0 = await h.evaluate(() => { const z = GameAPI.G.heroes.find(x => x.def.id === 'zeus'); return { x: z.x, z: z.z, mode: z.bot.mode }; });
    await waitTick(h, (await h.evaluate(() => GameAPI.LS.n)) + 240);
    const z1 = await h.evaluate(() => { const z = GameAPI.G.heroes.find(x => x.def.id === 'zeus'); return { x: z.x, z: z.z, thinks: z.bot.thinks, chat: document.getElementById('chatLog').textContent }; });
    // rejoin from a fresh page through the host's in-game 邀请 / 重连 panel
    if (process.env.NETDBG) console.log('  … dropped', JSON.stringify(z1));
    await r.evaluate(() => { document.getElementById('lbName').value = 'Bob'; }); await r.click('#mtJoin');
    await h.click('#nhInv');
    await h.waitForFunction(() => { const c = document.querySelector('#invList .inv .code'); return c && c.value.startsWith('VD1O'); });
    const offer = await h.$eval('#invList .inv .code', e => e.value);
    await r.fill('#jOffer', offer); await r.click('#jGo'); await r.waitForFunction(() => document.getElementById('jAns').value.startsWith('VD1A'));
    await h.fill('#invList .inv .ans', await r.$eval('#jAns', e => e.value)); await h.click('#invList .inv .ok');
    await r.waitForFunction(() => GameAPI.G.started && GameAPI.NET.started, null, { timeout: 30000 }).catch(async e => { throw new Error('rejoin: ' + JSON.stringify(await r.evaluate(() => [GameAPI.netInfo(), document.getElementById('jStatus').textContent, GameAPI.NET.byeWhy]).catch(x => x.message)) + ' host: ' + JSON.stringify(await h.evaluate(() => [GameAPI.netInfo(), document.getElementById('invList').textContent.slice(0, 200)]))); });
    if (process.env.NETDBG) console.log('  … rejoined, ff');
    const ffSeen = await r.evaluate(() => GameAPI.NET.ff || GameAPI.LS.n > 0);
    await r.waitForFunction(() => !GameAPI.NET.ff, null, { timeout: 120000 });
    if (process.env.NETDBG) console.log('  … ff done', JSON.stringify(await r.evaluate(() => GameAPI.netInfo())));
    await h.waitForFunction(() => { const z = GameAPI.G.heroes.find(x => x.def.id === 'zeus'); return !z.bot && !z.netGone; }, null, { timeout: 20000 });
    await waitTick(r, (await h.evaluate(() => GameAPI.LS.n)) + 30);
    const cmp = await frozenCompare([h, r]);
    const me = await r.evaluate(() => ({ hero: GameAPI.G.player.def.id, team: GameAPI.G.player.team, t: GameAPI.G.time }));
    await r.evaluate(() => GameAPI.netOrder({ type: 'move', x: GameAPI.G.player.x + 6, z: GameAPI.G.player.z }));
    await h.waitForFunction(() => GameAPI.G.heroes.find(x => x.def.id === 'zeus').order.type === 'move');
    // the host closes its page → the joiner sees a clear message (liveness timeout)
    await h.close();
    await r.waitForFunction(() => !document.getElementById('netEnd').classList.contains('hidden'), null, { timeout: 20000 });
    const endR = await r.evaluate(() => document.getElementById('netEndTxt').textContent);
    assert(endC && /对局无法继续/.test(endC), 'leaver end text ' + endC);
    assert(Math.hypot(z1.x - z0.x, z1.z - z0.z) > 2 || z1.thinks > 3, 'bot controls the dropped hero ' + JSON.stringify([z0, z1]));
    assert(/断开了连接/.test(z1.chat), 'drop notice ' + z1.chat);
    assert(ffSeen && me.hero === 'zeus' && me.team === 1 && cmp.every(x => x.same && x.maxd === 0), 'rejoin ' + JSON.stringify([me, cmp]));
    assert(/房主/.test(endR) && /无法继续/.test(endR), 'host left ' + endR);
    return `drop → bot (moved ${Math.hypot(z1.x - z0.x, z1.z - z0.z).toFixed(1)}), rejoin at ${me.t.toFixed(0)} s resynced (tick ${cmp[0].n}, ${cmp[0].units} units identical) · host left: "${endR.slice(0, 30)}…"`;
  });
  multi('LAN smoke: 3 humans + 7 bots (5v5), autoplaying humans, x4 speed for 4+ game minutes — no desync, no errors', 3, async pages => {
    const [h, a, b] = pages;
    await L.connectAll(pages, ['Host', 'Ann', 'Ben']);
    await L.pick(h, 'cm'); await L.pick(a, 'lina'); await L.pick(b, 'axe');
    await h.evaluate(() => { const s = GameAPI.LOB.slots, ai = s.findIndex(x => x.name === 'Ann'), bi = s.findIndex(x => x.name === 'Ben'); if (ai < 5) GameAPI.lobbyAct('fill', { diff: 1 }); });
    await L.ready(a); await L.ready(b);
    await h.evaluate(() => GameAPI.lobbyAct('fill', { diff: 1 }));
    await L.startMatch(pages);
    for (const p of pages) await p.evaluate(() => GameAPI.netAutoplay(true));
    await h.evaluate(() => GameAPI.netSpeed(4));
    const t0 = Date.now(); let last = 0;
    while (true) {
      await L.sleep(5000);
      const st = await h.evaluate(() => ({ t: GameAPI.G.time, n: GameAPI.LS.n, desync: GameAPI.NET.desync.length, over: GameAPI.G.over }));
      if (st.desync || st.t >= 250 || st.over || Date.now() - t0 > 330000) { last = st; break; }
    }
    const cmp = await frozenCompare(pages);
    const sum = await h.evaluate(() => ({ heroes: GameAPI.G.heroes.map(x => `${x.def.id}${x.bot ? '*' : ''} L${x.level} ${x.kills}/${x.deaths}`), cmds: GameAPI.NET.stats.cmds, frames: GameAPI.NET.stats.frames }));
    const cl = await Promise.all([a, b].map(p => p.evaluate(() => ({ cmds: GameAPI.NET.stats.cmds, desync: GameAPI.NET.desync.length }))));
    assert(last.t >= 240 && !last.desync && cmp.every(x => x.same && x.maxd === 0) && cl.every(x => !x.desync && x.cmds > 20), 'smoke ' + JSON.stringify([last, cmp, cl, sum]));
    return `${(last.t / 60).toFixed(1)} game min in ${((Date.now() - t0) / 1000).toFixed(0)} s · tick ${cmp[0].n} identical on 3 peers (${cmp[0].units} units) · client cmds ${cl.map(x => x.cmds)} · ${sum.heroes.join(', ')}`;
  });
};
