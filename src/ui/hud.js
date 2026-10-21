// ui/hud.js — bottom HUD (portrait, stats, ability bar, items, gold, buffs), shop panel, target info, help text.
// ================= HUD =================
const hudEl = {};
function setT(el, v) { if (el._v !== v) { el._v = v; el.textContent = v; } }
function setS(el, k, v) { if (el['_' + k] !== v) { el['_' + k] = v; el.style[k] = v; } }
// the ability bar / portrait / bars / stats follow the ACTIVE selected unit (ui/control.js); items and gold are the hero's
function buildSkillBar(U) {
  const P = U; hudEl.skillU = U;
  const pk = U.def ? U.def.id : 'summon_' + U.type, pt = PORTRAITS[pk] || PORTRAITS[U.owner ? U.owner.def.id : ''];
  if (pt) $('portrait').src = pt.head; $('portrait').classList.toggle('illu', !!U.isIllusion);
  $('heroName').textContent = U.isHero ? `${U.def.name} · ${U.def.title}` : U.isIllusion ? `${U.def.name} · 幻象` : `${U.name} · ${U.owner.def.name}的召唤物`;
  const sb = $('skills'); sb.innerHTML = ''; hudEl.skills = [];
  (U.abilities || []).forEach((sk, i) => {
    const d = sk.def, el = document.createElement('div'); el.className = 'skill';
    el.innerHTML = icoHTML(d.icon, d.color) + `<div class="cdov"></div><div class="cdtxt"></div><div class="key">${d.key}</div>${lvVal(d, 'mana', 1) ? `<div class="mana"></div>` : ''}${d.passive ? '<div class="passive">被动</div>' : ''}${d.orb ? '<div class="autotag">右键自动</div>' : ''}<div class="pips">${'<i></i>'.repeat(d.ult ? 3 : 4)}</div><div class="learn hidden">+</div>`;
    el.addEventListener('mousedown', e => { if (e.button === 0) { e.stopPropagation(); pressSkill(i); } else if (e.button === 2 && d.orb) { e.stopPropagation(); if (!toggleAutocast(U, i)) err('技能尚未学习'); } });   // right-click: autocast orbs
    const ln = el.querySelector('.learn'); ln.addEventListener('mousedown', e => { e.stopPropagation(); learnSkill(i); });
    bindTip(el, () => skillTip(sk, P));
    sb.appendChild(el);
    hudEl.skills.push({ el, cdov: el.querySelector('.cdov'), cdtxt: el.querySelector('.cdtxt'), mana: el.querySelector('.mana'), pips: [...el.querySelectorAll('.pips i')], learn: ln });
  });
}
function buildHUD() {
  const P = G.player;
  buildSkillBar(P);
  const ib = $('items'); ib.innerHTML = ''; hudEl.items = [];
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div'); el.className = 'slot';
    el.innerHTML = `<div class="icw" style="width:100%;height:100%"></div><div class="cdov"></div><div class="cdtxt" style="font-size:16px"></div><div class="key">${i + 1}</div><div class="chg"></div>`;
    el.addEventListener('mousedown', e => { e.stopPropagation(); if (e.button === 0) pressItem(i); else if (e.button === 2) { sellItem(i); hideTip(); } });
    bindTip(el, () => P.items[i] ? itemTip(P.items[i].id, true) : '<div class="tc">空物品栏</div>');
    ib.appendChild(el); hudEl.items.push({ el, icw: el.querySelector('.icw'), cdov: el.querySelector('.cdov'), cdtxt: el.querySelector('.cdtxt'), chg: el.querySelector('.chg'), id: undefined });
  }
  buildShop();   // ui/shop.js
  hudEl.stats = $('stats'); hudEl.buffs = $('buffs');
  hudEl.hp = $('hpbar'); hudEl.mp = $('mpbar');
}
$('helpBtn').addEventListener('click', () => $('help').classList.toggle('hidden')); $('optBtn').addEventListener('click', () => toggleOptions());
function cdBg(f) { return f > 0 ? `conic-gradient(rgba(0,0,0,0) ${(1 - f) * 360}deg, rgba(0,0,0,0.72) 0)` : 'none'; }
let hudSlow = 0;
function updateHUD() {
  const P = G.player; if (!P) return;
  setT($('timer'), fmtTime(G.time) + (isNight() ? ' 夜' : ' 昼'));
  setT($('radScore'), String(G.score[RAD])); setT($('direScore'), String(G.score[DIRE]));
  setT($('kdaTxt'), `${P.kills} / ${P.deaths} / ${P.assists}`); setT($('lhTxt'), `${P.lh} / ${P.dn}`);
  setT($('gold'), String(Math.floor(P.gold)));
  setT($('lvl'), String(P.level));
  const xpPrev = XP_TABLE[P.level - 1], xpNext = XP_TABLE[P.level] || XP_TABLE[P.level - 1];
  setS($('xpfill'), 'width', P.level >= MAX_LEVEL ? '100%' : Math.floor((P.xp - xpPrev) / (xpNext - xpPrev) * 100) + '%');
  const U = ctlActive(); if (U && hudEl.skillU !== U) buildSkillBar(U);
  const hp = hudEl.hp, mp = hudEl.mp;
  setS(hp.firstChild, 'width', (U.hp / U.maxHp * 100).toFixed(1) + '%'); setT(hp.children[1], `${Math.ceil(U.hp)} / ${Math.round(U.maxHp)}`); setT(hp.children[2], '+' + (U.hpRegen || 0).toFixed(1));
  setS(mp.firstChild, 'width', (U.maxMana ? U.mana / U.maxMana * 100 : 0).toFixed(1) + '%'); setT(mp.children[1], U.maxMana ? `${Math.floor(U.mana)} / ${Math.round(U.maxMana)}` : '—'); setT(mp.children[2], U.isHero ? '+' + U.manaRegen.toFixed(1) : '');
  const pts = U === P ? skillPoints(P) : 0;
  (U.abilities || []).forEach((sk, i) => {
    const e = hudEl.skills[i], d = sk.def;
    e.el.classList.toggle('nolvl', sk.lvl === 0);
    e.el.classList.toggle('nomana', sk.lvl > 0 && !d.passive && (U.mana || 0) < (lvVal(d, 'mana', sk.lvl) || 0));
    e.el.classList.toggle('active', !!(G.targeting && G.targeting.kind === 'skill' && G.targeting.slot === i && G.targeting.caster === U));   // (B6 fix: was .idx → never highlighted)
    e.el.classList.toggle('toggled', !!(d.toggle && isToggled(U, d.id)));
    e.el.classList.toggle('auto', !!(d.orb && sk.auto));   // autocast orb on (abilities/orb.js)   // toggle abilities (Voodoo Restoration)
    setS(e.cdov, 'background', cdBg(sk.cd > 0 ? sk.cd / (sk.cdMax || 1) : 0));
    setT(e.cdtxt, sk.cd > 0 ? (sk.cd < 1 ? sk.cd.toFixed(1) : String(Math.ceil(sk.cd))) : '');
    if (e.mana) setT(e.mana, String(lvVal(d, 'mana', sk.lvl)));
    e.pips.forEach((p, k) => { const on = k < sk.lvl; if (p._on !== on) { p._on = on; p.classList.toggle('on', on); } });
    e.learn.classList.toggle('hidden', !(pts > 0 && U === P && canLearn(P, i)));
  });
  P.items.forEach((it, i) => {
    const e = hudEl.items[i], id = it ? it.id : null;
    if (e.id !== id) { e.id = id; e.icw.innerHTML = id ? icoHTML(ITEM_DEFS[id].icon, ITEM_DEFS[id].color) : ''; }
    setS(e.cdov, 'background', cdBg(it && it.cd > 0 ? it.cd / (it.def.active.cd || 1) : 0));
    setT(e.cdtxt, it && it.cd > 0 ? String(Math.ceil(it.cd)) : '');
    setT(e.chg, it && it.def.stack ? String(it.charges) : '');
  });
  if ((hudSlow -= 1) > 0) return; hudSlow = 6;
  const S = (U.def || P.def).stats, pr = S.primary, st = (k, n, g) => `<div><span class="${k === 'str' ? 'sa' : k === 'agi' ? 'sg' : 'si'}">${n}${pr === k ? '★' : ''}</span><b>${Math.floor(P[k])} <small style="color:#888">+${g}</small></b></div>`;
  const html = `<div><span>攻击力</span><b>${Math.round(U.dmgMin)}-${Math.round(U.dmgMax)}</b></div><div><span>护甲</span><b>${U.armor.toFixed(1)}</b></div><div><span>攻击速度</span><b>${(1 / U.atkInterval).toFixed(2)}/秒</b></div><div><span>移动速度</span><b>${Math.round(U.speed * 50)}</b></div><div><span>魔法抗性</span><b>${Math.round(U.magicRes * 100)}%</b></div>` +
    (U.isHero ? st('str', '力量', S.strG) + st('agi', '敏捷', S.agiG) + st('int', '智力', S.intG) : U.isIllusion ? `<div><span>造成伤害</span><b>${Math.round(U.illuOut * 100)}%</b></div><div><span>承受伤害</span><b>${Math.round(U.illuIn * 100)}%</b></div>` : '') +
    (U.expire ? `<div><span>剩余时间</span><b>${Math.max(0, Math.ceil(U.expire - G.time))} 秒</b></div>` : '') + (CTL.sel.length > 1 ? `<div><span>已选单位</span><b>${ctlSel().length}（Tab 切换）</b></div>` : '');
  if (hudEl.stats._h !== html) { hudEl.stats._h = html; hudEl.stats.innerHTML = html; }
  const bf = [];
  for (const m of U.mods) if (m.def.name) bf.push([m.def.color || '#555', `${m.def.name}${m.stacks > 1 ? ' ×' + m.stacks : ''}${isFinite(m.t) ? ' ' + Math.ceil(m.t) + 's' : ''}`]);
  if (!P.dead && dst(P, G.fountains[RAD]) < 12) bf.push(['#00838f', '泉水恢复']);
  const bh = bf.map(b => `<div class="buff" style="background:${b[0]}">${b[1]}</div>`).join('');
  if (hudEl.buffs._h !== bh) { hudEl.buffs._h = bh; hudEl.buffs.innerHTML = bh; }
  updateShop(); updateCourierHUD();   // ui/courier.js
  // target info
  let t = (G.hover && !G.hover.dead) ? G.hover : (G.selected && !G.selected.dead ? G.selected : null);
  if (t && !canSee(P.team, t)) t = null;   // lost vision
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
<b>左键 / 框选</b>选择自己的单位（召唤物、幻象）；右键命令作用于全部选中单位<br>
<b>F1</b>只选英雄　<b style="min-width:0">F2</b>　选中其他所有单位　<b style="min-width:0">Tab</b>　切换当前单位（单独选中英雄时按住 = 计分板）<br>
<b>Ctrl + 1-5</b>保存编队　<b style="min-width:0">Shift + 1-5</b>　选中编队<br>
<b>P</b>暂停　<b style="min-width:0">F9</b> 本说明　<b style="min-width:0">F10</b> 设置/音量　<b style="min-width:0">M</b> 静音　<b style="min-width:0">F</b> 全屏<br>
<span style="color:#aaa">目标：沿三路推进，依次摧毁一塔→二塔→三塔→基地四塔，最后摧毁夜魇遗迹（右上角）。</span>`;
$('help').innerHTML = HELP_HTML;

