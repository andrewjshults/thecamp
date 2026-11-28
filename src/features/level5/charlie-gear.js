// ============================================================
// CHARLIE'S FIFTH CAMP GEAR — the sword and armor only sold at the Fifth Camp
// ============================================================
// Charlie's shop at the Fifth Camp (assets/level5_shop.json) sells every
// sword and armor in the game (`"sells": "all"`), plus these and the shields
// (shields.js). The Fourth Camp's counters list what they sell, so these
// `exclusive` kinds only show up here. What the numbers do: above
// SWORD_KINDS (sword.js) and ARMOR_KINDS (armor.js). Tuned with
// tools/fight-sim.js (see docs/level-five.md).
const CHARLIE5_SWORDS = {
  // The sun beats the moon: the best all-rounder in the game
  sun: {
    name: 'Sun Sword', emoji: '☀️', price: 180, max: 450, exclusive: true,
    land: 0.07, power: 1.6, reach: 30, speed: 1.1, pierce: 0.35, stun: 1.2, guard: 0.05,
    blade: '#FFE082', glow: '#FFB300',
    about: 'Lasts 450! The best sword of all: hits hard, lands often, reaches far, and smashes glowing wind-ups.'
  }
};
Object.assign(SHOP_SWORDS, CHARLIE5_SWORDS);
Object.assign(SWORD_KINDS, CHARLIE5_SWORDS);

const CHARLIE5_ARMOR = {
  // Black rock from the lava river: stops the most hits, and lasts
  obsidian: {
    name: 'Obsidian Armor', emoji: '🖤', price: 180, max: 380, stop: 0.32, exclusive: true,
    color: '#455A64', trim: '#FF7043',
    about: 'Made from lava rock! Stops about 1 hit in 3, the most of any armor. Lasts about 5 fights.'
  }
};
Object.assign(ARMOR_KINDS, CHARLIE5_ARMOR);
