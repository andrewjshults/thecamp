// ============================================================
// THE FOURTH CAMP — the trapdoor in the Brick's castle, the slime pit,
// the throne key, and the way to Level 5 (coming soon)
// ============================================================
// Beat the Brick at its top level (BRICK_LEVEL_MAX) and the trapdoor in its
// castle opens a secret passage down to the fourth camp
// (assets/camp_level4.json), where the Slime Brick lives (slime-brick.js).
// Lose to the Slime Brick and the trapdoor shuts again until you beat the
// Brick once more. Whether it's open is saved per camper (`level4Open`).
//
// The castle's trapdoor says where the passage goes (see PASSAGE_LOCKS in level2.js):
//   "passage": { "targetMap": "assets/camp_level4.json", "targetHotspot": "passage_back", "lock": "level4" }
//
// Every building's door on the fourth camp needs a code (codes.js), and the
// Slime Brick's throne needs the key hanging outside it (below).
let level4Open = false;
registerSaveField('level4Open', { save: () => level4Open, load: s => { level4Open = !!s.level4Open; } });
PASSAGE_LOCKS.level4 = () => level4Open;

function lockLevel4() { level4Open = false; }

// Beat the hardest Brick: the trapdoor opens
onGameEvent('fightOver', ({ foe, won, level, res }) => {
  if (foe.id !== 'brick' || !won || level < BRICK_LEVEL_MAX) return;
  res.lines.push({
    text: level4Open
      ? '🕳️ The trapdoor in the castle floor is still open. The Slime Brick is waiting!'
      : '🕳️ CREEEAK... A trapdoor opened in the castle floor! Climb down it to find the Fourth Camp!',
    color: '#CE93D8'
  });
  level4Open = true;
});

// ---------- The slime pit: sticky, so you walk slowly ----------
//   "slimePit": { "cx", "cy", "rx", "ry",   // an ellipse, 0–1 of the map
//                 "slow": 0.45 }            // × your walking speed while you're in it
function slimePitCfg() { return (mapConfig && mapConfig.slimePit) || null; }
function inSlimePit(x, y) {
  const c = slimePitCfg();
  return !!c && ((x / scaledMapW - c.cx) / c.rx) ** 2 + ((y / scaledMapH - c.cy) / c.ry) ** 2 < 1;
}
let slimePitWarned = false;
registerPlayerSpeed(() => {
  const c = slimePitCfg();
  return c && player.character && inSlimePit(player.x, player.y) ? (c.slow || 0.5) : 1;
});
registerMapUpdate(15, () => {
  const stuck = inSlimePit(player.x, player.y);
  if (stuck && !slimePitWarned) kitchenToast('🫧 Squelch! The slime is SO sticky. You can only walk slowly in here!');
  slimePitWarned = stuck;
});
onGameEvent('mapArrive', () => { slimePitWarned = false; });

// Goo splashing round your feet while you wade through it (map coordinates)
function drawSlimeFeet() {
  if (!slimePitCfg() || !inSlimePit(player.x, player.y)) return;
  const now = performance.now();
  const k = SPRITE_SCALE / BASE_SPRITE_SCALE;
  ctx.save();
  ctx.fillStyle = 'rgba(139, 195, 74, 0.75)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 34 * k, 10 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const t = (now / 700 + i / 4) % 1;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = i % 2 ? '#C6FF00' : '#9CCC65';
    ctx.beginPath();
    ctx.arc(player.x + Math.sin(i * 2.1) * 26 * k, player.y - t * 30 * k, (4 + i) * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
registerMapLayer(56, () => drawSlimeFeet());

// ---------- The throne key ----------
// A hotspot with `keyLock` is a door that needs a key:
//   "keyLock": { "itemId": "throne_key", "hook": "key_hook" }
// The key hangs on the `hook` hotspot (as an item you pick up). Bring it to
// the door: it unlocks for good (`throneUnlocked`, saved per camper), and you
// hang the key back on its hook for the next camper. After that the door just
// opens.
let throneUnlocked = false;
registerSaveField('throneUnlocked', { save: () => throneUnlocked, load: s => { throneUnlocked = !!s.throneUnlocked; } });

function openKeyDoor(obj) {
  if (doorOpening || bossEngage) return;
  if (obj.door) doorOpening = { obj, start: performance.now() };
  else switchMap(obj.targetMap, obj.targetHotspot);
}

function useThroneKey(obj) {
  if (throneUnlocked) { openKeyDoor(obj); return; }
  const lock = obj.keyLock;
  const i = backpack.findIndex(it => it.id === lock.itemId);
  if (i < 0) {
    kitchenToast('🔒 Locked tight! There\'s a big keyhole... Maybe the key is hanging somewhere close by? 🗝️');
    return;
  }
  // Unlock it, and hang the key back up for the next camper
  const [key] = backpack.splice(i, 1);
  delete key.pickedUpFrom;
  const there = hotspotItems[lock.hook] || (hotspotItems[lock.hook] = []);
  if (mp.active) mpRequestDrop(lock.hook, key);
  else if (there.length < HOTSPOT_CAPACITY) there.push(key);
  throneUnlocked = true;
  writeSave();
  kitchenToast('🗝️ CLICK! The throne is unlocked, and it stays unlocked! You hang the key back on its hook.');
  openKeyDoor(obj);
}

registerHotspotKind({
  match: obj => !!obj.keyLock && !!obj.targetMap,
  interact: obj => useThroneKey(obj),
  hint: () => throneUnlocked ? `🚪 ${actionKeyLabel()}`
    : backpack.some(it => it.id === 'throne_key') ? `🗝️ ${actionKeyLabel()} Unlock!` : '🔒 Locked'
}, { first: true });

// The key, drawn hanging on its hook while it's there (map coordinates)
function drawHangingKeys() {
  for (const obj of interactiveObjects) {
    if (!obj.keyLock || !obj.keyLock.hook) continue;
    const hook = interactiveObjects.find(o => o.id === obj.keyLock.hook);
    if (!hook || !(hotspotItems[hook.id] || []).some(it => it.id === obj.keyLock.itemId)) continue;
    const now = performance.now();
    const size = hook.height * 0.55;
    const x = hook.x + hook.width * 0.45, y = hook.y + hook.height * 0.55;
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size);
    glow.addColorStop(0, `rgba(255, 236, 130, ${0.5 + 0.2 * Math.sin(now / 300)})`);
    glow.addColorStop(1, 'rgba(255, 236, 130, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, y - size * 0.4);
    ctx.rotate(Math.sin(now / 600) * 0.15);     // swinging gently
    drawFoodEmoji('🗝️', 0, size * 0.4, size);
    ctx.restore();
  }
}
registerMapLayer(51, () => drawHangingKeys());

// ---------- Level 5: coming soon ----------
// A hotspot with `"comingSoon": true` (in the Slime Brick's throne room) is
// where the way to Level 5 will be: a swirly glow, and its pop-up says so.
registerMapLayer(21, () => {
  for (const o of interactiveObjects) if (o.comingSoon) drawPassageGlow({ ...o, passage: { glow: o.glow || { x: 0.5, y: 0.55 } } });
});
