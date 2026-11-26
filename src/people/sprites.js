// --- Drawing ---
// mouth: 0 = smile, (0, 1] = open mouth (used to animate talking)
// `held`: emoji the character is carrying in both hands (kitchen food)
// `swordArm`: skip the front arm — the fight view draws it holding a sword
function drawCharacterSprite(x, y, char, frame, facing, scale, mouth, held, swordArm) {
  const s = scale || 1;
  const w = 30 * s;
  const h = 48 * s;

  ctx.save();

  if (facing === 'left') {
    ctx.translate(x + w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(x + w / 2), 0);
  }

  // Legs
  const legOffset = Math.sin(frame * Math.PI / 2) * 4 * s;
  ctx.fillStyle = char.pantsColor;
  ctx.fillRect(x + 7 * s, y + 30 * s + legOffset, 6 * s, 18 * s);
  ctx.fillRect(x + 17 * s, y + 30 * s - legOffset, 6 * s, 18 * s);

  // Shoes
  ctx.fillStyle = '#5D4037';
  ctx.fillRect(x + 5 * s, y + 44 * s + legOffset, 10 * s, 4 * s);
  ctx.fillRect(x + 15 * s, y + 44 * s - legOffset, 10 * s, 4 * s);

  // Body
  ctx.fillStyle = char.shirtColor;
  ctx.fillRect(x + 5 * s, y + 16 * s, 20 * s, 18 * s);

  if (held) {
    // Arms bend in to carry the food in front of the tummy
    const bob = Math.abs(Math.sin(frame * Math.PI / 2)) * 1.2 * s;
    ctx.fillStyle = char.shirtColor;
    ctx.fillRect(x, y + 17 * s, 6 * s, 9 * s);
    ctx.fillRect(x + 24 * s, y + 17 * s, 6 * s, 9 * s);
    ctx.fillRect(x + 3 * s, y + 23 * s + bob, 7 * s, 5 * s);
    ctx.fillRect(x + 20 * s, y + 23 * s + bob, 7 * s, 5 * s);
    ctx.font = `${Math.round(15 * s)}px ${SCENE_EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';                 // opaque, or Chrome fades colour emoji
    ctx.fillText(held, x + 15 * s, y + 25 * s + bob);
    ctx.textBaseline = 'alphabetic';
    // hands gripping the sides
    ctx.fillStyle = '#FFCC80';
    ctx.fillRect(x + 6 * s, y + 24 * s + bob, 4 * s, 5 * s);
    ctx.fillRect(x + 20 * s, y + 24 * s + bob, 4 * s, 5 * s);
  } else {
    // Arms
    const armSwing = Math.sin(frame * Math.PI / 2) * 3 * s;
    ctx.fillStyle = char.shirtColor;
    ctx.fillRect(x, y + 17 * s + armSwing, 6 * s, 14 * s);
    if (!swordArm) ctx.fillRect(x + 24 * s, y + 17 * s - armSwing, 6 * s, 14 * s);

    // Hands
    ctx.fillStyle = '#FFCC80';
    ctx.fillRect(x, y + 29 * s + armSwing, 6 * s, 4 * s);
    if (!swordArm) ctx.fillRect(x + 24 * s, y + 29 * s - armSwing, 6 * s, 4 * s);
  }

  // Braid: drawn before the head so the head covers where it starts
  if (char.braid) drawBraid(x, y, s, char.hairColor, frame);

  // Head
  ctx.fillStyle = '#FFCC80';
  ctx.beginPath();
  ctx.arc(x + 15 * s, y + 10 * s, 10 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = char.hairColor;
  ctx.beginPath();
  ctx.arc(x + 15 * s, y + 7 * s, 10 * s, Math.PI, Math.PI * 2);
  ctx.fill();
  if (char.braid) {
    // Side of the hair sweeping back into the braid
    ctx.beginPath();
    ctx.moveTo(x + 5 * s, y + 7 * s);
    ctx.lineTo(x + 9.5 * s, y + 7 * s);
    ctx.lineTo(x + 8 * s, y + 13 * s);
    ctx.lineTo(x + 5.6 * s, y + 14 * s);
    ctx.closePath();
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 11 * s, y + 8 * s, 3 * s, 3 * s);
  ctx.fillRect(x + 18 * s, y + 8 * s, 3 * s, 3 * s);

  if (mouth > 0) {
    // Talking: open mouth
    ctx.fillStyle = '#6D2E2E';
    ctx.beginPath();
    ctx.ellipse(x + 15 * s, y + 14.5 * s, 3 * s, (0.6 + mouth * 2) * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Smile
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(x + 15 * s, y + 12 * s, 4 * s, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  ctx.restore();
}

// A braid down the back of the head (the side away from where they face),
// woven from alternating tilted lobes, with a pink hair tie and a little tuft.
function drawBraid(x, y, s, color, frame) {
  const sway = Math.sin(frame * Math.PI / 2) * 1.2 * s;   // swings a little while walking
  const bx = x + 5 * s;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 0.8 * s;
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const side = i % 2 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(bx + sway * t + side * 0.8 * s, y + (13 + i * 3.6) * s,
      (3.2 - t * 0.7) * s, 2.5 * s, side * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const ex = bx + sway, ey = y + 29.5 * s;
  ctx.beginPath();                          // tuft below the tie
  ctx.moveTo(ex - 2 * s, ey + 1.5 * s);
  ctx.lineTo(ex + 2 * s, ey + 1.5 * s);
  ctx.lineTo(ex + 0.5 * s, ey + 5.5 * s);
  ctx.lineTo(ex - 0.8 * s, ey + 5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#F48FB1';                // hair tie
  ctx.fillRect(ex - 2.2 * s, ey, 4.4 * s, 2 * s);
}
