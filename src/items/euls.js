// items/euls.js — 风之杖（欧帆强制）Eul's Scepter of Divinity: cyclone a unit for 2.5 s — airborne, invulnerable, cannot act
// (interrupts channels such as Black Hole / Death Ward). Self / ally: dispels debuffs (escape, remove silence/DoT).
// Enemy: dispels its timed buffs and deals 50 magic damage on landing. Not on magic-immune enemies.
const EUL_FX = {
  fx(u, m, dt) {
    if (!u.model) return; const inner = u.model.userData.inner, k = clamp((2.5 - m.t) / 0.3, 0, 1) * clamp(m.t / 0.25, 0, 1);
    inner.position.y = k * (2.6 + Math.sin(G.time * 5) * 0.25); inner.rotation.y += dt * 14;
    for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2, r = rnd(0.6, 1.4); spawnP(u.x + Math.cos(a) * r, rnd(0, 3.6), u.z + Math.sin(a) * r, -Math.sin(a) * 6, 1.6, Math.cos(a) * 6, 0.35, 0.22, Math.random() < 0.5 ? '#e0f7fa' : '#80deea'); }
  },
  onApply(u) { cancelAttack(u, 'cyclone'); cancelCasting(u); interruptChannel(u, 'stun'); u.path = null; },
  onRemove(u) { if (u.model) { u.model.userData.inner.position.y = 0; u.model.userData.inner.rotation.y = 0; } },
};
const EUL_SELF = Object.assign({ id: 'cyclone', tag: '旋风', color: '#80deea', states: ['stunned', 'invulnerable', 'cyclone'] }, EUL_FX);
const EUL_FOE = Object.assign({ id: 'cyclone', tag: '旋风', color: '#80deea', debuff: true, states: ['stunned', 'invulnerable', 'cyclone'] }, EUL_FX,
  { onRemove(u, m) { EUL_FX.onRemove(u); if (!u.dead) delay(0, () => { if (u.dead) return; dealDamage(m.src, u, 50, 'magic', { ability: 'euls' }); AB.burst(u.x, 0.5, u.z, 14, ['#b2ebf2', '#ffffff'], 4, 0.4, 0.25, 1, 0); }); } });
// basic dispel of an enemy's timed buffs (passive / permanent modifiers stay)
function dispelBuffs(u) { for (const m of u.mods.slice()) if (!m.def.debuff && isFinite(m.t) && !m.def.noDispel) removeModifier(u, m); }
registerItem({ id: 'euls', order: 43, name: '风之杖', en: "Eul's Scepter of Divinity", icon: '风', color: '#00acc1', cost: 2725, parts: ['staff', 'headdress'],
  props: { int: 10, hpRegen: 2.5, manaRegen: 2.5, ms: 0.7 },
  desc: '魔力法杖 + 头巾 + 1300。+10 智力，+2.5 生命/魔法恢复，+0.7 移动速度。主动·旋风（欧帆强制）：使 12 码内一个单位（含自己，连按两次）被旋风卷入空中 2.5 秒——无敌、无法行动，打断持续施法。对自己/友方：驱散负面效果；对敌人：驱散增益，落地时受到 50 点魔法伤害。消耗 75 魔法，冷却 23 秒。',
  active: { target: 'unit', targetTeam: 'any', range: 12, cd: 23, mana: 75, onUse(c, t) {
    const h = c.caster, foe = t.team !== h.team;
    if (foe) dispelBuffs(t); else purgeDebuffs(t);
    for (const m of t.mods.slice()) if (m.def.id === 'cyclone') removeModifier(t, m);
    AB.addModifier(t, foe ? EUL_FOE : EUL_SELF, h, { dur: 2.5 });
    AB.burst(t.x, 1, t.z, 24, ['#e0f7fa', '#80deea', '#ffffff'], 5, 0.5, 0.25, 3, 0);
    emit('cyclone', { unit: h.id, target: t.id, foe });
  } } });
