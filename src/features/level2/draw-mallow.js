// ---------- Drawing the Marshmallows (a big puffy marshmallow with fire eyes) ----------
// Hand + sword angle per pose, in the Marshmallow's own units (100 = its
// height), facing right: angle 0 points forward, -π/2 straight up. Used with
// bossTail(b, now, MALLOW_POSES) in the fight.
const MALLOW_POSES = {
  idle:   { tx: 36, ty: -50,  a: -1.15 },
  windup: { tx: 12, ty: -104, a: -2.6 },
  strike: { tx: 54, ty: -62,  a: 0.45 },
  block:  { tx: 46, ty: -50,  a: -1.5 },
  hit:    { tx: 24, ty: -38,  a: -2.2 }
};
const MALLOW_SWORD = { blade: '#FFE0B2', glow: '#FF7043' };   // a toasting-stick sword, on fire

// One flickering flame, base at (0, 0), `h` tall
function drawFlame(x, y, w, h, t, seed) {
  const f = 1 + 0.18 * Math.sin(t / 60 + seed) + 0.1 * Math.sin(t / 23 + seed * 3);
  const lean = Math.sin(t / 110 + seed) * w * 0.25;
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, 0, 0, -h * f);
  g.addColorStop(0, '#FF3D00');
  g.addColorStop(0.45, '#FF9100');
  g.addColorStop(1, '#FFEA00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-w * 0.6, -h * f * 0.5, lean, -h * f);
  ctx.quadraticCurveTo(w * 0.6, -h * f * 0.5, w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 200, 0.85)';
  ctx.beginPath();
  ctx.ellipse(lean * 0.3, -h * f * 0.25, w * 0.18, h * f * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// x, feetY: screen/map px of the feet. H: height in px.
// o: { tail (arm pose), moving, walk, mouth, t, dizzy, swoosh, kid }
function drawMallow(x, feetY, H, facing, o) {
  const s = H / 100;
  const t = o.t || performance.now();
  const arm = o.tail || MALLOW_POSES.idle;
  const stride = o.moving ? Math.sin(o.walk * (o.kid ? 15 : 11)) : 0;
  const bob = o.moving ? Math.abs(stride) * 3 : Math.sin(t / 380) * 1.4;
  const ink = '#3a1d0a';
  const puff = o.kid ? '#FFFDF8' : '#FFFBF0';
  const toast = o.kid ? '#F3D9A4' : '#E4B26A';
  // the kid is rounder and squatter
  const bw = o.kid ? 33 : 30, top = o.kid ? -88 : -96, bottom = -16;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, feetY, 40 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, feetY);
  ctx.scale(facing === 'left' ? -s : s, s);
  if (o.dizzy) ctx.translate(Math.sin(t / 25) * 2, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;

  // stubby legs
  for (const [lx, ph] of [[-13, 1], [13, -1]]) {
    const sw = stride * 6 * ph;
    ctx.lineWidth = 3;
    ctx.fillStyle = puff;
    ctx.beginPath();
    ctx.ellipse(lx + sw, -8, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.translate(0, -bob);
  // back arm (a little stub)
  ctx.lineWidth = 3;
  ctx.fillStyle = puff;
  ctx.beginPath();
  ctx.ellipse(-bw - 3, -54, 7, 11, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // the body: a puffy cylinder with a toasty top
  ctx.beginPath();
  ctx.moveTo(-bw, top + 8);
  ctx.quadraticCurveTo(-bw - 4, (top + bottom) / 2, -bw, bottom - 4);
  ctx.quadraticCurveTo(-bw, bottom + 4, -bw + 10, bottom + 4);
  ctx.lineTo(bw - 10, bottom + 4);
  ctx.quadraticCurveTo(bw, bottom + 4, bw, bottom - 4);
  ctx.quadraticCurveTo(bw + 4, (top + bottom) / 2, bw, top + 8);
  ctx.closePath();
  const body = ctx.createLinearGradient(-bw, 0, bw, 0);
  body.addColorStop(0, '#EDE3D1');
  body.addColorStop(0.35, puff);
  body.addColorStop(1, '#F1E7D5');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // toasty top (the end of the cylinder)
  ctx.beginPath();
  ctx.ellipse(0, top + 8, bw, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = toast;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(140, 80, 30, 0.45)';
  for (const [tx, ty, r] of [[-12, top + 7, 5], [8, top + 10, 4], [18, top + 6, 3]]) {
    ctx.beginPath();
    ctx.ellipse(tx, ty, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // a toasted patch on its side + powdery sugar dots
  ctx.fillStyle = 'rgba(214, 160, 90, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-16, -34, 8, 13, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(200, 190, 170, 0.6)';
  for (const [dx, dy] of [[-20, -70], [-6, -28], [20, -30], [-22, -50]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // the kid has a little flame tuft on top
  if (o.kid) drawFlame(4, top + 4, 10, 16, t, 7);

  // FIRE EYES: dark sockets with flames burning out of them
  const eyeY = o.kid ? -62 : -70;
  const eyes = o.kid ? [[2, 8], [20, 8]] : [[4, 7], [21, 7]];
  ctx.save();
  ctx.shadowColor = '#FF6D00';
  ctx.shadowBlur = 12;
  for (const [ex, er] of eyes) {
    ctx.fillStyle = '#2a0c02';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, er * 0.85, er, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.dizzy) continue;
    drawFlame(ex, eyeY + er * 0.6, er * 1.5, er * (o.kid ? 2.6 : 3.1), t, ex);
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
    // angry brows
    ctx.lineWidth = 3.5;
    for (const [ex, er] of eyes) {
      const inner = ex > 12 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(ex - er * 1.1 * inner, eyeY - er * 1.9);
      ctx.lineTo(ex + er * 1.1 * inner, eyeY - er * 1.3);
      ctx.stroke();
    }
  }
  // mouth: a jagged grin, or wide open while it yells
  const mY = o.kid ? -40 : -46;
  ctx.lineWidth = 3;
  if (o.mouth > 0.05) {
    ctx.fillStyle = '#5a1206';
    ctx.beginPath();
    ctx.ellipse(13, mY, 9, 3 + 8 * o.mouth, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FF8A65';
    ctx.beginPath();
    ctx.ellipse(13, mY + 3 + 4 * o.mouth, 5, 2 + 2 * o.mouth, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(2, mY - 2);
    for (let i = 1; i <= 5; i++) ctx.lineTo(2 + i * 4.6, mY + (i % 2 ? 3 : -1));
    ctx.stroke();
  }

  // front arm out to the hand, holding the flaming sword
  const hand = { x: arm.tx, y: arm.ty };
  if (o.swoosh > 0) {
    ctx.save();
    ctx.globalAlpha = o.swoosh;
    ctx.strokeStyle = 'rgba(255, 171, 64, 0.9)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 56, arm.a - 1.7, arm.a);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(bw - 6, -58);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.strokeStyle = puff;
  ctx.lineWidth = 6.5;
  ctx.stroke();
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(arm.a);
  drawSword(o.kid ? 48 : 62, o.kid ? 2.1 : 2.5, MALLOW_SWORD);
  drawFlame(o.kid ? 48 : 62, 0, 7, 12, t, 3);
  ctx.restore();
  ctx.fillStyle = puff;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (o.dizzy) drawDizzyStars(x, feetY - H * 1.02, H * 0.12, t);
}

// ---------- The fight: a campfire at night ----------
function drawCampfireArena(v, now) {
  const W = canvas.width, Hc = canvas.height, g = v.groundY;
  const k = Math.max(0.6, v.scale);
  const sky = ctx.createLinearGradient(0, 0, 0, g);
  sky.addColorStop(0, '#0b1433');
  sky.addColorStop(1, '#3b2a4f');
  ctx.fillStyle = sky;
  ctx.fillRect(-30, -30, W + 60, g + 30);
  // stars and a moon
  ctx.fillStyle = '#FFF9C4';
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 211) % 997) / 997 * W, sy = ((i * 89) % 101) / 101 * g * 0.6;
    const tw = 0.5 + 0.5 * Math.sin(now / 400 + i);
    ctx.globalAlpha = 0.4 + 0.6 * tw;
    ctx.beginPath();
    ctx.arc(sx, sy, (1 + (i % 3)) * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFF59D';
  ctx.beginPath();
  ctx.arc(W * 0.82, g * 0.18, 34 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f1a3d';
  ctx.beginPath();
  ctx.arc(W * 0.82 + 14 * k, g * 0.16, 30 * k, 0, Math.PI * 2);
  ctx.fill();
  // tent shapes and pine trees in the dark
  for (let i = 0; i < 7; i++) {
    const bx = (i / 6) * W + Math.sin(i * 2.3) * 40;
    const h = (120 + (i * 47) % 90) * k;
    ctx.fillStyle = i % 2 ? '#1b2440' : '#232c4b';
    ctx.beginPath();
    ctx.moveTo(bx - h * 0.45, g);
    ctx.lineTo(bx, g - h);
    ctx.lineTo(bx + h * 0.45, g);
    ctx.closePath();
    ctx.fill();
  }
  // two big campfires
  for (const fx of [70, 930]) {
    const x = v.sx(fx), y = v.sy(0);
    const glow = ctx.createRadialGradient(x, y - 40 * k, 0, x, y - 40 * k, 260 * k);
    glow.addColorStop(0, 'rgba(255, 140, 40, 0.45)');
    glow.addColorStop(1, 'rgba(255, 140, 40, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 260 * k, y - 300 * k, 520 * k, 520 * k);
  }
  // the ground
  const floor = ctx.createLinearGradient(0, g, 0, Hc);
  floor.addColorStop(0, '#3e5229');
  floor.addColorStop(1, '#1d2613');
  ctx.fillStyle = floor;
  ctx.fillRect(-30, g, W + 60, Hc - g + 30);
  ctx.strokeStyle = '#121a0b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-30, g);
  ctx.lineTo(W + 30, g);
  ctx.stroke();
  for (const fx of [70, 930]) {
    const x = v.sx(fx), y = v.sy(0);
    ctx.fillStyle = '#5d4037';
    ctx.save();
    ctx.translate(x, y);
    for (const a of [-0.35, 0.35]) {
      ctx.save();
      ctx.rotate(a);
      ctx.fillRect(-45 * k, -8 * k, 90 * k, 14 * k);
      ctx.restore();
    }
    ctx.restore();
    drawFlame(x - 16 * k, y - 4 * k, 30 * k, 70 * k, now, fx);
    drawFlame(x + 14 * k, y - 4 * k, 26 * k, 56 * k, now, fx + 2);
    drawFlame(x, y - 6 * k, 36 * k, 90 * k, now, fx + 5);
  }
  // marshmallows on sticks, roasting (scary for them!)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  ctx.font = `${Math.round(30 * k)}px ${SCENE_EMOJI_FONT}`;
  for (const [ax, ay, e] of [[180, -12, '🍫'], [205, -16, '🍪'], [820, -14, '🪵'], [500, -40, '🔥']]) {
    ctx.fillText(e, v.sx(ax), v.sy(ay));
  }
}

function drawFightMallow(v, f, now) {
  const b = f.b;
  const t = now - b.actStart;
  drawArmorGlow(v, b, now);
  let mouth = shoutMouth(f.shout, now);
  if (b.act === 'attack' && t < B_ACTIVE + 120) mouth = 1;
  const kid = !!(f.def && f.def.kid);
  drawMallow(v.sx(b.x), v.sy(b.y), 215 * v.scale * (kid ? 0.78 : 1.05), b.facing, {
    tail: bossTail(b, now, MALLOW_POSES),
    moving: b.act === 'walk',
    walk: b.walk,
    mouth,
    t: now,
    kid,
    dizzy: b.act === 'hit' || b.act === 'ko',
    swoosh: b.act === 'attack' && t < B_ACTIVE + 100 ? 1 - t / (B_ACTIVE + 100) : 0
  });
}

// ---------- On the map ----------
// The lair in the middle of the Blob Fight Zone: fire eyes glowing out of the
// hole for each Marshmallow that's home
function drawMallowLair() {
  const lair = mallowLair();
  if (!lair) return;
  const now = performance.now();
  const cx = lair.x + lair.width / 2, cy = lair.y + lair.height * 0.52;
  const r = lair.width * 0.14;
  const home = mallows.foes.filter(m => m.where === 'home');
  if (!home.length) return;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
  glow.addColorStop(0, `rgba(255, 110, 30, ${0.35 + 0.1 * Math.sin(now / 200)})`);
  glow.addColorStop(1, 'rgba(255, 110, 30, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  for (const m of home) {
    const kid = !!m.def.kid;
    const blink = (now + (kid ? 1700 : 0)) % 3400 < 150;
    const ex = cx + (kid ? r * 0.55 : -r * 0.35), ey = cy + (kid ? r * 0.15 : -r * 0.1);
    const er = r * (kid ? 0.14 : 0.2);
    for (const side of [-1, 1]) {
      if (blink) {
        ctx.fillStyle = '#FFAB40';
        ctx.fillRect(ex + side * er * 1.4 - er, ey, er * 2, 2);
      } else {
        drawFlame(ex + side * er * 1.4, ey + er, er * 1.5, er * 3.2, now, side + (kid ? 4 : 0));
      }
    }
  }
}

function drawMapMallow(m) {
  const p = mallowPos(m);
  const now = performance.now();
  const engaged = bossEngage && bossEngage.mallow === m;
  const arm = engaged
    ? { ...MALLOW_POSES.windup, a: MALLOW_POSES.windup.a + Math.sin(now / 30) * 0.06 }
    : { ...MALLOW_POSES.idle, a: MALLOW_POSES.idle.a + Math.sin(now / 400) * 0.12 };
  drawMallow(p.x, p.y, mallowHeight(m), m.facing, {
    tail: arm, moving: m.moving, walk: m.walk, kid: !!m.def.kid,
    mouth: shoutMouth(m.shout, now), t: now
  });
}

function drawMallowHint(m) {
  const p = mallowPos(m);
  const x = p.x;
  const y = p.y - mallowHeight(m) - 14;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Comic Sans MS", cursive';
  const label = `${m.def.name} · Lv ${mallowLevel()}`;
  const lw = ctx.measureText(label).width + 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  roundRect(x - lw / 2, y - 14, lw, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#FFAB40';
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
function drawMallowShouts() {
  for (const m of mallowsOut()) {
    if (!m.shout) continue;
    const p = mallowPos(m);
    const H = mallowHeight(m);
    const dir = m.facing === 'left' ? -1 : 1;
    drawShout(p.x - camera.x + dir * 0.4 * H, p.y - 0.95 * H - camera.y, m.shout.text,
      performance.now() - m.shout.start, m.def.kid ? 16 : 20);
  }
}

registerMapLayer(22, () => drawMallowLair());
registerScreenLayer(22, () => drawMallowShouts());
registerMapPeople(() => mallowsOut().map(m => ({ y: mallowPos(m).y, draw: () => drawMapMallow(m) })));
