function drawBossCave() {
  const c = bossCave();
  if (!c) return;
  const { x, y, width: w, height: h } = c;
  const now = performance.now();
  const ink = '#2b2320';
  const hill = [[0, 1], [0.04, 0.62], [0.16, 0.38], [0.27, 0.42], [0.4, 0.12], [0.52, 0.2],
                [0.62, 0.02], [0.76, 0.26], [0.86, 0.22], [0.97, 0.5], [1, 1]];
  const hillPath = () => {
    ctx.beginPath();
    hill.forEach(([px, py], i) => i ? ctx.lineTo(x + px * w, y + py * h) : ctx.moveTo(x + px * w, y + py * h));
    ctx.closePath();
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  hillPath();
  ctx.fillStyle = '#8d8a94';
  ctx.fill();
  // marker streaks + a few lighter rocks
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(70, 64, 80, 0.35)';
  ctx.lineWidth = Math.max(3, w * 0.025);
  for (let i = 0; i < 14; i++) {
    const sx = x + (i / 14) * w * 1.1 - w * 0.05;
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + w * 0.18, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#aaa7b1';
  for (const [rx, ry, rr] of [[0.2, 0.72, 0.07], [0.8, 0.64, 0.06], [0.55, 0.32, 0.05], [0.32, 0.52, 0.04], [0.9, 0.86, 0.05]]) {
    ctx.beginPath();
    ctx.ellipse(x + rx * w, y + ry * h, rr * w, rr * w * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  hillPath();
  ctx.lineWidth = Math.max(3, w * 0.022);
  ctx.strokeStyle = ink;
  ctx.stroke();

  // the dark mouth (an arch)
  const mw = w * 0.46, mh = h * 0.6;
  const mcx = x + w * 0.5, mBottom = y + h;
  const archY = mBottom - mh + mw / 2;
  ctx.beginPath();
  ctx.moveTo(mcx - mw / 2, mBottom);
  ctx.lineTo(mcx - mw / 2, archY);
  ctx.arc(mcx, archY, mw / 2, Math.PI, 0);
  ctx.lineTo(mcx + mw / 2, mBottom);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, mBottom - mh, 0, mBottom);
  g.addColorStop(0, '#0d0810');
  g.addColorStop(1, '#2a1c26');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.stroke();
  // little rock teeth around the mouth
  ctx.fillStyle = '#d9d4cc';
  for (const f of [-0.6, -0.2, 0.2, 0.6]) {
    const tx = mcx + f * mw * 0.45;
    const ty = archY - Math.sqrt(Math.max(0, 1 - f * f * 0.2)) * mw * 0.5 + 2;
    ctx.beginPath();
    ctx.moveTo(tx - mw * 0.05, ty);
    ctx.lineTo(tx + mw * 0.05, ty);
    ctx.lineTo(tx, ty + mw * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // glowing eyes when the Blob is home (blinking now and then)
  if (mapBoss.map === currentMapPath && mapBoss.where === 'home') {
    const blink = (now % 3200) < 160;
    const ey = mBottom - mh * 0.45;
    const look = Math.sin(now / 900) * mw * 0.05;
    ctx.save();
    ctx.shadowColor = '#FFEB3B';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#FFEB3B';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(mcx + side * mw * 0.14 + look, ey, mw * 0.065, blink ? 1.5 : mw * 0.085, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (!blink) {
      ctx.fillStyle = '#3a1d0a';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(mcx + side * mw * 0.14 + look * 1.4, ey + mw * 0.02, mw * 0.03, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // "BEWARE OF BLOB" sign on the left
  const sw = w * 0.28, sh = h * 0.2;
  const sx = x + w * 0.02, sy = y + h * 0.62;
  ctx.fillStyle = '#7b4a26';
  ctx.fillRect(sx + sw / 2 - w * 0.012, sy + sh * 0.5, w * 0.024, h * 0.36);
  ctx.save();
  ctx.translate(sx + sw / 2, sy + sh / 2);
  ctx.rotate(-0.08);
  ctx.fillStyle = '#c98b4f';
  ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
  ctx.lineWidth = 2;
  ctx.strokeStyle = ink;
  ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
  ctx.fillStyle = '#b71c1c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(7, sh * 0.34)}px "Comic Sans MS", cursive`;
  ctx.fillText('BEWARE', 0, -sh * 0.2);
  ctx.fillText('OF BLOB!', 0, sh * 0.22);
  ctx.restore();
  // bones by the door
  ctx.font = `${Math.round(w * 0.1)}px ${SCENE_EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText('🦴', x + w * 0.84, y + h * 0.93);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// The boss's cave: knock and the Blob comes out to fight
registerHotspotKind({
  match: obj => isBossCave(obj),
  interact() {
    if (mp.active && mapBoss.busyWith && mapBoss.busyWith !== mp.myId) {
      kitchenToast(`The Blob is busy fighting ${mpBossFighterName()}! 👀`);
    } else if (mapBoss.where === 'home') engageBoss();
    else kitchenToast('The cave is empty... the Blob is out roaming! 👀');
  },
  hint: () => `${actionKeyLabel()} ${mapBoss.where === 'home' ? '⚔️ Knock knock...' : 'Peek inside'}`
});
registerMapLayer(20, () => drawBossCave());
