// --- The recipe chalkboard's writing ---
// The board itself is part of the scene picture; the writing is drawn on top
// every frame so your own recipes can be added. A column with `"custom": true`
// gets your recipes under its hand-written lines. The board has a fixed number
// of rows (`rows`, default: what the hand-written columns need); when a column
// runs out, the oldest lines at the top are rubbed off and its last row becomes
// "see all", with a hotspot that opens every recipe in a pop-up.
const CHALK = '#f4f1e8';

function chalkboardLayout(o, b) {
  const pad = b.w * 0.04;
  const cols = o.columns || [];
  const top = b.y + b.h * (o.title ? 0.22 : 0.08);
  const rows = o.rows || Math.max(...cols.map(c => c.lines.length + (c.title ? 1 : 0)), 1);
  const lineH = (b.y + b.h - pad - top) / rows;
  return { pad, cols, top, rows, lineH };
}

function chalkRecipeLine(r) {
  return `${r.needs.map(id => kitchenFood(id).emoji).join('+')} = ${r.name}`;
}

// What fits on the board right now. Box `b` and everything returned are in scene units.
function chalkboardView(o, b) {
  const L = chalkboardLayout(o, b);
  const cols = L.cols.map(c => {
    let lines = c.lines.map(text => ({ text }));
    if (c.custom && mapConfig && mapConfig.kitchen) {
      for (const r of customRecipesHere()) lines.push({ text: chalkRecipeLine(r) });
      const d = draftHere();
      if (d) lines.push({ text: `✏️ ${chalkRecipeLine(d)}`, draft: true });
    }
    const room = L.rows - (c.title ? 1 : 0);
    let more = 0;
    if (lines.length > room) {
      more = lines.length - (room - 1);
      lines = lines.slice(more);
    }
    return { title: c.title, lines, more, total: lines.length + more };
  });
  return { ...L, cols };
}

function sceneChalkboards() {
  const scene = mapConfig && mapConfig.scene;
  if (!scene) return [];
  const W = scene.width || 2400, H = scene.height || 1700;
  return (scene.props || []).filter(o => o.kind === 'chalkboard').map(o => ({
    o, W, H, b: { x: o.px * W, y: o.py * H, w: o.pw * W, h: o.ph * H }
  }));
}

function drawChalkboards() {
  const boards = sceneChalkboards();
  if (!boards.length) return;
  const now = performance.now();
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const { o, W, b } of boards) {
    const k = scaledMapW / W;
    const V = chalkboardView(o, b);
    const colW = b.w / V.cols.length;
    const write = (text, cx, cy, size, color) => {
      ctx.font = `bold ${size * k}px ${SCENE_FONT}`;
      const maxW = colW * 0.92 * k;
      const w = ctx.measureText(text).width;
      if (w > maxW) ctx.font = `bold ${size * k * maxW / w}px ${SCENE_FONT}`;
      ctx.fillStyle = color;
      ctx.fillText(text, cx * k, cy * k);
    };
    V.cols.forEach((c, ci) => {
      const cx = b.x + colW * (ci + 0.5);
      let ly = V.top + V.lineH / 2;
      if (c.title) { write(c.title, cx, ly, V.lineH * 0.6, '#90caf9'); ly += V.lineH; }
      for (const line of c.lines) {
        // Recipes still being made up wiggle a little, in yellow chalk
        const wob = line.draft ? Math.sin(now / 250) * V.lineH * 0.04 : 0;
        write(line.text, cx, ly + wob, V.lineH * 0.78, line.draft ? '#fff59d' : CHALK);
        ly += V.lineH;
      }
      if (c.more) write(`▼ see all ${c.total} ▼`, cx, ly, V.lineH * 0.62, '#ffe082');
    });
  }
  ctx.restore();
}

// "See all recipes" hotspots for full columns (fractions of the map, like JSON hotspots)
function chalkboardHotspots() {
  const out = [];
  for (const { o, W, H, b } of sceneChalkboards()) {
    const V = chalkboardView(o, b);
    const colW = b.w / V.cols.length;
    V.cols.forEach((c, ci) => {
      if (!c.more) return;
      const rowTop = V.top + V.lineH * (V.rows - 1);
      out.push({
        id: `see_all_recipes_${ci}`, name: 'See All Recipes',
        px: (b.x + colW * ci) / W, py: rowTop / H,
        pw: colW / W, ph: (b.y + b.h + 24 * (W / 2400) - rowTop) / H,
        action: 'explore', description: 'Every recipe, even the ones rubbed off the board',
        items: [], uses: [], seeAllRecipes: true
      });
    });
  }
  return out;
}

// Short action text shown under the station's name ("[ SPACE ] Boil 🍅")
function stationHint(obj) {
  const st = obj.station, S = stationState(obj), held = heldItem;
  const e = id => kitchenFood(id).emoji;
  switch (st.type) {
    case 'source':
      if (!held) return `Take ${e(st.item)}`;
      return held.id === st.item ? `Put back ${held.emoji}` : 'Hands full';
    case 'cook':
      if (S.cookEnd) return `${st.doing || 'Cooking'}...`;
      if (S.item) return held ? 'Hands full' : `Take ${e(S.item)}`;
      if (!held) return `${st.verb || 'Cook'} ${Object.keys(st.makes).map(e).join(' ')}`;
      return st.makes[held.id] ? `${st.verb || 'Cook'} ${held.emoji}` : `Can't ${(st.verb || 'cook').toLowerCase()} ${held.emoji}`;
    case 'plate':
      if (held) {
        if (held.dessert) return `${held.emoji} doesn't need a plate`;
        if (S.draft) return held.custom ? `${held.emoji} doesn't fit` : `Add ${held.emoji} to ${draftRecipe.name}`;
        if (held.draft) return S.plate.length ? 'Plate is full' : `Put back ${held.emoji}`;
        if (plateAccepts(S.plate, held.id)) return `Add ${held.emoji}`;
        return held.custom || draftRecipe ? `${held.emoji} doesn't fit` : `✨ Freestyle with ${held.emoji}`;
      }
      if (S.draft) return `Take ${CUSTOM_DISH_EMOJI} ${draftRecipe.name}`;
      return S.plate.length ? `Take ${e(S.plate[S.plate.length - 1])}` : 'Make a recipe';
    case 'serve': {
      const f = held && kitchenFood(held.id);
      return f && (f.dish || f.dessert) ? `Eat ${held.emoji}` : 'Eat food here';
    }
    case 'trash':
      return held ? `Throw away ${held.emoji}` : 'Compost';
    case 'shop': {
      const f = kitchenFood(st.item);
      if (held) return held.id === st.item && held.paid ? `Put back ${held.emoji} (get $${f.price || 10} back)` : 'Hands full';
      return `Buy ${f.emoji} for $${f.price || 10} (+${f.strength || 1} 💪)`;
    }
  }
  return '';
}

function drawFoodEmoji(emoji, x, y, size, alpha) {
  ctx.save();
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.font = `${Math.round(size)}px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';                   // opaque, or Chrome fades colour emoji
  ctx.fillText(emoji, x, y);
  ctx.restore();
}

// Food sitting on stations: cooking (with a timer ring + steam), done (bouncing
// with a sparkle), stacked on the plate, or being eaten at the table.
function drawStations() {
  if (!mapConfig || !mapConfig.kitchen) return;
  const now = performance.now();
  tickStations(now);
  for (const obj of interactiveObjects) {
    const st = obj.station;
    if (!st) continue;
    const S = stationState(obj);
    const x = obj.x + obj.width * (st.slot ? st.slot.px : 0.5);
    const y = obj.y + obj.height * (st.slot ? st.slot.py : 0.5);
    const size = (st.slotSize || 0.06) * scaledMapH;

    if (st.type === 'cook' && S.cookEnd) {
      const p = clamp((now - S.cookStart) / (S.cookEnd - S.cookStart), 0, 1);
      const jiggle = Math.sin(now / 70) * size * 0.04;
      drawFoodEmoji(kitchenFood(S.cooking).emoji, x + jiggle, y, size);
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#FFD54F';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.75, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      ctx.stroke();
      if (st.fx) {
        for (let i = 0; i < 3; i++) {
          const ph = (now / 900 + i / 3) % 1;
          drawFoodEmoji(st.fx, x + (i - 1) * size * 0.45, y - size * (0.7 + ph * 0.9), size * 0.45, 1 - ph);
        }
      }
    } else if (st.type === 'cook' && S.item) {
      const since = now - (S.doneAt || 0);
      const hop = since < 1200 ? Math.abs(Math.sin(since / 120)) * size * 0.25 : 0;
      drawFoodEmoji(kitchenFood(S.item).emoji, x, y - hop, size);
      drawFoodEmoji('✨', x + size * 0.55, y - size * 0.5, size * 0.4, 0.5 + 0.5 * Math.sin(now / 200));
      if (since < 1500) {
        ctx.save();
        ctx.globalAlpha = 1 - since / 1500;
        ctx.font = 'bold 24px "Comic Sans MS", cursive';
        ctx.textAlign = 'center';
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#221c1a';
        ctx.fillStyle = '#FFF59D';
        ctx.strokeText('DING!', x, y - size - since / 30);
        ctx.fillText('DING!', x, y - size - since / 30);
        ctx.restore();
      }
    } else if (st.type === 'plate' && S.plate.length) {
      const n = S.plate.length;
      S.plate.forEach((id, i) => {
        drawFoodEmoji(kitchenFood(id).emoji, x + (i - (n - 1) / 2) * size * 0.6, y - i * size * 0.12, size);
      });
      if (S.madeAt && now - S.madeAt < 1500) {
        for (let i = 0; i < 5; i++) {
          const a = i * 1.26 + (now - S.madeAt) / 300;
          const r = size * (0.6 + (now - S.madeAt) / 1500);
          drawFoodEmoji('✨', x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, size * 0.35, 1 - (now - S.madeAt) / 1500);
        }
      }
    } else if (st.type === 'serve' && S.eating) {
      const t = (now - S.eating.start) / 1600;
      if (t >= 1) { S.eating = null; continue; }
      drawFoodEmoji(S.eating.emoji, x, y, size * (1 - t * 0.9), 1 - t * 0.5);
      drawFoodEmoji('😋', x + size * 0.6, y - size * (0.6 + t * 0.8), size * 0.5, 1 - t);
    }
  }
}

// Top-of-screen badge: which dishes you've made, and what's in your hands
function drawKitchenHud() {
  if (!mapConfig || !mapConfig.kitchen) return;
  const dishes = kitchenDishes();
  const made = dishes.filter(id => dishesMade.includes(id)).length;
  ctx.save();
  ctx.font = 'bold 14px "Comic Sans MS", cursive';
  const mine = customRecipesHere().length;
  const label = `Recipes made ${made}/${dishes.length}${mine ? `  •  ⭐ ${mine} of your own` : ''}`;
  const iconW = 30;
  const w = ctx.measureText(label).width + dishes.length * iconW + 34;
  const x = canvas.width / 2 - w / 2, y = 10;
  ctx.fillStyle = 'rgba(40, 24, 8, 0.8)';
  roundRect(x, y, w, 36, 12);
  ctx.fill();
  ctx.fillStyle = '#FFD54F';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 14, y + 18);
  ctx.restore();
  dishes.forEach((id, i) => {
    drawFoodEmoji(kitchenFood(id).emoji, x + w - 20 - (dishes.length - 1 - i) * iconW - 2, y + 18, 22,
      dishesMade.includes(id) ? 1 : 0.25);
  });
  const pill = (t, py, color) => {
    ctx.save();
    ctx.font = 'bold 13px "Comic Sans MS", cursive';
    const tw = ctx.measureText(t).width + 24;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(canvas.width / 2 - tw / 2, py, tw, 24, 8);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, canvas.width / 2, py + 12);
    ctx.restore();
  };
  let py = y + 42;
  // Your coins and dessert strength, once the kitchen sells desserts
  if (Object.values(mapConfig.kitchen.foods).some(f => f.dessert)) {
    pill(`🪙 $${walletTotal()}   •   💪 Strength: ${STRENGTH_BASE + strengthBoost}`, py, '#FFE0B2');
    py += 30;
  }
  if (heldItem) pill(`In your hands: ${heldItem.emoji} ${heldItem.name}`, py, '#FFF9C4');
}
