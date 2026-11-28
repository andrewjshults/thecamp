// ============================================================
// SHIELD SHOP — Charlie's shield counter at the Fifth Camp
// ============================================================
// A hotspot with a `shieldShop` object is the counter:
//   "shieldShop": { "keeper": "Charlie", "emoji": "🦊", "greeting": "... {name} ...", "cheer": "..." }
// Space there opens #shieldShopModal (state SHIELD_SHOP), with one button per
// kind in SHIELD_KINDS (shields.js). You pay with the 🪙 coins in your
// backpack (the sword shop's coinsToPay), and get change in $10 coins, like
// the armor shop. A new shield replaces the one you carry (traded in).
const shieldModalEl = document.getElementById('shieldShopModal');
const shieldSaysEl = document.getElementById('shieldSays');
let shieldKeeper = null;
let shieldModalOpenedAt = 0;

registerGameState('SHIELD_SHOP', {
  draw: () => drawGame(),
  onKey: e => { if (e.key === 'Escape') closeShieldShop(); },
  inWorld: true,
  inputs: [shieldModalEl]
});

function shieldKeeperName() { return (shieldKeeper && shieldKeeper.keeper) || 'Charlie'; }

function shieldSay(text) {
  shieldSaysEl.textContent = text;
  shieldSaysEl.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
  const coins = backpack.filter(isCoin).length;
  document.getElementById('shieldWallet').textContent = coins
    ? `🎒 In your backpack: 🪙 × ${coins} (${dollars(walletTotal())})`
    : '🎒 No coins in your backpack (coins in the bank have to be taken out first)';
  document.getElementById('shieldCarrying').textContent = carryingShield()
    ? `You're carrying: ${shieldDef().emoji} ${shieldDef().name} (${shieldRating} of ${shieldDef().max})`
    : "You don't have a shield.";
  for (const btn of shieldModalEl.querySelectorAll('[data-shield]')) {
    btn.classList.toggle('tooPricey', SHIELD_KINDS[btn.dataset.shield].price > walletTotal());
  }
}

function buildShieldButtons() {
  const list = document.getElementById('shieldKinds');
  list.innerHTML = '';
  for (const [id, s] of Object.entries(SHIELD_KINDS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'blue';
    b.dataset.shield = id;
    b.innerHTML = `<span class="shopName">${s.emoji} ${s.name} <span class="shopPrice">$${s.price}</span></span>` +
      `<small>${s.about}</small>`;
    list.appendChild(b);
  }
}

function openShieldShop(obj) {
  shieldKeeper = obj.shieldShop || {};
  buildShieldButtons();
  document.getElementById('shieldKeeperFace').textContent = shieldKeeper.emoji || '🦊';
  const who = player.character ? player.character.name : 'camper';
  shieldSay(shieldKeeper.greeting ? shieldKeeper.greeting.replace(/\{name\}/g, who)
    : `Hi, ${who}! I'm ${shieldKeeperName()}. A shield makes your blocks hold better! Pay with the coins in your backpack.`);
  shieldModalEl.hidden = false;
  state = GameState.SHIELD_SHOP;
  shieldModalOpenedAt = performance.now();
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  player.walking = false;
  player.frame = 0;
  setTimeout(() => {
    if (!shieldModalEl.hidden) shieldModalEl.querySelector('[data-shield]').focus();
  }, 80);
}

function closeShieldShop() {
  if (state !== GameState.SHIELD_SHOP) return;
  shieldModalEl.hidden = true;
  if (shieldModalEl.contains(document.activeElement)) document.activeElement.blur();
  state = GameState.PLAYING;
  useToast = { text: `${shieldKeeperName()} waves goodbye! 🦊👋`, age: 0 };
}

function buyShield(id) {
  const s = SHIELD_KINDS[id];
  const have = walletTotal();
  if (have < s.price) {
    shieldSay(have
      ? `The ${s.emoji} ${s.name} costs $${s.price}, and you have $${have} in your backpack. You need $${s.price - have} more!`
      : `The ${s.emoji} ${s.name} costs $${s.price}, but you have no coins in your backpack. Beat a boss, or take some out of the bank! 🏦`);
    return;
  }
  const pay = coinsToPay(s.price);
  if (!pay) { shieldSay("Hmm... I can't make that add up. Try the bank? 🏦"); return; }
  backpack = backpack.filter(it => !pay.paid.includes(it));
  const changeCoins = Math.floor(pay.change / BANK_COIN.value);
  for (let i = 0; i < changeCoins; i++) backpack.push({ ...BANK_COIN });
  const old = carryingShield() ? shieldDef() : null;
  equipShield(id);
  shieldSay(`There you go: ${s.emoji} ${s.name}, good as new (${s.max})! Hold B to block with it. ` +
    (old ? `I'll take your old ${old.name} as a trade-in. ` : '') +
    (changeCoins ? `And here's $${changeCoins * BANK_COIN.value} change. ` : '') +
    ((shieldKeeper && shieldKeeper.cheer) || 'Block, block, BONK! 🛡️'));
}

shieldModalEl.addEventListener('click', (e) => {
  if (performance.now() - shieldModalOpenedAt < 300) return;
  const btn = e.target.closest('[data-shield]');
  if (btn) { buyShield(btn.dataset.shield); return; }
  if (e.target.closest('[data-shieldshop="close"]')) closeShieldShop();
});
shieldModalEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeShieldShop(); }
});

registerHotspotKind({
  match: obj => !!obj.shieldShop,
  interact: obj => { openShieldShop(obj); },
  hint: () => `${actionKeyLabel()} 🛡️ Buy a shield`
});
