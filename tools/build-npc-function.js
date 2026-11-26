#!/usr/bin/env node
// Regenerates the NPC/map table inside pubnub/npc-function.js from the map
// JSONs in assets/ and the `characters` list in index.html.
// Run after changing an NPC, a map name or hotspots:  npm run build:npc
// Then paste pubnub/npc-function.js into the PubNub Function again.
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fnPath = path.join(root, 'pubnub', 'npc-function.js');
const clip = (s, max) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);

// Characters: pull name/desc pairs out of the `const characters = [...]` block
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const block = (html.match(/const characters = \[([\s\S]*?)\n\];/) || [])[1];
if (!block) throw new Error('could not find `const characters = [...]` in index.html');
const characters = {};
for (const m of block.matchAll(/name:\s*'([^']+)'[\s\S]*?desc:\s*'([^']*)'/g)) characters[m[1]] = m[2];
if (!Object.keys(characters).length) throw new Error('no characters found in index.html');

const MAPS = {};
const NPCS = {};
for (const file of fs.readdirSync(path.join(root, 'assets')).filter(f => f.endsWith('.json')).sort()) {
  const mapPath = `assets/${file}`;
  const cfg = JSON.parse(fs.readFileSync(path.join(root, mapPath), 'utf8'));
  if (!Array.isArray(cfg.hotspots)) continue;
  MAPS[mapPath] = {
    name: clip(cfg.name || file, 60),
    places: cfg.hotspots.filter(h => !h.targetMap && h.name).map(h => clip(h.name, 40)).slice(0, 30),
  };
  for (const n of cfg.npcs || []) {
    if (NPCS[n.id]) throw new Error(`duplicate NPC id "${n.id}" (${mapPath} and ${NPCS[n.id].map})`);
    const name = n.name || n.character;
    if (!n.emoji && !(n.character in characters)) {
      throw new Error(`NPC "${n.id}" uses unknown character "${n.character}"`);
    }
    NPCS[n.id] = {
      name: clip(name, 40),
      what: clip(n.what, 160),
      desc: n.emoji ? '' : clip(characters[n.character], 120),
      personality: clip(n.personality, 600),
      map: mapPath,
    };
  }
}

const generated = [
  '// ── BEGIN GENERATED (tools/build-npc-function.js — do not edit by hand) ────',
  `const CHARACTER_NAMES = ${JSON.stringify(Object.keys(characters))};`,
  `const MAPS = ${JSON.stringify(MAPS, null, 2)};`,
  `const NPCS = ${JSON.stringify(NPCS, null, 2)};`,
  '// ── END GENERATED ──────────────────────────────────────────────────────────',
].join('\n');

const src = fs.readFileSync(fnPath, 'utf8');
const re = /\/\/ ── BEGIN GENERATED[^\n]*\n[\s\S]*?\/\/ ── END GENERATED[^\n]*/;
if (!re.test(src)) throw new Error('generated markers missing from pubnub/npc-function.js');
fs.writeFileSync(fnPath, src.replace(re, () => generated));
console.log(`pubnub/npc-function.js: ${Object.keys(NPCS).length} NPCs on ${Object.keys(MAPS).length} maps`);
