# The Fifth Camp: the lava river, the Moon, shields

Code: `src/features/level5/` (`level5.js` opening the portal, the lava river
and hopping across it; `moon.js` the boss on the map and in a fight, its
freeze and the U cheat; `draw-moon.js` drawing it, its crater, the night-sky
arena and the ice block; `shields.js` the new kind of gear; `shield-shop.js`
Charlie's shield counter; `charlie-gear.js` the sword and armor only sold
here), `src/world/props/level5.js` (the new rooms' props) and
`tools/make-level5-map.js` (draws the map).
Maps: `assets/camp_level5.json` + `assets/camp_level5.svg`, and its rooms
`level5_safe_zone.json` (Bolt the robot, the codes), `level5_shop.json`
(Charlie's Swords, Armor & Shields), `level5_palace.json` (the Moon's
Palace, with the way to Level 6), `level5_boys_bathroom.json` and
`level5_girls_bathroom.json`.

## Getting there: the portal in the Slime Brick's throne room

Beat the Slime Brick at its top level (`SLIME_LEVEL_MAX`, 20) and the swirly
portal in its throne room (`level4_throne.json`, `level5_portal`; it used to
say "coming soon") opens (`level5Open`, saved per camper; the win screen says
so). It works like the other passages (see [level-three.md](level-three.md)):
```json
"passage": { "targetMap": "assets/camp_level5.json", "targetHotspot": "passage_back",
             "lock": "level5", "glow": { "x": 0.5, "y": 0.55 } }
```
and `level5.js` adds `PASSAGE_LOCKS.level5`. Until it's open, Space there
just says it's shut. On the other side, `passage_back` (a ring of stones with
a swirl in it) is a normal portal back to the throne room.

Lose a fight to the Moon (or run away) and you're sent back to the Fourth
Camp, outside the throne (`moon.sendTo`), and the portal shuts
(`lockLevel5`) until you beat the Slime Brick at level 20 again.

## The map

`assets/camp_level5.svg` is drawn by `node tools/make-level5-map.js`, from
Louisa's drawing (turned on its side to fit the screen). It reads the
hotspots, the lava (`lavaRiver`: pools and rocks) and the Moon's safe zone
from `camp_level5.json`, so the drawing follows them: move something, then
re-run the script. The keypads by the doors are drawn by the game. There are
no words on the map.

| Area (from the drawing) | Hotspot | Leads to |
|---|---|---|
| The lava river (middle), full of rocks | (no hotspot: `lavaRiver`) | hop across with J, below |
| Charlie's shop (top) | `charlie_shop` (`codeLock`) | `level5_shop.json` (Charlie the fox 🦊, `charlie_l5`) |
| Moon's Palace (top right) | `moon_palace` (`codeLock`) | `level5_palace.json` |
| The fighting place, in front of the palace (the "fighting RaRR place") | `moon_crater`: where the Moon lives | |
| Bathrooms (left): boys and girls | `boys_bathroom`, `girls_bathroom` (`codeLock`) | `level5_boys_bathroom.json`, `level5_girls_bathroom.json` |
| Safe Zone (bottom left), with a fenced yard | `safe_zone` | `level5_safe_zone.json` (Bolt the robot 🤖, the code finder) |
| The ovals along the bottom: a second lava pool | `hot_rock` (the treasure rock in the middle) | |
| (not drawn) the marshmallow roasting rock by the river | `roast_spot` | |
| (not drawn) the star lookout and the moon garden, top left | `star_lookout`, `glow_garden` | |
| (not drawn) a ring of stones by the Safe Zone | `passage_back` | the throne room's portal |

You arrive on the Safe Zone's side of the river. Charlie's shop and the
Moon's Palace are on the other side, so you have to cross the lava to get to
them. The Fifth Camp is Level 5 (see [Levels](boss-fight.md#levels)): there's
always a 🗡️ Sword lying somewhere on it. Charlie's shop and the palace have
`"noSwordDrops": true`.

## The lava river: hop from rock to rock

```json
"lavaRiver": {
  "pools": [ { "name": "river", "points": [[x, y], ...] }, { "name": "pool", "points": [...] } ],
  "rocks": [ { "cx": 0.31, "cy": 0.491, "r": 0.025 }, ... ],
  "hop": 0.1, "seconds": 3,
  "sendTo": { "map": "assets/level4_throne.json", "hotspot": "level5_portal" }
}
```
`pools` are polygons (0–1 of the map); `rocks` are circles (`r` is 0–1 of
the map's width; drawn a bit squashed). Your feet are in the lava when
they're over a pool and not on a rock (`inLava`).

**Hopping.** Press **J** to hop to the next rock, the way you're walking
(`hopTarget`: the nearest rock within `hop` of you, within about 70° of the
direction you last moved, or the bank across the lava straight ahead). You
fly there in an arc (`LAVA_HOP_MS`), with a shadow under you, and you can't
walk while you're in the air (`registerPlayerSpeed`). A dashed ring shows
where J would take you while you're on a rock. You can't fall in mid-hop.
On a touch screen, **tap a rock** you can reach to hop onto it, or use the
**JUMP** button that shows up near the lava. J is still the journal anywhere
else: it only hops on a map with `lavaRiver` when there's a rock or lava
near you (`registerPlayingKey` in `src/core/hooks.js`, checked first in
`playingKey`; taps through `registerPlayingTap`).

The bank-side rocks touch the bank, so you can walk onto the first one. The
first time you stand on a rock, a toast explains how to hop
(`lavaHopHinted`, saved per camper).

**Touching the lava.** Walk off a rock (or into the river) and a toast warns
you, the screen glows red, a countdown shows at the top (`drawLavaWarning`)
and sparks fly round your feet. Stay in for `seconds` (3) in a row and you're
sent back to the Fourth Camp's throne room, next to the portal
(`updateLava`). Step out and the count starts over. Like the poison moat,
this doesn't shut the portal, and it works in exploration mode too.

## Door codes and Bolt the robot

The doors work like the Fourth Camp's (see [level-four.md](level-four.md#door-codes)),
with their own lock ids: `l5_shop`, `moon_palace`, `l5_boys`, `l5_girls`.
Bolt the robot 🤖 in the Safe Zone is the code finder (its `codeKeeper` lists
those four locks, with its own `greeting`, `hurry` and `beep` lines), and you can
ask Bolt by typing too (`"knowsCodes": true`). The keypad warns you when the
Moon is coming (each roaming boss adds a check to `CODE_PAD_DANGERS` in
`codes.js`), and the Moon can catch you while you type.

## Charlie's Swords, Armor & Shields

Charlie the fox runs this shop too (a separate NPC, `charlie_l5`, as NPC ids
are unique). It has three counters: swords (`swordShop`, `"sells": "all"`),
**shields** (`shieldShop`) and armor (`armorShop`, `"sells": "all"`). The
Fourth Camp's counters now list what they sell, so the Fifth Camp's own gear
is only sold here (`charlie-gear.js`):

| | Price | Lasts | What it does |
|---|---|---|---|
| ☀️ Sun Sword | $180 | 450 | the best sword: `land` +0.07, `power` 1.6, `reach` +30, `speed` 1.1, `pierce` 0.35, `stun` 1.2, blocks better |
| 🖤 Obsidian Armor | $180 | 380 | stops 32% of hits, the most of any armor |

### Shields

A shield is a new kind of gear (`shields.js`): you carry one as well as
your sword and armor (`shieldKind`, `shieldRating`, saved per camper). It
makes your blocks (hold **B**) hold more often: its `guard` is added to the
odds a block holds, through `registerPlayerGuardBonus` (in
`src/core/hooks.js`, used by `guardOdds`). The better ones also **bounce**
the boss back when a block holds ("BOING!"): it staggers back, stunned for a
moment, so you can get a hit in. That listens for the `fightBlocked` game
event (emitted by `resolveHit` whenever a swing meets a block). A shield
wears `SHIELD_BLOCK_WEAR` for each swing it blocks (more if the block
breaks), and at 0 it's done. You see it on your arm in a fight (held up
while you block), as a bar under your armor's, and in the map HUD.

| | Price | Lasts | Block bonus | Bounce |
|---|---|---|---|---|
| 🪵 Wooden Shield | $40 | 150 | +0.10 | |
| 🔥 Lava Rock Shield | $80 | 220 | +0.14 | 30% |
| ⭐ Star Shield | $120 | 260 | +0.18 | 50% |

Buy them at the shield counter (`#shieldShopModal`, state `SHIELD_SHOP`),
which works like the armor shop: coins from your backpack, change in $10
coins, and a new shield replaces the old one.

## The Moon

The map's `moon` object:
```json
"moon": {
  "lair": "moon_crater",
  "safeZones": [ { "px": 0.012, "py": 0.7, "pw": 0.215, "ph": 0.29, "grumblePhrases": [] } ],
  "sendTo": { "map": "assets/camp_level4.json", "hotspot": "throne" },
  "id": "moon", "name": "Moon", "aka": "Frosty Night Moon", "label": "MOON",
  "size": 1.25, "chase": 3.1, "wander": 1.9, "sniff": 640,
  "firstOut": [6000, 11000], "outFor": [40000, 60000], "restFor": [9000, 18000],
  "freeze": { "misses": 3, "ms": 3000, "cheatKey": "u", "cheatMs": 5000 },
  "pointsToWin": 10, "reward": { "$50 coin" }, "phrases": [], "freezePhrases": [], "cheatPhrases": [], ...
}
```
**The Moon** is a big glowing full moon with craters, a grumpy face, little
fists and an icicle sword (`drawMoon`). It sleeps in its crater, the
fighting place in front of its palace (its sleepy top peeks out,
`drawMoonCrater`), comes out now and then, and floats all over the camp,
over the lava too, chasing you when it sees you, like the Slime Brick (see
[level-four.md](level-four.md#the-slime-brick)). It can't go into the Safe
Zone's yard (`safeZones`). Space (or a tap) next to it picks a fight. With no
sword (and no spare) it wins straight away. Each camper's computer runs its
own Moon. The fight is on the crater floor under a starry sky
(`drawMoonArena`).

Win → a $50 coin (Level 5 × $10; or it waits in the crater if your backpack
is full), and `moonWins` goes up. Lose or run away → it eats the coins in
your backpack, and you're sent back to the Fourth Camp with the portal shut.

### The freeze, and the secret U

Swing and miss `freeze.misses` (3) times **in a row** (dodged, blocked, a
CLANG on a glowing wind-up, or too far away) and the Moon freezes you solid
for `freeze.ms` (3 seconds): you're in a block of ice with a countdown, and
can't move, swing or block ("FROZEN! 🥶"). A hit doesn't thaw you. Little ❄️
over your head count the misses so far; a hit that lands clears them
(`moonFreezeUpdate`, the foe's `update`, run by `updateFight` every frame).

**The cheat code:** press **U** during the fight's intro, or in the first
`cheatMs` (5 s) after FIGHT!, and the Moon can't freeze you for the whole
fight ("🙈 MOON-PROOF!", `moonCheatKey`, the foe's `onKey`, asked by
`handleFightKey`). It's a secret: nothing in the game says so.

How freezing works in the shared fight code: a fighter with act `'frozen'`
is busy (`fightBusy`) until `frozenUntil`. A foe can have `update(f, now,
dt)` and `onKey(f, e)` (see `blobFoe` in `fight.js`).

Test hooks: `moon.restUntil = Infinity` keeps it in its crater (the smoke
test's map crawl does this).

### Levels and tuning

Levels carry on from the Slime Brick's: the Moon is Level 21 to start with,
and one level tougher every time you beat it, up to 25 (`moonLevel`:
`MOON_LEVEL_MIN + moonWins`, capped at `MOON_LEVEL_MAX`). Its tuning moves
from `MOON_TUNE_LOW` to `MOON_TUNE_TOP` (`moonTuning`). The freeze is most of
what makes it hard, so its own numbers are gentler than the Slime Brick's
(it hardly ever blocks: blocks would count as misses and freeze you all the
time).

Tuned with `tools/fight-sim.js` (`{ moon: true }` adds the freeze; `{ moon:
'proof' }` is the U cheat; `{ shield }` a shield), 200–300 fights each, strength
10, the "good" bot unless it says otherwise, e.g.
`simMany(moonTuning(21), 'good', 300, 10, { moon: true, sword: 'sun', armor: 'obsidian', shield: 'star' })`:

| Win % | plain sword | 🌈 Rainbow | ☄️ Comet | ⭐ Star Sword | ☀️ Sun Sword | 🌋 Lava |
|---|---|---|---|---|---|---|
| Slime Brick, level 20 (for comparison) | 18 | | | | | |
| Moon, level 21 | 28 | 55 | 39 | 58 | 73 | 81 |
| Moon, level 21, pressed U | 62 | | | | | |
| Moon, level 23 | 19 | | | | | |
| Moon, level 25 | 16 | | | | | |

| Win %, level 21, plain sword | nothing | 🌟 Star Armor | 🖤 Obsidian | 🪵 Wooden Shield | 🔥 Lava Rock | ⭐ Star Shield |
|---|---|---|---|---|---|---|
| | 28 | 54 | 55 | 31 | 29 | 33 |

Shields don't change much against the Moon (the good bot's blocks already
hold 83% of the time, and the freeze is what beats it); against the Slime
Brick at level 16 they lift the good bot from 30% to 40% (wooden) and 41%
(star). With the ☀️ Sun Sword, 🖤 Obsidian Armor and ⭐ Star Shield ($480
together) the good bot wins 95% at level 21 and 87% at level 25; the
"decent" bot 81% at level 21 (98% if it presses U), and 5% with a plain
sword and nothing else. The 🌋 Lava Sword (1 swing in 5 lands, but one hit
wins) does well against the Moon: you only miss 3 times in a row about half
the time before landing one. This is the end of the game so far.

## The Moon's Palace, and Level 6 (coming soon)

`level5_palace.json`: the Moon's crescent throne (the `moonThrone` prop), a
starry window (`starrySky`), a box of Moon Cheese, a star lantern, and a
swirly portal with a "LEVEL 6 · COMING SOON!" sign. Its hotspot has
`"comingSoon": true` (see [level-four.md](level-four.md)): when Level 6 is
built, give it a `passage` with a new `lock` instead.

## Adventures

56 adventures done with the Fifth Camp's own items (see [items.md](items.md)):
16 out at the camp (the roasting rock, the treasure rock, the star lookout,
the moon garden), 9 in the palace, 10 in Charlie's shop, 7 in the Safe Zone
and 7 in each bathroom. The camp's items are `roasting_stick`, `fire_orb`,
`telescope`, `moonflower`, `oil_can`, `star_blanket`, `cookie_l5`,
`juice_box_l5`, `moon_cheese`, `star_lantern`, `shield_sponge`, and the
bathrooms' `_l5` items. `node .claude/skills/build-level/scripts/check-adventures.js 5`:
```
  camp_level5.json              16 own
  level5_palace.json             9 own
  level5_shop.json              10 own
  level5_safe_zone.json          7 own
  level5_girls_bathroom.json     7 own, 17 bonus
  level5_boys_bathroom.json      7 own, 17 bonus
  total: 56 with this level's items, 34 bonus (items from other levels)
✓ adventures look fine
```
