#!/usr/bin/env node
// Draws the fifth camp's map, assets/camp_level5.svg, in the same marker
// style as the other camps' maps and the `scene` rooms (wobbly ink, streaky
// colour, emoji stickers): it borrows the game's own pen (scenePen in
// src/world/scene.js).
//
//   node tools/make-level5-map.js
//
// The layout follows Louisa's drawing of the fifth camp: a river of lava
// running from the top left down to the right, with stepping-stone rocks
// all the way along it; Charlie's shop (swords, armor and shields) at the
// top and the Moon's Palace top right, with its fighting place (a crater)
// in front; the bathrooms (boys and girls) on the left and the Safe Zone
// bottom left, across the river; and a second pool of lava along the bottom
// with a treasure rock in the middle. Everything is read from
// assets/camp_level5.json: the lava pools and rocks (`lavaRiver`), the
// hotspots and the Safe Zone's yard. Move them there and re-run this.
// The keypads by the doors are drawn by the game. No words on the map.
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
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/camp_level5.json'), 'utf8'));
const LAVA = cfg.lavaRiver;
const SAFE = cfg.moon.safeZones[0];
const hs = id => cfg.hotspots.find(h => h.id === id);
const box = id => { const h = hs(id); return { x: X(h.px), y: Y(h.py), w: X(h.pw), h: Y(h.ph), d: h.door }; };

// Tiny seeded random, so the map comes out the same every time
let seed = 55;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = [X(pts[i][0]), Y(pts[i][1])], [xj, yj] = [X(pts[j][0]), Y(pts[j][1])];
    if ((yi > y) !== (yj > y) && x < xi + (y - yi) * (xj - xi) / (yj - yi)) inside = !inside;
  }
  return inside;
}
const inLava = (x, y) => LAVA.pools.some(pl => inPoly(x, y, pl.points));
const nearRock = (x, y, pad) => LAVA.rocks.some(r => Math.hypot(x - X(r.cx), y - Y(r.cy)) < X(r.r) + pad);
const nearLava = (x, y, d) => [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d]].some(([dx, dy]) => inLava(x + dx, y + dy));
// Smooth path through a pool's points (closed)
function smoothPath(pts) {
  const P = pts.map(([fx, fy]) => [X(fx), Y(fy)]);
  const n = P.length;
  let d = `M ${((P[n - 1][0] + P[0][0]) / 2).toFixed(1)} ${((P[n - 1][1] + P[0][1]) / 2).toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n];
    d += ` Q ${a[0].toFixed(1)} ${a[1].toFixed(1)} ${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  }
  return d + ' Z';
}

// ---------------------------------------------------------------- the ground: dusky grass, with warm patches near the lava
p.rect(0, 0, W, H, '#a5c483', { ink: false });
for (let i = 0; i < 34; i++) {
  const x = rnd() * W, y = rnd() * H;
  p.ellipse(x, y, (110 + rnd() * 170) * S, (45 + rnd() * 70) * S, i % 2 ? 'rgba(104, 159, 56, 0.35)' : 'rgba(215, 204, 200, 0.45)', { ink: false });
}
// (not in the lava, and not on the buildings: [x0, y0, x1, y1] fractions)
const BUILT = [[0.2, 0, 0.44, 0.24], [0.66, 0, 0.97, 0.34], [0.49, 0.18, 0.65, 0.37], [0, 0.47, 0.24, 0.68], [0, 0.69, 0.24, 1],
  [0.03, 0.02, 0.22, 0.2], [0.24, 0.66, 0.35, 0.79]];
for (let i = 0; i < 260; i++) {
  const x = rnd() * W, y = rnd() * H;
  if (nearLava(x, y, 60 * S) || BUILT.some(([x0, y0, x1, y1]) => x > X(x0) && x < X(x1) && y > Y(y0) && y < Y(y1))) continue;
  for (const d of [-1, 0, 1]) p.line(x, y, x + d * 7 * S, y - (14 + (d ? 0 : 6)) * S, { sw: 0.3, stroke: '#558b2f' });
}

// ---------------------------------------------------------------- trails (in the fill layer first, so buildings sit on top)
const ROAD = '#d7b27a', ROAD_DARK = '#8b5a2b';
function trail(d, wide = 130) {
  p.fill.push(`<path d="${d}" fill="none" stroke="${ROAD_DARK}" stroke-width="${(wide + 16) * S}" stroke-linecap="round" stroke-linejoin="round"/>`);
  p.fill.push(`<path d="${d}" fill="none" stroke="${ROAD}" stroke-width="${wide * S}" stroke-linecap="round" stroke-linejoin="round"/>`);
}
const back = box('passage_back');
const bx = back.x + back.w / 2, by = back.y + back.h * 0.8;
// the safe side: the portal → the Safe Zone, the bathrooms and the roasting rock
trail(`M ${bx} ${by} C ${X(0.26)} ${Y(0.86)} ${X(0.22)} ${Y(0.93)} ${X(0.16)} ${Y(0.93)}`);
trail(`M ${bx} ${by} C ${X(0.27)} ${Y(0.74)} ${X(0.2)} ${Y(0.69)} ${X(0.12)} ${Y(0.69)}`);
trail(`M ${bx} ${by} C ${X(0.31)} ${Y(0.72)} ${X(0.33)} ${Y(0.68)} ${X(0.335)} ${Y(0.66)}`, 100);
// the Moon's side: the shop's door → the crater → the palace's door
trail(`M ${X(0.32)} ${Y(0.24)} C ${X(0.4)} ${Y(0.27)} ${X(0.46)} ${Y(0.3)} ${X(0.52)} ${Y(0.33)} S ${X(0.7)} ${Y(0.36)} ${X(0.817)} ${Y(0.33)}`);

// ---------------------------------------------------------------- the lava: the river and the pool along the bottom
for (const pool of LAVA.pools) {
  const d = smoothPath(pool.points);
  // a scorched edge, the lava, then glowing streaks inside it
  p.fill.push(`<path d="${d}" fill="none" stroke="#5d4037" stroke-width="${70 * S}" stroke-linejoin="round" opacity="0.55"/>`);
  // (its outline goes in the fill layer too, so the rocks at its edges sit on top of it)
  p.path(d, '#ff5722', { ink: false });
  p.fill.push(`<path d="${d}" fill="none" stroke="#3e2723" stroke-width="${10 * S}" stroke-linejoin="round"/>`);
  p.fill.push(`<path d="${d}" fill="none" stroke="#ffab40" stroke-width="${26 * S}" stroke-linejoin="round" opacity="0.7"/>`);
}
// swirly bright streaks and bubbles across the lava
for (let i = 0; i < 70; i++) {
  const x = rnd() * W, y = rnd() * H;
  const len = (60 + rnd() * 90) * S;
  if (!inLava(x, y) || !inLava(x + len, y) || nearRock(x, y, 40 * S) || nearRock(x + len, y, 40 * S) || nearRock(x + len / 2, y, 40 * S)) continue;
  p.path(`M ${x} ${y} q ${len / 2} ${-22 * S} ${len} 0`, null, { sw: 0.7, stroke: i % 3 ? '#ffd54f' : '#ff8a65' });
}
for (let i = 0; i < 90; i++) {
  const x = rnd() * W, y = rnd() * H;
  if (!inLava(x, y) || nearRock(x, y, 30 * S)) continue;
  p.circle(x, y, (6 + rnd() * 12) * S, i % 2 ? '#ffca28' : '#ff7043', { sw: 0.35, stroke: '#bf360c' });
}
// the stepping-stone rocks (the ovals in the drawing)
for (const r of LAVA.rocks) {
  const cx = X(r.cx), cy = Y(r.cy), rad = X(r.r);
  p.ellipse(cx + 6 * S, cy + 10 * S, rad * 1.02, rad * 0.82, 'rgba(62, 39, 35, 0.55)', { ink: false });
  p.ellipse(cx, cy, rad, rad * 0.8, '#8d8d8d', { sw: 1.1 });
  p.ellipse(cx - rad * 0.2, cy - rad * 0.22, rad * 0.55, rad * 0.35, '#b0b0b0', { ink: false });
  // the little curl inside each oval in the drawing
  p.path(`M ${cx - rad * 0.4} ${cy + rad * 0.35} q ${rad * 0.25} ${rad * 0.2} ${rad * 0.45} 0`, null, { sw: 0.6 });
}

// ---------------------------------------------------------------- Charlie's shop (top): swords, armor and shields
{
  const b = box('charlie_shop');
  const roofTop = b.y, wallTop = b.y + b.h * 0.25;
  p.rect(b.x, wallTop, b.w, b.h * 0.75, '#ffe0b2', { sw: 1.3 });
  p.poly([[b.x - 24 * S, wallTop + 10 * S], [b.x + b.w / 2, roofTop], [b.x + b.w + 24 * S, wallTop + 10 * S]], '#8d6e63', { sw: 1.2 });
  // the sword and the two shields from the drawing, over the door
  p.emoji(b.x + b.w * 0.18, b.y + b.h * 0.45, '🗡️', b.h * 0.16, { rotate: -30 });
  p.path(`M ${b.x + b.w * 0.7} ${b.y + b.h * 0.33} L ${b.x + b.w * 0.86} ${b.y + b.h * 0.33} L ${b.x + b.w * 0.86} ${b.y + b.h * 0.46} Q ${b.x + b.w * 0.78} ${b.y + b.h * 0.58} ${b.x + b.w * 0.7} ${b.y + b.h * 0.46} Z`, '#fff176', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.78, b.y + b.h * 0.42, '⭐', b.h * 0.08);
  p.path(`M ${b.x + b.w * 0.5} ${b.y + b.h * 0.12} L ${b.x + b.w * 0.6} ${b.y + b.h * 0.12} L ${b.x + b.w * 0.6} ${b.y + b.h * 0.2} Q ${b.x + b.w * 0.55} ${b.y + b.h * 0.27} ${b.x + b.w * 0.5} ${b.y + b.h * 0.2} Z`, '#90caf9', { sw: 0.7 });
  p.rect(b.x + b.w * 0.08, b.y + b.h * 0.62, b.w * 0.22, b.h * 0.18, '#b3e5fc', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.19, b.y + b.h * 0.71, '🛡️', b.h * 0.1);
  p.emoji(b.x + b.w * 0.86, b.y + b.h * 0.72, '🦊', b.h * 0.13);
  const dx = X(b.d.px), dy = Y(b.d.py), dw = X(b.d.pw), dh = Y(b.d.ph);
  p.rect(dx, dy, dw, dh, b.d.color, { sw: 1.1 });
  p.circle(dx + dw * 0.85, dy + dh * 0.55, 8 * S, '#ffd54f', { sw: 0.4 });
}

// ---------------------------------------------------------------- the Moon's Palace (top right): towers with crescent tops
{
  const b = box('moon_palace');
  const WALL = '#c5cae9', DARK = '#5c6bc0';
  p.rect(b.x + b.w * 0.12, b.y + b.h * 0.3, b.w * 0.76, b.h * 0.7, WALL, { sw: 1.3 });
  for (let r = 1; r < 6; r++) p.line(b.x + b.w * 0.12, b.y + b.h * (0.3 + r * 0.12), b.x + b.w * 0.88, b.y + b.h * (0.3 + r * 0.12), { sw: 0.25, stroke: 'rgba(26, 35, 126, 0.35)' });
  for (const fx of [0, 0.84]) {
    const tx = b.x + b.w * fx, tw = b.w * 0.16;
    p.rect(tx, b.y + b.h * 0.15, tw, b.h * 0.85, '#9fa8da', { sw: 1.2 });
    p.poly([[tx - 8 * S, b.y + b.h * 0.16], [tx + tw / 2, b.y - b.h * 0.02], [tx + tw + 8 * S, b.y + b.h * 0.16]], DARK, { sw: 1 });
    p.crescent(tx + tw / 2, b.y - b.h * 0.06, 26 * S, '#fff176', { sw: 0.7 });
    p.rect(tx + tw * 0.3, b.y + b.h * 0.35, tw * 0.4, b.h * 0.14, '#fff9c4', { sw: 0.6, r: 10 * S });
  }
  // a big moon face over the door, and stars round it
  p.circle(b.x + b.w * 0.5, b.y + b.h * 0.45, b.h * 0.13, '#fff59d', { sw: 1 });
  p.emoji(b.x + b.w * 0.5, b.y + b.h * 0.45, '🌝', b.h * 0.18);
  for (const [fx, fy] of [[0.25, 0.4], [0.75, 0.4], [0.3, 0.62], [0.7, 0.62]]) p.star(b.x + b.w * fx, b.y + b.h * fy, 16 * S, '#fff176', { sw: 0.5 });
  const dx = X(b.d.px), dy = Y(b.d.py), dw = X(b.d.pw), dh = Y(b.d.ph);
  p.path(`M ${dx - 14 * S} ${dy + dh} L ${dx - 14 * S} ${dy + dw / 2} A ${dw / 2 + 14 * S} ${dw / 2 + 14 * S} 0 0 1 ${dx + dw + 14 * S} ${dy + dw / 2} L ${dx + dw + 14 * S} ${dy + dh} Z`, '#9e9e9e', { sw: 1 });
  p.rect(dx, dy, dw, dh, b.d.color, { sw: 1.1 });
  p.circle(dx + dw * 0.8, dy + dh * 0.55, 8 * S, '#ffd54f', { sw: 0.4 });
}

// ---------------------------------------------------------------- the fighting place: a silvery crater with a spiral (the drawing's swirl)
{
  const b = box('moon_crater');
  const cx = b.x + b.w / 2, cy = b.y + b.h * 0.55, rx = b.w * 0.45, ry = b.h * 0.4;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    p.line(cx + Math.cos(a) * rx * 1.08, cy + Math.sin(a) * ry * 1.08, cx + Math.cos(a) * rx * 1.3, cy + Math.sin(a) * ry * 1.3, { sw: 0.8 });
  }
  p.ellipse(cx, cy, rx, ry, '#b0bec5', { sw: 1.3 });
  p.ellipse(cx, cy + ry * 0.06, rx * 0.8, ry * 0.75, '#78909c', { sw: 1 });
  let d = `M ${cx} ${cy}`;
  for (let t = 0; t < 4 * Math.PI; t += 0.3) d += ` L ${(cx + Math.cos(t) * t * rx * 0.055).toFixed(1)} ${(cy + Math.sin(t) * t * ry * 0.055).toFixed(1)}`;
  p.path(d, null, { sw: 0.9, stroke: '#eceff1' });
  for (const [fx, fy] of [[-0.6, -0.2], [0.55, 0.3], [0.2, -0.5]]) p.circle(cx + rx * fx, cy + ry * fy, 14 * S, '#90a4ae', { sw: 0.5 });
}

// ---------------------------------------------------------------- the bathrooms (left): one house, boys on the left, girls on the right
{
  const boys = box('boys_bathroom'), girls = box('girls_bathroom');
  const x0 = boys.x, x1 = girls.x + girls.w;
  const top = boys.y, wall = boys.y + boys.h * 0.3;
  p.rect(x0, wall, x1 - x0, boys.y + boys.h - wall, '#fff9c4', { sw: 1.3 });
  p.poly([[x0 - 20 * S, wall + 10 * S], [(x0 + x1) / 2, top], [x1 + 20 * S, wall + 10 * S]], '#e57373', { sw: 1.2 });
  p.line((boys.x + boys.w + girls.x) / 2, wall, (boys.x + boys.w + girls.x) / 2, boys.y + boys.h, { sw: 1 });
  p.emoji(boys.x + boys.w * 0.3, wall + boys.h * 0.2, '👦', boys.h * 0.16);
  p.emoji(girls.x + girls.w * 0.3, wall + girls.h * 0.2, '👧', girls.h * 0.16);
  p.emoji((x0 + x1) / 2, top + boys.h * 0.2, '🚻', boys.h * 0.13);
  for (const b of [boys, girls]) {
    p.rect(X(b.d.px), Y(b.d.py), X(b.d.pw), Y(b.d.ph), '#ffffff', { sw: 0.9 });
    p.circle(X(b.d.px + b.d.pw * 0.2), Y(b.d.py + b.d.ph * 0.55), 7 * S, '#9e9e9e', { sw: 0.4 });
  }
}

// ---------------------------------------------------------------- the Safe Zone (bottom left): a green house with a fenced yard
{
  const z = { x: X(SAFE.px), y: Y(SAFE.py), w: X(SAFE.pw), h: Y(SAFE.ph) };
  p.rect(z.x, z.y, z.w, z.h, 'rgba(129, 212, 250, 0.45)', { sw: 0.8, r: 26 * S });
  for (let x = z.x + 16 * S; x < z.x + z.w - 10 * S; x += 44 * S) {
    p.poly([[x, z.y], [x, z.y + 46 * S], [x + 18 * S, z.y + 46 * S], [x + 18 * S, z.y], [x + 9 * S, z.y - 12 * S]], '#ffffff', { sw: 0.45 });
  }
  const b = box('safe_zone');
  p.rect(b.x, b.y + b.h * 0.12, b.w, b.h * 0.88, '#a5d6a7', { sw: 1.3 });
  p.rect(b.x - 16 * S, b.y, b.w + 32 * S, b.h * 0.14, '#2e7d32', { sw: 1.1 });
  p.path(`M ${b.x + b.w * 0.12} ${b.y + b.h * 0.25} L ${b.x + b.w * 0.4} ${b.y + b.h * 0.25} L ${b.x + b.w * 0.4} ${b.y + b.h * 0.5} Q ${b.x + b.w * 0.26} ${b.y + b.h * 0.72} ${b.x + b.w * 0.12} ${b.y + b.h * 0.5} Z`, '#ffd54f', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.26, b.y + b.h * 0.42, '🛡️', b.h * 0.2);
  // the robot with the codes, waving out of the window (the scribble in the drawing)
  p.rect(b.x + b.w * 0.46, b.y + b.h * 0.27, b.w * 0.22, b.h * 0.28, '#b3e5fc', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.57, b.y + b.h * 0.42, '🤖', b.h * 0.2);
  p.rect(X(b.d.px), Y(b.d.py), X(b.d.pw), Y(b.d.ph), b.d.color, { sw: 0.9 });
  p.circle(X(b.d.px + b.d.pw * 0.8), Y(b.d.py + b.d.ph * 0.55), 7 * S, '#ffd54f', { sw: 0.4 });
}

// ---------------------------------------------------------------- the portal back to the Fourth Camp: a swirly ring of stones
{
  const cx = bx, cy = back.y + back.h * 0.5;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    p.ellipse(cx + Math.cos(a) * back.w * 0.5, cy + Math.sin(a) * back.h * 0.42, 16 * S, 12 * S, '#9e9e9e', { sw: 0.6 });
  }
  p.ellipse(cx, cy, back.w * 0.38, back.h * 0.3, '#7e57c2', { sw: 1 });
  p.path(`M ${cx} ${cy} q ${back.w * 0.1} ${-back.h * 0.12} ${back.w * 0.2} 0 q ${-back.w * 0.05} ${back.h * 0.2} ${-back.w * 0.25} ${back.h * 0.08}`, null, { sw: 0.8, stroke: '#e1bee7' });
  p.emoji(cx + back.w * 0.7, cy - back.h * 0.35, '🫧', 36 * S);
}

// ---------------------------------------------------------------- the marshmallow roasting rock, by the river
{
  const b = box('roast_spot');
  const cx = b.x + b.w / 2, cy = b.y + b.h * 0.6;
  p.ellipse(cx, cy, b.w * 0.42, b.h * 0.3, '#795548', { sw: 1 });
  p.line(cx - b.w * 0.25, cy, cx + b.w * 0.35, cy - b.h * 0.5, { sw: 1, stroke: '#5d4037' });
  p.emoji(cx + b.w * 0.38, cy - b.h * 0.55, '🍡', 40 * S, { rotate: 30 });
  p.emoji(cx - b.w * 0.2, cy - b.h * 0.1, '🔥', 34 * S);
}

// ---------------------------------------------------------------- the treasure rock in the bottom pool (bigger, with a glow)
{
  const b = box('hot_rock');
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  p.circle(cx, cy - 20 * S, 42 * S, 'rgba(255, 241, 118, 0.55)', { ink: false });
  p.emoji(cx + 20 * S, cy - 30 * S, '✨', 30 * S);
}

// ---------------------------------------------------------------- the star lookout (top left): a little tower with a telescope
{
  const b = box('star_lookout');
  p.rect(b.x + b.w * 0.25, b.y + b.h * 0.35, b.w * 0.5, b.h * 0.65, '#bcaaa4', { sw: 1.1 });
  p.rect(b.x + b.w * 0.1, b.y + b.h * 0.25, b.w * 0.8, b.h * 0.14, '#8d6e63', { sw: 1 });
  for (let i = 0; i < 4; i++) p.line(b.x + b.w * (0.15 + i * 0.22), b.y + b.h * 0.1, b.x + b.w * (0.15 + i * 0.22), b.y + b.h * 0.25, { sw: 0.8 });
  p.line(b.x + b.w * 0.1, b.y + b.h * 0.1, b.x + b.w * 0.9, b.y + b.h * 0.1, { sw: 0.8 });
  p.emoji(b.x + b.w * 0.55, b.y + b.h * 0.05, '🔭', b.h * 0.22);
}

// ---------------------------------------------------------------- the moon garden: silver flowers
{
  const b = box('glow_garden');
  p.ellipse(b.x + b.w / 2, b.y + b.h * 0.6, b.w * 0.5, b.h * 0.38, '#6d4c41', { sw: 1 });
  for (let i = 0; i < 6; i++) p.emoji(b.x + b.w * (0.15 + (i % 3) * 0.35), b.y + b.h * (0.45 + Math.floor(i / 3) * 0.28), i % 2 ? '🌸' : '🌼', 32 * S);
}

// ---------------------------------------------------------------- trees, rocks and flowers
for (const [fx, fy, s] of [[0.47, 0.06, 0.8], [0.6, 0.08, 0.7], [0.98, 0.42, 0.7], [0.27, 0.9, 0.7], [0.92, 0.92, 0.7], [0.36, 0.95, 0.6]]) {
  const x = X(fx), y = Y(fy);
  if (inLava(x, y)) continue;
  p.rect(x - 12 * S * s, y - 10 * S, 24 * S * s, 70 * S * s, '#6d4c41', { sw: 0.7 });
  p.circle(x, y - 40 * S * s, 70 * S * s, '#66bb6a', { sw: 0.9 });
  p.circle(x - 40 * S * s, y - 20 * S * s, 46 * S * s, '#81c784', { sw: 0.7 });
}
for (let i = 0; i < 30; i++) {
  const x = rnd() * W, y = rnd() * H;
  if (nearLava(x, y, 50 * S) || BUILT.some(([x0, y0, x1, y1]) => x > X(x0) && x < X(x1) && y > Y(y0) && y < Y(y1))) continue;
  p.emoji(x, y, ['🌼', '🍄', '🪨', '🌙'][i % 4], (26 + rnd() * 14) * S);
}

// ---------------------------------------------------------------- write it out
const defs = `<defs>
  <filter id="wobFill" x="-2%" y="-2%" width="104%" height="104%">
    <feTurbulence type="fractalNoise" baseFrequency="${(0.011 / S).toFixed(5)}" numOctaves="2" seed="6"/>
    <feDisplacementMap in="SourceGraphic" scale="${(10 * S).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="wobInk" x="-2%" y="-2%" width="104%" height="104%">
    <feTurbulence type="fractalNoise" baseFrequency="${(0.018 / S).toFixed(5)}" numOctaves="2" seed="27"/>
    <feDisplacementMap in="SourceGraphic" scale="${(6 * S).toFixed(2)}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <pattern id="streaks" width="${18 * S}" height="${18 * S}" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
    <rect width="${7 * S}" height="${18 * S}" fill="#fff" opacity="0.14"/>
  </pattern>
</defs>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${defs}\n` +
  `<rect width="${W}" height="${H}" fill="#fbfaf4"/>\n` +
  `<g filter="url(#wobFill)">${p.fill.join('\n')}</g>\n` +
  `<rect width="${W}" height="${H}" fill="url(#streaks)"/>\n` +
  `<g filter="url(#wobInk)">${p.ink.join('\n')}</g>\n` +
  `<g>${p.top.join('\n')}</g>\n` +
  `<rect x="${4 * S}" y="${4 * S}" width="${W - 8 * S}" height="${H - 8 * S}" fill="none" stroke="${SCENE_INK}" stroke-width="${10 * S}"/>\n` +
  '</svg>\n';
fs.writeFileSync(path.join(ROOT, 'assets/camp_level5.svg'), svg);
console.log(`wrote assets/camp_level5.svg (${(svg.length / 1024).toFixed(0)} KB)`);
