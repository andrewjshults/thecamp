// --- Main Game Loop ---
function gameLoop() {
  update();
  updateNpcs();
  mpTick();
  updateConversation();

  switch (state) {
    case GameState.LOADING:
      drawLoadingScreen();
      break;
    case GameState.MODE_SELECT:
      drawMenuBackdrop();
      break;
    case GameState.CHARACTER_SELECT:
      drawCharacterSelect();
      break;
    case GameState.RESUME_PROMPT:
      drawResumePrompt();
      break;
    case GameState.PLAYING:
    case GameState.TALKING:
    case GameState.KITCHEN_MODAL:
    case GameState.BANK_MODAL:
      drawGame();
      break;
    case GameState.INTERACTING:
      drawInteraction();
      drawJournal();
      drawCompletionToast();
      break;
    case GameState.ITEM_ACTION:
      drawItemActionDialog();
      drawJournal();
      drawCompletionToast();
      break;
    case GameState.USING_ITEM:
      drawItemUseDialog();
      break;
    case GameState.CONFIRM_DIALOG:
      drawConfirmDialog();
      break;
    case GameState.FIGHTING:
      updateFight();
      drawFight();
      break;
  }

  if (devMode) drawDevModeOverlay();

  requestAnimationFrame(gameLoop);
}

// Load the main map (then the start menu opens), and start the game loop.
// This is the last script, so everything the callbacks use is defined.
loadMap('assets/game_design.json');

gameLoop();
