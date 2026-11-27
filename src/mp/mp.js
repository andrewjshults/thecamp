// ============================================================
// START MENU + MULTIPLAYER (shared worlds over PubNub)
// ============================================================
// Single player works exactly as before. In multi player, everyone in a
// world subscribes to one PubNub channel, `louisas-game.world.<6-digit code>`,
// and sends small JSON messages to it (see "Multiplayer" in CLAUDE.md):
//
//   pos   — where I am (map + 0–1 fractions), speed, facing, walking, held
//           food. ~4×/s while walking near a friend, less otherwise (mpSendPos).
//   hello — "I just arrived": others answer with `pos`, and one of them
//           answers with `snap` (where every item in the world is).
//   snap  — { to, at, items: { mapPath: { hotspotId: [item] } } }
//   take / drop — item moves. Nobody applies these when they click: every
//           computer applies them in the order PubNub delivers them (the
//           channel's timetoken order), so all computers agree on who got
//           an item first. The clicker learns the result when its own
//           message comes back.
//   say   — a speech bubble line (player → friend / NPC, or an NPC's reply).
//   bye   — I left (also inferred after 9s of silence).
//
// Every message costs, so `pos` goes out only as often as friends need it
// (see mpSendPos), carries a speed so friends can predict the walk in
// between, and PubNub doesn't send our own messages back to us unless we
// need them (take/drop: see mpMeta).
//
// There's no server: whoever is in the world holds its state. Each computer
// also keeps a copy in localStorage so a world can be re-opened later.
const PUBNUB_PUBLISH_KEY   = 'pub-c-02631177-4938-4aab-916c-c66de3caad38';
const PUBNUB_SUBSCRIBE_KEY = 'sub-c-ba97efde-d572-48e8-82d6-a06e2b5b0738';
const MP_CHANNEL_PREFIX = 'louisas-game.world.';
const MP_MAIN_MAP       = 'assets/game_design.json';
// How often we publish. Every message is billed (once to send, once per
// friend it reaches), so we only send what friends can actually see.
const MP_POS_EVERY_MS       = 250;    // position while moving near a friend (they predict in between)
const MP_URGENT_GAP_MS      = 100;    // start/stop/turn/new room go out at once, but no faster than this
const MP_HEARTBEAT_MS       = 2500;   // "still here" while standing still (or friends are in other rooms)
const MP_ALONE_HEARTBEAT_MS = 30000;  // nobody else in the world: just an occasional "anyone there?"
const MP_AWAY_HEARTBEAT_MS  = 60000;  // tab hidden, or on a break (see `away` in registerGameState)
const MP_TIMEOUT_MS         = 9000;   // forget a friend we haven't heard from
const MP_AWAY_TIMEOUT_MS    = 5 * 60 * 1000;   // ...or this, if they said they're away
const MP_PREDICT_MAX_MS     = 300;    // guess where a friend / the Blob walked to for up to this long
const MP_BOSS_EVERY_MS      = 300;    // the Blob's position while it moves
const MP_BOSS_HEARTBEAT_MS  = 3000;   // the Blob, when nothing changed
const MP_BOSS_FRESH_MS      = 4000;   // older Blob news than this can't catch you
const MP_JOIN_WAIT_MS   = 3500;   // wait this long for someone to answer `hello`

function mpRandomId() {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return 'p-' + a[0].toString(36) + a[1].toString(36);
}

const mp = {
  active: false,           // in a multiplayer world (or joining one)
  code: null,              // '123456'
  channel: null,
  pubnub: null,
  myId: mpRandomId(),      // one per open tab
  session: 0,              // bumped on leave, so stale async work bails out
  connectWaiter: null,
  connected: false,
  wasDisconnected: false,
  synced: false,           // we know where every item in the world is
  lastOpTT: 0n,            // timetoken of the last take/drop applied
  buffer: [],              // take/drops that arrived before we were synced
  items: {},               // mapPath → hotspotId → item[]   (the shared world)
  mapConfigs: {},          // mapPath → config (every map, for default items)
  players: new Map(),      // playerId → remote player (see mpOnPos)
  pendingTakes: new Set(), // `${map}|${hotspot}|${itemId}` waiting for the echo
  pendingDrops: new Map(), // `${map}|${hotspot}` → count waiting for the echo
  lastTaker: {},           // `${map}|${hotspot}|${itemId}` → playerId
  present: false,          // others can see us (we've sent a `pos`)
  lastPosAt: -Infinity,
  lastPosKey: '',          // everything in our last `pos` (see mpSendPos)
  lastPosUrgent: '',       // ...the parts friends on our map get at once
  lastPosOffMap: '',       // ...the parts friends in other rooms get at once
  posSoonTimer: null,
  vel: {},                 // our camper's speed (mpTrackVel), sent as pos.vx/vy
  skVel: {},               // our sidekick's
  filterOn: false,         // PubNub drops our own messages before they reach us
  joinTimer: null,
  joinExtended: false,
  snapReplies: new Map(),  // joinerId → timer (cancelled if someone else answers)
  onSynced: null,
  cacheTimer: null
};
