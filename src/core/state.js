// --- Game State ---
const GameState = {
  LOADING: 'loading',
  MODE_SELECT: 'modeSelect',          // single / multi player menu (HTML #menu)
  CHARACTER_SELECT: 'characterSelect',
  RESUME_PROMPT: 'resumePrompt',
  PLAYING: 'playing',
  INTERACTING: 'interacting',
  ITEM_ACTION: 'itemAction',
  USING_ITEM: 'usingItem',
  CONFIRM_DIALOG: 'confirmDialog',
  TALKING: 'talking',
  KITCHEN_MODAL: 'kitchenModal',      // freestyle / name-your-recipe / all-recipes pop-up (HTML #kitchenModal)
  BANK_MODAL: 'bankModal',            // the bank teller's balance / deposit / withdraw pop-up (HTML #bankModal)
  FIGHTING: 'fighting'
};

let state = GameState.LOADING;
let mapImage = null;
let mapLoaded = false;

// Map scale: we render the map scaled to fit nicely on screen
// All game coordinates are in "map space" (the scaled coordinates)
// The map will be drawn at a scale so its height fits the canvas
let mapScale = 1;
let scaledMapW = 0;
let scaledMapH = 0;

function recalcMapScale() {
  if (!mapImage) return;
  // Scale map so it's about 1.4x the canvas height (allows some scrolling)
  const targetH = canvas.height * 1.4;
  mapScale = targetH / mapImage.naturalHeight;
  scaledMapW = mapImage.naturalWidth * mapScale;
  scaledMapH = mapImage.naturalHeight * mapScale;
  // Close-up maps (e.g. inside a toilet stall) can draw people bigger
  const mult = (mapConfig && mapConfig.spriteScale) || 1;
  SPRITE_SCALE = BASE_SPRITE_SCALE * mult;
  player.width = 25 * SPRITE_SCALE;
  player.height = 40 * SPRITE_SCALE;
  player.speed = 4 * Math.sqrt(mult);
  recalcInteractiveObjects();
}

// --- Canvas sizing ---
// Use visualViewport when available so iOS Safari's dynamic toolbar
// doesn't cause canvas to extend below the visible area.
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  recalcMapScale();
}
window.addEventListener('resize', resizeCanvas);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeCanvas);
}
resizeCanvas();
