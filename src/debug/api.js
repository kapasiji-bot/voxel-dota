// debug/api.js — window.GameAPI / window.DEBUG (always available). Use ?debug=1 for the HUD badge and auto-recording.
// Prefer GameAPI for new tests; DEBUG is an alias. See ARCHITECTURE.md.
function compactUnit(u) {
  return { id: u.id, kind: u.kind, team: u.team, name: u.name, hp: Math.round(u.hp), maxHp: Math.round(u.maxHp), x: +u.x.toFixed(2), z: +u.z.toFixed(2),
    lane: u.lane || null, armor: +(u.armor || 0).toFixed(1), dead: !!u.dead };
}
function getState() {
  const P = G.player, counts = { units: { 0: 0, 1: 0, 2: 0 }, buildings: { 0: 0, 1: 0 }, creeps: { 0: {}, 1: {}, 2: {} } };
  for (const u of units) if (!u.dead) {
    if (u.isBuilding) counts.buildings[u.team]++; else { counts.units[u.team]++; if (u.lane) counts.creeps[u.team][u.lane] = (counts.creeps[u.team][u.lane] || 0) + 1; }
  }
  const buildings = units.filter(u => u.isBuilding && !u.dead).map(u => ({ id: u.id, kind: u.kind, team: u.team, name: u.name, hp: Math.round(u.hp), maxHp: Math.round(u.maxHp), invuln: isInvuln(u) }));
  return {
    time: +G.time.toFixed(3), frame: G.frame, paused: G.paused, halted: G.halt, over: G.over, winner: G.winner, score: G.score.slice(), wave: G.wave, nextWave: +G.nextWave.toFixed(2),
    timeScale: G.timeScale, god: G.god, counts,
    hero: P ? { id: P.id, heroId: P.def.id, name: P.name, level: P.level, xp: Math.floor(P.xp), gold: Math.floor(P.gold),
      x: +P.x.toFixed(2), z: +P.z.toFixed(2), hp: Math.round(P.hp), maxHp: P.maxHp, mana: Math.round(P.mana), maxMana: P.maxMana,
      str: +P.str.toFixed(1), agi: +P.agi.toFixed(1), int: +P.int.toFixed(1), dmg: [Math.round(P.dmgMin), Math.round(P.dmgMax)], armor: +P.armor.toFixed(1),
      atkInterval: +P.atkInterval.toFixed(3), atkPoint: P.atkPoint, speed: +P.speed.toFixed(2),
      abilities: P.abilities.map(a => ({ id: a.def.id, lvl: a.lvl, cd: +a.cd.toFixed(2) })),
      items: P.items.map(i => i ? { id: i.id, cd: +i.cd.toFixed(2) } : null),
      mods: P.mods.map(m => ({ id: m.def.id, stacks: m.stacks, t: isFinite(m.t) ? +m.t.toFixed(2) : null })),
      order: P.order.type, dead: P.dead, kills: P.kills, deaths: P.deaths, lh: P.lh, dn: P.dn } : null,
    heroes: G.heroes.map(heroSummary), night: isNight(), fogOff: FOG.off,
    buildings,
  };
}
function heroSummary(h) {
  return { id: h.id, heroId: h.def.id, team: h.team, bot: !!h.bot, lane: h.bot ? h.bot.lane : null, mode: h.bot ? h.bot.mode : null, level: h.level,
    hp: Math.round(h.hp), maxHp: h.maxHp, x: +h.x.toFixed(1), z: +h.z.toFixed(1), dead: h.dead, respawn: h.dead ? +h.respawn.toFixed(1) : 0,
    k: h.kills, d: h.deaths, a: h.assists, lh: h.lh, dn: h.dn, gold: Math.floor(h.gold), items: h.items.map(i => i ? i.id : null), skills: h.abilities.map(a => a.lvl) };
}
function spawnUnit(kind, team, x, z, o = {}) {
  if (kind === 'hero') { const h = createHero(o.heroId || 'axe', team); h.x = x; h.z = z; return h; }
  if (kind === 'melee' || kind === 'ranged') return spawnCreep(kind, team, o.lane || 'mid', x, z, o);
  throw new Error('spawnUnit: unsupported kind ' + kind);
}
function teleportHero(x, z, h = G.player) {
  if (!h) return; issueOrder(h, { type: 'idle' });
  if (!isWalk(x, z)) { const c = nearestWalkCell(cellOf(x), cellOf(z)); if (c) { x = cc(c[0]); z = cc(c[1]); } }
  h.x = x; h.z = z; if (h.model) h.model.position.set(x, heightAt(x, z), z); FOG.dirty = true;
}
function castAbility(slot, target, h = G.player) {
  if (!h) return 'no hero';
  const ab = h.abilities[slot]; if (!ab) return 'bad slot';
  if (ab.lvl === 0) { ab.lvl = 1; refreshHero(h); }
  h.mana = h.maxMana; ab.cd = 0;
  return orderCast(h, slot, target);
}
function destroyBuilding(kindOrId, team = DIRE) {
  const u = typeof kindOrId === 'number' ? unitById(kindOrId)
    : units.find(x => x.isBuilding && !x.dead && x.team === team && x.kind === kindOrId);
  if (!u) return false;
  // force unlock so win-condition tests can skip the tower chain
  u.req = null; u.reqAny = null; dealDamage(G.player, u, u.maxHp + 1e6, 'pure', { silent: true });
  return true;
}
function skipTo(t) {
  const target = Math.max(G.time, t); let guard = 0;
  while (G.time + 1e-6 < target && !G.over && ++guard < 200000) step(Math.min(0.05, target - G.time));
}
const GameAPI = {
  get G() { return G; }, get units() { return units; },
  Events, getState, setTimeScale(s) { G.timeScale = Math.max(0, s); },
  // halt the real-time loop (tests drive the sim with step/simulate; input still works)
  pause() { G.halt = true; }, resume() { G.halt = false; },
  step(frames = 1, dt = 1 / 30) { for (let i = 0; i < frames; i++) step(dt); },
  simulate(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) step(dt); },
  // API default: no computer heroes (deterministic tests). Pass {enemies, allies, diff} for a bot match.
  startGame: (id, opts) => startGame(id, Object.assign({ enemies: 0, allies: 0, diff: 1 }, opts || {})),
  setPlayerBot, getHeroes: () => G.heroes.map(heroSummary), spawnBot: (id, team, lane = 'mid', diff = 1) => spawnBot(id, team, lane, diff, G.heroes.length),
  spawnUnit, setGold(n, h = G.player) { if (h) h.gold = n; },
  setLevel(n, h = G.player) { if (h) setHeroLevel(h, n); },
  giveXP: (n, h = G.player) => h && gainXP(h, n),
  giveItem: (id, h = G.player) => giveItem(h, id),
  buyItem, sellItem, useItem, learnSkill,
  teleportHero, castAbility, issueMove, issueAttack, issueOrder,
  dealDamage, killUnit, destroyBuilding, killUnitById: id => { const u = unitById(id); if (u) killUnit(u, G.player); },
  godMode(on = true) { G.god = !!on; },
  skipTo, record(on = true) { Events.recording = !!on; if (on) Events.log.length = 0; },
  clearLog() { Events.log.length = 0; },
  getLog(filter) { return filter ? Events.log.filter(e => e.type === filter || (typeof filter === 'function' && filter(e))) : Events.log.slice(); },
  on: (t, fn) => Events.on(t, fn), off: (t, fn) => Events.off(t, fn),
  toScreen, groundAt, pickUnit, HERO_DEFS, ITEM_DEFS,
  // engine access for tests: status/modifier helpers
  // fog of war / vision: revealAll(true) turns fog off (invisibility still applies); isVisible(unitOrId, team)
  revealAll(on = true) { FOG.off = !!on; FOG.dirty = true; }, isVisible: (u, team = RAD) => canSee(team, typeof u === 'number' ? unitById(u) : u),
  visAt, isNight, isInvisible, isWalk, sightBlocked: (x, z) => sightBlock[cellOf(z) * GN + cellOf(x)] === 1, updateVision() { updateVision(); }, FOG, VIS,
  // wards / TP / shop rule
  botRole, placeWard, liveWards, sentrySees, tpDest, atShop, stockOf, countItem, wardSpots,
  // B4: summons / illusions / unit control / trees / forms / recipes
  spawnSummon, makeIllusion, ownedUnits, illusionsOf, ownerOf, SUMMON_TYPES, CTL, selectUnits, ctlSel, ctlActive, cycleActive, ctlGroup, orderSel,
  TREES, sproutTree, destroyTree, treesNear, treeAt: (x, z) => treeAt[cellOf(z) * GN + cellOf(x)] === 1, setForm, clearForm, itemPrice, recipeParts,
  dealDamage, wakeOnDamage,
  // B5: walls / toggles / pathing
  WALLS, addWall, wallLine, findPath, isToggled, toggleAbility, interruptChannel,
  // B6: orbs / blur / combos
  toggleAutocast: (slot, on, h = G.player) => toggleAutocast(h, slot, on), applyCrit, comboReady, botCombo, PORTRAITS, floats, projPool, BEAM_POOL, projectiles,
  setShadows(on) { renderer.shadowMap.enabled = !!on; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); },
  // B6: perf probes — render one frame now and report renderer.info + live object counts
  renderInfo() { updateCamera(1); renderFog(0); const t0 = performance.now(); renderer.render(scene, camera); const ms = performance.now() - t0, i = renderer.info; let objs = 0; scene.traverse(() => objs++);
    return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures, progs: i.programs ? i.programs.length : 0, objs, ms: +ms.toFixed(1),
      particles: parts.length, projectiles: projectiles.length, effects: effects.length, timers: timers.length, units: units.length, live: units.filter(u => !u.dead).length, floats: (typeof floats !== 'undefined' ? floats.length : -1), log: Events.log.length }; },
  laneS, laneDist, AB, MODS, addModifier, removeModById, hasState, getMod, stun: (u, dur, src = null) => stunUnit(u, src, dur),
  // B7: items / scepter / shop UI
  isInvuln, itemCat, setShopTab, setShopSearch, itemTip, skillTip, recipeTree, hasScepter, scepterDef, applyScepter, itemTargetError, absorbMagic,
  botItemActives, botNextPart, botHas, itemPrice, recipeParts, toggleShop, buildShop, updateShop,
  JUNGLE, PIT, NEUTRAL, CAMP_BOX, LEASH, NEUTRAL_TYPES, CAMP_KINDS, jg, spawnCamp, tickCamps, campBlocker, rosh, spawnRoshan, inPit, drops, spawnDrop, pickupDrop,
  nearShopSite, buyWhere, needsSecret, shopLocLabel, shopSiteHere, sideSells, courierOrder, spawnCourier, courierBagAdd, botJungle, botCourier, pickCamp, roshCallFor, updateCourierHUD,
  campNow() { jg().nextCamp = G.time; tickCamps(); }, };   // B8 jungle / Roshan / drops / shops / courier; campNow = minute-mark camp check now
window.GameAPI = GameAPI; window.DEBUG = GameAPI; window.VD = GameAPI;   // VD kept for older scripts
if (location.search.includes('debug=1')) {
  Events.recording = true;
  addEventListener('load', () => {
    const b = document.createElement('div'); b.id = 'dbgBadge';
    b.style.cssText = 'position:fixed;top:44px;right:8px;z-index:80;background:#b71c1c;color:#fff;padding:3px 8px;border:2px solid #000;font:bold 12px sans-serif';
    b.textContent = 'DEBUG'; document.body.appendChild(b);
  });
}
