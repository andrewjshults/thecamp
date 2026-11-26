# Multiplayer (PubNub)

Code: `src/mp/` (`mp.js` the `mp` object and keys, `menu.js` the start menu,
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
| `pos`   | `char, map, x, y, f, w, r, h, fi, sw, sk?` | where I am: map path, 0–1 fractions of the map, facing, walking, rotation, held food emoji, `fi` = fighting the Blob, `sw` = has a sword (the Blob only chases campers with one), `sk` = my sidekick `{ id, c, x, y, f, w }` (NPC id, character name, where they are on my map). ~8/s while moving, every 2.5s idle; a friend unheard for 9s is dropped |
| `hello` | — | I just joined: others reply with `pos`, and one synced player replies with `snap` |
| `snap`  | `to, at, items` | the whole world's items, `{ mapPath: { hotspotId: [item] } }`, as of op timetoken `at` |
| `take`  | `map, hs, item` (item id) | take an item from a hotspot |
| `drop`  | `map, hs, item` (`{id,name,emoji}`) | put an item at a hotspot |
| `say`   | `map, to, text, npc?` | a speech bubble line; `to` is a player or NPC id; `npc` set when it's an NPC's reply |
| `bye`   | — | I left |
| `boss`  | `map, w, x, y, f, mv, s, sid, sd` | the Blob, from its keeper: where (`home`/`out`/`returning`), feet position, facing, moving, current shout (`sid` dedupes it). ~7/s while out, every 3s at home |
| `bossfight` | `map, on, won` | I started (`on: true`) / finished a fight with the Blob |

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
home. If the keeper leaves, the next lowest id takes over. A won coin that
doesn't fit in the backpack goes to the cave as a normal `drop`.

Saves: the backpack/journal/dishes/bank balance are saved per world + camper
(`louisas-game:mp:<code>:<character>`); the world's items are cached in
`louisas-game:world:<code>` and used if you "Go in anyway" to an empty world.
One player per character in a world; camper NPCs hide when a player is that
character. A friend's sidekick is drawn following them (`rp.sk`,
`mpOnFriendSidekick`) and isn't at its spot for anyone else. If two campers ask
the same NPC at once, the lower player id keeps them. Kitchen station food is still per-player (only held food is shown
to friends).
