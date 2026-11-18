// Picks what to show from the address.
//   index.html?who=puffin              one candidate on a plain floor, idling (puffin, tall, frog, raccoon, toucan, round)
//   index.html?who=puffin&dressed=1    the same, in the shop's hat and shirt
//   index.html?lineup=1                all six in a row, at the size they would stand in the room
//   index.html?sheet=1                 all six large on one page, for checking (add &dressed=1)
//   &still=1&t=0.5                     nothing plays; a capture tool calls window.seek(seconds)

import { CAST, LOOP, drawAvatar } from './cast.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = 2;
const dressed = q.has('dressed');
window.catalogue = { ids: CAST.map(c => c.id), loop: LOOP };

// the plain floor and wall of the room, in the Mix colours
function room(ctx, W, H, floorY) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  const k = floorY / H;
  bg.addColorStop(0, '#222b72'); bg.addColorStop(k, '#2c388e'); bg.addColorStop(k, '#c58a5c'); bg.addColorStop(1, '#b57a4e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let x = 10; x < W; x += 38) { ctx.fillStyle = 'rgba(130,150,255,0.055)'; ctx.fillRect(x, 0, 19, floorY - 12); }
  ctx.fillStyle = '#262f80'; ctx.fillRect(0, floorY - 12, W, 12);
  ctx.fillStyle = 'rgba(10,8,44,0.3)'; ctx.fillRect(0, floorY, W, 8);
}
function size(w, h) {
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  return ctx;
}

let draw;
if (q.has('lineup')) {
  // In the room the avatar stands about 160 points tall. One scale for all six, so the tallest is 160
  // and the rest keep the sizes they were drawn at (a frog is shorter than a person).
  const W = 960, H = 250, floorY = 186, sc = 160 / Math.max(...CAST.map(c => c.h));
  const ctx = size(W, H);
  const still = q.has('still');
  draw = t => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    room(ctx, W, H, floorY);
    CAST.forEach((c, i) => {
      const x = 80 + i * 160;
      ctx.save(); ctx.translate(x - c.cx * sc, floorY + 40); ctx.scale(sc, sc);
      drawAvatar(ctx, c.id, { t: still ? t : t + i * 0.37, hat: dressed, shirt: dressed });
      ctx.restore();
      ctx.font = '800 12px system-ui, "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(40,20,10,0.75)';
      ctx.fillText(`${c.end}  ${c.name}`, x, H - 8);
    });
  };
} else if (q.has('sheet')) {
  const W = 1242, H = 828;
  const ctx = size(W, H);
  draw = t => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CAST.forEach((c, i) => {
      ctx.save(); ctx.translate((i % 3) * 414, Math.floor(i / 3) * 414);
      ctx.beginPath(); ctx.rect(0, 0, 414, 414); ctx.clip();
      room(ctx, 414, 414, 298);
      ctx.translate(207 - c.cx * 1.8, 352); ctx.scale(1.8, 1.8);
      drawAvatar(ctx, c.id, { t, hat: dressed, shirt: dressed });
      ctx.restore();
    });
  };
} else {
  const c = CAST.find(a => a.id === q.get('who')) || CAST[0], id = c.id;
  const ctx = size(414, 414);
  draw = t => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    room(ctx, 414, 414, 298);
    ctx.save(); ctx.translate(207 - c.cx * 1.8, 352); ctx.scale(1.8, 1.8);
    drawAvatar(ctx, id, { t, hat: dressed, shirt: dressed });
    ctx.restore();
  };
}

window.duration = LOOP;
window.seek = t => draw(t);
if (q.has('still')) {
  draw(Number(q.get('t') || 0.5));
} else {
  const t0 = performance.now();
  const tick = () => { draw((performance.now() - t0) / 1000); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
window.ready = true;
