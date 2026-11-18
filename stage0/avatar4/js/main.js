// Picks what to show from the address. Everything is a still: nothing moves in this round.
//   index.html?who=otter        one candidate on the plain floor, at the same scale as round three's pictures
//   index.html?lineup=a         candidates 1 to 5, each at room size (160 points tall), numbered
//   index.html?lineup=b         candidates 6 to 10
//   index.html?sheet=1          all ten on one page at one scale, for checking them against each other

import { CAST, drawAvatar } from './cast.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = 2;
window.catalogue = { ids: CAST.map(c => c.id) };

// the plain floor and wall of the room, in the Mix colours (the same as round three)
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
  return canvas.getContext('2d');
}
// How tall a candidate stands and where the middle of its outline is, found by drawing it once off screen
// (without its floor shadow) and looking for the painted pixels.
function measure(id) {
  const S = 2, W = 300, H = 260, ox = 150, oy = 220;
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const ctx = c.getContext('2d');
  ctx.setTransform(S, 0, 0, S, ox * S, oy * S);
  drawAvatar(ctx, id, { noGround: true });
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0, y0 = c.height;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (px[(y * c.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  }
  return { h: oy - y0 / S, cx: (x0 + x1) / 2 / S - ox, w: (x1 - x0) / S };
}
for (const c of CAST) Object.assign(c, measure(c.id));
window.catalogue.sizes = CAST.map(c => ({ id: c.id, h: Math.round(c.h), w: Math.round(c.w), cx: Math.round(c.cx) }));

const label = (ctx, text, x, y) => {
  ctx.font = '800 13px system-ui, "Segoe UI", sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(40,20,10,0.78)';
  ctx.fillText(text, x, y);
};

if (q.has('lineup')) {
  // In the room the avatar stands about 160 points tall, so here each one is scaled to exactly that.
  const half = q.get('lineup') === 'b' ? 1 : 0;
  const five = CAST.slice(half * 5, half * 5 + 5);
  const W = 960, H = 262, floorY = 180, slot = W / 5;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, W, H, floorY);
  five.forEach((c, i) => {
    const x = slot / 2 + i * slot, sc = 160 / c.h;
    ctx.save(); ctx.translate(x - c.cx * sc, floorY + 36); ctx.scale(sc, sc);
    drawAvatar(ctx, c.id);
    ctx.restore();
    label(ctx, `${half * 5 + i + 1}  ${c.name}`, x, H - 8);
  });
} else if (q.has('sheet')) {
  // one scale for all ten, as in the single pictures, five to a row
  const W = 1450, H = Math.ceil(CAST.length / 5) * 320, sc = 1.15;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  CAST.forEach((c, i) => {
    const x0 = (i % 5) * 290, y0 = Math.floor(i / 5) * 320;
    ctx.save(); ctx.translate(x0, y0);
    ctx.beginPath(); ctx.rect(0, 0, 290, 320); ctx.clip();
    room(ctx, 290, 320, 240);
    ctx.save(); ctx.translate(145 - c.cx * sc, 278); ctx.scale(sc, sc);
    drawAvatar(ctx, c.id);
    ctx.restore();
    label(ctx, `${i + 1}  ${c.name}`, 145, 312);
    ctx.restore();
  });
} else {
  const c = CAST.find(a => a.id === q.get('who')) || CAST[0];
  const ctx = size(414, 414);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, 414, 414, 298);
  ctx.save(); ctx.translate(207 - c.cx * 1.8, 352); ctx.scale(1.8, 1.8);
  drawAvatar(ctx, c.id);
  ctx.restore();
}

window.ready = true;
