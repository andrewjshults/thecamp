// --- Remote players ---
// { id, remote: true, char, name, color, map, tx/ty (latest 0–1 position),
//   vx/vy + at (their speed, and when we heard: see mpPredicted),
//   fx/fy (smoothed), x/y (map px), facing, walking, rotation, held, away, frame }
function mpOnPos(m, from) {
  const ch = characterByName(m.char);
  if (!ch || typeof m.map !== 'string') return;
  const x = clamp(Number(m.x) || 0, 0, 1);
  const y = clamp(Number(m.y) || 0, 0, 1);
  let rp = mp.players.get(from);
  const isNew = !rp;
  if (isNew) {
    rp = { id: from, remote: true, frame: 0, frameTimer: 0 };
    mp.players.set(from, rp);
  }
  // Just came into our room (or we just met): they need our `pos` now, as
  // we only send it often while a friend is in the room
  const arrivedHere = (isNew || rp.map !== m.map) && m.map === currentMapPath;
  if (mpInWorld() && (isNew || arrivedHere)) mpSendPosSoon();
  if (isNew || rp.map !== m.map) { rp.fx = x; rp.fy = y; }   // pop in, don't slide across the map
  Object.assign(rp, {
    char: ch, name: ch.name, color: ch.color, map: m.map, tx: x, ty: y,
    vx: mpVelIn(m.vx), vy: mpVelIn(m.vy), at: performance.now(),
    away: !!m.aw,
    facing: m.f === 'left' ? 'left' : 'right',
    walking: !!m.w,
    rotation: [0, 90, 180, 270].includes(m.r) ? m.r : 0,
    held: typeof m.h === 'string' ? m.h.slice(0, 12) : null,
    fighting: !!m.fi,
    sword: m.sw !== 0,          // the Blob doesn't chase campers without one
    lastSeen: performance.now()
  });
  rp.x = rp.fx * scaledMapW;
  rp.y = rp.fy * scaledMapH;
  if (arrivedHere) mpBossHandOver();
  mpOnFriendSidekick(rp, m.sk, isNew);
  if (rp.fighting && !mapBoss.busyWith && m.map === mpBossMap()) {
    mpOnBossFight({ on: true, map: m.map }, from);   // we joined while they were fighting
  } else if (!rp.fighting && mapBoss.busyWith === from && performance.now() - mapBoss.busySince > 2000) {
    mpBossGoHome();                                  // missed their "fight over"
  }
  if (isNew && mpInWorld()) mpToast(`👋 ${ch.name} joined the world!`);
}

// A friend's sidekick (pos.sk), drawn following them: a remote-style speaker
// { remote, sidekickOf, npcId, char, name, color, tx/ty, fx/fy, x/y, facing, walking, frame }
function mpOnFriendSidekick(rp, sk, isNew) {
  const ch = sk && typeof sk === 'object' && typeof sk.id === 'string' && characterByName(sk.c);
  if (!ch) { rp.sk = null; return; }
  const x = clamp(Number(sk.x) || 0, 0, 1);
  const y = clamp(Number(sk.y) || 0, 0, 1);
  const npcId = sk.id.slice(0, 64);
  if (!rp.sk || rp.sk.npcId !== npcId || rp.sk.map !== rp.map || isNew) {
    rp.sk = { remote: true, sidekickOf: rp.id, owner: rp, npcId, id: npcId, map: rp.map, fx: x, fy: y, frame: 0, frameTimer: 0 };
  }
  Object.assign(rp.sk, {
    char: ch, name: ch.name, color: ch.color, tx: x, ty: y,
    vx: mpVelIn(sk.vx), vy: mpVelIn(sk.vy), at: performance.now(),
    facing: sk.f === 'left' ? 'left' : 'right', walking: !!sk.w
  });
  rp.sk.x = rp.sk.fx * scaledMapW;
  rp.sk.y = rp.sk.fy * scaledMapH;
  // Both of us asked the same NPC at once: the lower player id keeps them
  if (sidekick && sidekick.npc.id === npcId && rp.id < mp.myId) {
    const name = sidekickName();
    sidekick = null;
    mpToast(`${name} went off with ${rp.name}! 🤝`);
  }
}

function mpRemovePlayer(id, why) {
  const rp = mp.players.get(id);
  if (!rp) return;
  mp.players.delete(id);
  speechBubbles = speechBubbles.filter(b => b.owner !== rp && b.partner !== rp &&
    !(rp.sk && (b.owner === rp.sk || b.partner === rp.sk)));
  if (talkingTo === rp) endConversation();
  if (nearbyNpc === rp) nearbyNpc = null;
  if (mapBoss.busyWith === id) mpBossGoHome();   // they left mid-fight
  if (mpInWorld()) mpToast(why === 'left' ? `${rp.name} went home. 🏠` : `${rp.name} lost connection.`);
}

function mpPlayersHere() {
  if (!mp.active) return [];
  const out = [];
  for (const rp of mp.players.values()) if (rp.map === currentMapPath && rp.char) out.push(rp);
  return out;
}

function mpCharacterTaken(name) {
  if (!mp.active) return false;
  for (const rp of mp.players.values()) if (rp.name === name) return true;
  return false;
}

function mpOnSay(m, from) {
  if (typeof m.text !== 'string' || m.map !== currentMapPath || !mpInWorld()) return;
  const text = m.text.replace(/\s+/g, ' ').trim().slice(0, 160);
  const speaker = mp.players.get(from);
  if (!text || !speaker) return;
  let owner, partner;
  if (m.npc) {
    // An NPC answering a friend
    owner = currentNpcs().find(n => n.id === m.npc) ||
      (speaker.sk && speaker.sk.npcId === m.npc && speaker.sk.map === currentMapPath ? speaker.sk : null);
    if (!owner || owner === talkingTo) return;   // we're chatting with them ourselves
    partner = speaker;
  } else {
    owner = speaker;
    partner = m.to === mp.myId ? 'player'
      : (mp.players.get(m.to) || currentNpcs().find(n => n.id === m.to) || null);
  }
  say(owner, text, partner);
  const b = speechBubbles[speechBubbles.length - 1];
  b.fadeStart = b.start + b.duration + 6000;   // friends' lines linger, then fade
  if (partner === 'player' && talkingTo !== owner && state === GameState.PLAYING) {
    mpToast(`💬 ${owner.name} is talking to you! ${isTouchDevice() ? 'Tap them' : 'Press T'} to answer.`);
    mp.talkToast = useToast;
  }
}

// Called every frame
function mpTick() {
  if (!mp.active) return;
  const now = performance.now();
  if (scaledMapW) {
    mpTrackVel(mp.vel, player.x / scaledMapW, player.y / scaledMapH, now);
    if (sidekick) mpTrackVel(mp.skVel, sidekick.x / scaledMapW, sidekick.y / scaledMapH, now);
  }
  mpSendPos(false);
  mpTickBoss();
  for (const rp of mp.players.values()) {
    for (const a of rp.sk ? [rp, rp.sk] : [rp]) {
      // Glide toward where they've probably walked to since we heard
      const p = mpPredicted(a, now);
      a.fx += (p.x - a.fx) * 0.2;
      a.fy += (p.y - a.fy) * 0.2;
      a.x = a.fx * scaledMapW;
      a.y = a.fy * scaledMapH;
      const moving = a.walking || Math.hypot(p.x - a.fx, p.y - a.fy) > 0.002;
      if (moving) {
        if (++a.frameTimer > 8) { a.frame = (a.frame + 1) % 4; a.frameTimer = 0; }
      } else {
        a.frame = 0;
        a.frameTimer = 0;
      }
    }
  }
  // The friend you're chatting with walked off or went into another room
  if (state === GameState.TALKING && talkingTo && talkingTo.remote) {
    const rp = talkingTo;
    const k = SPRITE_SCALE / BASE_SPRITE_SCALE;
    if (rp.map !== currentMapPath || Math.hypot(rp.x - player.x, rp.y - player.y) > NPC_TALK_RANGE * k * 2.5) {
      endConversation();
      mpToast(`${rp.name} walked away.`);
    }
  }
}

registerFrameUpdate(20, () => mpTick());
