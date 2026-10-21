// ai/bot/combos.js — cheap scripted combos from hero-file hints: def.ai.combos = [{ id, steps, min, radius, hpBelow? }].
//   steps: 'blink' (Blink Dagger item) | { slot, at: 'target'|'center'|'near' } — casts in order, each as soon as the previous
//   one went off (cooldown started / item used), giving up after 2.5 s on a step. Targets: the best enemy hero with ≥ min enemy
//   heroes within `radius` of it (or one under hpBelow). 'center' = their centroid, 'near' = a point 1.8 short of it on our side.
// Starts only when every step is ready (cooldowns, total mana, blink), we are healthy and the cluster is within reach.
// Examples: Earthshaker blink → Fissure → Echo Slam, Enigma blink → Black Hole, Lion Hex → Earth Spike, QoP Blink → Sonic Wave.
// Events: botCombo{unit, combo, step, n} per executed step, botComboDone{unit, combo, ok}.
function comboSteps(c) { return c.steps.map(s => typeof s === 'string' ? { item: s } : s); }
function comboReady(h, c) {
  let mana = 0;
  for (const s of comboSteps(c)) {
    if (s.item) { const sl = itemSlot(h, s.item); if (sl < 0 || h.items[sl].cd > 0) return false; continue; }
    const ab = h.abilities[s.slot]; if (!ab || !castReady(h, ab)) return false; mana += lvVal(ab.def, 'mana', ab.lvl) || 0;
  }
  return h.mana >= mana;
}
function comboReach(h, c) {   // how far the first step can get us
  const s = comboSteps(c)[0]; if (s.item) return (ITEM_DEFS[s.item].active.range || 20) + 2;
  return castRange(h, h.abilities[s.slot]) === Infinity ? 12 : castRange(h, h.abilities[s.slot]) + (s.at === 'near' ? 4 : 1);
}
function comboPoint(h, cb, at) {
  const t = cb.target, g = s => s.filter(f => !f.dead && dst(f, t) <= cb.def.radius + 1);
  const grp = g(cb.foes()), cx = grp.reduce((a, f) => a + f.x, t.x) / (grp.length + 1), cz = grp.reduce((a, f) => a + f.z, t.z) / (grp.length + 1);
  if (at === 'near') { const d = AB.dir({ x: cx, z: cz }, h); return { x: cx + d.x * 1.8, z: cz + d.z * 1.8 }; }
  return at === 'target' ? { x: t.x, z: t.z } : { x: cx, z: cz };
}
function botCombo(h, b, s) {
  const list = h.def.ai && h.def.ai.combos; if (!list || b.combo || s.hpPct < 0.45 || Math.random() > b.d.react) return false;
  for (const c of list) {
    if (!comboReady(h, c)) continue;
    const reach = comboReach(h, c);
    let best = null, bn = 0;
    for (const f of s.foes) {
      if (f.dead || !f.isHero || dst(f, h) > reach || enemyTowerAt(h.team, f.x, f.z, 0)) continue;
      const n = s.foes.filter(o => o.isHero && dst(o, f) <= c.radius).length, low = c.hpBelow && f.hp / f.maxHp < c.hpBelow;
      if ((n >= (c.min || 1) || low) && n > bn) { bn = n; best = f; }
    }
    if (!best) continue;
    b.combo = { def: c, steps: comboSteps(c), i: 0, target: best, t: G.time, issued: -1, foes: () => sense(h).foes };
    return botComboStep(h, b, s);
  }
  return false;
}
// advance an active combo; true while it is running (the brain skips everything else)
function botComboStep(h, b, s) {
  const cb = b.combo; if (!cb) return false;
  const end = ok => { emit('botComboDone', { unit: h.id, combo: cb.def.id, ok }); b.combo = null; return false; };
  if (cb.target.dead || !canSee(h.team, cb.target)) return end(false);
  if (h.casting) return true;
  const st = cb.steps[cb.i]; if (!st) return end(true);
  const done = st.item ? (itemSlot(h, st.item) < 0 || h.items[itemSlot(h, st.item)].cd > 0) : h.abilities[st.slot].cd > 0 || isToggled(h, h.abilities[st.slot].def.id);
  if (done && cb.issued === cb.i) { emit('botCombo', { unit: h.id, combo: cb.def.id, step: cb.i, n: cb.steps.length }); cb.i++; cb.t = G.time; if (cb.i >= cb.steps.length) return end(true); return botComboStep(h, b, s); }
  if (G.time - cb.t > 2.5) return end(false);
  if (h.channel) return true;
  if (cb.issued === cb.i && G.time - cb.it < 0.6) return true;   // wait for the order to go through
  cb.issued = cb.i; cb.it = G.time;
  if (st.item) { const p = comboPoint(h, cb, 'near'); useItem(h, itemSlot(h, st.item), p); return true; }
  const ab = h.abilities[st.slot], tt = ab.def.target;
  const tgt = tt === 'unit' ? cb.target : tt === 'none' ? null : comboPoint(h, cb, st.at || (tt === 'direction' ? 'center' : 'center'));
  const e = orderCast(h, st.slot, tgt); if (e) return end(false);
  return true;
}
