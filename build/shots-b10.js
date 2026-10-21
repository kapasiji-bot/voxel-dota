// build/shots-b10.js — screenshots for B9 / B10 (1280×720): the options panel with volume sliders, a 5-hero bot group
// push sieging a tower, Roshan taken by a bot team. Output: screenshot-41..43-*.png.
const { chromium } = require('playwright-core'), path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html'), OUT = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], info = {};
  const page = async () => { const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    await p.goto(URL); await p.waitForFunction(() => window.GameAPI && document.querySelectorAll('.card img').length >= 21, null, { timeout: 60000 }); await p.waitForTimeout(300); return p; };
  const TEAM = (t, lvl) => { const A = GameAPI; A.startGame('sven', { enemies: 0, allies: 4, diff: 1, picks: ['am', 'axe', 'lina', 'lion'] }); A.pause(); A.setPlayerBot(true, 1, 'mid');
    A.step(1); A.G.time = t; A.record(true); for (const h of A.G.heroes) { A.setLevel(lvl, h); for (let k = 0; k < 4; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, h); h.hp = h.maxHp; h.mana = h.maxMana; }
    document.getElementById('msgs').innerHTML = '';
    window.CAM = (x, z, dist) => { for (const id of ['msgs', 'announce']) { const e = document.getElementById(id); e.innerHTML = ''; e.className = ''; } document.getElementById('death').classList.add('hidden'); A.G.cam.x = x; A.G.cam.z = z; A.G.cam.dist = dist; A.G.lock = false; A.setTimeScale(0); A.resume(); }; };
  // 1) options panel (F10) over a running match
  let p = await page();
  await p.evaluate(() => { const A = GameAPI; A.startGame('lina', { enemies: 2, allies: 1 }); A.pause(); A.simulate(30, 1 / 20); A.AU.set.sfx = 0.65; A.AU.set.amb = 0.35; A.auSave(); A.toggleOptions(true); A.resume(); A.setTimeScale(0); });
  await p.waitForTimeout(500); await p.screenshot({ path: OUT('screenshot-41-options-panel.png') }); await p.close();
  // 2) five bots pushing together: siege on the Dire tier-1 tower
  p = await page();
  info.push = await p.evaluate(TEAM => { eval('(' + TEAM + ')')(1000, 15); const A = GameAPI; A.rosh().unit && A.killUnit(A.rosh().unit, null); A.rosh().respawnAt = 1e9; A.revealAll(true); A.godMode(true);
    A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && (u.kind === 'melee' || u.kind === 'ranged')) A.killUnit(u, null); A.step(3);
    const t1 = A.units.find(u => u.kind === 'tower' && u.team === 1 && u.lane === 'mid' && u.tier === 1); t1.hp = t1.maxHp = 20000; A.setPlan(0, 'push', { target: t1, rally: A.rallyFor(0, t1), phase: 'gather' });
    let t = 0, n = 0, tg = null, dbg = []; while (t < 120) { if (tg && t % 5 < 0.25) dbg.push(A.G.heroes.map(h => h.dead ? 'X' : Math.round(Math.hypot(h.x - tg.x, h.z - tg.z)) + h.bot.mode[0]).join(',')); A.simulate(0.25, 1 / 20); t += 0.25; const p = A.teamPlan(0); tg = p.target;
      if (p.mode === 'push' && p.phase === 'siege' && tg && !tg.dead) { n = A.G.heroes.filter(h => !h.dead && Math.hypot(h.x - tg.x, h.z - tg.z) < 16.5).length; if (n >= 5 && tg.hp < tg.maxHp - 1500) break; } }
    const hs = A.G.heroes.filter(h => !h.dead && Math.hypot(h.x - tg.x, h.z - tg.z) < 17), cx = (hs.reduce((a, h) => a + h.x, 0) + tg.x) / (hs.length + 1), cz = (hs.reduce((a, h) => a + h.z, 0) + tg.z) / (hs.length + 1); CAM(cx, cz + 1.5, 36); for (const e of document.querySelectorAll('#killfeed > *')) e.remove(); return { t, n, target: tg && tg.name, hp: tg && Math.round(tg.hp), dbg }; }, TEAM.toString());
  await p.waitForTimeout(600); await p.screenshot({ path: OUT('screenshot-42-bot-group-push.png') }); await p.close();
  // 3) Roshan taken by the bot team
  p = await page();
  info.rosh = await p.evaluate(TEAM => { eval('(' + TEAM + ')')(950, 16); const A = GameAPI, PIT = A.PIT; A.G.nextWave = 1e9; A.revealAll(true);
    let t = 0; const R = A.rosh().unit; while (t < 120 && !R.dead) { A.simulate(0.25, 1 / 20); t += 0.25; const inPit = A.G.heroes.filter(h => !h.dead && A.inPit(h.x, h.z)).length; if (inPit >= 3 && R.hp < R.maxHp * 0.9) break; }
    CAM(PIT.x + 1, PIT.z + 3, 28); return { t, hp: Math.round(R.hp), max: R.maxHp, plan: A.teamPlan(0).mode, modes: A.G.heroes.map(h => h.bot.mode).join() }; }, TEAM.toString());
  await p.waitForTimeout(600); await p.screenshot({ path: OUT('screenshot-43-roshan-by-bots.png') }); await p.close();
  console.log(JSON.stringify(info));
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'no errors');
  await b.close();
})();
