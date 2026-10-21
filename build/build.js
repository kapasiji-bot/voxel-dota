// build/build.js — bundles src/ into ONE offline HTML: voxel-dota.html (three.min.js + CSS + all modules inlined).
// Modules share one scope (wrapped in a single IIFE) and run in MANIFEST order. heroes/*.js and items/*.js are globbed
// (alphabetical, files starting with "_" skipped) — so adding a hero/item never requires editing this file.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'src');
const MANIFEST = [
  'core/util.js', 'core/events.js', 'core/state.js',
  'map/lanes.js', 'map/jungle.js', 'map/grid.js', 'map/path.js', 'map/trees.js', 'map/walls.js',
  'render/renderer.js', 'render/terrain.js', 'render/trees.js', 'render/walls.js', 'render/voxel.js', 'render/models.js', 'render/particles.js', 'render/animate.js', 'render/forms.js', 'render/neutralmodels.js', 'render/jungle.js', 'render/fogrender.js',
  'abilities/modifiers.js', 'abilities/status.js', 'vision/fog.js', 'vision/invis.js', 'vision/blur.js',
  'entities/unit.js', 'entities/buildings.js', 'entities/creeps.js', 'entities/hero.js', 'entities/inventory.js', 'entities/shop.js', 'entities/shopsites.js', 'entities/wards.js', 'entities/summons.js', 'entities/illusions.js', 'entities/neutrals.js', 'entities/roshan.js', 'entities/drops.js', 'entities/courier.js',
  'combat/damage.js', 'combat/kills.js', 'combat/attack.js', 'combat/targeting.js', 'combat/movement.js',
  'abilities/cast.js', 'abilities/channel.js', 'abilities/aura.js', 'abilities/api.js', 'abilities/combo.js', 'abilities/mobility.js', 'abilities/cc.js', 'abilities/summon.js', 'abilities/toggle.js', 'abilities/displace.js', 'abilities/orb.js', 'abilities/shapes.js', 'abilities/scepter.js',
  'ai/creep.js', 'ai/neutral.js', 'ai/tower.js', 'ai/hero.js', 'ai/bot/*',
  'ui/messages.js', 'ui/camera.js', 'ui/input.js', 'ui/control.js', 'render/indicators.js', 'ui/minimap.js', 'ui/minimapjungle.js', 'ui/overlay.js', 'ui/tooltip.js', 'ui/hud.js', 'ui/shop.js', 'ui/courier.js', 'ui/select.js', 'ui/channelbar.js', 'ui/killfeed.js', 'ui/scoreboard.js', 'ui/options.js', 'ui/announce.js', 'ui/fullscreen.js', 'ui/pointerlock.js', 'ui/vcursor.js',
  'audio/synth.js', 'audio/engine.js', 'audio/sounds.js', 'audio/spells.js', 'audio/hooks.js', 'audio/ambience.js',
  'core/loop.js', 'debug/api.js', 'debug/api2.js',
  // B11 LAN multiplayer (explicit order: later files register NET_H handlers at load time)
  'net/rng.js', 'net/sdp.js', 'net/peer.js', 'net/net.js', 'net/lobby.js', 'net/lobbyui.js', 'net/invite.js', 'net/menu.js', 'net/match.js',
  'net/cmds.js', 'net/wrap.js', 'net/lockstep.js', 'net/sync.js', 'net/drop.js', 'net/chat.js', 'net/nethud.js', 'net/debugnet.js',
  'heroes/*', 'items/*',
  'main.js',
];
function expand(p) {
  if (!p.endsWith('/*')) return [p];
  const dir = p.slice(0, -2);
  return fs.readdirSync(path.join(SRC, dir)).filter(f => f.endsWith('.js') && !f.startsWith('_')).sort().map(f => dir + '/' + f);
}
const files = MANIFEST.flatMap(expand);
const all = new Set(); (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) all.add(path.relative(SRC, p)); } })(SRC);
for (const f of files) all.delete(f);
const unlisted = [...all].filter(f => !path.basename(f).startsWith('_'));
if (unlisted.length) console.warn('WARNING: not in MANIFEST (not bundled):', unlisted.join(', '));
const body = files.map(f => `// ===== ${f} =====\n` + fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
// BUILD_ID: hash of the bundled source — LAN peers must run the identical build (net/net.js NET_VER)
const BUILD_ID = require('crypto').createHash('sha1').update(body).digest('hex').slice(0, 10);
const game = "(function(){\n'use strict';\nconst BUILD_ID = '" + BUILD_ID + "';\n" + body + '\n})();';
if (game.includes('</script')) throw new Error('"</script" found in game source');
const three = fs.readFileSync(path.join(__dirname, 'node_modules/three/build/three.min.js'), 'utf8');
const css = fs.readFileSync(path.join(SRC, 'ui/style.css'), 'utf8');
let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
html = html.replace('/*__CSS__*/', () => css).replace('/*__THREE__*/', () => three).replace('/*__GAME__*/', () => game);
new Function(game); // syntax check
const out = path.join(ROOT, 'voxel-dota.html');
fs.writeFileSync(out, html);
console.log(`built ${out} (${html.length} bytes, ${files.length} modules)`);
