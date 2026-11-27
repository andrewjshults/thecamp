// --- Your sword ---
// You fight the Blob with a sword rated 0–100 (`swordRating`, saved). Every
// swing wears it by 1, and every swing that touches the Blob (or its sword) by
// 4 more. At 0 it still works until the fight ends, but then it's done: a new
// 🗡️ Sword is dropped at a random spot on a random map, and you need to pick it
// up before you can fight again. Until then the Blob ignores you (it won't
// chase or catch you), and trying to fight it tells you which map to search.
// A sword picked up while yours still works waits in the backpack as a spare.
// There's always at least one sword lying on every level (so in a multiplayer
// world there's one for whoever needs it, wherever they are): one is dropped
// on each level when a game starts if there isn't, and picking one up drops
// another somewhere else on the same level (levels: src/world/levels.js).
const SWORD_MAX = 100;
const SWORD_SWING_WEAR = 1;
const SWORD_HIT_WEAR = 4;
const SWORD_ITEM = { id: 'sword', name: 'Sword', emoji: '🗡️' };
// Kinds of sword. The plain one is the one you find lying around; the sword
// shop (src/features/sword-shop/) adds the ones you can buy. A kind is
// { name, emoji, max (its rating when new), blade / glow (colours in the
// fight), and what it does in a fight: land (added to the odds a swing
// lands), reach (arena units), speed (× how fast you recover from a swing),
// power (strength a hit knocks off the boss; 1.5 = 2 half the time), stun (× how long a hit stuns
// it), pierce (chance to smash through an armored wind-up), guard (added to
// the odds your block holds, hitOdds (if set: the odds a swing lands, whatever
// your strength — instead of strength + land), oneHit (a hit wins the fight
// straight away) }. Every kind wears out the same way.
const SWORD_KINDS = {
  plain: { name: 'Sword', emoji: '🗡️', max: SWORD_MAX }
};
const SWORD_STATS_PLAIN = { land: 0, reach: 0, speed: 1, power: 1, stun: 1, pierce: 0, guard: 0, hitOdds: null, oneHit: false };
let swordKind = 'plain';
let swordRating = SWORD_MAX;
function swordKindDef(id) { return SWORD_KINDS[id || swordKind] || SWORD_KINDS.plain; }
function swordMax() { return swordKindDef().max || SWORD_MAX; }
function swordStats() { return { ...SWORD_STATS_PLAIN, ...swordKindDef() }; }
registerSaveField('swordKind', {
  save: () => swordKind,
  load: s => { swordKind = s && SWORD_KINDS[s.swordKind] ? s.swordKind : 'plain'; }
});
// Older saves have no sword yet: they start with a new one
function savedSwordRating(save) {
  const n = save && Number(save.swordRating);
  return Number.isFinite(n) ? clamp(Math.round(n), 0, swordMax()) : swordMax();
}
registerSaveField('swordRating', { save: () => swordRating, load: s => { swordRating = savedSwordRating(s); } });
let lastSwordDrops = {};     // level → { path, hs, at } — a multiplayer drop takes a moment to arrive
const swordMapConfigs = {};  // maps fetched to find a spot (kept apart from allMapConfigs, the maps you've loaded)

function hasSpareSword() { return backpack.some(it => it.id === SWORD_ITEM.id); }
function hasSword() { return swordRating > 0 || hasSpareSword(); }

// Use the spare (plain) sword from the backpack (when yours is worn out)
function equipSpareSword() {
  const i = backpack.findIndex(it => it.id === SWORD_ITEM.id);
  if (i < 0 || swordRating > 0) return false;
  backpack.splice(i, 1);
  swordKind = 'plain';           // a worn-out shop sword is swapped for the plain one
  swordRating = SWORD_MAX;
  writeSave();
  return true;
}

// A sword just went into the backpack (from hotspot `hs` on map `path`): if
// yours is worn out, it's your new one. Either way another one turns up
// somewhere else on the same level, so there's still one lying around there
// for the next camper.
function onSwordPickedUp(path, hs) {
  for (const [n, d] of Object.entries(lastSwordDrops)) {
    if (d && d.path === path && d.hs === hs) delete lastSwordDrops[n];
  }
  crawlMapConfigs().then(configs => findOrDropSword({ path, hs }, levelOfMap(mapLevels(configs), path)));
  if (!equipSpareSword()) return;
  const msg = `🗡️ You found a new sword! It's as good as new (${SWORD_MAX}). Now you can fight the Blob again!`;
  if (state === GameState.INTERACTING) interactionHintText = msg;
  else useToast = { text: msg, age: 0 };
}

// Every sword lying on level `n`: [{ path, hs }]
function swordsOnLevel(configs, levels, n) {
  const out = [];
  for (const [path, cfg] of Object.entries(configs)) {
    if (levelOfMap(levels, path) !== n) continue;
    const items = worldItemsFor(path, cfg);
    for (const [hs, list] of Object.entries(items)) {
      if ((list || []).some(it => it.id === SWORD_ITEM.id)) out.push({ path, hs });
    }
  }
  return out;
}

// A sword lying on level `n` (or one that's just been dropped there)
function findSword(configs, levels, n) {
  const found = swordsOnLevel(configs, levels, n)[0];
  if (found) return found;
  const last = lastSwordDrops[n];
  if (last && performance.now() - last.at < 10000) return last;
  return null;
}

// Put a new sword at a random spot on level `n` (one you can open and pick
// things up from). `avoid` ({ path, hs }): where one was just picked up — try
// another map on that level.
function dropSword(configs, levels, n, avoid) {
  const spots = {};
  for (const [path, cfg] of Object.entries(configs)) {
    if (cfg.noSwordDrops || levelOfMap(levels, path) !== n) continue;     // e.g. the shops
    const items = worldItemsFor(path, cfg);
    const cave = cfg.boss && cfg.boss.cave;
    const ok = (cfg.hotspots || []).filter(h => !h.targetMap && !h.passage && !h.station && !h.bank && h.id !== cave &&
      !(avoid && avoid.path === path && avoid.hs === h.id) &&
      (items[h.id] || []).length < HOTSPOT_CAPACITY);
    if (ok.length) spots[path] = ok.map(h => h.id);
  }
  let paths = Object.keys(spots);
  if (avoid && paths.length > 1) paths = paths.filter(p => p !== avoid.path);
  if (!paths.length) return null;
  const path = pickOne(paths), hs = pickOne(spots[path]);
  if (mp.active) {
    mpRequestDrop(hs, { ...SWORD_ITEM }, path);     // everyone sees it appear
  } else if (path === currentMapPath) {
    (hotspotItems[hs] || (hotspotItems[hs] = [])).push({ ...SWORD_ITEM });
  } else {
    const ms = allMapSaves[path] || (allMapSaves[path] = {});
    ms.hotspots = restoreOrDefaultHotspots(configs[path], ms);
    ms.hotspots[hs].push({ ...SWORD_ITEM });
  }
  writeSave();
  lastSwordDrops[n] = { path, hs, at: performance.now() };
  return lastSwordDrops[n];
}

// Where's a sword I can pick up on level `n` (default: the level you're on)?
// Drops a new one there if there isn't one. Resolves to { path, hs, cfg, level }
// or null. (Finding and dropping happen together once the maps are in, so two
// searches at once can't both drop one.)
function findOrDropSword(avoid, n) {
  return crawlMapConfigs().then(configs => {
    if (!swordWorldReady()) return null;     // changed maps / left while loading: next check will do it
    const levels = mapLevels(configs);
    const level = n || levelOfMap(levels, currentMapPath);
    const at = findSword(configs, levels, level) || dropSword(configs, levels, level, avoid);
    return at ? { ...at, cfg: configs[at.path], level } : null;
  });
}

// Make sure there's a sword lying on every level
function swordOnEveryLevel() {
  return crawlMapConfigs().then(configs => {
    const { max } = mapLevels(configs);
    for (let n = 1; n <= max; n++) findOrDropSword(null, n);
  });
}

// Is everything loaded enough to look for (and drop) a sword?
function swordWorldReady() {
  return !!player.character && mpInWorld() && (!mp.active || mp.synced);
}

// A game just started: make sure a sword is lying on every level (once things load)
function checkSwordSoon() {
  let tries = 0;
  const go = () => {
    if (swordWorldReady()) swordOnEveryLevel();
    else if (++tries < 30) setTimeout(go, 500);
  };
  setTimeout(go, 500);
}

// And keep checking, in case one went missing (a friend left before dropping
// the next one...). In a multiplayer world only one computer checks — the
// lowest player id — and only after two misses in a row on a level, so a
// sword that's on its way from a friend isn't doubled up.
const swordCheckMisses = {};   // level → misses in a row
setInterval(() => {
  if (!swordWorldReady()) return;
  if (mp.active && [...mp.players.keys()].some(id => id < mp.myId)) return;
  crawlMapConfigs().then(configs => {
    const levels = mapLevels(configs);
    for (let n = 1; n <= levels.max; n++) {
      if (findSword(configs, levels, n)) { swordCheckMisses[n] = 0; continue; }
      swordCheckMisses[n] = (swordCheckMisses[n] || 0) + 1;
      if (!mp.active || swordCheckMisses[n] >= 2) { swordCheckMisses[n] = 0; findOrDropSword(null, n); }
    }
  });
}, 15000);

// Tried to fight the Blob with no sword: say where to look
function swordNeededHint() {
  kitchenToast('🗡️ You need a sword to fight the Blob! Looking for one...');
  findOrDropSword().then(at => {
    if (!at) { kitchenToast('🗡️ You need a sword to fight the Blob!'); return; }
    kitchenToast(at.path === currentMapPath
      ? `🗡️ You need a sword to fight the Blob! There's one right here ${mapWhere(at.cfg)}. Look around!`
      : `🗡️ You need a sword to fight the Blob! I think there's one ${mapWhere(at.cfg)}.`);
  });
}

// Items at hotspots are only listed in the hotspot's dialog, so a sword lying
// at one is drawn on the map too (bobbing and sparkling) so campers can find it
function drawLyingSwords() {
  const now = performance.now();
  const size = 44 * SPRITE_SCALE / BASE_SPRITE_SCALE;
  for (const obj of interactiveObjects) {
    if (!(hotspotItems[obj.id] || []).some(it => it.id === SWORD_ITEM.id)) continue;
    const x = obj.x + obj.width / 2;
    const y = obj.y + obj.height * 0.82 - Math.abs(Math.sin(now / 350)) * size * 0.2;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x, obj.y + obj.height * 0.82 + size * 0.45, size * 0.45, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 0.9);
    glow.addColorStop(0, `rgba(255, 241, 118, ${0.65 + 0.2 * Math.sin(now / 250)})`);
    glow.addColorStop(1, 'rgba(255, 241, 118, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
    ctx.fill();
    drawFoodEmoji(SWORD_ITEM.emoji, x, y, size);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = now / 600 + i * 2.1;
      drawFoodEmoji('✨', x + Math.cos(a) * size * 0.7, y + Math.sin(a) * size * 0.5, size * 0.35, 0.5 + 0.5 * Math.sin(now / 180 + i));
    }
  }
}

// One swing (n = SWORD_SWING_WEAR) or one hit (n = SWORD_HIT_WEAR)
function wearSword(f, n) {
  if (swordRating <= 0) return;
  swordRating = Math.max(0, swordRating - n);
  f.swordWornAt = performance.now();
  if (swordRating === 0) fightPop(f, `${swordKindDef().name.toUpperCase()} WORN OUT! ${swordKindDef().emoji}`, f.p.x, 400, '#FFAB91', 0.9);
}

// Buy / get a sword of kind `id`, as good as new (your old one is traded in)
function equipSwordKind(id) {
  swordKind = SWORD_KINDS[id] ? id : 'plain';
  swordRating = swordMax();
  writeSave();
}

registerMapLayer(50, () => drawLyingSwords());
// There's always a sword lying somewhere in the world
onGameEvent('playStart', () => checkSwordSoon());
