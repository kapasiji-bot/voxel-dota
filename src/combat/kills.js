// combat/kills.js — hero deaths (bounty, assists, streaks, respawn timer), XP sharing, kill feed, DOTA tower/creep aggro rule.
// XP from a dying unit is split between enemy heroes within radius (DOTA style).
function shareXP(deadTeam, x, z, r, amt) {
  const hs = G.heroes.filter(h => !h.dead && h.team !== deadTeam && Math.hypot(h.x - x, h.z - z) <= r);
  for (const h of hs) gainXP(h, amt / hs.length);
}
const TEAM_COLOR = ['#7cdc6a', '#ff6b5b'];
const heroLabel = h => `${h === G.player ? '你' : h.def.name}`;
function heroDeath(u, killer) {
  const P = G.player;
  // credit: killer hero, else the enemy hero who damaged last within 10 s (towers/creeps "deny" no one)
  const ko = ownerOf(killer); let kh = ko && ko.team !== u.team ? ko : null;   // summons / illusions credit their hero
  const recent = Object.entries(u.dmgBy || {}).filter(([, t]) => G.time - t <= 12).map(([id]) => unitById(+id)).filter(h => h && h.team !== u.team);
  if (!kh && recent.length) kh = recent.sort((a, b) => u.dmgBy[b.id] - u.dmgBy[a.id])[0];
  const assists = recent.filter(h => h !== kh);
  u.deaths++; u.respawn = respawnTime(u.level); u.order = { type: 'idle' }; u.path = null; u.channel = null;
  const streak = u.streak; u.streak = 0; u.streakEnded = streak; u.dmgBy = {};
  burst(u.x, 1.5, u.z, 30, ['#c62828', '#7f0000', '#555'], 6, 1, 0.35, 4);
  u.model.visible = false;
  if (kh) {
    kh.kills++; kh.streak++;
    giveGold(150 + u.level * 8 + Math.min(streak, 5) * 50, u, kh);
    for (const a of assists) { a.assists++; giveGold(40 + u.level * 4, null, a); }
  }
  shareXP(u.team, u.x, u.z, 24, 100 + u.level * 40);   // B10: was 60 + 28·lvl
  emit('heroKill', { victim: u.id, killer: kh ? kh.id : 0, assists: assists.map(a => a.id), by: killer ? killer.kind : '' });
  // kill feed (Chinese)
  const kname = kh ? heroLabel(kh) : killer && killer.isBuilding ? '防御塔' : killer ? '小兵' : '未知';
  let line = `${kname} 击杀了 ${heroLabel(u)}`;
  if (!G.firstBlood && kh) { G.firstBlood = true; line = '第一滴血！' + line; }
  if (kh && kh.streak >= 3) line += `（${['', '', '', '大杀特杀', '主宰比赛', '杀人如麻', '无人能挡', '变态杀戮', '妖怪般的杀戮', '如同神一般', '超越神的杀戮'][Math.min(10, kh.streak)]}）`;
  if (streak >= 3 && kh) line += ` 终结了连杀！`;
  killFeed(line, kh ? kh.team : 1 - u.team, kh, u);
  if (u === P) { $('death').classList.remove('hidden'); msg(`你被${kname}击杀了！`, '#ff6b5b'); }
}
// DOTA rule: a hero attacking an enemy hero draws aggro of nearby enemy towers and lane creeps
function heroAggro(src, victim) {
  for (const t of units) {
    if (t.dead || t.team === src.team || t.team !== victim.team) continue;
    if (t.kind === 'tower' && inRange(t, src, t.range) && inRange(t, victim, t.range + 2)) {
      if (t.target !== src) { t.target = src; t.aggroT = G.time; if (t.atk && t.atk.phase === 'windup') cancelAttack(t, 'aggro'); emit('towerAggro', { tower: t.id, target: src.id }); }
    } else if ((t.kind === 'melee' || t.kind === 'ranged') && dst(t, src) <= 10 && !(t.target && t.target.isHero)) { t.target = src; t.aggroT = G.time; }
  }
}
