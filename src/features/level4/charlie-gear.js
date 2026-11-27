// ============================================================
// CHARLIE'S GEAR — the swords and armor only Charlie sells (Fourth Camp)
// ============================================================
// Charlie's Armor & Swords (assets/level4_shop.json) has a sword counter and
// an armor counter, both with `"sells": "all"`: everything Ember and Shelly
// sell, plus these. They're `exclusive`, so Ember's and Shelly's shops (which
// don't list what they sell) leave them out (swordsForSale / armorForSale).
// What the numbers do: above SWORD_KINDS (sword.js) and ARMOR_KINDS
// (armor.js). Tuned with tools/fight-sim.js (see docs/level-four.md).
const CHARLIE_SWORDS = {
  // Fast: swings and recovers quicker, and freezes the boss longer
  comet: {
    name: 'Comet Sword', emoji: '☄️', price: 90, max: 300, exclusive: true,
    land: 0.05, stun: 1.7, speed: 1.25, guard: 0.04,
    blade: '#FFE0B2', glow: '#FF9100',
    about: 'Lasts 300. Swings SUPER fast, and freezes the boss for longer when you hit it.'
  },
  // The best all-rounder (the star from Louisa's drawing)
  star: {
    name: 'Star Sword', emoji: '⭐', price: 150, max: 400, exclusive: true,
    land: 0.05, power: 1.5, reach: 25, speed: 1.05, pierce: 0.25, guard: 0.04,
    blade: '#FFF59D', glow: '#FFD600',
    about: 'Lasts 400! Hits hard, reaches far, blocks well, and smashes through glowing wind-ups.'
  }
};
Object.assign(SHOP_SWORDS, CHARLIE_SWORDS);
Object.assign(SWORD_KINDS, CHARLIE_SWORDS);

const CHARLIE_ARMOR = {
  // Doesn't stop the most hits, but lasts and lasts
  dragon: {
    name: 'Dragon Scale Armor', emoji: '🐉', price: 130, max: 420, stop: 0.22, exclusive: true,
    color: '#81C784', trim: '#2E7D32',
    about: 'Stops about 1 hit in 5, and lasts SO long: about 6 fights!'
  },
  // The star shield from the drawing: stops the most hits
  star: {
    name: 'Star Armor', emoji: '🌟', price: 150, max: 300, stop: 0.29, exclusive: true,
    color: '#FFF59D', trim: '#FFB300',
    about: 'Stops more hits than any other armor (almost 1 in 3)! Lasts about 4 fights. It twinkles!'
  }
};
Object.assign(ARMOR_KINDS, CHARLIE_ARMOR);
