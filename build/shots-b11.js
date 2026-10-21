// build/shots-b11.js — B11 LAN screenshots (3 pages in one browser context, ?netfake=1 transport, rendering on):
//   screenshot-45-lan-lobby.png  (host lobby: 3 humans + bots, picks, ready states, room log)
//   screenshot-46-lan-codes.png  (code exchange: host 邀请玩家 panel | joiner 加入 panel, side by side)
//   screenshot-47-lan-client.png (in-game view of a joining client: net HUD with ping, chat)
const { chromium } = require('playwright-core'), path = require('path'), { execFileSync } = require('child_process');
process.env.NET_NODEBUG = '1'; const L = require('./tests/netlib');
const out = n => path.resolve(__dirname, '..', n);
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errs = [], { pages } = await L.openPages(b, 3, errs, { width: 1280, height: 720 });
  const shot = async (p, file) => { await p.evaluate(() => GameAPI.netNoRender(false)); await L.sleep(700); await p.screenshot({ path: file }); await p.evaluate(() => GameAPI.netNoRender(true)); };
  const [h, c, d] = pages;
  await L.connectAll([h, c], ['小明', '阿强']);
  // third player: capture the code exchange mid-way (host has the offer + pasted answer, joiner shows both codes)
  await d.evaluate(() => { document.getElementById('lbName').value = '老王'; }); await d.click('#mtJoin');
  await h.click('#lbInvite'); await h.waitForFunction(() => { const c = document.querySelector('.inv[data-id="2"] .code'); return c && c.value.startsWith('VD1O'); });
  const offer = await h.$eval('.inv[data-id="2"] .code', e => e.value);
  await d.fill('#jOffer', offer); await d.click('#jGo'); await d.waitForFunction(() => document.getElementById('jAns').value.startsWith('VD1A'));
  const ans = await d.$eval('#jAns', e => e.value); await h.fill('.inv[data-id="2"] .ans', ans);
  await L.sleep(400);
  await shot(h, '/tmp/b11/s46a.png'); await shot(d, '/tmp/b11/s46b.png');
  execFileSync('python3', ['-c', `from PIL import Image, ImageDraw
a=Image.open('/tmp/b11/s46a.png'); b=Image.open('/tmp/b11/s46b.png'); w,h=a.size
im=Image.new('RGB',(w*2+8,h),(20,20,20)); im.paste(a,(0,0)); im.paste(b,(w+8,0)); im.save('${out('screenshot-46-lan-codes.png')}')`]);
  await h.click('.inv[data-id="2"] .ok');
  await d.waitForFunction(() => GameAPI.LOB.slots.some(s => s.k === 'h' && s.pid === GameAPI.NET.me), null, { timeout: 15000 });
  await h.click('#invClose').catch(() => {});
  await L.pick(h, 'cm'); await L.pick(c, 'axe'); await L.pick(d, 'lina');
  await L.ready(c);
  await h.evaluate(() => { GameAPI.lobbyAct('bot', { i: 1, diff: 1 }); GameAPI.lobbyAct('bot', { i: 6, diff: 2 }); GameAPI.lobbyAct('bot', { i: 7, diff: 0 }); });
  await d.fill('#lbChat', '我选火女，中路交给我'); await d.press('#lbChat', 'Enter');
  await L.sleep(600);
  await shot(h, out('screenshot-45-lan-lobby.png'));
  await L.ready(d);
  await L.startMatch(pages);
  await c.evaluate(() => GameAPI.netNoRender(false));
  await h.evaluate(() => GameAPI.netSpeed(3));
  await c.waitForFunction(() => GameAPI.G.time > 40, null, { timeout: 120000 });
  await h.evaluate(() => GameAPI.netSpeed(1));
  await c.evaluate(() => { const P = GameAPI.G.player; GameAPI.netOrder({ type: 'move', x: P.x * 0.8, z: P.z * 0.8 }); });
  await c.keyboard.press('Enter'); await c.keyboard.type('我去上路，注意对面的水晶室女'); await c.keyboard.press('Enter');
  await h.keyboard.press('Shift+Enter'); await h.keyboard.type('大家好，gl hf'); await h.keyboard.press('Enter');
  await L.sleep(2500);
  await c.screenshot({ path: out('screenshot-47-lan-client.png') });
  console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
