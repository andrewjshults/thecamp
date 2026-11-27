// --- Levels: which camp each map belongs to ---
// The main map is Level 1. Going through a secret `passage` (the cave to the
// Second Camp, the Marshmallows' hole to the Third) goes up one level; a
// normal portal stays on the same level. So a room is on the level of the
// lowest camp it can be reached from (the bank, reachable from the first camp,
// is Level 1; Ember's Sword Shop is Level 2; Shelly's Armor Shop is Level 3).
//
// mapLevels(configs) → { levelOf: { path → n }, locks: { n → Set of lock names
// of the passages that lead up to level n }, max }. `configs` is what
// crawlMapConfigs() returns.
function mapLevels(configs) {
  const levelOf = { [MP_MAIN_MAP]: 1 }, locks = {};
  const deque = [MP_MAIN_MAP];
  while (deque.length) {               // 0-1 BFS: portals cost 0, passages 1
    const path = deque.shift(), n = levelOf[path], cfg = configs[path];
    for (const h of (cfg && cfg.hotspots) || []) {
      const links = [];
      if (h.targetMap) links.push([h.targetMap, n, null]);
      if (h.passage && h.passage.targetMap) links.push([h.passage.targetMap, n + 1, h.passage.lock || 'level2']);
      for (const [to, m, lock] of links) {
        if (!configs[to]) continue;
        if (lock) (locks[m] || (locks[m] = new Set())).add(lock);
        if (levelOf[to] !== undefined && levelOf[to] <= m) continue;
        levelOf[to] = m;
        if (m === n) deque.unshift(to); else deque.push(to);
      }
    }
  }
  return { levelOf, locks, max: Math.max(1, ...Object.values(levelOf)) };
}

// The level `path` is on (1 if it isn't known yet)
function levelOfMap(levels, path) {
  return (levels.levelOf && levels.levelOf[path]) || 1;
}

// Has this camper unlocked level `n`? Level 1 always; the level you're on and
// every one below it; and a level whose passage is open (passageOpen in
// level2.js), if the one below it is unlocked too. Exploration mode opens them
// all (registerLevelsOpen).
function levelUnlocked(levels, n) {
  if (n <= 1 || levelsAllOpen()) return true;
  if (n <= levelOfMap(levels, currentMapPath)) return true;
  const locks = levels.locks[n];
  if (!locks) return false;
  return levelUnlocked(levels, n - 1) &&
    [...locks].some(lock => typeof passageOpen === 'function' && passageOpen({ passage: { lock } }));
}

// "Level 2", for hints
function levelLabel(n) {
  return `Level ${n}`;
}
