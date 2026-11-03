// ui/select.js — hero portraits (offscreen render), hero select cards, startGame(id).
// ================= portraits & hero select =================
const PORTRAITS = {};
function renderPortraits() {
  let r;
  try { r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  // heroes (head + full body) and summon types (head only, HUD portrait of a selected summon)
  const list = [...heroList().map(d => ({ id: d.id, model: d.model(), portrait: d.portrait })), ...Object.values(SUMMON_TYPES).map(s => ({ id: 'summon_' + s.id, model: s.model(RAD), portrait: s.portrait, summon: true }))];
  for (const hd of list) {
    const id = hd.id, sc = new T.Scene(); sc.add(new T.HemisphereLight('#ffffff', '#555566', 0.85));
    const dl = new T.DirectionalLight('#fff', 0.7); dl.position.set(3, 6, 8); sc.add(dl);
    const m = buildModel(id, hd.model); m.rotation.y = hd.summon ? -0.35 : -0.45; sc.add(m);
    const p = m.userData.parts; if (p.armR) { p.armR.rotation.x = -0.5; p.armL.rotation.x = 0.2; p.legL.rotation.x = 0.15; p.legR.rotation.x = -0.15; }
    const headY = (hd.portrait && hd.portrait.headY) || 2.9;
    const cam = new T.PerspectiveCamera(28, 1, 0.1, 100);
    r.setSize(256, 256); cam.aspect = 1; cam.updateProjectionMatrix(); cam.position.set(0.6, headY + 0.4, 4.6); cam.lookAt(0, headY - 0.1, 0);
    if (hd.summon) {   // B6: fit the whole summon's bounding sphere in a front 3/4 view (quadrupeds have no head part to aim at)
      m.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(m), c = bb.getCenter(new T.Vector3()), sp = bb.getBoundingSphere(new T.Sphere());
      const dist = sp.radius / Math.sin(cam.fov * Math.PI / 360) * 0.74, dir = new T.Vector3(0.55, 0.42, 1).normalize();
      c.z += sp.radius * 0.15; c.y += sp.radius * 0.04; cam.position.copy(c).addScaledVector(dir, dist); cam.lookAt(c.x, c.y, c.z);   // lean toward the head (+Z front, upper half)
    }
    r.render(sc, cam); const head = r.domElement.toDataURL();
    if (hd.summon) { PORTRAITS[id] = { head, full: head }; continue; }
    r.setSize(300, 300); cam.position.set(1.5, 3.2, 10.5); cam.lookAt(0.2, 1.9, 0); r.render(sc, cam); const full = r.domElement.toDataURL();
    PORTRAITS[id] = { head, full };
  }
  r.dispose(); r.forceContextLoss && r.forceContextLoss();
}
function buildMatchOpts() {
  const box = document.createElement('div'); box.id = 'matchOpts';
  const group = (label, key, vals, names) => `<div class="og" data-k="${key}"><b>${label}</b>` + vals.map((v, i) => `<div class="ob${G.match[key] === v ? ' on' : ''}" data-v="${v}">${names ? names[i] : v}</div>`).join('') + '</div>';
  box.innerHTML = group('夜魇电脑', 'enemies', [1, 2, 3, 4, 5]) + group('天辉队友', 'allies', [0, 1, 2, 3, 4]) + group('难度', 'diff', [0, 1, 2], DIFF_CN);
  box.addEventListener('click', e => {
    const ob = e.target.closest('.ob'); if (!ob) return; const g = ob.parentNode;
    G.match[g.dataset.k] = +ob.dataset.v; for (const x of g.querySelectorAll('.ob')) x.classList.toggle('on', x === ob);
  });
  $('cards').before(box);
}
// English aliases for select search (CN name / title / id also match). Kept here so hero files stay gameplay-only.
const HERO_EN = {
  am: 'Anti-Mage', axe: 'Axe', bh: 'Bounty Hunter', cent: 'Centaur Warrunner', cm: 'Crystal Maiden',
  disruptor: 'Disruptor', ember: 'Ember Spirit', enigma: 'Enigma', es: 'Earthshaker', jugg: 'Juggernaut',
  kunkka: 'Kunkka', ld: 'Lone Druid', lich: 'Lich', lina: 'Lina', lion: 'Lion', lycan: 'Lycan',
  mirana: 'Mirana', naga: 'Naga Siren', np: "Nature's Prophet", pa: 'Phantom Assassin', pl: 'Phantom Lancer',
  puck: 'Puck', qop: 'Queen of Pain', riki: 'Riki', sf: 'Shadow Fiend', silencer: 'Silencer', sk: 'Sand King',
  slardar: 'Slardar', sniper: 'Sniper', spectre: 'Spectre', sshaman: 'Shadow Shaman', storm: 'Storm Spirit',
  sven: 'Sven', tide: 'Tidehunter', tinker: 'Tinker', void: 'Faceless Void', wd: 'Witch Doctor', weaver: 'Weaver',
  wk: 'Wraith King', wr: 'Windranger', zeus: 'Zeus',
};
const ATTR_CN = { str: '力量', agi: '敏捷', int: '智力' };
const ROLE_CN = { carry: '核心', support: '辅助', tank: '先手' };
const SEL = { q: '', attr: '', role: '' };   // empty string = all
const heroRoleTag = d => (d.ai && d.ai.role) || (d.stats.primary === 'int' ? 'support' : d.stats.primary === 'str' ? 'tank' : 'carry');
const heroSearchBlob = d => [d.id, d.name, d.title, HERO_EN[d.id] || '', d.type, ATTR_CN[d.stats.primary] || '', ROLE_CN[heroRoleTag(d)] || ''].join(' ').toLowerCase();
function setHeroFilter(o = {}) {
  if (o.q !== undefined) SEL.q = String(o.q);
  if (o.attr !== undefined) SEL.attr = o.attr || '';
  if (o.role !== undefined) SEL.role = o.role || '';
  const inp = $('heroSearch'); if (inp && o.q !== undefined) inp.value = SEL.q;
  for (const g of document.querySelectorAll('#heroFilter .og')) {
    const k = g.dataset.k, cur = SEL[k] || '';
    for (const x of g.querySelectorAll('.ob')) x.classList.toggle('on', (x.dataset.v || '') === cur);
  }
  applyHeroFilter();
}
function applyHeroFilter() {
  const q = (SEL.q || '').trim().toLowerCase();
  let n = 0;
  for (const d of heroList()) {
    const el = $('pick-' + d.id); if (!el) continue;
    const show = (!q || heroSearchBlob(d).includes(q)) && (!SEL.attr || d.stats.primary === SEL.attr) && (!SEL.role || heroRoleTag(d) === SEL.role);
    el.classList.toggle('hide', !show); if (show) n++;
  }
  const hn = $('heroFilterN'); if (hn) hn.textContent = `${n} / ${heroList().length}`;
  return n;
}
function buildHeroFilter() {
  const box = document.createElement('div'); box.id = 'heroFilter';
  const chip = (k, v, label, cls = '') => `<div class="ob${cls}${(SEL[k] || '') === v ? ' on' : ''}" data-v="${v}">${label}</div>`;
  box.innerHTML =
    `<input id="heroSearch" type="search" placeholder="搜索：中文名 / 英文 / id" autocomplete="off" spellcheck="false">` +
    `<div class="og" data-k="attr"><b>属性</b>${chip('attr', '', '全部')}${chip('attr', 'str', '力量', ' sa')}${chip('attr', 'agi', '敏捷', ' sg')}${chip('attr', 'int', '智力', ' si')}</div>` +
    `<div class="og" data-k="role"><b>定位</b>${chip('role', '', '全部')}${chip('role', 'carry', '核心')}${chip('role', 'support', '辅助')}${chip('role', 'tank', '先手')}</div>` +
    `<span id="heroFilterN" class="hn"></span>`;
  box.addEventListener('click', e => {
    const ob = e.target.closest('.ob'); if (!ob || !ob.closest('.og')) return;
    const g = ob.closest('.og'); SEL[g.dataset.k] = ob.dataset.v || '';
    for (const x of g.querySelectorAll('.ob')) x.classList.toggle('on', x === ob);
    applyHeroFilter();
  });
  const inp = box.querySelector('#heroSearch');
  inp.addEventListener('input', () => { SEL.q = inp.value; applyHeroFilter(); });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { inp.value = ''; SEL.q = ''; applyHeroFilter(); inp.blur(); } });
  $('cards').before(box);
}
function buildSelect() {
  buildMatchOpts();
  buildHeroFilter();
  const cards = $('cards');
  for (const d of heroList()) {
    const id = d.id, el = document.createElement('div'); el.className = 'card'; el.style.setProperty('--btn', d.color);
    el.dataset.id = id; el.dataset.attr = d.stats.primary; el.dataset.role = heroRoleTag(d);
    el.innerHTML = `<div class="pimg"><img class="px" src="${PORTRAITS[id] ? PORTRAITS[id].full : ''}"></div>
      <div><h2 style="color:${d.nameColor || '#ffab40'}">${d.name} <small style="font-size:13px;color:#aaa">${d.title}</small></h2>
      <div class="attr"><span class="ty">${d.type}</span><span class="role">${ROLE_CN[heroRoleTag(d)]}</span><span class="st"><i class="sa">力</i>${d.stats.str} <i class="sg">敏</i>${d.stats.agi} <i class="si">智</i>${d.stats.int}</span></div></div><div class="desc">${d.desc}</div>
      <div class="sks">` + d.abilities.map(s => `<div class="sk">${icoHTML(s.icon, s.color)}<span><b>${s.key}</b> ${s.name}${s.passive ? ' <span class="tag" style="color:#999">被动</span>' : ''}${s.ult ? ' <span class="tag" style="color:#ff8a80">终极</span>' : ''}</span></div>`).join('') +
      `</div><div class="btn" style="background:${d.color}">选择 ${d.name}</div>`;
    el.addEventListener('click', () => startGame(id));
    el.id = 'pick-' + id;
    cards.appendChild(el);
  }
  applyHeroFilter();
  $('ctrlHelp').innerHTML = '<b>右键</b> 移动/攻击　<b>QWER</b> 技能　<b>Alt+QWER</b> 学技能　<b>A</b> 攻击移动　<b>S</b> 停止　<b>1-6</b> 物品　<b>B</b> 商店　<b>空格</b> 回到英雄　<b>方向键/屏幕边缘</b> 移动镜头　<b>滚轮</b> 缩放　<b>左键/框选</b> 选单位　<b>F1</b> 选英雄　<b>F3</b> 信使　<b>Shift+F3</b> 友军信使　<b>Tab</b> 切换单位　<b>F9</b> 帮助';
}
// opts: {enemies 0-5, allies 0-4, diff 0-2}; defaults to the select-screen choice (G.match)
function startGame(id, opts) {
  if (G.started) return;
  if (opts) Object.assign(G.match, opts);
  G.player = createHero(id); G.started = true;
  setupMatch(id, G.match);
  $('select').classList.add('hidden'); $('game').classList.remove('hidden');
  buildHUD();
  G.cam.x = G.player.x + 6; G.cam.z = G.player.z - 8; G.cam.dist = 58;
  msg('欢迎来到方块刀塔！摧毁夜魇遗迹即可获胜', '#ffd54f');
  msg('你有 1 点技能点——点击技能上方的“+”学习', '#fff59d');
}

