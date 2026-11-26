// ============================================================
// EXPLORATION MODE — look around every level, no bosses
// ============================================================
// Press E while walking around a map to switch it on or off. While it's on:
//   - the bosses (the Blob, the Marshmallows) leave you alone (foesOff)
//   - the cave's secret passage to the Second Camp is open, even if you
//     haven't beaten the Blob yet (level2Open isn't changed or saved)
//   - a banner at the top of the screen says so
// It isn't saved: every camper starts in the normal game.
let exploreMode = false;

function setExploreMode(on) {
  exploreMode = !!on;
  if (exploreMode) cancelBossEngage();   // a boss that was just yelling at you is called off
  kitchenToast(exploreMode
    ? '🧭 Exploration mode: no bosses, and the cave passage is open! Press E to stop.'
    : '⚔️ Back to the normal game. Watch out for the bosses!');
}

window.addEventListener('keydown', (e) => {
  if (e.key !== 'e' && e.key !== 'E') return;
  if (e.metaKey || e.ctrlKey || e.altKey || devMode || state !== GameState.PLAYING) return;
  if (isTypingInGameInput(e.target) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '')) return;
  setExploreMode(!exploreMode);
});

registerFoesOff(() => exploreMode);
onGameEvent('camperChosen', () => { exploreMode = false; });

// The secret passage, when it isn't open for real (level2.js handles that)
registerHotspotKind({
  match: obj => !!obj.passage && exploreMode && !level2Open,
  interact: obj => goThroughPassage(obj),
  hint: () => `🧭 ${actionKeyLabel()} Secret passage!`
}, { first: true });
registerMapLayer(21, () => { if (exploreMode && !level2Open) drawPassageGlow(); });

// The banner at the top of the screen (only while it's on)
function drawExploreBanner() {
  if (!exploreMode) return;
  const text = isTouchDevice()
    ? '🧭 EXPLORATION MODE  ·  no bosses'
    : '🧭 EXPLORATION MODE  ·  no bosses  ·  E to stop';
  ctx.save();
  ctx.font = 'bold 15px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 28;
  // (below the kitchen's recipe counter, which is up there too)
  const x = canvas.width / 2, y = mapConfig && mapConfig.kitchen ? 54 : 10, h = 30;
  ctx.fillStyle = 'rgba(46, 125, 50, 0.88)';
  roundRect(x - w / 2, y, w, h, 15);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#C5E1A5';
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, x, y + h / 2 + 1);
  ctx.restore();
}
registerScreenLayer(90, () => drawExploreBanner());
