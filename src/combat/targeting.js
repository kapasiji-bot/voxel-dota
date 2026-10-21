// combat/targeting.js — auto-acquire (findEnemy: nearest visible enemy, units before buildings, heroes slightly penalised;
// towers ignore neutrals, nothing auto-acquires Roshan) and crit helpers shared by modifyAttack hooks. Split from attack.js (B8).
function findEnemy(u, r, o = {}) {
  let best = null, bs = 1e9;
  for (const e of units) {
    if (e.dead || e.team === u.team || e.kind === 'fountain' || e.isWard || isInvuln(e) || !canSee(u.team, e)) continue;
    if (o.noBuild && e.isBuilding) continue;
    if (e.isNeutral && (u.isBuilding || e.isRoshan)) continue;   // towers ignore neutral creeps; nothing auto-acquires Roshan
    const d = edgeDist(u, e); if (d > r) continue;
    const s = d + (e.isBuilding ? 6 : 0) + (e.isHero ? (o.heroPen || 1.5) : 0);
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
// critical strike helper for modifyAttack hooks: keeps only the HIGHEST crit (Jinada vs Coup de Grace don't multiply);
// misses never reach modifyAttack, so evasion beats crit; returns true if this crit was applied
function applyCrit(info, mult) { if (mult <= (info.crit || 1)) return false; info.dmg = info.dmg / (info.crit || 1) * mult; info.crit = mult; return true; }
function critFloat(tgt, dealt, mult) {
  if (!(dealt > 0) || !canSee(RAD, tgt)) return;
  const huge = mult >= 2.5, f = addFloat(tgt, Math.round(dealt) + '!', huge ? '#ff1744' : '#ff5252', huge ? 40 : 24, huge ? 1.5 : 1.1); f.pop = huge;
  if (huge) burst(tgt.x, tgt.height * 0.6, tgt.z, 26, ['#b71c1c', '#ff1744', '#880e4f'], 6, 0.6, 0.25, 3);
}
