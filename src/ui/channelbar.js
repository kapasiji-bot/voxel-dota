// ui/channelbar.js — channel progress bar above the HUD while the player channels (Freezing Field, Mana Drain, ...).
let chanEl = null;
function updateChannelBar() {
  const P = G.player, ch = P && P.channel;
  if (!chanEl) {
    chanEl = document.createElement('div'); chanEl.id = 'chanBar'; chanEl.className = 'hidden';
    chanEl.innerHTML = '<div class="cf"></div><span></span>'; document.body.appendChild(chanEl);
  }
  chanEl.classList.toggle('hidden', !ch);
  if (!ch) return;
  setS(chanEl.firstChild, 'width', Math.min(100, ch.t / ch.dur * 100).toFixed(1) + '%');
  setT(chanEl.lastChild, `持续施法：${ch.ab.def.name}  ${Math.max(0, ch.dur - ch.t).toFixed(1)} 秒`);
}
