// build/tests/bots.js — computer-controlled hero scenarios (laning, last hits, retreat, spells on the player, kills/respawn,
// tower aggro rule, select-screen options, Tab scoreboard, full 20-minute 5v5 bot simulation).
module.exports = ({ test, boot, assert }) => {
  const near0 = (A) => { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(70); };

  test('bots: lane assignment, stay behind creep wave, last hits within 2 minutes', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI; A.startGame('axe', { enemies: 3, allies: 2, diff: 1 }); A.pause(); A.record(false);
      const bots = A.G.heroes.filter(h => h.bot); let behind = 0, samples = 0;
      for (let i = 0; i < 120; i++) {
        A.simulate(1, 1 / 20);
        if (i < 40) continue;
        for (const h of bots) {
          if (h.dead || h.bot.mode !== 'lane' || h.bot.front < 0) continue;
          samples++; const s = A.laneS(h.bot.lane, h.team, h.x, h.z); if (s <= h.bot.front + 2.5) behind++;
        }
      }
      return { heroes: bots.map(h => h.def.id), lanes: bots.map(h => h.team + ':' + h.bot.lane), lh: bots.map(h => h.lh), dn: bots.map(h => h.dn), laneDist: bots.map(h => +A.laneDist(h.x, h.z).toFixed(1)), modes: bots.map(h => h.bot.mode), behindPct: +(behind / Math.max(1, samples)).toFixed(2), samples, t: +A.G.time.toFixed(0) };
    }).catch(e => ({ error: e.message }));
    assert(!r.error, r.error);
    const dire = r.lanes.filter(l => l.startsWith('1:')).map(l => l.slice(2)).sort().join();
    assert(dire === 'bot,mid,top', 'dire lanes ' + r.lanes);
    // side lanes are hero-vs-hero (random picks from 10 heroes incl. strong harassers): a bot that loses its trade spends a fountain trip,
  // so require most (not all) bots to have last hits
  assert(r.lh.reduce((a, b) => a + b, 0) >= 10 && r.lh.filter(x => x > 0).length >= 3, 'last hits ' + JSON.stringify(r));
    assert(r.behindPct >= 0.8, 'behind wave ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('bots: retreat to fountain at low HP, heal, return to lane', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI; A.startGame('axe', { enemies: 1, diff: 1 }); A.pause(); A.record(true);
      const b = A.G.heroes.find(h => h.bot); A.simulate(50, 1 / 20);
      const dbg = { id: b.id, hero: b.def && b.def.id, dead50: b.dead, mode50: b.bot.mode, t: A.G.time, ord: b.order && b.order.type };
      A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && u.team === 0) A.killUnit(u, null);   // nothing chases it (XP first, then the HP drop)
      const x0 = b.x, z0 = b.z; b.hp = b.maxHp * 0.15;
      for (let i = 0; i < 30 && !b.bot.retreat; i++) A.step(1, 1 / 20);   // first think(s) after the HP drop (a salve may heal it later)
      dbg.hp1 = +(b.hp / b.maxHp).toFixed(2); dbg.retreat1 = b.bot.retreat; dbg.thinks = b.bot.thinks; dbg.paused = A.G.paused; dbg.deaths = A.getLog('death').filter(e => e.unit === b.id).length;
      const mode1 = b.bot.mode, f = A.G.fountains[1]; let reach = null, minHp = b.hp;
      for (let i = 0; i < 1800 && !reach; i++) { A.step(1, 1 / 20); minHp = Math.min(minHp, b.hp); if (Math.hypot(b.x - f.x, b.z - f.z) < 11) reach = A.G.time; }
      A.simulate(25, 1 / 20);
      return { dbg, mode1, startDist: +Math.hypot(x0 - f.x, z0 - f.z).toFixed(0), reachedFountain: !!reach, dead: b.dead, hpAfter: +(b.hp / b.maxHp).toFixed(2), modeAfter: b.bot.mode, distAfter: +Math.hypot(b.x - f.x, b.z - f.z).toFixed(0),
        modeLog: A.getLog('botMode').filter(e => e.unit === b.id).map(e => e.to).slice(-6) };
    });
    assert(r.mode1 === 'retreat' && r.reachedFountain && !r.dead, 'retreat ' + JSON.stringify(r));
    assert(r.hpAfter > 0.9 && r.modeAfter !== 'retreat' && r.distAfter > 15, 'heal + return ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('bots: every hero AI casts abilities on the player hero (metadata-driven)', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, out = {}; A.startGame('axe', { enemies: 0 }); A.pause(); A.godMode(true); A.setLevel(10); A.record(true);
      const P = A.G.player; A.G.nextWave = 1e9;
      for (const id of ['lina', 'sven', 'zeus', 'cm', 'lion', 'riki', 'am', 'puck', 'bh']) {
        for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null);
        const b = A.spawnBot(id, 1, 'mid', 2); A.setLevel(8, b); b.x = 5; b.z = -5; A.teleportHero(0, 0); P.hp = P.maxHp;   // just outside Radiant T1 range (bots won't dive a tower without a kill) A.issueOrder(P, { type: 'hold' }); A.step(1); A.clearLog();
        A.simulate(14, 1 / 20);
        const L = A.getLog(), casts = L.filter(e => e.type === 'cast' && e.unit === b.id && !e.passive);
        out[id] = { casts: [...new Set(casts.map(e => e.ability))], dmgOnP: Math.round(L.filter(e => e.type === 'damage' && e.src === b.id && e.tgt === P.id && e.ability).reduce((a, e) => a + e.amount, 0)),
          modsOnP: [...new Set(L.filter(e => e.type === 'modifierAdd' && e.unit === P.id && e.src === b.id).map(e => e.mod))], skills: b.abilities.map(a => a.lvl).join('') };
        A.killUnit(b, null); b.respawn = 1e9; b.bot = null;
      }
      return out;
    });
    for (const [id, v] of Object.entries(r)) assert(v.casts.length >= 1 && (v.dmgOnP > 0 || v.modsOnP.length), id + ' ' + JSON.stringify(v));
    return JSON.stringify(r);
  });

  test('bots: bot kills player, player kills bot, bounty/KDA/kill feed, DOTA-like respawn', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player || null; A.startGame('cm', { enemies: 0 }); A.pause(); A.record(true); A.G.nextWave = 1e9;
      const p = A.G.player, b = A.spawnBot('sven', 1, 'mid', 2); A.setLevel(10, b); b.x = 4; b.z = -4; A.teleportHero(0, 0); p.hp = 150; A.issueOrder(p, { type: 'hold' });
      for (let i = 0; i < 300 && !p.dead; i++) A.step(1, 1 / 20);
      const L = A.getLog('heroKill'); const k1 = L.find(e => e.victim === p.id);
      const o = { botKill: !!k1 && k1.killer === b.id, pDead: p.dead, deathScreen: !document.getElementById('death').classList.contains('hidden'), pResp: +p.respawn.toFixed(1), bKills: b.kills, pDeaths: p.deaths, feed: (document.getElementById('killfeed') || {}).textContent || '' };
      A.simulate(p.respawn + 1, 1 / 20); o.pRespawned = !p.dead; o.respawnEvt = A.getLog('respawn').some(e => e.unit === p.id);
      const g0 = p.gold; A.teleportHero(b.x - 2, b.z + 2); A.dealDamage(p, b, 1e5, 'pure');
      o.playerKill = A.getLog('heroKill').some(e => e.victim === b.id && e.killer === p.id); o.bounty = Math.round(p.gold - g0); o.pKills = p.kills; o.bDeaths = b.deaths;
      o.bResp = +b.respawn.toFixed(1); o.expectResp = +(Math.min(60, 5 + b.level * 2.4)).toFixed(1);
      A.simulate(b.respawn + 8, 1 / 20); o.bRespawned = !b.dead; o.bMode = b.bot.mode; o.bLeftFountain = Math.hypot(b.x - 67, b.z + 67) > 12;
      return o;
    });
    assert(r.botKill && r.pDead && r.deathScreen && r.bKills === 1 && r.pDeaths === 1 && r.feed.includes('击杀了'), 'bot kill ' + JSON.stringify(r));
    assert(r.pRespawned && r.respawnEvt, 'player respawn ' + JSON.stringify(r));
    assert(r.playerKill && r.bounty >= 150 && r.pKills === 1 && r.bDeaths === 1 && Math.abs(r.bResp - r.expectResp) < 0.2, 'player kill ' + JSON.stringify(r));
    assert(r.bRespawned && r.bLeftFountain, 'bot respawn ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('towers: enemy hero attacking a hero under a tower draws that tower\'s aggro', async page => {
    await boot(page, 'axe');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player; A.godMode(true); A.G.nextWave = 1e9;
      for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero) A.killUnit(u, null); A.step(70);
      const tw = A.units.find(u => u.kind === 'tower' && u.team === 0 && u.lane === 'mid' && u.tier === 1);
      A.teleportHero(tw.x + 3, tw.z - 3); A.issueOrder(P, { type: 'hold' });
      const c = A.spawnUnit('melee', 1, tw.x + 6, tw.z - 6); c.wps = [{ x: c.x, z: c.z }]; c.wp = 0; c.hp = c.maxHp = 9000; A.simulate(2);
      const before = tw.target && tw.target.id === c.id;
      const e = A.spawnUnit('hero', 1, tw.x + 8, tw.z - 8, { heroId: 'lina' }); A.issueOrder(e, { type: 'attack', target: P }); A.clearLog();
      A.simulate(3);
      return { towerOnCreepBefore: before, towerTarget: tw.target && tw.target.id === e.id ? 'enemyHero' : tw.target ? tw.target.kind : null, aggroEvt: A.getLog('towerAggro').length, towerHitHero: A.getLog('damage').some(x => x.src === tw.id && x.tgt === e.id) };
    });
    assert(r.towerOnCreepBefore && r.towerTarget === 'enemyHero' && r.aggroEvt >= 1 && r.towerHitHero, 'aggro ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('select screen: match options (enemies/allies/difficulty) + Tab scoreboard', async page => {
    await boot(page);
    await page.click('#matchOpts [data-k="enemies"] [data-v="5"]'); await page.click('#matchOpts [data-k="allies"] [data-v="4"]'); await page.click('#matchOpts [data-k="diff"] [data-v="2"]');
    await page.click('#pick-zeus .btn');
    await page.evaluate(() => { GameAPI.pause(); GameAPI.setTimeScale(1); GameAPI.simulate(90, 1 / 20); GameAPI.setTimeScale(0); GameAPI.resume(); });
    const r1 = await page.evaluate(() => ({ heroes: GameAPI.G.heroes.length, dire: GameAPI.G.heroes.filter(h => h.team === 1).length, diff: GameAPI.G.heroes.filter(h => h.bot).map(h => h.bot.diffIdx), dup: GameAPI.G.heroes.filter(h => h.team === 1 && h.def.id === 'zeus').length }));
    await page.keyboard.down('Tab'); await page.waitForTimeout(300);
    const r2 = await page.evaluate(() => { const s = document.getElementById('scoreboard'); return { visible: s && !s.classList.contains('hidden'), rows: s ? s.querySelectorAll('tr').length : 0, text: s ? s.textContent.slice(0, 60) : '' }; });
    await page.screenshot({ path: require('os').tmpdir() + '/vd-test-scoreboard.png' });
    await page.keyboard.up('Tab'); await page.waitForTimeout(150);
    const hidden = await page.evaluate(() => document.getElementById('scoreboard').classList.contains('hidden'));
    assert(r1.heroes === 10 && r1.dire === 5 && r1.diff.every(d => d === 2) && r1.dup === 0, 'options ' + JSON.stringify(r1));
    assert(r2.visible && r2.rows === 12 && hidden, 'scoreboard ' + JSON.stringify(r2));
    return JSON.stringify({ r1, r2 });
  });

  test('full 20-minute 5v5 bot-vs-bot simulation (player hero bot-controlled)', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, c = { heroKill: 0, buildingDestroyed: 0, respawn: 0, cast: 0, buy: 0, itemUse: 0, channelStart: 0 };
      // dire: two B4 heroes (summons / illusions), radiant: the other two — the rest random
      A.startGame('lina', { enemies: 5, allies: 4, diff: 1, picks: ['naga', 'lycan', null, null, null, 'ld', 'np'] }); A.pause(); A.setPlayerBot(true, 1, 'mid'); A.record(false);
      for (const k in c) A.on(k, () => c[k]++);
      const t0 = performance.now();
      const ev = { wardPlaced: 0, wardKill: 0, tpArrive: 0, tpCancel: 0, stashDeliver: 0 }, why = {}, buys = {}, salves = {};
      for (const k in ev) A.on(k, () => ev[k]++);
      A.on('botTp', e => why[e.why] = (why[e.why] || 0) + 1);
      A.on('buy', e => { buys[e.item] = (buys[e.item] || 0) + 1; if (e.item === 'salve') salves[e.unit] = (salves[e.unit] || 0) + 1; });
      let gs = 0, gn = 0, held = 0; const snap = {};
      const UTIL = { tp: 1, salve: 1, dust: 1, ward_obs: 1, ward_sentry: 1 };
      const roleStats = () => { const out = {};
        for (const h of A.G.heroes) { const r = A.botRole(h), o = out[r] || (out[r] = { n: 0, items: 0, core: 0, boots: 0, nw: 0, gold: 0, list: [] });
          const its = h.items.filter(Boolean).map(i => i.def).concat((h.stash || []).map(s => A.ITEM_DEFS[s.id])).filter(d => !UTIL[d.id]);
          o.n++; o.items += its.length; o.core += its.filter(d => d.cost >= 1000 && !d.uniqueGroup).length; o.boots += its.some(d => d.uniqueGroup === 'boots') ? 1 : 0;
          o.nw += h.gold + its.reduce((a, d) => a + d.cost, 0); o.gold += h.gold; o.list.push(h.def.id + ':' + its.map(d => d.id).join('+')); }
        for (const r in out) { const o = out[r]; for (const k of ['items', 'core', 'boots', 'nw', 'gold']) o[k] = +(o[k] / o.n).toFixed(k === 'nw' || k === 'gold' ? 0 : 2); }
        return out; };
      for (let m = 0; m < 40 && !A.G.over; m++) { A.simulate(30, 1 / 20);
        for (const h of A.G.heroes) { gs += h.gold; gn++; held = Math.max(held, A.countItem(h, 'salve')); }
        if (m === 19) snap.m10 = roleStats(); }
      snap.m20 = roleStats(); const per = {}; A.G.heroes.forEach(h => per[h.def.id] = (h.bot.buys || {}).tp || 0);
      const hs = A.getHeroes(), sv = A.G.heroes.map(h => salves[h.id] || 0);
      return { c, t: +A.G.time.toFixed(0), over: A.G.over, winner: A.G.winner, score: A.G.score, minLevel: Math.min(...hs.map(h => h.level)), maxLevel: Math.max(...hs.map(h => h.level)),
        kda: hs.map(h => `${h.heroId}${h.team ? 'D' : 'R'} ${h.k}/${h.d}/${h.a} lv${h.level}`), wallMs: Math.round(performance.now() - t0), items: hs.reduce((a, h) => a + h.items.filter(Boolean).length, 0),
        ev, tpWhy: why, buys, salveMax: Math.max(...sv), salveAvg: +(sv.reduce((a, b) => a + b, 0) / sv.length).toFixed(1), salveHeldMax: held, avgGold: Math.round(gs / gn), endGold: A.G.heroes.map(h => Math.round(h.gold)),
        tpHeld: A.G.heroes.filter(h => !h.dead && A.countItem(h, 'tp') > 0).length, roles: snap, tpPerBot: per, tpAvg: +(Object.values(per).reduce((a, b) => a + b, 0) / 10).toFixed(1),
        thinkHz: +(A.G.heroes.reduce((a, h) => a + (h.bot ? h.bot.thinks : 0), 0) / A.G.heroes.length / A.G.time).toFixed(2) };
    });
    assert(r.t >= 1199 || r.over, 'sim time ' + r.t);
    assert(r.c.buildingDestroyed >= 2 && r.c.heroKill >= 5 && r.c.respawn >= 3 && r.minLevel >= 6 && r.c.cast > 50 && r.c.buy >= 10 && r.thinkHz >= 3 && r.thinkHz <= 10, 'progress ' + JSON.stringify(r));
    assert(r.salveMax <= 8 && r.salveHeldMax <= 2, 'salve spam ' + JSON.stringify(r));
    assert(r.avgGold < 1500, 'unspent gold ' + r.avgGold);
    assert(r.ev.wardPlaced >= 4 && r.ev.tpArrive >= 4 && r.buys.tp >= 10, 'wards/TP ' + JSON.stringify(r));
    // economy tuning: ~4-7 TP purchases per bot, limited sentries / dust, carries finish boots + a core item, supports boots + utility
    assert(r.tpAvg >= 3 && r.tpAvg <= 8, 'TP purchases per bot ' + r.tpAvg + ' ' + JSON.stringify(r.tpPerBot));
    assert((r.buys.ward_sentry || 0) <= 20 && (r.buys.dust || 0) <= 12, 'sentry/dust spam ' + JSON.stringify(r.buys));
    const R = r.roles.m20; assert(!R.carry || (R.carry.boots >= 0.6 && R.carry.core >= 0.8), 'carry items ' + JSON.stringify(R.carry));
    assert(!R.support || R.support.boots >= 0.6, 'support items ' + JSON.stringify(R.support));
    return JSON.stringify(r);
  });
};
