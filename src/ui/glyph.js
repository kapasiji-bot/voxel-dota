// ui/glyph.js — B12 Glyph of Fortification HUD button (shared team cooldown) + hotkey G. Pointer-events on the button only.
function updateGlyphHUD() {
  const P = G.player; if (!P) return;
  const S = glyphState()[P.team], btn = $('glyphBtn'); if (!btn) return;
  const active = glyphActive(P.team), left = Math.max(0, S.ready - G.time);
  btn.classList.toggle('ready', left <= 0 && !active);
  btn.classList.toggle('on', active);
  btn.classList.toggle('cd', left > 0 && !active);
  setT(btn, active ? `符文 ${Math.ceil(S.until - G.time)}s` : left > 0 ? `符文 ${Math.ceil(left)}s` : '防御符文 (G)');
  btn.title = active ? '建筑无敌中' : left > 0 ? `冷却中 ${Math.ceil(left)} 秒` : '激活防御符文：己方建筑短暂无敌（全队共享冷却约 5 分钟）';
}
function pressGlyph() {
  const P = G.player; if (!P || P.dead) return;
  const e = castGlyph(P.team); if (e) err(e);
}
(function bindGlyph() {
  const btn = $('glyphBtn'); if (btn) btn.addEventListener('click', e => { e.stopPropagation(); pressGlyph(); });
})();
