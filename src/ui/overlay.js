// ui/overlay.js — 2D canvas over WebGL: health/mana bars, status tags, floating combat text.
// ================= overlay (health bars, floating text) =================
const FONT = '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif';
function drawOverlay() {
  const W = innerWidth, H = innerHeight; ov.clearRect(0, 0, W, H);
  if (!G.started) return;
  const P = G.player; ov.textAlign = 'center'; ov.textBaseline = 'middle';
  for (const u of units) {
    if (u.dead || !u.model || !u.model.visible || u.kind === 'fountain') continue;
    const sc = u.model.userData.inner.scale.y;
    const s = toScreen(u.x, u.model.position.y + u.height * sc + 0.5, u.z);
    if (s.z > 1 || s.x < -80 || s.x > W + 80 || s.y < -40 || s.y > H + 40) continue;
    const hl = u.isHero || u.isIllusion;   // illusions get the exact hero bar (enemies can't tell them apart)
    if (CTL.sel.includes(u) && (CTL.sel.length > 1 || u !== P)) { const f = toScreen(u.x, u.model.position.y + 0.05, u.z), r = Math.max(10, (u.radius + 0.5) * 900 / G.cam.dist / 18);
      ov.strokeStyle = u === CTL.active ? '#ffeb3b' : '#b2ff59'; ov.lineWidth = 2; ov.beginPath(); ov.ellipse(f.x, f.y, r, r * 0.55, 0, 0, 6.29); ov.stroke(); }
    const w = hl ? 78 : u.kind === 'ancient' ? 140 : u.isBuilding ? 100 : 40, h = hl ? 9 : u.isBuilding ? 9 : 5;
    const x = Math.round(s.x - w / 2), y = Math.round(s.y), inv = isInvuln(u) && u.team !== P.team;
    ov.fillStyle = 'rgba(0,0,0,0.85)'; ov.fillRect(x - 1, y - 1, w + 2, h + 2 + (hl ? 5 : 0));
    ov.fillStyle = inv ? '#8d8d8d' : u === P ? '#3ce03c' : u.isIllusion && u.team === P.team ? '#4fa3ff' : u.team === P.team ? '#2fa52f' : u.team === NEUTRAL ? '#e0a030' : '#dd3a2a';
    let hpv = u.hp;   // enemy buildings in fog: last seen HP
    if (u.isBuilding && u.team !== P.team) { if (FOG.off || visAt(P.team, u.x, u.z) || u._seenHp === undefined) u._seenHp = u.hp; hpv = u._seenHp; }
    ov.fillRect(x, y, Math.max(0, w * hpv / u.maxHp), h);
    if (hl || u.isBuilding) { ov.fillStyle = 'rgba(0,0,0,0.5)'; const step = hl ? 250 : 500; for (let v = step; v < u.maxHp; v += step) ov.fillRect(x + Math.round(w * v / u.maxHp), y, 1, h); }
    if (hl) {
      ov.fillStyle = '#2f7be0'; ov.fillRect(x, y + h + 1, w * u.mana / Math.max(1, u.maxMana), 3);
      ov.fillStyle = '#000'; ov.fillRect(x - 19, y - 1, 18, h + 7); ov.fillStyle = '#ffd54f'; ov.font = 'bold 12px ' + FONT; ov.fillText(u.level, x - 10, y + h / 2 + 2);
    }
    let tag = '', tc = '#fff';
    if (inv && u.isBuilding) { tag = '无敌'; tc = '#ccc'; }
    if (u.mods.length) { const sm = statusTag(u); if (sm) { tag = sm[0]; tc = sm[1]; } }
    if (u.team === P.team && !u.isBuilding && !u.isWard && (isInvisible(u) || hasState(u, 'hidden')) && !tag) { tag = '隐身'; tc = '#b39ddb'; }
    if (u.isBuilding && G.hover === u) { tag = u.name + (inv ? '（无敌）' : ''); tc = '#fff'; }
    if (tag) { ov.font = 'bold 12px ' + FONT; ov.lineWidth = 3; ov.strokeStyle = '#000'; ov.strokeText(tag, s.x, y - 9); ov.fillStyle = tc; ov.fillText(tag, s.x, y - 9); }
  }
  for (const f of floats) {
    const k = f.t / f.life, s = toScreen(f.x, f.y + k * 2.4, f.z);
    if (s.z > 1) continue;
    ov.globalAlpha = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
    const sz = f.size * (f.pop ? (k < 0.14 ? 1.9 - k * 6.4 : 1) : (k < 0.12 ? 0.7 + k * 2.5 : 1)), jx = f.pop && k < 0.3 ? rnd(-2, 2) : 0;   // pop: big crit numbers punch in and shake
    ov.font = `bold ${sz | 0}px ${FONT}`; ov.lineWidth = f.pop ? 5 : 3; ov.strokeStyle = f.pop ? '#300' : '#000';
    ov.strokeText(f.text, s.x + jx, s.y); ov.fillStyle = f.color; ov.fillText(f.text, s.x + jx, s.y);
  }
  ov.globalAlpha = 1;
}

// status label above health bar: stunned > hexed > silenced > first named debuff (def.tag / def.name)
function statusTag(u) {
  if (hasState(u, 'stunned')) return ['眩晕', '#ffee58'];
  if (u.hexed) return ['妖术', '#76ff03'];
  if (u.silenced) return ['沉默', '#b39ddb'];   // B6: hard-CC tags outrank DoT tags (was: Arcane Curse hid the silence)
  for (const m of u.mods) if (m.def.tag) return [m.def.tag, m.def.color || '#fff'];
  return null;
}
