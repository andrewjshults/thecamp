// ============================================================
// THE FIFTH CAMP — the portal in the Slime Brick's throne room, and the
// river of lava you hop across, rock to rock
// ============================================================
// Beat the Slime Brick at its top level (SLIME_LEVEL_MAX) and the swirly
// portal in its throne room opens a secret passage to the fifth camp
// (assets/camp_level5.json), where the Moon lives (moon.js). Lose to the Moon
// and the portal shuts again until you beat the Slime Brick once more.
// Whether it's open is saved per camper (`level5Open`).
//
// The throne room's portal says where the passage goes (see PASSAGE_LOCKS in level2.js):
//   "passage": { "targetMap": "assets/camp_level5.json", "targetHotspot": "passage_back", "lock": "level5" }
//
// A river of lava runs through the middle of the camp (the map's
// `lavaRiver`). Rocks stick out of it: press J (or tap a rock) to hop to the
// next one. Touch the lava and you have `seconds` (3) to get out, or you're
// sent back to the Fourth Camp. The passage stays open: you just walk back.
let level5Open = false;
registerSaveField('level5Open', { save: () => level5Open, load: s => { level5Open = !!s.level5Open; } });
PASSAGE_LOCKS.level5 = () => level5Open;

function lockLevel5() { level5Open = false; }

// Beat the slimiest Slime Brick: the portal opens
onGameEvent('fightOver', ({ foe, won, level, res }) => {
  if (foe.id !== 'slime_brick' || !won || level < SLIME_LEVEL_MAX) return;
  res.lines.push({
    text: level5Open
      ? '🌀 The portal in the throne room is still open. The Moon is waiting!'
      : '🌀 WHOOSH... The swirly portal in the Slime Brick\'s throne room opened! Go through it to find the Fifth Camp!',
    color: '#CE93D8'
  });
  level5Open = true;
});

// ---------- The lava river ----------
//   "lavaRiver": {
//     "pools": [ { "name", "points": [[x, y], ...] } ],   // lava shapes (polygons, 0–1 of the map)
//     "rocks": [ { "cx", "cy", "r" } ],                  // rocks sticking out (r: 0–1 of the map's width)
//     "hop": 0.1,                                        // how far a hop goes (0–1 of the map's width)
//     "seconds": 3,                                      // how long you can stay in the lava
//     "sendTo": { "map", "hotspot" }                     // where it sends you
//   }
const LAVA_HOP_MS = 450;
const lava = { ms: 0, lastT: 0, warned: false };
const hop = { now: null, dirX: 1, dirY: 0, lastX: 0, lastY: 0 };   // now: { fx, fy, tx, ty, start } while in the air
let lavaHopHinted = false;   // the "press J" hint has been shown (saved per camper)
registerSaveField('lavaHopHinted', { save: () => lavaHopHinted, load: s => { lavaHopHinted = !!s.lavaHopHinted; } });

function lavaCfg() { return (mapConfig && mapConfig.lavaRiver) || null; }
function lavaLimitMs() { return ((lavaCfg() && lavaCfg().seconds) || 3) * 1000; }
function hopReach() { return ((lavaCfg() && lavaCfg().hop) || 0.1) * scaledMapW; }
function inPolygon(fx, fy, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > fy) !== (yj > fy) && fx < xi + (fy - yi) * (xj - xi) / (yj - yi)) inside = !inside;
  }
  return inside;
}
// The rock under (x, y), in map px (rocks are a bit squashed, like on the map)
function rockAt(x, y, pad = 0) {
  const c = lavaCfg();
  if (!c) return null;
  return (c.rocks || []).find(r => {
    const rad = r.r * scaledMapW + pad;
    return Math.hypot(x - r.cx * scaledMapW, (y - r.cy * scaledMapH) / 0.8) < rad;
  }) || null;
}
function rockCentre(r) { return { x: r.cx * scaledMapW, y: r.cy * scaledMapH }; }
function overLava(x, y) {
  const c = lavaCfg();
  return !!c && (c.pools || []).some(pl => inPolygon(x / scaledMapW, y / scaledMapH, pl.points));
}
// Your feet are in the lava: over it, and not on a rock
function inLava(x, y) { return overLava(x, y) && !rockAt(x, y, 6 * bossK()); }
function hopping() { return !!hop.now; }

// Where a hop would land, going the way you're walking: the best rock in
// that direction, or the bank on the other side of the lava. null: nowhere.
function hopTarget() {
  const c = lavaCfg();
  if (!c || !player.character) return null;
  const reach = hopReach(), here = rockAt(player.x, player.y, 6 * bossK());
  let best = null;
  for (const r of c.rocks || []) {
    if (r === here) continue;
    const p = rockCentre(r), dx = p.x - player.x, dy = p.y - player.y, d = Math.hypot(dx, dy);
    if (d < 20 || d > reach) continue;
    const angle = Math.acos(clamp((dx * hop.dirX + dy * hop.dirY) / d, -1, 1));
    if (angle > 1.2) continue;
    const score = d * (1 + 1.5 * angle);
    if (!best || score < best.score) best = { x: p.x, y: p.y, score, rock: r };
  }
  // The bank across the lava, straight ahead
  let crossed = false;
  for (let d = 10; d <= reach; d += 8) {
    const x = player.x + hop.dirX * d, y = player.y + hop.dirY * d;
    if (x < 10 || y < 10 || x > scaledMapW - 10 || y > scaledMapH - 10) break;
    if (inLava(x, y)) { crossed = true; continue; }
    if (!crossed || rockAt(x, y)) continue;
    const land = Math.min(reach + 30, d + 30 * bossK());
    const lx = player.x + hop.dirX * land, ly = player.y + hop.dirY * land;
    const to = inLava(lx, ly) ? { x, y } : { x: lx, y: ly };
    if (!best || d < best.score) best = { ...to, score: d, rock: null };
    break;
  }
  return best;
}

function startHop(to) {
  if (!to || hopping()) return false;
  hop.now = { fx: player.x, fy: player.y, tx: to.x, ty: to.y, start: performance.now() };
  if (Math.abs(to.x - player.x) > 2) player.facing = to.x < player.x ? 'left' : 'right';
  tapTarget = null;
  return true;
}

// J: hop. On a map with no lava (or nowhere to hop and no rock near), J is the journal as usual.
function tryHop() {
  if (!lavaCfg() || journalOpen || backpackOpen || doorOpening || bossEngage || hopping()) return false;
  const to = hopTarget();
  if (to) return startHop(to);
  const nearRock = (lavaCfg().rocks || []).some(r => {
    const p = rockCentre(r);
    return Math.hypot(p.x - player.x, p.y - player.y) < hopReach();
  });
  if (!nearRock && !overLava(player.x, player.y)) return false;
  useToast = { text: '🪨 Too far to hop that way! Walk a tiny step toward a rock, then press J.', age: 0 };
  return true;
}
registerPlayingKey(e => (e.key === 'j' || e.key === 'J') && tryHop());

// Touch: tap a rock you can reach (or the JUMP button) to hop
function jumpButtonRect() {
  const sz = Math.round(Math.max(64, Math.min(86, canvas.width * 0.14)));
  return { x: canvas.width - sz - 18, y: canvas.height - sz * 2.6, w: sz, h: sz };
}
function showJumpButton() {
  return isTouchDevice() && !!lavaCfg() && state === GameState.PLAYING && !backpackOpen && !journalOpen &&
    (!!rockAt(player.x, player.y, 6 * bossK()) || inLava(player.x, player.y) || !!hopTarget());
}
registerPlayingTap((sx, sy) => {
  if (!lavaCfg() || hopping()) return false;
  const b = jumpButtonRect();
  if (showJumpButton() && sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
    if (!tryHop()) useToast = { text: '🪨 Nowhere to hop that way! Walk toward a rock first.', age: 0 };
    return true;
  }
  const r = rockAt(sx + camera.x, sy + camera.y);
  if (!r || r === rockAt(player.x, player.y, 6 * bossK())) return false;
  const p = rockCentre(r);
  if (Math.hypot(p.x - player.x, p.y - player.y) > hopReach()) return false;
  hop.dirX = (p.x - player.x) / Math.hypot(p.x - player.x, p.y - player.y);
  hop.dirY = (p.y - player.y) / Math.hypot(p.x - player.x, p.y - player.y);
  return startHop(p);
});

// You can't walk while you're in the air
registerPlayerSpeed(() => hopping() ? 0 : 1);

function updateLava() {
  const now = performance.now();
  const dt = Math.min(100, now - (lava.lastT || now));
  lava.lastT = now;
  const c = lavaCfg();
  if (!c || !player.character) { hop.now = null; lava.ms = 0; return; }
  // Which way you're walking (for aiming a hop)
  const mx = player.x - hop.lastX, my = player.y - hop.lastY;
  if (!hopping() && Math.hypot(mx, my) > 0.5 && Math.hypot(mx, my) < 40) {
    const d = Math.hypot(mx, my);
    hop.dirX = mx / d;
    hop.dirY = my / d;
  }
  // In the air: glide along, with a little arc (drawn by drawHopShadow)
  if (hop.now) {
    const u = Math.min(1, (now - hop.now.start) / LAVA_HOP_MS);
    player.x = hop.now.fx + (hop.now.tx - hop.now.fx) * u;
    player.y = hop.now.fy + (hop.now.ty - hop.now.fy) * u;
    player.walking = false;
    if (u >= 1) hop.now = null;
  }
  hop.lastX = player.x;
  hop.lastY = player.y;
  // The first time you stand on a rock: how to hop
  if (!hopping() && !lavaHopHinted && rockAt(player.x, player.y, 6 * bossK())) {
    lavaHopHinted = true;
    writeSave();
    kitchenToast(isTouchDevice()
      ? '🪨 You\'re on a rock! Tap the next rock (or the JUMP button) to hop to it. Don\'t touch the lava! 🔥'
      : '🪨 You\'re on a rock! Press J to hop to the next rock: it hops the way you\'re walking. Don\'t touch the lava! 🔥');
  }
  // Feet in the lava: the countdown
  if (hopping() || doorOpening || !inLava(player.x, player.y)) {
    lava.ms = 0;
    lava.warned = false;
    return;
  }
  if (!lava.warned) {
    lava.warned = true;
    kitchenToast(`🔥 HOT HOT HOT! That's LAVA! Get out in ${c.seconds || 3} seconds, or you'll be sent back to the Fourth Camp! Hop with J!`);
  }
  lava.ms += dt;
  if (lava.ms < lavaLimitMs()) return;
  lava.ms = 0;
  lava.warned = false;
  const to = c.sendTo || { map: 'assets/level4_throne.json', hotspot: 'level5_portal' };
  switchMap(to.map, to.hotspot);
  kitchenToast('🔥 OUCH! Too long in the lava! You zoomed all the way back to the Fourth Camp. Go back through the portal to try again!');
}
registerMapUpdate(13, () => updateLava());
onGameEvent('mapArrive', () => {
  lava.ms = 0;
  lava.warned = false;
  hop.now = null;
  hop.lastX = player.x;
  hop.lastY = player.y;
});
onGameEvent('mapLeave', () => { hop.now = null; });
onGameEvent('fightStart', () => {
  if (!hop.now) return;
  player.x = hop.now.tx;      // land before the fight
  player.y = hop.now.ty;
  hop.now = null;
});

// While you hop: you're drawn up in the air, over a shadow on the ground.
// (The camper is drawn at player.y, so lift it for this frame and put it back.)
function hopLift() {
  if (!hop.now) return 0;
  const u = Math.min(1, (performance.now() - hop.now.start) / LAVA_HOP_MS);
  return Math.sin(u * Math.PI) * 70 * bossK();
}
function drawHopShadow() {
  if (!hop.now) return;
  const k = bossK();
  ctx.save();
  ctx.fillStyle = 'rgba(40, 20, 10, 0.35)';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 30 * k * (1 - hopLift() / (140 * k)), 9 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
registerMapLayer(57, () => drawHopShadow());
let hopLifted = 0;
registerMapPeople(() => hop.now ? [
  { y: player.y - 0.01, draw: () => { hopLifted = hopLift(); player.y -= hopLifted; } },
  { y: player.y + 0.01, draw: () => { player.y += hopLifted; hopLifted = 0; } }
] : []);

// Lava sizzling round your feet, and the glowing rocks you can reach
function drawLavaFeet() {
  const now = performance.now();
  const k = bossK();
  if (lava.ms) {
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const t = ((now / 600 + i / 8) % 1);
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = ['#FFEB3B', '#FF9800', '#FF5722', '#9E9E9E'][i % 4];
      ctx.beginPath();
      ctx.arc(player.x + Math.sin(i * 2.3 + now / 300) * 30 * k, player.y - t * 70 * k, (4 + (i % 3) * 2) * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  // where J would land you: a little ring
  if (!lavaCfg() || hopping() || state !== GameState.PLAYING) return;
  const onRock = rockAt(player.x, player.y, 6 * k);
  if (!onRock && !lava.ms) return;
  const to = hopTarget();
  if (!to) return;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 + 0.3 * Math.sin(now / 200)})`;
  ctx.lineWidth = 3 * k;
  ctx.setLineDash([8 * k, 6 * k]);
  ctx.beginPath();
  ctx.ellipse(to.x, to.y, 34 * k, 14 * k, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
registerMapLayer(56, () => drawLavaFeet());

// A red glow round the screen and a countdown, and the JUMP button (screen coordinates)
function drawLavaWarning() {
  if (showJumpButton()) {
    const b = jumpButtonRect();
    ctx.save();
    ctx.fillStyle = 'rgba(191, 54, 12, 0.85)';
    roundRect(b.x, b.y, b.w, b.h, 16);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFE082';
    ctx.stroke();
    ctx.fillStyle = '#FFF8E1';
    ctx.font = `bold ${Math.round(b.h * 0.22)}px "Comic Sans MS", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JUMP', b.x + b.w / 2, b.y + b.h * 0.68);
    ctx.font = `${Math.round(b.h * 0.3)}px ${SCENE_EMOJI_FONT}`;
    ctx.fillText('🪨', b.x + b.w / 2, b.y + b.h * 0.33);
    ctx.restore();
  }
  if (!lava.ms) return;
  const W = canvas.width, H = canvas.height;
  const left = Math.max(0, Math.ceil((lavaLimitMs() - lava.ms) / 1000));
  const u = lava.ms / lavaLimitMs();
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, 'rgba(255, 87, 34, 0)');
  g.addColorStop(1, `rgba(255, 61, 0, ${0.3 + 0.4 * u})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const text = `🔥 LAVA! Get out!  ${left}`;
  ctx.font = 'bold 22px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 36, h = 42, y = 64;
  const pulse = 1 + 0.06 * Math.sin(performance.now() / 100);
  ctx.translate(W / 2, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = 'rgba(62, 39, 35, 0.92)';
  roundRect(-w / 2, -h / 2, w, h, 14);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFAB40';
  ctx.stroke();
  ctx.fillStyle = '#FFF3E0';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}
registerScreenLayer(86, () => drawLavaWarning());
