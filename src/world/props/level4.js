// --- Scene props: the Fourth Camp's rooms (the trapdoor in the Brick's
// castle, the Safe Zone's code finder, the Slime Brick's throne room) ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
  // A wooden trapdoor in the floor, with an iron ring
  trapdoor(p, b) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, '#3e2723', { sw: 1.1, r: 6 * S });
    p.rect(x + w * 0.06, y + h * 0.08, w * 0.88, h * 0.84, '#8d6e63', { sw: 0.9, r: 4 * S });
    for (let i = 1; i < 4; i++) p.line(x + w * (0.06 + i * 0.22), y + h * 0.08, x + w * (0.06 + i * 0.22), y + h * 0.92, { sw: 0.5, stroke: '#4e342e' });
    for (const fy of [0.25, 0.75]) p.rect(x + w * 0.02, y + h * fy - h * 0.05, w * 0.96, h * 0.1, '#616161', { sw: 0.6 });
    p.circle(x + w * 0.5, y + h * 0.5, Math.min(w, h) * 0.14, null, { sw: 1.1, stroke: '#424242' });
  },

  // A big screen full of glowing codes (the Safe Zone's code finder)
  codeScreen(p, b) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, '#455a64', { sw: 1.2, r: 14 * S });
    p.rect(x + w * 0.06, y + h * 0.08, w * 0.88, h * 0.7, '#102027', { sw: 0.8, r: 8 * S });
    const rows = ['? ? ?', '🔒 → 🔓', '? ? ?'];
    rows.forEach((r, i) => p.text(x + w / 2, y + h * (0.22 + i * 0.2), r, { size: h * 0.13, color: '#b2ff59', layer: 'top' }));
    for (let i = 0; i < 5; i++) p.circle(x + w * (0.2 + i * 0.15), y + h * 0.88, h * 0.04, ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'][i], { sw: 0.4 });
  },

  // The Slime Brick's throne: a big green seat dripping with goo, a crown on top
  slimeThrone(p, b) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x + w * 0.1, y + h * 0.05, w * 0.8, h * 0.7, '#33691e', { sw: 1.1, r: 24 * S });
    p.rect(x + w * 0.22, y + h * 0.16, w * 0.56, h * 0.42, '#aed581', { sw: 0.8, r: 16 * S });
    p.rect(x, y + h * 0.55, w, h * 0.13, '#558b2f', { sw: 1, r: 10 * S });
    p.rect(x + w * 0.05, y + h * 0.68, w * 0.15, h * 0.32, '#558b2f', { sw: 0.9 });
    p.rect(x + w * 0.8, y + h * 0.68, w * 0.15, h * 0.32, '#558b2f', { sw: 0.9 });
    for (const fx of [0.18, 0.45, 0.72]) p.path(`M ${x + w * fx} ${y + h * 0.68} q ${w * 0.04} ${h * 0.12} ${w * 0.08} 0`, '#c6ff00', { sw: 0.6 });
    p.emoji(x + w * 0.5, y, '👑', h * 0.16);
  }
});
