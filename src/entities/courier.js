// entities/courier.js — B8 信使 Courier: one flying courier per hero (spawned with the hero's match: ai/bot/setup.js, debug
// spawnCourier). Flies in a straight line (ignores trees / cliffs / unit collision: movement.js separate skips u.flying).
// c.bag holds up to COURIER_BAG stash-like entries {id, n}. Orders (c.corder.type, set by courierOrder):
//   deliver — fly to base if the owner's stash has items, load them; fly to the owner, hand over what fits; then fly home
//   home    — fly back to the fountain and wait
//   secret  — fly to the owner's side secret shop and wait there (secret items bought then go into the bag: shopsites.js)
// Killable (towers, heroes, creeps): bounty to the killer, respawns COURIER_RESPAWN s later at the fountain keeping its bag.
const COURIER_BAG = 6, COURIER_HP = 300, COURIER_SPEED = 8.5, COURIER_RESPAWN = 60, COURIER_BOUNTY = 125;
const COURIER_CN = { idle: '待命', home: '返回基地', deliver: '运送物品', secret: '前往神秘商店' };
function courierHome(team) { const f = G.fountains[team] || heroSpawn(team); return { x: f.x + (team === RAD ? 4 : -4), z: f.z + (team === RAD ? -4 : 4) }; }
function spawnCourier(h, bag) {
  if (h.courier && !h.courier.dead) return h.courier;
  const p = courierHome(h.team), a = (h.slot || 0) * 1.25;
  const c = addUnit({ kind: 'courier', isCourier: true, flying: true, team: h.team, owner: h, name: `信使（${h.def.name}）`, x: p.x + Math.cos(a) * 2, z: p.z + Math.sin(a) * 2,
    radius: 0.45, height: 5.4, hp: COURIER_HP, maxHp: COURIER_HP, armor: 1, speed: COURIER_SPEED, dmgMin: 0, dmgMax: 0, range: 0, visionR: 10,
    bag: bag || [], corder: { type: 'idle' }, gold: COURIER_BOUNTY, xp: 0 }, buildModel('courier' + h.team, courierModelDef(h.team), 1.35));
  h.courier = c; h.courierRespawn = 0;
  emit('courierSpawn', { unit: c.id, owner: h.id });
  return c;
}
function courierBagAdd(c, id) {
  const D = ITEM_DEFS[id], ex = D.stack && c.bag.find(s => s.id === id);
  if (ex) ex.n++; else c.bag.push({ id, n: 1 });
}
function courierOrder(h, type) {
  const c = h && h.courier; if (!c) return '没有信使';
  if (c.dead) return `信使正在复活（${Math.ceil(h.courierRespawn - G.time)} 秒）`;
  if (type === 'deliver' && !c.bag.length && !(h.stash || []).length) return '没有需要运送的物品';
  c.corder = { type, phase: type === 'deliver' && (h.stash || []).length ? 'load' : 'bring', t0: G.time };
  emit('courierOrder', { unit: c.id, owner: h.id, type });
  return null;
}
function courierFly(c, x, z, dt, stop = 0.5) {
  const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz);
  if (d <= stop) return true;
  const s = Math.min(c.speed * dt, d - stop * 0.5); c.x = clamp(c.x + dx / d * s, -MAPH + 2, MAPH - 2); c.z = clamp(c.z + dz / d * s, -MAPH + 2, MAPH - 2);
  c.facing = Math.atan2(dx, dz); c.moveDist = (c.moveDist || 0) + s;
  return false;
}
function courierHandOver(c, h) {
  const got = [];
  for (let i = 0; i < c.bag.length;) { const s = c.bag[i]; if (freeSlotFor(h, s.id)) { giveItem(h, s.id, s.n); got.push(s.id); c.bag.splice(i, 1); } else i++; }
  if (got.length) {
    c.deliveries = (c.deliveries || 0) + 1; G.courierDeliveries = (G.courierDeliveries || 0) + 1;
    emit('courierDeliver', { unit: c.id, owner: h.id, items: got });
    if (h === G.player) msg(`信使送达：${got.map(id => ITEM_DEFS[id].name).join('、')}`, '#80d8ff');
  } else if (h === G.player) err('物品栏已满，信使无法交付');
}
function courierAI(c, dt) {
  const h = c.owner, o = c.corder, p = c.parts;
  if (p && p.wingL) { const f = Math.sin(G.time * 14 + c.id) * 0.55; p.wingL.rotation.z = f; p.wingR.rotation.z = -f; p.body.position.y = p.body.userData.p0.y + Math.sin(G.time * 3 + c.id) * 0.12; }
  if (o.type === 'home') { if (courierFly(c, ...Object.values(courierHome(c.team)), dt, 1)) c.corder = { type: 'idle' }; return; }
  if (o.type === 'secret') { const s = JUNGLE.shops.find(x => x.type === 'secret' && x.side === c.team); courierFly(c, s.x + 1.5, s.z + 1.5, dt, 1.2); return; }
  if (o.type !== 'deliver') return;
  if (o.phase === 'load') {
    const hp = courierHome(c.team);
    if (!courierFly(c, hp.x, hp.z, dt, 1.5)) return;
    const st = h.stash || [];
    while (st.length && c.bag.length < COURIER_BAG) c.bag.push(st.shift());
    o.phase = 'bring';
  }
  if (!c.bag.length) { c.corder = { type: 'home' }; return; }
  if (h.dead) { courierFly(c, ...Object.values(courierHome(c.team)), dt, 1.5); return; }   // wait at home until the hero respawns
  if (courierFly(c, h.x, h.z, dt, 1.8)) { courierHandOver(c, h); c.corder = { type: 'home' }; }
}
function courierDeath(c, killer) {
  const h = c.owner, kh = ownerOf(killer);
  if (kh && kh.team !== c.team) giveGold(COURIER_BOUNTY, c, kh);
  h.courierRespawn = G.time + COURIER_RESPAWN; c.corder = { type: 'idle' };
  emit('courierKill', { unit: c.id, owner: h.id, killer: kh ? kh.id : 0 });
  if (c.team === (G.player ? G.player.team : RAD)) msg(`${h === G.player ? '你的' : heroLabel(h) + '的'}信使被击杀了！${COURIER_RESPAWN} 秒后复活`, '#ff6b5b');
  else if (kh === G.player) msg(`击杀了敌方信使 +${COURIER_BOUNTY} 金`, '#7cdc6a');
  burst(c.x, 2.5, c.z, 16, ['#ffffff', '#b0bec5', c.team === RAD ? '#4fc3f7' : '#ef5350'], 4, 0.8, 0.25, 2);
  corpses.push({ u: c, t: 0 });
}
function tickCouriers() {
  for (const h of G.heroes) if (h.courier && h.courier.dead && h.courierRespawn && G.time >= h.courierRespawn) spawnCourier(h, h.courier.bag);
}
