// heroes/puck.js — 帕克 Puck (ranged intelligence). Illusory Orb (slow line orb; re-cast Q = Ethereal Jaunt to the orb),
// Waning Rift (AoE silence), Phase Shift (channelled: hidden + invulnerable), Dream Coil (tether: breaking it stuns hard).
const PUCK_PHASE = { id: 'puck_phase', name: '相位转移', color: '#ce93d8', states: ['hidden', 'invulnerable'] };
const PUCK_COIL = { id: 'puck_coil', tag: '梦境缠绕', color: '#ea80fc', debuff: true, tick: 0.05,
  onTick(u, m) {
    const d = m.data; d.fx = (d.fx || 0) - 0.05; if (d.fx <= 0) { d.fx = 0.1; AB.tetherFx(u, d.x, d.z, '#ea80fc'); }
    if (Math.hypot(u.x - d.x, u.z - d.z) <= d.breakR || isInvuln(u)) return;
    emit('coilBreak', { unit: m.src ? m.src.id : 0, target: u.id });
    AB.burst(u.x, 1.5, u.z, 36, ['#ea80fc', '#b388ff', '#ffffff'], 6, 0.6, 0.3, 3, 0);
    removeModifier(u, m); AB.damage(m.src, u, d.dmg, 'magic', 'coil_break', { big: true }); AB.stun(u, m.src, d.stun);
  } };
function puckOrbFx(o) {
  const mat = new T.MeshBasicMaterial({ color: '#b388ff' }), core = new T.Mesh(boxG, mat); core.scale.setScalar(0.9); scene.add(core);
  return { update(x, z, dt) { core.position.set(x, 1.4, z); core.rotation.x += dt * 5; core.rotation.y += dt * 7;
    for (let i = 0; i < 3; i++) spawnP(x + rnd(-0.4, 0.4), 1.4 + rnd(-0.4, 0.4), z + rnd(-0.4, 0.4), rnd(-1, 1), rnd(-1, 1), rnd(-1, 1), 0.4, 0.22, ['#ea80fc', '#80d8ff', '#ffffff'][i], 0); },
    end() { scene.remove(core); mat.dispose(); } };
}
registerHero({
  id: 'puck', order: 9, name: '帕克', title: '仙女龙', type: '远程 · 智力', color: '#8e24aa', nameColor: '#ea80fc',
  desc: '远程智力型英雄。幻象法球可随时相位跃迁到其所在位置，新月之痕沉默周围敌人，相位转移躲避一切伤害，梦境缠绕困住敌人。',
  ai: { build: ['arcane', 'euls', 'dagon', 'blink', 'scythe'] },   // B7 bot build (ai/bot/shop.js)
  stats: { primary: 'int', str: 17, strG: 2.4, agi: 22, agiG: 2.2, int: 23, intG: 3.5, dmg: 20, armor: 1, bat: 1.7, range: 11,
    atkPoint: 0.5, backswing: 0.8, speed: 6.9, proj: 24, projColor: '#ea80fc', hpRegen: 1.0, manaRegen: 1.0, radius: 0.6, height: 3.0 },
  portrait: { headY: 2.4 },
  model: () => humanoid({
    pants: '#4a148c', boots: '#311b92', skin: '#80deea', sleeve: '#ab47bc', hip: 0.22, sh: 0.55, legH: 0.95, bodyH: 0.95, legW: 0.32,
    body: [[0, 0.45, 0, 0.72, 0.95, 0.5, '#ab47bc'], [0, 0.5, 0.26, 0.42, 0.6, 0.03, '#e1bee7'], [0, 0.1, -0.45, 0.2, 0.2, 0.7, '#8e24aa'], [0, 0.0, -0.9, 0.14, 0.14, 0.4, '#ea80fc'],
      [0, 1.3, 0, 0.74, 0.7, 0.74, '#80deea'], [-0.18, 1.35, 0.38, 0.16, 0.16, 0.02, '#311b92'], [0.18, 1.35, 0.38, 0.16, 0.16, 0.02, '#311b92'],
      [-0.28, 1.78, -0.05, 0.1, 0.34, 0.1, '#ffd54f'], [0.28, 1.78, -0.05, 0.1, 0.34, 0.1, '#ffd54f']],
    bodyGlow: [[-0.75, 1.0, -0.35, 1.1, 1.2, 0.06, '#e1bee7'], [0.75, 1.0, -0.35, 1.1, 1.2, 0.06, '#e1bee7'], [-0.85, 0.35, -0.35, 0.7, 0.6, 0.06, '#80d8ff'], [0.85, 0.35, -0.35, 0.7, 0.6, 0.06, '#80d8ff']],
  }),
  abilities: [
    { id: 'orb', ai: { escape: 'orb', nuke: true }, key: 'Q', name: '幻象法球', icon: '球', color: '#ab47bc', target: 'direction', castPoint: 0.1,
      mana: [80, 100, 120, 140], cd: [11, 10, 9, 8], values: { dmg: [75, 150, 225, 300], len: 26, speed: 14, w0: 4, w1: 4 },
      text: L => `发射一个缓慢飞行的法球（${L.len} 码），对沿途敌人造成 ${L.dmg} 点魔法伤害。法球飞行期间再次按 Q：相位跃迁到法球所在位置。`,
      recast: h => !!(h._orb && h._orb.alive),
      onRecast(c) { const h = c.caster, o = h._orb; o.alive = false; AB.teleport(h, { x: o.x, z: o.z }, { colors: ['#ea80fc', '#80d8ff', '#fff'] }); emit('jaunt', { unit: h.id }); },
      onCast(c, pt) {
        const h = c.caster, dir = AB.dir(h, pt), o = { sx: h.x, sz: h.z, x: h.x, z: h.z, trav: 0, len: c.v('len'), alive: true, fx: puckOrbFx(), vis: 0 }, hit = new Set(); h._orb = o;
        effects.push({ update(dt) {
          const prev = o.trav; o.trav = Math.min(o.len, o.trav + c.v('speed') * dt); o.x = o.sx + dir.x * o.trav; o.z = o.sz + dir.z * o.trav;
          for (const u of units) {   // line hit test along the travelled segment (width w1)
            if (u.dead || u.team === h.team || u.isBuilding || hit.has(u)) continue;
            const rx = u.x - o.sx, rz = u.z - o.sz, p = rx * dir.x + rz * dir.z, lat = Math.abs(rx * dir.z - rz * dir.x);
            if (p >= prev - 1.5 && p <= o.trav + 0.5 && lat <= c.v('w1') / 2 + u.radius) { hit.add(u); AB.damage(h, u, c.v('dmg'), 'magic', 'orb'); }
          }
          o.fx.update(o.x, o.z, dt); if ((o.vis -= dt) <= 0) { o.vis = 0.2; addVisionAt(h.team, o.x, o.z, 7, 0.3); }
          if (o.trav >= o.len || !o.alive) { o.alive = false; o.fx.end(); return true; } return false;
        } });
      } },
    { id: 'rift', ai: { disable: true }, key: 'W', name: '新月之痕', icon: '痕', color: '#7b1fa2', target: 'none', castPoint: 0.1,
      mana: [100, 110, 120, 130], cd: 16, values: { radius: 7, dmg: [60, 120, 180, 240], silence: [2, 2.5, 3, 3.5] },
      text: L => `释放仙尘，对周围 ${L.radius} 码内的敌人造成 ${L.dmg} 点魔法伤害并沉默 ${L.silence} 秒。`,
      onCast(c) { const h = c.caster;
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) { AB.damage(h, u, c.v('dmg'), 'magic', 'rift'); AB.silence(u, h, c.v('silence')); }
        AB.ringP(h.x, h.z, 1, 48, ['#ea80fc', '#80d8ff', '#fff59d'], 0.6, 0.35, 0.6, 11); AB.burst(h.x, 1.5, h.z, 30, ['#ea80fc', '#e1bee7'], 6, 0.5, 0.3, 2, 0); } },
    { id: 'phase', ai: { dodge: true }, keepInvis: true, key: 'E', name: '相位转移', icon: '相', color: '#ce93d8', target: 'none', castPoint: 0,
      channel: [0.75, 1.5, 2.25, 3.25], mana: 0, cd: 6,
      text: L => `持续施法 0.75/1.5/2.25/3.25 秒：遁入另一个维度，期间无法被看见、选中或伤害（可躲避弹道）。任何指令都会提前结束。`,
      onChannelStart(c, t, ch) { const h = c.caster; AB.addModifier(h, PUCK_PHASE, h, { dur: ch.dur + 0.1 }); AB.burst(h.x, 1.5, h.z, 20, ['#ce93d8', '#ffffff'], 4, 0.5, 0.3, 1, 0); },
      onChannelTick(c) { const h = c.caster; if (Math.random() < 0.5) spawnP(h.x + rnd(-0.8, 0.8), rnd(0.3, 2.5), h.z + rnd(-0.8, 0.8), 0, 0.6, 0, 0.4, 0.2, '#e1bee7', 0); },
      onChannelEnd(c) { removeModById(c.caster, 'puck_phase'); } },
    { id: 'coil', ai: { aoe: 2 }, scepter: { desc: '挣脱伤害 400/550/700，挣脱眩晕 2/2.75/3.5 秒。', values: { breakDmg: [400, 550, 700], breakStun: [2, 2.75, 3.5] } }, key: 'R', name: '梦境缠绕', icon: '缠', color: '#6a1b9a', ult: true, target: 'point', range: 12, castPoint: 0.1,
      mana: [100, 150, 200], cd: [70, 65, 60], values: { radius: 6, dmg: [100, 150, 200], stun: 0.5, dur: 6, breakR: 9, breakDmg: [300, 400, 500], breakStun: [1.5, 2.25, 3] },
      text: L => `终极技能：在目标点制造梦境线圈，缠住半径 ${L.radius} 码内的敌方英雄，造成 ${L.dmg} 点魔法伤害并眩晕 ${L.stun} 秒，持续 ${L.dur} 秒。被缠住者远离线圈超过 ${L.breakR} 码时挣断：受到 ${L.breakDmg} 点魔法伤害并眩晕 ${L.breakStun} 秒。`,
      onCast(c, pt) {
        const h = c.caster, hit = AB.enemiesIn(h, pt.x, pt.z, c.v('radius')).filter(u => u.isHero);
        for (const u of hit) { AB.damage(h, u, c.v('dmg'), 'magic', 'coil'); AB.stun(u, h, c.v('stun'));
          AB.addModifier(u, PUCK_COIL, h, { dur: c.v('dur'), data: { x: pt.x, z: pt.z, breakR: c.v('breakR'), dmg: c.v('breakDmg'), stun: c.v('breakStun') } }); }
        emit('coil', { unit: h.id, n: hit.length });
        let t = 0; const dur = c.v('dur');
        effects.push({ update(dt) { t += dt; for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.57; spawnP(pt.x + Math.cos(a) * 1.2, 0.6 + (i % 2) * 1.2 + Math.sin(t * 3) * 0.3, pt.z + Math.sin(a) * 1.2, 0, 0.2, 0, 0.35, 0.3, i % 2 ? '#ea80fc' : '#80d8ff', 0); } return t >= dur; } });
        AB.ringP(pt.x, pt.z, c.v('radius'), 50, ['#ea80fc', '#b388ff'], 0.7, 0.35, 0.4);
      } },
  ],
});
