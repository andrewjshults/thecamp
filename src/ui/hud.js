// --- HUD: your name, sword, world code and sidekick, and the key hints ---

function drawHUD() {
  // Character name badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(10, 10, 160, 36, 8);
  ctx.fill();

  ctx.fillStyle = player.character.color;
  ctx.font = 'bold 16px "Comic Sans MS", cursive';
  ctx.textAlign = 'left';
  ctx.fillText('♦ ' + player.character.name, 20, 34);
  drawSwordBadge(176, 10);

  if (mp.active) drawMpHudBadge();
  if (sidekick) drawSidekickHudBadge(mp.active ? 88 : 52);

  // Mini instructions
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  const instrText = isTouchDevice()
    ? 'Tap to move  •  Tap zone to interact'
    : '↑←↓→ Move  •  Space Interact  •  T Talk  •  Esc Menu';
  ctx.font = '12px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  const instrW = ctx.measureText(instrText).width + 20;
  roundRect(canvas.width / 2 - instrW / 2, canvas.height - 36, instrW, 26, 6);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(instrText, canvas.width / 2, canvas.height - 18);
}
// "🤝 Red Scout is your sidekick" under the camper name
function drawSidekickHudBadge(y) {
  const text = `🤝 ${sidekickName()} is your sidekick`;
  ctx.font = 'bold 14px "Comic Sans MS", cursive';
  const w = ctx.measureText(text).width + 20;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(10, y, w, 30, 8);
  ctx.fill();
  ctx.fillStyle = sidekick.char.color;
  ctx.textAlign = 'left';
  ctx.fillText(text, 20, y + 20);
}
