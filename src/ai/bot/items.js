// ai/bot/items.js — bot active item use (salve, dust, BKB, blink; B7 items in ai/bot/actives.js) and skill leveling (ult at 6/12/18).
// Hero hints (optional): def.ai = { skills: [0,1,0,2,...] (slot order for non-ult points), aggr: fight-willingness multiplier (fight.js),
//   role: 'carry'|'tank'|'support', items: [...] (build override) — purchases live in ai/bot/shop.js }
const BOT_SKILLS = [0, 1, 0, 2, 0, 1, 0, 1, 1, 2, 2, 2];
function botLevelSkills(h) {
  let guard = 0;
  while (skillPoints(h) > 0 && guard++ < 8) {
    if (canLearn(h, 3)) { learnSkill(3, h); continue; }
    const seq = (h.def.ai && h.def.ai.skills) || BOT_SKILLS, cnt = [0, 0, 0];
    let done = false;
    for (const i of seq) { cnt[i]++; if (h.abilities[i].lvl < cnt[i] && canLearn(h, i)) { learnSkill(i, h); done = true; break; } }
    if (!done) { const i = [0, 1, 2].find(i => canLearn(h, i)); if (i === undefined) break; learnSkill(i, h); }
  }
}
const hasItem = (h, id) => h.items.some(it => it && it.id === id);
const itemSlot = (h, id) => h.items.findIndex(it => it && it.id === id);
// does the enemy team field invisibility (passiveMod / invis-applying abilities)? → carry dust
const heroHasInvis = d => d.abilities.some(a => (a.passiveMod && a.passiveMod.invis) || (a.ai && a.ai.escape === 'invis'));
const enemyInvis = h => G.heroes.some(e => e.team !== h.team && heroHasInvis(e.def));
// active items: salve when hurt & safe, BKB in teamfights, blink to initiate (melee) or escape
function botUseItems(h, b, s, mode, target) {
  const sl = itemSlot(h, 'salve');
  if (sl >= 0 && h.hp < h.maxHp * 0.6 && !getMod(h, 'salve') && !s.foes.some(f => dst(f, h) < 9)) { useItem(h, sl, null); return true; }
  const du = itemSlot(h, 'dust');   // dust: hit by an unseen hero, or an invisible-capable enemy vanished next to us
  if (du >= 0 && (Object.entries(h.dmgBy).some(([id, t]) => { const e = unitById(+id); return G.time - t < 1.2 && e && !e.dead && !canSee(h.team, e); })
    || s.ghosts.some(g => g.u.isHero && heroHasInvis(g.u.def) && G.time - g.t < 1.5 && Math.hypot(g.x - h.x, g.z - h.z) < 9))) { useItem(h, du, null); emit('botDust', { unit: h.id }); return true; }
  const bk = itemSlot(h, 'bkb');
  if (bk >= 0 && h.items[bk].cd <= 0 && mode === 'fight' && s.foes.filter(f => dst(f, h) < 12).length >= 2) { useItem(h, bk, null); return true; }
  const bl = itemSlot(h, 'blink');
  if (bl >= 0 && h.items[bl].cd <= 0) {
    if (mode === 'fight' && target && !h.proj && dst(h, target) > 7 && dst(h, target) < 23 && s.hpPct > 0.5 && !enemyTowerAt(h.team, target.x, target.z, 0)) { useItem(h, bl, { x: target.x, z: target.z }); return true; }
    if (mode === 'retreat' && s.foes.some(f => dst(f, h) < 8)) { const sp = heroSpawn(h.team), d = AB.dir(h, sp); useItem(h, bl, { x: h.x + d.x * 22, z: h.z + d.z * 22 }); return true; }
  }
  return botItemActives(h, b, s, mode, target);   // ai/bot/actives.js: Mek, Pipe, Glimmer, Eul's, Force Staff, Dagon, Scythe
}
