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
  "wall":    { "pattern": "blocks|planks|canvas", "color": "#e1ecaf" },
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
for things seen under the gap). Hotspots are separate: they're placed over
the props by hand.

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
  "action":          "sleep|fly|cook|climb|stargaze|play|wash|eat|explore|shelter|bathroom",
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
```
- Space at a station picks up / puts down / cooks (no dialog). The player
  holds **one** food at a time, drawn in their hands (`heldItem`). It never goes
  in the backpack, and is left behind when they walk out of the kitchen.
- `slot` is where food sits on the station (fractions of the hotspot box).
- Food on stations lives in memory only; which dishes have been eaten is saved
  as `dishesMade`.
- The recipe chalkboard is a `chalkboard` scene prop with hand-written
  `columns` — update it when recipes change.

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
