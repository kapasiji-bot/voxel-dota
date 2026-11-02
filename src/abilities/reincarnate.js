// abilities/reincarnate.js — skill-based reincarnation (Wraith King R). Ability field `reincarnate: true` + mana/cd/values.delay.
// On lethal damage (after Aegis): if a learned reincarnate ability is off cooldown and the hero has mana, spend them and
// "die" briefly without bounty / death count (same path as Aegis: u.reincarnate + short respawn → entities/hero.js respawnHero).
function skillReincarnate(u) {
  if (!u.isHero || u.isIllusion || !u.abilities) return false;
  for (const ab of u.abilities) {
    if (!ab.def.reincarnate || ab.lvl < 1 || ab.cd > 0) continue;
    const mana = lvVal(ab.def, 'mana', ab.lvl) || 0;
    if (u.mana < mana) continue;
    u.mana -= mana;
    const cd = lvVal(ab.def, 'cd', ab.lvl) || 60;
    ab.cd = ab.cdMax = cd;
    const delay = lvVal(ab.def, 'delay', ab.lvl) || 3;
    interruptChannel(u, 'death');
    u.dead = true; u.target = null; u.atk = null; u.casting = null; u.order = { type: 'idle' }; u.path = null;
    for (const m of u.mods.slice()) removeModifier(u, m);
    for (const x of units) if (x.target === u) x.target = null;
    u.respawn = delay; u.reincarnate = { x: u.x, z: u.z, skill: ab.def.id }; u.dmgBy = {};
    if (u.model) u.model.visible = false;
    burst(u.x, 1.5, u.z, 36, ['#bdbdbd', '#eeeeee', '#757575', '#ffffff'], 5, 1.1, 0.35, 5);
    emit('reincarnateSkill', { unit: u.id, ability: ab.def.id, delay });
    msg(`${heroLabel(u)} 即将重生！（${delay} 秒）`, '#bdbdbd');
    if (ab.def.onReincarnate) ab.def.onReincarnate(abilityCtx(u, ab));
    return true;
  }
  return false;
}
