// main.js — boot order: terrain → buildings → portraits/select screen → render loop. (Bundled last.)
buildTerrain();
buildJungleDecor();   // render/jungle.js (B8 shops, Roshan pit, camp rings)
buildMinimapBg();
setupBuildings();
renderPortraits();
visHooks(() => { initAudioHooks(); initAnnouncer(); });   // net/rng.js: their handlers never touch the shared LAN random sequence
buildOptions(); buildFsButton();   // ui/fullscreen.js   // B9: audio/hooks.js, ui/announce.js, ui/options.js
buildSelect(); buildNetMenu();   // net/menu.js (B11 LAN tabs + lobby)
requestAnimationFrame(frame);
