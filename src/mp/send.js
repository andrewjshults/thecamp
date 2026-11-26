// --- Sending ---
function mpPublish(message, byPost) {
  if (!mp.pubnub) return Promise.reject(new Error('not connected'));
  return mp.pubnub.publish({
    channel: mp.channel,
    message: { ...message, from: mp.myId },
    storeInHistory: false,
    sendByPost: !!byPost
  });
}
function mpSend(message, byPost) {
  mpPublish(message, byPost).catch(err => console.warn('PubNub publish failed', err));
}

// Is our camper out in the world (visible to friends)?
function mpInWorld() {
  return !!player.character && [
    GameState.PLAYING, GameState.TALKING, GameState.INTERACTING, GameState.ITEM_ACTION,
    GameState.USING_ITEM, GameState.CONFIRM_DIALOG, GameState.FIGHTING, GameState.KITCHEN_MODAL,
    GameState.BANK_MODAL
  ].includes(state);
}

function mpSendPos(force) {
  if (!mp.active || !mp.connected || !mpInWorld() || !scaledMapW) return;
  const now = performance.now();
  const msg = {
    t: 'pos',
    char: player.character.name,
    map: currentMapPath,
    x: +(player.x / scaledMapW).toFixed(4),
    y: +(player.y / scaledMapH).toFixed(4),
    f: player.facing,
    w: player.walking ? 1 : 0,
    r: player.rotation,
    h: heldItem ? heldItem.emoji : null,
    fi: state === GameState.FIGHTING || bossEngage ? 1 : 0,
    sw: hasSword() ? 1 : 0
  };
  if (sidekick) {
    // My sidekick: which NPC (and who they are), and where they are on my map
    msg.sk = {
      id: sidekick.npc.id,
      c: sidekick.char.name,
      x: +(sidekick.x / scaledMapW).toFixed(4),
      y: +(sidekick.y / scaledMapH).toFixed(4),
      f: sidekick.facing,
      w: sidekick.walking ? 1 : 0
    };
  }
  const sk = msg.sk;
  const key = [msg.char, msg.map, msg.x, msg.y, msg.f, msg.w, msg.r, msg.h, msg.fi, msg.sw,
    sk ? [sk.id, sk.x, sk.y, sk.f, sk.w].join(',') : ''].join('|');
  const due = force ||
    (key !== mp.lastPosKey && now - mp.lastPosAt >= MP_POS_EVERY_MS) ||
    now - mp.lastPosAt >= MP_HEARTBEAT_MS;
  if (!due) return;
  mp.lastPosKey = key;
  mp.lastPosAt = now;
  mp.present = true;
  mpSend(msg);
}

function mpSendBye() {
  if (mp.present) mpSend({ t: 'bye' });
  mp.present = false;
  mp.lastPosKey = '';
}

function mpSendSnapshot(to) {
  mpSend({ t: 'snap', to, at: String(mp.lastOpTT), items: mp.items }, true);
}

// A line of speech, so friends on this map see the bubble.
// `to` is 'player' (me), an NPC def or a remote player; `npcSpeaker` set
// when it's an NPC's reply to me.
function mpSay(text, to, npcSpeaker) {
  if (!mp.active || !mp.present) return;
  const msg = { t: 'say', map: currentMapPath, text };
  if (npcSpeaker) {
    msg.npc = npcSpeaker.id;
    msg.to = mp.myId;
  } else {
    msg.to = to === 'player' ? mp.myId : (to && to.id) || null;
  }
  mpSend(msg);
}
