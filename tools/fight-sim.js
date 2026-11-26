// Blob fight simulator — for tuning how hard the Blob is (see bossTuning in index.html).
//
// How to use: open the game (npm run dev → http://localhost:3000), start a
// Single Player game on the main map, open the browser console and paste this
// whole file. Then, for example:
//
//   simMany(bossTuning(3), 'decent', 300)        // Blob level 3 vs a typical player
//   simMany({ armor: 1, windup: 0.6 }, 'good')    // try any mix of BOSS_TUNE_BASE settings
//   simMany(bossTuning(5), 'casual', 300, 20)     // ...with a player at strength 20 (desserts)
//
// → { win: % the player won, dur: average seconds, wear: sword wear per fight,
//     loserPts: points the loser got, timeouts }
//
// Each fight runs instantly on a fake clock (performance.now is swapped out while
// it runs), driven by a bot that reacts to the Blob's wind-up after a delay and
// then blocks, backs off or misses it, walks in and swings at its own pace,
// sometimes from too far away. Nothing is saved.
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
  const swingFrom = st.swingFrom || (st.swingFrom = P_REACH - 30);
  if (dist > swingFrom) {
    if (toward > 0) fightTouch.right = true; else fightTouch.left = true;
  } else if (!fightBusy(p) && p.act !== 'block' && now >= st.nextSwing) {
    fightAttack();
    st.nextSwing = now + bot.cadence + Math.random() * bot.cadenceJitter;
    st.swingFrom = Math.random() < bot.whiff ? P_REACH + 40 + Math.random() * 120 : P_REACH - 30;
  }
};
window.simFight = function (tune, botName, pStrength) {
  const bot = BOTS[botName];
  let clock = 1e8;
  performance.now = () => clock;
  const saved = { sword: swordRating, boost: strengthBoost, state };
  try {
    strengthBoost = (pStrength || STRENGTH_BASE) - STRENGTH_BASE;
    for (const k of Object.keys(keys)) keys[k] = false;
    swordRating = 1e6;
    bossTuneOverride = tune || null;
    startFight();
    const f = fight;
    f.phase = 'fight'; f.phaseStart = clock; f.bossThinkAt = clock + 500; f.lastT = clock;
    const st = { threatStart: null, plan: null, nextSwing: 0 };
    const start = clock, limit = clock + 300000;
    while (!f.winner && clock < limit) { clock += 1000 / 60; botStep(f, clock, bot, st); updateFight(); }
    return { won: f.winner === 'player', timeout: !f.winner, dur: (clock - start) / 1000, p: f.p.score, b: f.b.score, wear: 1e6 - swordRating };
  } finally {
    fight = null; state = saved.state; bossTuneOverride = null; swordRating = saved.sword; strengthBoost = saved.boost;
    fightTouch = { left: false, right: false, block: false };
    delete performance.now;
  }
};
window.simMany = function (tune, botName, n, pStrength) {
  let wins = 0, dur = 0, wear = 0, timeouts = 0, pts = 0;
  for (let i = 0; i < n; i++) {
    const r = simFight(tune, botName, pStrength);
    if (r.won) wins++; if (r.timeout) timeouts++;
    dur += r.dur; wear += r.wear; pts += r.won ? r.b : r.p;
  }
  return { win: Math.round(100 * wins / n), dur: +(dur / n).toFixed(1), wear: Math.round(wear / n), loserPts: +(pts / n).toFixed(1), timeouts };
};
'sim ready';
