// --- The Blob in a shared world ---
// One player, the "keeper" (lowest player id on the Blob's map, so every
// computer agrees), runs the Blob's brain: it roams and chases whichever
// camper is closest. The keeper sends `boss` messages; everyone else draws it
// where the keeper says. Each camper's own computer notices when it catches
// THEM, and that camper sends `bossfight` on/off so the Blob leaves the map
// for everyone while the duel is on, then goes home to its cave.
let mpBossKeeperWas = false;
let mpBossLastSent = 0;
let mpBossLastKey = '';

function mpBossMap() {
  for (const [path, cfg] of Object.entries(mp.mapConfigs)) if (cfg.boss) return path;
  return null;
}
function mpBossKeeper() {
  const bm = mpBossMap();
  if (!bm) return null;
  let best = mpInWorld() && currentMapPath === bm ? mp.myId : null;
  for (const rp of mp.players.values()) {
    if (rp.map === bm && rp.char && (best === null || rp.id < best)) best = rp.id;
  }
  return best;
}
function mpRunsBoss() {
  return mp.active && !mapBoss.busyWith && mpBossKeeper() === mp.myId;
}
function mpBossFighterName() {
  const rp = mp.players.get(mapBoss.busyWith);
  return rp ? rp.name : 'someone';
}

function mpTickBoss() {
  const keeper = mpRunsBoss();
  const now = performance.now();
  if (keeper && !mpBossKeeperWas) {
    // Just took over (first one here, or the old keeper left): carry on from here
    mapBoss.lastT = now;
    if (mapBoss.map !== currentMapPath) resetMapBoss(randBetween(8000, 20000));
    mapBoss.homeUntil = Math.min(mapBoss.homeUntil, now + randBetween(5000, 15000));
    mapBoss.outUntil = now + randBetween(10000, 25000);
    mpBossLastKey = '';
  }
  mpBossKeeperWas = keeper;
  if (keeper) {
    if (state !== GameState.PLAYING) updateMapBoss();   // update() only runs while PLAYING
    mpSendBoss(now);
    return;
  }
  // Glide toward where the keeper last said it is
  if (mapBoss.tfx != null && (mapBoss.where === 'out' || mapBoss.where === 'returning')) {
    mapBoss.fx += (mapBoss.tfx - mapBoss.fx) * 0.2;
    mapBoss.fy += (mapBoss.tfy - mapBoss.fy) * 0.2;
    if (mapBoss.moving) mapBoss.walk += 1 / 60;
  }
  if (mapBoss.shout && now - mapBoss.shout.start > mapBoss.shout.dur) mapBoss.shout = null;
}

function mpSendBoss(now) {
  if (!mp.connected || mapBoss.map !== currentMapPath) return;
  if (!mp.players.size) { mpBossLastKey = ''; return; }   // nobody to tell
  const sh = mapBoss.shout;
  const msg = {
    t: 'boss', map: mapBoss.map, w: mapBoss.where,
    x: +mapBoss.fx.toFixed(4), y: +mapBoss.fy.toFixed(4),
    f: mapBoss.facing, mv: mapBoss.moving ? 1 : 0,
    s: sh ? sh.text : null, sid: sh ? sh.id : null, sd: sh ? sh.dur : 0
  };
  const key = [msg.map, msg.w, msg.x, msg.y, msg.f, msg.mv, msg.sid].join('|');
  const every = msg.w === 'home' ? 0 : 150;
  const due = (key !== mpBossLastKey && now - mpBossLastSent >= every) || now - mpBossLastSent >= 3000;
  if (!due) return;
  mpBossLastKey = key;
  mpBossLastSent = now;
  mpSend(msg);
}

function mpOnBossState(m, from) {
  if (mapBoss.busyWith) return;
  if (mpRunsBoss() && from > mp.myId) return;   // we're the keeper; they'll notice soon
  if (typeof m.map !== 'string' || !['home', 'out', 'returning'].includes(m.w)) return;
  const x = clamp(Number(m.x) || 0, 0, 1);
  const y = clamp(Number(m.y) || 0, 0, 1);
  const appeared = mapBoss.tfx == null || mapBoss.map !== m.map ||
    mapBoss.where === 'home' || mapBoss.where === 'fighting';
  mapBoss.map = m.map;
  mapBoss.where = m.w;
  mapBoss.tfx = x;
  mapBoss.tfy = y;
  if (appeared) { mapBoss.fx = x; mapBoss.fy = y; }
  mapBoss.facing = m.f === 'right' ? 'right' : 'left';
  mapBoss.moving = !!m.mv;
  if (m.sid && m.sid !== mapBoss.lastSid && typeof m.s === 'string') {
    mapBoss.lastSid = m.sid;
    bossShout(m.s.slice(0, 60), clamp(Number(m.sd) || 1600, 300, 4000));
  }
}

// Not the keeper: did the Blob (where the keeper says it is) just catch me?
function mpBossCatchCheck() {
  if (!bossCave() || !player.character || mapBoss.map !== currentMapPath) return;
  if (mapBoss.where !== 'out' && mapBoss.where !== 'returning') return;
  const k = bossK();
  const pos = mapBossPos();
  const dist = Math.hypot(player.x - pos.x, player.y - pos.y);
  nearBoss = dist < 190 * k;
  if (mapBoss.where === 'out' && dist < 55 * k && !doorOpening) engageBoss(true);
}

// I'm starting (on) or finished (off) a fight with the Blob
function mpBossFight(on, won) {
  if (!mp.active) return;
  mapBoss.busyWith = on ? mp.myId : null;
  mapBoss.tfx = mapBoss.tfy = null;
  mpSend({ t: 'bossfight', map: currentMapPath, on: !!on, won: !!won });
}

function mpOnBossFight(m, from) {
  if (m.on) {
    mapBoss.busyWith = from;
    mapBoss.busySince = performance.now();
    mapBoss.where = 'fighting';
    if (typeof m.map === 'string') mapBoss.map = m.map;
    mapBoss.shout = null;
    mapBoss.tfx = mapBoss.tfy = null;
    nearBoss = false;
  } else if (mapBoss.busyWith === from) {
    mpBossGoHome(m.won);
  }
}

function mpBossGoHome(beaten) {
  mapBoss.busyWith = null;
  mapBoss.where = 'home';
  mapBoss.shout = null;
  mapBoss.tfx = mapBoss.tfy = null;
  mapBoss.homeUntil = performance.now() + bossRestMs(!!beaten);
}

// Runs even when the tab is in the background (rAF pauses there)
setInterval(() => {
  if (!mp.active) return;
  mpSendPos(false);
  const now = performance.now();
  for (const [id, rp] of mp.players) if (now - rp.lastSeen > MP_TIMEOUT_MS) mpRemovePlayer(id, 'lost');
  if (mp.pubnub && !mp.connected && !mp.connectWaiter && typeof mp.pubnub.reconnect === 'function') {
    try { mp.pubnub.reconnect(); } catch (_) { /* try again next time */ }
  }
}, 1000);

// Closing the tab: a "keepalive" request still gets the goodbye out
window.addEventListener('pagehide', () => {
  if (!mp.active || !mp.present) return;
  const msg = encodeURIComponent(JSON.stringify({ t: 'bye', from: mp.myId }));
  const url = `https://ps.pndsn.com/publish/${PUBNUB_PUBLISH_KEY}/${PUBNUB_SUBSCRIBE_KEY}/0/` +
    `${encodeURIComponent(mp.channel)}/0/${msg}?uuid=${encodeURIComponent(mp.myId)}&store=0`;
  try { fetch(url, { keepalive: true, mode: 'no-cors' }); } catch (_) { /* best effort */ }
});

registerMpMessage('boss', (m, from) => mpOnBossState(m, from), { othersOnly: true });
registerMpMessage('bossfight', (m, from) => mpOnBossFight(m, from), { othersOnly: true });
