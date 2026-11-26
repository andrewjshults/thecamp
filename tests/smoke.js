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
window.__pnDeliver = (ev) => {
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
      if (h.targetMap && !seen.has(h.targetMap)) { seen.add(h.targetMap); queue.push(h.targetMap); }
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
    // (the dev server's live-reload stream never finishes, so it doesn't count)
    const counts = req => !req.url().includes('~~livereload');
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
    if (s === 'bankModal' || s === 'kitchenModal') {
      // These pop-ups are HTML: Esc in the page is handled by their own listeners
      await tab.ev(s === 'bankModal' ? 'closeBank()' : 'closeKitchenModal()');
      continue;
    }
    if (s === 'itemAction' || s === 'usingItem' || s === 'interacting' || s === 'talking') {
      await tab.key('Escape');
      continue;
    }
    if (s === 'confirmDialog') { await tab.key('n'); continue; }
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
  await tab.ev('resetMapBoss(); startFight()');
  await tab.run(3000);
  await tab.shot('fight');
  await backToPlaying(tab);
  tab.note({ step: 'after-fight', bossWins: await tab.ev('bossWins'), sword: await tab.ev('swordRating') });

  // Some progress to save, so resuming has something to bring back
  await tab.ev(`strengthBoost = 7; bossWins = 2; bankBalance = 30; swordRating = 42; dishesMade = ['sandwich'];
    customRecipes = [{ id: 'custom_1', name: 'Tomato Surprise', needs: ['tomato', 'bread'], map: 'assets/camp_kitchen.json' }];
    completedUses = [{ hotspotId: 'tree', hotspotName: 'Tree', itemId: 'rope', itemName: 'Rope', itemEmoji: '🪢', text: 'Climbed!' }];
    backpack.push({ id: 'ten_dollar_coin', name: '$10 Coin', emoji: '🪙', coin: true, value: 10 }); writeSave();`);
  await tab.key('Escape');
  await tab.key('y');
  await tab.until('state === GameState.CHARACTER_SELECT');
  await tab.ev(`strengthBoost = 0; bossWins = 0; bankBalance = 0; swordRating = 100; dishesMade = []; customRecipes = []`);
  await tab.key('Enter');
  await tab.until('state === GameState.RESUME_PROMPT');
  await tab.shot('resume-prompt');
  await tab.key('r');
  await tab.until('state === GameState.PLAYING');
  tab.note({ step: 'resumed', map: await tab.ev('currentMapPath'), backpack: await tab.ev('backpack.map(i => i.id)'),
    values: await tab.ev(`({ completedUses, dishesMade, customRecipes, strengthBoost, swordRating, bossWins, bankBalance })`),
    save: await tab.ev(SAVES_SORTED) });
  await taps(tab);
  await tab.page.close();
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
