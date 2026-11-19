// Picks what to show from the address. Stills only.
//   index.html?pic=crow-button-pill          one crow, at round 10's single scale (ids in crows.js)
//   index.html?lineup=crow-faces             the crows' heads, large, with round 11's white-eyed Button first
//   index.html?lineup=crow-icons             the same at icon size, each fitted into a 64-point square
//   index.html?pic=gecko-1 ... gecko-5       the gecko at one step of the style dial
//   index.html?pic=person-1 ... person-5     the cut-out person at one step of the style dial
//   index.html?dial=gecko&s=0.6              (for trying) any point on the dial
//
// A step's picture shows the character at the height its step 1 stands in the round it came from (round 4's or
// round 5's single picture), so step 1 matches that picture and every step after it is the same height on screen.

import { pen } from '../../avatar10/js/kit.js';
import { CROWS } from './crows.js';
import { CROWS as ROUND11 } from '../../avatar11/js/crows.js';
import { gecko } from './gecko.js';
import { person } from './person.js';
import { STEPS } from './dial.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = 2;

// ---------- what can be drawn ----------
const FIG = {};
const ref = ROUND11.find(k => k.id === 'button-white');
FIG['crow-r11-button-white'] = { name: 'Round 11, round eye', draw: ref.draw, head: ref.head, crow: true };
for (const k of CROWS) FIG[`crow-${k.id}`] = { name: k.eyes.replace(/^pill eyes/, 'Pill'), draw: k.draw, head: k.head, crow: true };
const DIAL = { gecko: { name: 'Gecko', draw: gecko, from: 'round 4' }, person: { name: 'Cut-out person', draw: person, from: 'round 5' } };
for (const [id, ch] of Object.entries(DIAL)) {
  STEPS.forEach((s, i) => { FIG[`${id}-${i + 1}`] = { name: ch.name, draw: g => ch.draw(g, s), step: i + 1, ch: id, s }; });
}
if (q.has('dial')) {
  const ch = DIAL[q.get('dial')], s = Number(q.get('s') || 0);
  FIG.try = { name: ch.name, draw: g => ch.draw(g, s), ch: q.get('dial'), s };
}

function drawFigure(ctx, key, o = {}) {
  const g = pen(ctx, { planes: 0.5 });
  g.noGround = !!o.noGround;
  if (o.noGround) g.ground = () => {};
  FIG[key].draw(g);
}
// the plain floor and wall of the room, in the Mix colours (the same as rounds three to eleven)
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
// how tall a figure stands and where the middle of its outline is, found by drawing it once off screen
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
const keys = Object.keys(FIG).filter(k => k !== 'try');
const sizes = Object.fromEntries(Object.keys(FIG).map(k => [k, measure(k)]));
const crowKeys = keys.filter(k => FIG[k].crow);
window.catalogue = { pictures: keys.filter(k => k !== 'crow-r11-button-white'), extra: [], lineups: ['crow-faces', 'crow-icons'], sizes };

const label = (ctx, text, x, y, px = 13, col = 'rgba(225,230,255,0.86)', weight = 800, align = 'center') => {
  ctx.font = `${weight} ${px}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = align;
  ctx.fillStyle = col; ctx.fillText(text, x, y);
};

// ---------- the crows: round 10's single scale and sheets ----------
const SINGLE = 318 / 204;
function faces() {
  const CW = 316, CH = 232, FS = 2.3, gap = 10, lab = 38, cols = 2;
  const rows = Math.ceil(crowKeys.length / cols);
  const W = cols * CW + (cols + 1) * gap, H = rows * (CH + lab) + gap;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#141a3c'; ctx.fillRect(0, 0, W, H);
  crowKeys.forEach((key, i) => {
    const x0 = gap + (i % cols) * (CW + gap), y0 = gap + Math.floor(i / cols) * (CH + lab);
    const [hx, hy] = FIG[key].head;
    ctx.save();
    const cell = new Path2D(); cell.roundRect(x0, y0, CW, CH, 12);
    ctx.clip(cell);
    ctx.translate(x0, y0); room(ctx, CW, CH, CH + 40); ctx.translate(-x0, -y0);
    ctx.translate(x0 + CW / 2 - hx * FS, y0 + CH / 2 - hy * FS); ctx.scale(FS, FS);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, FIG[key].name, x0 + CW / 2, y0 + CH + 24, 14);
  });
}
function icons() {
  const T = 64, gap = 30, pad = 18, n = crowKeys.length, rowH = T + 34;
  const W = pad * 2 + n * T + (n - 1) * gap, H = pad + rowH + 4;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#141a3c'; ctx.fillRect(0, 0, W, H);
  crowKeys.forEach((key, i) => {
    const x0 = pad + i * (T + gap), y0 = pad, m = sizes[key];
    ctx.save();
    const tile = new Path2D(); tile.roundRect(x0, y0, T, T, 14);
    ctx.clip(tile);
    room(ctx, W, pad + T + 30, pad + T - 9);
    const sc = Math.min(54 / m.h, 58 / m.w);
    ctx.translate(x0 + T / 2 - m.cx * sc, y0 + T - 5); ctx.scale(sc, sc);
    drawFigure(ctx, key);
    ctx.restore();
    label(ctx, FIG[key].name.replace('Round 11, round eye', 'Round 11').replace(', no rim', '').replace(' with a pupil', ', pupil'), x0 + T / 2, y0 + T + 19, 10);
  });
}

// ---------- the dial: one step per picture ----------
// step 1's scale is its round's own single scale (round 4: 1.8; round 5: fitted to 286 tall, 372 wide)
function stepScale(key) {
  const f = FIG[key], first = sizes[`${f.ch}-1`];
  const sc1 = f.ch === 'gecko' ? 1.8 : Math.min(286 / first.h, 372 / first.w);
  const target = first.h * sc1;
  return Math.min(target / sizes[key].h, 372 / sizes[key].w);
}
function stepPicture(key) {
  const f = FIG[key], m = sizes[key], sc = stepScale(key), floorY = 298, feet = f.ch === 'gecko' ? 352 : 354;
  const ctx = size(414, 414);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, 414, 414, floorY);
  ctx.save(); ctx.translate(207 - m.cx * sc, feet); ctx.scale(sc, sc);
  drawFigure(ctx, key);
  ctx.restore();
  if (f.step) {
    const words = f.step === 1 ? `as in ${DIAL[f.ch].from}` : f.step === 5 ? 'grown-up' : '';
    label(ctx, `${f.name}  ·  step ${f.step} of 5${words ? '  ·  ' + words : ''}`, 207, 400, 13, 'rgba(60,30,14,0.82)');
    // five small marks, the current one filled, so the step reads at a glance
    for (let i = 0; i < 5; i++) {
      const x = 207 + (i - 2) * 14, y = 381;
      ctx.beginPath(); ctx.arc(x, y, i + 1 === f.step ? 4 : 3, 0, Math.PI * 2);
      if (i + 1 === f.step) { ctx.fillStyle = 'rgba(60,30,14,0.82)'; ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(60,30,14,0.55)'; ctx.lineWidth = 1.4; ctx.stroke(); }
    }
  }
}

const which = q.get('lineup');
if (which === 'crow-faces') faces();
else if (which === 'crow-icons') icons();
else {
  const key = q.has('dial') ? 'try' : (q.get('pic') || keys[1]);
  if (!FIG[key]) throw new Error(`No picture called ${key}`);
  if (FIG[key].crow) {
    const m = sizes[key];
    const ctx = size(414, 414);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    room(ctx, 414, 414, 298);
    ctx.save(); ctx.translate(207 - m.cx * SINGLE, 360); ctx.scale(SINGLE, SINGLE);
    drawFigure(ctx, key);
    ctx.restore();
  } else stepPicture(key);
}

window.ready = true;
