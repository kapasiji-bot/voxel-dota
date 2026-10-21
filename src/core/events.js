// core/events.js — tiny event bus + optional recorded log (used by debug/tests and UI).
// Event types: damage, death, cast, attackStart, attackImpact, attackCancel, swingImpact,
//   projectileLaunch, projectileHit, modifierAdd, modifierRemove, itemUse, buy, levelUp, wave, gameOver
// Every payload gets {type, t (game seconds), f (sim frame)}.
const Events = {
  subs: {}, log: [], recording: false, maxLog: 50000,
  on(type, fn) { (this.subs[type] || (this.subs[type] = [])).push(fn); return () => this.off(type, fn); },
  off(type, fn) { const a = this.subs[type]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
  emit(type, data) {
    data.type = type; data.t = G.time; data.f = G.frame;
    if (this.recording) { this.log.push(data); if (this.log.length > this.maxLog) this.log.shift(); }
    const a = this.subs[type]; if (a) for (const f of a.slice()) f(data);
    const b = this.subs['*']; if (b) for (const f of b.slice()) f(data);
  },
};
// cheap guard: build payload only if someone listens
function emit(type, data) { if (Events.recording || Events.subs[type] || Events.subs['*']) Events.emit(type, data || {}); }
