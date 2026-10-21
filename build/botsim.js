// build/botsim.js — headless bot-vs-bot simulation report. Usage: node build/botsim.js [minutes=20] [diff=1] [picks=id,id,…|-]
// With picks (dire bots first, then allies) it also records casts and prints per-ability counts. Always prints B7 item buys / uses / held.
// Every 5 game-minutes it renders a frame and samples the JS heap after a forced GC (CDP) plus live object counts
// (units, particles, projectiles, effects, timers, scene objects, GPU geometries) — a memory-growth check.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html') + '?debug=1';
(async () => {
  const min = +(process.argv[2] || 20), diff = +(process.argv[3] || 1), picks = process.argv[4] && process.argv[4] !== '-' ? process.argv[4].split(',') : null;
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  const cdp = await p.context().newCDPSession(p);
  await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelector('.card'));
  const t0 = Date.now();
  await p.evaluate(([diff, picks]) => { const A = GameAPI; A.startGame('axe', { enemies: 5, allies: 4, diff, picks: picks || undefined }); A.pause(); A.setPlayerBot(true, diff, 'mid'); A.record(!!picks); window.__casts = {}; }, [diff, picks]);
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const h = await cdp.send('Runtime.getHeapUsage'); return +(h.usedSize / 1048576).toFixed(1); };
  const mem = [{ m: 0, heapMB: await heap() }], snaps = [];
  for (let m = 1; m <= min; m++) {
    const s = await p.evaluate(([m, picks]) => {
      const A = GameAPI; if (A.G.over) return null; A.simulate(60, 1 / 20);
      if (picks) { const c = window.__casts; for (const e of A.getLog('cast')) c[e.ability] = (c[e.ability] || 0) + 1; for (const e of A.getLog('botUlt')) c['botUlt:' + e.ability] = (c['botUlt:' + e.ability] || 0) + 1; for (const e of A.getLog('botCombo')) c['combo:' + e.combo + ':' + e.step] = (c['combo:' + e.combo + ':' + e.step] || 0) + 1; A.clearLog(); }
      const st = A.getState();
      return { m, score: st.score.join(':'), kills: [0, 1].map(t => st.heroes.filter(h => h.team === t).reduce((a, h) => a + h.k, 0)).join(':'),
        lv: st.heroes.map(h => h.level).join(','), lh: st.heroes.map(h => h.lh).join(','), modes: st.heroes.map(h => h.mode && h.mode[0]).join(''), plan: (A.G.teamAI || []).map(p => p.mode.slice(0, 2) + (p.phase ? p.phase[0] : '') + (p.target ? ':' + p.target.name : '')).join(' '), ri: m % 5 === 0 ? A.renderInfo() : null };
    }, [m, picks]);
    if (!s) break;
    const ri = s.ri; delete s.ri; console.log(JSON.stringify(s));
    if (m === 20 || m === 35 || m === min) snaps.push(await p.evaluate(m => { const G = GameAPI.G; const late = {}; for (const h of G.heroes) for (const x of h.items) if (x && x.def.cost >= 3000) late[x.id] = (late[x.id] || 0) + 1;
      return { m, lv: [0, 1].map(t => +(G.heroes.filter(h => h.team === t).reduce((a, h) => a + h.level, 0) / 5).toFixed(1)), maxLv: Math.max(...G.heroes.map(h => h.level)), late }; }, m));
    if (ri) mem.push({ m, heapMB: await heap(), units: ri.units, live: ri.live, particles: ri.particles, proj: ri.projectiles, effects: ri.effects, timers: ri.timers, objs: ri.objs, geos: ri.geos, calls: ri.calls, tris: ri.tris });
  }
  if (!snaps.length || snaps[snaps.length - 1].end === undefined) snaps.push(await p.evaluate(() => { const G = GameAPI.G; const late = {}; for (const h of G.heroes) for (const x of h.items) if (x && x.def.cost >= 3000) late[x.id] = (late[x.id] || 0) + 1;
    return { end: +(G.time / 60).toFixed(1), lv: [0, 1].map(t => +(G.heroes.filter(h => h.team === t).reduce((a, h) => a + h.level, 0) / 5).toFixed(1)), maxLv: Math.max(...G.heroes.map(h => h.level)), late }; }));
  const r = await p.evaluate(() => ({ casts: window.__casts, over: GameAPI.G.over, winner: GameAPI.G.winner, heroes: GameAPI.getHeroes() }));
  if (picks) console.log('casts', JSON.stringify(r.casts));
  // B7: item purchases (bot b.buys, finished items only) and bot active-item uses (b.itemUses) summed over all heroes
  const it = await p.evaluate(() => { const buys = {}, uses = {}, held = {}; const B7 = /^(dagon[2-5]?|mekansm|scepter|force|euls|glimmer|heart|scythe|pipe|daedalus|butterfly|mkb)$/;
    for (const h of GameAPI.G.heroes) { const b = h.bot || {}; for (const k in b.buys || {}) if (B7.test(k)) buys[k] = (buys[k] || 0) + b.buys[k];
      for (const k in b.itemUses || {}) uses[k] = (uses[k] || 0) + b.itemUses[k]; for (const x of h.items) if (x && B7.test(x.id)) held[x.id] = (held[x.id] || 0) + 1; }
    return { buys, uses, held }; });
  console.log('items', JSON.stringify(it));
  // B8: Roshan kills, neutral farm share (neutral gold / all hero gold earned), courier deliveries, late items held at the end
  const j = await p.evaluate(() => { const G = GameAPI.G, J = G.jg || { farm: [0, 0], nkills: 0 }, R = G.rosh || { kills: 0, log: [] };
    const earned = G.heroes.reduce((a, h) => a + (h.goldEarned || 0), 0), ng = G.heroes.reduce((a, h) => a + (h.neutralGold || 0), 0);
    const late = {}; for (const h of G.heroes) for (const x of h.items) if (x && (x.def.cost >= 3500 || x.id === 'aegis' || x.id === 'cheese')) late[x.id] = (late[x.id] || 0) + 1;
    const farmers = G.heroes.filter(h => h.neutralGold).map(h => h.def.id + ':' + h.neutralGold);
    return { roshKills: R.kills, roshLog: R.log.map(l => [Math.round(l.t / 60), l.team]), neutralKills: J.nkills, neutralGold: ng, farmShare: earned ? +(ng / earned).toFixed(3) : 0,
      courierDeliveries: G.courierDeliveries || 0, late, farmers }; });
  console.log('jungle', JSON.stringify(j));
  // B10: team plans (counts per mode), ganks, sieges, Roshan times, level / item snapshots, game end
  const tm = await p.evaluate(() => { const G = GameAPI.G, c = [{}, {}]; for (const l of G.teamLog || []) c[l.team][l.mode] = (c[l.team][l.mode] || 0) + 1;
    return { plans: c, ganks: G.teamGanks || [0, 0], roshan: (G.rosh ? G.rosh.log : []).map(l => [+(l.t / 60).toFixed(1), l.team]), end: G.over ? +(G.time / 60).toFixed(1) : null, winner: G.winner, score: G.score }; });
  console.log('team', JSON.stringify(tm)); console.log('snaps', JSON.stringify(snaps));
  console.log('over', r.over, 'winner', r.winner, 'secs', (Date.now() - t0) / 1000);
  for (const h of r.heroes) console.log(h.team, h.heroId, 'lv' + h.level, `${h.k}/${h.d}/${h.a}`, 'lh', h.lh, 'g', h.gold, h.items.join(','));
  console.log('memory', JSON.stringify(mem));
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'no errors');
  await b.close();
})();
