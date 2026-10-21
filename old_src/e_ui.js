// ================= indicators =================
function indMat(c, o) { return new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: T.DoubleSide }); }
function flat(geo) { geo.rotateX(-Math.PI / 2); return geo; }
const rangeRing = new T.Mesh(flat(new T.RingGeometry(0.975, 1, 128)), indMat('#9cff9c', 0.6));
const aoeRing = new T.Group(); aoeRing.add(new T.Mesh(flat(new T.CircleGeometry(1, 48)), indMat('#ffcc33', 0.22)), new T.Mesh(flat(new T.RingGeometry(0.94, 1, 64)), indMat('#ffdd55', 0.8)));
const lineGeo = flat(new T.PlaneGeometry(1, 1)); lineGeo.translate(0, 0, 0.5);
const lineInd = new T.Mesh(lineGeo, indMat('#ff8a3d', 0.32));
const hoverRing = new T.Mesh(flat(new T.RingGeometry(0.9, 1.15, 40)), indMat('#ff4444', 0.85));
for (const m of [rangeRing, aoeRing, lineInd, hoverRing]) { m.visible = false; m.position.y = 0.08; m.renderOrder = 5; scene.add(m); }
function updateIndicators() {
  const P = G.player, tg = G.targeting;
  rangeRing.visible = aoeRing.visible = lineInd.visible = hoverRing.visible = false;
  if (!G.started || !P) return;
  const hv = G.hover = mouse.overUI ? null : pickUnit(mouse.x, mouse.y);
  if (hv) { hoverRing.visible = true; hoverRing.position.set(hv.x, (hv.model ? hv.model.position.y : 0) + 0.1, hv.z); const s = hv.radius + 0.5; hoverRing.scale.set(s, 1, s); hoverRing.material.color.set(hv.team === P.team ? '#55ff55' : '#ff4444'); }
  canvas.style.cursor = tg ? 'crosshair' : (hv && hv.team !== P.team ? 'pointer' : 'default');
  if (!tg || P.dead) return;
  const g = groundAt(mouse.x, mouse.y);
  if (tg.range) { rangeRing.visible = true; rangeRing.position.set(P.x, 0.1, P.z); const r = tg.range + (tg.mode === 'unit' ? P.radius : 0); rangeRing.scale.set(r, 1, r); }
  if (!g) return;
  if (tg.kind === 'skill' && tg.def.id === 'slave') { lineInd.visible = true; lineInd.position.set(P.x, 0.12, P.z); lineInd.rotation.y = Math.atan2(g.x - P.x, g.z - P.z); lineInd.scale.set(4, 1, tg.def.len); rangeRing.visible = false; }
  else if (tg.radius && tg.mode === 'point') { aoeRing.visible = true; aoeRing.position.set(g.x, 0.12, g.z); aoeRing.scale.set(tg.radius, 1, tg.radius); }
}

// ================= overlay (health bars, floating text) =================
const FONT = '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC","Noto Serif CJK SC",sans-serif';
function drawOverlay() {
  const W = innerWidth, H = innerHeight; ov.clearRect(0, 0, W, H);
  if (!G.started) return;
  const P = G.player; ov.textAlign = 'center'; ov.textBaseline = 'middle';
  for (const u of units) {
    if (u.dead || !u.model || !u.model.visible || u.kind === 'fountain') continue;
    const sc = u.model.userData.inner.scale.y;
    const s = toScreen(u.x, u.model.position.y + u.height * sc + 0.5, u.z);
    if (s.z > 1 || s.x < -80 || s.x > W + 80 || s.y < -40 || s.y > H + 40) continue;
    const w = u.isHero ? 78 : u.kind === 'ancient' ? 140 : u.isBuilding ? 100 : 40, h = u.isHero ? 9 : u.isBuilding ? 9 : 5;
    const x = Math.round(s.x - w / 2), y = Math.round(s.y), inv = isInvuln(u) && u.team !== P.team;
    ov.fillStyle = 'rgba(0,0,0,0.85)'; ov.fillRect(x - 1, y - 1, w + 2, h + 2 + (u.isHero ? 5 : 0));
    ov.fillStyle = inv ? '#8d8d8d' : u === P ? '#3ce03c' : u.team === P.team ? '#2fa52f' : '#dd3a2a';
    ov.fillRect(x, y, Math.max(0, w * u.hp / u.maxHp), h);
    if (u.isHero || u.isBuilding) { ov.fillStyle = 'rgba(0,0,0,0.5)'; const step = u.isHero ? 250 : 500; for (let v = step; v < u.maxHp; v += step) ov.fillRect(x + Math.round(w * v / u.maxHp), y, 1, h); }
    if (u.isHero) {
      ov.fillStyle = '#2f7be0'; ov.fillRect(x, y + h + 1, w * u.mana / Math.max(1, u.maxMana), 3);
      ov.fillStyle = '#000'; ov.fillRect(x - 19, y - 1, 18, h + 7); ov.fillStyle = '#ffd54f'; ov.font = 'bold 12px ' + FONT; ov.fillText(u.level, x - 10, y + h / 2 + 2);
    }
    let tag = '', tc = '#fff';
    if (inv && u.isBuilding) { tag = '无敌'; tc = '#ccc'; }
    if (u.stun > 0) { tag = '眩晕'; tc = '#ffee58'; } else if (u.taunt) { tag = '嘲讽'; tc = '#ff5252'; } else if (u.hunger) { tag = '饥渴'; tc = '#e040fb'; }
    if (u.isBuilding && G.hover === u) { tag = u.name + (inv ? '（无敌）' : ''); tc = '#fff'; }
    if (tag) { ov.font = 'bold 12px ' + FONT; ov.lineWidth = 3; ov.strokeStyle = '#000'; ov.strokeText(tag, s.x, y - 9); ov.fillStyle = tc; ov.fillText(tag, s.x, y - 9); }
  }
  for (const f of floats) {
    const k = f.t / f.life, s = toScreen(f.x, f.y + k * 2.4, f.z);
    if (s.z > 1) continue;
    ov.globalAlpha = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
    const sz = f.size * (k < 0.12 ? 0.7 + k * 2.5 : 1);
    ov.font = `bold ${sz | 0}px ${FONT}`; ov.lineWidth = 3; ov.strokeStyle = '#000';
    ov.strokeText(f.text, s.x, s.y); ov.fillStyle = f.color; ov.fillText(f.text, s.x, s.y);
  }
  ov.globalAlpha = 1;
}

// ================= tooltips =================
const tip = $('tip');
function showTip(html, e) { tip.innerHTML = html; tip.classList.remove('hidden'); const r = tip.getBoundingClientRect(); tip.style.left = clamp(e.clientX - r.width / 2, 4, innerWidth - r.width - 4) + 'px'; tip.style.top = Math.max(4, e.clientY - r.height - 18) + 'px'; }
function hideTip() { tip.classList.add('hidden'); }
function bindTip(el, fn) { el.addEventListener('mouseenter', e => showTip(fn(), e)); el.addEventListener('mousemove', e => showTip(fn(), e)); el.addEventListener('mouseleave', hideTip); }
function skillTip(sk, h) {
  const d = sk.def, L = {}, cur = sk.lvl - 1, fmt = d.fmt || {};
  for (const k in d) if (Array.isArray(d[k])) L[k] = d[k].map((v, i) => { const s = fmt[k] ? fmt[k](v) : v; return i === cur ? `<b style="color:#fff">${s}</b>` : `<span style="color:#888">${s}</span>`; }).join('/');
    else if (typeof d[k] === 'number') L[k] = d[k];
  const max = d.ult ? 3 : 4;
  let s = `<div class="tt">${d.name} <span style="color:#aaa">[${d.key}]</span> ${d.passive ? '<span class="tc">被动</span>' : ''}${d.ult ? '<span style="color:#ff8a80">终极技能</span>' : ''}</div><div class="tc">等级 ${sk.lvl}/${max}</div><div>${d.text(L)}</div>`;
  if (d.mana) s += `<div class="tm">魔法消耗：${L.mana}</div>`;
  if (d.cd) s += `<div class="tc">冷却时间：${L.cd} 秒</div>`;
  if (d.range && !d.passive) s += `<div class="tc">施法距离：${d.range} 码</div>`;
  if (h && sk.lvl < max) { const need = d.ult ? 6 + sk.lvl * 6 : sk.lvl * 2 + 1; s += `<div style="color:${h.level >= need ? '#ffd54f' : '#ef9a9a'}">升级需要英雄等级 ${need}（点击“+”或 Alt+${d.key}）</div>`; }
  return s;
}
function itemTip(id, owned) { const D = ITEMS[id]; return `<div class="tt">${D.name}</div><div style="color:#ffd54f">价格：${D.cost} 金</div><div>${D.desc}</div>${owned ? '<div class="tc">右键点击出售（返还 50%）</div>' : ''}`; }
function icoHTML(char, color, cls = '') { return `<div class="ico ${cls}" style="background:linear-gradient(135deg,${color},${shade(color, -0.45)})">${char}</div>`; }
function shade(hex, f) { const c = new T.Color(hex); c.multiplyScalar(1 + f); return '#' + c.getHexString(); }

// ================= HUD =================
const hudEl = {};
function setT(el, v) { if (el._v !== v) { el._v = v; el.textContent = v; } }
function setS(el, k, v) { if (el['_' + k] !== v) { el['_' + k] = v; el.style[k] = v; } }
function buildHUD() {
  const P = G.player;
  $('portrait').src = PORTRAITS[P.def.id].head; $('heroName').textContent = `${P.def.name} · ${P.def.title}`;
  const sb = $('skills'); sb.innerHTML = ''; hudEl.skills = [];
  P.skills.forEach((sk, i) => {
    const d = sk.def, el = document.createElement('div'); el.className = 'skill';
    el.innerHTML = icoHTML(d.icon, d.color) + `<div class="cdov"></div><div class="cdtxt"></div><div class="key">${d.key}</div>${d.mana ? `<div class="mana"></div>` : ''}${d.passive ? '<div class="passive">被动</div>' : ''}<div class="pips">${'<i></i>'.repeat(d.ult ? 3 : 4)}</div><div class="learn hidden">+</div>`;
    el.addEventListener('mousedown', e => { if (e.button === 0) { e.stopPropagation(); pressSkill(i); } });
    const ln = el.querySelector('.learn'); ln.addEventListener('mousedown', e => { e.stopPropagation(); learnSkill(i); });
    bindTip(el, () => skillTip(sk, P));
    sb.appendChild(el);
    hudEl.skills.push({ el, cdov: el.querySelector('.cdov'), cdtxt: el.querySelector('.cdtxt'), mana: el.querySelector('.mana'), pips: [...el.querySelectorAll('.pips i')], learn: ln });
  });
  const ib = $('items'); ib.innerHTML = ''; hudEl.items = [];
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div'); el.className = 'slot';
    el.innerHTML = `<div class="icw" style="width:100%;height:100%"></div><div class="cdov"></div><div class="cdtxt" style="font-size:16px"></div><div class="key">${i + 1}</div>`;
    el.addEventListener('mousedown', e => { e.stopPropagation(); if (e.button === 0) pressItem(i); else if (e.button === 2) { sellItem(i); hideTip(); } });
    bindTip(el, () => P.items[i] ? itemTip(P.items[i].id, true) : '<div class="tc">空物品栏</div>');
    ib.appendChild(el); hudEl.items.push({ el, icw: el.querySelector('.icw'), cdov: el.querySelector('.cdov'), cdtxt: el.querySelector('.cdtxt'), id: undefined });
  }
  const sl = $('shopList'); sl.innerHTML = ''; hudEl.shop = [];
  for (const id of SHOP_ORDER) {
    const D = ITEMS[id], el = document.createElement('div'); el.className = 'sitem';
    el.innerHTML = icoHTML(D.icon, D.color) + `<div><div class="nm">${D.name} <span class="cs">${D.cost} 金</span></div><div class="ds">${D.desc}</div></div>`;
    el.addEventListener('mousedown', e => { e.stopPropagation(); if (e.button === 0) buyItem(id); });
    sl.appendChild(el); hudEl.shop.push({ el, id });
  }
  hudEl.stats = $('stats'); hudEl.buffs = $('buffs');
  hudEl.hp = $('hpbar'); hudEl.mp = $('mpbar');
}
function toggleShop() { $('shop').classList.toggle('hidden'); }
$('shopBtn').addEventListener('click', toggleShop); $('shopClose').addEventListener('click', toggleShop);
$('helpBtn').addEventListener('click', () => $('help').classList.toggle('hidden'));
function cdBg(f) { return f > 0 ? `conic-gradient(rgba(0,0,0,0) ${(1 - f) * 360}deg, rgba(0,0,0,0.72) 0)` : 'none'; }
let hudSlow = 0;
function updateHUD() {
  const P = G.player; if (!P) return;
  setT($('timer'), fmtTime(G.time));
  setT($('radScore'), String(G.score[RAD])); setT($('direScore'), String(G.score[DIRE]));
  setT($('kdaTxt'), `${P.kills} / ${P.deaths} / ${P.assists}`); setT($('lhTxt'), `${P.lh} / ${P.dn}`);
  setT($('gold'), String(Math.floor(P.gold)));
  setT($('lvl'), String(P.level));
  const xpPrev = XP_TABLE[P.level - 1], xpNext = XP_TABLE[P.level] || XP_TABLE[P.level - 1];
  setS($('xpfill'), 'width', P.level >= MAX_LEVEL ? '100%' : Math.floor((P.xp - xpPrev) / (xpNext - xpPrev) * 100) + '%');
  const hp = hudEl.hp, mp = hudEl.mp;
  setS(hp.firstChild, 'width', (P.hp / P.maxHp * 100).toFixed(1) + '%'); setT(hp.children[1], `${Math.ceil(P.hp)} / ${P.maxHp}`); setT(hp.children[2], '+' + P.hpRegen.toFixed(1));
  setS(mp.firstChild, 'width', (P.mana / P.maxMana * 100).toFixed(1) + '%'); setT(mp.children[1], `${Math.floor(P.mana)} / ${P.maxMana}`); setT(mp.children[2], '+' + P.manaRegen.toFixed(1));
  const pts = skillPoints(P);
  P.skills.forEach((sk, i) => {
    const e = hudEl.skills[i], d = sk.def;
    e.el.classList.toggle('nolvl', sk.lvl === 0);
    e.el.classList.toggle('nomana', sk.lvl > 0 && !d.passive && P.mana < lv(sk, 'mana'));
    e.el.classList.toggle('active', !!(G.targeting && G.targeting.kind === 'skill' && G.targeting.idx === i));
    setS(e.cdov, 'background', cdBg(sk.cd > 0 ? sk.cd / (sk.cdMax || 1) : 0));
    setT(e.cdtxt, sk.cd > 0 ? (sk.cd < 1 ? sk.cd.toFixed(1) : String(Math.ceil(sk.cd))) : '');
    if (e.mana) setT(e.mana, String(lv(sk, 'mana')));
    e.pips.forEach((p, k) => { const on = k < sk.lvl; if (p._on !== on) { p._on = on; p.classList.toggle('on', on); } });
    e.learn.classList.toggle('hidden', !(pts > 0 && canLearn(P, i)));
  });
  P.items.forEach((it, i) => {
    const e = hudEl.items[i], id = it ? it.id : null;
    if (e.id !== id) { e.id = id; e.icw.innerHTML = id ? icoHTML(ITEMS[id].icon, ITEMS[id].color) : ''; }
    setS(e.cdov, 'background', cdBg(it && it.cd > 0 ? it.cd / ITEMS[it.id].cd : 0));
    setT(e.cdtxt, it && it.cd > 0 ? String(Math.ceil(it.cd)) : '');
  });
  if ((hudSlow -= 1) > 0) return; hudSlow = 6;
  const pr = P.def.primary, st = (k, n, g) => `<div><span class="${k === 'str' ? 'sa' : k === 'agi' ? 'sg' : 'si'}">${n}${pr === k ? '★' : ''}</span><b>${Math.floor(P[k])} <small style="color:#888">+${g}</small></b></div>`;
  const html = `<div><span>攻击力</span><b>${Math.round(P.dmgMin)}-${Math.round(P.dmgMax)}</b></div><div><span>护甲</span><b>${P.armor.toFixed(1)}</b></div><div><span>攻击速度</span><b>${(1 / P.atkInterval).toFixed(2)}/秒</b></div><div><span>移动速度</span><b>${Math.round(P.speed * 50)}</b></div><div><span>魔法抗性</span><b>25%</b></div>` +
    st('str', '力量', P.def.strG) + st('agi', '敏捷', P.def.agiG) + st('int', '智力', P.def.intG);
  if (hudEl.stats._h !== html) { hudEl.stats._h = html; hudEl.stats.innerHTML = html; }
  const bf = [];
  if (P.callT > 0) bf.push(['#c62828', `狂战士之吼 +${P.callArmor}护甲 ${P.callT.toFixed(0)}s`]);
  if (P.fiery > 0) bf.push(['#e65100', `炽魂 ×${P.fiery} ${P.fieryT.toFixed(0)}s`]);
  const hg = units.filter(u => !u.dead && u.hunger && u.hunger.src === P).length; if (hg) bf.push(['#8e24aa', `战斗饥渴 ×${hg}`]);
  if (P.bkbT > 0) bf.push(['#f9a825', `魔法免疫 ${P.bkbT.toFixed(0)}s`]);
  if (P.salveT > 0) bf.push(['#2e7d32', `治疗药膏 ${P.salveT.toFixed(0)}s`]);
  if (!P.dead && dst(P, G.fountains[RAD]) < 12) bf.push(['#00838f', '泉水恢复']);
  const bh = bf.map(b => `<div class="buff" style="background:${b[0]}">${b[1]}</div>`).join('');
  if (hudEl.buffs._h !== bh) { hudEl.buffs._h = bh; hudEl.buffs.innerHTML = bh; }
  hudEl.shop.forEach(s => s.el.classList.toggle('cant', P.gold < ITEMS[s.id].cost));
  // target info
  const t = (G.hover && !G.hover.dead) ? G.hover : (G.selected && !G.selected.dead ? G.selected : null);
  const ti = $('tinfo');
  if (t) {
    ti.classList.remove('hidden');
    setT($('tName'), `${t.name}`); $('tName').style.color = t.team === RAD ? '#7cdc6a' : '#ff6b5b';
    setS($('tHpFill'), 'width', (t.hp / t.maxHp * 100).toFixed(1) + '%'); setT($('tHp'), `${Math.ceil(t.hp)} / ${Math.round(t.maxHp)}`);
    setT($('tExtra'), t.kind === 'fountain' ? '泉水（无敌）' : `攻击 ${Math.round(t.dmgMin)}-${Math.round(t.dmgMax)}　护甲 ${t.armor.toFixed(0)}${isInvuln(t) ? '　无敌' : ''}${t.gold && t.team !== RAD ? '　赏金 ' + t.gold : ''}`);
  } else ti.classList.add('hidden');
}
const HELP_HTML = `<div style="color:#ffd54f;font-size:16px;font-weight:bold;margin-bottom:4px">操作说明</div>
<b>右键</b>移动 / 攻击目标（对生命低于 50% 的友方小兵右键可反补）<br>
<b>Q W E R</b>施放技能（需选择目标时左键确认，右键/Esc 取消）<br>
<b>Alt + Q/W/E/R</b>学习技能（或点击技能上方的“+”）<br>
<b>A + 左键</b>攻击移动<br>
<b>S</b>停止　　<b style="min-width:0">H</b>　原地待命<br>
<b>1 - 6</b>使用物品栏物品（右键物品出售）<br>
<b>B</b>打开 / 关闭商店<br>
<b>方向键 / 鼠标移到屏幕边缘</b>移动镜头<br>
<b>空格</b>镜头回到英雄（按住跟随）　<b style="min-width:0">Y</b> 锁定镜头<br>
<b>鼠标滚轮</b>缩放镜头<br>
<b>小地图</b>左键移动镜头，右键让英雄移动<br>
<b>P</b>暂停　　<b style="min-width:0">F1</b>　显示/隐藏本说明<br>
<span style="color:#aaa">目标：沿三路推进，依次摧毁一塔→二塔→三塔→基地四塔，最后摧毁夜魇遗迹（右上角）。</span>`;
$('help').innerHTML = HELP_HTML;

// ================= portraits & hero select =================
const PORTRAITS = {};
function renderPortraits() {
  let r;
  try { r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  for (const id of ['axe', 'lina']) {
    const sc = new T.Scene(); sc.add(new T.HemisphereLight('#ffffff', '#555566', 0.85));
    const dl = new T.DirectionalLight('#fff', 0.7); dl.position.set(3, 6, 8); sc.add(dl);
    const m = buildModel(id, MODEL_DEFS[id]()); m.rotation.y = -0.45; sc.add(m);
    const p = m.userData.parts; p.armR.rotation.x = -0.5; p.armL.rotation.x = 0.2; p.legL.rotation.x = 0.15; p.legR.rotation.x = -0.15;
    const headY = id === 'axe' ? 3.0 : 2.75;
    const cam = new T.PerspectiveCamera(28, 1, 0.1, 100);
    r.setSize(256, 256); cam.aspect = 1; cam.updateProjectionMatrix(); cam.position.set(0.6, headY + 0.4, 4.6); cam.lookAt(0, headY - 0.1, 0);
    r.render(sc, cam); const head = r.domElement.toDataURL();
    r.setSize(300, 300); cam.position.set(1.5, 3.2, 10.5); cam.lookAt(0.2, 1.9, 0); r.render(sc, cam); const full = r.domElement.toDataURL();
    PORTRAITS[id] = { head, full };
  }
  r.dispose(); r.forceContextLoss && r.forceContextLoss();
}
function buildSelect() {
  const cards = $('cards');
  for (const id of ['axe', 'lina']) {
    const d = HEROES[id], el = document.createElement('div'); el.className = 'card ' + id;
    el.innerHTML = `<div class="pimg"><img class="px" src="${PORTRAITS[id] ? PORTRAITS[id].full : ''}"></div><h2 style="color:${d.color === '#c62828' ? '#ff6b5b' : '#ffab40'}">${d.name} <small style="font-size:14px;color:#aaa">${d.title}</small></h2>
      <div class="attr">${d.type}　力量 ${d.str}　敏捷 ${d.agi}　智力 ${d.int}</div><div class="desc">${d.desc}</div>` +
      SKILLS[id].map(s => `<div class="sk">${icoHTML(s.icon, s.color)}<div><b>${s.key} · ${s.name}</b>${s.passive ? ' <span style="color:#999">被动</span>' : ''}${s.ult ? ' <span style="color:#ff8a80">终极</span>' : ''}</div></div>`).join('') +
      `<div class="btn">选择 ${d.name}</div>`;
    el.addEventListener('click', () => startGame(id));
    el.id = 'pick-' + id;
    cards.appendChild(el);
  }
  $('ctrlHelp').innerHTML = '<b>右键</b> 移动/攻击　<b>QWER</b> 技能　<b>Alt+QWER</b> 学技能　<b>A</b> 攻击移动　<b>S</b> 停止　<b>1-6</b> 物品　<b>B</b> 商店　<b>空格</b> 回到英雄　<b>方向键/屏幕边缘</b> 移动镜头　<b>滚轮</b> 缩放　<b>F1</b> 帮助';
}
function startGame(id) {
  if (G.started) return;
  G.player = createHero(id); G.started = true;
  $('select').classList.add('hidden'); $('game').classList.remove('hidden');
  buildHUD();
  G.cam.x = G.player.x + 6; G.cam.z = G.player.z - 8; G.cam.dist = 58;
  msg('欢迎来到方块刀塔！摧毁夜魇遗迹即可获胜', '#ffd54f');
  msg('你有 1 点技能点——点击技能上方的“+”学习', '#fff59d');
}

// ================= main loop =================
setupBuildings();
G.fountains = []; for (const u of units) if (u.kind === 'fountain') G.fountains[u.team] = u;
renderPortraits(); buildSelect();
let last = performance.now(), fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  if (G.started && !G.paused && !G.over) { let t = Math.min(0.1, rdt) * G.timeScale; while (t > 1e-6) { const s = Math.min(0.05, t); step(s); t -= s; } }
  else if (!G.paused) { for (let i = effects.length - 1; i >= 0; i--) if (effects[i].update(rdt)) effects.splice(i, 1); updateCorpses(rdt); updateParticles(rdt); for (const u of units) if (u.isBuilding && !u.dead) syncModel(u, rdt); }
  updateCamera(rdt); updateIndicators();
  renderer.render(scene, camera);
  drawOverlay();
  if (G.started) { drawMinimap(); updateHUD(); }
  fpsN++; fpsT += rdt; if (fpsT >= 0.5) { $('fps').textContent = 'FPS ' + Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; }
}
requestAnimationFrame(frame);
// test/debug hooks
window.VD = { G, units, startGame, step, pressSkill, learnSkill, buyItem, pressItem, issueMove, gainXP: a => gainXP(G.player, a),
  simulate(sec, dt = 1 / 30) { for (let t = 0; t < sec; t += dt) step(dt); },
  toScreen: (x, y, z) => toScreen(x, y, z), renderer, killUnit, dealDamage };
