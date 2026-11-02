// items/smoke.js — B12 诡计之雾 Smoke of Deceit. Consumable with team stock. Nearby allied heroes fade into invisibility
// and gain move speed; the cloud breaks when any smoked hero gets within SMOKE_BREAK of an enemy hero, or on cast / attack.
const SMOKE_R = 12, SMOKE_DUR = 35, SMOKE_BREAK = 10.5, SMOKE_MS = 0.15;
function clearSmokeTeam(team, except) {
  for (const h of G.heroes) if (h.team === team && h !== except && !h.dead) {
    const m = getMod(h, 'smoke'); if (m) { emit('smokeBreak', { unit: h.id, team }); removeModifier(h, m); }
  }
}
const SMOKE_MOD = { id: 'smoke', name: '诡计之雾', color: '#90a4ae', invis: true, props: { msPct: SMOKE_MS },
  fx(u) { if (Math.random() < 0.25) spawnP(u.x + rnd(-0.8, 0.8), rnd(0.2, 2.2), u.z + rnd(-0.8, 0.8), 0, 0.4, 0, 0.7, 0.2, '#cfd8dc'); },
  onBreak(u) { clearSmokeTeam(u.team, u); } };   // cast/attack already removes this unit; strip the rest of the cloud
function tickSmoke() {
  for (const h of G.heroes) {
    if (h.dead || !getMod(h, 'smoke')) continue;
    for (const e of G.heroes) if (e.team !== h.team && !e.dead && dst(h, e) < SMOKE_BREAK) {
      clearSmokeTeam(h.team); const m = getMod(h, 'smoke'); if (m) { emit('smokeBreak', { unit: h.id, team: h.team }); removeModifier(h, m); }
      return;
    }
  }
}
registerItem({ id: 'smoke', order: 7, name: '诡计之雾', en: 'Smoke of Deceit', icon: '雾', color: '#607d8b', cost: 50,
  consumable: true, keepInvis: true, stock: { max: 3, every: 90, start: 2 }, cat: 'consumable',
  desc: `消耗品。主动：使周围 ${SMOKE_R} 码内的友方英雄隐身并加速 ${Math.round(SMOKE_MS * 100)}%，持续最多 ${SMOKE_DUR} 秒。靠近敌方英雄 ${SMOKE_BREAK} 码、攻击或施法时整组破雾。库存 3，每 90 秒补 1。`,
  active: { target: 'none', cd: 1, onUse(c) {
    const h = c.caster; let n = 0;
    for (const a of G.heroes) if (!a.dead && a.team === h.team && dst(a, h) < SMOKE_R) {
      AB.addModifier(a, SMOKE_MOD, h, { dur: SMOKE_DUR, data: { fade: 0.1 } }); n++;
      AB.burst(a.x, 1.2, a.z, 10, ['#90a4ae', '#cfd8dc', '#ffffff'], 3, 0.5, 0.22, 2, 0);
    }
    AB.ringP(h.x, h.z, 0.6, 28, ['#78909c', '#cfd8dc'], 0.45, 0.35, 0.6, (SMOKE_R - 0.6) / 0.45);
    emit('smoke', { unit: h.id, team: h.team, n });
  } } });
