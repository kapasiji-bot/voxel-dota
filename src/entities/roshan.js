// entities/roshan.js — B8 肉山 Roshan: one neutral boss in the river pit (map/jungle.js PIT). Spawns at 0:00; scales with game
// time (ROSH_STATS, re-applied every minute keeping HP %); Bash (passive 15 %: +50 damage, 1 s stun) and Slam (AoE magic
// damage + slow, every 8 s). Only fights units INSIDE the pit (prefers whoever damaged it), walks back and regenerates when
// nobody is there. On death: team gold (+ last-hit bonus) and XP to the killing team, drops 不朽之守护 Aegis (entities/drops.js)
// and from the 2nd kill on 奶酪 Cheese; respawns 8–11 minutes later (random). Chat / kill feed lines on kill.
const ROSH_RESPAWN = [480, 660], ROSH_TEAM_GOLD = 180, ROSH_LH_GOLD = 150, ROSH_XP = 500;
const ROSH_STATS = min => ({ hp: 4000 + 110 * min, dmg: 55 + 3 * min, armor: 8 + 0.25 * min, slam: 70 + 4 * min });
const rosh = () => G.rosh || (G.rosh = { unit: null, kills: 0, respawnAt: 0, lastScale: -1, log: [] });
const TEAM_CN = ['天辉', '夜魇'];
function spawnRoshan() {
  const R = rosh(), st = ROSH_STATS(Math.floor(G.time / 60));
  const u = addUnit({ kind: 'neutral', team: NEUTRAL, isNeutral: true, isRoshan: true, nt: 'roshan', name: '肉山', x: PIT.x, z: PIT.z, hx: PIT.x, hz: PIT.z,
    radius: 1.3, height: 4.6, hp: st.hp, maxHp: st.hp, armor: st.armor, dmgMin: st.dmg, dmgMax: st.dmg + 10, range: 1.6, atkInterval: 1.1, atkPoint: 0.45,
    backswing: 0.4, speed: 5.0, magicRes: 0.25, gold: 0, xp: 0, facing: Math.PI * 0.25, abCd: 4, idleT: 0, path: null, repathT: 0, onHit: roshanBash }, buildModel('roshan', NEUTRAL_MODELS.roshan(), 1.35));
  R.unit = u; R.lastScale = Math.floor(G.time / 60);
  emit('roshanSpawn', { unit: u.id, hp: u.maxHp });
  return u;
}
function roshanScale(u) {
  const m = Math.floor(G.time / 60), R = rosh(); if (m === R.lastScale) return; R.lastScale = m;
  const st = ROSH_STATS(m), pct = u.hp / u.maxHp;
  u.maxHp = st.hp; u.hp = st.hp * pct; u.base.armor = st.armor; u.armor = st.armor; u.base.dmgMin = u.dmgMin = st.dmg; u.base.dmgMax = u.dmgMax = st.dmg + 10;
}
function tickRoshan() {
  const R = rosh();
  if (!R.unit && G.time >= R.respawnAt) spawnRoshan();
  else if (R.unit && !R.unit.dead) roshanScale(R.unit);
}
const roshanCanHit = e => !e.dead && e.team !== NEUTRAL && !e.isBuilding && !e.isWard && !e.isCourier && !isInvuln(e) && inPit(e.x, e.z) && canSee(NEUTRAL, e);
function roshanBash(src, tgt) {
  if (tgt.dead || tgt.isBuilding || Math.random() >= 0.15) return;
  dealDamage(src, tgt, 50, 'magic', { ability: 'roshan_bash' }); AB.stun(tgt, src, 1.0);
  emit('roshanBash', { target: tgt.id });
}
function roshanAI(u, dt) {
  u.abCd -= dt;
  let t = u.aggro;
  if (!t || !roshanCanHit(t)) {
    t = u.aggro = null; let bd = 1e9;
    for (const e of units) if (roshanCanHit(e)) { const d = dst(u, e); if (d < bd) { bd = d; t = e; } }
  }
  if (!t) {
    u.idleT += dt;
    if (Math.hypot(u.x - u.hx, u.z - u.hz) > 0.6) heroNav(u, u.hx, u.hz, dt, 0.3);
    else if (u.idleT > 4) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.04 * dt);
    return;
  }
  u.idleT = 0; u.aggro = t;
  if (u.atk) { if (u.atk.target !== t && u.atk.phase === 'windup') cancelAttack(u, 'retarget'); else return; }
  const close = units.filter(e => roshanCanHit(e) && dst(u, e) < 4.5 + e.radius);
  if (u.abCd <= 0 && close.length) {   // Slam
    u.abCd = 8; const st = ROSH_STATS(Math.floor(G.time / 60));
    for (const e of close) { AB.damage(u, e, st.slam, 'magic', 'roshan_slam'); AB.slow(e, u, 2, 0.5); }
    ringP(u.x, u.z, 4.5, 40, ['#8d6e63', '#ffcc80', '#ff7043'], 0.55, 0.35, 0.2); burst(u.x, 0.5, u.z, 20, ['#a1887f', '#6d4c41'], 5, 0.6, 0.3, 3);
    emit('roshanSlam', { n: close.length }); return;
  }
  if (inRange(u, t, u.range)) { u.path = null; startAttack(u, t); } else heroNav(u, t.x, t.z, dt, 0);
}
function roshanDeath(u, killer) {
  const R = rosh(), kh = ownerOf(killer), team = kh ? kh.team : killer && killer.team < 2 ? killer.team : -1;
  if (team >= 0) {
    for (const h of G.heroes) if (h.team === team) giveGold(ROSH_TEAM_GOLD, h === G.player ? u : null, h);
    if (kh) giveGold(ROSH_LH_GOLD, null, kh);
    shareXP(1 - team, u.x, u.z, 30, ROSH_XP);
  }
  R.kills++; R.unit = null; R.respawnAt = G.time + rnd(ROSH_RESPAWN[0], ROSH_RESPAWN[1]);
  R.log.push({ t: G.time, team, killer: kh ? kh.id : 0 });
  spawnDrop('aegis', u.x, u.z);
  if (R.kills >= 2) spawnDrop('cheese', u.x + 1.2, u.z - 0.6);
  emit('roshanKill', { team, killer: kh ? kh.id : 0, kills: R.kills, respawnAt: R.respawnAt, cheese: R.kills >= 2 });
  const who = kh ? heroLabel(kh) : team >= 0 ? TEAM_CN[team] : '未知';
  if (team >= 0) killFeed(`${who}（${TEAM_CN[team]}）击杀了肉山！`, team, kh, null); else msg('肉山被击杀了', '#ffd54f');
  msg(`肉山已被${team >= 0 ? TEAM_CN[team] : ''}击杀！不朽之守护掉落在肉山巢穴` + (R.kills >= 2 ? '（还有奶酪）' : ''), '#ffd54f');
  burst(u.x, 2, u.z, 40, ['#8d6e63', '#ffcc80', '#ffd54f'], 6, 1.2, 0.4, 4);
  corpses.push({ u, t: 0 });
}
