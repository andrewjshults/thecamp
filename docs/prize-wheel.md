# The prize wheel and fight charms

Code: `src/features/prize-wheel/` (`wheel.js` the wheel, `charms.js` the
charms and what they do in a fight).

## The wheel

Every new [Adventure Journal](items.md) entry (an item used at a hotspot for
the first time) gives you one spin. `useItem` emits the `adventureDone` game
event, and once the adventure's pop-up closes and you're back on the map, the
wheel opens (state `PRIZE_WHEEL`, drawn on the canvas). Space / Enter / tap
spins it. When it lands, Space / Enter / Esc / tap closes it.

It has `WHEEL_SLOTS` (8) slots. Some of them hold a prize and the rest are
"so close!" (💨). How many slots win is `wheelWins()`: your luck
(`wheelLuck`, saved per camper), rounded down and kept between
`WHEEL_MIN_WINS` (1) and `WHEEL_MAX_WINS` (6):

- Every adventure adds `WHEEL_LUCK_PER_ADVENTURE` (1/3), so you get one more
  winning slot every 3 adventures.
- Winning a prize takes away `WHEEL_LUCK_WIN_DROP` (2 slots). It doesn't
  start over: 6 in 8 goes down to 4 in 8.

Older saves start as lucky as the adventures they've already done. The
winning slots are spread around the wheel (`wheelSlots`), and each one gets a
prize picked by `weight` from `WHEEL_PRIZES`:

| Prize | Weight | |
|---|---|---|
| 🧪 Power Potion, 🫧 Bubble Shield, 🍯 Honey Drop, ✨ Sword Polish | 2 each | a fight charm, into your charm pouch |
| 🪙 $10 Coin (the Blob's, level 1) | 3 | into the backpack |
| 🪙 $20 Coin (the Marshmallows', level 2) | 2 | |
| 🪙 $30 Coin (the Brick's, level 3) | 1 | |
| ✨ Sparkle / 🧊 Ice / 🔥 Flame / 🌈 Rainbow Thunder Sword | 0.8 / 0.6 / 0.4 / 0.2 | in your hand right away |
| 🥋 Padded Vest / ⛓️ Chain Mail / 🛡️ Knight / 💎 Crystal Armor | 0.8 / 0.6 / 0.4 / 0.2 | worn right away |

A coin goes in your backpack, or into the Camp Bank (`bankBalance`) if the
backpack is full. Swords and armor are the shops' ones
([sword-shop.md](sword-shop.md), [armor-shop.md](armor-shop.md)), good as new
(`giveWheelSword`, `giveWheelArmor`). If what you already have is pricier and
still works, you keep it instead, and it's made as good as new. All the prizes
are handed over by `giveWheelPrize`.

## Fight charms

Charms live in your charm pouch (`charms`, saved per camper: kind → how
many), not the backpack. The map HUD shows them as "🧪2 🫧1". One of each kind
you have goes into every boss fight (the Blob, the Marshmallows, the Brick).
`startFight` emits `fightStart`, and a charm is only used up when it does
something:

| Charm | What it does | Used up |
|---|---|---|
| 🧪 Power Potion | +`CHARM_POTION_STRENGTH` (4) 💪, and 4 more to get back up to | always |
| 🫧 Bubble Shield | stops the next `CHARM_BUBBLE_HITS` (2) hits that would land on you ("POP! 🫧"), using `registerPlayerHitGuard` | always |
| 🍯 Honey Drop | when your 💪 drops to `CHARM_HONEY_AT` (3), +`CHARM_HONEY_GIVES` (5) back, once (a frame update) | only if that happens |
| ✨ Sword Polish | your sword is as good as new at the start | only if it's worn at all |

In the fight, a bubble is drawn around you while it lasts (`drawFightBubble`).
The charms still working sit in a row under your sword and armor bars
(`drawFightCharms`), and the result screen lists the ones you used. Fights
from `tools/fight-sim.js` (foe id `sim`) don't touch the pouch.

Armor's guard is asked before the bubble's (the order of the script tags).
So a hit the bubble stops can still wear the armor as a hit that got
through.
