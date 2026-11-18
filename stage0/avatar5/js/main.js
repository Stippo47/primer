// Picks what to show from the address. Everything is a still: nothing moves in this round.
//   index.html?set=person&style=blob     one picture, the figure as large as fits, on the plain floor
//   index.html?set=monster&lineup=1      all ten in a row at room size, numbered: one scale for the set, the
//                                        middle of the ten 160 points tall, so squat stands shorter and tall taller
//   index.html?set=person&sheet=1        all ten at one scale, five to a row, for checking them against each other
//   index.html?set=both&lineup=1         the person's ten above the monster's ten, at room size, for comparing columns

import { pen } from './kit.js';
import { STYLES } from './styles.js';
import { PERSON } from './person.js';
import { MONSTER } from './monster.js';

const SETS = { person: PERSON, monster: MONSTER };
const STYLE = { planes: 0.5, rim: null };
const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = 2;

export function drawFigure(ctx, set, style, o = {}) {
  const g = pen(ctx, STYLE);
  if (o.noGround) g.ground = () => {};
  SETS[set][style](g);
}

// the plain floor and wall of the room, in the Mix colours (the same as rounds three and four)
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
// How tall a figure stands and where the middle of its outline is, found by drawing it once off screen
// (without its floor shadow) and looking for the painted pixels.
function measure(set, style) {
  const S = 2, W = 400, H = 340, ox = 200, oy = 300;
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const ctx = c.getContext('2d');
  ctx.setTransform(S, 0, 0, S, ox * S, oy * S);
  drawFigure(ctx, set, style, { noGround: true });
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0, y0 = c.height;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (px[(y * c.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  }
  return { h: oy - y0 / S, cx: (x0 + x1) / 2 / S - ox, w: (x1 - x0) / S };
}
const sizes = {};
for (const set of Object.keys(SETS)) for (const s of STYLES) sizes[`${set}-${s.id}`] = measure(set, s.id);
window.catalogue = { sets: Object.keys(SETS), styles: STYLES.map(s => s.id), sizes };

const label = (ctx, text, x, y, px = 13) => {
  ctx.font = `800 ${px}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(40,20,10,0.78)';
  ctx.fillText(text, x, y);
};
// Room size: the whole set shares one scale, chosen so that the middle of the ten stands 160 points tall.
// So the squat style stands shorter and the tall style taller, as they would in the room, rather than every
// one being stretched to the same height (which turns the squat one into a giant).
const median = a => { const b = [...a].sort((x, y) => x - y); return (b[(b.length - 1) >> 1] + b[b.length >> 1]) / 2; };
const roomScale = set => 160 / median(STYLES.map(s => sizes[`${set}-${s.id}`].h));
window.catalogue.roomHeights = Object.fromEntries(Object.keys(SETS).map(set => [set, STYLES.map(s => Math.round(sizes[`${set}-${s.id}`].h * roomScale(set)))]));

// each style gets a slot as wide as its widest figure, so the row isn't padded out to the widest of all
function row(ctx, set, y0, W, H, xs, floor) {
  const sc = roomScale(set);
  ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, H); ctx.clip();
  ctx.translate(0, y0); room(ctx, W, H, floor); ctx.translate(0, -y0);
  STYLES.forEach((s, i) => {
    const m = sizes[`${set}-${s.id}`], x = xs[i];
    ctx.save(); ctx.translate(x - m.cx * sc, y0 + floor + 36); ctx.scale(sc, sc);
    drawFigure(ctx, set, s.id);
    ctx.restore();
    label(ctx, `${i + 1}  ${s.name}`, x, y0 + H - 9);
  });
  ctx.restore();
}
const slotsFor = sets => STYLES.map(s => Math.ceil(Math.max(96, ...sets.map(set => sizes[`${set}-${s.id}`].w * roomScale(set) + 22))));
const tallest = sets => Math.max(...sets.flatMap(set => STYLES.map(s => sizes[`${set}-${s.id}`].h * roomScale(set))));

const set = SETS[q.get('set')] ? q.get('set') : 'person';
if (q.has('lineup')) {
  const sets = q.get('set') === 'both' ? ['person', 'monster'] : [set];
  const slots = slotsFor(sets), W = slots.reduce((a, b) => a + b, 0) + 16;
  const xs = slots.map((w, i) => 8 + slots.slice(0, i).reduce((a, b) => a + b, 0) + w / 2);
  const floor = Math.max(180, Math.ceil(tallest(sets) - 36 + 20)), H = floor + 82;
  const ctx = size(W, H * sets.length);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sets.forEach((s, i) => row(ctx, s, i * H, W, H, xs, floor));
  window.catalogue.lineup = { w: W, h: H * sets.length };
} else if (q.has('sheet')) {
  // one scale for all ten, five to a row
  const W = 1450, H = 2 * 340;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sc = Math.min(...STYLES.map(s => { const m = sizes[`${set}-${s.id}`]; return Math.min(270 / m.h, 270 / m.w); }));
  STYLES.forEach((s, i) => {
    const m = sizes[`${set}-${s.id}`], x0 = (i % 5) * 290, y0 = Math.floor(i / 5) * 340;
    ctx.save(); ctx.translate(x0, y0);
    ctx.beginPath(); ctx.rect(0, 0, 290, 340); ctx.clip();
    room(ctx, 290, 340, 260);
    ctx.save(); ctx.translate(145 - m.cx * sc, 300); ctx.scale(sc, sc);
    drawFigure(ctx, set, s.id);
    ctx.restore();
    label(ctx, `${i + 1}  ${s.name}`, 145, 332);
    ctx.restore();
  });
} else {
  const s = STYLES.find(t => t.id === q.get('style')) || STYLES[0];
  const m = sizes[`${set}-${s.id}`], sc = Math.min(286 / m.h, 372 / m.w);
  const ctx = size(414, 414);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, 414, 414, 298);
  ctx.save(); ctx.translate(207 - m.cx * sc, 354); ctx.scale(sc, sc);
  drawFigure(ctx, set, s.id);
  ctx.restore();
}

window.ready = true;
