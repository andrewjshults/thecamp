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

  if (state === GameState.USING_ITEM) {
    closeItemUse();
    return;
  }

  if (state === GameState.FIGHTING) {
    if (fight && fight.phase === 'result') endFight();
    return;
  }

  if (state === GameState.CHARACTER_SELECT) {
    const b = charSelectBackRect();
    if (screenX >= b.x && screenX <= b.x + b.w && screenY >= b.y && screenY <= b.y + b.h) {
      backToModeSelect();
      return;
    }
    const idx = getHoveredCharacter(screenX, screenY);
    if (idx >= 0) selectCharacter(idx);
  } else if (state === GameState.RESUME_PROMPT) {
    const btns = resumePromptButtonRects();
    for (const b of btns) {
      if (screenX >= b.x && screenX <= b.x + b.w && screenY >= b.y && screenY <= b.y + b.h) {
        if (b.id === 'resume') resumePendingSave();
        else if (b.id === 'fresh') startFreshSave();
        return;
      }
    }
  } else if (state === GameState.CONFIRM_DIALOG) {
    const panelW = Math.min(400, canvas.width - 40);
    const panelH = 150;
    const panelY = canvas.height / 2 - panelH / 2;
    const btnW = 80, btnH = 36, btnY = panelY + panelH - 52, btnGap = 20;
    const yesBtnX = canvas.width / 2 - btnW - btnGap / 2;
    const noBtnX = canvas.width / 2 + btnGap / 2;
    if (screenX >= yesBtnX && screenX <= yesBtnX + btnW && screenY >= btnY && screenY <= btnY + btnH) {
      goToCharacterSelect();
    } else if (screenX >= noBtnX && screenX <= noBtnX + btnW && screenY >= btnY && screenY <= btnY + btnH) {
      state = GameState.PLAYING;
    }
  } else if (state === GameState.INTERACTING) {
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
  } else if (state === GameState.ITEM_ACTION) {
    for (const r of itemActionButtonRects) {
      if (screenX >= r.x && screenX <= r.x + r.w && screenY >= r.y && screenY <= r.y + r.h) {
        if (!r.disabled) performItemAction(r.id);
        return;
      }
    }
  } else if (state === GameState.PLAYING) {
    // Backpack overlay hit-tests (slots) take precedence when open
    if (backpackOpen) {
      const allRects = [
        ...backpackSlotRects.hotspot.map(r => ({ ...r, row: 'hotspot' })),
        ...backpackSlotRects.backpack.map(r => ({ ...r, row: 'backpack' }))
      ];
      for (const r of allRects) {
        if (screenX >= r.x && screenX <= r.x + r.w && screenY >= r.y && screenY <= r.y + r.h) {
          backpackSelection = { row: r.row, col: r.col };
          // Open action modal when player is inside a hotspot and slot has an item
          if (nearbyObject) {
            const item = r.row === 'backpack'
              ? backpack[r.col]
              : (hotspotItems[nearbyObject.id] || [])[r.col];
            if (item) openItemAction();
          }
          return;
        }
      }
      // Tap outside any slot but still within the overlay band closes the backpack
      const overlayTop = backpackOverlayTop();
      if (screenY >= overlayTop) {
        backpackOpen = false;
        return;
      }
    }

    // Tapping the Blob when it's close picks a fight
    if (nearBoss) {
      const bp = mapBossPos();
      const bh = mapBossHeight();
      if (Math.hypot(screenX - (bp.x - camera.x), screenY - (bp.y - bh / 2 - camera.y)) < bh * 0.7) {
        engageBoss();
        return;
      }
    }

    // Tapping a nearby friend starts a conversation (tapping a far one walks there)
    const tappedNpc = npcAtScreenPoint(screenX, screenY);
    if (tappedNpc && tappedNpc === nearbyNpc) {
      startConversation(tappedNpc);
      return;
    }

    // Tapping the character sprite triggers interaction; tapping elsewhere walks there
    const spriteScreenX = player.x - camera.x;
    const spriteScreenY = player.y - player.height - camera.y;
    const hitDist = Math.hypot(screenX - spriteScreenX, screenY - (spriteScreenY + player.height / 2));
    const onCharacter = hitDist < 108;
    const now = performance.now();
    if (onCharacter && nearbyObject) {
      handleInteract();
      lastCharTapTime = now;
    } else if (onCharacter) {
      if (now - lastCharTapTime < 350) {
        toggleBackpack();
        lastCharTapTime = 0;
      } else {
        lastCharTapTime = now;
      }
    } else {
      const mapX = screenX + camera.x;
      const mapY = screenY + camera.y;
      tapTarget = { x: mapX, y: mapY };
      tapRipple = { x: screenX, y: screenY, age: 0 };
    }
  }
}

// --- Interaction handling ---
function handleInteract() {
  if (state === GameState.PLAYING && nearbyObject) {
    // Portal hotspot: switch maps, no interaction dialog. Portals with a
    // `door` rect swing that door open first (see drawDoorOpening).
    if (nearbyObject.targetMap) {
      if (doorOpening) return;
      if (nearbyObject.door) {
        doorOpening = { obj: nearbyObject, start: performance.now() };
      } else {
        switchMap(nearbyObject.targetMap, nearbyObject.targetHotspot);
      }
      return;
    }
    // The bank teller's window: balance / deposit / withdraw pop-up
    if (nearbyObject.bank) {
      openBank(nearbyObject);
      return;
    }
    // "See all recipes" on a full chalkboard
    if (nearbyObject.seeAllRecipes) {
      openRecipeList();
      return;
    }
    // Kitchen station: Space picks up / puts down / cooks — no dialog
    if (nearbyObject.station && mapConfig.kitchen) {
      doStation(nearbyObject);
      return;
    }
    // The boss's cave: knock and the Blob comes out to fight
    if (isBossCave(nearbyObject)) {
      if (mp.active && mapBoss.busyWith && mapBoss.busyWith !== mp.myId) {
        kitchenToast(`The Blob is busy fighting ${mpBossFighterName()}! 👀`);
      } else if (mapBoss.where === 'home') engageBoss();
      else kitchenToast('The cave is empty... the Blob is out roaming! 👀');
      return;
    }
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
