// --- Speech bubbles ---
const BUBBLE_FONT   = 'bold 18px "Comic Sans MS", "Chalkboard SE", cursive';
const BUBBLE_LINE_H = 24;
const BUBBLE_PAD_X  = 16;
const BUBBLE_PAD_Y  = 12;
const BUBBLE_MAX_W  = 260;
const BUBBLE_POP_MS = 320;
const WORD_POP_MS   = 170;

// Lay out the words up front (so the bubble has its final size), and give each
// word a time to pop in — roughly at speaking pace.
function makeBubble(owner, text, partner) {
  ctx.save();
  ctx.font = BUBBLE_FONT;
  const spaceW = ctx.measureText(' ').width;
  const lines = [];
  let line = [];
  let lineW = 0;
  let t = BUBBLE_POP_MS * 0.6;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = ctx.measureText(word).width;
    if (line.length && lineW + spaceW + w > BUBBLE_MAX_W) {
      lines.push({ words: line, width: lineW });
      line = [];
      lineW = 0;
    }
    const x = line.length ? lineW + spaceW : 0;
    line.push({ text: word, x, w, appearAt: t });
    lineW = x + w;
    t += 110 + word.length * 22;
  }
  if (line.length) lines.push({ words: line, width: lineW });
  ctx.restore();
  const contentW = Math.max(40, ...lines.map(l => l.width));
  return {
    owner, partner, lines, contentW,
    width: contentW + BUBBLE_PAD_X * 2,
    height: Math.max(1, lines.length) * BUBBLE_LINE_H + BUBBLE_PAD_Y * 2,
    start: performance.now(),
    duration: t,               // when the last word has started popping in
    dimmed: false,
    fadeStart: null
  };
}

function say(owner, text, partner) {
  // A speaker only has one bubble at a time; older lines from others go faint
  speechBubbles = speechBubbles.filter(b => b.owner !== owner);
  for (const b of speechBubbles) b.dimmed = true;
  speechBubbles.push(makeBubble(owner, text, partner));
}

// 0 = smiling, 0–1 = mouth open amount while their words are still appearing
function mouthOpenFor(owner) {
  const b = speechBubbles.find(b => b.owner === owner);
  if (!b) return 0;
  const age = performance.now() - b.start;
  if (age > b.duration + WORD_POP_MS) return 0;
  return 0.25 + 0.75 * Math.abs(Math.sin(age / 85));
}

function easeOutBack(p) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function speakerColor(owner) {
  if (owner === 'player') return player.character ? player.character.color : '#333';
  if (owner.color) return owner.color;
  const ch = characterByName(owner.character);
  return ch ? ch.color : '#333';
}

// A '#rrggbb' colour mixed `amt` (0–1) of the way to white, so a character's
// colour stays recognisable but reads on dark/green panels.
function lightenColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const mix = c => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

// Where a bubble rests: above the speaker's head, nudged away from whoever
// they're talking to so the two bubbles don't overlap.
function bubbleLayout(owner, partner, w, h) {
  const head = speakerHead(owner);
  const sx = head.x - camera.x;
  const topY = head.top - camera.y;
  let dir = owner === 'player' ? -1 : 1;
  if (partner) {
    const a = speakerFeet(owner).x, b = speakerFeet(partner).x;
    if (a !== b) dir = a > b ? 1 : -1;
  }
  const x = clamp(sx + dir * (w / 2 - 40) - w / 2, 8, canvas.width - w - 8);
  const y = Math.max(8, topY - 30 - h);
  return {
    x, y,
    tipX: sx,
    tipY: topY - 6,
    mouthX: sx,
    mouthY: head.mouthY - camera.y
  };
}

function bubblePath(x, y, w, h, r, tipX, tipY) {
  const tw = 11;
  const baseX = clamp(tipX, x + r + tw, x + w - r - tw);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(baseX + tw, y + h);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(baseX - tw, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawBubble(b, now) {
  const age = now - b.start;
  const L = bubbleLayout(b.owner, b.partner, b.width, b.height);

  let alpha = b.dimmed ? 0.55 : 1;
  if (b.fadeStart && now > b.fadeStart) alpha *= Math.max(0, 1 - (now - b.fadeStart) / 600);
  if (alpha <= 0) return;

  // Pop out of the mouth: start tiny at the mouth, spring up to the resting spot
  const p = clamp(age / BUBBLE_POP_MS, 0, 1);
  const scale = Math.max(0.01, easeOutBack(p));
  const rise = 1 - (1 - Math.pow(1 - p, 3));      // 1 → 0
  const ox = (L.mouthX - L.tipX) * rise;
  const oy = (L.mouthY - L.tipY) * rise;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(L.tipX + ox, L.tipY + oy);
  ctx.scale(scale, scale);
  ctx.translate(-L.tipX, -L.tipY);

  bubblePath(L.x, L.y, b.width, b.height, 16, L.tipX, L.tipY);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = speakerColor(b.owner);
  ctx.stroke();

  // Words pop in one at a time
  ctx.font = BUBBLE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#333';
  b.lines.forEach((line, i) => {
    const lineX = L.x + BUBBLE_PAD_X + (b.contentW - line.width) / 2;
    const lineY = L.y + BUBBLE_PAD_Y + i * BUBBLE_LINE_H + BUBBLE_LINE_H / 2;
    for (const word of line.words) {
      const wAge = age - word.appearAt;
      if (wAge < 0) break;
      const wp = clamp(wAge / WORD_POP_MS, 0, 1);
      const ws = 0.3 + 0.7 * easeOutBack(wp);
      const cx = lineX + word.x + word.w / 2;
      const cy = lineY + (1 - wp) * 8;
      ctx.save();
      ctx.globalAlpha = alpha * wp;
      ctx.translate(cx, cy);
      ctx.scale(ws, ws);
      ctx.fillText(word.text, 0, 0);
      ctx.restore();
    }
  });
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

// "..." thought cloud while the NPC is coming up with an answer
function drawThinkingBubble(npc, now) {
  const age = now - npcThinking.since;
  const w = 78, h = 44;
  const L = bubbleLayout(npc, 'player', w, h);
  const p = clamp(age / 250, 0, 1);
  ctx.save();
  ctx.globalAlpha = p;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = speakerColor(npc);
  ctx.lineWidth = 3;
  // Little trail of thought puffs from the head up to the cloud
  const puffs = [[0.25, 5], [0.6, 8]];
  for (const [f, r] of puffs) {
    const px = L.tipX + (L.x + w / 2 - L.tipX) * f;
    const py = L.tipY + (L.y + h - L.tipY) * f;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  roundRect(L.x, L.y, w, h, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#666';
  for (let i = 0; i < 3; i++) {
    const bounce = Math.max(0, Math.sin(age / 160 - i * 0.7)) * 6;
    ctx.beginPath();
    ctx.arc(L.x + w / 2 + (i - 1) * 16, L.y + h / 2 + 2 - bounce, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpeechBubbles() {
  const now = performance.now();
  // Draw faded (older) bubbles first so the newest line is on top
  const ordered = [...speechBubbles].sort((a, b) => (a.dimmed === b.dimmed ? 0 : a.dimmed ? -1 : 1));
  for (const b of ordered) drawBubble(b, now);
  if (npcThinking) drawThinkingBubble(npcThinking.npc, now);
}

registerScreenLayer(10, () => drawSpeechBubbles());
