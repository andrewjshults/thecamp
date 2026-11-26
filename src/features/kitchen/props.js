// --- Scene props: the kitchen (assets/camp_kitchen.json) ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
  fridge(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, o.color || '#f2f0ea', { r: 22 * S });
    p.line(x, y + h * 0.32, x + w, y + h * 0.32, { sw: 0.8 });
    p.rect(x + w * 0.8, y + h * 0.08, w * 0.07, h * 0.16, '#bdbdbd', { r: 6 * S, sw: 0.6 });
    p.rect(x + w * 0.8, y + h * 0.38, w * 0.07, h * 0.28, '#bdbdbd', { r: 6 * S, sw: 0.6 });
    // a kid's drawing taped to the door: sun, house, grass
    const dx = x + w * 0.12, dy = y + h * 0.42, dw = w * 0.56, dh = h * 0.2;
    p.group(`rotate(-4 ${dx + dw / 2} ${dy + dh / 2})`, () => {
      p.rect(dx, dy, dw, dh, '#ffffff', { sw: 0.5 });
      p.circle(dx + dw * 0.78, dy + dh * 0.25, dw * 0.1, '#fdd835', { sw: 0.4 });
      p.rect(dx + dw * 0.18, dy + dh * 0.45, dw * 0.3, dh * 0.35, '#e53935', { sw: 0.4 });
      p.poly([[dx + dw * 0.13, dy + dh * 0.47], [dx + dw * 0.33, dy + dh * 0.22], [dx + dw * 0.53, dy + dh * 0.47]], '#8b5a2b', { sw: 0.4 });
      p.rect(dx, dy + dh * 0.8, dw, dh * 0.2, '#66bb6a', { ink: false });
      p.rect(dx + dw * 0.3, dy - 8 * S, dw * 0.4, 16 * S, 'rgba(230,210,150,0.85)', { ink: false });
    });
    (o.magnets || []).forEach((m, i) => p.emoji(x + w * (0.2 + 0.28 * i), y + h * (0.1 + (i % 2) * 0.08), m, w * 0.17));
  },

  // Long countertop with cabinet doors underneath (blue, like Louisa's kitchen)
  counter(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const topH = h * 0.16;
    p.rect(x, y + topH, w, h - topH, o.color || '#29b6f6', { sw: 0.9 });
    const n = o.doors || Math.max(1, Math.round(w / (150 * S)));
    const dw = w / n;
    for (let i = 0; i < n; i++) {
      p.rect(x + i * dw + 10 * S, y + topH + 12 * S, dw - 20 * S, h - topH - 40 * S, 'rgba(255,255,255,0.18)', { r: 6 * S, sw: 0.5 });
      p.circle(x + i * dw + dw / 2, y + topH + 32 * S, 8 * S, '#eceff1', { sw: 0.5 });
    }
    p.rect(x + 8 * S, y + h - 16 * S, w - 16 * S, 16 * S, o.kick || '#0d6fa3', { ink: false });
    p.rect(x - 10 * S, y, w + 20 * S, topH, o.top || '#e6dcc6', { r: 6 * S });
  },

  // Dark cooktop strip sitting on the counter
  cooktop(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, '#3a3a3a', { r: 4 * S, sw: 0.7 });
    for (const f of o.burners || [0.25, 0.72]) {
      p.ellipse(x + w * f, y + h * 0.2, w * 0.17, h * 0.35, '#ff7043', { sw: 0.4, opacity: 0.9 });
    }
  },

  pot(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const c = o.color || '#90a4ae';
    p.rect(x - w * 0.06, y + h * 0.32, w * 0.14, h * 0.1, c, { r: 5 * S, sw: 0.6 });               // handles
    p.rect(x + w * 0.92, y + h * 0.32, w * 0.14, h * 0.1, c, { r: 5 * S, sw: 0.6 });
    p.rect(x + w * 0.04, y + h * 0.2, w * 0.92, h * 0.8, c, { r: 10 * S, sw: 0.9 });
    p.rect(x, y + h * 0.14, w, h * 0.12, c, { r: 6 * S, sw: 0.8 });                                // rim
    p.ellipse(x + w / 2, y + h * 0.17, w * 0.42, h * 0.05, '#4fc3f7', { sw: 0.4 });                 // water
    p.line(x + w * 0.15, y + h * 0.45, x + w * 0.15, y + h * 0.85, { layer: 'fill', stroke: '#fff', sw: 1.2, opacity: 0.6 });
  },

  pan(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x + w * 0.66, y + h * 0.15, w * 0.34, h * 0.32, '#6d4c41', { r: 6 * S, sw: 0.7 });       // handle
    p.path(`M ${x} ${y} L ${x + w * 0.7} ${y} L ${x + w * 0.62} ${y + h} L ${x + w * 0.08} ${y + h} Z`, o.color || '#37474f', { sw: 0.9 });
  },

  oven(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, o.color || '#f3e3c3', { r: 8 * S, sw: 0.9 });
    p.rect(x, y, w, h * 0.2, '#d7c4a0', { r: 8 * S, sw: 0.6 });
    for (let i = 0; i < 4; i++) p.circle(x + w * (0.2 + i * 0.2), y + h * 0.1, h * 0.055, '#424242', { sw: 0.4 });
    p.rect(x + w * 0.15, y + h * 0.27, w * 0.7, h * 0.06, '#bdbdbd', { r: 6 * S, sw: 0.6 });         // handle
    p.rect(x + w * 0.14, y + h * 0.38, w * 0.72, h * 0.5, '#4e342e', { r: 10 * S, sw: 0.7 });        // window
    p.rect(x + w * 0.14, y + h * 0.38, w * 0.72, h * 0.5, 'url(#ovenGlow)', { r: 10 * S, ink: false });
  },

  hood(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x + w * 0.35, y - h * 0.6, w * 0.3, h * 0.62, o.color || '#b0bec5', { sw: 0.7 });
    p.poly([[x + w * 0.2, y], [x + w * 0.8, y], [x + w, y + h], [x, y + h]], o.color || '#b0bec5', { sw: 0.9 });
    p.rect(x - 6 * S, y + h - 6 * S, w + 12 * S, 16 * S, '#90a4ae', { r: 4 * S, sw: 0.6 });
    for (const f of [0.3, 0.5, 0.7]) p.line(x + w * f, y + h * 0.3, x + w * f, y + h * 0.75, { sw: 0.35, stroke: 'rgba(0,0,0,0.3)' });
  },

  cuttingBoard(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, o.color || '#d7a86e', { r: 10 * S, sw: 0.8 });
    p.circle(x + w * 0.9, y + h * 0.5, h * 0.18, '#e6dcc6', { sw: 0.4 });
    // knife lying on the board
    p.poly([[x + w * 0.5, y - h * 0.15], [x + w * 0.8, y - h * 0.15], [x + w * 0.8, y + h * 0.15], [x + w * 0.55, y + h * 0.1]], '#cfd8dc', { sw: 0.5 });
    p.rect(x + w * 0.8, y - h * 0.2, w * 0.16, h * 0.4, '#5d4037', { r: 4 * S, sw: 0.5 });
  },

  plate(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x - w * 0.12, y + h * 0.15, w * 1.24, h * 1.0, o.mat || '#ffcc80', { r: 8 * S, sw: 0.5 });
    p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, '#ffffff', { sw: 0.8 });
    p.ellipse(x + w / 2, y + h / 2, w * 0.34, h * 0.3, '#f3f3f3', { sw: 0.3 });
  },

  // Wooden crate (or style:"basket") heaped with `peek` emojis
  crate(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const top = y + h * 0.35;
    (o.peek || []).forEach((e, i, arr) => {
      const fx = arr.length === 1 ? 0.5 : 0.18 + 0.64 * i / (arr.length - 1);
      p.emoji(x + w * fx, top - h * (i % 2 ? 0.02 : 0.1), e, h * 0.42, { under: true, rotate: (i % 2 ? 14 : -10) });
    });
    if (o.style === 'basket') {
      p.path(`M ${x} ${top} L ${x + w} ${top} Q ${x + w * 0.96} ${y + h} ${x + w / 2} ${y + h} Q ${x + w * 0.04} ${y + h} ${x} ${top} Z`,
        o.color || '#b07a43', { sw: 0.8 });
      for (let i = 1; i < 6; i++) p.line(x + w * i / 6, top, x + w * (i / 6 * 0.8 + 0.1), y + h * 0.95, { sw: 0.3, stroke: 'rgba(0,0,0,0.35)' });
      p.line(x, top + (y + h - top) * 0.4, x + w, top + (y + h - top) * 0.4, { sw: 0.3, stroke: 'rgba(0,0,0,0.35)' });
      p.path(`M ${x + w * 0.15} ${top} Q ${x + w / 2} ${y - h * 0.2} ${x + w * 0.85} ${top}`, null, { sw: 0.8, stroke: '#7a4a2a' });
      return;
    }
    p.rect(x, top, w, y + h - top, o.color || '#c8955a', { sw: 0.9 });
    for (const f of [0.33, 0.66]) p.line(x, top + (y + h - top) * f, x + w, top + (y + h - top) * f, { sw: 0.5 });
    p.rect(x, top, w * 0.1, y + h - top, '#a0673a', { sw: 0.5 });
    p.rect(x + w * 0.9, top, w * 0.1, y + h - top, '#a0673a', { sw: 0.5 });
    if (o.label) p.text(x + w / 2, top + (y + h - top) * 0.5, o.label,
      { size: Math.min((y + h - top) * 0.28, w * 0.8 / (o.label.length * 0.62)), color: '#4e342e' });
  },

  jar(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    for (const [fx, fy] of [[0.3, 0.75], [0.68, 0.72], [0.5, 0.48]]) p.emoji(x + w * fx, y + h * fy, o.emoji, w * 0.42, { under: true });
    p.rect(x, y + h * 0.15, w, h * 0.85, 'rgba(210,235,245,0.45)', { r: 14 * S, sw: 0.8 });
    p.rect(x + w * 0.08, y, w * 0.84, h * 0.17, o.lid || '#e53935', { r: 6 * S, sw: 0.7 });
    p.line(x + w * 0.18, y + h * 0.3, x + w * 0.18, y + h * 0.8, { layer: 'fill', stroke: '#fff', sw: 1.1, opacity: 0.8 });
  },

  bowl(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    if (o.emoji) p.emoji(x + w / 2, y + h * 0.3, o.emoji, h * 0.62, { under: true });
    p.path(`M ${x} ${y + h * 0.35} L ${x + w} ${y + h * 0.35} Q ${x + w} ${y + h} ${x + w / 2} ${y + h} Q ${x} ${y + h} ${x} ${y + h * 0.35} Z`,
      o.color || '#ef9a9a', { sw: 0.9 });
    p.line(x + w * 0.1, y + h * 0.55, x + w * 0.9, y + h * 0.55, { sw: 0.3, stroke: 'rgba(255,255,255,0.8)' });
  },

  // A labelled food box (e.g. PASTA), with a picture emoji
  packet(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, o.color || '#fdd835', { r: 6 * S, sw: 0.8 });
    p.rect(x, y, w, h * 0.12, o.band || '#1e88e5', { r: 6 * S, sw: 0.5 });
    if (o.label) p.text(x + w / 2, y + h * 0.28, o.label, { size: Math.min(h * 0.16, w / (o.label.length * 0.62)), color: '#c62828' });
    if (o.emoji) p.emoji(x + w / 2, y + h * 0.66, o.emoji, w * 0.55);
  },

  shelf(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    for (const f of [0.12, 0.88]) p.poly([[x + w * f - 8 * S, y + h], [x + w * f + 8 * S, y + h], [x + w * f, y + h + 50 * S]], '#7a4a2a', { sw: 0.5 });
    p.rect(x, y, w, h, o.color || '#a0673a', { r: 3 * S, sw: 0.7 });
  },

  // Recipe chalkboard. columns: [{ title, lines: ["🍞+🧀+🥬 = 🥪", ...], custom? }]
  // Only the board is drawn here: the writing is drawn live by drawChalkboards()
  // so made-up recipes can appear on it.
  chalkboard(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x - 14 * S, y - 14 * S, w + 28 * S, h + 28 * S, '#8b5a2b', { r: 8 * S });
    p.rect(x, y, w, h, '#2f4a3a', { sw: 0.6 });
    for (const [fx, fy] of [[0.15, 0.8], [0.7, 0.3], [0.45, 0.65]]) {
      p.line(x + w * fx, y + h * fy, x + w * (fx + 0.12), y + h * (fy - 0.05), { layer: 'fill', stroke: '#fff', sw: 3, opacity: 0.07 });
    }
    if (o.title) p.text(x + w / 2, y + h * 0.1, o.title, { size: h * 0.1, color: '#ffe082' });
    const L = chalkboardLayout(o, b);
    for (let ci = 1; ci < L.cols.length; ci++) {
      p.line(x + w * ci / L.cols.length, L.top, x + w * ci / L.cols.length, y + h - L.pad, { sw: 0.3, stroke: 'rgba(255,255,255,0.35)' });
    }
    p.rect(x + w * 0.1, y + h + 10 * S, w * 0.8, 10 * S, '#6d4c41', { ink: false });               // chalk tray
    p.rect(x + w * 0.7, y + h + 2 * S, w * 0.05, 10 * S, '#ffffff', { r: 4 * S, ink: false });
  },

  // Picnic table with a red checked tablecloth and two benches
  picnicTable(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const wood = '#8b5a2b';
    p.rect(x - w * 0.05, y + h * 0.66, w * 1.1, h * 0.1, wood, { r: 4 * S, sw: 0.7 });              // back bench
    for (const f of [0.15, 0.85]) {
      p.poly([[x + w * f - w * 0.02, y + h * 0.2], [x + w * f + w * 0.02, y + h * 0.2], [x + w * f + w * 0.07, y + h], [x + w * f + w * 0.03, y + h]], wood, { sw: 0.6 });
      p.poly([[x + w * f - w * 0.02, y + h * 0.2], [x + w * f + w * 0.02, y + h * 0.2], [x + w * f - w * 0.03, y + h], [x + w * f - w * 0.07, y + h]], wood, { sw: 0.6 });
    }
    p.rect(x, y, w, h * 0.12, wood, { r: 4 * S });                                                   // tabletop
    let d = `M ${x - 8 * S} ${y} L ${x + w + 8 * S} ${y} L ${x + w + 8 * S} ${y + h * 0.3}`;
    const n = 10;
    for (let i = 1; i <= n; i++) d += ` L ${x + w + 8 * S - (w + 16 * S) * i / n} ${y + h * (i % 2 ? 0.36 : 0.3)}`;
    p.path(d + ' Z', 'url(#checker)', { sw: 0.8 });                                                  // tablecloth
    p.rect(x - w * 0.08, y + h * 0.84, w * 1.16, h * 0.1, wood, { r: 4 * S, sw: 0.8 });              // front bench
  },

  // Rail of hanging utensils: items: ["🥄", "🍴"]
  rail(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.line(x, y, x + w, y, { sw: 1.2, stroke: '#757575' });
    (o.items || []).forEach((e, i, arr) => {
      const ex = x + w * (i + 0.5) / arr.length;
      p.line(ex, y, ex, y + h * 0.2, { sw: 0.4, stroke: '#757575' });
      p.emoji(ex, y + h * 0.55, e, h * 0.55, { rotate: i % 2 ? 8 : -8 });
    });
  },

  // Glass dessert case on a pink stand. items: [{ emoji, price: "$10" }], one per column
  dessertCase(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const items = o.items || [];
    const signH = h * 0.16, baseY = y + h * 0.7;
    // striped awning sign on top
    p.rect(x - w * 0.03, y, w * 1.06, signH, o.signColor || '#f06292', { r: 10 * S });
    p.text(x + w / 2, y + signH / 2, o.sign || 'SWEETS', { size: signH * 0.62, color: '#fff8e1' });
    // glass box
    const gy = y + signH, gh = baseY - gy;
    p.rect(x, gy, w, gh, 'rgba(179, 229, 252, 0.55)', { sw: 0.9 });
    p.line(x + w * 0.08, gy + gh * 0.15, x + w * 0.2, gy + gh * 0.05, { sw: 0.5, stroke: 'rgba(255,255,255,0.9)' });
    p.line(x + w * 0.08, gy + gh * 0.35, x + w * 0.32, gy + gh * 0.1, { sw: 0.4, stroke: 'rgba(255,255,255,0.8)' });
    // stand with a scalloped edge
    p.rect(x - w * 0.02, baseY, w * 1.04, y + h - baseY, o.color || '#f8bbd0', { r: 6 * S, sw: 0.9 });
    let d = `M ${x - w * 0.02} ${baseY}`;
    const n = 12, sw = w * 1.04 / n;
    for (let i = 0; i < n; i++) d += ` q ${sw / 2} ${sw * 0.7} ${sw} 0`;
    p.path(d + ' Z', '#ffffff', { sw: 0.5 });
    items.forEach((it, i) => {
      const cx = x + w * (i + 0.5) / items.length;
      if (i > 0) p.line(x + w * i / items.length, gy, x + w * i / items.length, baseY, { sw: 0.4, stroke: 'rgba(0,0,0,0.25)' });
      p.ellipse(cx, baseY - gh * 0.12, w / items.length * 0.36, gh * 0.06, '#ffffff', { sw: 0.4 });   // doily
      p.emoji(cx, baseY - gh * 0.42, it.emoji, Math.min(gh * 0.5, w / items.length * 0.7));
      if (it.price) {
        const tw = w / items.length * 0.62, th = (y + h - baseY) * 0.42;
        const ty = baseY + (y + h - baseY) * 0.42;
        p.rect(cx - tw / 2, ty, tw, th, '#fff59d', { r: 5 * S, sw: 0.5 });
        p.text(cx, ty + th / 2, it.price, { size: th * 0.78, color: '#2e7d32' });
      }
    });
  },

  mouseHole(p, b, o) {
    const { x, y, w, h } = b;
    p.path(`M ${x} ${y + h} L ${x} ${y + h * 0.5} Q ${x} ${y} ${x + w / 2} ${y} Q ${x + w} ${y} ${x + w} ${y + h * 0.5} L ${x + w} ${y + h} Z`, '#1b1b1b', { sw: 0.6 });
    if (o.emoji) p.emoji(x + w / 2, y + h * 0.68, o.emoji, h * 0.6);
  },
});
