// ui/shop.js — shop panel: category tabs (基础 / 升级 / 消耗品), search box (Chinese name, English name, id, common nicknames;
// a search looks through every tab), compact item grid with recipe-tree tooltips (ui/tooltip.js), shop-range hint, stash row,
// team ward stock. Data rules: entities/shop.js. Category: def.cat, else consumable/stack → 消耗品, recipe (parts) → 升级, else 基础.
const shopEl = { items: [], tab: 'basic', q: '' };
const SHOP_TABS = [['basic', '基础'], ['upgrade', '升级'], ['consumable', '消耗品']];
const itemCat = D => D.cat || (D.consumable || D.stack ? 'consumable' : D.parts ? 'upgrade' : 'basic');
const ITEM_EN = { boots: 'Boots of Speed', blink: 'Blink Dagger', bkb: 'Black King Bar', claymore: 'Claymore', salve: 'Healing Salve', dust: 'Dust of Appearance',
  tp: 'Town Portal Scroll', ward_obs: 'Observer Ward', ward_sentry: 'Sentry Ward', phase: 'Phase Boots', arcane: 'Arcane Boots', shadow: 'Shadow Amulet',
  veil: 'Veil of Discord', bfury: 'Battle Fury', assault: 'Assault Cuirass', vanguard: 'Vanguard', gauntlets: 'Gauntlets of Strength', slippers: 'Slippers of Agility',
  mantle: 'Mantle of Intelligence', circlet: 'Circlet', ring: 'Ring of Protection', gloves: 'Gloves of Haste', ogre: 'Ogre Axe', blade: 'Blade of Alacrity',
  staff: 'Staff of Wizardry', platemail: 'Platemail', robe: 'Robe of the Magi', headdress: 'Headdress', cloak: 'Cloak', vitality: 'Vitality Booster',
  point_booster: 'Point Booster', talisman: 'Talisman of Evasion', ultimate_orb: 'Ultimate Orb', reaver: 'Reaver' };
const ITEM_ALIAS = { blink: '跳刀', bkb: 'bkb 黑黄杖', bfury: 'bf 狂战', scythe: '羊刀 蓝胖 hex', euls: '欧帆 吹风 eul cyclone', force: '推推 force', glimmer: '绿杖 微光',
  heart: '龙心 心', mkb: 'mkb 金箍', dagon: '大根 达贡', mekansm: '梅肯 mek', pipe: '烟斗 pipe', scepter: 'a杖 神杖 aghs', daedalus: '大炮 crit', butterfly: '蝴蝶 bfly',
  phase: '相位', arcane: '秘法 法力鞋', tp: 'tp 回城', ward_obs: '假眼 眼', ward_sentry: '真眼', salve: '大药', assault: '强袭', vanguard: '先锋' };
const itemSearchText = D => [D.name, D.en || ITEM_EN[D.id] || '', D.id, ITEM_ALIAS[D.id] || ITEM_ALIAS[D.id.replace(/\d+$/, '')] || ''].join(' ').toLowerCase();
function shopFilter() {
  const q = shopEl.q.trim().toLowerCase(); let n = 0;
  for (const s of shopEl.items) { const show = q ? s.txt.includes(q) : s.cat === shopEl.tab; s.el.classList.toggle('hide', !show); n += show; }
  for (const b of shopEl.tabs) b.classList.toggle('on', !q && b.dataset.tab === shopEl.tab);
  $('shopEmpty').classList.toggle('hidden', n > 0);
}
function setShopTab(tab) { shopEl.tab = tab; shopEl.q = ''; $('shopSearch').value = ''; shopFilter(); }
function setShopSearch(q) { shopEl.q = q; $('shopSearch').value = q; shopFilter(); }
function buildShop() {
  const sl = $('shopList'); sl.innerHTML = ''; shopEl.items = [];
  const tb = $('shopTabs'); tb.innerHTML = ''; shopEl.tabs = [];
  for (const [id, label] of SHOP_TABS) { const b = document.createElement('div'); b.className = 'stab'; b.dataset.tab = id; b.textContent = label; b.addEventListener('mousedown', e => { e.stopPropagation(); setShopTab(id); }); tb.appendChild(b); shopEl.tabs.push(b); }
  const inp = $('shopSearch'); inp.oninput = () => { shopEl.q = inp.value; shopFilter(); };
  inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') { inp.blur(); setShopSearch(''); } };
  for (const D of shopList()) {
    const id = D.id, el = document.createElement('div'); el.className = 'sitem'; el.dataset.id = id; el.dataset.cat = itemCat(D);
    const loc = D.shop === 'secret' ? '<div class="loc secret" title="仅神秘商店出售">秘</div>' : sideSells(D) ? '<div class="loc side" title="边路商店也有出售">边</div>' : '';   // B8 shop location tag
    el.innerHTML = icoHTML(D.icon, D.color) + `<div class="nm">${D.name}</div><div class="cs">${D.cost} 金</div><div class="stk"></div>` + loc;
    el.addEventListener('mousedown', e => { e.stopPropagation(); if (e.button === 0) buyItem(id); });
    bindTip(el, () => itemTip(id, false));
    sl.appendChild(el); shopEl.items.push({ el, id, cat: itemCat(D), txt: itemSearchText(D), stk: el.querySelector('.stk'), cs: el.querySelector('.cs') });
  }
  shopFilter();
  shopEl.hint = $('shopHint'); shopEl.stash = $('stashRow'); shopEl.badge = $('stashBadge');
}
const SHOP_HINTS = {
  base: '✔ 你在基地商店范围内：物品直接放入物品栏，可出售物品。',
  side: '✔ 你在边路商店：标有「边」的物品直接放入物品栏；其他物品存入储藏处。',
  secret: '✔ 你在神秘商店：可购买标有「秘」的物品，直接放入物品栏。',
  courier: '✔ 你的信使在神秘商店：购买的「秘」物品放入信使背包（按 F3 运送）。',
  away: '✘ 不在商店：物品存入储藏处（回基地取出或按 F3 让信使运送）；「秘」物品需在神秘商店。',
};
function toggleShop() { $('shop').classList.toggle('hidden'); }
$('shopBtn').addEventListener('click', toggleShop); $('shopClose').addEventListener('click', toggleShop);
function updateShop() {
  const P = G.player; if (!P || !shopEl.hint) return;
  for (const s of shopEl.items) {
    const D = ITEM_DEFS[s.id], n = D.stock ? stockOf(P.team, s.id) : null;
    const pr = D.parts ? itemPrice(P, s.id) : D.cost; if (D.parts) setT(s.cs, pr < D.cost ? `${pr} 金（合成）` : `${D.cost} 金`);
    s.el.classList.toggle('cant', P.gold < pr || n === 0); s.el.classList.toggle('owned', !D.stack && countItem(P, s.id) > 0);
    setT(s.stk, n === null ? '' : `库存 ${n}`);
  }
  const site = shopSiteHere(P);   // entities/shopsites.js
  shopEl.hint.className = site === 'base' || site === 'side' ? 'ok' : site ? 'secret' : 'away';
  setT(shopEl.hint, SHOP_HINTS[site || 'away']);
  const row = (l, st) => st.length ? l + st.map(s => icoHTML(ITEM_DEFS[s.id].icon, ITEM_DEFS[s.id].color, 'mini') + (s.n > 1 ? `<b>×${s.n}</b>` : '')).join('') : '';
  const st = P.stash || [], html = row('储藏处：', st) + (P.courier && P.courier.bag.length ? ' ' + row('信使：', P.courier.bag) : '');
  if (shopEl.stash._h !== html) { shopEl.stash._h = html; shopEl.stash.innerHTML = html; }
  setT(shopEl.badge, st.length ? `储藏 ${st.length}` : '');
}
