// build/tests/b27.js — ability targeting indicators: AoE disk, cone/line skillshot, attack-range, unit aim line.
module.exports = ({ test, boot, assert }) => {
  test('B27 indicators: Lina W AoE + Q cone/line previews', async page => {
    await boot(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI;
      A.setLevel(6); A.godMode(true);
      for (let i = 0; i < 4; i++) A.learnSkill(i);
      A.teleportHero(-20, 0); A.G.cam.x = -20; A.G.cam.z = 0; A.G.cam.dist = 55;
      // W — 光击阵 point AoE
      A.pressSkill(1);
      const scr = A.toScreen(A.G.player.x + 6, 0, A.G.player.z);
      A.mouse.x = scr.x; A.mouse.y = scr.y; A.mouse.inside = true; A.mouse.overUI = false;
      A.updateIndicators();
      const w = A.indInfo();
      A.G.targeting = null; A.updateIndicators();
      // Q — 龙破斩 direction trapezoid (w0+w1 → cone)
      A.pressSkill(0);
      A.mouse.x = scr.x; A.mouse.y = scr.y; A.mouse.overUI = false;
      A.updateIndicators();
      const q = A.indInfo();
      A.G.targeting = null; A.updateIndicators();
      return { w, q, slave: A.G.player.abilities[0].def.id, lsa: A.G.player.abilities[1].def.id };
    });
    assert(r.lsa === 'lsa' && r.w.tg && r.w.tg.radius > 0 && r.w.aoe && r.w.range, 'W AoE ' + JSON.stringify(r.w));
    assert(r.slave === 'slave' && r.q.tg && r.q.tg.line && r.q.tg.w0 != null && r.q.cone, 'Q cone ' + JSON.stringify(r.q));
    return `W aoe r=${r.w.tg.radius} · Q cone w0=${r.q.tg.w0}`;
  });

  test('B27 indicators: Mirana arrow line + A-move attack range + Laguna dash', async page => {
    await boot(page, 'mirana');
    const a = await page.evaluate(() => {
      const A = GameAPI;
      A.setLevel(6); A.godMode(true); for (let i = 0; i < 4; i++) A.learnSkill(i);
      A.teleportHero(0, 0); A.G.cam.x = 0; A.G.cam.z = 0; A.G.cam.dist = 55;
      A.pressSkill(1); // Sacred Arrow direction line (no w0)
      const scr = A.toScreen(8, 0, 0); A.mouse.x = scr.x; A.mouse.y = scr.y; A.mouse.overUI = false;
      A.updateIndicators();
      const arrow = A.indInfo();
      A.G.targeting = null;
      A.G.targeting = { kind: 'amove' }; A.updateIndicators();
      const am = A.indInfo();
      A.G.targeting = null; A.updateIndicators();
      return { arrow, am, range: A.G.player.range };
    });
    assert(a.arrow.tg && a.arrow.tg.line && a.arrow.tg.w0 == null && a.arrow.line && !a.arrow.cone, 'arrow line ' + JSON.stringify(a.arrow));
    assert(a.am.atk && a.range > 0, 'amove atk ring ' + JSON.stringify(a.am));

    await boot(page, 'lina');
    const b = await page.evaluate(() => {
      const A = GameAPI;
      A.setLevel(6); A.godMode(true); for (let i = 0; i < 4; i++) A.learnSkill(i);
      A.teleportHero(-10, 10); A.G.cam.x = -10; A.G.cam.z = 10; A.G.cam.dist = 50;
      // spawn a dummy enemy for unit aim line
      const foe = A.spawnUnit('melee', 1, A.G.player.x + 5, A.G.player.z); foe.order = { type: 'hold' };
      A.pressSkill(3); // Laguna unit target
      const scr = A.toScreen(foe.x, 1, foe.z); A.mouse.x = scr.x; A.mouse.y = scr.y; A.mouse.overUI = false;
      A.updateIndicators();
      const lag = A.indInfo();
      A.G.targeting = null; A.updateIndicators();
      return { lag, foe: !!(foe && !foe.dead) };
    });
    assert(b.foe && b.lag.tg && b.lag.tg.mode === 'unit' && b.lag.range && b.lag.dash, 'Laguna dash ' + JSON.stringify(b.lag));
    return `arrow line · amove atk@${a.range} · Laguna dash`;
  });
};
