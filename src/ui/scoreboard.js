// ui/scoreboard.js — hold Tab: all heroes per team with level, K/D/A, last hits/denies, gold, items, respawn timer.
let sbEl = null, sbOn = false;
function showScoreboard(on) {
  sbOn = on;
  if (!sbEl) { sbEl = document.createElement('div'); sbEl.id = 'scoreboard'; sbEl.className = 'panel hidden'; document.body.appendChild(sbEl); }
  sbEl.classList.toggle('hidden', !on || !G.started);
  if (on) renderScoreboard();
}
function renderScoreboard() {
  if (!sbOn || !sbEl) return;
  const P = G.player, row = h => {
    const items = h.items.map(it => it ? `<span class="sbit" style="background:${it.def.color}" title="${it.def.name}">${it.def.icon}</span>` : '<span class="sbit e"></span>').join('');
    const img = PORTRAITS[h.def.id] ? `<img class="px" src="${PORTRAITS[h.def.id].head}">` : '';
    return `<tr class="${h === P ? 'me' : ''}${h.dead ? ' dead' : ''}"><td class="hn">${img}<span>${h.def.name}<small>${h === P ? (h.bot ? '玩家(托管)' : '玩家') : '电脑 · ' + (h.bot ? DIFF_CN[h.bot.diffIdx] + (h.bot.lane ? ' · ' + LANE_CN[h.bot.lane] : '') : '')}</small></span></td>
      <td>${h.level}</td><td>${h.kills} / ${h.deaths} / ${h.assists}</td><td>${h.lh} / ${h.dn}</td><td class="g">${Math.floor(h.gold)}</td><td>${items}</td><td>${h.dead ? Math.ceil(h.respawn) + ' 秒' : ''}</td></tr>`;
  };
  const team = t => G.heroes.filter(h => h.team === t);
  const head = `<tr><th>英雄</th><th>等级</th><th>击杀/死亡/助攻</th><th>正补/反补</th><th>金钱</th><th>物品</th><th>复活</th></tr>`;
  const sum = t => team(t).reduce((a, h) => a + h.kills, 0);
  sbEl.innerHTML = `<h3>计分板 <small>${fmtTime(G.time)}　摧毁建筑 天辉 ${G.score[RAD]} : ${G.score[DIRE]} 夜魇</small></h3>
    <div class="sbt rad">天辉　击杀 ${sum(RAD)}</div><table>${head}${team(RAD).map(row).join('')}</table>
    <div class="sbt dire">夜魇　击杀 ${sum(DIRE)}</div><table>${head}${team(DIRE).map(row).join('')}</table>`;
}
let sbT = 0;
function updateScoreboard(dt) { if (!sbOn) return; sbT -= dt; if (sbT <= 0) { sbT = 0.5; renderScoreboard(); } }
