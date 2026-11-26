// --- Fight drawing ---
// Where the score panel sits: the very bottom, or above the touch buttons
const SCORE_PANEL_H = 78;
function scorePanelY() {
  return isTouchDevice()
    ? canvas.height - fightButtonSize() * 2 - 44 - SCORE_PANEL_H
    : canvas.height - SCORE_PANEL_H - 34;
}
function fightView() {
  const scale = Math.min(canvas.width / 880, canvas.height / 620);
  const groundY = Math.min(canvas.height - Math.max(130, canvas.height * 0.22), scorePanelY() - 18);
  const ox = canvas.width / 2 - 500 * scale;
  return { scale, groundY, sx: (x) => ox + x * scale, sy: (y) => groundY - y * scale };
}

function drawCaveArena(v, now) {
  const W = canvas.width, Hc = canvas.height, g = v.groundY;
  const k = Math.max(0.6, v.scale);
  const sky = ctx.createLinearGradient(0, 0, 0, g);
  sky.addColorStop(0, '#1b1224');
  sky.addColorStop(1, '#43303c');
  ctx.fillStyle = sky;
  ctx.fillRect(-30, -30, W + 60, g + 30);
  // big boulders along the back wall
  for (let i = 0; i < 10; i++) {
    const bx = (i / 9) * W + Math.sin(i * 3.1) * 30;
    const r = (90 + (i * 37) % 70) * k;
    ctx.fillStyle = i % 2 ? '#2e2233' : '#382a3b';
    ctx.beginPath();
    ctx.ellipse(bx, g, r * 1.4, r, 0, Math.PI, 0);
    ctx.fill();
  }
  // torches
  for (const tx of [90, 910]) {
    const x = v.sx(tx), y = v.sy(330);
    const flick = Math.sin(now / 70 + tx) * 0.15 + Math.sin(now / 37) * 0.1;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 220 * k);
    glow.addColorStop(0, 'rgba(255, 170, 60, 0.35)');
    glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 220 * k, y - 220 * k, 440 * k, 440 * k);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x - 6 * k, y, 12 * k, 70 * k);
    ctx.fillStyle = '#FF7043';
    ctx.beginPath();
    ctx.ellipse(x, y - 14 * k, 15 * k, (30 + flick * 20) * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFEB3B';
    ctx.beginPath();
    ctx.ellipse(x, y - 8 * k, 7 * k, (16 + flick * 10) * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // stalactites
  ctx.fillStyle = '#2a1f2e';
  ctx.strokeStyle = '#140d17';
  ctx.lineWidth = 3;
  for (let i = 0; i < 13; i++) {
    const sx = ((i + 0.5) / 13) * W + Math.sin(i * 7) * 20;
    const len = (50 + ((i * 53) % 80)) * k;
    const hw = (16 + (i * 29) % 18) * k;
    ctx.beginPath();
    ctx.moveTo(sx - hw, -4);
    ctx.lineTo(sx + hw, -4);
    ctx.lineTo(sx, len);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // floor
  const floor = ctx.createLinearGradient(0, g, 0, Hc);
  floor.addColorStop(0, '#5a3e2b');
  floor.addColorStop(1, '#22160f');
  ctx.fillStyle = floor;
  ctx.fillRect(-30, g, W + 60, Hc - g + 30);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  for (let i = 0; i < 22; i++) {
    const px = ((i * 137) % 1000) / 1000 * W;
    const py = g + 10 + ((i * 71) % 100) / 100 * (Hc - g - 10);
    ctx.beginPath();
    ctx.ellipse(px, py, (8 + (i % 4) * 4) * k, (3 + (i % 3) * 2) * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#1a110b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-30, g);
  ctx.lineTo(W + 30, g);
  ctx.stroke();
  // the Blob's treasure: coins and bones
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  ctx.font = `${Math.round(34 * k)}px ${SCENE_EMOJI_FONT}`;
  for (const [ax, ay, e] of [[940, 4, '🪙'], [965, 4, '🪙'], [952, 26, '🪙'], [60, 2, '🦴'], [140, -10, '🦴'], [860, -14, '🦴']]) {
    ctx.fillText(e, v.sx(ax), v.sy(ay));
  }
}

function playerSwordPose(p, now) {
  const rest = { hx: 29, hy: 28, a: -0.95 };
  if (p.act === 'block' || p.act === 'blockstun') return { hx: 31, hy: 23, a: -1.5 };
  if (p.act === 'hit' || p.act === 'ko') return { hx: 25, hy: 31, a: 0.4 };
  if (p.act !== 'attack') {
    const bob = p.act === 'walk' ? Math.sin(p.walk * 14) * 1.2 : 0;
    return { hx: rest.hx, hy: rest.hy + bob, a: rest.a };
  }
  const t = now - p.actStart;
  const up = { hx: 25, hy: 11, a: -2.3 };
  const out = { hx: 35, hy: 24, a: 0.25 };
  const mix = (A, B, u) => ({ hx: lerp(A.hx, B.hx, u), hy: lerp(A.hy, B.hy, u), a: lerp(A.a, B.a, u) });
  if (t < P_STARTUP) return mix(rest, up, t / P_STARTUP);
  if (t < P_STARTUP + P_ACTIVE) return mix(up, out, easeOutCubic((t - P_STARTUP) / P_ACTIVE));
  return mix(out, rest, clamp((t - P_STARTUP - P_ACTIVE) / (p.recover || P_RECOVER), 0, 1));
}

// You, or (with `ch` and `lane`) your sidekick in the lane just behind:
// a little smaller and higher up the floor
function drawFightPlayer(v, p, now, ch, lane) {
  ch = ch || player.character;
  lane = lane || 0;
  const H = 200 * v.scale * (lane ? 0.86 : 1);
  const s = H / 48;
  const cx = v.sx(p.x);
  const feet = v.sy(p.y + lane);
  // shadow stays on the floor (smaller while jumping)
  const sh = (1 - Math.min(0.6, p.y / 300)) * (lane ? 0.86 : 1);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx, v.sy(lane), 65 * v.scale * sh, 9 * v.scale * sh, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, feet);
  if (p.facing === 'left') ctx.scale(-1, 1);
  if (p.act === 'hit') ctx.rotate(-0.18);
  if (p.act === 'ko') ctx.rotate(-0.18 - Math.min(1, (now - p.actStart) / 600) * 0.7);
  const x0 = -15 * s, y0 = -48 * s;
  const frame = p.act === 'walk' ? Math.floor(p.walk * 9) % 4 : 0;
  const mouth = p.act === 'attack' ? 0.8 : (p.act === 'hit' || p.act === 'ko' ? 1 : 0);
  drawCharacterSprite(x0, y0, ch, frame, 'right', s, mouth, null, true);

  const g = playerSwordPose(p, now);
  const hand = { x: x0 + g.hx * s, y: y0 + g.hy * s };
  // swoosh trail on the swing
  if (p.act === 'attack') {
    const t = now - p.actStart;
    if (t > P_STARTUP && t < P_STARTUP + P_ACTIVE + 90) {
      ctx.save();
      ctx.globalAlpha = 1 - (t - P_STARTUP) / (P_ACTIVE + 90);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(hand.x, hand.y, 26 * s, -2.1, g.a);
      ctx.stroke();
      ctx.restore();
    }
  }
  // the sword arm, from the shoulder to the hand
  ctx.strokeStyle = ch.shirtColor;
  ctx.lineWidth = 6 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + 27 * s, y0 + 19 * s);
  ctx.lineTo(hand.x, hand.y);
  ctx.stroke();
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(g.a);
  drawSword(28 * s, 1.5 * s, lane ? null : swordKindDef());
  ctx.restore();
  ctx.fillStyle = '#FFCC80';
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 2.8 * s, 0, Math.PI * 2);
  ctx.fill();
  // blocking: a shimmery guard in front
  if (p.act === 'block' || p.act === 'blockstun') {
    ctx.strokeStyle = `rgba(144, 202, 249, ${0.45 + Math.sin(now / 90) * 0.15})`;
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.arc(x0 + 26 * s, y0 + 26 * s, 20 * s, -1.2, 1.2);
    ctx.stroke();
  }
  if (p.act === 'hit' || p.act === 'ko') drawDizzyStars(x0 + 15 * s, y0 - 4 * s, 10 * s, now);
  ctx.restore();
}

// With a sidekick, one of you blocking guards you both: a big shimmery
// shield in front of whoever is closer to the Blob, tall enough for two
function drawTeamGuard(v, f, now) {
  const s = f.s, p = f.p, b = f.b;
  const pBlock = p.act === 'block' || p.act === 'blockstun';
  const sBlock = sidekickGuarding(f);
  if (!pBlock && !sBlock) return;
  const front = Math.abs(s.x - b.x) < Math.abs(p.x - b.x) ? s : p;
  const dir = b.x >= front.x ? 1 : -1;
  const x = v.sx(front.x + dir * 85);
  const y = v.sy(115 + SIDEKICK_LANE / 2);
  const r = 150 * v.scale;
  const color = sBlock && !pBlock ? s.char.color : player.character.color;
  ctx.save();
  ctx.translate(x, y);
  if (dir < 0) ctx.scale(-1, 1);
  const a = 0.35 + Math.sin(now / 90) * 0.12;
  const g = ctx.createRadialGradient(-r * 0.6, 0, r * 0.5, -r * 0.6, 0, r * 1.05);
  g.addColorStop(0, 'rgba(144, 202, 249, 0)');
  g.addColorStop(1, `rgba(144, 202, 249, ${a * 0.6})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(-r * 0.6, 0, r, -1.0, 1.0);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = Math.max(3, 7 * v.scale);
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(187, 222, 251, ${a + 0.25})`;
  ctx.beginPath();
  ctx.arc(-r * 0.6, 0, r, -1.0, 1.0);
  ctx.stroke();
  ctx.lineWidth = Math.max(2, 3 * v.scale);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(-r * 0.6, 0, r * 0.93, -0.9, 0.9);
  ctx.stroke();
  ctx.restore();
}

// Where the boss's sword is, for its current move. `P`: its poses
// (default the Blob's tail; the Marshmallows' arm uses MALLOW_POSES)
function bossTail(b, now, P = BLOB_POSES) {
  const t = now - b.actStart;
  switch (b.act) {
    case 'windup': {
      const r = lerpPose(P.idle, P.windup, clamp(t / 250, 0, 1));
      r.a += Math.sin(now / 30) * 0.06;            // quivering with excitement
      return r;
    }
    case 'attack':
      if (t < B_ACTIVE) return lerpPose(P.windup, P.strike, easeOutCubic(t / B_ACTIVE));
      return lerpPose(P.strike, P.idle, clamp((t - B_ACTIVE) / (b.recover || B_RECOVER), 0, 1));
    case 'block':
    case 'blockstun':
      return P.block;
    case 'hit':
    case 'ko':
      return P.hit;
    default:
      return { ...P.idle, a: P.idle.a + Math.sin(now / 400) * 0.12 };
  }
}

function drawFightBoss(v, f, now) {
  const b = f.b;
  const t = now - b.actStart;
  drawArmorGlow(v, b, now);
  let mouth = shoutMouth(f.shout, now);
  if (b.act === 'attack' && t < B_ACTIVE + 120) mouth = 1;
  drawBlob(v.sx(b.x), v.sy(b.y), 215 * v.scale, b.facing, {
    tail: bossTail(b, now),
    moving: b.act === 'walk',
    walk: b.walk,
    mouth,
    t: now,
    dizzy: b.act === 'hit' || b.act === 'ko',
    swoosh: b.act === 'attack' && t < B_ACTIVE + 100 ? 1 - t / (B_ACTIVE + 100) : 0
  });
}

function drawArmorGlow(v, b, now) {
  if (b.act === 'windup' && b.armor) {
    // Armored wind-up: it glows, and your swings will just CLANG. Block or back off!
    const r = 150 * v.scale * (1 + 0.08 * Math.sin(now / 70));
    const cx = v.sx(b.x), cy = v.sy(b.y + 110);
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    g.addColorStop(0, 'rgba(255, 82, 40, 0.85)');
    g.addColorStop(0.6, 'rgba(255, 112, 67, 0.45)');
    g.addColorStop(1, 'rgba(255, 112, 67, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(255, 213, 79, ${0.5 + 0.4 * Math.sin(now / 90)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function bigText(text, x, y, size, fill, stroke) {
  ctx.font = `bold ${Math.round(size)}px "Comic Sans MS", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.14);
  ctx.strokeStyle = stroke || '#2b1300';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.textBaseline = 'alphabetic';
}

function drawFightFx(v, f, now) {
  for (const sp of f.sparks) {
    const u = (now - sp.start) / 350;
    const x = v.sx(sp.x), y = v.sy(sp.y);
    ctx.save();
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = sp.color;
    ctx.lineWidth = 5 * v.scale + 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + 0.3;
      const r0 = (10 + u * 40) * v.scale, r1 = (30 + u * 90) * v.scale;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
  for (const pp of f.pops) {
    const u = (now - pp.start) / 900;
    ctx.save();
    ctx.globalAlpha = u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
    const size = Math.max(16, 48 * pp.size * v.scale) * (u < 0.15 ? 0.6 + u / 0.15 * 0.4 : 1);
    bigText(pp.text, v.sx(pp.x), v.sy(pp.y + u * 70), size, pp.color);
    ctx.restore();
  }
}

function drawFightHud(v, f, now) {
  const W = canvas.width;
  const ch = player.character;
  const def = f.def || {};
  // Name plates across the top, Street Fighter style
  const pad = 12;
  const plateW = Math.min(320, (W - pad * 2 - 50) / 2);
  const plateH = 50;
  const fs = Math.min(20, plateW / 9);
  const fitFont = (text, size, maxW) => {
    ctx.font = `bold ${size}px "Comic Sans MS", cursive`;
    const w = ctx.measureText(text).width;
    return w > maxW ? size * maxW / w : size;
  };
  const plate = (x, name, color, sub, align) => {
    ctx.fillStyle = 'rgba(20, 12, 6, 0.8)';
    roundRect(x, pad, plateW, plateH, 10);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.textAlign = align;
    const tx = align === 'left' ? x + 12 : x + plateW - 12;
    const nfs = fitFont(name, fs, plateW - 24);
    ctx.font = `bold ${nfs}px "Comic Sans MS", cursive`;
    ctx.fillStyle = color;
    ctx.fillText(name, tx, pad + (sub ? 24 : 32));
    if (sub) {
      ctx.font = `${Math.min(Math.max(9, fs * 0.6), fitFont(sub, 30, plateW - 24) * 0.9)}px "Comic Sans MS", cursive`;
      ctx.fillStyle = '#FFE0B2';
      ctx.fillText(sub, tx, pad + 42);
    }
  };
  plate(pad, ch.name.toUpperCase(), ch.color, f.s ? `🤝 with your sidekick ${f.s.name}` : null, 'left');
  drawStrengthMeter(f.p, pad, pad + plateH + 6, plateW, now, f.boost ? '#F48FB1' : null);
  drawSwordMeter(f, pad, pad + plateH + 6 + 22 + 5, plateW, now);
  drawStrengthMeter(f.b, W - pad - plateW, pad + plateH + 6, plateW, now, '#FF9E5E');
  const sub = [def.aka ? `a.k.a. the ${def.aka}` : null, f.level ? `Level ${f.level}` : null].filter(Boolean).join('  ·  ');
  plate(W - pad - plateW, bossName().toUpperCase(), '#FF9E5E', sub || null, 'right');
  bigText('VS', W / 2, pad + plateH / 2, 26, '#FFD54F');

  // Point counter along the bottom
  const touch = isTouchDevice();
  const pw = Math.min(560, W - 24), ph = SCORE_PANEL_H;
  const px = W / 2 - pw / 2;
  const py = scorePanelY();
  ctx.fillStyle = 'rgba(20, 12, 6, 0.86)';
  roundRect(px, py, pw, ph, 14);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFD54F';
  ctx.stroke();
  const pulse = (at) => 1 + 0.6 * Math.max(0, 1 - (now - at) / 350);
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  ctx.textAlign = 'left';
  ctx.fillStyle = ch.color;
  ctx.fillText('YOU', px + 16, py + 24);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#FF9E5E';
  ctx.fillText(f.foe.label, px + pw - 16, py + 24);
  ctx.save();
  ctx.translate(px + 78, py + 26);
  ctx.scale(pulse(f.pPulse), pulse(f.pPulse));
  bigText(String(f.p.score), 0, 0, 28, '#fff');
  ctx.restore();
  ctx.save();
  ctx.translate(px + pw - 82, py + 26);
  ctx.scale(pulse(f.bPulse), pulse(f.bPulse));
  bigText(String(f.b.score), 0, 0, 28, '#fff');
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '12px "Comic Sans MS", cursive';
  ctx.fillStyle = '#FFE0B2';
  ctx.fillText(`First to ${f.toWin}!`, W / 2, py + 26);
  // pips: one per point
  const pipR = Math.max(4, Math.min(8, pw / 72));
  const step = pipR * 2.5;
  const rowY = py + 56;
  for (let i = 0; i < f.toWin; i++) {
    for (const side of [-1, 1]) {
      const filled = side < 0 ? i < f.p.score : i < f.b.score;
      const cx = W / 2 + side * (14 + pipR + i * step);
      ctx.beginPath();
      ctx.arc(cx, rowY, pipR, 0, Math.PI * 2);
      ctx.fillStyle = filled ? (side < 0 ? ch.color : '#FF9E5E') : 'rgba(255, 255, 255, 0.12)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();
    }
  }
  ctx.textBaseline = 'alphabetic';
  if (!touch) {
    ctx.font = '13px "Comic Sans MS", cursive';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.textAlign = 'center';
    ctx.fillText('← → move   •   ↑ jump   •   SPACE attack   •   hold B block   •   Esc run away', W / 2, canvas.height - 12);
  }
}

// 💪 bar: one notch per point of strength, flashes red when one is lost and
// green when one comes back. The thin line underneath fills up to the next +1.
// Map HUD: your sword's rating (or that you need a new one)
function drawSwordBadge(x, y) {
  if (!mapConfig) return 0;
  const spare = hasSpareSword() ? ' +1' : '';
  const text = swordRating > 0 ? `${swordKindDef().emoji} ${swordRating}${spare}` : hasSpareSword() ? '🗡️ 0 +1' : '🗡️ Find a sword!';
  ctx.save();
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  const w = ctx.measureText(text).width + 22;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(x, y, w, 36, 8);
  ctx.fill();
  ctx.fillStyle = swordRating > 0.3 * swordMax() ? '#E0E0E0' : swordRating > 0 ? '#FFCA28' : '#FF8A80';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 11, y + 19);
  ctx.restore();
  return w;
}

// Fight HUD: your sword's rating as a thin bar under your strength
function drawSwordMeter(f, x, y, w, now) {
  const h = 18, frac = swordRating / swordMax();
  const flash = Math.max(0, 1 - (now - (f.swordWornAt || 0)) / 300);
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 6, 0.8)';
  roundRect(x, y, w, h, 7);
  ctx.fill();
  const ix = x + 30, iw = w - 36 - 44, iy = y + 4, ih = h - 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ix, iy, iw, ih, 4);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = frac > 0.3 ? '#B0BEC5' : '#FFCA28';
    roundRect(ix, iy, iw * frac, ih, 4);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255, 171, 145, ${flash * 0.5})`;
    roundRect(x, y, w, h, 7);
    ctx.fill();
  }
  ctx.font = `12px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText(swordKindDef().emoji, x + 15, y + h / 2 + 1);
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.fillStyle = swordRating > 0 ? '#ECEFF1' : '#FF8A80';
  ctx.textAlign = 'right';
  ctx.fillText(swordRating > 0 ? String(swordRating) : 'WORN', x + w - 8, y + h / 2 + 1);
  ctx.restore();
}

function drawStrengthMeter(p, x, y, w, now, edge) {
  const max = p.maxStrength || STRENGTH_BASE;
  const h = 22, frac = clamp(p.strength / max, 0, 1);
  const flash = Math.max(0, 1 - (now - (p.lostAt || 0)) / 500);
  const glow = Math.max(0, 1 - (now - (p.gainAt || 0)) / 600);
  ctx.save();
  ctx.fillStyle = 'rgba(20, 12, 6, 0.8)';
  roundRect(x, y, w, h, 8);
  ctx.fill();
  const ix = x + 30, iw = w - 36, iy = y + 4, ih = h - 8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ix, iy, iw, ih, 5);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = frac > 0.6 ? '#66BB6A' : frac > 0.3 ? '#FFCA28' : '#EF5350';
    roundRect(ix, iy, iw * frac, ih, 5);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < max && max <= 30; i++) {   // too many ticks would black out a big bar
    ctx.beginPath();
    ctx.moveTo(ix + iw * i / max, iy + 1);
    ctx.lineTo(ix + iw * i / max, iy + ih - 1);
    ctx.stroke();
  }
  if (flash > 0 || glow > 0) {
    ctx.fillStyle = flash > 0 ? `rgba(255, 82, 82, ${flash * 0.6})` : `rgba(165, 214, 167, ${glow * 0.6})`;
    roundRect(x, y, w, h, 8);
    ctx.fill();
  }
  if (p.regenAt) {
    const u = clamp(1 - (p.regenAt - now) / (p.regenMs || STRENGTH_REGEN_MS), 0, 1);
    ctx.fillStyle = '#C5E1A5';
    ctx.fillRect(ix, y + h - 4, iw * u, 3);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge || 'rgba(255, 255, 255, 0.4)';
  roundRect(x, y, w, h, 8);
  ctx.stroke();
  ctx.font = `14px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText('💪', x + 15, y + h / 2 + 1);
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
  const label = `STRENGTH ${p.strength}/${max}`;
  ctx.strokeText(label, ix + iw / 2, y + h / 2 + 1);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, ix + iw / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function drawFightButtons() {
  for (const b of fightButtonRects()) {
    const down = (b.id in fightTouch) && fightTouch[b.id];
    ctx.fillStyle = down ? 'rgba(255, 213, 79, 0.55)' : 'rgba(20, 12, 6, 0.6)';
    roundRect(b.x, b.y, b.w, b.h, b.w * 0.3);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFD54F';
    ctx.stroke();
    ctx.font = `${Math.round(b.w * 0.45)}px ${SCENE_EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFF9C4';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 2);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawFightOverlay(v, f, now) {
  const W = canvas.width, Hc = canvas.height;
  const t = now - f.phaseStart;
  const big = Math.min(110, W * 0.16);
  if (f.phase === 'intro') {
    if (t < 350) {
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - t / 350})`;
      ctx.fillRect(0, 0, W, Hc);
    }
    if (t < 1200) {
      const u = clamp(t / 300, 0, 1);
      ctx.save();
      ctx.globalAlpha = u;
      bigText(bossName().toUpperCase(), W / 2, Hc * 0.3, big * 0.55, '#FF9E5E');
      if (f.def && f.def.aka) bigText(`a.k.a. the ${f.def.aka}`, W / 2, Hc * 0.3 + big * 0.5, big * 0.28, '#FFE0B2');
      bigText('READY...', W / 2, Hc * 0.3 + big * 1.1, big * 0.5, '#fff');
      let ly = Hc * 0.3 + big * 1.65;
      const introLine = f.foe.intro(f);
      if (introLine) { bigText(introLine, W / 2, ly, big * 0.3, '#B3E5FC'); ly += big * 0.45; }
      if (f.boost) { bigText(`🧁 Sugar power! +${f.boost} 💪`, W / 2, ly, big * 0.3, '#F8BBD0'); ly += big * 0.45; }
      if (f.s) bigText(`🤝 ${f.s.name} is here to help!`, W / 2, ly, big * 0.3, lightenColor(f.s.char.color, 0.6));
      ctx.restore();
    } else {
      const u = clamp((t - 1200) / 250, 0, 1);
      ctx.save();
      ctx.translate(W / 2, Hc * 0.36);
      const sc = easeOutBack(u);
      ctx.scale(sc, sc);
      bigText('FIGHT!', 0, 0, big, '#FFEB3B', '#B71C1C');
      ctx.restore();
    }
  } else if (f.phase === 'ko') {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.35, t / 1500)})`;
    ctx.fillRect(0, 0, W, Hc);
    const u = clamp(t / 300, 0, 1);
    ctx.save();
    ctx.translate(W / 2, Hc * 0.36);
    const sc = easeOutBack(u) * (1 + Math.sin(t / 90) * 0.03);
    ctx.scale(sc, sc);
    bigText('K.O.!', 0, 0, big * 1.2, '#FF5252', '#fff');
    ctx.restore();
  } else if (f.phase === 'result') {
    const r = f.result;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, Hc);
    const pw = Math.min(520, W - 32);
    // Lines are a string or { text, color }; long ones wrap to fit the panel,
    // and the panel grows to hold them all
    const fs = Math.min(19, pw / 26), lineH = Math.round(fs * 1.6);
    ctx.font = `${fs}px "Comic Sans MS", cursive`;
    const rows = r.lines.flatMap(entry => {
      const { text, color } = typeof entry === 'string' ? { text: entry } : entry;
      return wrapLines(text, pw - 48).map(t => ({ text: t, color: color || '#fff' }));
    });
    const ph = Math.max(230, 100 + (rows.length - 1) * lineH + 70);
    const px = W / 2 - pw / 2, py = Math.max(8, Hc * 0.42 - ph / 2);
    const u = easeOutBack(clamp(t / 350, 0, 1));
    ctx.save();
    ctx.translate(W / 2, py + ph / 2);
    ctx.scale(u, u);
    ctx.translate(-W / 2, -(py + ph / 2));
    ctx.fillStyle = r.won ? '#2E7D32' : '#5D1A1A';
    roundRect(px, py, pw, ph, 18);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFD54F';
    ctx.stroke();
    const title = r.won ? 'YOU WIN! 🏆' : r.fled ? 'YOU RAN AWAY! 💨' : `${bossName().toUpperCase()} WINS!`;
    bigText(title, W / 2, py + 46, Math.min(40, pw / 11), '#FFEB3B');
    ctx.textAlign = 'center';
    ctx.font = `${fs}px "Comic Sans MS", cursive`;
    rows.forEach((row, i) => {
      ctx.fillStyle = row.color;
      ctx.fillText(row.text, W / 2, py + 100 + i * lineH);
    });
    ctx.font = 'bold 14px "Comic Sans MS", cursive';
    ctx.fillStyle = '#FFE0B2';
    ctx.fillText(isTouchDevice() ? 'Tap to go back to camp' : 'Press SPACE to go back to camp', W / 2, py + ph - 22);
    ctx.restore();
  }
}

function drawFight() {
  const f = fight;
  if (!f) return;
  const now = performance.now();
  const v = fightView();
  ctx.save();
  if (f.shake > 0) ctx.translate((Math.random() - 0.5) * f.shake, (Math.random() - 0.5) * f.shake);
  f.foe.arena(v, now);
  if (f.s) drawFightPlayer(v, f.s, now, f.s.char, SIDEKICK_LANE);
  f.foe.draw(v, f, now);
  drawFightPlayer(v, f.p, now);
  if (f.s) drawTeamGuard(v, f, now);
  drawFightLayers(v, f, now, -Infinity, 50);
  drawFightFx(v, f, now);
  ctx.restore();
  // the Blob's yelling, above its head
  if (f.shout) {
    const s = 215 * v.scale / 100;
    const dir = f.b.facing === 'left' ? -1 : 1;
    drawShout(v.sx(f.b.x) + dir * 40 * s, v.sy(f.b.y) - 92 * s, f.shout.text, now - f.shout.start,
      Math.max(16, Math.min(30, 30 * v.scale)));
  }
  drawFightHud(v, f, now);
  drawFightLayers(v, f, now, 50, Infinity);
  if (isTouchDevice() && f.phase === 'fight') drawFightButtons();
  drawFightOverlay(v, f, now);
}
