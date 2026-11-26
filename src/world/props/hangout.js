// --- Scene props: the Hangout House (assets/hangout_house.json) ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
  // A string of triangle flags sagging across the wall. colors: ["#e53935", ...]
  bunting(p, b, o) {
    const { x, y, w, h } = b;
    const colors = o.colors || ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
    const sag = h * 0.35;
    const at = t => [x + w * t, y + sag * 4 * t * (1 - t)];   // the string's curve
    p.path(`M ${x} ${y} Q ${x + w / 2} ${y + sag * 2} ${x + w} ${y}`, null, { sw: 0.5 });
    const n = o.flags || 12;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = at((i + 0.15) / n), [x1, y1] = at((i + 0.85) / n);
      p.poly([[x0, y0], [x1, y1], [(x0 + x1) / 2, (y0 + y1) / 2 + h * 0.6]], colors[i % colors.length], { sw: 0.5 });
    }
  },

  // A big squashy couch. pillows: ["#ffca28", "#ef5350"] (throw pillows, left to right)
  couch(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const c = o.color || '#5c6bc0', dark = o.dark || '#3949ab';
    p.rect(x + w * 0.05, y, w * 0.9, h * 0.6, c, { r: 34 * S });                  // back
    for (let i = 1; i <= 3; i++) p.circle(x + w * i / 4, y + h * 0.26, 6 * S, dark, { sw: 0.4 });   // buttons
    const pillows = o.pillows || [];
    pillows.forEach((col, i) => {
      const px = x + w * (pillows.length === 1 ? 0.5 : 0.2 + 0.6 * i / (pillows.length - 1));
      const py = y + h * 0.36, ps = h * 0.3;
      p.group(`rotate(${i % 2 ? 12 : -12} ${px} ${py})`, () => {
        p.rect(px - ps / 2, py - ps / 2, ps, ps, col, { r: 16 * S, sw: 0.7 });
        p.circle(px, py, ps * 0.08, 'rgba(0,0,0,0.25)', { ink: false });
      });
    });
    const n = o.cushions || 3, cw = w * 0.74 / n;
    for (let i = 0; i < n; i++) p.rect(x + w * 0.13 + i * cw, y + h * 0.5, cw, h * 0.2, c, { r: 16 * S, sw: 0.8 });   // seat
    p.rect(x + w * 0.06, y + h * 0.66, w * 0.88, h * 0.2, dark, { r: 10 * S });       // front
    for (const ax of [0, 0.86]) p.rect(x + w * ax, y + h * 0.34, w * 0.14, h * 0.52, c, { r: 26 * S });   // arms
    for (const lx of [0.1, 0.86]) p.rect(x + w * lx, y + h * 0.86, w * 0.04, h * 0.14, '#5d4037', { sw: 0.6 });
  },

  // Round striped rug (concentric rings, outside in). colors: [...]
  rug(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const colors = o.colors || ['#ffb74d', '#4db6ac', '#f06292', '#fff59d'];
    for (const side of [-1, 1]) {
      for (let i = -3; i <= 3; i++) {
        const fy = y + h / 2 + i * h * 0.08;
        p.line(x + w / 2 + side * w / 2, fy, x + w / 2 + side * (w / 2 + 22 * S), fy, { sw: 0.35 });   // fringe
      }
    }
    colors.forEach((col, i) => {
      const k = 1 - i / colors.length;
      p.ellipse(x + w / 2, y + h / 2, w / 2 * k, h / 2 * k, col, { sw: i ? 0.35 : 0.8 });
    });
  },

  // Low coffee table with a board game set up on it. items: emojis by the board
  coffeeTable(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const wood = o.color || '#a0673a';
    for (const lx of [0.06, 0.88]) p.rect(x + w * lx, y + h * 0.3, w * 0.06, h * 0.7, '#7a4a2a', { sw: 0.6 });
    p.rect(x, y + h * 0.15, w, h * 0.22, wood, { r: 8 * S });
    const bx = x + w * 0.18, bw = w * 0.42, by = y - h * 0.2, bh = h * 0.38;
    p.poly([[bx + bw * 0.08, by], [bx + bw * 0.92, by], [bx + bw, by + bh], [bx, by + bh]], '#ffffff', { sw: 0.6 });   // board
    const n = 6;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < n; c++) {
        if ((r + c) % 2) continue;
        const t0 = r / 3, t1 = (r + 1) / 3;
        const l = t => bx + bw * 0.08 * (1 - t), rr = t => bx + bw - bw * 0.08 * (1 - t);
        const cx = (t, f) => l(t) + (rr(t) - l(t)) * f;
        p.poly([[cx(t0, c / n), by + bh * t0], [cx(t0, (c + 1) / n), by + bh * t0],
                [cx(t1, (c + 1) / n), by + bh * t1], [cx(t1, c / n), by + bh * t1]], o.board || '#e53935', { ink: false });
      }
    }
    (o.items || []).forEach((e, i) => p.emoji(x + w * (0.72 + 0.12 * i), y - h * 0.02, e, h * 0.36, { rotate: i % 2 ? 10 : -8 }));
  },

  // Tall shelf of board games. shelves: [[{ label, color } | "emoji", ...], ...] top to bottom;
  // games lie in a pile on the left, emojis sit on the right
  gameShelf(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const shelves = o.shelves || [];
    p.rect(x, y, w, h, o.color || '#8b5a2b', { r: 6 * S });
    const m = w * 0.07, rowH = (h - m * 2) / Math.max(1, shelves.length);
    shelves.forEach((row, ri) => {
      const ry = y + m + ri * rowH;
      p.rect(x + m, ry, w - m * 2, rowH, '#5d3a1a', { ink: false });               // dark inside
      p.rect(x + m * 0.5, ry + rowH - 10 * S, w - m, 12 * S, '#a0673a', { sw: 0.5 });   // shelf board
      const games = row.filter(g => typeof g === 'object'), stickers = row.filter(g => typeof g === 'string');
      const gw = (w - m * 2) * (stickers.length ? 0.66 : 0.9), gh = Math.min(rowH * 0.24, rowH * 0.8 / Math.max(1, games.length));
      games.forEach((g, gi) => {
        const gx = x + m + 6 * S + (gi % 2 ? 6 * S : 0), gy = ry + rowH - 10 * S - gh * (gi + 1);
        p.rect(gx, gy, gw, gh, g.color || '#fdd835', { r: 3 * S, sw: 0.5 });
        if (g.label) p.text(gx + gw / 2, gy + gh / 2, g.label, { size: Math.min(gh * 0.62, gw / (g.label.length * 0.6)), color: g.textColor || '#ffffff' });
      });
      stickers.forEach((e, si) => {
        const ex = x + w - m - (w - m * 2) * 0.17 - si * (w - m * 2) * 0.3;
        p.emoji(ex, ry + rowH * 0.58, e, Math.min(rowH * 0.55, (w - m * 2) * 0.3));
      });
    });
  },

  // Wooden toy chest with its lid flipped open and `peek` toys poking out
  toyChest(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const top = y + h * 0.4;
    const wood = o.color || '#c62828';
    p.poly([[x + w * 0.02, top], [x + w * 0.98, top], [x + w * 0.92, y - h * 0.08], [x + w * 0.08, y - h * 0.08]], o.lid || '#e05a4f', { sw: 0.8 });   // open lid
    p.rect(x + w * 0.1, y, w * 0.8, (top - y) * 0.7, 'rgba(0,0,0,0.25)', { r: 6 * S, ink: false });                                 // its inside
    (o.peek || []).forEach((e, i, arr) => {
      p.emoji(x + w * (i + 0.5) / arr.length, top - h * 0.05, e, h * 0.4, { under: true, rotate: (i % 2 ? 14 : -12) });
    });
    p.rect(x, top, w, y + h - top, wood, { r: 6 * S, sw: 0.9 });
    for (const f of [0.12, 0.88]) p.rect(x + w * f - w * 0.035, top, w * 0.07, y + h - top, '#fdd835', { sw: 0.5 });   // metal bands
    p.star(x + w / 2, top + (y + h - top) * 0.5, (y + h - top) * 0.24, '#fff59d', { sw: 0.5 });
    if (o.label) p.text(x + w / 2, top + (y + h - top) * 0.84, o.label, { size: (y + h - top) * 0.16, color: '#fff8e1' });
  },

  // Squashy bean bag
  beanBag(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.path(`M ${x} ${y + h * 0.9} Q ${x - w * 0.04} ${y + h * 0.25} ${x + w * 0.45} ${y} ` +
      `Q ${x + w * 1.05} ${y + h * 0.1} ${x + w} ${y + h * 0.9} Q ${x + w / 2} ${y + h * 1.04} ${x} ${y + h * 0.9} Z`,
      o.color || '#ab47bc', { sw: 0.9 });
    p.path(`M ${x + w * 0.25} ${y + h * 0.5} Q ${x + w * 0.5} ${y + h * 0.66} ${x + w * 0.78} ${y + h * 0.48}`, null, { sw: 0.4 });   // dent
    p.path(`M ${x + w * 0.3} ${y + h * 0.15} Q ${x + w * 0.45} ${y + h * 0.07} ${x + w * 0.6} ${y + h * 0.12}`, null,
      { layer: 'fill', stroke: '#fff', sw: 1.2, opacity: 0.6 });
  },
});
