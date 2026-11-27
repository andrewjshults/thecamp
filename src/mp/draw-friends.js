// --- Drawing friends ---
function drawRemotePlayer(rp) {
  const k = SPRITE_SCALE / BASE_SPRITE_SCALE;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(rp.x, rp.y + 2, 42 * k, 15 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  const draw = () => drawCharacterSprite(
    rp.x - player.width / 2, rp.y - player.height, rp.char, rp.frame, rp.facing,
    SPRITE_SCALE, mouthOpenFor(rp), rp.held
  );
  if (rp.rotation) {
    const cx = rp.x, cy = rp.y - player.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rp.rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
    draw();
    ctx.restore();
  } else {
    draw();
  }
}

// Small name label over a friend's head
function drawNameTag(rp) {
  const head = speakerHead(rp);
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  const label = rp.fighting ? `⚔️ ${rp.name} is fighting the Blob!`
    : rp.away ? `💤 ${rp.name}` : `⭐ ${rp.name}`;
  const w = ctx.measureText(label).width + 14;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  roundRect(head.x - w / 2, head.top - 30, w, 20, 6);
  ctx.fill();
  ctx.fillStyle = rp.color;
  ctx.fillText(label, head.x, head.top - 16);
}

// HUD badge under the camper name: world code + how many campers are here
function drawMpHudBadge() {
  const n = 1 + mp.players.size;
  let text = `🌍 World ${mp.code}  ·  👥 ${n} camper${n === 1 ? '' : 's'}`;
  if (!mp.connected) text += '  ·  ⚠️ reconnecting…';
  ctx.font = 'bold 14px "Comic Sans MS", cursive';
  const w = ctx.measureText(text).width + 20;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(10, 52, w, 30, 8);
  ctx.fill();
  ctx.fillStyle = '#FFE082';
  ctx.textAlign = 'left';
  ctx.fillText(text, 20, 72);
}

// Character screen in a world: the code to share, and who's here
function drawWorldCodeBanner() {
  const code = `${mp.code.slice(0, 3)} ${mp.code.slice(3)}`;
  const n = mp.players.size;
  const sub = n
    ? `${n} friend${n === 1 ? ' is' : 's are'} here!  Tell others the code to join.`
    : 'Give your friends this code so they can join you!';
  const w = Math.min(canvas.width - 24, 440), h = 62;
  const x = canvas.width / 2 - w / 2, y = 136;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = 2;
  roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 24px "Comic Sans MS", cursive';
  ctx.fillText(`🌍 World code: ${code}`, canvas.width / 2, y + 28);
  ctx.fillStyle = '#FFE0B2';
  ctx.font = '13px "Comic Sans MS", cursive';
  ctx.fillText(sub, canvas.width / 2, y + 50);
}
