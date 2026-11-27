# Boss fight: the Glug Glub Blob, strength and swords

Code: `src/features/boss/` (`boss.js` basics, `map-boss.js` the Blob roaming
the map, `cave.js`, `draw-blob.js`, `fight.js` starting a fight and tuning,
`fight-moves.js` the duel, `fight-sidekick.js`, `fight-draw.js`),
`src/features/sword.js`, `src/mp/boss-sync.js`, and `tools/fight-sim.js`.

The Third Camp's Brick uses it too (see [level-three.md](level-three.md)), and
armor can stop a boss's hit ([armor-shop.md](armor-shop.md)).
The Second Camp's bosses, the Marshmallows, use the same fight: see
[level-two.md](level-two.md).

**Who you fight is a foe** (`blobFoe()` for the Blob; `mallowFoe` in
`src/features/level2/mallows.js`): `{ id, def, level, tune, label, intro,
draw, arena, finish, end, after, begin }`, explained above `blobFoe` in
`fight.js`. `startFight(foe)` (no foe: the Blob), `finishFight` calls
`foe.finish` for the prize or penalty (`giveFightReward`,
`gobbleBackpackCoins`) and then emits the `fightOver` game event, and
`endFight` calls `foe.end` / `foe.after`. `bossEngage` (`{ start, foe }`)
holds the moment before the fight view opens, and is called off if you leave
the map (`mapLeave`). The Blob is hooked onto the map with `registerMapFoe`
and `registerMapPeople`.

The main map has a `boss` object and a `cave` hotspot (top-right corner). The
cave is drawn over the map in code (`drawBossCave`), and the Blob (human head,
fox body, sword in its tail — `drawBlob`) lives there. It comes out at random
to roam, chases you when you're close, and starts a fight if it catches you.
You can also press Space at the cave or next to it (or tap it). After a fight
it stays in its cave for a while (`bossRestMs`): 30–60s when it was beaten,
30–50s otherwise.
```json
"boss": {
  "name": "Glug Glub Blob", "aka": "I Eat You Blob",
  "cave": "cave",                  // hotspot id it lives in
  "pointsToWin": 10,
  "phrases":     ["EAT!", "nom nom you!", ...],   // shouted before every attack
  "hitPhrases":  [...],            // when it lands a hit
  "hurtPhrases": [...],            // when it gets hit
  "dodgePhrases": [...],           // when your swing is too weak to land
  "missPhrases":  [...],           // when its swing is too weak to land
  "strength": 10,                  // optional, the Blob's starting strength
  "reward": { "id": "ten_dollar_coin", "name": "$10 Coin", "emoji": "🪙", "coin": true, "value": 10 }
}
```
The fight view (`GameState.FIGHTING`) is a side-on duel: ← → move, ↑ jump,
Space attack, hold B to block, Esc runs away (counts as a loss). Touch devices
get on-screen buttons. Each unblocked hit scores 1 point. The Blob always
shouts a phrase while it winds up, and that's your cue to block, back off or
jump. It sometimes blocks, more often if you mash, and after blocking it
counter-attacks with a wind-up you can't interrupt. Win → `reward` goes in the
backpack (or at the cave if the backpack is full). Lose → every coin item
(`coin: true` or an id containing "coin") is taken from the backpack.

**Your sidekick fights with you.** If you have a sidekick, they're in the fight
(`fight.s`, `sidekickAI`). They stand in a lane just behind you (drawn a little
smaller and higher, `SIDEKICK_LANE`), a step back from you
(`SIDEKICK_BEHIND`). Every `SIDEKICK_SWING_GAP_MS` they run in and swing their
own sword, then step back. Their hits count toward *your* score (and the Blob
can block them and counter-attack you). When the Blob winds up, they put their
sword up `SIDEKICK_BLOCK_CHANCE` of the time. **A block guards you both**: while
the sidekick blocks within `SIDEKICK_GUARD` of you, the Blob's swing at you
hits their guard instead (`resolveHit`), and a big shared shield is drawn in
front of you both whenever either of you blocks (`drawTeamGuard`). The Blob
only ever attacks you, so the sidekick can't be hurt and has no strength bar.
They use the sidekick's own sword, so your sword doesn't wear when they swing.
When the fight ends (won, lost or ran away) they stop being your sidekick and
walk home. Sim results (decent bot, level 5 Blob): 45% alone, 69% with a
sidekick. Their swings were worth about +25 points and their blocks about +15
before tuning, so both were cut back.

**Strength — same rules for you and the Blob.** You start every fight at
`STRENGTH_BASE` (10) + `strengthBoost` from desserts (kept between fights); the
Blob starts at `boss.strength` (default 10). Each hit taken costs 1, and each
fighter gets 1 back every `STRENGTH_REGEN_MS` (8s) up to where they started.
A 💪 bar sits under each name plate, with a thin line filling toward the next
+1. Strength sets how fast a fighter walks and swings (`strengthSpeed`: 0.55×
at 0, normal at 10, 1.45× at 20; for the Blob that's its wind-up, lunge and
recovery too) and the odds that an unblocked swing lands or a block holds
(`strengthOdds`: 30% at 0, 83% at 10, 96% at 20). A miss shows "DODGED!" /
"YOU DODGED!", a failed block "BLOCK BROKEN!". Regen was tuned with simulated
fights: they last ~20–30s, so 15s regen gave back only ~1 point, 8s gives 2–3,
and 5s or faster cancels most of the damage.

**The Blob gets tougher every time you beat it.** Each win adds to
`bossWins` (saved per camper), and the Blob's level is
`min(bossWins, BOSS_LEVEL_MAX)`, so it tops out at 5. A fight's `tune` holds
these settings (`BOSS_TUNE_BASE` is the original Blob): `strength` (added),
`block` (added block chance), `armor` (chance a normal wind-up can't be
interrupted — your swing CLANGs, and the Blob glows red-orange), `windup` and
`think` (× its wind-up and pauses), `tough` (chance a hit costs it no
strength), `regen` (× its time to get strength back) and `speed` (× walking).
Level L is `BOSS_TUNE_BASE` moved L/5 of the way to `BOSS_TUNE_TOP`
(`bossTuning`). The level shows in the fight intro, on the Blob's name plate,
on its map label ("Lv 3") and on the win screen.

Tuned with `tools/fight-sim.js`. Paste it into the console during a single
player game, then e.g. `simMany(bossTuning(3), 'decent', 300)`. It runs
instant fights on a fake clock against casual / decent / good bots. Results:
the decent bot wins 100% at level 0, then 98, 96, 85, 62 and 42% at level 5.
The good bot wins 67% at level 5, and desserts help a lot (decent at strength
20: 88%). Lessons: attacking more often or sooner made the Blob *easier*,
because your hits interrupt its wind-ups. What actually works is blocking more,
starting stronger, and armored wind-ups paired with shorter wind-ups. Use
`bossTuneOverride` to force a tuning in tests.

**Kinds of sword.** `SWORD_KINDS` in `sword.js`: the plain 🗡️ Sword, plus
the four from Ember's Sword Shop (see [sword-shop.md](sword-shop.md)).
`swordKind` (saved) is the one you hold, `swordMax()` its rating when new and
`swordStats()` what it does in a fight (reach, landing and blocking odds,
swing speed, power, stun, smashing through armor).

**Your sword wears out.** You fight with a sword rated 0–100 (`swordRating`,
saved per camper; older saves start at 100). Each swing costs
`SWORD_SWING_WEAR` (1). A swing that touches the Blob or its sword costs
`SWORD_HIT_WEAR` (4) more: a hit, a blocked swing, or a CLANG on its
counter-attack, but not a dodge. At 0 it shows "SWORD WORN OUT!" and still
works until the fight ends. Then you need to find a 🗡️ Sword item
(`SWORD_ITEM`). There's always at least one lying somewhere on **every
level** (see Levels below). `checkSwordSoon` drops one on each level that has
none when a game starts or a world finishes syncing (`swordOnEveryLevel`).
Picking one up drops another at a random spot on the **same level**, on a
different map of that level when possible (`findOrDropSword(avoid, level)` →
`dropSword`). These follow portals from the main map and skip portals,
passages, kitchen stations, the cave and maps with `"noSwordDrops": true` (the
shops, the Brick's castle). In multiplayer the camper who picked it up drops
the replacement as a normal `drop`. Every 15s a check drops one on any level
that has none left (in multiplayer only the lowest player id checks, and only
after two misses in a row on that level). Picking a sword up re-arms you at
100 (`onSwordPickedUp`). Items at hotspots are normally only listed in the
hotspot's pop-up, so a sword lying at one is also drawn on the map, bobbing and
glowing (`drawLyingSwords`). A
sword picked up while yours still works stays in the backpack as a spare, and
it's used automatically when yours wears out. Until you have a sword, the Blob
won't chase you or start a fight by catching you. Pressing Space at the cave or
the Blob says which map to search, using the map's `where` phrase (e.g. "out at
the camp"; default "in the <name>"), and drops a new sword if none is left
anywhere. The map HUD shows "🗡️ 63" (or "Find a sword!"), and the fight HUD has
a sword bar under your 💪 bar.

## Levels

`src/world/levels.js` works out which level each map is on, from the map
crawl: the main map is Level 1, a secret `passage` goes up one level and a
normal portal stays on the same one, so a room is on the lowest level it can
be reached from (`mapLevels(configs)` → `{ levelOf, locks, max }`,
`levelOfMap`). So the bank is Level 1, Ember's Sword Shop Level 2 and Shelly's
Armor Shop Level 3. `levelUnlocked(levels, n)` says whether a camper has
unlocked level `n`: Level 1, the level you're on and those below it, or a
level whose passage is open (`passageOpen`, e.g. `level2Open`) when the level
below it is unlocked too. Exploration mode counts every level as unlocked
(`registerLevelsOpen`). The sword drops use the levels, and so do the NPCs'
item answers (see [npcs.md](npcs.md)).

**Rewards go up with the level:** beating a level's boss gives a coin worth
the level × $10 (its `reward` in the map JSON): the Blob (Level 1) $10, Mega
Mallow (Level 2) $20, the Brick (Level 3) $30, the Slime Brick (Level 4) $40.
(Mini Mallow, Mega Mallow's kid, gives $10.)

