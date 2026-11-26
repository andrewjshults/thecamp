// --- Scene props: the Third Camp's rooms (the Brick's castle, the pools'
// water slides and Shelly's Armor Shop) ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
  // A ladder tower with a curly slide down to the right (flip: down to the left). color
  waterSlide(p, b, o) {
    const { x, y, w, h } = b;
    p.group(o.flip ? `translate(${2 * x + w} 0) scale(-1 1)` : '', () => {
      p.rect(x, y + h * 0.12, w * 0.3, h * 0.88, '#ffb74d', { sw: 0.9 });
      for (let i = 0; i < 7; i++) p.line(x, y + h * (0.2 + i * 0.11), x + w * 0.3, y + h * (0.2 + i * 0.11), { sw: 0.5 });
      p.rect(x - w * 0.05, y + h * 0.06, w * 0.4, h * 0.07, '#ef6c00', { sw: 0.8 });
      const d = `M ${x + w * 0.3} ${y + h * 0.1} C ${x + w * 0.9} ${y} ${x + w * 0.4} ${y + h * 0.6} ${x + w} ${y + h * 0.92}`;
      p.path(d, null, { sw: 7, stroke: o.color || '#e53935' });
      p.path(d, null, { sw: 4, stroke: '#ffffff', opacity: 0.6 });
      p.emoji(x + w * 0.96, y + h * 0.94, '💦', h * 0.12);
    });
  },

  // A big stone throne, scorched, with a bright red cushion
  throne(p, b) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x + w * 0.1, y, w * 0.8, h * 0.75, '#757575', { sw: 1.1, r: 20 * S });
    p.poly([[x + w * 0.1, y + h * 0.08], [x + w * 0.5, y - h * 0.08], [x + w * 0.9, y + h * 0.08]], '#616161', { sw: 1 });
    p.rect(x + w * 0.22, y + h * 0.12, w * 0.56, h * 0.45, '#c62828', { sw: 0.8, r: 14 * S });
    p.rect(x, y + h * 0.55, w, h * 0.12, '#616161', { sw: 1, r: 8 * S });
    p.rect(x + w * 0.05, y + h * 0.67, w * 0.15, h * 0.33, '#616161', { sw: 0.9 });
    p.rect(x + w * 0.8, y + h * 0.67, w * 0.15, h * 0.33, '#616161', { sw: 0.9 });
    // scorch marks from its fire eyes
    for (const [fx, fy] of [[0.35, 0.25], [0.62, 0.3]]) p.ellipse(x + w * fx, y + h * fy, w * 0.07, h * 0.03, 'rgba(30, 10, 0, 0.55)', { ink: false });
    p.emoji(x + w * 0.5, y - h * 0.02, '🔥', h * 0.1);
  },

  // A torch on the wall
  torch(p, b) {
    const { x, y, w, h } = b;
    p.poly([[x + w * 0.2, y + h * 0.4], [x + w * 0.8, y + h * 0.4], [x + w * 0.6, y + h], [x + w * 0.4, y + h]], '#6d4c41', { sw: 0.8 });
    p.rect(x, y + h * 0.35, w, h * 0.08, '#9e9e9e', { sw: 0.6 });
    p.emoji(x + w / 2, y + h * 0.2, '🔥', h * 0.35);
  },

  // A hanging banner with a swallow-tail bottom. color, emoji
  banner(p, b, o) {
    const { x, y, w, h } = b;
    p.line(x - w * 0.15, y, x + w * 1.15, y, { sw: 1.1, stroke: '#5d4037' });
    p.poly([[x, y], [x + w, y], [x + w, y + h], [x + w / 2, y + h * 0.82], [x, y + h]], o.color || '#ffca28', { sw: 0.8 });
    if (o.emoji) p.emoji(x + w / 2, y + h * 0.4, o.emoji, Math.min(w * 0.7, h * 0.3));
  },

  // A suit of armor on a stand: helmet, body and a badge. color, emoji
  armorStand(p, b, o) {
    const { x, y, w, h } = b, S = p.S;
    const c = o.color || '#b0bec5';
    p.line(x + w / 2, y + h * 0.2, x + w / 2, y + h, { sw: 0.9, stroke: '#5d4037' });
    p.rect(x + w * 0.15, y + h * 0.96, w * 0.7, h * 0.04, '#5d4037', { sw: 0.6 });
    p.path(`M ${x + w * 0.2} ${y + h * 0.18} A ${w * 0.3} ${w * 0.3} 0 0 1 ${x + w * 0.8} ${y + h * 0.18} L ${x + w * 0.8} ${y + h * 0.26} L ${x + w * 0.2} ${y + h * 0.26} Z`, c, { sw: 0.8 });
    p.rect(x + w * 0.3, y + h * 0.18, w * 0.4, h * 0.03, '#263238', { ink: false });
    p.path(`M ${x} ${y + h * 0.3} L ${x + w} ${y + h * 0.3} L ${x + w * 0.85} ${y + h * 0.62} L ${x + w * 0.15} ${y + h * 0.62} Z`, c, { sw: 0.9 });
    p.rect(x + w * 0.18, y + h * 0.62, w * 0.64, h * 0.08, c, { sw: 0.7, r: 6 * S });
    if (o.emoji) p.emoji(x + w / 2, y + h * 0.45, o.emoji, w * 0.45);
  }
});
