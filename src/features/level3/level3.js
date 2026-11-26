// ============================================================
// THE THIRD CAMP — the passage in the Marshmallows' hole, and the poison moat
// ============================================================
// Beat Mega Mallow at its top level (MALLOW_LEVEL_MAX) and the hole in the
// middle of the Second Camp's Blob Fight Zone opens a secret passage to the
// third camp (assets/camp_level3.json), where the Brick lives in its castle
// (brick.js). Lose to the Brick and the passage shuts again until you beat
// Mega Mallow once more. Whether it's open is saved per camper (`level3Open`).
//
// The lair hotspot says where the passage goes (see PASSAGE_LOCKS in level2.js):
//   "passage": { "targetMap": "assets/camp_level3.json", "targetHotspot": "hole_back", "lock": "level3" }
//
// The castle stands on an island in a poison moat (the map's `poisonMoat`).
// Stay in the moat for `seconds` (10) in a row and you're sent back to the
// Second Camp. The passage stays open: you just have to walk back.
let level3Open = false;
registerSaveField('level3Open', { save: () => level3Open, load: s => { level3Open = !!s.level3Open; } });
PASSAGE_LOCKS.level3 = () => level3Open;

function lockLevel3() { level3Open = false; }

// Beat the hottest Mega Mallow: the passage opens
onGameEvent('fightOver', ({ foe, won, level, res }) => {
  if (foe.id !== 'mega_mallow' || !won || level < MALLOW_LEVEL_MAX) return;
  res.lines.push({
    text: level3Open
      ? '🕳️ The secret passage in the Marshmallows\' hole is still open. A castle awaits!'
      : '🕳️ RUMBLE RUMBLE... A secret passage opened in the Marshmallows\' hole! Go down it to find the Third Camp!',
    color: '#CE93D8'
  });
  level3Open = true;
});

// ---------- The poison moat ----------
//   "poisonMoat": {
//     "outer":  { "cx", "cy", "rx", "ry" },        // the moat's outside edge (an ellipse, 0–1 of the map)
//     "island": { "cx", "cy", "rx", "ry" },        // the castle's island in the middle (safe)
//     "bridge": { "px", "py", "pw", "ph" },        // the bridge across it (safe)
//     "seconds": 10,                               // how long you can stay in
//     "sendTo": { "map", "hotspot" }               // where it sends you
//   }
const moat = { ms: 0, lastT: 0, warned: false };

function moatCfg() { return (mapConfig && mapConfig.poisonMoat) || null; }
function inMapEllipse(x, y, e) {
  return ((x / scaledMapW - e.cx) / e.rx) ** 2 + ((y / scaledMapH - e.cy) / e.ry) ** 2 < 1;
}
function inPoisonMoat(x, y) {
  const c = moatCfg();
  if (!c || !inMapEllipse(x, y, c.outer) || inMapEllipse(x, y, c.island)) return false;
  const b = c.bridge, fx = x / scaledMapW, fy = y / scaledMapH;
  return !(b && fx > b.px && fx < b.px + b.pw && fy > b.py && fy < b.py + b.ph);
}
function moatLimitMs() { return ((moatCfg() && moatCfg().seconds) || 10) * 1000; }

function updatePoisonMoat() {
  const now = performance.now();
  const dt = Math.min(100, now - (moat.lastT || now));
  moat.lastT = now;
  const c = moatCfg();
  if (!c || !player.character || state !== GameState.PLAYING || doorOpening || !inPoisonMoat(player.x, player.y)) {
    moat.ms = 0;
    moat.warned = false;
    return;
  }
  if (!moat.warned) {
    moat.warned = true;
    kitchenToast(`☠️ Yuck! That's POISON! Get out in ${c.seconds || 10} seconds, or you'll be sent back to the Second Camp!`);
  }
  moat.ms += dt;
  if (moat.ms < moatLimitMs()) return;
  moat.ms = 0;
  moat.warned = false;
  const to = c.sendTo || { map: 'assets/camp_level2.json', hotspot: 'blob_zone' };
  switchMap(to.map, to.hotspot);
  kitchenToast('☠️ Too long in the poison moat! You washed all the way back to the Second Camp. Go back down the hole to try again!');
}
registerMapUpdate(14, () => updatePoisonMoat());
onGameEvent('mapArrive', () => { moat.ms = 0; moat.warned = false; });

// Bubbles fizzing around your feet while you're in it (map coordinates)
function drawMoatBubbles() {
  if (!moat.ms) return;
  const now = performance.now();
  const k = SPRITE_SCALE / BASE_SPRITE_SCALE;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const t = ((now / 900 + i / 7) % 1);
    const x = player.x + Math.sin(i * 2.3 + now / 400) * 34 * k;
    const y = player.y - t * 60 * k;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = i % 2 ? '#CE93D8' : '#CCFF90';
    ctx.beginPath();
    ctx.arc(x, y, (4 + (i % 3) * 2) * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
registerMapLayer(55, () => drawMoatBubbles());

// A green glow round the screen and a countdown (screen coordinates)
function drawMoatWarning() {
  if (!moat.ms) return;
  const W = canvas.width, H = canvas.height;
  const left = Math.max(0, Math.ceil((moatLimitMs() - moat.ms) / 1000));
  const u = moat.ms / moatLimitMs();
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, 'rgba(118, 255, 3, 0)');
  g.addColorStop(1, `rgba(118, 255, 3, ${0.25 + 0.35 * u})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const text = `☠️ POISON! Get out!  ${left}`;
  ctx.font = 'bold 22px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 36, h = 42, y = 64;
  const pulse = 1 + 0.06 * Math.sin(performance.now() / 120);
  ctx.translate(W / 2, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(74, 20, 140, 0.9)';
  roundRect(-w / 2, -h / 2, w, h, 14);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#CCFF90';
  ctx.stroke();
  ctx.fillStyle = '#F1F8E9';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}
registerScreenLayer(85, () => drawMoatWarning());
