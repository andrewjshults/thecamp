# Maps, rooms and hotspots

Code: `src/world/` (`maps.js` loading and switching maps, `scene.js` + `scene-svg.js`
drawing `scene` rooms, `props/` the room props, `hotspots.js`, `doors.js`,
`buildings.js`), `src/tools/dev-mode.js`.

## Adding a new map
1. Drop the image into `assets/` (e.g. `assets/map2.jpg`).
2. Create `assets/map2.json` following the same schema as `game_design.json`:
   - `name` — display name shown on the character-select screen
   - `where` — optional, how hints say where something is on this map
     (e.g. `"out at the camp"`); default `"in the <name>"`
   - `image` — path to the image (e.g. `"assets/map2.jpg"`; an `.svg` is rasterised once when it
     loads), **or** a `scene` (see below)
   - `noSwordDrops` — optional, `true` to never drop a new sword here (the shops, the Brick's castle)
   - `playerStart` — `{ "px": 0–1, "py": 0–1 }` fractional spawn point
   - `hotspots` — array of hotspot objects (see schema below)
3. Connect it with a portal hotspot (`targetMap`, below) on a map that leads there. To start
   the game on it instead, change the `loadMap(...)` call in `src/main.js`.

## Rooms without a drawing (`scene` maps)
A map can use a `scene` object **instead of** `image`. `src/world/scene*.js` turn it
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
Kinds are registered with `registerSceneProps` (in `src/world/props/*.js`,
`src/features/kitchen/props.js` and `src/features/bank/props.js`; a new room's
props go in a new file): `emoji` (`emoji`, `rotate`),
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
`beanBag` (`color`). For the Second Camp's rooms (`src/world/props/level2.js`):
`discoBall`, `partyTable` (`items`), `pool` (`lanes`, `floaties`), `divingBoard`,
`lifeguardChair`, `sleepingBag` (`color`, `pillow`), `swordRack` (`swords: [{ emoji, blade }]`),
`shopCounter` (`board` lines, `items`) and `forge`. For the Third Camp's rooms
(`src/world/props/level3.js`): `waterSlide` (`flip`, `color`), `throne`, `torch`, `banner`
(`color`, `emoji`) and `armorStand` (`color`, `emoji`). For the Fourth Camp's rooms
(`src/world/props/level4.js`): `trapdoor` (in the Brick's castle), `codeScreen` and `slimeThrone`. For the Fifth Camp's rooms
(`src/world/props/level5.js`): `shieldWall` (`shields`: emoji), `starrySky` and `moonThrone`. Hotspots are separate: they're placed over
the props by hand.

The red house in the top-left of the main map (hotspot `red_house`, with a
swinging `door`) opens into `assets/hangout_house.json`, the Hangout House: a
couch (with a 🪙 coin in the cushions), a board game table, a game shelf, a
snack bar, a toy chest, a bean bag, and Pancake the cat 🐱 (a critter NPC).

The bank on the main map isn't in the drawing: it's drawn in code over its
hotspot (`"building": "bank"`, see [bank.md](bank.md)), and so is the Blob's
cave (see [boss-fight.md](boss-fight.md)).

Toilet stalls 1 and 2 in the bathroom open into `assets/bathroom_stall_1.json`
and `assets/bathroom_stall_2.json`; stall 3 is "occupied" and stays shut.

Map-level `"spriteScale": 2.5` draws people bigger on that map (close-ups
like the stalls). Default 1.

Portal hotspots have `"targetMap"` (the map JSON it leads to) and
`"targetHotspot"` (the portal on that map you come out of), plus extras:
- `"arrive": { "px", "py" }` — where the player lands when entering the map
  through it (default: the hotspot's centre).
- `"door": { "px", "py", "pw", "ph", "color", "inside": "🚽" }` — the door
  drawn on the map; it swings open (with a CREEEAK!) before the map switches.

A portal can also be locked: `"codeLock"` (a door code) or `"keyLock"` (a key item), see
[level-four.md](level-four.md).

A `"passage": { "targetMap", "targetHotspot" }` is a way to another map that
only opens later (its `lock`, see [level-three.md](level-three.md)): the Blob's cave leads to the Second Camp once you've beaten
the top-level Blob (see [level-two.md](level-two.md)). Map crawls follow it
like a portal (`hotspotLinks`).

## Hotspot schema
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

## Developer mode — adjusting hotspot bounds in-game

The game has a built-in hotspot editor activated with **Cmd+D** (Mac)
or **Ctrl+D** (Win/Linux). Use it whenever hotspot boxes need to be
repositioned or resized without manually editing JSON fractions.

## Workflow
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
