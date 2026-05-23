# Louisa's Game — Claude Code Notes

## Project overview
A 2D browser exploration game built in a single `index.html` file.
The map is a hand-drawn image (`assets/game_design.jpg`).
Interactive hotspots (bounds + interaction text) live in a companion
JSON file at `assets/game_design.json` — one JSON per map image.

## Adding a new map
1. Drop the image into `assets/` (e.g. `assets/map2.jpg`).
2. Create `assets/map2.json` following the same schema as `game_design.json`:
   - `name` — display name shown on the character-select screen
   - `image` — path to the image (e.g. `"assets/map2.jpg"`)
   - `playerStart` — `{ "px": 0–1, "py": 0–1 }` fractional spawn point
   - `hotspots` — array of hotspot objects (see schema below)
3. In `index.html` change the `loadMap(...)` call at the bottom of the
   loading section to point at the new JSON.

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

When adding new items to a hotspot, update **both** `assets/game_design.json`
and the inline `<script id="map-config">` copy in `index.html`, exactly like
hotspot bounds. The two must stay in sync.

## Developer mode — adjusting hotspot bounds in-game

The game has a built-in hotspot editor activated with **Cmd+D** (Mac)
or **Ctrl+D** (Win/Linux). Use it whenever hotspot boxes need to be
repositioned or resized without manually editing JSON fractions.

### Workflow
1. Open the game in the browser and navigate your character near the
   area you want to edit.
2. Press **Cmd+D** — a red **🔧 DEV MODE** badge appears in the top-right
   corner. Character movement and all interactions are frozen.
3. All hotspot bounding boxes are now visible as dashed rectangles with
   labelled IDs. Drag any **corner handle** (white/yellow circle) to
   resize a box. Click a box interior to select it (highlights yellow).
4. When you are happy with the layout, press **Cmd+D** again to exit.
   The updated bounds are automatically **copied to your clipboard** as
   a JSON array with instructions.
5. Paste the clipboard contents into a message to Claude Code, e.g.:

   > "Update game_design.json with these hotspot bounds:"
   > *[paste clipboard]*

   Claude Code will replace the `"hotspots"` array in
   `assets/game_design.json` with the new values.

### What the clipboard contains
The clipboard message instructs you to update hotspot bounds in **two places**:

1. **`assets/game_design.json`** — authoritative source, used when the game
   is served over HTTP (local server, GitHub Pages).
2. **`<script type="application/json" id="map-config">` in `index.html`** —
   an identical inline copy used as a fallback when `index.html` is opened
   directly via `file://` (no server). `fetch()` is blocked by the browser
   in that context, so this copy makes the game work without a server.

Paste the clipboard content into a Claude Code chat; Claude will update both
locations in one step.

### Keeping the two copies in sync
Both copies contain identical hotspot data. They diverge only if you edit one
manually without updating the other. Always use the dev-mode workflow to keep
them consistent — it always reflects the current in-memory state.
