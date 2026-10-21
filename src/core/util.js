// core/util.js — constants & math helpers shared by every module (all modules share one bundle scope).
const T = THREE;
const $ = id => document.getElementById(id);
const MAPH = 80, TILE = 2, GN = 80;
const RAD = 0, DIRE = 1;
const XP_MULT = 2.4;   // B10: raised from 1.4 so bots reach lv 18–25 by 35–40 min (late items, game end)
const XP_TABLE = [0,240,640,1160,1760,2440,3200,4000,4900,5900,7000,8200,9500,10900,12400,14000,15700,17500,19400,21400,23600,26000,28600,31400,34400];
const MAX_LEVEL = 25;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hash2(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function d2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function dst(a, b) { return Math.sqrt(d2(a, b)); }
function fmtTime(t) { const n = Math.floor(Math.abs(t)); return (t < 0 ? '-' : '') + String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); }

const TEAM_NAME = ['天辉', '夜魇'];
const lerpAngle = (a, b, k) => { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * k; };
