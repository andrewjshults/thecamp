// ============================================================
// TOTP — the grown-up's 6-digit code (RFC 6238: HMAC-SHA1, 30 s, 6 digits)
// ============================================================
// The code from the authenticator app (Authy...) lets a grown-up lift the
// play-time block (playtime.js). The secret has to ship with the page to
// check codes, so it's kept scrambled (two byte lists XORed together) rather
// than as readable text: that stops a peek at the source, not a determined
// reader. To change it, see docs/playtime.md.
const PT_TILE_A = [30, 182, 60, 199, 190, 212, 201, 190, 86, 164, 85, 158, 144, 84, 136, 123, 39, 21, 95, 14];
const PT_TILE_B = [99, 102, 201, 142, 255, 216, 181, 34, 193, 241, 180, 136, 191, 68, 18, 59, 129, 79, 127, 224];
const TOTP_STEP_MS = 30000;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;   // also accept the code just before / after (clocks drift)

let totpKeyPromise = null;
function totpKey() {
  if (!totpKeyPromise) {
    const raw = new Uint8Array(PT_TILE_A.map((b, i) => b ^ PT_TILE_B[i]));
    totpKeyPromise = crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  }
  return totpKeyPromise;
}

function totpStepAt(ms) { return Math.floor(ms / TOTP_STEP_MS); }

// The code for 30-second step `step` (a string, with leading zeros)
async function totpCode(step) {
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(step / 0x100000000));
  view.setUint32(4, step >>> 0);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', await totpKey(), msg));
  const off = mac[mac.length - 1] & 0x0f;
  const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
  return String(bin % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

// The step `code` is good for (around now), or null if it's wrong
async function totpMatch(code, now = Date.now()) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== TOTP_DIGITS || !(window.crypto && crypto.subtle)) return null;
  const here = totpStepAt(now);
  for (let d = -TOTP_WINDOW; d <= TOTP_WINDOW; d++) {
    if (await totpCode(here + d) === code) return here + d;
  }
  return null;
}
