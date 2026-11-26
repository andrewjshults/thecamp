// --- Interactive Objects ---
// Hotspot definitions are loaded from the map's JSON file (mapConfig.hotspots).
// Positions are stored as percentages of image dimensions (0-1)
// so they work at any scale. Converted to screen coords at runtime.

// Convert percentage-based definitions to pixel coords based on current map scale
let interactiveObjects = [];
function recalcInteractiveObjects() {
  if (!mapConfig) return;
  // Plus hotspots the game adds itself (a full chalkboard's "see all"), but not
  // while editing hotspots: dev mode matches interactiveObjects to the JSON by index
  const defs = devMode ? mapConfig.hotspots : [...mapConfig.hotspots, ...chalkboardHotspots()];
  interactiveObjects = defs.map(def => ({
    ...def,
    x: def.px * scaledMapW,
    y: def.py * scaledMapH,
    width: def.pw * scaledMapW,
    height: def.ph * scaledMapH
  }));
}

let nearbyObject = null;
let currentInteraction = null;
let interactionTimer = 0;
let interactionAnimation = 0;

// --- Touch / tap-to-move ---
let tapTarget = null;     // { x, y } in map space
let tapRipple = null;     // { x, y, age } in screen space for visual feedback

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function handleCanvasTap(screenX, screenY) {
  // Journal button always takes priority (visible in most states)
  if (journalBtnRect) {
    const b = journalBtnRect;
    if (screenX >= b.x && screenX <= b.x + b.w && screenY >= b.y && screenY <= b.y + b.h) {
      journalOpen = !journalOpen;
      if (journalOpen) { journalScroll = 0; journalScrollTarget = 0; }
      return;
    }
  }
  // Taps inside open journal panel (close button / scroll) don't fall through to game
  if (journalOpen && journalPanelRect) {
    const p = journalPanelRect;
    if (screenX >= p.x && screenX <= p.x + p.w && screenY >= p.y && screenY <= p.y + p.h) {
      // Close button (top-right of panel — 36×36)
      if (screenX >= p.x + p.w - 42 && screenY <= p.y + 46) {
        journalOpen = false;
      }
      return; // swallow tap
    }
    // Tapping outside journal panel on mobile (full-screen) closes it
    if (canvas.width < 600) { journalOpen = false; return; }
  }

  // Everything else depends on what's on screen (see registerGameState)
  const handlers = gameStateHandlers();
  if (handlers.onTap) handlers.onTap(screenX, screenY);
}

// --- Interaction handling ---
// Portal hotspot: switch maps, no interaction dialog. Portals with a
// `door` rect swing that door open first (see drawDoorOpening).
registerHotspotKind({
  match: obj => !!obj.targetMap,
  interact(obj) {
    if (doorOpening) return;
    if (obj.door) {
      doorOpening = { obj, start: performance.now() };
    } else {
      switchMap(obj.targetMap, obj.targetHotspot);
    }
  },
  hint: () => isTouchDevice() ? '🚪 [ TAP ]' : '🚪 [ ENTER ]'
});

function handleInteract() {
  if (state === GameState.PLAYING && nearbyObject) {
    // Portals, kitchen stations, the bank, the cave... do their own thing
    // (registerHotspotKind); any other hotspot opens its pop-up
    const kind = hotspotKindOf(nearbyObject);
    if (kind && kind.interact(nearbyObject) !== false) return;
    state = GameState.INTERACTING;
    currentInteraction = nearbyObject;
    interactionTimer = 0;
    interactionAnimation = 0;
  }
}

function closeInteraction() {
  state = GameState.PLAYING;
  currentInteraction = null;
  interactionHintText = null;
}

function interactionKey(e) {
  if (e.key === 'Escape' || e.key === ' ') {
    closeInteraction();
  }
}
function interactionTap(screenX, screenY) {
  // Item at this hotspot: pick it up, stay in dialog
  for (const r of interactionHereRects) {
    if (screenX >= r.x && screenX <= r.x + r.w && screenY >= r.y && screenY <= r.y + r.h) {
      interactionHintText = pickUpHotspotItem(currentInteraction.id, r.index)
        ? `${r.item.emoji} ${r.item.name} is in your backpack!`
        : 'Your backpack is full!';
      return;
    }
  }
  // Dimmed item tap: show location hint, stay in dialog
  for (const r of interactionDimmedRects) {
    if (screenX >= r.x && screenX <= r.x + r.w && screenY >= r.y && screenY <= r.y + r.h) {
      interactionHintText = `Find the ${r.item.emoji} ${r.item.name} at the ${r.location}!`;
      return;
    }
  }
  // Usable item tap: use it
  for (const r of interactionUseRects) {
    if (screenX >= r.x && screenX <= r.x + r.w && screenY >= r.y && screenY <= r.y + r.h) {
      closeInteraction();
      useItem(r.item);
      return;
    }
  }
  closeInteraction();
}
registerGameState('INTERACTING', {
  draw: () => { drawInteraction(); drawJournal(); drawCompletionToast(); },
  onKey: e => interactionKey(e),
  onTap: (x, y) => interactionTap(x, y),
  inWorld: true
});
