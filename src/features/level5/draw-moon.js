// ---------- Drawing the Moon (a big glowing full moon with a face and an icicle sword) ----------
// Hand + sword angle per pose, in its own units (100 = its height), facing
// right (see MALLOW_POSES). Used with bossTail(b, now, MOON_POSES).
const MOON_POSES = {
  idle:   { tx: 46, ty: -50,  a: -1.0 },
  windup: { tx: 18, ty: -108, a: -2.6 },
  strike: { tx: 64, ty: -56,  a: 0.45 },
  block:  { tx: 52, ty: -56,  a: -1.5 },
  hit:    { tx: 30, ty: -40,  a: -2.2 }
};
const MOON_SWORD = { blade: '#E1F5FE', glow: '#81D4FA' };   // a sword made of ice

// x, feetY: screen/map px of the ground under it (it floats above). H: height in px.
// o: { tail (arm pose), moving, walk, mouth, t, dizzy, swoosh, dim }
function drawMoon(x, feetY, H, facing, o) {
  const s = H / 100;
  const t = o.t || performance.now();
  const arm = o.tail || MOON_POSES.idle;
  const bob = Math.sin(t / 420) * 4;
  const ink = '#3E3A2A';
  const cy = -60 + bob, R = 36;

  ctx.save();
  // a soft shadow on the ground, and a silvery glow round it
  ctx.fillStyle = 'rgba(40, 40, 70, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, feetY, 40 * s, 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, feetY);
  ctx.scale(facing === 'left' ? -s : s, s);
  if (o.dizzy) ctx.translate(Math.sin(t / 25) * 2, 0);
  const glow = ctx.createRadialGradient(0, cy, R * 0.8, 0, cy, R * 1.7);
  glow.addColorStop(0, `rgba(255, 249, 196, ${o.dim ? 0.15 : 0.55})`);
  glow.addColorStop(1, 'rgba(255, 249, 196, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, cy, R * 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;

  // back arm (a little round fist)
  ctx.lineWidth = 3;
  ctx.fillStyle = '#FFF59D';
  ctx.beginPath();
  ctx.arc(-R - 6, cy + 4, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // the moon itself, with craters
  const body = ctx.createRadialGradient(-10, cy - 12, 4, 0, cy, R);
  body.addColorStop(0, '#FFFDE7');
  body.addColorStop(1, '#FFE082');
  ctx.fillStyle = body;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(189, 160, 80, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(120, 100, 50, 0.6)';
  for (const [cx, cyy, r] of [[-18, -14, 7], [-22, 12, 5], [-4, 22, 6], [20, -22, 4], [-8, -26, 3.5]]) {
    ctx.beginPath();
    ctx.arc(cx, cy + cyy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = ink;

  // eyes: big and sleepy, or squeezed shut when it's hit
  for (const ex of [6, 22]) {
    const ey = cy - 6;
    if (o.dizzy) {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4);
      ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 5.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#283593';
    ctx.beginPath();
    ctx.arc(ex + 1.5, ey + 1, 3, 0, Math.PI * 2);
    ctx.fill();
    // a frosty eyebrow
    ctx.strokeStyle = '#90A4AE';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ex - 5, ey - 11);
    ctx.lineTo(ex + 5, ey - 9 + (ex === 6 ? 2 : -1));
    ctx.stroke();
    ctx.strokeStyle = ink;
  }
  // rosy cheek
  ctx.fillStyle = 'rgba(255, 138, 128, 0.45)';
  ctx.beginPath();
  ctx.ellipse(28, cy + 6, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // mouth: a smirk, or a big RARR with fangs
  const mY = cy + 12;
  ctx.lineWidth = 2.5;
  if (o.mouth > 0.05) {
    ctx.fillStyle = '#4E342E';
    ctx.beginPath();
    ctx.ellipse(14, mY + 2, 9, 3 + 7 * o.mouth, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const fx of [8, 18]) {
      ctx.beginPath();
      ctx.moveTo(fx, mY - 1);
      ctx.lineTo(fx + 2, mY + 4);
      ctx.lineTo(fx + 4, mY - 1);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(4, mY);
    ctx.quadraticCurveTo(14, mY + 7, 24, mY - 2);
    ctx.stroke();
  }

  // front arm out to the hand, holding the icicle sword
  const hand = { x: arm.tx, y: arm.ty + bob };
  if (o.swoosh > 0) {
    ctx.save();
    ctx.globalAlpha = o.swoosh;
    ctx.strokeStyle = 'rgba(179, 229, 252, 0.9)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 58, arm.a - 1.7, arm.a);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(R - 6, cy + 6);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.strokeStyle = '#FFF59D';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(arm.a);
  drawSword(64, 2.8, MOON_SWORD);
  ctx.restore();
  ctx.fillStyle = '#FFF59D';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // twinkles floating round it
  ctx.fillStyle = '#FFF9C4';
  for (let i = 0; i < 3; i++) {
    const a = t / 900 + i * 2.1;
    const sx = Math.cos(a) * (R + 16), sy = cy + Math.sin(a) * (R + 10);
    ctx.beginPath();
    ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (o.dizzy) drawDizzyStars(x, feetY - H * 1.05, H * 0.12, t);
}

// ---------- The fight: the night sky over the crater ----------
function drawMoonArena(v, now) {
  const W = canvas.width, Hc = canvas.height, g = v.groundY;
  const k = Math.max(0.6, v.scale);
  const sky = ctx.createLinearGradient(0, 0, 0, g);
  sky.addColorStop(0, '#0D1137');
  sky.addColorStop(1, '#283593');
  ctx.fillStyle = sky;
  ctx.fillRect(-30, -30, W + 60, g + 30);
  // twinkling stars
  for (let i = 0; i < 40; i++) {
    const x = (i * 173 + 31) % W, y = (i * 97 + 17) % (g * 0.85);
    ctx.fillStyle = `rgba(255, 249, 196, ${0.4 + 0.4 * Math.sin(now / 400 + i)})`;
    ctx.beginPath();
    ctx.arc(x, y, (1.5 + (i % 3)) * k, 0, Math.PI * 2);
    ctx.fill();
  }
  // the palace far away, and a glow of lava on the horizon
  ctx.fillStyle = 'rgba(26, 35, 126, 0.9)';
  for (const fx of [0.74, 0.88]) ctx.fillRect(W * fx, g * 0.35, 50 * k, g * 0.65);
  ctx.fillRect(W * 0.74, g * 0.55, W * 0.14 + 50 * k, g * 0.45);
  const lavaGlow = ctx.createLinearGradient(0, g * 0.8, 0, g);
  lavaGlow.addColorStop(0, 'rgba(255, 87, 34, 0)');
  lavaGlow.addColorStop(1, 'rgba(255, 112, 67, 0.45)');
  ctx.fillStyle = lavaGlow;
  ctx.fillRect(-30, g * 0.8, W + 60, g * 0.2);
  // the crater floor: silvery grey, with little craters
  const floor = ctx.createLinearGradient(0, g, 0, Hc);
  floor.addColorStop(0, '#B0BEC5');
  floor.addColorStop(1, '#607D8B');
  ctx.fillStyle = floor;
  ctx.fillRect(-30, g, W + 60, Hc - g + 30);
  ctx.strokeStyle = 'rgba(55, 71, 79, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const x = (i * 211 + 60) % W, y = g + (Hc - g) * (0.2 + (i % 3) * 0.25);
    ctx.beginPath();
    ctx.ellipse(x, y, 34 * k, 8 * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = '#263238';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-30, g);
  ctx.lineTo(W + 30, g);
  ctx.stroke();
}

function drawFightMoon(v, f, now) {
  const b = f.b;
  const t = now - b.actStart;
  drawArmorGlow(v, b, now);
  let mouth = shoutMouth(f.shout, now);
  if (b.act === 'attack' && t < B_ACTIVE + 120) mouth = 1;
  drawMoon(v.sx(b.x), v.sy(b.y), 215 * v.scale * 1.1, b.facing, {
    tail: bossTail(b, now, MOON_POSES),
    moving: b.act === 'walk',
    walk: b.walk,
    mouth,
    t: now,
    dizzy: b.act === 'hit' || b.act === 'ko',
    swoosh: b.act === 'attack' && t < B_ACTIVE + 100 ? 1 - t / (B_ACTIVE + 100) : 0
  });
}

// You, frozen in a block of ice, and how many misses in a row so far
function drawMoonFreeze(v, f, now) {
  if (f.foe.id !== 'moon') return;
  const p = f.p, fz = f.moonFreeze;
  const H = 200 * v.scale;
  const x = v.sx(p.x), y = v.sy(p.y);
  if (p.act === 'frozen') {
    const left = Math.max(0, (p.frozenUntil - now) / 1000);
    ctx.save();
    ctx.fillStyle = 'rgba(179, 229, 252, 0.55)';
    ctx.strokeStyle = 'rgba(225, 245, 254, 0.95)';
    ctx.lineWidth = 3;
    roundRect(x - H * 0.32, y - H * 1.05, H * 0.64, H * 1.08, 12);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(x - H * 0.2, y - H * 0.9);
    ctx.lineTo(x - H * 0.08, y - H * 0.7);
    ctx.moveTo(x + H * 0.15, y - H * 0.5);
    ctx.lineTo(x + H * 0.22, y - H * 0.35);
    ctx.stroke();
    ctx.font = `bold ${Math.round(Math.max(16, H * 0.14))}px "Comic Sans MS", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E1F5FE';
    ctx.strokeStyle = '#01579B';
    ctx.lineWidth = 4;
    const txt = `🥶 FROZEN ${left.toFixed(1)}`;
    ctx.strokeText(txt, x, y - H * 1.15);
    ctx.fillText(txt, x, y - H * 1.15);
    ctx.restore();
    return;
  }
  if (!fz || f.phase !== 'fight') return;
  // ❄️ for each miss in a row (the Moon freezes you when they're all lit), or 🙈 if U was pressed
  const need = moonFreezeCfg(f).misses;
  const text = fz.proof ? '🙈' : '❄️'.repeat(fz.misses) + '·'.repeat(Math.max(0, need - fz.misses));
  if (!fz.proof && !fz.misses) return;
  ctx.save();
  ctx.font = `${Math.round(Math.max(14, H * 0.1))}px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#E1F5FE';
  ctx.fillText(text, x, y - H * 1.12);
  ctx.restore();
}
registerFightLayer(20, (v, f, now) => drawMoonFreeze(v, f, now));

// ---------- On the map ----------
// A silvery glow and sleepy eyes in the crater while it's home
function drawMoonCrater() {
  const c = moonCrater();
  if (!c || !moonHere() || moon.where !== 'home') return;
  const now = performance.now();
  const cx = c.x + c.width / 2, cy = c.y + c.height * 0.58;
  const r = c.width * 0.16;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
  glow.addColorStop(0, `rgba(255, 249, 196, ${0.45 + 0.15 * Math.sin(now / 300)})`);
  glow.addColorStop(1, 'rgba(255, 249, 196, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  // the top of the moon peeking out, with sleepy eyes
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - r * 1.5, cy - r * 1.6, r * 3, r * 1.6);
  ctx.clip();
  ctx.fillStyle = '#FFF59D';
  ctx.strokeStyle = '#3E3A2A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const open = now % 4200 > 3600;
  ctx.strokeStyle = '#3E3A2A';
  ctx.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    const ex = cx + side * r * 0.4, ey = cy - r * 0.35;
    ctx.beginPath();
    if (open) ctx.arc(ex, ey, r * 0.14, 0, Math.PI * 2);
    else ctx.arc(ex, ey - r * 0.05, r * 0.16, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  if (!open) {
    ctx.fillStyle = '#E1F5FE';
    ctx.font = `bold ${Math.round(r * 0.5)}px "Comic Sans MS", cursive`;
    ctx.textAlign = 'center';
    ctx.fillText('z', cx + r * 1.1, cy - r * (1.2 + 0.2 * Math.sin(now / 500)));
  }
}

function drawMapMoon() {
  const p = moonPos();
  const now = performance.now();
  const engaged = bossEngage && bossEngage.moon;
  const arm = engaged
    ? { ...MOON_POSES.windup, a: MOON_POSES.windup.a + Math.sin(now / 30) * 0.06 }
    : { ...MOON_POSES.idle, a: MOON_POSES.idle.a + Math.sin(now / 450) * 0.12 };
  drawMoon(p.x, p.y, moonHeight(), moon.facing, {
    tail: arm, moving: moon.moving, walk: moon.walk, t: now, mouth: shoutMouth(moon.shout, now)
  });
}

function drawMoonHint() {
  const p = moonPos();
  const x = p.x;
  const y = p.y - moonHeight() - 30;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Comic Sans MS", cursive';
  const label = `${moonCfg().name} · Lv ${moonLevel()}`;
  const lw = ctx.measureText(label).width + 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  roundRect(x - lw / 2, y - 14, lw, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#FFF59D';
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
function drawMoonShout() {
  if (!moonOut() || !moon.shout) return;
  const p = moonPos();
  const H = moonHeight();
  const dir = moon.facing === 'left' ? -1 : 1;
  drawShout(p.x - camera.x + dir * 0.4 * H, p.y - 1.05 * H - camera.y, moon.shout.text, performance.now() - moon.shout.start, 20);
}

registerMapLayer(22, () => drawMoonCrater());
registerScreenLayer(24, () => drawMoonShout());
registerMapPeople(() => moonOut() ? [{ y: moonPos().y, draw: () => drawMapMoon() }] : []);
