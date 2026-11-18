// Picks what to show from the address. Everything is a still: nothing moves in this round.
//   index.html?pic=face-calm          one picture: the person (Blob body, noodle limbs) with one of the ten faces
//   index.html?pic=side-hippo         one picture: a side view (side-person-blob, side-person-noodle,
//                                     side-person-blobnoodle, side-lamp, side-hippo)
//   index.html?pic=front-lamp         one picture: the front view a side view is turned from
//   index.html?lineup=faces-lineup    the ten faces at room size, numbered, in two rows of five
//   index.html?lineup=faces-close     the ten heads only, larger, numbered, in two rows of five
//   index.html?lineup=side-lineup     the side views under the front views they turn from, at room size
//   ...&room=1                        (with a lineup) drawn at 1x, the size it would be on the phone
//
// The person's pictures, front and side, share one scale, so the face and the body are the same size in
// all of them. The lamp's two share one, and the hippo's two.

import { pen } from './kit.js';
import { FACE_LIST } from './face.js';
import { FRONT, SIDE } from './person.js';
import { lampFront, lampSide, hippoFront, hippoSide } from './creature.js';

const STYLE = { planes: 0.5, rim: null };
const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = q.has('room') ? 1 : 2;

export const SIDES = [
  { id: 'person-blob', name: 'Blob', front: g => FRONT.blob(g, 'calm'), side: g => SIDE.blob(g, 'calm') },
  { id: 'person-noodle', name: 'Noodle', front: g => FRONT.noodle(g, 'calm'), side: g => SIDE.noodle(g, 'calm') },
  { id: 'person-blobnoodle', name: 'Blob + noodles', front: g => FRONT.blobnoodle(g, 'calm'), side: g => SIDE.blobnoodle(g, 'calm') },
  { id: 'lamp', name: 'Lamp', front: lampFront, side: lampSide },
  { id: 'hippo', name: 'Hippo', front: hippoFront, side: hippoSide },
];
const DRAW = {
  ...Object.fromEntries(FACE_LIST.map(f => [`face-${f.id}`, g => FRONT.blobnoodle(g, f.id)])),
  ...Object.fromEntries(SIDES.map(s => [`side-${s.id}`, s.side])),
  ...Object.fromEntries(SIDES.map(s => [`front-${s.id}`, s.front])),
};
const groupOf = key => key.startsWith('face-') || key.includes('person-') ? 'person' : key.replace(/^(side|front)-/, '');

export function drawFigure(ctx, key, o = {}) {
  const g = pen(ctx, STYLE);
  if (o.noGround) g.ground = () => {};
  DRAW[key](g);
}

// the plain floor and wall of the room, in the Mix colours (the same as rounds three to six)
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
  const S = 2, W = 420, H = 360, ox = 210, oy = 320;
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
const sizes = Object.fromEntries(Object.keys(DRAW).map(k => [k, measure(k)]));
const faceKeys = FACE_LIST.map(f => `face-${f.id}`);
const sideKeys = SIDES.map(s => `side-${s.id}`);
const frontKeys = SIDES.map(s => `front-${s.id}`);
window.catalogue = { pictures: [...faceKeys, ...sideKeys], extra: frontKeys, lineups: ['faces-lineup', 'faces-close', 'side-lineup'], sizes };

const label = (ctx, text, x, y, px = 13, col = 'rgba(40,20,10,0.78)') => {
  ctx.font = `800 ${px}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = col;
  ctx.fillText(text, x, y);
};
// Room size: a whole set shares one scale, chosen so that the middle of the set stands 160 points tall.
const median = a => { const b = [...a].sort((x, y) => x - y); return (b[(b.length - 1) >> 1] + b[b.length >> 1]) / 2; };
const roomScale = keys => 160 / median(keys.map(k => sizes[k].h));

// one row of figures standing on one floor, each in a slot as wide as it needs
function row(ctx, keys, labels, sc, y0, W, H, xs, floor) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, H); ctx.clip();
  ctx.translate(0, y0); room(ctx, W, H, floor); ctx.translate(0, -y0);
  keys.forEach((key, i) => {
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
  const slots = Array.from({ length: n }, (_, i) => Math.ceil(Math.max(120, ...rows.map(r => sizes[r[i]].w * sc + 26))));
  const W = slots.reduce((a, b) => a + b, 0) + 16;
  const xs = slots.map((w, i) => 8 + slots.slice(0, i).reduce((a, b) => a + b, 0) + w / 2);
  const tallest = Math.max(...all.map(k => sizes[k].h * sc));
  const floor = Math.max(180, Math.ceil(tallest - 36 + 22)), H = floor + 82;
  const ctx = size(W, H * rows.length);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rows.forEach((r, i) => row(ctx, r, labels[i], sc, i * H, W, H, xs, floor));
  window.catalogue.lineup = { w: W, h: H * rows.length, scale: sc };
}
// The heads only, larger: each tile shows the same square of the figure round its head, so the ten faces
// sit in the same place in each tile and can be compared one against another.
function close(keys, labels, perRow = 5) {
  const T = 190, gap = 10, lab = 30, view = { x: -52, y: -192, s: 108 };
  const rows = Math.ceil(keys.length / perRow);
  const W = perRow * T + (perRow + 1) * gap, H = rows * (T + lab) + gap;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#141a3c'; ctx.fillRect(0, 0, W, H);
  keys.forEach((key, i) => {
    const x0 = gap + (i % perRow) * (T + gap), y0 = gap + Math.floor(i / perRow) * (T + lab);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, T, T); ctx.clip();
    ctx.translate(x0, y0); room(ctx, T, T, T * 4);
    const sc = T / view.s;
    ctx.scale(sc, sc); ctx.translate(-view.x, -view.y);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, labels[i], x0 + T / 2, y0 + T + 21, 15, 'rgba(255,240,225,0.92)');
  });
}

const which = q.get('lineup');
const faceLabels = FACE_LIST.map((f, i) => `${i + 1}  ${f.name}`);
if (which === 'faces-lineup') {
  lineup([faceKeys.slice(0, 5), faceKeys.slice(5)], [faceLabels.slice(0, 5), faceLabels.slice(5)]);
} else if (which === 'faces-close') {
  close(faceKeys, faceLabels);
} else if (which === 'side-lineup') {
  lineup([frontKeys, sideKeys], [SIDES.map((s, i) => `${i + 1}  ${s.name}, front`), SIDES.map((s, i) => `${i + 1}  ${s.name}, side`)]);
} else {
  const key = q.get('pic') || 'face-calm';
  if (!DRAW[key]) throw new Error(`No picture called ${key}`);
  const group = Object.keys(DRAW).filter(k => groupOf(k) === groupOf(key));
  const sc = Math.min(...group.map(k => Math.min(286 / sizes[k].h, 372 / sizes[k].w)));
  const m = sizes[key];
  const ctx = size(414, 414);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, 414, 414, 298);
  ctx.save(); ctx.translate(207 - m.cx * sc, 354); ctx.scale(sc, sc);
  drawFigure(ctx, key);
  ctx.restore();
}

window.ready = true;
