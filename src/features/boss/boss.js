// ============================================================
// BOSS — Glug Glub Blob (a.k.a. the I Eat You Blob)
// ============================================================
// A map JSON may have a `boss` ({ name, aka, cave, phrases, hitPhrases,
// hurtPhrases, pointsToWin, reward }). The boss lives in the `cave` hotspot
// (drawn over the map as a rocky hill with a dark mouth) and comes out
// whenever it likes to roam the map. Knock on the cave, press Space next to
// it, or let it catch you: it shouts something (never in proper English) and
// the fight view opens — a side-on sword duel, Street Fighter style.
// Unblocked hits score a point; first to `pointsToWin` wins.
// Win → the `reward` coin goes in your backpack. Lose (or run away) → the
// Blob takes every coin in your backpack.

const BOSS_ENGAGE_MS = 1100;   // map freezes while the Blob shouts, then the fight opens
const BOSS_DEFAULT_PHRASES = ['EAT!', 'nom nom you!', 'gobble up yous!'];
const DEFAULT_BOSS_REWARD = { id: 'ten_dollar_coin', name: '$10 Coin', emoji: '🪙', coin: true, value: 10 };

function randBetween(a, b) { return a + Math.random() * (b - a); }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function isCoin(item) { return !!(item && (item.coin || /coin/i.test(item.id || ''))); }

function bossDef() { return (fight && fight.def) || (mapConfig && mapConfig.boss) || null; }
function isBossCave(obj) {
  const b = mapConfig && mapConfig.boss;
  return !!(b && obj && obj.id === b.cave);
}
function bossCave() {
  const b = mapConfig && mapConfig.boss;
  return b ? interactiveObjects.find(o => o.id === b.cave) || null : null;
}
function bossName() { const b = bossDef(); return (b && b.name) || 'Glug Glub Blob'; }
function bossSays(kind) {
  const b = bossDef() || {};
  return pickOne(b[kind] && b[kind].length ? b[kind] : BOSS_DEFAULT_PHRASES);
}

// ---------- The Blob on the map ----------
const mapBoss = {
  map: null,          // which map it was set up on
  where: 'home',      // 'home' (in the cave) | 'out' (roaming) | 'returning'
  fx: 0, fy: 0,       // FEET position, fractions of the map
  facing: 'left',
  walk: 0,            // walk-cycle clock (s)
  moving: false,
  target: null,       // { fx, fy } wander target
  homeUntil: 0,       // when it next comes out
  outUntil: 0,        // when it heads back home
  shout: null,        // { text, start, dur }
  nextShoutAt: 0,
  lastT: 0,
  // Multiplayer: one player (the "keeper") runs the Blob and broadcasts it
  busyWith: null,     // player id it's fighting ('fighting' hides it from the map)
  tfx: null, tfy: null,   // latest broadcast position (non-keepers glide to it)
  lastSid: null       // id of the last broadcast shout we showed
};
// How long the Blob stays in its cave after a fight: longer when it was beaten
const BOSS_REST_BEATEN_MS = [30000, 60000];
const BOSS_REST_MS = [30000, 50000];
function bossRestMs(beaten) {
  const [lo, hi] = beaten ? BOSS_REST_BEATEN_MS : BOSS_REST_MS;
  return randBetween(lo, hi);
}
