#!/usr/bin/env node
// Runs tools/fight-sim.js against the dev server (start it first: npm run dev).
//   node .claude/skills/build-level/scripts/sim.js '[{"tune":"brickTuning(15)","bot":"good"},
//     {"tune":"slimeTuning(16)","bot":"good","n":300,"str":10,"opts":{"sword":"star","armor":"dragon"}}]'
// tune: an expression evaluated in the page; bot: casual | decent | good;
// n: fights (300); str: your strength (10); opts: { sword, armor, toWin }.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../../..');
(async () => {
  const runs = JSON.parse(process.argv[2] || '[]');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto(`http://localhost:${process.env.PORT || 3000}/?playtime=off`);
  await page.waitForTimeout(800);
  await page.click('[data-act=single]');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => state === GameState.PLAYING, null, { timeout: 15000 });
  await page.addScriptTag({ content: fs.readFileSync(path.join(ROOT, 'tools/fight-sim.js'), 'utf8') });
  for (const r of runs) {
    const res = await page.evaluate(r => simMany(eval(r.tune), r.bot, r.n || 300, r.str || 10, r.opts || {}), r);
    console.log(JSON.stringify(r), '→', JSON.stringify(res));
  }
  await browser.close();
})();
