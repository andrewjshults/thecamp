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
   - `image` — path to the image (e.g. `"assets/map2.jpg"`)
   - `playerStart` — `{ "px": 0–1, "py": 0–1 }` fractional spawn point
   - `hotspots` — array of hotspot objects (see schema below)
3. In `index.html` change the `loadMap(...)` call to point at the new JSON.

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
   The updated bounds are automatically **copied to your clipboard**.
5. Paste the clipboard contents into a message to Claude Code, e.g.:

   > "Update game_design.json with these hotspot bounds:"
   > *[paste clipboard]*

   Claude Code will replace the `"hotspots"` array in
   `assets/game_design.json`. That's the only file that needs changing.
