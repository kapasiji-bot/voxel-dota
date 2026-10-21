// ai/bot/fight.js — choose an enemy hero worth fighting (or null). Cheap, per think:
//   kill potential (attacks + ready damage spells, disables buy time), team power around the target (visible allies/foes plus
//   recently-seen foes), ultimates ready on either side, own mana, tower safety (never under an enemy tower unless a 困难 dive
//   on a killable target; fighting under our own tower is favoured), and per-hero / invisibility / early-game modifiers.
const ultReady = h => h.abilities.some(a => a.def.ult && a.lvl > 0 && a.cd <= 0 && h.mana >= (lvVal(a.def, 'mana', a.lvl) || 0));
function ownTowerAt(team, x, z) { for (const t of units) if (!t.dead && t.team === team && t.kind === 'tower' && Math.hypot(t.x - x, t.z - z) <= t.range + 1) return t; return null; }
function pickFightTarget(h, b, s) {
  const foes = s.foes.filter(f => dst(h, f) <= 16 + b.d.aggr * 6);   // s.foes = visible to our team only
  if (!foes.length) return null;
  const t = foes.map(f => ({ f, sc: f.hp + dst(h, f) * 25 - (disabledFor(f) > 0.5 ? 200 : 0) })).sort((a, c) => a.sc - c.sc)[0].f;
  let burst = (h.dmgMin + h.dmgMax) * 1.5, disable = 0;
  for (const ab of h.abilities) { const i = abilityInfo(ab.def); if (i.passive || !castReady(h, ab)) continue; if (i.dmg) burst += abDamage(h, ab); if (i.disable) disable += lvVal(ab.def, 'stun', ab.lvl) || 1; }
  burst += disable * (h.dmgMin + h.dmgMax) / 2 / h.atkInterval;   // free hits while the target is disabled
  const tower = enemyTowerAt(h.team, t.x, t.z, 1), killable = burst >= t.hp;
  const dive = teamDive(h);   // B10: sieging with ≥ 2 allies (teamexec.js)
  if (tower && !dive && !(b.d.dive && killable && s.hpPct > 0.6 && tower.target !== h)) return null;
  if (enemyTowerAt(h.team, h.x, h.z, 0) && !b.d.dive && !dive) return null;
  const allies = s.allies.filter(a => dst(a, t) <= 18), enemies = foes.filter(f => dst(f, t) <= 16);
  let myP = heroPower(h) * (ultReady(h) ? 1.25 : 1) * (h.mana < h.maxMana * 0.2 ? 0.8 : 1);
  for (const a of allies) myP += heroPower(a) * (ultReady(a) ? 1.15 : 1) * 0.9;
  let foeP = 0; for (const f of enemies) foeP += heroPower(f) * (ultReady(f) ? 1.25 : 1);
  for (const g of s.ghosts) if (Math.hypot(g.x - t.x, g.z - t.z) <= 16 && !enemies.includes(g.u)) foeP += g.p * 0.7;   // unseen but nearby
  if (ownTowerAt(h.team, t.x, t.z)) myP *= 1.3;
  if (disabledFor(t) > 0.5) myP *= 1.2;
  const sneak = isInvisible(h) && h.level >= 5 ? 1.4 : 1;   // invisible gankers (Riki, Shadow Walk) after the early laning
  const style = (h.level >= 6 && h.def.ai && h.def.ai.aggr) || 1;   // per-hero hint (from level 6), e.g. Anti-Mage
  const early = h.level < 4 ? 0.85 : 1;   // early laning: only take clearly favourable trades
  return killable || myP * sneak * style * early * (0.55 + b.d.aggr) > foeP ? t : null;
}
