// Picks what to show from the address. Everything is a still: nothing moves in this round.
//   index.html?set=person&id=blob           one picture of the person, on the plain floor. All eight share one
//                                           scale, so the head (and the face on it) is the same size in each
//   index.html?set=monster&id=flop-noodle   one picture of a monster. A design's two styles share one scale
//   index.html?set=person&lineup=1          the eight in a row at room size, numbered: one scale for all eight,
//                                           the middle of them 160 points tall
//   index.html?set=monster&lineup=1         the four monsters, Blob above Noodle, numbered, at one scale
//   ...&room=1                              (with lineup) drawn at 1x, the size it would be on the phone

import { pen } from './kit.js';
import { PERSON, PEOPLE } from './person.js';
import { MONSTER, MONSTERS } from './monster.js';

const STYLE = { planes: 0.5, rim: null };
const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = q.has('room') ? 1 : 2;
const KINDS = ['blob', 'noodle'];
const KIND_NAME = { blob: 'Blob', noodle: 'Noodle' };

const DRAW = {
  ...Object.fromEntries(PEOPLE.map(p => [`person-${p.id}`, PERSON[p.id]])),
  ...Object.fromEntries(MONSTERS.flatMap(m => KINDS.map(k => [`monster-${m.id}-${k}`, MONSTER[`${m.id}-${k}`]]))),
};
export function drawFigure(ctx, key, o = {}) {
  const g = pen(ctx, STYLE);
  if (o.noGround) g.ground = () => {};
  DRAW[key](g);
}

// the plain floor and wall of the room, in the Mix colours (the same as rounds three to five)
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
const personKeys = PEOPLE.map(p => `person-${p.id}`);
const monsterKeys = MONSTERS.flatMap(m => KINDS.map(k => `monster-${m.id}-${k}`));
window.catalogue = { pictures: Object.keys(DRAW), lineups: ['person-lineup', 'monster-lineup'], sizes };

const label = (ctx, text, x, y, px = 13) => {
  ctx.font = `800 ${px}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(40,20,10,0.78)';
  ctx.fillText(text, x, y);
};
// Room size: a whole set shares one scale, chosen so that the middle of the set stands 160 points tall.
const median = a => { const b = [...a].sort((x, y) => x - y); return (b[(b.length - 1) >> 1] + b[b.length >> 1]) / 2; };
const roomScale = keys => 160 / median(keys.map(k => sizes[k].h));
window.catalogue.roomHeights = {
  person: personKeys.map(k => Math.round(sizes[k].h * roomScale(personKeys))),
  monster: monsterKeys.map(k => Math.round(sizes[k].h * roomScale(monsterKeys))),
};

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
  const slots = Array.from({ length: n }, (_, i) => Math.ceil(Math.max(112, ...rows.map(r => sizes[r[i]].w * sc + 26))));
  const W = slots.reduce((a, b) => a + b, 0) + 16;
  const xs = slots.map((w, i) => 8 + slots.slice(0, i).reduce((a, b) => a + b, 0) + w / 2);
  const tallest = Math.max(...all.map(k => sizes[k].h * sc));
  const floor = Math.max(180, Math.ceil(tallest - 36 + 22)), H = floor + 82;
  const ctx = size(W, H * rows.length);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rows.forEach((r, i) => row(ctx, r, labels[i], sc, i * H, W, H, xs, floor));
  window.catalogue.lineup = { w: W, h: H * rows.length, scale: sc };
}

const set = q.get('set') === 'monster' ? 'monster' : 'person';
if (q.has('lineup')) {
  if (set === 'person') lineup([personKeys], [PEOPLE.map((p, i) => `${i + 1}  ${p.name}`)]);
  else lineup(KINDS.map(k => MONSTERS.map(m => `monster-${m.id}-${k}`)),
    KINDS.map(k => MONSTERS.map((m, i) => `${i + 1}  ${m.name}, ${KIND_NAME[k]}`)));
} else {
  const key = `${set}-${q.get('id') || (set === 'person' ? 'blob' : 'lamp-blob')}`;
  if (!DRAW[key]) throw new Error(`No picture called ${key}`);
  // the person's eight share one scale; a monster's two styles share one
  const group = set === 'person' ? personKeys : KINDS.map(k => key.replace(/-(blob|noodle)$/, `-${k}`));
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
