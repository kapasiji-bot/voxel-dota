// render/fogrender.js — fog-of-war rendering for the player's team + day/night lighting. Render-only (reads sim state).
// Every material that uses scene fog also darkens fragments whose world XZ falls in an unseen cell: the fog_* shader
// chunks are patched to sample FOW_TEX (GN×GN, linear-filtered, faded over ~0.3 s). Enemy units the player's team cannot
// see (canSee) are hidden, which also hides their health bars / picking; own invisible units are drawn as ghosts.
const FOW_DATA = new Uint8Array(GN * GN * 4), FOW_CUR = new Float32Array(GN * GN).fill(1);
const FOW_TEX = new T.DataTexture(FOW_DATA, GN, GN, T.RGBAFormat);
FOW_TEX.magFilter = T.LinearFilter; FOW_TEX.minFilter = T.LinearFilter; FOW_TEX.needsUpdate = true;
const FOW_U = { fowTex: { value: FOW_TEX }, fowDark: { value: 0.4 } };
T.ShaderChunk.fog_pars_vertex += '\n#ifdef USE_FOG\nvarying vec3 vFowWorld;\n#endif\n';
T.ShaderChunk.fog_vertex += '\n#ifdef USE_FOG\n{ vec4 fowP = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nfowP = instanceMatrix * fowP;\n#endif\nvFowWorld = (modelMatrix * fowP).xyz; }\n#endif\n';
T.ShaderChunk.fog_pars_fragment += '\n#ifdef USE_FOG\nvarying vec3 vFowWorld; uniform sampler2D fowTex; uniform float fowDark;\n#endif\n';
// fogged fragments: darkened, 55% desaturated and tinted cool blue; never-explored cells (G channel = 0) a little darker still
T.ShaderChunk.fog_fragment = '#ifdef USE_FOG\n{ vec4 fw = texture2D(fowTex, (vFowWorld.xz + 80.0) / 160.0); vec3 c0 = gl_FragColor.rgb; float lum = dot(c0, vec3(0.3, 0.59, 0.11));'
  + ' vec3 fc = mix(c0, vec3(lum), 0.55) * vec3(0.82, 0.92, 1.18) * fowDark * mix(0.72, 1.0, fw.g); gl_FragColor.rgb = mix(fc, c0, fw.r); }\n#endif\n' + T.ShaderChunk.fog_fragment;
T.Material.prototype.onBeforeCompile = function (sh) { sh.uniforms.fowTex = FOW_U.fowTex; sh.uniforms.fowDark = FOW_U.fowDark; };
// ghost materials for the player's team's invisible / hidden units
const vmatGhost = new T.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false });
const vglowGhost = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false });
function setGhost(u, on) {
  if (!!u._ghost === on || !u.model) return; u._ghost = on;
  u.model.traverse(o => { if (!o.isMesh) return; if (on) { if (o.material === vmat) o.material = vmatGhost; else if (o.material === vglow) o.material = vglowGhost; }
    else { if (o.material === vmatGhost) o.material = vmat; else if (o.material === vglowGhost) o.material = vglow; } });
}
// own illusions: blue tint (enemies see the normal hero materials)
const vmatIllu = new T.MeshLambertMaterial({ vertexColors: true, color: '#8ab8ff', emissive: '#0d2a66' });
const vglowIllu = new T.MeshBasicMaterial({ vertexColors: true, color: '#9cc8ff' });
function setTint(u, on) {
  if (!!u._tint === on || !u.model) return; u._tint = on;
  u.model.traverse(o => { if (!o.isMesh) return; if (on) { if (o.material === vmat) o.material = vmatIllu; else if (o.material === vglow) o.material = vglowIllu; }
    else { if (o.material === vmatIllu) o.material = vmat; else if (o.material === vglowIllu) o.material = vglow; } });
}
function renderFog(rdt) {
  const P = G.player; if (!P) return;
  const team = P.team, grid = VIS[team], ex = FOG.explored[team], k = Math.min(1, rdt * 7);
  for (let i = 0; i < GN * GN; i++) {
    const tgt = FOG.off || grid[i] ? 1 : 0, c = FOW_CUR[i] += (tgt - FOW_CUR[i]) * k;
    FOW_DATA[i * 4] = FOW_DATA[i * 4 + 2] = (c * 255) | 0; FOW_DATA[i * 4 + 1] = FOG.off || ex[i] ? 255 : 0; FOW_DATA[i * 4 + 3] = 255;
  }
  FOW_TEX.needsUpdate = true;
  for (const u of units) {
    if (u.dead || !u.model || u.isBuilding) continue;
    const own = u.team === team, show = own || canSee(team, u);
    if (u.model.visible !== show) u.model.visible = show;
    setGhost(u, own && !u.isWard && (isInvisible(u) || hasState(u, 'hidden')));
    if (u.isIllusion) setTint(u, own && !u._ghost);
  }
  updateDayNight(rdt);
}
// ---- day / night lighting (5 min each, 8 s blend) ----
const HEMI = scene.children.find(o => o.isHemisphereLight);
const DN = { k: 1, dayBg: new T.Color('#8cc0ec'), nightBg: new T.Color('#1d2b4a'), dayHemi: 0.62, nightHemi: 0.34, daySun: 0.9, nightSun: 0.32,
  daySunC: new T.Color('#fff1d6'), nightSunC: new T.Color('#9fb4ff') };
function updateDayNight(rdt) {
  const ph = G.time % (2 * DAY_LEN), blend = 8, tgt = ph < DAY_LEN ? (ph > DAY_LEN - blend ? (DAY_LEN - ph) / blend : ph < blend && G.time > blend ? ph / blend : 1)
    : (ph > 2 * DAY_LEN - blend ? 1 - (2 * DAY_LEN - ph) / blend : 0);
  DN.k += (tgt - DN.k) * Math.min(1, rdt * 4);
  const d = DN.k;
  scene.background.copy(DN.nightBg).lerp(DN.dayBg, d); scene.fog.color.copy(scene.background);
  if (HEMI) HEMI.intensity = DN.nightHemi + (DN.dayHemi - DN.nightHemi) * d;
  sun.intensity = DN.nightSun + (DN.daySun - DN.nightSun) * d; sun.color.copy(DN.nightSunC).lerp(DN.daySunC, d);
}
