// The drawing kit, copied from the seventh avatar round (../avatar7/js/kit.js). The shapes and the pen are
// as they were. Added for the eighth round, at the end of this file: a closed smooth outline through points
// (blob), gradients (lin, rad), a seeded random (rng), soft drop shadows that keep their size at any scale
// (shadowed), and a clip to the part of one shape outside another (clipOut). Each crow in crows.js uses
// what its own look needs; nothing here forces one way of shading.

export const PI = Math.PI, TAU = Math.PI * 2;

// ---------- paths ----------
export function rr(x, y, w, h, r = 0) {
  const p = new Path2D();
  const [a, b, c, d] = (Array.isArray(r) ? r : [r, r, r, r]).map(v => Math.max(0, Math.min(v, w / 2, h / 2)));
  p.moveTo(x + a, y);
  p.lineTo(x + w - b, y); p.arc(x + w - b, y + b, b, -PI / 2, 0);
  p.lineTo(x + w, y + h - c); p.arc(x + w - c, y + h - c, c, 0, PI / 2);
  p.lineTo(x + d, y + h); p.arc(x + d, y + h - d, d, PI / 2, PI);
  p.lineTo(x, y + a); p.arc(x + a, y + a, a, PI, PI * 1.5);
  p.closePath();
  return p;
}
// a pill: a rounded box with fully round ends, given by its centre
export const pill = (cx, cy, w, h) => rr(cx - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2);
export function circ(x, y, r) { const p = new Path2D(); p.arc(x, y, r, 0, TAU); p.closePath(); return p; }
export function ell(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); p.closePath(); return p; }
export function poly(pts) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}
// a polygon with each corner rounded by r (or by a point's own third number)
export function rpoly(pts, r = 4) {
  const p = new Path2D(), n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const s = mid(pts[n - 1], pts[0]);
  p.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], m = mid(a, b);
    p.arcTo(a[0], a[1], m[0], m[1], a[2] ?? r);
    p.lineTo(m[0], m[1]);
  }
  p.closePath();
  return p;
}
export const pd = d => new Path2D(d);
// a regular polygon with n corners, the first at angle a0 (0 points right)
export function ngon(cx, cy, r, n, a0 = -Math.PI / 2, ry = r) {
  return poly(Array.from({ length: n }, (_, i) => [cx + Math.cos(a0 + (i / n) * TAU) * r, cy + Math.sin(a0 + (i / n) * TAU) * ry]));
}
// a pie slice of a circle, from angle a to angle b (clockwise, as the canvas measures)
export function wedge(cx, cy, r, a, b) {
  const p = new Path2D();
  p.moveTo(cx, cy); p.arc(cx, cy, r, a, b); p.closePath();
  return p;
}
// the part of a circle below a straight line across it, for half discs and eyes with a flat lid
export function segment(cx, cy, r, cutY, keepBelow = true) {
  const p = new Path2D(), d = Math.max(-r, Math.min(r, cutY - cy)), a = Math.asin(d / r);
  if (keepBelow) { p.arc(cx, cy, r, a, PI - a); } else { p.arc(cx, cy, r, PI - a, TAU + a); }
  p.closePath();
  return p;
}
export function union(...ps) { const p = new Path2D(); for (const q of ps) p.addPath(q); return p; }
// a tube of even width between two points, round at both ends
export function tube(x1, y1, x2, y2, r) {
  const p = new Path2D(), a = Math.atan2(y2 - y1, x2 - x1);
  p.arc(x1, y1, r, a + PI / 2, a + PI * 1.5);
  p.arc(x2, y2, r, a - PI / 2, a + PI / 2);
  p.closePath();
  return p;
}
// a tapering tube, ra at the first end and rb at the second
export function limb(x1, y1, ra, x2, y2, rb) {
  const p = new Path2D(), a = Math.atan2(y2 - y1, x2 - x1);
  const d = Math.hypot(x2 - x1, y2 - y1) || 1, o = Math.asin(Math.max(-1, Math.min(1, (ra - rb) / d)));
  p.arc(x1, y1, ra, a + PI / 2 - o, a - PI / 2 + o + TAU);
  p.arc(x2, y2, rb, a - PI / 2 + o, a + PI / 2 - o);
  p.closePath();
  return p;
}
// a cloud: a filled ellipse with n circles of radius r spaced round its edge, for wool and curls
export function cloud(cx, cy, rx, ry, n, r, a0 = 0) {
  const ps = [ell(cx, cy, rx, ry)];
  for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU; ps.push(circ(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, r)); }
  return union(...ps);
}
// a tapering stroke through points [x, y, r], for tails
export function trail(pts) {
  const ps = [];
  for (let i = 0; i < pts.length - 1; i++) ps.push(limb(pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]));
  return union(...ps);
}
// a smooth run through points [x, y, r] (a Catmull-Rom curve, n samples between each pair), for trail()
export function smooth(pts, n = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export const soft = (pts, n = 8) => trail(smooth(pts, n));
// a leaf: two arcs meeting at points a and b, bulging by k of their distance (k2 on the other side)
export function leaf(ax, ay, bx, by, k = 0.35, k2 = k) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay;
  const nx = -dy, ny = dx;
  const p = new Path2D();
  p.moveTo(ax, ay);
  p.quadraticCurveTo(mx + nx * k, my + ny * k, bx, by);
  p.quadraticCurveTo(mx - nx * k2, my - ny * k2, ax, ay);
  p.closePath();
  return p;
}
const moved = (p, dx, dy) => { const q = new Path2D(); q.addPath(p, new DOMMatrix().translate(dx, dy)); return q; };

// ---------- colour ----------
const parse = hex => {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgba = (hex, a = 1) => { const [r, g, b] = parse(hex); return `rgba(${r},${g},${b},${a})`; };
export const mixHex = (a, b, k) => {
  const A = parse(a), B = parse(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
};

// p with q taken away, filled in col, drawn through the current clip. Done on a spare layer so that
// shapes made of several overlapping pieces (a body and its bumps) cut cleanly.
let spare = null;
function cutout(ctx, p, q, col) {
  const c = ctx.canvas;
  if (!spare || spare.width !== c.width || spare.height !== c.height) {
    spare = document.createElement('canvas'); spare.width = c.width; spare.height = c.height;
  }
  const o = spare.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, spare.width, spare.height);
  o.setTransform(ctx.getTransform());
  o.fillStyle = col; o.fill(p);
  o.globalCompositeOperation = 'destination-out'; o.fillStyle = '#000'; o.fill(q);
  o.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(spare, 0, 0); ctx.restore();
}

// ---------- the pen ----------
// style: { planes: 0..1 how broad the shadow planes are (0 = none), rim: rim colour or null, rimW }
export function pen(ctx, style = {}) {
  const S = { planes: 0, rim: null, rimW: 1.6, ...style };
  const g = {
    ctx, S,
    fill(p, col, a = 1) { ctx.fillStyle = a < 1 ? rgba(col, a) : col; ctx.fill(p); },
    line(p, col, w = 2, a = 1, cap = 'round') {
      ctx.save(); ctx.strokeStyle = a < 1 ? rgba(col, a) : col; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round';
      ctx.stroke(p); ctx.restore();
    },
    clip(p, fn) { ctx.save(); ctx.clip(p); fn(); ctx.restore(); },
    at(x, y, fn, sc = 1, rot = 0, sy = sc) {
      ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (sc !== 1 || sy !== sc) ctx.scale(sc, sy); fn(); ctx.restore();
    },
    // the part of p that a copy of p moved by (-dx, -dy) does not cover: a band along the bottom-right side
    plane(p, col, dx, dy) {
      if (!dx && !dy) return;
      cutout(ctx, p, moved(p, -dx, -dy), col);
    },
    // a thin bright line along the top-left edge
    rimOn(p, col = S.rim, w = S.rimW, a = 1) {
      if (!col || w <= 0) return;
      cutout(ctx, p, moved(p, w * 0.8, w), rgba(col, a));
    },
    // a whole form: base, then (by the style) its shadow plane and, on the main masses only, its rim.
    // o.dark: shadow colour; o.w: the form's width, which sets how broad the plane is; o.rim: true on a main mass
    form(p, base, o = {}) {
      ctx.fillStyle = base; ctx.fill(p);
      if (S.planes > 0 && o.dark) {
        const w = (o.w ?? 40) * S.planes;
        g.plane(p, o.dark, w * (o.kx ?? 0.42), w * (o.ky ?? 0.16));
      }
      if (o.rim) g.rimOn(p, o.rimCol || S.rim, o.rimW ?? S.rimW, o.rimA ?? 1);
    },
    // a whole form whose shadow is a straight cut: base, then the part of it inside region in the dark tone.
    // region is a path, or a number: everything right of that x.
    cut(p, base, dark, region) {
      ctx.fillStyle = base; ctx.fill(p);
      if (!dark || region == null) return;
      const r = typeof region === 'number' ? rr(region, -2000, 4000, 4000, 0) : region;
      g.clip(p, () => { ctx.fillStyle = dark; ctx.fill(r); });
    },
    // where it meets the floor: a hard flat ellipse (Kurzgesagt) or a flat pill (Duolingo)
    ground(w, kind = 'ellipse', col = '#0a0830', a = 0.3, h = 9) {
      ctx.fillStyle = rgba(col, a);
      ctx.fill(kind === 'pill' ? pill(0, 1, w * 2, h) : ell(0, 1, w, h / 2));
    },
  };
  return g;
}

// ---------- eyes ----------
// Duolingo eye: a white rounded box, a dark upright pill pupil with a round catchlight, closed by a lid from the top.
export function dEye(g, x, y, w, h, o = {}) {
  const { look = [0, 0], blink = 0, lid = '#000', lidLine = '#2b2b3f', pupil = '#2b2b3f', pw = 0.44, ph = 0.6, sleepy = 0 } = o;
  const p = rr(x - w / 2, y - h / 2, w, h, Math.min(w, h) * 0.46);
  g.fill(p, '#ffffff');
  const px = x + look[0], py = y + look[1] + h * 0.05, PW = w * pw, PH = h * ph;
  g.clip(p, () => {
    g.fill(pill(px, py, PW, PH), pupil);
    g.fill(circ(px - PW * 0.08, py - PH * 0.22, PW * 0.24), '#ffffff');
  });
  const k = Math.min(1, Math.max(sleepy, blink));
  if (k > 0.01) {
    // the lid comes down from the top; shut, it leaves a dark line low in the eye, so the eye still reads as an eye
    const lw = Math.max(1.4, h * 0.11), edge = Math.min(y - h / 2 + (h + 2) * k, y + h / 2 - lw * 0.9);
    const grown = rr(x - w / 2 - 0.9, y - h / 2 - 0.9, w + 1.8, h + 1.8, Math.min(w, h) * 0.46 + 0.9);
    g.clip(grown, () => {
      g.fill(rr(x - w / 2 - 1, y - h / 2 - 1, w + 2, edge - (y - h / 2 - 1), 0), lid);
      if (k >= 0.999) g.fill(rr(x - w / 2 - 1, edge, w + 2, h, 0), lid);
    });
    g.clip(rr(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, Math.min(w, h) * 0.46), () =>
      g.line(pd(`M${x - w / 2 + lw * 0.4} ${edge} Q${x} ${edge + h * 0.08 * k} ${x + w / 2 - lw * 0.4} ${edge}`), lidLine, lw));
  }
}
// Kurzgesagt person eye: a solid dark oval, no white; a blink squeezes it to a dash
export function kDot(g, x, y, rx, ry, blink = 0, col = '#24135e') {
  const k = 1 - blink * 0.88;
  g.fill(ell(x, y + ry * (1 - k) * 0.4, rx * (1 + blink * 0.15), Math.max(0.5, ry * k)), col);
}

// ---------- added for the eighth round ----------
// A closed smooth outline through points [x, y, k]: a Catmull-Rom curve as Bezier pieces. k (default 1) is how
// round the curve is at that point: 0 makes a sharp corner there, more than 1 swings it wider.
export function blob(pts) {
  const p = new Path2D(), n = pts.length, k = i => pts[(i + n) % n][2] ?? 1;
  const P = i => pts[(i + n) % n];
  p.moveTo(P(0)[0], P(0)[1]);
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const a = k(i) / 6, b = k(i + 1) / 6;
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * a, p1[1] + (p2[1] - p0[1]) * a,
      p2[0] - (p3[0] - p1[0]) * b, p2[1] - (p3[1] - p1[1]) * b, p2[0], p2[1]);
  }
  p.closePath();
  return p;
}
// An open smooth line through points [x, y], for strokes.
export function spline(pts) {
  const p = new Path2D(), n = pts.length, P = i => pts[Math.max(0, Math.min(n - 1, i))];
  p.moveTo(P(0)[0], P(0)[1]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  return p;
}
// gradients: stops are [offset, colour] pairs
export function lin(ctx, x0, y0, x1, y1, stops) {
  const gr = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
export function rad(ctx, x0, y0, r0, x1, y1, r1, stops) {
  const gr = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
// a small seeded random, so the hand-placed marks come out the same every time
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// the drawing's current scale, so blur and shadow offsets (which the canvas measures in device pixels) keep
// the same size against the drawing whatever size it is drawn at
export const scaleOf = ctx => { const m = ctx.getTransform(); return Math.hypot(m.a, m.b); };
// run fn with a soft drop shadow under whatever it paints: blur and offset in drawing units
export function shadowed(ctx, fn, blur = 4, dx = 1.5, dy = 2.5, col = 'rgba(4,4,20,0.5)') {
  const s = scaleOf(ctx);
  ctx.save();
  ctx.shadowColor = col; ctx.shadowBlur = blur * s; ctx.shadowOffsetX = dx * s; ctx.shadowOffsetY = dy * s;
  fn();
  ctx.restore();
}
// run fn clipped to the part of p that lies outside q
export function clipOut(ctx, p, q, fn) {
  ctx.save();
  ctx.clip(p);
  const r = new Path2D();
  r.addPath(rr(-5000, -5000, 10000, 10000, 0));
  r.addPath(q);
  ctx.clip(r, 'evenodd');
  fn();
  ctx.restore();
}
// p moved by (dx, dy), or turned by a about (cx, cy)
export const shift = (p, dx, dy) => { const q = new Path2D(); q.addPath(p, new DOMMatrix().translate(dx, dy)); return q; };
export const turn = (p, a, cx = 0, cy = 0) => {
  const q = new Path2D();
  q.addPath(p, new DOMMatrix().translate(cx, cy).rotate(a * 180 / Math.PI).translate(-cx, -cy));
  return q;
};
