#!/usr/bin/env node
// Copies a room from level P to level N:
//   node .claude/skills/build-level/scripts/copy-room.js assets/level3_pool.json assets/level4_pool.json 3 4
// Rewrites links to camp_levelP.json, the camp's name ("Third Camp" → "Fourth
// Camp") and item ids ending in _lP, then lists what still needs a hand:
// NPCs (every NPC id must be unique: replace them) and any text that still
// mentions things from level P.
'use strict';
const fs = require('fs');
const [src, dst, p, n] = process.argv.slice(2);
if (!src || !dst || !p || !n) { console.error('usage: copy-room.js <from.json> <to.json> <P> <N>'); process.exit(1); }
if (fs.existsSync(dst)) { console.error(`${dst} already exists`); process.exit(1); }
const ORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'];
let t = fs.readFileSync(src, 'utf8');
t = t.split(`camp_level${p}.json`).join(`camp_level${n}.json`)
  .split(`${ORD[p]} Camp`).join(`${ORD[n]} Camp`)
  .replace(new RegExp(`_l${p}"`, 'g'), `_l${n}"`);
const j = JSON.parse(t);
fs.writeFileSync(dst, JSON.stringify(j, null, 2) + '\n');
console.log(`wrote ${dst}`);
for (const npc of j.npcs || []) console.log(`  ✋ NPC "${npc.id}" (${npc.name || npc.character}): replace it, NPC ids must be unique`);
for (const h of j.hotspots || []) {
  for (const it of h.items || []) if (!new RegExp(`_l${n}$`).test(it.id)) console.log(`  · item "${it.id}" at ${h.id} has no _l${n} suffix (fine if it's meant to be the same item)`);
}
