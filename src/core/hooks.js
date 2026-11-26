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
function registerHotspotKind(kind) {
  HOTSPOT_KINDS.push(kind);
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
const GAME_EVENT_LISTENERS = Object.create(null);
function onGameEvent(name, fn) {
  (GAME_EVENT_LISTENERS[name] = GAME_EVENT_LISTENERS[name] || []).push(fn);
}
function emitGameEvent(name, ...args) {
  for (const fn of GAME_EVENT_LISTENERS[name] || []) fn(...args);
}
