// ============================================================
// PLAYING — walking around a map
// ============================================================
// Keys and taps while you're out on a map (no dialog open).

function playingKey(e) {
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

function playingTap(screenX, screenY) {
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

registerGameState('PLAYING', {
  draw: () => drawGame(),
  onKey: e => playingKey(e),
  onTap: (x, y) => playingTap(x, y),
  inWorld: true
});

let lastCharTapTime = 0;
