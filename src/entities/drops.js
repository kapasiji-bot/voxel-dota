// entities/drops.js — B8 items lying on the ground (Roshan's Aegis / Cheese). spawnDrop(item, x, z) shows a spinning voxel
// item; heroes pick it up with the 'pickup' order (right-click it: ui/input.js; bots: ai/bot/jungle.js) when within 1.8.
// Aegis rules (items/aegis.js): only real heroes may carry it, expires AEGIS_LIFE s after pickup; on death the holder
// reincarnates at the death spot after 5 s (aegisSave, called first thing in combat/damage.js killUnit).
const drops = [];
const AEGIS_LIFE = 300, AEGIS_REVIVE = 5;
function spawnDrop(item, x, z) {
  const D = ITEM_DEFS[item], g = new T.Group();
  const c = D.color || '#ffd54f';
  const m = new T.Mesh(voxGeo([[0, 0, 0, 0.9, 0.9, 0.2, c], [0, 0, 0.12, 0.5, 0.5, 0.06, '#ffffff']]), vmat), glow = new T.Mesh(voxGeo([[0, -0.75, 0, 1.4, 0.06, 1.4, c]]), vglow);
  g.add(m); g.add(glow); g.position.set(x, heightAt(x, z) + 1.1, z); scene.add(g);
  const d = { id: drops.length + 1 + '_' + item, item, x, z, mesh: g, t0: G.time };
  drops.push(d); emit('itemDrop', { item, x, z });
  return d;
}
const dropNear = (x, z, r = 1.8) => drops.find(d => Math.hypot(d.x - x, d.z - z) <= r) || null;
function removeDrop(d) { const i = drops.indexOf(d); if (i >= 0) drops.splice(i, 1); scene.remove(d.mesh); }
function pickupDrop(h, d) {
  if (!drops.includes(d)) return '物品已不存在';
  if (!h.isHero || h.isIllusion || h.dead) return '无法拾取';
  if (Math.hypot(h.x - d.x, h.z - d.z) > 2.2) return '距离太远';
  if (!freeSlotFor(h, d.item)) return '物品栏已满';
  giveItem(h, d.item); removeDrop(d);
  if (d.item === 'aegis') {
    h.aegisT = G.time;
    killFeed(`${heroLabel(h)}（${TEAM_CN[h.team]}）拿起了不朽之守护`, h.team, h, null);
    msg(`${heroLabel(h)} 拿起了不朽之守护！（${AEGIS_LIFE / 60} 分钟内死亡可原地复活一次）`, '#ffca28');
  } else if (h === G.player) msg(`拾取了 ${ITEM_DEFS[d.item].name}`, '#ffd54f');
  emit('pickup', { unit: h.id, item: d.item });
  return null;
}
function tickDrops(dt) {
  for (const d of drops) { d.mesh.rotation.y += dt * 2; d.mesh.position.y = heightAt(d.x, d.z) + 1.1 + Math.sin(G.time * 3) * 0.15; }
  for (const h of G.heroes) {   // Aegis expiry
    if (h.dead || h.aegisT === undefined) continue;
    const slot = h.items.findIndex(it => it && it.id === 'aegis');
    if (slot < 0) { h.aegisT = undefined; continue; }
    if (G.time - h.aegisT >= AEGIS_LIFE) {
      h.items[slot] = null; h.aegisT = undefined; refreshHero(h); emit('aegisExpire', { unit: h.id });
      msg(`${heroLabel(h)} 的不朽之守护已过期消失`, '#ffca28');
    }
  }
}
// death with an Aegis: consume it, "die" for AEGIS_REVIVE s without bounty / death count, reincarnate on the spot
function aegisSave(u) {
  const slot = u.items ? u.items.findIndex(it => it && it.id === 'aegis') : -1; if (slot < 0) return false;
  u.items[slot] = null; u.aegisT = undefined;
  interruptChannel(u, 'death');
  u.dead = true; u.target = null; u.atk = null; u.casting = null; u.order = { type: 'idle' }; u.path = null;
  for (const m of u.mods.slice()) removeModifier(u, m);
  for (const x of units) if (x.target === u) x.target = null;
  u.respawn = AEGIS_REVIVE; u.reincarnate = { x: u.x, z: u.z }; u.dmgBy = {}; u.model.visible = false;
  burst(u.x, 1.5, u.z, 40, ['#ffca28', '#fff59d', '#ffffff'], 5, 1.2, 0.35, 5);
  emit('aegisUsed', { unit: u.id });
  msg(`${heroLabel(u)} 的不朽之守护生效——${AEGIS_REVIVE} 秒后原地复活！`, '#ffca28');
  return true;
}
