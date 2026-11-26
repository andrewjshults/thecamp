// --- Characters ---
const characters = [
  {
    name: 'Green Girl',
    color: '#4CAF50',
    hairColor: '#8B4513',
    braid: true,             // a braid hanging down behind her shoulder
    shirtColor: '#4CAF50',
    pantsColor: '#2196F3',
    desc: 'Loves exploring nature'
  },
  {
    name: 'Purple Kid',
    color: '#9C27B0',
    hairColor: '#1a1a1a',
    shirtColor: '#9C27B0',
    pantsColor: '#FF9800',
    desc: 'Always ready for adventure'
  },
  {
    name: 'Red Scout',
    color: '#F44336',
    hairColor: '#DAA520',
    shirtColor: '#F44336',
    pantsColor: '#333333',
    desc: 'The bravest camper'
  },
  {
    name: 'Blue Explorer',
    color: '#2196F3',
    hairColor: '#8B0000',
    shirtColor: '#2196F3',
    pantsColor: '#4CAF50',
    desc: 'Curious about everything'
  }
];

let selectedCharIndex = 0;
let hoveredCharIndex = -1;
