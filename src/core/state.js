// core/state.js — global game state, entity lists and the hero/item registries.
// Heroes and items register themselves from heroes/*.js and items/*.js (auto-globbed by build/build.js).
const HERO_DEFS = {};   // id -> hero definition (see heroes/_template.js)
const ITEM_DEFS = {};   // id -> item definition (see items/*.js)
function registerHero(def) { HERO_DEFS[def.id] = def; }
function registerItem(def) { ITEM_DEFS[def.id] = def; }
const heroList = () => Object.values(HERO_DEFS).sort((a, b) => (a.order || 99) - (b.order || 99));
const shopList = () => Object.values(ITEM_DEFS).filter(d => !d.noShop).sort((a, b) => (a.order || 99) - (b.order || 99));

const G = {
  started: false, over: false, paused: false, time: 0, frame: 0, timeScale: 1, nextWave: 1.5, wave: 0,
  player: null, heroes: [], halt: false, match: { enemies: 3, allies: 2, diff: 1 }, firstBlood: false, score: [0, 0], goldEarned: 0, winner: -1, god: false,
  superCreeps: [{ top: false, mid: false, bot: false }, { top: false, mid: false, bot: false }],
  cam: { x: 0, z: 0, dist: 62 }, targeting: null, lock: false, hover: null, selected: null, ancients: [], fountains: [], tps: [],
};
const units = [], projectiles = [], effects = [], timers = [], floats = [], corpses = [];
// schedule fn after `t` game seconds
function delay(t, fn) { timers.push({ t, fn }); }
