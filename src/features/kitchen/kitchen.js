// ============================================================
// KITCHEN — cooking stations + the ONE food in your hands
// ============================================================
// A map with a `kitchen` ({ foods, recipes }) turns hotspots that have a
// `station` into cooking spots. Space at a station picks up / puts down /
// cooks. The player holds one food at a time (drawn in their hands); it never
// goes in the backpack and is left behind when they walk out of the kitchen.
// Station types:
//   source — { item }                                   grab an ingredient (never runs out)
//   cook   — { verb, doing, makes: { in: out }, seconds, fx }   Chop / Boil / Fry / Bake...
//   plate  — combine foods; when they match a kitchen.recipes[].needs it becomes `makes`
//   serve  — eat a finished dish (a food with "dish": true)
//   trash  — throw away whatever you're holding
//   shop   — { item }: buy a dessert (a food with "dessert": true, `price`,
//            `strength`) with 🪙 coins from the backpack
let heldItem = null;          // { id, name, emoji } — only ever exists inside a kitchen
let dishesMade = [];          // dish ids eaten at least once (saved)
const stationStates = {};     // `${mapPath}#${hotspotId}` → state (kept while the game runs)

// --- Freestyle: making up your own recipes ---
// Bring a food to the plate that isn't in any recipe and you're offered to cook
// freestyle. You name it, it's written on the chalkboard (✏️, still cooking)
// and the plate takes any food. Picking up the plate gives you the dish; eating
// it at the table makes it a real recipe (saved in `customRecipes`, made on the
// plate like any other from then on). Composting it or walking out with it
// rubs it off the board.
const CUSTOM_DISH_EMOJI = '🍽️';
const FREESTYLE_MAX = 6;      // foods on one freestyle plate
let customRecipes = [];       // [{ id, name, needs: [foodId], map }] (saved)
let draftRecipe = null;       // { name, needs, map } — the one you're making up right now

function customRecipesHere() {
  return customRecipes.filter(r => r.map === currentMapPath);
}
function draftHere() {
  return draftRecipe && draftRecipe.map === currentMapPath ? draftRecipe : null;
}
function draftDish() {
  return { id: 'draft_recipe', name: draftRecipe.name, emoji: CUSTOM_DISH_EMOJI, dish: true, custom: true, draft: true };
}
// Built-in recipes plus the ones you've made up in this kitchen
function allRecipes() {
  return [
    ...mapConfig.kitchen.recipes,
    ...customRecipesHere().map(r => ({ makes: r.id, needs: r.needs }))
  ];
}
function cleanRecipeName(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 24);
}
// Forget a recipe you were still making up (new camper, fresh save...)
function resetDraftRecipe() {
  draftRecipe = null;
  if (heldItem && heldItem.draft) heldItem = null;
  for (const S of Object.values(stationStates)) {
    if (S.draft) { S.plate = []; S.draft = false; }
  }
}
// Older saves have no sword yet: they start with a new one
function savedSwordRating(save) {
  const n = save && Number(save.swordRating);
  return Number.isFinite(n) ? clamp(Math.round(n), 0, SWORD_MAX) : SWORD_MAX;
}
function cleanCustomRecipes(arr) {
  return Array.isArray(arr)
    ? arr.filter(r => r && typeof r.id === 'string' && typeof r.name === 'string' && Array.isArray(r.needs) && typeof r.map === 'string')
      .map(r => ({ id: r.id, name: cleanRecipeName(r.name), needs: r.needs.map(String), map: r.map }))
    : [];
}
// The board shows recipes, so the "see all" hotspot may need to appear or go
function kitchenBoardChanged() {
  recalcInteractiveObjects();
}

function kitchenFood(id) {
  const f = mapConfig && mapConfig.kitchen && mapConfig.kitchen.foods[id];
  if (f) return { id, ...f };
  if (id === 'draft_recipe' && draftRecipe) return draftDish();
  const c = customRecipes.find(r => r.id === id);
  if (c) return { id, name: c.name, emoji: CUSTOM_DISH_EMOJI, dish: true, custom: true };
  return { id, name: id, emoji: '❓' };
}
function foodLabel(id) {
  const f = kitchenFood(id);
  return `${f.emoji} ${f.name}`;
}
function kitchenDishes() {
  const foods = (mapConfig && mapConfig.kitchen && mapConfig.kitchen.foods) || {};
  return Object.keys(foods).filter(id => foods[id].dish);
}
function stationState(obj) {
  const key = `${currentMapPath}#${obj.id}`;
  return stationStates[key] || (stationStates[key] = { item: null, plate: [] });
}
function kitchenToast(text) {
  useToast = { text, age: 0, low: true };
}

// --- Desserts → strength ---
// Eating a dessert adds its `strength` to strengthBoost (saved, for good, no cap:
// spend all your coins). Every Blob fight starts you at STRENGTH_BASE + strengthBoost.
const STRENGTH_BASE = 10;
let strengthBoost = 0;

function coinValue(it) { return it.value || 10; }
function walletTotal() { return backpack.filter(isCoin).reduce((sum, it) => sum + coinValue(it), 0); }

function eatDessert(f, onTheWayOut) {
  const got = f.strength || 1;
  strengthBoost += got;
  writeSave();
  const ate = onTheWayOut ? `You gobble up the ${foodLabel(f.id)} on your way out!` : `Yum! You eat the ${foodLabel(f.id)}.`;
  kitchenToast(`${ate} +${got} 💪 You're stronger for good! (Strength ${STRENGTH_BASE + strengthBoost})`);
}

// Pay `price` with coins from the backpack (smallest first). Returns the coins paid.
function payCoins(price) {
  const coins = backpack.filter(isCoin).sort((a, b) => coinValue(a) - coinValue(b));
  const paid = [];
  let sum = 0;
  for (const c of coins) {
    if (sum >= price) break;
    paid.push(c);
    sum += coinValue(c);
  }
  backpack = backpack.filter(it => !paid.includes(it));
  return paid;
}

// Multiset check: can every food in `have` be found in `needs`?
function bagFits(have, needs) {
  const left = [...needs];
  for (const id of have) {
    const i = left.indexOf(id);
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}
function plateAccepts(plate, id) {
  return allRecipes().some(r => bagFits([...plate, id], r.needs));
}
function plateRecipe(plate) {
  return allRecipes().find(r => r.needs.length === plate.length && bagFits(plate, r.needs));
}

// Cooking finishes on a timer (checked every frame while drawing)
function tickStations(now) {
  for (const obj of interactiveObjects) {
    if (!obj.station || obj.station.type !== 'cook') continue;
    const S = stationState(obj);
    if (S.cookEnd && now >= S.cookEnd) {
      S.item = S.out;
      S.cooking = S.out = S.cookEnd = null;
      S.doneAt = now;
      kitchenToast(`Ding! The ${foodLabel(S.item)} is ready!`);
    }
  }
}

// Space at a station
function doStation(obj) {
  const st = obj.station, S = stationState(obj), now = performance.now();
  const held = heldItem;
  const handsFull = () => kitchenToast(`Your hands are full! Put down the ${foodLabel(held.id)} first.`);
  switch (st.type) {
    case 'source':
      if (!held) {
        heldItem = kitchenFood(st.item);
        kitchenToast(`You grab the ${foodLabel(st.item)}.`);
      } else if (held.id === st.item) {
        heldItem = null;
        kitchenToast(`You put the ${foodLabel(held.id)} back.`);
      } else handsFull();
      break;

    case 'cook': {
      const verb = (st.verb || 'Cook').toLowerCase();
      if (S.cookEnd) { kitchenToast(`${st.doing || 'Cooking'}... wait for the ding!`); break; }
      if (S.item) {
        if (held) { handsFull(); break; }
        heldItem = kitchenFood(S.item);
        S.item = null;
        kitchenToast(`You take the ${foodLabel(heldItem.id)}.`);
        break;
      }
      const inputs = Object.keys(st.makes).map(id => kitchenFood(id).emoji).join(' or ');
      if (!held) { kitchenToast(`You can ${verb} ${inputs} here.`); break; }
      const out = st.makes[held.id];
      if (!out) { kitchenToast(`You can't ${verb} ${foodLabel(held.id)}! Try ${inputs}.`); break; }
      S.cooking = held.id;
      S.out = out;
      S.cookStart = now;
      S.cookEnd = now + (st.seconds || 3) * 1000;
      heldItem = null;
      kitchenToast(`${st.doing || 'Cooking'} the ${foodLabel(held.id)}...`);
      break;
    }

    case 'plate': {
      if (held) {
        if (held.dessert) { kitchenToast(`The ${foodLabel(held.id)} doesn't need a plate! Take it to the table to eat it.`); break; }
        // Freestyle plate: anything goes
        if (S.draft) {
          if (held.custom) { kitchenToast(`The ${held.emoji} ${held.name} is ready to eat! Take it to the table.`); break; }
          if (S.plate.length >= FREESTYLE_MAX) { kitchenToast(`Your ${draftRecipe.name} is full! Pick it up and take it to the table to eat it.`); break; }
          S.plate.push(held.id);
          heldItem = null;
          kitchenBoardChanged();
          kitchenToast(`You add the ${foodLabel(held.id)} to your ${draftRecipe.name}!`);
          break;
        }
        // Putting your made-up dish back down to add more
        if (held.draft) {
          if (S.plate.length) { kitchenToast(`The plate isn't empty! Take the ${S.plate.map(id => kitchenFood(id).emoji).join(' ')} off first.`); break; }
          S.plate = draftRecipe.needs;
          S.draft = true;
          heldItem = null;
          kitchenToast(`You put your ${draftRecipe.name} back on the plate. Add more food, or take it to the table!`);
          break;
        }
        if (!plateAccepts(S.plate, held.id)) {
          const f = kitchenFood(held.id);
          if (f.custom) { kitchenToast(`The ${foodLabel(f.id)} is ready to eat! Take it to the table.`); break; }
          if (draftRecipe) { kitchenToast(`Finish your ✏️ ${draftRecipe.name} first! Eat it at the table, or put it in the compost.`); break; }
          openFreestyleOffer(obj, f, S.plate);
          break;
        }
        S.plate.push(held.id);
        heldItem = null;
        const r = plateRecipe(S.plate);
        if (r) {
          S.plate = [r.makes];
          S.madeAt = now;
          kitchenToast(`✨ You made ${foodLabel(r.makes)}! Take it to the table to eat it.`);
        } else {
          kitchenToast(`You put the ${foodLabel(held.id)} on the plate.`);
        }
      } else if (S.draft) {
        // A made-up dish comes off the plate all together
        heldItem = draftDish();
        S.plate = [];
        S.draft = false;
        kitchenToast(`You pick up your ${CUSTOM_DISH_EMOJI} ${draftRecipe.name}! Take it to the table to eat it.`);
      } else if (S.plate.length) {
        heldItem = kitchenFood(S.plate.pop());
        kitchenToast(`You pick up the ${foodLabel(heldItem.id)}.`);
      } else {
        kitchenToast('Put food on the plate to make a recipe! Check the recipe board.');
      }
      break;
    }

    case 'serve': {
      if (!held) { kitchenToast('Make some food and bring it here to eat! 🍽️'); break; }
      const f = kitchenFood(held.id);
      if (f.dessert) {
        heldItem = null;
        S.eating = { emoji: f.emoji, start: now };
        eatDessert(f);
        break;
      }
      if (!f.dish) { kitchenToast(`The ${f.name.toLowerCase()} isn't ready to eat yet. Cook it or make a recipe first!`); break; }
      heldItem = null;
      S.eating = { emoji: f.emoji, start: now };
      if (held.draft) {
        // Eating your made-up dish makes it a real recipe, on the board for good
        const r = {
          id: `custom_${Date.now().toString(36)}`,
          name: draftRecipe.name,
          needs: [...draftRecipe.needs],
          map: currentMapPath
        };
        customRecipes.push(r);
        draftRecipe = null;
        writeSave();
        kitchenBoardChanged();
        kitchenToast(`🎉 Yum! ${CUSTOM_DISH_EMOJI} ${r.name} is a real recipe now. It's on the recipe board for good! ⭐`);
        break;
      }
      if (f.custom) { kitchenToast(`Yum yum! You eat your ${foodLabel(f.id)}. 😋`); break; }
      const dishes = kitchenDishes();
      if (!dishesMade.includes(f.id)) {
        dishesMade.push(f.id);
        writeSave();
        const n = dishes.filter(id => dishesMade.includes(id)).length;
        kitchenToast(n === dishes.length
          ? `🎉 Yum! You've cooked EVERY recipe! Master Chef! 👩‍🍳`
          : `Yum! ${f.emoji} New recipe! You've made ${n} of ${dishes.length}.`);
      } else {
        kitchenToast(`Yum yum! You eat the ${foodLabel(f.id)}. 😋`);
      }
      break;
    }

    case 'trash':
      if (held && held.draft) {
        heldItem = null;
        draftRecipe = null;
        kitchenBoardChanged();
        kitchenToast(`Into the compost goes your ${held.name}. You can always make up a new recipe! ♻️`);
      } else if (held) {
        heldItem = null;
        kitchenToast(`Into the compost goes the ${foodLabel(held.id)}! ♻️`);
      } else kitchenToast('Nothing to throw away!');
      break;

    case 'shop': {
      const f = kitchenFood(st.item);
      const price = f.price || 10;
      if (held) {
        if (held.id !== st.item || !held.paid) { handsFull(); break; }
        // Changed your mind: put it back and get the coins back
        if (backpack.length + held.paid.length > BACKPACK_CAPACITY) {
          kitchenToast(`Your backpack is too full for the coins! Eat the ${foodLabel(f.id)} instead.`);
          break;
        }
        backpack.push(...held.paid);
        heldItem = null;
        writeSave();
        kitchenToast(`You put the ${foodLabel(f.id)} back and get your $${price} back.`);
        break;
      }
      const have = walletTotal();
      if (have < price) {
        kitchenToast(have
          ? `The ${foodLabel(f.id)} costs $${price}, but you only have $${have}. Beat the Blob to win more 🪙!`
          : `The ${foodLabel(f.id)} costs $${price}. Beat the Blob to win 🪙 $10 coins!`);
        break;
      }
      heldItem = { ...f, paid: payCoins(price) };
      writeSave();
      kitchenToast(`You buy a ${foodLabel(f.id)} for $${price}! Take it to the table to eat it. (+${f.strength || 1} 💪)`);
      break;
    }
  }
}

// --- Kitchen pop-ups (HTML #kitchenModal) ---
const kitchenModalEl = document.getElementById('kitchenModal');
const kmNameInput = document.getElementById('kmNameInput');
const kmNameGo = document.getElementById('kmNameGo');
let kitchenModalOpenedAt = 0;
let freestylePending = null;   // { obj, food } — the plate and the food that didn't fit

function showKitchenModal(screenId) {
  for (const id of ['kmOffer', 'kmName', 'kmList']) document.getElementById(id).hidden = id !== screenId;
  kitchenModalEl.hidden = false;
  if (state !== GameState.KITCHEN_MODAL) {
    state = GameState.KITCHEN_MODAL;
    kitchenModalOpenedAt = performance.now();
    backpackOpen = false;
    journalOpen = false;
    tapTarget = null;
    player.walking = false;
    player.frame = 0;
  }
  // A moment later, so the Space that opened it doesn't also press a button
  const focus = screenId === 'kmName' ? kmNameInput : kitchenModalEl.querySelector(`#${screenId} button`);
  setTimeout(() => { if (!kitchenModalEl.hidden && focus) focus.focus(); }, 80);
}

function closeKitchenModal() {
  if (state !== GameState.KITCHEN_MODAL) return;
  kitchenModalEl.hidden = true;
  freestylePending = null;
  if (kitchenModalEl.contains(document.activeElement)) document.activeElement.blur();
  state = GameState.PLAYING;
}

// A food that isn't in any recipe arrived at the plate
function openFreestyleOffer(obj, food, plate) {
  freestylePending = { obj, food };
  const on = plate.map(id => kitchenFood(id).emoji).join(' ');
  document.getElementById('kmOfferText').textContent =
    plate.length ? `${food.emoji} ${food.name} doesn't go with ${on} in any recipe.`
    : food.dish ? `The ${food.emoji} ${food.name} is ready to eat! Or you can use it to cook something new.`
    : `${food.emoji} ${food.name} isn't in any recipe yet.`;
  showKitchenModal('kmOffer');
}

function showFreestyleName() {
  if (!freestylePending) return;
  const { obj, food } = freestylePending;
  const needs = [...stationState(obj).plate, food.id];
  document.getElementById('kmNameText').textContent =
    `${needs.map(id => kitchenFood(id).emoji).join(' + ')} + anything else you like!`;
  kmNameInput.value = '';
  kmNameGo.disabled = true;
  showKitchenModal('kmName');
}

// Named it: the held food goes on the plate and the recipe is written on the board
function startFreestyle(obj, name) {
  const S = stationState(obj);
  draftRecipe = { name, needs: [...S.plate, heldItem.id], map: currentMapPath };
  S.plate = draftRecipe.needs;   // the same array: adding food to the plate adds to the recipe
  S.draft = true;
  S.madeAt = performance.now();
  heldItem = null;
  kitchenBoardChanged();
  kitchenToast(`✏️ ${name} is on the recipe board! Add any food you like, then take it to the table to eat it.`);
}

// Every recipe in this kitchen, for a full chalkboard's "see all"
function openRecipeList() {
  const body = document.getElementById('kmListBody');
  body.textContent = '';
  const e = id => kitchenFood(id).emoji;
  const section = (title, rows, empty) => {
    const h = document.createElement('h3');
    h.textContent = title;
    body.appendChild(h);
    if (!rows.length && empty) rows = [{ text: empty, cls: 'kmEmpty' }];
    for (const r of rows) {
      const d = document.createElement('div');
      d.className = r.cls || 'kmRecipe';
      d.textContent = r.text;
      body.appendChild(d);
    }
  };
  section('On the plate', mapConfig.kitchen.recipes.map(r =>
    ({ text: `${r.needs.map(e).join(' + ')} → ${foodLabel(r.makes)}` })));
  const mine = customRecipesHere().map(r =>
    ({ text: `${r.needs.map(e).join(' + ')} → ${CUSTOM_DISH_EMOJI} ${r.name}`, cls: 'kmRecipe mine' }));
  const draft = draftHere();
  if (draft) mine.push({ text: `✏️ ${draft.needs.map(e).join(' + ')} → ${draft.name} (still cooking!)`, cls: 'kmRecipe mine' });
  section('⭐ Your recipes', mine, 'None yet! Put any food on the plate to cook freestyle.');
  const cooks = [];
  for (const h of mapConfig.hotspots) {
    const st = h.station;
    if (!st || st.type !== 'cook') continue;
    for (const [from, to] of Object.entries(st.makes)) {
      cooks.push({ text: `${st.verb || 'Cook'} ${e(from)} → ${foodLabel(to)}` });
    }
  }
  section('Cook it', cooks);
  showKitchenModal('kmList');
}

kitchenModalEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-km]');
  if (!b || performance.now() - kitchenModalOpenedAt < 300) return;
  if (b.dataset.km === 'close') closeKitchenModal();
  else if (b.dataset.km === 'name') showFreestyleName();
});
kitchenModalEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeKitchenModal(); }
});
kmNameInput.addEventListener('input', () => { kmNameGo.disabled = !cleanRecipeName(kmNameInput.value); });
document.getElementById('kmName').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = cleanRecipeName(kmNameInput.value);
  if (!name || !freestylePending || !heldItem) return;
  startFreestyle(freestylePending.obj, name);
  closeKitchenModal();
});
