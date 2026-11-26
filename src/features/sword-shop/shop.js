// ============================================================
// SWORD SHOP — buy a better sword with the coins in your backpack
// ============================================================
// A hotspot with a `swordShop` object is the shop counter:
//   "swordShop": { "keeper": "Ember", "emoji": "🐉" }
// Space there opens #swordShopModal (state SWORD_SHOP), with one button per
// sword in SHOP_SWORDS. You pay with the 🪙 coins in your backpack (not the
// bank), and the keeper gives change in $10 coins. The shop never runs out.
// A sword you buy replaces the one you're holding (the old one is traded
// in), and wears out like any other.
const shopModalEl = document.getElementById('swordShopModal');
const shopSaysEl = document.getElementById('shopSays');
let shopKeeper = null;        // the counter's `swordShop` settings while the pop-up is open
let shopModalOpenedAt = 0;

registerGameState('SWORD_SHOP', {
  draw: () => drawGame(),
  onKey: e => { if (e.key === 'Escape') closeSwordShop(); },
  inWorld: true,
  inputs: [shopModalEl]
});

function shopKeeperName() { return (shopKeeper && shopKeeper.keeper) || 'Ember'; }

function shopSay(text) {
  shopSaysEl.textContent = text;
  shopSaysEl.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
  const coins = backpack.filter(isCoin).length;
  document.getElementById('shopWallet').textContent = coins
    ? `🎒 In your backpack: 🪙 × ${coins} (${dollars(walletTotal())})`
    : '🎒 No coins in your backpack (coins in the bank have to be taken out first)';
  const k = swordKindDef();
  document.getElementById('shopHolding').textContent = swordRating > 0
    ? `You're holding: ${k.emoji} ${k.name} (${swordRating} of ${swordMax()})`
    : 'Your sword is worn out!';
  for (const btn of shopModalEl.querySelectorAll('[data-sword]')) {
    btn.classList.toggle('tooPricey', SHOP_SWORDS[btn.dataset.sword].price > walletTotal());
  }
}

// One button per sword, built once
function buildShopButtons() {
  const list = document.getElementById('shopSwords');
  if (list.childElementCount) return;
  for (const [id, sw] of Object.entries(SHOP_SWORDS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'orange';
    b.dataset.sword = id;
    b.innerHTML = `<span class="shopName">${sw.emoji} ${sw.name} <span class="shopPrice">$${sw.price}</span></span>` +
      `<small>${sw.about}</small>`;
    list.appendChild(b);
  }
}

function openSwordShop(obj) {
  shopKeeper = obj.swordShop || {};
  buildShopButtons();
  document.getElementById('shopKeeperFace').textContent = shopKeeper.emoji || '🐉';
  const who = player.character ? player.character.name : 'camper';
  shopSay(`Welcome, ${who}! I'm ${shopKeeperName()}, and I make the best swords in camp. ` +
    'Pay with the coins in your backpack. Which one do you want?');
  shopModalEl.hidden = false;
  state = GameState.SWORD_SHOP;
  shopModalOpenedAt = performance.now();
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  player.walking = false;
  player.frame = 0;
  setTimeout(() => {
    if (!shopModalEl.hidden) shopModalEl.querySelector('[data-sword]').focus();
  }, 80);
}

function closeSwordShop() {
  if (state !== GameState.SWORD_SHOP) return;
  shopModalEl.hidden = true;
  if (shopModalEl.contains(document.activeElement)) document.activeElement.blur();
  state = GameState.PLAYING;
  useToast = { text: `${shopKeeperName()} waves goodbye! 👋 Come back soon!`, age: 0 };
}

// Which coins pay `price`: the biggest that fit first; if that still isn't
// enough, the smallest coin that covers the rest (and change comes back)
function coinsToPay(price) {
  const coins = backpack.filter(isCoin).sort((a, b) => coinValue(b) - coinValue(a));
  const paid = [];
  let left = price;
  for (const c of coins) {
    if (left > 0 && coinValue(c) <= left) { paid.push(c); left -= coinValue(c); }
  }
  if (left > 0) {
    const cover = coins.filter(c => !paid.includes(c)).reverse().find(c => coinValue(c) >= left);
    if (!cover) return null;
    paid.push(cover);
    left -= coinValue(cover);
  }
  return { paid, change: -left };
}

function buySword(id) {
  const sw = SHOP_SWORDS[id];
  const have = walletTotal();
  if (have < sw.price) {
    shopSay(have
      ? `The ${sw.emoji} ${sw.name} costs $${sw.price}, and you have $${have} in your backpack. You need $${sw.price - have} more!`
      : `The ${sw.emoji} ${sw.name} costs $${sw.price}, but you have no coins in your backpack. Beat a boss, or take some out of the bank! 🏦`);
    return;
  }
  const pay = coinsToPay(sw.price);
  if (!pay) { shopSay("Hmm, I can't make that add up. Try the bank? 🏦"); return; }
  backpack = backpack.filter(it => !pay.paid.includes(it));
  const changeCoins = Math.floor(pay.change / BANK_COIN.value);
  for (let i = 0; i < changeCoins; i++) backpack.push({ ...BANK_COIN });
  const old = swordRating > 0 ? swordKindDef() : null;
  equipSwordKind(id);
  shopSay(`Here you go: one ${sw.emoji} ${sw.name}, good as new (${sw.max})! ` +
    (old ? `I'll take your old ${old.name} as a trade-in. ` : '') +
    (changeCoins ? `And here's $${changeCoins * BANK_COIN.value} change. ` : '') +
    'Go get those Marshmallows! 🔥');
}

shopModalEl.addEventListener('click', (e) => {
  if (performance.now() - shopModalOpenedAt < 300) return;
  const sword = e.target.closest('[data-sword]');
  if (sword) { buySword(sword.dataset.sword); return; }
  if (e.target.closest('[data-shop="close"]')) closeSwordShop();
});
shopModalEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeSwordShop(); }
});

registerHotspotKind({
  match: obj => !!obj.swordShop,
  interact: obj => { openSwordShop(obj); },
  hint: () => `${actionKeyLabel()} ⚔️ Buy a sword`
});
