---
name: build-level
description: Build a new level (a new "camp") for Louisa's game from a drawing or a description. Covers the questions to ask first, the map drawing script, the passage from the level below, the level's boss, its rooms, its adventures (item uses for the Adventure Journal), shops and special mechanics, the smoke test and the docs. Use when asked to add, build or design a new level/camp, or to turn a drawing of a level into the game.
---

# Building a new level

Each level is a camp you reach through a secret passage that opens when you
beat the level below's boss at its top level. Levels 2 and 3 are simpler
references (`docs/level-two.md`, `docs/level-three.md`, `src/features/level2/`,
`src/features/level3/`). Level 4 is the most complete example
(`docs/level-four.md`, `src/features/level4/`): door codes, a key lock, a
roaming boss, a shop with exclusive gear.

Read `CLAUDE.md` and `docs/architecture.md` first. The rules there (new
feature → new files, hook in with `register...`, never add feature branches to
shared functions) apply to everything below. Below, `N` is the new level, `P`
is the level below (`N - 1`).

## 1. Ask before building

Louisa's drawings leave gaps, and the user prefers questions to guesses. Read
the drawing carefully: list every area, label and small sketch (keypads,
keys, stars, arrows, prices). Then ask, in one `AskUserQuestion` call with a
recommended option first, about whatever is unclear. Usually:

- **Getting in:** beat level P's boss at its top level → a passage opens
  (recommended, the same as every level so far), or something else?
- **The way out / next level:** if the drawing points to level N+1 and it
  doesn't exist yet, show a "coming soon" placeholder (recommended)?
- **The boss:** where it lives, whether it stays home (like the Brick in its
  castle) or roams the map (like the Marshmallows), what's safe from it.
- **Special mechanics** in the request (codes, keys, hazards): exact rules,
  e.g. typed every time or remembered, per camper or shared.
- **Adventures**, only if the drawing or the request shows some (an item with
  an arrow to a spot, "use the key on..."): what each one is. Otherwise write
  them yourself (section 6).

Decide small things yourself (names of new characters and items, colours,
which drawn labels are only decoration, the adventures' text) and list them in the final summary as
"things I decided without asking".

## 2. Files for level N

| What | Where |
|---|---|
| Opening the passage, the level's hazards and locks | `src/features/levelN/levelN.js` |
| The boss on the map and in a fight | `src/features/levelN/<boss>.js` |
| Drawing the boss, its home and its fight arena | `src/features/levelN/draw-<boss>.js` |
| Other features (codes, gear...) | `src/features/levelN/<feature>.js` |
| Scene props for the new rooms | `src/world/props/levelN.js` (a **new** props file) |
| The map + its drawing | `assets/camp_levelN.json`, `assets/camp_levelN.svg` |
| The script that draws the map | `tools/make-levelN-map.js` |
| Rooms | `assets/levelN_<room>.json` |
| Docs | `docs/level-N.md` (named like the others: `level-two.md`, `level-three.md`...) |

Script tags go in `index.html`: the props file after the other
`src/world/props/*.js`, the feature files after the last level's feature
files. Add one line for the doc to the list in `CLAUDE.md`, a row for the map
script to the `tools/` part of the folder table in `docs/architecture.md`, and
the props to the list in `docs/maps.md`.

## 3. The passage up from level P

Follow `level3.js` (or `level4.js`):

```js
let levelNOpen = false;
registerSaveField('levelNOpen', { save: () => levelNOpen, load: s => { levelNOpen = !!s.levelNOpen; } });
PASSAGE_LOCKS.levelN = () => levelNOpen;
function lockLevelN() { levelNOpen = false; }
onGameEvent('fightOver', ({ foe, won, level, res }) => {
  if (foe.id !== '<level P boss id>' || !won || level < <P_BOSS>_LEVEL_MAX) return;
  res.lines.push({ text: '🕳️ ... opened! ...', color: '#CE93D8' });
  levelNOpen = true;
});
```

- Put a hotspot with a `passage` on one of level P's maps:
  `"passage": { "targetMap": "assets/camp_levelN.json", "targetHotspot": "<back hotspot>", "lock": "levelN", "glow": { "x", "y" } }`.
  Give it `interactionText` for while it's shut. `mapLevels` (in
  `src/world/levels.js`) counts a passage as one level up, so nothing else
  is needed for levels, sword drops, item questions or exploration mode.
- **Don't put the passage where the boss sits.** Space next to a boss starts a
  fight before any hotspot (`playingKey` asks `nearbyFoe()` first). Level 4
  uses a trapdoor on the castle floor, not the throne.
- On level N, a normal portal (`targetMap`) goes back down to the passage.
- When level N's boss beats you: `lockLevelN()`, eat the backpack coins
  (`gobbleBackpackCoins`), and `switchMap` back to level P.

## 4. The map drawing (`tools/make-levelN-map.js`)

Copy `tools/make-level3-map.js` (or `make-level4-map.js`) and change the
layout. Rules:

- It uses the game's own marker pen (`scenePen` from `src/world/scene.js`),
  at 3300×2400 (`S = W / 2400`), with a seeded `rnd()` so it comes out the same
  every time.
- **Read positions from the map JSON** (`hotspots`, doors, zones), so moving a
  hotspot and re-running the script keeps the two in step. Write the JSON
  first, then the script.
- **No words on the map**: emoji stickers and pictures instead of labels.
- Draw trails in the fill layer first (`p.fill.push(<path>)`) so buildings sit
  on top. Keep grass tufts off buildings: they're ink and land over the
  fills.
- Doors are drawn closed at their hotspot's `door` rect; the game swings them
  open. Things that change (a key on its hook, keypads, the bank) are drawn
  by the game in a map layer, not in the SVG.
- Leave room for where the player arrives (`arrive`, `playerStart`): not on a
  roof or over a hole.
- **Look at it.** Render the SVG with
  `node .claude/skills/build-level/scripts/render-svg.js assets/camp_levelN.svg <out.png>`
  and read the PNG. Fix overlaps before going on.

## 5. Rooms

- Copy a room from level P with
  `node .claude/skills/build-level/scripts/copy-room.js assets/levelP_pool.json assets/levelN_pool.json P N`:
  it rewrites links to `camp_levelP.json`, the camp's name ("Third Camp" →
  "Fourth Camp") and the `_lP` item ids, and lists the NPCs to replace.
  **Every NPC id must be unique across the game**: replace copied NPCs with
  new ones (a critter with `emoji`, `what`, `personality`, `localReplies`).
- New rooms are `scene` maps (see `docs/maps.md`). New prop kinds go in
  `src/world/props/levelN.js`.
- Exit hotspots: `targetMap` back to `camp_levelN.json`, `targetHotspot` = the
  hotspot you came in through, plus an `arrive` point outside the door.
- `"noSwordDrops": true` on shops and the boss's room.
- A copied room keeps its `uses`. `copy-room.js` renames their `_lP` item
  ids too, but read their text for things from level P, and give the room
  some of the new level's own (section 6).

## 6. Adventures

Adventures are what fills the Adventure Journal: use an item from the
backpack at a spot, get a little story and a prize wheel spin. Each one is an
entry in a hotspot's `uses` in the map JSON (`docs/items.md` has the details):

```json
"uses": [
  { "itemId": "slime_jar", "text": "Charlie heats the slime in the forge... and it turns into a super bouncy ball! BOING! 🫙", "animation": "craft" }
]
```

Every level has its own, **done with items found on that level**. Write them
once the rooms and their `items` are in place:

1. **List the level's items** and where each one starts. Run
   `node .claude/skills/build-level/scripts/check-adventures.js N`: it lists
   the items that have no adventure yet.
2. **Pick the spots.** Any hotspot that opens the normal pop-up: things to
   look at, sit on, swim in, eat at. **Not** a door or portal (`targetMap`), a
   shop counter, a code finder, a lock, a passage, a fight, or a "coming
   soon" spot. Those do their own thing, and the item pop-up never shows, so
   the adventure can't be done.
3. **Match items to spots**, 2–4 per spot, so every item on the level has at
   least one. A good match is funny or makes sense there: the oar on the sword
   rack, sunscreen at the towel bench, a slime jar in the forge. An item can
   go to spots on other maps of the same level (the pool towel in the camp's
   tent).
4. **Rules the game enforces:**
   - **Never at a spot with the id the item starts at.** You can't use an item
     where you picked it up, and that's checked by spot id only, so an item
     from a `sinks` can't be used at any map's `sinks`.
   - **One adventure per item per spot.**
   - **`animation`** is one of `bathroom climb cook craft drink eat explore
     fly play shelter sit sleep stargaze swim wash` (it picks the little
     scene in the pop-up); match the spot's own `action` when it fits.
   - Use the item's real id: on Levels 3 and up, copied rooms' items end in
     `_lN` (`toothbrush_l4`), and an adventure for `toothbrush` won't take it.
5. **Write the text** for Louisa: one or two short sentences, present tense,
   "You...", lots of excitement, sound effects (SPLOOSH! BOING!) and one or
   two emoji at the end. Tie it to the level's story when you can (the boss,
   the camp's friends).
6. **Bathrooms** are the same on both sides: give the boys' and girls'
   bathrooms the same adventures, with that level's `_lN` items.
7. **Bonus adventures** for items carried up from lower levels (the Level 1
   flashlight, the teddy bear) are fine as extras, but don't count toward the
   level's own.
8. **Check them**: `check-adventures.js N` must end with "✓". It fails on
   anything above, and on a level with fewer than 15 of its own. The smoke
   test's `adventures` step fails on that too. Aim for 25–45 per level
   (Levels 2–4 have 37–56).

Nothing else is needed: the journal counts every map in the game, and
adventures are saved per map (a spot id can repeat between maps, like every
camp's `pool`).

## 7. The boss

- **Levels carry on**: level P's boss tops out at some level `M`; level N's
  boss runs `M + 1` to `M + 5` (`<BOSS>_LEVEL_MIN/MAX`, `<boss>Wins` saved, a
  `<boss>Tuning(level)` between `<BOSS>_TUNE_LOW` and `_TUNE_TOP`).
- **The reward is a coin worth N × $10** (the rule in `CLAUDE.md`): its
  `reward` in the map JSON, e.g. for level 5 `{ "id": "fifty_dollar_coin", "name": "$50 Coin", "emoji": "🪙", "coin": true, "value": 50 }`.
- **Stays home** (like the Brick): `brick.js` is the pattern. **Roams the
  map** (like the Marshmallows or the Slime Brick): `mallows.js` /
  `slime-brick.js`, with `safeZones` it can't enter.
- The foe object (`id, def, level, noSword, tune, label, intro, draw, arena,
  begin, finish, end, after`) is described above `blobFoe`. No sword: it wins
  straight away (`begin`).
- Hook in with `registerMapFoe` (Space / tap to fight), `registerMapPeople`
  (draw it with the people), a screen layer for its shouts, and a
  `registerMapUpdate`, or a `registerFrameUpdate` if it must keep moving while
  a pop-up is open (the Slime Brick hunts you while you type a code; check
  `state` yourself and stop in `devMode`).
- Check `foesOff()` everywhere it moves, catches or is drawn (exploration
  mode), and add it to `docs/exploration-mode.md`.
- Add a **test hook** that keeps it home: `<boss>.restUntil = Infinity` (the
  map crawl in the smoke test sets it on every map).
- A fresh look: a new drawing function, new poses, a new arena. Don't reuse
  another boss's look.

### Tuning

Use `tools/fight-sim.js` against the dev server:
`node .claude/skills/build-level/scripts/sim.js '[{"tune":"slimeTuning(16)","bot":"good"}]'`
(run `npm run dev` first). Targets, from the levels so far:

- the "good" bot with a plain sword at strength 10: about the same or a bit
  under level P's top boss at its first level (~30%), falling to ~18–20% at
  the top level;
- the best gear in the game lifts the good bot to ~85–90%;
- a new sword or armor should beat the cheaper ones it's priced above.

Put the table of results in `docs/level-N.md`.

## 8. Shops and new gear

- Counters are hotspots with `swordShop` / `armorShop`. A counter can say what
  it sells (`"sells": "all"` or a list of ids) and what its keeper says
  (`greeting` with `{name}`, `cheer`).
- New swords and armor go in a new file (like `charlie-gear.js`), added to
  `SHOP_SWORDS` + `SWORD_KINDS` / `ARMOR_KINDS`, with `exclusive: true` if
  only this level's shop sells them. Prices in tens (change is given in $10
  coins).

## 9. Hotspots that do their own thing

Use `registerHotspotKind({ match, interact, hint }, { first: true })` for
locked doors and the like (`first` so it wins over the plain portal kind).
Level 4's `codeLock` (keypad, state `CODE_PAD`) and `keyLock` (an item that
unlocks a door for good) are the examples. New pop-ups: an HTML block in
`index.html`, a CSS block in `styles.css`, `registerGameState` with `inputs`
for anything you type into, and close it on Escape.

An NPC that answers from the game itself (codes, facts): `registerNpcAnswer`.

## 10. The smoke test (`tests/smoke.js`)

- Add an `async function levelNCamp(tab)` after the last level's, and call it
  after it in `singlePlayer`. Cover: the passage opening (force a win against
  level P's boss at its top level), going through, each mechanic (both the
  right and wrong way), the boss catching you and a win, a loss with no sword
  sending you back with the passage shut, and finally reset what you changed.
- In the map crawl, add the boss's `restUntil = Infinity` next to the others.
- Add any new pop-up state to `backToPlaying`.
- Add new saved values to the "some progress to save" step, its reset and
  the `resumed` note.
- Adventures need no new test: the `adventures` step finds every level
  itself, but it fails if the new level has fewer than 15 of its own.
- `npm test` must pass. **Don't create or edit files in the repo while it
  runs**: the dev server's live reload reloads the page and the run aborts with
  "Execution context was destroyed". Write drafts in the scratchpad.

## 11. Finish

- `npm run build:npc` (new NPCs and maps), and tell the user the PubNub
  Function has to be pasted again.
- `docs/level-N.md`: getting there, the map table (area → hotspot → leads
  to), each mechanic, the boss (JSON, behaviour, levels, tuning table), test
  hooks. Link it from the level below's doc and from any doc you touched.
- Look at the screenshots from the smoke test (`--shots DIR`) for the new
  map, the boss and every pop-up.
- `docs/level-N.md`: a line on the level's adventures (how many, which
  rooms), and the output of `check-adventures.js N`.
- In the summary: what was built, how many adventures, the decisions made
  without asking (with the adventures' text among them, so the user can read
  them through for Louisa), and anything the user has to do.
