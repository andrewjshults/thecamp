// --- Item Use Dialog ---
function drawItemUseDialog() {
  drawGame();

  currentItemUse.timer++;
  itemUseAnimation = Math.min(1, itemUseAnimation + 0.06);

  // Dark overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * itemUseAnimation})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelW = Math.min(520, canvas.width - 40);
  const panelH = 290;
  const panelX = canvas.width / 2 - panelW / 2;
  const panelY = Math.max(10, canvas.height / 2 - panelH / 2);
  const scale = itemUseAnimation;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  // Panel
  ctx.fillStyle = '#3E2723';
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = 3;
  roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();

  // Inner border
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 1;
  roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 12);
  ctx.stroke();

  // Item emoji (big, left side)
  const t = currentItemUse.timer * 0.1;
  ctx.font = '52px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  const emojiX = panelX + 58;
  const emojiY = panelY + 80 + Math.sin(t * 2) * 5;
  ctx.fillText(currentItemUse.item.emoji || '?', emojiX, emojiY);

  // Star burst around emoji (subtle)
  ctx.globalAlpha = 0.25 + Math.sin(t * 3) * 0.15;
  ctx.font = '16px serif';
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + t;
    const starX = emojiX + Math.cos(ang) * 38;
    const starY = emojiY - 14 + Math.sin(ang) * 22;
    ctx.fillText('✨', starX, starY);
  }
  ctx.globalAlpha = 1;

  // Hotspot name
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  ctx.textAlign = 'left';
  ctx.fillText('At ' + currentItemUse.hotspot.name, panelX + 100, panelY + 34);

  // Item name
  ctx.fillStyle = '#FFECB3';
  ctx.font = 'bold 22px "Comic Sans MS", cursive';
  ctx.fillText(currentItemUse.item.name, panelX + 100, panelY + 60);

  // Use text with typewriter effect (left-aligned in right column)
  ctx.fillStyle = '#FFECB3';
  ctx.font = '16px "Comic Sans MS", cursive';
  ctx.textAlign = 'left';
  const text = currentItemUse.use.text;
  const visibleChars = Math.min(text.length, Math.floor(currentItemUse.timer * 1.1));
  const displayText = text.substring(0, visibleChars);
  wrapText(displayText, panelX + 104, panelY + 100, panelW - 124, 22);

  // Action animation at bottom
  drawActionAnimation(currentItemUse.animation, canvas.width / 2, panelY + panelH - 55, currentItemUse.timer);

  // Close hint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '12px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText(isTouchDevice() ? 'Tap to close' : 'Press Space or Esc to close', canvas.width / 2, panelY + panelH - 15);

  ctx.restore();

  // Journal still shows on top
  drawJournal();
}

function drawCompletionToast() {
  if (!completionToast) return;
  completionToast.age++;
  const DURATION = 180;
  if (completionToast.age > DURATION) { completionToast = null; return; }
  const alpha = completionToast.age < 30
    ? completionToast.age / 30
    : completionToast.age > DURATION - 30
      ? (DURATION - completionToast.age) / 30
      : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  const panelW = Math.min(420, canvas.width - 40);
  const panelH = 90;
  const panelX = canvas.width / 2 - panelW / 2;
  const panelY = canvas.height / 2 - 160;
  ctx.fillStyle = '#1B5E20';
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = 3;
  roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 22px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('🎉 ALL ADVENTURES COMPLETE! 🎉', canvas.width / 2, panelY + 38);
  ctx.fillStyle = '#FFECB3';
  ctx.font = '15px "Comic Sans MS", cursive';
  ctx.fillText('Amazing job, explorer! 🌟', canvas.width / 2, panelY + 64);
  ctx.restore();
}

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

function drawInteraction() {
  drawGame();

  interactionAnimation = Math.min(1, interactionAnimation + 0.05);
  interactionTimer++;

  // --- Usable items (in backpack, valid use, not done) ---
  const usableItems = backpack.filter(item => {
    if (!item) return false;
    return getItemUseAtHotspot(item, currentInteraction) && !isUseAlreadyDone(item.id, currentInteraction.id);
  });

  // --- Dimmed items (use defined here, NOT in backpack, not done) ---
  const backpackItemIds = new Set(backpack.filter(Boolean).map(i => i.id));
  const dimmedItems = [];
  const hotspotDef = mapConfig && mapConfig.hotspots.find(h => h.id === currentInteraction.id);
  for (const useEntry of (hotspotDef && hotspotDef.uses || [])) {
    if (isUseAlreadyDone(useEntry.itemId, currentInteraction.id)) continue;
    if (backpackItemIds.has(useEntry.itemId)) continue;
    let itemInfo = null, location = null;
    for (const hId of Object.keys(hotspotItems)) {
      const found = (hotspotItems[hId] || []).find(it => it.id === useEntry.itemId);
      if (found) {
        const hDef = mapConfig.hotspots.find(h => h.id === hId);
        itemInfo = found; location = hDef ? hDef.name : hId; break;
      }
    }
    if (!itemInfo && mapConfig) {
      for (const h of mapConfig.hotspots) {
        const found = (h.items || []).find(it => it.id === useEntry.itemId);
        if (found) { itemInfo = found; location = h.name; break; }
      }
    }
    if (itemInfo) dimmedItems.push({ ...itemInfo, location });
  }

  // --- Items sitting at this hotspot (can be picked up) ---
  const hereItems = hotspotItems[currentInteraction.id] || [];

  const hasAnyItems = hereItems.length > 0 || usableItems.length > 0 || dimmedItems.length > 0;

  // Overlay
  ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * interactionAnimation})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- Compute panel height from content ---
  const panelW = Math.min(500, canvas.width - 40);
  const CONTENT_END = 140; // px from panelY where the text section ends
  const CLOSE_H    = 22;
  const BTN_SIZE   = 38;
  const LABEL_H    = 16;
  const GAP_H      = 8;

  let stripH = 0;
  if (hasAnyItems) {
    stripH += 14; // separator
    if (hereItems.length > 0) stripH += LABEL_H + BTN_SIZE;
    if (hereItems.length > 0 && (usableItems.length > 0 || dimmedItems.length > 0)) stripH += GAP_H;
    if (usableItems.length > 0) stripH += LABEL_H + BTN_SIZE;
    if (usableItems.length > 0 && dimmedItems.length > 0) stripH += GAP_H;
    if (dimmedItems.length > 0) stripH += LABEL_H + BTN_SIZE;
    if (hereItems.length > 0 || dimmedItems.length > 0) stripH += LABEL_H; // hint line
  }
  const panelH = CONTENT_END + stripH + CLOSE_H;

  const panelX = canvas.width / 2 - panelW / 2;
  const panelY = Math.max(10, Math.min(canvas.height - panelH - 10, canvas.height / 2 - panelH / 2));
  const scale  = interactionAnimation;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);

  // Panel background
  ctx.fillStyle  = '#3E2723';
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth   = 3;
  roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fill(); ctx.stroke();

  // Inner border
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth   = 1;
  roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 12);
  ctx.stroke();

  // Object name
  ctx.fillStyle = '#FFD54F';
  ctx.font      = 'bold 24px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText(currentInteraction.name, canvas.width / 2, panelY + 45);

  // Interaction text (typewriter + word-wrap)
  const text = currentInteraction.interactionText;
  ctx.fillStyle = '#FFECB3';
  ctx.font      = '18px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  const visibleChars = Math.min(text.length, Math.floor(interactionTimer * 0.8));
  wrapText(text.substring(0, visibleChars), canvas.width / 2, panelY + 85, panelW - 40, 24);

  // --- Items strip (running-Y layout) ---
  interactionUseRects  = [];
  interactionDimmedRects = [];
  interactionHereRects = [];
  let curY = panelY + CONTENT_END;

  if (hasAnyItems) {
    // Separator
    ctx.strokeStyle = 'rgba(141, 110, 99, 0.6)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 20, curY);
    ctx.lineTo(panelX + panelW - 20, curY);
    ctx.stroke();
    curY += 14;

    // Row helper: draws a row of emoji buttons, returns array of rects
    function drawItemRow(items, dimmed) {
      const slice   = items.slice(0, 9);
      const totalW  = slice.length * (BTN_SIZE + 6) - 6;
      const startX  = panelX + panelW / 2 - totalW / 2;
      const rowRects = [];
      slice.forEach((item, i) => {
        const bx = startX + i * (BTN_SIZE + 6);
        ctx.globalAlpha = dimmed ? 0.38 : 1.0;
        ctx.fillStyle   = dimmed ? 'rgba(120,120,120,0.12)' : 'rgba(255,213,79,0.15)';
        ctx.strokeStyle = dimmed ? '#8D6E63' : '#FFD54F';
        ctx.lineWidth   = 1.5;
        if (dimmed) ctx.setLineDash([3, 3]);
        roundRect(bx, curY, BTN_SIZE, BTN_SIZE, 8);
        ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font      = `${Math.floor(BTN_SIZE * 0.58)}px serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(item.emoji || '?', bx + BTN_SIZE / 2, curY + BTN_SIZE * 0.73);
        ctx.globalAlpha = 1.0;
        rowRects.push({ x: bx, y: curY, w: BTN_SIZE, h: BTN_SIZE, item });
      });
      return rowRects;
    }

    // 🧺 Items at this hotspot row
    if (hereItems.length > 0) {
      ctx.fillStyle = '#FFD54F';
      ctx.font      = 'bold 12px "Comic Sans MS", cursive';
      ctx.textAlign = 'left';
      ctx.fillText(`🧺 Here (${isTouchDevice() ? 'tap' : 'click'} to pick up):`, panelX + 20, curY + 12);
      curY += LABEL_H;
      const rects = drawItemRow(hereItems, false);
      rects.forEach((r, index) => interactionHereRects.push({ ...r, index }));
      curY += BTN_SIZE;
      if (usableItems.length > 0 || dimmedItems.length > 0) curY += GAP_H;
    }

    // ✨ Usable items row
    if (usableItems.length > 0) {
      ctx.fillStyle = '#FFD54F';
      ctx.font      = 'bold 12px "Comic Sans MS", cursive';
      ctx.textAlign = 'left';
      ctx.fillText('✨ In your backpack:', panelX + 20, curY + 12);
      curY += LABEL_H;
      const rects = drawItemRow(usableItems, false);
      rects.forEach(r => interactionUseRects.push(r));
      curY += BTN_SIZE;
      if (dimmedItems.length > 0) curY += GAP_H;
    }

    // 🔍 Dimmed items row
    if (dimmedItems.length > 0) {
      ctx.fillStyle = 'rgba(255,236,179,0.6)';
      ctx.font      = 'bold 12px "Comic Sans MS", cursive';
      ctx.textAlign = 'left';
      ctx.fillText('🔍 Find to use here:', panelX + 20, curY + 12);
      curY += LABEL_H;
      const rects = drawItemRow(dimmedItems, true);
      rects.forEach(r => interactionDimmedRects.push({ ...r, location: r.item.location }));
      curY += BTN_SIZE;
    }

    // Hint line (pick-up feedback, or where to find a faded item)
    if (hereItems.length > 0 || dimmedItems.length > 0) {
      curY += 6;
      let hintMsg = interactionHintText;
      if (!hintMsg && dimmedItems.length > 0) {
        hintMsg = isTouchDevice() ? 'Tap a faded item to see where to find it'
                                  : 'Hover a faded item to see where to find it';
      }
      if (hintMsg) {
        ctx.fillStyle = interactionHintText ? '#FFD54F' : 'rgba(255,236,179,0.45)';
        ctx.font      = `${interactionHintText ? 'bold ' : ''}11px "Comic Sans MS", cursive`;
        ctx.textAlign = 'center';
        ctx.fillText(hintMsg, canvas.width / 2, curY + 10, panelW - 30);
      }
    }
  }

  // Close hint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font      = '13px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText(isTouchDevice() ? 'Tap outside to close' : 'Press Space or Esc to close',
    canvas.width / 2, panelY + panelH - 10);

  ctx.restore();
}

function drawActionAnimation(action, x, y, timer) {
  const t = timer * 0.1;
  ctx.font = '28px serif';
  ctx.textAlign = 'center';

  switch (action) {
    case 'sleep': {
      for (let i = 0; i < 3; i++) {
        const zx = x - 30 + i * 30;
        const zy = y - Math.sin(t + i) * 8;
        const size = 16 + i * 6;
        ctx.globalAlpha = 0.5 + Math.sin(t + i) * 0.3;
        ctx.font = `${size}px "Comic Sans MS", cursive`;
        ctx.fillStyle = '#90CAF9';
        ctx.fillText('z', zx, zy);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'fly': {
      const fx = Math.sin(t * 2) * 40;
      const fy = Math.cos(t * 3) * 10;
      ctx.fillText('✈️', x + fx, y + fy);
      // Trail
      for (let i = 1; i <= 3; i++) {
        ctx.globalAlpha = 0.3 / i;
        ctx.fillText('·', x + fx - i * 12, y + fy + i * 2);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'cook': {
      const flames = ['🔥', '🍳', '🔥'];
      flames.forEach((f, i) => {
        const fofs = Math.sin(t * 3 + i * 2) * 5;
        ctx.fillText(f, x - 30 + i * 30, y + fofs);
      });
      break;
    }
    case 'stargaze': {
      for (let i = 0; i < 5; i++) {
        const sx = x - 60 + i * 30;
        const sy = y + Math.sin(t * 2 + i) * 6;
        ctx.globalAlpha = 0.5 + Math.sin(t + i * 1.5) * 0.5;
        ctx.fillStyle = '#FFD54F';
        ctx.font = `${14 + Math.sin(t + i) * 4}px serif`;
        ctx.fillText('⭐', sx, sy);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'play': {
      const bx = x + Math.sin(t * 4) * 30;
      const by = y - Math.abs(Math.sin(t * 3)) * 20;
      ctx.fillText('⚾', bx, by);
      break;
    }
    case 'wash': {
      const drops = ['💧', '💧', '💧'];
      drops.forEach((d, i) => {
        const dy = Math.sin(t * 2 + i * 2) * 8;
        ctx.globalAlpha = 0.5 + Math.sin(t + i) * 0.5;
        ctx.fillText(d, x - 25 + i * 25, y + dy);
      });
      ctx.globalAlpha = 1;
      break;
    }
    case 'eat': {
      ctx.fillText('🍱', x, y + Math.sin(t) * 3);
      break;
    }
    case 'bathroom': {
      // flush! a spinning swirl with water drops orbiting it
      ctx.save();
      ctx.translate(x, y - 10);
      ctx.rotate(-t * 1.5);
      ctx.fillText('🌀', 0, 10);
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const a = t * 2 + i * (Math.PI * 2 / 3);
        ctx.globalAlpha = 0.6 + Math.sin(t + i) * 0.4;
        ctx.fillText('💧', x + Math.cos(a) * 38, y - 10 + Math.sin(a) * 14 + 10);
      }
      ctx.globalAlpha = 1;
      break;
    }
    default: {
      const bounce = Math.sin(t * 2) * 5;
      ctx.fillText('✨', x, y + bounce);
    }
  }
}

// Split `text` into lines no wider than maxWidth (in the current ctx.font)
