#!/usr/bin/env node
// Renders a map SVG to a PNG, to look at the drawing before trying it in the game.
//   node .claude/skills/build-level/scripts/render-svg.js assets/camp_level4.svg /tmp/map.png [width]
// Default width 1650 (half size); pass 3300 for full size. Needs Playwright.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const [svg, out, w] = process.argv.slice(2);
  if (!svg || !out) { console.error('usage: render-svg.js <map.svg> <out.png> [width]'); process.exit(1); }
  const width = Number(w) || 1650;
  const browser = await chromium.launch();
  // the maps are 3300×2400: show it whole, scaled to `width`
  const page = await browser.newPage({ viewport: { width: 3300, height: 2400 }, deviceScaleFactor: width / 3300 });
  await page.goto('file://' + path.resolve(svg));
  await page.screenshot({ path: out });
  await browser.close();
  console.log(`wrote ${out}`);
})();
