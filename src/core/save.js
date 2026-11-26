// --- Saves (single player): one per character in localStorage ---
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
    ...saveFieldValues(),   // each feature's own saved values (registerSaveField)
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
  loadSaveFields({});
  allMapSaves = {};
  writeSave();
}
function applySave(save) {
  backpack      = Array.isArray(save.backpack)      ? save.backpack.map(it => ({ ...it }))    : [];
  completedUses = Array.isArray(save.completedUses) ? save.completedUses.map(u => ({ ...u })) : [];
  loadSaveFields(save);
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

const SAVE_VERSION = 2;
