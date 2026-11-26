// --- Coins: $10 coins and the like, in the backpack ---
// A coin is an item with `coin: true` (or "coin" in its id) and a `value` in
// dollars (default 10). The Blob takes them, the bank keeps them safe, and the
// kitchen's dessert shop takes them as payment.

function isCoin(item) { return !!(item && (item.coin || /coin/i.test(item.id || ''))); }

function coinValue(it) { return it.value || 10; }
function walletTotal() { return backpack.filter(isCoin).reduce((sum, it) => sum + coinValue(it), 0); }
