// ai/bot/difficulty.js — difficulty presets for computer heroes (简单/普通/困难).
//   tick: decision interval (s)   react: chance per tick to act on an opportunity (casts, last hits)
//   aimErr: point/line spell aim error (world units)   lead: fraction of target movement predicted
//   lhMargin: last-hit damage safety factor (<1 = conservative)   retreat: HP fraction that triggers retreat
//   aggr: aggression (harass, chase, fight threshold)   dive: may chase under enemy towers
//   B10 team play: group (game s from which the team groups to push), rosh (s from which Roshan is called without an
//   advantage), gank (chance per check to send free bots after a lone visible enemy hero)
const DIFFS = [
  { name: 'easy', tick: 0.30, react: 0.40, aimErr: 2.6, lead: 0.2, lhMargin: 0.80, lhMiss: 0.40, retreat: 0.22, aggr: 0.35, dive: false, group: 1260, rosh: 1320, gank: 0.25 },
  { name: 'normal', tick: 0.20, react: 0.70, aimErr: 1.2, lead: 0.6, lhMargin: 0.95, lhMiss: 0.15, retreat: 0.28, aggr: 0.60, dive: false, group: 900, rosh: 900, gank: 0.6 },
  { name: 'hard', tick: 0.12, react: 0.95, aimErr: 0.35, lead: 0.9, lhMargin: 1.00, lhMiss: 0.03, retreat: 0.33, aggr: 0.85, dive: true, group: 720, rosh: 780, gank: 0.9 },
];
const DIFF_CN = ['简单', '普通', '困难'];
