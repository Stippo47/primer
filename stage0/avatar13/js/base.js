// Shared parts for the gecko's style directions (styles.js): the round 4 gecko's skeleton (where its feet, legs,
// body, arms, head, eyes and tail sit), and the few drawing helpers more than one direction needs (layers drawn
// off to the side and laid back on, grain, a printed-ink pipeline, a cut-paper wobble, facets).
//
// Units are round 4's: the gecko is drawn from its feet at (0, 0), up is negative y, about 150 units tall.

import { rng, poly, PI } from '../../avatar10/js/kit.js';

// round 4's gecko, as numbers (../../avatar4/js/cast.js). Every direction keeps this pose: standing square on,
// arms out and down, the tail curled up behind on the right, the head wider than the body.
export const SK = {
  feet: [[-12.5, -3.4], [12.5, -3.4]],
  legs: [[-10, -32, -12, -12], [10, -32, 12, -12]],
  body: { top: -98, bot: -26, sh: 18, hip: 22 },
  arms: [[-16, -86, -28, -64], [16, -86, 28, -64]],
  hands: [[-29, -61], [29, -61]],
  head: { x: -41, y: -144, w: 82, h: 52 },
  eyes: [[-12, -122], [12, -122]],
  tail: { cx: 42, cy: -44, R0: 30, shrink: 21, a0: 148, sweep: 350, r0: 9, rTip: 2.5 },
};

// a point along a spiral tail at t (0 at the root, 1 at the tip): [x, y, half-width]
export function spiral(o = {}) {
  const T = { ...SK.tail, ...o };
  return t => {
    const a = (T.a0 - t * T.sweep) * PI / 180, R = T.R0 - T.shrink * t;
    return [T.cx + R * Math.cos(a), T.cy + R * Math.sin(a), T.r0 - (T.r0 - T.rTip) * t];
  };
}
// the outline of a spiral tail as one closed polygon (outer edge out, inner edge back), n steps
export function tailOutline(at, n = 40, cap = true) {
  const outer = [], inner = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, [x, y, r] = at(t), [x2, y2] = at(Math.min(1, t + 0.002)), [x0, y0] = at(Math.max(0, t - 0.002));
    const a = Math.atan2(y2 - y0, x2 - x0), nx = -Math.sin(a), ny = Math.cos(a);
    outer.push([x + nx * r, y + ny * r]); inner.push([x - nx * r, y - ny * r]);
  }
  const pts = [...outer];
  if (cap) {
    const [x, y, r] = at(1), [x0, y0] = at(0.995), a = Math.atan2(y - y0, x - x0);
    for (let k = 1; k < 8; k++) { const b = a + PI / 2 - (k / 8) * PI; pts.push([x + Math.cos(b) * r, y + Math.sin(b) * r]); }
  }
  pts.push(...inner.reverse());
  return pts;
}

// ---------- layers ----------
// a spare canvas the same size as ctx's, with the same transform, for drawing a part on its own
export function layer(ctx) {
  const c = document.createElement('canvas');
  c.width = ctx.canvas.width; c.height = ctx.canvas.height;
  const l = c.getContext('2d');
  l.setTransform(ctx.getTransform());
  return l;
}
// lay a layer back onto ctx, pixel for pixel (ctx's clip still applies)
export function lay(ctx, l, op = 'source-over', alpha = 1) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = op; ctx.globalAlpha = alpha;
  ctx.drawImage(l.canvas, 0, 0);
  ctx.restore();
}

// a value noise in device pixels, smooth at scale `cell`, seeded; returns f(x, y) in 0..1
function valueNoise(seed, cell) {
  const r = rng(seed), N = 256, tab = Array.from({ length: N * N }, () => r());
  const at = (i, j) => tab[((j % N + N) % N) * N + ((i % N + N) % N)];
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const s = u * u * (3 - 2 * u), t = v * v * (3 - 2 * v);
    return (at(i, j) * (1 - s) + at(i + 1, j) * s) * (1 - t) + (at(i, j + 1) * (1 - s) + at(i + 1, j + 1) * s) * t;
  };
}

// turn a layer drawn in soft coverage (any colour, alpha = how much ink) into grainy printed ink of one colour:
// each pixel is inked or bare, more often inked the more coverage it had. clump mixes in a coarser noise, so the
// grain gathers in small blotches the way a stencil print does.
export function printInk(l, hex, { seed = 1, clump = 0.35, cell = 3, bias = 0.05 } = {}) {
  const c = l.canvas, im = l.getImageData(0, 0, c.width, c.height), d = im.data;
  const r = rng(seed), vn = valueNoise(seed + 7, cell);
  const [R, G, B] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, a = d[i + 3] / 255;
    if (a <= 0) continue;
    const n = r() * (1 - clump) + vn(x, y) * clump;
    const on = a > n * (1 - bias * 2) + bias;
    d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = on ? 255 : 0;
  }
  l.putImageData(im, 0, 0);
}

// knock small specks and dry streaks out of whatever a layer holds, for a printed or dry-brush finish
export function wear(l, { seed = 3, amount = 0.08, cell = 2.2, streak = 0 } = {}) {
  const c = l.canvas, im = l.getImageData(0, 0, c.width, c.height), d = im.data;
  const vn = valueNoise(seed, cell), vs = valueNoise(seed + 11, 9);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    if (!d[i + 3]) continue;
    // streak: a noise stretched along x, for a brush dragged sideways
    const s = streak ? vs(x * 0.18, y * 2.2) * streak : 0;
    if (vn(x, y) + s > 1 - amount) d[i + 3] = Math.round(d[i + 3] * 0.15);
  }
  l.putImageData(im, 0, 0);
}

// a whisper of paper fibre over everything already drawn, in CSS pixels w by h at dpr
export function paper(ctx, W, H, { seed = 5, light = 0.05, dark = 0.05, cell = 1.6 } = {}) {
  const c = ctx.canvas, im = ctx.getImageData(0, 0, c.width, c.height), d = im.data;
  const vn = valueNoise(seed, cell), vb = valueNoise(seed + 3, 14);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, n = vn(x, y) * 0.7 + vb(x, y) * 0.3 - 0.5;
    const k = n > 0 ? 1 + n * light * 2 : 1 + n * dark * 2;
    d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k);
  }
  ctx.putImageData(im, 0, 0);
}

// ---------- cut paper ----------
// a closed outline through pts, each corner nudged by up to j units (seeded), with small rounded corners: the
// straight, slightly uneven runs of a scissor cut
export function cutPoly(pts, seed = 1, j = 0.7) {
  const r = rng(seed);
  return pts.map(([x, y]) => [x + (r() - 0.5) * 2 * j, y + (r() - 0.5) * 2 * j]);
}
// n points round an ellipse, for cut circles
export function ringPts(cx, cy, rx, ry = rx, n = 20, a0 = 0) {
  return Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
}

// ---------- facets ----------
// split a polygon into a fan of triangles round an inner point, after cutting each edge in `split` pieces,
// and shade each triangle by which way it faces: toward the light (upper left) lighter, away darker.
// tones: darkest to lightest. lean: how much the triangle's place within the shape counts toward its tone.
export function facets(g, pts, centre, tones, { split = 1, seed = 1, lean = 1, light = [-0.62, -0.78], ring = 0.55 } = {}) {
  const r = rng(seed), P = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    for (let k = 0; k < split; k++) P.push([a[0] + (b[0] - a[0]) * k / split, a[1] + (b[1] - a[1]) * k / split]);
  }
  const [cx, cy] = centre;
  // an inner ring of points between the centre and the edge, so the facets aren't all long thin slivers
  const inner = P.map(([x, y], i) => i % 2 ? null : [cx + (x - cx) * ring + (r() - 0.5) * 3, cy + (y - cy) * ring + (r() - 0.5) * 3]);
  const tris = [];
  const n = P.length;
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n];
    const ia = inner[i] || inner[(i + n - 1) % n], ib = inner[(i + 1) % n] || inner[i];
    if (ia === ib) tris.push([a, b, ia]); else { tris.push([a, b, ib]); tris.push([a, ib, ia]); }
    if (ia !== ib) tris.push([ia, ib, [cx, cy]]);
  }
  const spanX = Math.max(...pts.map(p => Math.abs(p[0] - cx))) || 1, spanY = Math.max(...pts.map(p => Math.abs(p[1] - cy))) || 1;
  for (const t of tris) {
    const mx = (t[0][0] + t[1][0] + t[2][0]) / 3, my = (t[0][1] + t[1][1] + t[2][1]) / 3;
    const nx = (mx - cx) / spanX, ny = (my - cy) / spanY;
    const lit = (nx * light[0] + ny * light[1]) * lean + (r() - 0.5) * 0.35;
    const k = Math.max(0, Math.min(tones.length - 1, Math.round((lit + 1) / 2 * (tones.length - 1) + 0.15)));
    g.ctx.fillStyle = tones[k];
    const p = poly(t); g.ctx.fill(p);
    g.ctx.strokeStyle = tones[k]; g.ctx.lineWidth = 0.35; g.ctx.stroke(p);   // closes hairline gaps between facets
  }
}
