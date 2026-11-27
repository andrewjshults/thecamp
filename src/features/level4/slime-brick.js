// ============================================================
// THE SLIME BRICK — the boss of the fourth camp, who oozes all over it
// ============================================================
// The fourth camp's map has a `slimeBrick` object (see docs/level-four.md):
//   "slimeBrick": {
//     "lair": "slime_den",                       // hotspot it lives in (and comes out of)
//     "safeZones": [ { "px", "py", "pw", "ph",   // it can't go in these (the Safe Zone's yard)
//                      "grumblePhrases" } ],
//     "sendTo": { "map", "hotspot" },            // where you go when you lose
//     "id", "name", "aka", "label", "size", "chase", "wander", "sniff",
//     "firstOut", "outFor", "restFor", "pointsToWin", "reward", "phrases", ... (like a boss)
//   }
// It comes out of its den now and then, wanders the whole camp, and chases you
// when it smells you (unless you're in the Safe Zone). It doesn't stop while
// you're typing a door's code (codes.js): it keeps coming, and if it catches
// you there the keypad closes and it's a fight. With no sword you lose
// straight away. Each camper's computer runs its own Slime Brick.
//
// Win → a $40 coin (Level 4 × $10), and it gets one level tougher. Lose or run away → it eats
// the coins in your backpack, you're sent back to the Third Camp, and the
// castle's trapdoor shuts until you beat the Brick at its top level again.
//
// Levels carry on from the Brick's (11–15): the Slime Brick starts at 16 and
// gets tougher with every win, up to 20. Tuned with tools/fight-sim.js.
const SLIME_LEVEL_MIN = 16;
const SLIME_LEVEL_MAX = 20;
const SLIME_TUNE_LOW = { strength: 13, block: 0.45, armor: 0.82, windup: 0.57, think: 0.65, tough: 0.42, regen: 0.45, speed: 1.4, counter: 1.0 };
const SLIME_TUNE_TOP = { strength: 15, block: 0.5, armor: 0.88, windup: 0.55, think: 0.63, tough: 0.52, regen: 0.39, speed: 1.48, counter: 1.03 };
let slimeWins = 0;     // fights won against the Slime Brick (saved per camper)
registerSaveField('slimeWins', {
  save: () => slimeWins,
  load: s => { slimeWins = Math.max(0, Math.floor(Number(s.slimeWins) || 0)); }
});
function slimeLevel() { return Math.min(SLIME_LEVEL_MIN + slimeWins, SLIME_LEVEL_MAX); }
function slimeTuning(level) {
  const u = clamp((level - SLIME_LEVEL_MIN) / (SLIME_LEVEL_MAX - SLIME_LEVEL_MIN), 0, 1);
  const out = { ...BOSS_TUNE_BASE };
  for (const k of Object.keys(SLIME_TUNE_TOP)) out[k] = SLIME_TUNE_LOW[k] + (SLIME_TUNE_TOP[k] - SLIME_TUNE_LOW[k]) * u;
  out.strength = Math.round(out.strength);
  return out;
}

const slime = {
  map: null,          // the map it was set up on
  where: 'home',      // 'home' (in its den) | 'out' | 'returning'
  fx: 0, fy: 0, facing: 'left', walk: 0, moving: false, target: null,
  homeUntil: 0, outUntil: 0, shout: null, nextShoutAt: 0, lastT: 0,
  graceUntil: 0,      // it leaves you alone until then (just arrived, just fought)
  restUntil: 0        // it stays in its den until then, whatever map you're on (tests set Infinity)
};
let nearSlime = false;   // close enough to pick a fight with

function slimeCfg() { return (mapConfig && mapConfig.slimeBrick) || null; }
function slimeDen() {
  const c = slimeCfg();
  return c ? interactiveObjects.find(o => o.id === c.lair) || null : null;
}
function slimeDenMouth() {
  const d = slimeDen();
  return { x: d.x + d.width / 2, y: d.y + d.height * 0.6 };
}
function slimePos() { return { x: slime.fx * scaledMapW, y: slime.fy * scaledMapH }; }
function slimeHeight() { return mapBossHeight() * ((slimeCfg() && slimeCfg().size) || 1.2); }
function slimeHere() { return !!slimeCfg() && slime.map === currentMapPath && !foesOff(); }
function slimeOut() { return slimeHere() && (slime.where === 'out' || slime.where === 'returning'); }
function slimeSays(kind) {
  const list = slimeCfg() && slimeCfg()[kind];
  return pickOne(list && list.length ? list : ['SLIME TIME!']);
}
function slimeShout(text, dur) { slime.shout = { text, start: performance.now(), dur: dur || 1600 }; }

function resetSlime() {
  const now = performance.now();
  const c = slimeCfg();
  Object.assign(slime, {
    map: currentMapPath, where: 'home', fx: 0, fy: 0, facing: 'left', walk: 0, moving: false, target: null,
    homeUntil: now + randBetween(...(c.firstOut || [6000, 11000])), outUntil: 0,
    shout: null, nextShoutAt: 0, lastT: now, graceUntil: now + 5000
  });
  nearSlime = false;
}

// --- The safe zones (the Safe Zone's yard): it can't go in ---
function slimeSafeRects() {
  const c = slimeCfg();
  return ((c && c.safeZones) || []).map(z => ({ x: z.px * scaledMapW, y: z.py * scaledMapH, w: z.pw * scaledMapW, h: z.ph * scaledMapH, z }));
}
function slimeSafeAt(x, y) {
  return slimeSafeRects().find(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) || null;
}
// Push a point that's inside a zone out through its nearest side (not a side at the map's edge)
function outOfSlimeSafe(x, y, pad) {
  for (const r of slimeSafeRects()) {
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
function slimeWanderTarget() {
  for (let i = 0; i < 8; i++) {
    const fx = randBetween(0.06, 0.94), fy = randBetween(0.12, 0.94);
    if (!slimeSafeAt(fx * scaledMapW, fy * scaledMapH)) return { fx, fy };
  }
  const m = slimeDenMouth();
  return { fx: m.x / scaledMapW, fy: m.y / scaledMapH };
}

// You're out on the map (walking, or typing a door's code): it can get you
function slimeCanHunt() {
  return state === GameState.PLAYING || state === GameState.CODE_PAD;
}

function updateSlime() {
  nearSlime = false;
  if (devMode) return;
  if (foesOff()) { slime.map = null; return; }     // exploration mode: it starts over once it's back on
  const cfg = slimeCfg();
  if (!cfg || !player.character || !slimeDen()) return;
  if (state !== GameState.PLAYING && state !== GameState.CODE_PAD) return;
  const now = performance.now();
  if (slime.map !== currentMapPath) resetSlime();
  const dt = Math.min(50, now - (slime.lastT || now));
  slime.lastT = now;
  if (slime.shout && now - slime.shout.start > slime.shout.dur) slime.shout = null;
  slime.moving = false;
  const k = bossK();

  if (slime.where === 'home') {
    if (now < slime.homeUntil || now < slime.restUntil) return;
    // Out it oozes, from its den
    const mouth = slimeDenMouth();
    slime.fx = mouth.x / scaledMapW;
    slime.fy = mouth.y / scaledMapH;
    slime.where = 'out';
    slime.outUntil = now + randBetween(...(cfg.outFor || [40000, 60000]));
    slime.target = null;
    slimeShout(slimeSays('phrases'));
    slime.nextShoutAt = now + randBetween(2500, 4000);
    return;
  }

  const pos = slimePos();
  const dist = Math.hypot(player.x - pos.x, player.y - pos.y);
  const yourZone = slimeSafeAt(player.x, player.y);
  const hunting = slimeCanHunt() && now >= slime.graceUntil && !yourZone && !doorOpening && !bossEngage;
  if (slime.where === 'out' && now > slime.outUntil) slime.where = 'returning';

  let tx, ty, speed;   // speed: map px per 60fps frame (you walk at 4)
  const sniff = (cfg.sniff || 600) * k;
  if (slime.where === 'returning') {
    const mouth = slimeDenMouth();
    tx = mouth.x; ty = mouth.y; speed = (cfg.wander || 1.8) * 1.4 * k;
    if (Math.hypot(tx - pos.x, ty - pos.y) < 6 * k) {
      slime.where = 'home';
      slime.homeUntil = now + randBetween(...(cfg.restFor || [9000, 18000]));
      slime.shout = null;
      return;
    }
  } else if (hunting && dist < sniff) {
    // Smells you! Chase, shouting (it smells you even while you type a code)
    tx = player.x; ty = player.y; speed = (cfg.chase || 3) * k;
    if (now >= slime.nextShoutAt) {
      slimeShout(slimeSays('phrases'));
      slime.nextShoutAt = now + randBetween(2200, 3600);
    }
  } else {
    if (yourZone && dist < sniff && now >= slime.nextShoutAt) {
      const own = yourZone.z.grumblePhrases;
      slimeShout(own && own.length ? pickOne(own) : slimeSays('phrases'));
      slime.nextShoutAt = now + randBetween(3500, 6000);
    }
    const t = slime.target;
    if (!t || Math.hypot(t.fx * scaledMapW - pos.x, t.fy * scaledMapH - pos.y) < 10) slime.target = slimeWanderTarget();
    tx = slime.target.fx * scaledMapW; ty = slime.target.fy * scaledMapH; speed = (cfg.wander || 1.8) * k;
  }
  const dx = tx - pos.x, dy = ty - pos.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.5) {
    const step = Math.min(d, speed * dt * 0.06);
    const to = outOfSlimeSafe(pos.x + dx / d * step, pos.y + dy / d * step, 2);
    slime.fx = clamp(to.x / scaledMapW, 0.01, 0.99);
    slime.fy = clamp(to.y / scaledMapH, 0.03, 0.99);
    if (Math.abs(dx) > 2) slime.facing = dx < 0 ? 'left' : 'right';
    slime.walk += dt / 1000;
    slime.moving = true;
  }
  nearSlime = dist < 190 * k * (cfg.size || 1.2) + 20 && state === GameState.PLAYING;
  // Caught you! (Even halfway through typing a code.)
  if (slime.where === 'out' && hunting && dist < 60 * k * (cfg.size || 1.2)) {
    if (state === GameState.CODE_PAD) closeCodePad(true);
    engageSlime(true);
  }
}

// It yells, then the fight view opens (update() → startFight(bossEngage.foe)).
// `auto`: it caught you (with no sword, you lose straight away).
function engageSlime(auto) {
  if (state !== GameState.PLAYING || bossEngage || doorOpening || foesOff()) return;
  let noSword = false;
  if (swordRating <= 0 && !equipSpareSword()) {
    if (!auto) {
      kitchenToast('🗡️ You have no sword! Run to the Safe Zone, it can\'t go in there! 🛡️');
      return;
    }
    noSword = true;
  }
  const pos = slimePos();
  slime.where = 'out';
  slime.facing = player.x < pos.x ? 'left' : 'right';
  player.facing = player.x < pos.x ? 'right' : 'left';
  player.walking = false;
  player.frame = 0;
  tapTarget = null;
  backpackOpen = false;
  journalOpen = false;
  slimeShout(slimeSays('phrases'), BOSS_ENGAGE_MS + 200);
  bossEngage = { start: performance.now(), foe: slimeFoe(noSword), slime: true };
}

// The fight with the Slime Brick (see blobFoe for what a foe has)
function slimeFoe(noSword) {
  const level = slimeLevel();
  const def = slimeCfg();
  return {
    id: def.id || 'slime_brick', def, level, noSword,
    tune: slimeTuning(level),
    label: def.label || 'SLIME',
    intro: f => `🫧 Level ${f.level} ${def.name}: the King of Goo!`,
    draw: (v, f, now) => drawFightSlime(v, f, now),
    arena: (v, now) => drawSlimeArena(v, now),
    begin: f => {
      if (!noSword) return;
      f.winner = 'boss';
      f.b.score = f.toWin;
      f.p.act = 'ko';
      f.p.actStart = performance.now();
      finishFight(false);
    },
    finish: (f, res, won) => slimeFinish(f, res, won),
    end: won => {
      const now = performance.now();
      slime.where = 'home';
      slime.shout = null;
      slime.homeUntil = now + (won ? randBetween(30000, 45000) : randBetween(12000, 22000));
      slime.graceUntil = now + 6000;
    },
    after: won => {
      if (won) {
        kitchenToast(`${def.name} slurps back into its den, all wobbly! 🏆`);
        return;
      }
      const to = def.sendTo || { map: 'assets/camp_level3.json', hotspot: 'castle_door' };
      switchMap(to.map, to.hotspot);
      kitchenToast('Back at the Third Camp! Beat the Brick at Level 15 to open the trapdoor again. 🕳️');
    }
  };
}

function slimeFinish(f, res, won) {
  const def = f.def;
  if (f.foe.noSword) res.lines.push({ text: `You had no sword, so ${def.name} won straight away! 🗡️`, color: '#FFE082' });
  if (won) {
    const before = slimeLevel();
    slimeWins++;
    giveFightReward(def.reward || DEFAULT_BOSS_REWARD, def.lair, res, 'at the Slime Brick Den');
    res.lines.push({
      text: slimeLevel() > before ? `${def.name} is getting slimier! 🫧 Next time it's Level ${slimeLevel()} of ${SLIME_LEVEL_MAX}.`
        : `That's the slimiest Slime Brick there is (Level ${SLIME_LEVEL_MAX}), and you beat it! ⭐`,
      color: '#B3E5FC'
    });
  } else {
    gobbleBackpackCoins(res, def.name);
    lockLevel4();
    res.lines.push({ text: '🕳️ Back to the Third Camp you go! Beat the Brick at Level 15 to open the trapdoor again.', color: '#CE93D8' });
  }
  f.foe.gloat = fled => ({
    text: `"${pickOne((fled ? def.fledPhrases : def.winPhrases) || ['SPLORCH!'])}" says ${def.name}`,
    color: '#C6FF00'
  });
}

registerFrameUpdate(12, () => updateSlime());
onGameEvent('camperChosen', () => { slime.map = null; nearSlime = false; });
onGameEvent('mapArrive', () => { slime.map = null; });
// Space / tap next to it picks a fight
registerMapFoe(() => {
  if (!nearSlime || !slimeOut()) return null;
  return {
    engage: () => engageSlime(false),
    hit(sx, sy) {
      const p = slimePos();
      const h = slimeHeight();
      return Math.hypot(sx - (p.x - camera.x), sy - (p.y - h / 2 - camera.y)) < h * 0.7;
    },
    drawHint: () => drawSlimeHint()
  };
});
