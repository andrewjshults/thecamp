// --- Input ---
const keys = {};
window.addEventListener('keydown', (e) => {
  // Typing in the talk bar must not drive the game (its own listener handles Esc)
  if (e.target === talkInput || menuEl.contains(e.target) || kitchenModalEl.contains(e.target) ||
      bankModalEl.contains(e.target)) return;
  keys[e.key] = true;
  if (e.key === ' ') {
    e.preventDefault();
  }
  // Cmd+D (Mac) or Ctrl+D (Win/Linux) toggles developer mode from any state
  if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
    e.preventDefault();
    devMode ? exitDevMode() : enterDevMode();
    return;
  }
  if (state === GameState.CHARACTER_SELECT) {
    if (e.key === 'ArrowLeft') {
      selectedCharIndex = (selectedCharIndex - 1 + characters.length) % characters.length;
    }
    if (e.key === 'ArrowRight') {
      selectedCharIndex = (selectedCharIndex + 1) % characters.length;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      selectCharacter(selectedCharIndex);
    }
    if (e.key === 'Escape') backToModeSelect();
  } else if (state === GameState.RESUME_PROMPT) {
    if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
      resumePendingSave();
    } else if (e.key === 'f' || e.key === 'F') {
      startFreshSave();
    } else if (e.key === 'Escape') {
      pendingResumeSave = null;
      player.character = null;
      state = GameState.CHARACTER_SELECT;
    }
  } else if (state === GameState.CONFIRM_DIALOG) {
    if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
      goToCharacterSelect();
    } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
      state = GameState.PLAYING;
    }
  } else if (state === GameState.INTERACTING) {
    if (e.key === 'Escape' || e.key === ' ') {
      closeInteraction();
    }
  } else if (state === GameState.ITEM_ACTION) {
    handleItemActionKey(e);
  } else if (state === GameState.TALKING) {
    if (e.key === 'Escape') endConversation();
  } else if (state === GameState.KITCHEN_MODAL) {
    if (e.key === 'Escape') closeKitchenModal();
  } else if (state === GameState.BANK_MODAL) {
    if (e.key === 'Escape') closeBank();
  } else if (state === GameState.FIGHTING) {
    handleFightKey(e);
  } else if (state === GameState.USING_ITEM) {
    if (e.key === 'Escape' || e.key === ' ') {
      closeItemUse();
    }
  } else if (state === GameState.PLAYING) {
    if (e.key === 'j' || e.key === 'J') {
      journalOpen = !journalOpen;
      if (journalOpen) { journalScroll = 0; journalScrollTarget = 0; }
      return;
    }
    if (e.key === 'Escape' && journalOpen) {
      journalOpen = false;
      return;
    }
    if (e.key === 'b' || e.key === 'B') {
      toggleBackpack();
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      player.rotation = (player.rotation + 90) % 360;
      return;
    }
    if (backpackOpen) {
      handleBackpackKey(e);
      return;
    }
    if ((e.key === 't' || e.key === 'T') && nearbyNpc) {
      e.preventDefault();  // don't type the "t" into the talk box we're about to focus
      startConversation(nearbyNpc);
      return;
    }
    if (e.key === ' ') {
      // Space next to the Blob picks a fight; next to a friend (with no
      // hotspot to use here) it starts a chat
      if (nearBoss) engageBoss();
      else if (!nearbyObject && nearbyNpc) startConversation(nearbyNpc);
      else handleInteract();
    }
    if (e.key === 'Escape') {
      state = GameState.CONFIRM_DIALOG;
    }
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// --- Mouse / Touch input ---
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  if (devMode) {
    handleDevPointerMove(sx, sy);
    updateDevCursor(sx, sy);
    return;
  }
  if (state === GameState.CHARACTER_SELECT) {
    hoveredCharIndex = getHoveredCharacter(sx, sy);
  }
  // Hover over dimmed item buttons in the interaction dialog (desktop only)
  if (state === GameState.INTERACTING) {
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = sx * scaleX;
    const my = sy * scaleY;
    const hit = rects => rects.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
    const here  = hit(interactionHereRects);
    const found = hit(interactionDimmedRects);
    if (here) {
      interactionHintText = `Pick up the ${here.item.emoji} ${here.item.name}`;
    } else if (found) {
      interactionHintText = `Find the ${found.item.emoji} ${found.item.name} at the ${found.location}!`;
    } else {
      interactionHintText = null;
    }
  }
});
canvas.addEventListener('mousedown', (e) => {
  if (!devMode) return;
  const rect = canvas.getBoundingClientRect();
  handleDevPointerDown(e.clientX - rect.left, e.clientY - rect.top);
});
canvas.addEventListener('mouseup', () => { devDrag = null; });
canvas.addEventListener('click', (e) => {
  if (devMode) return;  // dev mode uses mousedown instead
  const rect = canvas.getBoundingClientRect();
  handleCanvasTap(e.clientX - rect.left, e.clientY - rect.top);
});
canvas.addEventListener('dblclick', (e) => {
  if (devMode) return;
  if (state !== GameState.PLAYING || backpackOpen) return;
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const spriteScreenX = player.x - camera.x;
  const spriteScreenY = player.y - player.height - camera.y;
  const hitDist = Math.hypot(sx - spriteScreenX, sy - (spriteScreenY + player.height / 2));
  if (hitDist < 108) toggleBackpack();
});
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  if (state === GameState.FIGHTING && !devMode) {
    handleFightTouches(e, true);
    return;
  }
  const touch = e.touches[0];
  const sx = touch.clientX - rect.left;
  const sy = touch.clientY - rect.top;
  if (devMode) {
    handleDevPointerDown(sx, sy);
  } else {
    // Track journal touch-scroll start
    if (journalOpen && journalPanelRect) {
      const p = journalPanelRect;
      if (sx >= p.x && sx <= p.x + p.w && sy >= p.y && sy <= p.y + p.h) {
        journalTouchStartY = sy;
        journalTouchStartScroll = journalScrollTarget;
        return; // don't fall through to tap
      }
    }
    handleCanvasTap(sx, sy);
  }
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (state === GameState.FIGHTING) { handleFightTouches(e, false); return; }
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  if (devMode && devDrag) {
    handleDevPointerMove(touch.clientX - rect.left, touch.clientY - rect.top);
  } else if (journalTouchStartY !== null) {
    const sy = touch.clientY - rect.top;
    const delta = journalTouchStartY - sy;
    journalScrollTarget = journalTouchStartScroll + delta;
  }
}, { passive: false });
canvas.addEventListener('touchend', (e) => {
  if (state === GameState.FIGHTING) handleFightTouches(e, false);
  devDrag = null;
  journalTouchStartY = null;
});

// --- Journal scroll events ---
canvas.addEventListener('wheel', (e) => {
  if (!journalOpen || !journalPanelRect) return;
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  const p = journalPanelRect;
  if (sx >= p.x && sx <= p.x + p.w && sy >= p.y && sy <= p.y + p.h) {
    e.preventDefault();
    journalScrollTarget += e.deltaY * 0.8;
  }
}, { passive: false });

function getHoveredCharacter(mx, my) {
  const cardW = 120;
  const cardH = 170;
  const gap = 20;
  const totalW = characters.length * (cardW + gap) - gap;
  const startX = canvas.width / 2 - totalW / 2;
  const cardY = canvas.height / 2 - 40;
  for (let i = 0; i < characters.length; i++) {
    const cx = startX + i * (cardW + gap);
    if (mx >= cx && mx <= cx + cardW && my >= cardY && my <= cardY + cardH) {
      return i;
    }
  }
  return -1;
}

let pendingResumeSave = null;

function selectCharacter(index) {
  if (mp.active && mpCharacterTaken(characters[index].name)) {
    charSelectNote = { text: `A friend is already playing ${characters[index].name}! Pick another camper.`, at: performance.now() };
    return;
  }
  player.character = characters[index];
  heldItem = null;
  sidekick = null;
  npcLeavers = [];
  resetMapBoss();
  // Friends don't remember chats with a different character
  for (const k of Object.keys(conversations)) delete conversations[k];
  speechBubbles = [];
  // Starting position comes from the map's JSON config
  const start = mapConfig.playerStart;
  player.x = scaledMapW * start.px;
  player.y = scaledMapH * start.py;
  backpackOpen = false;
  backpackSelection = { row: 'backpack', col: 0 };

  if (mp.active) { mpStartPlaying(); return; }

  const existing = loadSave(player.character.name);
  if (existing) {
    pendingResumeSave = existing;
    state = GameState.RESUME_PROMPT;
  } else {
    initFreshSave();
    state = GameState.PLAYING;
    checkSwordSoon();
  }
}

function resumePendingSave() {
  if (!pendingResumeSave) return;
  const save = pendingResumeSave;
  pendingResumeSave = null;

  // Apply global state (backpack, journal, per-map hotspot caches)
  applySave(save);
  checkSwordSoon();

  const savedMap = save.currentMap || 'assets/game_design.json';
  if (savedMap !== currentMapPath) {
    // Player saved while on a different map — switch to it
    switchMap(savedMap, null);
  } else {
    // Already on the right map — just start playing
    const start = mapConfig.playerStart;
    player.x = scaledMapW * start.px;
    player.y = scaledMapH * start.py;
    state = GameState.PLAYING;
  }
}

function startFreshSave() {
  initFreshSave();
  pendingResumeSave = null;
  state = GameState.PLAYING;
  checkSwordSoon();
}
