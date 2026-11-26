// ============================================================
// THE SECOND CAMP — opening the secret passage in the Blob's cave
// ============================================================
// Beat the Blob at its top level (BOSS_LEVEL_MAX) and the cave on the main
// map opens a secret passage to the second camp (assets/camp_level2.json),
// where the Marshmallows live (mallows.js). Lose to a Marshmallow and the
// passage shuts again until you beat the Blob once more. Whether it's open is
// saved per camper (`level2Open`).
//
// The cave hotspot says where the passage goes:
//   "passage": { "targetMap": "assets/camp_level2.json", "targetHotspot": "cave_exit" }
// While the passage is open, Space at the cave goes through it (your sidekick
// comes too) instead of knocking for the Blob.
let level2Open = false;
registerSaveField('level2Open', { save: () => level2Open, load: s => { level2Open = !!s.level2Open; } });

function lockLevel2() { level2Open = false; }

// Which passages are open. A passage names its lock (`"lock": "level3"`,
// default "level2"); each level that opens one adds its check here.
const PASSAGE_LOCKS = { level2: () => level2Open };
function passageLock(obj) { return (obj.passage && obj.passage.lock) || 'level2'; }
function passageOpen(obj) {
  const isOpen = PASSAGE_LOCKS[passageLock(obj)];
  return !!obj.passage && !!isOpen && isOpen();
}

// Beat the toughest Blob: the passage opens
onGameEvent('fightOver', ({ foe, won, level, res }) => {
  if (foe.id !== 'blob' || !won || level < BOSS_LEVEL_MAX) return;
  res.lines.push({
    text: level2Open
      ? '🕳️ The secret passage in the cave is still open. Adventure awaits!'
      : '🕳️ RUMBLE RUMBLE... A secret passage opened in the cave! Go through it to find a whole new camp!',
    color: '#CE93D8'
  });
  level2Open = true;
});

function goThroughPassage(obj) {
  if (doorOpening || bossEngage) return;
  switchMap(obj.passage.targetMap, obj.passage.targetHotspot);
}
registerHotspotKind({
  match: obj => passageOpen(obj),
  interact: obj => goThroughPassage(obj),
  hint: () => isTouchDevice() ? '🕳️ [ TAP ] Secret passage!' : '🕳️ [ SPACE ] Secret passage!'
}, { first: true });

// A purple glow swirling in the passage's mouth (the cave's, or where the
// passage's `glow` says: { "x", "y" } fractions of the hotspot box)
function drawPassageGlow(c) {
  const now = performance.now();
  const mw = c.width * 0.46, mh = c.height * 0.6;
  const g0 = c.passage.glow;
  const cx = c.x + c.width * (g0 ? g0.x : 0.5), cy = g0 ? c.y + c.height * g0.y : c.y + c.height - mh * 0.4;
  const r = mw * (0.45 + 0.04 * Math.sin(now / 300));
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(225, 190, 255, 0.9)');
  g.addColorStop(0.5, 'rgba(171, 71, 188, 0.55)');
  g.addColorStop(1, 'rgba(123, 31, 162, 0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(243, 229, 245, 0.7)';
  ctx.lineWidth = Math.max(1.5, mw * 0.03);
  for (let i = 0; i < 3; i++) {
    const a = now / 500 + i * 2.1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.35 + i * 0.18), a, a + 2.2);
    ctx.stroke();
  }
  ctx.restore();
}
// (exploration mode glows the ones that aren't open: explore.js)
registerMapLayer(21, () => { for (const o of interactiveObjects) if (passageOpen(o)) drawPassageGlow(o); });
