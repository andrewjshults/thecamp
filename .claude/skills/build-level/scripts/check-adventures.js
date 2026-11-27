#!/usr/bin/env node
// Checks the adventures (hotspot `uses`) of every level, or of one:
//   node .claude/skills/build-level/scripts/check-adventures.js        # every level
//   node .claude/skills/build-level/scripts/check-adventures.js 5      # just level 5
// Finds the maps the way the game does (portals stay on a level, a `passage`
// goes up one), then for each level lists, per map, how many adventures can be
// done with that level's own items, and the items that have no adventure yet.
// Exits 1 on a problem:
//   - the item isn't on any map (a typo, or an item that was renamed)
//   - the item starts at a spot with this id (you can't use an item where it
//     was picked up, and that's by spot id, so a `sinks` item can't be used at
//     any map's `sinks`)
//   - the same item twice at one spot
//   - an `animation` the game doesn't have
//   - the spot is a door, a counter, a fight, a passage or a lock: those open
//     something else, so the adventure can never be done
//   - a level past the first with fewer than MIN_OWN of its own (the smoke
//     test's `adventures` step fails then too)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const MAIN = 'assets/game_design.json';
const MIN_OWN = 15;
const ANIMATIONS = new Set(['bathroom', 'climb', 'cook', 'craft', 'drink', 'eat', 'explore', 'fly',
  'play', 'shelter', 'sit', 'sleep', 'stargaze', 'swim', 'wash']);
const OPENS_SOMETHING = ['targetMap', 'passage', 'swordShop', 'armorShop', 'codeKeeper', 'codeLock',
  'keyLock', 'comingSoon', 'bank', 'kitchen'];
const only = process.argv[2] ? Number(process.argv[2]) : null;

// Every map, and its level (0-1 BFS: portals cost 0, passages 1)
const configs = {}, levelOf = { [MAIN]: 1 }, order = [];
const deque = [MAIN];
while (deque.length) {
  const p = deque.shift();
  if (!configs[p]) {
    try { configs[p] = JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch (_) { continue; }
    order.push(p);
  }
  for (const h of configs[p].hotspots || []) {
    const links = [];
    if (h.targetMap) links.push([h.targetMap, levelOf[p]]);
    if (h.passage && h.passage.targetMap) links.push([h.passage.targetMap, levelOf[p] + 1]);
    for (const [to, n] of links) {
      if (levelOf[to] !== undefined && levelOf[to] <= n) continue;
      levelOf[to] = n;
      if (n === levelOf[p]) deque.unshift(to); else deque.push(to);
    }
  }
}

// itemId → { level → Set of spot ids it starts at }
const itemsAt = {};
for (const p of order) for (const h of configs[p].hotspots || []) for (const it of h.items || []) {
  const byLevel = itemsAt[it.id] || (itemsAt[it.id] = {});
  (byLevel[levelOf[p]] || (byLevel[levelOf[p]] = new Set())).add(h.id);
}

const problems = [];
const levels = [...new Set(order.map(p => levelOf[p]))].sort((a, b) => a - b);
for (const n of levels) {
  if (only !== null && n !== only) continue;
  const maps = order.filter(p => levelOf[p] === n);
  let own = 0, bonus = 0;
  const used = new Set();
  console.log(`\nLevel ${n}`);
  for (const p of maps) {
    let mapOwn = 0, mapBonus = 0;
    for (const h of configs[p].hotspots || []) {
      const seen = new Set();
      const opens = OPENS_SOMETHING.filter(k => h[k]).concat(h.action === 'fight' ? ['a fight'] : []);
      for (const u of h.uses || []) {
        const where = `${p} ${h.id} ${u.itemId}`;
        if (seen.has(u.itemId)) problems.push(`${where}: the same item twice at this spot`);
        seen.add(u.itemId);
        if (opens.length) problems.push(`${where}: this spot opens something else (${opens.join(', ')}), so it can't be done`);
        if (u.animation && !ANIMATIONS.has(u.animation)) problems.push(`${where}: no animation "${u.animation}"`);
        if (!u.text) problems.push(`${where}: no text`);
        const byLevel = itemsAt[u.itemId];
        if (!byLevel) { problems.push(`${where}: no map has this item`); continue; }
        if (Object.values(byLevel).some(spots => spots.has(h.id))) {
          problems.push(`${where}: the item starts at a "${h.id}" spot, and can't be used at one`);
        }
        if (byLevel[n]) { mapOwn++; used.add(u.itemId); } else mapBonus++;
      }
    }
    own += mapOwn; bonus += mapBonus;
    console.log(`  ${path.basename(p).padEnd(28)} ${String(mapOwn).padStart(3)} own${mapBonus ? `, ${mapBonus} bonus` : ''}`);
  }
  const unused = Object.keys(itemsAt).filter(id => itemsAt[id][n] && !used.has(id));
  console.log(`  total: ${own} with this level's items, ${bonus} bonus (items from other levels)`);
  if (unused.length) console.log(`  items with no adventure on this level: ${unused.join(', ')}`);
  if (n > 1 && own < MIN_OWN) problems.push(`Level ${n}: only ${own} adventures with its own items (want ${MIN_OWN}+)`);
}

if (problems.length) {
  console.log(`\n✗ ${problems.length} problem(s):`);
  for (const pr of problems) console.log('  - ' + pr);
  process.exit(1);
}
console.log('\n✓ adventures look fine');
