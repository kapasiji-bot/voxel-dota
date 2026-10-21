// ai/bot/wards.js — bot warding and dewarding. Observer spots: a predefined list per team (river / rune-ish spots and jungle
// entrances near each lane; Dire = Radiant mirrored through the map centre). Sentries go where the team saw an enemy ward
// being placed (G.wardIntel) or, versus invisible heroes, near the bot's lane position. Visible enemy wards close by are attacked.
// Only when calm: no visible enemy hero within 14 and HP > 50%. Gives up on a spot after 30 s.
const WARD_SPOTS_RAD = [
  { lane: 'mid', x: -10, z: 2 }, { lane: 'top', x: -40, z: -30 }, { lane: 'bot', x: 30, z: 40 },
  { lane: 'mid', x: -26, z: 10 }, { lane: 'top', x: -54, z: -10 }, { lane: 'bot', x: 10, z: 54 },
];
const wardSpots = team => team === RAD ? WARD_SPOTS_RAD : WARD_SPOTS_RAD.map(p => ({ lane: p.lane, x: -p.x, z: -p.z }));
const ownWardNear = (team, type, x, z, r) => units.some(u => u.isWard && !u.dead && u.team === team && u.ward === type && Math.hypot(u.x - x, u.z - z) < r);
function botWards(h, b, s) {
  if (s.hpPct < 0.5 || s.foes.some(f => dst(f, h) < 14)) { b.wardGoal = null; return null; }
  const ew = units.find(u => u.isWard && !u.dead && u.team !== h.team && dst(h, u) < 16 && canSee(h.team, u));
  if (ew) { botAttack(h, ew); return 'deward'; }
  b.wardSkip = b.wardSkip || {};
  const pick = () => {
    const so = itemSlot(h, 'ward_sentry');
    if (so >= 0) {
      const intel = (G.wardIntel ? G.wardIntel[h.team] : []).filter(w => G.time - w.t < 150 && dst(h, w) < 70 && !ownWardNear(h.team, 'sentry', w.x, w.z, 7));
      if (intel.length) return { slot: so, x: intel[0].x + 1.5, z: intel[0].z + 1.5, key: 'i' + Math.round(intel[0].x) };
      if (enemyInvis(h) && h.level >= 4) { const p = lanePos(h, b); if (!ownWardNear(h.team, 'sentry', p.x, p.z, 16)) return { slot: so, x: p.x, z: p.z, key: 'l' + h.bot.lane }; }
    }
    const ob = itemSlot(h, 'ward_obs'); if (ob < 0) return null;
    const spots = wardSpots(h.team).filter(p => !ownWardNear(h.team, 'obs', p.x, p.z, 12) && !(G.time - (b.wardSkip[p.x + ',' + p.z] || -1e9) < 120) && dst(h, p) < 70)
      .sort((a, c) => (a.lane !== b.lane) - (c.lane !== b.lane) || dst(h, a) - dst(h, c));
    return spots[0] ? { slot: ob, x: spots[0].x, z: spots[0].z, key: spots[0].x + ',' + spots[0].z } : null;
  };
  const w = pick(); if (!w) { b.wardGoal = null; return null; }
  if (!b.wardGoal || b.wardGoal.key !== w.key) b.wardGoal = { key: w.key, t: G.time };
  if (G.time - b.wardGoal.t > 30) { b.wardSkip[w.key] = G.time; b.wardGoal = null; return null; }
  const e = useItem(h, w.slot, { x: w.x, z: w.z });   // walks into range first (order 'useItem')
  if (!e && dst(h, w) <= 10.5) emit('botWard', { unit: h.id, item: h.items[w.slot] ? h.items[w.slot].id : 'ward', x: w.x, z: w.z });
  return 'ward';
}
