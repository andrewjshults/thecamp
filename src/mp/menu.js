// --- Menu (HTML overlay) ---
const menuEl = document.getElementById('menu');
const MENU_SCREENS = ['menuMode', 'menuMulti', 'menuJoin', 'menuBusy', 'menuEmpty'];
let menuScreen = null;

function showMenu(id) {
  menuEl.hidden = false;
  menuScreen = id;
  for (const sId of MENU_SCREENS) document.getElementById(sId).hidden = sId !== id;
  const first = document.getElementById(id).querySelector('input, button');
  if (first) first.focus({ preventScroll: true });
}
function hideMenu() {
  if (menuEl.contains(document.activeElement)) document.activeElement.blur();
  menuEl.hidden = true;
  menuScreen = null;
}
function setMenuError(id, text) {
  document.getElementById(id).textContent = text || '';
}
function showBusy(text) {
  document.getElementById('busyText').textContent = text;
  showMenu('menuBusy');
}

function menuAction(act) {
  setMenuError('modeError');
  setMenuError('multiError');
  switch (act) {
    case 'single':
      mpLeave();
      hideMenu();
      state = GameState.CHARACTER_SELECT;
      break;
    case 'multi':
      if (!window.PubNub) {
        showMenu('menuMode');
        setMenuError('modeError', "Multi player needs the internet — couldn't load PubNub.");
        return;
      }
      mpLeave();
      showMenu('menuMulti');
      break;
    case 'mode':
      showMenu('menuMode');
      break;
    case 'create':
      mpCreateWorld();
      break;
    case 'join': {
      mpLeave();
      setMenuError('joinError');
      showMenu('menuJoin');
      document.getElementById('joinCode').select();
      break;
    }
    case 'cancel':
      mpLeave();
      showMenu('menuMulti');
      break;
    case 'joinAnyway':
      mp.onSynced = null;
      mpUseCachedWorld();
      mpEnterWorld();
      break;
  }
}

menuEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (btn) menuAction(btn.dataset.act);
});
menuEl.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const back = { menuMulti: 'mode', menuJoin: 'multi', menuBusy: 'cancel', menuEmpty: 'join' }[menuScreen];
  if (back) { e.preventDefault(); menuAction(back); }
});
const joinCodeInput = document.getElementById('joinCode');
joinCodeInput.addEventListener('input', () => {
  joinCodeInput.value = joinCodeInput.value.replace(/\D/g, '').slice(0, 6);
  setMenuError('joinError');
});
document.getElementById('menuJoin').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = joinCodeInput.value.replace(/\D/g, '');
  if (code.length !== 6) {
    setMenuError('joinError', 'World codes have 6 numbers.');
    joinCodeInput.focus();
    return;
  }
  mpJoinWorld(code);
});

// Esc on the character screen / "← Back": back to single vs multi player
function backToModeSelect() {
  mpLeave();
  player.character = null;
  if (currentMapPath !== MP_MAIN_MAP) {
    loadMap(MP_MAIN_MAP);      // ends on the mode menu
  } else {
    state = GameState.MODE_SELECT;
    showMenu('menuMode');
  }
}

// "Switch camper?" → Yes. In a world you stay connected, but friends stop seeing you.
function goToCharacterSelect() {
  if (mp.active) mpSendBye();
  sidekick = null;
  npcLeavers = [];
  state = GameState.CHARACTER_SELECT;
  player.character = null;
}
