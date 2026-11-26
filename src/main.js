// --- Main Game Loop ---
function gameLoop() {
  update();
  runUpdates(FRAME_UPDATES);   // NPCs, multiplayer, conversations (registerFrameUpdate)

  // What's on screen right now draws itself (see registerGameState)
  const handlers = gameStateHandlers();
  if (handlers.draw) handlers.draw();

  if (devMode) drawDevModeOverlay();

  requestAnimationFrame(gameLoop);
}

// Load the main map (then the start menu opens), and start the game loop.
// This is the last script, so everything the callbacks use is defined.
loadMap('assets/game_design.json');

gameLoop();
