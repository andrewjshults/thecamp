# Armor and Shelly's Armor Shop

Code: `src/features/armor-shop/` (`armor.js` the four kinds of armor and what
they do in a fight, `shop.js` the pop-up). Map: `assets/armor_shop.json`,
entered from the `armor_shop` hotspot on the Third Camp's shopping square (see
[level-three.md](level-three.md)).

The shop has a forge, four armor stands (the `armorStand` prop), a counter
and Shelly the tortoise 🐢 (a critter NPC you can talk to). A hotspot with an
`armorShop` object is the counter:
```json
"armorShop": { "keeper": "Shelly", "emoji": "🐢" }
```
Space there opens `#armorShopModal` (state `ARMOR_SHOP`): one button per
kind, with its price and what it does. You pay with the 🪙 coins in your
**backpack**, like the sword shop (it uses the sword shop's `coinsToPay`, and
change comes back in $10 coins, so the prices are in tens). Armor you buy
replaces what you're wearing (the old one is traded in).

## The armor

| Armor | Price | Lasts | Stops a hit |
|---|---|---|---|
| 🥋 Padded Vest | $30 | 120 | 10% |
| ⛓️ Chain Mail | $50 | 160 | 14% |
| 🛡️ Knight Armor | $70 | 200 | 18% |
| 💎 Crystal Armor | $100 | 260 | 26% |

`ARMOR_KINDS` in `armor.js`. `armorKind` and `armorRating` are saved per
camper. **What it does:** when a boss's swing is about to land on you (it
wasn't blocked or dodged), the armor stops it `stop` of the time: "ARMOR!"
pops up, the boss gets no point, you lose no 💪, and you're pushed back a
little. It works against every boss on every level (the Blob, the
Marshmallows, the Brick). It hooks into the fight with
`registerPlayerHitGuard` (in `src/core/hooks.js`; `resolveHit` asks it just
before a hit lands), so the fight code knows nothing about armor.

**It wears out.** Each hit it stops costs `ARMOR_STOP_WEAR` (12), and each
hit that gets through costs `ARMOR_HIT_WEAR` (6). A lost fight is about 10
hits, so the vest lasts about two fights and the crystal about four. At 0
it's "WORN OUT!": the result screen says so and the armor comes off.

**How it looks:** a breastplate and shoulder pads over your shirt in the fight
(`drawFightArmor`, a `registerFightLayer` layer; the crystal one sparkles,
and it flashes when it stops a hit), a bar under your sword's in the fight HUD
(`drawArmorMeter`), and a "🛡️ 85" badge next to your sword on the map
(`registerHudBadge`).

Tuning: see the table in [level-three.md](level-three.md). The first tries
(stopping 15–32% of hits) made the Crystal Armor too strong: 85% wins against
the level 11 Brick, which needed 41% without armor. `tools/fight-sim.js`
takes `{ armor: 'knight' }` (armor that never wears out) in its last
argument.
