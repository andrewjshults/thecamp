// --- Creating / joining / leaving a world ---
async function mpCreateWorld() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0];
  const code = String(100000 + (n % 900000));
  showBusy('Making a new world…');
  try {
    await mpOpen(code);
  } catch (err) {
    mpFail(err, 'menuMulti', 'multiError');
    return;
  }
  mp.synced = true;   // brand-new world: every item starts where the map JSON puts it
  mpEnterWorld();
}

async function mpJoinWorld(code) {
  showBusy(`Looking for world ${code}…`);
  try {
    await mpOpen(code);
  } catch (err) {
    mpFail(err, 'menuJoin', 'joinError');
    return;
  }
  mp.onSynced = mpEnterWorld;
  mpSend({ t: 'hello' });
  mpArmJoinTimer(MP_JOIN_WAIT_MS);
}

function mpArmJoinTimer(ms) {
  clearTimeout(mp.joinTimer);
  mp.joinTimer = setTimeout(() => {
    if (!mp.active || mp.synced) return;
    // Friends are there but nobody has sent the world yet — give them a moment
    if (mp.players.size && !mp.joinExtended) {
      mp.joinExtended = true;
      mpArmJoinTimer(MP_JOIN_WAIT_MS);
      return;
    }
    document.getElementById('emptyText').textContent = `Nobody is playing in world ${mp.code} right now.`;
    showMenu('menuEmpty');
  }, ms);
}

function mpFail(err, screen, errorId) {
  if (err && err.message === 'cancelled') return;
  console.warn('Multiplayer connection failed', err);
  mpLeave();
  showMenu(screen);
  setMenuError(errorId, "Couldn't connect. Check the internet and try again!");
}

// Connect to a world's channel. Resolves once PubNub says we're subscribed.
async function mpOpen(code) {
  mpLeave();
  const session = mp.session;
  mp.active = true;
  mp.code = code;
  mp.channel = MP_CHANNEL_PREFIX + code;
  mp.items = await mpLoadAllMaps();
  if (session !== mp.session) throw new Error('cancelled');

  const pn = new PubNub({
    publishKey: PUBNUB_PUBLISH_KEY,
    subscribeKey: PUBNUB_SUBSCRIBE_KEY,
    userId: mp.myId
  });
  mp.pubnub = pn;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { mp.connectWaiter = null; reject(new Error('timeout')); }, 12000);
    mp.connectWaiter = {
      resolve: () => { clearTimeout(timer); resolve(); },
      reject: (e) => { clearTimeout(timer); reject(e); }
    };
    pn.addListener({
      message: (ev) => { if (mp.pubnub === pn) mpOnMessage(ev); },
      status: (st) => { if (mp.pubnub === pn) mpOnStatus(st); }
    });
    pn.subscribe({ channels: [mp.channel] });
  });
  if (session !== mp.session) throw new Error('cancelled');
}

function mpLeave() {
  if (mp.connectWaiter) {
    const w = mp.connectWaiter;
    mp.connectWaiter = null;
    w.reject(new Error('cancelled'));
  }
  clearTimeout(mp.joinTimer);
  clearTimeout(mp.cacheTimer);
  for (const t of mp.snapReplies.values()) clearTimeout(t);
  if (mp.cacheTimer) mpCacheWorld();
  const pn = mp.pubnub;
  if (pn) {
    const done = () => { try { pn.unsubscribeAll(); pn.destroy(); } catch (_) { /* already gone */ } };
    if (mp.present) {
      pn.publish({ channel: mp.channel, message: { t: 'bye', from: mp.myId }, storeInHistory: false })
        .catch(() => {}).finally(done);
    } else {
      done();
    }
  }
  if (talkingTo && talkingTo.remote) endConversation();
  speechBubbles = speechBubbles.filter(b => !(b.owner && b.owner.remote) && !(b.partner && b.partner.remote));
  mapBoss.busyWith = null;
  mapBoss.tfx = mapBoss.tfy = null;
  mpBossKeeperWas = false;
  Object.assign(mp, {
    active: false, code: null, channel: null, pubnub: null,
    connected: false, wasDisconnected: false, synced: false,
    lastOpTT: 0n, buffer: [], items: {}, lastTaker: {},
    present: false, lastPosAt: 0, lastPosKey: '',
    joinTimer: null, joinExtended: false, onSynced: null, cacheTimer: null
  });
  mp.players.clear();
  mp.pendingTakes.clear();
  mp.pendingDrops.clear();
  mp.snapReplies.clear();
  mp.session++;
}

// Connected and synced: on to picking a camper
function mpEnterWorld() {
  hideMenu();
  if (mapConfig) hotspotItems = mpItemsFor(currentMapPath, mapConfig);
  charSelectNote = null;
  state = GameState.CHARACTER_SELECT;
}

// Called by selectCharacter() in a world. Your backpack + journal are saved
// per world and camper, so coming back to the same world picks up where you were.
function mpStartPlaying() {
  const save = mpLoadSave();
  const items = arr => Array.isArray(arr) ? arr.map(mpCleanItem).filter(Boolean) : [];
  backpack      = save ? items(save.backpack).slice(0, BACKPACK_CAPACITY) : [];
  completedUses = save && Array.isArray(save.completedUses) ? save.completedUses.map(u => ({ ...u })) : [];
  loadSaveFields(save);
  allMapSaves = {};
  hotspotItems = mpItemsFor(currentMapPath, mapConfig);
  // Arrive beside (not on top of) any friends standing at the start
  const friends = mpPlayersHere();
  const startX = player.x;
  let best = startX, bestGap = -1;
  for (const dx of [0, -110, 110, -220, 220, -330, 330]) {
    const x = clamp(startX + dx, 10, scaledMapW - 10);
    const gap = Math.min(Infinity, ...friends.map(rp => Math.hypot(rp.x - x, rp.y - player.y)));
    if (gap >= 100) { best = x; break; }          // nearest spot with room to stand
    if (gap > bestGap) { best = x; bestGap = gap; }
  }
  player.x = best;
  state = GameState.PLAYING;
  const others = mp.players.size;
  useToast = {
    text: others ? `Welcome to world ${mp.code}! 👋` : `World ${mp.code} — give your friends this code!`,
    age: 0
  };
  writeSave();
  checkSwordSoon();
  if (save && save.currentMap && save.currentMap !== currentMapPath && mp.items[save.currentMap]) {
    switchMap(save.currentMap, null);
  }
}

// Every map's default items, found by following portals from the main map
async function mpLoadAllMaps() {
  const queue = [MP_MAIN_MAP];
  const seen = new Set(queue);
  const out = {};
  while (queue.length) {
    const path = queue.shift();
    let cfg = mp.mapConfigs[path];
    if (!cfg) {
      try {
        cfg = await (await fetch(path)).json();
        mp.mapConfigs[path] = cfg;
      } catch (_) { continue; }
    }
    out[path] = restoreOrDefaultHotspots(cfg, {});
    for (const h of cfg.hotspots || []) {
      if (h.targetMap && !seen.has(h.targetMap)) {
        seen.add(h.targetMap);
        queue.push(h.targetMap);
      }
    }
  }
  return out;
}

// The shared item lists for one map (filling in any hotspot we don't know yet)
function mpItemsFor(path, config) {
  const m = mp.items[path] || (mp.items[path] = {});
  for (const def of config.hotspots) {
    if (!Array.isArray(m[def.id])) m[def.id] = (def.items || []).map(it => ({ ...it }));
  }
  return m;
}
