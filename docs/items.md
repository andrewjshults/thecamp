# Items, the backpack and saves

Code: `src/items/` (`backpack.js`, `coins.js`), `src/core/save.js`,
`src/ui/overlays.js` (the backpack overlay), `src/ui/journal.js`.

Each hotspot owns up to 3 items by default (`HOTSPOT_CAPACITY` in `src/items/backpack.js`).
The player has a 10-slot backpack (`BACKPACK_CAPACITY`). The `items` array in
the JSON is the **default** seeding; the runtime contents (per-hotspot and the
player's backpack) are persisted to `localStorage` under
`louisas-game:save:<character.name>`. Selecting a character with an existing
save shows a Resume / Start Fresh prompt; Start Fresh wipes that character's
key and re-seeds from the JSON defaults.

When adding new items to a hotspot, edit **only** that map's JSON (e.g.
`assets/game_design.json`). The server fetches it fresh on every reload — no
other file needs updating.

## Saved values
Besides the backpack, the journal (`completedUses`) and the hotspots' items,
each feature saves its own values per camper: `dishesMade`, `customRecipes`,
`strengthBoost` (kitchen), `swordRating` (sword), `bossWins` (Blob fight),
`bankBalance` (bank), `charms` and `wheelLuck` ([prize wheel](prize-wheel.md)). Each is registered once, next to its variable:

```js
let bankBalance = 0;
registerSaveField('bankBalance', { save: () => bankBalance, load: s => { bankBalance = savedBankBalance(s); } });
```

`load` gets the save object, or `{}` for a camper starting fresh, so it sets
the default too. The same fields are saved in single player
(`louisas-game:save:<character>`) and multiplayer
(`louisas-game:mp:<world>:<character>`).

## Adventures (the Adventure Journal)
A hotspot's `uses` are its adventures: `{ "itemId", "text", "animation" }`.
Using that item there for the first time (`useItem` in
`src/items/backpack.js`) adds an entry to `completedUses` and emits
`adventureDone` (a [prize wheel](prize-wheel.md) spin). An item can't be used
at the spot it was picked up from (`pickedUpFrom`, a spot id).

- **Every level has its own**: Levels 2–4 have adventures done with items found
  on that level (the camp, its rooms, its pool, its shops and bathrooms), plus
  a few bonus ones for things carried up from Level 1. A new level should too
  (the `build-level` skill).
- **Entries remember their map** (`map`), because spot ids repeat between maps
  (every camp's bathrooms, pools and party rooms): `isUseAlreadyDone(itemId,
  hotspotId, map = currentMapPath)`. An older save's entries have no `map`;
  once a camper starts playing, `assignLegacyUseMaps` gives each the
  lowest-level map that has that adventure (`mapLevels`), and one no map has
  any more gets `map: null` and counts nowhere.
- **The journal's total** (`totalUsesCount`) counts every map in the game
  (`adventureMapConfigs`, from `crawlMapConfigs()` at `playStart`), not just
  the maps you've been to.
