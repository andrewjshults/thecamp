// ============================================================
// BANK — a teller window you deposit coins into / withdraw them from
// ============================================================
// A hotspot with a `bank` object is a teller window: Space opens #bankModal,
// where buttons ask the teller for your balance, deposit 🪙 coins from the
// backpack, or withdraw them again. The balance is saved per camper (like
// `bossWins`), and coins in the bank are safe from the Blob, which only takes
// coins from your backpack.
//   "bank": { "teller": "Penny", "emoji": "🦉" }
const BANK_COIN = { id: 'ten_dollar_coin', name: '$10 Coin', emoji: '🪙', coin: true, value: 10 };
const bankModalEl = document.getElementById('bankModal');
const bankSaysEl = document.getElementById('bankSays');
let bankModalOpenedAt = 0;
let bankTeller = null;   // the teller hotspot's `bank` settings while the pop-up is open

let bankBalance = 0;   // dollars kept at the Camp Bank (saved per camper)
function savedBankBalance(save) {
  return save ? Math.max(0, Math.floor(Number(save.bankBalance) || 0)) : 0;
}
registerSaveField('bankBalance', { save: () => bankBalance, load: s => { bankBalance = savedBankBalance(s); } });
function tellerName() { return (bankTeller && bankTeller.teller) || 'Penny'; }
function dollars(n) { return `$${n}`; }
function coinsWord(n) { return n === 1 ? '1 coin' : `${n} coins`; }

function bankSay(text) {
  bankSaysEl.textContent = text;
  // a little pop so a repeated answer still looks like a new one
  bankSaysEl.animate([{ transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
  const coins = backpack.filter(isCoin).length;
  document.getElementById('bankWallet').textContent = coins
    ? `🎒 In your backpack: 🪙 × ${coins} (${dollars(walletTotal())})`
    : '🎒 No coins in your backpack';
}

function openBank(obj) {
  bankTeller = obj.bank || {};
  document.getElementById('bankTitle').textContent = `🏦 ${bankTeller.title || mapConfig.name || 'Camp Bank'}`;
  document.getElementById('bankTellerFace').textContent = bankTeller.emoji || '🦉';
  const who = player.character ? player.character.name : 'camper';
  bankSay(`Hello, ${who}! I'm ${tellerName()}, the teller. ` +
    (bankBalance ? 'What can I do for you today?'
      : 'Coins you keep in the bank are safe, even from the Glug Glub Blob!'));
  bankModalEl.hidden = false;
  state = GameState.BANK_MODAL;
  bankModalOpenedAt = performance.now();
  backpackOpen = false;
  journalOpen = false;
  tapTarget = null;
  player.walking = false;
  player.frame = 0;
  // A moment later, so the Space that opened it doesn't also press a button
  setTimeout(() => {
    if (!bankModalEl.hidden) bankModalEl.querySelector('[data-bank="balance"]').focus();
  }, 80);
}

function closeBank() {
  if (state !== GameState.BANK_MODAL) return;
  bankModalEl.hidden = true;
  if (bankModalEl.contains(document.activeElement)) document.activeElement.blur();
  state = GameState.PLAYING;
  useToast = { text: `${tellerName()} waves goodbye! 👋`, age: 0 };
}

function bankBalanceLine() {
  if (!bankBalance) return "You have $0 in the bank right now. Deposit some coins and I'll keep them safe in the vault!";
  const n = Math.floor(bankBalance / BANK_COIN.value);
  return `You have ${dollars(bankBalance)} in the bank. That's ${coinsWord(n)} 🪙 safe in the vault!`;
}

// Put one coin (or every coin) from the backpack into the bank
function bankDeposit(all) {
  const coins = backpack.filter(isCoin);
  if (!coins.length) {
    bankSay("Hmm, you don't have any coins in your backpack. Beat the Blob or look around camp to find some! 🔍");
    return;
  }
  const paid = all ? coins : [coins[0]];
  const total = paid.reduce((sum, c) => sum + coinValue(c), 0);
  backpack = backpack.filter(it => !paid.includes(it));
  bankBalance += total;
  writeSave();
  bankSay(all && paid.length > 1
    ? `Ooh! ${coinsWord(paid.length)}... I count them... ${dollars(total)}! Into the vault they go. Your balance is now ${dollars(bankBalance)}.`
    : `Thank you! I put 🪙 ${dollars(total)} in the vault. Your balance is now ${dollars(bankBalance)}.`);
}

// Take one coin (or as many as fit in the backpack) out of the bank
function bankWithdraw(all) {
  if (bankBalance < BANK_COIN.value) {
    bankSay(bankBalance
      ? `You only have ${dollars(bankBalance)} in the bank. That's not enough for a whole coin!`
      : 'Your account is empty, so there is nothing to take out yet. Deposit some coins first!');
    return;
  }
  const room = BACKPACK_CAPACITY - backpack.length;
  if (room <= 0) {
    bankSay('Oh dear, your backpack is full! Make some room and come back for your coins. 🎒');
    return;
  }
  const want = all ? Math.floor(bankBalance / BANK_COIN.value) : 1;
  const n = Math.min(want, room);
  for (let i = 0; i < n; i++) backpack.push({ ...BANK_COIN });
  bankBalance -= n * BANK_COIN.value;
  writeSave();
  const left = `Your balance is now ${dollars(bankBalance)}.`;
  if (n < want) {
    bankSay(`Your backpack only had room for ${coinsWord(n)}, so here's ${dollars(n * BANK_COIN.value)}. ${left}`);
  } else {
    bankSay(n === 1 ? `Here you go: 🪙 ${dollars(BANK_COIN.value)}! ${left}`
      : `Here you go: ${coinsWord(n)}, that's ${dollars(n * BANK_COIN.value)}! ${left}`);
  }
}

bankModalEl.addEventListener('click', (e) => {
  const b = e.target.closest('[data-bank]');
  if (!b || performance.now() - bankModalOpenedAt < 300) return;
  switch (b.dataset.bank) {
    case 'balance':     bankSay(bankBalanceLine()); break;
    case 'deposit':     bankDeposit(false); break;
    case 'depositAll':  bankDeposit(true); break;
    case 'withdraw':    bankWithdraw(false); break;
    case 'withdrawAll': bankWithdraw(true); break;
    case 'close':       closeBank(); break;
  }
});
bankModalEl.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closeBank(); }
});
