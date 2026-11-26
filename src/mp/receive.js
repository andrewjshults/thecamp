// --- Receiving ---
function mpOnStatus(st) {
  const c = st && st.category;
  if (c === 'PNConnectedCategory' || c === 'PNReconnectedCategory' || c === 'PNSubscriptionChangedCategory') {
    mp.connected = true;
    if (mp.connectWaiter) {
      const w = mp.connectWaiter;
      mp.connectWaiter = null;
      w.resolve();
    } else if (mp.wasDisconnected) {
      mpResync();   // we may have missed item moves while offline
    }
    mp.wasDisconnected = false;
  } else if (['PNNetworkDownCategory', 'PNNetworkIssuesCategory', 'PNTimeoutCategory',
              'PNDisconnectedUnexpectedlyCategory', 'PNConnectionErrorCategory',
              'PNAccessDeniedCategory'].includes(c)) {
    if (mp.connectWaiter) {
      const w = mp.connectWaiter;
      mp.connectWaiter = null;
      w.reject(new Error(c));
      return;
    }
    mp.connected = false;
    mp.wasDisconnected = true;
  }
}

// After a dropped connection: ask for the world again (keep ours if nobody answers)
function mpResync() {
  if (!mp.synced) return;
  mp.synced = false;
  mp.buffer = [];
  mpSend({ t: 'hello' });
  clearTimeout(mp.joinTimer);
  mp.joinTimer = setTimeout(() => {
    if (mp.active && !mp.synced) mpApplySnapshot({ at: String(mp.lastOpTT), items: mp.items });
  }, MP_JOIN_WAIT_MS);
}

function mpOnMessage(ev) {
  const m = ev && ev.message;
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return;
  const from = String(ev.publisher || m.from || '');
  if (!from) return;
  let tt;
  try { tt = BigInt(ev.timetoken); } catch (_) { return; }
  const known = mp.players.get(from);
  if (known) known.lastSeen = performance.now();

  // Each message type has its handler (registerMpMessage)
  const handler = MP_MESSAGES[m.t];
  if (!handler || (handler.othersOnly && from === mp.myId)) return;
  handler.fn(m, from, tt);
}

// Item moves: applied by everyone in timetoken order (once we know the world)
function mpOnItemOp(m, from, tt) {
  if (mp.synced) mpApplyOp(m, from, tt);
  else mp.buffer.push({ m, from, tt });
}
registerMpMessage('take', mpOnItemOp);
registerMpMessage('drop', mpOnItemOp);
// The whole world's items, for a newcomer
registerMpMessage('snap', m => {
  if (m.to === mp.myId) {
    if (!mp.synced) mpApplySnapshot(m);
  } else if (mp.snapReplies.has(m.to)) {
    // someone else already answered that newcomer
    clearTimeout(mp.snapReplies.get(m.to));
    mp.snapReplies.delete(m.to);
  }
});
// Someone arrived: say where we are, and (one of us) send them the world
registerMpMessage('hello', (m, from) => {
  if (mp.present) setTimeout(() => mpSendPos(true), Math.random() * 300);
  if (mp.synced && !mp.snapReplies.has(from)) {
    mp.snapReplies.set(from, setTimeout(() => {
      mp.snapReplies.delete(from);
      mpSendSnapshot(from);
    }, 50 + Math.random() * 450));
  }
}, { othersOnly: true });
registerMpMessage('pos', (m, from) => mpOnPos(m, from), { othersOnly: true });
registerMpMessage('say', (m, from) => mpOnSay(m, from), { othersOnly: true });
registerMpMessage('bye', (m, from) => mpRemovePlayer(from, 'left'), { othersOnly: true });

function mpCleanItem(it) {
  if (!it || typeof it.id !== 'string' || !it.id) return null;
  const o = {
    id: it.id.slice(0, 60),
    name: String(it.name || it.id).slice(0, 60),
    emoji: String(it.emoji || '❓').slice(0, 12)
  };
  if (typeof it.pickedUpFrom === 'string') o.pickedUpFrom = it.pickedUpFrom.slice(0, 60);
  return o;
}

function mpApplySnapshot(m) {
  if (!m.items || typeof m.items !== 'object') return;
  let at = 0n;
  try { at = BigInt(m.at || 0); } catch (_) { /* treat as 0 */ }
  const items = {};
  for (const [path, hotspots] of Object.entries(m.items)) {
    if (!hotspots || typeof hotspots !== 'object') continue;
    const out = {};
    for (const [hsId, list] of Object.entries(hotspots)) {
      if (Array.isArray(list)) out[hsId] = list.map(mpCleanItem).filter(Boolean).slice(0, HOTSPOT_CAPACITY);
    }
    items[path] = out;
  }
  // Maps the sender didn't know about keep their defaults
  for (const [path, defaults] of Object.entries(mp.items)) {
    if (!items[path]) items[path] = defaults;
  }
  mp.items = items;
  mp.lastOpTT = at;
  mp.synced = true;
  clearTimeout(mp.joinTimer);
  // Item moves that happened after the snapshot was taken
  const later = mp.buffer;
  mp.buffer = [];
  for (const b of later) if (b.tt > at) mpApplyOp(b.m, b.from, b.tt);
  if (mapConfig && mp.items[currentMapPath]) hotspotItems = mpItemsFor(currentMapPath, mapConfig);
  mpCacheWorldSoon();
  if (mp.onSynced) {
    const f = mp.onSynced;
    mp.onSynced = null;
    f();
  }
}

// Apply one take/drop. Every computer runs this in the same order.
function mpApplyOp(m, from, tt) {
  if (tt > mp.lastOpTT) mp.lastOpTT = tt;
  const mapItems = mp.items[m.map];
  if (!mapItems || typeof m.hs !== 'string' || !Array.isArray(mapItems[m.hs])) return;
  const list = mapItems[m.hs];
  if (m.t === 'take') {
    const idx = list.findIndex(it => it.id === m.item);
    const item = idx >= 0 ? list.splice(idx, 1)[0] : null;
    if (item) mp.lastTaker[`${m.map}|${m.hs}|${m.item}`] = from;
    if (from === mp.myId) mpOwnTakeResult(m, item);
  } else {
    const item = mpCleanItem(m.item);
    if (!item) return;
    const ok = list.length < HOTSPOT_CAPACITY;
    if (ok) list.push(item);
    if (from === mp.myId) mpOwnDropResult(m, item, ok);
  }
  mpCacheWorldSoon();
}

function mpHotspotName(map, hsId) {
  const cfg = mp.mapConfigs[map] || (map === currentMapPath ? mapConfig : null);
  const def = cfg && cfg.hotspots.find(h => h.id === hsId);
  return def ? def.name : 'there';
}

function mpOwnTakeResult(m, item) {
  mp.pendingTakes.delete(`${m.map}|${m.hs}|${m.item}`);
  if (item) {
    if (backpack.length < BACKPACK_CAPACITY) {
      item.pickedUpFrom = m.hs;   // record origin so it can't be used there
      backpack.push(item);
      writeSave();
      if (item.id === SWORD_ITEM.id) onSwordPickedUp(m.map, m.hs);
    } else {
      mpRequestDrop(m.hs, item, m.map);   // no room after all: put it back
    }
    return;
  }
  const taker = mp.players.get(mp.lastTaker[`${m.map}|${m.hs}|${m.item}`]);
  mpToast(taker ? `So close! ${taker.name} got it first. 😄` : 'Oops — that one is already gone!');
}

function mpOwnDropResult(m, item, ok) {
  const k = `${m.map}|${m.hs}`;
  const n = (mp.pendingDrops.get(k) || 1) - 1;
  if (n > 0) mp.pendingDrops.set(k, n); else mp.pendingDrops.delete(k);
  if (ok) return;
  // Someone filled the spot first: it comes back to the backpack
  if (backpack.length < BACKPACK_CAPACITY) backpack.push(item);
  writeSave();
  mpToast(`No room at the ${mpHotspotName(m.map, m.hs)} any more — it's back in your backpack.`);
}

function mpToast(text) {
  if (state === GameState.INTERACTING) interactionHintText = text;
  else useToast = { text, age: 0 };
}

// Ask the world for an item. Returns false only if the backpack is full.
function mpRequestTake(hotspotId, index) {
  const item = (hotspotItems[hotspotId] || [])[index];
  if (!item) return true;
  if (backpack.length + mp.pendingTakes.size >= BACKPACK_CAPACITY) return false;
  const key = `${currentMapPath}|${hotspotId}|${item.id}`;
  if (mp.pendingTakes.has(key)) return true;
  mp.pendingTakes.add(key);
  mpPublish({ t: 'take', map: currentMapPath, hs: hotspotId, item: item.id }).catch(() => {
    mp.pendingTakes.delete(key);
    mpToast("Couldn't reach your friends — try again!");
  });
  return true;
}

// The item has already left the backpack; it comes back if the drop fails.
function mpRequestDrop(hotspotId, item, map = currentMapPath) {
  const k = `${map}|${hotspotId}`;
  mp.pendingDrops.set(k, (mp.pendingDrops.get(k) || 0) + 1);
  mpPublish({ t: 'drop', map, hs: hotspotId, item: mpCleanItem(item) }).catch(() => {
    const n = (mp.pendingDrops.get(k) || 1) - 1;
    if (n > 0) mp.pendingDrops.set(k, n); else mp.pendingDrops.delete(k);
    if (backpack.length < BACKPACK_CAPACITY) backpack.push(item);
    writeSave();
    mpToast("Couldn't reach your friends — try again!");
  });
}

function mpPendingDropsAt(hotspotId) {
  return mp.active ? (mp.pendingDrops.get(`${currentMapPath}|${hotspotId}`) || 0) : 0;
}
