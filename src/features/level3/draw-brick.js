// ---------- Drawing the Brick (a big red brick with fire eyes) ----------
// Hand + sword angle per pose, in the Brick's own units (100 = its height),
// facing right (see MALLOW_POSES). Used with bossTail(b, now, BRICK_POSES).
const BRICK_POSES = {
  idle:   { tx: 40, ty: -50,  a: -1.1 },
  windup: { tx: 14, ty: -108, a: -2.6 },
  strike: { tx: 58, ty: -60,  a: 0.45 },
  block:  { tx: 48, ty: -52,  a: -1.5 },
  hit:    { tx: 26, ty: -38,  a: -2.2 }
};
const BRICK_SWORD = { blade: '#CFD8DC', glow: '#FF7043' };   // a heavy iron sword, glowing hot

// x, feetY: screen/map px of the feet. H: height in px.
// o: { tail (arm pose), moving, walk, mouth, t, dizzy, swoosh, sitting }
function drawBrick(x, feetY, H, facing, o) {
  const s = H / 100;
  const t = o.t || performance.now();
  const arm = o.tail || BRICK_POSES.idle;
  const stride = o.moving ? Math.sin(o.walk * 9) : 0;
  const bob = o.moving ? Math.abs(stride) * 4 : Math.sin(t / 420) * 1;
  const ink = '#2a120a';
  const red = '#C0603F', dark = '#8D3B24', light = '#D9825F';
  const bw = 34, top = -98, bottom = -16, depth = 10;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x, feetY, 44 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, feetY);
  ctx.scale(facing === 'left' ? -s : s, s);
  if (o.dizzy) ctx.translate(Math.sin(t / 25) * 2, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;

  // chunky stone legs (stomp stomp), tucked away while it sits
  if (!o.sitting) {
    for (const [lx, ph] of [[-15, 1], [15, -1]]) {
      const sw = stride * 7 * ph;
      ctx.lineWidth = 3;
      ctx.fillStyle = dark;
      ctx.fillRect(lx - 8 + sw, -18, 16, 16);
      ctx.strokeRect(lx - 8 + sw, -18, 16, 16);
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(lx - 10 + sw, -5, 20, 5);
      ctx.strokeRect(lx - 10 + sw, -5, 20, 5);
    }
  }
  ctx.translate(0, -bob + (o.sitting ? 10 : 0));

  // back arm (a stubby block)
  ctx.lineWidth = 3;
  ctx.fillStyle = dark;
  ctx.fillRect(-bw - 10, -64, 12, 22);
  ctx.strokeRect(-bw - 10, -64, 12, 22);

  // the side face (depth), then the front face
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(bw, top);
  ctx.lineTo(bw + depth, top - depth * 0.7);
  ctx.lineTo(bw + depth, bottom - depth * 0.7);
  ctx.lineTo(bw, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // top face, with the three holes every brick has
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(-bw, top);
  ctx.lineTo(-bw + depth, top - depth * 0.7);
  ctx.lineTo(bw + depth, top - depth * 0.7);
  ctx.lineTo(bw, top);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#4E2314';
  for (const hx of [-18, 2, 22]) {
    ctx.beginPath();
    ctx.ellipse(hx + depth * 0.5, top - depth * 0.35, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const body = ctx.createLinearGradient(-bw, 0, bw, 0);
  body.addColorStop(0, '#B4553A');
  body.addColorStop(0.4, red);
  body.addColorStop(1, '#A94E33');
  ctx.fillStyle = body;
  ctx.fillRect(-bw, top, bw * 2, bottom - top);
  ctx.strokeRect(-bw, top, bw * 2, bottom - top);
  // cracks and chips, and a few dents from old fights
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(60, 20, 10, 0.6)';
  ctx.beginPath();
  ctx.moveTo(-bw + 6, -30); ctx.lineTo(-bw + 14, -26); ctx.lineTo(-bw + 10, -20);
  ctx.moveTo(bw - 4, -84); ctx.lineTo(bw - 12, -80); ctx.lineTo(bw - 9, -74);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 220, 200, 0.25)';
  for (const [dx, dy] of [[-22, -88], [-26, -40], [10, -24]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = ink;

  // FIRE EYES: dark sockets with flames burning out of them
  const eyeY = -72;
  const eyes = [[2, 8], [22, 8]];
  ctx.save();
  ctx.shadowColor = '#FF6D00';
  ctx.shadowBlur = 14;
  for (const [ex, er] of eyes) {
    ctx.fillStyle = '#1a0601';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, er, er * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.dizzy) continue;
    drawFlame(ex, eyeY + er * 0.6, er * 1.6, er * 3.2, t, ex + 11);
  }
  ctx.restore();
  if (o.dizzy) {
    ctx.strokeStyle = '#FFAB40';
    ctx.lineWidth = 2;
    for (const [ex, er] of eyes) {
      ctx.beginPath();
      ctx.arc(ex, eyeY, er * 0.5, 0, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.strokeStyle = ink;
  } else {
    // a heavy, angry unibrow
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-8, eyeY - 18);
    ctx.lineTo(12, eyeY - 10);
    ctx.lineTo(32, eyeY - 18);
    ctx.stroke();
  }
  // mouth: a square grin with stone teeth, or wide open while it yells
  const mY = -42;
  ctx.lineWidth = 3;
  if (o.mouth > 0.05) {
    ctx.fillStyle = '#3a0d04';
    ctx.fillRect(2, mY - 4, 22, 6 + 12 * o.mouth);
    ctx.strokeRect(2, mY - 4, 22, 6 + 12 * o.mouth);
    ctx.fillStyle = '#FF7043';
    ctx.fillRect(6, mY + 1 + 8 * o.mouth, 14, 3 + 2 * o.mouth);
  } else {
    ctx.fillStyle = '#ECEFF1';
    ctx.fillRect(2, mY - 4, 22, 8);
    ctx.strokeRect(2, mY - 4, 22, 8);
    for (const tx of [8, 13, 18]) {
      ctx.beginPath();
      ctx.moveTo(tx, mY - 4);
      ctx.lineTo(tx, mY + 4);
      ctx.stroke();
    }
  }

  // front arm out to the hand, holding the hot iron sword
  const hand = { x: arm.tx, y: arm.ty };
  if (o.swoosh > 0) {
    ctx.save();
    ctx.globalAlpha = o.swoosh;
    ctx.strokeStyle = 'rgba(255, 112, 67, 0.9)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 58, arm.a - 1.7, arm.a);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(bw - 4, -60);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(arm.a);
  drawSword(64, 2.8, BRICK_SWORD);
  ctx.restore();
  ctx.fillStyle = dark;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.fillRect(hand.x - 7, hand.y - 7, 14, 14);
  ctx.strokeRect(hand.x - 7, hand.y - 7, 14, 14);
  ctx.restore();
  if (o.dizzy) drawDizzyStars(x, feetY - H * 1.05, H * 0.12, t);
}

// ---------- The fight: the castle's great hall ----------
function drawCastleArena(v, now) {
  const W = canvas.width, Hc = canvas.height, g = v.groundY;
  const k = Math.max(0.6, v.scale);
  // brick walls
  ctx.fillStyle = '#7b3a26';
  ctx.fillRect(-30, -30, W + 60, g + 30);
  const bh = 34 * k, bwid = 80 * k;
  ctx.strokeStyle = 'rgba(40, 14, 6, 0.55)';
  ctx.lineWidth = 2;
  for (let r = 0, y = g; y > -bh; r++, y -= bh) {
    ctx.beginPath();
    ctx.moveTo(-30, y);
    ctx.lineTo(W + 30, y);
    ctx.stroke();
    for (let x = (r % 2) * bwid / 2 - bwid; x < W + bwid; x += bwid) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - bh);
      ctx.stroke();
    }
  }
  // a big shadowy arch in the middle
  ctx.fillStyle = 'rgba(20, 6, 2, 0.55)';
  const aw = W * 0.22, ah = g * 0.62;
  ctx.beginPath();
  ctx.moveTo(W / 2 - aw / 2, g);
  ctx.lineTo(W / 2 - aw / 2, g - ah + aw / 2);
  ctx.arc(W / 2, g - ah + aw / 2, aw / 2, Math.PI, 0);
  ctx.lineTo(W / 2 + aw / 2, g);
  ctx.closePath();
  ctx.fill();
  // banners
  for (const fx of [0.2, 0.8]) {
    const bx = W * fx, by = g * 0.12, bw2 = 60 * k, bhh = 160 * k;
    ctx.fillStyle = '#FFCA28';
    ctx.beginPath();
    ctx.moveTo(bx - bw2 / 2, by);
    ctx.lineTo(bx + bw2 / 2, by);
    ctx.lineTo(bx + bw2 / 2, by + bhh);
    ctx.lineTo(bx, by + bhh * 0.82);
    ctx.lineTo(bx - bw2 / 2, by + bhh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = `${Math.round(30 * k)}px ${SCENE_EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText('🧱', bx, by + bhh * 0.4);
  }
  // torches with flickering light
  for (const fx of [0.08, 0.38, 0.62, 0.92]) {
    const tx = W * fx, ty = g * 0.42;
    const glow = ctx.createRadialGradient(tx, ty, 0, tx, ty, 180 * k);
    glow.addColorStop(0, `rgba(255, 150, 50, ${0.35 + 0.08 * Math.sin(now / 90 + fx * 10)})`);
    glow.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(tx - 180 * k, ty - 180 * k, 360 * k, 360 * k);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(tx - 6 * k, ty, 12 * k, 50 * k);
    drawFlame(tx, ty + 2 * k, 20 * k, 46 * k, now, fx * 20);
  }
  // stone floor
  const floor = ctx.createLinearGradient(0, g, 0, Hc);
  floor.addColorStop(0, '#6d6a74');
  floor.addColorStop(1, '#3b3940');
  ctx.fillStyle = floor;
  ctx.fillRect(-30, g, W + 60, Hc - g + 30);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 2;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * W * 0.04, g);
    ctx.lineTo(W / 2 + i * W * 0.16, Hc);
    ctx.stroke();
  }
  ctx.strokeStyle = '#1e1c22';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-30, g);
  ctx.lineTo(W + 30, g);
  ctx.stroke();
  // a red carpet down the middle
  ctx.fillStyle = 'rgba(183, 28, 28, 0.75)';
  ctx.beginPath();
  ctx.moveTo(W / 2 - W * 0.06, g);
  ctx.lineTo(W / 2 + W * 0.06, g);
  ctx.lineTo(W / 2 + W * 0.2, Hc);
  ctx.lineTo(W / 2 - W * 0.2, Hc);
  ctx.closePath();
  ctx.fill();
}

function drawFightBrick(v, f, now) {
  const b = f.b;
  const t = now - b.actStart;
  drawArmorGlow(v, b, now);
  let mouth = shoutMouth(f.shout, now);
  if (b.act === 'attack' && t < B_ACTIVE + 120) mouth = 1;
  drawBrick(v.sx(b.x), v.sy(b.y), 215 * v.scale * 1.08, b.facing, {
    tail: bossTail(b, now, BRICK_POSES),
    moving: b.act === 'walk',
    walk: b.walk,
    mouth,
    t: now,
    dizzy: b.act === 'hit' || b.act === 'ko',
    swoosh: b.act === 'attack' && t < B_ACTIVE + 100 ? 1 - t / (B_ACTIVE + 100) : 0
  });
}

// ---------- On the map ----------
function drawMapBrick() {
  const p = brickPos();
  const now = performance.now();
  const engaged = bossEngage && bossEngage.brick;
  const arm = engaged
    ? { ...BRICK_POSES.windup, a: BRICK_POSES.windup.a + Math.sin(now / 30) * 0.06 }
    : { ...BRICK_POSES.idle, a: BRICK_POSES.idle.a + Math.sin(now / 500) * 0.1 };
  drawBrick(p.x, p.y, brickHeight(), brick.facing, {
    tail: arm, moving: brick.moving, walk: brick.walk, t: now,
    mouth: shoutMouth(brick.shout, now), sitting: brick.where === 'home' && !engaged
  });
}

function drawBrickHint() {
  const p = brickPos();
  const x = p.x;
  const y = p.y - brickHeight() - 14;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Comic Sans MS", cursive';
  const label = `${brickCfg().name} · Lv ${brickLevel()}`;
  const lw = ctx.measureText(label).width + 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  roundRect(x - lw / 2, y - 14, lw, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#FF8A65';
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
function drawBrickShout() {
  if (!brickHere() || !brick.shout) return;
  const p = brickPos();
  const H = brickHeight();
  const dir = brick.facing === 'left' ? -1 : 1;
  drawShout(p.x - camera.x + dir * 0.4 * H, p.y - 0.95 * H - camera.y, brick.shout.text, performance.now() - brick.shout.start, 20);
}

registerScreenLayer(23, () => drawBrickShout());
registerMapPeople(() => brickHere() ? [{ y: brickPos().y, draw: () => drawMapBrick() }] : []);
