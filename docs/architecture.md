# How the code is put together

The game is a static site: `index.html`, `styles.css`, the scripts in `src/`
and the maps in `assets/`. There's no build step, so GitHub Pages serves it as
it is, and `npm run dev` (`server.js`) only adds live-reload and the NPC chat
endpoint.

## Scripts, one global scope

`index.html` loads every file in `src/` with a plain `<script src>` tag (not
modules). Plain scripts share one global scope, so a function or top-level
`let`/`const` in one file can be used from any other. The tags are grouped by
folder, and the browser runs the files in that order.

Two rules come from that:

1. **Code that runs while a file loads can only use earlier files.** Top-level
   statements (`const X = ...`, `register...(...)` calls) run straight away.
   Code inside functions runs later, once every file has loaded, so it can
   use anything. In a registration, refer to functions from later files
   through an arrow, e.g. `draw: () => drawGame()`, not `draw: drawGame`.
2. **Start-up happens in `src/main.js`, which loads last.** It loads the main
   map and starts the game loop. Nothing else should kick things off at the
   top level: between two script files, the browser can already run callbacks
   (a finished `fetch`, a loaded image) that need code from files that haven't
   loaded yet.

A load-order mistake shows up as soon as the page loads, as a
`ReferenceError` in the console. `npm test` fails on it.

## Folders

| Folder | What's in it |
|---|---|
| `src/core/` | The engine: `hooks.js` (plug-in points, below), `util.js`, `state.js` (`GameState`, canvas), `player.js`, `save.js`, `input.js`, `update.js`, `playing.js` (walking around a map), `draw-game.js`, `canvas.js` |
| `src/world/` | Maps (`maps.js`), which level each map is on (`levels.js`), `scene` rooms (`scene.js`, `scene-svg.js`, `props/`), hotspots, doors, buildings |
| `src/people/` | Characters, NPCs, talking, speech bubbles, wandering, sidekicks |
| `src/items/` | The backpack and item use, coins |
| `src/ui/` | Screens and overlays drawn on the canvas: loading, character select, HUD, journal, dialogs |
| `src/features/` | One folder (or file) per feature: `kitchen/`, `bank/`, `boss/`, `level2/`, `level3/`, `level4/`, `sword-shop/`, `armor-shop/`, `explore/`, `playtime/`, `prize-wheel/`, `sword.js` |
| `src/mp/` | The start menu and multiplayer over PubNub |
| `src/tools/` | Dev mode (the hotspot editor) |
| `src/main.js` | The game loop and start-up (loads last) |
| `docs/` | One doc per feature, plus this one |
| `tests/smoke.js` | The smoke test |
| `tools/fight-sim.js` | Boss fight simulator (paste into the console) |
| `tools/make-level2-map.js` | Draws the Second Camp's map, `assets/camp_level2.svg` |
| `tools/make-level3-map.js` | Draws the Third Camp's map, `assets/camp_level3.svg` |
| `tools/make-level4-map.js` | Draws the Fourth Camp's map, `assets/camp_level4.svg` |

## Plug-in points (`src/core/hooks.js`)

A feature hooks into the game from its own file instead of editing the shared
functions. Each shared function loops over what's registered:

| Register with | Used by | For |
|---|---|---|
| `registerSaveField(key, { save, load })` | `writeSave`, `applySave`, `initFreshSave`, `mpWriteSave`, `mpStartPlaying` | A value saved per camper (see [items.md](items.md)) |
| `registerGameState(NAME, { draw, onKey, onTap, inWorld, inputs })` | the game loop, `keydown`, `handleCanvasTap`, `mpInWorld` | A screen or pop-up. New names are added to `GameState` |
| `registerHotspotKind({ match, interact, hint }, { first })` | `handleInteract`, the hint above a hotspot in `drawGame` | A hotspot that does its own thing on Space/tap (portals, stations, the bank, the cave). `first: true` checks it before the kinds already registered |
| `registerMapFoe(near)` | `playingKey`, `playingTap`, `drawPeople` | Something on the map you can pick a fight with: `near()` returns null or `{ engage, hit, drawHint }` (the Blob, the Marshmallows, the Brick, the Slime Brick) |
| `registerFoesOff(isOff)` | the Blob and the Marshmallows (`foesOff()`) | Turning the bosses off for a while (exploration mode) |
| `registerLevelsOpen(isOpen)` | `levelUnlocked` (`levelsAllOpen()`) | Counting every level as unlocked for a while (exploration mode) |
| `registerMapPeople(list)` | `drawPeople` | Things drawn sorted by feet `y` with the people: `list()` returns `[{ y, draw }]` |
| `registerMapLayer(z, draw)` | `drawGame` | Drawn over the map picture, under people (map coordinates) |
| `registerScreenLayer(z, draw)` | `drawGame` | Drawn over people, under the HUD (screen coordinates) |
| `registerFrameUpdate(z, fn)` | the game loop | Runs every frame, whatever's on screen |
| `registerMapUpdate(z, fn)` | `update()` | Runs every frame while walking around a map |
| `registerPlayerSpeed(factor)` | `update()` (`playerSpeedFactor()`) | Walking slower or faster for a while: `factor()` returns × your speed (the Fourth Camp's slime pit) |
| `registerNpcAnswer(fn)` | `fetchNpcReply` (`npcGameAnswer`) | An NPC answering from the game itself: `fn(npc, line)` returns a reply or null (the code finder's door codes) |
| `registerPlayerHitGuard(fn)` | `resolveHit` | Stopping a boss's hit just before it lands on you (armor): `fn(fight, now)` returns true |
| `registerFightLayer(z, draw)` | `drawFight` | Drawn in the fight view: `z` < 50 over the fighters, `z` >= 50 over the HUD |
| `registerHudBadge(draw)` | `drawHUD` | A badge in the map HUD's top row, after your sword: `draw(x, y)` returns its width |
| `registerMpMessage(t, fn, { othersOnly })` | `mpOnMessage` | A multiplayer message type (see [multiplayer.md](multiplayer.md)) |
| `registerSceneProps({ kind(pen, box, prop) })` | `buildSceneSvg` | Props a `scene` room can use (see [maps.md](maps.md)) |
| `onGameEvent(name, fn)` | `emitGameEvent` | `camperChosen`, `playStart`, `mapLeave`, `mapArrive`, `fightStart`, `fightOver`, `adventureDone` |

Layers and updates with a lower `z` go first. The current numbers are spaced
out (10, 20, 30...), so a new one can fit between two others. Everything else
runs in the order it was registered, which is the order of the script tags.

## Adding a feature

1. Put it in its own file or folder (`src/features/<name>/`), and add its
   `<script>` tag(s) to `index.html` in the features group.
2. Hook it in with the `register...` calls above, from its own file. If it
   needs a hook that doesn't exist yet, add the hook to `hooks.js` (one
   loop in the shared function) rather than adding a feature-specific
   branch there.
3. HTML for a pop-up goes in `index.html` as its own block, and its CSS in
   `styles.css` as its own block.
4. Write it up in `docs/<name>.md`, and add a line to the list in `CLAUDE.md`.
5. Run `npm test`.

## Testing

`npm test` runs `tests/smoke.js`. It starts the dev server, plays the game in
headless Chromium and fails on any JavaScript error:
- single player: every map, Space at every hotspot, talking to every NPC
  (including an item question and asking them to be your sidekick), the
  backpack, journal and dev mode, a fight
- saving some progress, then resuming
- clicks and taps
- multiplayer with two tabs over a fake PubNub (no internet needed): joining,
  picking up an item, talking

It needs Playwright (`npm install --no-save playwright && npx playwright
install chromium`).

The runs repeat exactly: the page's clock is fake and only moves when the
test says so, `Math.random` is seeded, and map files and images finish loading
between steps. So a refactor can be checked screen by screen:

```bash
git stash            # or check out the commit before the change
node tests/smoke.js --shots out/before
git stash pop
node tests/smoke.js --compare out/before    # same screenshots + same trace?
```

`--compare` reports every screenshot that differs, and whether the trace
(`trace.json`: what each step did, NPC replies, saves) differs.
`node tests/smoke.js --diff DIR_A DIR_B` compares two earlier runs. A change
that's *meant* to look different will of course show up. Look at those
screenshots and check that only the expected ones changed. Multiplayer isn't
compared screen by screen: its timing between the two tabs isn't fixed.
