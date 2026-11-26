# Exploration mode

Code: `src/features/explore/explore.js`.

Press **E** while walking around a map to switch exploration mode on or off
(`setExploreMode`; not while a pop-up, a fight or the talk bar is open). It's
for looking around every level without being chased. While it's on
(`exploreMode`):

- **The bosses leave you alone.** The Blob and the Marshmallows are hidden,
  don't chase or catch you, and you can't pick a fight with them. Exploration
  mode tells them with `registerFoesOff` (in `src/core/hooks.js`), and each foe
  checks `foesOff()`: `updateMapBoss`, `engageBoss`, `mapBossVisible` and the
  eyes in the cave (`drawBossCave`) for the Blob; `updateMallows`,
  `engageMallow` and `drawMallowLair` for the Marshmallows. A boss that was
  already yelling at you is called off (`cancelBossEngage`).
  - On your own, the Blob stays in its cave, and comes out again a while after
    the mode is switched off. The Marshmallows start over (with their usual
    few seconds' grace) once it's off.
  - In a multiplayer world the Blob is shared, so it carries on for your
    friends but ignores you.
- **You can move between the levels.** The cave's secret passage to the
  Second Camp is open even if you haven't beaten the Blob (a hotspot kind of
  its own, with the purple glow, `drawPassageGlow`). `level2Open` isn't
  changed, so switching the mode off puts things back as they were. The
  Second Camp's `cave_exit` always leads back.
- **A green banner at the top of the screen** says "🧭 EXPLORATION MODE"
  (`drawExploreBanner`, below the kitchen's recipe counter in a kitchen). It
  isn't shown in the normal game.

It isn't saved: each camper starts in the normal game (`camperChosen` turns
it off).
