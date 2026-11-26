// --- Item questions ("where is the sword?") ---
// Plain keyword matching, no Claude: if the player's line looks like a
// question / search and names an item (by a word of its name or its emoji),
// the NPC says where that item is right now, across every map: hotspots,
// kitchen stations you can grab or buy it from, and your own backpack.
const ITEM_QUESTION_RE = /\?|\b(where|wheres|find|found|seen|see|saw|look|looking|lost|locate|get|got|any|is there)\b/;
const ITEM_WORD_SKIP = new Set(['the', 'and', 'toy', 'big', 'hot', 'pink', 'fancy', 'comfy', 'lonely', 'little']);

// Lowercase words, roughly singular ("glasses" → "glas", same as "glass")
function itemWords(text) {
  const out = [];
  for (const w of String(text).toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || []) {
    for (const v of w.includes('-') ? [w, w.replace(/-/g, '')] : [w]) {
      let x = v.replace(/ies$/, 'y').replace(/(ch|sh|ss|x)es$/, '$1');
      if (x.length > 3) x = x.replace(/s$/, '');
      if (x.length >= 3 && !/^\d+$/.test(x)) out.push(x);
    }
  }
  return out;
}

// The best-matching item(s) mentioned in `said`, from `known` (name → item)
function itemsMentioned(said, known) {
  const words = new Set(itemWords(said));
  let best = 0, hits = [];
  for (const item of known.values()) {
    const iw = itemWords(item.name).filter(w => !ITEM_WORD_SKIP.has(w));
    const n = iw.filter(w => words.has(w)).length;
    let score = n + (n && n === iw.length ? 0.5 : 0);
    if (item.emoji && said.includes(item.emoji)) score = Math.max(score, 2);
    if (!score) continue;
    if (score > best) { best = score; hits = [item]; }
    else if (score === best) hits.push(item);
  }
  return hits;
}

function theName(name) {
  return /^the\b/i.test(name) ? name : `the ${name}`;
}

async function itemQuestionReply(history) {
  const said = (history[history.length - 1] || { text: '' }).text;
  if (!ITEM_QUESTION_RE.test(said.toLowerCase())) return null;
  let configs;
  try { configs = await crawlMapConfigs(); } catch (_) { return null; }
  if (mapConfig && currentMapPath) configs = { ...configs, [currentMapPath]: mapConfig };

  // Every item the game knows about (so "haven't seen one" works too),
  // and where each one is right now (lowercased name → [where phrase])
  const known = new Map(), spots = new Map();
  const learn = it => { if (it && it.name) known.set(it.name.toLowerCase(), it); };
  const spot = (it, phrase) => {
    learn(it);
    const k = it.name.toLowerCase();
    (spots.get(k) || spots.set(k, []).get(k)).push(phrase);
  };
  learn(SWORD_ITEM);
  for (const [path, cfg] of Object.entries(configs)) {
    const here = path === currentMapPath;
    const where = (h, verb = 'at') => here
      ? `right here, ${verb} ${theName(h.name)}`
      : `${verb} ${theName(h.name)} ${mapWhere(cfg)}`;
    const items = worldItemsFor(path, cfg) || {};
    const foods = (cfg.kitchen && cfg.kitchen.foods) || {};
    if (cfg.boss && cfg.boss.reward) learn(cfg.boss.reward);
    for (const h of cfg.hotspots || []) {
      for (const it of h.items || []) learn(it);
      for (const it of items[h.id] || []) spot(it, where(h));
      const st = h.station, food = st && foods[st.item];
      if (food && st.type === 'source') spot(food, `to grab ${where(h, 'from')}`);
      if (food && st.type === 'shop') {
        spot(food, here ? 'to buy right here, at the dessert case'
                        : `to buy at the dessert case ${mapWhere(cfg)}`);
      }
    }
  }

  const asked = itemsMentioned(said, known).slice(0, 2);
  if (!asked.length) return null;

  // Make sure there's a sword somewhere before saying where it is
  if (asked.some(it => it.id === SWORD_ITEM.id) && !spots.has('sword')) {
    const at = await findOrDropSword();
    if (at) {
      const h = (at.cfg.hotspots || []).find(x => x.id === at.hs);
      spot(SWORD_ITEM, at.path === currentMapPath
        ? `right here, at ${theName(h ? h.name : 'somewhere')}`
        : `at ${theName(h ? h.name : 'somewhere')} ${mapWhere(at.cfg)}`);
    }
  }

  const name = player.character ? player.character.name : 'friend';
  return asked.map(it => {
    const label = `${it.name} ${it.emoji || ''}`.trim();
    const mine = backpack.some(b => b.name.toLowerCase() === it.name.toLowerCase());
    const list = [...new Set(spots.get(it.name.toLowerCase()) || [])];
    const places = list.slice(0, 2).join(', and ') + (list.length > 2 ? ', and a few other places' : '');
    if (mine && list.length) return `You've got ${label} in your backpack, ${name}! There's another one ${places}.`;
    if (mine) return `Silly ${name}, ${label} is in your backpack! 🎒`;
    if (!list.length) return pickOne([
      `Hmm, I haven't seen any ${label} around lately. Maybe somebody took it?`,
      `${label}? I don't think there's any left right now. 🤔`
    ]);
    return pickOne([
      `${label}? There's one ${places}!`,
      `Ooh, ${label}! I think there's one ${places}. 👀`
    ]);
  }).join(' ');
}
