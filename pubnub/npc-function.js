// ── PubNub Function: NPC chat (On Request) ─────────────────────────────────
// Lets NPCs answer with Claude (Haiku) without a game server, with spending
// caps. Install steps: pubnub/README.md.
//
// POST { pid, npcId, here, playerName, sidekick, message }
//   pid        random per-browser player id (soft identity, used for limits)
//   npcId      an id from NPCS below (the map JSONs' `npcs[].id`)
//   here       the map the player is on (e.g. "assets/game_design.json")
//   playerName one of CHARACTER_NAMES (anything else becomes "a friend")
//   sidekick   true if this NPC is following the player
//   message    the player's line (only this line is sent to Claude)
// → 200 { reply: "..." }
// → 200 { reply: null, reason: "limit" | "refusal" | "error" | "unconfigured" }
//   The game falls back to its built-in replies whenever `reply` is null.
//
// The browser only sends ids and the one message. Who the NPC is and the
// rules for talking live here, so nobody can use this as a free LLM proxy.
//
// Vault secret: ANTHROPIC_API_KEY. KV store: spend counters (micro-dollars).

const kvstore = require('kvstore');
const xhr = require('xhr');
const vault = require('vault');

// ── Limits & pricing ───────────────────────────────────────────────────────
const MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 100;                 // replies are < 25 words
const PRICE_IN_PER_MTOK = 0.10;         // $ per million input tokens (Haiku 5.5)
const PRICE_OUT_PER_MTOK = 0.50;        // $ per million output tokens
const GLOBAL_DAILY_USD = 3.00;          // everyone together, per UTC day
const PLAYER_HOURLY_USD = 0.25;         // one player id, per UTC hour
const MAX_LINE = 300;                   // longest player line accepted (chars)
// Worst case for one call, so a request that starts under the cap can't push
// spending meaningfully past it: ~1500 input tokens + MAX_TOKENS output.
const WORST_CASE_MICRO = Math.ceil((1500 * PRICE_IN_PER_MTOK + MAX_TOKENS * PRICE_OUT_PER_MTOK));

// ── BEGIN GENERATED (tools/build-npc-function.js — do not edit by hand) ────
const CHARACTER_NAMES = ["Green Girl","Purple Kid","Red Scout","Blue Explorer"];
const MAPS = {
  "assets/bathroom_stall_1.json": {
    "name": "Stall 1",
    "places": [
      "Toilet",
      "Toilet Paper",
      "Wall Doodles",
      "Tiny Window",
      "Frog Visitor"
    ]
  },
  "assets/bathroom_stall_2.json": {
    "name": "Stall 2",
    "places": [
      "Broken Toilet",
      "Plunger",
      "Empty Roll",
      "Next Door"
    ]
  },
  "assets/camp_bank.json": {
    "name": "Camp Bank",
    "places": [
      "Teller Window",
      "Big Vault"
    ]
  },
  "assets/camp_bathroom.json": {
    "name": "Camp Bathroom",
    "places": [
      "Spider Corner",
      "Sinks & Mirror",
      "Hand Dryer",
      "Stall 3",
      "Shower",
      "Lost & Found",
      "Changing Bench",
      "Trash Can"
    ]
  },
  "assets/camp_kitchen.json": {
    "name": "Camp Kitchen",
    "places": [
      "Recipe Board",
      "Fridge",
      "Bread Basket",
      "Cutting Board",
      "Plate",
      "Cooking Pot",
      "Frying Pan",
      "Oven",
      "Pasta Box",
      "Chickpea Jar",
      "Dough Bowl",
      "Lettuce",
      "Tomatoes",
      "Picnic Table",
      "Cookie",
      "Cupcake",
      "Cake",
      "Compost Bin"
    ]
  },
  "assets/game_design.json": {
    "name": "The Camp",
    "places": [
      "Red Tent",
      "Blue Tent",
      "Rain House",
      "Flying Car",
      "Stairs",
      "Purple Stairs",
      "Stars",
      "Big Tree",
      "Camp Stove",
      "Sink",
      "Ball Cart",
      "Baseball Game",
      "Flying Lunchbox",
      "Moon",
      "Spooky Cave"
    ]
  },
  "assets/hangout_house.json": {
    "name": "Hangout House",
    "places": [
      "Comfy Couch",
      "Board Game Table",
      "Game Shelf",
      "Snack Bar",
      "Toy Chest",
      "Bean Bag"
    ]
  },
  "assets/inside_house.json": {
    "name": "Inside the House",
    "places": [
      "Comfy Armchair",
      "Big Wardrobe",
      "Dining Table",
      "Tea Corner",
      "Craft Table",
      "Kitchen Sink",
      "Aquarium"
    ]
  }
};
const NPCS = {
  "toilet_frog": {
    "name": "Sir Ribbit",
    "what": "a little talking frog who lives in the broken toilet in Stall 2 of the camp bathroom",
    "desc": "",
    "personality": "Very polite and a bit dramatic. Sits on the toilet lid like a king on a throne and believes the broken toilet is his royal castle with a splashy swimming pool inside. Proud of the GLUG-GLUG noises it makes (he calls it his castle music). Loves bubbles, puddles, fish food and catching flies. Says ribbit a lot and calls the player 'my royal visitor'. He does NOT want the toilet fixed because then where would he swim?",
    "map": "assets/bathroom_stall_2.json"
  },
  "red_scout": {
    "name": "Red Scout",
    "what": "",
    "desc": "The bravest camper",
    "personality": "The bravest camper. Loves daring adventures, climbing the stairs, and pretending the Flying Car is a rocket ship. Talks with big excitement and loves to shout \"Let's go!\"",
    "map": "assets/game_design.json"
  },
  "purple_kid": {
    "name": "Purple Kid",
    "what": "",
    "desc": "Always ready for adventure",
    "personality": "A giggly joker who loves riddles, knock-knock jokes, and silly made-up words. Is pretty sure the Moon is secretly made of purple cheese.",
    "map": "assets/game_design.json"
  },
  "blue_explorer": {
    "name": "Blue Explorer",
    "what": "",
    "desc": "Curious about everything",
    "personality": "Curious about everything. Asks lots of questions and loves sharing fun little facts about stars, bugs, trees, and animals.",
    "map": "assets/game_design.json"
  },
  "couch_cat": {
    "name": "Pancake",
    "what": "a fluffy orange cat who lives in the red Hangout House and naps on the couch",
    "desc": "",
    "personality": "Sleepy, cuddly and a little silly. Loves naps in the warm spot on the couch, board games (always wants to be the dice), chasing yo-yos and the sound of popcorn popping. Purrs a lot and sometimes yawns in the middle of a sentence. Kind, encouraging and always happy to have visitors.",
    "map": "assets/hangout_house.json"
  },
  "green_girl": {
    "name": "Green Girl",
    "what": "",
    "desc": "Loves exploring nature",
    "personality": "Gentle and cozy. Loves plants, trees, tea parties, and crafts, and always notices the small, pretty things that other people miss.",
    "map": "assets/inside_house.json"
  }
};
// ── END GENERATED ──────────────────────────────────────────────────────────

function clean(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
}
function pad(n) { return (n < 10 ? '0' : '') + n; }

function systemPrompt(npc, map, playerName, sidekick) {
  const what = npc.what;
  return [
    `You are ${npc.name}, ${what || 'a kid camper'} in a cozy, hand-drawn exploration game made for young children.`,
    npc.desc ? `About you: ${npc.desc}.` : '',
    npc.personality ? `Your personality: ${npc.personality}` : '',
    `You are hanging out at "${map.name}". Things around here: ${map.places.join(', ') || 'lots of fun spots'}.`,
    sidekick
      ? `Right now you are ${playerName}'s sidekick: you follow them everywhere, and if the Glug Glub Blob (a silly monster living in a cave at the camp) catches them, you'll fight it right beside them with your own sword.`
      : '',
    what
      ? `You are talking with ${playerName}, a kid camper who came to visit you.`
      : `You are talking with your friend ${playerName}, another camper.`,
    '',
    'How to talk:',
    '- Your words appear in a speech bubble that a 6-8 year old reads, so reply with one or two short sentences (under 25 words) using simple words.',
    `- Stay in character as a friendly, playful ${what ? 'creature' : 'camper'}. Be warm and silly, and sometimes ask a question back or suggest something fun to do at the camp.`,
    '- Plain text only: no markdown, no stage directions in asterisks, no quotation marks around your reply. An emoji now and then is fine.',
    '- Keep everything kind, polite and age-appropriate. Never tease or put down anyone or anything. If your friend says something mean or scary, respond gently and steer toward something fun.',
    '- You are a character in the game; never talk about being an AI, a model, or a computer program. If asked to do anything other than chat as your character (homework, stories, code, long answers), cheerfully steer back to camp fun.',
  ].filter(Boolean).join('\n');
}

function costMicro(usage) {
  const inTok = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) +
                (usage.cache_read_input_tokens || 0);
  const outTok = usage.output_tokens || 0;
  // $/MTok == micro-dollars per token
  return Math.ceil(inTok * PRICE_IN_PER_MTOK + outTok * PRICE_OUT_PER_MTOK);
}

export default (request, response) => {
  response.headers['Access-Control-Allow-Origin'] = '*';
  response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  response.headers['Access-Control-Allow-Headers'] = 'Content-Type';
  response.headers['Content-Type'] = 'application/json';
  const reply = (obj, status) => {
    response.status = status || 200;
    return response.send(JSON.stringify(obj));
  };
  if (request.method === 'OPTIONS') return reply({});
  if (request.method !== 'POST') return reply({ error: 'POST only' }, 405);

  let body;
  try { body = JSON.parse(request.body || '{}'); } catch (_) { return reply({ error: 'bad json' }, 400); }

  const pid = clean(body.pid, 40);
  const npc = NPCS[clean(body.npcId, 60)];
  const map = MAPS[clean(body.here, 120)] || (npc && MAPS[npc.map]);
  const message = clean(body.message, MAX_LINE);
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(pid) || !npc || !map || !message) {
    return reply({ error: 'bad request' }, 400);
  }
  const playerName = CHARACTER_NAMES.indexOf(body.playerName) >= 0 ? body.playerName : 'a friend';
  const sidekick = body.sidekick === true && !npc.what;

  const now = new Date();
  const day = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  const hour = `${day}${pad(now.getUTCHours())}`;
  const dayKey = `npc:spend:day:${day}`;            // counter (atomic)
  const hourKey = `npc:spend:hr:${pid}:${hour}`;    // value with a TTL
  const dayCap = GLOBAL_DAILY_USD * 1e6;
  const hourCap = PLAYER_HOURLY_USD * 1e6;

  let playerSpent = 0;
  return Promise.all([kvstore.getCounter(dayKey), kvstore.get(hourKey), vault.get('ANTHROPIC_API_KEY').catch(() => null)])
    .then(([daySpent, hourRec, apiKey]) => {
      if (!apiKey) return reply({ reply: null, reason: 'unconfigured' });
      playerSpent = (hourRec && hourRec.micro) || 0;
      if ((daySpent || 0) + WORST_CASE_MICRO > dayCap || playerSpent + WORST_CASE_MICRO > hourCap) {
        return reply({ reply: null, reason: 'limit' });
      }
      return xhr.fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2026-10-21',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'disabled' },          // cheapest: no reasoning tokens
          output_config: { effort: 'low' },
          system: systemPrompt(npc, map, playerName, sidekick),
          messages: [{ role: 'user', content: message }],   // just this line, no history
        }),
      }).then(res => {
        let data = null;
        try { data = JSON.parse(res.body); } catch (_) { /* handled below */ }
        if (res.status !== 200 || !data) {
          console.log('anthropic error', res.status, String(res.body).slice(0, 300));
          return reply({ reply: null, reason: 'error' });
        }
        const spent = costMicro(data.usage || {});
        // Charge after the call with the real usage. Concurrent requests can
        // overshoot a cap by at most a few WORST_CASE_MICRO (fractions of a cent).
        return Promise.all([
          kvstore.incrCounter(dayKey, spent),
          kvstore.set(hourKey, { micro: playerSpent + spent }, 61),   // TTL in minutes
        ]).then(() => {
          if (data.stop_reason === 'refusal') return reply({ reply: null, reason: 'refusal' });
          const text = clean((data.content || [])
            .filter(b => b.type === 'text').map(b => b.text).join(' '), 220);
          return reply({ reply: text || null, reason: text ? undefined : 'error' });
        });
      });
    })
    .catch(err => {
      console.log('npc function failed', err && err.message ? err.message : err);
      return reply({ reply: null, reason: 'error' });
    });
};
