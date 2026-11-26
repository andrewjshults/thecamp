#!/usr/bin/env node
// Draws the second camp's map, assets/camp_level2.svg, in the same marker
// style as the `scene` rooms (wobbly ink, streaky colour, emoji stickers): it
// borrows the game's own pen (scenePen in src/world/scene.js).
//
//   node tools/make-level2-map.js
//
// The layout follows Louisa's drawing of the second camp: the sleeping tents
// top left, the swimming pool top right, the Blob Fight Zone in the middle
// where the two roads cross, the birthday zone bottom left, the kitchen
// bottom middle and the boys' and girls' bathrooms down the right side. The
// cave back to the first camp is at the top of the road, and the bank and
// the sword shop are on the pool deck. Hotspots for all of these are in
// assets/camp_level2.json: move them together if you move something here.
// No words on the map (signs use pictures).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/world/scene.js'), 'utf8'), ctx);
const { scenePen, SCENE_INK } = vm.runInContext('({ scenePen, SCENE_INK })', ctx);

const W = 3300, H = 2400;
const S = W / 2400;
const p = scenePen(S);
const X = f => f * W, Y = f => f * H;

// Tiny seeded random, so the map comes out the same every time
let seed = 11;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

// ---------------------------------------------------------------- ground
// a few soft grass patches on the paper
for (let i = 0; i < 26; i++) {
  const x = rnd() * W, y = rnd() * H;
  p.ellipse(x, y, (90 + rnd() * 160) * S, (40 + rnd() * 70) * S, 'rgba(129, 199, 132, 0.28)', { ink: false });
}

// ---------------------------------------------------------------- roads
const ROAD = '#c99a62', ROAD_DARK = '#8b5a2b';
const zone = { cx: X(0.395), cy: Y(0.555), r: 330 * S };
function road(x0, y0, x1, y1) {
  p.rect(x0, y0, x1 - x0, y1 - y0, ROAD, { ink: false });
}
road(0, Y(0.53), zone.cx, Y(0.62));                       // left
road(zone.cx, Y(0.50), W, Y(0.59));                       // right
road(X(0.315), 0, X(0.455), zone.cy);                     // up
road(X(0.345), zone.cy, X(0.47), H);                      // down
// road edges (ink), wobbly like a marker along a ruler
const edge = (x0, y0, x1, y1) => p.line(x0, y0, x1, y1, { sw: 1.1 });
// ...stopping where they meet the Blob Fight Zone's ring
const ringR = zone.r + 28 * S;
const ringX = (y, side) => zone.cx + side * Math.sqrt(Math.max(0, ringR * ringR - (y - zone.cy) ** 2));
const ringY = (x, side) => zone.cy + side * Math.sqrt(Math.max(0, ringR * ringR - (x - zone.cx) ** 2));
edge(0, Y(0.53), ringX(Y(0.53), -1), Y(0.53)); edge(0, Y(0.62), ringX(Y(0.62), -1), Y(0.62));
edge(ringX(Y(0.50), 1), Y(0.50), W, Y(0.50)); edge(ringX(Y(0.59), 1), Y(0.59), W, Y(0.59));
edge(X(0.315), 0, X(0.315), ringY(X(0.315), -1)); edge(X(0.455), 0, X(0.455), ringY(X(0.455), -1));
edge(X(0.345), ringY(X(0.345), 1), X(0.345), H); edge(X(0.47), ringY(X(0.47), 1), X(0.47), H);
// pebbles and wheel ruts
for (let i = 0; i < 70; i++) {
  const t = rnd();
  let x, y;
  if (i % 4 === 0) { x = t * X(0.3); y = Y(0.54) + rnd() * Y(0.07); }
  else if (i % 4 === 1) { x = X(0.5) + t * X(0.5); y = Y(0.51) + rnd() * Y(0.07); }
  else if (i % 4 === 2) { x = X(0.325) + rnd() * X(0.12); y = t * Y(0.4); }
  else { x = X(0.355) + rnd() * X(0.1); y = Y(0.72) + t * Y(0.27); }
  p.circle(x, y, (4 + rnd() * 5) * S, ROAD_DARK, { ink: false, opacity: 0.45 });
}

// ---------------------------------------------------------------- Blob Fight Zone (the Marshmallows' lair)
// sunny rays around the ring, like the drawing
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * Math.PI * 2 + 0.1;
  const r0 = zone.r + 40 * S, r1 = zone.r + (110 + (i % 3) * 25) * S;
  p.line(zone.cx + Math.cos(a) * r0, zone.cy + Math.sin(a) * r0, zone.cx + Math.cos(a) * r1, zone.cy + Math.sin(a) * r1,
    { sw: 1.2, stroke: '#e65100' });
}
p.circle(zone.cx, zone.cy, zone.r + 28 * S, '#ff8a65', { sw: 1.2 });          // outer ring
p.circle(zone.cx, zone.cy, zone.r - 10 * S, '#f3d9a4', { sw: 1.2 });          // sandy arena
for (let i = 0; i < 40; i++) {                                                  // scuffs in the sand
  const a = rnd() * Math.PI * 2, d = rnd() * (zone.r - 150 * S) + 120 * S;
  p.line(zone.cx + Math.cos(a) * d, zone.cy + Math.sin(a) * d, zone.cx + Math.cos(a) * d + 18 * S, zone.cy + Math.sin(a) * d + 4 * S,
    { sw: 0.4, stroke: 'rgba(120,80,30,0.45)' });
}
// toasted marshmallow stickers around the ring (warning!)
for (const a of [0.4, 1.6, 2.9, 4.2, 5.4]) {
  const r = zone.r + 8 * S;
  p.emoji(zone.cx + Math.cos(a) * r, zone.cy + Math.sin(a) * r, '🔥', 46 * S);
}
// the hole they come out of, with a cracked rim
p.circle(zone.cx, zone.cy, 118 * S, '#8d6e63', { sw: 1.1 });
p.circle(zone.cx, zone.cy, 92 * S, '#1b0f0a', { sw: 1.2 });
for (let i = 0; i < 9; i++) {
  const a = (i / 9) * Math.PI * 2;
  p.line(zone.cx + Math.cos(a) * 100 * S, zone.cy + Math.sin(a) * 100 * S,
    zone.cx + Math.cos(a + 0.12) * 140 * S, zone.cy + Math.sin(a + 0.12) * 140 * S, { sw: 0.6 });
}
// crossed swords painted in the sand
p.emoji(zone.cx - 190 * S, zone.cy + 150 * S, '⚔️', 70 * S, { rotate: -12 });
p.emoji(zone.cx + 200 * S, zone.cy - 150 * S, '⚔️', 70 * S, { rotate: 14 });

// ---------------------------------------------------------------- sleeping tents (the safe zone)
// grass for the tent meadow
p.rect(0, 0, X(0.3), Y(0.47), 'rgba(129, 199, 132, 0.45)', { ink: false });
function tent(x, y, w, h, color, bedColor) {
  p.poly([[x, y + h], [x + w / 2, y], [x + w, y + h]], color, { sw: 1.3 });
  // open flap showing inside: lantern hanging, a stacked bed
  p.poly([[x + w * 0.3, y + h], [x + w / 2, y + h * 0.18], [x + w * 0.7, y + h]], '#fff8e1', { sw: 0.9 });
  p.line(x + w / 2, y + h * 0.18, x + w / 2, y + h * 0.42, { sw: 0.5 });
  p.ellipse(x + w / 2, y + h * 0.47, w * 0.035, h * 0.05, '#ffd54f', { sw: 0.6 });
  p.circle(x + w / 2, y + h * 0.47, w * 0.09, 'url(#glow)', { ink: false });
  p.rect(x + w * 0.38, y + h * 0.78, w * 0.24, h * 0.2, bedColor, { sw: 0.7, r: 6 * S });
  p.rect(x + w * 0.43, y + h * 0.68, w * 0.14, h * 0.1, '#ffffff', { sw: 0.6, r: 6 * S });
  for (let i = 0; i < 4; i++) p.line(x + w * (0.41 + i * 0.05), y + h * 0.86, x + w * (0.43 + i * 0.05), y + h * 0.92, { sw: 0.3 });
  // pegs + guy ropes
  p.line(x + w * 0.1, y + h * 0.7, x - w * 0.06, y + h * 1.02, { sw: 0.35 });
  p.line(x + w * 0.9, y + h * 0.7, x + w * 1.06, y + h * 1.02, { sw: 0.35 });
}
tent(X(0.02), Y(0.05), X(0.13), Y(0.21), '#ef5350', '#90caf9');     // red tent
tent(X(0.175), Y(0.08), X(0.11), Y(0.17), '#42a5f5', '#ffcc80');    // blue tent
tent(X(0.07), Y(0.25), X(0.15), Y(0.2), '#66bb6a', '#f48fb1');      // big green tent (you can go in)
// a campfire ring between the tents (unlit: no fire near the tents!)
p.circle(X(0.235), Y(0.33), 46 * S, '#9e9e9e', { sw: 0.8 });
p.circle(X(0.235), Y(0.33), 28 * S, '#5d4037', { sw: 0.6 });
p.emoji(X(0.235), Y(0.33), '🪵', 40 * S);
// picket fence around the meadow, with a gate where the roads meet
function picket(x0, y0, x1, y1) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (46 * S)));
  for (let i = 0; i <= n; i++) {
    const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    p.poly([[x - 9 * S, y + 22 * S], [x - 9 * S, y - 22 * S], [x, y - 34 * S], [x + 9 * S, y - 22 * S], [x + 9 * S, y + 22 * S]], '#fffde7', { sw: 0.5 });
  }
  p.line(x0, y0 - 8 * S, x1, y1 - 8 * S, { sw: 0.5 });
}
picket(X(0.30), Y(0.02), X(0.30), Y(0.38));      // right side
picket(X(0.0), Y(0.47), X(0.22), Y(0.47));       // bottom
// the gate (open) + a "no marshmallows" sign: a marshmallow, crossed out
p.line(X(0.30), Y(0.47), X(0.30), Y(0.40), { sw: 1.2, stroke: '#795548' });
p.line(X(0.22), Y(0.47), X(0.25), Y(0.43), { sw: 1.2, stroke: '#795548' });
const sx = X(0.27), sy = Y(0.425);
p.line(sx, sy + 40 * S, sx, sy + 110 * S, { sw: 0.9, stroke: '#6d4c41' });
p.circle(sx, sy, 48 * S, '#ffffff', { sw: 0.9 });
p.rect(sx - 18 * S, sy - 24 * S, 36 * S, 46 * S, '#fff3e0', { sw: 0.6, r: 8 * S });
p.circle(sx, sy, 44 * S, null, { sw: 1.1, stroke: '#e53935' });
p.line(sx - 31 * S, sy - 31 * S, sx + 31 * S, sy + 31 * S, { sw: 1.1, stroke: '#e53935' });
// sleepy stickers
p.emoji(X(0.17), Y(0.03), '💤', 60 * S);
p.emoji(X(0.03), Y(0.40), '🌙', 56 * S);

// ---------------------------------------------------------------- swimming pool
const pool = { x: X(0.5), y: Y(0.03), w: X(0.47), h: Y(0.3) };
p.rect(pool.x - 26 * S, pool.y - 26 * S, pool.w + 52 * S, pool.h + 52 * S, '#e0e0e0', { r: 40 * S, sw: 1.1 });    // coping
p.rect(pool.x, pool.y, pool.w, pool.h, '#4fc3f7', { r: 26 * S, sw: 1 });
// the wavy lines from the drawing
for (let i = 0; i < 6; i++) {
  const y = pool.y + pool.h * (0.12 + i * 0.15), x0 = pool.x + pool.w * (0.08 + (i % 2) * 0.04), x1 = pool.x + pool.w * 0.95;
  let d = `M ${x0} ${y}`;
  for (let x = x0; x < x1; x += 120 * S) d += ` Q ${x + 30 * S} ${y - 22 * S} ${x + 60 * S} ${y} T ${x + 120 * S} ${y}`;
  p.path(d, null, { sw: 0.6, stroke: '#0277bd' });
}
// lane ropes
for (const f of [0.33, 0.66]) {
  const y = pool.y + pool.h * f;
  for (let x = pool.x + 20 * S; x < pool.x + pool.w - 20 * S; x += 34 * S) p.circle(x, y, 9 * S, (x / (34 * S)) % 2 < 1 ? '#ef5350' : '#ffffff', { sw: 0.3 });
}
// ladder, diving board, floaties
for (const lx of [0.035, 0.075]) p.line(pool.x + pool.w * lx, pool.y + pool.h * 0.72, pool.x + pool.w * lx, pool.y + pool.h + 30 * S, { sw: 1, stroke: '#9e9e9e' });
for (let i = 0; i < 3; i++) p.line(pool.x + pool.w * 0.035, pool.y + pool.h * (0.8 + i * 0.08), pool.x + pool.w * 0.075, pool.y + pool.h * (0.8 + i * 0.08), { sw: 0.7, stroke: '#9e9e9e' });
p.rect(pool.x + pool.w * 0.42, pool.y - 40 * S, pool.w * 0.12, 30 * S, '#1e88e5', { sw: 0.8, r: 10 * S });
p.emoji(pool.x + pool.w * 0.25, pool.y + pool.h * 0.45, '🛟', 70 * S);
p.emoji(pool.x + pool.w * 0.4, pool.y + pool.h * 0.86, '🦆', 60 * S);
p.emoji(pool.x + pool.w * 0.85, pool.y + pool.h * 0.2, '🏐', 56 * S);
// the boat, bobbing by the edge (a sail and a little cabin, like the drawing)
const bx = X(0.74), by = Y(0.29);
p.path(`M ${bx - 120 * S} ${by} Q ${bx} ${by + 70 * S} ${bx + 130 * S} ${by} Z`, '#8d6e63', { sw: 1 });
p.rect(bx + 10 * S, by - 60 * S, 90 * S, 56 * S, '#fff59d', { sw: 0.8 });
p.line(bx - 20 * S, by, bx - 20 * S, by - 190 * S, { sw: 0.9 });
p.path(`M ${bx - 26 * S} ${by - 185 * S} Q ${bx - 130 * S} ${by - 100 * S} ${bx - 26 * S} ${by - 20 * S} Z`, '#ef5350', { sw: 0.9 });
// the pool deck
p.rect(X(0.475), Y(0.355), X(0.525), Y(0.14), 'rgba(255, 224, 178, 0.75)', { ink: false });
for (let x = X(0.48); x < W; x += 90 * S) p.line(x, Y(0.36), x, Y(0.49), { sw: 0.3, stroke: 'rgba(0,0,0,0.18)' });
// beach chairs + towel
// (the bank stands on the deck too: it's drawn by the game, in its hotspot's box)
p.rect(X(0.49), Y(0.44), X(0.05), Y(0.03), '#ffb300', { sw: 0.6, r: 8 * S });
p.rect(X(0.555), Y(0.45), X(0.05), Y(0.025), '#ec407a', { sw: 0.6, r: 8 * S });
p.emoji(X(0.575), Y(0.405), '⛱️', 80 * S);

// ---------------------------------------------------------------- sword shop (on the deck)
{
  const x = X(0.8), y = Y(0.3), w = X(0.15), h = Y(0.195);
  p.rect(x + w * 0.06, y + h * 0.3, w * 0.88, h * 0.7, '#a1887f', { sw: 1.1 });
  for (let i = 1; i < 6; i++) p.line(x + w * 0.06, y + h * (0.3 + i * 0.12), x + w * 0.94, y + h * (0.3 + i * 0.12), { sw: 0.3, stroke: 'rgba(0,0,0,0.3)' });
  // striped awning
  for (let i = 0; i < 7; i++) {
    p.poly([[x + w * i / 7, y + h * 0.22], [x + w * (i + 1) / 7, y + h * 0.22], [x + w * (i + 1) / 7, y + h * 0.36], [x + w * (i + 0.5) / 7, y + h * 0.4], [x + w * i / 7, y + h * 0.36]],
      i % 2 ? '#ffca28' : '#e53935', { sw: 0.5 });
  }
  p.poly([[x - w * 0.02, y + h * 0.22], [x + w * 0.5, y], [x + w * 1.02, y + h * 0.22]], '#6d4c41', { sw: 1 });
  // sign: crossed swords on a shield
  p.path(`M ${x + w * 0.4} ${y + h * 0.05} L ${x + w * 0.6} ${y + h * 0.05} L ${x + w * 0.6} ${y + h * 0.13} Q ${x + w * 0.5} ${y + h * 0.21} ${x + w * 0.4} ${y + h * 0.13} Z`, '#ffd54f', { sw: 0.6 });
  p.emoji(x + w * 0.5, y + h * 0.115, '⚔️', h * 0.1);
  // shop window with swords on show
  p.rect(x + w * 0.52, y + h * 0.5, w * 0.36, h * 0.26, '#b3e5fc', { sw: 0.8 });
  p.emoji(x + w * 0.6, y + h * 0.63, '🗡️', h * 0.14, { rotate: -40 });
  p.emoji(x + w * 0.78, y + h * 0.63, '🔥', h * 0.12);
  // door (drawn closed; the game swings it open)
  p.rect(x + w * 0.14, y + h * 0.5, w * 0.24, h * 0.5, '#5d4037', { sw: 0.9 });
  p.circle(x + w * 0.33, y + h * 0.76, w * 0.015, '#ffd54f', { sw: 0.4 });
  // a barrel of swords outside
  p.rect(x + w * 0.9, y + h * 0.78, w * 0.12, h * 0.22, '#8d6e63', { sw: 0.8, r: 10 * S });
  p.emoji(x + w * 0.96, y + h * 0.74, '🗡️', h * 0.12, { rotate: -20 });
}

// ---------------------------------------------------------------- the cave back to the first camp
{
  const cx = X(0.385), top = 0, w = X(0.15), h = Y(0.125);
  const x = cx - w / 2;
  const hill = [[0, 1], [0.04, 0.55], [0.18, 0.3], [0.3, 0.38], [0.45, 0.06], [0.6, 0.2], [0.75, 0.04], [0.9, 0.42], [1, 1]];
  p.poly(hill.map(([fx, fy]) => [x + fx * w, top + fy * h]), '#8d8a94', { sw: 1.2 });
  for (const [fx, fy, r] of [[0.2, 0.7, 0.05], [0.82, 0.62, 0.05], [0.6, 0.35, 0.04]]) p.ellipse(x + fx * w, top + fy * h, r * w, r * w * 0.7, '#aaa7b1', { sw: 0.4 });
  const mw = w * 0.42, mh = h * 0.62, mx = cx - mw / 2, mb = top + h;
  p.path(`M ${mx} ${mb} L ${mx} ${mb - mh + mw / 2} A ${mw / 2} ${mw / 2} 0 0 1 ${mx + mw} ${mb - mh + mw / 2} L ${mx + mw} ${mb} Z`, '#1c1220', { sw: 1.1 });
  p.emoji(cx, mb - mh * 0.45, '✨', mw * 0.35);
}

// ---------------------------------------------------------------- birthday zone
p.rect(0, Y(0.64), X(0.335), Y(0.36), 'rgba(248, 187, 208, 0.35)', { ink: false });
// bunting across the top of the zone
{
  const x0 = X(0.01), x1 = X(0.33), y0 = Y(0.655), sag = Y(0.03);
  p.path(`M ${x0} ${y0} Q ${(x0 + x1) / 2} ${y0 + sag * 2} ${x1} ${y0}`, null, { sw: 0.5 });
  const colors = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  for (let i = 0; i < 14; i++) {
    const t0 = (i + 0.15) / 14, t1 = (i + 0.85) / 14;
    const at = t => [x0 + (x1 - x0) * t, y0 + sag * 4 * t * (1 - t)];
    const [ax, ay] = at(t0), [bx2, by2] = at(t1);
    p.poly([[ax, ay], [bx2, by2], [(ax + bx2) / 2, (ay + by2) / 2 + 46 * S]], colors[i % 5], { sw: 0.5 });
  }
}
// the disco ball on a post, with rays (like the drawing)
{
  const cx = X(0.09), cy = Y(0.8), r = 70 * S;
  p.line(X(0.02), Y(0.7), X(0.02), Y(0.97), { sw: 1.3, stroke: '#6d4c41' });
  p.line(X(0.02), Y(0.7), cx, Y(0.7), { sw: 1.3, stroke: '#6d4c41' });
  p.line(cx, Y(0.7), cx, cy - r, { sw: 0.6 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.line(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35, cx + Math.cos(a) * r * 1.9, cy + Math.sin(a) * r * 1.9, { sw: 0.8, stroke: '#ab47bc' });
  }
  p.circle(cx, cy, r, '#cfd8dc', { sw: 1 });
  for (let i = -2; i <= 2; i++) {
    p.ellipse(cx, cy, r * Math.abs(Math.cos(i * 0.6)), r, null, { sw: 0.35 });
    p.line(cx - r * Math.cos(i * 0.5), cy + r * Math.sin(i * 0.5), cx + r * Math.cos(i * 0.5), cy + r * Math.sin(i * 0.5), { sw: 0.35 });
  }
  for (const [fx, fy, c] of [[-0.4, -0.3, '#f48fb1'], [0.3, 0.2, '#81d4fa'], [0.1, -0.5, '#fff59d'], [-0.2, 0.45, '#ce93d8']]) p.rect(cx + fx * r, cy + fy * r, r * 0.22, r * 0.22, c, { ink: false });
  p.emoji(cx + r * 2.2, cy + r * 0.6, '🎶', 50 * S);
}
// the party tent (you can go in): striped, with a pennant on top
{
  const x = X(0.18), y = Y(0.69), w = X(0.14), h = Y(0.25);
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    p.poly([[x + w * i / stripes, y + h], [x + w / 2, y + h * 0.18], [x + w * (i + 1) / stripes, y + h]], i % 2 ? '#fff176' : '#f06292', { sw: 0.4 });
  }
  p.poly([[x, y + h], [x + w / 2, y + h * 0.18], [x + w, y + h]], null, { sw: 1.3 });
  p.line(x + w / 2, y + h * 0.18, x + w / 2, y, { sw: 0.8 });
  p.poly([[x + w / 2, y], [x + w * 0.68, y + h * 0.05], [x + w / 2, y + h * 0.1]], '#ab47bc', { sw: 0.5 });
  // the door flap (drawn closed; the game swings it open)
  p.rect(x + w * 0.36, y + h * 0.6, w * 0.28, h * 0.4, '#8e24aa', { sw: 0.9, r: 30 * S });
  p.emoji(x + w * 0.5, y + h * 0.42, '🎂', h * 0.13);
}
// balloons, presents, a cake table
{
  const bx0 = X(0.155), by0 = Y(0.72);
  const cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047'];
  cols.forEach((c, i) => {
    const x = bx0 + (i - 1.5) * 40 * S, y = by0 - (i % 2) * 40 * S;
    p.line(x, y + 40 * S, bx0, Y(0.82), { sw: 0.3 });
    p.ellipse(x, y, 30 * S, 38 * S, c, { sw: 0.6 });
  });
  p.rect(X(0.05), Y(0.9), X(0.09), Y(0.035), '#fff8e1', { sw: 0.8 });                 // table
  for (const lx of [0.055, 0.13]) p.line(X(lx), Y(0.935), X(lx), Y(0.98), { sw: 0.8 });
  p.emoji(X(0.095), Y(0.875), '🎂', 70 * S);
  p.emoji(X(0.155), Y(0.95), '🎁', 60 * S);
}

// ---------------------------------------------------------------- kitchen
{
  const x = X(0.56), y = Y(0.67), w = X(0.22), h = Y(0.31);
  p.rect(x, y + h * 0.15, w, h * 0.85, '#fff3e0', { sw: 1.3 });
  // wavy roof line like the drawing
  p.path(`M ${x - 20 * S} ${y + h * 0.17} Q ${x + w * 0.25} ${y} ${x + w * 0.5} ${y + h * 0.12} T ${x + w + 20 * S} ${y + h * 0.1} L ${x + w + 20 * S} ${y + h * 0.2} L ${x - 20 * S} ${y + h * 0.22} Z`, '#a1887f', { sw: 1.1 });
  p.rect(x + w * 0.42, y - h * 0.02, w * 0.08, h * 0.12, '#8d6e63', { sw: 0.8 });          // chimney
  p.emoji(x + w * 0.46, y - h * 0.08, '💨', h * 0.1);
  // big window with the food sack (tied with a leaf) inside
  p.rect(x + w * 0.38, y + h * 0.36, w * 0.5, h * 0.48, '#ffe0b2', { sw: 0.9 });
  p.circle(x + w * 0.63, y + h * 0.64, h * 0.14, '#d7a86e', { sw: 0.9 });
  p.path(`M ${x + w * 0.6} ${y + h * 0.5} L ${x + w * 0.63} ${y + h * 0.46} L ${x + w * 0.66} ${y + h * 0.5}`, null, { sw: 0.7 });
  p.ellipse(x + w * 0.66, y + h * 0.45, w * 0.02, h * 0.015, '#66bb6a', { sw: 0.5 });
  p.emoji(x + w * 0.63, y + h * 0.66, '🍎', h * 0.1);
  p.emoji(x + w * 0.47, y + h * 0.77, '🥕', h * 0.08);
  p.emoji(x + w * 0.79, y + h * 0.77, '🧀', h * 0.08);
  // the door, with the round knob from the drawing
  p.rect(x + w * 0.08, y + h * 0.45, w * 0.2, h * 0.55, '#ef6c00', { sw: 0.9 });
  p.ellipse(x + w * 0.12, y + h * 0.74, w * 0.015, h * 0.025, '#4e342e', { sw: 0.5 });
  p.emoji(x + w * 0.18, y + h * 0.36, '🍴', h * 0.09);
}

// ---------------------------------------------------------------- bathrooms (boys, girls)
function bathroom(y, h, color, roof, emoji) {
  const x = X(0.885), w = X(0.11);
  p.rect(x, y + h * 0.12, w, h * 0.88, color, { sw: 1.2 });
  p.poly([[x - 12 * S, y + h * 0.14], [x + w / 2, y], [x + w + 12 * S, y + h * 0.14]], roof, { sw: 1 });
  p.rect(x + w * 0.3, y + h * 0.45, w * 0.4, h * 0.55, '#ffffff', { sw: 0.9 });
  p.circle(x + w * 0.62, y + h * 0.72, w * 0.03, '#9e9e9e', { sw: 0.4 });
  p.emoji(x + w * 0.5, y + h * 0.3, emoji, h * 0.17);
  p.rect(x + w * 0.08, y + h * 0.2, w * 0.16, h * 0.1, '#b3e5fc', { sw: 0.5 });
}
bathroom(Y(0.62), Y(0.17), '#90caf9', '#1565c0', '👦');
bathroom(Y(0.81), Y(0.17), '#f8bbd0', '#ad1457', '👧');

// ---------------------------------------------------------------- trees, flowers, rocks
for (const [fx, fy, s] of [[0.52, 0.76, 1], [0.52, 0.94, 0.9], [0.84, 0.66, 0.8], [0.6, 0.65, 0.7], [0.82, 0.93, 0.7]]) {
  if (!s) continue;
  const x = X(fx), y = Y(fy);
  p.rect(x - 12 * S * s, y - 10 * S, 24 * S * s, 70 * S * s, '#6d4c41', { sw: 0.7 });
  p.circle(x, y - 40 * S * s, 70 * S * s, '#66bb6a', { sw: 0.9 });
  p.circle(x - 40 * S * s, y - 20 * S * s, 46 * S * s, '#81c784', { sw: 0.7 });
}
for (let i = 0; i < 22; i++) {
  const spots = [[0.48, 0.65, 0.07, 0.3], [0.79, 0.62, 0.09, 0.05], [0.0, 0.48, 0.3, 0.04], [0.5, 0.6, 0.35, 0.05]];
  const [x0, y0, w0, h0] = spots[i % spots.length];
  const x = X(x0 + rnd() * w0), y = Y(y0 + rnd() * h0);
  p.emoji(x, y, ['🌼', '🌷', '🌱', '🪨'][i % 4], (26 + rnd() * 14) * S);
}

// ---------------------------------------------------------------- write it out
const defs = `<defs>
  <filter id="wobFill" x="-2%" y="-2%" width="104%" height="104%">
    <feTurbulence type="fractalNoise" baseFrequency="${(0.011 / S).toFixed(5)}" numOctaves="2" seed="4"/>
    <feDisplacementMap in="SourceGraphic" scale="${(10 * S).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="wobInk" x="-2%" y="-2%" width="104%" height="104%">
    <feTurbulence type="fractalNoise" baseFrequency="${(0.018 / S).toFixed(5)}" numOctaves="2" seed="19"/>
    <feDisplacementMap in="SourceGraphic" scale="${(6 * S).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <pattern id="streaks" width="${18 * S}" height="${18 * S}" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
    <rect width="${7 * S}" height="${18 * S}" fill="#fff" opacity="0.14"/>
  </pattern>
  <radialGradient id="glow">
    <stop offset="0" stop-color="#fff59d" stop-opacity="0.75"/>
    <stop offset="1" stop-color="#fff59d" stop-opacity="0"/>
  </radialGradient>
</defs>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${defs}\n` +
  `<rect width="${W}" height="${H}" fill="#fbfaf4"/>\n` +
  `<g filter="url(#wobFill)">${p.fill.join('\n')}</g>\n` +
  `<rect width="${W}" height="${H}" fill="url(#streaks)"/>\n` +
  `<g filter="url(#wobInk)">${p.ink.join('\n')}</g>\n` +
  `<g>${p.top.join('\n')}</g>\n` +
  `<rect x="${4 * S}" y="${4 * S}" width="${W - 8 * S}" height="${H - 8 * S}" fill="none" stroke="${SCENE_INK}" stroke-width="${10 * S}"/>\n` +
  '</svg>\n';
fs.writeFileSync(path.join(ROOT, 'assets/camp_level2.svg'), svg);
console.log(`wrote assets/camp_level2.svg (${(svg.length / 1024).toFixed(0)} KB)`);
