// ---------- Your sidekick in the fight ----------
// They stand in the lane just behind you (drawn a little smaller and higher),
// a step back from you, and:
//   • run in and swing their own sword now and then, then step back — their
//     hits count toward YOUR score (and the Blob may block them, and
//     counter-attack you!)
//   • see the Blob winding up and often put their sword up. A block covers
//     you both: the Blob's swing at you hits their guard instead.
// Your block covers them too, but the Blob only ever goes after you, so the
// sidekick never gets hurt and has no strength bar.
// Tuned with tools/fight-sim.js (see CLAUDE.md): a sidekick helps a lot but
// doesn't win the fight for you.
const SIDEKICK_STRENGTH = 10;                // for their odds (strengthOdds) and speed
const SIDEKICK_SWING_GAP_MS = [3800, 6000];  // between their swings
const SIDEKICK_BLOCK_CHANCE = 0.3;           // they try to block this often...
const SIDEKICK_REACT_MS = [320, 620];        // ...this long after the Blob starts its wind-up
const SIDEKICK_LANE = 55;                    // arena units: how far "back" their lane is
const SIDEKICK_BEHIND = 140;                 // they wait this far behind you
const SIDEKICK_GUARD = 240;                  // their guard covers you if they're this close to you

function sidekickGuarding(f) {
  const s = f.s;
  return !!s && (s.act === 'block' || s.act === 'blockstun') && Math.abs(s.x - f.p.x) <= SIDEKICK_GUARD;
}

function sidekickAI(f, now, dt) {
  const s = f.s, p = f.p, b = f.b;
  const t = now - s.actStart;
  s.facing = b.x >= s.x ? 'right' : 'left';
  if (s.act === 'attack') {
    if (!s.hitChecked && t >= P_STARTUP) { s.hitChecked = true; resolveHit(f, s, b, 'sidekick'); }
    if (s.act === 'attack' && t >= P_STARTUP + P_ACTIVE + P_RECOVER) {
      s.act = 'idle';
      s.charging = false;                      // step back behind you
      s.nextSwingAt = now + randBetween(...SIDEKICK_SWING_GAP_MS);
    }
    return;
  }
  if (s.act === 'blockstun' && t > BLOCK_STUN) { s.act = 'block'; s.actStart = now; }
  if (s.act === 'block') {
    // Hold it until the Blob's swing is over
    if (b.act !== 'windup' && b.act !== 'attack' && now - s.actStart > 250) s.act = 'idle';
    else return;
  }
  // The Blob is winding up: maybe get the sword up in time
  if (b.act === 'windup') {
    if (s.reactTo !== b.actStart) {
      s.reactTo = b.actStart;
      s.blockAt = Math.random() < SIDEKICK_BLOCK_CHANCE ? b.actStart + randBetween(...SIDEKICK_REACT_MS) : 0;
    }
    if (s.blockAt && now >= s.blockAt) {
      s.blockAt = 0;
      s.act = 'block';
      s.actStart = now;
      if (Math.random() < 0.5) fightPop(f, pickOne(SIDEKICK_LINES.block), s.x, 300 + SIDEKICK_LANE, s.char.color, 0.55);
      return;
    }
  }
  // Time for a swing? Run in at the Blob (unless it's already reeling)
  const side = p.x <= b.x ? -1 : 1;              // which side of the Blob you're both on
  if (!s.charging && now >= s.nextSwingAt && b.act !== 'hit' && b.act !== 'ko') s.charging = true;
  let rest = p.x + side * SIDEKICK_BEHIND;
  if (rest < ARENA_MIN_X + 10 || rest > ARENA_MAX_X - 10) rest = p.x - side * SIDEKICK_BEHIND * 0.8;   // backed into the wall: just in front
  const want = s.charging ? b.x + side * (P_REACH - 45) : clamp(rest, ARENA_MIN_X, ARENA_MAX_X);
  const spd = strengthSpeed(s.strength);
  if (Math.abs(want - s.x) > 14) {
    s.x += Math.sign(want - s.x) * (s.charging ? 360 : 260) * spd * dt;
    s.walk += dt * spd;
    s.act = 'walk';
  } else {
    s.act = 'idle';
  }
  if (s.charging && Math.abs(s.x - b.x) <= P_REACH - 15) {
    if (b.act === 'hit' || b.act === 'ko') { s.charging = false; s.nextSwingAt = now + 600; return; }
    s.act = 'attack';
    s.actStart = now;
    s.hitChecked = false;
    b.rolledBlock = bossMaybeBlock(f, now);
  }
}
