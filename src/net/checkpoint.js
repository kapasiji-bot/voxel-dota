// net/checkpoint.js — B11 follow-up: periodic lockstep checkpoints for verified / faster rejoin.
// Full sim state cannot be serialized (timers / projectile onHit / effect.update closures + three.js). Checkpoints are
// therefore {n, hash} waypoints on the order log: rejoin still starts from seed+log, but (1) catch-up verifies the hash
// at each checkpoint (early desync abort), (2) FF skips expensive visual work and uses a larger time budget so wall-clock
// catch-up is faster than the original 45 ms/frame path, (3) resume carries `cps` so the UI can show progress by checkpoint.
// Future: a quiet-moment state blob could restore at cp.n and only apply the tail of the log (LS.cps[i].blob reserved).
const CP_EVERY = 300;   // 10 game seconds at NSTEP=1/30
function cpReset() { LS.cps = []; LS.cpHits = 0; LS.cpMiss = 0; }
function cpTick(n) {
  if (!n || n % CP_EVERY !== 0) return;   // skip tick 0 (boot); first marker at CP_EVERY
  // reuse syncTick's hash when available (same tick, identical call order on host)
  const h = ((LS.hashes && LS.hashes[n] !== undefined) ? LS.hashes[n] : stateHash()) >>> 0;
  LS.cps.push({ n, hash: h, i: LS.log.length });
  if (LS.cps.length > 40) LS.cps.shift();
}
function cpAt(n) { return (LS.cps || []).find(c => c.n === n) || null; }
function cpLatest() { const a = LS.cps || []; return a.length ? a[a.length - 1] : null; }
function cpVerify(n, hash) {
  const c = cpAt(n); if (!c) return null;
  const want = hash >>> 0, got = c.hash >>> 0;
  const alt = LS.hashes && LS.hashes[n];
  const ok = got === want || (alt !== undefined && (alt >>> 0) === want);
  if (ok) LS.cpHits++; else LS.cpMiss++;
  return ok;
}
// apply host-sent checkpoint list on a rejoiner / spectator (before FF)
function cpLoad(list) {
  LS.cps = Array.isArray(list) ? list.map(c => ({ n: c.n | 0, hash: c.hash >>> 0, i: c.i | 0 })) : [];
  LS.cpHits = 0; LS.cpMiss = 0;
}
function cpInfo() {
  const last = cpLatest();
  return { every: CP_EVERY, count: (LS.cps || []).length, latest: last, hits: LS.cpHits | 0, miss: LS.cpMiss | 0, ffSkipVis: !!NET.ffSkipVis };
}
