// --- Player ---
// People are drawn at SPRITE_SCALE; a map's optional `spriteScale` multiplies it
const BASE_SPRITE_SCALE = 3.6;
let SPRITE_SCALE = BASE_SPRITE_SCALE;
const player = {
  x: 0,
  y: 0,
  width: 90,
  height: 144,
  speed: 4,
  facing: 'right',
  rotation: 0,
  frame: 0,
  frameTimer: 0,
  walking: false,
  character: null
};

// --- Camera ---
const camera = {
  x: 0,
  y: 0
};
