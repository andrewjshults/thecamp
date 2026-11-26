# The Camp Bank

Code: `src/features/bank/` (`bank.js`: the teller pop-up and `bankBalance`;
`props.js`: the counter, vault and ropes), `src/world/buildings.js` (the bank
building on the main map). Map: `assets/camp_bank.json`.

The hand-drawn map has no bank, so the `bank` hotspot on the main map (left
side, under the road) has `"building": "bank"`: `drawMapBuildings` draws a
columned bank building in the hotspot's box, with its closed door at the
hotspot's `door` rect (move both together if you move it). It opens into
`assets/camp_bank.json`, the Camp Bank: a teller counter (`tellerCounter` prop:
`windows: [{ teller, sign }]`, `label`, `items`), a `vault` prop (`label`) and
velvet-rope `stanchions` (`posts`).

The Second Camp has the same bank (its `bank` hotspot on the pool deck also
has `"building": "bank"` and leads into `camp_bank.json`), so your balance is
the same from both camps. The bank's door always goes back out to the first
camp.

A hotspot with a `bank` object (`{ "teller": "Penny", "emoji": "🦉" }`) is a
teller window. Space there opens `#bankModal` (state `BANK_MODAL`) with buttons
only, no typing: **What's my balance?**, **Deposit 🪙** / **Deposit all** (coin
items from the backpack, `isCoin`/`coinValue`), **Withdraw 🪙** / **Withdraw
all** (as many `BANK_COIN`s as fit in the backpack). The teller answers each
press with a scripted line. `bankBalance` (dollars) is saved per camper like
`bossWins` (per world + camper in multiplayer), and coins in the bank are safe
from the Blob, which only takes coins from the backpack. Swords are never
dropped at a teller hotspot.
