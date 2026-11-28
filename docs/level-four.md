# The Fourth Camp: door codes, the Slime Brick, the throne key

Code: `src/features/level4/` (`level4.js` opening the trapdoor, the slime
pit, the throne key; `codes.js` the door codes, the
keypad and the code finder; `slime-brick.js` the boss on the map and in a
fight; `draw-slime-brick.js` drawing it, its den and the slime swamp arena;
`charlie-gear.js` the swords and armor only Charlie sells),
`src/world/props/level4.js` (the new rooms' props) and
`tools/make-level4-map.js` (draws the map).
Maps: `assets/camp_level4.json` + `assets/camp_level4.svg`, and its rooms
`level4_safe_zone.json`, `level4_shop.json` (Charlie's Armor & Swords),
`level4_throne.json`, `level4_pool.json`, `level4_boys_bathroom.json` and
`level4_girls_bathroom.json`.

## Getting there: the trapdoor in the Brick's castle

Beat the Brick at its top level (`BRICK_LEVEL_MAX`, 15) and the trapdoor in
the castle floor opens a secret passage (`level4Open`, saved per camper; the
win screen says so). It works like the other passages (see
[level-three.md](level-three.md)): the castle's `trapdoor` hotspot has
```json
"passage": { "targetMap": "assets/camp_level4.json", "targetHotspot": "passage_back",
             "lock": "level4", "glow": { "x": 0.5, "y": 0.45 } }
```
and `level4.js` adds `PASSAGE_LOCKS.level4`. Until it's open, Space at the
trapdoor just shows its pop-up. On the other side, `passage_back` is a normal
portal back up to the trapdoor. The trapdoor is on the hall floor, so the
Brick chases you there, but it rests on its throne for a while after you
beat it.

Lose a fight to the Slime Brick (or run away) and you're sent back to the
Third Camp, outside the castle (`slimeBrick.sendTo`), and the trapdoor shuts
(`lockLevel4`) until you beat the Brick at level 15 again.

## The map

`assets/camp_level4.svg` is drawn by `node tools/make-level4-map.js`, from
Louisa's drawing. It reads the hotspots, `slimePit` and the Slime Brick's
safe zone from `camp_level4.json`, so the drawing follows them: move a
hotspot, then re-run the script. The bank, the keypads by the doors and the
key on its hook are drawn by the game. There are no words on the map.

| Area (from the drawing) | Hotspot | Leads to |
|---|---|---|
| Swimming pool (top left), behind a fence | `pool_gate` | `level4_pool.json` (Splash the otter 🦦) |
| Slime Brick's slime pit (middle): rings of goo | `slime_pit` | (slows you down, below) |
| Bank (top right) | `bank` (`"building": "bank"`, `codeLock`) | `camp_bank.json`, the same bank |
| Safe Zone (left), with a fenced yard | `safe_zone` | `level4_safe_zone.json` (Beep the robot 🤖, the code finder) |
| Charlie's Armor & Swords (bottom left) | `charlie_shop` (`codeLock`) | `level4_shop.json` (Charlie the fox 🦊) |
| Bathroom (bottom middle): boys left, girls right | `boys_bathroom`, `girls_bathroom` (`codeLock`) | `level4_boys_bathroom.json`, `level4_girls_bathroom.json` |
| Slime Brick throne (right) | `throne` (`keyLock`), `key_hook` | `level4_throne.json` |
| Slime Brick den (bottom right) | `slime_den`: where the Slime Brick lives | |
| (not drawn) a tunnel between the pit and the throne | `passage_back` | the Brick's castle `trapdoor` |

The Fourth Camp is Level 4 (see [Levels](boss-fight.md#levels)): there's
always a 🗡️ Sword lying somewhere on it. Charlie's shop and the throne room
have `"noSwordDrops": true`.

### The slime pit

```json
"slimePit": { "cx": 0.51, "cy": 0.33, "rx": 0.135, "ry": 0.215, "slow": 0.45 }
```
While your feet are in that ellipse (`inSlimePit`) you walk at `slow` × your
speed, through `registerPlayerSpeed` (in `src/core/hooks.js`: `update()`
multiplies every registered factor into your speed). A toast says so the
first time, and goo splashes round your feet (`drawSlimeFeet`). The Slime
Brick isn't slowed: don't get caught in there.

## Door codes

Every building has a code: a portal hotspot with `"codeLock": "<lock id>"`
(`shop`, `bank`, `boys`, `girls`). Space there opens the keypad
(`#codePadModal`, state `CODE_PAD`) instead of the door. Type the 3
letters/numbers (any case) and **Open**: right, and the door swings open as
usual; wrong, and it buzzes and shakes. You type the code **every time** you
go in. The keypad sits at the top or the bottom of the screen, wherever you
aren't, so you can see the Slime Brick coming.

**The Slime Brick can still get you while you type.** It runs in
`CODE_PAD` as well as `PLAYING` (a `registerFrameUpdate`, not a map update),
the keypad says "⚠️ The Slime Brick is coming! HURRY!" while it's after you,
and if it catches you the keypad closes (`closeCodePad(true)`) and it's a
fight.

**Each camper has their own codes** (`doorCodes`, saved per camper; in
multiplayer per world + camper): 3 characters from `CODE_CHARS` (no 0/O or
1/I/L), made up the first time they're needed (`codeFor`). The same camper
keeps the same codes, so they can be written down.

**Getting the codes:** the Safe Zone's code finder. The `code_finder`
hotspot has a `codeKeeper` object:
```json
"codeKeeper": { "keeper": "Beep", "emoji": "🤖",
  "locks": [ { "id": "bank", "name": "the Camp Bank", "emoji": "🏦", "words": ["bank", "money"] } ] }
```
Space there opens `#codeKeeperModal` (state `CODE_KEEPER`), one button per
lock: "The code for the Camp Bank is W T H!". You can also talk to Beep
(**T**) and ask, e.g. "what's the code for the bank?": an NPC with
`"knowsCodes": true` answers from the same list, through
`registerNpcAnswer` (in `src/core/hooks.js`; `fetchNpcReply` asks it first,
so these never reach Claude). It only answers lines about getting in (a
"code", "door", "open"...), and names the doors it knows if you don't say
which; a lock's `words` pick it ("bathroom" gets both bathrooms).

The Safe Zone itself has no code (you need to get in to get the codes), and
the Slime Brick can't go into its fenced yard (below).

## The throne key

The throne has a key instead of a code: `"keyLock": { "itemId": "throne_key",
"hook": "key_hook" }`. The 🗝️ Throne Key hangs on the `key_hook` hotspot
outside the throne (an ordinary item, drawn swinging on its hook while it's
there: `drawHangingKeys`). Pick it up, take it to the throne's gate and press
Space: it unlocks **for good** (`throneUnlocked`, saved per camper), and you
hang the key back on its hook for the next camper. After that the gate just
opens. Without the key it says it's locked.

## The throne room, and the way to Level 5

`level4_throne.json`: the Slime Brick's gooey throne (the `slimeThrone`
prop), a treasure box, and a swirly portal under a "LEVEL 5" sign
(`level5_portal`). Beat the Slime Brick at Level 20 and the portal opens to
the Fifth Camp: see [level-five.md](level-five.md). Until then Space there
says it's shut.

## The Slime Brick

The map's `slimeBrick` object:
```json
"slimeBrick": {
  "lair": "slime_den",
  "safeZones": [ { "px": 0.012, "py": 0.29, "pw": 0.226, "ph": 0.225, "grumblePhrases": [] } ],
  "sendTo": { "map": "assets/camp_level3.json", "hotspot": "castle_door" },
  "id": "slime_brick", "name": "Slime Brick", "aka": "King of Goo", "label": "SLIME",
  "size": 1.2, "chase": 3.0, "wander": 1.8, "sniff": 620,
  "firstOut": [6000, 11000], "outFor": [40000, 60000], "restFor": [9000, 18000],
  "pointsToWin": 10, "reward": { "$40 coin" }, "phrases": [], "hitPhrases": [], ...
}
```
**The Slime Brick** is a wobbly green jelly brick with a crown, googly eyes
and a gooey sword (`drawSlimeBrick`). It lives in its den (goopy eyes peek
out while it's home, `drawSlimeDen`), comes out now and then, wanders the
whole camp and chases you when you're within `sniff`, like the Marshmallows
(see [level-two.md](level-two.md)). It can't go into the Safe Zone's yard
(`safeZones`), and grumbles at the fence instead. You get a few seconds'
grace when you arrive and after a fight. `chase` (3.0) is slower than you
walk (4), but faster than you in the slime pit, and you stand still while
you type a code. Space (or a tap) next to it picks a fight. With no sword (and
no spare) it wins straight away. Each camper's computer runs its own Slime
Brick, also in a multiplayer world. The fight is in a slime swamp
(`drawSlimeArena`).

Win → a $40 coin (Level 4 × $10; or it waits at the den if your backpack is full), and
`slimeWins` goes up. Lose or run away → it eats the coins in your backpack,
and you're sent back to the Third Camp with the trapdoor shut (above).

Test hooks: `slime.restUntil = Infinity` keeps it in its den (the smoke
test's map crawl does this).

### Levels and tuning

Levels carry on from the Brick's: the Slime Brick is Level 16 to start with,
and one level tougher every time you beat it, up to 20 (`slimeLevel`:
`SLIME_LEVEL_MIN + slimeWins`, capped at `SLIME_LEVEL_MAX`). Its tuning moves
from `SLIME_TUNE_LOW` to `SLIME_TUNE_TOP` (`slimeTuning`).

Tuned with `tools/fight-sim.js` (300 fights each, strength 10, the "good"
bot unless it says otherwise), e.g.
`simMany(slimeTuning(16), 'good', 300, 10, { sword: 'star', armor: 'star' })`:

| Win % | plain sword | 🌈 Rainbow | ☄️ Comet | ⭐ Star Sword | 🌋 Lava |
|---|---|---|---|---|---|
| Brick, level 15 (for comparison) | 27 | | | | |
| Slime Brick, level 16 | 30 | 59 | 43 | 70 | 84 |
| Slime Brick, level 18 | 22 | | | | |
| Slime Brick, level 20 | 18 | | | | |

| Win %, level 16, plain sword | no armor | 💎 Crystal | 🐉 Dragon Scale | 🌟 Star Armor |
|---|---|---|---|---|
| | 30 | 57–64 | 57–61 | 68 |

With the ⭐ Star Sword and 🌟 Star Armor ($300 together) the good bot wins
91% at level 16 and 89% at level 20; the "decent" bot 53% at level 16 (2%
with a plain sword and no armor). This is the end of the game so far.

## Charlie's Armor & Swords

Charlie the fox 🦊 sells **both**: the shop has a sword counter (a
`swordShop` hotspot) and an armor counter (an `armorShop` hotspot), with the
same pop-ups as Ember's and Shelly's shops (see [sword-shop.md](sword-shop.md)
and [armor-shop.md](armor-shop.md)). A shop counter can now say what it
sells and what its keeper says:
```json
"swordShop": { "keeper": "Charlie", "emoji": "🦊", "sells": "all",
               "greeting": "Hey hey, {name}! ...", "cheer": "Go show that Slime Brick who's boss! ⭐" }
```
`sells` is a list of ids or `"all"`; without it a shop sells every kind that
isn't `exclusive` (`swordsForSale` / `armorForSale`). The Fourth Camp's own
kinds are `exclusive`, so only Charlie has them (`charlie-gear.js`, added to
`SHOP_SWORDS` / `SWORD_KINDS` and `ARMOR_KINDS`):

| | Price | Lasts | What it does |
|---|---|---|---|
| ☄️ Comet Sword | $90 | 300 | swings and recovers fast (`speed` 1.25), freezes the boss longer (`stun` 1.7), lands a bit more |
| ⭐ Star Sword | $150 | 400 | the best all-rounder: `land` +0.05, `power` 1.5, `reach` +25, `pierce` 0.25, blocks better |
| 🐉 Dragon Scale Armor | $130 | 420 | stops 22% of hits, and lasts about 6 fights |
| 🌟 Star Armor | $150 | 300 | stops 29% of hits, the most of any armor |

Plus every sword from Ember's shop and every armor from Shelly's.
