// net/cmds.js — B11 player commands. Everything a human does that changes the simulation is a command
// {k, p (issuer slot, stamped by the host), ...}; units / ground items travel as ids ({$u:id} / {$d:id}).
// Commands run on every peer at the same lockstep tick, re-validated there (the issuer must own the unit).
const CLIENT_CMDS = ['o', 'use', 'buy', 'sell', 'learn', 'auto', 'cour'];
function netSer(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(netSer);
  if (typeof v.id === 'number' && v.mods && typeof v.team === 'number') return { $u: v.id };
  if (v.mesh && v.item && typeof v.id === 'string') return { $d: v.id };
  const o = {}; for (const k in v) if (typeof v[k] !== 'function') o[k] = netSer(v[k]); return o;
}
function netDes(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(netDes);
  if (v.$u !== undefined) return unitById(v.$u);
  if (v.$d !== undefined) return drops.find(d => d.id === v.$d) || null;
  const o = {}; for (const k in v) o[k] = netDes(v[k]); return o;
}
const heroBySlot = s => G.heroes.find(h => h.netSlot === s) || null;
const netOwns = (h, u) => !!u && !!h && (u === h || (u.owner === h && !!u.controllable));
// from the local UI: the host queues it for its next tick, a joiner sends it to the host
function netCmd(c) {
  NET.stats.cmds++;
  if (NET.role === 'host') { c.p = NET.mySlot; LS.pend.push(c); } else netToHost({ t: 'cmd', c });
  return null;
}
NET_H.cmd = (p, m) => {
  const c = m.c; if (!NET.started || p.slot < 0 || p.gone || !c || !CLIENT_CMDS.includes(c.k)) return;
  c.p = p.slot; LS.pend.push(c); if (document.hidden) netPump();
};
function execCmd(c) {
  const O = NET_ORIG, H = heroBySlot(c.p), mine = !!H && H === G.player;
  const say = e => { if (e && mine && typeof e === 'string') err(e); };
  switch (c.k) {
    case 'drop': netExecDrop(c); return;    // net/drop.js (host-issued)
    case 'human': netExecHuman(c); return;
  }
  if (!H) return;
  switch (c.k) {
    case 'o': {
      const u = unitById(c.u); if (!netOwns(H, u)) return;
      const o = netDes(c.o); if (!o || ('target' in c.o && !o.target) || ('drop' in c.o && !o.drop)) return;
      O.issueOrder(u, o); break;
    }
    case 'use': say(O.useItem(H, c.s | 0, netDes(c.t))); break;
    case 'buy': if (ITEM_DEFS[c.id]) O.buyItem(c.id, H); break;
    case 'sell': O.sellItem(c.s | 0, H); break;
    case 'learn': O.learnSkill(c.i | 0, H); break;
    case 'auto': { const u = unitById(c.u); if (netOwns(H, u)) O.toggleAutocast(u, c.i | 0); break; }
    case 'cour': say(O.courierOrder(H, c.type)); break;
  }
}
