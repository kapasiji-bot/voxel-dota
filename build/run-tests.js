// build/run-tests.js — headless scenario tests. Usage: node build/run-tests.js [filter]
// Each scenario gets a fresh page (file://…/voxel-dota.html?debug=1), pauses the real-time loop and drives the sim with GameAPI.step().
const { chromium } = require('playwright-core');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../voxel-dota.html') + '?debug=1';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const SHOT = path.resolve(__dirname, '../screenshot-4-refactor-ingame.png');
const scenarios = [];
const test = (name, fn) => scenarios.push({ name, fn });

// ---------- helpers injected into the page ----------
async function boot(page, hero) {
  await page.goto(URL); await page.waitForFunction(() => window.GameAPI && document.querySelector('.card'));
  if (hero) await page.evaluate(h => { GameAPI.startGame(h); GameAPI.pause(); GameAPI.record(true); }, hero);
}
function assert(c, msg) { if (!c) throw new Error(msg); }

test('boot: select screen, registry, no errors', async page => {
  await boot(page);
  const r = await page.evaluate(() => ({ cards: document.querySelectorAll('.card').length, heroes: Object.keys(GameAPI.HERO_DEFS), items: Object.keys(GameAPI.ITEM_DEFS) }));
  assert(r.cards === r.heroes.length && r.heroes.includes('axe') && r.heroes.includes('lina'), 'hero cards ' + JSON.stringify(r));
  assert(!r.heroes.includes('template'), '_template.js must not be bundled');
  assert(r.items.length === 52 && ['dust', 'tp', 'ward_obs', 'ward_sentry', 'circlet'].every(i => r.items.includes(i)) && r.heroes.length === 21, 'items/heroes ' + r.items + ' ' + r.heroes);
  return `heroes=${r.heroes} items=${r.items}`;
});

test('attack sync: swing impact == damage, 1:1 for every unit type', async page => {
  await boot(page, 'axe');
  const r = await page.evaluate(() => {
    const A = GameAPI; A.godMode(true); A.setLevel(6); A.learnSkill(2);
    A.simulate(25); // creeps meet mid
    const P = A.G.player; const c = A.units.find(u => !u.dead && u.team === 1 && u.lane === 'mid' && u.kind === 'melee');
    A.teleportHero(c.x - 2, c.z + 2); A.issueAttack(c);
    A.clearLog(); A.simulate(45);
    const L = A.getLog(), by = t => L.filter(e => e.type === t);
    const starts = by('attackStart'), impacts = by('attackImpact'), swings = by('swingImpact'), cancels = by('attackCancel'), launches = by('projectileLaunch'), hits = by('projectileHit'), deaths = by('death');
    const atkDmg = by('damage').filter(e => e.attackId);
    const key = e => e.attackId;
    const mapOf = arr => { const m = new Map(); for (const e of arr) { if (!m.has(key(e))) m.set(key(e), []); m.get(key(e)).push(e); } return m; };
    const S = mapOf(swings), I = mapOf(impacts), D = mapOf(atkDmg), LA = mapOf(launches), H = mapOf(hits);
    const fails = [];
    let diedOnImpact = 0, meleeImpacts = 0, rangedImpacts = 0, meleeSwingOk = 0, towerImpacts = 0;
    for (const e of impacts) {
      const u = A.units.find(x => x.id === e.unit);
      if (!e.ranged) {
        meleeImpacts++;
        const d = D.get(e.attackId) || [];
        const tgtWasDead = false;
        if (d.length > 1) fails.push('melee attack ' + e.attackId + ' dealt damage ' + d.length + ' times');
        if (d.length === 1 && d[0].f !== e.f) fails.push('melee damage frame mismatch ' + e.attackId);
        const s = S.get(e.attackId) || [];
        const diedNow = deaths.some(x => x.unit === e.unit && x.f === e.f);   // attacker killed on its own impact frame → no render, OK
        if (diedNow && s.length === 0) { meleeSwingOk++; diedOnImpact++; }
        else if (s.length !== 1 || s[0].f !== e.f) fails.push(`swing anim impact mismatch id=${e.attackId} kind=${e.kind} swings=${s.length}`); else meleeSwingOk++;
      } else {
        rangedImpacts++; if (e.kind === 'tower' || e.kind === 'fountain') towerImpacts++;
        const la = LA.get(e.attackId) || []; if (la.length !== 1 || la[0].f !== e.f) fails.push('ranged launch mismatch ' + e.attackId);
        if ((e.kind === 'ranged') && (S.get(e.attackId) || []).length !== 1 && !(deaths.some(x => x.unit === e.unit && x.f === e.f) && ++diedOnImpact)) fails.push('ranged creep anim release mismatch ' + e.attackId);
      }
    }
    const startedIds = new Set(starts.map(e => e.attackId));
    for (const [id, d] of D) {
      if (!startedIds.has(id)) continue;            // attack began before the log window
      if (!I.has(id)) fails.push('damage without impact ' + id);
      if (d.length > 1) fails.push('attack ' + id + ' damaged ' + d.length + 'x');
      const imp = I.get(id); if (imp && imp[0].ranged) { const h = H.get(id) || []; if (h.length !== 1 || h[0].f !== d[0].f) fails.push('projectile hit/damage mismatch ' + id); }
    }
    for (const [id, s] of S) if (!I.has(id)) fails.push('swing without impact ' + id);
    for (const c of cancels) if (D.has(c.attackId) || S.has(c.attackId)) fails.push('cancelled attack still hit/swung ' + c.attackId);
    // impact timing == attack point (scaled)
    const st = new Map(starts.map(e => [e.attackId, e]));
    let maxErr = 0; for (const e of impacts) { const s = st.get(e.attackId); if (s) maxErr = Math.max(maxErr, Math.abs((e.t - s.t) - s.point)); }
    if (maxErr > 1 / 30 + 1e-6) fails.push('impact time vs attack point error ' + maxErr);
    // per-unit cadence: a melee creep's consecutive swings are >= its attack interval apart
    const perUnit = {}; for (const e of swings) (perUnit[e.unit] = perUnit[e.unit] || []).push(e.t);
    let minGap = 9; for (const k in perUnit) { const u = A.units.find(x => x.id == k); const a = perUnit[k]; for (let i = 1; i < a.length; i++) if (u && u.kind === 'melee') minGap = Math.min(minGap, a[i] - a[i - 1]); }
    if (minGap < 1 - 1e-6) fails.push('melee creep swung faster than its attack interval: ' + minGap);
    return { fails: fails.slice(0, 8), nFails: fails.length, starts: starts.length, meleeImpacts, meleeSwingOk, diedOnImpact, rangedImpacts, towerImpacts, damage: atkDmg.length, cancels: cancels.length, hits: hits.length, maxErr, minGap };
  });
  assert(r.nFails === 0, JSON.stringify(r));
  assert(r.meleeImpacts > 50 && r.rangedImpacts > 10, 'not enough attacks observed ' + JSON.stringify(r));
  return `starts=${r.starts} meleeImpacts=${r.meleeImpacts} (anim 1:1 ${r.meleeSwingOk}) rangedImpacts=${r.rangedImpacts} (towers ${r.towerImpacts}) attackDamage=${r.damage} projectileHits=${r.hits} cancels=${r.cancels} maxTimingErr=${r.maxErr.toFixed(4)}s minMeleeGap=${r.minGap.toFixed(3)}s`;
});

test('attack cycle: cancel before attack point, attack speed scales windup', async page => {
  await boot(page, 'axe');
  const r = await page.evaluate(() => {
    const A = GameAPI, P = A.G.player; A.godMode(true);
    const c = A.spawnUnit('melee', 1, -40, 40); c.wps = [{ x: -40, z: 40 }]; c.wp = 0;
    A.teleportHero(-40, 42.2); A.issueAttack(c); A.step(3);              // windup started
    const started = A.getLog('attackStart').filter(e => e.unit === P.id);
    A.issueMove(-50, 50); A.step(2);
    const cancel = A.getLog('attackCancel').filter(e => e.unit === P.id);
    const dmg = A.getLog('damage').filter(e => e.src === P.id);
    A.step(30);
    const p1 = P.atk ? null : 0;
    // attack speed: level 25 Axe has much more agility → shorter windup
    const pt1 = A.getLog('attackStart').filter(e => e.unit === P.id)[0].point;
    A.setLevel(25); A.giveItem('claymore'); A.issueAttack(c); A.clearLog(); A.step(40);
    const pt2 = A.getLog('attackStart').filter(e => e.unit === P.id)[0];
    return { started: started.length, cancel: cancel.length, cancelReason: cancel[0] && cancel[0].reason, dmgDuringCancel: dmg.length, pt1, pt2: pt2 && pt2.point, mult: P.atkSpeedMult };
  });
  assert(r.started === 1 && r.cancel === 1 && r.dmgDuringCancel === 0, 'cancel ' + JSON.stringify(r));
  assert(r.pt2 < r.pt1 * 0.85, 'windup should shrink with attack speed ' + JSON.stringify(r));
  return `cancel reason=${r.cancelReason}, windup ${r.pt1.toFixed(3)}s → ${r.pt2.toFixed(3)}s at attackSpeed x${r.mult.toFixed(2)}`;
});

async function abilityScenario(page, hero) {
  await boot(page, hero);
  return page.evaluate(() => {
    const A = GameAPI, P = A.G.player; A.godMode(true); A.setLevel(18);
    const res = {};
    const fresh = () => { for (const u of A.units) if (!u.dead && !u.isBuilding && u.team === 1) A.killUnit(u, null); A.step(70);
      const cs = [[-40, 33], [-38, 34], [-42, 34], [-40, 36]].map(([x, z]) => { const c = A.spawnUnit('melee', 1, x, z); c.wps = [{ x, z }]; c.wp = 0; return c; });
      A.teleportHero(-40, 40); A.step(1); A.clearLog(); return cs; };
    P.abilities.forEach((ab, slot) => {
      const cs = fresh(); const d = ab.def; ab.lvl = Math.max(ab.lvl, 1);
      let target = null;
      if (d.passive) {
        if (d.id === 'helix') { for (const c of cs) c.target = P; A.simulate(8); }
        else { A.castAbility(0, cs[0]) || A.castAbility(0, { x: cs[0].x, z: cs[0].z }); A.step(30); }
      } else {
        target = d.target === 'unit' ? cs[0] : d.target === 'none' ? null : { x: cs[0].x, z: cs[0].z };
        if (d.id === 'cull') cs[0].hp = 100;
        const e = A.castAbility(slot, target); if (e) { res[d.id] = 'order error ' + e; return; }
        A.step(60);
      }
      const L = A.getLog();
      res[d.id] = { casts: L.filter(e => e.type === 'cast' && e.ability === d.id).length, dmg: Math.round(L.filter(e => e.type === 'damage' && e.ability === d.id).reduce((a, e) => a + e.amount, 0)),
        mods: [...new Set(L.filter(e => e.type === 'modifierAdd').map(e => e.mod))], deaths: L.filter(e => e.type === 'death').length, cd: +ab.cd.toFixed(1) };
    });
    return res;
  });
}
test('abilities: Axe (Q taunt, W DoT, E helix passive, R execute)', async page => {
  const r = await abilityScenario(page, 'axe');
  assert(r.call.casts === 1 && r.call.mods.includes('taunt') && r.call.mods.includes('axe_call'), 'call ' + JSON.stringify(r.call));
  assert(r.hunger.casts === 1 && r.hunger.dmg > 0 && r.hunger.mods.includes('axe_hunger'), 'hunger ' + JSON.stringify(r.hunger));
  assert(r.helix.dmg > 0, 'helix ' + JSON.stringify(r.helix));
  assert(r.cull.casts === 1 && r.cull.deaths >= 1, 'cull ' + JSON.stringify(r.cull));
  return JSON.stringify(r);
});
test('abilities: Lina (Q line, W stun, E stacks, R beam)', async page => {
  const r = await abilityScenario(page, 'lina');
  assert(r.slave.casts === 1 && r.slave.dmg > 0, 'slave ' + JSON.stringify(r.slave));
  assert(r.lsa.casts === 1 && r.lsa.dmg > 0 && r.lsa.mods.includes('stun'), 'lsa ' + JSON.stringify(r.lsa));
  assert(r.fiery.mods.includes('lina_fiery'), 'fiery ' + JSON.stringify(r.fiery));
  assert(r.laguna.casts === 1 && r.laguna.dmg > 0, 'laguna ' + JSON.stringify(r.laguna));
  return JSON.stringify(r);
});

test('items: buy/passives/actives/sell', async page => {
  await boot(page, 'axe');
  const r = await page.evaluate(() => {
    const A = GameAPI, P = A.G.player, out = {};
    A.setGold(10000); const s0 = P.speed, d0 = P.dmgMin;
    out.buyBoots = A.buyItem('boots'); A.step(1); out.speed = +(P.speed - s0).toFixed(2);
    A.buyItem('boots'); A.step(1); out.speed2 = +(P.speed - s0).toFixed(2);
    A.sellItem(1); out.claymore = A.buyItem('claymore'); A.step(1); out.dmg = Math.round(P.dmgMin - d0);
    A.buyItem('blink'); const bslot = P.items.findIndex(i => i && i.id === 'blink');
    A.teleportHero(-40, 40); const x0 = P.x; out.blinkErr = A.useItem(P, bslot, { x: -20, z: 40 }); out.blinkDist = +(P.x - x0).toFixed(1); out.blinkCd = P.items[bslot].cd;
    out.blinkAgain = A.useItem(P, bslot, { x: -40, z: 40 });
    A.teleportHero(-62, 62); A.buyItem('salve'); const ss = P.items.findIndex(i => i && i.id === 'salve'); P.hp = 100; A.useItem(P, ss, null); A.simulate(10.5);
    out.salveHeal = Math.round(P.hp - 100); out.salveConsumed = !P.items.some(i => i && i.id === 'salve');
    out.full = A.buyItem('bkb'); // 4 slots used
    const bk = P.items.findIndex(i => i && i.id === 'bkb'); A.useItem(P, bk, null); A.step(1);
    out.bkbMod = P.mods.some(m => m.def.id === 'bkb');
    out.magicBlocked = A.dealDamage(null, P, 100, 'magic') === 0;
    out.gold = Math.floor(P.gold);
    return out;
  });
  assert(r.buyBoots === null && r.speed === 1.5 && r.speed2 === 1.5, 'boots ' + JSON.stringify(r));
  assert(r.dmg === 21, 'claymore ' + JSON.stringify(r));
  assert(r.blinkErr === null && r.blinkDist > 15 && r.blinkAgain === '物品冷却中', 'blink ' + JSON.stringify(r));
  assert(r.salveHeal > 300 && r.salveConsumed, 'salve ' + JSON.stringify(r));
  assert(r.bkbMod && r.magicBlocked, 'bkb ' + JSON.stringify(r));
  return JSON.stringify(r);
});

test('win condition: tower chain invulnerability → destroy Dire ancient → victory', async page => {
  await boot(page, 'lina');
  const r = await page.evaluate(() => {
    const A = GameAPI, P = A.G.player, out = {};
    const t2 = A.units.find(u => u.team === 1 && u.kind === 'tower' && u.tier === 2 && u.lane === 'mid');
    out.t2Locked = A.dealDamage(P, t2, 500, 'pure') === 0;
    const anc = A.G.ancients[1]; out.ancLocked = A.dealDamage(P, anc, 500, 'pure') === 0;
    // destroy in legal order (no forced unlock)
    for (let pass = 0; pass < 6; pass++) for (const u of A.units.slice()) if (u.team === 1 && u.isBuilding && !u.dead && u.kind !== 'fountain' && u.kind !== 'ancient') A.dealDamage(P, u, 1e6, 'pure', { silent: true });
    out.ancUnlocked = !A.getState().buildings.find(b => b.kind === 'ancient' && b.team === 1).invuln;
    A.dealDamage(P, anc, 1e7, 'pure');
    const s = A.getState(); out.over = s.over; out.winner = s.winner; out.score = s.score;
    return out;
  });
  await page.waitForTimeout(1800);
  const title = await page.textContent('#endTitle'); const vis = await page.isVisible('#end');
  assert(r.t2Locked && r.ancLocked && r.ancUnlocked && r.over && r.winner === 0 && vis && title.includes('胜利'), JSON.stringify(r) + title);
  return `${JSON.stringify(r)} title=${title}`;
});
test('lose condition: Radiant ancient destroyed → defeat', async page => {
  await boot(page, 'axe');
  await page.evaluate(() => { GameAPI.destroyBuilding('ancient', 0); });
  await page.waitForTimeout(1800);
  const title = await page.textContent('#endTitle'), st = await page.evaluate(() => GameAPI.getState());
  assert(st.over && st.winner === 1 && title.includes('失败'), title);
  return 'title=' + title;
});

test('real input: right-click move, Q/W targeting via mouse, HUD learn button, screenshot', async page => {
  await boot(page);
  await page.click('#pick-lina'); await page.waitForTimeout(300);
  await page.click('.skill:nth-child(2) .learn');                    // learn W via HUD "+"
  await page.keyboard.press('Alt+q');                               // ... Q via hotkey (needs level 2 → give XP first)
  await page.evaluate(() => { GameAPI.pause(); GameAPI.record(true); GameAPI.godMode(true); GameAPI.setLevel(3); });
  await page.keyboard.press('Alt+q');
  await page.evaluate(() => { GameAPI.simulate(28); const P = GameAPI.G.player; const c = GameAPI.units.find(u => !u.dead && u.team === 1 && u.lane === 'mid' && u.kind === 'melee'); GameAPI.teleportHero(c.x - 9, c.z + 9); GameAPI.G.cam.x = P.x + 4; GameAPI.G.cam.z = P.z - 4; GameAPI.G.cam.dist = 50; });
  await page.waitForTimeout(400);
  const pos = await page.evaluate(() => { const P = GameAPI.G.player, s = GameAPI.toScreen(P.x + 6, 0, P.z + 3); return { s, x: P.x, z: P.z, lv: P.abilities.map(a => a.lvl) }; });
  await page.mouse.click(pos.s.x, pos.s.y, { button: 'right' });
  await page.evaluate(() => GameAPI.step(15));
  const moved = await page.evaluate(([x, z]) => Math.hypot(GameAPI.G.player.x - x, GameAPI.G.player.z - z), [pos.x, pos.z]);
  await page.waitForTimeout(200);
  const tgt = await page.evaluate(() => { const P = GameAPI.G.player; const c = GameAPI.units.filter(u => !u.dead && u.team === 1 && !u.isBuilding).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z))[0]; return GameAPI.toScreen(c.x, 1, c.z); });
  await page.keyboard.press('w'); await page.mouse.move(tgt.x, tgt.y); await page.mouse.click(tgt.x, tgt.y);
  await page.evaluate(() => GameAPI.step(25));
  await page.keyboard.press('q'); await page.mouse.click(tgt.x, tgt.y);
  await page.evaluate(() => GameAPI.step(8));
  await page.waitForTimeout(500);
  await page.screenshot({ path: SHOT });
  const casts = await page.evaluate(() => GameAPI.getLog('cast').map(e => e.ability));
  assert(pos.lv[0] === 1 && pos.lv[1] === 1, 'learn via HUD/Alt ' + pos.lv);
  assert(moved > 2, 'right-click move ' + moved);
  assert(casts.includes('lsa') && casts.includes('slave'), 'casts ' + casts);
  return `moved=${moved.toFixed(1)} casts=${casts} screenshot=${SHOT}`;
});

require('./tests/heroes-b2.js')({ test, boot, assert });
require('./tests/bots.js')({ test, boot, assert });
require('./tests/fog.js')({ test, boot, assert });
require('./tests/heroes-b3.js')({ test, boot, assert });
require('./tests/polish.js')({ test, boot, assert });
require('./tests/b4.js')({ test, boot, assert });
require('./tests/b5.js')({ test, boot, assert });
require('./tests/b6.js')({ test, boot, assert });
require('./tests/b7.js')({ test, boot, assert });
require('./tests/b8.js')({ test, boot, assert });
require('./tests/b9.js')({ test, boot, assert });
require('./tests/b10.js')({ test, boot, assert });
require('./tests/fullscreen.js')({ test, boot, assert });
require('./tests/net.js')({ test, boot, assert });

(async () => {
  const filter = process.argv[2];
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  let pass = 0, fail = 0;
  for (const s of scenarios) {
    if (filter && !s.name.includes(filter)) continue;
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    const t0 = Date.now();
    try {
      const info = await s.fn(page);
      if (errors.length) throw new Error('console errors: ' + errors.join(' | '));
      pass++; console.log(`PASS  ${s.name}  (${Date.now() - t0}ms)\n      ${info || ''}`);
    } catch (e) { fail++; console.log(`FAIL  ${s.name}\n      ${e.message.slice(0, 1500)}`); }
    await page.close();
  }
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
