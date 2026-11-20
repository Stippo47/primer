// Small drawn things that sit on a map, each drawn at a point on a 2D canvas: a dot, a ring, a pin, a
// name chip, and the approved hurricane (the Disc, 2026-11-17, from stage0/scene/src/storms.js). They
// know nothing about projections, so any part with a canvas can use them. No blur anywhere: shadows are
// flat shapes.

import { rgba, mix } from './look.js';

const TAU = Math.PI * 2, PI = Math.PI;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);

// A raised dot: a flat shadow, a ring and a lit middle.
export function dot(g, x, y, rad, ring, fillC) {
  g.fillStyle = 'rgba(6,8,48,0.35)'; g.beginPath(); g.ellipse(x + 1, y + rad * 0.9, rad * 1.1, rad * 0.45, 0, 0, TAU); g.fill();
  g.fillStyle = ring; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  g.fillStyle = fillC; g.beginPath(); g.arc(x, y, rad * 0.55, 0, TAU); g.fill();
}

// A name on a little raised plate, kept inside [0, width]. k scales it as it pops in.
export function chip(g, text, x, y, { k = 1, gold = false, width = Infinity } = {}) {
  g.save();
  g.font = '800 13px "Nunito", system-ui, sans-serif';
  const tw = g.measureText(text).width + 22, th = 26;
  x = Math.max(tw / 2 + 6, Math.min(width - tw / 2 - 6, x));
  g.translate(x, y); g.scale(k, k); g.globalAlpha = clamp01(k * 2.5);
  g.fillStyle = gold ? '#c98a00' : '#b9c2ee'; g.beginPath(); g.roundRect(-tw / 2, -th / 2 + 3, tw, th, 11); g.fill();
  g.fillStyle = gold ? '#ffc83d' : '#ffffff'; g.beginPath(); g.roundRect(-tw / 2, -th / 2, tw, th, 11); g.fill();
  g.fillStyle = gold ? '#2a1650' : '#1b1f5e'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 0, 1);
  g.restore();
}

// A marker of a kind at x, y, popped in by k (0..1). size is the map's size factor; turn how far a storm has
// turned (in seconds at its full speed: a lesson's storm turns 1.6 radians a second); south whether it's
// south of the equator (it turns the other way); strength (0..1) how strong a storm is: weaker, its bands
// unwind and its deck greys and thins (a storm dying away).
// Returns how far above x, y its label goes.
export function mark(g, kind, x, y, { k = 1, size = 1, turn = 0, south = false, strength = 1 } = {}) {
  if (kind === 'storm') {
    const R = Math.max(12, 20 * size);
    if (R * k > 0.5) storm(g, x, y, R * k, -0.4 + turn * 1.6 * (south ? 1 : -1), strength);
    return R + 22;
  }
  if (kind === 'ring') {
    g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 11 * k, 0, TAU); g.stroke();
    return 28;
  }
  if (kind === 'tap') {   // where a finger dropped a pin
    g.save(); g.translate(x, y); g.scale(k, k); dot(g, 0, 0, 9, '#ee4b7a', '#ffffff'); g.restore();
    return 28;
  }
  // a pin: a gold dot
  g.save(); g.translate(x, y); g.scale(k, k); dot(g, 0, 0, 8, '#c98a00', '#ffc83d'); g.restore();
  return 26;
}

// ---------------------------------------------------------------- the hurricane (the Disc)

const STORM = { fill: '#ffffff', shade: '#aebfff', tired: '#c3c9ee', depth: 3, swirl: '#8fa4f5', eye: '#1b2a80', shadow: '#060830', shadowAlpha: 0.27 };
function disc(p, x, y, r) { if (r <= 0.01) return; p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); p.closePath(); }
function ribbon(p, at, width, n = 44) {
  const c = [];
  for (let i = 0; i <= n; i++) c.push(at(i / n));
  const a = [], b = [];
  for (let i = 0; i <= n; i++) {
    const p0 = c[Math.max(0, i - 1)], p1 = c[Math.min(n, i + 1)];
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    const h = width(i / n) / 2;
    a.push([c[i][0] - ty * h, c[i][1] + tx * h]);
    b.push([c[i][0] + ty * h, c[i][1] - tx * h]);
  }
  const ring = a.concat(b.reverse());
  let area = 0;
  for (let i = 0; i < ring.length; i++) { const q = ring[i], r = ring[(i + 1) % ring.length]; area += q[0] * r[1] - r[0] * q[1]; }
  if (area < 0) ring.reverse();
  p.moveTo(ring[0][0], ring[0][1]);
  for (let i = 1; i < ring.length; i++) p.lineTo(ring[i][0], ring[i][1]);
  p.closePath();
}
const spiral = (a0, turn, r0, r1) => s => { const r = r0 * Math.pow(r1 / r0, s), a = a0 + turn * s; return [r * Math.cos(a), r * Math.sin(a)]; };

// Seen from straight above: a round deck of cloud with grooves wound into it, a thin veil below, a raised
// wall round the eye. `angle` falling turns it counterclockwise on screen. strength (0..1): at full strength
// as approved; lower, it loosens (the deck shrinks inside a wider, thinner veil, its grooves unwind, the eye
// wall sinks and fills in) and greys toward the tired tone.
export function storm(ctx, x, y, R, angle, strength = 1) {
  const g = clamp01(strength), d = STORM.depth * R / 28;
  const T = { white: mix(STORM.tired, STORM.fill, g), shade: mix('#b9bedf', STORM.shade, g), mid: mix(STORM.fill, STORM.shade, 0.5), deep: mix(STORM.tired, STORM.swirl, g) };
  const rd = R * lerp(0.72, 0.96, g);
  const veil = new Path2D(), rv = rd * lerp(1.2, 1.26, g);
  disc(veil, 0, 0, rv);
  for (let j = 0; j < 2; j++) ribbon(veil, spiral(angle * 0.5 + 2.2 + j * PI, lerp(1.3, 1.9, g), rv * 0.74, rv * lerp(1.2, 1.3, g)), s => rv * 0.42 * Math.pow(1 - s, 0.8) + 0.01, 36);
  const top = new Path2D();
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * TAU, rr = rd * (0.975 + 0.04 * Math.abs(Math.sin(a * 5.5)));
    const px = rr * Math.cos(a + angle), py = rr * Math.sin(a + angle);
    if (i === 0) top.moveTo(px, py); else top.lineTo(px, py);
  }
  top.closePath();
  const grooves = new Path2D(), wind = lerp(2.2, 6.4, g);
  for (let j = 0; j < 2; j++) {
    ribbon(grooves, spiral(angle + j * PI + 0.75, -wind, rd * 1.03, R * lerp(0.3, 0.46, g)),
      s => R * lerp(0.085, 0.03, s) * Math.pow(Math.sin(Math.min(1, s * 1.2 + 0.03) * PI), 0.5) + 0.01, 70);
  }
  const wall = new Path2D();
  disc(wall, 0, 0, R * lerp(0.2, 0.4, g));
  const slab = (p, fill, under, dd) => {
    if (dd) { ctx.save(); ctx.translate(0, dd); ctx.fillStyle = under; ctx.fill(p); ctx.restore(); }
    ctx.fillStyle = fill; ctx.fill(p);
  };
  ctx.save();
  ctx.translate(x + 2, y + 5);
  ctx.fillStyle = rgba(STORM.shadow, STORM.shadowAlpha);
  ctx.fill(veil);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  slab(veil, T.mid, T.deep, d * 0.7);
  slab(top, T.white, T.shade, d);
  ctx.save(); ctx.clip(top); ctx.fillStyle = T.shade; ctx.fill(grooves); ctx.restore();
  slab(wall, T.white, T.shade, d * 0.8);
  const er = R * lerp(0.08, 0.18, g);
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, er, 0, TAU); ctx.clip();
  ctx.fillStyle = T.shade; ctx.fillRect(-er, -er, er * 2, er * 2);
  ctx.fillStyle = STORM.eye; ctx.beginPath(); ctx.arc(0, Math.min(d * 0.7, er * 0.4), er, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
}
