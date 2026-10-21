// ui/announce.js — B9 announcer: no voice, a big centred Chinese line + a synthesized chime (first blood, kill streaks,
// streak ended, Roshan, towers / barracks lost or destroyed). Heard by everyone (non-spatial, UI bus).
const STREAK_CN = ['', '', '', '大杀特杀', '主宰比赛', '杀人如麻', '无人能挡', '变态杀戮', '妖怪般的杀戮', '如同神一般', '超越神的杀戮'];
function announce(text, color, sound, p) {
  const el = $('announce'); if (el) { el.textContent = text; el.style.color = color || '#ffd54f'; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  if (sound) auPlay(sound, { bus: 'ui', p: p || {} });
  emit('announce', { text });
}
function initAnnouncer() {
  if (AU.annHooked) return; AU.annHooked = true;
  Events.on('heroKill', e => {
    const k = unitById(e.killer), v = unitById(e.victim); if (!k || !v) return;
    const mine = k.team === auTeam(), col = mine ? '#7cdc6a' : '#ff6b5b';
    if (!G.firstBlood) { announce(`第一滴血！${k.def.name} 击杀了 ${v.def.name}`, '#ff5252', 'chimeFirst'); return; }
    if (k.streak >= 3) { announce(`${k.def.name}：${STREAK_CN[Math.min(10, k.streak)]}！`, col, 'chimeStreak', { n: Math.min(7, k.streak - 3) }); return; }
    if ((v.streakEnded || 0) >= 3) announce(`${k.def.name} 终结了 ${v.def.name} 的连杀！`, col, mine ? 'chimeGood' : 'chimeBad');
  });
  Events.on('buildingDestroyed', e => {
    if (e.kind !== 'tower' && e.kind !== 'barracks') return;
    const mine = e.team === auTeam(), what = e.kind === 'tower' ? '防御塔' : '兵营';
    announce(mine ? `我方${what}被摧毁` : `摧毁了敌方${what}`, mine ? '#ff6b5b' : '#7cdc6a', mine ? 'chimeBad' : 'chimeGood');
  });
  Events.on('roshanKill', e => announce(`肉山被${e.team === auTeam() ? '我方' : '敌方'}击杀`, e.team === auTeam() ? '#7cdc6a' : '#ff6b5b', null));
}
