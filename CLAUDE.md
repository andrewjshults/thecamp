# Louisa's Game — Claude Code Notes

## Project overview
A 2D browser exploration game built in a single `index.html` file.
The map is a hand-drawn image (`assets/game_design.jpg`).
Interactive hotspots (bounds + interaction text) live in a companion
JSON file at `assets/game_design.json` — one JSON per map image.

## Dev server

Start the game with:

```bash
npm run dev
```

This runs `server.js` (zero npm dependencies — pure Node built-ins) which:
- Serves the project at **http://localhost:3000**
- Injects a live-reload snippet so the browser auto-refreshes on any file save

`assets/game_design.json` is fetched over HTTP at runtime, so it is the
**single source of truth** — there is no inline copy to keep in sync.

## Adding a new map
1. Drop the image into `assets/` (e.g. `assets/map2.jpg`).
2. Create `assets/map2.json` following the same schema as `game_design.json`:
   - `name` — display name shown on the character-select screen
   - `image` — path to the image (e.g. `"assets/map2.jpg"`), **or** a `scene` (see below)
   - `playerStart` — `{ "px": 0–1, "py": 0–1 }` fractional spawn point
   - `hotspots` — array of hotspot objects (see schema below)
3. In `index.html` change the `loadMap(...)` call to point at the new JSON.

### Rooms without a drawing (`scene` maps)
A map can use a `scene` object **instead of** `image`. Index.html turns it
into a marker-style SVG (wobbly ink, streaky colouring, emoji stickers) at
load time, so new rooms/tents need no hand-drawn background. Example:
`assets/camp_bathroom.json` (entered from the main map's `bathroom` hotspot).
```json
"scene": {
  "width": 2400, "height": 1700,
  "ceiling": { "height": 0.05, "color": "#7a4a2a" },          // optional striped roof band
  "wall":    { "pattern": "blocks|planks|canvas|stripes", "color": "#e1ecaf" },  // stripes: wallpaper (`stripe`, `dot` colours)
  "floor":   { "from": 0.45, "pattern": "concrete|tiles|planks", "color": "#cbc5ba" },
  "props": [ { "kind": "door", "px": 0.05, "py": 0.15, "pw": 0.09, "ph": 0.3 } ]
}
```
Props are drawn in order, with boxes in the same 0–1 fractions as hotspots.
Kinds live in `SCENE_PROPS` in `index.html`: `emoji` (`emoji`, `rotate`),
`sign` (`text` with `\n`, `color`, `rotate`), `door`, `mat`, `window`, `bulb`,
`cobweb` (`spider`), `mirror`, `sinks` (`count`), `dryer`, `stalls` (`doors`:
`label`/`sign`/`occupied`/`feet`), `shower` (`curtain`), `bench` (`towel`),
`box` (`label`, `peek` emojis), `trashCan` (`label`, `peek`), `mopBucket`,
`drain`, `puddle`, `footprints`, and for small close-up rooms: `toilet`
(`lid: "up"|"down"`), `tpHolder` (`empty`), `scribble` (marker writing on the
wall: `text`, `color`, `rotate`) and `sideWall` (a perspective stall partition:
`side`, `gap`, `door: { t0, t1, color, latch, hang }`, `peek: [{ emoji, t }]`
for things seen under the gap). For cozy rooms: `bunting` (`colors`, `flags`),
`couch` (`color`, `dark`, `pillows`, `cushions`), `rug` (`colors`, rings from
the outside in), `coffeeTable` (a board game on top, `board` colour, `items`
emojis beside it), `gameShelf` (`shelves`: rows of `{ label, color }` game
boxes and emoji strings), `toyChest` (`peek` toys, `label`, `color`, `lid`) and
`beanBag` (`color`). Hotspots are separate: they're placed over
the props by hand.

The red house in the top-left of the main map (hotspot `red_house`, with a
swinging `door`) opens into `assets/hangout_house.json`, the Hangout House: a
couch (with a 🪙 coin in the cushions), a board game table, a game shelf, a
snack bar, a toy chest, a bean bag, and Pancake the cat 🐱 (a critter NPC).

Toilet stalls 1 and 2 in the bathroom open into `assets/bathroom_stall_1.json`
and `assets/bathroom_stall_2.json`; stall 3 is "occupied" and stays shut.

Map-level `"spriteScale": 2.5` draws people bigger on that map (close-ups
like the stalls). Default 1.

Portal hotspot extras:
- `"arrive": { "px", "py" }` — where the player lands when entering the map
  through it (default: the hotspot's centre).
- `"door": { "px", "py", "pw", "ph", "color", "inside": "🚽" }` — the door
  drawn on the map; it swings open (with a CREEEAK!) before the map switches.

### Hotspot schema
```json
{
  "id":              "unique_snake_case_id",
  "name":            "Display Name",
  "px": 0.0,         // left edge as fraction of image width  (0–1)
  "py": 0.0,         // top  edge as fraction of image height (0–1)
  "pw": 0.1,         // width  as fraction of image width
  "ph": 0.1,         // height as fraction of image height
  "action":          "sleep|fly|cook|climb|stargaze|play|wash|eat|explore|shelter|bathroom|fight",
  "description":     "Short tooltip description",
  "interactionText": "Text shown when the player interacts with this hotspot.",
  "items": [         // 0–3 entries — default items present at this hotspot
    { "id": "snake_case_id", "name": "Display Name", "emoji": "🍡" }
  ]
}
```

### NPC friends / talking
A map JSON may also have an `npcs` array. Each entry places one of the
`characters` (from `index.html`) on the map; the player's own character is
hidden. Walk up and press **T** (or tap them) to talk: the player types a line,
it pops out of their mouth as a speech bubble, then the NPC replies.
```json
{ "id": "red_scout", "character": "Red Scout",   // must match a characters[].name
  "px": 0.63, "py": 0.78,                          // FEET position, fractions of the image
  "personality": "Free text that shapes how they talk." }
```
Replies come from Claude via `POST /api/npc-reply` in `server.js` (needs
`npm install` and `ANTHROPIC_API_KEY`). If that endpoint is unavailable (no
key, static hosting like GitHub Pages), the browser uses `localNpcReply()`.
Conversations live in memory only.

**Critter NPCs** use an `emoji` instead of a `character` and are drawn as that
emoji (bobbing, squishing while they talk). Example: Sir Ribbit, the frog in
the broken toilet (`assets/bathroom_stall_2.json`).
```json
{ "id": "toilet_frog", "name": "Sir Ribbit", "emoji": "🐸", "color": "#2e7d32",
  "size": 0.1,                                   // height as a fraction of the map
  "px": 0.5, "py": 0.575,                        // FEET position
  "what": "a little talking frog who lives in the broken toilet",  // tells Claude what they are
  "personality": "...",
  "localReplies": { "hello": [], "bye": [], "question": [], "any": [] } }  // offline lines; {name} = player
```

### Kitchen / cooking
`assets/camp_kitchen.json` (entered through the pink door under the sink on
the main map, hotspot `kitchen`) is a cooking room. A map with a `kitchen`
object turns hotspots that have a `station` into cooking spots:
```json
"kitchen": {
  "foods":   { "bread": { "name": "Bread", "emoji": "🍞" },
               "sandwich": { "name": "Sandwich", "emoji": "🥪", "dish": true } },
  "recipes": [ { "makes": "sandwich", "needs": ["bread", "cheese", "lettuce"] } ]
}
// on a hotspot:
"station": { "type": "source", "item": "bread" }                       // grab (never runs out)
"station": { "type": "cook", "verb": "Boil", "doing": "Boiling", "seconds": 3, "fx": "💨",
             "makes": { "tomato": "sauce" }, "slot": { "px": 0.5, "py": 0.25 } }
"station": { "type": "plate" }    // foods placed here become a recipe's `makes` when they match
"station": { "type": "serve" }    // eat a `dish` (counts toward "Recipes made")
"station": { "type": "trash" }
"station": { "type": "shop", "item": "cupcake" }   // buy a dessert with 🪙 coins
```
- Space at a station picks up / puts down / cooks (no dialog). The player
  holds **one** food at a time, drawn in their hands (`heldItem`). It never goes
  in the backpack, and is left behind when they walk out of the kitchen.
- `slot` is where food sits on the station (fractions of the hotspot box).
- Food on stations lives in memory only; which dishes have been eaten is saved
  as `dishesMade`.
- The recipe chalkboard is a `chalkboard` scene prop with hand-written
  `columns` — update it when recipes change. Only the board is in the scene
  picture; the writing is drawn live each frame (`drawChalkboards`). The board
  has a fixed number of rows (`rows`, default: what the hand-written columns
  need). When a column runs out, its oldest lines at the top go away and its
  last row becomes "▼ see all N ▼". A "See All Recipes" hotspot is added there
  (`chalkboardHotspots`, not shown in dev mode). It opens every recipe in a
  pop-up.

**Freestyle / your own recipes.** Bring a food to the plate that doesn't fit
any recipe (not a dessert) and a pop-up (`#kitchenModal`, state
`KITCHEN_MODAL`) offers to cook freestyle. You name it, and it's written on the
chalkboard's `"custom": true` column in yellow with a ✏️ (`draftRecipe`). The
plate then takes any food (up to `FREESTYLE_MAX` = 6). Space with empty hands
picks the whole dish up (🍽️), and you can put it back to add more. Eating it at
the table finalizes it: it's saved in `customRecipes` (`{ id, name, needs, map }`,
per camper like `dishesMade`), stays on the board, and is made on the plate like
any built-in recipe from then on (`allRecipes()`). Composting it or walking out
of the kitchen with it rubs it off the board. Your own recipes don't count
toward "Recipes made"; the HUD shows "⭐ N of your own".

**Desserts → strength.** A food with `"dessert": true, "price": 20, "strength": 5`
is sold at a `shop` station (the `dessertCase` prop: 🍪 $10 +2, 🧁 $20 +5,
🍰 $30 +8). Buying pays with coin items from the backpack (`value`, default 10)
and puts the dessert in your hands; Space at the shop again puts it back for a
refund. Eat it at the table (or it's eaten automatically if you walk out) to
add its `strength` to `strengthBoost` — permanently (saved, capped at
`STRENGTH_BOOST_MAX` = 10; the shop won't sell once you're maxed). Desserts don't count toward "Recipes made".

### Boss fight — Glug Glub Blob
The main map has a `boss` object and a `cave` hotspot (top-right corner). The
cave is drawn over the map in code (`drawBossCave`), and the Blob (human head,
fox body, sword in its tail — `drawBlob`) lives there. It comes out at random
to roam, chases you when you're close, and starts a fight if it catches you.
You can also press Space at the cave or next to it (or tap it). After a fight
it stays in its cave for a while (`bossRestMs`): 30–60s when it was beaten,
30–50s otherwise.
```json
"boss": {
  "name": "Glug Glub Blob", "aka": "I Eat You Blob",
  "cave": "cave",                  // hotspot id it lives in
  "pointsToWin": 10,
  "phrases":     ["EAT!", "nom nom you!", ...],   // shouted before every attack
  "hitPhrases":  [...],            // when it lands a hit
  "hurtPhrases": [...],            // when it gets hit
  "dodgePhrases": [...],           // when your swing is too weak to land
  "missPhrases":  [...],           // when its swing is too weak to land
  "strength": 10,                  // optional, the Blob's starting strength
  "reward": { "id": "ten_dollar_coin", "name": "$10 Coin", "emoji": "🪙", "coin": true, "value": 10 }
}
```
The fight view (`GameState.FIGHTING`) is a side-on duel: ← → move, ↑ jump,
Space attack, hold B to block, Esc runs away (counts as a loss). Touch devices
get on-screen buttons. Each unblocked hit scores 1 point. The Blob always
shouts a phrase while it winds up, and that's your cue to block, back off or
jump. It sometimes blocks, more often if you mash, and after blocking it
counter-attacks with a wind-up you can't interrupt. Win → `reward` goes in the
backpack (or at the cave if the backpack is full). Lose → every coin item
(`coin: true` or an id containing "coin") is taken from the backpack.

**Strength — same rules for you and the Blob.** You start every fight at
`STRENGTH_BASE` (10) + `strengthBoost` from desserts (kept between fights); the
Blob starts at `boss.strength` (default 10). Each hit taken costs 1, and each
fighter gets 1 back every `STRENGTH_REGEN_MS` (8s) up to where they started.
A 💪 bar sits under each name plate, with a thin line filling toward the next
+1. Strength sets how fast a fighter walks and swings (`strengthSpeed`: 0.55×
at 0, normal at 10, 1.45× at 20; for the Blob that's its wind-up, lunge and
recovery too) and the odds that an unblocked swing lands or a block holds
(`strengthOdds`: 30% at 0, 83% at 10, 96% at 20). A miss shows "DODGED!" /
"YOU DODGED!", a failed block "BLOCK BROKEN!". Regen was tuned with simulated
fights: they last ~20–30s, so 15s regen gave back only ~1 point, 8s gives 2–3,
and 5s or faster cancels most of the damage.

### Items / backpack
Each hotspot owns up to 3 items by default (`HOTSPOT_CAPACITY` in `index.html`).
The player has a 10-slot backpack (`BACKPACK_CAPACITY`). The `items` array in
the JSON is the **default** seeding; the runtime contents (per-hotspot and the
player's backpack) are persisted to `localStorage` under
`louisas-game:save:<character.name>`. Selecting a character with an existing
save shows a Resume / Start Fresh prompt; Start Fresh wipes that character's
key and re-seeds from the JSON defaults.

When adding new items to a hotspot, edit **only** `assets/game_design.json`.
The server fetches it fresh on every reload — no other file needs updating.

## Multiplayer (PubNub)
The start menu (HTML `#menu` overlay, state `MODE_SELECT`) offers **Single
Player** (unchanged) or **Multi Player** → **Create a new world** (random
6-digit code) / **Join a world** (type the code). Everything lives in the
"MULTIPLAYER" section of `index.html` (the `mp` object); PubNub's JS SDK is
loaded from jsDelivr and the publish/subscribe keys are constants there.
There's no game server, so it works on GitHub Pages too.

Each world is one PubNub channel, `louisas-game.world.<code>`. Messages (all
carry `from`, the sender's per-tab player id):

| `t`     | fields | meaning |
|---------|--------|---------|
| `pos`   | `char, map, x, y, f, w, r, h, fi` | where I am: map path, 0–1 fractions of the map, facing, walking, rotation, held food emoji, `fi` = fighting the Blob. ~8/s while moving, every 2.5s idle; a friend unheard for 9s is dropped |
| `hello` | — | I just joined: others reply with `pos`, and one synced player replies with `snap` |
| `snap`  | `to, at, items` | the whole world's items, `{ mapPath: { hotspotId: [item] } }`, as of op timetoken `at` |
| `take`  | `map, hs, item` (item id) | take an item from a hotspot |
| `drop`  | `map, hs, item` (`{id,name,emoji}`) | put an item at a hotspot |
| `say`   | `map, to, text, npc?` | a speech bubble line; `to` is a player or NPC id; `npc` set when it's an NPC's reply |
| `bye`   | — | I left |
| `boss`  | `map, w, x, y, f, mv, s, sid, sd` | the Blob, from its keeper: where (`home`/`out`/`returning`), feet position, facing, moving, current shout (`sid` dedupes it). ~7/s while out, every 3s at home |
| `bossfight` | `map, on, won` | I started (`on: true`) / finished a fight with the Blob |

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

Saves: the backpack/journal/dishes are saved per world + camper
(`louisas-game:mp:<code>:<character>`); the world's items are cached in
`louisas-game:world:<code>` and used if you "Go in anyway" to an empty world.
One player per character in a world; camper NPCs hide when a player is that
character. Kitchen station food is still per-player (only held food is shown
to friends).

## Developer mode — adjusting hotspot bounds in-game

The game has a built-in hotspot editor activated with **Cmd+D** (Mac)
or **Ctrl+D** (Win/Linux). Use it whenever hotspot boxes need to be
repositioned or resized without manually editing JSON fractions.

### Workflow
1. Open the game in the browser (`npm run dev` → http://localhost:3000).
2. Press **Cmd+D** — a red **🔧 DEV MODE** badge appears in the top-right
   corner. Character movement and all interactions are frozen.
3. All hotspot bounding boxes are now visible as dashed rectangles with
   labelled IDs. Drag any **corner handle** (white/yellow circle) to
   resize a box. Click a box interior to select it (highlights yellow).
4. When you are happy with the layout, press **Cmd+D** again to exit.
   The **complete updated JSON** (the full map config, not just bounds) is
   automatically copied to your clipboard.
5. Paste the clipboard contents directly over `assets/game_design.json`
   — it is the complete file replacement, no editing needed.
