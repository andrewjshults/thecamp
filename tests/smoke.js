#!/usr/bin/env node
// Smoke test: plays through the game in a headless browser and fails on any
// JavaScript error. Run it before merging (and after resolving a merge):
//
//   npm test                                   # just check for errors
//   node tests/smoke.js --shots out/before     # also save screenshots + a trace
//   node tests/smoke.js --compare out/before   # ...and diff against an earlier run
//
// Needs Playwright: `npm install --no-save playwright && npx playwright install chromium`
// (or a global install). No internet needed: PubNub is replaced with a fake
// that passes messages between the test's two browser tabs.
//
// Runs are repeatable: the page clock is fake (time only moves when the test
// says so) and Math.random is seeded, so the same code gives the same
// screenshots and the same trace. That makes `--compare` a good check that a
// refactor didn't change anything.
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (_) {
  console.error('Playwright is not installed. Run:\n' +
    '  npm install --no-save playwright && npx playwright install chromium');
  process.exit(2);
}

const ROOT = path.resolve(__dirname, '..');
const PORT = 3917 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}/`;
const START_TIME = new Date('2026-06-01T12:00:00Z');

const args = process.argv.slice(2);
const argVal = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const COMPARE_DIR = argVal('--compare');
const SHOTS_DIR = argVal('--shots') || (COMPARE_DIR ? path.join(ROOT, 'out', 'compare-latest') : null);

const errors = [];
let ASSETS = null;   // assets/*.json, read once
const trace = [];
const log = (...a) => console.log('  ', ...a);

// ---------------------------------------------------------------- fake PubNub
// Every publish goes through the test (Node), which stamps it with the next
// timetoken and hands it to every tab in that order, like PubNub does.
const FAKE_PUBNUB = `
window.__pn = new Set();
window.__mpSeen = {};   // message types this tab has received
window.__pnDeliver = (ev) => {
  window.__mpSeen[ev.message.t] = (window.__mpSeen[ev.message.t] || 0) + 1;
  for (const pn of window.__pn) {
    if (!pn.channels.includes(ev.channel)) continue;
    for (const l of pn.listeners) if (l.message) l.message(ev);
  }
};
window.PubNub = class {
  constructor(o) { this.userId = o.userId; this.listeners = []; this.channels = []; window.__pn.add(this); }
  addListener(l) { this.listeners.push(l); }
  subscribe({ channels }) {
    this.channels = channels;
    setTimeout(() => this.listeners.forEach(l => l.status && l.status({ category: 'PNConnectedCategory' })), 20);
  }
  publish({ channel, message }) {
    return window.__pnPublish(channel, JSON.parse(JSON.stringify(message)), this.userId)
      .then(timetoken => ({ timetoken }));
  }
  unsubscribeAll() { this.channels = []; }
  destroy() { window.__pn.delete(this); }
  reconnect() {}
};`;

// ---------------------------------------------------------------- helpers
function startServer() {
  const proc = spawn(process.execPath, [path.join(ROOT, 'server.js'), String(PORT)], {
    cwd: ROOT, env: { ...process.env, ANTHROPIC_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 10000);
    proc.stdout.on('data', d => {
      if (String(d).includes(String(PORT))) { clearTimeout(timer); resolve(proc); }
    });
    proc.on('exit', code => reject(new Error(`server exited (${code})`)));
  });
}

// Every map, found by following portals from the main map (like the game does)
function crawlMaps() {
  const queue = ['assets/game_design.json'], seen = new Set(queue), out = [];
  while (queue.length) {
    const p = queue.shift();
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
    out.push({ path: p, cfg });
    for (const h of cfg.hotspots || []) {
      for (const link of [h.targetMap, h.passage && h.passage.targetMap]) {
        if (link && !seen.has(link)) { seen.add(link); queue.push(link); }
      }
    }
  }
  return out;
}

function seededRandomScript(seed) {
  return `(() => { let a = ${seed} >>> 0;
    window.__rnd = 0; Math.random = function () { window.__rnd++; a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();`;
}

// Makes the game's own async loading happen only between game-time steps
// (see Tab.settle), so a run doesn't depend on how fast this computer is:
// - map JSON comes from memory (a fetch that resolves in microtasks)
// - /api/npc-reply answers "unavailable" at once → the built-in replies
// - image onload/onerror handlers are held until the test flushes them
function determinismScript(assets) {
  return `(() => {
    const ASSETS = ${JSON.stringify(assets)};
    const realFetch = window.fetch.bind(window);
    const fake = (status, text) => ({ ok: status < 300, status,
      json: () => Promise.resolve(JSON.parse(text)), text: () => Promise.resolve(text) });
    window.fetch = (url, opts) => {
      const u = new URL(String(url), location.href);
      if (u.origin === location.origin) {
        const key = u.pathname.replace(/^\\//, '');
        if (key in ASSETS) return Promise.resolve(fake(200, ASSETS[key]));
        if (key === 'api/npc-reply') return Promise.resolve(fake(503, '{"error":"test"}'));
      }
      return realFetch(url, opts);
    };
    const RealImage = window.Image;
    const srcProp = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    window.__imgPending = 0;
    window.__imgReady = [];
    window.__flushImages = () => { const q = window.__imgReady; window.__imgReady = []; q.forEach(f => f()); return q.length; };
    window.Image = function (w, h) {
      const img = new RealImage(w, h);
      let onload = null, onerror = null;
      Object.defineProperty(img, 'onload', { get: () => onload, set: f => { onload = f; } });
      Object.defineProperty(img, 'onerror', { get: () => onerror, set: f => { onerror = f; } });
      Object.defineProperty(img, 'src', { get: () => srcProp.get.call(img), set: v => { window.__imgPending++; srcProp.set.call(img, v); } });
      img.addEventListener('load', e => { window.__imgPending--; window.__imgReady.push(() => onload && onload.call(img, e)); });
      img.addEventListener('error', e => { window.__imgPending--; window.__imgReady.push(() => onerror && onerror.call(img, e)); });
      return img;
    };
  })();`;
}

function assetJson() {
  const out = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) {
    if (f.endsWith('.json')) out[`assets/${f}`] = fs.readFileSync(path.join(ROOT, 'assets', f), 'utf8');
  }
  return out;
}

class Tab {
  constructor(page, name) {
    this.page = page; this.name = name; this.inflight = 0;
    // (the dev server's live-reload stream never finishes, so it doesn't count;
    // nor does video: the browser stops reading a paused one, like the
    // how-to-play video, so its request stays open and every settle() would
    // wait out its whole timeout. Nothing in the game waits on it.)
    const counts = req => !req.url().includes('~~livereload') && req.resourceType() !== 'media';
    page.on('request', req => { if (counts(req)) this.inflight++; });
    const done = req => { if (counts(req)) this.inflight--; };
    page.on('requestfinished', done);
    page.on('requestfailed', done);
  }
  ev(expr) { return this.page.evaluate(expr); }
  // Let real (non-timer) work finish, then run what it was waiting to do
  async settle() {
    for (let round = 0; round < 20; round++) {
      for (let i = 0; i < 2000; i++) {
        if (this.inflight <= 0 && await this.ev('window.__imgPending === 0')) break;
        await new Promise(r => setTimeout(r, 5));
      }
      if (!await this.ev('window.__flushImages()')) break;
    }
  }
  // Advance game time in small steps, settling in between, so the result
  // doesn't depend on how fast this computer is
  async run(ms) {
    for (let t = 0; t < ms; t += 50) {
      await this.settle();
      await this.page.clock.runFor(Math.min(50, ms - t));
    }
    await this.settle();
  }
  // Wait for `expr` to be true. Things like map loads need no game time, so
  // first wait in real time; only then let game time pass (timers, animations).
  async until(expr, what, maxMs = 20000) {
    await this.settle();
    if (await this.ev(expr)) return;
    for (let t = 0; t < maxMs; t += 50) {
      if (await this.ev(expr)) return;
      await this.run(50);
    }
    throw new Error(`[${this.name}] timed out waiting for ${what || expr} (state=${await this.ev('state')})`);
  }
  async state() { return this.ev('state'); }
  async key(k) { await this.page.keyboard.press(k); await this.run(50); }
  async shot(name) {
    this.note({ shot: name, t: await this.ev('Date.now()') - START_TIME.getTime(), rnd: await this.ev('window.__rnd'),
      npcs: await this.ev(`JSON.stringify(typeof npcRt === 'undefined' ? null : npcRt)`) });
    if (!SHOTS_DIR) return;
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
    await this.page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), animations: 'disabled' });
  }
  note(entry) { trace.push({ tab: this.name, ...entry }); }
}

async function newTab(context, name, seed) {
  const page = await context.newPage();
  page.on('pageerror', err => errors.push(`[${name}] ${err.stack || err.message}`));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/Failed to load resource/.test(text)) return;   // e.g. /api/npc-reply 503 → built-in replies
    errors.push(`[${name}] console.error: ${text}`);
  });
  await page.addInitScript(seededRandomScript(seed));
  await page.addInitScript(determinismScript(ASSETS));
  await page.clock.install({ time: START_TIME });
  // Time only moves when the test says so. Pause a little in the future: the
  // clock runs in real time until it's paused, so pausing "now" isn't exact.
  await page.clock.pauseAt(new Date(START_TIME.getTime() + 1000));
  // ...and the fake performance.now() can pick up those real ms too
  // (and its animation frames can be a few ms off), so tie both to Date.now()
  await page.addInitScript(`performance.now = () => Date.now() - ${START_TIME.getTime()};
    window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);`);
  await page.goto(BASE);
  const tab = new Tab(page, name);
  await tab.until('state === GameState.MODE_SELECT', 'the start menu');
  return tab;
}

// Get out of whatever the hotspot opened, back to walking around
async function backToPlaying(tab) {
  for (let i = 0; i < 12; i++) {
    const s = await tab.state();
    if (s === 'playing') return;
    if (s === 'loading') { await tab.until('state !== GameState.LOADING', 'map load'); continue; }
    if (s === 'fighting') {
      // Fight a little, then run away (Esc)
      for (let j = 0; j < 20; j++) {
        await tab.page.keyboard.press(j % 3 ? ' ' : 'ArrowRight');
        await tab.run(150);
      }
      await tab.key('Escape');
      await tab.run(4000);
      if (await tab.state() === 'fighting') await tab.ev('endFight && endFight()');
      continue;
    }
    if (s === 'bankModal' || s === 'kitchenModal' || s === 'swordShop' || s === 'armorShop' || s === 'shieldShop' || s === 'codePad' || s === 'codeKeeper') {
      // These pop-ups are HTML: Esc in the page is handled by their own listeners
      await tab.ev({ bankModal: 'closeBank()', swordShop: 'closeSwordShop()', armorShop: 'closeArmorShop()', shieldShop: 'closeShieldShop()', codePad: 'closeCodePad()', codeKeeper: 'closeCodeKeeper()' }[s] || 'closeKitchenModal()');
      continue;
    }
    if (s === 'itemAction' || s === 'usingItem' || s === 'interacting' || s === 'talking') {
      await tab.key('Escape');
      continue;
    }
    if (s === 'confirmDialog') { await tab.key('n'); continue; }
    if (s === 'prizeWheel') {
      await tab.key(' ');      // spin, wait for it to land, then OK
      await tab.run(4500);
      await tab.key(' ');
      continue;
    }
    await tab.run(500);
  }
  throw new Error(`[${tab.name}] stuck in state ${await tab.state()}`);
}

// Every save in localStorage, with object keys sorted (the order a save's
// fields are written in doesn't matter)
const SAVES_SORTED = `(() => {
  const sort = v => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])])) : v;
  const out = {};
  for (const k of Object.keys(localStorage).sort()) {
    try { out[k] = sort(JSON.parse(localStorage.getItem(k))); } catch (_) { out[k] = localStorage.getItem(k); }
  }
  return out;
})()`;

// ---------------------------------------------------------------- scenarios
async function singlePlayer(context) {
  const tab = await newTab(context, 'solo', 12345);
  await tab.run(500);
  await tab.shot('01-menu');

  // How to play: the video pop-up opens over the menu, Esc closes it
  await tab.page.click('[data-guide=video]');
  await tab.run(300);
  await tab.shot('01-guide-video');
  const guide = await tab.ev(`({ open: !guideVideoModal.hidden, src: guideVideo.querySelector('source').getAttribute('src'),
    booklet: document.querySelector('a.guideBtn').getAttribute('href') })`);
  await tab.page.keyboard.press('Escape');
  await tab.run(100);
  guide.closed = await tab.ev('guideVideoModal.hidden && guideVideo.paused');
  tab.note({ step: 'guide-video', ...guide });
  if (!guide.open || !guide.closed || guide.src !== 'guide/how-to-play.mp4' || guide.booklet !== 'guide/') {
    throw new Error(`the how-to-play video pop-up went wrong: ${JSON.stringify(guide)}`);
  }

  await tab.page.click('[data-act=single]');
  await tab.until('state === GameState.CHARACTER_SELECT');
  await tab.key('ArrowRight');
  await tab.run(300);
  await tab.shot('02-character-select');
  await tab.key('ArrowLeft');
  await tab.key('Enter');
  await tab.until('state === GameState.PLAYING');
  await tab.run(1500);
  await tab.shot('03-main-map');

  // HUD toggles
  await tab.key('b'); await tab.run(200); await tab.shot('04-backpack'); await tab.key('b');
  await tab.key('j'); await tab.run(800); await tab.shot('05-journal'); await tab.key('j');
  await tab.key('r'); await tab.key('r'); await tab.key('r'); await tab.key('r');
  await tab.key('Escape');
  tab.note({ step: 'esc', state: await tab.state() });
  await tab.key('n');

  // Dev mode on and off (exports the map JSON to the clipboard)
  await tab.key('Control+d'); await tab.run(200); await tab.shot('06-dev-mode');
  await tab.key('Control+d');
  tab.note({ step: 'devmode', state: await tab.state() });

  // Every map, and Space at every hotspot on it
  for (const { path: mapPath, cfg } of crawlMaps()) {
    await tab.ev(`switchMap(${JSON.stringify(mapPath)}, null)`);
    await tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(mapPath)}`, `map ${mapPath}`);
    await tab.ev('brick.restUntil = Infinity; slime.restUntil = Infinity; moon.restUntil = Infinity');   // the Brick on its throne, the Slime Brick in its den, the Moon in its crater (thirdCamp() / fourthCamp() / fifthCamp() fight them)
    await tab.run(2500);   // camera settles
    const slug = path.basename(mapPath, '.json');
    await tab.shot(`map-${slug}`);
    tab.note({ map: mapPath, hotspots: await tab.ev('interactiveObjects.map(o => o.id)') });

    const count = await tab.ev('interactiveObjects.length');
    for (let i = 0; i < count; i++) {
      // Stand on the hotspot and press Space
      const id = await tab.ev(`(() => { const o = interactiveObjects[${i}];
        player.x = o.x + o.width / 2; player.y = o.y + o.height / 2; tapTarget = null; return o.id; })()`);
      await tab.run(100);
      const near = await tab.ev('nearbyObject && nearbyObject.id');
      await tab.key(' ');
      await tab.run(1200);
      const s = await tab.state();
      tab.note({ map: mapPath, hotspot: id, near, after: s, held: await tab.ev('heldItem && heldItem.id') });
      if (s !== 'playing' && s !== 'loading') await tab.shot(`hs-${slug}-${id}`);
      await backToPlaying(tab);
      if (await tab.ev('currentMapPath') !== mapPath) {
        await tab.ev(`switchMap(${JSON.stringify(mapPath)}, null)`);
        await tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(mapPath)}`);
      }
    }
    // Talk to everyone here
    const npcIds = await tab.ev('talkablesHere().map(n => n.id)');
    for (const npcId of npcIds) {
      await tab.ev(`(() => { const n = talkablesHere().find(n => n.id === ${JSON.stringify(npcId)});
        const p = speakerFeet(n); player.x = p.x + 60; player.y = p.y; tapTarget = null; })()`);
      await tab.run(100);
      await tab.key('t');
      if (await tab.state() !== 'talking') { tab.note({ npc: npcId, talk: 'not near' }); continue; }
      for (const line of ['hello!', 'where is the sword?']) {
        await tab.page.fill('#talkInput', line);
        await tab.page.press('#talkInput', 'Enter');
        await tab.run(5000);   // a fixed time (not "until") keeps runs identical
        await tab.until('talkPhase === "input" || !talkingTo', 'npc reply', 30000);
      }
      const bubbles = await tab.ev(`speechBubbles.map(b => b.lines.map(l => l.words.map(w => w.text).join(' ')).join(' '))`);
      tab.note({ npc: npcId, bubbles });
      await tab.shot(`talk-${slug}-${npcId}`);
      if (await tab.ev('!talkSidekick.hidden')) {
        await tab.page.click('#talkSidekick');
        await tab.run(300);
        tab.note({ npc: npcId, sidekick: await tab.ev('sidekick && sidekick.npc && sidekick.npc.id') });
      }
      await backToPlaying(tab);
    }
  }

  // A full fight with a sidekick, then come back as the same camper (resume)
  await tab.ev('switchMap("assets/game_design.json", null)');
  await tab.until('state === GameState.PLAYING && currentMapPath === "assets/game_design.json"');
  await prizeWheel(tab);
  await tab.ev('resetMapBoss(); startFight()');
  await tab.run(3000);
  await tab.shot('fight');
  await backToPlaying(tab);
  tab.note({ step: 'after-fight', bossWins: await tab.ev('bossWins'), sword: await tab.ev('swordRating') });
  await tab.ev('brick.restUntil = 0; slime.restUntil = 0; moon.restUntil = 0');
  await secondCamp(tab);
  await thirdCamp(tab);
  await fourthCamp(tab);
  await fifthCamp(tab);
  await exploration(tab);
  await adventures(tab);
  await playtime(tab);

  // Some progress to save, so resuming has something to bring back
  await tab.ev(`strengthBoost = 7; bossWins = 2; bankBalance = 30; swordRating = 42; swordKind = 'flame'; level2Open = true; mallowWins = 3; level3Open = true; brickWins = 2; armorKind = 'chain'; armorRating = 77; level4Open = true; slimeWins = 1; throneUnlocked = true; doorCodes = { bank: 'K7P' }; level5Open = true; moonWins = 2; shieldKind = 'lava'; shieldRating = 99; lavaHopHinted = true; dishesMade = ['sandwich'];
    customRecipes = [{ id: 'custom_1', name: 'Tomato Surprise', needs: ['tomato', 'bread'], map: 'assets/camp_kitchen.json' }];
    completedUses = [{ hotspotId: 'tree', hotspotName: 'Tree', itemId: 'rope', itemName: 'Rope', itemEmoji: '🪢', text: 'Climbed!' }];
    backpack.push({ id: 'ten_dollar_coin', name: '$10 Coin', emoji: '🪙', coin: true, value: 10 }); writeSave();`);
  await tab.key('Escape');
  await tab.key('y');
  await tab.until('state === GameState.CHARACTER_SELECT');
  await tab.ev(`strengthBoost = 0; bossWins = 0; bankBalance = 0; swordRating = 100; swordKind = 'plain'; level2Open = false; mallowWins = 0; level3Open = false; brickWins = 0; armorKind = null; armorRating = 0; level4Open = false; slimeWins = 0; throneUnlocked = false; doorCodes = {}; level5Open = false; moonWins = 0; shieldKind = null; shieldRating = 0; lavaHopHinted = false; dishesMade = []; customRecipes = []`);
  await tab.key('Enter');
  await tab.until('state === GameState.RESUME_PROMPT');
  await tab.shot('resume-prompt');
  await tab.key('r');
  await tab.until('state === GameState.PLAYING');
  tab.note({ step: 'resumed', map: await tab.ev('currentMapPath'), backpack: await tab.ev('backpack.map(i => i.id)'),
    values: await tab.ev(`({ completedUses, dishesMade, customRecipes, strengthBoost, swordRating, swordKind, bossWins, bankBalance, level2Open, mallowWins, level3Open, brickWins, armorKind, armorRating, level4Open, slimeWins, throneUnlocked, doorCodes, level5Open, moonWins, shieldKind, shieldRating, lavaHopHinted })`),
    save: await tab.ev(SAVES_SORTED) });
  await taps(tab);
  await tab.page.close();
}

// The prize wheel after an adventure, then a fight with one of each charm
async function prizeWheel(tab) {
  await tab.ev('wheelLuck = WHEEL_MAX_WINS - WHEEL_LUCK_PER_ADVENTURE; emitGameEvent("adventureDone", {})');
  await tab.until('state === GameState.PRIZE_WHEEL', 'the prize wheel');
  await tab.run(400);
  await tab.shot('wheel-ready');
  tab.note({ step: 'wheel', wins: await tab.ev('wheel.slots.filter(Boolean).length') });
  await tab.key(' ');
  await tab.run(1500);
  await tab.shot('wheel-spinning');
  await tab.run(3000);
  await tab.shot('wheel-landed');
  tab.note({ step: 'wheel-landed', result: await tab.ev('wheel.result'), luck: await tab.ev('wheelLuck'), charms: await tab.ev('charms') });
  await tab.key(' ');
  if (await tab.state() !== 'playing') throw new Error('the prize wheel did not close');
  // Shop gear: a better sword / armor is yours; a worse one polishes yours instead
  const gear = await tab.ev(`(() => {
    swordKind = 'flame'; swordRating = 10; armorKind = null; armorRating = 0;
    const worse = giveWheelSword('sparkle'), keptSword = swordKind, swordAfter = swordRating;
    const better = giveWheelSword('rainbow');
    const armor = giveWheelArmor('chain');
    const r = { keptSword, swordAfter, sword: swordKind, armor: armorKind, armorRating, worse, better, armorText: armor };
    swordKind = 'plain'; swordRating = SWORD_MAX; armorKind = null; armorRating = 0;
    return r;
  })()`);
  tab.note({ step: 'wheel-gear', gear });
  if (gear.keptSword !== 'flame' || gear.swordAfter !== 250 || gear.sword !== 'rainbow' || gear.armor !== 'chain' || gear.armorRating !== 160) {
    throw new Error(`wheel gear prizes went wrong: ${JSON.stringify(gear)}`);
  }
  // A fight with every charm: +4 strength, a bubble, honey, a polished sword
  await tab.ev(`charms = { potion: 1, bubble: 1, honey: 1, polish: 1 }; swordRating = 50; resetMapBoss(); startFight()`);
  const start = await tab.ev('({ strength: fight.p.strength, sword: swordRating, bubbles: fight.charms.bubbles, charms })');
  if (start.strength !== 14 || start.sword !== 100 || start.bubbles !== 2) throw new Error(`charms didn't work: ${JSON.stringify(start)}`);
  await tab.run(2500);
  await tab.shot('fight-charms');
  await tab.ev(`(() => { const r = Math.random; Math.random = () => 0; try { fight.b.x = fight.p.x + 220; fight.p.act = 'idle';
    resolveHit(fight, fight.b, fight.p, 'boss'); } finally { Math.random = r; } })()`);
  await tab.ev('fight.p.strength = 2');
  await tab.run(200);
  const after = await tab.ev('({ bossScore: fight.b.score, bubbles: fight.charms.bubbles, strength: fight.p.strength, charms })');
  tab.note({ step: 'charm-fight', start, after });
  if (after.bossScore !== 0 || after.bubbles !== 1 || after.strength !== 7) throw new Error(`bubble/honey didn't work: ${JSON.stringify(after)}`);
  await tab.ev(`fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(300);
  await tab.shot('fight-charms-result');
  await backToPlaying(tab);
}

// The Second Camp: beating the top-level Blob opens the cave's secret passage;
// through it (with a sidekick) to the Marshmallows; buy a sword; get caught
// with no sword → sent back, and the passage shuts again
async function secondCamp(tab) {
  const L2 = 'assets/camp_level2.json';
  const standAt = id => tab.ev(`(() => { const o = interactiveObjects.find(o => o.id === ${JSON.stringify(id)});
    player.x = o.x + o.width / 2; player.y = o.y + o.height / 2; tapTarget = null; })()`);
  // Win a fight against the level 5 Blob: the passage opens
  await tab.ev(`bossWins = ${5}; resetMapBoss(); startFight(); fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(500);
  await tab.shot('l2-unlocked');
  tab.note({ step: 'l2-unlock', open: await tab.ev('level2Open'), lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await tab.until('state === GameState.PLAYING');
  // A sidekick comes through the cave too
  await tab.ev(`makeSidekick(npcOnThisMap('red_scout'))`);
  await standAt('cave');
  await tab.run(200);
  tab.note({ step: 'l2-cave-hint', near: await tab.ev('nearbyObject && nearbyObject.id') });
  await tab.shot('l2-cave-open');
  await tab.key(' ');
  await tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(L2)}`, 'the second camp');
  await tab.run(2500);
  await tab.shot('l2-arrived');
  tab.note({ step: 'l2-arrived', sidekick: await tab.ev('sidekick && sidekick.npc.id') });
  // Hiding in the swimming pool: they can't come in, and don't catch you
  await tab.ev(`(() => { mallows.foes.forEach(m => { m.homeUntil = 0; }); mallows.graceUntil = 0;
    player.x = 0.6 * scaledMapW; player.y = 0.12 * scaledMapH; tapTarget = null; })()`);
  await tab.run(200);
  await tab.ev(`mallows.foes.forEach(m => { m.where = 'out'; m.outUntil = Infinity; m.fx = 0.47; m.fy = 0.12; m.target = { fx: 0.7, fy: 0.12 }; })`);
  await tab.run(2500);
  const pool = await tab.ev(`({ fighting: state === GameState.FIGHTING, youSafe: inSafeZone(player.x, player.y),
    inPool: mallows.foes.filter(m => { const p = mallowPos(m); return safeZoneAt(p.x, p.y); }).length })`);
  tab.note({ step: 'l2-pool-safe', ...pool });
  if (pool.fighting || !pool.youSafe || pool.inPool) throw new Error(`a Marshmallow got into the pool: ${JSON.stringify(pool)}`);
  await tab.ev(`(() => { const o = interactiveObjects.find(o => o.id === 'cave_exit'); player.x = o.x + o.width / 2; player.y = o.y + o.height + 40;
    mallows.foes.forEach(m => { m.where = 'home'; m.homeUntil = Infinity; m.shout = null; }); })()`);
  await tab.run(200);
  // Out come the Marshmallows; the kid catches you and it's a fight
  await tab.ev('mallows.foes.forEach(m => { m.homeUntil = 0; }); mallows.graceUntil = 0');
  await tab.run(200);
  await tab.ev(`(() => { const m = mallows.foes.find(m => m.def.kid); const p = mallowPos(m); player.x = p.x + 30; player.y = p.y; })()`);
  await tab.until('state === GameState.FIGHTING', 'a Marshmallow fight', 10000);
  await tab.run(3500);
  await tab.shot('l2-fight');
  await tab.ev(`fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(300);
  tab.note({ step: 'l2-won', foe: await tab.ev('fight.foe.id'), lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await tab.until('state === GameState.PLAYING');
  // Ember's Sword Shop: pay with backpack coins, get change
  await tab.ev(`switchMap('assets/sword_shop.json', null)`);
  await tab.until(`state === GameState.PLAYING && currentMapPath === 'assets/sword_shop.json'`);
  await tab.ev(`backpack = backpack.filter(i => !isCoin(i)); backpack.push({ ...BANK_COIN }, { ...BANK_COIN },
    { id: 'twenty_dollar_coin', name: '$20 Coin', emoji: '🪙', coin: true, value: 20 })`);
  await standAt('shop_counter');
  await tab.run(200);
  await tab.key(' ');
  await tab.run(500);
  await tab.page.click('[data-sword=rainbow]');      // too pricey
  await tab.page.click('[data-sword=ice]');
  await tab.run(200);
  await tab.shot('l2-sword-shop');
  tab.note({ step: 'l2-shop', state: await tab.state(), sword: await tab.ev('swordKind + " " + swordRating'),
    wallet: await tab.ev('walletTotal()'), says: await tab.ev("shopSaysEl.textContent") });
  await tab.ev('closeSwordShop()');
  // Caught with no sword: lost straight away, back to the first camp, passage shut
  await tab.ev(`switchMap(${JSON.stringify(L2)}, 'cave_exit')`);
  await tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(L2)}`);
  await tab.run(300);
  await tab.ev(`swordRating = 0; backpack = backpack.filter(i => i.id !== 'sword');
    mallows.foes.forEach(m => { m.homeUntil = 0; }); mallows.graceUntil = 0`);
  await tab.run(200);
  await tab.ev(`(() => { const m = mallows.foes.find(m => !m.def.kid); const p = mallowPos(m); player.x = p.x + 30; player.y = p.y;
    mallows.foes.filter(o => o !== m).forEach(o => { o.where = 'home'; o.homeUntil = Infinity; }); })()`);
  await tab.until(`state === GameState.FIGHTING && fight.phase === 'result'`, 'an instant loss', 10000);
  await tab.shot('l2-no-sword');
  tab.note({ step: 'l2-no-sword', lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await tab.until(`state === GameState.PLAYING && currentMapPath === 'assets/game_design.json'`, 'back at the first camp');
  tab.note({ step: 'l2-sent-back', open: await tab.ev('level2Open') });
  await tab.ev('swordKind = "plain"; swordRating = 100; writeSave()');
}

// The Third Camp: beating the top-level Mega Mallow opens the passage in its
// hole; the poison moat sends you back; buy armor; fight the Brick in its
// castle (armor stops some hits); get caught with no sword → back to the
// Second Camp, and the passage shuts again
async function thirdCamp(tab) {
  const L2 = 'assets/camp_level2.json', L3 = 'assets/camp_level3.json', CASTLE = 'assets/level3_castle.json';
  const standAt = id => tab.ev(`(() => { const o = interactiveObjects.find(o => o.id === ${JSON.stringify(id)});
    player.x = o.x + o.width / 2; player.y = o.y + o.height / 2; tapTarget = null; })()`);
  const onMap = (p, what) => tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(p)}`, what || p);
  // Beat the level 10 Mega Mallow: the hole opens
  await tab.ev(`level2Open = true; switchMap(${JSON.stringify(L2)}, 'cave_exit')`);
  await onMap(L2);
  await tab.run(300);
  await tab.ev(`mallowWins = 4; startFight(mallowFoe(mallows.foes.find(m => !m.def.kid))); fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(500);
  await tab.shot('l3-unlocked');
  tab.note({ step: 'l3-unlock', open: await tab.ev('level3Open'), lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await tab.until('state === GameState.PLAYING');
  await tab.ev('mallows.foes.forEach(m => { m.where = "home"; m.homeUntil = Infinity; })');
  await standAt('blob_zone');
  await tab.run(200);
  tab.note({ step: 'l3-hole-hint', near: await tab.ev('nearbyObject && nearbyObject.id') });
  await tab.shot('l3-hole-open');
  await tab.key(' ');
  await onMap(L3, 'the third camp');
  await tab.run(2500);
  await tab.shot('l3-arrived');
  // The poison moat: a countdown, then back to the Second Camp (the passage stays open)
  await tab.ev('player.x = scaledMapW * 0.27; player.y = scaledMapH * 0.53');
  await tab.run(1500);
  await tab.shot('l3-moat');
  tab.note({ step: 'l3-moat', inMoat: await tab.ev('inPoisonMoat(player.x, player.y)'), ms: await tab.ev('Math.round(moat.ms)') });
  await tab.ev('moat.ms = moatLimitMs() - 200');
  await tab.run(500);
  await onMap(L2, 'washed back to the second camp');
  tab.note({ step: 'l3-moat-sent-back', open: await tab.ev('level3Open') });
  // Shelly's Armor Shop: pay with backpack coins
  await tab.ev(`switchMap('assets/armor_shop.json', null)`);
  await onMap('assets/armor_shop.json');
  await tab.ev(`backpack = backpack.filter(i => !isCoin(i)); backpack.push({ ...BANK_COIN }, { ...BANK_COIN },
    { id: 'thirty_dollar_coin', name: '$30 Coin', emoji: '🪙', coin: true, value: 30 }, { ...BANK_COIN }, { ...BANK_COIN }, { ...BANK_COIN })`);
  await standAt('shop_counter');
  await tab.run(200);
  await tab.key(' ');
  await tab.run(500);
  await tab.page.click('[data-armor=crystal]');      // too pricey
  await tab.page.click('[data-armor=knight]');
  await tab.run(200);
  await tab.shot('l3-armor-shop');
  tab.note({ step: 'l3-shop', state: await tab.state(), armor: await tab.ev('armorKind + " " + armorRating'),
    wallet: await tab.ev('walletTotal()'), says: await tab.ev('armorSaysEl.textContent') });
  await tab.ev('closeArmorShop()');
  // Into the castle: the Brick gets off its throne and catches you
  await tab.ev(`switchMap(${JSON.stringify(L3)}, 'hole_back')`);
  await onMap(L3);
  await standAt('castle_door');
  await tab.run(200);
  await tab.key(' ');
  await onMap(CASTLE, 'the castle');
  await tab.run(500);
  await tab.shot('l3-castle');
  await tab.ev('brick.graceUntil = 0; player.x = scaledMapW * 0.5; player.y = scaledMapH * 0.8');
  await tab.until('state === GameState.FIGHTING', 'a Brick fight', 15000);
  await tab.run(3500);
  await tab.shot('l3-fight');
  // A hit on you: the armor stops it (forced), or it lands
  await tab.ev(`(() => { const r = Math.random; Math.random = () => 0; try { fight.b.x = fight.p.x + 220; fight.p.act = 'idle';
    resolveHit(fight, fight.b, fight.p, 'boss'); } finally { Math.random = r; } })()`);
  await tab.run(200);
  tab.note({ step: 'l3-armor-hit', bossScore: await tab.ev('fight.b.score'), armor: await tab.ev('armorRating') });
  await tab.ev(`fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(300);
  await tab.shot('l3-won');
  tab.note({ step: 'l3-won', wins: await tab.ev('brickWins'), lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await tab.until('state === GameState.PLAYING');
  // Caught with no sword: lost straight away, back to the Second Camp, passage shut
  await tab.ev(`swordRating = 0; backpack = backpack.filter(i => i.id !== 'sword'); brick.restUntil = 0; brick.graceUntil = 0;
    player.x = scaledMapW * 0.5; player.y = scaledMapH * 0.8`);
  await tab.until(`state === GameState.FIGHTING && fight.phase === 'result'`, 'an instant loss to the Brick', 15000);
  await tab.shot('l3-no-sword');
  tab.note({ step: 'l3-no-sword', lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await onMap(L2, 'back at the second camp');
  tab.note({ step: 'l3-sent-back', open: await tab.ev('level3Open') });
  await tab.ev(`swordKind = "plain"; swordRating = 100; armorKind = null; armorRating = 0; level2Open = false; mallowWins = 0;
    brickWins = 0; mallows.foes.forEach(m => { m.where = 'home'; m.homeUntil = Infinity; }); writeSave()`);
  await tab.ev(`switchMap('assets/game_design.json', 'cave')`);
  await onMap('assets/game_design.json');
}

// The Fourth Camp: beating the top-level Brick opens the castle's trapdoor;
// the slime pit slows you down; the code finder in the Safe Zone; a wrong and
// a right code at the bank's keypad; the Slime Brick catches you while you're
// typing a code (and you beat it); the throne key; Charlie's shop sells the
// Fourth Camp's own swords and armor (Ember's doesn't); caught with no sword →
// back to the Third Camp, and the trapdoor shuts again
async function fourthCamp(tab) {
  const L3 = 'assets/camp_level3.json', L4 = 'assets/camp_level4.json', CASTLE = 'assets/level3_castle.json';
  const standAt = (id, fy = 0.5) => tab.ev(`(() => { const o = interactiveObjects.find(o => o.id === ${JSON.stringify(id)});
    player.x = o.x + o.width / 2; player.y = o.y + o.height * ${fy}; tapTarget = null; })()`);
  const onMap = (p, what) => tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(p)}`, what || p);
  // Beat the level 15 Brick: the trapdoor opens
  await tab.ev(`level2Open = true; level3Open = true; switchMap(${JSON.stringify(CASTLE)}, 'exit_door')`);
  await onMap(CASTLE);
  await tab.run(300);
  await tab.ev(`brickWins = 4; startFight(brickFoe()); fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(500);
  tab.note({ step: 'l4-unlock', open: await tab.ev('level4Open'), lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await tab.until('state === GameState.PLAYING');
  await tab.ev('brick.restUntil = Infinity');
  await standAt('trapdoor');
  await tab.run(200);
  tab.note({ step: 'l4-trapdoor', near: await tab.ev('nearbyObject && nearbyObject.id') });
  await tab.shot('l4-trapdoor-open');
  await tab.key(' ');
  await onMap(L4, 'the fourth camp');
  await tab.ev('slime.restUntil = Infinity');
  await tab.run(2500);
  await tab.shot('l4-arrived');
  // The slime pit: slower
  await tab.ev('player.x = scaledMapW * 0.51; player.y = scaledMapH * 0.33');
  await tab.run(300);
  tab.note({ step: 'l4-pit', speed: await tab.ev('playerSpeedFactor()'), inPit: await tab.ev('inSlimePit(player.x, player.y)') });
  await tab.shot('l4-slime-pit');
  // The code finder in the Safe Zone
  await standAt('safe_zone', 0.8);
  await tab.run(200);
  await tab.key(' ');
  await onMap('assets/level4_safe_zone.json');
  await standAt('code_finder', 0.9);
  await tab.run(200);
  await tab.key(' ');
  await tab.run(500);
  await tab.page.click('[data-lock=bank]');
  await tab.run(200);
  await tab.shot('l4-code-finder');
  tab.note({ step: 'l4-code-finder', state: await tab.state(), says: await tab.ev('keeperSaysEl.textContent'),
    asked: await tab.ev(`npcGameAnswer({ knowsCodes: true }, "what's the code for the girls bathroom?")`),
    notCode: await tab.ev(`npcGameAnswer({ knowsCodes: true }, 'where is the sword?')`) });
  await tab.ev('closeCodeKeeper()');
  // The bank's keypad: a wrong code, then the right one
  await tab.ev(`switchMap(${JSON.stringify(L4)}, 'safe_zone')`);
  await onMap(L4);
  await standAt('bank', 0.8);
  await tab.run(200);
  await tab.key(' ');
  await tab.run(300);
  await tab.page.fill('#codePadInput', 'zzz');
  await tab.page.press('#codePadInput', 'Enter');
  await tab.run(300);
  await tab.shot('l4-keypad-wrong');
  tab.note({ step: 'l4-keypad-wrong', state: await tab.state(), says: await tab.ev('codePadSays.textContent') });
  await tab.page.fill('#codePadInput', await tab.ev(`codeFor('bank').toLowerCase()`));
  await tab.page.press('#codePadInput', 'Enter');
  await onMap('assets/camp_bank.json', 'into the bank with its code');
  // Typing at the boys' bathroom: the Slime Brick catches you anyway, and you win
  await tab.ev(`switchMap(${JSON.stringify(L4)}, 'boys_bathroom')`);
  await onMap(L4);
  await standAt('boys_bathroom', 0.8);
  await tab.run(200);
  await tab.key(' ');
  await tab.run(200);
  await tab.page.fill('#codePadInput', 'AB');
  await tab.ev(`slime.restUntil = 0; slime.where = 'out'; slime.outUntil = Infinity; slime.graceUntil = 0;
    slime.fx = (player.x + 300) / scaledMapW; slime.fy = player.y / scaledMapH`);
  await tab.run(600);
  await tab.shot('l4-keypad-slime');
  await tab.until('state === GameState.FIGHTING', 'the Slime Brick catches you at the keypad', 15000);
  tab.note({ step: 'l4-caught-typing', padHidden: await tab.ev('codePadEl.hidden') });
  await tab.run(3500);
  await tab.shot('l4-fight');
  await tab.ev(`fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(300);
  await tab.shot('l4-won');
  tab.note({ step: 'l4-won', wins: await tab.ev('slimeWins'), lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await tab.until('state === GameState.PLAYING');
  await tab.ev('slime.restUntil = Infinity; slime.where = "home"');
  // The throne: locked without the key; take it off its hook, and in you go
  await standAt('throne', 0.85);
  await tab.run(200);
  await tab.key(' ');
  await tab.run(800);
  tab.note({ step: 'l4-throne-locked', map: await tab.ev('currentMapPath'), unlocked: await tab.ev('throneUnlocked') });
  await tab.ev(`pickUpHotspotItem('key_hook', 0)`);
  await tab.run(200);
  await tab.shot('l4-key-taken');
  await standAt('throne', 0.85);
  await tab.run(200);
  await tab.key(' ');
  await onMap('assets/level4_throne.json', 'into the throne room');
  await tab.run(1500);
  await tab.shot('l4-throne-room');
  tab.note({ step: 'l4-throne', unlocked: await tab.ev('throneUnlocked'), keyInPack: await tab.ev(`backpack.some(i => i.id === 'throne_key')`) });
  // Charlie sells the Fourth Camp's own swords and armor; Ember and Shelly don't
  tab.note({ step: 'l4-gear',
    charlie: await tab.ev(`swordsForSale({ sells: 'all' }).map(([id]) => id).concat(armorForSale({ sells: 'all' }).map(([id]) => id))`),
    ember: await tab.ev(`swordsForSale({}).map(([id]) => id)`), shelly: await tab.ev(`armorForSale({}).map(([id]) => id)`) });
  // Caught with no sword: lost straight away, back to the Third Camp, trapdoor shut
  await tab.ev(`switchMap(${JSON.stringify(L4)}, 'throne')`);
  await onMap(L4);
  await tab.ev(`swordRating = 0; backpack = backpack.filter(i => i.id !== 'sword'); slime.restUntil = 0; slime.where = 'out';
    slime.outUntil = Infinity; slime.graceUntil = 0; slime.fx = (player.x + 200) / scaledMapW; slime.fy = player.y / scaledMapH`);
  await tab.until(`state === GameState.FIGHTING && fight.phase === 'result'`, 'an instant loss to the Slime Brick', 15000);
  tab.note({ step: 'l4-no-sword', lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await onMap(L3, 'back at the third camp');
  tab.note({ step: 'l4-sent-back', open: await tab.ev('level4Open') });
  await tab.ev(`swordKind = "plain"; swordRating = 100; level2Open = false; level3Open = false; mallowWins = 0; brickWins = 0;
    slimeWins = 0; throneUnlocked = false; brick.restUntil = 0; slime.restUntil = 0; writeSave()`);
  await tab.ev(`switchMap('assets/game_design.json', 'cave')`);
  await onMap('assets/game_design.json');
}

// The Fifth Camp: beating the top-level Slime Brick opens the throne room's
// portal; hopping across the lava with J (and a tap); J is still the journal
// away from the lava; 3 seconds in the lava sends you back to the Fourth Camp;
// the robot's codes; Charlie's shields (and the Fifth Camp's own sword and
// armor, only sold here); the Moon catches you (U: it can't freeze you) and
// you win; three missed swings in a row freeze you; running away sends you
// back with the portal shut
async function fifthCamp(tab) {
  const L4 = 'assets/camp_level4.json', L5 = 'assets/camp_level5.json', THRONE = 'assets/level4_throne.json';
  const standAt = (id, fy = 0.5) => tab.ev(`(() => { const o = interactiveObjects.find(o => o.id === ${JSON.stringify(id)});
    player.x = o.x + o.width / 2; player.y = o.y + o.height * ${fy}; tapTarget = null; })()`);
  const onMap = (p, what) => tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(p)}`, what || p);
  const check = (ok, what) => { if (!ok) errors.push(`[fifth camp] ${what}`); };
  // Beat the level 20 Slime Brick: the portal opens
  await tab.ev(`level2Open = true; level3Open = true; level4Open = true; switchMap(${JSON.stringify(L4)}, 'throne')`);
  await onMap(L4);
  await tab.ev('slime.restUntil = Infinity');
  await tab.run(300);
  await tab.ev(`slimeWins = 4; startFight(slimeFoe(false)); fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(500);
  tab.note({ step: 'l5-unlock', open: await tab.ev('level5Open'), lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  check(await tab.ev('level5Open'), 'beating the level 20 Slime Brick didn\'t open the portal');
  await tab.key(' ');
  await tab.until('state === GameState.PLAYING');
  await tab.ev(`switchMap(${JSON.stringify(THRONE)}, 'exit_door')`);
  await onMap(THRONE);
  await standAt('level5_portal');
  await tab.run(200);
  await tab.shot('l5-portal-open');
  await tab.key(' ');
  await onMap(L5, 'the fifth camp');
  await tab.ev('moon.restUntil = Infinity');
  await tab.run(2500);
  await tab.shot('l5-arrived');
  // Onto a rock: the hint; J hops to the next one (not the journal)
  await tab.ev(`(() => { const r = lavaCfg().rocks.find(r => Math.abs(r.cx - 0.31) < 0.01);
    player.x = r.cx * scaledMapW; player.y = r.cy * scaledMapH; tapTarget = null; })()`);
  await tab.run(300);
  await tab.shot('l5-on-rock');
  const before = await tab.ev('({ x: player.x, y: player.y, hinted: lavaHopHinted })');
  await tab.ev('hop.dirX = 0; hop.dirY = -1');
  await tab.key('j');
  await tab.run(150);
  await tab.shot('l5-hopping');
  await tab.run(500);
  const after = await tab.ev('({ x: player.x, y: player.y, lava: inLava(player.x, player.y), rock: !!rockAt(player.x, player.y), journal: journalOpen })');
  tab.note({ step: 'l5-hop', before, after });
  check(before.hinted && after.rock && !after.lava && !after.journal && after.y < before.y, `hopping with J: ${JSON.stringify({ before, after })}`);
  // Tap a rock in reach: hop there
  const tapped = await tab.ev(`(() => { const here = rockAt(player.x, player.y);
    const r = lavaCfg().rocks.find(r => r !== here && Math.hypot(r.cx * scaledMapW - player.x, r.cy * scaledMapH - player.y) < hopReach() * 0.9);
    playingTap(r.cx * scaledMapW - camera.x, r.cy * scaledMapH - camera.y); return r; })()`);
  await tab.run(600);
  const afterTap = await tab.ev('({ x: player.x, y: player.y, rock: rockAt(player.x, player.y) })');
  tab.note({ step: 'l5-tap-hop', tapped, afterTap });
  check(afterTap.rock && afterTap.rock.cx === tapped.cx && afterTap.rock.cy === tapped.cy, 'tapping a rock didn\'t hop onto it');
  // Away from the lava, J is the journal
  await standAt('safe_zone', 1.1);
  await tab.run(100);
  await tab.key('j');
  tab.note({ step: 'l5-journal', open: await tab.ev('journalOpen') });
  check(await tab.ev('journalOpen'), 'J away from the lava should open the journal');
  await tab.key('j');
  // Into the lava: 3 seconds, then back to the Fourth Camp (the portal stays open)
  await tab.ev('player.x = scaledMapW * 0.5; player.y = scaledMapH * 0.55; tapTarget = null');
  await tab.run(1200);
  await tab.shot('l5-lava');
  tab.note({ step: 'l5-lava', inLava: await tab.ev('inLava(player.x, player.y)'), ms: await tab.ev('lava.ms') });
  await onMap(THRONE, 'sent back by the lava');
  tab.note({ step: 'l5-lava-sent-back', open: await tab.ev('level5Open') });
  // The robot in the Safe Zone knows the codes
  await tab.ev(`switchMap('assets/level5_safe_zone.json', 'exit_door')`);
  await onMap('assets/level5_safe_zone.json');
  await standAt('code_finder', 0.9);
  await tab.run(200);
  await tab.key(' ');
  await tab.run(500);
  await tab.page.click('[data-lock=moon_palace]');
  await tab.run(200);
  await tab.shot('l5-code-robot');
  tab.note({ step: 'l5-code-robot', says: await tab.ev('keeperSaysEl.textContent'),
    asked: await tab.ev(`npcGameAnswer({ knowsCodes: true }, "what's the code for the moon palace?")`) });
  await tab.ev('closeCodeKeeper()');
  // The palace's keypad, with the robot's code
  await tab.ev(`switchMap(${JSON.stringify(L5)}, 'moon_palace')`);
  await onMap(L5);
  await tab.ev('moon.restUntil = Infinity');
  await standAt('moon_palace', 0.9);
  await tab.run(200);
  await tab.key(' ');
  await tab.run(300);
  await tab.page.fill('#codePadInput', await tab.ev(`codeFor('moon_palace').toLowerCase()`));
  await tab.page.press('#codePadInput', 'Enter');
  await onMap('assets/level5_palace.json', 'into the Moon\'s Palace with its code');
  await tab.run(1500);
  await tab.shot('l5-palace');
  // Charlie's shields: buy the wooden one with a $50 coin ($10 change)
  await tab.ev(`switchMap('assets/level5_shop.json', 'exit_door')`);
  await onMap('assets/level5_shop.json');
  await tab.ev(`backpack.push({ id: 'fifty_dollar_coin', name: '$50 Coin', emoji: '🪙', coin: true, value: 50 })`);
  await standAt('shield_counter', 0.7);
  await tab.run(200);
  await tab.key(' ');
  await tab.run(400);
  await tab.page.click('[data-shield=wood]');
  await tab.run(200);
  await tab.shot('l5-shield-shop');
  const bought = await tab.ev(`({ kind: shieldKind, rating: shieldRating, coins: backpack.filter(isCoin).map(c => c.value), state })`);
  tab.note({ step: 'l5-shield', bought, says: await tab.ev('shieldSaysEl.textContent') });
  check(bought.kind === 'wood' && bought.coins.join() === '10', `buying a shield: ${JSON.stringify(bought)}`);
  await tab.ev('closeShieldShop()');
  tab.note({ step: 'l5-gear',
    charlie5: await tab.ev(`swordsForSale({ sells: 'all' }).map(([id]) => id).concat(armorForSale({ sells: 'all' }).map(([id]) => id))`),
    charlie4: await tab.ev(`(() => { const c = allMapConfigs['assets/level4_shop.json'] || {}; return JSON.stringify((c.hotspots || []).map(h => (h.swordShop || h.armorShop || {}).sells).filter(Boolean)); })()`),
    ember: await tab.ev(`swordsForSale({}).map(([id]) => id)`) });
  // The Moon catches you; U during the intro: no freezing; and you win
  await tab.ev(`switchMap(${JSON.stringify(L5)}, 'moon_palace')`);
  await onMap(L5);
  await tab.ev(`moon.map = currentMapPath; moon.restUntil = 0; moon.where = 'out'; moon.outUntil = Infinity; moon.graceUntil = 0;
    moon.fx = (player.x + 300) / scaledMapW; moon.fy = player.y / scaledMapH`);
  await tab.run(400);
  await tab.shot('l5-moon-map');
  await tab.until('state === GameState.FIGHTING', 'the Moon catches you', 15000);
  await tab.run(500);
  await tab.key('u');
  tab.note({ step: 'l5-cheat', proof: await tab.ev('!!(fight.moonFreeze && fight.moonFreeze.proof)') });
  check(await tab.ev('!!(fight.moonFreeze && fight.moonFreeze.proof)'), 'U at the start of the Moon fight didn\'t work');
  await tab.run(2500);
  await tab.shot('l5-fight');
  await tab.ev(`fight.winner = 'player'; fight.p.score = fight.toWin; finishFight(false)`);
  await tab.run(300);
  await tab.shot('l5-won');
  tab.note({ step: 'l5-won', wins: await tab.ev('moonWins'), lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await tab.until('state === GameState.PLAYING');
  // Three swings that miss in a row: frozen
  await tab.ev('moon.restUntil = Infinity; moon.where = "home"; startFight(moonFoe(false))');
  await tab.run(2400);
  await tab.ev(`fight.p.x = 150; fight.b.x = 880; fight.b.ai = 'wait'; fight.bossThinkAt = Infinity`);
  for (let i = 0; i < 3; i++) { await tab.key(' '); await tab.run(700); }
  await tab.shot('l5-frozen');
  const frozen = await tab.ev(`({ act: fight.p.act, left: fight.p.frozenUntil - performance.now() })`);
  tab.note({ step: 'l5-frozen', frozen });
  check(frozen.act === 'frozen' && frozen.left > 0, `three missed swings should freeze you: ${JSON.stringify(frozen)}`);
  // Run away: back to the Fourth Camp, and the portal shuts
  await tab.run(3000);
  await tab.key('Escape');
  await tab.run(300);
  tab.note({ step: 'l5-fled', lines: await tab.ev('fight.result.lines.map(l => l.text || l)') });
  await tab.key(' ');
  await onMap(L4, 'back at the fourth camp');
  tab.note({ step: 'l5-sent-back', open: await tab.ev('level5Open') });
  check(!await tab.ev('level5Open'), 'losing to the Moon should shut the portal');
  await tab.ev(`swordKind = "plain"; swordRating = 100; level2Open = false; level3Open = false; level4Open = false; mallowWins = 0; brickWins = 0;
    slimeWins = 0; moonWins = 0; shieldKind = null; shieldRating = 0; lavaHopHinted = false; backpack = backpack.filter(i => !isCoin(i));
    slime.restUntil = 0; moon.restUntil = 0; writeSave()`);
  await tab.ev(`switchMap('assets/game_design.json', 'cave')`);
  await onMap('assets/game_design.json');
}

// Exploration mode (E): no bosses, and the cave passage opens without beating the Blob
async function exploration(tab) {
  const L2 = 'assets/camp_level2.json';
  const standAt = id => tab.ev(`(() => { const o = interactiveObjects.find(o => o.id === ${JSON.stringify(id)});
    player.x = o.x + o.width / 2; player.y = o.y + o.height / 2; tapTarget = null; })()`);
  await tab.key('e');
  await standAt('cave');
  await tab.run(300);
  await tab.shot('explore-on');
  tab.note({ step: 'explore-on', on: await tab.ev('exploreMode'), open: await tab.ev('level2Open'),
    blob: await tab.ev('mapBossVisible()') });
  await tab.key(' ');
  await tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(L2)}`, 'the second camp, exploring');
  // The Marshmallows stay home, even right next to their lair
  await tab.ev('mallows.graceUntil = 0');
  await standAt('blob_zone');
  await tab.run(3000);
  tab.note({ step: 'explore-l2', state: await tab.state(), out: await tab.ev('mallowsOut().length') });
  await tab.shot('explore-l2');
  await tab.key('e');
  await tab.run(300);
  tab.note({ step: 'explore-off', on: await tab.ev('exploreMode') });
  await tab.ev(`switchMap('assets/game_design.json', 'cave')`);
  await tab.until(`state === GameState.PLAYING && currentMapPath === 'assets/game_design.json'`);
}

// Adventures (the journal): every level past the first has its own, done with
// that level's items; the same spot on two maps (every camp has a bathroom)
// counts twice; an older save's entries go to the lowest-level map
async function adventures(tab) {
  const MIN_PER_LEVEL = 15;
  const perLevel = await tab.ev(`(async () => {
    const configs = await crawlMapConfigs(), levels = mapLevels(configs), out = {};
    const itemsOn = {};   // level → itemId → spot ids it starts at
    for (const [path, cfg] of Object.entries(configs)) {
      const n = levelOfMap(levels, path), m = itemsOn[n] || (itemsOn[n] = {});
      for (const h of cfg.hotspots) for (const it of h.items || []) (m[it.id] || (m[it.id] = new Set())).add(h.id);
    }
    for (const [path, cfg] of Object.entries(configs)) {
      const n = levelOfMap(levels, path);
      for (const h of cfg.hotspots) for (const u of h.uses || []) {
        const from = itemsOn[n][u.itemId];
        if (from && !from.has(h.id)) out[n] = (out[n] || 0) + 1;
      }
    }
    return { out, max: levels.max };
  })()`);
  tab.note({ step: 'adventures-per-level', ...perLevel });
  for (let n = 2; n <= perLevel.max; n++) {
    if ((perLevel.out[n] || 0) < MIN_PER_LEVEL) {
      errors.push(`Level ${n} has only ${perLevel.out[n] || 0} adventures done with its own items (want ${MIN_PER_LEVEL}+)`);
    }
  }

  const BATH1 = 'assets/camp_bathroom.json', BATH2 = 'assets/level2_boys_bathroom.json';
  const useAt = async (mapPath, spot, item) => {
    await tab.ev(`switchMap(${JSON.stringify(mapPath)}, null)`);
    await tab.until(`state === GameState.PLAYING && currentMapPath === ${JSON.stringify(mapPath)}`, `map ${mapPath}`);
    const before = await tab.ev(`isUseAlreadyDone(${JSON.stringify(item.id)}, ${JSON.stringify(spot)})`);
    await tab.ev(`(() => { backpack = [${JSON.stringify({ ...item, pickedUpFrom: 'nowhere' })}];
      nearbyObject = interactiveObjects.find(o => o.id === ${JSON.stringify(spot)}); useItem(backpack[0]); })()`);
    tab.note({ step: 'adventure-used', map: mapPath, spot, before, state: await tab.state() });
    await backToPlaying(tab);
    if (before) errors.push(`${item.id} at ${spot} on ${mapPath} was already done before using it`);
  };
  const saved = await tab.ev('({ backpack, completedUses })');
  await tab.ev('completedUses = []');
  const glass = { id: 'magnifying_glass', name: 'Magnifying Glass', emoji: '🔍' };
  await useAt(BATH1, 'spider_corner', glass);
  await useAt(BATH2, 'spider_corner', glass);
  const maps = await tab.ev('completedUses.map(u => u.map)');
  tab.note({ step: 'adventures-two-bathrooms', maps });
  if (maps.join() !== [BATH1, BATH2].join()) errors.push(`the same adventure in two bathrooms: ${JSON.stringify(maps)}`);

  // An older save's entry (no map) belongs to the first camp's bathroom
  const legacy = await tab.ev(`(async () => {
    completedUses = [{ hotspotId: 'spider_corner', hotspotName: 'Spider Corner', itemId: 'flashlight', itemName: 'Flashlight', itemEmoji: '🔦', text: 'Eek!' }];
    assignLegacyUseMaps(await crawlMapConfigs());
    return { map: completedUses[0].map, doneHere: isUseAlreadyDone('flashlight', 'spider_corner'), doneThere: isUseAlreadyDone('flashlight', 'spider_corner', ${JSON.stringify(BATH1)}) };
  })()`);
  tab.note({ step: 'adventures-legacy', ...legacy });
  if (legacy.map !== BATH1 || legacy.doneHere || !legacy.doneThere) errors.push(`an older save's adventure: ${JSON.stringify(legacy)}`);

  await tab.ev(`backpack = ${JSON.stringify(saved.backpack)}; completedUses = ${JSON.stringify(saved.completedUses)}; writeSave()`);
  await tab.ev(`switchMap('assets/game_design.json', null)`);
  await tab.until(`state === GameState.PLAYING && currentMapPath === 'assets/game_design.json'`);
}

// The play-time limit: run out walking → the break; a grown-up's code and the
// slider; a used code; the developer skip; running out mid-fight; the hour's up
async function playtime(tab) {
  const info = () => tab.ev(`({ state, left: playtimeLeft(), blocked: playtimeBlocked() })`);
  tab.note({ step: 'playtime-start', ...await info() });
  const codeNow = () => tab.ev('totpCode(totpStepAt(Date.now()))');
  const submitCode = async code => {
    await tab.page.fill('#ptCodeInput', code);
    await tab.page.press('#ptCodeInput', 'Enter');
    await tab.run(300);
  };
  // It keeps counting for PLAYTIME_IDLE_MS after your last key press, tap or
  // step, then standing still doesn't count; walking does
  // (you stopped 8 seconds ago, so 2 more count, then 2 don't)
  await tab.ev('playtimeSet(60000); ptActiveAt = performance.now() - 8000');
  await tab.run(1000);
  const grace = await info();
  tab.note({ step: 'playtime-grace', ...grace });
  await tab.run(1500);
  const idle = await info();
  await tab.run(2000);
  const still = await info();
  tab.note({ step: 'playtime-still', ...still });
  if (grace.left > 59500 || idle.left > 58200 || still.left !== idle.left) {
    throw new Error(`play time idle pause went wrong: ${JSON.stringify({ grace, idle, still })}`);
  }
  // A menu counts too: opening the journal is a key press, and time in it counts
  await tab.key('j');
  await tab.run(2000);
  const menu = await info();
  await tab.key('j');
  tab.note({ step: 'playtime-menu', ...menu });
  if (still.left - menu.left < 1900) throw new Error(`play time didn't count in the journal: ${JSON.stringify({ still, menu })}`);
  await tab.ev('playtimeSet(1500)');
  await tab.page.keyboard.down('ArrowLeft');
  await tab.until('state === GameState.PLAYTIME_BLOCKED', 'the break screen');
  await tab.page.keyboard.up('ArrowLeft');
  await tab.run(300);
  await tab.shot('playtime-break');
  await tab.page.click('[data-pt=code]');
  await tab.run(200);
  const right = await codeNow();
  await submitCode(String((Number(right) + 1) % 1000000).padStart(6, '0'));
  tab.note({ step: 'playtime-wrong', error: await tab.ev('ptCodeError.textContent') });
  await submitCode(right);
  await tab.until('!document.getElementById("ptGrant").hidden', 'the more-time slider');
  await tab.page.fill('#ptGrantSlider', '35');
  await tab.run(100);
  await tab.shot('playtime-grant');
  await tab.page.click('#ptGrant button[type=submit]');
  await tab.run(300);
  tab.note({ step: 'playtime-granted', ...await info() });
  // The same code can't be used twice; the developer skip works on localhost
  await tab.ev('playtimeSet(0)');
  await tab.until('state === GameState.PLAYTIME_BLOCKED', 'the break screen again');
  await tab.page.click('[data-pt=code]');
  await submitCode(right);
  tab.note({ step: 'playtime-reused', error: await tab.ev('ptCodeError.textContent') });
  await tab.page.click('[data-pt=rest]');
  await tab.page.click('[data-pt=dev]');
  await tab.run(300);
  tab.note({ step: 'playtime-dev-skip', ...await info() });
  // Running out in a fight: the fight finishes, then the break
  await tab.ev('playtimeSet(500); resetMapBoss(); startFight()');
  await tab.run(3500);
  tab.note({ step: 'playtime-fight', ...await info() });
  await tab.key('Escape');
  await tab.run(2500);
  await tab.key(' ');
  await tab.run(300);
  tab.note({ step: 'playtime-after-fight', ...await info() });
  // An hour later the break is over by itself
  await tab.ev(`(() => { const d = JSON.parse(localStorage.getItem(PLAYTIME_KEY));
    d.blockedAt = Date.now() - PLAYTIME_BLOCK_MS; localStorage.setItem(PLAYTIME_KEY, JSON.stringify(d)); })()`);
  await tab.until('state === GameState.PLAYING', 'the break to end');
  tab.note({ step: 'playtime-reset', ...await info() });
  await tab.shot('playtime-reset');
}

// Clicking / tapping instead of keys (the same code handles touch)
async function taps(tab) {
  const click = async (xy, what) => {
    const p = await tab.ev(xy);
    await tab.page.mouse.click(p.x, p.y);
    await tab.run(300);
    tab.note({ tap: what, state: await tab.state() });
  };
  const centre = r => `(() => { const r = ${r}; return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; })()`;
  const playerOnScreen = `({ x: player.x - camera.x, y: player.y - player.height / 2 - camera.y })`;

  await tab.ev('switchMap("assets/game_design.json", null)');
  await tab.until('state === GameState.PLAYING && currentMapPath === "assets/game_design.json"');
  await tab.run(2500);
  // Tap the map: walk there
  await click('({ x: 300, y: 500 })', 'walk');
  await tab.run(2000);
  tab.note({ tap: 'walked', x: await tab.ev('Math.round(player.x)'), y: await tab.ev('Math.round(player.y)') });
  // Stand at a hotspot with items, tap yourself: its dialog opens; tap again: it closes
  await tab.ev(`(() => { const o = interactiveObjects.find(o => (hotspotItems[o.id] || []).length && !o.targetMap && !o.station && !o.bank);
    player.x = o.x + o.width / 2; player.y = o.y + o.height / 2; tapTarget = null; })()`);
  await tab.run(2500);
  await click(playerOnScreen, 'tap self at hotspot');
  await tab.shot('tap-interaction');
  await click('({ x: 20, y: 400 })', 'tap to close dialog');
  // Backpack: open it, tap the hotspot's first item, then the first button
  await tab.key('b');
  await tab.run(100);
  await click(centre('backpackSlotRects.hotspot[0]'), 'tap item at hotspot');
  await tab.shot('tap-item-action');
  if (await tab.state() === 'itemAction') {
    await click(centre('itemActionButtonRects.find(r => !r.disabled)'), 'tap item button');
    tab.note({ tap: 'after item button', backpack: await tab.ev('backpack.map(i => i.id)') });
  }
  await backToPlaying(tab);
  if (await tab.ev('backpackOpen')) await tab.key('b');
  // Menu → No, then Menu → Yes
  const confirmBtn = yes => `(() => { const panelH = 150, panelY = canvas.height / 2 - panelH / 2;
    return { x: canvas.width / 2 + (${yes} ? -50 : 50), y: panelY + panelH - 34 }; })()`;
  await tab.key('Escape');
  await click(confirmBtn(false), 'confirm: no');
  await tab.key('Escape');
  await click(confirmBtn(true), 'confirm: yes');
  // Character select: tap Blue Explorer (no save → straight in), then back out
  const charAt = i => `(() => { for (let y = 0; y < canvas.height; y += 10) for (let x = 0; x < canvas.width; x += 10)
    if (getHoveredCharacter(x, y) === ${i}) return { x: x + 15, y: y + 15 }; return null; })()`;
  await click(charAt(3), 'pick a camper');
  await tab.until('state === GameState.PLAYING');
  await tab.key('Escape');
  await tab.key('y');
  // Green Girl has a save: tap Resume
  await click(charAt(0), 'pick a camper with a save');
  await tab.shot('tap-resume-prompt');
  await click(centre(`resumePromptButtonRects().find(b => b.id === 'resume')`), 'resume');
  await tab.until('state === GameState.PLAYING');
  await tab.key('Escape');
  await tab.key('y');
  await click(centre('charSelectBackRect()'), 'back to the menu');
  await tab.until('state === GameState.MODE_SELECT');
}

async function multiPlayer(browser) {
  // Two tabs in one browser context → separate pages, shared fake PubNub
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tabs = [];
  let tt = 16000000000000000n;
  await context.exposeBinding('__pnPublish', async (_src, channel, message, publisher) => {
    tt += 1n;
    const ev = { channel, message, publisher, timetoken: String(tt) };
    for (const t of tabs) t.page.evaluate(e => window.__pnDeliver(e), ev).catch(() => {});
    return String(tt);
  });
  await context.route('https://cdn.jsdelivr.net/npm/pubnub@*/**', route =>
    route.fulfill({ contentType: 'application/javascript', body: FAKE_PUBNUB }));

  const a = await newTab(context, 'mpA', 111);
  tabs.push(a);
  await a.page.click('[data-act=multi]');
  await a.page.click('[data-act=create]');
  await a.until('state === GameState.CHARACTER_SELECT', 'world created');
  const code = await a.ev('mp.code');
  await a.key('Enter');
  await a.until('state === GameState.PLAYING');

  const b = await newTab(context, 'mpB', 222);
  tabs.push(b);
  await b.page.click('[data-act=multi]');
  await b.page.click('[data-act=join]');
  await b.page.fill('#joinCode', code);
  await b.page.press('#joinCode', 'Enter');
  // Both tabs need time to pass for the hello → snap handshake
  for (let i = 0; i < 100 && await b.state() !== 'characterSelect'; i++) { await a.run(50); await b.run(50); }
  if (await b.state() !== 'characterSelect') throw new Error(`[mpB] did not join (state=${await b.state()})`);
  await b.key('ArrowRight');
  await b.key('Enter');
  await b.until('state === GameState.PLAYING');
  for (let i = 0; i < 40; i++) { await a.run(100); await b.run(100); }

  const seesB = await a.ev('[...mp.players.values()].map(p => p.char && p.char.name)');
  const seesA = await b.ev('[...mp.players.values()].map(p => p.char && p.char.name)');
  log('multiplayer: A sees', seesB, '— B sees', seesA);
  if (!seesB.length || !seesA.length) errors.push('[mp] the two tabs did not see each other');

  // A picks up an item; B should see it gone
  const pick = await a.ev(`(() => { for (const [hs, items] of Object.entries(hotspotItems))
    if (items.length) { const id = items[0].id; pickUpHotspotItem(hs, 0); return { hs, id }; } return null; })()`);
  if (pick) {
    for (let i = 0; i < 20; i++) { await a.run(100); await b.run(100); }
    const aHas = await a.ev(`backpack.some(i => i.id === ${JSON.stringify(pick.id)})`);
    const bLeft = await b.ev(`(mp.items[currentMapPath][${JSON.stringify(pick.hs)}] || []).map(i => i.id)`);
    log('multiplayer: A took', pick.id, 'from', pick.hs, '→ in A\'s backpack:', aHas, '— left for B:', bLeft);
    if (!aHas) errors.push('[mp] picked-up item did not reach the backpack');
    const saves = await a.ev(SAVES_SORTED);
    const mine = Object.entries(saves).find(([k]) => k.startsWith('louisas-game:mp:'));
    if (!mine || !mine[1].backpack.some(i => i.id === pick.id)) errors.push('[mp] the world save is missing the item');
    if (mine) for (const k of ['swordRating', 'bankBalance', 'bossWins', 'strengthBoost', 'dishesMade', 'customRecipes']) {
      if (!(k in mine[1])) errors.push(`[mp] the world save is missing ${k}`);
    }
  }

  // B walks up to A and talks to them
  await b.ev(`(() => { const a = [...mp.players.values()][0]; player.x = a.x + 80; player.y = a.y; tapTarget = null; })()`);
  for (let i = 0; i < 10; i++) { await a.run(100); await b.run(100); }
  await b.ev('startConversation([...mp.players.values()][0])');
  await b.page.fill('#talkInput', 'hi friend!');
  await b.page.press('#talkInput', 'Enter');
  for (let i = 0; i < 30; i++) { await a.run(100); await b.run(100); }
  const heard = await a.ev(`speechBubbles.map(b => b.lines.map(l => l.words.map(w => w.text).join(' ')).join(' '))`);
  log('multiplayer: A heard', heard);
  if (!heard.includes('hi friend!')) errors.push('[mp] A did not hear what B said');
  await b.key('Escape');

  const seen = await b.ev('window.__mpSeen');
  log('multiplayer: B received', JSON.stringify(seen));
  for (const t of ['hello', 'snap', 'pos', 'take', 'boss']) {
    if (!seen[t]) errors.push(`[mp] B never received a "${t}" message`);
  }
  await context.close();
}

// ---------------------------------------------------------------- compare
async function compareShots(browser, dirA, dirB) {
  const page = await browser.newPage();
  const files = fs.readdirSync(dirA).filter(f => f.endsWith('.png')).sort();
  const diffs = [];
  for (const f of files) {
    const other = path.join(dirB, f);
    if (!fs.existsSync(other)) { diffs.push(`${f}: missing`); continue; }
    const a = fs.readFileSync(path.join(dirA, f)), b = fs.readFileSync(other);
    if (a.equals(b)) continue;
    const n = await page.evaluate(async ([ua, ub]) => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const [ia, ib] = await Promise.all([load(ua), load(ub)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return -1;
      const px = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      const da = px(ia), db = px(ib);
      let n = 0;
      for (let i = 0; i < da.length; i += 4) {
        if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) n++;
      }
      return n;
    }, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`]);
    if (n !== 0) diffs.push(`${f}: ${n < 0 ? 'size differs' : n + ' pixels differ'}`);
  }
  const ta = path.join(dirA, 'trace.json'), tb = path.join(dirB, 'trace.json');
  if (fs.existsSync(ta) && fs.existsSync(tb) && fs.readFileSync(ta, 'utf8') !== fs.readFileSync(tb, 'utf8')) {
    diffs.push('trace.json differs (diff the two files to see where)');
  }
  await page.close();
  return { files: files.length, diffs };
}

// ---------------------------------------------------------------- main
(async () => {
  // Just compare two earlier runs: node tests/smoke.js --diff DIR_A DIR_B
  if (args[0] === '--diff') {
    const browser = await chromium.launch();
    const { files, diffs } = await compareShots(browser, args[1], args[2]);
    await browser.close();
    console.log(`${files} screenshots compared`);
    for (const d of diffs) console.log('  ✗', d);
    process.exit(diffs.length ? 1 : 0);
  }
  ASSETS = assetJson();
  const server = await startServer();
  const browser = await chromium.launch();
  let failed = false;
  try {
    console.log('▶ single player');
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE.slice(0, -1) });
    await context.route('https://cdn.jsdelivr.net/npm/pubnub@*/**', route =>
      route.fulfill({ contentType: 'application/javascript', body: FAKE_PUBNUB }));
    await singlePlayer(context);
    await context.close();
    log(`${trace.length} trace entries`);

    console.log('▶ multi player');
    await multiPlayer(browser);

    if (SHOTS_DIR) {
      fs.writeFileSync(path.join(SHOTS_DIR, 'trace.json'), JSON.stringify(trace, null, 1));
      log(`screenshots + trace in ${path.relative(ROOT, SHOTS_DIR) || '.'}`);
    }
    if (COMPARE_DIR) {
      console.log(`▶ compare with ${COMPARE_DIR}`);
      const { files, diffs } = await compareShots(browser, COMPARE_DIR, SHOTS_DIR);
      log(`${files} screenshots compared`);
      for (const d of diffs) log('✗', d);
      if (diffs.length) failed = true;
    }
  } catch (err) {
    errors.push(`test aborted: ${err.stack || err.message}`);
  } finally {
    await browser.close();
    server.kill();
  }
  if (errors.length) {
    console.log(`\n✗ ${errors.length} error(s):`);
    for (const e of errors) console.log('  - ' + e);
    failed = true;
  }
  console.log(failed ? '\nFAILED' : '\n✓ smoke test passed');
  process.exit(failed ? 1 : 0);
})();
