// abilities/channel.js — channelled abilities. Def fields: channel: seconds (number or per-level array),
//   onChannelStart(ctx, target), onChannelTick(ctx, target, dt, ch) → return false to end early, onChannelEnd(ctx, target, interrupted, ch).
// executeCast starts the channel after onCast. Interrupted by: any new order (issueOrder), stun/hex/silence/knockup, death.
// State: h.channel = {ab, ctx, target, t, dur, data}. Events: channelStart, channelEnd {interrupted, reason, elapsed}.
function startChannel(h, ab, target) {
  const ctx = abilityCtx(h, ab), dur = lvVal(ab.def, 'channel', ab.lvl);
  h.channel = { ab, ctx, target, t: 0, dur, data: {} };
  emit('channelStart', { unit: h.id, ability: ab.def.id, dur });
  if (ab.def.onChannelStart) ab.def.onChannelStart(ctx, target, h.channel);
}
function updateChannel(h, dt) {
  const ch = h.channel; if (!ch) return;
  ch.t += dt;
  if (ch.target && ch.target.id && ch.target.dead) return endChannel(h, false, 'target');
  if (ch.target && ch.target.id) h.facing = Math.atan2(ch.target.x - h.x, ch.target.z - h.z);
  const keep = ch.ab.def.onChannelTick ? ch.ab.def.onChannelTick(ch.ctx, ch.target, dt, ch) : true;
  if (keep === false) return endChannel(h, false, 'broken');
  if (ch.t >= ch.dur) endChannel(h, false, 'done');
}
function endChannel(h, interrupted, reason) {
  const ch = h.channel; if (!ch) return; h.channel = null;
  emit('channelEnd', { unit: h.id, ability: ch.ab.def.id, interrupted, reason, elapsed: +ch.t.toFixed(3) });
  if (ch.ab.def.onChannelEnd) ch.ab.def.onChannelEnd(ch.ctx, ch.target, interrupted, ch);
}
// def.keepOn: reasons that do NOT interrupt (TP scroll: ['silence', 'root'])
function interruptChannel(u, reason) { if (u && u.channel && !(u.channel.ab.def.keepOn && u.channel.ab.def.keepOn.includes(reason))) endChannel(u, true, reason); }
