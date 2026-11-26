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
