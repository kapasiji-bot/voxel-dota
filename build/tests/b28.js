// build/tests/b28.js — creep GPU instancing + LOD: far identical creeps share InstancedMesh; near stay SkinnedMesh.
module.exports = ({ test, boot, assert }) => {
  test('B28 creep instancing: far lane creeps pack into InstancedMesh; near stay skinned', async page => {
    await boot(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI;
      A.godMode(true); A.revealAll(true); A.G.nextWave = 1e9;
      for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
      A.step(2);
      A.teleportHero(0, 0);
      A.G.cam.x = 0; A.G.cam.z = 0; A.G.cam.dist = 50; A.updateCamera(0.05);
      const lod = Math.sqrt(A.creepLodR2());
      const viewR = A.G.cam.dist * 0.78 + 6;
      const rad = (lod + viewR) * 0.5;
      for (let i = 0; i < 8; i++) {
        const c = A.spawnUnit(i % 2 ? 'ranged' : 'melee', 0, -2 + (i % 4), -1 + Math.floor(i / 4));
        c.order = { type: 'hold' };
      }
      // pack in the half-plane in front of the camera (cam sits at +Z)
      for (let i = 0; i < 24; i++) {
        const x = -14 + (i % 8) * 4, z = -rad - Math.floor(i / 8) * 2.5;
        const c = A.spawnUnit(i % 2 ? 'ranged' : 'melee', 1, x, z);
        c.order = { type: 'hold' };
      }
      A.CREEP_INST.on = true; A.updateCreepInst();
      const ci = { far: A.CREEP_INST.far, near: A.CREEP_INST.near, draws: A.CREEP_INST.draws, pools: A.CREEP_INST.pools };
      const farLod = A.units.filter(u => !u.dead && u.team === 1 && u._lodInst).length;
      const nearLod = A.units.filter(u => !u.dead && u.team === 0 && u._lodInst).length;
      const info = A.renderInfo();
      A.CREEP_INST.on = false; A.updateCreepInst();
      const offLod = A.units.filter(u => u._lodInst).length;
      return { ci, farLod, nearLod, offLod, calls: info.calls, lod, rad, viewR,
        skinnedHero: !!(A.G.player.model.userData.body && A.G.player.model.userData.body.isSkinnedMesh),
        skinnedNear: !!(A.units.find(u => u.team === 0 && !u.isHero && !u.dead).model.userData.body.visible) };
    });
    assert(r.skinnedHero && r.skinnedNear, 'heroes/near stay SkinnedMesh ' + JSON.stringify(r));
    assert(r.ci.far >= 12 && r.farLod >= 12, 'far creeps instanced ' + JSON.stringify(r));
    assert(r.nearLod === 0 && r.ci.near >= 6, 'near not instanced ' + JSON.stringify(r));
    assert(r.ci.draws >= 2 && r.ci.draws <= 8, 'few instance draws ' + JSON.stringify(r));
    assert(r.offLod === 0, 'toggle off ' + JSON.stringify(r));
    return `far=${r.ci.far} near=${r.ci.near} draws=${r.ci.draws} calls=${r.calls}`;
  });

  test('B28 creep instancing: on-screen LOD band saves draws vs uninstanced', async page => {
    await boot(page, 'axe');
    const r = await page.evaluate(() => {
      const A = GameAPI;
      A.godMode(true); A.revealAll(true); A.G.nextWave = 1e9;
      for (const u of A.units) if (!u.dead && !u.isBuilding && !u.isHero && !u.isCourier && !u.isRoshan) A.killUnit(u, null);
      A.step(2);
      A.teleportHero(0, 0);
      A.G.cam.x = 0; A.G.cam.z = 0; A.G.cam.dist = 50; A.updateCamera(0.05);
      const lod = Math.sqrt(A.creepLodR2());
      const viewR = A.G.cam.dist * 0.78 + 6;
      const rad = (lod + viewR) * 0.5;
      // dense grid in front of camera — all should be drawn when uninstanced
      for (let i = 0; i < 32; i++) {
        const team = i < 16 ? 0 : 1;
        const x = -12 + (i % 8) * 3.2, z = -rad - Math.floor((i % 16) / 8) * 2.8;
        const c = A.spawnUnit(i % 2 ? 'ranged' : 'melee', team, x, z);
        c.order = { type: 'hold' };
      }
      const setCull = (on) => { for (const u of A.units) { const b = u.model && u.model.userData.body, g = u.model && u.model.userData.glow; if (b) b.frustumCulled = on; if (g) g.frustumCulled = on; } };
      // fair baseline: skinned creeps must actually draw (SkinnedMesh bounds often cull incorrectly at rest)
      A.CREEP_INST.on = false; A.updateCreepInst(); setCull(false);
      const off = A.renderInfo();
      A.CREEP_INST.on = true; A.updateCreepInst(); setCull(true);
      const on = A.renderInfo();
      return { offCalls: off.calls, onCalls: on.calls, ci: on.creepInst, live: on.live, saved: off.calls - on.calls, rad, lod, viewR };
    });
    assert(r.live >= 30, 'units ' + JSON.stringify(r));
    assert(r.ci && r.ci.far >= 16, 'instanced ' + JSON.stringify(r));
    assert(r.onCalls < r.offCalls, 'instancing reduces draws ' + JSON.stringify(r));
    assert(r.saved >= 8, 'measurable save ' + JSON.stringify(r));
    return `off=${r.offCalls} on=${r.onCalls} saved=${r.saved} far=${r.ci.far}`;
  });
};
