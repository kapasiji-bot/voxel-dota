// ui/killfeed.js — right-side kill feed (Chinese), last 6 entries, each fades after 10 s. Also mirrored to the event log.
function killFeed(text, team, killer, victim) {
  let box = $('killfeed');
  if (!box) { box = document.createElement('div'); box.id = 'killfeed'; document.body.appendChild(box); }
  const d = document.createElement('div'); d.className = 'kf';
  const P = G.player, mine = P && team === P.team;
  d.style.borderColor = mine ? '#4cff4c' : '#ff4040';
  const ico = h => h ? `<span class="kfi" style="background:${h.def.color}">${h.def.name[0]}</span>` : '';
  d.innerHTML = `${ico(killer)}<span style="color:${mine ? '#a5ff9a' : '#ff9a8a'}">${text}</span>${ico(victim)}`;
  box.appendChild(d); while (box.children.length > 6) box.removeChild(box.firstChild);
  setTimeout(() => d.remove(), 10000);
  emit('killFeed', { text });
}
