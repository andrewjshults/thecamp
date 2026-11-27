// ============================================================
// FIGHT CHARMS — the prizes you can win on the prize wheel
// ============================================================
// You win them by spinning the prize wheel after an adventure (wheel.js).
// They go in your charm pouch (`charms`, saved per camper), not the backpack,
// and help in your next boss fight (the Blob, the Marshmallows, the Brick).
// One of each kind you have goes into each fight, and it's only used up when
// it does something:
//   potion  +CHARM_POTION_STRENGTH 💪 for the whole fight (always used)
//   bubble  stops the next CHARM_BUBBLE_HITS hits that would land on you (always used)
//   honey   when your 💪 drops to CHARM_HONEY_AT or less, +CHARM_HONEY_GIVES back (used then)
//   polish  your sword is as good as new before the fight (used if it's worn at all)
// See docs/prize-wheel.md.
const CHARM_POTION_STRENGTH = 4;
const CHARM_BUBBLE_HITS = 2;
const CHARM_HONEY_AT = 3;
const CHARM_HONEY_GIVES = 5;
const CHARM_KINDS = {
  potion: { name: 'Power Potion', emoji: '🧪', color: '#BA68C8', about: `+${CHARM_POTION_STRENGTH} 💪 in your next fight` },
  bubble: { name: 'Bubble Shield', emoji: '🫧', color: '#4FC3F7', about: `Pops the next ${CHARM_BUBBLE_HITS} hits that would land on you` },
  honey:  { name: 'Honey Drop', emoji: '🍯', color: '#FFB300', about: `When your 💪 gets down to ${CHARM_HONEY_AT}, +${CHARM_HONEY_GIVES} back` },
  polish: { name: 'Sword Polish', emoji: '✨', color: '#FFF176', about: 'Your sword is as good as new for your next fight' }
};
let charms = {};   // kind → how many you have
registerSaveField('charms', {
  save: () => charms,
  load: s => {
    charms = {};
    const saved = s && s.charms && typeof s.charms === 'object' ? s.charms : {};
    for (const id of Object.keys(CHARM_KINDS)) {
      const n = Math.floor(Number(saved[id]));
      if (n > 0) charms[id] = n;
    }
  }
});
function charmCount(id) { return charms[id] || 0; }
function addCharm(id) {
  charms[id] = charmCount(id) + 1;
  writeSave();
}
function spendCharm(f, id) {
  charms[id] = Math.max(0, charmCount(id) - 1);
  if (!charms[id]) delete charms[id];
  f.charmsUsed.push(id);
}

// ---------- In a fight ----------
// fight.charms: what's working this fight { bubbles, honey }; fight.charmsUsed: ids used up
onGameEvent('fightStart', f => {
  f.charms = { bubbles: 0, honey: false };
  f.charmsUsed = [];
  if (f.foe.id === 'sim') return;          // tools/fight-sim.js: leave the pouch alone
  const now = performance.now();
  let popY = 380;
  const pop = id => { fightPop(f, `${CHARM_KINDS[id].emoji} ${CHARM_KINDS[id].name.toUpperCase()}!`, f.p.x, popY, CHARM_KINDS[id].color, 0.75); popY += 40; };
  if (charmCount('potion')) {
    spendCharm(f, 'potion');
    f.p.strength += CHARM_POTION_STRENGTH;
    f.p.maxStrength += CHARM_POTION_STRENGTH;
    pop('potion');
  }
  if (charmCount('bubble')) {
    spendCharm(f, 'bubble');
    f.charms.bubbles = CHARM_BUBBLE_HITS;
    pop('bubble');
  }
  if (charmCount('polish') && swordRating < swordMax()) {
    spendCharm(f, 'polish');
    swordRating = swordMax();
    pop('polish');
  }
  f.charms.honey = charmCount('honey') > 0;
  f.charmsAt = now;
  if (f.charmsUsed.length) writeSave();
});

// The bubble pops instead of you getting hit
registerPlayerHitGuard((f, now) => {
  if (!f.charms || f.charms.bubbles <= 0) return false;
  f.charms.bubbles--;
  const away = f.p.x > f.b.x ? 1 : -1;
  f.p.pushV = 320 * away;
  f.bubblePopAt = now;
  f.sparks.push({ x: f.p.x - away * 30, y: 150, color: '#B3E5FC', start: now });
  fightPop(f, f.charms.bubbles ? 'POP! 🫧' : 'POP! 🫧 (last one!)', f.p.x, 300, '#E1F5FE', 1);
  f.shake = 4;
  return true;
});

// Honey: the moment you get weak, a sticky +5
registerFrameUpdate(45, () => {
  const f = fight;
  if (state !== GameState.FIGHTING || !f || f.phase !== 'fight' || !f.charms || !f.charms.honey) return;
  if (f.p.strength > CHARM_HONEY_AT || !charmCount('honey')) return;
  f.charms.honey = false;
  spendCharm(f, 'honey');
  f.p.strength = Math.min(f.p.maxStrength, f.p.strength + CHARM_HONEY_GIVES);
  fightPop(f, `🍯 HONEY! +${CHARM_HONEY_GIVES} 💪`, f.p.x, 360, '#FFD54F', 1);
  writeSave();
});

// The bubble around you while it lasts
function drawFightBubble(v, f, now) {
  if (!f.charms || f.phase === 'result') return;
  const popT = (now - (f.bubblePopAt || -1e9)) / 300;
  if (f.charms.bubbles <= 0 && popT > 1) return;
  const p = f.p;
  const r = 125 * v.scale * (popT < 1 ? 1 + 0.4 * popT : 1 + 0.03 * Math.sin(now / 260));
  const alpha = f.charms.bubbles > 0 ? 0.55 : 0.55 * (1 - popT);
  ctx.save();
  ctx.translate(v.sx(p.x), v.sy(p.y + 100));
  ctx.strokeStyle = `rgba(179, 229, 252, ${alpha})`;
  ctx.fillStyle = `rgba(179, 229, 252, ${alpha * 0.25})`;
  ctx.lineWidth = Math.max(2, 4 * v.scale);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.16, r * 0.09, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
registerFightLayer(20, (v, f, now) => drawFightBubble(v, f, now));

// Fight HUD: the charms working this fight, under your sword's (and armor's) bar
function drawFightCharms(v, f) {
  if (!f.charms || f.phase === 'result') return;
  const icons = [];
  if (f.charmsUsed.includes('potion')) icons.push(CHARM_KINDS.potion.emoji);
  for (let i = 0; i < f.charms.bubbles; i++) icons.push(CHARM_KINDS.bubble.emoji);
  if (f.charms.honey) icons.push(CHARM_KINDS.honey.emoji);
  if (!icons.length) return;
  const pad = 12;
  const y = pad + 50 + 6 + 22 + 5 + 18 + 5 + (typeof armorDef === 'function' && armorDef() ? 23 : 0);
  const text = icons.join(' ');
  ctx.save();
  ctx.font = `14px ${SCENE_EMOJI_FONT}`;
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = 'rgba(20, 12, 6, 0.8)';
  roundRect(pad, y, w, 22, 7);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, pad + 8, y + 12);
  ctx.restore();
}
registerFightLayer(62, (v, f) => drawFightCharms(v, f));

// The result screen says which charms you used
onGameEvent('fightOver', ({ res }) => {
  const f = fight;
  if (!f || !f.charmsUsed || !f.charmsUsed.length) return;
  const names = f.charmsUsed.map(id => `${CHARM_KINDS[id].emoji} ${CHARM_KINDS[id].name}`).join(', ');
  res.lines.push({ text: `Charms used: ${names}`, color: '#E1BEE7' });
});

// Map HUD: "🎁 🧪2 🫧1" (nothing if your pouch is empty)
registerHudBadge((x, y) => {
  const ids = Object.keys(CHARM_KINDS).filter(id => charmCount(id));
  if (!ids.length || !mapConfig) return 0;
  const text = ids.map(id => `${CHARM_KINDS[id].emoji}${charmCount(id)}`).join(' ');
  ctx.save();
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  const w = ctx.measureText(text).width + 22;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(x, y, w, 36, 8);
  ctx.fill();
  ctx.fillStyle = '#E1BEE7';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 11, y + 19);
  ctx.restore();
  return w;
});
