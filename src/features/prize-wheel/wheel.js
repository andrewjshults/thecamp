// ============================================================
// THE PRIZE WHEEL — a spin after every new adventure
// ============================================================
// Each time you finish an adventure (a new Adventure Journal entry), the prize
// wheel opens once you're back on the map. It has WHEEL_SLOTS slots, and some
// of them hold a prize: a fight charm (charms.js), a coin from one of the
// levels, or (rarely) a sword or armor from the shops. The rest are "so close!".
//
// How many slots win is your luck (`wheelLuck`, saved per camper), rounded
// down and kept between WHEEL_MIN_WINS and WHEEL_MAX_WINS:
//   - every adventure adds WHEEL_LUCK_PER_ADVENTURE
//   - winning a prize takes away WHEEL_LUCK_WIN_DROP (it doesn't start over)
// See docs/prize-wheel.md.
const WHEEL_SLOTS = 8;
const WHEEL_MIN_WINS = 1;
const WHEEL_MAX_WINS = 6;
const WHEEL_LUCK_PER_ADVENTURE = 1 / 3;     // one more winning slot every 3 adventures
const WHEEL_LUCK_WIN_DROP = 2;              // two fewer winning slots after a win
const WHEEL_SPIN_MS = 3800;

// What a winning slot can hold, and how often (`weight`). Coins are the ones the
// bosses give on each level; the bigger ones are rarer. Swords and armor are the
// ones from Ember's and Shelly's shops: the pricier, the rarer.
const WHEEL_PRIZES = [
  { charm: 'potion', weight: 2 },
  { charm: 'bubble', weight: 2 },
  { charm: 'honey',  weight: 2 },
  { charm: 'polish', weight: 2 },
  { coin: { id: 'ten_dollar_coin',    name: '$10 Coin', emoji: '🪙', coin: true, value: 10 }, weight: 3, color: '#FFD54F' },
  { coin: { id: 'twenty_dollar_coin', name: '$20 Coin', emoji: '🪙', coin: true, value: 20 }, weight: 2, color: '#FFCA28' },
  { coin: { id: 'thirty_dollar_coin', name: '$30 Coin', emoji: '🪙', coin: true, value: 30 }, weight: 1, color: '#FFA000' },
  { sword: 'sparkle', weight: 0.8 },
  { sword: 'ice',     weight: 0.6 },
  { sword: 'flame',   weight: 0.4 },
  { sword: 'rainbow', weight: 0.2 },
  { armor: 'vest',    weight: 0.8 },
  { armor: 'chain',   weight: 0.6 },
  { armor: 'knight',  weight: 0.4 },
  { armor: 'crystal', weight: 0.2 }
];
function wheelPrizeInfo(prize) {
  if (prize.charm) {
    const c = CHARM_KINDS[prize.charm];
    return { emoji: c.emoji, label: '', name: c.name, about: c.about, color: c.color };
  }
  if (prize.sword) {
    const k = SWORD_KINDS[prize.sword];
    return { emoji: k.emoji, label: 'Sword', name: k.name, about: k.about, color: k.glow };
  }
  if (prize.armor) {
    const k = ARMOR_KINDS[prize.armor];
    return { emoji: k.emoji, label: 'Armor', name: k.name, about: k.about, color: k.color };
  }
  return { emoji: '🪙', label: `$${prize.coin.value}`, name: prize.coin.name, about: 'Coins for the shops, the kitchen or the bank', color: prize.color };
}

function wheelLuckFor(n) { return clamp(n, WHEEL_MIN_WINS, WHEEL_MAX_WINS); }
let wheelLuck = WHEEL_MIN_WINS;
registerSaveField('wheelLuck', {
  save: () => wheelLuck,
  load: s => {
    const n = Number(s && s.wheelLuck);
    // Older saves: as lucky as the adventures you've already done
    wheelLuck = wheelLuckFor(Number.isFinite(n) ? n : WHEEL_MIN_WINS + completedUses.length * WHEEL_LUCK_PER_ADVENTURE);
  }
});
function wheelWins() { return clamp(Math.floor(wheelLuck + 1e-9), WHEEL_MIN_WINS, WHEEL_MAX_WINS); }

let wheelPending = 0;     // spins waiting for you to get back to the map
let wheel = null;         // { slots, phase: 'ready'|'spinning'|'done', rot, from, to, start, landed, result, buttonRect }

onGameEvent('adventureDone', () => {
  wheelLuck = wheelLuckFor(wheelLuck + WHEEL_LUCK_PER_ADVENTURE);
  wheelPending++;
});
onGameEvent('camperChosen', () => { wheelPending = 0; wheel = null; });

// Open it once the adventure's pop-up has closed and you're back on the map
registerFrameUpdate(46, () => {
  if (wheelPending > 0 && state === GameState.PLAYING) {
    wheelPending--;
    openPrizeWheel();
  }
});

function pickWheelPrize() {
  const total = WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of WHEEL_PRIZES) { if ((r -= p.weight) < 0) return p; }
  return WHEEL_PRIZES[0];
}

// The winning slots are spread out around the wheel
function wheelSlots(wins) {
  const slots = [];
  for (let i = 0; i < WHEEL_SLOTS; i++) {
    const win = Math.floor((i + 1) * wins / WHEEL_SLOTS) > Math.floor(i * wins / WHEEL_SLOTS);
    slots.push(win ? pickWheelPrize() : null);
  }
  return slots;
}

function openPrizeWheel() {
  journalOpen = false;
  backpackOpen = false;
  tapTarget = null;
  wheel = { slots: wheelSlots(wheelWins()), phase: 'ready', rot: Math.random() * Math.PI * 2, opened: performance.now() };
  state = GameState.PRIZE_WHEEL;
}

function spinPrizeWheel() {
  if (!wheel || wheel.phase !== 'ready') return;
  const seg = Math.PI * 2 / WHEEL_SLOTS;
  wheel.landed = Math.floor(Math.random() * WHEEL_SLOTS);
  // Slot i's middle is at rot + (i + 0.5) * seg from the top: bring the landed one there
  const wobble = (Math.random() - 0.5) * seg * 0.7;
  let to = -(wheel.landed + 0.5) * seg + wobble;
  while (to < wheel.rot + Math.PI * 2 * 5) to += Math.PI * 2;        // at least 5 whole turns
  wheel.from = wheel.rot;
  wheel.to = to;
  wheel.start = performance.now();
  wheel.phase = 'spinning';
}

function landPrizeWheel() {
  wheel.rot = wheel.to;
  wheel.phase = 'done';
  wheel.doneAt = performance.now();
  const prize = wheel.slots[wheel.landed];
  if (!prize) {
    wheel.result = { won: false, title: 'So close!', text: 'No prize this time. Finish more adventures for more prize slots!' };
    return;
  }
  const info = wheelPrizeInfo(prize);
  const text = giveWheelPrize(prize);
  wheelLuck = wheelLuckFor(wheelLuck - WHEEL_LUCK_WIN_DROP);
  writeSave();
  wheel.result = { won: true, title: `You won ${info.emoji} ${info.name}!`, text, color: info.color };
}

// Hand over a prize; returns what to tell you about it
function giveWheelPrize(prize) {
  if (prize.charm) {
    addCharm(prize.charm);
    return `${CHARM_KINDS[prize.charm].about}. It goes in your charm pouch 🎁 and helps in your next boss fight.`;
  }
  if (prize.sword) return giveWheelSword(prize.sword);
  if (prize.armor) return giveWheelArmor(prize.armor);
  if (backpack.length < BACKPACK_CAPACITY) {
    backpack.push({ ...prize.coin });
    return "It's in your backpack. 🎒";
  }
  bankBalance += prize.coin.value;
  return 'Your backpack is full, so it went straight into the Camp Bank. 🏦';
}

// A shop sword: it's yours right away, unless the one you're holding is
// fancier (pricier) and still works. Then you keep yours, polished as good as new.
function giveWheelSword(id) {
  const won = SWORD_KINDS[id];
  const mine = swordRating > 0 ? swordKindDef() : null;
  if (mine && swordKind !== id && (mine.price || 0) > won.price) {
    swordRating = swordMax();
    return `Your ${mine.emoji} ${mine.name} is even fancier, so you keep it, and it's polished as good as new (${swordMax()})! ✨`;
  }
  equipSwordKind(id);
  return `It's in your hand, good as new (${won.max})! ${won.about}`;
}

// Armor: the same, with what you're wearing
function giveWheelArmor(id) {
  const won = ARMOR_KINDS[id];
  const mine = wearingArmor() ? armorDef() : null;
  if (mine && armorKind !== id && mine.price > won.price) {
    armorRating = mine.max;
    return `Your ${mine.emoji} ${mine.name} is even better, so you keep it, and it's fixed up as good as new (${mine.max})! 🐢`;
  }
  equipArmor(id);
  return `You're wearing it now! ${won.about}`;
}

function closePrizeWheel() {
  wheel = null;
  state = GameState.PLAYING;
}

function prizeWheelKey(e) {
  if (!wheel) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (wheel.phase === 'ready') spinPrizeWheel();
    else if (wheel.phase === 'done') closePrizeWheel();
  } else if (e.key === 'Escape' && wheel.phase === 'done') {
    closePrizeWheel();
  }
}
function prizeWheelTap() {
  if (!wheel) return;
  if (wheel.phase === 'ready') spinPrizeWheel();
  else if (wheel.phase === 'done' && performance.now() - wheel.doneAt > 300) closePrizeWheel();
}

function updatePrizeWheel() {
  if (wheel.phase !== 'spinning') return;
  const t = Math.min(1, (performance.now() - wheel.start) / WHEEL_SPIN_MS);
  const ease = 1 - Math.pow(1 - t, 3);
  wheel.rot = wheel.from + (wheel.to - wheel.from) * ease;
  if (t >= 1) landPrizeWheel();
}

// ---------- Drawing ----------
function drawPrizeWheel() {
  drawGame();
  if (!wheel) return;
  updatePrizeWheel();
  const W = canvas.width, H = canvas.height;
  const now = performance.now();
  const grow = Math.min(1, (now - wheel.opened) / 250);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.65 * grow})`;
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.min(440, W - 24);
  const R = Math.max(70, Math.min(150, panelW / 2 - 40, (H - 300) / 2));
  const panelH = R * 2 + 250;
  const px = W / 2 - panelW / 2, py = Math.max(8, H / 2 - panelH / 2);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(grow, grow);
  ctx.translate(-W / 2, -H / 2);

  ctx.fillStyle = '#3E2723';
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = 3;
  roundRect(px, py, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 22px "Comic Sans MS", cursive';
  ctx.fillText('🎡 Prize Wheel!', W / 2, py + 34);
  const wins = wheel.slots.filter(Boolean).length;
  ctx.fillStyle = '#FFECB3';
  ctx.font = '13px "Comic Sans MS", cursive';
  ctx.fillText(`You finished an adventure! ${wins} of ${WHEEL_SLOTS} slots have a prize.`, W / 2, py + 56);

  // The wheel
  const cx = W / 2, cy = py + 78 + R;
  const seg = Math.PI * 2 / WHEEL_SLOTS;
  const top = -Math.PI / 2;
  for (let i = 0; i < WHEEL_SLOTS; i++) {
    const a0 = top + wheel.rot + i * seg, a1 = a0 + seg;
    const prize = wheel.slots[i];
    const info = prize && wheelPrizeInfo(prize);
    const lit = wheel.phase === 'done' && i === wheel.landed && Math.floor((now - wheel.doneAt) / 250) % 2 === 0;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = info ? info.color : (i % 2 ? '#5D4037' : '#4E342E');
    ctx.fill();
    if (lit) { ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'; ctx.fill(); }
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 2;
    ctx.stroke();
    const mid = a0 + seg / 2;
    const ex = cx + Math.cos(mid) * R * 0.66, ey = cy + Math.sin(mid) * R * 0.66;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (info) {
      ctx.font = `${Math.round(R * 0.22)}px ${SCENE_EMOJI_FONT}`;
      ctx.fillStyle = '#000';
      ctx.fillText(info.emoji, ex, ey - (info.label ? R * 0.06 : 0));
      if (info.label) {
        ctx.font = `bold ${Math.round(R * 0.11)}px "Comic Sans MS", cursive`;
        ctx.fillStyle = '#3E2723';
        ctx.fillText(info.label, ex, ey + R * 0.13);
      }
    } else {
      ctx.font = `${Math.round(R * 0.16)}px ${SCENE_EMOJI_FONT}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('💨', ex, ey);
    }
  }
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = '#FFD54F';
  ctx.fill();
  ctx.strokeStyle = '#3E2723';
  ctx.lineWidth = 2;
  ctx.stroke();
  // The pointer at the top
  ctx.beginPath();
  ctx.moveTo(cx, cy - R + 18);
  ctx.lineTo(cx - 14, cy - R - 12);
  ctx.lineTo(cx + 14, cy - R - 12);
  ctx.closePath();
  ctx.fillStyle = '#FF5252';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Under the wheel: the button, or what you won
  const by = cy + R + 22;
  ctx.textBaseline = 'alphabetic';
  if (wheel.phase === 'ready') {
    ctx.fillStyle = 'rgba(255, 236, 179, 0.75)';
    ctx.font = '13px "Comic Sans MS", cursive';
    ctx.fillText('🧪🫧🍯✨ Charms help in your next boss fight.', W / 2, by + 14);
    ctx.fillText('🪙 Coins go in your backpack.', W / 2, by + 34);
    ctx.fillText('🗡️🛡️ Swords and armor from the shops are yours right away!', W / 2, by + 54);
  } else if (wheel.phase === 'done') {
    const r = wheel.result;
    ctx.fillStyle = r.won ? (r.color || '#FFD54F') : '#FFECB3';
    ctx.font = 'bold 18px "Comic Sans MS", cursive';
    ctx.fillText(r.title, W / 2, by + 14);
    ctx.fillStyle = '#FFECB3';
    ctx.font = '13px "Comic Sans MS", cursive';
    ctx.textAlign = 'left';
    wrapTextMaxLines(r.text, px + 24, by + 38, panelW - 48, 17, 3);
    ctx.textAlign = 'center';
  }
  const label = wheel.phase === 'ready' ? (isTouchDevice() ? 'Tap to SPIN!' : 'SPIN! (Space)')
    : wheel.phase === 'spinning' ? 'Spinning...' : (isTouchDevice() ? 'Tap to keep exploring' : 'OK (Space)');
  const bw = 200, bh = 40, bx = W / 2 - bw / 2, bty = py + panelH - bh - 16;
  const pulse = wheel.phase === 'ready' ? 0.5 + 0.5 * Math.sin(now / 200) : 0;
  ctx.fillStyle = wheel.phase === 'spinning' ? '#6D4C41' : '#FF8F00';
  roundRect(bx, bty, bw, bh, 10);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 236, 179, ${0.5 + 0.5 * pulse})`;
  ctx.lineWidth = 2 + 2 * pulse;
  roundRect(bx, bty, bw, bh, 10);
  ctx.stroke();
  ctx.fillStyle = '#FFF8E1';
  ctx.font = 'bold 16px "Comic Sans MS", cursive';
  ctx.fillText(label, W / 2, bty + 26);
  ctx.restore();
}

registerGameState('PRIZE_WHEEL', {
  draw: () => drawPrizeWheel(),
  onKey: e => prizeWheelKey(e),
  onTap: () => prizeWheelTap(),
  inWorld: true
});
