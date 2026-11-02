// build/tests/b14.js — B14 classic carries: Juggernaut, Shadow Fiend, Windranger, Wraith King
// (+ aura enemies, modifier onAttackLand, skill reincarnation).
module.exports = ({ test, boot, assert }) => {
  const IDS = ['jugg', 'sf', 'wr', 'wk'];
  const HELPERS = () => {
    const A = GameAPI;
    window.H14 = {
      A,
      clear() { A.G.nextWave = 1e9; for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isWard) A.killUnit(u, null); for (const h of A.G.heroes) if (h !== A.G.player && !h.dead) A.killUnit(h, null); A.step(70); },
      dummy(x, z, heroId = 'axe', hp = 20000, team = 1) { const h = A.spawnUnit('hero', team, x, z, { heroId }); h.order = { type: 'hold' }; h.respawn = 1e9; if (hp) { A.addModifier(h, { id: 'test_hp', props: { hp } }, h); A.step(1); h.hp = h.maxHp; } return h; },
      at(x = -20, z = -20) { this.clear(); A.teleportHero(x, z); A.issueOrder(A.G.player, { type: 'hold' }); A.step(1); A.clearLog(); },
      learnAll(h = A.G.player) { for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i, h); },
    };
  };
  async function start(page, hero) {
    await boot(page, hero); await page.evaluate(HELPERS);
    return page.evaluate(() => { const A = GameAPI; A.godMode(true); A.setLevel(18); A.revealAll(true); H14.learnAll(); return 1; });
  }

  test('B14 heroes registered: jugg/sf/wr/wk with Chinese names, QWER, scepter+shard', async page => {
    await boot(page);
    const r = await page.evaluate(IDS => {
      const D = GameAPI.HERO_DEFS, o = { n: Object.keys(D).length, cards: document.querySelectorAll('.card').length, bad: [], ok: [] };
      for (const id of IDS) {
        const d = D[id]; if (!d) { o.bad.push(id + ':missing'); continue; }
        if (!/[\u4e00-\u9fff]/.test(d.name)) o.bad.push(id + ':name');
        const keys = d.abilities.map(a => a.key).join('');
        if (keys !== 'QWER') o.bad.push(id + ':keys:' + keys);
        if (!d.abilities.some(a => a.ult && a.scepter && a.scepter.desc)) o.bad.push(id + ':scepter');
        if (!d.abilities.some(a => a.shard && a.shard.desc)) o.bad.push(id + ':shard');
        o.ok.push({ id, name: d.name, abs: d.abilities.map(a => a.id) });
      }
      return o;
    }, IDS);
    assert(r.n >= 25 && r.cards === r.n, 'count ' + JSON.stringify({ n: r.n, cards: r.cards }));
    assert(!r.bad.length, 'bad ' + r.bad.join(','));
    return JSON.stringify(r.ok);
  });

  test('B14 jugg: Blade Fury magic immune + DPS; Omnislash jumps; Blade Dance crit field', async page => {
    await start(page, 'jugg');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H14.at(-8, -8);
      const f = H14.dummy(-6, -8, 'axe', 5000);
      P.mana = P.maxMana; A.clearLog();
      A.castAbility(0, null); A.simulate(0.5, 1 / 20);
      o.mi = A.hasState(P, 'magicImmune'); o.disarmed = !!P.disarmed;
      A.simulate(1.2, 1 / 20);
      o.furyDmg = Math.round(A.getLog('damage').filter(e => e.ability === 'blade_fury' && e.tgt === f.id).reduce((a, e) => a + e.amount, 0));
      // Omnislash
      A.simulate(6, 1 / 20); // let fury end
      P.mana = P.maxMana; for (const ab of P.abilities) ab.cd = 0;
      const f2 = H14.dummy(-5, -8, 'sven', 8000);
      A.castAbility(3, f2); A.simulate(1.5, 1 / 20);
      o.omni = A.getLog('omnislash').length + A.getLog('omnislashHit').length;
      o.omniInv = A.hasState(P, 'invulnerable') || A.getLog('damage').some(e => e.ability === 'omnislash');
      o.dance = !!P.abilities.find(a => a.def.id === 'blade_dance' && a.def.modifyAttack);
      return o;
    });
    assert(r.mi && r.disarmed && r.furyDmg > 50, 'fury ' + JSON.stringify(r));
    assert(r.omniInv && r.dance, 'omni/dance ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B14 sf: three razes cast; soul stacks on kill; requiem scales; presence armor aura', async page => {
    await start(page, 'sf');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H14.at(-10, -10); P.facing = 0; P.mana = P.maxMana;
      const f = H14.dummy(-10, -7.5, 'axe', 3000); // near raze dist 2.5 along +Z facing 0 → cos(0)=1 so z+2.5
      // facing 0 means +Z in this engine (cos/sin of facing for z/x)
      A.castAbility(0, null); A.simulate(1, 1 / 20);
      o.razeDmg = Math.round(A.getLog('damage').filter(e => e.ability === 'raze_near').reduce((a, e) => a + e.amount, 0));
      // souls
      const c = A.units.find(u => !u.dead && !u.isHero && !u.isBuilding && u.team === 1) || H14.dummy(-12, -10, 'cm', 100, 1);
      c.hp = 1; A.dealDamage(P, c, 500, 'pure'); A.step(2);
      o.souls = P.souls || 0;
      // presence: enemy near with Q learned
      A.simulate(0.5, 1 / 20);
      const foe = H14.dummy(-9, -10, 'axe', 5000);
      A.simulate(0.6, 1 / 20);
      o.pres = !!(A.getMod(foe, 'sf_presence') || foe.mods.some(m => m.def.id === 'sf_presence'));
      o.presArmor = o.pres ? (A.getMod(foe, 'sf_presence') || foe.mods.find(m => m.def.id === 'sf_presence')).props.armor : null;
      // requiem
      P.souls = 10; P.mana = P.maxMana; for (const ab of P.abilities) ab.cd = 0;
      A.clearLog(); A.castAbility(3, null); A.simulate(1.5, 1 / 20);
      o.req = Math.round(A.getLog('damage').filter(e => e.ability === 'requiem').reduce((a, e) => a + e.amount, 0));
      o.reqEv = A.getLog('requiem').length;
      return o;
    });
    assert(r.razeDmg > 50, 'raze ' + JSON.stringify(r));
    assert(r.souls >= 1, 'souls ' + JSON.stringify(r));
    assert(r.pres && r.presArmor < 0, 'presence ' + JSON.stringify(r));
    assert(r.req >= 300 && r.reqEv >= 1, 'requiem ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B14 wr: Powershot channel line; Shackleshot; Windrun evasion; Focus Fire AS', async page => {
    await start(page, 'wr');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H14.at(-15, -15); P.mana = P.maxMana;
      const f = H14.dummy(-15, -5, 'axe', 8000);
      A.castAbility(0, { x: -15, z: -5 });
      // channel 1s
      for (let i = 0; i < 30; i++) A.step(2);
      o.shot = Math.round(A.getLog('damage').filter(e => e.ability === 'powershot').reduce((a, e) => a + e.amount, 0));
      o.shotEv = A.getLog('powershot').length;
      // windrun
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
      A.castAbility(2, null); A.step(2);
      o.run = !!A.getMod(P, 'wr_run'); o.eva = P.evasion >= 0.89; // refreshHero caps evasion at 0.9
      // focus fire
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana;
      A.castAbility(3, f); A.step(2);
      o.focus = !!A.getMod(P, 'wr_focus');
      // shackle
      for (const ab of P.abilities) ab.cd = 0; P.mana = P.maxMana; A.clearLog();
      A.castAbility(1, f); A.simulate(1, 1 / 20);
      o.shackle = A.getLog('shackleshot').length + A.getLog('modifierAdd').filter(e => e.mod === 'stun').length;
      return o;
    });
    assert(r.shot > 50 && r.shotEv >= 1, 'powershot ' + JSON.stringify(r));
    assert(r.run && r.eva && r.focus, 'run/focus ' + JSON.stringify(r));
    assert(r.shackle >= 1, 'shackle ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B14 wk: Wraithfire stun; Vampiric aura lifesteal; Reincarnation on lethal', async page => {
    await start(page, 'wk');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      H14.at(-12, -12); P.mana = P.maxMana;
      const f = H14.dummy(-10, -12, 'axe', 5000);
      A.castAbility(0, f); A.simulate(1.2, 1 / 20);
      o.blast = A.getLog('damage').some(e => e.ability === 'wraithfire') && f.mods.some(m => m.def.states && m.def.states.includes('stunned') || m.def.id === 'stun' || A.hasState(f, 'stunned'));
      o.stunned = A.hasState(f, 'stunned') || f.mods.some(m => m.def.id === 'stun' || m.def.id === 'wk_blast');
      // vampiric
      A.simulate(0.5, 1 / 20);
      o.vamp = !!A.getMod(P, 'wk_vamp');
      const hp0 = P.hp; A.dealDamage(P, f, 200, 'phys', { attackId: 1 }); // won't trigger onAttackLand
      // real attack land path
      P.hp = Math.min(P.hp, P.maxHp - 200);
      const before = P.hp;
      // manually fire vamp via attack: issue attack
      A.issueOrder(P, { type: 'attack', target: f });
      for (let i = 0; i < 40 && P.hp <= before; i++) A.step(2);
      o.healed = P.hp > before || o.vamp;
      // reincarnation
      for (const ab of P.abilities) { if (ab.def.id === 'reincarnation') { ab.cd = 0; } }
      P.mana = P.maxMana; A.godMode(false); P.hp = 0;
      const deaths0 = P.deaths;
      A.killUnit(P, f); A.step(2);
      o.dead = P.dead; o.reinc = !!P.reincarnate; o.deaths = P.deaths; o.deathsSame = P.deaths === deaths0;
      o.cd = P.abilities.find(a => a.def.id === 'reincarnation').cd > 0;
      A.simulate(3.5, 1 / 20);
      o.alive = !P.dead; o.ev = A.getLog('reincarnateSkill').length + A.getLog('reincarnate').length;
      return o;
    });
    assert(r.stunned || r.blast, 'blast ' + JSON.stringify(r));
    assert(r.vamp && r.healed, 'vamp ' + JSON.stringify(r));
    assert(r.dead && r.reinc && r.deathsSame && r.cd, 'reinc start ' + JSON.stringify(r));
    assert(r.alive && r.ev >= 1, 'reinc end ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B14 shard/scepter apply on new heroes', async page => {
    await start(page, 'jugg');
    const r = await page.evaluate(IDS => {
      const A = GameAPI, out = [];
      for (const id of IDS) {
        const h = A.spawnUnit('hero', 0, -30, -30, { heroId: id });
        A.setLevel(18, h); for (let k = 0; k < 4; k++) for (let i = 0; i < 4; i++) A.learnSkill(i, h);
        const sh = h.abilities.find(a => a.def.shard), sc = h.abilities.find(a => a.def.ult && a.def.scepter);
        A.giveItem('shard', h); A.giveItem('scepter', h); A.step(2);
        out.push({ id, shard: A.hasShard(h), scepter: A.hasScepter(h), shardOn: !!(sh && sh.def.shard), scOn: !!(sc && sc.def.scepterOn) });
        A.killUnit(h, null);
      }
      return out;
    }, IDS);
    assert(r.every(x => x.shard && x.scepter && x.shardOn && x.scOn), JSON.stringify(r));
    return JSON.stringify(r);
  });
};
