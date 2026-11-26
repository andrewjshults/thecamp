// --- Prop library. Each gets (pen, box in px, prop JSON). ---
const SCENE_PROPS = {
  emoji(p, b, o) {
    p.emoji(b.x + b.w / 2, b.y + b.h / 2, o.emoji, b.h, o);
  },

  sign(p, b, o) {
    const S = p.S;
    const lines = String(o.text || '').split('\n');
    const maxLen = Math.max(...lines.map(l => l.length), 1);
    const size = Math.min(b.h / (lines.length * 1.3), b.w / (maxLen * 0.72));
    const draw = () => {
      p.rect(b.x, b.y, b.w, b.h, o.color || '#fff8dc', { r: 8 * S, sw: 0.8 });
      if (o.tape !== false) {
        p.rect(b.x - 8 * S, b.y - 8 * S, 46 * S, 18 * S, 'rgba(230,210,150,0.85)', { ink: false });
        p.rect(b.x + b.w - 38 * S, b.y - 8 * S, 46 * S, 18 * S, 'rgba(230,210,150,0.85)', { ink: false });
      }
      lines.forEach((l, i) => p.text(b.x + b.w / 2, b.y + b.h / 2 + (i - (lines.length - 1) / 2) * size * 1.2, l,
        { size, color: o.textColor }));
    };
    o.rotate ? p.group(`rotate(${o.rotate} ${b.x + b.w / 2} ${b.y + b.h / 2})`, draw) : draw();
  },

  // Screen door with the night outside showing through the mesh
  door(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, o.color || '#8b5a2b', { r: 4 * S });
    const m = w * 0.13;
    for (const [py, ph] of [[y + m, h * 0.42 - m], [y + h * 0.5, h * 0.5 - m]]) {
      p.rect(x + m, py, w - 2 * m, ph, o.outside || '#2f4a6d', { sw: 0.6 });
      p.rect(x + m, py, w - 2 * m, ph, 'url(#mesh)', { ink: false });
    }
    p.star(x + w * 0.36, y + h * 0.15, w * 0.08, '#f6a623', { stroke: '#6a3fb5', sw: 0.5 });
    p.star(x + w * 0.66, y + h * 0.30, w * 0.06, '#f6a623', { stroke: '#6a3fb5', sw: 0.5 });
    p.circle(x + w * 0.6, y + h * 0.8, w * 0.03, '#fff59d', { ink: false });   // firefly
    p.circle(x + w * 0.4, y + h * 0.68, w * 0.025, '#fff59d', { ink: false });
    // hinges, handle, long door spring
    for (const hy of [0.12, 0.85]) p.rect(x - 4 * S, y + h * hy, w * 0.1, h * 0.05, '#9e9e9e', { sw: 0.5 });
    p.circle(x + w - m * 0.5, y + h * 0.46, w * 0.05, '#d9d9d9', { sw: 0.6 });
    let d = `M ${x + m * 0.5} ${y + h * 0.46}`;
    const n = 14;
    for (let i = 1; i <= n; i++) d += ` L ${x + m * 0.5 + (w - m * 1.4) * i / n} ${y + h * 0.46 + (i % 2 ? -1 : 1) * 7 * S}`;
    p.path(d, null, { sw: 0.4, stroke: '#555' });
  },

  mat(p, b, o) {
    p.rect(b.x, b.y, b.w, b.h, o.color || '#c0392b', { r: 10 * p.S, sw: 0.7 });
    for (let i = 1; i < 6; i++) p.line(b.x + b.w * i / 6, b.y + 6 * p.S, b.x + b.w * i / 6, b.y + b.h - 6 * p.S,
      { sw: 0.3, stroke: 'rgba(0,0,0,0.35)' });
    if (o.text) p.text(b.x + b.w / 2, b.y + b.h / 2, o.text, { size: b.h * 0.5, color: '#fff3c4' });
  },

  window(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x - 10 * S, y - 10 * S, w + 20 * S, h + 20 * S, o.color || '#8b5a2b', { r: 6 * S });
    p.rect(x, y, w, h, o.sky || '#253a6b', { sw: 0.6 });
    p.crescent(x + w * 0.72, y + h * 0.3, h * 0.17, '#ffe082', { sw: 0.6 });
    p.star(x + w * 0.25, y + h * 0.28, h * 0.11, '#f6a623', { stroke: '#7e57c2', sw: 0.6 });
    p.star(x + w * 0.42, y + h * 0.72, h * 0.08, '#f6a623', { stroke: '#7e57c2', sw: 0.6 });
    p.line(x + w / 2, y, x + w / 2, y + h, { sw: 0.8 });
    p.line(x, y + h / 2, x + w, y + h / 2, { sw: 0.8 });
    p.rect(x - 18 * S, y + h + 8 * S, w + 36 * S, 16 * S, o.color || '#8b5a2b');
  },

  // Bare bulb hanging from the ceiling, with a warm glow
  bulb(p, b, o) {
    const { x, y, w, h } = b, cx = x + w / 2, S = p.S;
    p.circle(cx, y + h * 0.8, w * 3, 'url(#glow)', { ink: false });
    p.line(cx, y, cx, y + h * 0.55, { sw: 0.5 });
    p.rect(cx - w * 0.18, y + h * 0.5, w * 0.36, h * 0.14, '#9e9e9e', { sw: 0.6 });
    p.circle(cx, y + h * 0.8, w * 0.3, o.color || '#ffe066', { sw: 0.8 });
    for (const a of [-40, 0, 40, 140, 180, 220]) {
      const r = (a * Math.PI) / 180, r1 = w * 0.45, r2 = w * 0.65;
      p.line(cx + Math.cos(r) * r1, y + h * 0.8 + Math.sin(r) * r1, cx + Math.cos(r) * r2, y + h * 0.8 + Math.sin(r) * r2,
        { sw: 0.45, stroke: '#e0a800' });
    }
  },

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

  // --- Kitchen ---

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

  // --- Hangout house ---

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

  // --- Bank ---
  // Bank counter with arched glass teller windows. `windows`: [{ teller: "🦉",
  // sign: "OPEN" }, ...]; a teller emoji sits behind the glass.
  tellerCounter(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const wins = o.windows || [{ teller: '🦉', sign: 'OPEN' }];
    const ledgeY = y + h * 0.55, ledgeH = h * 0.06, topY = y;
    // wooden front with panels
    p.rect(x, ledgeY + ledgeH, w, y + h - ledgeY - ledgeH, o.color || '#8d5524', { sw: 0.9 });
    const n = wins.length * 2;
    for (let i = 0; i < n; i++) {
      p.rect(x + w * i / n + 14 * S, ledgeY + ledgeH + 16 * S, w / n - 28 * S, y + h - ledgeY - ledgeH - 40 * S,
        'rgba(255,255,255,0.12)', { r: 6 * S, sw: 0.5 });
    }
    if (o.label) {
      const lw = Math.min(w * 0.3, o.label.length * 34 * S), lh = 52 * S;
      p.rect(x + w / 2 - lw / 2, ledgeY + ledgeH + 20 * S, lw, lh, '#ffd54f', { r: 6 * S, sw: 0.6 });
      p.text(x + w / 2, ledgeY + ledgeH + 20 * S + lh / 2, o.label, { size: lh * 0.6, color: '#5d4037' });
    }
    // windows above the ledge
    const ww = w / wins.length;
    wins.forEach((win, i) => {
      const wx = x + i * ww, gx = wx + ww * 0.12, gw = ww * 0.76;
      const gTop = topY + h * 0.08, gh = ledgeY - gTop;
      p.rect(wx, topY, ww, ledgeY - topY, o.frame || '#a1673a', { sw: 0.8 });   // wood frame
      p.rect(gx, gTop, gw, gh, '#fff8e1', { ink: false });                       // the room behind
      if (win.teller) {
        p.emoji(gx + gw / 2, gTop + gh * 0.58, win.teller, gh * 0.62, { under: true });
      }
      p.rect(gx, gTop, gw, gh, 'rgba(179,229,252,0.35)', { sw: 0.7 });           // glass
      p.line(gx + gw * 0.12, gTop + gh * 0.3, gx + gw * 0.3, gTop + gh * 0.1, { sw: 0.5, stroke: 'rgba(255,255,255,0.9)' });
      // brass bars across the top of the window
      for (let k = 1; k < 6; k++) {
        p.line(gx + gw * k / 6, gTop, gx + gw * k / 6, gTop + gh * 0.22, { sw: 0.45, stroke: '#c49a1a' });
      }
      p.line(gx, gTop + gh * 0.22, gx + gw, gTop + gh * 0.22, { sw: 0.55, stroke: '#c49a1a' });
      // little slot to pass coins through
      p.rect(gx + gw * 0.3, ledgeY - 14 * S, gw * 0.4, 14 * S, '#3b3631', { r: 4 * S, sw: 0.4 });
      if (win.sign) {
        const sw = gw * 0.5, sh = 44 * S;
        p.rect(gx + gw / 2 - sw / 2, topY - sh * 0.4, sw, sh, win.signColor || (win.teller ? '#a5d6a7' : '#ef9a9a'),
          { r: 6 * S, sw: 0.6 });
        p.text(gx + gw / 2, topY - sh * 0.4 + sh / 2, win.sign, { size: sh * 0.62 });
      }
    });
    p.rect(x - 14 * S, ledgeY, w + 28 * S, ledgeH, o.top || '#e6dcc6', { r: 6 * S });
    (o.items || []).forEach((em, i, arr) => {
      p.emoji(x + w * (i + 0.5) / arr.length + w * 0.18 / arr.length, ledgeY - h * 0.05, em, h * 0.1);
    });
  },

  // Big round vault door in a steel frame, with a spoke wheel and bolts
  vault(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, o.frame || '#90a4ae', { r: 10 * S, sw: 1 });
    const cx = x + w / 2, cy = y + h * 0.5, r = Math.min(w, h) * 0.42;
    p.circle(cx, cy, r * 1.04, '#607d8b', { sw: 0.8 });
    p.circle(cx, cy, r * 0.92, o.color || '#b0bec5', { sw: 0.9 });
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      p.circle(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8, r * 0.05, '#eceff1', { sw: 0.4 });
    }
    // spoke wheel
    p.circle(cx, cy, r * 0.42, null, { sw: 1.2, stroke: '#455a64' });
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI / 3 + 0.3;
      p.line(cx - Math.cos(a) * r * 0.5, cy - Math.sin(a) * r * 0.5, cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5,
        { sw: 1.1, stroke: '#455a64' });
    }
    p.circle(cx, cy, r * 0.1, '#ffd54f', { sw: 0.6 });
    // hinges on the right
    for (const f of [0.28, 0.72]) p.rect(x + w * 0.9, y + h * f - 20 * S, w * 0.08, 40 * S, '#546e7a', { r: 4 * S, sw: 0.5 });
    if (o.label) {
      const lw = w * 0.5, lh = h * 0.08;
      p.rect(cx - lw / 2, y + h * 0.03, lw, lh, '#ffd54f', { r: 6 * S, sw: 0.6 });
      p.text(cx, y + h * 0.03 + lh / 2, o.label, { size: lh * 0.65, color: '#37474f' });
    }
  },

  // Brass posts with a red velvet rope drooping between them (the queue line)
  stanchions(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const n = Math.max(2, o.posts || 3);
    const pw = 18 * S, ropeY = y + h * 0.12;
    const px = i => x + (w - pw) * i / (n - 1);
    for (let i = 0; i < n - 1; i++) {
      const x1 = px(i) + pw / 2, x2 = px(i + 1) + pw / 2;
      p.path(`M ${x1} ${ropeY} Q ${(x1 + x2) / 2} ${ropeY + h * 0.45} ${x2} ${ropeY}`, null,
        { sw: 1.8, stroke: o.color || '#c62828' });
    }
    for (let i = 0; i < n; i++) {
      p.rect(px(i), y + h * 0.08, pw, h * 0.84, '#d4a017', { r: 6 * S, sw: 0.6 });
      p.circle(px(i) + pw / 2, y + h * 0.08, pw * 0.7, '#ffd54f', { sw: 0.5 });
      p.ellipse(px(i) + pw / 2, y + h * 0.95, pw * 1.8, pw * 0.5, '#b8860b', { sw: 0.5 });
    }
  }
};
