// --- Game Logic ---
function update() {
  if (state !== GameState.PLAYING) return;
  if (devMode) return;  // freeze everything while editing hotspots

  // Hold still while a door swings open, then go through it
  if (doorOpening) {
    if (performance.now() - doorOpening.start >= DOOR_OPEN_MS) {
      const o = doorOpening.obj;
      doorOpening = null;
      switchMap(o.targetMap, o.targetHotspot);
    }
    return;
  }

  // Hold still while the Blob shouts at you, then off to the fight view
  if (bossEngage) {
    if (performance.now() - bossEngage.start >= BOSS_ENGAGE_MS) startFight();
    return;
  }

  // Movement (suppressed while backpack overlay is open — arrow keys drive selection)
  let dx = 0, dy = 0;
  player.walking = false;

  if (!backpackOpen) {
    if (keys['ArrowLeft'] || keys['a']) { dx = -player.speed; player.facing = 'left'; player.walking = true; }
    if (keys['ArrowRight'] || keys['d']) { dx = player.speed; player.facing = 'right'; player.walking = true; }
    if (keys['ArrowUp'] || keys['w']) { dy = -player.speed; player.walking = true; }
    if (keys['ArrowDown'] || keys['s']) { dy = player.speed; player.walking = true; }
  }

  // Keyboard cancels tap-to-move
  if (player.walking) {
    tapTarget = null;
  }

  // Tap-to-move: walk toward tapped map position
  if (!player.walking && tapTarget) {
    const tdx = tapTarget.x - player.x;
    const tdy = tapTarget.y - player.y;
    const dist = Math.hypot(tdx, tdy);
    if (dist < player.speed + 2) {
      tapTarget = null;
    } else {
      dx = (tdx / dist) * player.speed;
      dy = (tdy / dist) * player.speed;
      player.facing = tdx < 0 ? 'left' : 'right';
      player.walking = true;
    }
  }

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  // Apply movement with map bounds (using scaled dimensions)
  if (mapImage) {
    player.x = Math.max(10, Math.min(scaledMapW - 10, player.x + dx));
    player.y = Math.max(10, Math.min(scaledMapH - 10, player.y + dy));
  }

  // Animation frame
  if (player.walking) {
    player.frameTimer++;
    if (player.frameTimer > 8) {
      player.frame = (player.frame + 1) % 4;
      player.frameTimer = 0;
    }
  } else {
    player.frame = 0;
    player.frameTimer = 0;
  }

  // Check for nearby interactive objects
  nearbyObject = null;
  let closestDist = Infinity;
  const px = player.x;
  const py = player.y;

  for (const obj of interactiveObjects) {
    const objCx = obj.x + obj.width / 2;
    const objCy = obj.y + obj.height / 2;
    const dist = Math.hypot(px - objCx, py - objCy);
    const threshold = Math.max(obj.width, obj.height) * 0.7 + 30;

    if (dist < threshold && dist < closestDist) {
      closestDist = dist;
      nearbyObject = obj;
    }
  }

  // Nearby friends: they turn to look at you, and the closest one can be talked to
  nearbyNpc = null;
  let npcBest = NPC_TALK_RANGE * (SPRITE_SCALE / BASE_SPRITE_SCALE);   // bigger people reach further
  for (const npc of talkablesHere()) {
    const p = speakerFeet(npc);
    const d = Math.hypot(px - p.x, py - p.y);
    if (d < 450 && !npc.remote) npcFacing[npc.id] = px < p.x ? 'left' : 'right';
    if (d < npcBest) {
      npcBest = d;
      nearbyNpc = npc;
    }
  }

  // The Blob comes and goes from its cave as it likes (and may ambush you)
  updateMapBoss();

  // Update camera to follow player
  updateCamera();
}

function updateCamera() {
  if (!mapImage) return;

  // Camera targets player center
  let targetX = player.x - canvas.width / 2;
  let targetY = player.y - canvas.height / 2;

  // Clamp camera to scaled map bounds
  targetX = Math.max(0, Math.min(scaledMapW - canvas.width, targetX));
  targetY = Math.max(0, Math.min(scaledMapH - canvas.height, targetY));

  // If the map is smaller than canvas, center it
  if (scaledMapW < canvas.width) targetX = -(canvas.width - scaledMapW) / 2;
  if (scaledMapH < canvas.height) targetY = -(canvas.height - scaledMapH) / 2;

  // Smooth camera follow
  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;
}
