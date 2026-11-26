// ============================================================
// SCENE ROOMS — maps drawn from JSON instead of an image file
// ============================================================
// A map JSON may have a `scene` object instead of an `image`. The scene is
// built into a marker-style SVG (wobbly ink outlines, streaky marker fills,
// emoji stickers), rasterised once, and then used exactly like a map image.
// All prop boxes use the same 0–1 fractions as hotspots.

// Resolves to something drawImage() accepts, with naturalWidth/naturalHeight.
function loadMapImage(config) {
  if (config.scene) return renderSceneImage(config.scene);
  return new Promise((resolve, reject) => {
    const img = new Image();
    // An .svg map (like the Second Camp's) is rasterised once too, so its
    // filters aren't redrawn every frame
    img.onload = () => resolve(/\.svg$/i.test(config.image) ? rasterise(img, img.naturalWidth, img.naturalHeight) : img);
    img.onerror = reject;
    img.src = config.image;
  });
}

function rasterise(img, W, H) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  c.getContext('2d').drawImage(img, 0, 0, W, H);
  c.naturalWidth = W;
  c.naturalHeight = H;
  return c;
}

function renderSceneImage(scene) {
  const W = scene.width || 2400;
  const H = scene.height || 1700;
  const svg = buildSceneSvg(scene, W, H);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      // Rasterise once so the (filter-heavy) SVG isn't re-rendered every frame
      URL.revokeObjectURL(url);
      resolve(rasterise(img, W, H));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

const SCENE_INK = '#221c1a';
const SCENE_FONT = "'Marker Felt','Chalkboard SE','Comic Sans MS',cursive";
const SCENE_EMOJI_FONT = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";

function svgEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function svgAttrs(o) {
  return Object.entries(o)
    .map(([k, v]) => `${k}="${typeof v === 'number' ? Math.round(v * 10) / 10 : svgEsc(v)}"`)
    .join(' ');
}

// A "pen" collects SVG into three layers:
//   fill — marker colour (slightly wobbled one way)
//   ink  — black outlines + handwriting (wobbled a different way, so the
//          colour sits a little off the lines, like real colouring-in)
//   top  — crisp emoji stickers
function scenePen(S) {
  const fill = [], ink = [], top = [];
  const SW = 7 * S;
  function shape(tag, a, color, o = {}) {
    if (color) fill.push(`<${tag} ${svgAttrs(a)} fill="${color}"${o.opacity ? ` opacity="${o.opacity}"` : ''}/>`);
    if (o.ink !== false) {
      ink.push(`<${tag} ${svgAttrs(a)} fill="none" stroke="${o.stroke || SCENE_INK}" ` +
        `stroke-width="${(o.sw || 1) * SW}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }
  const pen = {
    S, fill, ink, top,
    rect(x, y, w, h, color, o = {}) { shape('rect', { x, y, width: w, height: h, rx: o.r || 0 }, color, o); },
    circle(cx, cy, r, color, o) { shape('circle', { cx, cy, r }, color, o); },
    ellipse(cx, cy, rx, ry, color, o) { shape('ellipse', { cx, cy, rx, ry }, color, o); },
    path(d, color, o) { shape('path', { d }, color, o); },
    poly(points, color, o) {
      shape('polygon', { points: points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ') }, color, o);
    },
    line(x1, y1, x2, y2, o = {}) {
      (o.layer === 'fill' ? fill : ink).push(`<line ${svgAttrs({ x1, y1, x2, y2 })} stroke="${o.stroke || SCENE_INK}" ` +
        `stroke-width="${(o.sw || 1) * SW}" stroke-linecap="round"${o.opacity ? ` opacity="${o.opacity}"` : ''}` +
        `${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`);
    },
    star(cx, cy, r, color, o) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
      }
      pen.poly(pts, color, o);
    },
    crescent(cx, cy, r, color, o) {
      pen.path(`M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r * 0.7} ${r} 0 1 1 ${cx} ${cy - r} Z`, color, o);
    },
    // layer:'top' keeps text crisp (no wobble) — needed when it contains emoji
    text(x, y, str, o = {}) {
      (o.layer === 'top' ? top : ink).push(`<text ${svgAttrs({ x, y })} font-family="${SCENE_FONT}" font-size="${o.size || 40 * S}" ` +
        `font-weight="${o.weight || 'bold'}" fill="${o.color || SCENE_INK}" text-anchor="${o.anchor || 'middle'}" ` +
        `dominant-baseline="central">${svgEsc(str)}</text>`);
    },
    // under:true puts the emoji in the fill layer so later shapes can hide part of it
    emoji(x, y, ch, size, o = {}) {
      const tf = [];
      if (o.flip) tf.push(`translate(${x * 2} 0) scale(-1 1)`);
      if (o.rotate) tf.push(`rotate(${o.rotate} ${x} ${y})`);
      (o.under ? fill : top).push(`<text ${svgAttrs({ x, y })} font-family="${SCENE_EMOJI_FONT}" font-size="${size}" ` +
        `text-anchor="middle" dominant-baseline="central"${o.opacity ? ` opacity="${o.opacity}"` : ''}` +
        `${tf.length ? ` transform="${tf.join(' ')}"` : ''}>${svgEsc(ch)}</text>`);
    },
    group(transform, fn) {
      for (const L of [fill, ink, top]) L.push(`<g transform="${transform}">`);
      fn();
      for (const L of [fill, ink, top]) L.push('</g>');
    }
  };
  return pen;
}

// --- Room shell: ceiling, back wall, floor ---
function drawSceneCeiling(p, W, h, c) {
  const S = p.S;
  p.rect(0, 0, W, h, c.color || '#7a4a2a', { ink: false });
  // Diagonal roof stripes, like the striped roof in Louisa's drawing
  for (let x = -h; x < W; x += 46 * S) p.line(x, h, x + h * 0.9, 0, { sw: 0.5, stroke: c.stripe || '#4a2a14' });
  p.line(0, h, W, h, { sw: 1.2 });
}

function drawSceneWall(p, y0, W, h, c) {
  const S = p.S;
  const faint = { sw: 0.35, stroke: 'rgba(0,0,0,0.3)' };
  p.rect(0, y0, W, h, c.color || '#e3ecb4', { ink: false });
  const pattern = c.pattern || 'blocks';
  if (pattern === 'blocks') {
    const bh = 64 * S, bw = 150 * S;
    for (let r = 0, y = y0; y < y0 + h; r++, y += bh) {
      if (y > y0) p.line(0, y, W, y, faint);
      for (let x = (r % 2) * bw / 2; x < W; x += bw) p.line(x, y, x, Math.min(y + bh, y0 + h), faint);
    }
  } else if (pattern === 'planks') {
    for (let y = y0 + 70 * S; y < y0 + h; y += 70 * S) p.line(0, y, W, y, faint);
  } else if (pattern === 'stripes') {
    // wallpaper: wide pale stripes with little dots in between
    for (let x = 0, i = 0; x < W; x += 110 * S, i++) {
      p.rect(x, y0, 50 * S, h, c.stripe || 'rgba(255,255,255,0.4)', { ink: false });
      for (let y = y0 + 40 * S + (i % 2) * 45 * S; y < y0 + h; y += 90 * S) p.circle(x + 80 * S, y, 5 * S, c.dot || 'rgba(198,40,40,0.35)', { ink: false });
    }
  } else if (pattern === 'canvas') {
    for (let x = 220 * S; x < W; x += 220 * S) {
      p.path(`M ${x} ${y0} Q ${x + 18 * S} ${y0 + h / 2} ${x} ${y0 + h}`, null, faint);
    }
  }
}

function drawSceneFloor(p, y0, W, h, c) {
  const S = p.S;
  p.rect(0, y0, W, h, c.color || '#cbc5ba', { ink: false });
  const pattern = c.pattern || 'concrete';
  const faint = { sw: 0.4, stroke: 'rgba(0,0,0,0.25)' };
  if (pattern === 'concrete') {
    // expansion joints + a few cracks + speckles
    for (let x = 400 * S; x < W; x += 400 * S) p.line(x, y0, x - 30 * S, y0 + h, faint);
    p.line(0, y0 + h * 0.55, W, y0 + h * 0.55, faint);
    const cracks = [[0.22, 0.30], [0.63, 0.82], [0.80, 0.25]];
    for (const [fx, fy] of cracks) {
      const x = fx * W, y = y0 + fy * h;
      p.path(`M ${x} ${y} l ${30 * S} ${12 * S} l ${14 * S} ${26 * S} m ${-14 * S} ${-26 * S} l ${36 * S} ${-6 * S}`, null, { sw: 0.4 });
    }
    let seed = 7;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 120; i++) p.circle(rand() * W, y0 + rand() * h, (2 + rand() * 3) * S, 'rgba(0,0,0,0.18)', { ink: false });
  } else if (pattern === 'tiles') {
    const t = 110 * S;
    for (let y = y0 + t; y < y0 + h; y += t) p.line(0, y, W, y, faint);
    for (let x = t; x < W; x += t) p.line(x, y0, x, y0 + h, faint);
  } else if (pattern === 'planks') {
    for (let y = y0 + 60 * S, r = 0; y < y0 + h; y += 60 * S, r++) {
      p.line(0, y, W, y, faint);
      for (let x = (r % 3) * 180 * S; x < W; x += 540 * S) p.line(x, y - 60 * S, x, y, faint);
    }
  }
  // skirting board where wall meets floor
  p.rect(0, y0 - 10 * S, W, 20 * S, c.skirting || '#8b5a2b');
}
