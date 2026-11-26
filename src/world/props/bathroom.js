// --- Scene props: the bathroom (assets/camp_bathroom.json and the stalls) ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
  cobweb(p, b, o) {
    const S = p.S;
    const draw = () => {
      const { x, y, w, h } = b;
      const grey = { sw: 0.3, stroke: '#666' };
      const spokes = 5, rings = 4;
      const pts = [];
      for (let i = 0; i < spokes; i++) {
        const a = (Math.PI / 2) * i / (spokes - 1);
        p.line(x, y, x + Math.cos(a) * w, y + Math.sin(a) * h, grey);
        pts.push(a);
      }
      for (let k = 1; k <= rings; k++) {
        const f = k / rings;
        let d = '';
        for (let i = 0; i < spokes; i++) {
          const px = x + Math.cos(pts[i]) * w * f, py = y + Math.sin(pts[i]) * h * f;
          if (i === 0) d = `M ${px} ${py}`;
          else {
            const mid = (pts[i] + pts[i - 1]) / 2;
            d += ` Q ${x + Math.cos(mid) * w * f * 0.8} ${y + Math.sin(mid) * h * f * 0.8} ${px} ${py}`;
          }
        }
        p.path(d, null, grey);
      }
      if (o.spider) {
        const sx = x + w * 0.45, sy = y + h * 1.25;
        p.line(sx, y + h * 0.4, sx, sy - h * 0.12, grey);
        p.emoji(sx, sy, '🕷️', h * 0.38);
      }
    };
    o.corner === 'tr' ? p.group(`translate(${2 * b.x} 0) scale(-1 1)`, draw) : draw();
  },

  mirror(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, o.frame || '#9e9e9e', { r: 10 * S });
    p.rect(x + 14 * S, y + 14 * S, w - 28 * S, h - 28 * S, o.color || '#cdeefa', { r: 6 * S, sw: 0.6 });
    p.line(x + w * 0.12, y + h * 0.75, x + w * 0.3, y + h * 0.22, { layer: 'fill', stroke: '#fff', sw: 2.2, opacity: 0.85 });
    p.line(x + w * 0.2, y + h * 0.78, x + w * 0.36, y + h * 0.36, { layer: 'fill', stroke: '#fff', sw: 1.2, opacity: 0.85 });
  },

  // A counter of wall-mounted sinks with exposed pipes
  sinks(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const n = o.count || 2;
    const topH = h * 0.16;
    for (let i = 0; i < n; i++) {
      const cx = x + w * (i + 0.5) / n;
      const bw = w / n * 0.34;
      p.rect(cx - 8 * S, y + topH, 16 * S, h - topH, '#a6a6a6', { sw: 0.6 });                // drain pipe
      p.path(`M ${cx - bw} ${y + topH} Q ${cx - bw} ${y + topH + h * 0.26} ${cx} ${y + topH + h * 0.26} ` +
        `Q ${cx + bw} ${y + topH + h * 0.26} ${cx + bw} ${y + topH} Z`, '#f4f4f4');           // basin
    }
    p.poly([[x, y + topH], [x + w * 0.06, y + topH], [x, y + topH + h * 0.25]], '#8b5a2b', { sw: 0.7 });
    p.poly([[x + w, y + topH], [x + w * 0.94, y + topH], [x + w, y + topH + h * 0.25]], '#8b5a2b', { sw: 0.7 });
    p.rect(x, y, w, topH, o.color || '#e6dcc6', { r: 6 * S });
    for (let i = 0; i < n; i++) {
      const cx = x + w * (i + 0.5) / n;
      const bw = w / n * 0.34;
      p.ellipse(cx, y + topH * 0.55, bw * 0.85, topH * 0.3, '#9fd3e6', { sw: 0.6 });
      p.rect(cx - 7 * S, y - h * 0.16, 14 * S, h * 0.18, '#bdbdbd', { sw: 0.6 });             // faucet
      p.rect(cx - 7 * S, y - h * 0.18, bw * 0.55, 14 * S, '#bdbdbd', { r: 6 * S, sw: 0.6 });
      p.circle(cx - bw * 0.55, y - h * 0.04, 13 * S, '#e53935', { sw: 0.6 });                // hot
      p.circle(cx + bw * 0.55, y - h * 0.04, 13 * S, '#1e88e5', { sw: 0.6 });                // cold
      if (i === 0) p.path(`M ${cx + bw * 0.5} ${y - h * 0.11} q ${-8 * S} ${14 * S} 0 ${18 * S} q ${8 * S} ${-4 * S} 0 ${-18 * S} Z`,
        '#4fc3f7', { sw: 0.4, stroke: '#1976d2' });                                          // drip
    }
  },

  dryer(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h * 0.75, o.color || '#e0e0e0', { r: 14 * S });
    p.rect(x + w * 0.35, y + h * 0.75, w * 0.3, h * 0.13, '#bdbdbd', { r: 4 * S, sw: 0.7 });
    p.circle(x + w / 2, y + h * 0.42, w * 0.17, '#e53935', { sw: 0.7 });
    p.text(x + w / 2, y + h * 0.15, 'PUSH', { size: h * 0.13 });
    for (const dx of [-0.2, 0, 0.2]) {
      p.path(`M ${x + w * (0.5 + dx)} ${y + h * 0.92} q ${6 * S} ${10 * S} 0 ${20 * S} q ${-6 * S} ${10 * S} 0 ${20 * S}`,
        null, { sw: 0.35, stroke: '#78909c' });
    }
  },

  // A bank of toilet stalls. doors: [{ label, color, sign, occupied, feet }]
  stalls(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const doors = o.doors || [{}, {}, {}];
    const n = doors.length;
    const postW = w * 0.022;
    const slotW = (w - postW * (n + 1)) / n;
    const doorTop = y + h * 0.07, doorBot = y + h * 0.84;
    p.rect(x, y, w, h * 0.04, '#9e9e9e', { sw: 0.7 });                                         // top rail
    doors.forEach((d, i) => {
      const sx = x + postW + i * (slotW + postW);
      p.rect(sx, doorBot, slotW, y + h - doorBot, '#8a857c', { sw: 0.4 });                    // gap under door
      p.rect(sx, doorTop, slotW, doorBot - doorTop, d.color || o.color || '#8dbb2a', { sw: 0.9 });
      // round window with a crescent moon, like the doors in the drawing
      p.circle(sx + slotW / 2, doorTop + h * 0.16, slotW * 0.2, '#3fb6d9', { sw: 0.8 });
      p.crescent(sx + slotW / 2 - slotW * 0.02, doorTop + h * 0.16, slotW * 0.12, '#fff59d', { sw: 0.4 });
      if (d.label) p.text(sx + slotW / 2, doorTop + h * 0.045, d.label, { size: h * 0.05 });
      p.rect(sx + slotW * 0.8, doorTop + h * 0.38, slotW * 0.1, h * 0.05,
        d.occupied ? '#e53935' : '#43a047', { r: 4 * S, sw: 0.5 });                         // lock indicator
      for (const hy of [0.1, 0.85]) p.rect(sx - 3 * S, doorTop + (doorBot - doorTop) * hy, slotW * 0.08, h * 0.03, '#bdbdbd', { sw: 0.4 });
      if (d.sign) {
        SCENE_PROPS.sign(p, { x: sx + slotW * 0.1, y: doorTop + h * 0.5, w: slotW * 0.8, h: h * 0.13 },
          { text: d.sign, rotate: d.signRotate ?? -5, color: '#fffdf5', textColor: '#d32f2f' });
      }
      if (d.feet) {
        const fy = doorBot + (y + h - doorBot) * 0.6;
        p.emoji(sx + slotW * 0.3, fy, '👟', (y + h - doorBot) * 0.6);
        p.emoji(sx + slotW * 0.7, fy, '👟', (y + h - doorBot) * 0.6);
      }
    });
    for (let i = 0; i <= n; i++) p.rect(x + i * (slotW + postW), y, postW, h, o.post || '#b0a99a', { sw: 0.7 });
  },

  shower(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const faint = { sw: 0.3, stroke: 'rgba(0,0,0,0.25)' };
    p.rect(x, y, w, h, o.tile || '#cfe8ef', { sw: 0.9 });
    const t = 56 * S;
    for (let ty = y + t; ty < y + h * 0.88; ty += t) p.line(x, ty, x + w, ty, faint);
    for (let tx = x + t; tx < x + w; tx += t) p.line(tx, y, tx, y + h * 0.88, faint);
    p.rect(x, y + h * 0.88, w, h * 0.12, '#b5cfd6', { sw: 0.6 });                              // shower tray
    p.ellipse(x + w * 0.65, y + h * 0.94, w * 0.06, h * 0.022, '#7d8a8e', { sw: 0.5 });
    // pipe + head + water
    const hx = x + w * 0.7;
    p.rect(hx - 7 * S, y, 14 * S, h * 0.15, '#bdbdbd', { sw: 0.5 });
    p.path(`M ${hx - w * 0.1} ${y + h * 0.2} L ${hx - 10 * S} ${y + h * 0.14} L ${hx + 10 * S} ${y + h * 0.14} L ${hx + w * 0.1} ${y + h * 0.2} Z`,
      '#9e9e9e', { sw: 0.6 });
    for (let i = -3; i <= 3; i++) {
      p.line(hx + i * w * 0.028, y + h * 0.23, hx + i * w * 0.05, y + h * 0.84,
        { layer: 'fill', stroke: '#4fc3f7', sw: 0.8, dash: `${30 * S} ${22 * S}` });
    }
    // little shelf of shampoo
    p.rect(x + w * 0.08, y + h * 0.42, w * 0.24, h * 0.025, '#bdbdbd', { sw: 0.5 });
    p.emoji(x + w * 0.14, y + h * 0.385, '🧴', h * 0.065);
    p.emoji(x + w * 0.25, y + h * 0.385, '🧴', h * 0.055, { rotate: 8 });
    // curtain rod + curtain (purple with orange stars, Louisa's favourite colours)
    p.line(x - 10 * S, y + h * 0.06, x + w + 10 * S, y + h * 0.06, { sw: 1.2, stroke: '#757575' });
    const cw = w * (o.curtainOpen ?? 0.45);
    let d = `M ${x} ${y + h * 0.06} L ${x + cw} ${y + h * 0.06} L ${x + cw + w * 0.04} ${y + h * 0.86}`;
    const waves = 4;
    for (let i = 1; i <= waves; i++) {
      const wx = x + cw + w * 0.04 - (cw + w * 0.04) * i / waves;
      d += ` Q ${wx + (cw / waves) * 0.5} ${y + h * (i % 2 ? 0.9 : 0.83)} ${wx} ${y + h * 0.86}`;
    }
    d += ' Z';
    p.path(d, o.curtain || '#7e57c2', { sw: 0.9 });
    for (let i = 1; i < 4; i++) p.line(x + cw * i / 4, y + h * 0.08, x + cw * i / 4 + 6 * S, y + h * 0.84, { sw: 0.35 });
    for (const [fx, fy] of [[0.1, 0.25], [0.3, 0.45], [0.12, 0.66], [0.33, 0.78]]) {
      p.star(x + w * fx, y + h * fy, w * 0.05, '#f6a623', { stroke: '#4a148c', sw: 0.4 });
    }
    for (let i = 0; i <= 6; i++) p.circle(x + cw * i / 6, y + h * 0.06, 9 * S, '#bdbdbd', { sw: 0.4 });
  },

  bench(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const wood = o.color || '#a0673a';
    for (const lx of [0.08, 0.86]) p.rect(x + w * lx, y + h * 0.3, w * 0.06, h * 0.7, '#7a4a2a', { sw: 0.7 });
    p.rect(x, y, w, h * 0.32, wood, { r: 6 * S });
    p.line(x + 10 * S, y + h * 0.16, x + w - 10 * S, y + h * 0.16, { sw: 0.35 });
    if (o.towel) {
      const tx = x + w * 0.58, tw = w * 0.2;
      p.path(`M ${tx} ${y - 6 * S} L ${tx + tw} ${y - 6 * S} L ${tx + tw + 6 * S} ${y + h * 0.78} L ${tx - 4 * S} ${y + h * 0.74} Z`,
        o.towel, { sw: 0.7 });
      for (const f of [0.25, 0.5, 0.75]) {
        p.line(tx + tw * f - 2 * S, y + h * 0.05, tx + tw * f, y + h * 0.7, { layer: 'fill', stroke: '#fff', sw: 1.2, opacity: 0.8 });
      }
    }
  },

  // Open cardboard box; `peek` emojis poke out of the top
  box(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const top = y + h * 0.3;
    p.poly([[x, top], [x + w * 0.12, top - h * 0.1], [x + w * 0.88, top - h * 0.1], [x + w, top]], '#7a4f27', { sw: 0.6 });
    (o.peek || []).forEach((e, i, arr) => {
      p.emoji(x + w * (i + 0.5) / arr.length, top - h * 0.06, e, h * 0.36, { under: true, rotate: (i % 2 ? 12 : -10) });
    });
    p.poly([[x, top], [x - w * 0.16, top - h * 0.2], [x + w * 0.06, top - h * 0.22], [x + w * 0.12, top - h * 0.1]], '#d9a66b', { sw: 0.6 });
    p.poly([[x + w, top], [x + w * 1.14, top - h * 0.24], [x + w * 0.96, top - h * 0.26], [x + w * 0.88, top - h * 0.1]], '#d9a66b', { sw: 0.6 });
    p.rect(x, top, w, y + h - top, o.color || '#c8955a', { sw: 0.8 });
    p.rect(x + w * 0.42, top, w * 0.16, (y + h - top) * 0.35, 'rgba(230,210,150,0.85)', { ink: false });
    const lines = String(o.label || '').split('\n').filter(Boolean);
    lines.forEach((l, i) => p.text(x + w / 2, top + (y + h - top) * (0.5 + (i - (lines.length - 1) / 2) * 0.28), l,
      { size: (y + h - top) * 0.22 }));
  },

  // Campground trash can; `peek` emoji lifts the lid
  trashCan(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const top = y + h * 0.28;
    if (o.peek) p.emoji(x + w * 0.55, top - h * 0.13, o.peek, h * 0.34, { under: true });
    p.path(`M ${x} ${top} L ${x + w} ${top} L ${x + w * 0.92} ${y + h} L ${x + w * 0.08} ${y + h} Z`, o.color || '#5d7f5a', { sw: 0.9 });
    for (const f of [0.25, 0.5, 0.75]) p.line(x + w * f, top + h * 0.08, x + w * (0.5 + (f - 0.5) * 0.9), y + h - h * 0.06, { sw: 0.35 });
    if (o.label) {
      p.rect(x + w * 0.12, top + h * 0.22, w * 0.76, h * 0.17, '#fff8dc', { r: 4 * S, sw: 0.5 });
      p.text(x + w / 2, top + h * 0.305, o.label, { size: h * 0.075 });
    }
    p.group(`rotate(${o.peek ? -40 : 0} ${x} ${top})`, () => {
      p.rect(x - w * 0.06, top - h * 0.07, w * 1.12, h * 0.07, o.color || '#5d7f5a', { r: 6 * S });
      p.rect(x + w * 0.4, top - h * 0.11, w * 0.2, h * 0.04, '#424242', { r: 4 * S, sw: 0.5 });
    });
  },

  mopBucket(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.group(`rotate(-12 ${x + w * 0.5} ${y + h * 0.6})`, () => {
      p.rect(x + w * 0.46, y, w * 0.08, h * 0.62, '#a0673a', { sw: 0.5 });
    });
    for (let i = 0; i < 7; i++) p.line(x + w * 0.3 + i * w * 0.07, y + h * 0.5, x + w * 0.25 + i * w * 0.09, y + h * 0.66, { sw: 0.5, stroke: '#9e9e9e' });
    p.path(`M ${x} ${y + h * 0.55} L ${x + w} ${y + h * 0.55} L ${x + w * 0.9} ${y + h} L ${x + w * 0.1} ${y + h} Z`,
      o.color || '#fdd835', { sw: 0.8 });
    p.ellipse(x + w / 2, y + h * 0.55, w * 0.5, h * 0.04, '#90caf9', { sw: 0.6 });
  },

  drain(p, b) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    p.ellipse(cx, cy, b.w / 2, b.h / 2, '#8d8d8d', { sw: 0.6 });
    for (const f of [-0.5, 0, 0.5]) p.line(cx + f * b.w * 0.6, cy - b.h * 0.3, cx + f * b.w * 0.6, cy + b.h * 0.3, { sw: 0.4 });
  },

  puddle(p, b, o) {
    const { x, y, w, h } = b;
    p.path(`M ${x + w * 0.1} ${y + h * 0.5} Q ${x} ${y} ${x + w * 0.4} ${y + h * 0.1} Q ${x + w * 0.7} ${y - h * 0.1} ` +
      `${x + w * 0.9} ${y + h * 0.3} Q ${x + w * 1.05} ${y + h * 0.8} ${x + w * 0.6} ${y + h * 0.9} ` +
      `Q ${x + w * 0.2} ${y + h * 1.05} ${x + w * 0.1} ${y + h * 0.5} Z`,
      o.color || 'rgba(120,200,240,0.6)', { sw: 0.4, stroke: '#4a9fd0' });
  },

  // Wet footprints walking from the box's top-right corner to its bottom-left
  footprints(p, b, o) {
    const S = p.S;
    const steps = o.steps || 6;
    const x1 = b.x + b.w, y1 = b.y, x2 = b.x, y2 = b.y + b.h;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const deg = (ang * 180) / Math.PI + 90;
    for (let i = 0; i < steps; i++) {
      const f = (i + 0.5) / steps;
      const side = i % 2 ? 1 : -1;
      const fx = x1 + (x2 - x1) * f + Math.cos(ang + Math.PI / 2) * side * 16 * S;
      const fy = y1 + (y2 - y1) * f + Math.sin(ang + Math.PI / 2) * side * 16 * S;
      // local -y is the walking direction after this rotation, so toes go at -y
      p.group(`rotate(${deg} ${fx} ${fy})`, () => {
        const wet = 'rgba(70,130,170,0.35)';
        p.ellipse(fx, fy, 11 * S, 19 * S, wet, { ink: false });
        for (let t = -2; t <= 2; t++) p.circle(fx + t * 5.5 * S, fy - 25 * S + Math.abs(t) * 3 * S, (t === 0 ? 4.5 : 3.5) * S, wet, { ink: false });
      });
    }
  },

  // --- Stall interiors ---

  // A stall partition seen in perspective. The box is the wall's footprint
  // across the scene: its outer edge is the scene edge (runs from `outerTop`
  // to the bottom of the scene) and its inner edge meets the back wall
  // (box top..bottom). Partitions stop short of the floor (`gap`), and
  // `peek` emojis (e.g. a neighbour's sneakers) show in that gap.
  // `door`: { t0, t1, color, latch: 'locked'|'open', hang } — t is 0 at the
  // outer edge, 1 at the inner edge.
  sideWall(p, b, o) {
    const S = p.S;
    const right = o.side === 'right';
    const xo = right ? b.x + b.w : b.x, xi = right ? b.x : b.x + b.w;
    const topO = (o.outerTop ?? -0.06) * b.H, topI = b.y;
    const floorO = b.H, floorI = b.y + b.h;
    const g = o.gap ?? 0.1;
    const lerp = (a, c, t) => a + (c - a) * t;
    const X = t => lerp(xo, xi, t);
    const Top = t => lerp(topO, topI, t);
    const Floor = t => lerp(floorO, floorI, t);
    const Bot = t => Floor(t) - g * (Floor(t) - Top(t));   // bottom edge of the partition

    p.poly([[X(0), Bot(0)], [X(1), Bot(1)], [X(1), Floor(1)], [X(0), Floor(0)]], o.gapColor || '#a59f94', { sw: 0.4 });
    p.poly([[X(0), Top(0)], [X(1), Top(1)], [X(1), Bot(1)], [X(0), Bot(0)]], o.color || '#cfc6b0', { sw: 1 });
    // faint panel seams
    for (const t of [0.35, 0.7]) p.line(X(t), Top(t) + 10 * S, X(t), Bot(t) - 10 * S, { sw: 0.3, stroke: 'rgba(0,0,0,0.2)' });

    const d = o.door;
    if (d) {
      const t0 = d.t0 ?? 0.1, t1 = d.t1 ?? 0.7, tm = (t0 + t1) / 2;
      const m = t => Top(t) + 0.04 * (Bot(t) - Top(t));
      p.poly([[X(t0), m(t0)], [X(t1), m(t1)], [X(t1), Bot(t1)], [X(t0), Bot(t0)]], d.color || '#8dbb2a', { sw: 1 });
      // round window with a moon, squashed by the perspective
      const cx = X(tm), cy = lerp(m(tm), Bot(tm), 0.2);
      const ry = (Bot(tm) - m(tm)) * 0.08, rx = Math.abs(X(t1) - X(t0)) * 0.16;
      p.ellipse(cx, cy, rx, ry, '#3fb6d9', { sw: 0.8 });
      p.group(`translate(${cx} ${cy}) scale(${rx / ry} 1) translate(${-cx} ${-cy})`, () => {
        p.crescent(cx - ry * 0.1, cy, ry * 0.6, '#fff59d', { sw: 0.4 });
      });
      // latch on the free edge
      const tl = t1 - (t1 - t0) * 0.1, ly = lerp(m(tl), Bot(tl), 0.45);
      const lh = (Bot(tl) - m(tl)) * 0.05;
      p.rect(X(tl) - lh * 0.5, ly - lh, lh, lh * 2, d.latch === 'locked' ? '#e53935' : '#43a047', { r: 4 * S, sw: 0.5 });
      // coat hook (with something hanging on it)
      if (d.hang) {
        const th = lerp(t0, t1, 0.4), hy = lerp(m(th), Bot(th), 0.42);
        p.circle(X(th), hy, 9 * S, '#9e9e9e', { sw: 0.5 });
        p.emoji(X(th), hy + (Bot(th) - m(th)) * 0.08, d.hang, (Bot(th) - m(th)) * 0.16, { rotate: right ? 6 : -6 });
      }
    }
    for (const pk of o.peek || []) {
      const t = pk.t ?? 0.5;
      const size = (Floor(t) - Bot(t)) * (pk.size ?? 0.75);
      p.emoji(X(t), Floor(t) - size * 0.45, pk.emoji, size, { flip: pk.flip });
    }
  },

  // Front view of a toilet. lid: 'up' (default) | 'down'
  toilet(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const white = o.color || '#f7f7f4';
    const cx = x + w / 2;
    // tank
    p.rect(x + w * 0.16, y + h * 0.05, w * 0.68, h * 0.36, white, { r: 10 * S });
    p.rect(x + w * 0.12, y, w * 0.76, h * 0.07, white, { r: 8 * S });
    p.rect(x + w * 0.2, y + h * 0.1, w * 0.13, h * 0.035, '#bdbdbd', { r: 4 * S, sw: 0.6 });          // flush lever
    p.circle(x + w * 0.21, y + h * 0.118, 8 * S, '#9e9e9e', { sw: 0.5 });
    // bowl + pedestal
    const rimY = y + h * 0.52;
    p.path(`M ${x + w * 0.04} ${rimY} Q ${x + w * 0.06} ${y + h * 0.78} ${x + w * 0.3} ${y + h * 0.84} ` +
      `L ${x + w * 0.26} ${y + h} L ${x + w * 0.74} ${y + h} L ${x + w * 0.7} ${y + h * 0.84} ` +
      `Q ${x + w * 0.94} ${y + h * 0.78} ${x + w * 0.96} ${rimY} Z`, white);
    p.line(x + w * 0.3, y + h * 0.84, x + w * 0.7, y + h * 0.84, { sw: 0.4, stroke: 'rgba(0,0,0,0.35)' });
    const seat = o.seat || '#f7f7f4';
    if (o.lid === 'down') {
      p.ellipse(cx, rimY, w * 0.47, h * 0.085, seat, { sw: 0.9 });
      p.ellipse(cx, rimY - h * 0.012, w * 0.4, h * 0.06, seat, { sw: 0.4 });
    } else {
      // lid up, leaning on the tank
      p.path(`M ${x + w * 0.14} ${rimY - h * 0.04} Q ${x + w * 0.12} ${y + h * 0.12} ${cx} ${y + h * 0.1} ` +
        `Q ${x + w * 0.88} ${y + h * 0.12} ${x + w * 0.86} ${rimY - h * 0.04} Z`, seat, { sw: 0.9 });
      p.ellipse(cx, rimY, w * 0.47, h * 0.085, seat, { sw: 0.9 });
      p.ellipse(cx, rimY + h * 0.004, w * 0.33, h * 0.052, '#8fd0e8', { sw: 0.6 });                // water
      p.path(`M ${cx - w * 0.12} ${rimY} q ${w * 0.06} ${-h * 0.02} ${w * 0.12} 0 q ${w * 0.06} ${h * 0.02} ${w * 0.12} 0`,
        null, { sw: 0.35, stroke: '#ffffff' });
    }
  },

  // Toilet-paper holder on the wall; empty:true shows just the cardboard tube
  tpHolder(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w * 0.12, h * 0.55, '#bdbdbd', { r: 4 * S, sw: 0.6 });
    p.rect(x + w * 0.88, y, w * 0.12, h * 0.55, '#bdbdbd', { r: 4 * S, sw: 0.6 });
    const cy = y + h * 0.3, r = h * 0.28;
    if (o.empty) {
      p.rect(x + w * 0.12, cy - r * 0.45, w * 0.76, r * 0.9, '#c8955a', { r: 6 * S, sw: 0.7 });
      return;
    }
    p.path(`M ${x + w * 0.62} ${cy + r} L ${x + w * 0.66} ${y + h} L ${x + w * 0.34} ${y + h * 0.97} L ${x + w * 0.3} ${cy + r} Z`,
      '#ffffff', { sw: 0.6 });
    p.rect(x + w * 0.12, cy - r, w * 0.76, r * 2, '#ffffff', { r: 14 * S, sw: 0.8 });
    for (const f of [0.35, 0.55, 0.75]) p.line(x + w * 0.34, y + h * (0.62 + f * 0.4), x + w * 0.64, y + h * (0.62 + f * 0.4),
      { sw: 0.25, stroke: 'rgba(0,0,0,0.3)', dash: `${4 * S} ${6 * S}` });
  },

  // Marker writing straight on the wall (doodles, graffiti)
  scribble(p, b, o) {
    const lines = String(o.text || '').split('\n');
    const maxLen = Math.max(...lines.map(l => l.length), 1);
    const size = Math.min(b.h / (lines.length * 1.15), b.w / (maxLen * 0.62));
    const draw = () => lines.forEach((l, i) => p.text(b.x + b.w / 2,
      b.y + b.h / 2 + (i - (lines.length - 1) / 2) * size * 1.1, l, { size, color: o.color || '#6a3fb5' }));
    o.rotate ? p.group(`rotate(${o.rotate} ${b.x + b.w / 2} ${b.y + b.h / 2})`, draw) : draw();
  },
});
