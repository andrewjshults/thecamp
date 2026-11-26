// --- Small helpers used all over ---

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function easeOutBack(p) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

function randBetween(a, b) { return a + Math.random() * (b - a); }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
