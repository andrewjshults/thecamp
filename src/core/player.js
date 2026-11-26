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

// --- Developer Mode ---
let devMode = false;
let devSelectedHotspot = null;  // index into interactiveObjects
let devDrag = null;             // { index, corner:'TL'|'TR'|'BL'|'BR' }
const DEV_HANDLE_R = 14;        // corner handle radius in screen px

// --- Inventory ---
const BACKPACK_CAPACITY = 10;
const HOTSPOT_CAPACITY = 3;
const SAVE_VERSION = 2;
let backpack = [];                                  // up to BACKPACK_CAPACITY items
let hotspotItems = {};                              // hotspotId -> item[]
let backpackOpen = false;
let backpackSelection = { row: 'backpack', col: 0 };
let backpackActionButton = 0;                       // index of focused button in action modal
let currentItemAction = null;                       // { source:'backpack'|'hotspot', index, hotspotId }
let backpackSlotRects = { backpack: [], hotspot: [] };
let itemActionButtonRects = [];                     // [{ x,y,w,h,id,disabled }]
let lastCharTapTime = 0;
let useToast = null;                                // { text, age }
