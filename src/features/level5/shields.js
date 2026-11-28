// ============================================================
// SHIELDS — the three kinds Charlie sells at the Fifth Camp
// ============================================================
// A shield is gear you carry as well as your sword and armor. It makes your
// blocks (hold B) hold more often: `guard` is added to the odds a block holds
// (registerPlayerGuardBonus). The two best ones can also `bounce` the boss
// back when a block holds, stunned for a moment, so you can get a hit in.
// It wears out like a sword: SHIELD_BLOCK_WEAR every time it blocks a swing,
// SHIELD_BROKEN_WEAR more when the block breaks. At 0 it's done (it does
// nothing until you buy another). You carry one at a time: `shieldKind` and
// `shieldRating` are saved per camper. Tuned with tools/fight-sim.js (see
// docs/level-five.md).
//
// A kind is { name, emoji, price, max (its rating when new), guard, bounce
// (chance a held block stuns the boss), color / trim (how it looks), about }.
const SHIELD_BLOCK_WEAR = 6;
const SHIELD_BROKEN_WEAR = 6;
const SHIELD_KINDS = {
  wood: {
    name: 'Wooden Shield', emoji: '🪵', price: 40, max: 150, guard: 0.1, bounce: 0, color: '#A1887F', trim: '#5D4037',
    about: 'Your blocks hold a bit more often. Lasts about 2 fights.'
  },
  lava: {
    name: 'Lava Rock Shield', emoji: '🔥', price: 80, max: 220, guard: 0.14, bounce: 0.3, color: '#FF7043', trim: '#3E2723',
    about: 'Blocks hold more often, and BOUNCE the boss back, dizzy, about 1 time in 3! Lasts about 3 fights.'
  },
  star: {
    name: 'Star Shield', emoji: '⭐', price: 120, max: 260, guard: 0.18, bounce: 0.5, color: '#FFF176', trim: '#FFA000',
    about: 'The best blocker! Bounces the boss back half the time. Lasts about 4 fights. It twinkles!'
  }
};
let shieldKind = null;     // which shield you carry (null: none)
let shieldRating = 0;      // how much it has left (0: worn out)
registerSaveField('shieldKind', {
  save: () => shieldKind,
  load: s => { shieldKind = s && SHIELD_KINDS[s.shieldKind] ? s.shieldKind : null; }
});
registerSaveField('shieldRating', {
  save: () => shieldRating,
  load: s => {
    const n = Number(s && s.shieldRating);
    shieldRating = shieldKind && Number.isFinite(n) ? clamp(Math.round(n), 0, SHIELD_KINDS[shieldKind].max) : 0;
  }
});
function shieldDef() { return shieldKind ? SHIELD_KINDS[shieldKind] : null; }
function carryingShield() { return !!shieldDef() && shieldRating > 0; }

// Pick up a new shield of kind `id` (the old one is traded in)
function equipShield(id) {
  shieldKind = SHIELD_KINDS[id] ? id : null;
  shieldRating = shieldKind ? SHIELD_KINDS[shieldKind].max : 0;
  writeSave();
}

function wearShield(f, n) {
  if (!carryingShield()) return;
  shieldRating = Math.max(0, shieldRating - n);
  f.shieldWornAt = performance.now();
  if (shieldRating === 0) fightPop(f, `${shieldDef().name.toUpperCase()} WORN OUT! ${shieldDef().emoji}`, f.p.x, 470, '#FFAB91', 0.85);
}

registerPlayerGuardBonus(() => carryingShield() ? shieldDef().guard : 0);

// Your block met the boss's swing: the shield wears, and maybe bounces it back
onGameEvent('fightBlocked', ({ f, guard, att, who, held }) => {
  if (guard !== f.p || who !== 'boss' || !carryingShield()) return;
  const s = shieldDef();
  const now = performance.now();
  wearShield(f, SHIELD_BLOCK_WEAR + (held ? 0 : SHIELD_BROKEN_WEAR));
  f.shieldBlockAt = now;
  if (!held || !(Math.random() < s.bounce)) return;
  // BOING: the boss staggers back, stunned for a moment (no point for anyone)
  const away = att.x > f.p.x ? 1 : -1;
  att.act = 'hit';
  att.actStart = now;
  att.stunX = 1.3;
  att.pushV = 600 * away;
  fightPop(f, `BOING! ${s.emoji}`, att.x, 300, s.color, 1);
});

// ---------- How it looks ----------
// In the fight: on your front arm, held up high while you block
function drawFightShield(v, f, now) {
  if (!carryingShield() || f.p.act === 'ko') return;
  const s = shieldDef();
  const p = f.p;
  const H = 200 * v.scale, k = H / 48;
  const blocking = p.act === 'block' || p.act === 'blockstun';
  const flash = Math.max(0, 1 - (now - (f.shieldBlockAt || 0)) / 300);
  ctx.save();
  ctx.translate(v.sx(p.x), v.sy(p.y));
  if (p.facing === 'left') ctx.scale(-1, 1);
  // in front of you while blocking, at your side otherwise
  const x = blocking ? 16 * k : 9 * k, y = blocking ? -30 * k : -22 * k, w = (blocking ? 12 : 9) * k, h = w * 1.25;
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2, h * 0.1);
  ctx.quadraticCurveTo(0, h * 0.75, -w / 2, h * 0.1);
  ctx.closePath();
  ctx.fillStyle = s.color;
  ctx.fill();
  ctx.lineWidth = 1.2 * k * 0.5;
  ctx.strokeStyle = s.trim;
  ctx.stroke();
  ctx.font = `${Math.round(w * 0.6)}px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(s.emoji, 0, -h * 0.05);
  if (flash > 0 || shieldKind === 'star') {
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(flash, 0.2 + 0.2 * Math.sin(now / 150))})`;
    ctx.lineWidth = 2 * k * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, w * (0.8 + 0.3 * (1 - flash)), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
registerFightLayer(11, (v, f, now) => drawFightShield(v, f, now));

// Fight HUD: the shield's rating as a thin bar under your armor's
function drawShieldMeter(v, f, now) {
  if (!shieldDef() || f.phase === 'result') return;
  const W = canvas.width, pad = 12;
  const plateW = Math.min(320, (W - pad * 2 - 50) / 2);
  const x = pad, y = pad + 50 + 6 + 22 + 5 + 18 + 5 + 18 + 5, w = plateW, h = 18;
  const frac = shieldRating / shieldDef().max;
  const flash = Math.max(0, 1 - (now - (f.shieldWornAt || 0)) / 300);
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 6, 0.8)';
  roundRect(x, y, w, h, 7);
  ctx.fill();
  const ix = x + 30, iw = w - 36 - 44, iy = y + 4, ih = h - 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ix, iy, iw, ih, 4);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = frac > 0.3 ? '#FFD54F' : '#FF8A65';
    roundRect(ix, iy, iw * frac, ih, 4);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 213, 79, ${flash * 0.5})`;
    roundRect(x, y, w, h, 7);
    ctx.fill();
  }
  ctx.font = `12px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(shieldDef().emoji, x + 15, y + h / 2 + 1);
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.fillStyle = shieldRating > 0 ? '#ECEFF1' : '#FF8A80';
  ctx.textAlign = 'right';
  ctx.fillText(shieldRating > 0 ? String(shieldRating) : 'WORN', x + w - 8, y + h / 2 + 1);
  ctx.restore();
}
registerFightLayer(61, (v, f, now) => drawShieldMeter(v, f, now));

// Map HUD: "🪵 85" after your armor (nothing if you have no shield)
registerHudBadge((x, y) => {
  if (!carryingShield() || !mapConfig) return 0;
  const text = `🛡️${shieldDef().emoji} ${shieldRating}`;
  ctx.save();
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  const w = ctx.measureText(text).width + 22;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(x, y, w, 36, 8);
  ctx.fill();
  ctx.fillStyle = shieldRating > 0.3 * shieldDef().max ? '#FFE082' : '#FF8A65';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 11, y + 19);
  ctx.restore();
  return w;
});

// A shield that wore out in a fight is dropped, with a line on the result screen
onGameEvent('fightOver', ({ res }) => {
  if (shieldDef() && shieldRating <= 0) {
    res.lines.push({ text: `Your ${shieldDef().emoji} ${shieldDef().name} is worn out! Charlie can sell you another at the Fifth Camp. 🦊`, color: '#FFE082' });
    shieldKind = null;      // (saved right after, by finishFight)
  }
});
