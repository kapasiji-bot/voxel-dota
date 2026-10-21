// render/jungle.js — B8 static jungle props: side shop stalls, secret shop tents (glowing orb + rune ring), Roshan pit
// decoration (bones, torches), small stone rings marking neutral camp spawn boxes. buildJungleDecor() once at boot (main.js).
function shopProp(s) {
  const sec = s.type === 'secret', wood = '#6d4c41', roof = sec ? '#4a148c' : s.side === RAD ? '#2e7d32' : '#8e2424';
  const b = sec
    ? [[0, 0.15, 0, 4.2, 0.3, 4.2, '#37474f'], [0, 1.4, 0, 3.0, 2.2, 3.0, '#311b92'], [0, 2.9, 0, 3.6, 0.6, 3.6, roof], [0, 3.5, 0, 2.4, 0.6, 2.4, roof], [0, 4.0, 0, 1.2, 0.5, 1.2, roof],
       [0, 1.0, 1.52, 1.0, 1.6, 0.06, '#120a2a'], [-1.9, 0.9, 1.9, 0.3, 1.8, 0.3, wood], [1.9, 0.9, 1.9, 0.3, 1.8, 0.3, wood], [-1.9, 1.9, 1.9, 0.5, 0.3, 0.5, '#7e57c2'], [1.9, 1.9, 1.9, 0.5, 0.3, 0.5, '#7e57c2']]
    : [[0, 0.15, 0, 4.0, 0.3, 3.0, '#795548'], [-1.7, 1.3, -1.2, 0.3, 2.4, 0.3, wood], [1.7, 1.3, -1.2, 0.3, 2.4, 0.3, wood], [-1.7, 1.3, 1.2, 0.3, 2.4, 0.3, wood], [1.7, 1.3, 1.2, 0.3, 2.4, 0.3, wood],
       [0, 2.6, 0, 4.4, 0.35, 3.4, roof], [0, 2.95, 0, 3.2, 0.35, 2.4, roof], [0, 0.8, 0.9, 3.4, 0.9, 0.9, '#8d6e63'], [-0.9, 1.4, 0.9, 0.5, 0.35, 0.5, '#ffd54f'], [0.3, 1.4, 0.9, 0.4, 0.5, 0.4, '#4fc3f7'], [1.0, 1.35, 0.9, 0.5, 0.25, 0.5, '#ef5350']];
  const g = new T.Group(); g.add(new T.Mesh(voxGeo(b), vmat));
  if (sec) { const orb = new T.Mesh(voxGeo([[0, 5.0, 0, 0.7, 0.7, 0.7, '#e040fb'], [-1.9, 2.25, 1.9, 0.25, 0.25, 0.25, '#ea80fc'], [1.9, 2.25, 1.9, 0.25, 0.25, 0.25, '#ea80fc']]), vglow); g.add(orb); g.userData.orb = orb; }
  else g.add(new T.Mesh(voxGeo([[0, 3.3, 0, 0.5, 0.3, 0.5, '#ffd54f']]), vglow));
  g.position.set(s.x, heightAt(s.x, s.z), s.z); g.rotation.y = Math.atan2(-s.x, -s.z); world.add(g);
  return g;
}
function pitProp() {
  const b = [], r = n => hash2(n * 13 + 1, n * 7 + 3);
  for (let i = 0; i < 9; i++) { const a = r(i) * 6.28, d = 2 + r(i + 20) * 3; b.push([Math.cos(a) * d, 0.08, Math.sin(a) * d, 0.7 + r(i + 40) * 0.6, 0.16, 0.18, '#efebe9']); }
  b.push([-2.5, 0.3, -3.2, 0.6, 0.6, 0.6, '#d7ccc8'], [-2.5, 0.75, -3.2, 0.4, 0.3, 0.4, '#efebe9']);   // skull pile
  const g = new T.Group(); g.add(new T.Mesh(voxGeo(b), vmat));
  const tor = []; for (const s of [-1, 1]) { const a = Math.atan2(PIT.dz, PIT.dx) + s * 0.55, x = Math.cos(a) * (PIT.r + 1.6), z = Math.sin(a) * (PIT.r + 1.6); tor.push([x, 1.2, z, 0.3, 2.4, 0.3, '#5d4037']); }
  g.add(new T.Mesh(voxGeo(tor), vmat));
  const fl = []; for (const s of [-1, 1]) { const a = Math.atan2(PIT.dz, PIT.dx) + s * 0.55; fl.push([Math.cos(a) * (PIT.r + 1.6), 2.6, Math.sin(a) * (PIT.r + 1.6), 0.45, 0.5, 0.45, '#ff9100']); }
  g.add(new T.Mesh(voxGeo(fl), vglow));
  g.position.set(PIT.x, heightAt(PIT.x, PIT.z), PIT.z); world.add(g);
}
function campProp(c) {
  const b = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; b.push([Math.cos(a) * CAMP_BOX, 0.12, Math.sin(a) * CAMP_BOX, 0.45, 0.24 + (i % 3) * 0.06, 0.45, '#9e9e9e']); }
  const m = new T.Mesh(voxGeo(b), vmat); m.position.set(c.x, heightAt(c.x, c.z), c.z); world.add(m);
}
const JUNGLE_PROPS = { shops: [] };
function buildJungleDecor() {
  for (const s of JUNGLE.shops) JUNGLE_PROPS.shops.push(shopProp(s));
  pitProp();
  for (const c of JUNGLE.camps) campProp(c);
}
function animJungleProps(dt) { for (const g of JUNGLE_PROPS.shops) if (g.userData.orb) { g.userData.orb.rotation.y += dt * 1.2; g.userData.orb.position.y = Math.sin(G.time * 2) * 0.2; } }
