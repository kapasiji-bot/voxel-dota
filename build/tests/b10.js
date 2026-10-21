// build/tests/b10.js — B10 bot teamwork: team coordinator plans (group push → siege → structure down, defend as a group,
// lone-enemy pick-off ganks), Roshan commitment (call, no time-out, Aegis → carry, Cheese → carry/support, follow-up push,
// abort only on danger), difficulty presets, and a full 5v5 bot game that ends (ancient destroyed) in time.
module.exports = ({ test, boot, assert }) => {
  const team = async (page, n = 4, lvl = 15, t = 1000) => { await boot(page);
    return page.evaluate(([n, lvl, t]) => { const A = GameAPI; A.startGame('sven', { enemies: 0, allies: n, diff: 1, picks: ['am', 'axe', 'lina', 'lion'] }); A.pause(); A.setPlayerBot(true, 1, 'mid'); A.record(true);
      A.step(1); A.G.nextWave = 1e9; A.G.time = t; for (const h of A.G.heroes) { A.setLevel(lvl, h); for (let k = 0; k < 4; k++) for (const i of [3, 0, 1, 2]) A.learnSkill(i, h); h.hp = h.maxHp; h.mana = h.maxMana; } return A.G.heroes.length; }, [n, lvl, t]); };

  test('B10 team push: bots push as a group, siege together and take the structure', async page => {
    await team(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, o = {}; A.rosh().unit && A.killUnit(A.rosh().unit, null); A.rosh().respawnAt = 1e9;   // no Roshan detour
      let t = 0, maxNear = 0; while (t < 150 && !A.getLog('buildingDestroyed').some(e => e.team === 1)) { A.simulate(2); t += 2; const p = A.teamPlan(0);
        if (p.mode === 'push' && p.phase === 'siege' && p.target) maxNear = Math.max(maxNear, A.G.heroes.filter(h => !h.dead && Math.hypot(h.x - p.target.x, h.z - p.target.z) < 16).length); }
      const L = n => A.getLog(n);
      return { t, plans: L('teamPlan').filter(e => e.team === 0).map(e => e.mode), siege: L('teamSiege').length, down: L('buildingDestroyed').filter(e => e.team === 1).map(e => e.kind + e.tier), maxNear };
    });
    assert(r.plans.includes('push') && r.siege >= 1 && r.down.length >= 1 && r.maxNear >= 3, 'push ' + JSON.stringify(r));
    return `structure down in ${r.t}s (${r.down}), ${r.maxNear} heroes at the siege`;
  });

  test('B10 Roshan: team commits until the kill (no time-out), Aegis → carry, Cheese → carry/support, then pushes; danger aborts', async page => {
    await team(page, 4, 16, 950);
    const r = await page.evaluate(() => {
      const A = GameAPI, o = {};
      let t = 0; while (t < 200 && !A.getLog('pickup').some(e => e.item === 'aegis')) { A.simulate(2); t += 2; }
      o.t = t; o.calls = A.getLog('roshCall').length; o.kill = A.getLog('roshanKill').length; o.aegis = A.G.heroes.filter(h => A.countItem(h, 'aegis')).map(h => h.def.id).join();
      A.simulate(4); o.after = A.teamPlan(0).mode + ':' + (A.teamPlan(0).why || '');
      // cheese preference: carry without Aegis, else a support
      const am = A.G.heroes.find(h => h.def.id === 'am'), lion = A.G.heroes.find(h => h.def.id === 'lion');
      for (const h of A.G.heroes) { h.x = A.PIT.x + 3; h.z = A.PIT.z + 3; }
      o.cheese = (A.cheeseTaker(0) || {}).def.id;
      // danger abort: a committed call + 5 strong enemies at the pit → retreat
      A.rosh().respawnAt = A.G.time + 0.5; A.simulate(2); A.setPlan(0, 'roshan', {});
      for (const id of ['pa', 'enigma', 'es', 'qop', 'wd']) { const e = A.spawnBot(id, 1, 'mid', 1); A.setLevel(25, e); e.x = A.PIT.x + 2; e.z = A.PIT.z + 2; }
      A.updateVision(); A.teamPlan(0).next = 0; A.teamTick(0); o.danger = A.teamPlan(0).mode;
      return o;
    });
    assert(r.calls >= 1 && r.kill === 1 && r.aegis === 'am' && r.t > 0, 'roshan ' + JSON.stringify(r));
    assert(/^push/.test(r.after) && ['lina', 'lion'].includes(r.cheese) && r.danger === 'retreat', 'follow-up / cheese / abort ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B10 defend as a group + pick-off gank on a lone visible enemy; difficulty presets differ', async page => {
    await team(page);
    const r = await page.evaluate(() => {
      const A = GameAPI, o = {}; A.rosh().unit && A.killUnit(A.rosh().unit, null); A.rosh().respawnAt = 1e9;
      const t2 = A.units.find(u => u.kind === 'tower' && u.team === 0 && u.tier === 2 && u.lane === 'top');
      const es = ['pa', 'axe'].map(id => { const e = A.spawnBot(id === 'axe' ? 'es' : id, 1, 'top', 1); A.setLevel(12, e); e.x = t2.x + 3; e.z = t2.z + 3; return e; });
      t2.hp = t2.maxHp * 0.8; A.updateVision(); A.teamPlan(0).next = 0; A.teamTick(0); o.defend = A.teamPlan(0).mode + ':' + (A.teamPlan(0).target === t2);
      for (const e of es) A.killUnit(e, null); A.simulate(1); A.setPlan(0, 'free', { cd: 1e9 });
      const lone = A.spawnBot('riki', 1, 'bot', 1); A.setLevel(8, lone); const me = A.G.heroes.filter(h => h.team === 0).slice(0, 3);
      A.G.time = Math.max(A.G.time, 400); lone.x = me[0].x + 9; lone.z = me[0].z; me[1].x = me[0].x + 2; me[1].z = me[0].z; A.updateVision();
      for (const h of A.G.heroes) if (h.team === 0) h.bot.d = Object.assign({}, h.bot.d, { gank: 1 });
      A.teamPlan(0).gankCd = 0; A.assignGank(0, { gank: 1 }); o.gank = A.getLog('teamGank').length; o.ganked = A.G.heroes.filter(h => h.bot && h.bot.gank && h.bot.gank.target === lone).length;
      o.diffs = A.DIFFS.map(d => [d.group, d.rosh, d.gank]);
      return o;
    });
    assert(r.defend === 'defend:true', 'defend ' + JSON.stringify(r));
    assert(r.gank === 1 && r.ganked >= 2, 'gank ' + JSON.stringify(r));
    assert(r.diffs[0][0] > r.diffs[1][0] && r.diffs[1][0] > r.diffs[2][0] && r.diffs[0][2] < r.diffs[2][2], 'difficulty ' + JSON.stringify(r.diffs));
    return JSON.stringify(r);
  });

  test('B10 sim: full 5v5 bot game (普通) ends with an ancient destroyed before 55 min; no errors', async page => {
    await boot(page);
    const r = await page.evaluate(() => {
      const A = GameAPI; A.startGame('axe', { enemies: 5, allies: 4, diff: 1 }); A.pause(); A.setPlayerBot(true, 1, 'mid'); A.record(false);
      for (let m = 0; m < 55 && !A.G.over; m++) A.simulate(60, 1 / 20);
      const c = [{}, {}]; for (const l of A.G.teamLog || []) c[l.team][l.mode] = (c[l.team][l.mode] || 0) + 1;
      return { over: A.G.over, min: +(A.G.time / 60).toFixed(1), winner: A.G.winner, score: A.G.score, plans: c, rosh: A.rosh().kills, lv: A.G.heroes.map(h => h.level).join(',') };
    });
    assert(r.over && r.min < 55, 'game end ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
