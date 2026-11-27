# Multiplayer (PubNub)

Code: `src/mp/` (`mp.js` the `mp` object, keys and send rates, `motion.js`
speeds and prediction, `menu.js` the start menu,
`world.js` creating/joining, `save.js`, `send.js`, `receive.js` and the
message handlers, `players.js` friends, `boss-sync.js` the shared Blob,
`draw-friends.js`).

The start menu (HTML `#menu` overlay, state `MODE_SELECT`) offers **Single
Player** (unchanged) or **Multi Player** → **Create a new world** (random
6-digit code) / **Join a world** (type the code). Everything lives in the
`src/mp/` (the `mp` object is in `src/mp/mp.js`); PubNub's JS SDK is
loaded from jsDelivr and the publish/subscribe keys are constants there.
There's no game server, so it works on GitHub Pages too.

Each world is one PubNub channel, `louisas-game.world.<code>`. Messages (all
carry `from`, the sender's per-tab player id):

| `t`     | fields | meaning |
|---------|--------|---------|
| `pos`   | `char, map, x, y, vx, vy, f, w, r, h, fi, sw, aw?, sk?` | where I am: map path, 0–1 fractions of the map, speed (fractions/s), facing, walking, rotation, held food emoji, `fi` = fighting the Blob, `sw` = has a sword (the Blob only chases campers with one), `aw` = away (tab hidden or on a break), `sk` = my sidekick `{ id, c, x, y, vx, vy, f, w }` (NPC id, character name, where they are on my map). How often: see **Sending less** below. A friend unheard for 9s (5 min if away) is dropped |
| `hello` | — | I just joined: others reply with `pos`, and one synced player replies with `snap` |
| `snap`  | `to, at, d, items` | the world's items, `{ mapPath: { hotspotId: [item] } }`, as of op timetoken `at`. With `d: 1` only the hotspots that differ from the map JSON are in it (the rest are their defaults) |
| `take`  | `map, hs, item` (item id) | take an item from a hotspot |
| `drop`  | `map, hs, item` (`{id,name,emoji}`) | put an item at a hotspot |
| `say`   | `map, to, text, npc?` | a speech bubble line; `to` is a player or NPC id; `npc` set when it's an NPC's reply |
| `bye`   | — | I left |
| `boss`  | `map, w, x, y, vx, vy, f, mv, s, sid, sd, ho?` | the Blob, from its keeper: where (`home`/`out`/`returning`), feet position, speed, facing, moving, current shout (`sid` dedupes it), `ho` = handing it over to a camper who just arrived. Only while a friend is on its map: ~3/s while it moves, at once when it comes out / goes home / shouts, else every 3s |
| `bossfight` | `map, on, won` | I started (`on: true`) / finished a fight with the Blob |

Every publish also carries PubNub `meta` `{ from, echo }`, and each computer
subscribes with the filter `meta.from != "<my id>" || meta.echo == "1"`
(`mpMeta`, `mpFilterExpression`), so PubNub only sends our own messages back
to us when we need them: `take`/`drop` (`MP_ECHO_TYPES`). If PubNub rejects
the filter (`PNBadRequestCategory`), we subscribe without it.

Each type has a handler registered with `registerMpMessage(t, fn)`: the core
ones in `src/mp/receive.js`, the Blob's in `src/mp/boss-sync.js`. A new message
type registers its handler in the feature's own file (and gets a row here).

Item rules: nobody changes the world when they click. `take`/`drop` are
applied by **every** computer in PubNub's delivery (timetoken) order, so all
agree who got an item first; the clicker learns the result when its own
message comes back (backpack updated, or "Too slow!" / item bounced back).
A joiner buffers ops until its `snap`, then replays the ones newer than `at`.
On reconnect a player re-sends `hello` to resync.

The Blob is shared too. Its **keeper** (lowest player id on the Blob's map,
so every computer agrees) runs `updateMapBoss()` and sends `boss`. Everyone
else draws it where the keeper says (`mpTickBoss`). The keeper's Blob chases
whichever camper is closest. Each player's own computer checks whether the
Blob caught *them* (`mpBossCatchCheck`). While someone is fighting, the Blob
is off the map for everyone (`where: 'fighting'`, the fighter shows "⚔️ is
fighting the Blob!"), nobody else can start a fight, and afterwards it goes
home. If the keeper leaves (or is away: a hidden tab doesn't run the game loop),
the next lowest id takes over. Away campers aren't chased. A friend coming
onto the Blob's map gets a `boss` with `ho: 1` straight away
(`mpBossHandOver`), and a lower-id newcomer who is now the keeper carries on
from it. Arriving on the Blob's map with friends there, the Blob is hidden
until the keeper says where it is, and Blob news older than
`MP_BOSS_FRESH_MS` can't catch you. A won coin that
doesn't fit in the backpack goes to the cave as a normal `drop`.

Saves: the backpack/journal/dishes/bank balance are saved per world + camper
(`louisas-game:mp:<code>:<character>`); the world's items are cached in
`louisas-game:world:<code>` and used if you "Go in anyway" to an empty world.
One player per character in a world; camper NPCs hide when a player is that
character. A friend's sidekick is drawn following them (`rp.sk`,
`mpOnFriendSidekick`) and isn't at its spot for anyone else. If two campers ask
the same NPC at once, the lower player id keeps them. Kitchen station food is still per-player (only held food is shown
to friends).

## Sending less

PubNub bills every publish, and every message it delivers to each
subscriber, so `mpSendPos` only sends what friends can see (constants in
`src/mp/mp.js`):

- **Nobody else in the world:** no `pos`, apart from one every
  `MP_ALONE_HEARTBEAT_MS` (30s). Someone joining says `hello`, and everyone
  answers with `pos`; a `pos` from someone new is answered the same way
  (`mpSendPosSoon`).
- **Friends, but none in this room:** only a change of room or of being
  away goes out at once, plus `MP_HEARTBEAT_MS` (2.5s).
- **A friend in this room:** starting, stopping, turning, held food etc. go
  at once (no faster than `MP_URGENT_GAP_MS`); the walk itself every
  `MP_POS_EVERY_MS` (250ms, ~4/s). A friend arriving in the room makes
  everyone there send a `pos` right away.
- **Away** (`document.hidden`, or a game state with `away: true` such as
  the play-time break): one `pos` with `aw: 1`, then every
  `MP_AWAY_HEARTBEAT_MS` (60s). Friends see "💤 name".
- `say` lines only go out if a friend is in the room.

Between updates, friends and the Blob keep moving at the speed they last
sent (`vx`, `vy`, measured each frame by `mpTrackVel`), for up to
`MP_PREDICT_MAX_MS` (`mpPredicted`), so the walk stays smooth at the lower
rate. The cost: a friend who stops or turns can be shown a few pixels past
the spot for a moment before sliding back.

Only the lowest player id answers a `hello` with `snap` straight away; the
others wait 700ms per place in line and only send it if nobody has.
