// map/jungle.js — B8 jungle layout (data only): neutral camp spots, Roshan pit, side shops, secret shops.
// Point-symmetric like the rest of the map: every Radiant spot (x, z) has a Dire twin at (−x, −z).
// Loaded before map/grid.js, which asks jungleTile() / jungleClear() while generating tiles and trees:
//   • camps / shops get a tree-free clearing, • the pit is a sunken floor (TT.PIT) inside a cliff ring with one opening.
const NEUTRAL = 2;   // team id of neutral creeps and Roshan — never used to index per-team arrays (fog, stock, score, …)
const CAMP_BOX = 3.6;   // spawn box radius: respawn only if no neutral (and no other unit) is inside at the minute mark
const SHOP_R = 6;      // side / secret shop interaction radius
const PIT = { x: -34, z: -34, r: 6.2, ring: 9.4, dx: Math.SQRT1_2, dz: Math.SQRT1_2, doorCos: 0.86 };   // opening faces the map centre
const JUNGLE = (() => {
  // [id, camp kind (entities/neutrals.js CAMP_KINDS), x, z] — Radiant side; Dire mirrors with its own kinds
  const R = [['small', 'kobold', -50, -10], ['medium', 'wolf', -30, 5], ['large', 'centaur', -10, 30], ['ancient', 'dragon', 10, 48]];
  const D = { small: 'kobold', medium: 'satyr', large: 'centaur', ancient: 'golem' };
  const camps = [];
  R.forEach(([size, kind, x, z], i) => {
    camps.push({ id: 'r' + i, size, kind, x, z, side: 0 });
    camps.push({ id: 'd' + i, size, kind: D[size], x: -x, z: -z, side: 1 });
  });
  const shops = [
    { id: 'side0', type: 'side', x: -61, z: -34, side: 0, name: '边路商店（上路）' }, { id: 'side1', type: 'side', x: 61, z: 34, side: 1, name: '边路商店（下路）' },
    { id: 'secret0', type: 'secret', x: -44, z: 22, side: 0, name: '神秘商店（天辉丛林）' }, { id: 'secret1', type: 'secret', x: 44, z: -22, side: 1, name: '神秘商店（夜魇丛林）' },
  ];
  return { camps, shops };
})();
// 0 = normal, 1 = pit floor (walkable, sunken), 2 = pit cliff ring
function jungleTile(x, z) {
  const dx = x - PIT.x, dz = z - PIT.z, d = Math.hypot(dx, dz);
  if (d < PIT.r) return 1;
  if (d < PIT.ring) return (dx * PIT.dx + dz * PIT.dz) / d > PIT.doorCos ? 1 : 2;
  return 0;
}
function jungleClear(x, z) {
  if (Math.hypot(x - PIT.x, z - PIT.z) < PIT.ring + 3) return true;
  for (const c of JUNGLE.camps) if (Math.hypot(x - c.x, z - c.z) < 5.5) return true;
  for (const s of JUNGLE.shops) if (Math.hypot(x - s.x, z - s.z) < 4.5) return true;
  return false;
}
const inPit = (x, z) => Math.hypot(x - PIT.x, z - PIT.z) < PIT.r + 0.6;
