// --- Backpack / Inventory ---
function toggleBackpack() {
  backpackOpen = !backpackOpen;
  if (backpackOpen) {
    // Re-anchor selection; prefer hotspot row if items are there
    if (nearbyObject && (hotspotItems[nearbyObject.id] || []).length > 0) {
      backpackSelection = { row: 'hotspot', col: 0 };
    } else {
      backpackSelection = { row: 'backpack', col: 0 };
    }
  }
}

function selectedItem() {
  if (!backpackOpen) return null;
  if (backpackSelection.row === 'backpack') {
    return backpack[backpackSelection.col] || null;
  }
  if (!nearbyObject) return null;
  const items = hotspotItems[nearbyObject.id] || [];
  return items[backpackSelection.col] || null;
}

function backpackRowCount(row) {
  if (row === 'backpack') return BACKPACK_CAPACITY;
  if (!nearbyObject) return 0;
  return HOTSPOT_CAPACITY;
}

function handleBackpackKey(e) {
  if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') {
    backpackOpen = false;
    return;
  }
  if (e.key === 'ArrowLeft') {
    const n = backpackRowCount(backpackSelection.row);
    if (n > 0) backpackSelection.col = (backpackSelection.col - 1 + n) % n;
  } else if (e.key === 'ArrowRight') {
    const n = backpackRowCount(backpackSelection.row);
    if (n > 0) backpackSelection.col = (backpackSelection.col + 1) % n;
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    if (nearbyObject) {
      backpackSelection.row = backpackSelection.row === 'backpack' ? 'hotspot' : 'backpack';
      const n = backpackRowCount(backpackSelection.row);
      if (n > 0) backpackSelection.col = Math.min(backpackSelection.col, n - 1);
      else backpackSelection.col = 0;
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    openItemAction();
  }
}

function openItemAction() {
  if (!nearbyObject) return;            // outside hotspot = view-only
  const item = selectedItem();
  if (!item) return;
  currentItemAction = {
    source: backpackSelection.row,
    index: backpackSelection.col,
    hotspotId: nearbyObject.id
  };
  backpackActionButton = 0;
  state = GameState.ITEM_ACTION;
}

function closeItemAction() {
  currentItemAction = null;
  state = GameState.PLAYING;
}

// --- Item use helpers ---
function getItemUseAtHotspot(item, hotspot) {
  if (!item || !hotspot) return null;
  if (item.pickedUpFrom === hotspot.id) return null; // can't use where picked up
  const def = mapConfig && mapConfig.hotspots.find(h => h.id === hotspot.id);
  if (!def || !def.uses) return null;
  return def.uses.find(u => u.itemId === item.id) || null;
}

function isUseAlreadyDone(itemId, hotspotId) {
  return completedUses.some(u => u.hotspotId === hotspotId && u.itemId === itemId);
}

function totalUsesCount() {
  // Count across all cached map configs so the journal progress bar is global
  return Object.values(allMapConfigs)
    .flatMap(c => c.hotspots)
    .reduce((sum, h) => sum + (h.uses ? h.uses.length : 0), 0);
}

function itemActionButtons() {
  if (!currentItemAction) return [];
  const a = currentItemAction;
  if (a.source === 'hotspot') {
    const backpackFull = backpack.length >= BACKPACK_CAPACITY;
    return [
      { id: 'pickup', label: 'Pick up', disabled: backpackFull },
      { id: 'cancel', label: 'Cancel',  disabled: false }
    ];
  }
  // Backpack item
  const hotspotFull = !a.hotspotId ||
    (hotspotItems[a.hotspotId] || []).length + mpPendingDropsAt(a.hotspotId) >= HOTSPOT_CAPACITY;
  return [
    { id: 'drop',   label: 'Drop here', disabled: hotspotFull },
    { id: 'cancel', label: 'Cancel',    disabled: false },
  ];
}

// Move a hotspot item into the backpack. Returns false if the backpack is full.
function pickUpHotspotItem(hotspotId, index) {
  if (mp.active) return mpRequestTake(hotspotId, index);
  if (backpack.length >= BACKPACK_CAPACITY) return false;
  const items = hotspotItems[hotspotId] || [];
  const [item] = items.splice(index, 1);
  if (item) {
    item.pickedUpFrom = hotspotId; // record origin so it can't be used there
    backpack.push(item);
  }
  writeSave();
  if (item && item.id === SWORD_ITEM.id) onSwordPickedUp(currentMapPath, hotspotId);
  return true;
}

function performItemAction(buttonId) {
  if (!currentItemAction) return;
  const a = currentItemAction;
  if (buttonId === 'cancel') {
    closeItemAction();
    return;
  }
  if (buttonId === 'pickup' && a.source === 'hotspot') {
    if (!pickUpHotspotItem(a.hotspotId, a.index)) return;
    // Snap selection to remaining hotspot items or fall back to backpack
    const remaining = (hotspotItems[a.hotspotId] || []).length;
    if (remaining > 0) {
      backpackSelection = { row: 'hotspot', col: Math.min(a.index, remaining - 1) };
    } else {
      backpackSelection = { row: 'backpack', col: Math.max(0, backpack.length - 1) };
    }
    closeItemAction();
    return;
  }
  if (buttonId === 'drop' && a.source === 'backpack') {
    const items = hotspotItems[a.hotspotId] || [];
    if (items.length + mpPendingDropsAt(a.hotspotId) >= HOTSPOT_CAPACITY) return;
    const [item] = backpack.splice(a.index, 1);
    if (mp.active) {
      // The world decides: it lands once the drop comes back from PubNub
      if (item) mpRequestDrop(a.hotspotId, item);
    } else {
      if (item) items.push(item);
      hotspotItems[a.hotspotId] = items;
    }
    writeSave();
    // Keep cursor on backpack row at a valid position
    const newCol = Math.min(a.index, Math.max(0, backpack.length - 1));
    backpackSelection = { row: 'backpack', col: newCol };
    closeItemAction();
    return;
  }
}

function useItem(item) {
  const use = getItemUseAtHotspot(item, nearbyObject);
  if (!use) return;
  // Record completion (item stays in backpack)
  completedUses.push({
    hotspotId: nearbyObject.id,
    hotspotName: nearbyObject.name,
    itemId: item.id,
    itemName: item.name,
    itemEmoji: item.emoji || '?',
    text: use.text
  });
  writeSave();
  // Check for all-done celebration
  if (completedUses.length === totalUsesCount()) {
    completionToast = { age: 0 };
  }
  // Transition to use dialog
  currentItemUse = {
    item,
    use,
    hotspot: nearbyObject,
    timer: 0,
    animation: use.animation || nearbyObject.action
  };
  itemUseAnimation = 0;
  backpackOpen = false;
  state = GameState.USING_ITEM;
}

function closeItemUse() {
  currentItemUse = null;
  state = GameState.PLAYING;
}

function handleItemActionKey(e) {
  const btns = itemActionButtons();
  if (e.key === 'Escape') {
    closeItemAction();
    return;
  }
  if (e.key === 'ArrowLeft') {
    backpackActionButton = (backpackActionButton - 1 + btns.length) % btns.length;
  } else if (e.key === 'ArrowRight') {
    backpackActionButton = (backpackActionButton + 1) % btns.length;
  } else if (e.key === 'Enter' || e.key === ' ') {
    const b = btns[backpackActionButton];
    if (b && !b.disabled) performItemAction(b.id);
  }
}
