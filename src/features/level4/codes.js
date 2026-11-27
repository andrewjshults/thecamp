// ============================================================
// DOOR CODES — every building on the fourth camp needs a 3-character code
// ============================================================
// A portal hotspot with `"codeLock": "<lock id>"` needs its code typed in
// before the door opens, every time. Space there opens the keypad
// (#codePadModal, state CODE_PAD). The Slime Brick keeps coming while you
// type (slime-brick.js: it hunts in CODE_PAD too), and if it catches you the
// keypad closes and it's a fight.
//
// Each camper has their own codes (`doorCodes`, saved per camper): 3 letters
// and numbers, made up the first time they're needed. You get them from the
// code keeper in the Safe Zone: a hotspot with a `codeKeeper` object opens
// #codeKeeperModal (state CODE_KEEPER), one button per lock:
//   "codeKeeper": { "keeper": "Beep", "emoji": "🤖",
//                   "locks": [ { "id": "bank", "name": "the Camp Bank", "emoji": "🏦", "words": ["bank", "money"] } ] }
// And an NPC with `"knowsCodes": true` on that map answers typed questions
// ("what's the code for the bank?") from the same list (registerNpcAnswer).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L to mix up
const CODE_LENGTH = 3;
let doorCodes = {};   // lock id → code
registerSaveField('doorCodes', {
  save: () => doorCodes,
  load: s => {
    doorCodes = {};
    const saved = s && s.doorCodes;
    if (saved && typeof saved === 'object') {
      for (const [id, code] of Object.entries(saved)) {
        if (typeof code === 'string' && new RegExp(`^[${CODE_CHARS}]{${CODE_LENGTH}}$`).test(code)) doorCodes[id] = code;
      }
    }
  }
});

function codeFor(lockId) {
  if (!doorCodes[lockId]) {
    const used = new Set(Object.values(doorCodes));
    let code;
    do {
      code = '';
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    } while (used.has(code));
    doorCodes[lockId] = code;
    writeSave();
  }
  return doorCodes[lockId];
}
function spacedCode(code) { return code.split('').join(' '); }
function normalizeCode(text) { return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

// ---------- The keypad ----------
const codePadEl = document.getElementById('codePadModal');
const codePadInput = document.getElementById('codePadInput');
const codePadSays = document.getElementById('codePadSays');
const codePadWarn = document.getElementById('codePadWarn');
let codePadDoor = null;      // the hotspot whose door we're typing the code for
let codePadOpenedAt = 0;

registerGameState('CODE_PAD', {
  draw: () => drawGame(),
  onKey: e => { if (e.key === 'Escape') closeCodePad(); },
  inWorld: true,
  inputs: [codePadEl]
});

function openCodePad(obj) {
  if (doorOpening || bossEngage) return;
  codePadDoor = obj;
  document.getElementById('codePadTitle').textContent = `🔢 ${obj.name}`;
  codePadSays.textContent = `Type the ${CODE_LENGTH}-letter code to open the door. Get the codes in the Safe Zone! 🛡️`;
  codePadSays.className = '';
  codePadInput.value = '';
  codePadWarn.textContent = '';
  // at the top or bottom of the screen, wherever you aren't, so you can see the Slime Brick coming
  codePadEl.classList.toggle('atTop', player.y - camera.y > canvas.height * 0.5);
  codePadEl.hidden = false;
  state = GameState.CODE_PAD;
  codePadOpenedAt = performance.now();
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  player.walking = false;
  player.frame = 0;
  setTimeout(() => { if (!codePadEl.hidden) codePadInput.focus(); }, 60);
}

// `caught`: the Slime Brick got you (no goodbye)
function closeCodePad(caught) {
  if (state !== GameState.CODE_PAD) return;
  codePadEl.hidden = true;
  if (codePadEl.contains(document.activeElement)) document.activeElement.blur();
  state = GameState.PLAYING;
  codePadDoor = null;
  if (caught) kitchenToast('🫧 SPLORCH! The Slime Brick got you while you were typing the code!');
}

function tryDoorCode() {
  const obj = codePadDoor;
  if (!obj) return;
  const typed = normalizeCode(codePadInput.value);
  if (typed.length < CODE_LENGTH) {
    codePadSays.textContent = `The code has ${CODE_LENGTH} letters and numbers. Keep going!`;
    return;
  }
  if (typed !== codeFor(obj.codeLock)) {
    codePadSays.textContent = `❌ BZZT! "${spacedCode(typed)}" is the wrong code. Try again, or ask in the Safe Zone!`;
    codePadSays.className = 'wrong';
    codePadInput.value = '';
    codePadEl.querySelector('.codePanel').animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }],
      { duration: 260 });
    codePadInput.focus();
    return;
  }
  closeCodePad();
  useToast = { text: `✅ BEEP BEEP! ${obj.name} is open!`, age: 0 };
  doorOpening = { obj, start: performance.now() };
}

document.getElementById('codePadForm').addEventListener('submit', (e) => {
  e.preventDefault();
  tryDoorCode();
});
codePadInput.addEventListener('input', () => {
  const v = normalizeCode(codePadInput.value).slice(0, CODE_LENGTH);
  if (codePadInput.value !== v) codePadInput.value = v;
  codePadSays.className = '';
});
codePadEl.addEventListener('click', (e) => {
  if (performance.now() - codePadOpenedAt < 300) return;
  if (e.target.closest('[data-codepad="close"]')) closeCodePad();
});
codePadEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeCodePad(); }
});

// "It's coming!" while the Slime Brick is after you
registerFrameUpdate(13, () => {
  if (state !== GameState.CODE_PAD) return;
  let warn = '';
  if (typeof slimeOut === 'function' && slimeOut() && slime.where === 'out') {
    const p = slimePos();
    const d = Math.hypot(player.x - p.x, player.y - p.y);
    if (d < (slimeCfg().sniff || 600) * bossK()) warn = '⚠️ The Slime Brick is coming! HURRY!';
  }
  if (codePadWarn.textContent !== warn) codePadWarn.textContent = warn;
});

registerHotspotKind({
  match: obj => !!obj.codeLock && !!obj.targetMap,
  interact: obj => openCodePad(obj),
  hint: () => `🔢 ${actionKeyLabel()} Type the code`
}, { first: true });

// A little keypad next to each locked door (map coordinates)
function drawDoorKeypads() {
  for (const obj of interactiveObjects) {
    if (!obj.codeLock || !obj.door) continue;
    const d = obj.door;
    const dw = d.pw * scaledMapW, dh = d.ph * scaledMapH;
    const h = Math.max(18, Math.min(dh * 0.4, 60)), w = h * 0.75;
    const x = d.px * scaledMapW + dw + Math.max(6, dw * 0.25), y = d.py * scaledMapH + dh * 0.3;
    ctx.save();
    ctx.fillStyle = '#546e7a';
    ctx.strokeStyle = '#221c1a';
    ctx.lineWidth = Math.max(1.5, h * 0.06);
    roundRect(x, y, w, h, h * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b2ff59';
    ctx.fillRect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.16);
    ctx.fillStyle = '#eceff1';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      ctx.fillRect(x + w * (0.14 + c * 0.26), y + h * (0.36 + r * 0.2), w * 0.18, h * 0.13);
    }
    ctx.restore();
  }
}
registerMapLayer(31, () => drawDoorKeypads());

// ---------- The code keeper (in the Safe Zone) ----------
const keeperEl = document.getElementById('codeKeeperModal');
const keeperSaysEl = document.getElementById('codeKeeperSays');
let codeKeeper = null;
let keeperOpenedAt = 0;

registerGameState('CODE_KEEPER', {
  draw: () => drawGame(),
  onKey: e => { if (e.key === 'Escape') closeCodeKeeper(); },
  inWorld: true,
  inputs: [keeperEl]
});

function codeKeeperName() { return (codeKeeper && codeKeeper.keeper) || 'Beep'; }
function keeperLocks(k) { return (k && k.locks) || []; }

function openCodeKeeper(obj) {
  codeKeeper = obj.codeKeeper || {};
  document.getElementById('codeKeeperFace').textContent = codeKeeper.emoji || '🤖';
  const list = document.getElementById('codeKeeperLocks');
  list.innerHTML = '';
  for (const lock of keeperLocks(codeKeeper)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'green';
    b.dataset.lock = lock.id;
    b.textContent = `${lock.emoji || '🚪'} ${lock.name}`;
    list.appendChild(b);
  }
  const who = player.character ? player.character.name : 'camper';
  keeperSaysEl.textContent = `BEEP BOOP! Hi, ${who}! I'm ${codeKeeperName()}, the code finder. ` +
    'The Slime Brick can\'t get you in here. Which door do you need the code for?';
  keeperEl.hidden = false;
  state = GameState.CODE_KEEPER;
  keeperOpenedAt = performance.now();
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  player.walking = false;
  player.frame = 0;
  setTimeout(() => { if (!keeperEl.hidden) { const b = keeperEl.querySelector('[data-lock]'); if (b) b.focus(); } }, 80);
}

function closeCodeKeeper() {
  if (state !== GameState.CODE_KEEPER) return;
  keeperEl.hidden = true;
  if (keeperEl.contains(document.activeElement)) document.activeElement.blur();
  state = GameState.PLAYING;
  useToast = { text: `${codeKeeperName()} waves goodbye! 🤖👋 Remember your codes!`, age: 0 };
}

function codeAnswer(lock) {
  return `The code for ${lock.name} is ${spacedCode(codeFor(lock.id))}! 🔑`;
}

keeperEl.addEventListener('click', (e) => {
  if (performance.now() - keeperOpenedAt < 300) return;
  const b = e.target.closest('[data-lock]');
  if (b) {
    const lock = keeperLocks(codeKeeper).find(l => l.id === b.dataset.lock);
    if (lock) {
      keeperSaysEl.textContent = `BEEP! ${codeAnswer(lock)} Type it on the keypad by the door. Quick, before the Slime Brick sees you!`;
      keeperSaysEl.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
    }
    return;
  }
  if (e.target.closest('[data-keeper="close"]')) closeCodeKeeper();
});
keeperEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeCodeKeeper(); }
});

registerHotspotKind({
  match: obj => !!obj.codeKeeper,
  interact: obj => openCodeKeeper(obj),
  hint: () => `${actionKeyLabel()} 🔑 Ask for a code`
});

// Typed questions to an NPC with `knowsCodes`: "what's the code for the bank?"
registerNpcAnswer((npc, line) => {
  if (!npc || !npc.knowsCodes || !mapConfig) return null;
  const keeperSpot = mapConfig.hotspots.find(h => h.codeKeeper);
  const locks = keeperLocks(keeperSpot && keeperSpot.codeKeeper);
  if (!locks.length) return null;
  const text = String(line || '').toLowerCase();
  // only questions about getting in ("where's the sword?" is for item-questions.js)
  if (!/\b(code|codes|password|secret|keypad|number|open|unlock|door|get in)/.test(text)) return null;
  // the doors whose words match the most ("girls bathroom": just the girls'; "bathroom": both)
  const score = l => (l.words || [l.id]).filter(w => new RegExp(`\\b${w}`).test(text)).length;
  const best = Math.max(0, ...locks.map(score));
  const asked = best ? locks.filter(l => score(l) === best) : [];
  if (asked.length) return `Beep boop! ${asked.map(codeAnswer).join(' ')}`;
  return `Beep! I know the codes for ${locks.map(l => `${l.emoji || ''} ${l.name}`.trim()).join(', ')}. Which one do you want?`;
});
