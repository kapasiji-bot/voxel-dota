// heroes/riki.js — 力丸 Riki (melee agility). Smoke Screen (silence + miss AoE), Blink Strike, Cloak and Dagger
// (permanent invisibility, broken briefly by attacking + backstab bonus from behind), Tricks of the Trade (hidden, invulnerable AoE attacks).
const RIKI_SMOKE = { id: 'riki_smoke', tag: '烟幕', color: '#9575cd', debuff: true };
const RIKI_CLOAK = { id: 'riki_cloak', name: '永久隐身', color: '#5e35b1', invis: true, breakOn: 'pause', fadeIn: 1,
  refade: (u, m) => lvVal(m.data.ab.def, 'fade', m.data.ab.lvl) };
const RIKI_TRICKS = { id: 'riki_tricks', name: '刀光谍影', color: '#7e57c2', states: ['hidden', 'invulnerable'] };
registerHero({
  id: 'riki', order: 7, name: '力丸', title: '隐形刺客', type: '近战 · 敏捷', color: '#4527a0', nameColor: '#b39ddb',
  desc: '近战敏捷型刺客。永久隐身潜行，从背后出手造成背刺伤害；烟幕让敌人沉默且频频落空，刀光谍影中无法被选中。',
  ai: { build: ['phase', 'daedalus', 'butterfly', 'mkb'], skills: [2, 1, 2, 0, 2, 1, 2, 1, 1, 0, 0, 0] },
  stats: { primary: 'agi', str: 18, strG: 2.4, agi: 30, agiG: 2.9, int: 14, intG: 1.3, dmg: 18, armor: 0, bat: 1.6, range: 2.6,
    atkPoint: 0.3, backswing: 0.3, speed: 7.5, proj: 0, hpRegen: 1.5, manaRegen: 0.6, radius: 0.6, height: 3.0 },
  portrait: { headY: 2.45 },
  model: () => humanoid({
    pants: '#311b92', boots: '#1a1a1a', skin: '#9575cd', sleeve: '#4527a0', hip: 0.24, sh: 0.56, legH: 1.0, bodyH: 0.95, legW: 0.34,
    body: [[0, 0.45, 0, 0.78, 0.95, 0.5, '#4527a0'], [0, 0.1, 0, 0.84, 0.2, 0.56, '#212121'], [0, 0.95, 0.05, 0.9, 0.22, 0.6, '#7e57c2'],
      [0, 1.35, 0, 0.72, 0.7, 0.72, '#9575cd'], [0, 1.25, 0.37, 0.72, 0.32, 0.06, '#311b92'], [-0.2, 1.45, 0.37, 0.16, 0.08, 0.02, '#ffeb3b'], [0.2, 1.45, 0.37, 0.16, 0.08, 0.02, '#ffeb3b'],
      [-0.32, 1.82, -0.05, 0.14, 0.38, 0.14, '#d7ccc8'], [0.32, 1.82, -0.05, 0.14, 0.38, 0.14, '#d7ccc8'], [0, 0.9, -0.4, 0.5, 0.6, 0.15, '#311b92']],
    armR: [[0, -0.4, 0, 0.32, 0.8, 0.36, '#7e57c2'], [0, -0.8, 0, 0.34, 0.2, 0.38, '#9575cd'], [0, -0.85, 0.55, 0.1, 0.12, 0.9, '#cfd8dc']],
    armL: [[0, -0.4, 0, 0.32, 0.8, 0.36, '#7e57c2'], [0, -0.8, 0, 0.34, 0.2, 0.38, '#9575cd'], [0, -0.85, 0.55, 0.1, 0.12, 0.9, '#cfd8dc']],
  }),
  abilities: [
    { id: 'smoke', ai: { disable: true }, keepInvis: true, key: 'Q', name: '烟幕', icon: '烟', color: '#7e57c2', target: 'point', range: 11, castPoint: 0.2,
      mana: 75, cd: [20, 17, 14, 11], values: { radius: 5.5, dur: [4, 4.5, 5, 5.5], miss: [0.25, 0.35, 0.45, 0.55], slow: 0.15 }, fmt: { miss: v => Math.round(v * 100) + '%', slow: v => Math.round(v * 100) + '%' },
      text: L => `在目标区域释放烟幕（半径 ${L.radius} 码，持续 ${L.dur} 秒）：其中的敌人被沉默、攻击有 ${L.miss} 几率落空，并减速 ${L.slow}。`,
      onCast(c, pt) {
        const h = c.caster;
        AB.groundArea({ caster: h, x: pt.x, z: pt.z, radius: c.v('radius'), dur: c.v('dur'), tick: 0.2,
          onTick(list) { for (const u of list) { if (u.isBuilding) continue; AB.silence(u, h, 0.35); AB.addModifier(u, RIKI_SMOKE, h, { dur: 0.35, props: { miss: c.v('miss'), msPct: -c.v('slow') } }); } },
          fx(a) { for (let i = 0; i < 5; i++) { const r = Math.sqrt(Math.random()) * a.r, ang = Math.random() * 6.283;
            spawnP(a.x + Math.cos(ang) * r, rnd(0.2, 2.6), a.z + Math.sin(ang) * r, rnd(-0.4, 0.4), rnd(0.1, 0.5), rnd(-0.4, 0.4), rnd(0.9, 1.5), rnd(0.8, 1.5), ['#9e9e9e', '#7e57c2', '#b0bec5', '#5e35b1'][i % 4], 0); } } });
        AB.burst(pt.x, 1, pt.z, 30, ['#9e9e9e', '#7e57c2'], 6, 0.6, 0.6, 1, 0);
      } },
    { id: 'bstrike', key: 'W', name: '闪烁突袭', icon: '袭', color: '#5e35b1', target: 'unit', range: [12, 13, 14, 15], castPoint: 0.1,
      mana: 50, cd: [12, 10, 8, 6], values: { dmg: [50, 70, 90, 110] },
      text: L => `瞬间闪烁到目标敌人身后，造成 ${L.dmg} 点魔法伤害并立即开始攻击（可触发背刺）。`,
      onCast(c, t) {
        const h = c.caster; AB.teleport(h, AB.behindPoint(t, 1.2), { colors: ['#7e57c2', '#b39ddb', '#212121'] });
        h.facing = Math.atan2(t.x - h.x, t.z - h.z); AB.damage(h, t, c.v('dmg'), 'magic', 'bstrike');
        if (!t.dead) issueOrder(h, { type: 'attack', target: t });
      } },
    { id: 'cloak', key: 'E', name: '背刺', icon: '刺', color: '#311b92', passive: true, passiveMod: RIKI_CLOAK,
      values: { back: [0.6, 0.9, 1.2, 1.5], fade: [4, 3.5, 3, 2.5] },
      text: L => `被动：永久隐身。攻击会使你显形 ${L.fade} 秒。从背后攻击时额外造成 ${L.back} × 敏捷 的物理伤害（背刺）。`,
      modifyAttack(c, t, info) {
        const h = c.caster; if (t.isBuilding || !(h._tricks || AB.isBehind(h, t))) return;
        const bonus = h.agi * c.v('back'); info.dmg += bonus; info.backstab = bonus;
        emit('backstab', { unit: h.id, target: t.id, bonus: Math.round(bonus) });
        for (let i = 0; i < 6; i++) spawnP(t.x + rnd(-0.3, 0.3), t.height * 0.6, t.z + rnd(-0.3, 0.3), rnd(-3, 3), rnd(1, 4), rnd(-3, 3), 0.4, 0.2, '#e53935', -10);
      } },
    { id: 'tricks', ai: { aoe: 1 }, keepInvis: true, scepter: { desc: '攻击间隔 0.4/0.35/0.3 秒，范围提升至 8 码。', values: { interval: [0.4, 0.35, 0.3], radius: 8 } }, key: 'R', name: '刀光谍影', icon: '影', color: '#4a148c', ult: true, target: 'point', range: 10, castPoint: 0.2,
      channel: [3, 3.5, 4], mana: [75, 100, 125], cd: [70, 60, 50], values: { radius: 6.5, interval: [0.5, 0.45, 0.4] },
      text: L => `终极技能：闪现到目标区域，持续施法 3/3.5/4 秒，期间无法被选中且无敌，每 ${L.interval} 秒随机攻击半径 ${L.radius} 码内的一个敌人（总是背刺）。`,
      onCast(c, pt) { AB.teleport(c.caster, pt, { maxR: c.v('range'), stop: false, colors: ['#4a148c', '#7e57c2', '#fff'] }); },
      onChannelStart(c, t, ch) { const h = c.caster; h._tricks = true; ch.data.next = 0.1; AB.addModifier(h, RIKI_TRICKS, h, { dur: ch.dur + 0.2 }); },
      onChannelTick(c, t, dt, ch) {
        const h = c.caster; ch.data.next -= dt;
        for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, r = rnd(0.5, c.v('radius')); spawnP(h.x + Math.cos(a) * r, rnd(0.5, 2), h.z + Math.sin(a) * r, -Math.sin(a) * 9, 0, Math.cos(a) * 9, 0.25, 0.22, i ? '#b39ddb' : '#e0e0e0', 0); }
        if (ch.data.next > 0) return;
        ch.data.next += c.v('interval');
        const list = AB.enemiesIn(h, h.x, h.z, c.v('radius')).filter(u => canSee(h.team, u) && !isInvuln(u));
        const heroes = list.filter(u => u.isHero), pool = heroes.length ? heroes : list; if (!pool.length) return;
        const u = pool[(Math.random() * pool.length) | 0];
        AB.beam(h.x, 1.4, h.z, u.x, 1.2, u.z, '#b39ddb', 0.25, 0.15); emit('tricksHit', { unit: h.id, target: u.id });
        attackLand(h, u, 0);
      },
      onChannelEnd(c) { const h = c.caster; h._tricks = false; removeModById(h, 'riki_tricks'); } },
  ],
});
