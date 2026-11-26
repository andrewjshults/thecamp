#!/usr/bin/env node
// Draws the third camp's map, assets/camp_level3.svg, in the same marker
// style as the Second Camp's map and the `scene` rooms (wobbly ink, streaky
// colour, emoji stickers): it borrows the game's own pen (scenePen in
// src/world/scene.js).
//
//   node tools/make-level3-map.js
//
// The layout follows Louisa's drawing of the third camp: the birthday zone
// (a party hall with the disco ball) top left, the girls' and boys'
// bathrooms next to it, the Brick's castle in the middle on an island in a
// poison moat, with a bridge and a road down to the hole back to the Second
// Camp, the big swimming pool with its slide top right, a little splash pool
// with a slide bottom left, and the bank and the armor shop bottom right. The
// ground is grass all around the castle. Hotspots for all of these (and the
// moat's shape, `poisonMoat`) are in assets/camp_level3.json: move them
// together if you move something here. No words on the map.
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
const base = scenePen(S);
// The castle and its bridge stand over the moat, so they get a pen of their own,
// drawn on top (one pen puts every outline over every colour)
const castlePen = scenePen(S);
let p = base;
const X = f => f * W, Y = f => f * H;
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/camp_level3.json'), 'utf8'));
const MOAT = cfg.poisonMoat;

// Tiny seeded random, so the map comes out the same every time
let seed = 23;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const inEllipse = (x, y, e, grow = 0) => ((x - X(e.cx)) / (X(e.rx) + grow)) ** 2 + ((y - Y(e.cy)) / (Y(e.ry) + grow)) ** 2 < 1;

// ---------------------------------------------------------------- grass everywhere
p.rect(0, 0, W, H, '#aed581', { ink: false });
for (let i = 0; i < 34; i++) {
  const x = rnd() * W, y = rnd() * H;
  p.ellipse(x, y, (110 + rnd() * 170) * S, (45 + rnd() * 70) * S, i % 2 ? 'rgba(124, 179, 66, 0.45)' : 'rgba(197, 225, 165, 0.5)', { ink: false });
}
// little grass tufts (not in the moat)
for (let i = 0; i < 260; i++) {
  const x = rnd() * W, y = rnd() * H;
  if (inEllipse(x, y, MOAT.outer, 30 * S)) continue;
  for (const d of [-1, 0, 1]) p.line(x, y, x + d * 7 * S, y - (14 + (d ? 0 : 6)) * S, { sw: 0.3, stroke: '#558b2f' });
}

// ---------------------------------------------------------------- grassy hills (the wavy lines in the drawing)
function hill(x0, x1, y, hgt, color) {
  const mid = (x0 + x1) / 2;
  p.path(`M ${x0} ${y} Q ${x0 + (mid - x0) * 0.5} ${y - hgt} ${mid} ${y - hgt * 0.6} T ${x1} ${y} Z`, color, { sw: 0.8, stroke: '#558b2f' });
}
hill(X(0.0), X(0.16), Y(0.52), Y(0.07), '#9ccc65');
hill(X(0.05), X(0.24), Y(0.63), Y(0.06), '#8bc34a');
hill(X(0.71), X(0.9), Y(0.47), Y(0.07), '#9ccc65');
hill(X(0.82), X(1.0), Y(0.55), Y(0.06), '#8bc34a');

// ---------------------------------------------------------------- roads
const ROAD = '#d7b27a', ROAD_DARK = '#8b5a2b';
// the main road: from the hole at the bottom up to the bridge
p.rect(X(0.435), Y(0.76), X(0.07), Y(0.24), ROAD, { ink: false });
p.line(X(0.435), Y(0.785), X(0.435), H, { sw: 1.1 });
p.line(X(0.505), Y(0.785), X(0.505), H, { sw: 1.1 });
// curvy trails out to the left (party, bathrooms, splash pool) and the right (pool, shops)
// (both strokes go in the fill layer, early on, so everything drawn later sits on top)
function softTrail(d) {
  p.fill.push(`<path d="${d}" fill="none" stroke="${ROAD_DARK}" stroke-width="${(150 + 16) * S}" stroke-linecap="round" stroke-linejoin="round"/>`);
  p.fill.push(`<path d="${d}" fill="none" stroke="${ROAD}" stroke-width="${150 * S}" stroke-linecap="round" stroke-linejoin="round"/>`);
}
softTrail(`M ${X(0.44)} ${Y(0.86)} C ${X(0.33)} ${Y(0.86)} ${X(0.25)} ${Y(0.8)} ${X(0.22)} ${Y(0.66)} S ${X(0.2)} ${Y(0.46)} ${X(0.17)} ${Y(0.43)}`);
softTrail(`M ${X(0.22)} ${Y(0.66)} C ${X(0.2)} ${Y(0.7)} ${X(0.17)} ${Y(0.72)} ${X(0.14)} ${Y(0.73)}`);
softTrail(`M ${X(0.21)} ${Y(0.47)} C ${X(0.24)} ${Y(0.44)} ${X(0.27)} ${Y(0.43)} ${X(0.29)} ${Y(0.41)}`);
softTrail(`M ${X(0.5)} ${Y(0.86)} C ${X(0.62)} ${Y(0.86)} ${X(0.7)} ${Y(0.8)} ${X(0.72)} ${Y(0.66)} S ${X(0.73)} ${Y(0.48)} ${X(0.715)} ${Y(0.39)}`);
softTrail(`M ${X(0.72)} ${Y(0.7)} C ${X(0.76)} ${Y(0.74)} ${X(0.8)} ${Y(0.8)} ${X(0.85)} ${Y(0.81)}`);
// pebbles on the main road
for (let i = 0; i < 40; i++) {
  p.circle(X(0.44) + rnd() * X(0.06), Y(0.76) + rnd() * Y(0.23), (4 + rnd() * 5) * S, ROAD_DARK, { ink: false, opacity: 0.45 });
}

// ---------------------------------------------------------------- the hole back to the Second Camp (bottom of the road)
{
  const hs = cfg.hotspots.find(h => h.id === 'hole_back');
  const cx = X(hs.px + hs.pw / 2), cy = Y(hs.py + hs.ph * 0.55);
  p.ellipse(cx, cy, 118 * S, 66 * S, '#8d6e63', { sw: 1.1 });
  p.ellipse(cx, cy, 92 * S, 48 * S, '#1b0f0a', { sw: 1.2 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.line(cx + Math.cos(a) * 98 * S, cy + Math.sin(a) * 52 * S, cx + Math.cos(a + 0.15) * 135 * S, cy + Math.sin(a + 0.15) * 74 * S, { sw: 0.6 });
  }
  // a marshmallow peeking out, to show where it leads
  p.emoji(cx - 150 * S, cy - 40 * S, '🔥', 44 * S);
  p.emoji(cx + 150 * S, cy - 40 * S, '🔥', 44 * S);
}

// ---------------------------------------------------------------- the poison moat
{
  const o = MOAT.outer, isl = MOAT.island;
  // goopy poison, with a darker rim
  p.ellipse(X(o.cx), Y(o.cy), X(o.rx) + 20 * S, Y(o.ry) + 20 * S, '#6d4c41', { sw: 1.2 });
  p.ellipse(X(o.cx), Y(o.cy), X(o.rx), Y(o.ry), '#76ff03', { sw: 1.1 });
  p.ellipse(X(o.cx), Y(o.cy), X(o.rx) * 0.97, Y(o.ry) * 0.96, 'rgba(118, 255, 3, 0.6)', { ink: false });
  // wavy goo lines, bubbles and skulls
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.1;
    const k = 0.83 + (i % 3) * 0.05;
    const x = X(o.cx) + Math.cos(a) * X(o.rx) * k, y = Y(o.cy) + Math.sin(a) * Y(o.ry) * k;
    if (inEllipse(x, y, isl, 20 * S)) continue;
    p.path(`M ${x - 26 * S} ${y} q ${13 * S} ${-12 * S} ${26 * S} 0 t ${26 * S} 0`, null, { sw: 0.5, stroke: '#7b1fa2' });
    if (i % 2) p.circle(x + 30 * S, y - 22 * S, (8 + (i % 4) * 3) * S, 'rgba(206, 147, 216, 0.9)', { sw: 0.35, stroke: '#6a1b9a' });
  }
  for (const a of [0.6, 2.4, 3.4, 5.0]) {
    const x = X(o.cx) + Math.cos(a) * X(o.rx) * 0.88, y = Y(o.cy) + Math.sin(a) * Y(o.ry) * 0.88;
    p.emoji(x, y, '☠️', 50 * S);
  }
  p.emoji(X(o.cx) - X(o.rx) * 0.9, Y(o.cy) + Y(o.ry) * 0.2, '🫧', 44 * S);
  p.emoji(X(o.cx) + X(o.rx) * 0.9, Y(o.cy) - Y(o.ry) * 0.15, '🫧', 40 * S);
  // the castle's island
  p.ellipse(X(isl.cx), Y(isl.cy), X(isl.rx), Y(isl.ry), '#9ccc65', { sw: 1.1 });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    p.circle(X(isl.cx) + Math.cos(a) * X(isl.rx) * 0.97, Y(isl.cy) + Math.sin(a) * Y(isl.ry) * 0.97, 14 * S, '#a1887f', { sw: 0.4 });
  }
}

// ---------------------------------------------------------------- the bridge (like the ladder in the drawing)
p = castlePen;
{
  const b = MOAT.bridge;
  const x = X(b.px), y = Y(b.py), w = X(b.pw), h = Y(b.ph);
  p.rect(x, y, w, h, '#a1887f', { sw: 1.1 });
  for (let i = 1; i < 9; i++) p.line(x, y + h * i / 9, x + w, y + h * i / 9, { sw: 0.5 });
  p.line(x - 10 * S, y, x - 10 * S, y + h, { sw: 1.1, stroke: '#5d4037' });
  p.line(x + w + 10 * S, y, x + w + 10 * S, y + h, { sw: 1.1, stroke: '#5d4037' });
  for (const fy of [0.02, 0.5, 0.98]) for (const fx of [-10, w / S + 10]) p.circle(x + fx * S, y + h * fy, 10 * S, '#5d4037', { sw: 0.5 });
}

// ---------------------------------------------------------------- the Brick's castle (made of bricks, of course)
{
  const BRICK = '#c0603f', ROOF = '#5e35b1';
  const door = cfg.hotspots.find(h => h.id === 'castle_door').door;
  const brickRows = (x, y, w, h, rowH) => {
    for (let r = 1; y + r * rowH < y + h; r++) p.line(x, y + r * rowH, x + w, y + r * rowH, { sw: 0.28, stroke: 'rgba(60,20,10,0.55)' });
    for (let r = 0; y + r * rowH < y + h; r++) {
      const off = r % 2 ? rowH : 0;
      for (let bx = x + off; bx < x + w; bx += rowH * 2) p.line(bx, y + r * rowH, bx, Math.min(y + h, y + (r + 1) * rowH), { sw: 0.28, stroke: 'rgba(60,20,10,0.55)' });
    }
  };
  const crenels = (x, y, w, n, color) => {
    for (let i = 0; i < n; i++) if (i % 2 === 0) p.rect(x + w * i / n, y - w / n * 0.8, w / n, w / n * 0.8, color, { sw: 0.8 });
  };
  // front wall
  const wx = X(0.41), wy = Y(0.37), ww = X(0.12), wh = Y(0.27);
  p.rect(wx, wy, ww, wh, BRICK, { sw: 1.3 });
  brickRows(wx, wy, ww, wh, 34 * S);
  crenels(wx, wy, ww, 7, BRICK);
  // ivy climbing the wall (the wavy lines in the drawing)
  for (const fx of [0.3, 0.72]) {
    const vx = wx + ww * fx;
    let d = `M ${vx} ${wy + 10 * S}`;
    for (let vy = wy + 10 * S; vy < wy + wh - 40 * S; vy += 60 * S) d += ` q ${18 * S} ${30 * S} 0 ${60 * S}`;
    p.path(d, null, { sw: 0.7, stroke: '#2e7d32' });
    for (let vy = wy + 40 * S; vy < wy + wh - 60 * S; vy += 90 * S) p.ellipse(vx + 10 * S, vy, 12 * S, 7 * S, '#66bb6a', { sw: 0.3 });
  }
  // two towers with pointy roofs and flags
  for (const tx of [0.37, 0.53]) {
    const x = X(tx), w = X(0.04), y = Y(0.22), h = Y(0.42);
    p.rect(x, y, w, h, BRICK, { sw: 1.3 });
    brickRows(x, y, w, h, 34 * S);
    p.poly([[x - 16 * S, y], [x + w / 2, y - Y(0.11)], [x + w + 16 * S, y]], ROOF, { sw: 1.2 });
    p.line(x + w / 2, y - Y(0.11), x + w / 2, y - Y(0.155), { sw: 0.8 });
    p.poly([[x + w / 2, y - Y(0.155)], [x + w / 2 + 70 * S, y - Y(0.14)], [x + w / 2, y - Y(0.125)]], '#ff7043', { sw: 0.6 });
    // a window with fire eyes looking out
    p.path(`M ${x + w * 0.3} ${y + h * 0.3} L ${x + w * 0.3} ${y + h * 0.2} A ${w * 0.2} ${w * 0.2} 0 0 1 ${x + w * 0.7} ${y + h * 0.2} L ${x + w * 0.7} ${y + h * 0.3} Z`, '#2a0c02', { sw: 0.8 });
  }
  for (const tx of [0.39, 0.55]) p.emoji(X(tx), Y(0.22) + Y(0.42) * 0.24, '🔥', 30 * S);
  // banners on the wall
  for (const fx of [0.18, 0.82]) {
    const bx = wx + ww * fx, by = wy + wh * 0.12;
    p.poly([[bx - 30 * S, by], [bx + 30 * S, by], [bx + 30 * S, by + 110 * S], [bx, by + 85 * S], [bx - 30 * S, by + 110 * S]], '#ffca28', { sw: 0.6 });
    p.emoji(bx, by + 45 * S, '🧱', 40 * S);
  }
  // the gate: a round-topped door with the bars from the drawing (drawn closed; the game swings it open)
  const dx = X(door.px), dy = Y(door.py), dw = X(door.pw), dh = Y(door.ph);
  p.path(`M ${dx - 14 * S} ${dy + dh} L ${dx - 14 * S} ${dy + dw / 2} A ${dw / 2 + 14 * S} ${dw / 2 + 14 * S} 0 0 1 ${dx + dw + 14 * S} ${dy + dw / 2} L ${dx + dw + 14 * S} ${dy + dh} Z`, '#9e9e9e', { sw: 1 });
  p.rect(dx, dy, dw, dh, '#4e342e', { sw: 1.1 });
  for (let i = 1; i < 5; i++) p.line(dx + dw * i / 5, dy, dx + dw * i / 5, dy + dh, { sw: 0.7, stroke: '#212121' });
  for (let i = 1; i < 6; i++) p.line(dx, dy + dh * i / 6, dx + dw, dy + dh * i / 6, { sw: 0.7, stroke: '#212121' });
  p.circle(dx + dw * 0.85, dy + dh * 0.55, 9 * S, '#ffd54f', { sw: 0.4 });
  // torches either side of the gate
  for (const fx of [-0.45, 1.45]) {
    p.rect(dx + dw * fx - 8 * S, dy + dh * 0.15, 16 * S, 60 * S, '#6d4c41', { sw: 0.5 });
    p.emoji(dx + dw * fx, dy + dh * 0.1, '🔥', 40 * S);
  }
}

p = base;
// ---------------------------------------------------------------- birthday zone: the party hall (disco ball in the window)
{
  const hs = cfg.hotspots.find(h => h.id === 'party_hall');
  const x = X(hs.px), y = Y(hs.py), w = X(hs.pw), h = Y(hs.ph);
  p.rect(x, y + h * 0.18, w, h * 0.82, '#f8bbd0', { sw: 1.3 });
  for (let i = 0; i < 7; i++) p.line(x + w * (i + 0.5) / 7, y + h * 0.2, x + w * (i + 0.5) / 7, y + h, { sw: 0.25, stroke: 'rgba(173, 20, 87, 0.35)' });
  p.poly([[x - 20 * S, y + h * 0.2], [x + w / 2, y], [x + w + 20 * S, y + h * 0.2]], '#ab47bc', { sw: 1.2 });
  // bunting along the roof
  const colors = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
  for (let i = 0; i < 10; i++) {
    const fx0 = x + w * i / 10, fx1 = x + w * (i + 1) / 10, fy = y + h * 0.21;
    p.poly([[fx0 + 4 * S, fy], [fx1 - 4 * S, fy], [(fx0 + fx1) / 2, fy + 40 * S]], colors[i % 5], { sw: 0.45 });
  }
  // the big window, with the disco ball and its rays (like the drawing)
  const wx = x + w * 0.08, wy = y + h * 0.34, ww = w * 0.5, wh = h * 0.45;
  p.rect(wx, wy, ww, wh, '#311b92', { sw: 1 });
  const cx = wx + ww / 2, cy = wy + wh * 0.55, r = Math.min(ww, wh) * 0.2;
  p.line(cx, wy, cx, cy - r, { sw: 0.5, stroke: '#e0e0e0' });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.line(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35, cx + Math.cos(a) * r * 2.1, cy + Math.sin(a) * r * 2.1,
      { sw: 0.7, stroke: colors[i % 5] });
  }
  p.circle(cx, cy, r, '#cfd8dc', { sw: 0.9 });
  for (let i = -2; i <= 2; i++) p.ellipse(cx, cy, r * Math.abs(Math.cos(i * 0.6)), r, null, { sw: 0.3 });
  for (const [fx, fy, c] of [[-0.4, -0.3, '#f48fb1'], [0.3, 0.2, '#81d4fa'], [0.1, -0.5, '#fff59d']]) p.rect(cx + fx * r, cy + fy * r, r * 0.25, r * 0.25, c, { ink: false });
  // the door (drawn closed; the game swings it open)
  const d = hs.door;
  p.rect(X(d.px), Y(d.py), X(d.pw), Y(d.ph), d.color, { sw: 1 });
  p.circle(X(d.px + d.pw * 0.8), Y(d.py + d.ph * 0.55), 8 * S, '#ffd54f', { sw: 0.4 });
  p.emoji(X(d.px + d.pw / 2), Y(d.py) - 40 * S, '🎂', 50 * S);
  // balloons tied by the door
  ['#e53935', '#1e88e5', '#fdd835'].forEach((c, i) => {
    const bx = x + w * 1.0 + (i - 1) * 30 * S, by = y + h * 0.5 - (i % 2) * 34 * S;
    p.line(bx, by + 34 * S, x + w + 4 * S, y + h * 0.72, { sw: 0.3 });
    p.ellipse(bx, by, 24 * S, 31 * S, c, { sw: 0.5 });
  });
  p.emoji(x + w * 0.15, y + h * 1.05, '🎁', 44 * S);
}

// ---------------------------------------------------------------- bathrooms (girls on top, boys below)
function bathroom(hsId, color, roof, emoji) {
  const hs = cfg.hotspots.find(h => h.id === hsId);
  const x = X(hs.px), y = Y(hs.py), w = X(hs.pw), h = Y(hs.ph);
  p.rect(x, y + h * 0.12, w, h * 0.88, color, { sw: 1.2 });
  p.poly([[x - 12 * S, y + h * 0.14], [x + w / 2, y], [x + w + 12 * S, y + h * 0.14]], roof, { sw: 1 });
  const d = hs.door;
  p.rect(X(d.px), Y(d.py), X(d.pw), Y(d.ph), '#ffffff', { sw: 0.9 });
  p.circle(X(d.px + d.pw * 0.8), Y(d.py + d.ph * 0.5), w * 0.03, '#9e9e9e', { sw: 0.4 });
  p.emoji(x + w * 0.5, y + h * 0.3, emoji, h * 0.17);
  p.rect(x + w * 0.08, y + h * 0.2, w * 0.16, h * 0.1, '#b3e5fc', { sw: 0.5 });
  p.rect(x + w * 0.76, y + h * 0.2, w * 0.16, h * 0.1, '#b3e5fc', { sw: 0.5 });
}
bathroom('girls_bathroom', '#f8bbd0', '#ad1457', '👧');
bathroom('boys_bathroom', '#90caf9', '#1565c0', '👦');

// ---------------------------------------------------------------- the big swimming pool, with its slide
{
  const pool = { x: X(0.685), y: Y(0.04), w: X(0.29), h: Y(0.27) };
  p.rect(pool.x - 26 * S, pool.y - 26 * S, pool.w + 52 * S, pool.h + 52 * S, '#e0e0e0', { r: 40 * S, sw: 1.1 });
  p.rect(pool.x, pool.y, pool.w, pool.h, '#4fc3f7', { r: 26 * S, sw: 1 });
  for (let i = 0; i < 5; i++) {
    const y = pool.y + pool.h * (0.14 + i * 0.18), x0 = pool.x + pool.w * (0.08 + (i % 2) * 0.05), x1 = pool.x + pool.w * 0.94;
    let d = `M ${x0} ${y}`;
    for (let x = x0; x < x1; x += 120 * S) d += ` Q ${x + 30 * S} ${y - 22 * S} ${x + 60 * S} ${y} T ${x + 120 * S} ${y}`;
    p.path(d, null, { sw: 0.6, stroke: '#0277bd' });
  }
  p.emoji(pool.x + pool.w * 0.55, pool.y + pool.h * 0.5, '🛟', 70 * S);
  p.emoji(pool.x + pool.w * 0.82, pool.y + pool.h * 0.25, '🦆', 56 * S);
  p.emoji(pool.x + pool.w * 0.3, pool.y + pool.h * 0.8, '🏐', 50 * S);
  // ladder down into it (that's the way in)
  const lx = X(0.715);
  for (const dx of [-22, 22]) p.line(lx + dx * S, pool.y + pool.h * 0.7, lx + dx * S, pool.y + pool.h + 60 * S, { sw: 1, stroke: '#9e9e9e' });
  for (let i = 0; i < 4; i++) p.line(lx - 22 * S, pool.y + pool.h * 0.78 + i * 34 * S, lx + 22 * S, pool.y + pool.h * 0.78 + i * 34 * S, { sw: 0.7, stroke: '#9e9e9e' });
  // the water slide: a ladder tower and a curly slide into the pool
  const sx = X(0.655), sy = Y(0.06);
  p.rect(sx - 40 * S, sy + 60 * S, 80 * S, Y(0.2), '#ffb74d', { sw: 1 });
  for (let i = 0; i < 7; i++) p.line(sx - 40 * S, sy + 90 * S + i * 60 * S, sx + 40 * S, sy + 90 * S + i * 60 * S, { sw: 0.6 });
  p.rect(sx - 55 * S, sy + 30 * S, 110 * S, 34 * S, '#ef6c00', { sw: 0.9 });
  p.path(`M ${sx + 40 * S} ${sy + 40 * S} C ${sx + 160 * S} ${sy - 40 * S} ${sx + 220 * S} ${sy + 120 * S} ${pool.x + 120 * S} ${pool.y + 150 * S}`,
    null, { sw: 6, stroke: '#e53935' });
  p.path(`M ${sx + 40 * S} ${sy + 40 * S} C ${sx + 160 * S} ${sy - 40 * S} ${sx + 220 * S} ${sy + 120 * S} ${pool.x + 120 * S} ${pool.y + 150 * S}`,
    null, { sw: 3.5, stroke: '#ffcdd2' });
  p.emoji(pool.x + 140 * S, pool.y + 170 * S, '💦', 50 * S);
}

// ---------------------------------------------------------------- the little splash pool (bottom left), with a slide
{
  const hs = cfg.hotspots.find(h => h.id === 'splash_pool');
  const x = X(hs.px), y = Y(hs.py), w = X(hs.pw), h = Y(hs.ph);
  const px0 = x + w * 0.05, py0 = y + h * 0.4, pw0 = w * 0.9, ph0 = h * 0.52;
  p.rect(px0 - 20 * S, py0 - 20 * S, pw0 + 40 * S, ph0 + 40 * S, '#e0e0e0', { r: 34 * S, sw: 1.1 });
  p.rect(px0, py0, pw0, ph0, '#81d4fa', { r: 24 * S, sw: 1 });
  for (let i = 0; i < 3; i++) {
    const ly = py0 + ph0 * (0.25 + i * 0.25), x0 = px0 + pw0 * 0.1, x1 = px0 + pw0 * 0.9;
    let d = `M ${x0} ${ly}`;
    for (let lx = x0; lx < x1; lx += 100 * S) d += ` Q ${lx + 25 * S} ${ly - 16 * S} ${lx + 50 * S} ${ly} T ${lx + 100 * S} ${ly}`;
    p.path(d, null, { sw: 0.5, stroke: '#0277bd' });
  }
  // the slide and its steps (like the drawing)
  const sx = x + w * 0.38, sy = y + h * 0.05;
  p.rect(sx + w * 0.08, sy + h * 0.12, w * 0.16, h * 0.3, '#ffee58', { sw: 0.9 });
  for (let i = 0; i < 4; i++) p.line(sx + w * 0.08, sy + h * (0.18 + i * 0.06), sx + w * 0.24, sy + h * (0.18 + i * 0.06), { sw: 0.5 });
  p.path(`M ${sx + w * 0.08} ${sy + h * 0.14} Q ${sx - w * 0.06} ${sy} ${sx - w * 0.14} ${py0 + ph0 * 0.25}`, null, { sw: 5, stroke: '#42a5f5' });
  p.path(`M ${sx + w * 0.08} ${sy + h * 0.14} Q ${sx - w * 0.06} ${sy} ${sx - w * 0.14} ${py0 + ph0 * 0.25}`, null, { sw: 2.5, stroke: '#bbdefb' });
  p.emoji(px0 + pw0 * 0.7, py0 + ph0 * 0.5, '🐳', 56 * S);
  p.emoji(px0 + pw0 * 0.3, py0 + ph0 * 0.65, '🦆', 40 * S);
}

// ---------------------------------------------------------------- the shopping square (bottom right): bank + armor shop
{
  const x = X(0.68), y = Y(0.62), w = X(0.31), h = Y(0.365);
  p.rect(x, y, w, h, '#e0dccf', { sw: 1.2, r: 30 * S });
  for (let gx = x + 60 * S; gx < x + w; gx += 90 * S) p.line(gx, y + 10 * S, gx, y + h - 10 * S, { sw: 0.25, stroke: 'rgba(0,0,0,0.18)' });
  for (let gy = y + 60 * S; gy < y + h; gy += 90 * S) p.line(x + 10 * S, gy, x + w - 10 * S, gy, { sw: 0.25, stroke: 'rgba(0,0,0,0.18)' });
  // (the bank is drawn by the game, in its hotspot's box)
  // a fountain in the middle of the square
  const fx = X(0.8), fy = Y(0.9);
  p.ellipse(fx, fy, 120 * S, 60 * S, '#b0bec5', { sw: 1 });
  p.ellipse(fx, fy, 95 * S, 44 * S, '#4fc3f7', { sw: 0.8 });
  p.emoji(fx, fy - 30 * S, '⛲', 80 * S);
  p.emoji(X(0.7), Y(0.94), '🌷', 40 * S);
  p.emoji(X(0.96), Y(0.95), '🌷', 40 * S);
}
// the armor shop: a stone smithy with a shield sign
{
  const hs = cfg.hotspots.find(h => h.id === 'armor_shop');
  const x = X(hs.px), y = Y(hs.py), w = X(hs.pw), h = Y(hs.ph);
  p.rect(x + w * 0.06, y + h * 0.3, w * 0.88, h * 0.7, '#90a4ae', { sw: 1.1 });
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
    if ((r + c) % 3) continue;
    p.rect(x + w * (0.08 + c * 0.145) + (r % 2) * 10 * S, y + h * (0.33 + r * 0.11), w * 0.12, h * 0.08, '#b0bec5', { sw: 0.3 });
  }
  // blue and silver striped awning, slate roof
  for (let i = 0; i < 7; i++) {
    p.poly([[x + w * i / 7, y + h * 0.22], [x + w * (i + 1) / 7, y + h * 0.22], [x + w * (i + 1) / 7, y + h * 0.36], [x + w * (i + 0.5) / 7, y + h * 0.4], [x + w * i / 7, y + h * 0.36]],
      i % 2 ? '#eceff1' : '#1e88e5', { sw: 0.5 });
  }
  p.poly([[x - w * 0.02, y + h * 0.22], [x + w * 0.5, y], [x + w * 1.02, y + h * 0.22]], '#455a64', { sw: 1 });
  // sign: a shield
  p.path(`M ${x + w * 0.4} ${y + h * 0.05} L ${x + w * 0.6} ${y + h * 0.05} L ${x + w * 0.6} ${y + h * 0.13} Q ${x + w * 0.5} ${y + h * 0.21} ${x + w * 0.4} ${y + h * 0.13} Z`, '#ffd54f', { sw: 0.6 });
  p.emoji(x + w * 0.5, y + h * 0.115, '🛡️', h * 0.1);
  // shop window with armor on show
  p.rect(x + w * 0.52, y + h * 0.5, w * 0.36, h * 0.26, '#b3e5fc', { sw: 0.8 });
  p.emoji(x + w * 0.62, y + h * 0.63, '🛡️', h * 0.12);
  p.emoji(x + w * 0.79, y + h * 0.63, '🪖', h * 0.12);
  // door (drawn closed; the game swings it open)
  const d = hs.door;
  p.rect(X(d.px), Y(d.py), X(d.pw), Y(d.ph), d.color, { sw: 0.9 });
  p.circle(X(d.px + d.pw * 0.8), Y(d.py + d.ph * 0.52), w * 0.015, '#ffd54f', { sw: 0.4 });
  // a suit of armor standing outside
  p.emoji(x + w * 1.0, y + h * 0.85, '🪖', h * 0.12);
}

// ---------------------------------------------------------------- trees and flowers
for (const [fx, fy, s] of [[0.03, 0.47, 1], [0.03, 0.66, 0.8], [0.6, 0.86, 0.8], [0.6, 0.12, 0.7], [0.97, 0.38, 0.8],
  [0.3, 0.97, 0.7], [0.75, 0.52, 0.9], [0.57, 0.97, 0.7]]) {
  const x = X(fx), y = Y(fy);
  p.rect(x - 12 * S * s, y - 10 * S, 24 * S * s, 70 * S * s, '#6d4c41', { sw: 0.7 });
  p.circle(x, y - 40 * S * s, 70 * S * s, '#66bb6a', { sw: 0.9 });
  p.circle(x - 40 * S * s, y - 20 * S * s, 46 * S * s, '#81c784', { sw: 0.7 });
}
for (let i = 0; i < 26; i++) {
  const spots = [[0.02, 0.5, 0.2, 0.2], [0.7, 0.42, 0.28, 0.14], [0.27, 0.8, 0.14, 0.15], [0.52, 0.8, 0.12, 0.15]];
  const [x0, y0, w0, h0] = spots[i % spots.length];
  p.emoji(X(x0 + rnd() * w0), Y(y0 + rnd() * h0), ['🌼', '🌷', '🍄', '🪨'][i % 4], (26 + rnd() * 14) * S);
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
</defs>`;
// marker streaks over a pen's colours only (the castle's fills, painted again with the streaks)
const streaked = pen => `<g filter="url(#wobFill)">${pen.fill.join('\n').replace(/fill="(?!none)[^"]*"/g, 'fill="url(#streaks)"')}</g>\n`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${defs}\n` +
  `<rect width="${W}" height="${H}" fill="#fbfaf4"/>\n` +
  `<g filter="url(#wobFill)">${base.fill.join('\n')}</g>\n` +
  `<rect width="${W}" height="${H}" fill="url(#streaks)"/>\n` +
  `<g filter="url(#wobInk)">${base.ink.join('\n')}</g>\n` +
  `<g>${base.top.join('\n')}</g>\n` +
  `<g filter="url(#wobFill)">${castlePen.fill.join('\n')}</g>\n` + streaked(castlePen) +
  `<g filter="url(#wobInk)">${castlePen.ink.join('\n')}</g>\n` +
  `<g>${castlePen.top.join('\n')}</g>\n` +
  `<rect x="${4 * S}" y="${4 * S}" width="${W - 8 * S}" height="${H - 8 * S}" fill="none" stroke="${SCENE_INK}" stroke-width="${10 * S}"/>\n` +
  '</svg>\n';
fs.writeFileSync(path.join(ROOT, 'assets/camp_level3.svg'), svg);
console.log(`wrote assets/camp_level3.svg (${(svg.length / 1024).toFixed(0)} KB)`);
