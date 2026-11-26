// --- Scene props: the bank (assets/camp_bank.json) ---
// Each gets (pen, box in px, prop JSON); see SCENE_PROPS in src/core/hooks.js.
registerSceneProps({
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
});
