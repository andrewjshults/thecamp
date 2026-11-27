#!/usr/bin/env node
// Draws the fourth camp's map, assets/camp_level4.svg, in the same marker
// style as the other camps' maps and the `scene` rooms (wobbly ink, streaky
// colour, emoji stickers): it borrows the game's own pen (scenePen in
// src/world/scene.js).
//
//   node tools/make-level4-map.js
//
// The layout follows Louisa's drawing of the fourth camp: the swimming pool
// top left, the Slime Brick's slime pit (rings and rings of goo) in the
// middle, the bank top right, the Safe Zone (where the code finder lives) on
// the left, Charlie's Armor & Swords shop bottom left, the bathroom (boys and
// girls) bottom middle, the Slime Brick's throne on the right with its key
// hanging outside, and the Slime Brick's den bottom right. Hotspots for all
// of these (and the pit's shape, `slimePit`, and the safe zone's yard) are in
// assets/camp_level4.json: move them together if you move something here.
// The bank and the keypads by the doors are drawn by the game. No words on
// the map.
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
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/camp_level4.json'), 'utf8'));
const PIT = cfg.slimePit;
const SAFE = cfg.slimeBrick.safeZones[0];
const hs = id => cfg.hotspots.find(h => h.id === id);
const box = id => { const h = hs(id); return { x: X(h.px), y: Y(h.py), w: X(h.pw), h: Y(h.ph), d: h.door }; };

// Tiny seeded random, so the map comes out the same every time
let seed = 41;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const inPit = (x, y, grow = 0) => ((x - X(PIT.cx)) / (X(PIT.rx) + grow)) ** 2 + ((y - Y(PIT.cy)) / (Y(PIT.ry) + grow)) ** 2 < 1;
const SLIME = '#8bc34a', SLIME_DARK = '#33691e', GOO = '#c6ff00';

// ---------------------------------------------------------------- grass everywhere, with slimy puddles
p.rect(0, 0, W, H, '#b5d98a', { ink: false });
for (let i = 0; i < 34; i++) {
  const x = rnd() * W, y = rnd() * H;
  p.ellipse(x, y, (110 + rnd() * 170) * S, (45 + rnd() * 70) * S, i % 2 ? 'rgba(124, 179, 66, 0.4)' : 'rgba(220, 237, 200, 0.5)', { ink: false });
}
// (not in the pit, and not on the buildings: [x0, y0, x1, y1] fractions)
const BUILT = [[0, 0, 0.27, 0.28], [0.02, 0.32, 0.23, 0.5], [0.06, 0.48, 0.4, 1], [0.38, 0.6, 0.7, 1], [0.72, 0.28, 0.99, 0.75],
  [0.75, 0.02, 0.92, 0.22], [0.72, 0.76, 0.98, 1]];
for (let i = 0; i < 240; i++) {
  const x = rnd() * W, y = rnd() * H;
  if (inPit(x, y, 80 * S) || BUILT.some(([x0, y0, x1, y1]) => x > X(x0) && x < X(x1) && y > Y(y0) && y < Y(y1))) continue;
  for (const d of [-1, 0, 1]) p.line(x, y, x + d * 7 * S, y - (14 + (d ? 0 : 6)) * S, { sw: 0.3, stroke: '#558b2f' });
}

// ---------------------------------------------------------------- trails (in the fill layer first, so buildings sit on top)
const ROAD = '#d7b27a', ROAD_DARK = '#8b5a2b';
function trail(d, wide = 150) {
  p.fill.push(`<path d="${d}" fill="none" stroke="${ROAD_DARK}" stroke-width="${(wide + 16) * S}" stroke-linecap="round" stroke-linejoin="round"/>`);
  p.fill.push(`<path d="${d}" fill="none" stroke="${ROAD}" stroke-width="${wide * S}" stroke-linecap="round" stroke-linejoin="round"/>`);
}
const back = box('passage_back');
const bx = back.x + back.w / 2, by = back.y + back.h * 0.6;
// round the slime pit's bottom: west to the safe zone and the shop, east to the throne and the bank
trail(`M ${bx} ${by} C ${X(0.5)} ${Y(0.66)} ${X(0.36)} ${Y(0.62)} ${X(0.3)} ${Y(0.56)} S ${X(0.22)} ${Y(0.5)} ${X(0.19)} ${Y(0.5)}`);
trail(`M ${X(0.3)} ${Y(0.56)} C ${X(0.27)} ${Y(0.48)} ${X(0.24)} ${Y(0.36)} ${X(0.16)} ${Y(0.3)}`);
trail(`M ${bx} ${by} C ${X(0.66)} ${Y(0.62)} ${X(0.69)} ${Y(0.5)} ${X(0.69)} ${Y(0.4)} S ${X(0.74)} ${Y(0.24)} ${X(0.83)} ${Y(0.2)}`);
trail(`M ${X(0.69)} ${Y(0.42)} C ${X(0.74)} ${Y(0.44)} ${X(0.8)} ${Y(0.44)} ${X(0.86)} ${Y(0.46)}`, 110);
// the bathroom's and the shop's doors along the bottom
trail(`M ${bx} ${by} C ${X(0.58)} ${Y(0.7)} ${X(0.56)} ${Y(0.72)} ${X(0.53)} ${Y(0.72)}`, 120);
// the slimy road from the throne down to the den (the wavy lines in the drawing)
{
  const d = `M ${X(0.86)} ${Y(0.72)} C ${X(0.8)} ${Y(0.76)} ${X(0.76)} ${Y(0.74)} ${X(0.72)} ${Y(0.8)} S ${X(0.74)} ${Y(0.9)} ${X(0.8)} ${Y(0.9)}`;
  p.fill.push(`<path d="${d}" fill="none" stroke="${SLIME_DARK}" stroke-width="${136 * S}" stroke-linecap="round"/>`);
  p.fill.push(`<path d="${d}" fill="none" stroke="${SLIME}" stroke-width="${120 * S}" stroke-linecap="round"/>`);
  p.fill.push(`<path d="${d}" fill="none" stroke="${GOO}" stroke-width="${30 * S}" stroke-linecap="round" stroke-dasharray="${60 * S} ${90 * S}" opacity="0.8"/>`);
}
for (let i = 0; i < 40; i++) {
  const t = rnd();
  p.circle(X(0.3 + t * 0.35) + rnd() * 40 * S, Y(0.58 + Math.sin(t * 3) * 0.04) + rnd() * 40 * S, (4 + rnd() * 5) * S, ROAD_DARK, { ink: false, opacity: 0.4 });
}

// ---------------------------------------------------------------- the swimming pool (top left), with a fence and a gate
{
  const fx = X(0.008), fy = Y(0.012), fw = X(0.255), fh = Y(0.262);
  p.rect(fx, fy, fw, fh, '#e0e0e0', { sw: 1.1, r: 20 * S });
  const pool = { x: fx + 50 * S, y: fy + 50 * S, w: fw - 100 * S, h: fh - 210 * S };
  p.rect(pool.x, pool.y, pool.w, pool.h, '#4fc3f7', { r: 26 * S, sw: 1 });
  for (let i = 0; i < 4; i++) {
    const y = pool.y + pool.h * (0.18 + i * 0.22), x0 = pool.x + pool.w * 0.08, x1 = pool.x + pool.w * 0.92;
    let d = `M ${x0} ${y}`;
    for (let x = x0; x < x1; x += 120 * S) d += ` Q ${x + 30 * S} ${y - 22 * S} ${x + 60 * S} ${y} T ${x + 120 * S} ${y}`;
    p.path(d, null, { sw: 0.6, stroke: '#0277bd' });
  }
  // the hump in the drawing: a little slide at the side of the pool
  p.path(`M ${pool.x + pool.w * 0.05} ${pool.y + pool.h} Q ${pool.x + pool.w * 0.15} ${pool.y + pool.h * 0.3} ${pool.x + pool.w * 0.32} ${pool.y + pool.h * 0.85}`, null, { sw: 5, stroke: '#ffb300' });
  p.emoji(pool.x + pool.w * 0.6, pool.y + pool.h * 0.5, '🛟', 64 * S);
  p.emoji(pool.x + pool.w * 0.84, pool.y + pool.h * 0.3, '🦦', 56 * S);
  // fence posts along the bottom, with a gap for the gate
  const gate = box('pool_gate');
  for (let x = fx + 20 * S; x < fx + fw; x += 46 * S) {
    if (x > gate.x - 10 * S && x < gate.x + gate.w + 10 * S) continue;
    p.rect(x, fy + fh - 70 * S, 16 * S, 70 * S, '#ffffff', { sw: 0.5 });
  }
  p.line(fx, fy + fh - 50 * S, gate.x - 10 * S, fy + fh - 50 * S, { sw: 0.6 });
  p.line(gate.x + gate.w + 10 * S, fy + fh - 50 * S, fx + fw, fy + fh - 50 * S, { sw: 0.6 });
  p.rect(gate.x + gate.w * 0.1, gate.y + gate.h * 0.3, gate.w * 0.8, gate.h * 0.55, 'rgba(255,255,255,0.4)', { sw: 0.7 });
  for (let i = 1; i < 5; i++) p.line(gate.x + gate.w * (0.1 + i * 0.16), gate.y + gate.h * 0.3, gate.x + gate.w * (0.1 + i * 0.16), gate.y + gate.h * 0.85, { sw: 0.5 });
  p.emoji(gate.x + gate.w / 2, gate.y + gate.h * 0.2, '🏊', 44 * S);
}

// ---------------------------------------------------------------- the slime pit (middle): a goopy blob with rings and rings of slime
{
  const cx = X(PIT.cx), cy = Y(PIT.cy), rx = X(PIT.rx), ry = Y(PIT.ry);
  // the wobbly outline round the pit (like the big blob in the drawing)
  let d = '';
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1.13 + 0.06 * Math.sin(i * 2.7) + (i === 3 || i === 4 ? 0.12 : 0);
    const x = cx + Math.cos(a) * rx * k, y = cy + Math.sin(a) * ry * k;
    d += i ? ` L ${x.toFixed(1)} ${y.toFixed(1)}` : `M ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  p.path(d + ' Z', '#827717', { sw: 1.2 });
  // the rings, from the outside in
  const rings = ['#9ccc65', '#7cb342', '#aed581', '#689f38', '#c5e1a5', '#558b2f'];
  rings.forEach((c, i) => {
    const k = 1 - i * 0.16;
    p.ellipse(cx + i * 6 * S, cy + i * 8 * S, rx * k, ry * k, c, { sw: 0.9 });
  });
  // the bubble in the very middle (the little "e" in the drawing)
  p.circle(cx + 40 * S, cy + 50 * S, 46 * S, GOO, { sw: 0.9 });
  p.path(`M ${cx + 20 * S} ${cy + 50 * S} A ${26 * S} ${26 * S} 0 1 1 ${cx + 60 * S} ${cy + 60 * S}`, null, { sw: 0.6 });
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 0.2 + rnd() * 0.75;
    p.circle(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, (8 + rnd() * 14) * S, 'rgba(238, 255, 65, 0.85)', { sw: 0.35, stroke: SLIME_DARK });
  }
  p.emoji(cx - rx * 0.55, cy - ry * 0.3, '🫧', 54 * S);
  p.emoji(cx + rx * 0.6, cy + ry * 0.35, '🫧', 46 * S);
  p.emoji(cx - rx * 0.2, cy + ry * 0.7, '🧱', 50 * S);
  // drips off the edge
  for (const a of [0.4, 1.3, 2.2, 2.9]) {
    const x = cx + Math.cos(a) * rx * 1.12, y = cy + Math.sin(a) * ry * 1.12;
    p.path(`M ${x - 18 * S} ${y} Q ${x} ${y + 60 * S} ${x + 18 * S} ${y}`, '#9ccc65', { sw: 0.6 });
  }
}

// ---------------------------------------------------------------- the bank's plot (the game draws the bank in its box)
{
  const b = box('bank');
  p.rect(b.x - 40 * S, b.y + b.h * 0.8, b.w + 80 * S, b.h * 0.3, '#e0dccf', { sw: 1, r: 20 * S });
  p.emoji(b.x - 70 * S, b.y + b.h * 0.85, '🌷', 40 * S);
  p.emoji(b.x + b.w + 70 * S, b.y + b.h * 0.85, '🌷', 40 * S);
  // the "$10" from the drawing: a big coin sign out front
  p.line(b.x + b.w + 140 * S, b.y + b.h * 0.95, b.x + b.w + 140 * S, b.y + b.h * 0.4, { sw: 0.9, stroke: '#5d4037' });
  p.circle(b.x + b.w + 140 * S, b.y + b.h * 0.35, 60 * S, '#ffd54f', { sw: 1 });
  p.emoji(b.x + b.w + 140 * S, b.y + b.h * 0.35, '🪙', 70 * S);
}

// ---------------------------------------------------------------- the Safe Zone (left): a green house with a fenced yard
{
  const z = { x: X(SAFE.px), y: Y(SAFE.py), w: X(SAFE.pw), h: Y(SAFE.ph) };
  p.rect(z.x, z.y, z.w, z.h, 'rgba(129, 212, 250, 0.45)', { sw: 0.8, r: 26 * S });
  // a picket fence round the yard (the Slime Brick stops here)
  for (let x = z.x + 16 * S; x < z.x + z.w - 10 * S; x += 44 * S) {
    p.poly([[x, z.y + z.h], [x, z.y + z.h - 46 * S], [x + 9 * S, z.y + z.h - 58 * S], [x + 18 * S, z.y + z.h - 46 * S], [x + 18 * S, z.y + z.h]], '#ffffff', { sw: 0.45 });
  }
  const b = box('safe_zone');
  p.rect(b.x, b.y + b.h * 0.12, b.w, b.h * 0.88, '#a5d6a7', { sw: 1.3 });
  for (let i = 1; i < 5; i++) p.line(b.x, b.y + b.h * (0.12 + i * 0.18), b.x + b.w, b.y + b.h * (0.12 + i * 0.18), { sw: 0.25, stroke: 'rgba(27, 94, 32, 0.4)' });
  p.rect(b.x - 16 * S, b.y, b.w + 32 * S, b.h * 0.14, '#2e7d32', { sw: 1.1 });
  // a big shield sign, and a window with the code finder looking out
  p.path(`M ${b.x + b.w * 0.12} ${b.y + b.h * 0.25} L ${b.x + b.w * 0.4} ${b.y + b.h * 0.25} L ${b.x + b.w * 0.4} ${b.y + b.h * 0.5} Q ${b.x + b.w * 0.26} ${b.y + b.h * 0.72} ${b.x + b.w * 0.12} ${b.y + b.h * 0.5} Z`, '#ffd54f', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.26, b.y + b.h * 0.42, '🛡️', b.h * 0.22);
  p.rect(b.x + b.w * 0.48, b.y + b.h * 0.27, b.w * 0.2, b.h * 0.26, '#b3e5fc', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.58, b.y + b.h * 0.42, '🤖', b.h * 0.18);
  p.rect(X(b.d.px), Y(b.d.py), X(b.d.pw), Y(b.d.ph), b.d.color, { sw: 0.9 });
  p.circle(X(b.d.px + b.d.pw * 0.8), Y(b.d.py + b.d.ph * 0.55), 7 * S, '#ffd54f', { sw: 0.4 });
  p.emoji(b.x + b.w * 0.1, b.y + b.h * 1.0, '🌻', 40 * S);
}

// ---------------------------------------------------------------- Charlie's Armor & Swords (bottom left): a tall house with a pointy roof
{
  const b = box('charlie_shop');
  const roofTop = b.y - Y(0.06), wallTop = b.y + b.h * 0.12;
  p.rect(b.x, wallTop, b.w, b.y + b.h - wallTop, '#ffe0b2', { sw: 1.3 });
  p.poly([[b.x - 24 * S, wallTop + 10 * S], [b.x + b.w / 2, roofTop], [b.x + b.w + 24 * S, wallTop + 10 * S]], '#8d6e63', { sw: 1.2 });
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    p.line(b.x + b.w / 2 - (b.w / 2 + 24 * S) * t, roofTop + (wallTop - roofTop) * t, b.x + b.w / 2 + (b.w / 2 + 24 * S) * t, roofTop + (wallTop - roofTop) * t, { sw: 0.35, stroke: 'rgba(62, 39, 35, 0.5)' });
  }
  // the wavy line under the sign
  let d = `M ${b.x + b.w * 0.15} ${b.y + b.h * 0.28}`;
  for (let x = b.x + b.w * 0.15; x < b.x + b.w * 0.85; x += 80 * S) d += ` q ${20 * S} ${-24 * S} ${40 * S} 0 t ${40 * S} 0`;
  p.path(d, null, { sw: 0.8, stroke: '#5d4037' });
  // a big sword hanging down the front, a shield with a star, and the star flag
  p.emoji(b.x + b.w * 0.5, b.y + b.h * 0.12, '⚔️', b.h * 0.12);
  p.path(`M ${b.x + b.w * 0.7} ${b.y + b.h * 0.2} L ${b.x + b.w * 0.88} ${b.y + b.h * 0.2} L ${b.x + b.w * 0.88} ${b.y + b.h * 0.3} Q ${b.x + b.w * 0.79} ${b.y + b.h * 0.38} ${b.x + b.w * 0.7} ${b.y + b.h * 0.3} Z`, '#ef9a9a', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.79, b.y + b.h * 0.27, '⭐', b.h * 0.06);
  p.line(b.x + b.w * 0.55, b.y + b.h * 0.58, b.x + b.w * 0.72, b.y + b.h * 0.34, { sw: 1, stroke: '#5d4037' });
  p.poly([[b.x + b.w * 0.6, b.y + b.h * 0.5], [b.x + b.w * 0.77, b.y + b.h * 0.36], [b.x + b.w * 0.84, b.y + b.h * 0.47], [b.x + b.w * 0.68, b.y + b.h * 0.6]], '#90caf9', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.72, b.y + b.h * 0.48, '⭐', b.h * 0.06);
  p.emoji(b.x + b.w * 0.85, b.y + b.h * 0.78, '🗡️', b.h * 0.12, { rotate: -30 });
  // the shop window
  p.rect(b.x + b.w * 0.08, b.y + b.h * 0.42, b.w * 0.3, b.h * 0.2, '#b3e5fc', { sw: 0.8 });
  p.emoji(b.x + b.w * 0.16, b.y + b.h * 0.52, '🛡️', b.h * 0.08);
  p.emoji(b.x + b.w * 0.3, b.y + b.h * 0.52, '🪖', b.h * 0.08);
  // the big arched door with planks (drawn closed; the game swings it open)
  const dx = X(b.d.px), dy = Y(b.d.py), dw = X(b.d.pw), dh = Y(b.d.ph);
  p.path(`M ${dx - 16 * S} ${dy + dh} L ${dx - 16 * S} ${dy + dw / 2} A ${dw / 2 + 16 * S} ${dw / 2 + 16 * S} 0 0 1 ${dx + dw + 16 * S} ${dy + dw / 2} L ${dx + dw + 16 * S} ${dy + dh} Z`, '#a1887f', { sw: 1 });
  p.rect(dx, dy, dw, dh, b.d.color, { sw: 1.1 });
  for (let i = 1; i < 4; i++) p.line(dx + dw * i / 4, dy, dx + dw * i / 4, dy + dh, { sw: 0.6, stroke: '#3e2723' });
  p.circle(dx + dw * 0.85, dy + dh * 0.55, 9 * S, '#ffd54f', { sw: 0.4 });
}

// ---------------------------------------------------------------- the bathroom (bottom middle): one house, boys on the left, girls on the right
{
  const boys = box('boys_bathroom'), girls = box('girls_bathroom');
  const x0 = boys.x - X(0.005), x1 = girls.x + girls.w + X(0.012);
  const top = Y(0.6), wall = boys.y;
  p.rect(x0, wall, x1 - x0, H - wall, '#fff9c4', { sw: 1.3 });
  p.poly([[x0 - 20 * S, wall + 10 * S], [(x0 + x1) / 2, top], [x1 + 20 * S, wall + 10 * S]], '#e57373', { sw: 1.2 });
  p.line((x0 + x1) / 2, top, (x0 + x1) / 2, H, { sw: 1 });
  p.emoji(boys.x + boys.w / 2, wall + Y(0.06), '👦', Y(0.05));
  p.emoji(girls.x + girls.w / 2, wall + Y(0.06), '👧', Y(0.05));
  p.emoji((x0 + x1) / 2, wall - Y(0.03), '🚻', Y(0.04));
  for (const b of [boys, girls]) {
    p.rect(X(b.d.px), Y(b.d.py), X(b.d.pw), Y(b.d.ph), '#ffffff', { sw: 0.9 });
    p.circle(X(b.d.px + b.d.pw * 0.2), Y(b.d.py + b.d.ph * 0.55), 7 * S, '#9e9e9e', { sw: 0.4 });
    p.rect(b.x + b.w * 0.1, wall + Y(0.1), b.w * 0.25, Y(0.04), '#b3e5fc', { sw: 0.5 });
  }
}

// ---------------------------------------------------------------- the trapdoor tunnel back up to the Brick's castle
{
  const cx = bx, cy = back.y + back.h * 0.5;
  p.ellipse(cx, cy, back.w * 0.55, back.h * 0.42, '#8d6e63', { sw: 1.1 });
  p.ellipse(cx, cy, back.w * 0.42, back.h * 0.3, '#1b0f0a', { sw: 1.1 });
  for (let i = 0; i < 3; i++) p.line(cx - back.w * 0.15, cy - back.h * 0.18 + i * back.h * 0.14, cx + back.w * 0.15, cy - back.h * 0.18 + i * back.h * 0.14, { sw: 0.6, stroke: '#a1887f' });
  p.emoji(cx + back.w * 0.7, cy - back.h * 0.3, '🧱', 40 * S);
}

// ---------------------------------------------------------------- the Slime Brick throne (right): two tall towers with the throne between
{
  const t = box('throne');
  const tw = X(0.05), top = Y(0.3), bottom = t.y + t.h + Y(0.02);
  const left = t.x - X(0.035), right = t.x + t.w + X(0.035);
  const WALL = '#7cb342', DRIP = '#c6ff00';
  // the middle wall, then the towers either side
  p.rect(left + tw * 0.5, t.y, right - left - tw, bottom - t.y, '#9ccc65', { sw: 1.2 });
  for (const x of [left, right - tw]) {
    p.rect(x, top, tw, bottom - top, WALL, { sw: 1.3 });
    for (let r = 1; top + r * 34 * S < bottom; r++) p.line(x, top + r * 34 * S, x + tw, top + r * 34 * S, { sw: 0.25, stroke: 'rgba(30,60,10,0.5)' });
    // goo dripping off the top
    p.path(`M ${x} ${top} L ${x + tw} ${top} L ${x + tw} ${top + 30 * S} Q ${x + tw * 0.8} ${top + 80 * S} ${x + tw * 0.65} ${top + 30 * S} Q ${x + tw * 0.4} ${top + 110 * S} ${x + tw * 0.2} ${top + 30 * S} Q ${x + tw * 0.1} ${top + 60 * S} ${x} ${top + 30 * S} Z`, DRIP, { sw: 0.7 });
  }
  // the throne inside: a big green seat with a crown above it (the drawing's crown in a box)
  const sx = t.x + t.w * 0.18, sy = t.y + t.h * 0.05, sw = t.w * 0.64, sh = t.h * 0.42;
  p.rect(sx, sy, sw, sh, '#33691e', { sw: 1, r: 18 * S });
  p.rect(sx + sw * 0.12, sy + sh * 0.18, sw * 0.76, sh * 0.62, '#aed581', { sw: 0.7, r: 12 * S });
  p.emoji(sx + sw / 2, sy + sh * 0.45, '👑', sh * 0.42);
  // the curly bits either side (the swirls in the drawing)
  p.path(`M ${sx} ${sy + sh * 0.3} q ${-50 * S} ${-10 * S} ${-40 * S} ${40 * S} q ${10 * S} ${30 * S} ${30 * S} ${10 * S}`, null, { sw: 0.9 });
  p.path(`M ${sx + sw} ${sy + sh * 0.3} q ${50 * S} ${-10 * S} ${40 * S} ${40 * S} q ${-10 * S} ${30 * S} ${-30 * S} ${10 * S}`, null, { sw: 0.9 });
  // the gate (drawn closed; the game swings it open), with a big keyhole
  const dx = X(t.d.px), dy = Y(t.d.py), dw = X(t.d.pw), dh = Y(t.d.ph);
  p.path(`M ${dx - 14 * S} ${dy + dh} L ${dx - 14 * S} ${dy + dw / 2} A ${dw / 2 + 14 * S} ${dw / 2 + 14 * S} 0 0 1 ${dx + dw + 14 * S} ${dy + dw / 2} L ${dx + dw + 14 * S} ${dy + dh} Z`, '#9e9e9e', { sw: 1 });
  p.rect(dx, dy, dw, dh, t.d.color, { sw: 1.1 });
  for (let i = 1; i < 4; i++) p.line(dx + dw * i / 4, dy, dx + dw * i / 4, dy + dh, { sw: 0.6, stroke: '#1b5e20' });
  p.circle(dx + dw / 2, dy + dh * 0.45, 12 * S, '#ffd54f', { sw: 0.5 });
  p.poly([[dx + dw / 2 - 6 * S, dy + dh * 0.45], [dx + dw / 2 + 6 * S, dy + dh * 0.45], [dx + dw / 2 + 9 * S, dy + dh * 0.58], [dx + dw / 2 - 9 * S, dy + dh * 0.58]], '#212121', { sw: 0.3 });
  // the key's curly hook, on the left tower (the game hangs the key on it)
  const k = box('key_hook');
  const hx = k.x + k.w * 0.6, hy = k.y + k.h * 0.2;
  p.rect(hx - 14 * S, hy - 20 * S, 40 * S, 20 * S, '#5d4037', { sw: 0.6 });
  p.path(`M ${hx} ${hy} q ${-30 * S} ${10 * S} ${-20 * S} ${40 * S} q ${10 * S} ${20 * S} ${26 * S} ${6 * S}`, null, { sw: 1.1, stroke: '#424242' });
}

// ---------------------------------------------------------------- the Slime Brick den (bottom right): a round hole of goo, with rays
{
  const b = box('slime_den');
  const cx = b.x + b.w / 2, cy = b.y + b.h * 0.55, rx = b.w * 0.38, ry = b.h * 0.36;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    p.line(cx + Math.cos(a) * rx * 1.15, cy + Math.sin(a) * ry * 1.15, cx + Math.cos(a) * rx * 1.45, cy + Math.sin(a) * ry * 1.45, { sw: 0.9 });
  }
  p.ellipse(cx, cy, rx, ry, '#558b2f', { sw: 1.2 });
  p.ellipse(cx, cy + ry * 0.08, rx * 0.8, ry * 0.72, '#1b2e0a', { sw: 1 });
  p.ellipse(cx, cy + ry * 0.3, rx * 0.6, ry * 0.25, 'rgba(198, 255, 0, 0.35)', { ink: false });
  for (const [fx, s] of [[-0.9, 44], [0.95, 40]]) p.emoji(cx + rx * fx, cy - ry * 0.9, '🦴', s * S);
}

// ---------------------------------------------------------------- trees and flowers
for (const [fx, fy, s] of [[0.3, 0.06, 0.9], [0.68, 0.06, 0.8], [0.97, 0.26, 0.8], [0.27, 0.32, 0.7], [0.68, 0.3, 0.7], [0.99, 0.66, 0.6]]) {
  const x = X(fx), y = Y(fy);
  p.rect(x - 12 * S * s, y - 10 * S, 24 * S * s, 70 * S * s, '#6d4c41', { sw: 0.7 });
  p.circle(x, y - 40 * S * s, 70 * S * s, '#66bb6a', { sw: 0.9 });
  p.circle(x - 40 * S * s, y - 20 * S * s, 46 * S * s, '#81c784', { sw: 0.7 });
}
for (let i = 0; i < 22; i++) {
  const spots = [[0.27, 0.12, 0.06, 0.18], [0.66, 0.1, 0.07, 0.15], [0.64, 0.34, 0.05, 0.12], [0.02, 0.52, 0.04, 0.4]];
  const [x0, y0, w0, h0] = spots[i % spots.length];
  p.emoji(X(x0 + rnd() * w0), Y(y0 + rnd() * h0), ['🌼', '🍄', '🌷', '🪨'][i % 4], (26 + rnd() * 14) * S);
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
fs.writeFileSync(path.join(ROOT, 'assets/camp_level4.svg'), svg);
console.log(`wrote assets/camp_level4.svg (${(svg.length / 1024).toFixed(0)} KB)`);
