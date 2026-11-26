// --- Door swinging open before walking through a portal ---
// A portal hotspot's optional `door` is { px, py, pw, ph, color } in map
// fractions: the door drawn on the map, which swings toward the viewer on its
// left hinge to reveal a dark doorway (with `door.inside` emoji in it).
const DOOR_OPEN_MS = 650;
let doorOpening = null;   // { obj, start }

function drawDoorOpening() {
  const d = doorOpening.obj.door;
  const x = d.px * scaledMapW, y = d.py * scaledMapH;
  const w = d.pw * scaledMapW, h = d.ph * scaledMapH;
  const p = Math.min(1, (performance.now() - doorOpening.start) / (DOOR_OPEN_MS * 0.8));
  const ease = 1 - Math.pow(1 - p, 3);
  const ink = '#221c1a';

  // dark doorway
  ctx.fillStyle = '#3b3631';
  ctx.fillRect(x, y, w, h);
  if (d.inside) {
    ctx.font = `${Math.round(w * 0.55)}px ${SCENE_EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.3 + 0.7 * ease;
    ctx.fillText(d.inside, x + w / 2, y + h * 0.68);
    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  }
  // the door: free edge swings left and toward us (so it gets a little taller)
  const angle = ease * 1.25;                       // ~72°
  const freeX = x + w * Math.cos(angle) - w * 0.12 * Math.sin(angle);
  const grow = h * 0.07 * Math.sin(angle);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(freeX, y - grow);
  ctx.lineTo(freeX, y + h + grow);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = d.color || '#8dbb2a';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // round window, squashed as the door turns
  const ww = Math.max(2, (freeX - x) * 0.2);
  ctx.beginPath();
  ctx.ellipse(x + (freeX - x) / 2, y + h * 0.18, ww, w * 0.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3fb6d9';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  // creak!
  ctx.globalAlpha = Math.sin(p * Math.PI);
  ctx.font = 'bold 26px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFF59D';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.strokeText('CREEEAK!', x + w / 2, y - 20);
  ctx.fillText('CREEEAK!', x + w / 2, y - 20);
  ctx.globalAlpha = 1;
}

registerMapLayer(60, () => { if (doorOpening) drawDoorOpening(); });
