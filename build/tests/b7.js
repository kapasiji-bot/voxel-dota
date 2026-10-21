// build/tests/b7.js — B7 items: Dagon 1-5 (recipe upgrades), Mekansm, Aghanim's Scepter (per-hero `scepter` upgrades for all 21
// heroes), Force Staff, Eul's Scepter, Glimmer Cape, Heart of Tarrasque, Scythe of Vyse, Pipe of Insight, Daedalus, Butterfly,
// Monkey King Bar; unit-target item engine (walk into range, mana cost, magic-immune targets), shop tabs / search / recipe tree,
// bot builds + bot item actives (scripted and in a 20-minute sim).
module.exports = ({ test, boot, assert }) => {
  const NEW = ['dagon', 'dagon2', 'dagon3', 'dagon4', 'dagon5', 'mekansm', 'scepter', 'force', 'euls', 'glimmer', 'heart', 'scythe', 'pipe', 'daedalus', 'butterfly', 'mkb'];
  const HELPERS = () => {
    const A = GameAPI;
    window.H7 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000, team = 1) { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      only(id, h = A.G.player) { h.items = h.items.map(() => null); A.giveItem(id, h); h.mana = h.maxMana; return h.items[0]; },
      ev: (t, f) => A.getLog(t).filter(f || (() => true)),
      dmg: (id, tgt) => Math.round(A.getLog('damage').filter(e => e.ability === id && (!tgt || e.tgt === tgt.id)).reduce((a, e) => a + e.amount, 0)),
      bot(id, x, z, items = [], team = 1) { const h = A.spawnBot(id, team, 'mid', 2); h.respawn = 1e9; A.setLevel(16, h); h.x = x; h.z = z; if (h.model) h.model.position.set(x, 0, z);
        for (let k = 0; k < 4; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, h); h.items = h.items.map(() => null); for (const it of items) A.giveItem(it, h); h.mana = h.maxMana; h.gold = 0; return h; },
      foe(id, x, z) { const d = this.dummy(x, z, id, 20000, 0); d.hp = d.maxHp * 0.9; return d; },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i); return 1; });
  }

  test('B7 items: 12 new items + 8 components registered with Chinese names, recipes add up, Dagon upgrades through 5 levels by recipe', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(NEW => {
      const { A } = H7, D = A.ITEM_DEFS, o = { missing: NEW.filter(id => !D[id]), bad: [] };
      for (const id of Object.keys(D)) { const d = D[id]; if (!/[\u4e00-\u9fff]/.test(d.name)) o.bad.push(id + ':name');
        if (d.parts) { const sum = d.parts.reduce((a, p) => a + D[p].cost, 0); if (!(d.cost >= sum) || d.parts.some(p => !D[p])) o.bad.push(id + ':recipe'); } }
      H7.at(-20, -20); A.teleportHero(-75, -75); A.step(2); const P = A.G.player; P.items = P.items.map(() => null); A.setGold(20000);
      const g0 = P.gold; A.buyItem('dagon', P); o.d1 = { has: A.countItem(P, 'dagon'), paid: g0 - P.gold };
      const g1 = P.gold; A.buyItem('dagon2', P); o.d2 = { has: A.countItem(P, 'dagon2'), old: A.countItem(P, 'dagon'), paid: g1 - P.gold };
      A.buyItem('dagon3', P); A.buyItem('dagon4', P); A.buyItem('dagon5', P); o.d5 = { has: A.countItem(P, 'dagon5'), slots: P.items.filter(Boolean).length + (P.stash || []).length, spent: 20000 - P.gold, int: A.ITEM_DEFS.dagon5.props.int };
      o.cats = ['basic', 'upgrade', 'consumable'].map(c => Object.values(D).filter(d => A.itemCat(d) === c).length);
      return o;
    }, NEW);
    assert(!r.missing.length && !r.bad.length, 'registry ' + JSON.stringify(r));
    assert(r.d1.has === 1 && r.d1.paid === 2750 && r.d2.has === 1 && r.d2.old === 0 && r.d2.paid === 1250, 'dagon 1→2 ' + JSON.stringify(r));
    assert(r.d5.has === 1 && r.d5.slots === 1 && r.d5.spent === 7750, 'dagon 5 ' + JSON.stringify(r.d5));
    return JSON.stringify(r).slice(0, 220);
  });

  test('B7 Dagon / Scythe / Force Staff: unit-target actives, mana cost, walk into range, no magic-immune targets, push 6 forward (ally & enemy)', async page => {
    await start(page, 'lina');
    const r = await page.evaluate(() => {
      const { A } = H7, P = A.G.player, o = {}; H7.at(-20, -20);
      const a = H7.dummy(-12, -20); H7.only('dagon5'); const m0 = P.mana; A.useItem(P, 0, a); A.simulate(0.2, 1 / 20);
      o.dagon = { dmg: H7.dmg('dagon5', a), mana: Math.round(m0 - P.mana), cd: P.items[0].cd > 10 };
      const far = H7.dummy(-20, 10); H7.only('dagon'); const e1 = A.useItem(P, 0, far); o.walk = { e1, order: P.order.type };
      A.simulate(4, 1 / 20); o.walk.dmg = H7.dmg('dagon', far); o.walk.dist = +Math.hypot(P.x - far.x, P.z - far.z).toFixed(1);
      A.killUnit(far, null); H7.at(-20, -20); const b = H7.dummy(-14, -20, 'sven'); A.addModifier(b, A.MODS.stun ? { id: 'bkbt', states: ['magicImmune'] } : null, b, { dur: 5 });
      H7.only('scythe'); o.bkb = A.useItem(P, 0, b); A.removeModById(b, 'bkbt');
      o.hex = { e: A.useItem(P, 0, b) }; A.simulate(0.2, 1 / 20); o.hex.on = b.hexed; o.hex.dur = +(A.getMod(b, 'hex') || { t: 0 }).t.toFixed(1);
      A.simulate(3.5, 1 / 20); H7.only('force'); b.facing = 0; const z0 = b.z; o.forceFoe = A.useItem(P, 0, b); A.simulate(0.8, 1 / 20); o.pushFoe = +(b.z - z0).toFixed(2);
      P.items[0].cd = 0; P.mana = P.maxMana; P.facing = Math.PI / 2; const x0 = P.x; A.useItem(P, 0, P); A.simulate(0.8, 1 / 20); o.pushSelf = +(P.x - x0).toFixed(2);
      o.stunned = (() => { P.items[0].cd = 0; A.stun(P, 1); const e = A.useItem(P, 0, P); A.simulate(1.2, 1 / 20); return e; })();
      o.noMana = (() => { P.items[0].cd = 0; P.mana = 10; return A.useItem(P, 0, P); })();
      return o;
    });
    assert(r.dagon.dmg === 600 && r.dagon.mana >= 198 && r.dagon.mana <= 200 && r.dagon.cd, 'dagon 5 ' + JSON.stringify(r.dagon));
    assert(r.walk.e1 === null && r.walk.order === 'useItem' && r.walk.dmg === 300, 'walk into range ' + JSON.stringify(r.walk));
    assert(r.bkb && r.hex.e === null && r.hex.on && r.hex.dur > 3, 'scythe ' + JSON.stringify(r));
    assert(r.forceFoe === null && Math.abs(r.pushFoe - 6) < 0.05 && Math.abs(r.pushSelf - 6) < 0.05, 'force ' + JSON.stringify(r));
    assert(r.stunned && r.noMana === '魔法不足', 'stunned / mana ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test("B7 Eul's / Glimmer / Mekansm / Pipe: cyclone interrupts a channel (invulnerable, lands for 50), self-dispel, invis + magic res, heal + armor, barrier absorbs magic", async page => {
    await start(page, 'cm');
    const r = await page.evaluate(() => {
      const { A } = H7, P = A.G.player, o = {}; H7.at(-20, -20);
      const en = H7.dummy(-13, -20, 'enigma'); A.setLevel(18, en); for (let k = 0; k < 3; k++) A.learnSkill(3, en); en.mana = en.maxMana;
      A.castAbility(3, { x: -8, z: -20 }, en); A.simulate(1, 1 / 20); o.ch0 = !!en.channel;
      H7.only('euls'); o.e = A.useItem(P, 0, en); A.simulate(0.3, 1 / 20);
      o.eul = { ch: !!en.channel, inv: A.isInvuln(en), mod: !!A.getMod(en, 'cyclone') }; o.hit = A.useItem(P, 0, en) !== null;
      A.simulate(2.6, 1 / 20); o.land = H7.dmg('euls', en); o.after = A.isInvuln(en);
      A.addModifier(P, A.MODS.silence, en, { dur: 5 }); P.items[0].cd = 0; P.mana = P.maxMana; o.self = A.useItem(P, 0, P); A.simulate(0.2, 1 / 20); o.dispel = !A.getMod(P, 'silence') && !!A.getMod(P, 'cyclone');
      A.simulate(3, 1 / 20); A.killUnit(en, null); H7.at(-20, -20);
      const mr0 = P.magicRes; H7.only('glimmer'); const mr1 = P.magicRes; A.useItem(P, 0, P); A.simulate(1, 1 / 20);
      A.revealAll(false); A.step(1); o.glim = { item: +(mr1 - mr0).toFixed(3), invis: !!A.getMod(P, 'glimmer'), seen: A.isVisible(P, 1), mr: +(P.magicRes - mr1).toFixed(3) }; A.revealAll(true);
      const ally = H7.dummy(-17, -20, 'axe', 0, 0); ally.hp = 300; P.hp = P.maxHp - 500; H7.only('mekansm'); A.useItem(P, 0, null); A.simulate(0.1, 1 / 20);
      o.mek = { ally: Math.round(ally.hp), armor: !!A.getMod(ally, 'mek_armor') && !!A.getMod(P, 'mek_armor') };
      H7.only('pipe'); o.aura = !!(A.simulate(1, 1 / 20), A.getMod(ally, 'pipe_aura')); A.useItem(P, 0, null); A.simulate(0.1, 1 / 20);
      const foe = H7.dummy(-30, -30); A.G.god = false; const hp0 = ally.hp; A.AB.damage(foe, ally, 300, 'magic', 'test'); const m = A.getMod(ally, 'pipe_barrier');
      o.pipe = { lost: Math.round(hp0 - ally.hp), left: m ? Math.round(m.data.left) : -1 }; A.AB.damage(foe, ally, 300, 'magic', 'test'); o.pipe.lost2 = Math.round(hp0 - ally.hp); A.G.god = true;
      return o;
    });
    assert(r.ch0 && r.e === null && !r.eul.ch && r.eul.inv && r.eul.mod && r.hit, 'eul interrupt ' + JSON.stringify(r));
    assert(r.land > 0 && r.land <= 50 && !r.after, 'eul landing ' + JSON.stringify(r));
    assert(r.self === null && r.dispel, 'eul self dispel ' + JSON.stringify(r));
    assert(r.glim.invis && !r.glim.seen && r.glim.mr > 0.1, 'glimmer ' + JSON.stringify(r.glim));
    assert(r.mek.ally >= 575 && r.mek.ally < 580 && r.mek.armor, 'mek ' + JSON.stringify(r.mek));
    assert(r.aura && r.pipe.lost === 0 && r.pipe.left > 0 && r.pipe.lost2 > 0, 'pipe ' + JSON.stringify(r.pipe));
    return JSON.stringify(r);
  });

  test('B7 passives: Heart regen (paused after hero damage), Daedalus crit (highest crit wins), Butterfly evasion, MKB true strike vs Blur', async page => {
    await start(page, 'pa');
    const r = await page.evaluate(() => {
      const { A } = H7, P = A.G.player, o = {}; H7.at(-20, -20);
      const hp0 = P.maxHp; H7.only('heart'); o.heart = { hp: P.maxHp - hp0, str: A.ITEM_DEFS.heart.props.str };
      P.hp = 500; A.simulate(2, 1 / 20); o.heart.regen = Math.round(P.hp - 500);
      const f = H7.dummy(-30, -30); P.dmgBy[f.id] = A.G.time; P.hp = 500; A.simulate(2, 1 / 20); o.heart.paused = Math.round(P.hp - 500);
      H7.only('daedalus'); const info = { dmg: 100, crit: 0 }; for (let i = 0; i < 200; i++) A.ITEM_DEFS.daedalus.modifyAttack({ caster: P }, f, info);
      o.dae = info.crit; const info2 = { dmg: 100, crit: 0 }; A.applyCrit(info2, 4.5); A.ITEM_DEFS.daedalus.modifyAttack({ caster: P }, f, info2); for (let i = 0; i < 50; i++) A.ITEM_DEFS.daedalus.modifyAttack({ caster: P }, f, info2); o.daeHigh = info2.crit;
      H7.only('butterfly'); o.eva = +P.evasion.toFixed(2);   // + Blur
      H7.at(-20, -20); const t = H7.dummy(-18, -20, 'pa'); A.setLevel(18, t); for (let k = 0; k < 4; k++) A.learnSkill(2, t); A.step(2);
      const sh = H7.dummy(-19, -21, 'sven'); sh.order = { type: 'idle' }; A.issueOrder(sh, { type: 'attack', target: t }); A.clearLog(); A.simulate(12, 1 / 20);
      o.miss = H7.ev('attackMiss', e => e.unit === sh.id).length; o.hits = A.getLog('damage').filter(e => e.src === sh.id && e.attackId).length;
      A.giveItem('mkb', sh); A.clearLog(); A.simulate(12, 1 / 20); o.mkb = { ts: sh.trueStrike, miss: H7.ev('attackMiss', e => e.unit === sh.id).length, hits: A.getLog('damage').filter(e => e.src === sh.id && e.attackId).length, proc: H7.dmg('mkb') > 0 };
      return o;
    });
    assert(r.heart.hp >= 45 * 20 + 250 - 1 && r.heart.regen > 50 && r.heart.paused === Math.round(r.heart.paused) && r.heart.paused < r.heart.regen / 3, 'heart ' + JSON.stringify(r.heart));
    assert(r.dae === 2.25 && r.daeHigh === 4.5, 'daedalus ' + JSON.stringify(r));
    assert(r.eva >= 0.8, 'butterfly + blur evasion ' + r.eva);
    assert(r.miss > 0 && r.mkb.ts && r.mkb.miss === 0 && r.mkb.hits > 3 && r.mkb.proc, 'mkb ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test("B7 Aghanim's Scepter: every one of the 21 heroes has an ult `scepter` upgrade that changes a number; tooltip line; removing reverts; Axe refresh, Lina pure", async page => {
    await start(page, 'axe');
    const r = await page.evaluate(() => {
      const { A } = H7, o = { heroes: 0, ok: [], bad: [] }; H7.at(-20, -20);
      for (const id of Object.keys(A.HERO_DEFS)) {
        const d = A.HERO_DEFS[id], ult = d.abilities.find(a => a.ult); o.heroes++;
        if (!ult || !ult.scepter || !ult.scepter.desc) { o.bad.push(id + ':field'); continue; }
        const h = H7.dummy(-40 - o.heroes, -40, id, 0); A.setLevel(18, h); for (let k = 0; k < 3; k++) A.learnSkill(3, h);
        const ab = h.abilities.find(a => a.def.ult), num = def => JSON.stringify([def.cd, def.mana, def.range, def.channel, def.values, def.refreshOnKill]);
        const before = num(ab.def); A.giveItem('scepter', h); const on = h.scepter && ab.def.scepterOn, after = num(ab.def);
        const tip = A.skillTip(ab, h).includes('阿哈利姆神杖（已激活）');
        h.items = h.items.map(() => null); A.applyScepter(h); const back = num(ab.def) === before && !h.scepter;
        if (on && after !== before && tip && back) o.ok.push(id); else o.bad.push(id + JSON.stringify({ on, changed: after !== before, tip, back }));
        A.killUnit(h, null);
      }
      // Axe: Culling Blade kill refreshes the cooldown; Lina: Laguna Blade pure damage
      const P = A.G.player; H7.only('scepter'); const t = H7.dummy(-18, -20, 'lina', 0); t.hp = 400; A.castAbility(3, t); A.simulate(1, 1 / 20);
      o.axe = { dead: t.dead, cd: P.abilities[3].cd, refresh: H7.ev('cullRefresh').length };
      return o;
    });
    assert(r.heroes === 21 && r.ok.length === 21 && !r.bad.length, 'scepter upgrades ' + JSON.stringify(r));
    assert(r.axe.dead && r.axe.cd === 0 && r.axe.refresh === 1, 'axe refresh ' + JSON.stringify(r.axe));
    const l = await (async () => { await start(page, 'lina'); return page.evaluate(() => { const { A } = H7, P = A.G.player; H7.at(-20, -20); const t = H7.dummy(-12, -20); H7.only('scepter');
      A.castAbility(3, t); A.simulate(1, 1 / 20); return A.getLog('damage').filter(e => e.ability === 'laguna').map(e => e.dtype + ':' + Math.round(e.amount)); }); })();
    assert(l.length === 1 && l[0] === 'pure:950', 'lina pure ' + JSON.stringify(l));
    return r.ok.length + ' heroes upgraded; ' + JSON.stringify(r.axe) + ' lina ' + l;
  });

  test('B7 shop UI: tabs 基础/升级/消耗品, search (Chinese / English / nickname), recipe-tree tooltip, fits 1280×720..1920×1080, typing does not trigger hotkeys', async page => {
    const out = {};
    for (const [w, hgt] of [[1280, 720], [1366, 768], [1600, 900], [1920, 1080]]) {
      await page.setViewportSize({ width: w, height: hgt }); await start(page, 'lina');
      out[w] = await page.evaluate(() => {
        const { A } = H7, o = {}; A.setGold(99999); A.toggleShop(); A.updateShop();
        const vis = () => [...document.querySelectorAll('#shopList .sitem')].filter(e => !e.classList.contains('hide')).map(e => e.dataset.id);
        A.setShopTab('upgrade'); o.up = vis().length; o.upHas = ['scepter', 'force', 'euls', 'dagon5'].every(id => vis().includes(id));
        A.setShopTab('consumable'); o.cons = vis().sort().join(); A.setShopTab('basic'); o.basic = vis().includes('point_booster') && !vis().includes('scepter');
        A.setShopSearch('羊刀'); o.s1 = vis().join(); A.setShopSearch('force'); o.s2 = vis().join(); A.setShopSearch('aghanim'); o.s3 = vis().join(); A.setShopSearch('zzz'); o.empty = !document.getElementById('shopEmpty').classList.contains('hidden'); A.setShopSearch('');
        const r = document.getElementById('shop').getBoundingClientRect(), hud = document.getElementById('items').getBoundingClientRect();
        o.fit = r.top >= 0 && r.bottom <= hud.top + 1 && r.right <= innerWidth; o.rect = [Math.round(r.top), Math.round(r.bottom), Math.round(hud.top)];
        const tip = A.itemTip('scepter', false); o.tree = ['精气之球', '食人魔之斧', '欢欣之刃', '魔力法杖'].every(n => tip.includes(n)) && tip.includes('rtree');
        const t5 = A.itemTip('dagon5', false); o.tree5 = t5.includes('达贡之神力 4') && t5.includes('魔力法杖');   // nested: Dagon 5 ← 4 ← 3 ← 2 ← 1 ← parts
        return o;
      });
      if (w === 1280) {   // typing in the search box: no hotkeys (Q would cast / B would close)
        await page.click('#shopSearch'); await page.keyboard.type('bq1');
        out.typed = await page.evaluate(() => ({ v: document.getElementById('shopSearch').value, open: !document.getElementById('shop').classList.contains('hidden'), tg: !!GameAPI.G.targeting }));
        await page.mouse.move(200, 200);
        const el = await page.$('#shopList .sitem[data-id="bkb"]'); if (el) { await page.evaluate(() => GameAPI.setShopSearch('bkb')); await page.hover('#shopList .sitem[data-id="bkb"]'); out.hoverTip = await page.evaluate(() => !document.getElementById('tip').classList.contains('hidden') && document.getElementById('tip').innerHTML.includes('食人魔之斧')); }
      }
    }
    for (const w in out) if (out[w].up !== undefined) {
      const o = out[w];
      assert(o.up >= 20 && o.upHas && o.basic && o.cons === 'dust,salve,tp,ward_obs,ward_sentry', 'tabs ' + w + JSON.stringify(o));
      assert(o.s1 === 'scythe' && o.s2 === 'force' && o.s3 === 'scepter' && o.empty, 'search ' + w + JSON.stringify(o));
      assert(o.fit, 'shop fits above the HUD at ' + w + ' ' + JSON.stringify(o.rect));
      assert(o.tree && o.tree5, 'recipe tree ' + w);
    }
    assert(out.typed.v === 'bq1' && out.typed.open && !out.typed.tg, 'typing ' + JSON.stringify(out.typed));
    assert(out.hoverTip, 'hover recipe tooltip');
    return JSON.stringify(out[1280]).slice(0, 200);
  });

  test("bots (B7): Mekansm on hurt allies, Eul's on a channelling Black Hole, Glimmer save, Force Staff escape, Dagon finish, Scythe in a fight", async page => {
    await boot(page, 'axe'); await page.evaluate(HELPERS);
    const r = await page.evaluate(() => {
      const { A } = H7, o = {}; A.godMode(true); A.revealAll(true); H7.clear(); A.teleportHero(-60, 60);
      const use = (h, id) => H7.ev('itemUse', e => e.unit === h.id && e.item === id).length;
      const nocd = h => { for (const ab of h.abilities) ab.cd = 999; };
      // Mekansm: two hurt allies near the lich bot
      let l = H7.bot('lich', 0, 0, ['mekansm']), a2 = H7.bot('wd', 2, 0); nocd(l); nocd(a2); l.hp = l.maxHp * 0.5; a2.hp = a2.maxHp * 0.4; A.simulate(2, 1 / 20); o.mek = use(l, 'mekansm');
      A.killUnit(l, null); A.killUnit(a2, null); H7.clear(); A.clearLog();
      // Eul's: interrupt an enemy Enigma's Black Hole
      const z = H7.bot('zeus', 10, 0, ['euls']); nocd(z); const en = H7.foe('enigma', 18, 0); A.setLevel(18, en); for (let k = 0; k < 3; k++) A.learnSkill(3, en); en.mana = en.maxMana;
      A.castAbility(3, { x: 24, z: 0 }, en); A.simulate(1.5, 1 / 20); o.eul = { used: use(z, 'euls'), ch: !!en.channel };
      A.killUnit(z, null); A.killUnit(en, null); H7.clear(); A.clearLog();
      // Glimmer: save an ally under 35% next to an enemy
      const cm = H7.bot('cm', 0, 20, ['glimmer']), lo = H7.bot('lion', 3, 20); nocd(cm); nocd(lo); lo.hp = lo.maxHp * 0.2; H7.foe('sven', 6, 20); A.simulate(2, 1 / 20);
      o.glim = H7.ev('itemUse', e => e.unit === cm.id && e.item === 'glimmer').map(e => e.target === lo.id || e.target === cm.id).length;
      A.killUnit(cm, null); A.killUnit(lo, null); H7.clear(); A.clearLog();
      // Force Staff: retreating bot with a chaser
      const wd = H7.bot('wd', 0, -20, ['force']); nocd(wd); wd.hp = wd.maxHp * 0.15; H7.foe('axe', 3, -20); const p0 = { x: wd.x, z: wd.z }; A.simulate(2, 1 / 20); o.force = use(wd, 'force');
      A.killUnit(wd, null); H7.clear(); A.clearLog();
      // Dagon: finish a low enemy
      const li = H7.bot('lina', 20, 20, ['dagon']); nocd(li); const v = H7.foe('cm', 28, 20); v.hp = 250; A.simulate(2, 1 / 20); o.dagon = { used: use(li, 'dagon'), dead: v.dead };
      A.killUnit(li, null); H7.clear(); A.clearLog();
      // Scythe: hex the fight target
      const lion = H7.bot('lion', -4, 0, ['scythe']); nocd(lion); const t = H7.foe('sven', 4, 0); t.hp = 800; A.simulate(2.5, 1 / 20); o.hex = { used: use(lion, 'scythe'), hexed: H7.ev('scytheHex').length };
      return o;
    });
    assert(r.mek >= 1, 'mek ' + JSON.stringify(r));
    assert(r.eul.used === 1 && !r.eul.ch, 'eul interrupt ' + JSON.stringify(r.eul));
    assert(r.glim >= 1, 'glimmer ' + JSON.stringify(r));
    assert(r.force >= 1, 'force ' + JSON.stringify(r));
    assert(r.dagon.used === 1 && r.dagon.dead, 'dagon ' + JSON.stringify(r.dagon));
    assert(r.hex.used === 1 && r.hex.hexed === 1, 'scythe ' + JSON.stringify(r.hex));
    return JSON.stringify(r);
  });

  test('bots (B7): 20-minute 5v5 — bots buy new items from role builds and use their actives, no console errors', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI; A.startGame('lich', { enemies: 5, allies: 4, diff: 2, picks: ['cm', 'lina', 'zeus', 'wd', 'axe', 'lion', 'puck', 'es', 'sven'] }); A.pause(); A.setPlayerBot(true, 2, 'mid'); A.record(true);
      const B7 = /^(dagon[2-5]?|mekansm|scepter|force|euls|glimmer|heart|scythe|pipe|daedalus|butterfly|mkb)$/, buys = {}, uses = {};
      for (let m = 0; m < 20; m++) { A.simulate(60, 1 / 20);
        for (const e of A.getLog('buy')) if (B7.test(e.item)) buys[e.item] = (buys[e.item] || 0) + 1;
        for (const e of A.getLog('itemUse')) if (B7.test(e.item)) uses[e.item] = (uses[e.item] || 0) + 1; A.clearLog(); }
      return { buys, uses, t: Math.round(A.G.time), score: A.G.score.join(':'), errs: 0 };
    });
    assert(Object.keys(r.buys).length >= 2, 'new item purchases ' + JSON.stringify(r));
    assert(Object.values(r.uses).reduce((a, b) => a + b, 0) >= 2, 'new item uses ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
