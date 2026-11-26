// Blob fight simulator — for tuning how hard the Blob is (see bossTuning in src/features/boss/fight.js).
//
// How to use: open the game (npm run dev → http://localhost:3000), start a
// Single Player game on the main map, open the browser console and paste this
// whole file. Then, for example:
//
//   simMany(bossTuning(3), 'decent', 300)        // Blob level 3 vs a typical player
//   simMany({ armor: 1, windup: 0.6 }, 'good')    // try any mix of BOSS_TUNE_BASE settings
//   simMany(bossTuning(5), 'casual', 300, 20)     // ...with a player at strength 20 (desserts)
//
// The Second Camp's Marshmallows (src/features/level2/mallows.js) and the shop
// swords (src/features/sword-shop/swords.js): pass { toWin, sword } as the 5th
// argument, e.g.
//   simMany(mallowTuning(8), 'good', 300, 10, { sword: 'flame' })     // Mega Mallow, level 8
//   simMany(kidTuning(6), 'decent', 300, 10, { toWin: 8 })           // Mini Mallow (first to 8)
// The Third Camp's Brick (src/features/level3/brick.js) and armor
// (src/features/armor-shop/armor.js): { armor } in the same argument, e.g.
//   simMany(brickTuning(13), 'good', 300, 10, { sword: 'rainbow', armor: 'knight' })
//
// → { win: % the player won, dur: average seconds, wear: sword wear per fight,
//     loserPts: points the loser got, timeouts }
//
// Each fight runs instantly on a fake clock (performance.now is swapped out while
// it runs), driven by a bot that reacts to the Blob's wind-up after a delay and
// then blocks, backs off or misses it, walks in and swings at its own pace,
// sometimes from too far away. Nothing is saved.
//
// With a sidekick, the simulated fights include them too (startFight reads the
// global `sidekick`). E.g. `makeSidekick(npcOnThisMap('red_scout'))` first,
// then `simMany(...)`, and `sidekick = null` to go back to fighting alone.
window.BOTS = {
  // younger kid: slow to react, often doesn't defend, mashes, swings from too far, slow to step back in
  casual: { react: 650, jitter: 150, block: 0.35, retreat: 0.10, cadence: 150, cadenceJitter: 100, whiff: 0.35, stepIn: 450 },
  // typical player
  decent: { react: 420, jitter: 100, block: 0.60, retreat: 0.15, cadence: 350, cadenceJitter: 200, whiff: 0.15, stepIn: 250 },
  // practiced player: quick, defends nearly every attack, doesn't mash
  good:   { react: 280, jitter: 80,  block: 0.80, retreat: 0.10, cadence: 500, cadenceJitter: 200, whiff: 0.05, stepIn: 120 }
};
window.botStep = function (f, now, bot, st) {
  const p = f.p, b = f.b;
  const dist = Math.abs(p.x - b.x);
  const toward = b.x > p.x ? 1 : -1;
  const threat = b.act === 'windup' || b.act === 'attack';
  if (b.act === 'windup' && st.threatStart !== b.actStart) {
    st.threatStart = b.actStart;
    const r = Math.random();
    const kind = r < bot.block ? 'block' : r < bot.block + bot.retreat ? 'retreat' : 'none';
    st.plan = { kind, at: b.actStart + Math.max(80, bot.react + (Math.random() * 2 - 1) * bot.jitter) };
  }
  if (!threat) st.plan = null;
  fightTouch.left = fightTouch.right = fightTouch.block = false;
  if (st.plan && now >= st.plan.at && st.plan.kind !== 'none') {
    if (st.plan.kind === 'block') fightTouch.block = true;
    else if (toward > 0) fightTouch.left = true; else fightTouch.right = true;
    return;
  }
  if ((p.act === 'hit' || b.act === 'hit') && !st.waitUntil) st.waitUntil = now + bot.stepIn;
  if (st.waitUntil && now < st.waitUntil) return;
  st.waitUntil = 0;
  const swingFrom = st.swingFrom || (st.swingFrom = playerReach() - 30);
  if (dist > swingFrom) {
    if (toward > 0) fightTouch.right = true; else fightTouch.left = true;
  } else if (!fightBusy(p) && p.act !== 'block' && now >= st.nextSwing) {
    fightAttack();
    st.nextSwing = now + bot.cadence + Math.random() * bot.cadenceJitter;
    st.swingFrom = Math.random() < bot.whiff ? playerReach() + 40 + Math.random() * 120 : playerReach() - 30;
  }
};
// A stand-in foe: fights like any boss with this tuning (nothing drawn or won)
window.simFoe = function (toWin) {
  const none = () => null;
  return { id: 'sim', def: { pointsToWin: toWin || 10 }, level: 0, tune: BOSS_TUNE_BASE, label: 'SIM',
    intro: none, draw: none, arena: none, finish: none, end: none, after: none };
};
window.simFight = function (tune, botName, pStrength, opts = {}) {
  const bot = BOTS[botName];
  let clock = 1e8;
  performance.now = () => clock;
  const saved = { sword: swordRating, kind: swordKind, boost: strengthBoost, state, armor: armorKind, armorR: armorRating };
  try {
    strengthBoost = (pStrength || STRENGTH_BASE) - STRENGTH_BASE;
    for (const k of Object.keys(keys)) keys[k] = false;
    swordKind = opts.sword || 'plain';
    swordRating = 1e6;
    armorKind = opts.armor || null;          // armor that never wears out (see src/features/armor-shop/armor.js)
    armorRating = opts.armor ? 1e6 : 0;
    bossTuneOverride = tune || null;
    startFight(simFoe(opts.toWin));
    const f = fight;
    f.phase = 'fight'; f.phaseStart = clock; f.bossThinkAt = clock + 500; f.lastT = clock;
    const st = { threatStart: null, plan: null, nextSwing: 0 };
    const start = clock, limit = clock + 300000;
    while (!f.winner && clock < limit) { clock += 1000 / 60; botStep(f, clock, bot, st); updateFight(); }
    return { won: f.winner === 'player', timeout: !f.winner, dur: (clock - start) / 1000, p: f.p.score, b: f.b.score, wear: 1e6 - swordRating };
  } finally {
    fight = null; state = saved.state; bossTuneOverride = null; swordRating = saved.sword; swordKind = saved.kind; strengthBoost = saved.boost;
    armorKind = saved.armor; armorRating = saved.armorR;
    fightTouch = { left: false, right: false, block: false };
    delete performance.now;
  }
};
window.simMany = function (tune, botName, n, pStrength, opts) {
  let wins = 0, dur = 0, wear = 0, timeouts = 0, pts = 0;
  for (let i = 0; i < n; i++) {
    const r = simFight(tune, botName, pStrength, opts);
    if (r.won) wins++; if (r.timeout) timeouts++;
    dur += r.dur; wear += r.wear; pts += r.won ? r.b : r.p;
  }
  return { win: Math.round(100 * wins / n), dur: +(dur / n).toFixed(1), wear: Math.round(wear / n), loserPts: +(pts / n).toFixed(1), timeouts };
};
'sim ready';
