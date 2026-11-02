// ui/death.js — B12 death overlay: respawn countdown + buyback button / status (keeps ui/input.js slim).
function updateDeathUI(h) {
  const cost = buybackCost(h), ready = buybackReady(h), afford = h.gold >= cost;
  const cdLeft = h.bbCd && G.time < h.bbCd ? Math.ceil(h.bbCd - G.time) : 0;
  let status;
  if (cdLeft) status = `买活冷却 ${cdLeft} 秒`;
  else if (!afford) status = `买活需要 ${cost} 金（现有 ${Math.floor(h.gold)}）`;
  else status = `可买活 · ${cost} 金（快捷键 B）`;
  setT($('deathTxt'), `你已阵亡 —— ${Math.ceil(h.respawn)} 秒后复活`);
  setT($('bbStatus'), status);
  const btn = $('bbBtn'); if (btn) { btn.disabled = !canBuyback(h); btn.textContent = `买活（${cost}）`; btn.classList.toggle('ready', canBuyback(h)); }
}
function pressBuyback() {
  const e = doBuyback(G.player); if (e) err(e);
}
(function bindDeathUI() {
  const btn = $('bbBtn'); if (btn) btn.addEventListener('click', e => { e.stopPropagation(); pressBuyback(); });
})();
