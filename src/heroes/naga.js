// heroes/naga.js — 娜迦海妖 Naga Siren (melee agility). Mirror Image (illusions: reduced damage dealt, extra damage taken),
// Ensnare (net root), Rip Tide (passive AoE armor reduction on attacks — illusions proc it too), Song of the Siren (huge AoE sleep:
// enemies asleep + invulnerable; recast ends it early).
const NAGA_RIP = { id: 'naga_rip', tag: '激流', color: '#4dd0e1', debuff: true };
const NAGA_SONG = { id: 'naga_song', tag: '海妖之歌', color: '#80deea', debuff: true, states: ['stunned', 'sleeping', 'invulnerable'], wake: true, fx: zzzFx,
  onApply(u) { cancelAttack(u, 'stun'); cancelCasting(u); interruptChannel(u, 'stun'); } };
const NAGA_HIDE = { id: 'naga_hide', states: ['hidden', 'invulnerable'] };
registerHero({
  id: 'naga', order: 12, name: '娜迦海妖', title: '海妖', type: '近战 · 敏捷', color: '#00897b', nameColor: '#64ffda',
  desc: '近战敏捷型英雄。镜像召唤出与本体一模一样的幻象，捕网定身敌人，激流降低周围敌人护甲，海妖之歌让大范围敌人陷入沉睡。',
  ai: { role: 'carry', skills: [0, 2, 0, 1, 0, 2, 0, 2, 2, 1, 1, 1], build: ['phase', 'bfury', 'butterfly', 'heart'] },
  stats: { primary: 'agi', str: 21, strG: 2.8, agi: 21, agiG: 3.2, int: 18, intG: 2, dmg: 23, armor: 2, bat: 1.7, range: 2.6,
    atkPoint: 0.5, backswing: 0.5, speed: 6.9, proj: 0, hpRegen: 1.5, manaRegen: 0.8, radius: 0.62, height: 3.2 },
  portrait: { headY: 2.55 },
  model: () => humanoid({ pants: '#00695c', boots: '#004d40', skin: '#4db6ac', sleeve: '#26a69a', hip: 0.2, sh: 0.56, legH: 1.0, bodyH: 1.0, legW: 0.42,
    body: [[0, 0.45, 0, 0.74, 1.0, 0.48, '#26a69a'], [0, 0.72, 0.26, 0.6, 0.3, 0.04, '#ffd54f'], [0, -0.1, 0, 0.9, 0.4, 0.6, '#00796b'], [0, -0.3, -0.6, 0.5, 0.3, 0.9, '#00897b'], [0, -0.6, -1.1, 0.7, 0.12, 0.5, '#4db6ac'],
      [0, 1.35, 0, 0.66, 0.66, 0.66, '#80cbc4'], [-0.15, 1.42, 0.34, 0.12, 0.08, 0.02, '#004d40'], [0.15, 1.42, 0.34, 0.12, 0.08, 0.02, '#004d40'],
      [0, 1.78, -0.1, 0.8, 0.3, 0.8, '#d84315'], [0, 1.25, -0.4, 0.75, 1.0, 0.2, '#e64a19'], [-0.42, 1.55, 0, 0.12, 0.4, 0.3, '#ffd54f'], [0.42, 1.55, 0, 0.12, 0.4, 0.3, '#ffd54f']],
    armR: [[0, -0.4, 0, 0.3, 0.8, 0.34, '#4db6ac'], [0, -0.8, 0, 0.3, 0.2, 0.34, '#80cbc4'], [0, -0.85, 0.65, 0.1, 0.16, 1.1, '#e0f7fa']],
    armL: [[0, -0.4, 0, 0.3, 0.8, 0.34, '#4db6ac'], [0, -0.8, 0, 0.3, 0.2, 0.34, '#80cbc4'], [0, -0.85, 0.65, 0.1, 0.16, 1.1, '#e0f7fa']] }),
  abilities: [
    { id: 'mirror', key: 'Q', name: '镜像', icon: '镜', color: '#26c6da', target: 'none', castPoint: 0.25,
      mana: [70, 80, 90, 100], cd: [40, 36, 32, 28], values: { n: [2, 2, 3, 3], out: [0.25, 0.3, 0.35, 0.4], inc: 3.5, dur: 26 }, fmt: { out: v => Math.round(v * 100) + '%', inc: v => Math.round(v * 100) + '%' },
      text: L => `短暂消失后制造 ${L.n} 个幻象，持续 ${L.dur} 秒。幻象造成 ${L.out} 伤害、承受 ${L.inc} 伤害，敌人无法分辨幻象与本体；娜迦会与幻象互换位置。`,
      onCast(c) {
        const h = c.caster; AB.addModifier(h, NAGA_HIDE, h, { dur: 0.3 }); AB.burst(h.x, 1.5, h.z, 30, ['#80deea', '#e0f7fa', '#26c6da'], 5, 0.6, 0.3, 2, 0);
        for (const u of illusionsOf(h)) AB.kill(u, null);
        AB.delay(0.3, () => { if (h.dead) return; const n = c.v('n'), x0 = h.x, z0 = h.z, a0 = Math.random() * 6.28, slots = [];
          for (let i = 0; i <= n; i++) { const a = a0 + i / (n + 1) * 6.283; slots.push({ x: x0 + Math.cos(a) * 1.8, z: z0 + Math.sin(a) * 1.8 }); }
          const me = slots.splice((Math.random() * slots.length) | 0, 1)[0]; AB.teleport(h, me, { noFx: true, stop: false });
          for (const s of slots) { const u = AB.illusion(h, { x: s.x, z: s.z, out: c.v('out'), inc: c.v('inc'), dur: c.v('dur') }); if (h.order.type === 'attack') issueOrder(u, { type: 'attack', target: h.order.target }); }
          emit('mirrorImage', { unit: h.id, n }); });
      } },
    { id: 'ensnare', ai: { disable: true }, key: 'W', name: '捕网', icon: '网', color: '#00838f', target: 'unit', range: 9, castPoint: 0.3,
      mana: [90, 100, 110, 120], cd: [14, 13, 12, 11], values: { dur: [2, 2.5, 3, 3.5] },
      text: L => `向目标敌人投出捕网，将其定身 ${L.dur} 秒（无法移动，但可以攻击和施法）。`,
      onCast(c, t) { AB.projectile({ src: c.caster, target: t, speed: 26, color: '#80deea', size: 0.8, trail: '#e0f7fa', onHit(u) { AB.root(u, c.caster, c.v('dur')); emit('ensnare', { unit: c.caster.id, target: u.id }); } }); } },
    { id: 'riptide', key: 'E', name: '激流', icon: '流', color: '#0097a7', passive: true, values: { chance: 0.17, dmg: [70, 100, 130, 160], armor: [2, 4, 6, 8], radius: 4.5, dur: 4 },
      fmt: { chance: v => Math.round(v * 100) + '%' },
      text: L => `被动：娜迦（及其幻象）每次攻击有 ${L.chance} 几率掀起激流，对周围 ${L.radius} 码敌人造成 ${L.dmg} 点魔法伤害并降低 ${L.armor} 点护甲，持续 ${L.dur} 秒。`,
      onAttackLand(c, t) {
        if (t.isBuilding || Math.random() > c.v('chance')) return;
        const u0 = c.caster, src = u0.owner || u0;   // illusions proc it with the hero's full damage
        AB.ringP(u0.x, u0.z, c.v('radius'), 30, ['#4dd0e1', '#e0f7fa', '#0097a7'], 0.5, 0.3, 0.5, 4);
        for (const e of AB.enemiesIn(src, u0.x, u0.z, c.v('radius'))) { AB.damage(src, e, c.v('dmg'), 'magic', 'riptide', { silent: true }); AB.addModifier(e, NAGA_RIP, src, { dur: c.v('dur'), props: { armor: -c.v('armor') } }); }
        emit('ripTide', { unit: u0.id, illusion: !!u0.isIllusion });
      } },
    { id: 'song', ai: { escape: 'aoe' }, scepter: { desc: '持续时间提升至 7/8/9 秒。', values: { dur: [7, 8, 9] } }, key: 'R', name: '海妖之歌', icon: '歌', color: '#00acc1', ult: true, target: 'none', castPoint: 0.6,
      mana: [150, 175, 200], cd: [140, 120, 100], values: { radius: 18, dur: [6, 7, 8] },
      text: L => `终极技能：唱起海妖之歌，半径 ${L.radius} 码内的敌人陷入沉睡（无法行动，也无法被攻击），持续 ${L.dur} 秒。再次施放可提前结束。`,
      recast: h => !!(h._song && G.time < h._song.end),
      onRecast(c) { naga_endSong(c.caster); },
      onCast(c) {
        const h = c.caster, s = h._song = { end: G.time + c.v('dur'), list: [] };
        for (const u of AB.enemiesIn(h, h.x, h.z, c.v('radius'))) { if (u.isBuilding) continue; const m = AB.sleep(u, h, c.v('dur'), { def: NAGA_SONG, noWake: true }); if (m) s.list.push(u); }
        AB.ringP(h.x, h.z, c.v('radius'), 80, ['#80deea', '#e0f7fa', '#b388ff'], 0.8, 0.4, 0.5, 6);
        emit('song', { unit: h.id, n: s.list.length });
        AB.groundArea({ caster: h, x: h.x, z: h.z, radius: c.v('radius'), dur: c.v('dur'), tick: 0.5, fx(a) { if (h._song !== s) { a.t = 1e9; return; } if (Math.random() < 0.4) { const r = rnd(1, a.r), ang = Math.random() * 6.28; spawnP(a.x + Math.cos(ang) * r, rnd(1, 3), a.z + Math.sin(ang) * r, 0, 0.6, 0, 1.2, 0.3, '#b2ebf2'); } } });
      } },
  ],
});
function naga_endSong(h) { const s = h._song; if (!s) return; h._song = null; for (const u of s.list) removeModById(u, 'naga_song'); emit('songEnd', { unit: h.id }); }
