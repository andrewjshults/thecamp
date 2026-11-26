// ---------- Drawing the Blob (human head, fox body, sword in its tail) ----------
// Tail tip + sword angle per pose, in the Blob's own units (100 = its height),
// facing right: angle 0 points forward, -π/2 straight up.
const BLOB_POSES = {
  idle:   { tx: -50, ty: -84,  a: -1.9 },
  windup: { tx: -22, ty: -118, a: -2.7 },
  strike: { tx: 38,  ty: -96,  a: 0.55 },
  block:  { tx: 62,  ty: -46,  a: -1.45 },
  hit:    { tx: -62, ty: -70,  a: -2.4 }
};
function lerpPose(p, q, t) {
  return { tx: lerp(p.tx, q.tx, t), ty: lerp(p.ty, q.ty, t), a: lerp(p.a, q.a, t) };
}

// A sword along +x from the current origin (the hand / tail tip).
// `kind` (optional, see SWORD_KINDS): a shop sword's blade colour and glow.
function drawSword(len, w, kind) {
  const ink = '#2b2320';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#6d4c41';                      // grip
  ctx.fillRect(-len * 0.2, -w * 0.6, len * 0.2, w * 1.2);
  ctx.beginPath();                                // pommel
  ctx.arc(-len * 0.2, 0, w * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = '#FFC107';
  ctx.fill();
  ctx.beginPath();                                // blade
  ctx.moveTo(0, -w);
  ctx.lineTo(len * 0.86, -w);
  ctx.lineTo(len, 0);
  ctx.lineTo(len * 0.86, w);
  ctx.lineTo(0, w);
  ctx.closePath();
  if (kind && kind.glow) {
    ctx.save();
    ctx.shadowColor = kind.glow;
    ctx.shadowBlur = w * 6;
    ctx.fillStyle = kind.glow;
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = (kind && kind.blade) || '#E3E9F0';
  ctx.fill();
  ctx.lineWidth = Math.max(1, w * 0.45);
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.beginPath();                                // shine
  ctx.moveTo(len * 0.08, -w * 0.35);
  ctx.lineTo(len * 0.78, -w * 0.35);
  ctx.lineWidth = Math.max(1, w * 0.35);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.stroke();
  ctx.fillStyle = '#FFC107';                      // cross-guard
  ctx.fillRect(-w * 0.7, -w * 2.6, w * 1.4, w * 5.2);
  ctx.lineWidth = Math.max(1, w * 0.4);
  ctx.strokeStyle = ink;
  ctx.strokeRect(-w * 0.7, -w * 2.6, w * 1.4, w * 5.2);
}

// x, feetY: screen/map px of the feet. H: height in px.
// o: { tail, moving, walk, mouth, t, dizzy, swoosh }
function drawBlob(x, feetY, H, facing, o) {
  const s = H / 100;
  const t = o.t || performance.now();
  const tail = o.tail || BLOB_POSES.idle;
  const stride = o.moving ? Math.sin(o.walk * 11) : 0;
  const bob = o.moving ? Math.abs(Math.sin(o.walk * 11)) * 2 : Math.sin(t / 380) * 1.2;
  const by = -bob;
  const ink = '#3a1d0a';
  const fur = '#E8762A';

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x, feetY, 46 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, feetY);
  ctx.scale(facing === 'left' ? -s : s, s);
  if (o.dizzy) ctx.translate(Math.sin(t / 25) * 2, 0);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Fox legs: orange on top, black socks
  const leg = (lx, ph, far) => {
    const swing = stride * 7 * ph;
    const knee = { x: lx + swing * 0.4, y: -14 + by * 0.5 };
    const paw = { x: lx + swing, y: -2 };
    ctx.strokeStyle = ink;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(lx, -28 + by);
    ctx.lineTo(knee.x, knee.y);
    ctx.lineTo(paw.x, paw.y);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = far ? '#c25e1c' : fur;
    ctx.beginPath();
    ctx.moveTo(lx, -28 + by);
    ctx.lineTo(knee.x, knee.y);
    ctx.stroke();
    ctx.strokeStyle = far ? '#1a110b' : '#2b1d15';
    ctx.beginPath();
    ctx.moveTo(knee.x, knee.y);
    ctx.lineTo(paw.x, paw.y);
    ctx.stroke();
    ctx.fillStyle = '#1a110b';
    ctx.beginPath();
    ctx.ellipse(paw.x + 2, paw.y, 5, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  leg(-30, 1, true);
  leg(14, -1, true);

  // Big bushy tail, curling up from the rump to where it holds the sword
  const tail0 = { x: -42, y: -40 + by };
  const tip = { x: tail.tx, y: tail.ty + by };
  const cp = { x: (tail0.x + tip.x) / 2 - 24, y: Math.min(tail0.y, tip.y) - 20 };
  ctx.beginPath();
  ctx.moveTo(tail0.x, tail0.y);
  ctx.quadraticCurveTo(cp.x, cp.y, tip.x, tip.y);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 22;
  ctx.stroke();
  ctx.strokeStyle = fur;
  ctx.lineWidth = 17;
  ctx.stroke();

  // Body + creamy belly + marker streaks
  ctx.beginPath();
  ctx.ellipse(-6, -38 + by, 40, 17, 0, 0, Math.PI * 2);
  ctx.fillStyle = fur;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#FFF3E0';
  ctx.beginPath();
  ctx.ellipse(2, -25 + by, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 70, 10, 0.35)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-40 + i * 13, -52 + by);
    ctx.lineTo(-32 + i * 13, -36 + by);
    ctx.stroke();
  }
  ctx.restore();
  leg(-22, -1, false);
  leg(22, 1, false);

  // Furry neck up to the (human!) head
  ctx.beginPath();
  ctx.moveTo(18, -42 + by);
  ctx.quadraticCurveTo(34, -46 + by, 38, -60 + by);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 19;
  ctx.stroke();
  ctx.strokeStyle = fur;
  ctx.lineWidth = 15;
  ctx.stroke();
  ctx.fillStyle = '#FFF3E0';
  ctx.beginPath();
  ctx.ellipse(32, -44 + by, 7, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.save();
  ctx.translate(40, -66 + by);
  if (o.dizzy) ctx.rotate(-0.22 + Math.sin(t / 120) * 0.08);
  ctx.beginPath();                                   // face
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#F6C9A0';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.beginPath();                                   // ears
  ctx.arc(-16, 2, 3.5, 0, Math.PI * 2);
  ctx.arc(16, 2, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#EDB98C';
  ctx.fill();
  ctx.beginPath();                                   // messy spiky hair
  ctx.moveTo(-17, 0);
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const r = i % 2 ? 25 : 17;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 3);
  }
  ctx.lineTo(17, 0);
  ctx.quadraticCurveTo(0, -12, -17, 0);
  ctx.closePath();
  ctx.fillStyle = '#5b3418';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(244, 143, 177, 0.6)';        // rosy cheeks
  ctx.beginPath();
  ctx.arc(-9, 6, 3.5, 0, Math.PI * 2);
  ctx.arc(13, 6, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (o.dizzy) {                                     // X X eyes
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.2;
    for (const ex of [-3, 9]) {
      ctx.beginPath();
      ctx.moveTo(ex - 3.5, -5); ctx.lineTo(ex + 3.5, 2);
      ctx.moveTo(ex + 3.5, -5); ctx.lineTo(ex - 3.5, 2);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#fff';                          // big googly eyes
    ctx.beginPath();
    ctx.ellipse(-3, -2, 5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(9, -2, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#1a110b';
    ctx.beginPath();
    ctx.arc(-1.2, -1, 2.4, 0, Math.PI * 2);
    ctx.arc(10.8, -1, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;                           // grumpy eyebrows
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, -11); ctx.lineTo(1, -7.5);
    ctx.moveTo(14, -11); ctx.lineTo(5, -7.5);
    ctx.stroke();
  }
  const mouth = o.mouth || 0;
  if (mouth > 0) {                                   // CHOMP
    const mh = 2 + mouth * 6;
    ctx.beginPath();
    ctx.ellipse(4, 9, 9, mh, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#7a1f1f';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = ink;
    ctx.stroke();
    ctx.fillStyle = '#F48FB1';
    ctx.beginPath();
    ctx.ellipse(4, 9 + mh * 0.5, 5, mh * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      const tx = -2.5 + i * 4.2;
      ctx.beginPath();
      ctx.moveTo(tx - 1.8, 9 - mh * 0.85);
      ctx.lineTo(tx + 1.8, 9 - mh * 0.85);
      ctx.lineTo(tx, 9 - mh * 0.85 + 3.2);
      ctx.closePath();
      ctx.fill();
    }
  } else {                                           // toothy grin + fangs
    ctx.beginPath();
    ctx.arc(4, 4, 9, 0.2, Math.PI - 0.2);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = ink;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (const fx of [-1, 9]) {
      ctx.beginPath();
      ctx.moveTo(fx - 1.8, 12);
      ctx.lineTo(fx + 1.8, 12);
      ctx.lineTo(fx, 15.5);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // a drip of drool
    const drip = (t / 900) % 1;
    ctx.fillStyle = 'rgba(179, 229, 252, 0.9)';
    ctx.beginPath();
    ctx.ellipse(12, 13 + drip * 6, 1.6, 1.6 + drip * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Sword in the tail tip (in front of everything)
  if (o.swoosh) {
    ctx.save();
    ctx.globalAlpha = o.swoosh;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 62, tail.a - 1.7, tail.a);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(tip.x, tip.y);
  ctx.rotate(tail.a);
  drawSword(66, 2.6);
  ctx.restore();
  ctx.beginPath();                                   // fluffy white tail tip wraps the hilt
  ctx.arc(tip.x, tip.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF8EC';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = ink;
  ctx.stroke();

  if (o.dizzy) drawDizzyStars(40, -98, 18, t);
  ctx.restore();
}

function drawDizzyStars(cx, cy, r, t) {
  ctx.save();
  ctx.fillStyle = '#FFEB3B';
  ctx.strokeStyle = '#5a3d00';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a = t / 220 + i * (Math.PI * 2 / 3);
    drawStar(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.35, r * 0.32);
  }
  ctx.restore();
}

// Spiky "shout" bubble. (x, y) is where the spike points (the Blob's mouth).
function drawShout(x, y, text, age, fontPx) {
  const fs = fontPx || 22;
  const pop = Math.min(1, age / 220);
  const sc = Math.max(0.01, easeOutBack(pop));
  ctx.save();
  ctx.font = `bold ${fs}px "Comic Sans MS", cursive`;
  const tw = ctx.measureText(text).width;
  const rx = tw / 2 + fs * 1.0, ry = fs * 1.25;
  const cx = clamp(x, rx * 1.22 + 8, canvas.width - rx * 1.22 - 8);
  const cy = Math.max(ry * 1.22 + 8, y - ry - fs * 1.4);
  const wob = Math.sin(age / 35) * 1.5;                 // it's SHOUTING, it trembles
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.translate(-x, -y);
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#FFF59D';
  ctx.strokeStyle = '#5a2d0c';
  ctx.lineWidth = 3;
  ctx.beginPath();                                      // spike toward the mouth
  ctx.moveTo(cx - fs * 0.5, cy + ry * 0.7);
  ctx.lineTo(x, y);
  ctx.lineTo(cx + fs * 0.5, cy + ry * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();                                      // starburst
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = i % 2 ? 1 : 1.22;
    const px = cx + Math.cos(a) * rx * r + wob;
    const py = cy + Math.sin(a) * ry * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff';
  ctx.strokeText(text, cx + wob, cy + 1);
  ctx.fillStyle = '#C62828';
  ctx.fillText(text, cx + wob, cy + 1);
  ctx.restore();
}
