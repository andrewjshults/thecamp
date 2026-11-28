// --- Scene props: the Fifth Camp's rooms (Charlie's shield wall, the
// Moon's Palace) ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
  // A wall of shields on hooks: `shields` is a list of emoji, one per shield
  shieldWall(p, b, prop) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, '#a1887f', { sw: 1.1, r: 10 * S });
    p.rect(x + w * 0.04, y + h * 0.06, w * 0.92, h * 0.88, '#d7ccc8', { sw: 0.7, r: 6 * S });
    const list = prop.shields || ['🛡️'];
    const colors = ['#a1887f', '#ff7043', '#fff176', '#90caf9'];
    list.forEach((emoji, i) => {
      const cx = x + w * (i + 0.5) / list.length, top = y + h * 0.2, sw = w / list.length * 0.7, sh = h * 0.6;
      p.circle(cx, top - h * 0.06, 6 * S, '#616161', { sw: 0.4 });
      p.path(`M ${cx - sw / 2} ${top} L ${cx + sw / 2} ${top} L ${cx + sw / 2} ${top + sh * 0.55} ` +
        `Q ${cx} ${top + sh * 1.05} ${cx - sw / 2} ${top + sh * 0.55} Z`, colors[i % colors.length], { sw: 1 });
      p.emoji(cx, top + sh * 0.4, emoji, sh * 0.32);
    });
  },

  // A window full of night sky, with a crescent moon and stars
  starrySky(p, b) {
    const { x, y, w, h } = b, S = p.S;
    p.rect(x, y, w, h, '#1a237e', { sw: 1.2, r: 18 * S });
    for (let i = 0; i < 26; i++) {
      const fx = (i * 0.379) % 1, fy = (i * 0.611) % 1;
      p.circle(x + w * (0.04 + fx * 0.92), y + h * (0.08 + fy * 0.84), (3 + (i % 3) * 2) * S, '#fff9c4', { ink: false });
    }
    p.circle(x + w * 0.82, y + h * 0.32, h * 0.2, '#fff59d', { sw: 0.8 });
    p.circle(x + w * 0.86, y + h * 0.27, h * 0.17, '#1a237e', { ink: false });
  },

  // The Moon's throne: a big silver crescent with a frosty seat
  moonThrone(p, b) {
    const { x, y, w, h } = b, S = p.S;
    const cx = x + w / 2, cy = y + h * 0.36, r = Math.min(w * 0.5, h * 0.36);
    p.circle(cx, cy, r, '#e8eaf6', { sw: 1.2 });
    p.circle(cx + r * 0.35, cy - r * 0.2, r * 0.8, '#c5cae9', { ink: false });
    p.rect(x + w * 0.08, y + h * 0.56, w * 0.84, h * 0.14, '#9fa8da', { sw: 1, r: 10 * S });
    p.rect(x + w * 0.12, y + h * 0.7, w * 0.14, h * 0.3, '#7986cb', { sw: 0.9 });
    p.rect(x + w * 0.74, y + h * 0.7, w * 0.14, h * 0.3, '#7986cb', { sw: 0.9 });
    for (const fx of [0.2, 0.5, 0.8]) p.emoji(x + w * fx, y + h * 0.58, '❄️', h * 0.06);
    p.emoji(cx - r * 0.35, cy - r * 0.1, '⭐', r * 0.35);
  }
});
