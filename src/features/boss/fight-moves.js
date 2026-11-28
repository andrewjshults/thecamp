// A fighter can be frozen solid for a while (a.frozenUntil; the Fifth
// Camp's Moon): act 'frozen', and they can't move, swing or block.
function fightBusy(a) { return a.act === 'attack' || a.act === 'hit' || a.act === 'blockstun' || a.act === 'ko' || a.act === 'frozen'; }

function fightAttack() {
  const f = fight;
  if (!f || f.phase !== 'fight') return;
  const p = f.p, b = f.b, now = performance.now();
  if (fightBusy(p)) return;
  p.mashing = !!(p.lastAttack && now - p.lastAttack < 560);   // swinging again the instant it can
  p.act = 'attack';
  p.actStart = now;
  p.lastAttack = now;
  p.hitChecked = false;
  p.recover = P_RECOVER / strengthSpeed(p.strength) / swordStats().speed;   // tired arms swing slower
  wearSword(f, SWORD_SWING_WEAR);
  // Sometimes the Blob sees it coming and puts its sword up
  b.rolledBlock = Math.abs(p.x - b.x) < playerReach() + 60 && bossMaybeBlock(f, now);
}

// More likely right after it's been bonked, and a lot more against mashing
function bossMaybeBlock(f, now) {
  const b = f.b, p = f.p;
  if (b.act !== 'idle' && b.act !== 'walk') return false;
  const wary = b.lastHit && now - b.lastHit < 1500 ? 0.2 : 0;
  const chance = Math.min(0.8, 0.22 + fightTune(f).block + 0.02 * p.score + wary + (p.mashing ? 0.35 : 0));
  if (Math.random() < chance) {
    b.act = 'block';
    b.actStart = now;
  }
  return true;    // it had its chance
}

function fightJump() {
  const f = fight;
  if (!f || f.phase !== 'fight') return;
  const p = f.p;
  if (p.y > 0 || fightBusy(p) || p.act === 'block') return;
  p.vy = JUMP_V;
  p.act = 'jump';
}

function fightPop(f, text, x, y, color, size) {
  f.pops.push({ text, x, y, color, size: size || 1, start: performance.now() });
}

function fightSay(f, text, dur) {
  f.shout = { text, start: performance.now(), dur: dur || 1100 };
}

// How far your sword reaches (a longer shop sword reaches further)
function playerReach() { return P_REACH + swordStats().reach; }
// The odds a swing lands / a block holds: strength, plus what your sword adds
function swingOdds(att, who) {
  if (who === 'player' && swordStats().hitOdds != null) return swordStats().hitOdds;   // the lava sword: 1 in 5
  return Math.min(0.98, strengthOdds(att.strength) + (who === 'player' ? swordStats().land : 0));
}
function guardOdds(f, guard) {
  return Math.min(0.98, strengthOdds(guard.strength) + (guard === f.p ? swordStats().guard + playerGuardBonus(f) : 0));
}

// One swing lands (or doesn't) on `def`
function resolveHit(f, att, def, who) {
  const now = performance.now();
  const dist = Math.abs(att.x - def.x);
  const reach = who === 'boss' ? B_REACH : who === 'player' ? playerReach() : P_REACH;
  const sw = who === 'player' ? swordStats() : SWORD_STATS_PLAIN;
  const away = def.x > att.x ? 1 : -1;
  const midX = (att.x + def.x) / 2;
  if (dist > reach) return;                                  // whiff
  // Back on its feet just in time? It might get its sword up
  if (who !== 'boss' && !def.rolledBlock) bossMaybeBlock(f, now);
  def.rolledBlock = false;
  // Whoever's guarding: you, or your sidekick's sword up in front of you both
  const ownBlock = def.act === 'block' && def.y === 0;
  const guard = ownBlock ? def : (who === 'boss' && sidekickGuarding(f) ? f.s : null);
  const guardY = guard === f.s ? SIDEKICK_LANE : 0;
  if (who === 'boss' && def.y > 70) {                        // jumped right over it
    fightPop(f, 'MISSED!', def.x, def.y + 230, '#B3E5FC', 0.8);
    return;
  }
  // A strong enough sword can smash right through an armored wind-up
  const smash = def.act === 'windup' && def.armor && sw.pierce > 0 && Math.random() < sw.pierce;
  if (smash) {
    fightPop(f, 'SMASH! 💥', def.x - away * 40, 300, '#FFD54F', 1);
  } else if (def.act === 'windup' && def.armor) {        // counter-attacks can't be stopped
    if (who === 'player') wearSword(f, SWORD_HIT_WEAR);  // sword on sword (the sidekick has their own)
    f.sparks.push({ x: def.x - away * 70, y: 140, color: '#90CAF9', start: now });
    fightPop(f, 'CLANG!', def.x - away * 40, 230, '#90CAF9', 0.9);
    f.shake = 4;
    return;
  }
  // A block only holds if the blocker is strong enough
  const broke = !!guard && Math.random() > guardOdds(f, guard);
  if (guard) emitGameEvent('fightBlocked', { f, guard, att, who, held: !broke });
  if (broke) {
    f.sparks.push({ x: guard.x - away * 70, y: 140 + guardY, color: '#FF8A65', start: now });
    fightPop(f, 'BLOCK BROKEN!', guard.x - away * 40, 300 + guardY, '#FF8A65', 0.8);
  } else if (guard) {
    if (who === 'player') wearSword(f, SWORD_HIT_WEAR);  // sword on sword
    guard.act = 'blockstun';
    guard.actStart = now;
    if (who !== 'boss') def.counter = true;       // the Blob hits right back!
    guard.pushV = 260 * away;
    if (guard !== def) def.pushV = 200 * away;   // the sidekick's guard shoves you both back
    f.sparks.push({ x: guard.x - away * 70, y: 140 + guardY, color: '#90CAF9', start: now });
    fightPop(f, guard === def ? pickOne(['BLOCKED!', 'CLANG!', 'TINK!']) : `🤝 ${pickOne(['BLOCKED!', 'SAVED YOU!', 'CLANG!'])}`,
      guard.x - away * 40, 230 + guardY, guard === def ? '#90CAF9' : guard.char.color, 0.9);
    f.shake = 4;
    return;
  }
  // A swing only lands if the swinger is strong enough — otherwise it gets dodged
  if (!broke && Math.random() > swingOdds(att, who)) {
    def.pushV = 380 * away;
    if (who !== 'boss') {
      fightPop(f, pickOne(['DODGED!', 'TOO WEAK!', 'WIGGLED AWAY!']), def.x, 250, '#B3E5FC', 0.9);
      if (f.def && f.def.dodgePhrases && Math.random() < 0.6) fightSay(f, bossSays('dodgePhrases'), 900);
    } else {
      fightPop(f, pickOne(['YOU DODGED!', 'WHOOSH!', 'MISSED YOU!']), def.x, 250, '#B3E5FC', 0.9);
      if (f.def && f.def.missPhrases && Math.random() < 0.6) fightSay(f, bossSays('missPhrases'), 900);
    }
    return;
  }
  // Something of yours (armor) may stop the boss's hit
  if (who === 'boss' && playerHitGuarded(f, now)) return;
  // HIT! One point (your sidekick's hits count for you).
  if (who === 'player') wearSword(f, SWORD_HIT_WEAR);
  const scorer = who === 'sidekick' ? f.p : att;
  scorer.score++;
  if (who !== 'boss') f.pPulse = now; else f.bPulse = now;
  def.act = 'hit';
  def.actStart = now;
  def.pushV = 950 * away;         // knocked back out of reach: step in again
  def.lastHit = now;
  def.stunX = sw.stun;            // an ice sword freezes it for longer
  f.sparks.push({ x: midX + away * 50, y: 130 + def.y, color: '#FFEB3B', start: now });
  fightPop(f, pickOne(['POW!', 'BONK!', 'SMACK!', 'WHACK!', 'THWACK!', 'BOOF!']), def.x, 250 + def.y, '#FFEB3B', 1.1);
  const popColor = who === 'player' ? player.character.color : who === 'sidekick' ? att.char.color : '#FF9E5E';
  fightPop(f, '+1', att.x, 260 + (who === 'sidekick' ? SIDEKICK_LANE : 0), popColor, 0.8);
  if (who === 'sidekick' && Math.random() < 0.5) fightPop(f, pickOne(SIDEKICK_LINES.hit), att.x, 330 + SIDEKICK_LANE, popColor, 0.55);
  f.shake = 10;
  // a stronger sword knocks off more (power 1.5: 2 💪 half the time)
  const knocks = Math.floor(sw.power) + (sw.power % 1 && Math.random() < sw.power % 1 ? 1 : 0);
  for (let i = 0; i < knocks; i++) loseStrength(f, def, now);
  if (who === 'player' && sw.oneHit) {           // the lava sword: one hit wins
    scorer.score = f.toWin;
    fightPop(f, 'LAVA KNOCKOUT! 🌋', def.x, 340 + def.y, '#FF7043', 1.2);
  }
  if (who === 'boss') fightSay(f, bossSays('hitPhrases'), 1000);
  else if (Math.random() < 0.7) fightSay(f, bossSays('hurtPhrases'), 900);
  else f.shout = null;
  if (scorer.score >= f.toWin) {
    f.phase = 'ko';
    f.phaseStart = now;
    f.winner = who === 'boss' ? 'boss' : 'player';
    def.act = 'ko';
  }
}

function fightPhysics(f, dt) {
  for (const a of f.s ? [f.p, f.b, f.s] : [f.p, f.b]) {
    if (a.y > 0 || a.vy > 0) {
      a.y += a.vy * dt;
      a.vy -= GRAVITY * dt;
      if (a.y <= 0) { a.y = 0; a.vy = 0; }
    }
    if (a.pushV) {
      a.x += a.pushV * dt;
      a.pushV *= Math.exp(-9 * dt);
      if (Math.abs(a.pushV) < 5) a.pushV = 0;
    }
    a.x = clamp(a.x, ARENA_MIN_X, ARENA_MAX_X);
  }
  // Bodies don't pass through each other
  const p = f.p, b = f.b;
  const dir = b.x >= p.x ? 1 : -1;
  const need = FIGHT_MIN_GAP - Math.abs(b.x - p.x);
  if (need > 0) {
    p.x = clamp(p.x - dir * need / 2, ARENA_MIN_X, ARENA_MAX_X);
    b.x = clamp(b.x + dir * need / 2, ARENA_MIN_X, ARENA_MAX_X);
    if (Math.abs(b.x - p.x) < FIGHT_MIN_GAP) {
      if (p.x <= ARENA_MIN_X || p.x >= ARENA_MAX_X) b.x = p.x + dir * FIGHT_MIN_GAP;
      else p.x = b.x - dir * FIGHT_MIN_GAP;
    }
  }
  // Your sidekick doesn't walk into the Blob either (it just steps back)
  if (f.s) {
    const s = f.s;
    const sdir = s.x <= b.x ? -1 : 1;
    if (Math.abs(s.x - b.x) < FIGHT_MIN_GAP) s.x = clamp(b.x + sdir * FIGHT_MIN_GAP, ARENA_MIN_X, ARENA_MAX_X);
  }
}

// `quick`: a fast counter-attack after blocking (still shouts first)
function startBossWindup(f, now, quick) {
  const b = f.b;
  b.act = 'windup';
  b.actStart = now;
  const T = fightTune(f);
  b.armor = !!quick || Math.random() < T.armor;     // armored wind-ups can't be interrupted
  // Gets a bit quicker as the fight goes on, and slower as it gets tired
  b.windup = (quick
    ? randBetween(380, 480) * T.counter
    : (clamp(1000 - 25 * b.score - 12 * f.p.score, 620, 1000) + randBetween(0, 250)) * T.windup) / strengthSpeed(b.strength);
  fightSay(f, bossSays('phrases'), b.windup + 250);   // always says something before it attacks
}

function bossAI(f, now, dt) {
  const b = f.b, p = f.p, T = fightTune(f);
  const dist = Math.abs(p.x - b.x);
  const toward = p.x > b.x ? 1 : -1;
  const t = now - b.actStart;
  const spd = strengthSpeed(b.strength);
  switch (b.act) {
    case 'hit':
      if (t > HIT_STUN * T.stun * (b.stunX || 1)) { b.act = 'idle'; f.bossThinkAt = now + randBetween(150, 450) * T.think; }
      return;
    case 'blockstun':
      if (t > BLOCK_STUN) {
        b.act = 'idle';
        f.bossThinkAt = now + randBetween(100, 300) * T.think;
        if (b.counter) { b.counter = false; startBossWindup(f, now, true); }
      }
      return;
    case 'block':
      if (t > BOSS_BLOCK_MS) b.act = 'idle';
      return;
    case 'windup':
      if (t > b.windup) { b.act = 'attack'; b.actStart = now; b.hitChecked = false; b.recover = B_RECOVER / spd; }
      else b.x += toward * 50 * spd * dt;            // creeps in while yelling
      return;
    case 'attack':
      if (t < B_ACTIVE) b.x += toward * 380 * spd * dt;   // lunge!
      if (!b.hitChecked && t >= B_ACTIVE * 0.7) { b.hitChecked = true; resolveHit(f, b, p, 'boss'); }
      if (t >= B_ACTIVE + (b.recover || B_RECOVER) && b.act === 'attack') { b.act = 'idle'; f.bossThinkAt = now + randBetween(250, 700) * T.think; }
      return;
  }
  // Free to choose what to do next
  if (now >= f.bossThinkAt) {
    const r = Math.random();
    // You're swinging nonstop up close: put the sword up or back off
    if (p.mashing && now - p.lastAttack < 600 && dist <= P_REACH + 40 && r < 0.6) {
      if (r < 0.4) { b.act = 'block'; b.actStart = now; }
      else b.ai = 'retreat';
      f.bossThinkAt = now + randBetween(300, 600) * T.think;
      return;
    }
    if (dist <= B_REACH + 40 && r < 0.6 + T.aggro) { startBossWindup(f, now); return; }
    if (dist > B_REACH - 30 && r < 0.85) b.ai = 'approach';
    else if (r < 0.93 && dist < 520) b.ai = 'retreat';
    else b.ai = 'wait';
    f.bossThinkAt = now + randBetween(300, 800) * T.think;
  }
  if (b.ai === 'approach' && dist > FIGHT_MIN_GAP + 30) {
    b.x += toward * 190 * spd * T.speed * dt;
    b.walk += dt * spd;
    b.act = 'walk';
  } else if (b.ai === 'retreat') {
    b.x -= toward * 150 * spd * T.speed * dt;
    b.walk += dt * spd;
    b.act = 'walk';
  } else {
    b.act = 'idle';
  }
}

function updateFight() {
  const f = fight;
  if (!f) return;
  const now = performance.now();
  const dt = Math.min(0.05, (now - f.lastT) / 1000);
  f.lastT = now;
  f.shake = Math.max(0, f.shake - dt * 40);
  f.pops = f.pops.filter(pp => now - pp.start < 900);
  f.sparks = f.sparks.filter(sp => now - sp.start < 350);
  if (f.shout && now - f.shout.start > f.shout.dur) f.shout = null;

  if (f.phase === 'intro') {
    if (now - f.phaseStart > 2100) { f.phase = 'fight'; f.phaseStart = now; f.bossThinkAt = now + 500; }
    fightPhysics(f, dt);
    return;
  }
  if (f.phase === 'ko') {
    for (const a of f.s ? [f.p, f.b, f.s] : [f.p, f.b]) {
      if (a.act === 'block' && a === f.s) a.act = 'idle';
      if (a.act === 'attack' && now - a.actStart > 700) a.act = 'idle';
      if ((a.act === 'hit' || a.act === 'blockstun' || a.act === 'windup' || a.act === 'frozen') && now - a.actStart > HIT_STUN) a.act = 'idle';
    }
    if (now - f.phaseStart > 2000) finishFight(false);
    fightPhysics(f, dt * 0.35);                      // slow-mo K.O.
    return;
  }
  if (f.phase !== 'fight') return;
  regenStrength(f, now);

  const p = f.p, b = f.b;
  p.facing = b.x >= p.x ? 'right' : 'left';
  b.facing = p.x >= b.x ? 'right' : 'left';

  const left = keys['ArrowLeft'] || keys['a'] || fightTouch.left;
  const right = keys['ArrowRight'] || keys['d'] || fightTouch.right;
  const blockHeld = keys['b'] || keys['B'] || fightTouch.block;

  // Player timers
  const pt = now - p.actStart;
  if (p.act === 'attack') {
    if (!p.hitChecked && pt >= P_STARTUP) { p.hitChecked = true; resolveHit(f, p, b, 'player'); }
    if (p.act === 'attack' && pt >= P_STARTUP + P_ACTIVE + (p.recover || P_RECOVER)) p.act = 'idle';
  } else if (p.act === 'hit' && pt > HIT_STUN) p.act = 'idle';
  else if (p.act === 'blockstun' && pt > BLOCK_STUN) p.act = 'block';
  else if (p.act === 'frozen' && !(now < p.frozenUntil)) p.act = 'idle';

  if (f.phase === 'fight' && !fightBusy(p)) {
    if (blockHeld && p.y === 0) {
      p.act = 'block';
    } else {
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      if (dir) {
        const forward = (dir > 0) === (p.facing === 'right');
        const speed = strengthSpeed(p.strength);
        p.x += dir * (forward ? 280 : 230) * speed * dt;
        p.walk += dt * speed;
      }
      p.act = p.y > 0 ? 'jump' : (dir ? 'walk' : 'idle');
    }
  }

  if (f.s) sidekickAI(f, now, dt);
  if (f.foe.update) f.foe.update(f, now, dt);     // a foe's own tricks (the Moon's freeze)
  if (f.phase === 'fight') bossAI(f, now, dt);
  fightPhysics(f, dt);
}

function finishFight(fled) {
  const f = fight;
  const won = !fled && f.winner === 'player';
  const res = { won, fled, lines: [] };
  f.foe.finish(f, res, won, fled);
  emitGameEvent('fightOver', { foe: f.foe, won, fled, level: f.level, res });
  if (swordRating <= 0) {
    res.lines.push({
      text: hasSpareSword()
        ? 'Your sword is worn out, so you grab the spare from your backpack. 🗡️'
        : 'Your sword is worn out! 🗡️ Find a new one before you fight again.',
      color: '#FFE082'
    });
  }
  if (f.s) {
    f.sidekickLine = pickOne(won ? SIDEKICK_LINES.won : fled ? SIDEKICK_LINES.fled : SIDEKICK_LINES.lost);
    res.lines.push({ text: `🤝 ${f.s.name}: "${f.sidekickLine}"`, color: lightenColor(f.s.char.color, 0.6) });
  }
  writeSave();
  f.phase = 'result';
  f.phaseStart = performance.now();
  f.result = res;
  f.shout = null;
  if (fled) f.p.act = 'idle';
  if (!won && f.foe.gloat) res.lines.push(f.foe.gloat(fled));
}

// The Blob's prize, or the coins it gobbles up
function blobFinish(f, res, won) {
  const reward = (f.def && f.def.reward) || DEFAULT_BOSS_REWARD;
  if (won) bossWins++;
  if (won) giveFightReward(reward, f.def.cave, res, 'at the cave');
  else gobbleBackpackCoins(res, 'The Blob');
  if (won) {
    res.lines.push({
      text: bossLevel() > f.level
        ? `The Blob is getting tougher! 💪 Next time it's Level ${bossLevel()} of ${BOSS_LEVEL_MAX}.`
        : `That's the toughest Blob there is (Level ${BOSS_LEVEL_MAX}), and you beat it! ⭐`,
      color: '#B3E5FC'
    });
  }
  f.foe.gloat = fled => ({
    text: `"${pickOne(fled ? ['hehe! me keep shinies!', 'run run little snack!'] : ['nom nom nom!', 'BURP! yummy!', 'me tummy full!'])}" says the Blob`,
    color: '#FFB74D'
  });
}

// A prize goes in the backpack, or waits at hotspot `spotId` (`where`) if it's full
function giveFightReward(reward, spotId, res, where) {
  if (backpack.length < BACKPACK_CAPACITY) {
    backpack.push({ ...reward });
    res.lines.push(`You got a special ${reward.emoji} ${reward.name}!`);
    res.lines.push('It\'s in your backpack. 🎒');
    return;
  }
  const there = hotspotItems[spotId] || (hotspotItems[spotId] = []);
  if (there.length + mpPendingDropsAt(spotId) < HOTSPOT_CAPACITY) {
    // In a multiplayer world a hotspot's items are shared, so it goes via PubNub
    if (mp.active) mpRequestDrop(spotId, { ...reward });
    else there.push({ ...reward });
    res.lines.push(`You won a special ${reward.emoji} ${reward.name}!`);
    res.lines.push(`Your backpack is full, so it's waiting ${where}.`);
  } else {
    res.lines.push(`You won a ${reward.emoji} ${reward.name}...`);
    res.lines.push('...but there was no room for it anywhere! 😢');
  }
}

// Lost: `who` ("The Blob") eats every coin in your backpack (the bank keeps the rest safe)
function gobbleBackpackCoins(res, who) {
  const lost = backpack.filter(isCoin);
  backpack = backpack.filter(it => !isCoin(it));
  const total = lost.reduce((sum, it) => sum + (it.value || 0), 0);
  if (lost.length) {
    res.lines.push(`${who} gobbled up your ${lost.length === 1 ? 'coin' : lost.length + ' coins'}${total ? ` ($${total})` : ''}! 😱`);
    res.lines.push(lost.map(it => it.emoji || '🪙').join(' ') + '  →  👄');
  } else {
    res.lines.push(`You had no coins, so ${who.replace(/^The /, 'the ')} got nothing.`);
    res.lines.push('Phew! 😅');
  }
}

function endFight() {
  if (!fight) return;
  const won = fight.result && fight.result.won;
  const foe = fight.foe;
  const sidekickLine = fight.s ? fight.sidekickLine : null;
  fight = null;
  // The fight's over, so your sidekick heads home
  if (sidekickLine) releaseSidekick(sidekickLine);
  fightTouch = { left: false, right: false, block: false };
  foe.end(won);
  state = GameState.PLAYING;
  // A worn-out sword: use the spare, or a new one turns up somewhere
  if (swordRating <= 0 && !equipSpareSword()) findOrDropSword();
  foe.after(won);
}

function handleFightKey(e) {
  const f = fight;
  if (!f) return;
  if (f.phase === 'result') {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') endFight();
    return;
  }
  if (e.key === 'Escape' && f.phase !== 'ko') { finishFight(true); return; }   // run away!
  if (e.repeat) return;
  if (f.foe.onKey && f.foe.onKey(f, e)) return;    // a foe's own keys (the Moon's cheat code)
  if (e.key === ' ') fightAttack();
  else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') fightJump();
}

// Touch: on-screen buttons. Movement/block are held; attack/jump fire on press.
function fightButtonSize() { return Math.round(Math.max(54, Math.min(76, canvas.width * 0.13))); }
function fightButtonRects() {
  const sz = fightButtonSize();
  const m = 14, gap = 10, y = canvas.height - sz - m;
  return [
    { id: 'left',   x: m,                         y,                 w: sz, h: sz, label: '◀' },
    { id: 'right',  x: m + sz + gap,              y,                 w: sz, h: sz, label: '▶' },
    { id: 'jump',   x: m + (sz + gap) / 2,        y: y - sz - gap,   w: sz, h: sz, label: '▲' },
    { id: 'block',  x: canvas.width - m - sz * 2 - gap, y,           w: sz, h: sz, label: '🛡️' },
    { id: 'attack', x: canvas.width - m - sz,     y: y - sz * 0.5,   w: sz, h: sz, label: '⚔️' }
  ];
}
function handleFightTouches(e, isStart) {
  const f = fight;
  if (!f) return;
  if (isStart && f.phase === 'result') { endFight(); return; }
  const rect = canvas.getBoundingClientRect();
  const btns = fightButtonRects();
  const hitBtn = (t) => {
    const x = t.clientX - rect.left, y = t.clientY - rect.top;
    return btns.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  };
  const held = { left: false, right: false, block: false };
  for (const t of e.touches) {
    const b = hitBtn(t);
    if (b && b.id in held) held[b.id] = true;
  }
  fightTouch = held;
  if (isStart) {
    for (const t of e.changedTouches) {
      const b = hitBtn(t);
      if (b && b.id === 'attack') fightAttack();
      if (b && b.id === 'jump') fightJump();
    }
  }
}
