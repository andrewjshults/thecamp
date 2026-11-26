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
