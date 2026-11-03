// debug/api2.js — GameAPI additions for B9 (audio) and B10 (bot teamwork); split from api.js (line budget).
Object.assign(GameAPI, {
  // B9 audio: AU (state, settings, stats, voices), auPlay(name, {unit|x,z, vol, global, bus}), auUnlock() (creates the context),
  // audioLog(on) records every sound that passed the gates in AU.log; audioReset() clears stats / throttle / voices
  AU, SOUNDS, SPELL_SFX, spellFamily, auPlay, auUnlock, auSetMuted, auSave, auLoad, auSpatial, toggleOptions, toggleMute, announce, tickAudio,
  audioLog(on = true) { AU.logOn = on; AU.log.length = 0; },
  audioReset() { AU.last = {}; AU.voices.length = 0; AU.log.length = 0; for (const k in AU.stats) AU.stats[k] = k === 'byName' ? {} : 0; },
  // B10 bot teamwork: team plans (G.teamAI), coordinator tick, push target choice, ganks, Roshan readiness
  // fullscreen + pointer lock (ui/fullscreen.js, ui/pointerlock.js, ui/vcursor.js); plSimulate(on) fakes a granted lock
  FS, fsActive, fsEnter, fsExit, toggleFullscreen, PL, plOn, plActive, plSetOption, plRequest, plMoveTo, plButton, plWheel, edgeAllowed, plCursorKind,
  plSimulate(on = true) { PL.sim = !!on; document.documentElement.classList.toggle('plLocked', plActive()); if (plActive()) plMoveTo(PL.x, PL.y); else { plHover(null); plDraw(); } },
  DIFFS, unitById, teamPlan, teamTick, setPlan, teamAdv, knownEnemies, pickPushTarget, rallyFor, startPush, assignGank, teamDive, teamDest, roshReady, botTeam, cheeseTaker, aegisTaker,
  // B12 mid-game polish
  buybackCost, buybackReady, canBuyback, doBuyback, BB_CD,
  castGlyph, glyphReady, glyphActive, glyphState, GLYPH_CD, GLYPH_DUR, pressGlyph, pressBuyback, updateDeathUI,
  trySpellBlock, hasShard, applyShard, transferItem, giftItem, giftViaCourier, isGiftable, giftTargetError, GIFT_RANGE, botGift, giftCarry, tickSmoke, breakSmokeGroup: typeof clearSmokeTeam === 'function' ? clearSmokeTeam : undefined,
  botBuyback, botGlyph, botSmokeBuy, botSmokeUse, botFarmer, emptyLane,
  // B13 polish: shard coverage helpers, item-aware bot prep, courier burst/upgrade, dynamic wards
  courierUpgrade, courierOrder, spawnCourier, COURIER_SPEED, COURIER_BURST_MULT, COURIER_BURST_DUR, COURIER_UPGRADE_COST, COURIER_UPGRADE_MULT,
  dynamicWardSpots, wardSpots, foeHasSpellBlock, needsBkbChannel, botPopBkb,
  // B19 luxury items: bot purchase builds
  BOT_BUILDS, BOT_EXTRA, botBuild, botShop, botHas, botRole,
});
