// entities/hero.js — hero creation from HERO_DEFS, attribute/stat refresh, XP/levels, ability learning, gold, respawn.
const HERO_SPAWN = { x: -67, z: 67 };
const heroSpawn = team => team === RAD ? HERO_SPAWN : { x: -HERO_SPAWN.x, z: -HERO_SPAWN.z };
// respawn time (s) by level — DOTA-like curve, shortened for a ~20-30 min game
const respawnTime = lvl => Math.min(60, 5 + lvl * 2.4);
function createHero(id, team = RAD, o = {}) {
  const d = HERO_DEFS[id], s = d.stats;
  const model = buildModel(id, d.model());
  const ringColor = o.ring || (team === RAD ? '#4cff4c' : '#ff4040');
  const ring = new T.Mesh(new T.RingGeometry(0.95, 1.2, 32), new T.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.8, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; model.add(ring);
  const h = addUnit({ kind: 'hero', isHero: true, name: d.name, team, x: heroSpawn(team).x + (o.slot || 0) * 1.6, z: heroSpawn(team).z, radius: s.radius, height: s.height, def: d, level: 1, xp: 0, gold: 600, goldF: 0,
    abilities: d.abilities.map(a => ({ def: a, lvl: 0, cd: 0, cdMax: 1 })), items: [null, null, null, null, null, null],
    range: s.range, atkPoint: s.atkPoint, backswing: s.backswing, proj: s.proj, projColor: s.projColor, magicRes: 0.25,
    order: { type: 'idle' }, path: null, repathT: 0, kills: 0, deaths: 0, assists: 0, lh: 0, dn: 0, respawn: 0, facing: team === RAD ? Math.PI * 0.75 : -Math.PI * 0.25, streak: 0, dmgBy: {}, isBot: !!o.bot, ringColor, ringMesh: ring }, model);
  refreshHero(h); h.hp = h.maxHp; h.mana = h.maxMana;
  G.heroes.push(h);
  return h;
}
function heroProps(h) {
  const P = gatherProps(h), seen = {};
  for (const it of h.items) if (it) {
    const p = it.def.props; if (!p) continue;
    if (it.def.unique) { const g = it.def.uniqueGroup || it.def.id; if (seen[g]) continue; seen[g] = 1; }
    for (const k in p) P[k] = (P[k] || 0) + p[k];
  }
  for (const a of h.abilities) if (a.lvl > 0 && a.def.passiveProps) { const p = a.def.passiveProps(abilityCtx(h, a)); for (const k in p) P[k] = (P[k] || 0) + p[k]; }
  return P;
}
function refreshHero(h) {
  const s = h.def.stats, lv = h.level - 1, P = heroProps(h);
  h.str = s.str + s.strG * lv + (P.str || 0); h.agi = s.agi + s.agiG * lv + (P.agi || 0); h.int = s.int + s.intG * lv + (P.int || 0);
  const pm = h.maxHp || 0, pmm = h.maxMana || 0;
  h.maxHp = Math.round(200 + h.str * 20 + (P.hp || 0)); h.maxMana = Math.round(75 + h.int * 12 + (P.mana || 0));
  if (pm && pm !== h.maxHp && !h.dead) h.hp = h.hp * h.maxHp / pm;
  if (pmm && pmm !== h.maxMana) h.mana = h.mana * h.maxMana / pmm;
  h.armor = s.armor + h.agi * 0.16 + (P.armor || 0);
  h.dmgBase = (s.dmg + h[s.primary]) * (1 + (P.dmgPct || 0)) + (P.dmg || 0); h.dmgMin = h.dmgBase - 2; h.dmgMax = h.dmgBase + 2;
  h.atkSpeedMult = (100 + h.agi + (P.as || 0)) / 100; h.atkInterval = s.bat / h.atkSpeedMult;
  h.speed = Math.max(1, (s.speed + (P.ms || 0)) * (1 + (P.msPct || 0)));
  h.hpRegen = s.hpRegen + h.str * 0.1 + (P.hpRegen || 0); h.manaRegen = s.manaRegen + h.int * 0.05 + (P.manaRegen || 0);
  h.dmgTakenPct = P.dmgTakenPct || 0;
  h.magicRes = 1 - 0.75 * (1 - (P.magicRes || 0)); h.missChance = P.miss || 0; h.evasion = Math.min(0.9, P.evasion || 0); h.blurR = P.blur || 0;   // base 25% magic resistance
  h.trueStrike = !!P.trueStrike; applyScepter(h);   // B7: Monkey King Bar; Aghanim's Scepter swaps upgraded ability defs (abilities/scepter.js)
}
const skillPoints = h => h.level - h.abilities.reduce((a, s) => a + s.lvl, 0);
const maxAbilityLevel = d => d.ult ? 3 : 4;
const learnLevelReq = (d, lvl) => d.ult ? 6 + lvl * 6 : lvl * 2 + 1;   // hero level needed to put point #lvl+1
function canLearn(h, i) {
  const a = h.abilities[i]; if (!a || skillPoints(h) <= 0) return false;
  return a.lvl < maxAbilityLevel(a.def) && h.level >= learnLevelReq(a.def, a.lvl);
}
function learnSkill(i, h = G.player) {
  if (!h || !canLearn(h, i)) return false;
  h.abilities[i].lvl++; refreshHero(h);
  burst(h.x, 2, h.z, 12, ['#ffd54f', '#fff59d'], 4, 0.6, 0.25, 3);
  return true;
}
function gainXP(h, amt) {
  if (h.level >= MAX_LEVEL) return;
  h.xp += amt;
  while (h.level < MAX_LEVEL && h.xp >= XP_TABLE[h.level]) {
    h.level++; refreshHero(h); h.hp = Math.min(h.maxHp, h.hp + 60);
    for (let i = 0; i < 26; i++) spawnP(h.x + rnd(-1, 1), rnd(0, 1), h.z + rnd(-1, 1), 0, rnd(4, 9), 0, rnd(0.6, 1.1), rnd(0.2, 0.4), ['#ffd54f', '#fff176', '#ffffff'][i % 3]);
    if (h === G.player || !G.player || h.team === G.player.team) addFloat(h, '升级！ Lv' + h.level, '#ffd54f', 22, 1.6);
    if (h === G.player) msg(`升到 ${h.level} 级！获得 1 点技能点`, '#ffd54f');
    emit('levelUp', { unit: h.id, level: h.level });
  }
}
function setHeroLevel(h, lvl) { lvl = clamp(lvl | 0, 1, MAX_LEVEL); if (lvl > h.level) gainXP(h, XP_TABLE[lvl - 1] - h.xp); }
function giveGold(amt, at, h = G.player) {
  if (!h) return; amt = Math.round(amt); h.gold += amt; h.goldEarned = (h.goldEarned || 0) + amt;
  if (h === G.player) { G.goldEarned += amt; if (at) { addFloat(at, '+' + amt, '#ffd54f', 16, 1.2); sfxUI('coin'); } }
}
function respawnHero(h) {
  const sp = heroSpawn(h.team);
  h.dead = false; h.x = sp.x + rnd(-1.5, 1.5); h.z = sp.z + rnd(-1.5, 1.5); h.mods.length = 0;
  if (h.reincarnate) { h.x = h.reincarnate.x; h.z = h.reincarnate.z; h.reincarnate = null; emit('reincarnate', { unit: h.id }); }   // Aegis (entities/drops.js)
  h.dmgBy = {}; refreshHero(h);
  h.hp = h.maxHp; h.mana = h.maxMana; h.order = { type: 'idle' }; h.path = null; h.atk = null; h.casting = null; h.channel = null;
  h.model.visible = true; h.model.userData.inner.rotation.set(0, 0, 0); h.model.userData.inner.position.y = 0;
  FOG.dirty = true; emit('respawn', { unit: h.id, team: h.team });
  if (h !== G.player) return;
  $('death').classList.add('hidden');
  msg('英雄已复活', '#7cdc6a'); G.cam.x = h.x; G.cam.z = h.z - 4;
}
function updateHeroTimers(h, dt) {
  for (const s of h.abilities) if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
  for (const it of h.items) if (it && it.cd > 0) it.cd = Math.max(0, it.cd - dt);
  if (h.icd) for (const it of h.items) if (it && it.def.heroCd) it.cd = Math.max(0, (h.icd[it.id] || 0) - G.time);
  if (h.dead) {
    h.respawn -= dt; if (h === G.player) setT($('deathTxt'), `你已阵亡 —— ${Math.ceil(h.respawn)} 秒后复活`);
    if (h.respawn <= 0) respawnHero(h);
    return;
  }
  let regen = h.hpRegen, mregen = h.manaRegen;
  const f = G.fountains[h.team];
  if (f && dst(h, f) < 12) { regen += h.maxHp * 0.06; mregen += h.maxMana * 0.06; }
  h.hp = Math.min(h.maxHp, h.hp + regen * dt); h.mana = Math.min(h.maxMana, h.mana + mregen * dt);
}
