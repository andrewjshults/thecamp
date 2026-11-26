// ============================================================
// THE BRICK — the boss of the third camp, who never leaves its castle
// ============================================================
// The castle room (assets/level3_castle.json) has a `brick` object (see
// docs/level-three.md):
//   "brick": {
//     "home": "throne",                        // hotspot it sits in front of
//     "zone": { "px", "py", "pw", "ph" },      // the floor of the hall: it chases you in here
//     "id", "name", "aka", "label", "chase", "sniff", "grace", "size",
//     "pointsToWin", "reward", "phrases", "hitPhrases", ... (like a boss)
//   }
// It sits on its throne. Walk into the hall and it stomps after you; if it
// catches you, it's a fight (no sword: you lose straight away). Space next
// to it picks the fight yourself. It never comes outside: leave the hall (or
// the castle) and it goes back to its throne.
//
// Win → a $30 coin, and it gets one level tougher. Lose or run away → it
// eats the coins in your backpack, you're sent back to the Second Camp, and
// the passage down to the Third Camp shuts until you beat Mega Mallow again.
//
// Levels carry on from the Marshmallows' (6–10): the Brick starts at 11 and
// gets tougher with every win, up to 15. Tuned with tools/fight-sim.js.
const BRICK_LEVEL_MIN = 11;
const BRICK_LEVEL_MAX = 15;
const BRICK_TUNE_LOW = { strength: 10, block: 0.38, armor: 0.75, windup: 0.58, think: 0.66, tough: 0.36, regen: 0.48, speed: 1.35, counter: 0.98 };
const BRICK_TUNE_TOP = { strength: 13, block: 0.46, armor: 0.84, windup: 0.56, think: 0.64, tough: 0.46, regen: 0.42, speed: 1.42, counter: 1.01 };
let brickWins = 0;     // fights won against the Brick (saved per camper)
registerSaveField('brickWins', {
  save: () => brickWins,
  load: s => { brickWins = Math.max(0, Math.floor(Number(s.brickWins) || 0)); }
});
function brickLevel() { return Math.min(BRICK_LEVEL_MIN + brickWins, BRICK_LEVEL_MAX); }
function brickTuning(level) {
  const u = clamp((level - BRICK_LEVEL_MIN) / (BRICK_LEVEL_MAX - BRICK_LEVEL_MIN), 0, 1);
  const out = { ...BOSS_TUNE_BASE };
  for (const k of Object.keys(BRICK_TUNE_TOP)) out[k] = BRICK_TUNE_LOW[k] + (BRICK_TUNE_TOP[k] - BRICK_TUNE_LOW[k]) * u;
  out.strength = Math.round(out.strength);
  return out;
}

const brick = {
  map: null,          // the map it was set up on
  where: 'home',      // 'home' (on its throne) | 'out' (stomping after you) | 'returning'
  fx: 0, fy: 0, facing: 'left', walk: 0, moving: false,
  shout: null, nextShoutAt: 0, lastT: 0,
  restUntil: 0,       // it stays on its throne until then (just fought)
  graceUntil: 0       // it leaves you alone until then (just came in)
};
let nearBrick = false;   // close enough to pick a fight with

function brickCfg() { return (mapConfig && mapConfig.brick) || null; }
function brickThrone() {
  const c = brickCfg();
  return c ? interactiveObjects.find(o => o.id === c.home) || null : null;
}
function brickSeat() {
  const t = brickThrone();
  return { x: t.x + t.width / 2, y: t.y + t.height * 0.98 };
}
function brickPos() { return { x: brick.fx * scaledMapW, y: brick.fy * scaledMapH }; }
function brickHeight() { return mapBossHeight() * ((brickCfg() && brickCfg().size) || 1.15); }
function brickHere() { return !!brickCfg() && brick.map === currentMapPath && !foesOff(); }
function brickSays(kind) {
  const list = brickCfg() && brickCfg()[kind];
  return pickOne(list && list.length ? list : ['BRICK SMASH!']);
}
function brickShout(text, dur) { brick.shout = { text, start: performance.now(), dur: dur || 1600 }; }

function resetBrick() {
  const now = performance.now();
  const seat = brickSeat();
  Object.assign(brick, {
    map: currentMapPath, where: 'home', fx: seat.x / scaledMapW, fy: seat.y / scaledMapH, facing: 'left',
    walk: 0, moving: false, shout: null, nextShoutAt: 0, lastT: now,
    graceUntil: now + ((brickCfg().grace) || 2500)
  });
  nearBrick = false;
}

function brickZone() {
  const z = brickCfg().zone;
  return { x: z.px * scaledMapW, y: z.py * scaledMapH, w: z.pw * scaledMapW, h: z.ph * scaledMapH };
}
function inBrickZone(x, y) {
  const r = brickZone();
  return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
}

function updateBrick() {
  nearBrick = false;
  if (foesOff()) { brick.map = null; return; }     // exploration mode: it starts over once it's back on
  const cfg = brickCfg();
  if (!cfg || !player.character || !brickThrone()) return;
  if (brick.map !== currentMapPath) resetBrick();
  const now = performance.now();
  const dt = Math.min(50, now - (brick.lastT || now));
  brick.lastT = now;
  if (brick.shout && now - brick.shout.start > brick.shout.dur) brick.shout = null;
  brick.moving = false;
  const k = bossK();
  const pos = brickPos();
  const dist = Math.hypot(player.x - pos.x, player.y - pos.y);
  const hunting = state === GameState.PLAYING && now >= brick.graceUntil && now >= brick.restUntil &&
    inBrickZone(player.x, player.y) && !doorOpening;
  const sniff = (cfg.sniff || 900) * k;

  let tx, ty, speed;
  if (hunting && dist < sniff) {
    if (brick.where === 'home') {
      brickShout(brickSays('phrases'));
      brick.nextShoutAt = now + randBetween(2200, 3600);
    }
    brick.where = 'out';
    tx = player.x; ty = player.y; speed = (cfg.chase || 2.4) * k;
    if (now >= brick.nextShoutAt) {
      brickShout(brickSays('phrases'));
      brick.nextShoutAt = now + randBetween(2200, 3600);
    }
  } else if (brick.where !== 'home') {
    // Back to its throne
    brick.where = 'returning';
    const seat = brickSeat();
    tx = seat.x; ty = seat.y; speed = (cfg.chase || 2.4) * 0.7 * k;
    if (Math.hypot(tx - pos.x, ty - pos.y) < 6 * k) {
      brick.where = 'home';
      brick.facing = 'left';
      return;
    }
  }
  if (tx !== undefined) {
    const dx = tx - pos.x, dy = ty - pos.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const step = Math.min(d, speed * dt * 0.06);
      const z = brickZone(), seat = brickSeat();
      // it stays in its hall (between the throne and the far wall)
      const nx = clamp(pos.x + dx / d * step, z.x, z.x + z.w);
      const ny = clamp(pos.y + dy / d * step, Math.min(seat.y, z.y), z.y + z.h);
      brick.fx = nx / scaledMapW;
      brick.fy = ny / scaledMapH;
      if (Math.abs(dx) > 2) brick.facing = dx < 0 ? 'left' : 'right';
      brick.walk += dt / 1000;
      brick.moving = true;
    }
  }
  const reach = 190 * k * (cfg.size || 1.15);
  nearBrick = dist < reach && state === GameState.PLAYING;
  // Caught you!
  if (brick.where === 'out' && hunting && dist < 60 * k * (cfg.size || 1.15)) engageBrick(true);
}

// It yells, then the fight view opens (update() → startFight(bossEngage.foe)).
// `auto`: it caught you (with no sword, you lose straight away).
function engageBrick(auto) {
  if (state !== GameState.PLAYING || bossEngage || doorOpening || foesOff()) return;
  let noSword = false;
  if (swordRating <= 0 && !equipSpareSword()) {
    if (!auto) {
      kitchenToast('🗡️ You have no sword! Run out of the castle! 🏃');
      return;
    }
    noSword = true;
  }
  const pos = brickPos();
  brick.where = 'out';
  brick.facing = player.x < pos.x ? 'left' : 'right';
  player.facing = player.x < pos.x ? 'right' : 'left';
  player.walking = false;
  player.frame = 0;
  tapTarget = null;
  backpackOpen = false;
  journalOpen = false;
  brickShout(brickSays('phrases'), BOSS_ENGAGE_MS + 200);
  bossEngage = { start: performance.now(), foe: brickFoe(noSword), brick: true };
}

// The fight with the Brick (see blobFoe for what a foe has)
function brickFoe(noSword) {
  const level = brickLevel();
  const def = brickCfg();
  return {
    id: def.id || 'brick', def, level, noSword,
    tune: brickTuning(level),
    label: def.label || 'BRICK',
    intro: f => `🧱 Level ${f.level} ${def.name}: hard as a rock!`,
    draw: (v, f, now) => drawFightBrick(v, f, now),
    arena: (v, now) => drawCastleArena(v, now),
    begin: f => {
      if (!noSword) return;
      f.winner = 'boss';
      f.b.score = f.toWin;
      f.p.act = 'ko';
      f.p.actStart = performance.now();
      finishFight(false);
    },
    finish: (f, res, won) => brickFinish(f, res, won),
    end: won => {
      const now = performance.now();
      brick.where = 'returning';
      brick.shout = null;
      brick.restUntil = now + (won ? randBetween(30000, 45000) : randBetween(8000, 15000));
      brick.graceUntil = now + 4000;
    },
    after: won => {
      if (won) {
        kitchenToast(`${def.name} stomps back to its throne, all cracked! 🏆`);
        return;
      }
      switchMap('assets/camp_level2.json', 'blob_zone');
      kitchenToast('Back at the Second Camp! Beat Mega Mallow at Level 10 to open the hole again. 🕳️');
    }
  };
}

function brickFinish(f, res, won) {
  const def = f.def;
  if (f.foe.noSword) res.lines.push({ text: `You had no sword, so ${def.name} won straight away! 🗡️`, color: '#FFE082' });
  if (won) {
    const before = brickLevel();
    brickWins++;
    giveFightReward(def.reward || DEFAULT_BOSS_REWARD, def.home, res, 'by the throne');
    res.lines.push({
      text: brickLevel() > before ? `${def.name} is getting harder! 🧱 Next time it's Level ${brickLevel()} of ${BRICK_LEVEL_MAX}.`
        : `That's the hardest Brick there is (Level ${BRICK_LEVEL_MAX}), and you beat it! ⭐`,
      color: '#B3E5FC'
    });
  } else {
    gobbleBackpackCoins(res, def.name);
    lockLevel3();
    res.lines.push({ text: '🕳️ Back to the Second Camp you go! Beat Mega Mallow at Level 10 to open the hole again.', color: '#CE93D8' });
  }
  f.foe.gloat = fled => ({
    text: `"${pickOne((fled ? def.fledPhrases : def.winPhrases) || ['THUD!'])}" says ${def.name}`,
    color: '#FF8A65'
  });
}

registerMapUpdate(13, () => updateBrick());
onGameEvent('camperChosen', () => { brick.map = null; brick.restUntil = 0; nearBrick = false; });
onGameEvent('mapArrive', () => { brick.map = null; });
// Space / tap next to it picks a fight
registerMapFoe(() => {
  if (!nearBrick || !brickHere()) return null;
  return {
    engage: () => engageBrick(false),
    hit(sx, sy) {
      const p = brickPos();
      const h = brickHeight();
      return Math.hypot(sx - (p.x - camera.x), sy - (p.y - h / 2 - camera.y)) < h * 0.7;
    },
    drawHint: () => drawBrickHint()
  };
});
