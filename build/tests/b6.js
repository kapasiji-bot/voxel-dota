// build/tests/b6.js — B6: Queen of Pain, Silencer, Phantom Assassin + their engine features (cone waves, autocast orbs with
// right-click toggle, int-based damage, global spells, modifier onOwnerCast, Blur hiding, crit vs evasion, highest-crit rule)
// and the polish batch (bot combos, Fissure walls block vision, glowing pooled projectiles, perf budget, HUD fixes).
module.exports = ({ test, boot, assert }) => {
  const HELPERS = () => {
    const A = GameAPI;
    window.H6 = {
      A, P: A.G.player,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000, team = 1) { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      learnAll() { for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return A.G.player.abilities.map(a => a.lvl); },
      ev: (t, f) => A.getLog(t).filter(f || (() => true)),
      dmg: (id, tgt) => Math.round(A.getLog('damage').filter(e => e.ability === id && (!tgt || e.tgt === tgt.id)).reduce((a, e) => a + e.amount, 0)),
      bot(id, x, z, items = []) { const h = A.spawnBot(id, 1, 'mid', 2); h.respawn = 1e9; A.setLevel(16, h); h.x = x; h.z = z; if (h.model) h.model.position.set(x, 0, z);
        for (let k = 0; k < 4; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, h); for (const it of items) A.giveItem(it, h); h.mana = h.maxMana; return h; },
      foe(id, x, z) { const d = this.dummy(x, z, id, 20000, 0); d.hp = d.maxHp * 0.9; return d; },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); return H6.learnAll(); });
  }

  test('boot (B6): 21 hero cards incl. Queen of Pain, Silencer, Phantom Assassin; summon portraits framed', async page => {
    await boot(page);
    const r = await page.evaluate(() => ({ heroes: Object.keys(GameAPI.HERO_DEFS), cards: document.querySelectorAll('.card').length, ports: Object.keys(GameAPI.PORTRAITS).filter(k => k.startsWith('summon_')).length }));
    assert(r.heroes.length === 21 && r.cards === 21 && ['qop', 'silencer', 'pa'].every(h => r.heroes.includes(h)), 'heroes ' + JSON.stringify(r));
    assert(r.ports >= 5, 'summon portraits ' + r.ports);
    return JSON.stringify(r).slice(0, 120);
  });

  test('B6 Queen of Pain: Shadow Strike hit + DoT + decaying slow, Blink, Scream of Pain radius, Sonic Wave hits only inside the cone (pure damage)', async page => {
    await start(page, 'qop');
    const r = await page.evaluate(() => {
      const { A, P } = H6, o = {}; H6.at();
      const a = H6.dummy(-14, -20); A.castAbility(0, a); A.simulate(0.8, 1 / 20); const m = A.getMod(a, 'qop_strike'); const s0 = m ? m.props.msPct : 0;
      A.simulate(6.5, 1 / 20); const m2 = A.getMod(a, 'qop_strike');
      o.strike = { mod: !!m, s0, s1: m2 ? m2.props.msPct : null, hits: H6.ev('damage', e => e.ability === 'shadow_strike').length };
      H6.at(); A.castAbility(1, { x: -5, z: -20 }); A.simulate(0.8, 1 / 20); o.blink = +Math.hypot(P.x + 20, P.z + 20).toFixed(1);
      H6.at(); const near = H6.dummy(-16, -20), far = H6.dummy(-9, -20); A.castAbility(2, null); A.simulate(1, 1 / 20); o.scream = { near: H6.dmg('scream', near), far: H6.dmg('scream', far) };
      H6.at(); const in1 = H6.dummy(-16, -20), in2 = H6.dummy(-7, -16.5), out = H6.dummy(-17, -16.8), back = H6.dummy(-24, -20);
      A.castAbility(3, { x: -5, z: -20 }); A.simulate(1.6, 1 / 20);
      o.wave = { in1: H6.dmg('sonic_wave', in1), in2: H6.dmg('sonic_wave', in2), out: H6.dmg('sonic_wave', out), back: H6.dmg('sonic_wave', back), ev: H6.ev('coneWave').length };
      return o;
    });
    assert(r.strike.mod && r.strike.s0 < -0.4 && r.strike.s1 > r.strike.s0 && r.strike.hits >= 3, 'strike ' + JSON.stringify(r.strike));
    assert(r.blink > 13, 'blink ' + r.blink);
    assert(r.scream.near > 0 && r.scream.far === 0, 'scream ' + JSON.stringify(r.scream));
    assert(r.wave.in1 === 490 && r.wave.in2 === 490 && r.wave.out === 0 && r.wave.back === 0 && r.wave.ev === 1, 'wave ' + JSON.stringify(r.wave));
    return JSON.stringify(r);
  });

  test('B6 Silencer: Arcane Curse DoT extended on cast, Glaives orb (manual = one attack, autocast = every attack, int-based pure), Last Word delayed / early on cast, Global Silence (any range, not magic-immune)', async page => {
    await start(page, 'silencer');
    const r = await page.evaluate(() => {
      const { A, P } = H6, o = {}; H6.at();
      const a = H6.dummy(-14, -20); a.abilities[0].lvl = 1; a.mana = 1000;
      A.castAbility(0, { x: a.x, z: a.z }); A.simulate(0.8, 1 / 20); const t0 = A.getMod(a, 'sil_curse').t;
      A.issueOrder(a, { type: 'cast', slot: 0 }); A.simulate(0.5, 1 / 20); const m = A.getMod(a, 'sil_curse');
      o.curse = { t0: +t0.toFixed(2), t1: m ? +m.t.toFixed(2) : 0, ext: H6.ev('curseExtend').length }; A.simulate(6, 1 / 20); o.curse.dmg = H6.dmg('arcane_curse', a);
      H6.at(); const g = H6.dummy(-14, -20); A.simulate(0.5, 1 / 20); A.clearLog(); const m0 = P.mana;
      o.manualErr = A.castAbility(1, g); const mm = P.mana; A.simulate(4, 1 / 20);
      o.manual = { orbs: H6.ev('orbHit').length, attacks: H6.ev('attackImpact', e => e.unit === P.id).length };
      A.clearLog(); A.toggleAutocast(1, true); P.mana = P.maxMana; const m1 = P.mana; A.issueOrder(P, { type: 'attack', target: g }); A.simulate(4, 1 / 20);
      const hits = H6.ev('orbHit'); o.auto = { orbs: hits.length, attacks: H6.ev('attackImpact', e => e.unit === P.id).length, dmg: hits.length ? hits[0].dmg : 0, want: +(P.int * 0.6).toFixed(1), manaUsed: Math.round(m1 - P.mana + 4 * P.manaRegen) };
      A.issueOrder(P, { type: 'hold' });
      H6.at(); const l = H6.dummy(-14, -20); A.castAbility(2, l); A.simulate(2, 1 / 20); o.lwMid = A.hasState(l, 'silenced'); A.simulate(3, 1 / 20); o.lw = { ev: H6.ev('lastWord').map(e => e.early), sil: A.hasState(l, 'silenced'), dmg: H6.dmg('last_word', l) };
      H6.at(); const e2 = H6.dummy(-14, -20); e2.abilities[0].lvl = 1; e2.mana = 1000; A.castAbility(2, e2); A.simulate(0.6, 1 / 20); A.issueOrder(e2, { type: 'cast', slot: 0 }); A.simulate(0.5, 1 / 20);
      o.lwEarly = { ev: H6.ev('lastWord').map(e => e.early), sil: A.hasState(e2, 'silenced') };
      H6.at(); const far = H6.dummy(50, 50, 'lina'), imm = H6.dummy(-14, -20, 'sven'); A.addModifier(imm, { id: 'test_bkb', states: ['magicImmune'] }, imm);
      A.revealAll(false); A.castAbility(3, null); A.simulate(0.6, 1 / 20); A.revealAll(true);
      o.gs = { far: A.hasState(far, 'silenced'), imm: A.hasState(imm, 'silenced'), n: H6.ev('globalSilence')[0].n };
      return o;
    });
    assert(r.curse.ext === 1 && r.curse.t1 > r.curse.t0 + 2 && r.curse.dmg > 0, 'curse ' + JSON.stringify(r.curse));
    assert(r.manualErr === null && r.manual.orbs === 1 && r.manual.attacks >= 2, 'manual orb ' + JSON.stringify(r.manual));
    assert(r.auto.orbs >= 2 && r.auto.orbs === r.auto.attacks && Math.abs(r.auto.dmg - r.auto.want) < 0.5 && r.auto.manaUsed >= 15 * r.auto.orbs - 2, 'autocast ' + JSON.stringify(r.auto));
    assert(!r.lwMid && r.lw.ev.length === 1 && r.lw.ev[0] === false && r.lw.sil && r.lw.dmg > 0, 'last word ' + JSON.stringify(r.lw));
    assert(r.lwEarly.ev[0] === true && r.lwEarly.sil, 'last word early ' + JSON.stringify(r.lwEarly));
    assert(r.gs.far && !r.gs.imm && r.gs.n === 1, 'global silence ' + JSON.stringify(r.gs));
    return JSON.stringify(r);
  });

  test('B6 Phantom Assassin: Stifling Dagger, Phantom Strike blink + attack speed, Blur evasion + hidden at distance, Coup de Grace huge crit, evasion beats crit, only the highest crit applies', async page => {
    await start(page, 'pa');
    const r = await page.evaluate(() => {
      const { A, P } = H6, o = {}; H6.at();
      const a = H6.dummy(-12, -20); A.castAbility(0, a); A.simulate(1, 1 / 20); o.dagger = { slow: !!A.getMod(a, 'pa_dagger'), dmg: H6.dmg('dagger', a) };
      A.castAbility(1, a); A.simulate(0.4, 1 / 20); o.strike = { d: +Math.hypot(P.x - a.x, P.z - a.z).toFixed(2), as: !!A.getMod(P, 'pa_strike'), order: P.order.type, ev: H6.ev('phantomStrike').length };
      A.issueOrder(P, { type: 'hold' }); A.simulate(0.5, 1 / 20);
      const R = Math.random; Math.random = () => 0.05; A.clearLog(); A.issueOrder(P, { type: 'attack', target: a }); A.simulate(1.5, 1 / 20);
      o.coup = { crits: H6.ev('crit').map(e => e.mult), coup: H6.ev('coup').length, pop: A.floats.some(f => f.pop && f.size >= 40) };
      const ev = H6.dummy(-14, -18, 'lina'); A.addModifier(ev, { id: 'test_ev', props: { evasion: 1 } }, ev); A.step(1); A.clearLog();
      A.issueOrder(P, { type: 'attack', target: ev }); A.simulate(1.5, 1 / 20); o.vsEvasion = { miss: H6.ev('attackMiss', e => e.unit === P.id).length, crit: H6.ev('crit').length };
      Math.random = () => 0.3; A.issueOrder(P, { type: 'hold' }); A.clearLog(); A.issueOrder(a, { type: 'attack', target: P }); A.simulate(3, 1 / 20); Math.random = R;
      o.blurEv = { ev: P.evasion, miss: H6.ev('attackMiss', e => e.unit === a.id).length, hit: H6.ev('damage', e => e.src === a.id && e.attackId).length };
      const info = { dmg: 100, crit: 0 }; A.applyCrit(info, 2); A.applyCrit(info, 4.5); A.applyCrit(info, 3); o.highest = [Math.round(info.dmg), info.crit];
      H6.at(); A.revealAll(false); A.simulate(0.6, 1 / 20); o.blur = { far: A.isVisible(P, 1) };
      H6.dummy(P.x + 6, P.z); A.simulate(0.6, 1 / 20); o.blur.near = A.isVisible(P, 1); A.revealAll(true);
      return o;
    });
    assert(r.dagger.slow && r.dagger.dmg > 65, 'dagger ' + JSON.stringify(r.dagger));
    assert(r.strike.d < 2.2 && r.strike.as && r.strike.order === 'attack' && r.strike.ev === 1, 'phantom strike ' + JSON.stringify(r.strike));
    assert(r.coup.crits.length >= 1 && r.coup.crits.every(m => m === 4.5) && r.coup.coup >= 1 && r.coup.pop, 'coup ' + JSON.stringify(r.coup));
    assert(r.vsEvasion.miss >= 1 && r.vsEvasion.crit === 0, 'evasion beats crit ' + JSON.stringify(r.vsEvasion));
    assert(r.blurEv.ev === 0.5 && r.blurEv.miss >= 1 && r.blurEv.hit === 0, 'blur evasion ' + JSON.stringify(r.blurEv));
    assert(r.highest[0] === 450 && r.highest[1] === 4.5, 'highest crit ' + r.highest);
    assert(r.blur.far === false && r.blur.near === true, 'blur hide ' + JSON.stringify(r.blur));
    return JSON.stringify(r);
  });

  test('B6 polish: Fissure wall blocks vision while it stands; glowing ability projectiles from a bounded mesh pool', async page => {
    await start(page, 'es');
    const r = await page.evaluate(() => {
      const { A, P } = H6, o = {}; H6.at();
      o.before = A.sightBlocked(-20, -12); A.castAbility(0, { x: -20, z: -6 }); A.simulate(0.8, 1 / 20); o.during = A.sightBlocked(-20, -12); o.walls = A.WALLS.list.length;
      A.simulate(7, 1 / 20); o.after = A.sightBlocked(-20, -12);
      H6.at(); const d = H6.dummy(-12, -20); let maxLive = 0;
      for (let i = 0; i < 40; i++) { A.AB.projectile({ src: P, target: d, speed: 20, color: '#80d8ff', onHit() {} }); A.simulate(0.1, 1 / 20); maxLive = Math.max(maxLive, A.projectiles.length); }
      const glow = A.projectiles[0] && A.projectiles[0].mesh.children[0].visible; A.simulate(2, 1 / 20);
      o.pool = { maxLive, pool: A.projPool.length, glow, live: A.projectiles.length };
      return o;
    });
    assert(!r.before && r.during && r.walls === 1 && !r.after, 'wall vision ' + JSON.stringify(r));
    assert(r.pool.glow && r.pool.live === 0 && r.pool.pool <= r.pool.maxLive + 12, 'projectile pool ' + JSON.stringify(r.pool));
    return JSON.stringify(r);
  });

  test('B6 combos (scripted): ES blink → Fissure → Echo Slam, Enigma blink → Black Hole, Lion Hex → Earth Spike, QoP Blink → Sonic Wave', async page => {
    await boot(page, 'axe'); await page.evaluate(HELPERS);
    const r = await page.evaluate(() => {
      const { A } = H6, o = {}; A.godMode(true); A.revealAll(true); H6.clear(); A.teleportHero(-60, 60);
      const run = (id, items, fs) => { A.clearLog(); const f = fs.map(([fid, x, z]) => H6.foe(fid, x, z)); const h = H6.bot(id, 0, 0, items); h.bot.d = Object.assign({}, h.bot.d, { react: 1 }); A.simulate(5, 1 / 20);   // foes first: the bot's first think must see the whole group; react 1 = no random 5% skipped tick (made the combo flaky)
        const res = { steps: H6.ev('botCombo', e => e.unit === h.id).map(e => e.step).join(''), done: H6.ev('botComboDone', e => e.unit === h.id).map(e => e.ok), casts: A.getLog(e => (e.type === 'cast' || e.type === 'itemUse') && e.unit === h.id).map(e => e.ability || e.item).join(',') };
        A.killUnit(h, null); f.forEach(u => A.killUnit(u, null)); A.step(2); return res; };
      o.es = run('es', ['blink'], [['lina', 14, 0], ['cm', 15, 2], ['sven', 13.5, -2]]);
      o.enig = run('enigma', ['blink'], [['lina', -14, 0], ['cm', -15, 2], ['sven', -13.5, -2]]);
      o.lion = run('lion', [], [['axe', 8, 0]]);
      o.qop = run('qop', [], [['lina', 0, -13], ['cm', 2, -14]]);
      return o;
    });
    assert(r.es.steps === '012' && r.es.done[0] === true && /blink,fissure,echo/.test(r.es.casts), 'ES combo ' + JSON.stringify(r.es));
    assert(r.enig.steps === '01' && r.enig.done[0] === true && /blink,black_hole/.test(r.enig.casts), 'Enigma combo ' + JSON.stringify(r.enig));
    assert(r.lion.steps === '01' && /^hex,spike/.test(r.lion.casts), 'Lion combo ' + JSON.stringify(r.lion));
    assert(r.qop.steps === '01' && /qop_blink,sonic_wave/.test(r.qop.casts), 'QoP combo ' + JSON.stringify(r.qop));
    return JSON.stringify(r);
  });

  test('bots (B6): Silencer autocasts Glaives on heroes + Global Silence on a 2-hero fight, PA uses Dagger / Strike, QoP Shadow Strike', async page => {
    await boot(page, 'axe'); await page.evaluate(HELPERS);
    const r = await page.evaluate(() => {
      const { A } = H6, o = {}; A.godMode(true); A.revealAll(true); H6.clear(); A.teleportHero(-60, 60);
      const s = H6.bot('silencer', 0, 0); H6.foe('lina', 8, 0); H6.foe('cm', 9, 2); A.simulate(6, 1 / 20);
      o.sil = { auto: s.abilities[1].auto === true, orbs: H6.ev('orbHit', e => e.unit === s.id).length, gs: H6.ev('cast', e => e.unit === s.id && e.ability === 'global_silence').length };
      A.killUnit(s, null); H6.clear(); A.clearLog();
      const pa = H6.bot('pa', 20, 0), q = H6.bot('qop', 20, 10); H6.foe('lion', 28, 4); A.simulate(5, 1 / 20);
      o.pa = H6.ev('cast', e => e.unit === pa.id).map(e => e.ability); o.qop = H6.ev('cast', e => e.unit === q.id).map(e => e.ability);
      return o;
    });
    assert(r.sil.auto && r.sil.orbs >= 1 && r.sil.gs === 1, 'silencer bot ' + JSON.stringify(r.sil));
    assert(r.pa.includes('dagger') && r.pa.includes('phantom_strike'), 'pa bot ' + JSON.stringify(r.pa));
    assert(r.qop.includes('shadow_strike'), 'qop bot ' + JSON.stringify(r.qop));
    return JSON.stringify(r);
  });

  test('B6 HUD: right-click a Glaives icon toggles autocast (.auto), the targeted skill icon highlights, teamfight render budget', async page => {
    await start(page, 'silencer');
    await page.evaluate(() => { H6.at(); GameAPI.resume(); });
    await page.waitForTimeout(300);
    const box = await page.evaluate(() => { const r = document.querySelectorAll('#skills .skill')[1].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.mouse.click(box.x, box.y, { button: 'right' }); await page.waitForFunction(() => document.querySelectorAll('#skills .skill')[1].classList.contains('auto'), null, { timeout: 5000 }).catch(() => {});
    const a1 = await page.evaluate(() => ({ auto: GameAPI.G.player.abilities[1].auto, cls: document.querySelectorAll('#skills .skill')[1].classList.contains('auto') }));
    await page.mouse.move(800, 400); await page.keyboard.press('e'); await page.waitForFunction(() => document.querySelectorAll('#skills .skill')[2].classList.contains('active'), null, { timeout: 5000 }).catch(() => {});
    const act = await page.evaluate(() => ({ tg: !!GameAPI.G.targeting, cls: document.querySelectorAll('#skills .skill')[2].classList.contains('active') }));
    await page.keyboard.press('Escape');
    const perf = await page.evaluate(() => {
      const A = GameAPI; A.pause(); H6.clear();
      for (const [id, t, x, z] of [['qop', 1, 4, 0], ['pa', 1, 5, 2], ['lich', 1, 6, -2], ['es', 1, 4, 4], ['lycan', 1, 6, 3], ['lina', 0, -4, 0], ['ld', 0, -5, 2], ['naga', 0, -6, -2], ['wd', 0, -4, 3]]) {
        const h = A.spawnBot(id, t, 'mid', 1); A.setLevel(12, h); h.x = x; h.z = z; for (let k = 0; k < 3; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, h); h.mana = h.maxMana; }
      A.teleportHero(-2, 0); A.simulate(4, 1 / 20); A.G.cam.x = 0; A.G.cam.z = 0; A.G.cam.dist = 40; A.G.lock = false; A.renderInfo(); return A.renderInfo();
    });
    assert(a1.auto === true && a1.cls, 'autocast right-click ' + JSON.stringify(a1));
    assert(act.tg && act.cls, 'active skill highlight ' + JSON.stringify(act));
    assert(perf.tris < 110000 && perf.calls < 300, 'render budget ' + JSON.stringify(perf));
    return JSON.stringify({ a1, act, calls: perf.calls, tris: perf.tris, units: perf.live });
  });
};
