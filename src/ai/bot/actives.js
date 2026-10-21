// ai/bot/actives.js — bot use of the B7 active items (called from botUseItems, ai/bot/items.js). Every rule only fires in range
// (no walking into the enemy for an item), with mana + cooldown ready. Counts: b.itemUses {id: n}; events itemUse{unit,item,target}.
//   Mekansm: ≥ 2 nearby allies missing 250+ HP, or one ally under 40%.   Pipe: teamfight (≥ 2 enemy heroes near, ≥ 2 of us).
//   Glimmer: an ally (or self) under 35% with an enemy hero within 9.  Force Staff: retreating self with a chaser (turn to base
//   first), or an ally under 30% retreating from an enemy within 6.  Eul's: cyclone an enemy that is channelling (Black Hole,
//   Death Ward, TP), self-dispel silence / hex-free debuffs in a fight, or self when nearly dead.  Dagon: finish an enemy hero it
//   would kill (or a fight target under 45%).  Scythe: hex a channelling enemy or the fight target unless already disabled.
function itemReady(h, pred) {
  for (let i = 0; i < 6; i++) { const it = h.items[i]; if (it && pred(it.id) && it.def.active && it.cd <= 0 && h.mana >= (it.def.active.mana || 0)) return i; }
  return -1;
}
const isDagon = id => id === 'dagon' || /^dagon[2-5]$/.test(id);
function botItemUse(h, b, slot, t) {
  const id = h.items[slot].id, A = h.items[slot].def.active;
  if (t && t.id && dst(h, t) > A.range + h.radius + t.radius) return false;
  if (useItem(h, slot, t)) return false;
  (b.itemUses = b.itemUses || {})[id] = (b.itemUses[id] || 0) + 1; return true;
}
const recentlyHitByHero = (u, s) => { for (const k in u.dmgBy) if (G.time - u.dmgBy[k] < s) return true; return false; };
function botItemActives(h, b, s, mode, target) {
  if (h.items.every(it => !it || !it.def.active)) return false;
  const team = [h].concat(s.allies), near = (u, r) => s.foes.filter(f => dst(f, u) < r);
  let ci = itemReady(h, id => id === 'cheese');   // B8 Roshan Cheese: emergency heal
  if (ci >= 0 && s.hpPct < 0.3 && (s.foes.length || recentlyHitByHero(h, 3) || inPit(h.x, h.z))) return botItemUse(h, b, ci, null);
  let i = itemReady(h, id => id === 'mekansm');
  if (i >= 0) { const hurt = team.filter(a => dst(a, h) < 11 && a.maxHp - a.hp > 250);
    if (hurt.length >= 2 || hurt.some(a => a.hp < a.maxHp * 0.4)) return botItemUse(h, b, i, null); }
  i = itemReady(h, id => id === 'pipe');
  if (i >= 0 && (mode === 'fight' || recentlyHitByHero(h, 2)) && near(h, 13).length >= 2 && team.filter(a => dst(a, h) < 11).length >= 2) return botItemUse(h, b, i, null);
  i = itemReady(h, id => id === 'glimmer');
  if (i >= 0) { const a = team.find(a => a.hp < a.maxHp * 0.35 && near(a, 9).length && !getMod(a, 'glimmer') && dst(a, h) < 16);
    if (a) return botItemUse(h, b, i, a); }
  i = itemReady(h, id => id === 'euls');
  if (i >= 0) {
    const ch = s.foes.find(f => f.channel && dst(f, h) < 13 && !hasState(f, 'magicImmune'));
    if (ch) { emit('botEulInterrupt', { unit: h.id, target: ch.id }); return botItemUse(h, b, i, ch); }
    const dangerous = near(h, 8).length && (h.silenced && !h.hexed || h.mods.some(m => m.def.debuff && m.def.tick && m.t > 2));
    if (dangerous || (mode === 'retreat' && s.hpPct < 0.25 && near(h, 6).length)) return botItemUse(h, b, i, h);
  }
  i = itemReady(h, id => id === 'force');
  if (i >= 0) {
    if (mode === 'retreat' && near(h, 7).length) { const sp = heroSpawn(h.team); h.facing = Math.atan2(sp.x - h.x, sp.z - h.z); return botItemUse(h, b, i, h); }
    const a = s.allies.find(a => a.hp < a.maxHp * 0.3 && near(a, 6).length && a.bot && a.bot.retreat && dst(a, h) < 11);
    if (a) return botItemUse(h, b, i, a);
  }
  i = itemReady(h, isDagon);
  if (i >= 0) { const D = h.items[i].def, dmg = DAGON_DMG[(D.level || 1) - 1];
    const t = s.foes.find(f => !hasState(f, 'magicImmune') && f.hp < dmg * (1 - (f.magicRes || 0)) && dst(f, h) < D.active.range + 1)
      || (mode === 'fight' && target && target.isHero && target.hp < target.maxHp * 0.45 ? target : null);
    if (t && botItemUse(h, b, i, t)) return true; }
  i = itemReady(h, id => id === 'scythe');
  if (i >= 0 && (mode === 'fight' || s.foes.some(f => f.channel))) {
    const t = s.foes.find(f => f.channel && !hasState(f, 'magicImmune')) || (target && target.isHero && !hasState(target, 'magicImmune') && disabledFor(target) < 0.5 ? target : null);
    if (t && botItemUse(h, b, i, t)) return true; }
  return false;
}
