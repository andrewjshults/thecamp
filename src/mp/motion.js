// --- Speeds and prediction ---
// `pos` (~4/s) and `boss` (~3/s) don't go out every frame, so each one also
// carries a speed (vx, vy: fractions of the map per second). In between,
// friends' computers guess where it has walked to since, for up to
// MP_PREDICT_MAX_MS, so it keeps moving smoothly instead of hopping.

// Call every frame with where something is (0–1 map fractions); keeps a
// smoothed speed in `tr.vx` / `tr.vy`.
function mpTrackVel(tr, fx, fy, now) {
  const dt = tr.t == null ? 0 : now - tr.t;
  if (dt <= 0 && tr.t != null) return;   // twice in one frame
  if (dt > 0 && dt < 200) {
    const dx = fx - tr.fx, dy = fy - tr.fy;
    if (Math.hypot(dx, dy) > 0.05) {
      tr.vx = tr.vy = 0;                  // jumped (a portal, a new room)
    } else {
      tr.vx = (tr.vx || 0) + (dx * 1000 / dt - (tr.vx || 0)) * 0.5;
      tr.vy = (tr.vy || 0) + (dy * 1000 / dt - (tr.vy || 0)) * 0.5;
    }
  } else {
    tr.vx = tr.vy = 0;                    // first look, or the tab was asleep
  }
  tr.fx = fx;
  tr.fy = fy;
  tr.t = now;
}

// The speed to send: 0 when standing still, rounded so it stays small
function mpVelOut(tr, moving) {
  if (!moving) return { vx: 0, vy: 0 };
  return { vx: +(tr.vx || 0).toFixed(4), vy: +(tr.vy || 0).toFixed(4) };
}

// A speed read off the network (fractions / second, kept sane)
function mpVelIn(v) {
  const n = Number(v);
  return Number.isFinite(n) ? clamp(n, -2, 2) : 0;
}

// Where `o` (with tx/ty, vx/vy and `at`, when we heard) has probably got to
function mpPredicted(o, now) {
  const s = Math.min(Math.max(0, now - (o.at || now)), MP_PREDICT_MAX_MS) / 1000;
  return {
    x: clamp(o.tx + (o.vx || 0) * s, 0, 1),
    y: clamp(o.ty + (o.vy || 0) * s, 0, 1)
  };
}
