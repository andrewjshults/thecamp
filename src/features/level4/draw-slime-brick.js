// ---------- Drawing the Slime Brick (a wobbly green jelly brick with a crown) ----------
// Hand + sword angle per pose, in its own units (100 = its height), facing
// right (see MALLOW_POSES). Used with bossTail(b, now, SLIME_POSES).
const SLIME_POSES = {
  idle:   { tx: 42, ty: -48,  a: -1.1 },
  windup: { tx: 16, ty: -104, a: -2.6 },
  strike: { tx: 60, ty: -58,  a: 0.45 },
  block:  { tx: 50, ty: -50,  a: -1.5 },
  hit:    { tx: 28, ty: -36,  a: -2.2 }
};
const SLIME_SWORD = { blade: '#DCEDC8', glow: '#C6FF00' };   // a sword dripping with goo

// x, feetY: screen/map px of the bottom. H: height in px.
// o: { tail (arm pose), moving, walk, mouth, t, dizzy, swoosh }
function drawSlimeBrick(x, feetY, H, facing, o) {
  const s = H / 100;
  const t = o.t || performance.now();
  const arm = o.tail || SLIME_POSES.idle;
  // it doesn't walk, it wobbles along: squash and stretch
  const wob = o.moving ? Math.sin(o.walk * 10) : Math.sin(t / 380) * 0.35;
  const sx = 1 + wob * 0.06, sy = 1 - wob * 0.06;
  const ink = '#1b3a07';
  const bw = 36, top = -92, bottom = 0;

  ctx.save();
  ctx.fillStyle = 'rgba(51, 105, 30, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, feetY, 52 * s, 10 * s, 0, 0, Math.PI * 2);   // a puddle of goo under it
  ctx.fill();
  ctx.translate(x, feetY);
  ctx.scale((facing === 'left' ? -s : s) * sx, s * sy);
  if (o.dizzy) ctx.translate(Math.sin(t / 25) * 2, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;

  // back arm (a goopy blob)
  ctx.lineWidth = 3;
  ctx.fillStyle = '#7CB342';
  ctx.beginPath();
  ctx.ellipse(-bw - 4, -56, 8, 13, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // the jelly body: a rounded brick with drips along the bottom
  const body = ctx.createLinearGradient(0, top, 0, bottom);
  body.addColorStop(0, 'rgba(174, 213, 129, 0.97)');
  body.addColorStop(1, 'rgba(85, 139, 47, 0.97)');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-bw + 10, top);
  ctx.lineTo(bw - 10, top);
  ctx.quadraticCurveTo(bw, top, bw, top + 10);
  ctx.lineTo(bw, bottom - 6);
  // drips
  const drips = [[bw - 8, 9], [10, 13], [-14, 7], [-bw + 8, 11]];

  for (const [dx, len] of drips) {
    const l = len + Math.sin(t / 300 + dx) * 3;
    ctx.lineTo(dx + 5, bottom - 6);
    ctx.quadraticCurveTo(dx, bottom - 6 + l * 2, dx - 5, bottom - 6);

  }
  ctx.lineTo(-bw, bottom - 6);
  ctx.lineTo(-bw, top + 10);
  ctx.quadraticCurveTo(-bw, top, -bw + 10, top);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // the three brick holes on top, full of goo, and a shine
  ctx.fillStyle = '#33691E';
  for (const hx of [-18, 2, 22]) {
    ctx.beginPath();
    ctx.ellipse(hx, top + 7, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-bw + 12, top + 22, 4, 12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // bubbles floating inside it
  ctx.strokeStyle = 'rgba(240, 255, 200, 0.7)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const by = bottom - 14 - ((t / 40 + i * 22) % 70);
    ctx.beginPath();
    ctx.arc(-20 + i * 12, by, 2.5 + (i % 2), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = ink;

  // the crown, wobbling on top
  ctx.save();
  ctx.translate(4, top - 2);
  ctx.rotate(Math.sin(t / 500) * 0.06 + (o.dizzy ? 0.3 : 0));
  ctx.fillStyle = '#FFD54F';
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-20, -18);
  ctx.lineTo(-9, -8);
  ctx.lineTo(0, -22);
  ctx.lineTo(9, -8);
  ctx.lineTo(20, -18);
  ctx.lineTo(18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#E53935';
  for (const gx of [-9, 0, 9]) {
    ctx.beginPath();
    ctx.arc(gx, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // googly eyes (they look at you), or dizzy swirls
  const eyeY = -64;
  for (const [ex, er] of [[4, 9], [24, 9]]) {
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ex, eyeY, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (o.dizzy) {
      ctx.strokeStyle = '#33691E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, eyeY, er * 0.5, t / 100, t / 100 + Math.PI * 1.6);
      ctx.stroke();
      ctx.strokeStyle = ink;
    } else {
      ctx.fillStyle = '#1B5E20';
      ctx.beginPath();
      ctx.arc(ex + 3 + Math.sin(t / 700) * 1.5, eyeY + 1, er * 0.48, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (!o.dizzy) {
    // grumpy eyebrows
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-6, eyeY - 16);
    ctx.lineTo(12, eyeY - 10);
    ctx.moveTo(16, eyeY - 10);
    ctx.lineTo(34, eyeY - 16);
    ctx.stroke();
  }
  // mouth: a wobbly grin, or wide open with goo strings while it yells
  const mY = -36;
  ctx.lineWidth = 3;
  if (o.mouth > 0.05) {
    ctx.fillStyle = '#1B3A07';
    ctx.beginPath();
    ctx.ellipse(14, mY + 4, 13, 4 + 9 * o.mouth, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#C6FF00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, mY - 3);
    ctx.lineTo(8, mY + 6 + 6 * o.mouth);
    ctx.moveTo(20, mY - 3);
    ctx.lineTo(20, mY + 4 + 6 * o.mouth);
    ctx.stroke();
    ctx.strokeStyle = ink;
  } else {
    ctx.beginPath();
    ctx.moveTo(0, mY);
    ctx.quadraticCurveTo(7, mY + 7, 14, mY);
    ctx.quadraticCurveTo(21, mY + 7, 28, mY);
    ctx.stroke();
  }

  // front arm out to the hand, holding the gooey sword
  const hand = { x: arm.tx, y: arm.ty };
  if (o.swoosh > 0) {
    ctx.save();
    ctx.globalAlpha = o.swoosh;
    ctx.strokeStyle = 'rgba(198, 255, 0, 0.9)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 58, arm.a - 1.7, arm.a);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(bw - 4, -56);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.strokeStyle = '#8BC34A';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(arm.a);
  drawSword(64, 2.8, SLIME_SWORD);
  ctx.restore();
  ctx.fillStyle = '#8BC34A';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (o.dizzy) drawDizzyStars(x, feetY - H * 1.1, H * 0.12, t);
}

// ---------- The fight: the slime swamp ----------
function drawSlimeArena(v, now) {
  const W = canvas.width, Hc = canvas.height, g = v.groundY;
  const k = Math.max(0.6, v.scale);
  // a murky green sky, with the throne's towers far away
  const sky = ctx.createLinearGradient(0, 0, 0, g);
  sky.addColorStop(0, '#1b3a1f');
  sky.addColorStop(1, '#4e7d34');
  ctx.fillStyle = sky;
  ctx.fillRect(-30, -30, W + 60, g + 30);
  ctx.fillStyle = 'rgba(20, 45, 15, 0.8)';
  for (const fx of [0.72, 0.86]) ctx.fillRect(W * fx, g * 0.25, 60 * k, g * 0.75);
  ctx.fillRect(W * 0.72, g * 0.5, W * 0.14 + 60 * k, g * 0.5);
  ctx.font = `${Math.round(40 * k)}px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText('👑', W * 0.79 + 30 * k, g * 0.6);
  // bubbles rising
  for (let i = 0; i < 14; i++) {
    const x = (i * 97 + 40) % W;
    const y = g - ((now / 30 + i * 53) % (g * 0.9));
    ctx.strokeStyle = 'rgba(204, 255, 144, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, (5 + (i % 4) * 3) * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  // the goo floor, with ripples
  const floor = ctx.createLinearGradient(0, g, 0, Hc);
  floor.addColorStop(0, '#8bc34a');
  floor.addColorStop(1, '#33691e');
  ctx.fillStyle = floor;
  ctx.fillRect(-30, g, W + 60, Hc - g + 30);
  ctx.strokeStyle = 'rgba(220, 237, 200, 0.45)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const y = g + (Hc - g) * (0.15 + i * 0.18);
    ctx.beginPath();
    for (let x = -30; x <= W + 30; x += 20) {
      const yy = y + Math.sin(x / 60 + now / 500 + i) * 5 * k;
      if (x === -30) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  // goo dripping from the top edge of the floor
  ctx.strokeStyle = '#1b3a07';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-30, g);
  ctx.lineTo(W + 30, g);
  ctx.stroke();
}

function drawFightSlime(v, f, now) {
  const b = f.b;
  const t = now - b.actStart;
  drawArmorGlow(v, b, now);
  let mouth = shoutMouth(f.shout, now);
  if (b.act === 'attack' && t < B_ACTIVE + 120) mouth = 1;
  drawSlimeBrick(v.sx(b.x), v.sy(b.y), 215 * v.scale * 1.1, b.facing, {
    tail: bossTail(b, now, SLIME_POSES),
    moving: b.act === 'walk',
    walk: b.walk,
    mouth,
    t: now,
    dizzy: b.act === 'hit' || b.act === 'ko',
    swoosh: b.act === 'attack' && t < B_ACTIVE + 100 ? 1 - t / (B_ACTIVE + 100) : 0
  });
}

// ---------- On the map ----------
// Goopy eyes peeking out of the den while it's home
function drawSlimeDen() {
  const den = slimeDen();
  if (!den || !slimeHere() || slime.where !== 'home') return;
  const now = performance.now();
  const cx = den.x + den.width / 2, cy = den.y + den.height * 0.6;
  const r = den.width * 0.12;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.6);
  glow.addColorStop(0, `rgba(198, 255, 0, ${0.3 + 0.1 * Math.sin(now / 250)})`);
  glow.addColorStop(1, 'rgba(198, 255, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2);
  ctx.fill();
  const blink = now % 3800 < 160;
  for (const side of [-1, 1]) {
    const ex = cx + side * r * 0.5, ey = cy;
    if (blink) {
      ctx.fillStyle = '#C6FF00';
      ctx.fillRect(ex - r * 0.3, ey, r * 0.6, 3);
      continue;
    }
    ctx.fillStyle = '#F1F8E9';
    ctx.beginPath();
    ctx.arc(ex, ey, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.arc(ex + Math.sin(now / 900) * r * 0.1, ey, r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMapSlime() {
  const p = slimePos();
  const now = performance.now();
  const engaged = bossEngage && bossEngage.slime;
  const arm = engaged
    ? { ...SLIME_POSES.windup, a: SLIME_POSES.windup.a + Math.sin(now / 30) * 0.06 }
    : { ...SLIME_POSES.idle, a: SLIME_POSES.idle.a + Math.sin(now / 450) * 0.12 };
  drawSlimeBrick(p.x, p.y, slimeHeight(), slime.facing, {
    tail: arm, moving: slime.moving, walk: slime.walk, t: now, mouth: shoutMouth(slime.shout, now)
  });
}

function drawSlimeHint() {
  const p = slimePos();
  const x = p.x;
  const y = p.y - slimeHeight() - 30;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Comic Sans MS", cursive';
  const label = `${slimeCfg().name} · Lv ${slimeLevel()}`;
  const lw = ctx.measureText(label).width + 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  roundRect(x - lw / 2, y - 14, lw, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#C6FF00';
  ctx.fillText(label, x, y + 2);
  const hint = !hasSword() ? '🏃 No sword... RUN!'
    : isTouchDevice() ? '⚔️ [ TAP ME ] Fight!' : '⚔️ [ SPACE ] Fight!';
  ctx.font = '11px "Comic Sans MS", cursive';
  const hw = ctx.measureText(hint).width + 12;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  roundRect(x - hw / 2, y - 38, hw, 18, 4);
  ctx.fill();
  ctx.fillStyle = hasSword() ? '#FFF9C4' : '#FF8A80';
  ctx.fillText(hint, x, y - 25);
}

// Screen space, after the map is drawn
function drawSlimeShout() {
  if (!slimeOut() || !slime.shout) return;
  const p = slimePos();
  const H = slimeHeight();
  const dir = slime.facing === 'left' ? -1 : 1;
  drawShout(p.x - camera.x + dir * 0.4 * H, p.y - 1.05 * H - camera.y, slime.shout.text, performance.now() - slime.shout.start, 20);
}

registerMapLayer(22, () => drawSlimeDen());
registerScreenLayer(24, () => drawSlimeShout());
registerMapPeople(() => slimeOut() ? [{ y: slimePos().y, draw: () => drawMapSlime() }] : []);
