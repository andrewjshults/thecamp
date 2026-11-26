// --- Scene props: the Second Camp's rooms (the sleepover tent, the party
// tent, the pool and Ember's Sword Shop) ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
  // A mirror ball hanging on a string, throwing coloured sparkles around
  discoBall(p, b, o) {
    const { x, y, w, h } = b;
    const cx = x + w / 2, r = Math.min(w, h) * 0.32, cy = y + h - r * 1.2;
    p.line(cx, y, cx, cy - r, { sw: 0.6 });
    const colors = o.colors || ['#f48fb1', '#81d4fa', '#fff59d', '#ce93d8', '#a5d6a7'];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      p.line(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 1.3, cx + Math.cos(a) * r * 1.9, cy + Math.sin(a) * r * 1.9,
        { sw: 0.7, stroke: colors[i % colors.length] });
    }
    p.circle(cx, cy, r, '#cfd8dc', { sw: 1 });
    for (let i = -2; i <= 2; i++) {
      p.ellipse(cx, cy, r * Math.abs(Math.cos(i * 0.6)), r, null, { sw: 0.3 });
      p.line(cx - r * Math.cos(i * 0.5), cy + r * Math.sin(i * 0.5), cx + r * Math.cos(i * 0.5), cy + r * Math.sin(i * 0.5), { sw: 0.3 });
    }
    [[-0.45, -0.3], [0.25, 0.15], [0.05, -0.55], [-0.2, 0.4]].forEach(([fx, fy], i) =>
      p.rect(cx + fx * r, cy + fy * r, r * 0.22, r * 0.22, colors[i % colors.length], { ink: false }));
    p.circle(cx - r * 0.35, cy - r * 0.35, r * 0.12, '#ffffff', { ink: false });
  },

  // A table with a tablecloth and a big birthday cake. items: emojis beside the cake
  partyTable(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const topY = y + h * 0.45;
    for (const lx of [0.08, 0.86]) p.rect(x + w * lx, topY, w * 0.06, h * 0.55, '#8d6e63', { sw: 0.6 });
    p.rect(x, topY, w, h * 0.22, o.cloth || '#fff176', { sw: 0.9, r: 6 * S });
    for (let i = 0; i < 8; i++) p.circle(x + w * (i + 0.5) / 8, topY + h * 0.22, w / 18, i % 2 ? '#f06292' : '#4fc3f7', { sw: 0.4 });
    // cake: two layers, frosting drips, candles
    const cx = x + w / 2, cw = w * 0.42;
    p.rect(cx - cw / 2, topY - h * 0.2, cw, h * 0.2, '#f8bbd0', { sw: 0.8, r: 8 * S });
    p.rect(cx - cw * 0.35, topY - h * 0.36, cw * 0.7, h * 0.16, '#fce4ec', { sw: 0.8, r: 8 * S });
    for (let i = 0; i < 5; i++) {
      const fx = cx - cw * 0.3 + i * cw * 0.15;
      p.line(fx, topY - h * 0.36, fx, topY - h * 0.25 - (i % 2) * h * 0.03, { sw: 1.4, stroke: '#ffffff' });
    }
    for (let i = 0; i < 3; i++) {
      const fx = cx - cw * 0.2 + i * cw * 0.2;
      p.rect(fx - 4 * S, topY - h * 0.5, 8 * S, h * 0.14, ['#4fc3f7', '#ffd54f', '#81c784'][i], { sw: 0.4 });
      p.ellipse(fx, topY - h * 0.54, 6 * S, 10 * S, '#ffab40', { ink: false });
    }
    (o.items || []).forEach((e, i) => p.emoji(x + w * (i ? 0.88 : 0.12), topY - h * 0.08, e, h * 0.2));
  },

  // A swimming pool seen from the side of the deck: blue water, lane ropes, ripples
  pool(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x - 16 * S, y - 16 * S, w + 32 * S, h + 32 * S, '#eceff1', { r: 30 * S, sw: 1 });
    p.rect(x, y, w, h, o.color || '#4fc3f7', { r: 20 * S, sw: 0.9 });
    p.rect(x, y, w, h * 0.18, 'rgba(255,255,255,0.25)', { ink: false });
    for (let i = 0; i < 4; i++) {
      const ly = y + h * (0.25 + i * 0.2), x0 = x + w * 0.05, x1 = x + w * 0.95;
      let d = `M ${x0} ${ly}`;
      for (let lx = x0; lx < x1; lx += 90 * S) d += ` Q ${lx + 22 * S} ${ly - 14 * S} ${lx + 45 * S} ${ly} T ${lx + 90 * S} ${ly}`;
      p.path(d, null, { sw: 0.45, stroke: '#0277bd' });
    }
    for (let i = 1; i < (o.lanes || 3); i++) {
      const ly = y + h * i / (o.lanes || 3);
      for (let lx = x + 14 * S; lx < x + w - 14 * S; lx += 28 * S) p.circle(lx, ly, 7 * S, Math.round(lx / (28 * S)) % 2 ? '#ef5350' : '#ffffff', { sw: 0.25 });
    }
    // ladder
    for (const lx of [0.04, 0.08]) p.line(x + w * lx, y - 40 * S, x + w * lx, y + h * 0.5, { sw: 0.9, stroke: '#90a4ae' });
    for (let i = 0; i < 3; i++) p.line(x + w * 0.04, y + h * (0.05 + i * 0.15), x + w * 0.08, y + h * (0.05 + i * 0.15), { sw: 0.7, stroke: '#90a4ae' });
    (o.floaties || []).forEach((e, i) => p.emoji(x + w * (0.25 + i * 0.25), y + h * (0.45 + (i % 2) * 0.25), e, h * 0.2));
  },

  // A springy diving board on a little stand
  divingBoard(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y + h * 0.35, w * 0.25, h * 0.65, '#90a4ae', { sw: 0.8 });
    p.line(x + w * 0.05, y + h * 0.35, x + w * 0.05, y, { sw: 0.8, stroke: '#78909c' });
    p.line(x + w * 0.2, y + h * 0.35, x + w * 0.2, y, { sw: 0.8, stroke: '#78909c' });
    p.rect(x, y + h * 0.25, w, h * 0.12, o.color || '#1e88e5', { sw: 0.9, r: 8 * S });
  },

  // A tall lifeguard chair with an umbrella
  lifeguardChair(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const wood = o.color || '#ffffff';
    p.line(x + w * 0.15, y + h, x + w * 0.35, y + h * 0.35, { sw: 1.2, stroke: '#bcaaa4' });
    p.line(x + w * 0.85, y + h, x + w * 0.65, y + h * 0.35, { sw: 1.2, stroke: '#bcaaa4' });
    for (let i = 0; i < 3; i++) p.line(x + w * (0.2 + i * 0.05), y + h * (0.85 - i * 0.2), x + w * (0.8 - i * 0.05), y + h * (0.85 - i * 0.2), { sw: 0.7, stroke: '#bcaaa4' });
    p.rect(x + w * 0.28, y + h * 0.3, w * 0.44, h * 0.08, wood, { sw: 0.8 });
    p.rect(x + w * 0.3, y + h * 0.12, w * 0.4, h * 0.2, '#e53935', { sw: 0.8, r: 6 * S });
    p.text(x + w * 0.5, y + h * 0.22, '+', { size: h * 0.14, color: '#ffffff' });
    p.path(`M ${x} ${y + h * 0.1} Q ${x + w / 2} ${y - h * 0.12} ${x + w} ${y + h * 0.1} Z`, '#ffeb3b', { sw: 0.8 });
    p.line(x + w * 0.5, y, x + w * 0.5, y + h * 0.12, { sw: 0.6 });
  },

  // A puffy sleeping bag with a pillow. color, pillow
  sleepingBag(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, o.color || '#5c6bc0', { r: 30 * S, sw: 0.9 });
    p.rect(x + w * 0.02, y + h * 0.1, w * 0.22, h * 0.8, o.pillow || '#ffffff', { r: 20 * S, sw: 0.7 });
    for (let i = 1; i < 4; i++) p.line(x + w * (0.25 + i * 0.18), y + h * 0.12, x + w * (0.25 + i * 0.18), y + h * 0.88, { sw: 0.35, stroke: 'rgba(0,0,0,0.35)' });
    p.rect(x + w * 0.25, y, w * 0.12, h, o.flap || 'rgba(255,255,255,0.35)', { ink: false });
  },

  // Swords hanging on a wall rack, one per hook. swords: [{ emoji, blade }]
  swordRack(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h * 0.12, '#6d4c41', { sw: 0.9, r: 6 * S });
    const swords = o.swords || [{ blade: '#e3e9f0' }];
    swords.forEach((sw, i) => {
      const cx = x + w * (i + 0.5) / swords.length;
      p.circle(cx, y + h * 0.06, 8 * S, '#ffd54f', { sw: 0.4 });
      // a sword, point down
      p.rect(cx - 6 * S, y + h * 0.12, 12 * S, h * 0.12, '#6d4c41', { sw: 0.5 });
      p.rect(cx - 26 * S, y + h * 0.23, 52 * S, 12 * S, '#ffc107', { sw: 0.5 });
      p.poly([[cx - 12 * S, y + h * 0.27], [cx + 12 * S, y + h * 0.27], [cx + 12 * S, y + h * 0.88], [cx, y + h * 0.97], [cx - 12 * S, y + h * 0.88]],
        sw.blade || '#e3e9f0', { sw: 0.6 });
      if (sw.emoji) p.emoji(cx, y + h * 0.6, sw.emoji, Math.min(w / swords.length * 0.4, h * 0.18));
    });
  },

  // The shop counter, with a price board on the front. items: emojis on top
  shopCounter(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y + h * 0.18, w, h * 0.82, o.color || '#8d6e63', { sw: 1 });
    for (let i = 1; i < 4; i++) p.line(x, y + h * (0.18 + i * 0.2), x + w, y + h * (0.18 + i * 0.2), { sw: 0.3, stroke: 'rgba(0,0,0,0.3)' });
    p.rect(x - w * 0.03, y + h * 0.1, w * 1.06, h * 0.1, '#5d4037', { sw: 0.9 });
    // price board: emoji + coins
    const lines = o.board || [];
    if (lines.length) {
      p.rect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.6, '#2f4a3a', { sw: 0.8, r: 6 * S });
      lines.forEach((l, i) => p.text(x + w / 2, y + h * (0.38 + i * 0.6 / lines.length), l, { size: h * 0.1, color: '#f4f1e8', layer: 'top' }));
    }
    (o.items || []).forEach((e, i, all) => p.emoji(x + w * (i + 0.5) / all.length, y + h * 0.02, e, h * 0.16));
  },

  // A glowing forge with an anvil in front
  forge(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h * 0.75, '#795548', { sw: 1, r: 16 * S });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) p.rect(x + w * (0.05 + j * 0.31), y + h * (0.05 + i * 0.17), w * 0.28, h * 0.14, '#8d6e63', { sw: 0.3 });
    p.rect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.3, '#3e2723', { sw: 0.8, r: 30 * S });
    p.circle(x + w / 2, y + h * 0.45, w * 0.4, 'url(#ovenGlow)', { ink: false });
    p.emoji(x + w / 2, y + h * 0.46, '🔥', h * 0.24);
    // anvil
    const ay = y + h * 0.78;
    p.poly([[x + w * 0.15, ay], [x + w * 0.85, ay], [x + w * 0.7, ay + h * 0.1], [x + w * 0.3, ay + h * 0.1]], '#546e7a', { sw: 0.8 });
    p.rect(x + w * 0.38, ay + h * 0.1, w * 0.24, h * 0.12, '#455a64', { sw: 0.7 });
    if (o.hammer !== false) p.emoji(x + w * 0.78, ay - h * 0.06, '🔨', h * 0.14, { rotate: -30 });
  }
});
