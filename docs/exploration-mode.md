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
  `engageMallow` and `drawMallowLair` for the Marshmallows; `updateBrick`,
  `engageBrick` and `brickHere` for the Third Camp's Brick (it's hidden, and
  its throne is empty); `updateSlime`, `engageSlime` and `slimeHere` for the Fourth
  Camp's Slime Brick. A boss that was
  already yelling at you is called off (`cancelBossEngage`).
  - On your own, the Blob stays in its cave, and comes out again a while after
    the mode is switched off. The Marshmallows start over (with their usual
    few seconds' grace) once it's off.
  - In a multiplayer world the Blob is shared, so it carries on for your
    friends but ignores you.
- **You can move between the levels.** The secret passages are open even if
  you haven't beaten the bosses: the cave to the Second Camp, and the
  Marshmallows' hole down to the Third Camp, and the Brick's trapdoor down to
  the Fourth Camp (a hotspot kind of its own for
  any passage that isn't open, `!passageOpen(obj)`, with the purple glow,
  `drawPassageGlow`). `level2Open` and `level3Open` aren't changed, so
  switching the mode off puts things back as they were. The Second Camp's
  `cave_exit` and the Third Camp's `hole_back` always lead back.
- **NPCs tell you about items on every level** (`registerLevelsOpen`), since
  you can get to them all (see [npcs.md](npcs.md)).
- **The Third Camp's poison moat still works**: it isn't a boss (see
  [level-three.md](level-three.md)). So do the Fourth Camp's slime pit, door
  codes and throne key (see [level-four.md](level-four.md)).
- **A green banner at the top of the screen** says "🧭 EXPLORATION MODE"
  (`drawExploreBanner`, below the kitchen's recipe counter in a kitchen). It
  isn't shown in the normal game.

It isn't saved: each camper starts in the normal game (`camperChosen` turns
it off).
