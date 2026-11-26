// --- Resume / Start Fresh prompt ---
function resumePromptButtonRects() {
  const panelW = Math.min(420, canvas.width - 40);
  const panelH = 170;
  const panelY = canvas.height / 2 - panelH / 2;
  const btnW = 130, btnH = 40, btnY = panelY + panelH - 56, btnGap = 18;
  const resumeX = canvas.width / 2 - btnW - btnGap / 2;
  const freshX = canvas.width / 2 + btnGap / 2;
  return [
    { id: 'resume', x: resumeX, y: btnY, w: btnW, h: btnH },
    { id: 'fresh',  x: freshX,  y: btnY, w: btnW, h: btnH }
  ];
}

function drawResumePrompt() {
  // Faded map background, like character select
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (mapImage) {
    ctx.globalAlpha = 0.15;
    const scale = Math.max(canvas.width / mapImage.naturalWidth, canvas.height / mapImage.naturalHeight);
    ctx.drawImage(mapImage, 0, 0, mapImage.naturalWidth * scale, mapImage.naturalHeight * scale);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelW = Math.min(420, canvas.width - 40);
  const panelH = 170;
  const panelX = canvas.width / 2 - panelW / 2;
  const panelY = canvas.height / 2 - panelH / 2;

  ctx.fillStyle = '#3E2723';
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 3;
  roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 1;
  roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 12);
  ctx.stroke();

  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 22px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('Welcome back, ' + (player.character ? player.character.name : '') + '!', canvas.width / 2, panelY + 50);

  ctx.fillStyle = '#FFECB3';
  ctx.font = '15px "Comic Sans MS", cursive';
  ctx.fillText('Resume your adventure or start fresh?', canvas.width / 2, panelY + 80);

  const btns = resumePromptButtonRects();
  const labels = { resume: 'Resume (R)', fresh: 'Start Fresh (F)' };
  const colors = { resume: '#4CAF50', fresh: '#F44336' };
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  for (const b of btns) {
    ctx.fillStyle = colors[b.id];
    roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(labels[b.id], b.x + b.w / 2, b.y + 26);
  }
}

// --- Backpack overlay ---
function backpackMetrics() {
  const slotSize = Math.max(36, Math.min(64, Math.floor((canvas.width - 40) / 11)));
  const gap = Math.max(4, Math.floor(slotSize * 0.15));
  const padding = 12;
  const backpackRowW = BACKPACK_CAPACITY * slotSize + (BACKPACK_CAPACITY - 1) * gap;
  const hotspotRowW = HOTSPOT_CAPACITY * slotSize + (HOTSPOT_CAPACITY - 1) * gap;
  const hasHotspotRow = !!nearbyObject;
  const rowSpacing = 14;
  const labelH = 22;
  const titleH = 24;
  const overlayBottomMargin = 12;

  const backpackRowY = canvas.height - overlayBottomMargin - slotSize;
  const hotspotRowY = hasHotspotRow
    ? backpackRowY - slotSize - rowSpacing - labelH
    : backpackRowY;
  const overlayTop = (hasHotspotRow ? hotspotRowY - labelH : backpackRowY) - titleH - padding;

  const backpackRowX = canvas.width / 2 - backpackRowW / 2;
  const hotspotRowX = canvas.width / 2 - hotspotRowW / 2;

  return { slotSize, gap, padding, backpackRowW, hotspotRowW, hasHotspotRow, rowSpacing, labelH, titleH, overlayBottomMargin, backpackRowY, hotspotRowY, overlayTop, backpackRowX, hotspotRowX };
}

function backpackOverlayTop() {
  return backpackMetrics().overlayTop;
}

function drawBackpackSlot(x, y, size, item, isSelected, isAvailable) {
  const r = Math.max(6, size * 0.16);
  // Solid dark base for both states so the emoji always has consistent contrast
  ctx.fillStyle = 'rgba(62, 39, 35, 0.92)';
  roundRect(x, y, size, size, r);
  ctx.fill();

  ctx.strokeStyle = isSelected ? '#FFD600' : (isAvailable ? '#8D6E63' : '#5D4037');
  ctx.lineWidth = isSelected ? 3 : 1.5;
  roundRect(x, y, size, size, r);
  ctx.stroke();

  if (item) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(size * 0.6)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji || '?', x + size / 2, y + size / 2 + 2);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawBackpack() {
  const m = backpackMetrics();
  backpackSlotRects = { backpack: [], hotspot: [] };

  // Panel background
  const panelX = 8;
  const panelY = m.overlayTop;
  const panelW = canvas.width - 16;
  const panelH = canvas.height - panelY - 4;
  ctx.fillStyle = 'rgba(20, 12, 6, 0.78)';
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 2;
  roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  ctx.textAlign = 'left';
  ctx.fillText(`🎒 Backpack (${backpack.length}/${BACKPACK_CAPACITY})`, panelX + 14, panelY + 18);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = '11px "Comic Sans MS", cursive';
  ctx.textAlign = 'right';
  const hint = nearbyObject
    ? '← → select  •  ↑ ↓ switch row  •  Enter act  •  B/Esc close'
    : '← → select  •  B/Esc close  •  (move to a spot to pick up)';
  ctx.fillText(hint, panelX + panelW - 14, panelY + 18);

  // Hotspot row (if applicable)
  if (m.hasHotspotRow) {
    const items = hotspotItems[nearbyObject.id] || [];
    ctx.fillStyle = '#FFECB3';
    ctx.font = 'bold 12px "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('At ' + nearbyObject.name, canvas.width / 2, m.hotspotRowY - 6);

    for (let i = 0; i < HOTSPOT_CAPACITY; i++) {
      const x = m.hotspotRowX + i * (m.slotSize + m.gap);
      const y = m.hotspotRowY;
      const isSelected = backpackOpen && backpackSelection.row === 'hotspot' && backpackSelection.col === i;
      drawBackpackSlot(x, y, m.slotSize, items[i] || null, isSelected, true);
      backpackSlotRects.hotspot.push({ x, y, w: m.slotSize, h: m.slotSize, col: i });
    }
  }

  // Backpack row
  for (let i = 0; i < BACKPACK_CAPACITY; i++) {
    const x = m.backpackRowX + i * (m.slotSize + m.gap);
    const y = m.backpackRowY;
    const isSelected = backpackOpen && backpackSelection.row === 'backpack' && backpackSelection.col === i;
    drawBackpackSlot(x, y, m.slotSize, backpack[i] || null, isSelected, true);
    backpackSlotRects.backpack.push({ x, y, w: m.slotSize, h: m.slotSize, col: i });
  }

  // Selected item name tooltip — below the slot for the hotspot row (the
  // "At <name>" header sits above and shouldn't be overlapped); above the
  // backpack row since it's anchored at the very bottom of the canvas.
  const item = selectedItem();
  if (item) {
    const isBackpackRow = backpackSelection.row === 'backpack';
    const rects = isBackpackRow ? backpackSlotRects.backpack : backpackSlotRects.hotspot;
    const r = rects[backpackSelection.col];
    if (r) {
      ctx.font = 'bold 13px "Comic Sans MS", cursive';
      ctx.textAlign = 'center';
      const label = item.name;
      const labelW = ctx.measureText(label).width + 14;
      const labelX = Math.max(8, Math.min(canvas.width - labelW - 8, r.x + r.w / 2 - labelW / 2));
      const labelY = isBackpackRow ? r.y - 22 : r.y + r.h + 4;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      roundRect(labelX, labelY, labelW, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#FFEB3B';
      ctx.fillText(label, labelX + labelW / 2, labelY + 14);
    }
  }
}

// --- Use toast (transient floating message) ---
function drawUseToast() {
  if (!useToast) return;
  useToast.age++;
  // Kitchen messages sit low (out of the way of the stations) and stay longer
  const life = useToast.low ? 170 : 90;
  if (useToast.age > life) { useToast = null; return; }
  const alpha = useToast.age < life - 30 ? 1 : 1 - (useToast.age - (life - 30)) / 30;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 18px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  const w = ctx.measureText(useToast.text).width + 28;
  const y = useToast.low ? canvas.height - 60 : canvas.height * 0.35;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  roundRect(canvas.width / 2 - w / 2, y - 24, w, 36, 10);
  ctx.fill();
  ctx.fillStyle = '#FFEB3B';
  ctx.fillText(useToast.text, canvas.width / 2, y);
  ctx.restore();
}

// --- Item action modal ---
function drawItemActionDialog() {
  drawGame();
  if (backpackOpen) drawBackpack();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const a = currentItemAction;
  const item = a && (a.source === 'backpack'
    ? backpack[a.index]
    : (hotspotItems[a.hotspotId] || [])[a.index]);
  if (!item) { closeItemAction(); return; }

  const panelW = Math.min(440, canvas.width - 40);
  const panelH = 200;
  const panelX = canvas.width / 2 - panelW / 2;
  const panelY = canvas.height / 2 - panelH / 2;

  ctx.fillStyle = '#3E2723';
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 3;
  roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 1;
  roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 12);
  ctx.stroke();

  // Emoji + name
  ctx.font = '36px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(item.emoji || '?', canvas.width / 2 - 80, panelY + 60);

  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 22px "Comic Sans MS", cursive';
  ctx.fillText(item.name, canvas.width / 2 + 30, panelY + 50);

  ctx.fillStyle = '#FFECB3';
  ctx.font = '13px "Comic Sans MS", cursive';
  const src = a.source === 'backpack' ? 'In your backpack' : 'At ' + (nearbyObject ? nearbyObject.name : 'this spot');
  ctx.fillText(src, canvas.width / 2 + 30, panelY + 75);

  // Buttons
  const btns = itemActionButtons();
  const btnW = Math.min(120, Math.floor((panelW - 60) / btns.length));
  const btnH = 40;
  const btnGap = 12;
  const totalW = btnW * btns.length + btnGap * (btns.length - 1);
  const startX = canvas.width / 2 - totalW / 2;
  const btnY = panelY + panelH - 60;
  itemActionButtonRects = [];

  const colorMap = { pickup: '#4CAF50', pickup_use: '#FF9800', drop: '#4CAF50', use: '#FF9800', cancel: '#757575' };

  ctx.font = 'bold 14px "Comic Sans MS", cursive';
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    const x = startX + i * (btnW + btnGap);
    const isFocused = i === backpackActionButton;
    const baseColor = colorMap[b.id] || '#5D4037';
    ctx.fillStyle = b.disabled ? '#555' : baseColor;
    roundRect(x, btnY, btnW, btnH, 8);
    ctx.fill();
    if (isFocused) {
      ctx.strokeStyle = '#FFD600';
      ctx.lineWidth = 3;
      roundRect(x, btnY, btnW, btnH, 8);
      ctx.stroke();
    }
    ctx.fillStyle = b.disabled ? '#999' : 'white';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, x + btnW / 2, btnY + 26);
    itemActionButtonRects.push({ x, y: btnY, w: btnW, h: btnH, id: b.id, disabled: b.disabled });
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px "Comic Sans MS", cursive';
  ctx.fillText(isTouchDevice() ? 'Tap a button' : '← → choose  •  Enter confirm  •  Esc cancel', canvas.width / 2, panelY + panelH - 12);
}

function drawConfirmDialog() {
  // Draw game in background
  drawGame();

  // Overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dialog panel
  const panelW = Math.min(400, canvas.width - 40);
  const panelH = 150;
  const panelX = canvas.width / 2 - panelW / 2;
  const panelY = canvas.height / 2 - panelH / 2;

  ctx.fillStyle = '#3E2723';
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 3;
  roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fill();
  ctx.stroke();

  // Inner border
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 1;
  roundRect(panelX + 6, panelY + 6, panelW - 12, panelH - 12, 12);
  ctx.stroke();

  // Question text
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 20px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('Switch camper?', canvas.width / 2, panelY + 42);

  ctx.fillStyle = '#FFECB3';
  ctx.font = '16px "Comic Sans MS", cursive';
  ctx.fillText('Go back to character selection?', canvas.width / 2, panelY + 72);

  // Buttons
  const btnW = 80;
  const btnH = 36;
  const btnY = panelY + panelH - 52;
  const btnGap = 20;

  // Yes button
  const yesBtnX = canvas.width / 2 - btnW - btnGap / 2;
  ctx.fillStyle = '#4CAF50';
  roundRect(yesBtnX, btnY, btnW, btnH, 8);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px "Comic Sans MS", cursive';
  ctx.fillText('Yes (Y)', yesBtnX + btnW / 2, btnY + 24);

  // No button
  const noBtnX = canvas.width / 2 + btnGap / 2;
  ctx.fillStyle = '#F44336';
  roundRect(noBtnX, btnY, btnW, btnH, 8);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.fillText('No (N)', noBtnX + btnW / 2, btnY + 24);
}

function resumePromptKey(e) {
  if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
    resumePendingSave();
  } else if (e.key === 'f' || e.key === 'F') {
    startFreshSave();
  } else if (e.key === 'Escape') {
    pendingResumeSave = null;
    player.character = null;
    state = GameState.CHARACTER_SELECT;
  }
}
function resumePromptTap(screenX, screenY) {
  const btns = resumePromptButtonRects();
  for (const b of btns) {
    if (screenX >= b.x && screenX <= b.x + b.w && screenY >= b.y && screenY <= b.y + b.h) {
      if (b.id === 'resume') resumePendingSave();
      else if (b.id === 'fresh') startFreshSave();
      return;
    }
  }
}
registerGameState('RESUME_PROMPT', {
  draw: () => drawResumePrompt(),
  onKey: e => resumePromptKey(e),
  onTap: (x, y) => resumePromptTap(x, y)
});

function confirmDialogKey(e) {
  if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') {
    goToCharacterSelect();
  } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
    state = GameState.PLAYING;
  }
}
function confirmDialogTap(screenX, screenY) {
  const panelW = Math.min(400, canvas.width - 40);
  const panelH = 150;
  const panelY = canvas.height / 2 - panelH / 2;
  const btnW = 80, btnH = 36, btnY = panelY + panelH - 52, btnGap = 20;
  const yesBtnX = canvas.width / 2 - btnW - btnGap / 2;
  const noBtnX = canvas.width / 2 + btnGap / 2;
  if (screenX >= yesBtnX && screenX <= yesBtnX + btnW && screenY >= btnY && screenY <= btnY + btnH) {
    goToCharacterSelect();
  } else if (screenX >= noBtnX && screenX <= noBtnX + btnW && screenY >= btnY && screenY <= btnY + btnH) {
    state = GameState.PLAYING;
  }
}
registerGameState('CONFIRM_DIALOG', {
  draw: () => drawConfirmDialog(),
  onKey: e => confirmDialogKey(e),
  onTap: (x, y) => confirmDialogTap(x, y),
  inWorld: true
});

let useToast = null;                                // { text, age }
