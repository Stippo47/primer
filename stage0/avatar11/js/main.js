// Picks what to show from the address. Stills only.
//   index.html?pic=crow-button-white     one crow, on the room's wall and floor, at round 10's single scale
//   index.html?lineup=crow-faces         the four heads, large, side by side (for the card's front)
//   index.html?lineup=crow-icons         the four at icon size, each fitted into a 64-point square (for checking)
//
// The room, scales and sheets are round 10's (../avatar10/js/main.js), so these sit beside its pictures unchanged.

import { pen } from '../../avatar10/js/kit.js';
import { CROWS } from './crows.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = 2;
const BY = Object.fromEntries(CROWS.map(c => [`crow-${c.id}`, c]));
const keys = Object.keys(BY);
const SINGLE = 318 / 204;

function drawFigure(ctx, key, o = {}) {
  const g = pen(ctx);
  g.noGround = !!o.noGround;
  BY[key].draw(g);
}
// the plain floor and wall of the room, in the Mix colours (the same as rounds three to ten)
function room(ctx, W, H, floorY) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  const k = Math.min(1, floorY / H);
  bg.addColorStop(0, '#222b72'); bg.addColorStop(k, '#2c388e'); bg.addColorStop(k, '#c58a5c'); bg.addColorStop(1, '#b57a4e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (let x = 10; x < W; x += 38) { ctx.fillStyle = 'rgba(130,150,255,0.055)'; ctx.fillRect(x, 0, 19, floorY - 12); }
  if (floorY < H) {
    ctx.fillStyle = '#262f80'; ctx.fillRect(0, floorY - 12, W, 12);
    ctx.fillStyle = 'rgba(10,8,44,0.3)'; ctx.fillRect(0, floorY, W, 8);
  }
}
function size(w, h) {
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  return canvas.getContext('2d');
}
function measure(key) {
  const S = 2, W = 480, H = 400, ox = 240, oy = 360;
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const ctx = c.getContext('2d');
  ctx.setTransform(S, 0, 0, S, ox * S, oy * S);
  drawFigure(ctx, key, { noGround: true });
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0, y0 = c.height;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (px[(y * c.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  }
  return { h: oy - y0 / S, cx: (x0 + x1) / 2 / S - ox, w: (x1 - x0) / S };
}
const sizes = Object.fromEntries(keys.map(k => [k, measure(k)]));
window.catalogue = { pictures: keys, extra: [], lineups: ['crow-faces', 'crow-icons'], sizes };

const label = (ctx, text, x, y, px = 13, col = 'rgba(225,230,255,0.86)', weight = 800) => {
  ctx.font = `${weight} ${px}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = col; ctx.fillText(text, x, y);
};
const nameOf = key => `${BY[key].name}, ${BY[key].eyes}`;

// the four heads, large, two by two, at one scale, on the room's wall (round 10's face sheet)
function faces() {
  const CW = 316, CH = 232, FS = 2.3, gap = 10, lab = 38, cols = 2;
  const rows = Math.ceil(keys.length / cols);
  const W = cols * CW + (cols + 1) * gap, H = rows * (CH + lab) + gap;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#141a3c'; ctx.fillRect(0, 0, W, H);
  keys.forEach((key, i) => {
    const x0 = gap + (i % cols) * (CW + gap), y0 = gap + Math.floor(i / cols) * (CH + lab);
    const [hx, hy] = BY[key].head;
    ctx.save();
    const cell = new Path2D(); cell.roundRect(x0, y0, CW, CH, 12);
    ctx.clip(cell);
    ctx.translate(x0, y0); room(ctx, CW, CH, CH + 40); ctx.translate(-x0, -y0);
    ctx.translate(x0 + CW / 2 - hx * FS, y0 + CH / 2 - hy * FS); ctx.scale(FS, FS);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, nameOf(key), x0 + CW / 2, y0 + CH + 24, 14);
  });
}
// icon size, for checking that the eyes still read small
function icons() {
  const T = 64, gap = 26, pad = 18, n = keys.length, rowH = T + 34;
  const W = pad * 2 + n * T + (n - 1) * gap, H = pad + rowH + 4;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#141a3c'; ctx.fillRect(0, 0, W, H);
  keys.forEach((key, i) => {
    const x0 = pad + i * (T + gap), y0 = pad, m = sizes[key];
    ctx.save();
    const tile = new Path2D(); tile.roundRect(x0, y0, T, T, 14);
    ctx.clip(tile);
    room(ctx, W, pad + T + 30, pad + T - 9);
    const sc = Math.min(54 / m.h, 58 / m.w);
    ctx.translate(x0 + T / 2 - m.cx * sc, y0 + T - 5); ctx.scale(sc, sc);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, nameOf(key).replace(' eyes', ''), x0 + T / 2, y0 + T + 19, 10);
  });
}

const which = q.get('lineup');
if (which === 'crow-faces') faces();
else if (which === 'crow-icons') icons();
else {
  const key = q.get('pic') || keys[0];
  if (!BY[key]) throw new Error(`No picture called ${key}`);
  const m = sizes[key];
  const ctx = size(414, 414);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, 414, 414, 298);
  ctx.save(); ctx.translate(207 - m.cx * SINGLE, 360); ctx.scale(SINGLE, SINGLE);
  drawFigure(ctx, key);
  ctx.restore();
}

window.ready = true;
