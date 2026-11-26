// --- Adventure Journal ---
function drawJournal() {
  const total = totalUsesCount();
  const done = completedUses.length;
  const isMobile = canvas.width < 600;
  const PANEL_W = isMobile ? canvas.width : 280;
  const BTN_W = 72;
  const BTN_H = 38;
  const BTN_X = canvas.width - BTN_W - 8;
  const BTN_Y = 10;

  // Journal toggle button (always visible)
  journalBtnRect = { x: BTN_X, y: BTN_Y, w: BTN_W, h: BTN_H };
  ctx.fillStyle = journalOpen ? '#5D4037' : 'rgba(0,0,0,0.55)';
  roundRect(BTN_X, BTN_Y, BTN_W, BTN_H, 8);
  ctx.fill();
  ctx.strokeStyle = journalOpen ? '#FFD54F' : '#8D6E63';
  ctx.lineWidth = 2;
  roundRect(BTN_X, BTN_Y, BTN_W, BTN_H, 8);
  ctx.stroke();
  ctx.fillStyle = '#FFECB3';
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('📖', BTN_X + BTN_W / 2, BTN_Y + 14);
  ctx.fillStyle = done === total && total > 0 ? '#FFD54F' : '#FFECB3';
  ctx.font = '11px "Comic Sans MS", cursive';
  ctx.fillText(`${done}/${total}`, BTN_X + BTN_W / 2, BTN_Y + 29);

  if (!journalOpen) return;

  // Smooth scroll
  journalScrollTarget = Math.max(0, journalScrollTarget);
  journalScroll += (journalScrollTarget - journalScroll) * 0.18;

  const PANEL_H = isMobile ? canvas.height : canvas.height;
  const PANEL_X = isMobile ? 0 : canvas.width - PANEL_W;
  const PANEL_Y = 0;

  journalPanelRect = { x: PANEL_X, y: PANEL_Y, w: PANEL_W, h: PANEL_H };

  // Semi-transparent overlay on mobile
  if (isMobile) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Panel background
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
  ctx.strokeStyle = '#8D6E63';
  ctx.lineWidth = 2;
  ctx.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

  // Clip to panel
  ctx.save();
  ctx.beginPath();
  ctx.rect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
  ctx.clip();

  const HEADER_H = 110;
  const PAD = 14;

  // Header background
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(PANEL_X, PANEL_Y, PANEL_W, HEADER_H);
  ctx.strokeStyle = '#5D4037';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PANEL_X, PANEL_Y + HEADER_H);
  ctx.lineTo(PANEL_X + PANEL_W, PANEL_Y + HEADER_H);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 18px "Comic Sans MS", cursive';
  ctx.textAlign = 'left';
  ctx.fillText('📖 Adventure Journal', PANEL_X + PAD, PANEL_Y + 30);

  // Close button
  const closeBtnX = PANEL_X + PANEL_W - 36;
  const closeBtnY = PANEL_Y + 8;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(closeBtnX, closeBtnY, 30, 30, 6);
  ctx.fill();
  ctx.fillStyle = '#FFECB3';
  ctx.font = 'bold 16px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.fillText('×', closeBtnX + 15, closeBtnY + 21);

  // Progress bar
  const BAR_X = PANEL_X + PAD;
  const BAR_Y = PANEL_Y + 44;
  const BAR_W = PANEL_W - PAD * 2;
  const BAR_H = 14;
  ctx.fillStyle = '#4E342E';
  roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, 7);
  ctx.fill();
  const fillW = total > 0 ? (done / total) * BAR_W : 0;
  if (fillW > 0) {
    ctx.fillStyle = done === total ? '#FFD54F' : '#FF8F00';
    roundRect(BAR_X, BAR_Y, fillW, BAR_H, 7);
    ctx.fill();
  }

  // Progress text
  ctx.fillStyle = '#FFECB3';
  ctx.font = '13px "Comic Sans MS", cursive';
  ctx.textAlign = 'left';
  const progressText = done === total && total > 0
    ? `🎉 All ${total} adventures complete!`
    : `${done} of ${total} adventures complete`;
  ctx.fillText(progressText, BAR_X, BAR_Y + BAR_H + 16);

  // Keyboard hint (desktop only)
  if (!isMobile) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px "Comic Sans MS", cursive';
    ctx.textAlign = 'right';
    ctx.fillText('J to close', PANEL_X + PANEL_W - PAD, BAR_Y + BAR_H + 16);
  }

  // Completed entries list
  const ITEM_H = 68;
  const listTop = PANEL_Y + HEADER_H + 6;
  const scrollY = Math.round(journalScroll);

  ctx.save();
  ctx.beginPath();
  ctx.rect(PANEL_X, listTop, PANEL_W, PANEL_H - HEADER_H);
  ctx.clip();

  // Calculate max scroll
  const totalHeight = done * ITEM_H + 8;
  const maxScroll = Math.max(0, totalHeight - (PANEL_H - HEADER_H));
  journalScrollTarget = Math.min(journalScrollTarget, maxScroll);
  journalScroll = Math.min(journalScroll, maxScroll);

  if (done === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '13px "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('No adventures yet!', PANEL_X + PANEL_W / 2, listTop + 40);
    ctx.fillText('Pick up items and use them', PANEL_X + PANEL_W / 2, listTop + 60);
    ctx.fillText('at other spots to fill your journal.', PANEL_X + PANEL_W / 2, listTop + 80);
  }

  for (let i = 0; i < done; i++) {
    const entry = completedUses[done - 1 - i]; // newest first
    const ey = listTop + 8 + i * ITEM_H - scrollY;
    if (ey + ITEM_H < listTop || ey > PANEL_Y + PANEL_H) continue;

    // Card background
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.1)';
    ctx.fillRect(PANEL_X + 4, ey, PANEL_W - 8, ITEM_H - 4);

    // Emoji
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(entry.itemEmoji, PANEL_X + 30, ey + 36);

    // Item name + hotspot
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 13px "Comic Sans MS", cursive';
    ctx.textAlign = 'left';
    ctx.fillText(entry.itemName, PANEL_X + 52, ey + 18);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px "Comic Sans MS", cursive';
    ctx.fillText('at ' + entry.hotspotName, PANEL_X + 52, ey + 33);

    // Use text (truncated to 2 lines)
    ctx.fillStyle = '#FFECB3';
    ctx.font = '11px "Comic Sans MS", cursive';
    wrapTextMaxLines(entry.text, PANEL_X + 52, ey + 49, PANEL_W - 64, 14, 2);

    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PANEL_X + 8, ey + ITEM_H - 4);
    ctx.lineTo(PANEL_X + PANEL_W - 8, ey + ITEM_H - 4);
    ctx.stroke();
  }

  ctx.restore(); // restore list clip
  ctx.restore(); // restore panel clip
}

function wrapTextMaxLines(text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  let lineCount = 0;
  for (const word of words) {
    const testLine = line + word + ' ';
    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (lineCount >= maxLines - 1) {
        // Truncate last line with ellipsis
        let truncated = line.trim();
        while (ctx.measureText(truncated + '…').width > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + '…', x, lineY);
        return;
      }
      ctx.fillText(line.trim(), x, lineY);
      line = word + ' ';
      lineY += lineHeight;
      lineCount++;
    } else {
      line = testLine;
    }
  }
  if (lineCount < maxLines) ctx.fillText(line.trim(), x, lineY);
}
