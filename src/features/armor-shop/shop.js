// ============================================================
// ARMOR SHOP — buy armor with the coins in your backpack
// ============================================================
// A hotspot with an `armorShop` object is the shop counter:
//   "armorShop": { "keeper": "Shelly", "emoji": "🐢" }
// Space there opens #armorShopModal (state ARMOR_SHOP), with one button per
// kind in ARMOR_KINDS (armor.js). You pay with the 🪙 coins in your backpack
// (not the bank), using the sword shop's coinsToPay, and the keeper gives
// change in $10 coins. New armor replaces what you're wearing (traded in).
const armorModalEl = document.getElementById('armorShopModal');
const armorSaysEl = document.getElementById('armorSays');
let armorKeeper = null;
let armorModalOpenedAt = 0;

registerGameState('ARMOR_SHOP', {
  draw: () => drawGame(),
  onKey: e => { if (e.key === 'Escape') closeArmorShop(); },
  inWorld: true,
  inputs: [armorModalEl]
});

function armorKeeperName() { return (armorKeeper && armorKeeper.keeper) || 'Shelly'; }

function armorSay(text) {
  armorSaysEl.textContent = text;
  armorSaysEl.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
  const coins = backpack.filter(isCoin).length;
  document.getElementById('armorWallet').textContent = coins
    ? `🎒 In your backpack: 🪙 × ${coins} (${dollars(walletTotal())})`
    : '🎒 No coins in your backpack (coins in the bank have to be taken out first)';
  document.getElementById('armorWearing').textContent = wearingArmor()
    ? `You're wearing: ${armorDef().emoji} ${armorDef().name} (${armorRating} of ${armorDef().max})`
    : "You're not wearing any armor.";
  for (const btn of armorModalEl.querySelectorAll('[data-armor]')) {
    btn.classList.toggle('tooPricey', ARMOR_KINDS[btn.dataset.armor].price > walletTotal());
  }
}

function buildArmorButtons() {
  const list = document.getElementById('armorKinds');
  if (list.childElementCount) return;
  for (const [id, a] of Object.entries(ARMOR_KINDS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'blue';
    b.dataset.armor = id;
    b.innerHTML = `<span class="shopName">${a.emoji} ${a.name} <span class="shopPrice">$${a.price}</span></span>` +
      `<small>${a.about}</small>`;
    list.appendChild(b);
  }
}

function openArmorShop(obj) {
  armorKeeper = obj.armorShop || {};
  buildArmorButtons();
  document.getElementById('armorKeeperFace').textContent = armorKeeper.emoji || '🐢';
  const who = player.character ? player.character.name : 'camper';
  armorSay(`Hello, ${who}... I'm ${armorKeeperName()}. My armor can stop a boss's hit! ` +
    'Pay with the coins in your backpack. Which one would you like?');
  armorModalEl.hidden = false;
  state = GameState.ARMOR_SHOP;
  armorModalOpenedAt = performance.now();
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  player.walking = false;
  player.frame = 0;
  setTimeout(() => {
    if (!armorModalEl.hidden) armorModalEl.querySelector('[data-armor]').focus();
  }, 80);
}

function closeArmorShop() {
  if (state !== GameState.ARMOR_SHOP) return;
  armorModalEl.hidden = true;
  if (armorModalEl.contains(document.activeElement)) document.activeElement.blur();
  state = GameState.PLAYING;
  useToast = { text: `${armorKeeperName()} waves goodbye... slowly. 🐢👋`, age: 0 };
}

function buyArmor(id) {
  const a = ARMOR_KINDS[id];
  const have = walletTotal();
  if (have < a.price) {
    armorSay(have
      ? `The ${a.emoji} ${a.name} costs $${a.price}, and you have $${have} in your backpack. You need $${a.price - have} more!`
      : `The ${a.emoji} ${a.name} costs $${a.price}, but you have no coins in your backpack. Beat a boss, or take some out of the bank! 🏦`);
    return;
  }
  const pay = coinsToPay(a.price);
  if (!pay) { armorSay("Hmm... I can't make that add up. Try the bank? 🏦"); return; }
  backpack = backpack.filter(it => !pay.paid.includes(it));
  const changeCoins = Math.floor(pay.change / BANK_COIN.value);
  for (let i = 0; i < changeCoins; i++) backpack.push({ ...BANK_COIN });
  const old = wearingArmor() ? armorDef() : null;
  equipArmor(id);
  armorSay(`There you go: ${a.emoji} ${a.name}, good as new (${a.max})! ` +
    (old ? `I'll take your old ${old.name} as a trade-in. ` : '') +
    (changeCoins ? `And here's $${changeCoins * BANK_COIN.value} change. ` : '') +
    'Now that Brick can bonk all it wants! 🛡️');
}

armorModalEl.addEventListener('click', (e) => {
  if (performance.now() - armorModalOpenedAt < 300) return;
  const btn = e.target.closest('[data-armor]');
  if (btn) { buyArmor(btn.dataset.armor); return; }
  if (e.target.closest('[data-armorshop="close"]')) closeArmorShop();
});
armorModalEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeArmorShop(); }
});

registerHotspotKind({
  match: obj => !!obj.armorShop,
  interact: obj => { openArmorShop(obj); },
  hint: () => `${actionKeyLabel()} 🛡️ Buy armor`
});
