function drawLoadingScreen() {
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#FFD54F';
  ctx.font = '36px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText(loadingMessage, canvas.width / 2, canvas.height / 2);

  // Simple loading spinner
  const t = Date.now() / 200;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + t;
    const alpha = ((i / 8 + (t % 1)) % 1);
    ctx.fillStyle = `rgba(255, 213, 79, ${alpha})`;
    ctx.beginPath();
    ctx.arc(
      canvas.width / 2 + Math.cos(angle) * 30,
      canvas.height / 2 + 50 + Math.sin(angle) * 30,
      5, 0, Math.PI * 2
    );
    ctx.fill();
  }
}

// Dark green backdrop with the map faded in, plus twinkling stars
function drawMenuBackdrop() {
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (mapImage) {
    ctx.globalAlpha = 0.15;
    const scale = Math.max(canvas.width / mapImage.naturalWidth, canvas.height / mapImage.naturalHeight);
    ctx.drawImage(mapImage, 0, 0, mapImage.naturalWidth * scale, mapImage.naturalHeight * scale);
    ctx.globalAlpha = 1;
  }
  const t = Date.now() / 1000;
  ctx.fillStyle = '#FFD54F';
  for (let i = 0; i < 15; i++) {
    const sx = (Math.sin(i * 2.5 + t * 0.3) * 0.5 + 0.5) * canvas.width;
    const sy = (Math.cos(i * 1.7 + t * 0.2) * 0.5 + 0.5) * canvas.height * 0.3;
    drawStar(sx, sy, 2 + Math.sin(t + i) * 1.5);
  }
}

// "← Back" (to the single / multi player menu) on the character screen
function charSelectBackRect() {
  return { x: 12, y: 12, w: 96, h: 34 };
}
let charSelectNote = null;   // { text, at } — e.g. "a friend is already playing ..."

function drawCharacterSelect() {
  // Background
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw faded map as background
  if (mapImage) {
    ctx.globalAlpha = 0.15;
    const scale = Math.max(canvas.width / mapImage.naturalWidth, canvas.height / mapImage.naturalHeight);
    ctx.drawImage(mapImage, 0, 0, mapImage.naturalWidth * scale, mapImage.naturalHeight * scale);
    ctx.globalAlpha = 1;
  }

  // Back button
  const bb = charSelectBackRect();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(bb.x, bb.y, bb.w, bb.h, 10);
  ctx.fill();
  ctx.fillStyle = '#FFE0B2';
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('← Back', bb.x + bb.w / 2, bb.y + 23);

  if (mp.active) drawWorldCodeBanner();

  // Title
  ctx.fillStyle = '#FF9800';
  ctx.font = 'bold 48px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 4;
  ctx.strokeText('The Camp', canvas.width / 2, 80);
  ctx.fillText('The Camp', canvas.width / 2, 80);

  ctx.fillStyle = '#FFE0B2';
  ctx.font = '20px "Comic Sans MS", cursive';
  ctx.fillText('Choose your camper!', canvas.width / 2, 120);

  // Character cards
  const cardW = 120;
  const cardH = 170;
  const gap = 20;
  const totalW = characters.length * (cardW + gap) - gap;
  const startX = canvas.width / 2 - totalW / 2;
  const cardY = canvas.height / 2 - 40;

  for (let i = 0; i < characters.length; i++) {
    const cx = startX + i * (cardW + gap);
    const isSelected = i === selectedCharIndex;
    const isHovered = i === hoveredCharIndex;
    const taken = mp.active && mpCharacterTaken(characters[i].name);
    if (taken) ctx.globalAlpha = 0.45;

    // Card background
    ctx.fillStyle = isSelected ? 'rgba(255, 152, 0, 0.3)' : 'rgba(0, 0, 0, 0.3)';
    if (isHovered && !isSelected) ctx.fillStyle = 'rgba(255, 152, 0, 0.15)';
    ctx.strokeStyle = isSelected ? '#FF9800' : (isHovered ? '#FFB74D' : '#5D4037');
    ctx.lineWidth = isSelected ? 3 : 2;

    roundRect(cx, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.stroke();

    // Draw character
    drawCharacterSprite(cx + 35, cardY + 15, characters[i], 0, 'right', 1);

    // Name
    ctx.fillStyle = '#FFE0B2';
    ctx.font = '14px "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.fillText(characters[i].name, cx + cardW / 2, cardY + 85);

    // Description (word-wrapped within card)
    ctx.fillStyle = '#BCAAA4';
    ctx.font = '11px "Comic Sans MS", cursive';
    wrapText(characters[i].desc, cx + cardW / 2, cardY + 105, cardW - 12, 14);
    ctx.globalAlpha = 1;
    if (taken) {
      ctx.save();
      ctx.translate(cx + cardW / 2, cardY + cardH / 2 + 10);
      ctx.rotate(-0.2);
      ctx.fillStyle = '#E53935';
      roundRect(-52, -15, 104, 30, 8);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px "Comic Sans MS", cursive';
      ctx.fillText('A friend!', 0, 5);
      ctx.restore();
    }
  }

  if (charSelectNote && performance.now() - charSelectNote.at < 3000) {
    ctx.font = 'bold 16px "Comic Sans MS", cursive';
    const nw = ctx.measureText(charSelectNote.text).width + 28;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    roundRect(canvas.width / 2 - nw / 2, cardY + cardH + 18, nw, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#FFEB3B';
    ctx.textAlign = 'center';
    ctx.fillText(charSelectNote.text, canvas.width / 2, cardY + cardH + 41);
  }

  // Instructions
  ctx.fillStyle = '#BCAAA4';
  ctx.font = '16px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText(isTouchDevice() ? 'Tap a camper to pick!' : '← → to browse  •  Enter or Click to pick', canvas.width / 2, canvas.height - 60);

  // Stars decoration
  const t = Date.now() / 1000;
  ctx.fillStyle = '#FFD54F';
  for (let i = 0; i < 15; i++) {
    const sx = (Math.sin(i * 2.5 + t * 0.3) * 0.5 + 0.5) * canvas.width;
    const sy = (Math.cos(i * 1.7 + t * 0.2) * 0.5 + 0.5) * canvas.height * 0.3;
    const size = 2 + Math.sin(t + i) * 1.5;
    drawStar(sx, sy, size);
  }
}

function drawStar(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](Math.cos(angle) * size, Math.sin(angle) * size);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

registerGameState('LOADING', {
  draw: () => drawLoadingScreen()
});

function characterSelectKey(e) {
  if (e.key === 'ArrowLeft') {
    selectedCharIndex = (selectedCharIndex - 1 + characters.length) % characters.length;
  }
  if (e.key === 'ArrowRight') {
    selectedCharIndex = (selectedCharIndex + 1) % characters.length;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    selectCharacter(selectedCharIndex);
  }
  if (e.key === 'Escape') backToModeSelect();
}
function characterSelectTap(screenX, screenY) {
  const b = charSelectBackRect();
  if (screenX >= b.x && screenX <= b.x + b.w && screenY >= b.y && screenY <= b.y + b.h) {
    backToModeSelect();
    return;
  }
  const idx = getHoveredCharacter(screenX, screenY);
  if (idx >= 0) selectCharacter(idx);
}
registerGameState('CHARACTER_SELECT', {
  draw: () => drawCharacterSelect(),
  onKey: e => characterSelectKey(e),
  onTap: (x, y) => characterSelectTap(x, y)
});
