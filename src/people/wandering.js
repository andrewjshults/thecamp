// ============================================================
// --- NPCs on the move: wandering, and your sidekick ---
// ============================================================
// Camper NPCs stroll around their spot in the map JSON (`px`/`py`), within
// NPC_WANDER_RX / RY of it (`"wander": false` keeps one still). Where they're
// headed comes from the clock (Date.now()) and their id, so every computer in
// a multiplayer world sees them in the same place without sending anything.
// They stop when you're close, so they're easy to talk to.
//
// Ask a camper NPC to "be my sidekick" (button in the talk bar) and they
// follow you around (`sidekick`), through doors to other maps too, and help
// you fight the Blob. When the fight is over (or you say they can go) they
// walk home: across the map if this is their map, else out the nearest door
// that leads home (`npcLeavers`), and then they wander about at their spot again.
const NPC_WANDER_RX = 0.045;       // how far from their spot they stroll (fractions of the map)
const NPC_WANDER_RY = 0.03;
const NPC_WANDER_SEG_MS = 9000;    // one stroll (with a pause) every 9s
const NPC_WANDER_MS_PER_H = 16000; // walking one map-height takes this long
const npcRt = {};                  // npc id → mover on its home map: { map, x, y, facing, walking, frame, frameTimer, seen }
let sidekick = null;               // { npc, home, char, x, y, facing, walking, frame, frameTimer, trail, lastMoveAt }
let npcLeavers = [];               // ex-sidekicks walking out of a map: { npc, char, x, y, tx, ty, ..., goneAt }

function isSidekick(npc) { return !!(sidekick && npc && npc !== 'player' && !npc.remote && npc.id === sidekick.npc.id); }
function canBeSidekick(npc) { return !!(npc && npc !== 'player' && !npc.remote && !isCritter(npc) && characterByName(npc.character)); }
function npcWanders(npc) { return !isCritter(npc) && npc.wander !== false; }

// Not standing at their spot right now: your sidekick, walking home, or a friend's sidekick
function npcAway(id) {
  if (sidekick && sidekick.npc.id === id) return true;
  if (npcLeavers.some(l => l.npc.id === id)) return true;
  return mpSidekickTaken(id);
}

// Whatever is moving this NPC around on the current map (or null: they're at their spot)
function npcMover(npc) {
  if (!npc || npc === 'player' || npc.remote) return null;
  if (sidekick && sidekick.npc.id === npc.id) return sidekick;
  const l = npcLeavers.find(l => l.npc.id === npc.id);
  if (l) return l;
  const rt = npcRt[npc.id];
  return rt && rt.map === currentMapPath ? rt : null;
}

// The NPC's def as the current map knows it (the map JSON is re-fetched on
// every map switch, so the same NPC can be a different object later)
function npcOnThisMap(id) {
  return (mapConfig && Array.isArray(mapConfig.npcs) && mapConfig.npcs.find(n => n.id === id)) || null;
}

// Repeatable "random" 0–1 from an NPC id and a number
function npcHash(id, n) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  const x = Math.sin((h % 100000) * 0.0137 + n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Stroll k's destination: every third one is their own spot, so they don't drift
function wanderPoint(npc, k) {
  if (npcHash(npc.id, k) < 0.33) return { fx: npc.px, fy: npc.py };
  return {
    fx: clamp(npc.px + (npcHash(npc.id, k + 0.31) * 2 - 1) * NPC_WANDER_RX, 0.03, 0.97),
    fy: clamp(npc.py + (npcHash(npc.id, k + 0.67) * 2 - 1) * NPC_WANDER_RY, 0.06, 0.98)
  };
}

// Where the wander schedule says they are at time t (fractions of the map)
function wanderTarget(npc, t) {
  const k = Math.floor(t / NPC_WANDER_SEG_MS);
  const a = wanderPoint(npc, k), b = wanderPoint(npc, k + 1);
  const aspect = mapImage ? mapImage.naturalWidth / mapImage.naturalHeight : 1;
  const walkMs = Math.max(600, Math.hypot((b.fx - a.fx) * aspect, b.fy - a.fy) * NPC_WANDER_MS_PER_H);
  const pause = NPC_WANDER_SEG_MS * (0.25 + 0.35 * npcHash(npc.id, k + 0.5));
  const u = clamp((t - k * NPC_WANDER_SEG_MS - pause) / walkMs, 0, 1);
  const e = u * u * (3 - 2 * u);
  return { fx: lerp(a.fx, b.fx, e), fy: lerp(a.fy, b.fy, e) };
}

// Walk a mover up to `speed` px toward (tx, ty), animating their legs.
// Returns how far they still have to go.
function stepMover(m, tx, ty, speed) {
  const dx = tx - m.x, dy = ty - m.y;
  const d = Math.hypot(dx, dy);
  if (d < 1.5) {
    m.walking = false;
  } else {
    const st = Math.min(d, speed);
    m.x += dx / d * st;
    m.y += dy / d * st;
    m.walking = st > 0.4;
    if (Math.abs(dx) > 0.5) m.facing = dx < 0 ? 'left' : 'right';
  }
  if (m.walking) {
    if (++m.frameTimer > 8) { m.frame = (m.frame + 1) % 4; m.frameTimer = 0; }
  } else {
    m.frame = 0;
    m.frameTimer = 0;
  }
  return Math.max(0, d - speed);
}

function newMover(x, y, facing) {
  return { x, y, facing: facing || 'right', walking: false, frame: 0, frameTimer: 0 };
}

// Called every frame (except in a fight)
function updateNpcs() {
  if (!player.character || !mapImage || !scaledMapW || devMode) return;
  if (state === GameState.FIGHTING || state === GameState.LOADING) return;
  const now = Date.now();
  const pnow = performance.now();
  const k = SPRITE_SCALE / BASE_SPRITE_SCALE;
  const stroll = player.speed * 0.6;
  for (const npc of currentNpcs()) {
    if (!npcWanders(npc)) continue;
    let rt = npcRt[npc.id];
    if (!rt || rt.map !== currentMapPath || pnow - rt.seen > 1000) {
      // Just came into view: they're wherever their stroll has got to by now
      // (an ex-sidekick walking home keeps walking from where they are)
      const w = wanderTarget(npc, now);
      const keep = rt && rt.map === currentMapPath && rt.walkingHome;
      rt = npcRt[npc.id] = Object.assign(keep ? rt : newMover(w.fx * scaledMapW, w.fy * scaledMapH, npcFacing[npc.id]), { map: currentMapPath });
    }
    rt.seen = pnow;
    // Hold still for a chat, or when you're right next to them
    const close = Math.hypot(rt.x - player.x, rt.y - player.y) < Math.max(NPC_TALK_RANGE * k, player.width * 1.4);
    // (an ex-sidekick heading home doesn't wait for you to step away)
    const busy = (talkingTo && talkingTo.id === npc.id) || (close && !rt.walkingHome) || bossEngage || doorOpening;
    if (busy) { stepMover(rt, rt.x, rt.y, 0); continue; }
    const w = wanderTarget(npc, now);
    const left = stepMover(rt, w.fx * scaledMapW, w.fy * scaledMapH, rt.walkingHome ? player.speed * 0.8 : stroll);
    if (left < 2) rt.walkingHome = false;
    if (rt.walking) npcFacing[npc.id] = rt.facing;
  }
  updateSidekick(pnow, k);
  updateLeavers(pnow);
}

registerFrameUpdate(10, () => updateNpcs());
