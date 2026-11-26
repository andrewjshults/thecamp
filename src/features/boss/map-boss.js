let bossEngage = null;  // { start, foe } — the Blob (or `foe`, see startFight) is shouting; the fight view opens next
let nearBoss = false;   // close enough to pick a fight

function resetMapBoss(delayMs) {
  mapBoss.map = currentMapPath;
  mapBoss.where = 'home';
  mapBoss.homeUntil = performance.now() + (delayMs != null ? delayMs : randBetween(15000, 30000));
  mapBoss.shout = null;
  mapBoss.target = null;
  mapBoss.moving = false;
  bossEngage = null;
  nearBoss = false;
}

function bossK() { return SPRITE_SCALE / BASE_SPRITE_SCALE; }
function mapBossHeight() { return 135 * bossK(); }
function mapBossPos() { return { x: mapBoss.fx * scaledMapW, y: mapBoss.fy * scaledMapH }; }
function caveMouth() {
  const c = bossCave();
  return { x: c.x + c.width * 0.5, y: c.y + c.height * 0.97 };
}
function mapBossVisible() {
  return !!(bossCave() && !foesOff() && mapBoss.map === currentMapPath &&
    mapBoss.where !== 'home' && mapBoss.where !== 'fighting');
}
function bossShout(text, dur) {
  mapBoss.shout = { text, start: performance.now(), dur: dur || 1600, id: Math.random().toString(36).slice(2, 8) };
}
// Mouth flapping while a shout is still being yelled
function shoutMouth(sh, now) {
  if (!sh) return 0;
  const age = now - sh.start;
  if (age > sh.dur * 0.75) return 0;
  return 0.3 + 0.7 * Math.abs(Math.sin(age / 80));
}

function updateMapBoss() {
  nearBoss = false;
  if (mp.active && !mpRunsBoss()) { if (!foesOff()) mpBossCatchCheck(); return; }
  if (!bossCave() || !player.character) return;
  const now = performance.now();
  if (mapBoss.map !== currentMapPath) resetMapBoss();
  // Bosses off (exploration mode): on your own, it stays in its cave (and
  // comes out a while after they're back on). In a multiplayer world it's
  // shared, so it carries on for your friends but ignores you (below).
  if (foesOff() && !mp.active) {
    Object.assign(mapBoss, { where: 'home', homeUntil: now + 15000, shout: null, target: null, moving: false });
    return;
  }
  const dt = Math.min(50, now - (mapBoss.lastT || now));
  mapBoss.lastT = now;
  if (mapBoss.shout && now - mapBoss.shout.start > mapBoss.shout.dur) mapBoss.shout = null;
  mapBoss.moving = false;

  if (mapBoss.where === 'home') {
    if (now < mapBoss.homeUntil) return;
    // Out it comes, whenever it feels like it
    const m = caveMouth();
    mapBoss.fx = m.x / scaledMapW;
    mapBoss.fy = m.y / scaledMapH;
    mapBoss.where = 'out';
    mapBoss.outUntil = now + randBetween(25000, 45000);
    mapBoss.target = null;
    bossShout('GLUG GLUB!');
    mapBoss.nextShoutAt = now + randBetween(2500, 4000);
    return;
  }

  const k = bossK();
  const pos = mapBossPos();
  const dist = Math.hypot(player.x - pos.x, player.y - pos.y);
  // In a multiplayer world it chases whichever camper is closest
  // (campers without a sword aren't worth chasing)
  const chase = { x: player.x, y: player.y, dist: state === GameState.PLAYING && hasSword() && !foesOff() ? dist : Infinity };
  for (const rp of mpPlayersHere()) {
    const d = Math.hypot(rp.x - pos.x, rp.y - pos.y);
    if (!rp.fighting && rp.sword !== false && d < chase.dist) Object.assign(chase, { x: rp.x, y: rp.y, dist: d });
  }
  if (mapBoss.where === 'out' && now > mapBoss.outUntil) mapBoss.where = 'returning';

  let tx, ty, speed;   // speed: map px per 60fps frame (the player walks at 4)
  if (mapBoss.where === 'returning') {
    const m = caveMouth();
    tx = m.x; ty = m.y; speed = 2.6 * k;
    if (Math.hypot(tx - pos.x, ty - pos.y) < 6 * k) {
      mapBoss.where = 'home';
      mapBoss.homeUntil = now + randBetween(15000, 40000);
      mapBoss.shout = null;
      return;
    }
  } else if (chase.dist < 480 * k) {
    // Smells a camper! Chase them, shouting
    tx = chase.x; ty = chase.y; speed = 2.7 * k;
    if (now >= mapBoss.nextShoutAt) {
      bossShout(bossSays('phrases'));
      mapBoss.nextShoutAt = now + randBetween(2200, 3600);
    }
  } else {
    const t = mapBoss.target;
    if (!t || Math.hypot(t.fx * scaledMapW - pos.x, t.fy * scaledMapH - pos.y) < 10) {
      mapBoss.target = { fx: randBetween(0.08, 0.92), fy: randBetween(0.22, 0.95) };
    }
    tx = mapBoss.target.fx * scaledMapW; ty = mapBoss.target.fy * scaledMapH; speed = 1.6 * k;
  }
  const dx = tx - pos.x, dy = ty - pos.y;
  const d = Math.hypot(dx, dy);
  if (d > 0.5) {
    const step = Math.min(d, speed * dt * 0.06);
    mapBoss.fx = (pos.x + dx / d * step) / scaledMapW;
    mapBoss.fy = (pos.y + dy / d * step) / scaledMapH;
    if (Math.abs(dx) > 2) mapBoss.facing = dx < 0 ? 'left' : 'right';
    mapBoss.walk += dt / 1000;
    mapBoss.moving = true;
  }

  if (foesOff()) return;
  nearBoss = dist < 190 * k;
  // Caught you! (Not while it's heading home for a rest.)
  if (mapBoss.where === 'out' && dist < 55 * k && !doorOpening) engageBoss(true);
}

// The Blob yells something, then the fight view opens (see update())
// `auto`: the Blob caught you (rather than you picking the fight)
function engageBoss(auto) {
  if (state !== GameState.PLAYING || bossEngage || doorOpening || !bossCave() || foesOff()) return;
  if (swordRating <= 0 && !equipSpareSword()) {
    if (!auto) swordNeededHint();     // no sword: the Blob leaves you alone
    return;
  }
  if (mp.active && mapBoss.busyWith && mapBoss.busyWith !== mp.myId) {
    kitchenToast(`The Blob is busy fighting ${mpBossFighterName()}! 👀`);
    return;
  }
  mpBossFight(true);
  if (mapBoss.where === 'home') {
    const m = caveMouth();
    mapBoss.fx = m.x / scaledMapW;
    mapBoss.fy = m.y / scaledMapH;
  }
  mapBoss.where = 'out';
  const pos = mapBossPos();
  mapBoss.facing = player.x < pos.x ? 'left' : 'right';
  player.facing = player.x < pos.x ? 'right' : 'left';
  player.walking = false;
  player.frame = 0;
  tapTarget = null;
  backpackOpen = false;
  journalOpen = false;
  bossShout(bossSays('phrases'), BOSS_ENGAGE_MS + 200);
  bossEngage = { start: performance.now() };
}

function drawMapBoss() {
  const p = mapBossPos();
  const now = performance.now();
  const tail = bossEngage
    ? { ...BLOB_POSES.windup, a: BLOB_POSES.windup.a + Math.sin(now / 30) * 0.06 }
    : { ...BLOB_POSES.idle, a: BLOB_POSES.idle.a + Math.sin(now / 400) * 0.12 };
  drawBlob(p.x, p.y, mapBossHeight(), mapBoss.facing, {
    tail, moving: mapBoss.moving, walk: mapBoss.walk,
    mouth: shoutMouth(mapBoss.shout, now), t: now
  });
}

function drawMapBossHint() {
  const p = mapBossPos();
  const x = p.x;
  const y = p.y - mapBossHeight() - 12;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Comic Sans MS", cursive';
  const label = bossLevel() ? `${bossName()} · Lv ${bossLevel()}` : bossName();
  const lw = ctx.measureText(label).width + 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  roundRect(x - lw / 2, y - 14, lw, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#FF9E5E';
  ctx.fillText(label, x, y + 2);
  const hint = !hasSword() ? '🗡️ Find a sword first!'
    : isTouchDevice() ? '⚔️ [ TAP ME ] Fight!' : '⚔️ [ SPACE ] Fight!';
  ctx.font = '11px "Comic Sans MS", cursive';
  const hw = ctx.measureText(hint).width + 12;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  roundRect(x - hw / 2, y - 38, hw, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#FFF9C4';
  ctx.fillText(hint, x, y - 25);
}

// Screen space, after the map is drawn
function drawMapBossShout() {
  if (!mapBossVisible() || !mapBoss.shout) return;
  const p = mapBossPos();
  const H = mapBossHeight();
  const dir = mapBoss.facing === 'left' ? -1 : 1;
  const age = performance.now() - mapBoss.shout.start;
  drawShout(p.x - camera.x + dir * 0.4 * H, p.y - 0.85 * H - camera.y, mapBoss.shout.text, age, 20);
}

// The cave: a rocky hill with a dark mouth, drawn over the map in the
// cave hotspot's box. Glowing eyes blink inside while the Blob is home.

registerScreenLayer(20, () => drawMapBossShout());
registerMapPeople(() => mapBossVisible() ? [{ y: mapBossPos().y, draw: drawMapBoss }] : []);
// Space / tap next to the Blob picks a fight
registerMapFoe(() => nearBoss ? {
  engage: () => engageBoss(),
  hit(sx, sy) {
    const bp = mapBossPos();
    const bh = mapBossHeight();
    return Math.hypot(sx - (bp.x - camera.x), sy - (bp.y - bh / 2 - camera.y)) < bh * 0.7;
  },
  drawHint: () => drawMapBossHint()
} : null);
// The Blob comes and goes from its cave as it likes (and may ambush you)
registerMapUpdate(10, () => updateMapBoss());
onGameEvent('camperChosen', () => resetMapBoss());
// Walked off the map while the Blob (or another foe) was yelling at you: the
// fight's off (it would otherwise start on the next map)
function cancelBossEngage() {
  if (!bossEngage) return;
  if (!bossEngage.foe) mpBossFight(false, false);
  bossEngage = null;
}
onGameEvent('mapLeave', () => cancelBossEngage());
