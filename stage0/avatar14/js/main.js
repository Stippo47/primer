// Picks what to show from the address. Stills only.
//   index.html?pic=fox             one character on its own 414-point picture, labelled (ids in cast.js)
//   index.html?lineup=sheet        all ten side by side
//   index.html?lineup=icons        all ten at icon size, each fitted into a 64-point square

import { pen } from '../../avatar10/js/kit.js';
import { room, drawCharacter } from './glow.js';
import { CAST } from './cast.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = 2;

// round 4's and round 13's single scale, the same floor height, the feet on the same line
const S = 1.8, FEET_Y = 352, FY = 298, P = 414;

function size(w, h) {
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  return canvas.getContext('2d');
}
const label = (ctx, text, x, y, px = 13, col = 'rgba(225,215,255,0.8)') => {
  ctx.font = `800 ${px}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = col; ctx.fillText(text, x, y);
};

// the outline's extent in the character's own units, found by drawing it once off screen with no floor shadow
function measure(ch) {
  const K = 2, W = 480, H = 400, ox = 240, oy = 360;
  const c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
  const ctx = c.getContext('2d');
  ctx.setTransform(K, 0, 0, K, ox * K, oy * K);
  drawCharacter(pen(ctx), ch, { noGround: true });
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0, y0 = c.height;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (px[(y * c.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  }
  return { cx: (x0 + x1) / 2 / K - ox, w: (x1 - x0) / K, h: oy - y0 / K };
}
const sizes = new Map(CAST.map(ch => [ch.id, measure(ch)]));

window.catalogue = {
  pictures: CAST.map(ch => ch.id), extra: [],
  lineups: ['sheet', 'icons'],
  cast: CAST.map((ch, i) => ({ n: i + 1, id: ch.id, name: ch.name, line: ch.line, size: sizes.get(ch.id) })),
};

// one character on its own picture, its outline centred across the picture, its feet on the line
function charCanvas(ch, n, withLabel = true) {
  const cv = document.createElement('canvas');
  cv.width = P * dpr; cv.height = P * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, P, P, FY);
  const m = sizes.get(ch.id);
  ctx.save();
  ctx.translate(P / 2 - m.cx * S, FEET_Y); ctx.scale(S, S);
  drawCharacter(pen(ctx), ch);
  ctx.restore();
  if (withLabel) label(ctx, `${n}  ·  ${ch.name}`, P / 2, 400);
  return cv;
}
function picture(id) {
  const i = CAST.findIndex(ch => ch.id === id);
  if (i < 0) throw new Error(`No character called ${id}`);
  const ctx = size(P, P);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(charCanvas(CAST[i], i + 1), 0, 0);
}
// all ten, five to a row, each cut to the square round the characters, name under it
function sheet() {
  const T = 250, gap = 12, lab = 30, cols = 5, rows = Math.ceil(CAST.length / cols);
  const W = cols * T + (cols + 1) * gap, H = rows * (T + lab) + gap;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#16161c'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  CAST.forEach((ch, i) => {
    const x0 = gap + (i % cols) * (T + gap), y0 = gap + Math.floor(i / cols) * (T + lab);
    ctx.save();
    const cell = new Path2D(); cell.roundRect(x0, y0, T, T, 10); ctx.clip(cell);
    ctx.drawImage(charCanvas(ch, i + 1, false), 26 * dpr, 20 * dpr, 362 * dpr, 362 * dpr, x0, y0, T, T);
    ctx.restore();
    label(ctx, `${i + 1}  ·  ${ch.name}`, x0 + T / 2, y0 + T + 20, 13, 'rgba(235,235,245,0.88)');
  });
}
// icon size: a 64-point square cut round each character from its picture
function icons() {
  const T = 64, gap = 30, pad = 18, cols = 5, rowH = T + 34, rows = Math.ceil(CAST.length / cols);
  const W = pad * 2 + cols * T + (cols - 1) * gap, H = pad + rows * rowH;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#16161c'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  CAST.forEach((ch, i) => {
    const x0 = pad + (i % cols) * (T + gap), y0 = pad + Math.floor(i / cols) * rowH, m = sizes.get(ch.id);
    // the square: the character's height or width, whichever is more, with a little room, feet near the bottom
    const side = Math.max(m.h, m.w) * S + 24, cx = P / 2, top = Math.max(0, FEET_Y + 14 - side);
    ctx.save();
    const tile = new Path2D(); tile.roundRect(x0, y0, T, T, 14); ctx.clip(tile);
    ctx.drawImage(charCanvas(ch, i + 1, false), (cx - side / 2) * dpr, top * dpr, side * dpr, side * dpr, x0, y0, T, T);
    ctx.restore();
    label(ctx, ch.name, x0 + T / 2, y0 + T + 19, 10, 'rgba(235,235,245,0.88)');
  });
}

const which = q.get('lineup');
if (which === 'sheet') sheet();
else if (which === 'icons') icons();
else picture(q.get('pic') || CAST[0].id);

window.ready = true;
