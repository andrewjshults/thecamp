// ============================================================
// PLUG-IN POINTS
// ============================================================
// A feature hooks itself into the game from its own file by calling the
// register* functions below, so adding one doesn't mean editing the shared
// functions (save, input, game loop, drawing, multiplayer...). Those loop
// over what's registered here. See docs/architecture.md.
//
// Order: things run in the order they were registered, which is the order of
// the <script> tags in index.html, unless an explicit `z` says otherwise.

// --- Saved values ---
// A value saved per camper: in single player per character, in multiplayer per
// world + character. `save()` returns what to store under `key`; `load(save)`
// puts it back from a save object, which is {} for a camper starting fresh.
const SAVE_FIELDS = [];
function registerSaveField(key, { save, load }) {
  SAVE_FIELDS.push({ key, save, load });
}
function saveFieldValues() {
  const out = {};
  for (const f of SAVE_FIELDS) out[f.key] = f.save();
  return out;
}
function loadSaveFields(save) {
  for (const f of SAVE_FIELDS) f.load(save || {});
}

// --- Game states: what's on screen ---
// Each state (a screen, a pop-up, the fight...) says how it behaves:
//   draw()       draws one frame (the game loop calls it every frame)
//   onKey(e)     a key was pressed
//   onTap(x, y)  a click or tap on the canvas, in screen px
//   inWorld      true if your camper is still out on the map (friends see you)
//   inputs       HTML elements you type into: keys there don't drive the game
// A new state is added to GameState as well, e.g. 'BANK_MODAL' → 'bankModal'.
const GAME_STATES = Object.create(null);   // state value → handlers
const TYPING_INPUTS = [];
function registerGameState(name, handlers) {
  if (!GameState[name]) GameState[name] = name.toLowerCase().replace(/_(\w)/g, (_, c) => c.toUpperCase());
  GAME_STATES[GameState[name]] = handlers;
  TYPING_INPUTS.push(...(handlers.inputs || []));
}
function gameStateHandlers() {
  return GAME_STATES[state] || {};
}
function isTypingInGameInput(el) {
  return TYPING_INPUTS.some(input => input === el || input.contains(el));
}

// --- Hotspot kinds ---
// A kind of hotspot that does its own thing when you press Space or tap there,
// instead of opening the hotspot's pop-up. The first kind that matches wins.
//   match(obj)     is this hotspot one of mine? (obj = its JSON + x, y, width, height)
//   interact(obj)  Space / tap there; return false to open the normal pop-up after all
//   hint(obj)      the label above it while you're close (default: "[ SPACE ]")
const HOTSPOT_KINDS = [];
// `first`: checked before the kinds registered so far (to take over a hotspot
// another kind already handles, e.g. the cave once it leads somewhere)
function registerHotspotKind(kind, { first = false } = {}) {
  if (first) HOTSPOT_KINDS.unshift(kind); else HOTSPOT_KINDS.push(kind);
}
function hotspotKindOf(obj) {
  return HOTSPOT_KINDS.find(k => k.match(obj)) || null;
}
function actionKeyLabel() {
  return isTouchDevice() ? '[ TAP ]' : '[ SPACE ]';
}

// --- Drawing layers ---
// Extra things drawn each frame while you're on a map, lowest `z` first.
//   map layers: in map coordinates, over the map picture and under people
//   screen layers: in screen coordinates, over people and under the HUD
const MAP_LAYERS = [];
const SCREEN_LAYERS = [];
function registerMapLayer(z, draw) { addByZ(MAP_LAYERS, z, draw); }
function registerScreenLayer(z, draw) { addByZ(SCREEN_LAYERS, z, draw); }
function drawLayers(layers) {
  for (const l of layers) l.fn();
}

// --- Updates ---
// Called once per frame, lowest `z` first:
//   frame updates: every frame, whatever's on screen (from the game loop)
//   map updates: only while you're walking around a map (from update())
const FRAME_UPDATES = [];
const MAP_UPDATES = [];
function registerFrameUpdate(z, fn) { addByZ(FRAME_UPDATES, z, fn); }
function registerMapUpdate(z, fn) { addByZ(MAP_UPDATES, z, fn); }
function runUpdates(list) {
  for (const u of list) u.fn();
}

// Keep a list sorted by z (equal z: in the order they were added)
function addByZ(list, z, fn) {
  let i = list.length;
  while (i > 0 && list[i - 1].z > z) i--;
  list.splice(i, 0, { z, fn });
}

// --- Foes and creatures on the map ---
// Things that walk around a map and can pick a fight (the Blob, the
// Marshmallows), drawn sorted in with the people.
//   registerMapFoe(near): near() returns null, or the foe you're close enough
//     to fight: { engage(), hit(screenX, screenY) → tapped it?, drawHint() }.
//     Space / tapping it calls engage(); drawHint() draws the label over it.
//   registerMapPeople(list): list() returns [{ y, draw }] to draw this frame,
//     sorted by feet `y` in with the campers and NPCs.
const MAP_FOES = [];
const MAP_PEOPLE = [];
function registerMapFoe(near) { MAP_FOES.push(near); }
function registerMapPeople(list) { MAP_PEOPLE.push(list); }
function nearbyFoe() {
  for (const near of MAP_FOES) {
    const foe = near();
    if (foe) return foe;
  }
  return null;
}
function mapPeopleExtras() {
  return MAP_PEOPLE.flatMap(list => list());
}
// registerFoesOff(isOff): isOff() returns true while the bosses should leave
// you alone (exploration mode): they hide, don't chase or catch you, and you
// can't pick a fight. Each foe checks foesOff().
const FOES_OFF = [];
function registerFoesOff(isOff) { FOES_OFF.push(isOff); }
function foesOff() { return FOES_OFF.some(isOff => isOff()); }

// registerLevelsOpen(isOpen): isOpen() returns true while every level counts
// as unlocked, whatever passages you've opened (exploration mode). See
// levelUnlocked in src/world/levels.js.
const LEVELS_OPEN = [];
function registerLevelsOpen(isOpen) { LEVELS_OPEN.push(isOpen); }
function levelsAllOpen() { return LEVELS_OPEN.some(isOpen => isOpen()); }

// --- In a fight ---
//   registerPlayerHitGuard(fn): fn(fight, now) is asked when a boss's swing is
//     about to land on you (score a point); return true to stop it (armor).
//   registerFightLayer(z, draw): draw(view, fight, now) runs every frame of
//     the fight view: z < 50 over the fighters, z >= 50 over the HUD.
const PLAYER_HIT_GUARDS = [];
const FIGHT_LAYERS = [];
function registerPlayerHitGuard(fn) { PLAYER_HIT_GUARDS.push(fn); }
//   registerPlayerGuardBonus(fn): fn(fight) returns how much to add to the
//     odds your block holds (a shield), 0 for nothing.
const PLAYER_GUARD_BONUSES = [];
function registerPlayerGuardBonus(fn) { PLAYER_GUARD_BONUSES.push(fn); }
function playerGuardBonus(f) { return PLAYER_GUARD_BONUSES.reduce((sum, fn) => sum + (fn(f) || 0), 0); }
function playerHitGuarded(f, now) { return PLAYER_HIT_GUARDS.some(fn => fn(f, now)); }
function registerFightLayer(z, draw) { addByZ(FIGHT_LAYERS, z, draw); }
function drawFightLayers(v, f, now, from, to) {
  for (const l of FIGHT_LAYERS) if (l.z >= from && l.z < to) l.fn(v, f, now);
}

// --- HUD badges ---
// registerHudBadge(draw): draw(x, y) draws a badge in the map HUD's top row,
// after your name and sword, and returns how wide it was (0 if nothing).
const HUD_BADGES = [];
function registerHudBadge(draw) { HUD_BADGES.push(draw); }

// --- Multiplayer messages ---
// What to do when a message of type `t` arrives on the world's channel (see the
// table in docs/multiplayer.md). fn(message, fromPlayerId, timetoken).
// `othersOnly`: skip the copy of our own messages that PubNub sends back.
const MP_MESSAGES = Object.create(null);   // (no prototype: `t` comes from the network)
function registerMpMessage(t, fn, { othersOnly = false } = {}) {
  MP_MESSAGES[t] = { fn, othersOnly };
}

// --- Scene props ---
// The things a `scene` map (a room without a drawing) can have in its "props"
// list, by `kind`. Each is draw(pen, box, prop): box is { x, y, w, h } in px,
// prop is the JSON entry. Props for a room live in a file of their own.
const SCENE_PROPS = {};
function registerSceneProps(props) {
  Object.assign(SCENE_PROPS, props);
}

// --- Game events ---
// Moments other files want to hear about. onGameEvent(name, fn) listens;
// the core calls emitGameEvent(name) at that moment:
//   'camperChosen'  a camper was picked, before their save loads: forget the
//                   last camper's things (held food, sidekick, chats...)
//   'playStart'     their save is loaded and they're in the game
//   'mapLeave'      about to walk out of the current map (switchMap)
//   'mapArrive'     arrived on a new map and placed on it (switchMap)
//   'fightStart'    a boss fight just started (startFight), in its intro: (fight)
//   'fightBlocked'  a swing just met a block (resolveHit): ({ f, guard, att,
//                   who, held }); guard is who blocked, held false if it broke
//   'fightOver'     a boss fight just ended, before the result shows:
//                   ({ foe, won, fled, level, res }); res.lines can be added to
//   'adventureDone' an item was just used at a hotspot for the first time (a
//                   new journal entry, useItem): (entry), in completedUses
const GAME_EVENT_LISTENERS = Object.create(null);
function onGameEvent(name, fn) {
  (GAME_EVENT_LISTENERS[name] = GAME_EVENT_LISTENERS[name] || []).push(fn);
}
function emitGameEvent(name, ...args) {
  for (const fn of GAME_EVENT_LISTENERS[name] || []) fn(...args);
}

// --- Keys and taps on the map ---
// registerPlayingKey(fn) / registerPlayingTap(fn): fn(e) / fn(screenX,
// screenY) is asked first when you press a key or tap while walking around a
// map (playingKey / playingTap). Return true if it was yours (the Fifth
// Camp's J to hop across the lava), and nothing else happens.
const PLAYING_KEYS = [];
const PLAYING_TAPS = [];
function registerPlayingKey(fn) { PLAYING_KEYS.push(fn); }
function registerPlayingTap(fn) { PLAYING_TAPS.push(fn); }
function playingKeyTaken(e) { return PLAYING_KEYS.some(fn => fn(e)); }
function playingTapTaken(x, y) { return PLAYING_TAPS.some(fn => fn(x, y)); }

// --- Walking speed ---
// registerPlayerSpeed(factor): factor() returns how fast you walk right now
// (1 = normal, 0.5 = half speed: the Fourth Camp's slime pit). update()
// multiplies them all into your speed.
const PLAYER_SPEEDS = [];
function registerPlayerSpeed(factor) { PLAYER_SPEEDS.push(factor); }
function playerSpeedFactor() { return PLAYER_SPEEDS.reduce((k, f) => k * f(), 1); }

// --- NPC answers from the game itself ---
// registerNpcAnswer(fn): fn(npc, line) returns a reply (string) when the game
// knows the answer itself (the code keeper's door codes), or null. Checked
// first in fetchNpcReply, before item questions and Claude.
const NPC_ANSWERS = [];
function registerNpcAnswer(fn) { NPC_ANSWERS.push(fn); }
function npcGameAnswer(npc, line) {
  for (const fn of NPC_ANSWERS) {
    const r = fn(npc, line);
    if (r) return r;
  }
  return null;
}
