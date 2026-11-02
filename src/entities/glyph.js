// entities/glyph.js — B12 Glyph of Fortification. Shared per-team cooldown (~5 min). Briefly makes every living building
// on that team invulnerable (MODS-style state). HUD button + hotkey G (ui/glyph.js); bots use it under siege (ai/bot/glyph.js).
const GLYPH_CD = 300, GLYPH_DUR = 7;
const GLYPH_MOD = { id: 'glyph', name: '防御符文', color: '#ffd54f', states: ['invulnerable'],
  fx(u) { if (Math.random() < 0.15) spawnP(u.x + rnd(-1, 1), rnd(0.5, u.height || 3), u.z + rnd(-1, 1), 0, 1.2, 0, 0.5, 0.18, '#fff59d'); } };
const glyphState = () => G.glyph || (G.glyph = [{ ready: 0, until: 0 }, { ready: 0, until: 0 }]);
const glyphReady = team => G.time >= glyphState()[team].ready;
const glyphActive = team => G.time < glyphState()[team].until;
function castGlyph(team) {
  const S = glyphState()[team]; if (G.time < S.ready) return '防御符文冷却中';
  S.ready = G.time + GLYPH_CD; S.until = G.time + GLYPH_DUR;
  let n = 0;
  for (const u of units) if (!u.dead && u.isBuilding && u.team === team && u.kind !== 'fountain') {
    addModifier(u, GLYPH_MOD, u, { dur: GLYPH_DUR }); n++;
  }
  emit('glyph', { team, n, until: S.until });
  if (G.player && G.player.team === team) msg(`防御符文启动！建筑无敌 ${GLYPH_DUR} 秒`, '#ffd54f');
  return null;
}
function tickGlyph() { /* duration handled by modifiers; state kept for HUD cooldown */ }
