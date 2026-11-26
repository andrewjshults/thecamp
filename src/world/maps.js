// --- Map config (loaded from JSON) ---
let mapConfig = null;   // the parsed JSON for the active map

// --- Multi-map state ---
let currentMapPath = 'assets/game_design.json';
let allMapConfigs  = {};   // mapPath → config object (cached after first fetch)
let allMapSaves    = {};   // mapPath → { hotspots: {} } for non-active maps
let loadingMessage = 'Loading...';

// --- Load map config then image ---
// Convention: each map image has a sibling .json file with the same base name.
// To add a new map, drop a new image + json pair in assets/ and call loadMap().
function loadMap(jsonPath, then = GameState.MODE_SELECT) {
  currentMapPath = jsonPath;
  state = GameState.LOADING;

  function applyConfig(config) {
    mapConfig = config;
    allMapConfigs[jsonPath] = config;
    loadingMessage = `Loading ${config.name}...`;
    loadMapImage(config).then(img => {
      mapImage = img;
      mapLoaded = true;
      recalcMapScale();
      state = then;
      if (then === GameState.MODE_SELECT) showMenu('menuMode');
    });
  }

  fetch(jsonPath)
    .then(r => r.json())
    .then(applyConfig);
}

// --- Switch to a different map mid-game ---
// Saves current state, loads the new map, positions player at targetHotspotId.
// If targetHotspotId is null, uses the map's playerStart.
function switchMap(targetPath, targetHotspotId) {
  emitGameEvent('mapLeave');
  // Stash current map's hotspot items
  allMapSaves[currentMapPath] = { hotspots: hotspotItems };
  writeSave();

  currentMapPath = targetPath;
  loadingMessage = 'Loading...';
  state = GameState.LOADING;

  fetch(targetPath)
    .then(r => r.json())
    .then(config => {
      mapConfig = config;
      allMapConfigs[targetPath] = config;
      loadingMessage = `Loading ${config.name}...`;

      // Restore or default hotspot items for the new map. In a multiplayer
      // world they're the shared world's items (kept in sync by PubNub).
      hotspotItems = mp.active
        ? mpItemsFor(targetPath, config)
        : restoreOrDefaultHotspots(config, allMapSaves[targetPath] || {});

      loadMapImage(config).then(img => {
        mapImage = img;
        mapLoaded = true;
        recalcMapScale();

        // Place player at the arrival hotspot: its `arrive` point if it has
        // one, else its centre (or the map's playerStart if there's no portal)
        const portal = targetHotspotId
          ? config.hotspots.find(h => h.id === targetHotspotId)
          : null;
        if (portal && portal.arrive) {
          player.x = scaledMapW * portal.arrive.px;
          player.y = scaledMapH * portal.arrive.py;
        } else if (portal) {
          player.x = scaledMapW * (portal.px + portal.pw / 2);
          player.y = scaledMapH * (portal.py + portal.ph / 2);
        } else {
          player.x = scaledMapW * config.playerStart.px;
          player.y = scaledMapH * config.playerStart.py;
        }
        emitGameEvent('mapArrive');
        nearbyObject = null;
        nearbyNpc    = null;
        speechBubbles = [];
        tapTarget    = null;
        backpackOpen = false;
        state = GameState.PLAYING;
        writeSave();  // persist new currentMap
      });
    });
}
