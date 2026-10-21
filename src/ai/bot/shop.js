// ai/bot/shop.js — bot purchases. Bots obey the player's shop rule (entities/shop.js): bought away from base → stash.
// Order each think: TP scroll (only when none is held — it is re-bought after use) → one salve when leaving base early (capped)
// → wards (supports: observers; sentries / dust only on *evidence*: a seen enemy ward placement (G.wardIntel) or an invisible
// enemy hero recently breaking invisibility near the team (G.invisEvidence), capped per team) → the build.
// Build = hero def.ai.build (real target items, recipes) or BOT_BUILDS[role], then BOT_EXTRA. For the next target item the bot
// buys the whole item when affordable (owned components are consumed, price reduced: entities/inventory.js), otherwise the
// next missing component — so gold is never hoarded for long. In base with a full inventory, the cheapest item that is not
// a component of the target is sold. Stats: b.buys {id: n}.
const BOT_BUILDS = {   // B7: supports Mek / Force / Glimmer / Pipe / Eul's; carries Daedalus / Butterfly / MKB; tanks Heart / Scepter
  carry: ['phase', 'bfury', 'bkb', 'daedalus', 'butterfly'],
  tank: ['phase', 'vanguard', 'blink', 'heart', 'scepter'],
  support: ['arcane', 'mekansm', 'force', 'glimmer', 'pipe'],
};
const BOT_EXTRA = { carry: ['mkb', 'heart', 'assault'], tank: ['assault', 'bkb', 'pipe'], support: ['euls', 'scepter', 'scythe'] };
const BOT_UTIL = { tp: 1, salve: 1, dust: 1, ward_obs: 1, ward_sentry: 1 };
const botRole = h => (h.def.ai && h.def.ai.role) || (h.def.stats.primary === 'int' ? 'support' : h.def.stats.primary === 'str' ? 'tank' : 'carry');
const botBuild = h => ((h.def.ai && (h.def.ai.build || h.def.ai.items)) || BOT_BUILDS[botRole(h)]).concat(BOT_EXTRA[botRole(h)]);
const BOT_SALVE_CAP = 3;
// sentry / dust caps per team: a few early, one more every 4 / 5 minutes
const teamCap = (id, t) => id === 'ward_sentry' ? 2 + Math.floor(t / 240) : 1 + Math.floor(t / 300);
const teamBuys = (team, id) => ((G.teamBuys || (G.teamBuys = [{}, {}]))[team][id] || 0);
Events.on('invisBreak', e => { const u = unitById(e.unit); if (u && u.isHero) (G.invisEvidence || (G.invisEvidence = [-999, -999]))[1 - u.team] = G.time; });
const invisEvidence = h => !!G.invisEvidence && G.time - G.invisEvidence[h.team] < 90;
function botBuy(h, b, id) {
  const e = buyItem(id, h);
  if (e) { if (e.startsWith('只能在神秘商店')) b.wantSecret = id; return false; }   // ai/bot/courier.js sends the courier
  if (b.wantSecret === id || ITEM_DEFS[id].shop === 'secret') b.wantSecret = null;
  (b.buys = b.buys || {})[id] = (b.buys[id] || 0) + 1; const tb = G.teamBuys || (G.teamBuys = [{}, {}]); tb[h.team][id] = (tb[h.team][id] || 0) + 1;
  return true;
}
// does item X contain `id` anywhere in its recipe tree (Dagon 3 ← Dagon 2 ← Dagon)?
const itemContains = (x, id) => (ITEM_DEFS[x].parts || []).some(p => p === id || itemContains(p, id));
// owns the item (or an item of its unique group, e.g. any boots), or something built from it (boots inside phase, Dagon inside Dagon 3)
function botHas(h, id) {
  const D = ITEM_DEFS[id];
  return h.items.concat((h.stash || []).map(s => ({ id: s.id, def: ITEM_DEFS[s.id] }))).some(it => it && (it.id === id || (D.uniqueGroup && it.def.uniqueGroup === D.uniqueGroup) || itemContains(it.id, id)));
}
// next purchase toward `id` when it is not affordable yet: the first missing component, descending into sub-recipes
// (Dagon 2 → Dagon → Staff of Wizardry). Returns {id, keep} or null.
function botNextPart(h, id, depth = 0) {
  const D = ITEM_DEFS[id], have = recipeParts(h, D), keep = D.parts || [];
  for (const p of new Set(keep)) {
    if (keep.filter(q => q === p).length <= have.filter(x => x.id === p).length) continue;
    const P = ITEM_DEFS[p];
    if (h.gold >= itemPrice(h, p)) return { id: p, keep };
    if (P.parts && depth < 4) { const sub = botNextPart(h, p, depth + 1); if (sub) return sub; }
    return null;   // save up for this component
  }
  return null;
}
// a slot is needed for a new (non-stacking) item; in base, sell the cheapest item worth < limit that is not part of `keep`
function botRoom(h, id, limit, keep = []) {
  const free = h.items.filter(i => !i).length - (h.stash || []).length;
  if (free > 0 || freeSlotFor(h, id) && ITEM_DEFS[id].stack) return true;
  if (!atShop(h)) return false;
  let best = -1; h.items.forEach((it, i) => { if (it && !BOT_UTIL[it.id] && !it.def.noSell && !keep.includes(it.id) && !it.def.uniqueGroup && it.def.cost < limit && (best < 0 || it.def.cost < h.items[best].def.cost)) best = i; });
  if (best < 0) return false;
  sellItem(best, h); return true;
}
function botShop(h, b) {
  const here = atShop(h), has = id => countItem(h, id) > 0, g = () => h.gold;
  if ((h.stash || []).length >= 2 && !here) return;   // nothing more until we pick the stash up
  if (!has('tp') && g() >= ITEM_DEFS.tp.cost && botRoom(h, 'tp', 400)) { botBuy(h, b, 'tp'); return; }
  if (here && h.level < 9 && !has('salve') && (b.buys && b.buys.salve || 0) < BOT_SALVE_CAP && g() >= 110 && botRoom(h, 'salve', 200)) { botBuy(h, b, 'salve'); return; }
  const role = botRole(h), allies = G.heroes.filter(a => a.team === h.team && a !== h && !a.dead);
  if (role === 'support' && !has('ward_obs') && stockOf(h.team, 'ward_obs') > 0 && g() >= 50 && h.level >= 2 && botRoom(h, 'ward_obs', 300)) { botBuy(h, b, 'ward_obs'); return; }
  const intel = G.wardIntel && G.wardIntel[h.team].some(w => G.time - w.t < 150), ev = invisEvidence(h);
  if ((intel || (ev && enemyInvis(h))) && teamBuys(h.team, 'ward_sentry') < teamCap('ward_sentry', G.time) && !has('ward_sentry') && !allies.some(a => countItem(a, 'ward_sentry') > 0) && stockOf(h.team, 'ward_sentry') > 0 && g() >= 50 && botRoom(h, 'ward_sentry', 300)) { botBuy(h, b, 'ward_sentry'); return; }
  if (ev && h.level >= 3 && !has('dust') && teamBuys(h.team, 'dust') < teamCap('dust', G.time) && !allies.some(a => countItem(a, 'dust') > 0) && g() >= ITEM_DEFS.dust.cost + 50 && botRoom(h, 'dust', 200)) { botBuy(h, b, 'dust'); return; }
  const build = botBuild(h);
  const id = build.find(x => !botHas(h, x)); if (!id) return;
  const D = ITEM_DEFS[id], keep = D.parts || [];
  if (g() >= itemPrice(h, id)) {   // whole item (owned parts are consumed → frees their slots)
    const freed = recipeParts(h, D).some(p => p.slot !== undefined);
    if (freed || botRoom(h, id, D.cost * 0.6, keep)) { botBuy(h, b, id); return; }
  }
  const nx = botNextPart(h, id);
  if (nx && botRoom(h, nx.id, ITEM_DEFS[nx.id].cost * 0.6, keep.concat(nx.keep))) botBuy(h, b, nx.id);
}
