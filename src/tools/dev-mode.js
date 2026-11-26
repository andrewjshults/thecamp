// --- Developer Mode functions ---

function enterDevMode() {
  devMode = true;
  devSelectedHotspot = null;
  devDrag = null;
  recalcInteractiveObjects();
}

function exitDevMode() {
  devMode = false;
  devDrag = null;
  canvas.style.cursor = 'default';
  copyHotspotsToClipboard();
  recalcInteractiveObjects();
}

function copyHotspotsToClipboard() {
  // Build full map JSON — preserves all fields (items, uses, etc.)
  // and rounds fractional bounds to 4 decimal places.
  const fullConfig = {
    ...mapConfig,   // keeps npcs and any other top-level fields
    hotspots: mapConfig.hotspots.map(h => {
      const out = { ...h };
      out.px = parseFloat(h.px.toFixed(4));
      out.py = parseFloat(h.py.toFixed(4));
      out.pw = parseFloat(h.pw.toFixed(4));
      out.ph = parseFloat(h.ph.toFixed(4));
      return out;
    })
  };
  const json = JSON.stringify(fullConfig, null, 2);
  navigator.clipboard.writeText(json).catch(() => console.log(json));
}

// Returns the four corner handles for an interactiveObject in screen space
function devHandles(obj) {
  const sx = obj.x - camera.x;
  const sy = obj.y - camera.y;
  const sw = obj.width;
  const sh = obj.height;
  return [
    { corner: 'TL', x: sx,      y: sy      },
    { corner: 'TR', x: sx + sw, y: sy      },
    { corner: 'BL', x: sx,      y: sy + sh },
    { corner: 'BR', x: sx + sw, y: sy + sh }
  ];
}

function handleDevPointerDown(sx, sy) {
  // Hit-test corner handles first (highest priority)
  for (let i = 0; i < interactiveObjects.length; i++) {
    for (const h of devHandles(interactiveObjects[i])) {
      if (Math.hypot(sx - h.x, sy - h.y) <= DEV_HANDLE_R + 6) {
        devSelectedHotspot = i;
        devDrag = { index: i, corner: h.corner };
        return;
      }
    }
  }
  // Hit-test hotspot interiors for selection
  const mx = sx + camera.x;
  const my = sy + camera.y;
  for (let i = 0; i < interactiveObjects.length; i++) {
    const obj = interactiveObjects[i];
    if (mx >= obj.x && mx <= obj.x + obj.width &&
        my >= obj.y && my <= obj.y + obj.height) {
      devSelectedHotspot = i;
      return;
    }
  }
  devSelectedHotspot = null;
}

function handleDevPointerMove(sx, sy) {
  if (!devDrag) return;
  const mx = sx + camera.x;
  const my = sy + camera.y;
  const obj = interactiveObjects[devDrag.index];
  const def = mapConfig.hotspots[devDrag.index];

  let left   = obj.x;
  let top    = obj.y;
  let right  = obj.x + obj.width;
  let bottom = obj.y + obj.height;

  switch (devDrag.corner) {
    case 'TL': left  = mx; top    = my; break;
    case 'TR': right = mx; top    = my; break;
    case 'BL': left  = mx; bottom = my; break;
    case 'BR': right = mx; bottom = my; break;
  }

  // Enforce minimum 20px size and keep inside map
  if (right  - left < 20) { if (devDrag.corner.endsWith('L')) left  = right  - 20; else right  = left  + 20; }
  if (bottom - top  < 20) { if (devDrag.corner.startsWith('T')) top  = bottom - 20; else bottom = top + 20; }
  left   = Math.max(0, Math.min(left,   scaledMapW - 20));
  top    = Math.max(0, Math.min(top,    scaledMapH - 20));
  right  = Math.max(20, Math.min(right,  scaledMapW));
  bottom = Math.max(20, Math.min(bottom, scaledMapH));

  // Write back to both the runtime object and the source-of-truth def
  obj.x = left;
  obj.y = top;
  obj.width  = right  - left;
  obj.height = bottom - top;
  def.px = left   / scaledMapW;
  def.py = top    / scaledMapH;
  def.pw = obj.width  / scaledMapW;
  def.ph = obj.height / scaledMapH;
}

// Change cursor based on what's under the pointer
function updateDevCursor(sx, sy) {
  const cursorMap = { TL: 'nwse-resize', TR: 'nesw-resize', BL: 'nesw-resize', BR: 'nwse-resize' };
  for (const obj of interactiveObjects) {
    for (const h of devHandles(obj)) {
      if (Math.hypot(sx - h.x, sy - h.y) <= DEV_HANDLE_R + 6) {
        canvas.style.cursor = cursorMap[h.corner];
        return;
      }
    }
    const mx = sx + camera.x, my = sy + camera.y;
    if (mx >= obj.x && mx <= obj.x + obj.width && my >= obj.y && my <= obj.y + obj.height) {
      canvas.style.cursor = 'pointer';
      return;
    }
  }
  canvas.style.cursor = 'default';
}

function drawDevModeOverlay() {
  // Badge — top right
  const badge = '🔧 DEV MODE';
  ctx.font = 'bold 14px monospace';
  const bw = ctx.measureText(badge).width + 24;
  const bh = 30;
  const bx = canvas.width - bw - 10;
  const by = 10;
  ctx.fillStyle = 'rgba(180, 0, 0, 0.85)';
  roundRect(bx, by, bw, bh, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(badge, bx + 12, by + 20);

  // All hotspot bounds + handles (drawn in map space, then offset by camera)
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  for (let i = 0; i < interactiveObjects.length; i++) {
    const obj = interactiveObjects[i];
    const isSelected = i === devSelectedHotspot;

    // Filled tint
    ctx.fillStyle = isSelected ? 'rgba(255, 235, 59, 0.18)' : 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

    // Outline
    ctx.strokeStyle = isSelected ? '#FFD600' : 'rgba(255, 200, 0, 0.65)';
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.setLineDash(isSelected ? [] : [6, 4]);
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    ctx.setLineDash([]);

    // Name label
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(obj.x + 1, obj.y + 1, ctx.measureText(obj.id).width + 10, 16);
    ctx.fillStyle = isSelected ? '#FFD600' : '#ffe';
    ctx.fillText(obj.id, obj.x + 5, obj.y + 13);

    // Corner handles
    const corners = devHandles(obj);  // these are already in screen space via camera offset above — recalc in map space
    const mapCorners = [
      { corner: 'TL', x: obj.x,            y: obj.y             },
      { corner: 'TR', x: obj.x + obj.width, y: obj.y             },
      { corner: 'BL', x: obj.x,            y: obj.y + obj.height },
      { corner: 'BR', x: obj.x + obj.width, y: obj.y + obj.height }
    ];
    for (const h of mapCorners) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, DEV_HANDLE_R, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#FFD600' : '#fff';
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();

  // Footer hint
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const hint = 'Drag corners to resize  •  Cmd+D to save & exit';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  const hw = ctx.measureText(hint).width + 20;
  roundRect(canvas.width / 2 - hw / 2, canvas.height - 34, hw, 24, 5);
  ctx.fill();
  ctx.fillStyle = '#FFD600';
  ctx.fillText(hint, canvas.width / 2, canvas.height - 17);
}

// --- Dev mode state ---
let devMode = false;
let devSelectedHotspot = null;  // index into interactiveObjects
let devDrag = null;             // { index, corner:'TL'|'TR'|'BL'|'BR' }
const DEV_HANDLE_R = 14;        // corner handle radius in screen px
