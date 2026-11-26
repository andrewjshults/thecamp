// ============================================================
// --- NPC friends & conversations ---
// ============================================================
// Each map JSON may list `npcs`: [{ id, character, px, py, personality }].
// `character` names an entry in `characters` (the player's own character is
// hidden); px/py are the NPC's FEET position as fractions of the image.
// The player types a line, it pops out of their mouth as a speech bubble,
// then the NPC answers. Replies come from Claude via POST /api/npc-reply
// (server.js); if that's unavailable we fall back to localNpcReply().
const talkBar   = document.getElementById('talkBar');
const talkInput = document.getElementById('talkInput');
const talkSay   = document.getElementById('talkSay');
const talkBye   = document.getElementById('talkBye');
const talkTo    = document.getElementById('talkTo');
registerGameState('TALKING', {
  draw: () => drawGame(),
  onKey: e => { if (e.key === 'Escape') endConversation(); },
  inWorld: true,
  inputs: [talkInput]
});

const NPC_TALK_RANGE = 170;          // map px between feet to be able to chat
const conversations  = {};           // character name → [{ speaker:'player'|'npc', text }]
let nearbyNpc   = null;              // npc def the player can talk to right now
let talkingTo   = null;              // npc def in the active conversation
let talkPhase   = 'input';           // 'input' | 'playerSpeaking' | 'npcSpeaking'
let talkToken   = 0;                 // bumped per conversation so stale replies are dropped
let pendingReply = null;             // { npc, text } — reply received, not shown yet
let npcThinking  = null;             // { npc, since } — "..." cloud while waiting
let speechBubbles = [];              // see makeBubble()
const npcFacing = {};                // npc id → 'left' | 'right'

function characterByName(name) {
  return characters.find(c => c.name === name);
}

// An NPC is either one of the campers (`character`) or a critter drawn as an
// emoji (`emoji` + `name`, e.g. the frog living in the broken toilet).
function isCritter(npc) {
  return !!(npc && npc !== 'player' && npc.emoji);
}
function npcName(npc) {
  return npc.name || npc.character;   // remote players carry their character's name in `name`
}
// Critter height in map px (`size` is a fraction of the map height)
function critterSize(npc) {
  return (npc.size || 0.07) * scaledMapH;
}

// Camper NPCs step aside when a real person (you, or a friend in a
// multiplayer world) is playing as that character. An NPC that's off being
// someone's sidekick (yours or a friend's), or walking home after, isn't at
// its spot either.
function currentNpcs() {
  if (!mapConfig || !Array.isArray(mapConfig.npcs)) return [];
  return mapConfig.npcs.filter(n => (isCritter(n) ||
    (characterByName(n.character) &&
     (!player.character || n.character !== player.character.name) &&
     !mpCharacterTaken(n.character))) &&
    !npcAway(n.id));
}

// Everyone on this map you can walk up to and talk with: NPCs + your
// sidekick + friends
function talkablesHere() {
  return [...currentNpcs(), ...(sidekick ? [sidekick.npc] : []), ...mpPlayersHere()];
}

// Feet position in map px: where they've walked to, else their spot in the JSON
function npcPos(npc) {
  const m = npcMover(npc);
  if (m) return { x: m.x, y: m.y };
  return { x: npc.px * scaledMapW, y: npc.py * scaledMapH };
}

// Map-space feet / head / mouth for 'player', an npc def, or a remote player.
function speakerFeet(owner) {
  if (owner === 'player') return { x: player.x, y: player.y };
  if (owner.remote) return { x: owner.x, y: owner.y };
  return npcPos(owner);
}
function speakerHead(owner) {
  const f = speakerFeet(owner);
  if (isCritter(owner)) {
    const s = critterSize(owner);
    return { x: f.x, top: f.y - s, mouthY: f.y - s * 0.4 };
  }
  const spriteX = f.x - player.width / 2;
  const spriteY = f.y - player.height;
  return {
    x: spriteX + 15 * SPRITE_SCALE,          // head centre (see drawCharacterSprite)
    top: spriteY,
    mouthY: spriteY + 13 * SPRITE_SCALE
  };
}

function npcAtScreenPoint(sx, sy) {
  for (const npc of talkablesHere()) {
    const h = speakerHead(npc);
    const f = speakerFeet(npc);
    const cy = (h.top + f.y) / 2;
    if (Math.hypot(sx - (h.x - camera.x), sy - (cy - camera.y)) < 80) return npc;
  }
  return null;
}

// --- Starting / ending a conversation ---
function startConversation(npc) {
  if (state !== GameState.PLAYING || !npc) return;
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  player.walking = false;
  player.frame = 0;
  state = GameState.TALKING;
  talkingTo = npc;
  talkToken++;
  talkPhase = 'input';
  pendingReply = null;
  npcThinking = null;
  // Keep what a friend just said to you, so you can answer it
  speechBubbles = npc.remote ? speechBubbles.filter(b => b.owner === npc) : [];
  const p = speakerFeet(npc);
  player.facing = p.x < player.x ? 'left' : 'right';
  if (!npc.remote) npcFacing[npc.id] = p.x < player.x ? 'right' : 'left';
  if (npc.remote && useToast && useToast === mp.talkToast) useToast = null;   // you're answering now
  talkTo.textContent = npc.remote
    ? `💬 Talking with your friend ${npcName(npc)}`
    : `💬 Talking with ${npcName(npc)}`;
  talkInput.value = '';
  talkBar.hidden = false;
  setTalkEnabled(true);
  updateSidekickButton();
}

function endConversation() {
  if (state !== GameState.TALKING) return;
  state = GameState.PLAYING;
  talkingTo = null;
  talkToken++;
  talkPhase = 'input';
  pendingReply = null;
  npcThinking = null;
  talkBar.hidden = true;
  talkSidekick.hidden = true;
  talkInput.blur();
  // Let the last words linger for a moment, then fade away
  const fadeAt = performance.now() + 1500;
  for (const b of speechBubbles) if (!b.fadeStart) b.fadeStart = fadeAt;
}

function setTalkEnabled(on) {
  talkInput.disabled = !on;
  talkSay.disabled = !on;
  if (on) talkInput.focus();
  updateSidekickButton();
}

talkBar.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = talkInput.value.replace(/\s+/g, ' ').trim();
  if (!text || !talkingTo || talkPhase !== 'input') return;
  talkInput.value = '';
  setTalkEnabled(false);

  const npc = talkingTo;
  const token = talkToken;
  say('player', text, npc);
  talkPhase = 'playerSpeaking';
  // Friends nearby see the bubble too (and a friend you're talking to answers)
  mpSay(text, npc);
  if (npc.remote) return;

  const history = conversations[npcName(npc)] || (conversations[npcName(npc)] = []);
  history.push({ speaker: 'player', text });

  // Ask for the reply right away; it's revealed once the player finishes talking
  fetchNpcReply(npc, history.slice()).then(reply => {
    if (token === talkToken) pendingReply = { npc, text: reply };
  });
});
talkBye.addEventListener('click', endConversation);
talkInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    endConversation();
  }
});

// Called every frame: advances the player-talks → NPC-answers sequence.
function updateConversation() {
  const now = performance.now();
  speechBubbles = speechBubbles.filter(b => !b.fadeStart || now - b.fadeStart < 600);
  if (state !== GameState.TALKING || !talkingTo) return;

  if (talkPhase === 'playerSpeaking') {
    const pb = speechBubbles.find(b => b.owner === 'player');
    const playerDone = !pb || now - pb.start > pb.duration + 400;
    if (!playerDone) return;
    if (talkingTo.remote) {
      // A friend answers whenever they like — you can keep talking
      talkPhase = 'input';
      setTalkEnabled(true);
      return;
    }
    if (pendingReply) {
      const { npc, text } = pendingReply;
      pendingReply = null;
      npcThinking = null;
      conversations[npcName(npc)].push({ speaker: 'npc', text });
      say(npc, text, 'player');
      mpSay(text, 'player', npc);
      talkPhase = 'npcSpeaking';
    } else if (!npcThinking) {
      npcThinking = { npc: talkingTo, since: now };
    }
  } else if (talkPhase === 'npcSpeaking') {
    const nb = speechBubbles.find(b => b.owner === talkingTo);
    if (!nb || now - nb.start > nb.duration + 150) {
      talkPhase = 'input';
      setTalkEnabled(true);
    }
  }
}

// --- Getting the NPC's words ---
async function fetchNpcReply(npc, history) {
  // "Where's the sword?" — answered from the game's own item data, never Claude
  const itemAnswer = await itemQuestionReply(history);
  if (itemAnswer) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 500));
    return itemAnswer;
  }
  const ch = characterByName(npc.character);
  try {
    const res = await fetch('/api/npc-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        npc: {
          name: npcName(npc),
          what: npc.what || '',                 // critters: what kind of creature they are
          desc: ch ? ch.desc : '',
          personality: npc.personality || '',
          sidekick: isSidekick(npc)             // following you around, ready to help fight the Blob
        },
        playerName: player.character ? player.character.name : 'a friend',
        mapName: mapConfig ? mapConfig.name : 'The Camp',
        places: mapConfig ? mapConfig.hotspots.filter(h => !h.targetMap).map(h => h.name) : [],
        backpack: backpack.map(i => i.name),
        history
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) return data.reply;
    }
  } catch (_) { /* offline / static hosting — fall through */ }
  // No server-side brain available: make something up locally after a little "think"
  await new Promise(r => setTimeout(r, 500 + Math.random() * 700));
  return localNpcReply(npc, history);
}

// Simple built-in reply maker used when Claude isn't reachable
// (e.g. on GitHub Pages, or no API key on the dev server).
function localNpcReply(npc, history) {
  if (npc.localReplies) return localCritterReply(npc, history);
  const said = (history[history.length - 1] || { text: '' }).text.toLowerCase();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const name = player.character ? player.character.name : 'friend';
  const places = mapConfig ? mapConfig.hotspots.filter(h => !h.targetMap).map(h => h.name) : [];
  const place = places.length ? pick(places) : 'camp';
  const mentioned = places.find(p =>
    p.toLowerCase().split(' ').some(w => w.length > 3 && said.includes(w)));
  const has = re => re.test(said);

  if (has(/\b(hi|hello|hey|howdy|hiya)\b/)) return pick([
    `Hi ${name}! 👋 Want to go explore the ${place} with me?`,
    `Hey ${name}! I was just thinking about the ${place}.`,
    `Hello hello! Isn't today a perfect camp day? ☀️`
  ]);
  if (has(/\b(bye|goodbye|see ya|see you|later)\b/)) return pick([
    `Bye ${name}! Come find me again soon! 👋`,
    `See you later, alligator! 🐊`,
    `Okay, bye! Have fun exploring!`
  ]);
  if (mentioned) return pick([
    `Ooh, the ${mentioned}! That's one of my favorite spots.`,
    `I was at the ${mentioned} earlier. It was SO fun!`,
    `Race you to the ${mentioned}! 🏃`
  ]);
  if (has(/\b(sad|scared|tired|lonely|mad|upset)\b/)) return pick([
    `Aww, want a hug? 🤗 We can go to the ${place} together.`,
    `It's okay. I'm right here with you, ${name}.`,
    `Let's do something cozy. Maybe the ${place}?`
  ]);
  if (has(/\b(love|like|fun|yay|cool|awesome|best)\b/)) return pick([
    `Me too! That's the best! 🎉`,
    `Yay! You always have the best ideas, ${name}.`,
    `Ooh, I like that too! High five! ✋`
  ]);
  if (said.includes('?')) return pick([
    `Hmm... I think yes! But let's ask the Moon to be sure. 🌙`,
    `Great question! What do YOU think?`,
    `I'm not sure... maybe we can find out at the ${place}!`
  ]);
  return pick([
    `Wow, really? Tell me more!`,
    `Ha ha! You're so funny, ${name}! 😄`,
    `That reminds me, have you seen the ${place} today?`,
    `Cool! I love hanging out with you at camp.`
  ]);
}

// Critters can bring their own offline lines in the map JSON:
//   "localReplies": { "hello": [...], "bye": [...], "question": [...], "any": [...] }
// `{name}` is replaced with the player's character name.
function localCritterReply(npc, history) {
  const said = (history[history.length - 1] || { text: '' }).text.toLowerCase();
  const r = npc.localReplies;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  let pool = r.any || [];
  if (/\b(hi|hello|hey|howdy|hiya)\b/.test(said) && r.hello) pool = r.hello;
  else if (/\b(bye|goodbye|see ya|see you|later)\b/.test(said) && r.bye) pool = r.bye;
  else if (said.includes('?') && r.question) pool = r.question;
  const name = player.character ? player.character.name : 'friend';
  return (pool.length ? pick(pool) : '...').replace(/\{name\}/g, name);
}

registerFrameUpdate(30, () => updateConversation());

// Friends don't remember chats with a different character
onGameEvent('camperChosen', () => {
  for (const k of Object.keys(conversations)) delete conversations[k];
  speechBubbles = [];
});
