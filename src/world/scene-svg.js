function buildSceneSvg(scene, W, H) {
  const S = W / 2400;
  const p = scenePen(S);
  const ceilH = scene.ceiling ? (scene.ceiling.height ?? 0.05) * H : 0;
  const floorY = (scene.floor && scene.floor.from != null ? scene.floor.from : 0.45) * H;

  drawSceneWall(p, ceilH, W, floorY - ceilH, scene.wall || {});
  drawSceneFloor(p, floorY, W, H - floorY, scene.floor || {});
  if (scene.ceiling) drawSceneCeiling(p, W, ceilH, scene.ceiling);

  for (const prop of scene.props || []) {
    const draw = SCENE_PROPS[prop.kind];
    if (!draw) { console.warn('Unknown scene prop kind:', prop.kind); continue; }
    draw(p, { x: prop.px * W, y: prop.py * H, w: (prop.pw || 0) * W, h: (prop.ph || 0) * H, W, H }, prop);
  }

  const defs = `<defs>
    <filter id="wobFill" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="${0.011 / S}" numOctaves="2" seed="4"/>
      <feDisplacementMap in="SourceGraphic" scale="${10 * S}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="wobInk" x="-2%" y="-2%" width="104%" height="104%">
      <feTurbulence type="fractalNoise" baseFrequency="${0.018 / S}" numOctaves="2" seed="19"/>
      <feDisplacementMap in="SourceGraphic" scale="${6 * S}" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <pattern id="streaks" width="${18 * S}" height="${18 * S}" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
      <rect width="${7 * S}" height="${18 * S}" fill="#fff" opacity="0.14"/>
    </pattern>
    <pattern id="mesh" width="${9 * S}" height="${9 * S}" patternUnits="userSpaceOnUse">
      <path d="M0 0H${9 * S}M0 0V${9 * S}" stroke="#000" stroke-opacity="0.35" stroke-width="${1.6 * S}"/>
    </pattern>
    <pattern id="checker" width="${44 * S}" height="${44 * S}" patternUnits="userSpaceOnUse">
      <rect width="${44 * S}" height="${44 * S}" fill="#ffffff"/>
      <rect width="${22 * S}" height="${22 * S}" fill="#e53935"/>
      <rect x="${22 * S}" y="${22 * S}" width="${22 * S}" height="${22 * S}" fill="#e53935"/>
    </pattern>
    <radialGradient id="ovenGlow" cx="0.5" cy="0.8" r="0.7">
      <stop offset="0" stop-color="#ff9800" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#ff9800" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="#fff59d" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#fff59d" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}` +
    `<rect width="${W}" height="${H}" fill="#fbfaf4"/>` +
    `<g filter="url(#wobFill)">${p.fill.join('')}</g>` +
    `<rect width="${W}" height="${H}" fill="url(#streaks)"/>` +
    `<g filter="url(#wobInk)">${p.ink.join('')}</g>` +
    `<g>${p.top.join('')}</g>` +
    `<rect x="${4 * S}" y="${4 * S}" width="${W - 8 * S}" height="${H - 8 * S}" fill="none" stroke="${SCENE_INK}" stroke-width="${10 * S}"/>` +
    `</svg>`;
}
