// --- Item Uses & Adventure Journal ---
let completedUses = [];           // [{ hotspotId, hotspotName, itemId, itemName, itemEmoji, text }]
let currentItemUse = null;        // { item, use, hotspot, timer, animation } — active use dialog
let itemUseAnimation = 0;         // 0→1 popup scale
let completionToast = null;       // { age } — all-done celebration
let interactionUseRects = [];     // hit-rects for backpack items shown in interaction dialog
let interactionDimmedRects = [];  // hit-rects for items not in backpack (dimmed, show hint)
let interactionHereRects = [];    // hit-rects for items sitting at this hotspot (tap to pick up)
let interactionHintText = null;   // tooltip text set by hover/tap on a dimmed item

let journalOpen = false;
let journalScroll = 0;            // current scroll pixel offset (clamped during draw)
let journalScrollTarget = 0;      // smooth-scroll target
let journalPanelRect = null;      // { x, y, w, h } — set each frame for hit-testing
let journalBtnRect = null;        // { x, y, w, h } — toggle tab button
let journalTouchStartY = null;    // for touch-drag scrolling inside journal
let journalTouchStartScroll = 0;

function saveKey(name) {
  return `louisas-game:save:${name}`;
}
function loadSave(name) {
  try {
    const raw = localStorage.getItem(saveKey(name));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function writeSave() {
  if (!player.character) return;
  // Multiplayer: the hotspot items belong to the shared world, so only the
  // player's own things are saved (per world + character).
  if (mp.active) { mpWriteSave(); return; }
  const payload = {
    version: SAVE_VERSION,
    currentMap: currentMapPath,
    backpack,
    completedUses,
    dishesMade,
    customRecipes,
    strengthBoost,
    swordRating,
    bossWins,
    bankBalance,
    maps: {
      ...allMapSaves,
      [currentMapPath]: { hotspots: hotspotItems }
    }
  };
  try {
    localStorage.setItem(saveKey(player.character.name), JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to write save', e);
  }
}
// Return default hotspot items seeded from a config's JSON definitions
function defaultHotspotItems() {
  const out = {};
  if (!mapConfig) return out;
  for (const def of mapConfig.hotspots) {
    out[def.id] = (def.items || []).map(it => ({ ...it }));
  }
  return out;
}
// Config-agnostic version: restore from mapSave or fall back to config defaults
function restoreOrDefaultHotspots(config, mapSave) {
  const out = {};
  for (const def of config.hotspots) {
    const saved = mapSave.hotspots && mapSave.hotspots[def.id];
    out[def.id] = Array.isArray(saved)
      ? saved.map(it => ({ ...it }))
      : (def.items || []).map(it => ({ ...it }));
  }
  return out;
}
function initFreshSave() {
  backpack = [];
  hotspotItems = defaultHotspotItems();
  completedUses = [];
  dishesMade = [];
  customRecipes = [];
  resetDraftRecipe();
  strengthBoost = 0;
  swordRating = SWORD_MAX;
  bossWins = 0;
  bankBalance = 0;
  allMapSaves = {};
  writeSave();
}
function applySave(save) {
  backpack      = Array.isArray(save.backpack)      ? save.backpack.map(it => ({ ...it }))    : [];
  completedUses = Array.isArray(save.completedUses) ? save.completedUses.map(u => ({ ...u })) : [];
  dishesMade    = Array.isArray(save.dishesMade)    ? [...save.dishesMade]                      : [];
  customRecipes = cleanCustomRecipes(save.customRecipes);
  resetDraftRecipe();
  strengthBoost = Math.max(0, Number(save.strengthBoost) || 0);
  swordRating   = savedSwordRating(save);
  bossWins      = Math.max(0, Math.floor(Number(save.bossWins) || 0));
  bankBalance   = savedBankBalance(save);
  // v2: maps object keyed by map path
  if (save.maps) {
    allMapSaves = {};
    for (const [path, ms] of Object.entries(save.maps)) {
      allMapSaves[path] = { hotspots: ms.hotspots || {} };
    }
  } else {
    // v1 save: flat hotspots belonged to the default map
    allMapSaves = { 'assets/game_design.json': { hotspots: save.hotspots || {} } };
  }
  // Apply hotspot items for the currently loaded map
  hotspotItems = restoreOrDefaultHotspots(mapConfig, allMapSaves[currentMapPath] || {});
}
