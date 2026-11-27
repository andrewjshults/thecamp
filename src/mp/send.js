// --- Sending ---
// Our own messages normally aren't sent back to us (PubNub filters them out,
// see mpFilterExpression), except the ones we need back: item moves are
// applied in PubNub's order by everyone, us included.
const MP_ECHO_TYPES = new Set(['take', 'drop']);
function mpMeta(t) {
  return { from: mp.myId, echo: MP_ECHO_TYPES.has(t) ? '1' : '0' };
}
function mpFilterExpression() {
  return `meta.from != "${mp.myId}" || meta.echo == "1"`;
}

function mpPublish(message, byPost) {
  if (!mp.pubnub) return Promise.reject(new Error('not connected'));
  return mp.pubnub.publish({
    channel: mp.channel,
    message: { ...message, from: mp.myId },
    meta: mpMeta(message.t),
    storeInHistory: false,
    sendByPost: !!byPost
  });
}
function mpSend(message, byPost) {
  mpPublish(message, byPost).catch(err => console.warn('PubNub publish failed', err));
}

// Is our camper out in the world (visible to friends)?
function mpInWorld() {
  return !!player.character && !!gameStateHandlers().inWorld;
}

// Away: the tab is hidden, or the game is on a break (a game state with
// `away: true`). Friends see a 💤, the Blob ignores us, and we only send a
// "still here" now and then.
function mpIsAway() {
  return document.hidden || !!gameStateHandlers().away;
}

// Called every frame (and every second, even in a background tab).
// What goes out depends on who can see it:
// - nobody else in the world: nothing, apart from MP_ALONE_HEARTBEAT_MS
//   (someone joining says `hello` and we answer with a `pos`)
// - friends, but none in this room: only a change of room / being away, plus
//   the heartbeat
// - a friend in this room: starting, stopping, turning, held food... at once,
//   the walk itself every MP_POS_EVERY_MS (with a speed, see motion.js)
// `force`: send now whatever (someone just arrived and needs to see us).
function mpSendPos(force) {
  if (!mp.active || !mp.connected || !mpInWorld() || !scaledMapW) return;
  const now = performance.now();
  const away = mpIsAway();
  const walking = !!player.walking && !away;
  const msg = {
    t: 'pos',
    char: player.character.name,
    map: currentMapPath,
    x: +(player.x / scaledMapW).toFixed(4),
    y: +(player.y / scaledMapH).toFixed(4),
    ...mpVelOut(mp.vel, walking),
    f: player.facing,
    w: walking ? 1 : 0,
    r: player.rotation,
    h: heldItem ? heldItem.emoji : null,
    fi: state === GameState.FIGHTING || bossEngage ? 1 : 0,
    sw: hasSword() ? 1 : 0
  };
  if (away) msg.aw = 1;
  if (sidekick) {
    // My sidekick: which NPC (and who they are), and where they are on my map
    const skWalking = !!sidekick.walking && !away;
    msg.sk = {
      id: sidekick.npc.id,
      c: sidekick.char.name,
      x: +(sidekick.x / scaledMapW).toFixed(4),
      y: +(sidekick.y / scaledMapH).toFixed(4),
      ...mpVelOut(mp.skVel, skWalking),
      f: sidekick.facing,
      w: skWalking ? 1 : 0
    };
  }
  const sk = msg.sk;
  const offMap = [msg.char, msg.map, away ? 1 : 0].join('|');
  const urgent = [offMap, msg.f, msg.w, msg.r, msg.h, msg.fi, msg.sw,
    sk ? [sk.id, sk.f, sk.w].join(',') : ''].join('|');
  const key = [urgent, msg.x, msg.y, sk ? [sk.x, sk.y].join(',') : ''].join('|');

  const since = now - mp.lastPosAt;
  const known = mp.players.size > 0;
  const heartbeat = away ? MP_AWAY_HEARTBEAT_MS : known ? MP_HEARTBEAT_MS : MP_ALONE_HEARTBEAT_MS;
  let due = force || since >= heartbeat;
  if (!due && known && since >= MP_URGENT_GAP_MS) {
    due = mpPlayersHere().length
      ? urgent !== mp.lastPosUrgent || (key !== mp.lastPosKey && since >= MP_POS_EVERY_MS)
      : offMap !== mp.lastPosOffMap;
  }
  if (!due) return;
  mp.lastPosKey = key;
  mp.lastPosUrgent = urgent;
  mp.lastPosOffMap = offMap;
  mp.lastPosAt = now;
  mp.present = true;
  mpSend(msg);
}

// Send our `pos` in a moment (a few people may be answering the same thing)
function mpSendPosSoon() {
  if (mp.posSoonTimer) return;
  mp.posSoonTimer = setTimeout(() => {
    mp.posSoonTimer = null;
    mpSendPos(true);
  }, Math.random() * 300);
}

// Back from (or off to) another tab: tell friends straight away
document.addEventListener('visibilitychange', () => mpSendPos(false));

function mpSendBye() {
  if (mp.present) mpSend({ t: 'bye' });
  mp.present = false;
  mp.lastPosKey = mp.lastPosUrgent = mp.lastPosOffMap = '';
}

// The world's items for a newcomer. Only the hotspots that differ from the
// map JSON go (`d: 1`): the newcomer has the defaults already.
function mpSendSnapshot(to) {
  const items = {};
  for (const [path, hotspots] of Object.entries(mp.items)) {
    const cfg = mp.mapConfigs[path];
    const defs = cfg ? Object.fromEntries(cfg.hotspots.map(h => [h.id, h.items || []])) : {};
    const ids = list => list.map(it => it.id).join('|');
    for (const [hsId, list] of Object.entries(hotspots)) {
      if (cfg && defs[hsId] && ids(list) === ids(defs[hsId])) continue;
      (items[path] || (items[path] = {}))[hsId] = list;
    }
  }
  mpSend({ t: 'snap', to, at: String(mp.lastOpTT), d: 1, items }, true);
}

// A line of speech, so friends on this map see the bubble.
// `to` is 'player' (me), an NPC def or a remote player; `npcSpeaker` set
// when it's an NPC's reply to me.
function mpSay(text, to, npcSpeaker) {
  if (!mp.active || !mp.present || !mpPlayersHere().length) return;   // nobody here to hear it
  const msg = { t: 'say', map: currentMapPath, text };
  if (npcSpeaker) {
    msg.npc = npcSpeaker.id;
    msg.to = mp.myId;
  } else {
    msg.to = to === 'player' ? mp.myId : (to && to.id) || null;
  }
  mpSend(msg);
}
