# Play time: the limit, the break, the grown-up code

Code: `src/features/playtime/playtime.js` (the timer, the break screen, the
badge) and `src/features/playtime/totp.js` (checking the 6-digit code). The
pop-up is `#playtimeModal` in `index.html`, styled in its own block in
`styles.css`.

## How it works

- **One timer per browser**, kept in `localStorage` under `PLAYTIME_KEY`
  (`louisas-game:playtime`), not in a camper's save: switching campers or
  going multiplayer doesn't reset it. Two open tabs count down the same timer
  (`ptFlush` re-reads before writing).
- It starts at `PLAYTIME_LIMIT_MS` (20 minutes) and **only counts while you're
  walking on a map or in a fight** (`playtimeCounting`): standing still,
  talking, the journal, shops and menus don't count. A frame counts at most
  `PLAYTIME_MAX_FRAME_MS`, so a tab that was asleep doesn't eat time.
- When it runs out you get the **break screen** (`playtimeBlock`, game state
  `PLAYTIME_BLOCKED`). The check only happens while walking around a map
  (`state === PLAYING`), so **a fight that's going on finishes first** and the
  break screen comes up when you're back on the map after the result.
  The state is `away: true`, so in a multiplayer world friends see "💤 name"
  and we only send a `pos` once a minute (see docs/multiplayer.md).
- The break lasts `PLAYTIME_BLOCK_MS` (1 hour), then the timer is full again
  and play carries on by itself (`ptRead` notices, `playtimeResume(null)`).
  The break screen does **not** show how long is left.
- Not playing (no counted time) for `PLAYTIME_BREAK_MS` (1 hour) also counts
  as a break: the timer is full again.
- What's left shows as a **⏳ badge in the top-right corner**, just left of the
  journal button (`drawPlaytimeBadge`, screen layer 95). It turns red and
  blinks in the last minute. It isn't shown in the fight view.

## The grown-up code (TOTP)

On the break screen, **🔑 Grown-up code** asks for the 6-digit code from an
authenticator app (Authy, Google Authenticator, 1Password...): standard TOTP,
HMAC-SHA1, 30-second steps, 6 digits (`totpMatch` in `totp.js`; the code just
before and after is accepted too, for clock drift). A good code opens a slider
for **5–60 more minutes** (`PLAYTIME_GRANT_MIN` / `PLAYTIME_GRANT_MAX`, in
steps of 5).

- A code can only be used once (`usedStep`).
- After `PLAYTIME_TRIES` (5) wrong codes, it waits `PLAYTIME_LOCK_MS` (1 minute).
- Checking needs `crypto.subtle`, which browsers only offer on https or
  localhost (GitHub Pages is https).

The secret has to ship with the page to check codes, so `totp.js` keeps it
scrambled as two byte lists, `PT_TILE_A` and `PT_TILE_B`; the key is
`A[i] ^ B[i]`. That stops someone reading the source at a glance, not a
determined reader. **To change the secret**: pick 20 random bytes as the new
key and 20 more as `PT_TILE_B`, set `PT_TILE_A[i] = key[i] ^ PT_TILE_B[i]`, and
add the key's base32 to the authenticator app, e.g.:

```bash
node -e 'const c=require("crypto"),k=c.randomBytes(20),m=c.randomBytes(20),A="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let b="",s="";for(const x of k)b+=x.toString(2).padStart(8,"0");for(let i=0;i<b.length;i+=5)s+=A[parseInt(b.slice(i,i+5).padEnd(5,"0"),2)];console.log("secret:",s);console.log("PT_TILE_A",JSON.stringify([...k].map((x,i)=>x^m[i])));console.log("PT_TILE_B",JSON.stringify([...m]))'
```

## Developer overrides (localhost only)

Only when the page is served from `localhost` / `127.0.0.1`
(`PLAYTIME_ON_LOCALHOST`), e.g. `npm run dev`:

- `http://localhost:3000/?playtime=off`: no limit, no badge.
- `http://localhost:3000/?playtime=0.5`: start with that many minutes (here
  30 seconds), to try the break quickly.
- The break screen has a **🛠️ Developer: skip the break** button (full time).
- In the console, `playtimeSet(ms)` sets the time left (`0` starts the break).

## Testing

`playtime()` in `tests/smoke.js` walks until the time runs out, tries a wrong
code and the right one (made in the page with `totpCode`), uses the slider,
checks a used code is refused, uses the developer skip, runs out mid-fight,
and moves the break's start back an hour to see it end.
