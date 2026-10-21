// ui/messages.js — floating combat text (addFloat), center messages (msg), error toast (err).
// ================= floating text / messages =================
function addFloat(u, text, color, size = 15, life = 1.0, gold = false) {
  const f = { x: u.x + rnd(-0.4, 0.4), y: (u.isBuilding ? u.height : u.height * 0.9) + 0.3, z: u.z, text: String(text), color, size, t: 0, life, gold };
  floats.push(f); if (floats.length > 120) floats.shift();
  return f;
}
function updateFloats(dt) { for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t >= floats[i].life) floats.splice(i, 1); } }
function msg(text, color = '#fff') {
  const box = $('msgs'), d = document.createElement('div'); d.textContent = text; d.style.color = color; box.appendChild(d);
  while (box.children.length > 5) box.removeChild(box.firstChild);
  setTimeout(() => d.remove(), 3600);
}
let errTimer = 0;
function err(text) { sfxUI('denied'); const e = $('errmsg'); e.textContent = text; e.style.opacity = 1; clearTimeout(errTimer); errTimer = setTimeout(() => e.style.opacity = 0, 1300); }

