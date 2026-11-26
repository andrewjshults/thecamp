// ---------- The fight view ----------
// Arena units: 1000 wide, height measured up from the ground (y = 0).
const FIGHT_MIN_GAP = 200;     // bodies can't get closer than this (centre to centre)
const P_REACH = 300;           // player's sword hits if the Blob is this close
const B_REACH = 330;           // Blob's tail-sword reach (it also lunges forward)
const P_STARTUP = 110, P_ACTIVE = 110, P_RECOVER = 200;   // player swing (ms)
const B_ACTIVE = 160, B_RECOVER = 380;                    // Blob swing after its wind-up
const HIT_STUN = 340, BLOCK_STUN = 220, BOSS_BLOCK_MS = 500;
const ARENA_MIN_X = 110, ARENA_MAX_X = 890;
const JUMP_V = 950, GRAVITY = 2600;

let fight = null;
let bossTuneOverride = null;   // testing: force a tuning (see BOSS_TUNE_BASE)
let fightTouch = { left: false, right: false, block: false };

// Strength, for you AND the Blob: you start every fight with STRENGTH_BASE +
// the desserts you ate (strengthBoost, which you keep); the Blob starts with
// boss.strength (default STRENGTH_BASE). Each hit taken costs 1, and each
// fighter gets 1 back every STRENGTH_REGEN_MS (up to where they started). It
// sets how fast you move and swing, and how often your swings and blocks work.
const STRENGTH_REGEN_MS = 8000;      // tested: fights last ~20–30s, so 15s gave back only ~1 point; 8s gives 2–3
function strengthOdds(s) { return 1 - 0.7 * Math.exp(-s / 7); }       // 0 → 30%, 10 → 83%, 20 → 96%
function strengthSpeed(s) { return clamp(0.55 + 0.045 * s, 0.55, 1.45); }   // 10 → normal speed

// How tough the Blob is in this fight. These are multipliers / additions on the
// original Blob, which is BOSS_TUNE_BASE. See bossTuning() for how it grows.
//   strength  added to its starting strength (faster, lands more, blocks hold)
//   windup    × its wind-up before a normal attack (smaller = less time to react)
//   counter   × its wind-up before a counter-attack after blocking you
//   think     × its pauses between moves (smaller = attacks more often)
//   block     added to its chance of blocking your swings
//   aggro     added to its chance of attacking when you're in reach
//   regen     × time to get 1 strength back (smaller = recovers faster)
//   speed     × how fast it walks in and backs off
//   armor     chance a normal wind-up can't be interrupted (your swing just CLANGs)
//   stun      × how long it's stunned after you hit it
//   tough     chance a hit doesn't cost it any strength
const BOSS_TUNE_BASE = { strength: 0, windup: 1, counter: 1, think: 1, block: 0, aggro: 0, regen: 1, speed: 1, armor: 0, stun: 1, tough: 0 };
function fightTune(f) { return (f && f.tune) || BOSS_TUNE_BASE; }

// The Blob gets tougher every time you beat it, up to BOSS_LEVEL_MAX: level L
// is BOSS_TUNE_BASE moved L/BOSS_LEVEL_MAX of the way to BOSS_TUNE_TOP.
// Tuned with a simulator (tools/fight-sim.js) against three bot players. The
// "decent" bot (reacts in ~0.4s, defends ~75% of attacks) wins 100% of fights
// at level 0, then 99, 96, 86, 64 and 44% at level 5. A "good" bot still wins
// ~70% at level 5. Dessert strength makes up for it: at level 5 a decent player
// wins ~70% at strength 15 and ~90% at 20.
// What mattered: the Blob blocking more, starting stronger, and armored
// wind-ups that can't be interrupted (paired with shorter wind-ups). Just
// attacking more often or sooner made it *easier*, because your hits
// interrupt its wind-ups.
const BOSS_LEVEL_MAX = 5;
const BOSS_TUNE_TOP = { block: 0.22, strength: 3.5, armor: 0.5, windup: 0.72, think: 0.72, tough: 0.18, regen: 0.72, speed: 1.22 };
let bossWins = 0;      // Blob fights won (saved per camper)
registerSaveField('bossWins', {
  save: () => bossWins,
  load: s => { bossWins = Math.max(0, Math.floor(Number(s.bossWins) || 0)); }
});
function bossLevel() { return Math.min(bossWins, BOSS_LEVEL_MAX); }
function bossTuning(level) {
  const u = clamp(level, 0, BOSS_LEVEL_MAX) / BOSS_LEVEL_MAX;
  const out = { ...BOSS_TUNE_BASE };
  for (const [k, top] of Object.entries(BOSS_TUNE_TOP)) out[k] = BOSS_TUNE_BASE[k] + (top - BOSS_TUNE_BASE[k]) * u;
  out.strength = Math.round(out.strength);
  return out;
}

function loseStrength(f, a, now) {
  if (a.strength <= 0) return;
  if (a === f.b && Math.random() < fightTune(f).tough) {   // shrugged it off
    fightPop(f, 'TOUGH!', a.x, 330 + a.y, '#FFCC80', 0.7);
    return;
  }
  a.strength--;
  a.lostAt = now;
  if (!a.regenAt) a.regenAt = now + (a.regenMs || STRENGTH_REGEN_MS);
  fightPop(f, '-1 💪', a.x, 330 + a.y, '#FF8A65', 0.7);
}

function regenStrength(f, now) {
  for (const a of [f.p, f.b]) {
    if (a.strength >= a.maxStrength) { a.regenAt = 0; continue; }
    if (!a.regenAt) { a.regenAt = now + (a.regenMs || STRENGTH_REGEN_MS); continue; }
    if (now < a.regenAt) continue;
    a.strength++;
    a.gainAt = now;
    a.regenAt = a.strength < a.maxStrength ? now + (a.regenMs || STRENGTH_REGEN_MS) : 0;
    fightPop(f, '+1 💪', a.x, 330 + a.y, '#A5D6A7', 0.7);
  }
}

function newFighter(x, facing) {
  return { x, y: 0, vy: 0, facing, act: 'idle', actStart: 0, walk: 0, pushV: 0, score: 0, hitChecked: false, ai: 'wait' };
}

function startFight() {
  const now = performance.now();
  const def = mapConfig.boss;
  bossEngage = null;
  mapBoss.shout = null;
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  speechBubbles = [];
  fightTouch = { left: false, right: false, block: false };
  fight = {
    def,
    toWin: def.pointsToWin || 10,
    phase: 'intro',            // intro → fight → ko → result
    phaseStart: now,
    lastT: now,
    p: newFighter(320, 'right'),
    b: newFighter(680, 'left'),
    boost: strengthBoost,      // extra strength from desserts
    bossThinkAt: now + 2600,
    shout: null,               // { text, start, dur } — the Blob yelling
    pops: [],                  // floating words: { text, x, y, color, size, start }
    sparks: [],                // { x, y, color, start }
    shake: 0,
    pPulse: 0, bPulse: 0,      // when each score last went up
    winner: null,
    result: null
  };
  fight.level = bossLevel();
  fight.tune = bossTuneOverride ? { ...BOSS_TUNE_BASE, ...bossTuneOverride } : bossTuning(fight.level);
  fight.p.strength = fight.p.maxStrength = STRENGTH_BASE + strengthBoost;
  fight.b.strength = fight.b.maxStrength = (def.strength || STRENGTH_BASE) + fight.tune.strength;
  fight.b.regenMs = STRENGTH_REGEN_MS * fight.tune.regen;
  // Your sidekick fights beside you (in the lane just behind)
  if (sidekick) {
    fight.s = Object.assign(newFighter(200, 'right'), {
      char: sidekick.char, name: sidekickName(),
      strength: SIDEKICK_STRENGTH, maxStrength: SIDEKICK_STRENGTH,
      nextSwingAt: now + 2600 + randBetween(...SIDEKICK_SWING_GAP_MS)
    });
  }
  state = GameState.FIGHTING;
}
