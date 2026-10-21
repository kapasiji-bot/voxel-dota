// ai/bot/setup.js — match setup: computer heroes for Dire (1–5) and optional Radiant allies (0–4), random heroes,
// lane split, difficulty. opts = { enemies, allies, diff: 0|1|2 }.
const LANES_BY_COUNT = { 1: ['mid'], 2: ['mid', 'top'], 3: ['mid', 'top', 'bot'], 4: ['mid', 'top', 'bot', 'top'], 5: ['mid', 'top', 'top', 'bot', 'bot'] };
const ALLY_LANES = ['bot', 'top', 'bot', 'top'];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function setupMatch(playerHeroId, opts = {}) {
  const ne = clamp(opts.enemies | 0, 0, 5), na = clamp(opts.allies | 0, 0, 4), diff = clamp(opts.diff === undefined ? 1 : opts.diff, 0, 2);
  // opts.picks: optional fixed hero ids by bot index (dire bots first, then allies; null = random) — tests / sims
  const want = (opts.picks || []).map(id => id && id !== playerHeroId && HERO_DEFS[id] ? id : null);
  const rest = shuffle(heroList().map(d => d.id).filter(id => id !== playerHeroId && !want.includes(id)));   // never duplicates the player
  const pool = []; for (let i = 0; i < heroList().length - 1; i++) pool.push(want[i] || rest.shift()); while (pool.length && !pool[pool.length - 1]) pool.pop();
  const pick = i => pool[i % pool.length];
  const out = [];
  LANES_BY_COUNT[ne] && LANES_BY_COUNT[ne].forEach((lane, i) => out.push(spawnBot(pick(i), DIRE, lane, diff, i)));
  for (let i = 0; i < na; i++) out.push(spawnBot(pick(ne + i), RAD, ALLY_LANES[i], diff, i + 1));
  for (const h of G.heroes) if (!h.courier) spawnCourier(h);   // entities/courier.js (B8): one courier per hero
  if (out.length) msg(`对局：天辉 ${1 + na} 名英雄 vs 夜魇 ${ne} 名电脑英雄（${DIFF_CN[diff]}）`, '#80d8ff');
  return out;
}
function spawnBot(id, team, lane, diff, slot) {
  const h = createHero(id, team, { bot: true, slot, ring: team === RAD ? '#40c4ff' : '#ff4040' });
  h.bot = makeBot(h, lane, diff); if (G.started) spawnCourier(h); return h;
}
// hand the player's hero to the AI (debug / spectating / full-bot simulations)
function setPlayerBot(on = true, diff = 1, lane = 'mid') { const P = G.player; if (!P) return; P.bot = on ? makeBot(P, lane, diff) : null; }
