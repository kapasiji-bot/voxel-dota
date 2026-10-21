// ai/bot/brain.js — computer hero controller. botUpdate runs every step but only *thinks* every diff.tick seconds (3–8 Hz);
// it issues normal orders (issueOrder / orderCast / useItem) that heroAI then executes, exactly like player input.
// Priority each tick: skills/shop → keep channel → react (reflect/dodge) → retreat/heal → TP to lane → defend (TP) → fight heroes
// (fight.js) → items → wards/deward (wards.js) → lane.
// Perception is limited to the bot's team vision (sense.js); remembered enemies (s.ghosts) only add to the danger estimate.
function makeBot(h, lane, diffIdx = 1) {
  return { lane, diffIdx, d: DIFFS[diffIdx], t: Math.random() * 0.2, mode: 'lane', seen: {}, off: rnd(-1.5, 1.5), target: null, retreat: false };
}
function setMode(h, b, m) { if (b.mode !== m) { emit('botMode', { unit: h.id, from: b.mode, to: m }); b.mode = m; } }
function botUpdate(h, dt) {
  const b = h.bot; if (!b || h.dead || G.over) return;
  b.t -= dt; if (b.t > 0) return;
  b.t = b.d.tick * rnd(0.8, 1.2); b.thinks = (b.thinks || 0) + 1;
  if (h.casting) return;                          // never cancel our own cast point
  botLevelSkills(h); botAutocast(h);   // abilities/orb.js: bots autocast orbs
  const s = sense(h);
  for (const f of s.foes) { const m = b.seen[f.id]; if (!m || G.time - m.t > 0.4) b.seen[f.id] = { x: f.x, z: f.z, t: G.time }; }
  if (h.channel && b.combo) botComboStep(h, b, s);   // a combo ending in a channel (Black Hole) completes while channelling
  if (h.channel && botKeepChannel(h, b, s)) return;   // ai/bot/ults.js: keep / stop channels
  if (h.channel) return;
  if (b.combo && !b.retreat && botComboStep(h, b, s)) return;   // ai/bot/combos.js: finish a running combo first
  botShop(h, b); botCourier(h, b);   // ai/bot/courier.js (B8)
  botUnits(h, b, s);   // ai/bot/units.js: own summons / illusions
  botToggles(h, b, s);  // ai/bot/ults.js: Voodoo Restoration on / off
  // --- retreat / heal at fountain (hysteresis) ---
  if (botReact(h, b, s)) return;
  const foeP = groupPower(s.foes, h.x, h.z, 14) + s.ghosts.reduce((a, g) => a + (Math.hypot(g.x - h.x, g.z - h.z) <= 14 ? g.p * 0.7 : 0), 0), myP = heroPower(h) + groupPower(s.allies, h.x, h.z, 14);
  if (s.hpPct < b.d.retreat || (s.hpPct < 0.45 && foeP > myP * 1.6) || (h.mana < h.maxMana * 0.08 && s.hpPct < 0.7 && !s.foes.length && h.level >= 4)) b.retreat = true;
  if (b.retreat) {
    const f = G.fountains[h.team];
    if (f && dst(h, f) < 11 && h.hp > h.maxHp * 0.92 && h.mana > h.maxMana * 0.6) b.retreat = false;
    else { if (!s.foes.length && botLoot(h, b)) return; botRetreat(h, b, s); return; }   // a hurt carry still grabs a nearby Aegis / Cheese when safe
  }
  if (botTpLane(h, b, s)) { setMode(h, b, 'tp'); return; }   // ai/bot/tp.js
  // --- defend base structures (TP when far) ---
  const thr = baseThreat(h) || (h.level >= 6 && s.hpPct > 0.7 ? defendTarget(h) : null);
  if (thr && dst(h, thr) > 45 && !s.foes.length && botTp(h, b, thr, 'defend')) { setMode(h, b, 'tp'); return; }
  if (thr && dst(h, thr) < 80 && !s.foes.some(f => dst(f, h) < 10)) { setMode(h, b, 'defend'); if (h.order.type !== 'amove' || dst(h.order, thr) > 4) issueOrder(h, { type: 'amove', x: thr.x, z: thr.z }); return; }
  // --- fight ---
  const t = pickFightTarget(h, b, s);
  if (t) { setMode(h, b, 'fight'); b.target = t; if (botCombo(h, b, s)) return; if (botUseItems(h, b, s, 'fight', t)) return; if (botBigSpells(h, b, s)) return; if (botCastOnHero(h, b, s, t)) return; if (!(h.atk && h.atk.target === t)) botAttack(h, t); return; }
  b.target = null;
  const jm = botJungle(h, b, s); if (jm) { setMode(h, b, jm); botUseItems(h, b, s, 'lane', null); return; }   // ai/bot/jungle.js (B8): Roshan / Aegis / neutral farm
  if (botUseItems(h, b, s, 'lane', null)) return;
  if (botSummon(h, b, s)) return;          // wolves / bear / treants
  if (s.foes.length && (botCombo(h, b, s) || botBigSpells(h, b, s))) return;   // Frost Shield on a sieged tower, clustered-enemy ults
  if (botFendUnits(h, b, s)) { setMode(h, b, 'fend'); return; }
  // Lion-style mana drain etc. when a lone enemy is near and we are safe
  if (s.foes.length === 1 && dst(h, s.foes[0]) < 11 && botCastOnHero(h, b, s, s.foes[0])) return;
  const wm = botWards(h, b, s); if (wm) { setMode(h, b, wm); return; }   // ai/bot/wards.js
  setMode(h, b, botLane(h, b, s));
}
function botRetreat(h, b, s) {
  setMode(h, b, 'retreat');
  if (h.channel && !h.channel.ab.def.item) interruptChannel(h, 'retreat');   // keep a TP home going
  const near = s.foes.filter(f => dst(f, h) < 9).sort((a, c) => dst(a, h) - dst(c, h))[0];
  if (near && botCastOnHero(h, b, s, near, { onlyDisable: true })) return;   // disable the chaser
  if (botEscape(h, b, s)) return;                                            // blink / invis / orb-jaunt away
  const fo = G.fountains[h.team]; if (fo && !s.foes.some(f => dst(f, h) < 18) && dst(h, fo) > 50 && botTp(h, b, fo, 'home')) return;   // TP home when safe
  if (botUseItems(h, b, s, 'retreat', null)) return;
  const f = G.fountains[h.team], sp = heroSpawn(h.team);
  if (f && dst(h, f) < 9) { if (h.order.type !== 'stand') issueOrder(h, { type: 'stand' }); return; }
  botMove(h, sp.x, sp.z);
}
// own base structure under attack (tier 3+, barracks, ancient) or our lane's tower being sieged
function baseThreat(h) {
  let best = null;
  for (const u of units) {
    if (u.dead || !u.isBuilding || u.team !== h.team || u.kind === 'fountain') continue;
    const important = u.kind === 'ancient' || u.kind === 'barracks' || (u.tier || 0) >= 3 || (u.lane === h.bot.lane && (u.tier || 0) >= 2);
    if (!important || u.hp >= u.maxHp * 0.98) continue;
    let n = 0; for (const e of units) if (!e.dead && e.team !== h.team && !e.isBuilding && dst(e, u) < 16) n += e.isHero ? 2 : 1;
    if (n >= 3 && (!best || dst(h, u) < dst(h, best))) best = u;
  }
  return best;
}
