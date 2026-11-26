// --- Saves ---
function mpSaveKey() {
  return `louisas-game:mp:${mp.code}:${player.character.name}`;
}
function mpLoadSave() {
  try {
    const raw = localStorage.getItem(mpSaveKey());
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
function mpWriteSave() {
  try {
    localStorage.setItem(mpSaveKey(), JSON.stringify({
      version: SAVE_VERSION, currentMap: currentMapPath, backpack, completedUses, dishesMade, customRecipes, strengthBoost, swordRating, bossWins, bankBalance
    }));
  } catch (e) { console.warn('Failed to write save', e); }
}
function mpWorldKey() {
  return `louisas-game:world:${mp.code}`;
}
function mpCacheWorld() {
  mp.cacheTimer = null;
  if (!mp.code) return;
  try { localStorage.setItem(mpWorldKey(), JSON.stringify({ items: mp.items, savedAt: Date.now() })); } catch (_) { /* full */ }
}
function mpCacheWorldSoon() {
  if (!mp.cacheTimer) mp.cacheTimer = setTimeout(mpCacheWorld, 1000);
}
// Nobody answered: use our own last copy of this world (or a fresh one)
function mpUseCachedWorld() {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(mpWorldKey()) || 'null'); } catch (_) { /* ignore */ }
  mpApplySnapshot({ at: '0', items: (cached && cached.items) || mp.items });
}
