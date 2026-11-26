# Kitchen and cooking

Code: `src/features/kitchen/` (`kitchen.js` stations, recipes, freestyle,
desserts and the pop-up; `kitchen-draw.js` the chalkboard, stations and HUD;
`props.js` the room props). Map: `assets/camp_kitchen.json`.

`assets/camp_kitchen.json` (entered through the pink door under the sink on
the main map, hotspot `kitchen`) is a cooking room. A map with a `kitchen`
object turns hotspots that have a `station` into cooking spots:
```json
"kitchen": {
  "foods":   { "bread": { "name": "Bread", "emoji": "🍞" },
               "sandwich": { "name": "Sandwich", "emoji": "🥪", "dish": true } },
  "recipes": [ { "makes": "sandwich", "needs": ["bread", "cheese", "lettuce"] } ]
}
// on a hotspot:
"station": { "type": "source", "item": "bread" }                       // grab (never runs out)
"station": { "type": "cook", "verb": "Boil", "doing": "Boiling", "seconds": 3, "fx": "💨",
             "makes": { "tomato": "sauce" }, "slot": { "px": 0.5, "py": 0.25 } }
"station": { "type": "plate" }    // foods placed here become a recipe's `makes` when they match
"station": { "type": "serve" }    // eat a `dish` (counts toward "Recipes made")
"station": { "type": "trash" }
"station": { "type": "shop", "item": "cupcake" }   // buy a dessert with 🪙 coins
```
- Space at a station picks up / puts down / cooks (no dialog). The player
  holds **one** food at a time, drawn in their hands (`heldItem`). It never goes
  in the backpack, and is left behind when they walk out of the kitchen.
- `slot` is where food sits on the station (fractions of the hotspot box).
- Food on stations lives in memory only; which dishes have been eaten is saved
  as `dishesMade`.
- The recipe chalkboard is a `chalkboard` scene prop with hand-written
  `columns` — update it when recipes change. Only the board is in the scene
  picture; the writing is drawn live each frame (`drawChalkboards`). The board
  has a fixed number of rows (`rows`, default: what the hand-written columns
  need). When a column runs out, its oldest lines at the top go away and its
  last row becomes "▼ see all N ▼". A "See All Recipes" hotspot is added there
  (`chalkboardHotspots`, not shown in dev mode). It opens every recipe in a
  pop-up.

**Freestyle / your own recipes.** Bring a food to the plate that doesn't fit
any recipe (not a dessert) and a pop-up (`#kitchenModal`, state
`KITCHEN_MODAL`) offers to cook freestyle. You name it, and it's written on the
chalkboard's `"custom": true` column in yellow with a ✏️ (`draftRecipe`). The
plate then takes any food (up to `FREESTYLE_MAX` = 6). Space with empty hands
picks the whole dish up (🍽️), and you can put it back to add more. Eating it at
the table finalizes it: it's saved in `customRecipes` (`{ id, name, needs, map }`,
per camper like `dishesMade`), stays on the board, and is made on the plate like
any built-in recipe from then on (`allRecipes()`). Composting it or walking out
of the kitchen with it rubs it off the board. Your own recipes don't count
toward "Recipes made"; the HUD shows "⭐ N of your own".

**Desserts → strength.** A food with `"dessert": true, "price": 20, "strength": 5`
is sold at a `shop` station (the `dessertCase` prop: 🍪 $10 +2, 🧁 $20 +5,
🍰 $30 +8). Buying pays with coin items from the backpack (`value`, default 10)
and puts the dessert in your hands; Space at the shop again puts it back for a
refund. Eat it at the table (or it's eaten automatically if you walk out) to
add its `strength` to `strengthBoost` — permanently (saved, no cap, so you
can spend all your coins; past strength 20 only the hit/block odds keep
creeping up, since `strengthSpeed` tops out at 20). Desserts don't count toward "Recipes made".
