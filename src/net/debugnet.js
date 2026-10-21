// net/debugnet.js — B11 test / debug hooks on window.GameAPI (tests drive the real lobby UI and read these).
Object.assign(GameAPI, {
  NET, LOB, LS, RNG, sdpParse, sdpBuild, encodeCode, decodeCode, stateHash, netStartGame, netSetPause, togglePause, chatSend, invNew, lobbyAct,
  netOrder(o, u) { return issueOrder(u || G.player, o); },   // the live (wrapped) binding → a LAN command
  netCast(i, t) { return orderCast(G.player, i, t); }, netLearn(i) { return learnSkill(i); },
  // headless 'human': every 1.5 s the local hero learns skills, buys, casts on visible enemy heroes, attack-moves (all via commands)
  netAutoplay(on = true) {
    clearInterval(NET.autoT); if (!on) return;
    NET.autoT = setInterval(() => {
      const P = G.player; if (!P || P.dead || !NET.started || G.paused) return;
      for (let i = 0; i < 4; i++) learnSkill(i);
      for (const id of ['salve', 'boots', 'claymore']) if (P.gold > ITEM_DEFS[id].cost + 50 && !P.items.some(x => x && x.id === id)) buyItem(id);
      const foe = G.heroes.find(h => h.team !== P.team && !h.dead && canSee(P.team, h) && dst(h, P) < 14);
      if (foe) { for (let i = 0; i < 4; i++) if (!canCast(P, P.abilities[i]) && !orderCast(P, i, P.abilities[i].def.target === 'unit' ? foe : { x: foe.x, z: foe.z })) return; issueOrder(P, { type: 'attack', target: foe }); return; }
      const a = G.ancients[1 - P.team] || { x: 0, z: 0 }; issueOrder(P, { type: 'amove', x: a.x * 0.6, z: a.z * 0.6 });
    }, 1500);
  },
  netBuy(id) { return buyItem(id); }, netUse(slot, t) { return useItem(G.player, slot, t); },
  // tests with several pages: skip the WebGL draw (software GL in headless Chrome is the bottleneck); sim, HUD and input still run
  netNoRender(on = true) { if (!NET._render) NET._render = renderer.render; renderer.render = on ? function () {} : NET._render; },
  netSpeed(s) { NET.speed = s; if (NET.role === 'host') netBroadcast({ t: 'speed', s }); },
  // real (not render-interpolated) unit state: [id, x, z, hp]
  netUnits(filter) { lsRestore(); return units.filter(u => !u.dead && (!filter || filter(u))).map(u => [u.id, +u.x.toFixed(3), +u.z.toFixed(3), +u.hp.toFixed(2)]); },
  netHeroes() { lsRestore(); return G.heroes.map(h => ({ id: h.id, hero: h.def.id, slot: h.netSlot, team: h.team, x: h.x, z: h.z, hp: h.hp, gold: h.gold, items: h.items.map(i => i && i.id), bot: !!h.bot, gone: !!h.netGone, name: h.netName })); },
  netKill() { if (NET.role === 'host') for (const p of NET.peers) chanClosed(p.ch, 'closed'); else chanClosed(NET.hostCh, 'closed'); },
  netInfo() { return { role: NET.role, me: NET.me, slot: NET.mySlot, tick: LS.n, q: LS.q.length, peers: NET.peers.map(p => ({ pid: p.pid, slot: p.slot, ack: p.ack, rtt: p.rtt, gone: p.gone, synced: p.synced, name: p.name })), desync: NET.desync.slice(), ff: NET.ff, ping: NET.myPing, stats: NET.stats, rng: RNG.n }; },
});
NET_H.speed = (_, m) => { NET.speed = m.s; };
