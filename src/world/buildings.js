// --- Buildings drawn over a map picture ---
// A hotspot with `"building": "bank"` gets a building drawn in its box (the
// hand-drawn map has no bank). Its closed door is drawn at the hotspot's
// `door` rect, so the door that swings open lines up with it.
function drawMapBuildings() {
  for (const obj of interactiveObjects) {
    if (obj.building === 'bank') drawBankBuilding(obj);
  }
}

function drawBankBuilding(obj) {
  const { x, y, width: w, height: h } = obj;
  const ink = '#221c1a';
  const lw = Math.max(2.5, w * 0.014);
  const roofH = h * 0.26, friezeY = y + roofH, friezeH = h * 0.12;
  const bodyY = friezeY + friezeH, stepsY = y + h * 0.88;
  const stone = '#efe6cd', shade = '#d8cba6';
  const shape = (draw, fill) => {
    ctx.beginPath();
    draw();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.lineWidth = lw;
    ctx.strokeStyle = ink;
    ctx.stroke();
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // walls behind the columns
  shape(() => ctx.rect(x + w * 0.06, bodyY, w * 0.88, stepsY - bodyY), shade);
  // steps
  for (let i = 0; i < 3; i++) {
    const sy = stepsY + (h - (stepsY - y)) * i / 3, inset = w * (0.04 - i * 0.02);
    shape(() => ctx.rect(x + inset, sy, w - 2 * inset, (y + h - stepsY) / 3), i % 2 ? '#cfc4a8' : '#e3d9bf');
  }
  // columns (left two and right two; the door is in the middle)
  const colW = w * 0.075;
  for (const f of [0.1, 0.25, 0.675, 0.825]) {
    const cx = x + w * f;
    shape(() => ctx.rect(cx, bodyY, colW, stepsY - bodyY), stone);
    ctx.lineWidth = lw * 0.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    for (const g of [0.33, 0.66]) {
      ctx.beginPath();
      ctx.moveTo(cx + colW * g, bodyY + 4);
      ctx.lineTo(cx + colW * g, stepsY - 4);
      ctx.stroke();
    }
    shape(() => ctx.rect(cx - colW * 0.2, bodyY, colW * 1.4, h * 0.03), stone);            // capital
    shape(() => ctx.rect(cx - colW * 0.2, stepsY - h * 0.03, colW * 1.4, h * 0.03), stone); // base
  }
  // frieze band with the sign
  shape(() => ctx.rect(x + w * 0.02, friezeY, w * 0.96, friezeH), stone);
  ctx.font = `bold ${Math.round(friezeH * 0.72)}px "Comic Sans MS", "Chalkboard SE", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#2e7d32';
  ctx.fillText('CAMP BANK', x + w / 2, friezeY + friezeH * 0.55);
  // triangular roof with a big coin in it
  shape(() => {
    ctx.moveTo(x, friezeY);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w, friezeY);
    ctx.closePath();
  }, '#66bb6a');
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = w * 0.03;
  for (let i = -4; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * w * 0.08, friezeY);
    ctx.lineTo(x + i * w * 0.08 + roofH, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.font = `${Math.round(roofH * 0.55)}px ${SCENE_EMOJI_FONT}`;
  ctx.fillText('🪙', x + w / 2, y + roofH * 0.62);
  ctx.textBaseline = 'alphabetic';

  // the closed door (drawDoorOpening swings it open on top of this)
  const d = obj.door;
  if (d) {
    const dx = d.px * scaledMapW, dy = d.py * scaledMapH, dw = d.pw * scaledMapW, dh = d.ph * scaledMapH;
    shape(() => ctx.rect(dx - dw * 0.08, dy - dw * 0.08, dw * 1.16, dh + dw * 0.08), '#5d4037');   // frame
    shape(() => ctx.rect(dx, dy, dw, dh), d.color || '#2e7d32');
    shape(() => ctx.ellipse(dx + dw / 2, dy + dh * 0.18, dw * 0.2, dw * 0.2, 0, 0, Math.PI * 2), '#3fb6d9');
    shape(() => ctx.arc(dx + dw * 0.8, dy + dh * 0.55, Math.max(2, dw * 0.07), 0, Math.PI * 2), '#ffd54f');
  }
  ctx.restore();
}

registerMapLayer(30, () => drawMapBuildings());
