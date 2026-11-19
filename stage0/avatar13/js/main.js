// Picks what to show from the address. Stills only.
//   index.html?pic=crow-button-lying          one crow, at round 10's single scale (ids in crows.js)
//   index.html?lineup=crow-faces              the crows' heads, large, with round 12's upright pill first
//   index.html?lineup=crow-icons              the same at icon size, each fitted into a 64-point square
//   index.html?pic=gecko-geometric            the gecko in one style direction (ids in styles.js), labelled
//   index.html?lineup=gecko-sheet             all ten directions side by side, small
//   index.html?lineup=gecko-icons             all ten at icon size, cut from each picture

import { pen } from '../../avatar10/js/kit.js';
import { CROWS } from './crows.js';
import { CROWS as ROUND12 } from '../../avatar12/js/crows.js';
import { STYLES } from './styles.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('art');
const dpr = 2;

// ---------- what can be drawn ----------
const FIG = {};
const ref = ROUND12.find(k => k.id === 'button-pill');
FIG['crow-r12-button-pill'] = { name: 'Round 12, standing', draw: ref.draw, head: ref.head, crow: true };
for (const k of CROWS) FIG[`crow-${k.id}`] = { name: k.name, draw: k.draw, head: k.head, crow: true };
STYLES.forEach((s, i) => { FIG[`gecko-${s.id}`] = { name: s.name, style: s, n: i + 1 }; });

function drawCrow(ctx, key, o = {}) {
  const g = pen(ctx, { planes: 0.5 });
  g.noGround = !!o.noGround;
  if (o.noGround) g.ground = () => {};
  FIG[key].draw(g);
}
// the plain floor and wall of the room, in the Mix colours (the same as rounds three to twelve)
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
// how tall a crow stands and where the middle of its outline is, found by drawing it once off screen
function measure(key) {
  const S = 2, W = 480, H = 400, ox = 240, oy = 360;
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const ctx = c.getContext('2d');
  ctx.setTransform(S, 0, 0, S, ox * S, oy * S);
  drawCrow(ctx, key, { noGround: true });
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = 0, y0 = c.height;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (px[(y * c.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
  }
  return { h: oy - y0 / S, cx: (x0 + x1) / 2 / S - ox, w: (x1 - x0) / S };
}
const keys = Object.keys(FIG);
const crowKeys = keys.filter(k => FIG[k].crow);
const sizes = Object.fromEntries(crowKeys.map(k => [k, measure(k)]));
const geckoKeys = keys.filter(k => FIG[k].style);
window.catalogue = {
  pictures: keys.filter(k => k !== 'crow-r12-button-pill'), extra: [],
  lineups: ['crow-faces', 'crow-icons', 'gecko-sheet', 'gecko-icons'],
  styles: STYLES.map((s, i) => ({ n: i + 1, id: s.id, name: s.name, line: s.line })),
};

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
    drawCrow(ctx, key);
    ctx.restore();
    label(ctx, FIG[key].name, x0 + CW / 2, y0 + CH + 24, 14);
  });
}
function crowIcons() {
  const T = 64, gap = 34, pad = 18, n = crowKeys.length, rowH = T + 34;
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
    drawCrow(ctx, key);
    ctx.restore();
    label(ctx, FIG[key].name.replace('Round 12, standing', 'Round 12').replace('Lying, flat white', 'Flat white').replace('Lying, shade', 'Shade'), x0 + T / 2, y0 + T + 19, 10);
  });
}
function crowPicture(key) {
  const m = sizes[key];
  const ctx = size(414, 414);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  room(ctx, 414, 414, 298);
  ctx.save(); ctx.translate(207 - m.cx * SINGLE, 360); ctx.scale(SINGLE, SINGLE);
  drawCrow(ctx, key);
  ctx.restore();
}

// ---------- the gecko: one picture per direction ----------
// Each is drawn on its own 414-point square at round 4's single scale (1.8), feet on the same spot, the room's
// floor starting at the same height as every round since the third. Drawn on a canvas of its own, so a direction
// that works over the finished picture's pixels (grain, print) touches only its own picture.
const GS = 1.8, FEET = [180, 352], FY = 298, P = 414;
function geckoCanvas(style, n, withLabel = true) {
  const cv = document.createElement('canvas');
  cv.width = P * dpr; cv.height = P * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const px = ctx.getTransform();
  style.bg(ctx, P, P, FY);
  ctx.save();
  ctx.translate(FEET[0], FEET[1]); ctx.scale(GS, GS);
  style.draw(pen(ctx, { planes: 0.5 }), { W: P, H: P, fy: FY, px });
  ctx.restore();
  if (style.finish) style.finish(ctx, P, P);
  if (withLabel) label(ctx, `${n}  ·  ${style.name}`, 207, 400, 13, style.label);
  return cv;
}
function geckoPicture(key) {
  const ctx = size(P, P);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(geckoCanvas(FIG[key].style, FIG[key].n), 0, 0);
}
// all ten, five to a row, each with its name under it
function geckoSheet() {
  const T = 250, gap = 12, lab = 30, cols = 5, rows = Math.ceil(geckoKeys.length / cols);
  const W = cols * T + (cols + 1) * gap, H = rows * (T + lab) + gap;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#16161c'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  geckoKeys.forEach((key, i) => {
    const x0 = gap + (i % cols) * (T + gap), y0 = gap + Math.floor(i / cols) * (T + lab);
    ctx.save();
    const cell = new Path2D(); cell.roundRect(x0, y0, T, T, 10); ctx.clip(cell);
    // the square round the gecko, leaving out the empty wall at the top and the label
    ctx.drawImage(geckoCanvas(FIG[key].style, FIG[key].n, false), 40 * dpr, 40 * dpr, 340 * dpr, 340 * dpr, x0, y0, T, T);
    ctx.restore();
    label(ctx, `${FIG[key].n}  ·  ${FIG[key].name}`, x0 + T / 2, y0 + T + 20, 13, 'rgba(235,235,245,0.88)');
  });
}
// icon size: a 64-point square cut round the gecko from each picture
function geckoIcons() {
  const T = 64, gap = 30, pad = 18, cols = 5, rowH = T + 34, rows = Math.ceil(geckoKeys.length / cols);
  const W = pad * 2 + cols * T + (cols - 1) * gap, H = pad + rows * rowH;
  const ctx = size(W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#16161c'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingQuality = 'high';
  geckoKeys.forEach((key, i) => {
    const x0 = pad + (i % cols) * (T + gap), y0 = pad + Math.floor(i / cols) * rowH;
    ctx.save();
    const tile = new Path2D(); tile.roundRect(x0, y0, T, T, 14); ctx.clip(tile);
    ctx.drawImage(geckoCanvas(FIG[key].style, FIG[key].n, false), 62 * dpr, 70 * dpr, 296 * dpr, 296 * dpr, x0, y0, T, T);
    ctx.restore();
    label(ctx, FIG[key].name.replace(' minimal', '').replace('Geometric glow', 'Geometric').replace('Graphic poster', 'Poster'), x0 + T / 2, y0 + T + 19, 10, 'rgba(235,235,245,0.88)');
  });
}

const which = q.get('lineup');
if (which === 'crow-faces') faces();
else if (which === 'crow-icons') crowIcons();
else if (which === 'gecko-sheet') geckoSheet();
else if (which === 'gecko-icons') geckoIcons();
else {
  const key = q.get('pic') || 'crow-button-lying';
  if (!FIG[key]) throw new Error(`No picture called ${key}`);
  if (FIG[key].crow) crowPicture(key); else geckoPicture(key);
}

window.ready = true;
