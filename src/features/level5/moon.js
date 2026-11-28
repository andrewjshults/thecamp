// ============================================================
// THE MOON — the boss of the fifth camp, who floats out of its palace
// ============================================================
// The fifth camp's map has a `moon` object (see docs/level-five.md):
//   "moon": {
//     "lair": "moon_crater",                     // hotspot it lives in (its fighting place)
//     "safeZones": [ { "px", "py", "pw", "ph",   // it can't go in these (the Safe Zone's yard)
//                      "grumblePhrases" } ],
//     "sendTo": { "map", "hotspot" },            // where you go when you lose
//     "freeze": { "misses": 3, "ms": 3000,       // miss this many swings in a row: frozen for ms
//                 "cheatKey": "u", "cheatMs": 5000 },   // press it this soon after FIGHT!: no freezing
//     "id", "name", "aka", "label", "size", "chase", "wander", "sniff",
//     "firstOut", "outFor", "restFor", "pointsToWin", "reward", "phrases",
//     "freezePhrases", "cheatPhrases", ... (like a boss)
//   }
// It comes down into its crater now and then, floats all over the camp (over
// the lava too: it's the Moon), and chases you when it sees you, unless
// you're in the Safe Zone. Like the Slime Brick it keeps coming while you
// type a door's code. With no sword you lose straight away. Each camper's
// computer runs its own Moon.
//
// In a fight, swing and miss (dodged, blocked, CLANG or too far away)
// `misses` times in a row and the Moon FREEZES you solid for `ms`: you can't
// move, swing or block. The secret: press U during the fight's intro (or
// right after FIGHT!) and it can't freeze you at all that fight.
//
// Win → a $50 coin (Level 5 × $10), and it gets one level tougher. Lose or
// run away → it eats the coins in your backpack, you're sent back to the
// Fourth Camp, and the portal shuts until you beat the Slime Brick at its
// top level again.
//
// Levels carry on from the Slime Brick's (16–20): the Moon starts at 21 and
// gets tougher with every win, up to 25. Tuned with tools/fight-sim.js.
const MOON_LEVEL_MIN = 21;
const MOON_LEVEL_MAX = 25;
const MOON_TUNE_LOW = { strength: 9, block: 0.05, armor: 0.75, windup: 0.56, think: 0.64, tough: 0.25, regen: 0.45, speed: 1.45, counter: 1.02 };
const MOON_TUNE_TOP = { strength: 11, block: 0.1, armor: 0.8, windup: 0.55, think: 0.63, tough: 0.35, regen: 0.42, speed: 1.5, counter: 1.04 };
const MOON_FREEZE_DEFAULT = { misses: 3, ms: 3000, cheatKey: 'u', cheatMs: 5000 };
let moonWins = 0;     // fights won against the Moon (saved per camper)
registerSaveField('moonWins', {
  save: () => moonWins,
  load: s => { moonWins = Math.max(0, Math.floor(Number(s.moonWins) || 0)); }
});
function moonLevel() { return Math.min(MOON_LEVEL_MIN + moonWins, MOON_LEVEL_MAX); }
function moonTuning(level) {
  const u = clamp((level - MOON_LEVEL_MIN) / (MOON_LEVEL_MAX - MOON_LEVEL_MIN), 0, 1);
  const out = { ...BOSS_TUNE_BASE };
  for (const k of Object.keys(MOON_TUNE_TOP)) out[k] = MOON_TUNE_LOW[k] + (MOON_TUNE_TOP[k] - MOON_TUNE_LOW[k]) * u;
  out.strength = Math.round(out.strength);
  return out;
}

const moon = {
  map: null,          // the map it was set up on
  where: 'home',      // 'home' (in its crater) | 'out' | 'returning'
  fx: 0, fy: 0, facing: 'left', walk: 0, moving: false, target: null,
  homeUntil: 0, outUntil: 0, shout: null, nextShoutAt: 0, lastT: 0,
  graceUntil: 0,      // it leaves you alone until then (just arrived, just fought)
  restUntil: 0        // it stays in its crater until then, whatever map you're on (tests set Infinity)
};
let nearMoon = false;   // close enough to pick a fight with

function moonCfg() { return (mapConfig && mapConfig.moon) || null; }
function moonCrater() {
  const c = moonCfg();
  return c ? interactiveObjects.find(o => o.id === c.lair) || null : null;
}
function moonCraterMiddle() {
  const d = moonCrater();
  return { x: d.x + d.width / 2, y: d.y + d.height * 0.6 };
}
function moonPos() { return { x: moon.fx * scaledMapW, y: moon.fy * scaledMapH }; }
function moonHeight() { return mapBossHeight() * ((moonCfg() && moonCfg().size) || 1.25); }
function moonHere() { return !!moonCfg() && moon.map === currentMapPath && !foesOff(); }
function moonOut() { return moonHere() && (moon.where === 'out' || moon.where === 'returning'); }
function moonSays(kind) {
  const list = moonCfg() && moonCfg()[kind];
  return pickOne(list && list.length ? list : ['RARR!']);
}
function moonShout(text, dur) { moon.shout = { text, start: performance.now(), dur: dur || 1600 }; }

function resetMoon() {
  const now = performance.now();
  const c = moonCfg();
  Object.assign(moon, {
    map: currentMapPath, where: 'home', fx: 0, fy: 0, facing: 'left', walk: 0, moving: false, target: null,
    homeUntil: now + randBetween(...(c.firstOut || [6000, 11000])), outUntil: 0,
    shout: null, nextShoutAt: 0, lastT: now, graceUntil: now + 5000
  });
  nearMoon = false;
}

// --- The safe zones (the Safe Zone's yard): it can't go in ---
function moonSafeRects() {
  const c = moonCfg();
  return ((c && c.safeZones) || []).map(z => ({ x: z.px * scaledMapW, y: z.py * scaledMapH, w: z.pw * scaledMapW, h: z.ph * scaledMapH, z }));
}
function moonSafeAt(x, y) {
  return moonSafeRects().find(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) || null;
}
// Push a point that's inside a zone out through its nearest side (not a side at the map's edge)
function outOfMoonSafe(x, y, pad) {
  for (const r of moonSafeRects()) {
    if (!(x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h)) continue;
    const ways = [];
    if (r.z.px > 0.04) ways.push({ d: x - r.x, x: r.x - pad, y });
    if (r.z.px + r.z.pw < 0.96) ways.push({ d: r.x + r.w - x, x: r.x + r.w + pad, y });
    if (r.z.py > 0.04) ways.push({ d: y - r.y, x, y: r.y - pad });
    if (r.z.py + r.z.ph < 0.96) ways.push({ d: r.y + r.h - y, x, y: r.y + r.h + pad });
    ways.sort((a, b) => a.d - b.d);
    if (ways[0]) ({ x, y } = ways[0]);
  }
  return { x, y };
}
function moonWanderTarget() {
  for (let i = 0; i < 8; i++) {
    const fx = randBetween(0.06, 0.94), fy = randBetween(0.12, 0.94);
    if (!moonSafeAt(fx * scaledMapW, fy * scaledMapH)) return { fx, fy };
  }
  const m = moonCraterMiddle();
  return { fx: m.x / scaledMapW, fy: m.y / scaledMapH };
}

// You're out on the map (walking, or typing a door's code): it can get you
function moonCanHunt() {
  return state === GameState.PLAYING || state === GameState.CODE_PAD;
}

function updateMoon() {
  nearMoon = false;
  if (devMode) return;
  if (foesOff()) { moon.map = null; return; }     // exploration mode: it starts over once it's back on
  const cfg = moonCfg();
  if (!cfg || !player.character || !moonCrater()) return;
  if (state !== GameState.PLAYING && state !== GameState.CODE_PAD) return;
  const now = performance.now();
  if (moon.map !== currentMapPath) resetMoon();
  const dt = Math.min(50, now - (moon.lastT || now));
  moon.lastT = now;
  if (moon.shout && now - moon.shout.start > moon.shout.dur) moon.shout = null;
  moon.moving = false;
  const k = bossK();

  if (moon.where === 'home') {
    if (now < moon.homeUntil || now < moon.restUntil) return;
    // Up it rises, out of its crater
    const mid = moonCraterMiddle();
    moon.fx = mid.x / scaledMapW;
    moon.fy = mid.y / scaledMapH;
    moon.where = 'out';
    moon.outUntil = now + randBetween(...(cfg.outFor || [40000, 60000]));
    moon.target = null;
    moonShout(moonSays('phrases'));
    moon.nextShoutAt = now + randBetween(2500, 4000);
    return;
  }

  const pos = moonPos();
  const dist = Math.hypot(player.x - pos.x, player.y - pos.y);
  const yourZone = moonSafeAt(player.x, player.y);
  const hunting = moonCanHunt() && now >= moon.graceUntil && !yourZone && !doorOpening && !bossEngage;
  if (moon.where === 'out' && now > moon.outUntil) moon.where = 'returning';

  let tx, ty, speed;   // speed: map px per 60fps frame (you walk at 4)
  const sniff = (cfg.sniff || 600) * k;
  if (moon.where === 'returning') {
    const mid = moonCraterMiddle();
    tx = mid.x; ty = mid.y; speed = (cfg.wander || 1.9) * 1.4 * k;
    if (Math.hypot(tx - pos.x, ty - pos.y) < 6 * k) {
      moon.where = 'home';
      moon.homeUntil = now + randBetween(...(cfg.restFor || [9000, 18000]));
      moon.shout = null;
      return;
    }
  } else if (hunting && dist < sniff) {
    // Sees you! Chase, shouting (it sees you even while you type a code)
    tx = player.x; ty = player.y; speed = (cfg.chase || 3.1) * k;
    if (now >= moon.nextShoutAt) {
      moonShout(moonSays('phrases'));
      moon.nextShoutAt = now + randBetween(2200, 3600);
    }
  } else {
    if (yourZone && dist < sniff && now >= moon.nextShoutAt) {
      const own = yourZone.z.grumblePhrases;
      moonShout(own && own.length ? pickOne(own) : moonSays('phrases'));
      moon.nextShoutAt = now + randBetween(3500, 6000);
    }
    const t = moon.target;
    if (!t || Math.hypot(t.fx * scaledMapW - pos.x, t.fy * scaledMapH - pos.y) < 10) moon.target = moonWanderTarget();
    tx = moon.target.fx * scaledMapW; ty = moon.target.fy * scaledMapH; speed = (cfg.wander || 1.9) * k;
  }
  const dx = tx - pos.x, dy = ty - pos.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.5) {
    const step = Math.min(d, speed * dt * 0.06);
    const to = outOfMoonSafe(pos.x + dx / d * step, pos.y + dy / d * step, 2);
    moon.fx = clamp(to.x / scaledMapW, 0.01, 0.99);
    moon.fy = clamp(to.y / scaledMapH, 0.03, 0.99);
    if (Math.abs(dx) > 2) moon.facing = dx < 0 ? 'left' : 'right';
    moon.walk += dt / 1000;
    moon.moving = true;
  }
  nearMoon = dist < 190 * k * (cfg.size || 1.25) + 20 && state === GameState.PLAYING;
  // Caught you! (Even halfway through typing a code.)
  if (moon.where === 'out' && hunting && dist < 60 * k * (cfg.size || 1.25)) {
    if (state === GameState.CODE_PAD) closeCodePad('🌙 RARR! The Moon got you while you were typing the code!');
    engageMoon(true);
  }
}

// It yells, then the fight view opens (update() → startFight(bossEngage.foe)).
// `auto`: it caught you (with no sword, you lose straight away).
function engageMoon(auto) {
  if (state !== GameState.PLAYING || bossEngage || doorOpening || foesOff()) return;
  let noSword = false;
  if (swordRating <= 0 && !equipSpareSword()) {
    if (!auto) {
      kitchenToast('🗡️ You have no sword! Run to the Safe Zone, the Moon can\'t go in there! 🛡️');
      return;
    }
    noSword = true;
  }
  const pos = moonPos();
  moon.where = 'out';
  moon.facing = player.x < pos.x ? 'left' : 'right';
  player.facing = player.x < pos.x ? 'right' : 'left';
  player.walking = false;
  player.frame = 0;
  tapTarget = null;
  backpackOpen = false;
  journalOpen = false;
  moonShout(moonSays('phrases'), BOSS_ENGAGE_MS + 200);
  bossEngage = { start: performance.now(), foe: moonFoe(noSword), moon: true };
}

// ---------- The freeze, and the secret U ----------
// fight.moonFreeze: { misses (in a row), swing (when your last swing
// started), judged (whether we've seen how it went), proof (U was pressed) }
function moonFreezeCfg(f) { return { ...MOON_FREEZE_DEFAULT, ...((f.def && f.def.freeze) || {}) }; }
function moonFreezeState(f) {
  return f.moonFreeze || (f.moonFreeze = { misses: 0, swing: f.p.lastAttack || 0, judged: true, proof: false, frozenAt: 0 });
}
// Runs every frame of the fight (the foe's update): did your last swing land?
function moonFreezeUpdate(f, now) {
  if (f.phase !== 'fight') return;
  const fz = moonFreezeState(f), cfg = moonFreezeCfg(f), p = f.p;
  // still frozen: a hit doesn't thaw you out
  if (now < (p.frozenUntil || 0) && p.act !== 'frozen' && p.act !== 'ko') { p.act = 'frozen'; return; }
  if (p.lastAttack && p.lastAttack !== fz.swing) { fz.swing = p.lastAttack; fz.judged = false; }
  if (fz.judged || now - fz.swing < P_STARTUP + 20) return;
  fz.judged = true;
  const landed = (f.b.lastHit || 0) >= fz.swing;
  fz.misses = landed ? 0 : fz.misses + 1;
  if (landed || fz.misses < cfg.misses) return;
  fz.misses = 0;
  if (fz.proof) {
    fightPop(f, '🙈 NO FREEZE!', p.x, 420, '#B3E5FC', 0.8);
    return;
  }
  // FREEZE! You can't move, swing or block for a while
  p.act = 'frozen';
  p.actStart = now;
  p.frozenUntil = now + cfg.ms;
  fz.frozenAt = now;
  f.bossThinkAt = Math.min(f.bossThinkAt, now + 250);
  fightPop(f, 'FROZEN! 🥶', p.x, 380, '#81D4FA', 1.2);
  if (f.def && f.def.freezePhrases) fightSay(f, pickOne(f.def.freezePhrases), 1400);
  f.shake = 6;
}
// U during the intro (or right after FIGHT!): it can't freeze you this fight
function moonCheatKey(f, e) {
  const cfg = moonFreezeCfg(f);
  if (String(e.key).toLowerCase() !== String(cfg.cheatKey).toLowerCase()) return false;
  const early = f.phase === 'intro' || (f.phase === 'fight' && performance.now() - f.phaseStart < cfg.cheatMs);
  const fz = moonFreezeState(f);
  if (!early || fz.proof) return false;
  fz.proof = true;
  fightPop(f, '🙈 MOON-PROOF! NO FREEZING!', f.p.x, 430, '#FFF59D', 0.9);
  if (f.def && f.def.cheatPhrases) fightSay(f, pickOne(f.def.cheatPhrases), 1400);
  return true;
}

// The fight with the Moon (see blobFoe for what a foe has)
function moonFoe(noSword) {
  const level = moonLevel();
  const def = moonCfg();
  return {
    id: def.id || 'moon', def, level, noSword,
    tune: moonTuning(level),
    label: def.label || 'MOON',
    intro: f => `🌙 Level ${f.level} ${def.name}: don't swing and miss!`,
    draw: (v, f, now) => drawFightMoon(v, f, now),
    arena: (v, now) => drawMoonArena(v, now),
    update: (f, now) => moonFreezeUpdate(f, now),
    onKey: (f, e) => moonCheatKey(f, e),
    begin: f => {
      if (!noSword) return;
      f.winner = 'boss';
      f.b.score = f.toWin;
      f.p.act = 'ko';
      f.p.actStart = performance.now();
      finishFight(false);
    },
    finish: (f, res, won) => moonFinish(f, res, won),
    end: won => {
      const now = performance.now();
      moon.where = 'home';
      moon.shout = null;
      moon.homeUntil = now + (won ? randBetween(30000, 45000) : randBetween(12000, 22000));
      moon.graceUntil = now + 6000;
    },
    after: won => {
      if (won) {
        kitchenToast(`The ${def.name} sinks back into its crater, all dim and dizzy! 🏆`);
        return;
      }
      const to = def.sendTo || { map: 'assets/camp_level4.json', hotspot: 'throne' };
      switchMap(to.map, to.hotspot);
      kitchenToast('Back at the Fourth Camp! Beat the Slime Brick at Level 20 to open the portal again. 🌀');
    }
  };
}

function moonFinish(f, res, won) {
  const def = f.def;
  if (f.foe.noSword) res.lines.push({ text: `You had no sword, so the ${def.name} won straight away! 🗡️`, color: '#FFE082' });
  if (won) {
    const before = moonLevel();
    moonWins++;
    giveFightReward(def.reward || DEFAULT_BOSS_REWARD, def.lair, res, 'in the Moon\'s crater');
    res.lines.push({
      text: moonLevel() > before ? `The ${def.name} is getting brighter! 🌕 Next time it's Level ${moonLevel()} of ${MOON_LEVEL_MAX}.`
        : `That's the brightest Moon there is (Level ${MOON_LEVEL_MAX}), and you beat it! ⭐`,
      color: '#B3E5FC'
    });
  } else {
    gobbleBackpackCoins(res, `The ${def.name}`);
    lockLevel5();
    res.lines.push({ text: '🌀 Back to the Fourth Camp you go! Beat the Slime Brick at Level 20 to open the portal again.', color: '#CE93D8' });
  }
  f.foe.gloat = fled => ({
    text: `"${pickOne((fled ? def.fledPhrases : def.winPhrases) || ['RARR!'])}" says the ${def.name}`,
    color: '#FFF59D'
  });
}

registerFrameUpdate(12, () => updateMoon());
onGameEvent('camperChosen', () => { moon.map = null; nearMoon = false; });
onGameEvent('mapArrive', () => { moon.map = null; });
// Space / tap next to it picks a fight
registerMapFoe(() => {
  if (!nearMoon || !moonOut()) return null;
  return {
    engage: () => engageMoon(false),
    hit(sx, sy) {
      const p = moonPos();
      const h = moonHeight();
      return Math.hypot(sx - (p.x - camera.x), sy - (p.y - h / 2 - camera.y)) < h * 0.7;
    },
    drawHint: () => drawMoonHint()
  };
});
// The keypad says "HURRY!" while it's coming (codes.js)
CODE_PAD_DANGERS.push(() => {
  if (!moonOut() || moon.where !== 'out') return '';
  const p = moonPos();
  return Math.hypot(player.x - p.x, player.y - p.y) < (moonCfg().sniff || 600) * bossK() ? '⚠️ The Moon is coming! HURRY!' : '';
});
