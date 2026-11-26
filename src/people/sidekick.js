// --- Your sidekick ---
const SIDEKICK_TRAIL_GAP = 165;   // map px (× sprite size) behind you along your path while walking
const SIDEKICK_LINES = {
  ask:    ['Will you be my sidekick?', 'Want to be my sidekick?', 'Be my sidekick? Pleeease?'],
  yes:    ['YES! Sidekicks forever! 🤝 Lead the way!', 'Ooh, an adventure! I\'m right behind you! 🤝',
           'Sure! I\'ve got my sword ready, just in case! ⚔️', 'Yay! Where are we going first? 🤝'],
  dismiss: ['Thanks for being my sidekick! You can go home now.', 'That was fun! You can go home now.'],
  bye:    ['Okay! That was so fun! See you later! 👋', 'Aww, okay! Call me if you need help! 👋',
           'Bye! Best adventure ever! 👋'],
  won:    ['WE DID IT! Great teamwork! 🏆 See you around!', 'Woo-hoo! We beat the Blob! 🏆 Bye for now!'],
  lost:   ['Aww, that Blob is tough! We\'ll get it next time! 👋', 'Phew! Let\'s rest up. See you later! 👋'],
  fled:   ['Run, run! Phew... that was close! See you later! 👋'],
  hit:    ['Take that!', 'Ha-HA!', 'Got it!', 'Hi-yah!', 'Yeah!'],
  block:  ['I got you!', 'Watch out!', 'Not today!', 'Shields up!']
};

function sidekickName() { return sidekick ? npcName(sidekick.npc) : ''; }

// `npc` (a camper NPC on this map) joins you
function makeSidekick(npc) {
  if (!canBeSidekick(npc)) return;
  if (sidekick && sidekick.npc.id !== npc.id) releaseSidekick();
  const p = npcPos(npc);
  delete npcRt[npc.id];
  npcLeavers = npcLeavers.filter(l => l.npc.id !== npc.id);
  sidekick = Object.assign(newMover(p.x, p.y, npcFacing[npc.id]), {
    npc, home: currentMapPath, char: characterByName(npc.character),
    trail: [], lastMoveAt: 0
  });
  mpSendPos(true);
}

// Where to stand beside you (not on top of you): left or right, whichever
// side they're already on, unless that's off the map
function sidekickSpot() {
  const gap = player.width * 1.55;
  let side = sidekick.x <= player.x ? -1 : 1;
  const x = player.x + side * gap;
  if (x < 20 || x > scaledMapW - 20) side = -side;
  return { x: clamp(player.x + side * gap, 20, scaledMapW - 20), y: player.y };
}

// The point `dist` px back along the path you walked
function trailPoint(dist) {
  const tr = sidekick.trail;
  let px = player.x, py = player.y, left = dist;
  for (let i = tr.length - 1; i >= 0; i--) {
    const seg = Math.hypot(px - tr[i].x, py - tr[i].y);
    if (seg >= left) {
      const u = left / seg;
      return { x: px + (tr[i].x - px) * u, y: py + (tr[i].y - py) * u };
    }
    left -= seg;
    px = tr[i].x;
    py = tr[i].y;
  }
  return { x: px, y: py };
}

function updateSidekick(now, k) {
  const sk = sidekick;
  if (!sk) return;
  // Someone joined the world as this very character: they're a person now
  if (mpCharacterTaken(sk.char.name)) {
    sidekick = null;
    mpToast(`${sk.char.name} is being played by a friend now!`);
    return;
  }
  // Remember where you've walked, for them to follow
  const last = sk.trail[sk.trail.length - 1];
  if (!last || Math.hypot(player.x - last.x, player.y - last.y) > 6) {
    sk.trail.push({ x: player.x, y: player.y });
    if (sk.trail.length > 160) sk.trail.shift();
  }
  if (player.walking) sk.lastMoveAt = now;
  if (talkingTo && talkingTo.id === sk.npc.id) { stepMover(sk, sk.x, sk.y, 0); return; }
  const target = now - sk.lastMoveAt < 350 ? trailPoint(SIDEKICK_TRAIL_GAP * k) : sidekickSpot();
  const far = Math.hypot(target.x - sk.x, target.y - sk.y);
  stepMover(sk, target.x, target.y, player.speed * (far > 260 * k ? 1.5 : 1.08));
  if (!sk.walking) sk.facing = player.x < sk.x ? 'left' : 'right';   // keep an eye on you
  npcFacing[sk.npc.id] = sk.facing;
}

// Going through a door: they come too, and pop up beside you
function placeSidekickBeside() {
  if (!sidekick) return;
  const behind = player.facing === 'left' ? 1 : -1;
  const gap = player.width * 1.55;
  let x = player.x + behind * gap;
  if (x < 20 || x > scaledMapW - 20) x = player.x - behind * gap;
  sidekick.x = clamp(x, 20, scaledMapW - 20);
  sidekick.y = player.y;
  sidekick.trail = [];
  sidekick.walking = false;
  sidekick.facing = player.facing;
  sidekick.lastMoveAt = 0;
}

// A speech bubble that fades away on its own (not part of a conversation)
function sayAndFade(owner, text, partner, linger) {
  say(owner, text, partner);
  const b = speechBubbles[speechBubbles.length - 1];
  b.fadeStart = b.start + b.duration + (linger || 2500);
  mpSay(text, partner || 'player', owner === 'player' ? null : owner);
}

// They stop being your sidekick (optionally saying `line`) and head home
function releaseSidekick(line) {
  const sk = sidekick;
  if (!sk) return;
  sidekick = null;
  const id = sk.npc.id;
  if (sk.home === currentMapPath) {
    // Their own map: walk back to where they like to hang out
    const npc = npcOnThisMap(id) || sk.npc;
    npcRt[id] = Object.assign(newMover(sk.x, sk.y, sk.facing), {
      map: currentMapPath, seen: performance.now(), walkingHome: true
    });
    if (talkingTo && talkingTo.id === id) talkingTo = npc;
    for (const b of speechBubbles) {
      if (b.owner && b.owner.id === id) b.owner = npc;
      if (b.partner && b.partner.id === id) b.partner = npc;
    }
    if (line) sayAndFade(npc, line, 'player');
  } else {
    // Another map: out the door that leads home
    const door = exitTowards(sk.home);
    const leaver = Object.assign(newMover(sk.x, sk.y, sk.facing), {
      npc: sk.npc, char: sk.char, home: sk.home,
      tx: door ? door.x : sk.x, ty: door ? door.y : sk.y, goneAt: 0,
      seen: performance.now()
    });
    npcLeavers.push(leaver);
    if (line) sayAndFade(sk.npc, line, 'player');
  }
  mpSendPos(true);
}

// Where to walk to leave this map for `homePath`: a door straight there, else
// one back to the main camp (every room is reached from there), else any door
function exitTowards(homePath) {
  const portals = interactiveObjects.filter(o => o.targetMap);
  const pick = portals.find(o => o.targetMap === homePath)
    || portals.find(o => o.targetMap === MP_MAIN_MAP)
    || portals[0];
  if (!pick) return null;
  const d = pick.door;
  if (d) return { x: (d.px + d.pw / 2) * scaledMapW, y: (d.py + d.ph) * scaledMapH };
  return { x: pick.x + pick.width / 2, y: pick.y + pick.height * 0.8 };
}

function updateLeavers(now) {
  const LEAVE_FADE_MS = 500;
  for (const l of npcLeavers) {
    if (l.goneAt) continue;
    if (talkingTo && talkingTo.id === l.npc.id) { stepMover(l, l.x, l.y, 0); continue; }
    if (stepMover(l, l.tx, l.ty, player.speed * 0.85) < 2) l.goneAt = now;
    npcFacing[l.npc.id] = l.facing;
  }
  // Through the door: they're home (and wander there when you visit)
  npcLeavers = npcLeavers.filter(l => !l.goneAt || now - l.goneAt < LEAVE_FADE_MS);
}

function leaverAlpha(l) {
  return l.goneAt ? clamp(1 - (performance.now() - l.goneAt) / 500, 0, 1) : 1;
}

// --- The talk bar's sidekick button ---
const talkSidekick = document.getElementById('talkSidekick');

function updateSidekickButton() {
  const show = !!talkingTo && canBeSidekick(talkingTo) && !npcLeavers.some(l => l.npc.id === talkingTo.id);
  talkSidekick.hidden = !show;
  if (!show) return;
  talkSidekick.textContent = isSidekick(talkingTo) ? '👋 You can go home' : '🤝 Be my sidekick!';
  talkSidekick.classList.toggle('dismiss', isSidekick(talkingTo));
  talkSidekick.disabled = talkPhase !== 'input';
}

talkSidekick.addEventListener('click', () => {
  const npc = talkingTo;
  if (!npc || talkPhase !== 'input' || !canBeSidekick(npc)) return;
  const joining = !isSidekick(npc);
  const ask = pickOne(joining ? SIDEKICK_LINES.ask : SIDEKICK_LINES.dismiss);
  const answer = pickOne(joining ? SIDEKICK_LINES.yes : SIDEKICK_LINES.bye);
  talkInput.value = '';
  setTalkEnabled(false);
  say('player', ask, npc);
  mpSay(ask, npc);
  talkPhase = 'playerSpeaking';
  const history = conversations[npcName(npc)] || (conversations[npcName(npc)] = []);
  history.push({ speaker: 'player', text: ask });
  if (joining) makeSidekick(npc);
  else releaseSidekick();                    // (on their own map, talkingTo is now this map's copy)
  pendingReply = { npc: talkingTo, text: answer };   // shown once you've finished asking
  updateSidekickButton();
});

// --- Friends' sidekicks (multiplayer) ---
// A friend's `pos` carries `sk` when they have a sidekick; we draw that NPC
// following them, and nobody else can take it.
function mpSidekickTaken(id) {
  if (!mp.active) return false;
  for (const rp of mp.players.values()) if (rp.sk && rp.sk.npcId === id) return true;
  return false;
}
function mpSidekicksHere() {
  return mpPlayersHere().filter(rp => rp.sk).map(rp => rp.sk);
}
