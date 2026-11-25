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
`drain`, `puddle`, `footprints`. Hotspots are separate: they're placed over
the props by hand.

A portal hotspot may have `"arrive": { "px", "py" }` — where the player lands
when entering the map through it (default: the hotspot's centre).

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
