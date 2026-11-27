// ============================================================
// PLAY TIME — a limit on continuous play, then a break
// ============================================================
// Every camper on this browser shares one timer (it isn't part of a save):
//   - it starts at PLAYTIME_LIMIT_MS and only counts down while you're
//     playing: walking or turning around, talking, menus, shops and pop-ups,
//     or a fight. With no key press or tap for PLAYTIME_IDLE_MS it pauses
//     (a fight always counts)
//   - when it runs out you get the break screen (#playtimeModal). Mid-fight,
//     you finish the fight first and the break screen comes up after it
//   - the break lasts PLAYTIME_BLOCK_MS, then the timer is full again. The
//     break screen doesn't say how long is left
//   - a grown-up can end the break early with the 6-digit code from their
//     authenticator app (totp.js), then pick 5–60 more minutes on a slider
//   - not playing for PLAYTIME_BREAK_MS counts as a break too: full time again
//   - what's left shows in the top-right corner, next to the journal button
// On localhost there are developer overrides (see docs/playtime.md):
//   ?playtime=off  no limit at all     ?playtime=0.5  start with 30 seconds
//   the break screen has a "skip" button, and playtimeSet(ms) works in the console
const PLAYTIME_KEY = 'louisas-game:playtime';
const PLAYTIME_LIMIT_MS = 15 * 60 * 1000;
const PLAYTIME_BLOCK_MS = 60 * 60 * 1000;
const PLAYTIME_BREAK_MS = 60 * 60 * 1000;
const PLAYTIME_GRANT_MIN = 5, PLAYTIME_GRANT_MAX = 60;   // the slider, in minutes
const PLAYTIME_FLUSH_MS = 2000;       // how often the count is written down
const PLAYTIME_IDLE_MS = 10 * 1000;   // keeps counting this long after your last key press, tap or step
const PLAYTIME_MAX_FRAME_MS = 250;    // a frame can't count more than this (tab was asleep)
const PLAYTIME_TRIES = 5, PLAYTIME_LOCK_MS = 60 * 1000;   // wrong codes before a 1-minute wait
const PLAYTIME_ON_LOCALHOST = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

const ptModalEl = document.getElementById('playtimeModal');
const ptCodeInput = document.getElementById('ptCodeInput');
const ptCodeError = document.getElementById('ptCodeError');
const ptSlider = document.getElementById('ptGrantSlider');

registerGameState('PLAYTIME_BLOCKED', {
  draw: () => drawGame(),
  onKey: () => {},          // no way out with the keyboard
  inWorld: true,            // friends see you standing still, taking a break
  inputs: [ptModalEl]
});

// --- What's stored ---
// { left: ms still to play, blockedAt: when the break started (or null),
//   activeAt: last time play was counted, usedStep: the last code used,
//   tries / lockUntil: wrong codes }
function ptRead() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(PLAYTIME_KEY) || 'null'); } catch (_) { /* start fresh */ }
  if (!s || typeof s !== 'object') s = {};
  const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
  const now = Date.now();
  const d = {
    left: num(s.left) === null ? PLAYTIME_LIMIT_MS : clamp(s.left, 0, 24 * 3600 * 1000),
    blockedAt: num(s.blockedAt),
    activeAt: num(s.activeAt),
    usedStep: num(s.usedStep) || 0,
    tries: num(s.tries) || 0,
    lockUntil: num(s.lockUntil) || 0
  };
  if (d.blockedAt !== null) {
    if (d.blockedAt > now) d.blockedAt = now;   // the clock went backwards: the break starts now
    if (now - d.blockedAt >= PLAYTIME_BLOCK_MS) { d.blockedAt = null; d.left = PLAYTIME_LIMIT_MS; d.activeAt = null; }
  } else if (d.activeAt !== null && now - d.activeAt >= PLAYTIME_BREAK_MS) {
    d.left = PLAYTIME_LIMIT_MS;   // a long rest counts as a break
    d.activeAt = null;
  }
  return d;
}
function ptWrite(d) {
  try { localStorage.setItem(PLAYTIME_KEY, JSON.stringify(d)); } catch (_) { /* storage full or off */ }
}

let ptData = ptRead();
let ptPending = 0;          // counted ms not written down yet
let ptLastFrame = null;
let ptActiveAt = null;      // performance.now() of your last key press, tap or step

// Any key press or tap (walking, turning around, talking, menus...) is playing
for (const ev of ['keydown', 'pointerdown']) {
  window.addEventListener(ev, () => { ptActiveAt = performance.now(); }, { capture: true, passive: true });
}
let ptFlushedAt = 0;
let playtimeOff = false;    // localhost only: ?playtime=off

// Write down what was counted. Re-reads first, so two tabs both count down
// the same timer, and a break started (or ended) in another tab shows up here.
function ptFlush() {
  const d = ptRead();
  if (ptPending > 0) {
    d.left = Math.max(0, d.left - ptPending);
    d.activeAt = Date.now();
    ptPending = 0;
  }
  ptWrite(d);
  ptData = d;
}

function playtimeLeft() { return Math.max(0, ptData.left - ptPending); }
function playtimeBlocked() { return ptData.blockedAt !== null; }

// The screens before and around playing don't count
const PLAYTIME_NOT_PLAYING = ['LOADING', 'CHARACTER_SELECT', 'RESUME_PROMPT', 'MODE_SELECT', 'PLAYTIME_BLOCKED'];

// Does this frame count? A fight does; anywhere else (the map, talking, menus,
// shops) counts until PLAYTIME_IDLE_MS after your last key press, tap or step
function playtimeCounting() {
  if (playtimeOff || devMode || !player.character) return false;
  if (state === GameState.FIGHTING) return !!fight && fight.phase !== 'result';
  if (PLAYTIME_NOT_PLAYING.some(s => state === GameState[s])) return false;
  if (state === GameState.PLAYING) {
    if (doorOpening || bossEngage) return false;
    if (player.walking) ptActiveAt = performance.now();   // also tap-to-move, with no key held
  }
  return ptActiveAt !== null && performance.now() - ptActiveAt < PLAYTIME_IDLE_MS;
}

function playtimeFrame() {
  const t = performance.now();
  const dt = ptLastFrame === null ? 0 : clamp(t - ptLastFrame, 0, PLAYTIME_MAX_FRAME_MS);
  ptLastFrame = t;
  if (playtimeOff) return;
  if (playtimeCounting()) ptPending += dt;
  if (t - ptFlushedAt >= PLAYTIME_FLUSH_MS || (ptPending > 0 && playtimeLeft() <= 0)) {
    ptFlushedAt = t;
    ptFlush();
  }
  if (state === GameState.PLAYTIME_BLOCKED) {
    if (!playtimeBlocked()) playtimeResume(null);   // the hour is up (or another tab unlocked it)
    return;
  }
  // Out of time: the break starts as soon as you're back on the map (so a
  // fight, or a pop-up you're in, finishes first)
  if (state === GameState.PLAYING && !devMode && (playtimeBlocked() || playtimeLeft() <= 0)) playtimeBlock();
}
registerFrameUpdate(5, () => playtimeFrame());

// --- The break ---
function playtimeBlock() {
  ptFlush();
  const d = ptData;
  if (d.blockedAt === null) d.blockedAt = Date.now();
  d.left = 0;
  ptWrite(d);
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  player.walking = false;
  player.frame = 0;
  for (const k of Object.keys(keys)) keys[k] = false;
  state = GameState.PLAYTIME_BLOCKED;
  ptShow('ptRest');
  ptModalEl.hidden = false;
}

// End the break: with `ms` more to play (a grown-up's code, or the developer
// skip), or null when the hour is up (full time)
function playtimeResume(ms) {
  const d = ptRead();
  d.left = ms === null ? (d.blockedAt === null ? d.left : PLAYTIME_LIMIT_MS) : ms;
  d.blockedAt = null;
  d.activeAt = Date.now();
  ptWrite(d);
  ptData = d;
  ptPending = 0;
  ptModalEl.hidden = true;
  if (document.activeElement && ptModalEl.contains(document.activeElement)) document.activeElement.blur();
  if (state === GameState.PLAYTIME_BLOCKED) state = GameState.PLAYING;
  kitchenToast(`⏳ Break's over! You have ${ptMinutesWord(playtimeLeft())} to play.`);
}

function ptMinutesWord(ms) {
  const m = Math.round(ms / 60000);
  return m === 1 ? '1 minute' : `${m} minutes`;
}

// Which part of the pop-up shows: ptRest (take a break), ptCode, ptGrant
function ptShow(id) {
  for (const el of ptModalEl.querySelectorAll('.menuScreen')) el.hidden = el.id !== id;
  document.querySelector('[data-pt="dev"]').hidden = !PLAYTIME_ON_LOCALHOST;
  if (id === 'ptCode') {
    ptCodeInput.value = '';
    ptCodeError.textContent = '';
    setTimeout(() => ptCodeInput.focus(), 0);
  }
  if (id === 'ptGrant') {
    ptSlider.value = String(PLAYTIME_LIMIT_MS / 60000);
    ptShowGrant();
    setTimeout(() => ptSlider.focus(), 0);
  }
}
function ptShowGrant() {
  document.getElementById('ptGrantValue').textContent = `${ptSlider.value} more minutes`;
}

ptModalEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pt]');
  if (!btn) return;
  const act = btn.dataset.pt;
  if (act === 'code') ptShow('ptCode');
  else if (act === 'rest') ptShow('ptRest');
  else if (act === 'dev' && PLAYTIME_ON_LOCALHOST) playtimeResume(PLAYTIME_LIMIT_MS);
});

let ptChecking = false;
document.getElementById('ptCode').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (ptChecking) return;
  const d = ptRead();
  const now = Date.now();
  if (d.lockUntil > now) {
    ptCodeError.textContent = `Too many tries. Wait ${Math.ceil((d.lockUntil - now) / 1000)} seconds.`;
    return;
  }
  ptChecking = true;
  let step = null;
  try { step = await totpMatch(ptCodeInput.value, now); } finally { ptChecking = false; }
  const after = ptRead();
  if (step !== null && step > after.usedStep) {
    after.usedStep = step;
    after.tries = 0;
    after.lockUntil = 0;
    ptWrite(after);
    ptData = after;
    ptShow('ptGrant');
    return;
  }
  if (step !== null) {
    ptCodeError.textContent = 'That code was already used. Wait for the next one.';
  } else {
    after.tries++;
    if (after.tries >= PLAYTIME_TRIES) { after.tries = 0; after.lockUntil = now + PLAYTIME_LOCK_MS; }
    ptCodeError.textContent = after.lockUntil > now ? 'Too many tries. Wait a minute.' : 'That code isn\'t right. Try again.';
    ptWrite(after);
    ptData = after;
  }
  ptCodeInput.value = '';
  ptCodeInput.focus();
});
ptCodeInput.addEventListener('input', () => {
  ptCodeInput.value = ptCodeInput.value.replace(/\D/g, '').slice(0, TOTP_DIGITS);
});

ptSlider.min = String(PLAYTIME_GRANT_MIN);
ptSlider.max = String(PLAYTIME_GRANT_MAX);
ptSlider.addEventListener('input', () => ptShowGrant());
document.getElementById('ptGrant').addEventListener('submit', (e) => {
  e.preventDefault();
  const min = clamp(Math.round(Number(ptSlider.value) || PLAYTIME_GRANT_MIN), PLAYTIME_GRANT_MIN, PLAYTIME_GRANT_MAX);
  playtimeResume(min * 60000);
});

// Write the count down when the tab is closed or hidden
window.addEventListener('pagehide', () => { if (!playtimeOff) ptFlush(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !playtimeOff) ptFlush(); });

// --- Developer overrides (localhost only) ---
// playtimeSet(ms) in the console: this much time left (0 → the break, next frame)
function playtimeSet(ms) {
  if (!PLAYTIME_ON_LOCALHOST) return;
  const d = ptRead();
  d.left = Math.max(0, Number(ms) || 0);
  d.blockedAt = null;
  d.activeAt = Date.now();
  ptWrite(d);
  ptData = d;
  ptPending = 0;
}
if (PLAYTIME_ON_LOCALHOST) {
  const param = new URLSearchParams(location.search).get('playtime');
  if (param === 'off') playtimeOff = true;
  else if (param !== null && isFinite(parseFloat(param))) playtimeSet(parseFloat(param) * 60000);
}

// --- The badge: time left, next to the journal button ---
function ptClock(ms) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  const two = n => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}
function drawPlaytimeBadge() {
  if (playtimeOff || !player.character || state === GameState.PLAYTIME_BLOCKED) return;
  const left = playtimeLeft();
  const low = left < 60000;
  const W = 72, H = 38, Y = 10;
  const X = canvas.width - 80 - 6 - W;   // just left of the journal button (journal.js)
  ctx.save();
  ctx.fillStyle = low ? 'rgba(183, 28, 28, 0.75)' : 'rgba(0,0,0,0.55)';
  roundRect(X, Y, W, H, 8);
  ctx.fill();
  ctx.strokeStyle = low ? '#FF8A80' : '#8D6E63';
  ctx.lineWidth = 2;
  roundRect(X, Y, W, H, 8);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFECB3';
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.fillText('⏳', X + W / 2, Y + 14);
  ctx.fillStyle = low && Math.floor(Date.now() / 500) % 2 ? '#FFFFFF' : '#FFECB3';
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.fillText(ptClock(left), X + W / 2, Y + 30);
  ctx.restore();
}
registerScreenLayer(95, () => drawPlaytimeBadge());
