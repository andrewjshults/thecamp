# Louisa's Game — Claude Code Notes

## Project overview
A 2D browser exploration game, served as a static site (GitHub Pages, no
build step). The main map is a hand-drawn image (`assets/game_design.jpg`), and
interactive hotspots (bounds + interaction text) live in a companion JSON file,
`assets/game_design.json`. There's one JSON per map, and rooms without a
drawing are built from a `scene` in their JSON.

- `index.html`: the markup (canvas, HTML pop-ups) and the list of scripts
- `styles.css`: the styles for the HTML pop-ups
- `src/`: the game, as plain scripts that share one global scope, one file per
  area or feature. How it fits together, and the plug-in points features use
  to hook in: **[docs/architecture.md](docs/architecture.md)**
- `assets/`: map images and map JSON
- `tests/smoke.js`: plays through the game in a headless browser

## Dev server

Start the game with:

```bash
npm run dev
```

This runs `server.js` (zero npm dependencies — pure Node built-ins) which:
- Serves the project at **http://localhost:3000**
- Injects a live-reload snippet so the browser auto-refreshes on any file save

Map JSON is fetched over HTTP at runtime, so it is the **single source of
truth**: there is no inline copy to keep in sync.

## Tests

```bash
npm test
```

Plays through every map, hotspot, NPC, the fight, saving/resuming, taps and a
two-tab multiplayer world, and fails on any JavaScript error. Needs Playwright
(`npm install --no-save playwright && npx playwright install chromium`). Runs
are repeatable, so `--shots DIR` / `--compare DIR` can show that a refactor
changed nothing on screen (see [docs/architecture.md](docs/architecture.md#testing)).
Run it before merging, and again after resolving a merge.

## Making changes without merge conflicts

Several changes are often made at once on separate branches, so:

- **New feature → new files.** Put it in `src/features/<name>/` (or its own
  file in the right folder) and hook it in from there with the `register...`
  functions in `src/core/hooks.js`: saved values, game states and pop-ups,
  hotspot kinds, drawing layers, per-frame updates, multiplayer messages,
  scene props, game events. Don't add feature-specific branches to shared
  functions (`gameLoop`, `keydown`, `handleInteract`, `drawGame`, `writeSave`,
  `switchMap`...). If a hook is missing, add one.
- **New room props → a new props file**, not an existing one.
- **Docs → the feature's own file in `docs/`.** Only add a line to the list
  below here.
- **Script tags:** add yours to its group in `index.html`. If two branches both
  add tags in the same place, the merge conflict is trivial: keep both.
- **Maps:** the dev-mode hotspot editor exports a whole map JSON. Paste it over
  that map's file only, and avoid editing the same map on two branches at once.

## Game rules

- **Boss rewards:** beating a level's boss gives a coin worth the level × $10
  (the Blob $10, Mega Mallow $20, the Brick $30, the Slime Brick $40). Set it
  in the boss's `reward` in its map JSON. A new level's boss follows the same
  rule.

## Building a new level

Use the **`build-level`** skill (`.claude/skills/build-level/SKILL.md`): the
questions to ask first, the files, the passage from the level below, the map
script, the boss and its tuning, the smoke test and the docs.

## Docs

- [Architecture, plug-in points, adding a feature, testing](docs/architecture.md)
- [Maps, `scene` rooms, props, portals, hotspot schema, dev mode](docs/maps.md)
- [Items, the backpack and saves](docs/items.md)
- [NPC friends: talking, item questions, wandering, sidekicks, critters](docs/npcs.md)
- [Kitchen: stations, recipes, freestyle cooking, desserts](docs/kitchen.md)
- [The Camp Bank](docs/bank.md)
- [Boss fight: the Glug Glub Blob, strength, levels, swords](docs/boss-fight.md)
- [Multiplayer over PubNub: messages, shared items, the shared Blob](docs/multiplayer.md)
- [The Second Camp: the cave's secret passage, the Marshmallow bosses](docs/level-two.md)
- [Ember's Sword Shop: the five swords you can buy](docs/sword-shop.md)
- [Exploration mode (E): no bosses, move between the levels](docs/exploration-mode.md)
- [Exploration mode (E): no bosses, move between the levels](docs/exploration-mode.md)
- [The Third Camp: the hole in the Marshmallows' lair, the poison moat, the Brick](docs/level-three.md)
- [Armor and Shelly's Armor Shop: the four kinds you can buy](docs/armor-shop.md)
- [The prize wheel after each adventure, and the fight charms you can win](docs/prize-wheel.md)
- [Play time: the 15-minute limit, the break, the grown-up TOTP code, dev overrides](docs/playtime.md)
- [The Fourth Camp: door codes, the Safe Zone, the Slime Brick, the throne key, Charlie's shop](docs/level-four.md)

Keep a feature's doc up to date when you change it: names of functions and
constants in the docs are how the code is found.
