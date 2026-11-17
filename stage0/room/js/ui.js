// The few controls that sit over the room: the coin count, the bubble a touched thing gets,
// the edge arrows, the globe's back arrow, and the ghost hand used in the films.

import { clamp01 } from './ease.js';
import { rr, circ, poly, pd, capsule, star, TAU, PI } from './draw.js';

const FONT = (size, weight = 800) => `${weight} ${size}px "Nunito", system-ui, sans-serif`;

export function coins(ctx, n, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = FONT(16);
  const text = String(n), w = ctx.measureText(text).width + 50, x = 414 - 16 - w, y = 50;
  ctx.fillStyle = '#1b2250'; ctx.fill(rr(x, y, w, 36, 18));
  ctx.strokeStyle = '#2f3678'; ctx.lineWidth = 2; ctx.stroke(rr(x + 1, y + 1, w - 2, 34, 17));
  const cx = x + 19, cy = y + 18;
  ctx.fillStyle = '#c98a00'; ctx.fill(circ(cx, cy + 1.6, 10.5));
  ctx.fillStyle = '#ffc83d'; ctx.fill(circ(cx, cy - 0.4, 10.5));
  ctx.strokeStyle = 'rgba(255,243,196,0.85)'; ctx.lineWidth = 1.8; ctx.stroke(circ(cx, cy - 0.4, 7));
  ctx.fillStyle = '#c98a00'; ctx.fill(star(cx, cy - 0.2, 4.2));
  ctx.fillStyle = '#ffc83d'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 36, y + 19);
  ctx.restore();
}

// a chunky square button with an arrow. dir: -1 left, 1 right. press: 0 to 1.
export function arrowButton(ctx, x, y, size, dir, alpha = 1, press = 0) {
  if (alpha <= 0.01) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const d = 3 * (1 - press);
  ctx.fillStyle = '#1c2250'; ctx.fill(rr(x, y + 3, size, size, size * 0.32));
  ctx.translate(0, 3 - d);
  ctx.fillStyle = '#222a60'; ctx.fill(rr(x, y, size, size, size * 0.32));
  ctx.strokeStyle = '#364090'; ctx.lineWidth = 2; ctx.stroke(rr(x + 1, y + 1, size - 2, size - 2, size * 0.32 - 1));
  const cx = x + size / 2, cy = y + size / 2, s = size * 0.19;
  ctx.strokeStyle = '#6fd6ff'; ctx.lineWidth = size * 0.085; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx - dir * s * 0.5, cy - s); ctx.lineTo(cx + dir * s * 0.5, cy); ctx.lineTo(cx - dir * s * 0.5, cy + s); ctx.stroke();
  ctx.restore();
}

// The bubble by a touched thing: its name, how well it is remembered, and Review if it is fading.
// (ax, ay) is the point it grows from. below: true puts it under that point.
export function bubble(ctx, o) {
  const { name, mem, fading, ax, ay, below, k, alpha = 1 } = o;
  if (k <= 0.01) return null;
  ctx.save();
  ctx.font = FONT(15);
  const nameW = ctx.measureText(name).width;
  const barW = Math.max(74, Math.ceil(nameW)), btnW = fading ? 82 : 0, gap = fading ? 12 : 0;
  const w = 14 + barW + gap + btnW + (fading ? 9 : 14), h = fading ? 50 : 48;
  const x = Math.max(10, Math.min(414 - 10 - w, ax - w / 2));
  const y = below ? ay + 12 : ay - 12 - h;
  ctx.translate(ax, ay); ctx.scale(k, k); ctx.translate(-ax, -ay);
  ctx.globalAlpha = clamp01(k * 2.2) * alpha;
  const tail = below ? poly([[ax - 8, y + 1], [ax + 8, y + 1], [ax, y - 8]]) : poly([[ax - 8, y + h - 1], [ax + 8, y + h - 1], [ax, y + h + 8]]);
  ctx.fillStyle = '#b9c2ee';
  ctx.fill(rr(x, y + 3, w, h, 14));
  if (!below) { ctx.save(); ctx.translate(0, 3); ctx.fill(tail); ctx.restore(); }
  ctx.fillStyle = '#ffffff';
  ctx.fill(rr(x, y, w, h, 14)); ctx.fill(tail);
  ctx.fillStyle = '#1b1f5e'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const ty = fading ? y + 22 : y + 21;
  ctx.fillText(name, x + 14, ty);
  // the memory bar: blue when strong, grey as it goes
  const by = ty + 9;
  ctx.fillStyle = '#dfe5ff'; ctx.fill(rr(x + 14, by, barW, 8, 4));
  ctx.fillStyle = fading ? '#98a1c6' : '#49c6ff'; ctx.fill(rr(x + 14, by, Math.max(8, barW * mem), 8, 4));
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill(rr(x + 17, by + 1.6, Math.max(3, barW * mem - 6), 2, 1));
  let review = null;
  if (fading) {
    const bx = x + 14 + barW + gap, bh = 30, byy = y + 9 - (o.press ? -2 : 0);
    ctx.fillStyle = '#1b8fd1'; ctx.fill(rr(bx, y + 12, btnW, bh, 11));
    ctx.fillStyle = '#49c6ff'; ctx.fill(rr(bx, byy, btnW, bh, 11));
    ctx.fillStyle = '#0e1436'; ctx.font = FONT(12.5); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    try { ctx.letterSpacing = '0.6px'; } catch { /* older browsers */ }
    ctx.fillText('REVIEW', bx + btnW / 2 + 0.3, byy + bh / 2 + 1);
    try { ctx.letterSpacing = '0px'; } catch { /* older browsers */ }
    review = [bx, y + 9, bx + btnW, y + 9 + bh + 3];
  }
  ctx.restore();
  return { box: [x, y, x + w, y + h], review };
}

// ---- the ghost hand, as in the look film ----
const handPath = (() => {
  const p = new Path2D();
  p.addPath(rr(-8.5, -2, 17, 58, 8.5));
  p.addPath(rr(-11, 38, 50, 46, 15));
  p.addPath(rr(8, 28, 12.5, 26, 6.2));
  p.addPath(rr(19.5, 31, 12, 24, 6));
  p.addPath(rr(30, 35.5, 10.5, 22, 5.2));
  p.addPath(capsule(-7, 64, -19, 47, 7.5));
  return p;
})();
const sleevePath = rr(-6, 79, 40, 24, 7);
export function hand(ctx, x, y, press, alpha) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-0.42);
  ctx.scale(1.02 - press * 0.07, 1.02 - press * 0.07);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(6,8,48,0.25)';
  ctx.save(); ctx.translate(5 + (1 - press) * 5, 7 + (1 - press) * 7); ctx.fill(handPath); ctx.fill(sleevePath); ctx.restore();
  ctx.fillStyle = '#ff7a59'; ctx.fill(sleevePath);
  ctx.save(); ctx.translate(2.5, 2.5); ctx.fillStyle = '#c5d0ff'; ctx.fill(handPath); ctx.restore();
  ctx.fillStyle = '#ffffff'; ctx.fill(handPath);
  ctx.restore();
}
// the touch itself: a soft solid disc that spreads and goes
export function touchMark(ctx, x, y, k) {
  if (k <= 0 || k >= 1) return;
  ctx.fillStyle = `rgba(255,255,255,${0.34 * (1 - k)})`;
  ctx.fill(circ(x, y, 10 + k * 22));
}
