// ============================================================
// START MENU + MULTIPLAYER (shared worlds over PubNub)
// ============================================================
// Single player works exactly as before. In multi player, everyone in a
// world subscribes to one PubNub channel, `louisas-game.world.<6-digit code>`,
// and sends small JSON messages to it (see "Multiplayer" in CLAUDE.md):
//
//   pos   — where I am (map + 0–1 fractions), facing, walking, held food.
//           Sent ~8×/s while moving, every 2.5s while standing still.
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
// There's no server: whoever is in the world holds its state. Each computer
// also keeps a copy in localStorage so a world can be re-opened later.
const PUBNUB_PUBLISH_KEY   = 'pub-c-02631177-4938-4aab-916c-c66de3caad38';
const PUBNUB_SUBSCRIBE_KEY = 'sub-c-ba97efde-d572-48e8-82d6-a06e2b5b0738';
const MP_CHANNEL_PREFIX = 'louisas-game.world.';
const MP_MAIN_MAP       = 'assets/game_design.json';
const MP_POS_EVERY_MS   = 120;    // position updates while moving
const MP_HEARTBEAT_MS   = 2500;   // "still here" while standing still
const MP_TIMEOUT_MS     = 9000;   // forget a friend we haven't heard from
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
  lastPosAt: 0,
  lastPosKey: '',
  joinTimer: null,
  joinExtended: false,
  snapReplies: new Map(),  // joinerId → timer (cancelled if someone else answers)
  onSynced: null,
  cacheTimer: null
};
