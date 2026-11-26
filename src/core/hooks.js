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
const GAME_STATES = {};       // state value → handlers
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
