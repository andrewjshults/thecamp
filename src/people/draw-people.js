// --- Drawing people on the map (player + NPCs, sorted so lower = in front) ---
function drawPlayerSprite() {
  const mouth = mouthOpenFor('player');
  const draw = () => drawCharacterSprite(
    player.x - player.width / 2,
    player.y - player.height,
    player.character,
    player.frame,
    player.facing,
    SPRITE_SCALE,
    mouth,
    heldItem ? heldItem.emoji : null
  );
  if (player.rotation !== 0) {
    const cx = player.x;
    const cy = player.y - player.height / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(player.rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
    draw();
    ctx.restore();
  } else {
    draw();
  }
  // Player shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  const k = SPRITE_SCALE / BASE_SPRITE_SCALE;
  ctx.ellipse(player.x, player.y + 2, 42 * k, 15 * k, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Critters are a big emoji that bobs gently, and squishes up and down
// while they're talking (their "mouth" moving).
function drawCritterSprite(npc) {
  const p = npcPos(npc);
  const s = critterSize(npc);
  const now = performance.now();
  const talk = mouthOpenFor(npc);
  const bob = Math.sin(now / 450 + p.x) * s * 0.03;
  const squish = talk ? 1 + 0.12 * talk : 1;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, s * 0.4, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(2 - squish, squish);          // taller + thinner when "speaking"
  ctx.font = `${Math.round(s)}px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';                  // opaque, or Chrome fades colour emoji
  ctx.fillText(npc.emoji, 0, -s * 0.5 + bob);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawNpcSprite(npc) {
  if (isCritter(npc)) { drawCritterSprite(npc); return; }
  const p = npcPos(npc);
  const m = npcMover(npc);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  const k = SPRITE_SCALE / BASE_SPRITE_SCALE;
  ctx.ellipse(p.x + 9 * k, p.y + 2, 42 * k, 15 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCharacterSprite(
    p.x - player.width / 2,
    p.y - player.height,
    characterByName(npc.character),
    m ? m.frame : 0,
    npcFacing[npc.id] || 'right',
    SPRITE_SCALE,
    mouthOpenFor(npc)
  );
}

// An ex-sidekick walking out the door (fading as they go through)
function drawLeaver(l) {
  ctx.save();
  ctx.globalAlpha = leaverAlpha(l);
  drawNpcSprite(l.npc);
  ctx.restore();
}

// A friend's sidekick, following them around (see mpOnPos)
function drawFriendSidekick(sk) {
  const k = SPRITE_SCALE / BASE_SPRITE_SCALE;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(sk.x + 9 * k, sk.y + 2, 42 * k, 15 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  drawCharacterSprite(sk.x - player.width / 2, sk.y - player.height, sk.char, sk.frame,
    sk.facing, SPRITE_SCALE, mouthOpenFor(sk));
}

// "🤝 Sidekick" over your sidekick's head (and friends' sidekicks)
function drawSidekickTag(owner, label) {
  const head = speakerHead(owner);
  ctx.font = 'bold 12px "Comic Sans MS", cursive';
  ctx.textAlign = 'center';
  const w = ctx.measureText(label).width + 14;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  roundRect(head.x - w / 2, head.top - 30, w, 20, 6);
  ctx.fill();
  ctx.fillStyle = speakerColor(owner);
  ctx.fillText(label, head.x, head.top - 16);
}

function drawNpcTalkHint(npc) {
  const head = speakerHead(npc);
  const x = head.x;
  const y = head.top - 16;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Comic Sans MS", cursive';
  const label = npcName(npc);
  const lw = ctx.measureText(label).width + 16;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  roundRect(x - lw / 2, y - 14, lw, 22, 6);
  ctx.fill();
  ctx.fillStyle = speakerColor(npc);
  ctx.fillText(label, x, y + 2);

  const hint = isTouchDevice() ? '💬 [ TAP ME ]' : '💬 [ T ] Talk';
  ctx.font = '11px "Comic Sans MS", cursive';
  const hw = ctx.measureText(hint).width + 12;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  roundRect(x - hw / 2, y - 38, hw, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#FFF9C4';
  ctx.fillText(hint, x, y - 25);
}

function drawPeople() {
  const people = currentNpcs().map(npc => ({ y: npcPos(npc).y, draw: () => drawNpcSprite(npc) }));
  if (sidekick) people.push({ y: sidekick.y, draw: () => drawNpcSprite(sidekick.npc) });
  for (const l of npcLeavers) people.push({ y: l.y, draw: () => drawLeaver(l) });
  const friendSidekicks = mpSidekicksHere();
  for (const sk of friendSidekicks) people.push({ y: sk.y, draw: () => drawFriendSidekick(sk) });
  const friends = mpPlayersHere();
  for (const rp of friends) people.push({ y: rp.y, draw: () => drawRemotePlayer(rp) });
  people.push({ y: player.y, draw: drawPlayerSprite });
  people.push(...mapPeopleExtras());     // the Blob and other foes (registerMapPeople)
  people.sort((a, b) => a.y - b.y);
  for (const p of people) p.draw();
  // Hint over whoever you're next to: the Blob (or another foe) first, else a friend / NPC
  const foe = state === GameState.PLAYING && !bossEngage ? nearbyFoe() : null;
  const showBossHint = !!foe;
  const hinting = state === GameState.PLAYING && !showBossHint ? nearbyNpc : null;
  for (const rp of friends) if (rp !== hinting) drawNameTag(rp);
  if (sidekick && hinting !== sidekick.npc && state !== GameState.TALKING) drawSidekickTag(sidekick.npc, '🤝 Sidekick');
  for (const sk of friendSidekicks) drawSidekickTag(sk, `🤝 ${sk.owner.name}'s sidekick`);
  if (showBossHint) foe.drawHint();
  else if (hinting) drawNpcTalkHint(hinting);
}
