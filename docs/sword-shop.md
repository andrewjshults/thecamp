# Ember's Sword Shop

Code: `src/features/sword-shop/` (`swords.js` the five swords, `shop.js` the
pop-up), sword kinds in `src/features/sword.js`, what they do in a fight in
`src/features/boss/fight-moves.js`. Map: `assets/sword_shop.json`, entered
from the `sword_shop` hotspot on the Second Camp's pool deck (see
[level-two.md](level-two.md)).

The shop has a forge, a sword rack, a counter and Ember the dragon 🐉 (a
critter NPC you can talk to). A hotspot with a `swordShop` object is the
counter:
```json
"swordShop": { "keeper": "Ember", "emoji": "🐉" }
```
Space there opens `#swordShopModal` (state `SWORD_SHOP`): one button per
sword, with its price and what it does. (Charlie's shop on the Fourth Camp sells
these too, plus two of its own: see [level-four.md](level-four.md).) You pay with the 🪙 coins in your
**backpack** (not the bank: take money out first). `coinsToPay` uses the
biggest coins that fit first, and Ember gives change in $10 coins. The shop
never runs out. A sword you buy replaces the one you're holding (the old one
is traded in; a spare 🗡️ in the backpack stays there).

## The swords

| Sword | Price | Lasts | What it does |
|---|---|---|---|
| 🗡️ Sword (found lying around) | | 100 | |
| ✨ Sparkle Sword | $20 | 250 | swings land a bit more often (`land` +0.04) |
| 🧊 Ice Sword | $40 | 250 | a hit stuns the boss longer (`stun` ×1.4), blocks hold better (`guard` +0.06) |
| 🔥 Flame Sword | $60 | 250 | hits often knock off 2 💪 (`power` 1.6), longer reach (+25), lands more (+0.05) |
| 🌈 Rainbow Thunder Sword | $100 | 400 | a bit of everything, and can smash through an armored wind-up (`pierce` 0.2) |
| 🌋 Lava Sword | $200 | 250 | only 1 swing in 5 lands, whatever your strength (`hitOdds` 0.2), but one hit wins the fight (`oneHit`); blocks like the plain sword |

They're kinds of sword (`SWORD_KINDS`, `swordKind` saved per camper next to
`swordRating`): `max` is the rating when new, and the fight numbers are
explained above `SWORD_KINDS` (`swordStats()` reads them; `playerReach`,
`swingOdds`, `guardOdds` and `resolveHit` use them). The Lava Sword's
`hitOdds` replaces strength + `land` in `swingOdds`, and `oneHit` makes
`resolveHit` set your score to `f.toWin`. Boss blocks and armored wind-ups
still stop it, and your sidekick's hits only count 1 as usual. Your sword's colour and
glow show in the fight (`drawSword(len, w, kind)`), and its emoji on the HUD.

Every sword wears out the same way as the plain one (1 per swing, 4 more per
hit). A fight wears about 120–140, so a shop sword lasts about two fights
(the Rainbow about three). At 0 it's done: you use your spare 🗡️ if you
have one (`equipSpareSword` switches back to a plain sword), or find one, or
buy another.

Sim results, win % against Mega Mallow (`tools/fight-sim.js`, 600 fights,
e.g. `simMany(mallowTuning(10), 'good', 600, 10, { sword: 'ice' })`):

| | plain | ✨ | 🧊 | 🔥 | 🌈 |
|---|---|---|---|---|---|
| level 6, good bot | 58 | 58 | 67 | 67 | 83 |
| level 10, good bot | 37 | 47 | 49 | 47 | 68 |
| level 6, decent bot | 15 | 20 | 18 | 23 | 51 |

The 🌋 Lava Sword (300 fights each, level 10 Mega Mallow, strength 10):
good bot 89–93% (plain 38–41%), decent bot 79–81% (plain 5%). A lava fight
lasts about 8 seconds and wears about 40, so it lasts about six fights.
Against Brick at level 13: good 89%, decent 74% (Rainbow 64% / 15%).

The Sparkle Sword is mostly about lasting longer (it's the cheap one). The
first tries were much too strong: knocking off 2 💪 on *every* hit took level
10 from 49% to 70%, and the first Rainbow Thunder Sword won 98%, so `power`
can be a fraction now (1.5 = 2 half the time).
