# The Third Camp, the poison moat and the Brick

Code: `src/features/level3/` (`level3.js` opening the passage and the poison
moat, `brick.js` the boss in its castle and in a fight, `draw-brick.js`
drawing it and the castle's great hall), `src/world/props/level3.js` (the new
rooms' props) and `tools/make-level3-map.js` (draws the map). Armor, which you
buy here, is in [armor-shop.md](armor-shop.md).
Maps: `assets/camp_level3.json` + `assets/camp_level3.svg`, and its rooms
`level3_castle.json` (the Brick's throne room), `level3_party.json`,
`level3_pool.json`, `level3_splash_pool.json`, `level3_boys_bathroom.json`,
`level3_girls_bathroom.json` and `armor_shop.json`.

## Getting there: the hole in the Marshmallows' lair

Beat Mega Mallow at its top level (`MALLOW_LEVEL_MAX`, 10) and the hole in the
middle of the Second Camp's Blob Fight Zone opens a secret passage
(`level3Open`, saved per camper; the win screen says so). It works like the
cave's passage to the Second Camp (see [level-two.md](level-two.md)): the
`blob_zone` hotspot has
```json
"passage": { "targetMap": "assets/camp_level3.json", "targetHotspot": "hole_back",
             "lock": "level3", "glow": { "x": 0.5, "y": 0.52 } }
```
A passage's `lock` names its check in `PASSAGE_LOCKS` (`level2.js`; default
`"level2"`), and `level3.js` adds `level3`. `passageOpen(obj)` asks it, and
the purple glow (`drawPassageGlow`, at `glow` in the hotspot box) is drawn on
every open passage. On the other side, `hole_back` (at the bottom of the
road) is a normal portal back to `blob_zone`, which has an `arrive` point
just below the hole.

Lose a fight to the Brick (or run away) and you're sent back to the Second
Camp's lair, and the passage shuts (`lockLevel3`) until you beat Mega Mallow
at level 10 again.

## The map

`assets/camp_level3.svg` is drawn by `node tools/make-level3-map.js`, from
Louisa's drawing, with the same marker pen as the `scene` rooms
(`scenePen`). It reads the hotspots and `poisonMoat` from
`camp_level3.json`, so the drawing follows them: move a hotspot, then re-run
the script. The castle and its bridge stand over the moat, so they're drawn
with a second pen on top (one pen draws every outline over every colour).
There are no words on the map, and the ground is grass all around the castle.

| Area (from the drawing) | Hotspot | Leads to |
|---|---|---|
| Birthday zone (top left): a party hall with the disco ball in its window | `party_hall` | `level3_party.json` (the disco ball, a dance floor, Disco Dolly the llama 🦙) |
| Girls' / boys' bathroom (next to it) | `girls_bathroom`, `boys_bathroom` | `level3_girls_bathroom.json`, `level3_boys_bathroom.json` |
| The castle (middle), on an island in the poison moat | `castle_door` | `level3_castle.json`, the Brick's throne room |
| Swimming pool with its slide (top right) | `pool_gate` (the ladder) | `level3_pool.json` (a water slide, Lily the frog 🐸) |
| Little pool with a slide (bottom left) | `splash_pool` | `level3_splash_pool.json` (Bubbles the whale 🐳) |
| The box (bottom right): a shopping square | `bank` (`"building": "bank"`), `armor_shop`, `fountain` | `camp_bank.json` (the same bank; its door goes back to the first camp), `armor_shop.json` |
| The road (bottom middle) | `hole_back` | the Second Camp's `blob_zone` |

The Third Camp is Level 3 (see [Levels](boss-fight.md#levels)): there's always
a 🗡️ Sword lying somewhere on it. The Brick Castle and Shelly's Armor Shop have
`"noSwordDrops": true`, so it's never dropped there.

## The poison moat

```json
"poisonMoat": {
  "outer":  { "cx": 0.47, "cy": 0.53, "rx": 0.24, "ry": 0.25 },   // the moat's outside edge
  "island": { "cx": 0.47, "cy": 0.52, "rx": 0.17, "ry": 0.17 },   // the castle's island (safe)
  "bridge": { "px": 0.447, "py": 0.635, "pw": 0.046, "ph": 0.155 },  // the bridge (safe)
  "seconds": 10,
  "sendTo": { "map": "assets/camp_level2.json", "hotspot": "blob_zone" }
}
```
Your feet are in the moat when they're inside `outer` but not on the island
or the bridge (`inPoisonMoat`). While you are, a toast warns you once, the
screen glows green, a countdown shows at the top (`drawMoatWarning`) and
bubbles fizz round your feet (`drawMoatBubbles`). Stay in for `seconds` (10)
in a row and you're sent back to the Second Camp (`updatePoisonMoat`).
Step out and the count starts over. It only counts while you're walking
around (not in a pop-up). Being sent back by the moat doesn't shut the
passage: you just walk back down the hole. The moat works in exploration
mode too: it isn't a boss.

## The Brick

The castle room has a `brick` object:
```json
"brick": {
  "home": "throne",                                         // hotspot it sits in front of
  "zone": { "px": 0.14, "py": 0.55, "pw": 0.84, "ph": 0.42 },  // the hall floor: it chases you in here
  "id": "brick", "name": "Brick Blaze", "aka": "Fire Eyes Brick", "label": "BRICK",
  "chase": 2.4, "sniff": 900, "grace": 2500, "pointsToWin": 10,
  "reward": { "$30 coin" }, "phrases": [], "hitPhrases": [], ...
}
```
**Brick Blaze** is a big red brick with fire burning out of its eyes and a hot
iron sword (`drawBrick`). It never leaves its castle: it sits on its throne,
and when you walk onto the hall floor (`zone`) it gets up and stomps after
you (`updateBrick`). Leave the hall and it goes back to its throne. If it
catches you, it's a fight; Space (or a tap) next to it picks the fight
yourself. You get `grace` ms when you come in, and it rests on its throne
for a while after a fight (`brick.restUntil`). With no sword (and no spare)
it wins straight away, like the Marshmallows. The fight is in the castle's
great hall (`drawCastleArena`).

Win → a $30 coin (or it waits by the throne if your backpack is full), and
`brickWins` goes up. Lose or run away → it eats the coins in your backpack
(the bank keeps the rest safe), and you're sent back to the Second Camp with
the passage shut (above).

### Levels and tuning

Levels carry on from the Marshmallows': the Brick is Level 11 to start with,
and one level tougher every time you beat it, up to 15 (`brickLevel`:
`BRICK_LEVEL_MIN + brickWins`, capped at `BRICK_LEVEL_MAX`). Its tuning moves
from `BRICK_TUNE_LOW` (level 11) to `BRICK_TUNE_TOP` (level 15)
(`brickTuning`; the settings are the Blob's, see
[boss-fight.md](boss-fight.md)). Compared with Mega Mallow it starts with
more strength and is tougher, blocks more and recovers faster.

Tuned with `tools/fight-sim.js` (600 fights each, plain sword, strength 10,
the "good" bot):

| Win % | no armor | 🥋 Vest | ⛓️ Chain | 🛡️ Knight | 💎 Crystal |
|---|---|---|---|---|---|
| Mega Mallow, level 10 (for comparison) | 38 | | | | |
| Brick, level 11 | 41 | 54 | 57 | 62 | 71 |
| Brick, level 13 | 34 | | | | |
| Brick, level 15 | 28 | | | | 63 |

With the Crystal Armor and the Rainbow Thunder Sword the good bot beats the
level 15 Brick 83% of the time; at strength 15 (desserts) and no armor it
beats level 11 75% of the time. Like the Marshmallows, it's very hard for the
"decent" bot (5% at level 11): this is the end of the game.

Test hooks: `brick.restUntil = Infinity` keeps it on its throne (the smoke
test's map crawl does this).
