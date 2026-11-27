# How to Play booklet and video

The player-facing guide: `guide/index.html` (a three-page booklet that also
prints as three Letter pages) and `guide/how-to-play.mp4` (a ~2½ minute
captioned overview, embedded at the top of the booklet).

**On the start menu** (`#menuMode`), two buttons under Single / Multi Player:
- **▶️ Watch how to play** (`data-guide="video"`) opens `#guideVideoModal`, a
  pop-up over the menu that plays the video (`src/features/guide/guide-video.js`:
  `openGuideVideo` / `closeGuideVideo`). It's plain HTML with no game state: ✕,
  "Let's play!", the dark backdrop or Esc close it and pause the video. Its
  keys don't reach the game's keydown handler, so Space pauses the video.
- **📖 Read the booklet** is a link to `guide/` in a new tab.

Styles are in their own block at the end of `styles.css`. The smoke test
opens and closes the pop-up (`01-guide-video`).

The pictures and the video are made from the real game by
`tools/make-guide-media.js`:

```bash
node tools/make-guide-media.js            # screenshots + video
node tools/make-guide-media.js --stills   # just guide/img/*.jpg
node tools/make-guide-media.js --video    # just guide/how-to-play.mp4 (+ img/video-poster.jpg)
```

It needs Playwright (like `npm test`) and `ffmpeg`. It starts `server.js` on a
random port with `?playtime=off`, plays on a fake clock with a seeded
`Math.random` (so a re-run gives the same pictures), and blocks the
live-reload stream (writing the pictures would otherwise reload the page).
NPCs use their built-in replies and PubNub is stubbed out.

- **Stills** (`stills()`): one `g.shot(name)` per picture; the booklet uses
  them by file name (`img/<name>.jpg`).
- **Video** (`video()`): each frame is a screenshot taken every 1/24 s of game
  time, then ffmpeg joins them (H.264, CRF 32, about 7 MB). Captions and
  title cards are HTML drawn over the canvas (`window.__caption`,
  `window.__card`), and fights are played by a small bot (`botFight`: walk in,
  swing, hold B when the boss winds up), then won with `winFight`. It takes
  about 10 minutes.

**When the game changes** (a new level, shop, control or price), update the
booklet's text and re-run the script if the pictures are out of date. The
facts in the booklet come from the feature docs (boss levels and prizes,
shop prices, dessert strength, play time), so check them against those.
The booklet must still print on three pages: print-preview it (or render a
PDF with Playwright) after a change.
