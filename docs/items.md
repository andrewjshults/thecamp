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
`bankBalance` (bank). Each is registered once, next to its variable:

```js
let bankBalance = 0;
registerSaveField('bankBalance', { save: () => bankBalance, load: s => { bankBalance = savedBankBalance(s); } });
```

`load` gets the save object, or `{}` for a camper starting fresh, so it sets
the default too. The same fields are saved in single player
(`louisas-game:save:<character>`) and multiplayer
(`louisas-game:mp:<world>:<character>`).
