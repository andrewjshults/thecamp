// --- How to play: the video pop-up on the start menu ---
// The start menu (#menuMode) has "▶️ Watch how to play", which opens
// #guideVideoModal with guide/how-to-play.mp4, and "📖 Read the booklet",
// a plain link to guide/ (see docs/guide.md). The pop-up is HTML over the
// menu, so it needs no game state: it handles its own keys and clicks.

const guideVideoModal = document.getElementById('guideVideoModal');
const guideVideo = document.getElementById('guideVideo');
let guideVideoOpener = null;   // the button to give focus back to

function openGuideVideo(opener) {
  guideVideoOpener = opener || null;
  guideVideoModal.hidden = false;
  guideVideo.currentTime = 0;
  // Browsers may refuse to start it (or can't play mp4): the controls are there
  const playing = guideVideo.play();
  if (playing && playing.catch) playing.catch(() => {});
  guideVideoModal.querySelector('.guideClose').focus({ preventScroll: true });
}

function closeGuideVideo() {
  if (guideVideoModal.hidden) return;
  guideVideo.pause();
  guideVideoModal.hidden = true;
  if (guideVideoOpener) guideVideoOpener.focus({ preventScroll: true });
  guideVideoOpener = null;
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-guide]');
  if (btn && btn.dataset.guide === 'video') openGuideVideo(btn);
  else if (btn && btn.dataset.guide === 'close') closeGuideVideo();
  else if (e.target === guideVideoModal) closeGuideVideo();   // the dark backdrop
});

// Keys inside the pop-up are the video's (Space pauses it): they must not
// reach the game's keydown handler, which would swallow Space
guideVideoModal.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeGuideVideo(); }
  e.stopPropagation();
});
