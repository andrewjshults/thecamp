// --- The Blob in a shared world ---
// One player, the "keeper" (lowest player id on the Blob's map, so every
// computer agrees), runs the Blob's brain: it roams and chases whichever
// camper is closest. The keeper sends `boss` messages; everyone else draws it
// where the keeper says. Each camper's own computer notices when it catches
// THEM, and that camper sends `bossfight` on/off so the Blob leaves the map
// for everyone while the duel is on, then goes home to its cave.
//
// To keep messages down, the keeper only sends `boss` while a friend is on
// the Blob's map, ~3/s while it moves (with its speed, so friends predict the
// walk in between, see motion.js) and at once when it comes out, goes home or
// shouts. Friends elsewhere don't hear about it, so arriving on its map we
// hide it until the keeper says where it is (mpBossHandOver, `ho`).
let mpBossKeeperWas = false;
let mpBossLastSent = 0;
let mpBossLastKey = '';
let mpBossLastUrgent = '';
const mpBossVel = {};

function mpBossMap() {
  for (const [path, cfg] of Object.entries(mp.mapConfigs)) if (cfg.boss) return path;
  return null;
}
// Lowest player id on the Blob's map, not counting anyone away
// (a hidden tab doesn't run its game loop, so it can't move the Blob)
function mpBossKeeper() {
  const bm = mpBossMap();
  if (!bm) return null;
  let best = mpInWorld() && currentMapPath === bm && !mpIsAway() ? mp.myId : null;
  for (const rp of mp.players.values()) {
    if (rp.map === bm && rp.char && !rp.away && (best === null || rp.id < best)) best = rp.id;
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
// Friends who need to see the Blob: on its map (we're the keeper, so are we)
function mpBossWatchers() {
  return mpPlayersHere().filter(rp => !rp.away).length;
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
    mpBossLastKey = mpBossLastUrgent = '';
  }
  mpBossKeeperWas = keeper;
  if (keeper) {
    if (state !== GameState.PLAYING) updateMapBoss();   // update() only runs while PLAYING
    mpTrackVel(mpBossVel, mapBoss.fx, mapBoss.fy, now);
    mpSendBoss(now);
    return;
  }
  // Glide toward where the keeper's Blob has probably got to
  if (mapBoss.tfx != null && (mapBoss.where === 'out' || mapBoss.where === 'returning')) {
    const p = mpPredicted({ tx: mapBoss.tfx, ty: mapBoss.tfy, vx: mapBoss.tvx, vy: mapBoss.tvy, at: mapBoss.tat }, now);
    mapBoss.fx += (p.x - mapBoss.fx) * 0.2;
    mapBoss.fy += (p.y - mapBoss.fy) * 0.2;
    if (mapBoss.moving) mapBoss.walk += 1 / 60;
  }
  if (mapBoss.shout && now - mapBoss.shout.start > mapBoss.shout.dur) mapBoss.shout = null;
}

// `handOver`: send now, flagged `ho`, so a camper who just arrived (and may
// be taking over as keeper) carries on from where the Blob really is.
function mpSendBoss(now, handOver) {
  if (!mp.connected || mapBoss.map !== currentMapPath) return;
  if (!mpBossWatchers()) { mpBossLastKey = mpBossLastUrgent = ''; return; }   // nobody to tell
  const sh = mapBoss.shout;
  const moving = !!mapBoss.moving;
  const msg = {
    t: 'boss', map: mapBoss.map, w: mapBoss.where,
    x: +mapBoss.fx.toFixed(4), y: +mapBoss.fy.toFixed(4),
    ...mpVelOut(mpBossVel, moving && mapBoss.where !== 'home'),
    f: mapBoss.facing, mv: moving ? 1 : 0,
    s: sh ? sh.text : null, sid: sh ? sh.id : null, sd: sh ? sh.dur : 0
  };
  if (handOver) msg.ho = 1;
  // Coming out, going home, a new shout: at once. Its walk: every MP_BOSS_EVERY_MS.
  const urgent = [msg.map, msg.w, msg.mv, msg.sid].join('|');
  const key = [urgent, msg.x, msg.y, msg.f].join('|');
  const since = now - mpBossLastSent;
  const due = handOver || since >= MP_BOSS_HEARTBEAT_MS ||
    (since >= MP_URGENT_GAP_MS && urgent !== mpBossLastUrgent) ||
    (since >= MP_BOSS_EVERY_MS && key !== mpBossLastKey);
  if (!due) return;
  mpBossLastKey = key;
  mpBossLastUrgent = urgent;
  mpBossLastSent = now;
  mpSend(msg);
}

// A friend just came onto our map. If we've been running the Blob, tell them
// where it is right away (they may have a lower id and take it over).
function mpBossHandOver() {
  if (!mp.active || !mpBossKeeperWas || mapBoss.busyWith || currentMapPath !== mpBossMap()) return;
  mpSendBoss(performance.now(), true);
}

// Arriving on the Blob's map with friends already there: we haven't heard
// about it while we were away, so hide it until the keeper tells us.
onGameEvent('mapArrive', () => {
  if (!mp.active || currentMapPath !== mpBossMap() || mapBoss.busyWith) return;
  if (!mpPlayersHere().some(rp => !rp.away)) return;   // just us: carry on as before
  mapBoss.map = currentMapPath;
  mapBoss.where = 'home';
  mapBoss.shout = null;
  mapBoss.tfx = mapBoss.tfy = null;
  mapBoss.tat = 0;
});

function mpOnBossState(m, from) {
  if (mapBoss.busyWith) return;
  if (typeof m.map !== 'string' || !['home', 'out', 'returning'].includes(m.w)) return;
  const x = clamp(Number(m.x) || 0, 0, 1);
  const y = clamp(Number(m.y) || 0, 0, 1);
  if (mpRunsBoss() && from > mp.myId) {
    if (!m.ho || m.map !== currentMapPath) return;   // we're the keeper; they'll notice soon
    // The old keeper, handing it over as we arrived: carry on from there
    Object.assign(mapBoss, {
      map: m.map, where: m.w, fx: x, fy: y, tfx: null, tfy: null,
      facing: m.f === 'right' ? 'right' : 'left', target: null
    });
    if (m.w === 'out') mapBoss.outUntil = performance.now() + randBetween(10000, 25000);
    return;
  }
  const appeared = mapBoss.tfx == null || mapBoss.map !== m.map ||
    mapBoss.where === 'home' || mapBoss.where === 'fighting';
  mapBoss.map = m.map;
  mapBoss.where = m.w;
  mapBoss.tfx = x;
  mapBoss.tfy = y;
  mapBoss.tvx = mpVelIn(m.vx);
  mapBoss.tvy = mpVelIn(m.vy);
  mapBoss.tat = performance.now();
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
  if (performance.now() - (mapBoss.tat || 0) > MP_BOSS_FRESH_MS) return;   // old news (we were away)
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
  for (const [id, rp] of mp.players) {
    if (now - rp.lastSeen > (rp.away ? MP_AWAY_TIMEOUT_MS : MP_TIMEOUT_MS)) mpRemovePlayer(id, 'lost');
  }
  if (mp.pubnub && !mp.connected && !mp.connectWaiter && typeof mp.pubnub.reconnect === 'function') {
    try { mp.pubnub.reconnect(); } catch (_) { /* try again next time */ }
  }
}, 1000);

// Closing the tab: a "keepalive" request still gets the goodbye out
window.addEventListener('pagehide', () => {
  if (!mp.active || !mp.present) return;
  const msg = encodeURIComponent(JSON.stringify({ t: 'bye', from: mp.myId }));
  const meta = encodeURIComponent(JSON.stringify(mpMeta('bye')));
  const url = `https://ps.pndsn.com/publish/${PUBNUB_PUBLISH_KEY}/${PUBNUB_SUBSCRIBE_KEY}/0/` +
    `${encodeURIComponent(mp.channel)}/0/${msg}?uuid=${encodeURIComponent(mp.myId)}&store=0&meta=${meta}`;
  try { fetch(url, { keepalive: true, mode: 'no-cors' }); } catch (_) { /* best effort */ }
});

registerMpMessage('boss', (m, from) => mpOnBossState(m, from), { othersOnly: true });
registerMpMessage('bossfight', (m, from) => mpOnBossFight(m, from), { othersOnly: true });
