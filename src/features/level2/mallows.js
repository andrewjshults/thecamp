// ============================================================
// THE MARSHMALLOWS — the bosses of the second camp
// ============================================================
// A map JSON may have `marshmallows` (see docs/level-two.md):
//   "marshmallows": {
//     "lair": "blob_zone",                       // hotspot they live in (and come out of)
//     "safeZone": { "px", "py", "pw", "ph" },    // they can't go in here (the sleeping tents)
//     "foes": [ { "id", "name", "aka", "kid", "label", "phrases", "hitPhrases", ...,
//                 "pointsToWin", "reward", "size", "chase", "wander", "sniff",
//                 "firstOut", "outFor", "restFor", "winPhrases", "fledPhrases", "grumblePhrases" } ]
//   }
// Each foe comes out of the lair now and then, wanders, and chases you when
// it smells you (unless you're in the safe zone). If it catches you, it's a
// fight, even if you have no sword: then you lose straight away. Lose (or
// run away) and it eats the coins in your backpack, and you're sent back to
// the first camp: the cave stays shut until you beat the Blob again.
// They're the same for every camper in a multiplayer world, but each
// camper's computer runs its own Marshmallows (friends don't see yours).

// Levels carry on from the Blob's (which tops out at 5): the big Marshmallow
// starts at 6 and gets tougher with every win, up to 10. Its kid is the same
// level but weaker and faster (kidTuning). Tuned with tools/fight-sim.js.
const MALLOW_LEVEL_MIN = 6;
const MALLOW_LEVEL_MAX = 10;
const MALLOW_TUNE_LOW = { strength: 6, block: 0.3, armor: 0.62, windup: 0.6, think: 0.66, tough: 0.26, regen: 0.58, speed: 1.28, counter: 0.93 };
const MALLOW_TUNE_TOP = { strength: 7, block: 0.36, armor: 0.72, windup: 0.58, think: 0.66, tough: 0.32, regen: 0.5, speed: 1.38, counter: 0.98 };
let mallowWins = 0;    // fights won against the big Marshmallow (saved per camper)
registerSaveField('mallowWins', {
  save: () => mallowWins,
  load: s => { mallowWins = Math.max(0, Math.floor(Number(s.mallowWins) || 0)); }
});
function mallowLevel() { return Math.min(MALLOW_LEVEL_MIN + mallowWins, MALLOW_LEVEL_MAX); }
function mallowTuning(level) {
  const u = clamp((level - MALLOW_LEVEL_MIN) / (MALLOW_LEVEL_MAX - MALLOW_LEVEL_MIN), 0, 1);
  const out = { ...BOSS_TUNE_BASE };
  for (const k of Object.keys(MALLOW_TUNE_TOP)) out[k] = MALLOW_TUNE_LOW[k] + (MALLOW_TUNE_TOP[k] - MALLOW_TUNE_LOW[k]) * u;
  out.strength = Math.round(out.strength);
  return out;
}
// The kid: weaker (less strength, less tough, blocks and armors less) but
// faster (walks, thinks and winds up quicker). It also needs fewer points to
// win (its `pointsToWin` in the map JSON).
function kidTuning(level) {
  const t = mallowTuning(level);
  return {
    ...t,
    strength: t.strength - 2,
    speed: t.speed * 1.4,
    think: t.think * 0.75,
    windup: t.windup * 0.85,
    block: t.block * 0.7,
    armor: t.armor * 0.7,
    tough: t.tough * 0.6
  };
}

const mallows = {
  map: null,          // which map they were set up on
  foes: [],           // { def, where: 'home'|'out'|'returning', fx, fy, facing, walk, moving, target,
                      //   homeUntil, outUntil, shout, nextShoutAt, lastT }
  graceUntil: 0       // they leave you alone until then (just arrived, just fought)
};
let nearMallow = null;   // the one close enough to pick a fight with

function mallowCfg() { return (mapConfig && mapConfig.marshmallows) || null; }
function mallowLair() {
  const c = mallowCfg();
  return c ? interactiveObjects.find(o => o.id === c.lair) || null : null;
}
function lairMouth() {
  const l = mallowLair();
  return { x: l.x + l.width / 2, y: l.y + l.height * 0.6 };
}
function mallowPos(m) { return { x: m.fx * scaledMapW, y: m.fy * scaledMapH }; }
function mallowHeight(m) { return mapBossHeight() * (m.def.size || 1); }
function mallowsOut() {
  if (!mallowCfg() || mallows.map !== currentMapPath) return [];
  return mallows.foes.filter(m => m.where === 'out' || m.where === 'returning');
}
function mallowSays(m, kind) {
  const list = m.def[kind];
  return pickOne(list && list.length ? list : ['ROAST YOU!']);
}
function mallowShout(m, text, dur) {
  m.shout = { text, start: performance.now(), dur: dur || 1600 };
}

function resetMallows() {
  const now = performance.now();
  mallows.map = currentMapPath;
  mallows.graceUntil = now + 5000;
  mallows.foes = (mallowCfg().foes || []).map(def => ({
    def, where: 'home', fx: 0, fy: 0, facing: 'left', walk: 0, moving: false, target: null,
    homeUntil: now + randBetween(...(def.firstOut || [6000, 12000])),
    outUntil: 0, shout: null, nextShoutAt: 0, lastT: now
  }));
  nearMallow = null;
}

// --- The safe zone (the sleeping tents): they can't go in ---
function safeZoneRect() {
  const z = mallowCfg() && mallowCfg().safeZone;
  return z ? { x: z.px * scaledMapW, y: z.py * scaledMapH, w: z.pw * scaledMapW, h: z.ph * scaledMapH, z } : null;
}
function inSafeZone(x, y) {
  const r = safeZoneRect();
  return !!r && x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
}
// Push a point that's inside the zone out through its nearest side (not a
// side that's the edge of the map)
function outOfSafeZone(x, y, pad) {
  const r = safeZoneRect();
  if (!r || !inSafeZone(x, y)) return { x, y };
  const ways = [];
  if (r.z.px > 0.001) ways.push({ d: x - r.x, x: r.x - pad, y });
  if (r.z.px + r.z.pw < 0.999) ways.push({ d: r.x + r.w - x, x: r.x + r.w + pad, y });
  if (r.z.py > 0.001) ways.push({ d: y - r.y, x, y: r.y - pad });
  if (r.z.py + r.z.ph < 0.999) ways.push({ d: r.y + r.h - y, x, y: r.y + r.h + pad });
  ways.sort((a, b) => a.d - b.d);
  return ways[0] || { x, y };
}
function randomWanderTarget() {
  for (let i = 0; i < 8; i++) {
    const fx = randBetween(0.06, 0.94), fy = randBetween(0.12, 0.94);
    if (!inSafeZone(fx * scaledMapW, fy * scaledMapH)) return { fx, fy };
  }
  const m = lairMouth();
  return { fx: m.x / scaledMapW, fy: m.y / scaledMapH };
}

function updateMallows() {
  nearMallow = null;
  // Bosses off (exploration mode): they stay away, and start over (with a
  // few seconds' grace) once they're back on
  if (foesOff()) { mallows.map = null; return; }
  const cfg = mallowCfg();
  if (!cfg || !player.character || !mallowLair()) return;
  const now = performance.now();
  if (mallows.map !== currentMapPath) resetMallows();
  const k = bossK();
  let best = Infinity;
  for (const m of mallows.foes) {
    const d = stepMallow(m, now, k);
    if (d < 190 * k * (m.def.size || 1) + 20 && d < best) { best = d; nearMallow = m; }
  }
}

// Moves one Marshmallow; returns how far it is from you (Infinity when it's home)
function stepMallow(m, now, k) {
  const dt = Math.min(50, now - (m.lastT || now));
  m.lastT = now;
  if (m.shout && now - m.shout.start > m.shout.dur) m.shout = null;
  m.moving = false;
  const def = m.def;

  if (m.where === 'home') {
    if (now < m.homeUntil) return Infinity;
    // Out it pops, from the hole in the middle of the Blob Fight Zone
    const mouth = lairMouth();
    m.fx = mouth.x / scaledMapW;
    m.fy = mouth.y / scaledMapH;
    m.where = 'out';
    m.outUntil = now + randBetween(...(def.outFor || [30000, 50000]));
    m.target = null;
    mallowShout(m, mallowSays(m, 'phrases'));
    m.nextShoutAt = now + randBetween(2500, 4000);
    return Infinity;
  }

  const pos = mallowPos(m);
  const dist = Math.hypot(player.x - pos.x, player.y - pos.y);
  const youSafe = inSafeZone(player.x, player.y);
  const hunting = state === GameState.PLAYING && now >= mallows.graceUntil && !youSafe;
  if (m.where === 'out' && now > m.outUntil) m.where = 'returning';

  let tx, ty, speed;   // speed: map px per 60fps frame (you walk at 4)
  const sniff = (def.sniff || 500) * k;
  if (m.where === 'returning') {
    const mouth = lairMouth();
    tx = mouth.x; ty = mouth.y; speed = (def.wander || 1.7) * 1.4 * k;
    if (Math.hypot(tx - pos.x, ty - pos.y) < 6 * k) {
      m.where = 'home';
      m.homeUntil = now + randBetween(...(def.restFor || [12000, 25000]));
      m.shout = null;
      return Infinity;
    }
  } else if (hunting && dist < sniff) {
    // Smells you! Chase, shouting
    tx = player.x; ty = player.y; speed = (def.chase || 2.8) * k;
    if (now >= m.nextShoutAt) {
      mallowShout(m, mallowSays(m, 'phrases'));
      m.nextShoutAt = now + randBetween(2200, 3600);
    }
  } else {
    if (youSafe && dist < sniff && now >= m.nextShoutAt) {
      // You're hiding in the tents: it grumbles at the edge
      mallowShout(m, mallowSays(m, 'grumblePhrases'));
      m.nextShoutAt = now + randBetween(3500, 6000);
    }
    const t = m.target;
    if (!t || Math.hypot(t.fx * scaledMapW - pos.x, t.fy * scaledMapH - pos.y) < 10) m.target = randomWanderTarget();
    tx = m.target.fx * scaledMapW; ty = m.target.fy * scaledMapH; speed = (def.wander || 1.7) * k;
  }
  const dx = tx - pos.x, dy = ty - pos.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.5) {
    const step = Math.min(d, speed * dt * 0.06);
    const to = outOfSafeZone(pos.x + dx / d * step, pos.y + dy / d * step, 2);
    m.fx = clamp(to.x / scaledMapW, 0.01, 0.99);
    m.fy = clamp(to.y / scaledMapH, 0.03, 0.99);
    if (Math.abs(dx) > 2) m.facing = dx < 0 ? 'left' : 'right';
    m.walk += dt / 1000;
    m.moving = true;
  }

  // Caught you! (Not on its way home, and never in the tents.)
  if (m.where === 'out' && hunting && dist < 55 * k * Math.max(0.8, m.def.size || 1) && !doorOpening) engageMallow(m, true);
  return dist;
}

// It yells, then the fight view opens (update() → startFight(bossEngage.foe)).
// `auto`: it caught you. With no sword you can't pick a fight, but if it
// catches you, you lose straight away.
function engageMallow(m, auto) {
  if (state !== GameState.PLAYING || bossEngage || doorOpening || foesOff()) return;
  let noSword = false;
  if (swordRating <= 0 && !equipSpareSword()) {
    if (!auto) {
      kitchenToast('🗡️ You have no sword! Run to the sleeping tents, they can\'t go in there! ⛺');
      return;
    }
    noSword = true;
  }
  const pos = mallowPos(m);
  m.where = 'out';
  m.facing = player.x < pos.x ? 'left' : 'right';
  player.facing = player.x < pos.x ? 'right' : 'left';
  player.walking = false;
  player.frame = 0;
  tapTarget = null;
  backpackOpen = false;
  journalOpen = false;
  mallowShout(m, mallowSays(m, 'phrases'), BOSS_ENGAGE_MS + 200);
  bossEngage = { start: performance.now(), foe: mallowFoe(m, noSword), mallow: m };
}

// The fight with Marshmallow `m` (see blobFoe for what a foe has)
function mallowFoe(m, noSword) {
  const level = mallowLevel();
  const def = m.def;
  return {
    id: def.id, def, level, noSword,
    tune: def.kid ? kidTuning(level) : mallowTuning(level),
    label: def.label || 'MEGA',
    intro: f => def.kid ? `🔥 Level ${f.level} ${def.name}: small but SO fast!` : `🔥 Level ${f.level} ${def.name}: hotter than ever!`,
    draw: (v, f, now) => drawFightMallow(v, f, now),
    arena: (v, now) => drawCampfireArena(v, now),
    // No sword: it's over before it starts
    begin: f => {
      if (!noSword) return;
      f.winner = 'boss';
      f.b.score = f.toWin;
      f.p.act = 'ko';
      f.p.actStart = performance.now();
      finishFight(false);
    },
    finish: (f, res, won, fled) => mallowFinish(m, f, res, won, fled),
    end: won => {
      const now = performance.now();
      m.where = 'home';
      m.shout = null;
      m.homeUntil = now + (won ? randBetween(25000, 45000) : randBetween(12000, 25000));
      mallows.graceUntil = now + 6000;
    },
    after: won => {
      if (won) {
        kitchenToast(`${def.name} bounces back into its hole, sizzling! 🏆`);
        return;
      }
      switchMap(MP_MAIN_MAP, 'cave');
      kitchenToast('Back at the first camp! Beat the Blob again to open the secret passage. 🕳️');
    }
  };
}

function mallowFinish(m, f, res, won) {
  const def = m.def;
  if (f.foe.noSword) {
    res.lines.push({ text: `You had no sword, so ${def.name} won straight away! 🗡️`, color: '#FFE082' });
  }
  if (won) {
    const before = mallowLevel();
    if (!def.kid) mallowWins++;
    giveFightReward(def.reward || DEFAULT_BOSS_REWARD, mallowCfg().lair, res, 'in the Blob Fight Zone');
    res.lines.push({
      text: def.kid ? `${def.name} runs home crying for its mommy! 😭`
        : mallowLevel() > before ? `${def.name} is getting hotter! 🔥 Next time it's Level ${mallowLevel()} of ${MALLOW_LEVEL_MAX}.`
        : `That's the hottest Marshmallow there is (Level ${MALLOW_LEVEL_MAX}), and you beat it! ⭐`,
      color: '#B3E5FC'
    });
  } else {
    gobbleBackpackCoins(res, def.name);
    lockLevel2();
    res.lines.push({ text: '🕳️ Back to the first camp you go! Beat the Blob again to open the secret passage.', color: '#CE93D8' });
  }
  f.foe.gloat = fled => ({
    text: `"${pickOne((fled ? def.fledPhrases : def.winPhrases) || ['toasty!'])}" says ${def.name}`,
    color: '#FFAB40'
  });
}

registerMapUpdate(12, () => updateMallows());
onGameEvent('camperChosen', () => { mallows.map = null; nearMallow = null; });
onGameEvent('mapArrive', () => { mallows.map = null; });
// Space / tap next to one picks a fight
registerMapFoe(() => {
  const m = nearMallow;
  if (!m || !mallowsOut().includes(m)) return null;
  return {
    engage: () => engageMallow(m, false),
    hit(sx, sy) {
      const p = mallowPos(m);
      const h = mallowHeight(m);
      return Math.hypot(sx - (p.x - camera.x), sy - (p.y - h / 2 - camera.y)) < h * 0.7;
    },
    drawHint: () => drawMallowHint(m)
  };
});
