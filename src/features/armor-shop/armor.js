// ============================================================
// ARMOR — the four kinds you can buy at Shelly's Armor Shop (Third Camp)
// ============================================================
// Armor sometimes stops a boss's hit before it lands: no point for the boss,
// and no 💪 lost ("ARMOR! 🛡️"). It works against every boss on every level.
// It wears out like a sword: ARMOR_STOP_WEAR for every hit it stops, and
// ARMOR_HIT_WEAR for every hit that gets through. At 0 it's done (it does
// nothing until you buy more). You wear one at a time: `armorKind` and
// `armorRating` are saved per camper.
//
// A kind is { name, emoji, price, max (its rating when new), stop (chance it
// stops a hit), color (how it looks in a fight), about (in the shop) }.
// Tuned with tools/fight-sim.js (see docs/armor-shop.md).
const ARMOR_STOP_WEAR = 12;
const ARMOR_HIT_WEAR = 6;
const ARMOR_KINDS = {
  vest: {
    name: 'Padded Vest', emoji: '🥋', price: 30, max: 120, stop: 0.1, color: '#A1887F', trim: '#6D4C41',
    about: 'Stops about 1 hit in 10. Lasts about 2 fights.'
  },
  chain: {
    name: 'Chain Mail', emoji: '⛓️', price: 50, max: 160, stop: 0.14, color: '#B0BEC5', trim: '#607D8B',
    about: 'Stops about 1 hit in 7. Lasts about 2–3 fights.'
  },
  knight: {
    name: 'Knight Armor', emoji: '🛡️', price: 70, max: 200, stop: 0.18, color: '#ECEFF1', trim: '#FFC107',
    about: 'Stops about 1 hit in 5. Lasts about 3 fights.'
  },
  crystal: {
    name: 'Crystal Armor', emoji: '💎', price: 100, max: 260, stop: 0.26, color: '#B2EBF2', trim: '#BA68C8',
    about: 'Stops about 1 hit in 4! Lasts about 4 fights. It sparkles!'
  }
};
let armorKind = null;     // which armor you're wearing (null: none)
let armorRating = 0;      // how much it has left (0: worn out)
registerSaveField('armorKind', {
  save: () => armorKind,
  load: s => { armorKind = s && ARMOR_KINDS[s.armorKind] ? s.armorKind : null; }
});
registerSaveField('armorRating', {
  save: () => armorRating,
  load: s => {
    const n = Number(s && s.armorRating);
    armorRating = armorKind && Number.isFinite(n) ? clamp(Math.round(n), 0, ARMOR_KINDS[armorKind].max) : 0;
  }
});
function armorDef() { return armorKind ? ARMOR_KINDS[armorKind] : null; }
function wearingArmor() { return !!armorDef() && armorRating > 0; }

// Put on new armor of kind `id` (the old one is traded in)
function equipArmor(id) {
  armorKind = ARMOR_KINDS[id] ? id : null;
  armorRating = armorKind ? ARMOR_KINDS[armorKind].max : 0;
  writeSave();
}

function wearArmor(f, n) {
  if (!wearingArmor()) return;
  armorRating = Math.max(0, armorRating - n);
  f.armorWornAt = performance.now();
  if (armorRating === 0) fightPop(f, `${armorDef().name.toUpperCase()} WORN OUT! ${armorDef().emoji}`, f.p.x, 440, '#FFAB91', 0.85);
}

// A boss's hit is about to land on you: maybe your armor stops it
registerPlayerHitGuard((f, now) => {
  if (!wearingArmor()) return false;
  const a = armorDef();
  if (Math.random() >= a.stop) {
    wearArmor(f, ARMOR_HIT_WEAR);
    return false;
  }
  const away = f.p.x > f.b.x ? 1 : -1;
  wearArmor(f, ARMOR_STOP_WEAR);
  f.p.pushV = 300 * away;
  f.armorBlockAt = now;
  f.sparks.push({ x: f.p.x - away * 30, y: 150, color: a.trim, start: now });
  fightPop(f, `ARMOR! ${a.emoji}`, f.p.x, 280, '#E1F5FE', 1);
  f.shake = 5;
  if (f.def && f.def.missPhrases && Math.random() < 0.5) fightSay(f, bossSays('missPhrases'), 900);
  return true;
});

// ---------- How it looks ----------
// In the fight: a breastplate over your shirt (the same box as the shirt in
// drawCharacterSprite), flashing when it stops a hit
function drawFightArmor(v, f, now) {
  if (!wearingArmor()) return;
  const a = armorDef();
  const p = f.p;
  const H = 200 * v.scale, s = H / 48;
  ctx.save();
  ctx.translate(v.sx(p.x), v.sy(p.y));
  if (p.facing === 'left') ctx.scale(-1, 1);
  if (p.act === 'hit') ctx.rotate(-0.18);
  if (p.act === 'ko') ctx.rotate(-0.18 - Math.min(1, (now - p.actStart) / 600) * 0.7);
  const x0 = -15 * s, y0 = -48 * s;
  const flash = Math.max(0, 1 - (now - (f.armorBlockAt || 0)) / 350);
  ctx.lineWidth = 1.6 * s * 0.5;
  ctx.strokeStyle = '#263238';
  // shoulder pads
  ctx.fillStyle = a.color;
  for (const sx of [3, 21]) {
    ctx.beginPath();
    ctx.ellipse(x0 + (sx + 3) * s, y0 + 17 * s, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // the breastplate
  ctx.beginPath();
  ctx.moveTo(x0 + 5 * s, y0 + 15.5 * s);
  ctx.lineTo(x0 + 25 * s, y0 + 15.5 * s);
  ctx.lineTo(x0 + 24 * s, y0 + 30 * s);
  ctx.quadraticCurveTo(x0 + 15 * s, y0 + 35 * s, x0 + 6 * s, y0 + 30 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = a.trim;
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(x0 + 15 * s, y0 + 17 * s);
  ctx.lineTo(x0 + 15 * s, y0 + 31 * s);
  ctx.stroke();
  if (armorKind === 'crystal' || flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(flash * 0.8, 0.25 + 0.2 * Math.sin(now / 150))})`;
    ctx.beginPath();
    ctx.arc(x0 + 10 * s, y0 + 20 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.strokeStyle = `rgba(225, 245, 254, ${flash})`;
    ctx.lineWidth = 3 * s * 0.5;
    ctx.beginPath();
    ctx.arc(x0 + 15 * s, y0 + 24 * s, 16 * s * (1 + 0.3 * (1 - flash)), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
registerFightLayer(10, (v, f, now) => drawFightArmor(v, f, now));

// Fight HUD: the armor's rating as a thin bar under your sword's
function drawArmorMeter(v, f, now) {
  if (!armorDef() || f.phase === 'result') return;
  const W = canvas.width, pad = 12;
  const plateW = Math.min(320, (W - pad * 2 - 50) / 2);
  const x = pad, y = pad + 50 + 6 + 22 + 5 + 18 + 5, w = plateW, h = 18;
  const frac = armorRating / armorDef().max;
  const flash = Math.max(0, 1 - (now - (f.armorWornAt || 0)) / 300);
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 6, 0.8)';
  roundRect(x, y, w, h, 7);
  ctx.fill();
  const ix = x + 30, iw = w - 36 - 44, iy = y + 4, ih = h - 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ix, iy, iw, ih, 4);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = frac > 0.3 ? '#81D4FA' : '#FFCA28';
    roundRect(ix, iy, iw * frac, ih, 4);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(129, 212, 250, ${flash * 0.5})`;
    roundRect(x, y, w, h, 7);
    ctx.fill();
  }
  ctx.font = `12px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(armorDef().emoji, x + 15, y + h / 2 + 1);
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.fillStyle = armorRating > 0 ? '#ECEFF1' : '#FF8A80';
  ctx.textAlign = 'right';
  ctx.fillText(armorRating > 0 ? String(armorRating) : 'WORN', x + w - 8, y + h / 2 + 1);
  ctx.restore();
}
registerFightLayer(60, (v, f, now) => drawArmorMeter(v, f, now));

// Map HUD: "🛡️ 85" next to your sword (nothing if you have no armor)
registerHudBadge((x, y) => {
  if (!wearingArmor() || !mapConfig) return 0;
  const text = `${armorDef().emoji} ${armorRating}`;
  ctx.save();
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  const w = ctx.measureText(text).width + 22;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(x, y, w, 36, 8);
  ctx.fill();
  ctx.fillStyle = armorRating > 0.3 * armorDef().max ? '#B3E5FC' : '#FFCA28';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 11, y + 19);
  ctx.restore();
  return w;
});

// Armor that wore out in a fight comes off, with a line on the result screen
onGameEvent('fightOver', ({ res }) => {
  if (armorDef() && armorRating <= 0) {
    res.lines.push({ text: `Your ${armorDef().emoji} ${armorDef().name} is worn out! Shelly can sell you more at the Third Camp. 🐢`, color: '#FFE082' });
    armorKind = null;      // (saved right after, by finishFight)
  }
});
