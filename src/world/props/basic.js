// --- Scene props any room can use: emoji stickers, signs, doors, mats, windows, light bulbs ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
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
});
