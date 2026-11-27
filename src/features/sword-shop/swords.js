// ============================================================
// SHOP SWORDS — the five swords you can buy at Ember's Sword Shop
// ============================================================
// Added to SWORD_KINDS (src/features/sword.js), next to the plain sword you
// find lying around. Each one wears out like the plain sword (1 per swing, 4
// more per hit); at 0 you're back to finding a plain one, or buying another.
// What the numbers do is listed above SWORD_KINDS. Tuned with
// tools/fight-sim.js (see docs/sword-shop.md).
const SHOP_SWORDS = {
  sparkle: {
    name: 'Sparkle Sword', emoji: '✨', price: 20, max: 250,
    land: 0.04,
    blade: '#FFF9C4', glow: '#FFF176',
    about: 'Lasts 250 instead of 100, and your swings land a bit more often.'
  },
  ice: {
    name: 'Ice Sword', emoji: '🧊', price: 40, max: 250,
    land: 0.03, stun: 1.4, guard: 0.06,
    blade: '#B3E5FC', glow: '#4FC3F7',
    about: 'Lasts 250. Freezes the boss for longer when you hit it, and your blocks hold better.'
  },
  flame: {
    name: 'Flame Sword', emoji: '🔥', price: 60, max: 250,
    land: 0.05, power: 1.6, reach: 25,
    blade: '#FFCC80', glow: '#FF7043',
    about: 'Lasts 250. Hits often knock off 2 💪 instead of 1, and it reaches further.'
  },
  rainbow: {
    name: 'Rainbow Thunder Sword', emoji: '🌈', price: 100, max: 400,
    land: 0.04, power: 1.5, reach: 20, speed: 1.1, pierce: 0.2, guard: 0.03,
    blade: '#E1BEE7', glow: '#BA68C8',
    about: 'Lasts 400! Swings faster, hits harder, blocks better, and can SMASH through a glowing wind-up.'
  },
  // All or nothing: only 1 swing in 5 lands (however strong you are), but a
  // hit wins the fight. It blocks just like the plain sword.
  lava: {
    name: 'Lava Sword', emoji: '🌋', price: 200, max: 250,
    hitOdds: 0.2, oneHit: true,
    blade: '#FF8A65', glow: '#DD2C00',
    about: 'Lasts 250. Only 1 swing in 5 lands, but one hit beats the boss! Blocks like a plain sword.'
  }
};
Object.assign(SWORD_KINDS, SHOP_SWORDS);
