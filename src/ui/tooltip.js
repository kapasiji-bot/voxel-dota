// ui/tooltip.js — hover tooltips for abilities/items, icon HTML helper.
// ================= tooltips =================
const tip = $('tip');
function showTip(html, e) { tip.innerHTML = html; tip.classList.remove('hidden'); const r = tip.getBoundingClientRect(); tip.style.left = clamp(e.clientX - r.width / 2, 4, innerWidth - r.width - 4) + 'px'; tip.style.top = Math.max(4, e.clientY - r.height - 18) + 'px'; }
function hideTip() { tip.classList.add('hidden'); }
function bindTip(el, fn) { el.addEventListener('mouseenter', e => showTip(fn(), e)); el.addEventListener('mousemove', e => showTip(fn(), e)); el.addEventListener('mouseleave', hideTip); }
// tooltip values: every array in def.values / mana / cd shown as a/b/c/d with current level highlighted
function skillTip(sk, h) {
  const d = sk.def, L = {}, cur = sk.lvl - 1, fmt = d.fmt || {};
  const src = Object.assign({}, d.values || {}, { mana: d.mana, cd: d.cd, range: d.range });
  for (const k in src) { const v = src[k]; if (v === undefined) continue;
    L[k] = Array.isArray(v) ? v.map((x, i) => { const s = fmt[k] ? fmt[k](x) : x; return i === cur ? `<b style="color:#fff">${s}</b>` : `<span style="color:#888">${s}</span>`; }).join('/') : (fmt[k] ? fmt[k](v) : v); }
  const max = maxAbilityLevel(d);
  let s = `<div class="tt">${d.name} <span style="color:#aaa">[${d.key}]</span> ${d.passive ? '<span class="tc">被动</span>' : ''}${d.ult ? '<span style="color:#ff8a80">终极技能</span>' : ''}</div><div class="tc">等级 ${sk.lvl}/${max}</div><div>${d.text(L)}</div>`;
  if (d.mana) s += `<div class="tm">魔法消耗：${L.mana}</div>`;
  if (d.cd) s += `<div class="tc">冷却时间：${L.cd} 秒</div>`;
  if (d.range && !d.passive) s += `<div class="tc">施法距离：${L.range} 码</div>`;
  if (d.scepter) s += `<div class="tsc${d.scepterOn ? ' on' : ''}"><b>阿哈利姆神杖${d.scepterOn ? '（已激活）' : ''}：</b>${d.scepter.desc}</div>`;   // abilities/scepter.js
  if (h && sk.lvl < max) { const need = learnLevelReq(d, sk.lvl); s += `<div style="color:${h.level >= need ? '#ffd54f' : '#ef9a9a'}">升级需要英雄等级 ${need}（点击“+”或 Alt+${d.key}）</div>`; }
  return s;
}
// recipe tree: nested component list; parts the player already owns (inventory / stash, each counted once) are ticked green
function recipeTree(id, h, have, depth = 0) {
  const D = ITEM_DEFS[id], rows = [];
  for (const p of D.parts || []) {
    const P = ITEM_DEFS[p], k = have.findIndex(x => x === p), own = k >= 0; if (own) have.splice(k, 1);
    rows.push(`<div class="rt" style="padding-left:${depth * 12}px">${own ? '<span class="ok">✔</span>' : '•'} ${icoHTML(P.icon, P.color, 'mini')} ${P.name} <span class="tg">${P.cost}</span></div>`);
    if (!own && P.parts) rows.push(recipeTree(p, h, have, depth + 1));
  }
  const rec = D.cost - (D.parts || []).reduce((a, p) => a + ITEM_DEFS[p].cost, 0);
  if (rec > 0) rows.push(`<div class="rt" style="padding-left:${depth * 12}px">• <span class="rcp">卷轴</span> 配方 <span class="tg">${rec}</span></div>`);
  return rows.join('');
}
function itemTip(id, owned) {
  const D = ITEM_DEFS[id], h = G.player;
  let s = `<div class="tt">${D.name}${D.en ? ` <span style="color:#aaa;font-weight:normal">${D.en}</span>` : ''}</div><div style="color:#ffd54f">价格：${D.cost} 金${!owned && h && D.parts && itemPrice(h, id) < D.cost ? `（你还需 ${itemPrice(h, id)} 金）` : ''}</div>`;
  if (D.parts && !owned) { const have = h ? h.items.filter(Boolean).map(i => i.id).concat((h.stash || []).map(x => x.id)) : []; s += `<div class="rtree"><div style="color:#90caf9">配方（已有部件自动合成，抵扣价格）：</div>${recipeTree(id, h, have)}</div>`; }
  const up = !owned && Object.values(ITEM_DEFS).filter(x => (x.parts || []).includes(id));
  if (up && up.length) s += `<div class="tc">可合成：${up.map(x => x.name).join('、')}</div>`;
  if (!owned && !D.noShop) s += `<div class="tc" style="color:${D.shop === 'secret' ? '#ce93d8' : '#80cbc4'}">购买地点：${shopLocLabel(D)}</div>`;   // B8
  return s + `<div>${D.desc}</div>${owned ? '<div class="tc">右键点击出售（返还 50%）</div>' : ''}`;
}
function icoHTML(char, color, cls = '') { return `<div class="ico ${cls}" style="background:linear-gradient(135deg,${color},${shade(color, -0.45)})">${char}</div>`; }
function shade(hex, f) { const c = new T.Color(hex); c.multiplyScalar(1 + f); return '#' + c.getHexString(); }

