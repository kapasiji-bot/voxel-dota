// items/force.js — 推推棒 Force Staff: pushes any unit 6 units in the direction it faces over 0.4 s (rooted meanwhile; channels
// keep going). Allies (self included: press twice) to escape / save, enemies to reposition them. Not on magic-immune enemies.
const FORCE_DIST = 6;
const FORCE_MOD = { id: 'force_push', name: '推推棒', color: '#4fc3f7', states: ['rooted'], tick: 0.05,
  onTick(u, m) {
    if (u.isBuilding) return; u.path = null;
    const st = Math.min(0.75, m.data.left); if (st <= 0) return; m.data.left -= st;
    if (!displaceTo(u, u.x + m.data.dx * st, u.z + m.data.dz * st)) m.t = 0;   // stops at cliffs / trees / walls
    if (u.model) { u.model.position.x = u.x; u.model.position.z = u.z; }
    spawnP(u.x + rnd(-0.3, 0.3), 0.4, u.z + rnd(-0.3, 0.3), -m.data.dx * 3, 0.5, -m.data.dz * 3, 0.45, 0.25, Math.random() < 0.5 ? '#81d4fa' : '#ffffff');
  } };
registerItem({ id: 'force', order: 42, name: '推推棒', en: 'Force Staff', icon: '推', color: '#0288d1', cost: 2200, parts: ['staff', 'ring'],
  props: { int: 10, hp: 175 },
  desc: '魔力法杖 + 守护指环 + 1025。+10 智力，+175 生命值。主动·推推：将 11 码内的任意单位（含自己，连按两次）沿其面朝方向推出 6 码。消耗 50 魔法，冷却 19 秒。',
  active: { target: 'unit', targetTeam: 'any', range: 11, cd: 19, mana: 50, onUse(c, t) {
    if (t.isBuilding) return false;
    const x0 = t.x, z0 = t.z, dx = Math.sin(t.facing || 0), dz = Math.cos(t.facing || 0);
    if (t.atk) cancelAttack(t, 'force');
    AB.addModifier(t, FORCE_MOD, c.caster, { dur: 0.4, data: { dx, dz, left: FORCE_DIST } });
    AB.burst(t.x, 1, t.z, 16, ['#4fc3f7', '#e1f5fe', '#ffffff'], 4, 0.4, 0.25, 2, 0);
    emit('forceStaff', { unit: c.caster.id, target: t.id, ally: t.team === c.caster.team, x0, z0 });
  } } });
