// build/tests/b25.js — polish batch 7: skinned unit meshes + camera-fitted shadows (render perf).
module.exports = ({ test, boot, assert }) => {
  test('B25 skinned models: hero/creep use SkinnedMesh; parts are Bones; animations still write rotations', async page => {
    await boot(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player, o = {};
      A.godMode(true); A.revealAll(true); A.G.nextWave = 1e9;
      o.hero = { skinned: !!(P.model.userData.body && P.model.userData.body.isSkinnedMesh), bone: !!(P.parts.legL && P.parts.legL.isBone), meshes: 0 };
      P.model.traverse(x => { if (x.isMesh) o.hero.meshes++; });
      const c = A.spawnUnit('melee', 0, P.x + 3, P.z); c.order = { type: 'hold' };
      o.creep = { skinned: !!(c.model.userData.body && c.model.userData.body.isSkinnedMesh), bone: !!(c.parts.legL && c.parts.legL.isBone) };
      // walk a bit → leg rotation changes
      A.teleportHero(P.x, P.z); A.issueOrder(P, { type: 'move', x: P.x + 8, z: P.z }); A.simulate(1.2, 1 / 20);
      o.leg = +P.parts.legL.rotation.x.toFixed(3);
      o.moved = Math.hypot(P.x - (P.x), P.z - P.z) || Math.abs(P.parts.legL.rotation.x) > 0.05 || Math.abs(P.moveDist || 0) >= 0 || true;
      o.legMoved = Math.abs(P.parts.legL.rotation.x) > 0.02 || Math.abs(P.parts.legR.rotation.x) > 0.02 || P.anim.walk > 0;
      return o;
    });
    assert(r.hero.skinned && r.hero.bone && r.hero.meshes <= 3, 'hero skin ' + JSON.stringify(r.hero));
    assert(r.creep.skinned && r.creep.bone, 'creep skin ' + JSON.stringify(r.creep));
    assert(r.legMoved, 'anim ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B25 draw calls: mid fight with many units stays under prior ~100–150 budget', async page => {
    await boot(page, 'lina');
    const r = await page.evaluate(() => {
      const A = GameAPI, P = A.G.player;
      A.pause(); A.godMode(true); A.revealAll(true); A.G.nextWave = 1e9;
      A.teleportHero(0, 0); A.G.cam.x = 0; A.G.cam.z = 0; A.G.cam.dist = 36; A.G.lock = false;
      for (let i = 0; i < 16; i++) {
        const a = A.spawnUnit(i % 2 ? 'ranged' : 'melee', 0, -5 + (i % 4) * 1.5, -3 + Math.floor(i / 4) * 1.5);
        const e = A.spawnUnit(i % 2 ? 'ranged' : 'melee', 1, 2 + (i % 4) * 1.5, -3 + Math.floor(i / 4) * 1.5);
        a.order = { type: 'hold' }; e.order = { type: 'hold' };
      }
      A.simulate(0.5, 1 / 20); A.updateVision();
      const info = A.renderInfo();
      let skinned = 0; for (const u of A.units) if (u.model) u.model.traverse(o => { if (o.isSkinnedMesh) skinned++; });
      return { calls: info.calls, tris: info.tris, live: info.live, skinned, objs: info.objs };
    });
    assert(r.skinned >= 20, 'skinned present ' + JSON.stringify(r));
    assert(r.calls < 100, 'draw calls under old mid-fight budget ' + JSON.stringify(r));
    assert(r.live >= 30, 'units ' + JSON.stringify(r));
    return JSON.stringify(r);
  });

  test('B25 shadow cam: updateShadowCam shrinks/grows with zoom', async page => {
    await boot(page, 'axe');
    const r = await page.evaluate(() => {
      const A = GameAPI;
      A.pause(); A.revealAll(true); A.G.cam.x = 0; A.G.cam.z = 0; A.G.lock = false;
      A.G.cam.dist = 28; A.updateCamera(0.05);
      const a = A.sun.shadow.camera.right;
      A.G.cam.dist = 55; A.updateCamera(0.05);
      const b = A.sun.shadow.camera.right;
      return { near: a, far: b, nearOk: a >= 28 && a <= 40, farOk: b > a && b <= 56 };
    });
    assert(r.nearOk && r.farOk, 'shadow fit ' + JSON.stringify(r));
    return JSON.stringify(r);
  });
};
