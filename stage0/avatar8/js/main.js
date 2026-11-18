// Picks what to show from the address. Everything is a still: nothing moves in this round.
//   index.html?pic=crow-pebble        one crow in one look, on the room's wall and floor
//   index.html?lineup=crow-lineup     the eight at room size, numbered, two rows of four, one shared scale
//   ...&room=1                        (with a lineup) drawn at 1x, the size it would be on the phone
//   index.html?pic=crow-pebble&head=1 (for checking) the head, drawn three times larger
//
// All eight are the same bird in the same pose: three-quarters on, turned a little to the right, the beak
// pointing right of centre. They are drawn to one scale everywhere, so a squat look stands shorter than a
// tall one, as the same bird drawn two ways would.

import { pen } from './kit.js';
import { CROWS } from './crows.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = q.has('room') ? 1 : 2;

const DRAW = Object.fromEntries(CROWS.map(c => [`crow-${c.id}`, c.draw]));

export function drawFigure(ctx, key, o = {}) {
  const g = pen(ctx);
  g.noGround = !!o.noGround;
  DRAW[key](g);
}

// the plain floor and wall of the room, in the Mix colours (the same as rounds three to seven)
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
// How tall a figure stands and where the middle of its outline is, found by drawing it once off screen
// (without its floor shadow) and looking for the painted pixels.
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
const keys = Object.keys(DRAW);
const sizes = Object.fromEntries(keys.map(k => [k, measure(k)]));
window.catalogue = { pictures: keys, extra: [], lineups: ['crow-lineup'], sizes };

const label = (ctx, text, x, y, px = 13, col = 'rgba(40,20,10,0.78)') => {
  ctx.font = `800 ${px}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.fillText(text, x, y);
};
// Room size: the whole set shares one scale, chosen so that the middle of the set stands 160 points tall.
const median = a => { const b = [...a].sort((x, y) => x - y); return (b[(b.length - 1) >> 1] + b[b.length >> 1]) / 2; };
const roomScale = ks => 160 / median(ks.map(k => sizes[k].h));

// one row of figures standing on one floor, each in a slot as wide as it needs
function row(ctx, ks, labels, sc, y0, W, H, xs, floor) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, H); ctx.clip();
  ctx.translate(0, y0); room(ctx, W, H, floor); ctx.translate(0, -y0);
  ks.forEach((key, i) => {
    const m = sizes[key], x = xs[i];
    ctx.save(); ctx.translate(x - m.cx * sc, y0 + floor + 36); ctx.scale(sc, sc);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, labels[i], x, y0 + H - 9);
  });
  ctx.restore();
}
function lineup(rows, labels) {
  const all = rows.flat(), sc = roomScale(all), n = rows[0].length;
  const slots = Array.from({ length: n }, (_, i) => Math.ceil(Math.max(150, ...rows.map(r => sizes[r[i]].w * sc + 30))));
  const W = slots.reduce((a, b) => a + b, 0) + 16;
  const xs = slots.map((w, i) => 8 + slots.slice(0, i).reduce((a, b) => a + b, 0) + w / 2);
  const tallest = Math.max(...all.map(k => sizes[k].h * sc));
  const floor = Math.max(180, Math.ceil(tallest - 36 + 22)), H = floor + 82;
  const ctx = size(W, H * rows.length);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rows.forEach((r, i) => row(ctx, r, labels[i], sc, i * H, W, H, xs, floor));
  window.catalogue.lineup = { w: W, h: H * rows.length, scale: sc };
}

const which = q.get('lineup');
if (which === 'crow-lineup') {
  const labels = CROWS.map((c, i) => `${i + 1}  ${c.name}`);
  lineup([keys.slice(0, 4), keys.slice(4)], [labels.slice(0, 4), labels.slice(4)]);
} else {
  const key = q.get('pic') || keys[0];
  if (!DRAW[key]) throw new Error(`No picture called ${key}`);
  // one scale for all eight singles too: the largest that fits the tallest and the widest
  const sc = Math.min(...keys.map(k => Math.min(318 / sizes[k].h, 380 / sizes[k].w)));
  const m = sizes[key];
  const ctx = size(414, 414);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, 414, 414, 298);
  if (q.has('head')) {
    // for checking only: the head three times as large
    const hs = sc * 3;
    ctx.save(); ctx.translate(207 - (m.cx + 30) * hs, 207 + (m.h - 40) * hs); ctx.scale(hs, hs);
    drawFigure(ctx, key);
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(207 - m.cx * sc, 360); ctx.scale(sc, sc);
    drawFigure(ctx, key);
    ctx.restore();
  }
}

window.ready = true;
