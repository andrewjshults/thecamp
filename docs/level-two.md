# The Second Camp and the Marshmallows

Code: `src/features/level2/` (`level2.js` opening the cave's secret passage,
`mallows.js` the two bosses on the map and in a fight, `draw-mallow.js`
drawing them, their lair and the campfire arena), `src/world/props/level2.js`
(the new rooms' props) and `tools/make-level2-map.js` (draws the map).
Maps: `assets/camp_level2.json` + `assets/camp_level2.svg`, and its rooms
`level2_tent.json`, `level2_party.json`, `level2_pool.json`,
`level2_kitchen.json`, `level2_boys_bathroom.json`,
`level2_girls_bathroom.json` and `sword_shop.json` (see
[sword-shop.md](sword-shop.md)).

## Getting there: the secret passage

Beat the Blob while it's at its top level (`BOSS_LEVEL_MAX`, 5) and the cave
on the main map opens a secret passage (`level2Open`, saved per camper; the
win screen says so). While it's open, Space at the cave goes through it
instead of knocking for the Blob, and a purple glow swirls in the cave's
mouth (`drawPassageGlow`). The cave hotspot says where it leads:
```json
"passage": { "targetMap": "assets/camp_level2.json", "targetHotspot": "cave_exit" }
```
The map crawls (`hotspotLinks` in `src/world/maps.js`, `mpLoadAllMaps`, the
smoke test) follow a `passage` like a portal. It goes through `switchMap`, so
your sidekick comes along. On the other side, `cave_exit` is a normal portal
back to the main map's cave (which has an `arrive` point just below it).

Lose a fight on the Second Camp (or run away) and you're sent back to the
main map's cave, and the passage shuts (`lockLevel2`) until you beat the
Blob again.

## The map

`assets/camp_level2.svg` is drawn by `node tools/make-level2-map.js`, from
Louisa's drawing, with the same marker pen as the `scene` rooms
(`scenePen`). There are no words on the map. Re-run the script after
changing it. The hotspots in `camp_level2.json` are placed over it by hand,
so move them together. An `.svg` map image is rasterised once when it loads
(`loadMapImage`), like a `scene`.

| Area (from the drawing) | Hotspot | Leads to |
|---|---|---|
| Sleeping tents (top left) | `tent_red`, `tent_blue`, `tent_green` | `level2_tent.json` (the big green tent) |
| Swimming pool (top right) | `pool_gate` (the ladder), `boat` | `level2_pool.json` |
| Blob Fight Zone (middle) | `blob_zone`: the Marshmallows' lair | |
| Birthday zone (bottom left) | `disco_ball`, `cake_table`, `party_tent` | `level2_party.json` |
| Kitchen (bottom middle) | `kitchen` | `level2_kitchen.json` (a copy of the Camp Kitchen) |
| Boys' / girls' bathroom (right) | `boys_bathroom`, `girls_bathroom` | `level2_boys_bathroom.json`, `level2_girls_bathroom.json` |
| (not drawn) Cave back | `cave_exit` | the main map's `cave` |
| (not drawn) Bank, on the pool deck | `bank` (`"building": "bank"`) | `camp_bank.json`, the same bank; its door goes back to the first camp |
| (not drawn) Sword shop, on the pool deck | `sword_shop` | `sword_shop.json` |

The rooms come back out to their hotspot here. The map and its rooms
have `"noSwordDrops": true`: a new 🗡️ Sword is never dropped on the Second
Camp (it isn't always open), so a worn-out sword means a trip back to the first
camp, or a visit to the sword shop.

## The Marshmallows

The map's `marshmallows` object:
```json
"marshmallows": {
  "lair": "blob_zone",                                  // hotspot they live in
  "safeZones": [                                        // they can't go in these
    { "px": 0, "py": 0, "pw": 0.305, "ph": 0.475 },     // the sleeping tents
    { "px": 0.489, "py": 0.015, "pw": 0.492, "ph": 0.33,  // the swimming pool
      "grumblePhrases": [] } ],                          // optional, instead of the foe's
  "foes": [ { "id": "mega_mallow", "name": "Mega Mallow", "aka": "Fire Eyes", "label": "MEGA",
              "size": 1.05, "chase": 2.9, "wander": 1.7, "sniff": 520,
              "firstOut": [5000, 10000], "outFor": [35000, 55000], "restFor": [10000, 22000],
              "pointsToWin": 10, "reward": { "$20 coin" },
              "phrases": [], "hitPhrases": [], "hurtPhrases": [], "missPhrases": [], "dodgePhrases": [],
              "grumblePhrases": [], "winPhrases": [], "fledPhrases": [] },
            { "id": "mini_mallow", "name": "Mini Mallow", "kid": true, "size": 0.68, "chase": 3.5, ... } ]
}
```
Two of them, **Mega Mallow** (a big marshmallow with fire burning out of its
eyes, `drawMallow`) and its kid **Mini Mallow** (smaller, with a flame tuft).
Both come out of the hole in the middle of the Blob Fight Zone (fire eyes
glow in it while they're home, `drawMallowLair`), wander, and chase you when
you're within `sniff`. `chase` / `wander` are map px per frame (you walk at
4): the kid is faster than its parent but still slower than you. Neither can
go into a `safeZones` area, the sleeping tents or the swimming pool
(`outOfSafeZone` pushes them back out, never through a side at the edge of
the map), and they don't chase you while you're in one; they grumble at the
edge instead (the zone's own `grumblePhrases` if it has them, like the pool's,
else the foe's). A single `safeZone` object still works too. You get a
few seconds' grace when you arrive and after every fight
(`mallows.graceUntil`).

**They fight even if you have no sword.** If one catches you without a sword
(and no spare), you lose straight away: the fight opens on the result screen
(`foe.begin`). You can't pick a fight with Space without a sword; the hint
says to run. Each camper's computer runs its own Marshmallows, also in a
multiplayer world (friends don't see yours).

Win → `reward` (Mega: a $20 coin, Mini: a $10 coin) in the backpack (or at
the lair if it's full), and beating Mega Mallow adds to `mallowWins`. Lose or
run away → it eats the coins in your backpack (the bank keeps the rest
safe), and you're sent back to the first camp (above).

### Levels and tuning

Levels carry on from the Blob's: Mega Mallow is Level 6 to start with, and
one level tougher every time you beat it, up to 10 (`mallowLevel`:
`MALLOW_LEVEL_MIN + mallowWins`, capped at `MALLOW_LEVEL_MAX`). Its tuning
moves from `MALLOW_TUNE_LOW` (level 6) to `MALLOW_TUNE_TOP` (level 10)
(`mallowTuning`; the settings are the Blob's, see
[boss-fight.md](boss-fight.md)). Mini Mallow is the same level but weaker and
faster (`kidTuning`: 2 less strength, less blocking, armor and toughness;
quicker walking, thinking and wind-ups), and needs only 8 points to win.

Tuned with `tools/fight-sim.js` (600 fights each). The "good" bot is the
closest to Louisa, who usually beats the level 5 Blob:

| Win % (plain sword, strength 10) | casual | decent | good |
|---|---|---|---|
| Blob, level 5 (for comparison) | 50 | 44 | 69 |
| Mega Mallow, level 6 | 18 | 15 | 58 |
| Mega Mallow, level 8 | 11 | 9 | 50 |
| Mega Mallow, level 10 | 6 | 5 | 37 |
| Mini Mallow, level 6 | 47 | 44 | 74 |
| Mini Mallow, level 10 | 27 | 29 | 55 |

A better sword (see [sword-shop.md](sword-shop.md)) or dessert strength
helps a lot: the good bot beats level 10 Mega Mallow 68% of the time with the
Rainbow Thunder Sword, and 70% at strength 15.

What the tuning showed:
- `counter` (× the wind-up before it hits back after you've been blocked)
  is the strongest dial. Below 1 the counter comes so fast that players who
  swing a lot interrupt it, so it got *easier* (the decent bot went from 20%
  to 43%). Above 1 it gets very hard very quickly (good bot 17% at 1.2).
  It goes from 0.93 (level 6) to 0.98 (level 10).
- As with the Blob, a shorter `think` or `windup` and more starting strength
  help players who swing a lot, so they barely change between levels; the
  difficulty comes from `block`, `armor`, `tough` and `regen`.
