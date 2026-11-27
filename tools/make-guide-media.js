#!/usr/bin/env node
// Makes the pictures and the overview video for the How to Play booklet
// (guide/index.html). It plays the game in a headless browser, the same way
// tests/smoke.js does, and saves:
//
//   guide/img/*.jpg          the booklet's screenshots
//   guide/how-to-play.mp4    the overview video (with captions), and
//   guide/img/video-poster.jpg
//
//   node tools/make-guide-media.js            # both
//   node tools/make-guide-media.js --stills   # just the screenshots
//   node tools/make-guide-media.js --video    # just the video
//
// Needs Playwright (see tests/smoke.js) and ffmpeg. Re-run it when the game
// changes enough that the pictures are out of date. See docs/guide.md.
'use strict';

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'guide');
const IMG = path.join(OUT, 'img');
const PORT = 4417 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}/?playtime=off`;
const START_TIME = new Date('2026-06-01T12:00:00Z');
const W = 1280, H = 720, FPS = 24;
const args = process.argv.slice(2);
const DO_STILLS = !args.includes('--video');
const DO_VIDEO = !args.includes('--stills');

const L1 = 'assets/game_design.json', L2 = 'assets/camp_level2.json', L3 = 'assets/camp_level3.json',
  L4 = 'assets/camp_level4.json', CASTLE = 'assets/level3_castle.json';

function startServer() {
  const proc = spawn(process.execPath, [path.join(ROOT, 'server.js'), String(PORT)], { cwd: ROOT, stdio: 'pipe' });
  return new Promise((resolve, reject) => {
    proc.stdout.on('data', d => { if (String(d).includes(String(PORT))) resolve(proc); });
    proc.on('exit', code => reject(new Error(`server exited (${code})`)));
    setTimeout(() => resolve(proc), 3000);
  });
}

// One browser tab playing the game on a fake clock: time only moves when we
// say so, so walking, fights and pop-ups look the same on every run.
class Game {
  constructor(page) { this.page = page; this.frames = null; this.n = 0; this.cap = null; }
  ev(expr) { return this.page.evaluate(expr); }
  // Advance game time; when recording, save a video frame every 1/FPS s
  async run(ms) {
    const step = 1000 / FPS;
    for (let t = 0; t < ms; t += step) {
      await this.page.clock.runFor(step);
      if (this.frames) await this.frame();
    }
  }
  async frame() {
    const file = path.join(this.frames, `f${String(this.n++).padStart(5, '0')}.jpg`);
    await this.page.screenshot({ path: file, type: 'jpeg', quality: 90, animations: 'disabled' });
  }
  async until(expr, maxMs = 15000) {
    for (let t = 0; t < maxMs; t += 50) {
      if (await this.ev(expr)) return;
      if (this.frames) await this.run(1000 / FPS); else { await this.page.clock.runFor(50); await new Promise(r => setTimeout(r, 5)); }
    }
    throw new Error(`timed out waiting for ${expr} (state=${await this.ev('state')})`);
  }
  async key(k) { await this.page.keyboard.press(k); await this.run(80); }
  async shot(name) {
    fs.mkdirSync(IMG, { recursive: true });
    await this.page.screenshot({ path: path.join(IMG, `${name}.jpg`), type: 'jpeg', quality: 82, animations: 'disabled' });
    console.log('   📸', name);
  }
  async map(p, at = null) {
    await this.ev(`switchMap(${JSON.stringify(p)}, ${JSON.stringify(at)})`);
    await this.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(p)}`);
  }
  // Put the player on a hotspot (fy: how far down its box)
  standAt(id, fy = 0.5, dx = 0) {
    return this.ev(`(() => { const o = interactiveObjects.find(o => o.id === ${JSON.stringify(id)});
      player.x = o.x + o.width / 2 + ${dx}; player.y = o.y + o.height * ${fy}; tapTarget = null; })()`);
  }
  // Walk there for real (tap-to-move), so the video shows it
  async walkTo(id, fy = 0.5, maxMs = 6000) {
    await this.ev(`(() => { const o = interactiveObjects.find(o => o.id === ${JSON.stringify(id)});
      tapTarget = { x: o.x + o.width / 2, y: o.y + o.height * ${fy} }; })()`);
    await this.until('!tapTarget', maxMs).catch(() => {});
  }
  async walkToXY(fx, fy, maxMs = 6000) {
    await this.ev(`tapTarget = { x: scaledMapW * ${fx}, y: scaledMapH * ${fy} }`);
    await this.until('!tapTarget', maxMs).catch(() => {});
  }
  // A caption band over the game (video only): a title and a line of text
  async caption(title, text, opts = {}) {
    await this.ev(`window.__caption(${JSON.stringify(title)}, ${JSON.stringify(text || '')}, ${JSON.stringify(opts)})`);
  }
  // A full-screen title card
  async card(title, lines, ms) {
    await this.ev(`window.__card(${JSON.stringify(title)}, ${JSON.stringify(lines)})`);
    await this.run(ms);
    await this.ev('window.__card(null)');
  }
  // A short fight, played by a simple bot: walk in, swing, block when the boss winds up
  async botFight(ms) {
    const kb = this.page.keyboard;
    let held = null, last = 0;
    const hold = async k => { if (held === k) return; if (held) await kb.up(held); held = k; if (k) await kb.down(k); };
    for (let t = 0; t < ms; t += 1000 / FPS) {
      const s = await this.ev(`fight && fight.phase === 'fight' ? { d: Math.abs(fight.b.x - fight.p.x), b: fight.b.act, p: fight.p.act } : null`);
      if (s) {
        if (s.b === 'windup' && s.d < 300) await hold('b');
        else if (s.d > 190) await hold('ArrowRight');
        else {
          await hold(null);
          if (t - last > 380 && s.p !== 'attack') { await kb.press(' '); last = t; }
        }
      }
      await this.run(1000 / FPS);
    }
    await hold(null);
  }
  async winFight() {
    await this.ev(`fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  }
}

// Captions and title cards, drawn as HTML over the canvas
const OVERLAY = `
window.__caption = (title, text, opts) => {
  let el = document.getElementById('__cap');
  if (!el) {
    el = document.createElement('div'); el.id = '__cap';
    el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:56px;max-width:900px;padding:14px 26px;' +
      'background:rgba(20,24,48,.88);border:3px solid #ffd54f;border-radius:18px;color:#fff;text-align:center;' +
      'font-family:"Comic Sans MS","Comic Neue",cursive;box-shadow:0 6px 24px rgba(0,0,0,.4);z-index:9999;pointer-events:none';
    document.body.appendChild(el);
  }
  if (!title) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  el.style.bottom = opts && opts.top ? 'auto' : '56px';
  el.style.top = opts && opts.top ? '70px' : 'auto';
  el.innerHTML = '<div style="font-size:30px;font-weight:bold;color:#ffd54f">' + title + '</div>' +
    (text ? '<div style="font-size:21px;margin-top:4px;line-height:1.35">' + text + '</div>' : '');
};
window.__card = (title, lines) => {
  let el = document.getElementById('__card');
  if (!el) {
    el = document.createElement('div'); el.id = '__card';
    el.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'background:radial-gradient(circle at 50% 30%,#2f6b3a,#14301b);color:#fff;font-family:"Comic Sans MS","Comic Neue",cursive;' +
      'z-index:10000;text-align:center;pointer-events:none';
    document.body.appendChild(el);
  }
  if (!title) { el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = '<div style="font-size:64px;font-weight:bold;color:#ffd54f;text-shadow:0 4px 0 #0006">' + title + '</div>' +
    lines.map(l => '<div style="font-size:28px;margin-top:14px;max-width:1000px">' + l + '</div>').join('');
};`;

async function newGame(browser) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', err => console.error('page error:', err.message));
  // NPCs use their built-in replies (no AI calls), PubNub isn't needed
  // Writing the pictures would trigger the dev server's live reload
  await page.route('**/~~livereload', r => r.fulfill({ status: 204, body: '' }));
  await page.route('**/api/npc-reply', r => r.fulfill({ status: 503, body: '{"error":"guide"}' }));
  await page.route('**/pubnub*/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.PubNub = function () {};' }));
  await page.addInitScript(`(() => { let a = 4242; Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();`);
  await page.addInitScript(OVERLAY);
  await page.clock.install({ time: START_TIME });
  await page.clock.pauseAt(new Date(START_TIME.getTime() + 1000));
  await page.addInitScript(`performance.now = () => Date.now() - ${START_TIME.getTime()};
    window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);`);
  await page.goto(BASE);
  const g = new Game(page);
  await g.until('typeof state !== "undefined" && state === GameState.MODE_SELECT');
  return { g, context };
}

// From the start menu to walking around the first camp as Green Girl
async function startPlaying(g, { showSelect = false } = {}) {
  await g.page.click('[data-act=single]');
  await g.until('state === GameState.CHARACTER_SELECT');
  if (showSelect) { await g.run(1200); await g.key('ArrowRight'); await g.run(900); await g.key('ArrowLeft'); await g.run(600); }
  await g.key('Enter');
  await g.until('state === GameState.PLAYING');
  await g.ev('bossSettings && 0').catch(() => {});
}

// Keep the bosses home unless a scene wants them
const BOSSES_HOME = `(() => { try { mapBoss.where = 'home'; mapBoss.homeUntil = Infinity; } catch (_) {}
  try { brick.restUntil = Infinity; } catch (_) {} try { slime.restUntil = Infinity; } catch (_) {}
  try { mallows.foes.forEach(m => { m.where = 'home'; m.homeUntil = Infinity; }); } catch (_) {} })()`;

// ------------------------------------------------------------------ stills
async function stills(browser) {
  console.log('Stills');
  const { g, context } = await newGame(browser);
  await g.run(600);
  await g.shot('menu');
  await g.page.click('[data-act=single]');
  await g.until('state === GameState.CHARACTER_SELECT');
  await g.run(800);
  await g.shot('characters');
  await g.key('Enter');
  await g.until('state === GameState.PLAYING');
  await g.ev(BOSSES_HOME);
  await g.standAt('tree', 0.85); await g.run(2500);
  await g.shot('map');

  // A hotspot's pop-up: items here, items from the backpack to use
  await g.ev(`backpack.push({ id: 'rope', name: 'Rope', emoji: '🪢', pickedUpFrom: 'stairs_left' },
    { id: 'map', name: 'Map', emoji: '🗺️', pickedUpFrom: 'car_wings' })`);
  await g.standAt('tree'); await g.run(300);
  await g.key(' '); await g.run(900);
  await g.shot('hotspot');
  await g.key('Escape');
  await g.key('b'); await g.run(300);
  await g.shot('backpack');
  await g.key('b');
  // Use an item → an adventure, then the prize wheel
  await g.ev(`useItem(backpack.find(i => i.id === 'rope'))`);
  await g.run(2600);
  await g.shot('adventure');
  await g.ev(`wheelLuck = 7`);
  await g.key(' ');
  await g.until('state === GameState.PRIZE_WHEEL');
  await g.run(400); await g.key(' '); await g.run(4600);
  await g.shot('wheel');
  await g.key(' ');
  await g.key('j'); await g.run(900);
  await g.shot('journal');
  await g.key('j');

  // Talking to a friend
  await g.ev(`(() => { const n = talkablesHere().find(n => n.id === 'red_scout'); const p = speakerFeet(n);
    player.x = p.x + 70; player.y = p.y; tapTarget = null; })()`);
  await g.run(300);
  await g.key('t');
  await g.page.fill('#talkInput', 'where is the sword?');
  await g.page.press('#talkInput', 'Enter');
  await g.run(5000);
  await g.shot('talk');
  await g.page.click('#talkSidekick'); await g.run(300);
  await g.ev(`state === GameState.TALKING && endConversation && endConversation()`).catch(() => {});
  await g.page.keyboard.press('Escape'); await g.run(300);

  // The Blob on the map, then a fight
  await g.ev(`state = GameState.PLAYING`);
  await g.ev(`(() => { mapBoss.homeUntil = 0; })()`).catch(() => {});
  await g.standAt('cave', 1.4, -60); await g.run(600);
  await g.ev(`resetMapBoss(); startFight()`);
  await g.run(2000);
  await g.botFight(3500);
  await g.shot('fight');
  await g.winFight(); await g.run(600);
  await g.shot('fight-won');
  await g.key(' ');
  await g.until('state === GameState.PLAYING');

  // The kitchen
  await g.map('assets/camp_kitchen.json', 'exit_door');
  await g.standAt('lettuce_crate', 0.9); await g.run(300);
  await g.key(' '); await g.run(1500);
  await g.shot('kitchen');
  // The bank
  await g.map('assets/camp_bank.json');
  await g.ev(`backpack.push({ ...BANK_COIN }, { ...BANK_COIN })`);
  const teller = await g.ev(`interactiveObjects.find(o => o.bank).id`);
  await g.standAt(teller, 0.9); await g.run(500);
  await g.key(' '); await g.run(300);
  await g.page.click('[data-bank=deposit]'); await g.run(400);
  await g.shot('bank');
  await g.ev('closeBank()');

  // The Second Camp: the passage, the Marshmallows, the sword shop
  await g.ev(`level2Open = true`);
  await g.map(L1, 'cave'); await g.ev(BOSSES_HOME);
  await g.standAt('cave', 0.6); await g.run(800);
  await g.shot('passage');
  await g.map(L2, 'cave_exit');
  await g.ev(`mallows.graceUntil = Infinity; mallows.foes.forEach((m, i) => { m.where = 'out'; m.outUntil = Infinity; m.homeUntil = 0; m.fx = 0.45 + i * 0.08; m.fy = 0.5; m.target = { fx: 0.5, fy: 0.55 }; })`);
  await g.walkToXY(0.4, 0.62); await g.run(1500);
  await g.shot('level2');
  await g.map('assets/sword_shop.json');
  await g.ev(`backpack = backpack.filter(i => !isCoin(i)); backpack.push({ ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN })`);
  await g.standAt('shop_counter', 0.9); await g.run(400);
  await g.key(' '); await g.run(500);
  await g.shot('sword-shop');
  await g.ev('closeSwordShop()');

  // The Third Camp: the poison moat, the armor shop
  await g.ev(`level3Open = true`);
  await g.map(L3, 'hole_back');
  await g.ev(`player.x = scaledMapW * 0.5; player.y = scaledMapH * 0.62`);
  await g.run(1800);
  await g.ev(`(() => { for (let fy = 0.4; fy < 0.95; fy += 0.01) for (let fx = 0.2; fx < 0.8; fx += 0.01) {
    if (inPoisonMoat(scaledMapW * fx, scaledMapH * fy)) { player.x = scaledMapW * fx; player.y = scaledMapH * fy; return; } } })()`);
  await g.run(2200);
  await g.shot('moat');
  await g.map('assets/armor_shop.json');
  await g.ev(`backpack.push({ ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN })`);
  const counter = await g.ev(`interactiveObjects.find(o => o.armorShop).id`);
  await g.standAt(counter, 0.9); await g.run(400);
  await g.key(' '); await g.run(500);
  await g.shot('armor-shop');
  await g.ev('closeArmorShop()');
  await g.map(CASTLE, 'exit_door');
  await g.ev(`brick.restUntil = 0`);
  await g.ev(`startFight(brickFoe())`); await g.run(2000); await g.botFight(3000);
  await g.shot('brick-fight');
  await g.winFight(); await g.run(300); await g.key(' ');
  await g.until('state === GameState.PLAYING');

  // The Fourth Camp: the keypad, the code finder, the Slime Brick
  await g.ev(`level4Open = true`);
  await g.map(L4, 'passage_back'); await g.ev(BOSSES_HOME);
  await g.ev('player.x = scaledMapW * 0.51; player.y = scaledMapH * 0.36'); await g.run(2000);
  await g.shot('level4');
  await g.standAt('bank', 0.8); await g.run(300);
  await g.key(' '); await g.run(400);
  await g.shot('keypad');
  await g.ev('closeCodePad()');
  await g.map('assets/level4_safe_zone.json');
  await g.standAt('code_finder', 0.9); await g.run(300);
  await g.key(' '); await g.run(400);
  await g.page.click('[data-lock=bank]'); await g.run(300);
  await g.shot('code-finder');
  await g.ev('closeCodeKeeper()');

  // Exploration mode
  await g.map(L2, 'cave_exit'); await g.run(300);
  await g.key('e'); await g.run(1500);
  await g.shot('explore');
  await context.close();
}

// ------------------------------------------------------------------ video
async function video(browser) {
  console.log('Video');
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-frames-'));
  const { g, context } = await newGame(browser);
  g.frames = frames;
  const T = s => s * 1000;

  await g.card('🏕️ The Camp', ['How to play', 'Louisa\'s game, in about 2 minutes'], T(3.5));

  // Start
  await g.caption('Pick how to play', 'On your own, or with friends on other computers');
  await g.run(T(2.5));
  await g.page.click('[data-act=single]');
  await g.until('state === GameState.CHARACTER_SELECT');
  await g.caption('Choose your camper', '← → to choose, Enter to start. Each camper keeps their own saved game.');
  await g.run(T(1.5)); await g.key('ArrowRight'); await g.run(T(1)); await g.key('ArrowLeft'); await g.run(T(1));
  await g.key('Enter');
  await g.until('state === GameState.PLAYING');
  await g.ev(BOSSES_HOME);

  // Walking and hotspots
  await g.caption('Walk around the camp', 'Arrow keys or W A S D. On a tablet, tap where you want to go.');
  await g.walkTo('stairs_center', 0.7);
  await g.walkTo('tree', 0.8);
  await g.caption('Press Space at a glowing spot', 'Every tent, tree and toy is a hotspot with things to find');
  await g.run(T(1.5));
  await g.key(' '); await g.run(T(1.2));
  await g.caption('Click an item to pick it up', 'It goes in your backpack (10 slots). Faded items tell you where to find them.');
  const hereRect = await g.ev(`interactionHereRects[0] && { x: interactionHereRects[0].x + 20, y: interactionHereRects[0].y + 20 }`);
  await g.run(T(2));
  if (hereRect) { await g.page.mouse.click(hereRect.x, hereRect.y); }
  await g.run(T(2));
  await g.key('Escape');

  // Use an item somewhere else → adventure → prize wheel
  await g.ev(`backpack.push({ id: 'rope', name: 'Rope', emoji: '🪢', pickedUpFrom: 'stairs_left' })`);
  await g.caption('Use items at other spots', 'Bring an item to a new place and click it there. That\'s an adventure!');
  await g.walkTo('stairs_center', 0.7);
  await g.key(' '); await g.run(T(1.4));
  const useRect = await g.ev(`(() => { const r = interactionUseRects.find(r => r.item.id === 'rope'); return r && { x: r.x + 20, y: r.y + 20 }; })()`);
  if (useRect) await g.page.mouse.click(useRect.x, useRect.y);
  else await g.ev(`closeInteraction(); useItem(backpack.find(i => i.id === 'rope'))`);
  await g.run(T(3.5));
  await g.ev(`wheelLuck = 7`);
  await g.key(' ');
  await g.until('state === GameState.PRIZE_WHEEL');
  await g.caption('Every new adventure spins the prize wheel', 'Win coins, charms, swords or armor. Press Space to spin.', { top: true });
  await g.run(T(1.2)); await g.key(' '); await g.run(T(4.6)); await g.key(' ');
  await g.caption('J opens your Adventure Journal', 'Every adventure you\'ve done, and how many are left to find', { top: true });
  await g.key('j'); await g.run(T(3)); await g.key('j');

  // Friends
  await g.caption('Press T to talk to friends', 'Ask "where is the sword?" and they\'ll tell you');
  await g.ev(`(() => { const n = talkablesHere().find(n => n.id === 'red_scout'); const p = speakerFeet(n);
    tapTarget = { x: p.x + 70, y: p.y }; })()`);
  await g.until('!tapTarget', 6000).catch(() => {});
  await g.run(T(0.4));
  await g.key('t');
  await g.page.type('#talkInput', 'where is the sword?', { delay: 0 });
  await g.run(T(0.8));
  await g.page.press('#talkInput', 'Enter');
  await g.run(T(3.5));
  await g.caption('Make them your sidekick', 'A sidekick follows you everywhere and helps you fight');
  await g.page.click('#talkSidekick');
  await g.run(T(2.5));
  await g.ev(`typeof endConversation === 'function' && endConversation()`).catch(() => {});
  await g.page.keyboard.press('Escape');
  await g.ev(`state = GameState.PLAYING`);

  // Kitchen
  await g.map('assets/camp_kitchen.json', 'exit_door');
  await g.caption('Cook in the Camp Kitchen', 'Space grabs food, cooks it and puts it on the plate. Follow the chalkboard!');
  await g.walkTo('bread_basket', 0.9); await g.key(' '); await g.run(T(0.4));
  await g.walkTo('plate', 0.9); await g.key(' '); await g.run(T(0.4));
  await g.walkTo('fridge', 0.9); await g.key(' '); await g.run(T(0.4));
  await g.walkTo('plate', 0.9); await g.key(' '); await g.run(T(0.4));
  await g.walkTo('lettuce_crate', 0.9); await g.key(' '); await g.run(T(0.4));
  await g.walkTo('plate', 0.9); await g.key(' '); await g.run(T(1));
  await g.caption('Desserts make you stronger for good', '🍪 $10 = +2 💪, 🧁 $20 = +5 💪, 🍰 $30 = +8 💪. Eat them at the picnic table.');
  await g.key(' '); await g.run(T(0.3));
  await g.walkTo('picnic_table', 0.9); await g.key(' '); await g.run(T(1));
  await g.walkTo('shop_cupcake', 0.9); await g.run(T(1.5));

  // Bank
  await g.map('assets/camp_bank.json');
  await g.ev(`backpack.push({ ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN })`);
  await g.caption('Keep your coins safe in the bank', 'If a boss beats you, it eats the coins in your backpack, but never the bank\'s');
  const teller = await g.ev(`interactiveObjects.find(o => o.bank).id`);
  await g.walkTo(teller, 0.9);
  await g.key(' '); await g.run(T(1));
  await g.page.click('[data-bank=depositAll]'); await g.run(T(2.5));
  await g.ev('closeBank()');

  // The Blob
  await g.map(L1, 'bank');
  await g.ev(`(() => { mapBoss.homeUntil = 0; })()`).catch(() => {});
  await g.caption('The Glug Glub Blob lives in the cave', 'Find a 🗡️ sword first. Then walk up and press Space to fight!');
  await g.walkTo('cave', 1.3, 7000);
  await g.run(T(1));
  await g.ev(`resetMapBoss(); startFight()`);
  await g.run(T(1.5));
  await g.caption('Fight!', '← → move · ↑ jump · Space swing · hold B to block. When it shouts, BLOCK!', { top: true });
  await g.botFight(T(9));
  await g.winFight(); await g.run(T(2.5));
  await g.caption('Win and get a coin', 'Each win makes the Blob a level tougher, up to level 5', { top: true });
  await g.run(T(1.5));
  await g.key(' ');
  await g.until('state === GameState.PLAYING');

  // Levels
  await g.ev(`level2Open = true; ${BOSSES_HOME}`);
  await g.caption('Beat the level 5 Blob to open a secret passage', 'Then the cave leads to the Second Camp');
  await g.walkTo('cave', 0.7, 5000); await g.run(T(1.5));
  await g.map(L2, 'cave_exit');
  await g.ev(`mallows.graceUntil = Infinity; mallows.foes.forEach((m, i) => { m.where = 'out'; m.outUntil = Infinity; m.homeUntil = 0; m.fx = 0.45 + i * 0.08; m.fy = 0.5; m.target = { fx: 0.55, fy: 0.58 }; })`);
  await g.caption('Level 2: the Marshmallows', 'They chase you, even with no sword! Hide in the tents or the pool. Ember\'s Sword Shop is on the pool deck.');
  await g.walkToXY(0.4, 0.62); await g.run(T(2.5));
  await g.ev(BOSSES_HOME);
  await g.map('assets/sword_shop.json');
  await g.ev(`backpack = backpack.filter(i => !isCoin(i)); backpack.push({ ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN })`);
  await g.standAt('shop_counter', 0.9); await g.run(T(0.3));
  await g.key(' ');
  await g.caption('Buy better swords', 'Pay with coins from your backpack (take them out of the bank first)', { top: true });
  await g.run(T(3));
  await g.ev('closeSwordShop()');

  await g.ev(`level3Open = true`);
  await g.map(L3, 'hole_back');
  await g.ev(BOSSES_HOME);
  await g.caption('Level 3: the Brick\'s castle', 'Cross the bridge! 10 seconds in the green poison moat sends you back.');
  await g.walkToXY(0.5, 0.55, 5000); await g.run(T(1.5));
  await g.map('assets/armor_shop.json');
  await g.ev(`backpack.push({ ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN })`);
  const counter = await g.ev(`interactiveObjects.find(o => o.armorShop).id`);
  await g.standAt(counter, 0.9); await g.run(T(0.3));
  await g.key(' ');
  await g.caption('Shelly sells armor', 'Armor stops some of the boss\'s hits, on every level', { top: true });
  await g.run(T(3));
  await g.ev('closeArmorShop()');

  await g.ev(`level4Open = true`);
  await g.map(L4, 'passage_back');
  await g.ev(BOSSES_HOME);
  await g.caption('Level 4: the Slime Brick', 'Doors need codes: Beep the robot in the Safe Zone knows them. Stay out of the slow slime pit!');
  await g.walkToXY(0.45, 0.42, 4000); await g.run(T(1));
  await g.standAt('bank', 0.8); await g.run(T(0.3));
  await g.key(' ');
  await g.run(T(1.2));
  await g.page.type('#codePadInput', await g.ev(`codeFor('bank')`), { delay: 0 });
  await g.run(T(1));
  await g.page.press('#codePadInput', 'Enter');
  await g.run(T(2));

  // Exploration mode
  await g.map(L2, 'cave_exit');
  await g.key('e');
  await g.caption('Press E for exploration mode', 'No bosses, and every passage is open. Great for looking around!');
  await g.walkToXY(0.3, 0.7, 4000); await g.run(T(1.5));
  await g.key('e');
  await g.caption(null);

  await g.card('Top tips', ['🏦 Bank your coins before a boss fight', '🛡️ When a boss shouts, hold B to block',
    '🧁 Desserts make you stronger forever', '🤝 Bring a sidekick to every fight'], T(6));
  await g.card('📖 Read the booklet', ['for every tip, shop and boss', 'Have fun at camp! 🏕️'], T(3));
  g.frames = null;
  await context.close();

  console.log(`   ${g.n} frames → mp4`);
  const mp4 = path.join(OUT, 'how-to-play.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '32', '-preset', 'medium', '-movflags', '+faststart', mp4]);
  fs.mkdirSync(IMG, { recursive: true });
  fs.copyFileSync(path.join(frames, 'f00030.jpg'), path.join(IMG, 'video-poster.jpg'));
  fs.rmSync(frames, { recursive: true, force: true });
  console.log('   🎬', path.relative(ROOT, mp4), `${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB`);
}

(async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    if (DO_STILLS) await stills(browser);
    if (DO_VIDEO) await video(browser);
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(err => { console.error(err); process.exit(1); });
