// Picks what to show from the address. Everything is a still: nothing moves in this round.
//   index.html?pic=crow-plump-keen         one crow, on the room's wall and floor
//   index.html?lineup=crow-lineup-plump    one family's six at room size, numbered and named, two rows of three
//   index.html?lineup=crow-faces-plump     one family's six heads, large, side by side, since the face is the point
//   index.html?lineup=crow-icons           all twelve at icon size, each fitted into a 64-point square
//   ...&room=1                             (with a lineup) drawn at 1x instead of the phone's 2x
//   index.html?pic=crow-bean&head=1&hx=40&hy=-140
//                                          (for checking) the head, three times larger, centred on (hx, hy)
//
// All twelve are the same bird in the same pose as round 9: three-quarters on, turned a little to the right. They
// are drawn at round 9's own scales (the singles and the lineups alike), so variant 1 of each family comes out
// exactly as round 9 drew it, and a squat variant stands shorter than a tall one, as the same bird drawn two ways
// would. The icons are each fitted to their square, as in round 9.

import { pen } from './kit.js';
import { FAMILIES, CROWS } from './crows.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = q.has('room') ? 1 : 2;

const DRAW = Object.fromEntries(CROWS.map(c => [`crow-${c.id}`, c.draw]));
const NUM = Object.fromEntries(CROWS.map((c, i) => [`crow-${c.id}`, i + 1]));
const BY = Object.fromEntries(CROWS.map(c => [`crow-${c.id}`, c]));

// round 9's scales: its singles were drawn at 318 / 204 (its tallest crow filling the frame), its lineup at
// 160 / 186.5 (the middle of its set standing 160 points tall)
const SINGLE = 318 / 204, ROOM = 160 / 186.5;

export function drawFigure(ctx, key, o = {}) {
  const g = pen(ctx);
  g.noGround = !!o.noGround;
  DRAW[key](g);
}

// the plain floor and wall of the room, in the Mix colours (the same as rounds three to nine)
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
const LINEUPS = FAMILIES.flatMap(f => [`crow-lineup-${f.id}`, `crow-faces-${f.id}`]).concat('crow-icons');
// does each fit the single frame at round 9's scale (318 tall, 380 wide)?
const fits = Object.fromEntries(keys.map(k => [k, sizes[k].h * SINGLE <= 318 && sizes[k].w * SINGLE <= 380]));
window.catalogue = { pictures: keys, extra: [], lineups: LINEUPS, sizes, fits };

const label = (ctx, text, x, y, px = 13, col = 'rgba(40,20,10,0.78)', weight = 800) => {
  ctx.font = `${weight} ${px}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.fillText(text, x, y);
};
const nameOf = key => `${NUM[key]}  ${BY[key].name}`;

// one row of figures standing on one floor, each in a slot
function row(ctx, ks, sc, y0, W, H, xs, floor) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, H); ctx.clip();
  ctx.translate(0, y0); room(ctx, W, H, floor); ctx.translate(0, -y0);
  ks.forEach((key, i) => {
    const m = sizes[key], x = xs[i];
    ctx.save(); ctx.translate(x - m.cx * sc, y0 + floor + 36); ctx.scale(sc, sc);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, nameOf(key), x, y0 + H - 22);
    label(ctx, BY[key].mood, x, y0 + H - 6, 11.5, 'rgba(40,20,10,0.62)', 600);
  });
  ctx.restore();
}
// one family's six, two rows of three, at round 9's room scale. Every slot is as wide as the widest of all
// twelve needs, so the two families' lineups match.
function lineup(fam) {
  const ks = fam.crows.map(c => `crow-${c.id}`), rows = [ks.slice(0, 3), ks.slice(3)], sc = ROOM;
  const slot = Math.ceil(Math.max(150, ...keys.map(k => sizes[k].w * sc + 30)));
  const W = slot * 3 + 16, xs = [0, 1, 2].map(i => 8 + slot * i + slot / 2);
  const tallest = Math.max(...keys.map(k => sizes[k].h * sc));
  const floor = Math.max(180, Math.ceil(tallest - 36 + 22)), H = floor + 92;
  const ctx = size(W, H * rows.length);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rows.forEach((r, i) => row(ctx, r, sc, i * H, W, H, xs, floor));
  window.catalogue.lineup = { w: W, h: H * rows.length, scale: sc };
}

// One family's six heads, large and side by side, all at one scale, on the room's wall: the face is the point
// of this round. Each cell is centred a little in front of the head's middle, so the beak fits.
function faces(fam) {
  const CW = 316, CH = 232, FS = 2.3, gap = 10, lab = 38, cols = 3;
  const ks = fam.crows.map(c => `crow-${c.id}`), rows = Math.ceil(ks.length / cols);
  const W = cols * CW + (cols + 1) * gap, H = rows * (CH + lab) + gap;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#141a3c'; ctx.fillRect(0, 0, W, H);
  ks.forEach((key, i) => {
    const x0 = gap + (i % cols) * (CW + gap), y0 = gap + Math.floor(i / cols) * (CH + lab);
    const [hx, hy] = BY[key].head;
    ctx.save();
    const cell = new Path2D(); cell.roundRect(x0, y0, CW, CH, 12);
    ctx.clip(cell);
    ctx.translate(x0, y0); room(ctx, CW, CH, CH + 40); ctx.translate(-x0, -y0);
    ctx.translate(x0 + CW / 2 - hx * FS, y0 + CH / 2 - hy * FS); ctx.scale(FS, FS);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, `${nameOf(key)}  ·  ${BY[key].mood}`, x0 + CW / 2, y0 + CH + 24, 14, 'rgba(225,230,255,0.86)');
  });
}

// Icon size: each crow fitted into a 64-point square (about 56 points of bird), on the room's wall, the way a
// small picture of the avatar might sit in a list or a corner. A look has to hold up this small. One row per family.
function icons() {
  const T = 64, gap = 26, pad = 18, n = Math.max(...FAMILIES.map(f => f.crows.length)), rowH = T + 34;
  const W = pad * 2 + n * T + (n - 1) * gap, H = pad + FAMILIES.length * rowH + 4;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#141a3c'; ctx.fillRect(0, 0, W, H);
  FAMILIES.forEach((fam, r) => fam.crows.forEach((c, i) => {
    const key = `crow-${c.id}`, x0 = pad + i * (T + gap), y0 = pad + r * rowH, m = sizes[key];
    ctx.save();
    const tile = new Path2D(); tile.roundRect(x0, y0, T, T, 14);
    ctx.clip(tile);
    // the wall and floor exactly as round 9's icon strip drew them, row by row
    ctx.translate(0, r * rowH); room(ctx, W, pad + T + 30, pad + T - 9); ctx.translate(0, -r * rowH);
    const sc = Math.min(54 / m.h, 58 / m.w);
    ctx.translate(x0 + T / 2 - m.cx * sc, y0 + T - 5); ctx.scale(sc, sc);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, `${NUM[key]} ${c.name}`, x0 + T / 2, y0 + T + 19, 11, 'rgba(225,230,255,0.82)');
  }));
}

const which = q.get('lineup');
const famOf = name => FAMILIES.find(f => name.endsWith(`-${f.id}`));
if (which && which.startsWith('crow-lineup-')) lineup(famOf(which));
else if (which && which.startsWith('crow-faces-')) faces(famOf(which));
else if (which === 'crow-icons') icons();
else {
  const key = q.get('pic') || keys[0];
  if (!DRAW[key]) throw new Error(`No picture called ${key}`);
  const sc = SINGLE, m = sizes[key];
  const ctx = size(414, 414);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, 414, 414, 298);
  if (q.has('head')) {
    // for checking only: the head three times as large, centred on (hx, hy) in the crow's own units
    const hs = sc * 3, hx = Number(q.get('hx') ?? 40), hy = Number(q.get('hy') ?? -150);
    ctx.save(); ctx.translate(207 - hx * hs, 207 - hy * hs); ctx.scale(hs, hs);
    drawFigure(ctx, key);
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(207 - m.cx * sc, 360); ctx.scale(sc, sc);
    drawFigure(ctx, key);
    ctx.restore();
  }
}

window.ready = true;
