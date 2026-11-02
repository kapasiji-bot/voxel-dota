// ai/bot/glyph.js — B12: bots cast Glyph when an important structure is under siege (team defend plan or heavy damage).
function botGlyph(h, b) {
  if (!glyphReady(h.team) || glyphActive(h.team)) return false;
  const p = teamPlan(h.team);
  let tgt = p.mode === 'defend' ? p.target : null;
  if (!tgt) {
    for (const u of units) {
      if (u.dead || !u.isBuilding || u.team !== h.team || u.kind === 'fountain') continue;
      if (!(u.kind === 'ancient' || u.kind === 'barracks' || (u.tier || 0) >= 3)) continue;
      if (u.hp > u.maxHp * 0.85) continue;
      const foes = knownEnemies(h.team, u.x, u.z, 16); if (foes.length >= 2) { tgt = u; break; }
    }
  }
  if (!tgt) return false;
  // only one bot on the team presses it (lowest id among living bots)
  const presser = aliveBots(h.team).sort((a, c) => a.id - c.id)[0];
  if (presser !== h) return false;
  if (castGlyph(h.team)) return false;
  emit('botGlyph', { unit: h.id, team: h.team, target: tgt.id });
  return true;
}
