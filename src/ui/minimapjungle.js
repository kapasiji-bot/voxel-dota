// ui/minimapjungle.js — B8 minimap icons: neutral camps (size-coded triangles, dimmed when the camp is empty as far as our
// team knows), Roshan pit (skull disc: red while Roshan is alive and our team can see the pit or it was seen alive),
// (camp / Roshan state = what our team last saw), side shops (teal) and secret shops (purple) as small house icons, ground items (Aegis) as a gold dot.
const MM_CAMP_R = { small: 2.5, medium: 3, large: 3.6, ancient: 4.2 };
function mmShop(x, y, col) { mmx.fillStyle = '#000'; mmx.fillRect(x - 4, y - 2, 8, 6); mmx.beginPath(); mmx.moveTo(x - 5, y - 1); mmx.lineTo(x, y - 6); mmx.lineTo(x + 5, y - 1); mmx.fill(); mmx.fillStyle = col; mmx.fillRect(x - 3, y - 1, 6, 4); mmx.beginPath(); mmx.moveTo(x - 3.5, y - 1.5); mmx.lineTo(x, y - 4.5); mmx.lineTo(x + 3.5, y - 1.5); mmx.fill(); }
function drawMinimapJungle(PT) {
  const J = G.jg;
  for (const c of J ? J.camps : JUNGLE.camps) {
    const x = w2m(c.x), y = w2m(c.z), r = MM_CAMP_R[c.size];
    if (J && (FOG.off || visAt(PT, c.x, c.z))) c.known = c.units.some(u => !u.dead);   // last state our team saw
    const alive = !J || c.known !== false;
    mmx.fillStyle = '#000'; mmx.beginPath(); mmx.moveTo(x, y - r - 1.5); mmx.lineTo(x + r + 1.5, y + r); mmx.lineTo(x - r - 1.5, y + r); mmx.fill();
    mmx.fillStyle = alive ? (c.size === 'ancient' ? '#ff7043' : '#ffca28') : '#6d6d6d'; mmx.beginPath(); mmx.moveTo(x, y - r); mmx.lineTo(x + r, y + r - 1); mmx.lineTo(x - r, y + r - 1); mmx.fill();
  }
  const R = G.rosh, px = w2m(PIT.x), py = w2m(PIT.z), seen = FOG.off || visAt(PT, PIT.x, PIT.z);
  if (R && seen) R.known = !!(R.unit && !R.unit.dead);
  const up = R ? (R.known !== undefined ? R.known : true) : true;
  mmx.fillStyle = '#000'; mmx.beginPath(); mmx.arc(px, py, 6, 0, 6.29); mmx.fill();
  mmx.fillStyle = up ? '#c62828' : '#5d4037'; mmx.beginPath(); mmx.arc(px, py, 4.6, 0, 6.29); mmx.fill();
  mmx.fillStyle = '#fff'; mmx.font = 'bold 8px sans-serif'; mmx.textAlign = 'center'; mmx.textBaseline = 'middle'; mmx.fillText('肉', px, py + 0.5);
  for (const s of JUNGLE.shops) mmShop(w2m(s.x), w2m(s.z), s.type === 'secret' ? '#ba68c8' : '#4db6ac');
  for (const d of drops) { const x = w2m(d.x), y = w2m(d.z); mmx.fillStyle = '#000'; mmx.fillRect(x - 3, y - 3, 6, 6); mmx.fillStyle = '#ffca28'; mmx.fillRect(x - 2, y - 2, 4, 4); }
}
