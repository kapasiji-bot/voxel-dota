// items/satanic.js — B12 撒旦之邪力 Satanic: strength + passive lifesteal; active Unholy Rage massively boosts lifesteal briefly.
const SAT_RAGE = { id: 'satanic', name: '邪能', color: '#b71c1c', props: {},
  fx(u) { if (Math.random() < 0.35) spawnP(u.x + rnd(-0.6, 0.6), rnd(0.5, 2.4), u.z + rnd(-0.6, 0.6), 0, 1, 0, 0.5, 0.15, '#ef5350'); } };
function satLifesteal(c, dealt, pct) {
  if (dealt <= 0 || !pct) return; const h = c.caster; const heal = dealt * pct;
  h.hp = Math.min(h.maxHp, h.hp + heal); if (heal > 8) AB.float(h, '+' + Math.round(heal), '#ef5350', 13, 0.8);
}
registerItem({ id: 'satanic', order: 53, name: '撒旦之邪力', en: 'Satanic', icon: '邪', color: '#b71c1c', cost: 5050,
  parts: ['reaver', 'claymore'], unique: true, props: { str: 25, dmg: 25 },
  desc: '掠夺者之斧 + 大剑 + 900。+25 力量，+25 攻击力。被动·吸血：攻击吸血 25%。主动·邪能：5 秒内吸血提升至 175%。冷却 30 秒。',
  onAttackLand(c, t, dealt) {
    if (t.isBuilding || t.isWard) return;
    const rage = !!getMod(c.caster, 'satanic');
    satLifesteal(c, dealt, rage ? 1.75 : 0.25);
  },
  active: { target: 'none', cd: 30, onUse(c) {
    AB.addModifier(c.caster, SAT_RAGE, c.caster, { dur: 5 });
    AB.burst(c.caster.x, 1.5, c.caster.z, 18, ['#ef5350', '#b71c1c', '#ffffff'], 4, 0.6, 0.25, 3, 0);
    emit('satanic', { unit: c.caster.id });
  } } });
