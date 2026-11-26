function drawGame() {
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!mapImage) return;

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Draw map at scaled size
  ctx.drawImage(mapImage, 0, 0, scaledMapW, scaledMapH);
  drawChalkboards();
  drawBossCave();
  drawMapBuildings();
  drawStations();
  drawLyingSwords();
  if (doorOpening) drawDoorOpening();

  // Draw interaction highlights
  for (const obj of interactiveObjects) {
    if (obj === nearbyObject && state !== GameState.TALKING) {
      // Glowing outline for nearby object
      const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255, 235, 59, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      roundRectPath(obj.x - 4, obj.y - 4, obj.width + 8, obj.height + 8, 8);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.font = 'bold 13px "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      const labelX = obj.x + obj.width / 2;
      // Keep the label (and the hint above it) on screen for tall/top hotspots
      const labelY = Math.max(obj.y - 12, camera.y + 46);
      const labelW = ctx.measureText(obj.name).width + 16;
      roundRect(labelX - labelW / 2, labelY - 14, labelW, 22, 6);
      ctx.fill();

      ctx.fillStyle = '#FFEB3B';
      ctx.fillText(obj.name, labelX, labelY);

      // Interact hint (portals get a special "ENTER" label)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      const hintY = labelY - 24;
      let hintText;
      if (obj.targetMap) {
        hintText = isTouchDevice() ? '🚪 [ TAP ]' : '🚪 [ ENTER ]';
      } else if (obj.bank) {
        hintText = `${isTouchDevice() ? '[ TAP ]' : '[ SPACE ]'} 🏦 Talk to the teller`;
      } else if (obj.station) {
        hintText = `${isTouchDevice() ? '[ TAP ]' : '[ SPACE ]'} ${stationHint(obj)}`;
      } else if (isBossCave(obj)) {
        hintText = `${isTouchDevice() ? '[ TAP ]' : '[ SPACE ]'} ${mapBoss.where === 'home' ? '⚔️ Knock knock...' : 'Peek inside'}`;
      } else {
        hintText = isTouchDevice() ? '[ TAP ]' : '[ SPACE ]';
      }
      const hintW = ctx.measureText(hintText).width + 12;
      roundRect(labelX - hintW / 2, hintY - 12, hintW, 18, 4);
      ctx.fill();

      ctx.fillStyle = '#FFF9C4';
      ctx.font = '11px "Comic Sans MS", cursive';
      ctx.fillText(hintText, labelX, hintY);
    }
  }

  // Draw player and NPC friends (depth-sorted)
  drawPeople();

  ctx.restore();

  // Speech bubbles (screen space so they can be kept on-screen)
  drawSpeechBubbles();
  drawMapBossShout();
  drawKitchenHud();

  // Tap ripple visual
  if (tapRipple) {
    tapRipple.age++;
    const progress = tapRipple.age / 30;
    if (progress >= 1) {
      tapRipple = null;
    } else {
      const alpha = 1 - progress;
      const radius = 8 + progress * 24;
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = '#FFD54F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tapRipple.x, tapRipple.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.arc(tapRipple.x, tapRipple.y, radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // HUD
  drawHUD();

  // Backpack overlay (also visible behind ITEM_ACTION modal)
  if (backpackOpen) drawBackpack();

  // Transient "you used X" toast
  drawUseToast();

  // Adventure Journal sidebar (always on top of game)
  drawJournal();

  // All-done celebration toast
  drawCompletionToast();
}
