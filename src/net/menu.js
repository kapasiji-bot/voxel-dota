// net/menu.js — B11 main menu tabs on the hero-select screen (单人游戏 = the unchanged singleplayer screen, 创建局域网房间,
// 加入局域网房间) and the lobby / invite / end-of-session DOM. Leaving a LAN session reloads the page (clean state).
const lbName = () => { const v = ($('lbName') && $('lbName').value.trim()) || ''; return v.slice(0, 16) || '玩家'; };
function buildNetMenu() {
  const tabs = document.createElement('div'); tabs.id = 'modeTabs';
  tabs.innerHTML = '<div class="mt on" data-m="sp">单人游戏</div><div class="mt" id="mtHost" data-m="host">创建局域网房间</div><div class="mt" id="mtJoin" data-m="join">加入局域网房间</div>';
  document.querySelector('#select .sub').after(tabs);
  tabs.addEventListener('click', e => { const t = e.target.closest('.mt'); if (t && t.dataset.m !== 'sp') netOpenLobby(t.dataset.m); });
  $('lobby').innerHTML = `<h1>局域网联机</h1>
    <div id="lbHead"><label>你的名字 <input id="lbName" type="text" maxlength="16" autocomplete="off" spellcheck="false"></label><span id="lbRole"></span><button class="mcbtn" id="lbBack">返回主菜单</button></div>
    <div id="lbJoin" class="hidden panel">
      <div class="lbStep"><b>第 1 步</b> 把房主发给你的<em>邀请码</em>（VD1O 开头）粘贴到这里：</div><textarea id="jOffer" placeholder="VD1O……"></textarea>
      <button class="mcbtn" id="jGo">生成应答码</button>
      <div id="jAnsBox" class="hidden"><div class="lbStep"><b>第 2 步</b> 把下面的<em>应答码</em>复制发回给房主，等房主粘贴后会自动进入房间：</div><div class="row"><textarea id="jAns" readonly></textarea><button class="mcbtn" id="jCopy">复制应答码</button></div></div>
      <div id="jStatus"></div>
      <div class="lbNote">所有玩家需连接<b>同一个局域网 / Wi-Fi</b>，并打开同一个游戏文件或网址；推荐使用最新版 Chrome / Edge。</div>
    </div>
    <div id="lbRoom" class="hidden">
      <div id="lbTeams"><div class="lbTeam" id="lbRad"></div><div class="lbTeam" id="lbDire"></div></div>
      <div id="lbHeroes"></div>
      <div id="lbBar"><span id="lbWarn"></span>
        <span id="lbHostTools"><button class="mcbtn" id="lbInvite">邀请玩家</button> 空位填充电脑 <select id="lbFillDiff">${DIFF_CN.map((d, j) => `<option value="${j}"${j === 1 ? ' selected' : ''}>${d}</option>`).join('')}</select> <button class="mcbtn" id="lbFill">填充</button><button class="mcbtn" id="lbClear">清空电脑</button></span>
        <button class="mcbtn big" id="lbReady">准备</button><button class="mcbtn big" id="lbStart">开始游戏</button></div>
      <div id="lbLogBox"><div id="lbLog"></div><input id="lbChat" type="text" maxlength="120" placeholder="房间聊天（Enter 发送）" autocomplete="off"></div>
    </div>`;
  $('netInv').innerHTML = `<h3><span>邀请玩家</span><button class="mcbtn" id="invClose">关闭</button></h3>
    <div class="lbNote">每位朋友需要一个单独的邀请码。朋友在「加入局域网房间」里粘贴邀请码，生成应答码发回给你。</div>
    <button class="mcbtn" id="invNew">生成新的邀请码</button><div id="invList"></div>`;
  $('netEnd').innerHTML = '<div class="panel"><h2>联机已结束</h2><div id="netEndTxt"></div><button class="mcbtn big" onclick="location.reload()">返回主菜单</button></div>';
  $('netFF').innerHTML = '<div class="panel"><div id="netFFTxt">正在同步对局进度…</div><div class="lbNote">正在快速重演本局已发生的所有操作，请稍候。</div></div>';
  bindLobby(); bindInvite(); bindChat();   // net/lobbyui.js, net/invite.js, net/chat.js
  $('lbBack').addEventListener('click', () => { if (NET.role) location.reload(); else { $('lobby').classList.add('hidden'); } });
  $('lbName').value = localStorage.getItem('voxdota.name') || '玩家' + (100 + ((vrand() * 900) | 0));
  $('lbName').addEventListener('change', () => { const n = lbName(); localStorage.setItem('voxdota.name', n); NET.name = n; if (NET.role) lobbyAct('name', { name: n }); });
}
function netOpenLobby(mode) {
  if (G.started) return;
  $('lobby').classList.remove('hidden'); localStorage.setItem('voxdota.name', lbName());
  if (mode === 'host') {
    if (!NET.role) netHostRoom(lbName());
    $('lbRole').textContent = '房主'; $('lbJoin').classList.add('hidden'); $('lbRoom').classList.remove('hidden');
    lobbyLog('房间已创建。点击「邀请玩家」生成邀请码发给朋友，或用「填充」添加电脑玩家。'); renderLobby();
  } else {
    $('lbRole').textContent = '加入房间'; $('lbJoin').classList.remove('hidden'); $('lbRoom').classList.add('hidden');
  }
}
