// The drawing kit: path pieces, and one way of shading that every object uses.
// One light, top left. A form is its base colour, a lit crescent on the top-left edge
// and a shade crescent on the bottom-right edge, made by sliding copies of its own outline.

import { lerp } from './ease.js';

export const PI = Math.PI, TAU = Math.PI * 2;

// ---- colour ----
const parsed = new Map();
export function rgb(hex) {
  let v = parsed.get(hex);
  if (!v) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    parsed.set(hex, v);
  }
  return v;
}
const css = (c, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const SHADE = rgb('#1a1056'), LIT = rgb('#ffffff'), DUST = rgb('#8a92ba');

// ---- paths ----
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
export function circ(x, y, r) { const p = new Path2D(); p.arc(x, y, r, 0, TAU); p.closePath(); return p; }
export function ell(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, TAU); p.closePath(); return p; }
export function poly(pts, closed = true) {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (closed) p.closePath();
  return p;
}
// a polygon with every corner rounded by r (or by the third number of a point)
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
// a smooth curve through every point (Catmull-Rom). k is how round it is.
export function soft(pts, closed = true, k = 1) {
  const p = new Path2D(), n = pts.length;
  const at = i => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  p.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6,
      p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6, p2[0], p2[1]);
  }
  if (closed) p.closePath();
  return p;
}
export const pd = d => new Path2D(d);
export function union(...ps) { const p = new Path2D(); for (const q of ps) p.addPath(q); return p; }
export function capsule(x1, y1, x2, y2, r) {
  const p = new Path2D(), a = Math.atan2(y2 - y1, x2 - x1);
  p.moveTo(x1 + r * Math.cos(a + PI / 2), y1 + r * Math.sin(a + PI / 2));
  p.arc(x1, y1, r, a + PI / 2, a + PI * 1.5);
  p.arc(x2, y2, r, a - PI / 2, a + PI / 2);
  p.closePath();
  return p;
}
// a tapering limb from a (radius ra) to b (radius rb)
export function limb(x1, y1, ra, x2, y2, rb) {
  const p = new Path2D(), a = Math.atan2(y2 - y1, x2 - x1);
  const d = Math.hypot(x2 - x1, y2 - y1) || 1, o = Math.asin(Math.max(-1, Math.min(1, (ra - rb) / d)));
  p.arc(x1, y1, ra, a + PI / 2 - o, a - PI / 2 + o + TAU);
  p.arc(x2, y2, rb, a - PI / 2 + o, a + PI / 2 - o);
  p.closePath();
  return p;
}
export function star(cx, cy, r, inner = 0.46, n = 5, rot = -PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * PI) / n, k = i % 2 ? r * inner : r;
    pts.push([cx + Math.cos(a) * k, cy + Math.sin(a) * k]);
  }
  return rpoly(pts, r * 0.08);
}

// ---- the shaded form ----
export function form(ctx, p, fill, o = {}) {
  const { shade = null, lit = null, s = 3, l = 1.6 } = o;
  const sx = o.sx ?? s * 0.75, sy = o.sy ?? s, lx = o.lx ?? l * 0.8, ly = o.ly ?? l;
  ctx.save();
  ctx.fillStyle = lit || fill;
  ctx.fill(p);
  if (shade || lit) {
    ctx.clip(p);
    if (lit) ctx.translate(lx, ly);
    ctx.fillStyle = shade || fill;
    ctx.fill(p);
    if (shade) {
      if (lit) ctx.clip(p);
      ctx.translate(-(lit ? lx : 0) - sx, -(lit ? ly : 0) - sy);
      ctx.fillStyle = fill;
      ctx.fill(p);
    }
  }
  ctx.restore();
}

// A pen bound to a canvas. `fade` (0 to 1) drains colour toward dusty grey-blue: a topic being forgotten.
export function pen(ctx, fade = 0) {
  const cache = new Map();
  const base = hex => {
    let v = cache.get(hex);
    if (!v) {
      v = rgb(hex);
      if (fade > 0) {
        const grey = 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2];
        v = mix3(mix3(v, [grey, grey, grey], 0.62 * fade), DUST, 0.3 * fade);
      }
      cache.set(hex, v);
    }
    return v;
  };
  const g = {
    ctx, fade,
    c: (hex, a = 1) => css(base(hex), a),
    dk: (hex, k = 0.3, a = 1) => css(mix3(base(hex), SHADE, k), a),
    lt: (hex, k = 0.3, a = 1) => css(mix3(base(hex), LIT, k), a),
    mix: (a, b, k, al = 1) => css(mix3(base(a), base(b), k), al),
    // three tones from one colour. o: s, l (crescent sizes), dk, lt (how far the tones go), shade/lit = false to drop one
    f(p, hex, o = {}) {
      form(ctx, p, g.c(hex), {
        ...o,
        shade: o.shade === false ? null : (typeof o.shade === 'string' ? g.c(o.shade) : g.dk(hex, o.dk ?? 0.3)),
        lit: o.lit === false ? null : (typeof o.lit === 'string' ? g.c(o.lit) : g.lt(hex, o.lt ?? 0.3)),
      });
    },
    flat(p, hex, a = 1) { ctx.fillStyle = g.c(hex, a); ctx.fill(p); },
    fill(p, style) { ctx.fillStyle = style; ctx.fill(p); },
    line(p, hex, w = 1.5, a = 1, cap = 'round') {
      ctx.save();
      ctx.strokeStyle = g.c(hex, a); ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = 'round';
      ctx.stroke(p);
      ctx.restore();
    },
    lin(x0, y0, x1, y1, stops) {
      const gr = ctx.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([o, hex, a = 1]) => gr.addColorStop(o, g.c(hex, a)));
      return gr;
    },
    rad(x, y, r0, r1, stops) {
      const gr = ctx.createRadialGradient(x, y, r0, x, y, r1);
      stops.forEach(([o, hex, a = 1]) => gr.addColorStop(o, g.c(hex, a)));
      return gr;
    },
    // a soft pool of light or dark: a ready-made gradient, never a live blur
    glow(x, y, rx, ry, hex, a) {
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, ry / rx);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, css(rgb(hex), a)); gr.addColorStop(0.45, css(rgb(hex), a * 0.5)); gr.addColorStop(1, css(rgb(hex), 0));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
      ctx.restore();
    },
    // where a thing meets the floor or shelf
    shadow(x, y, rx, ry, a = 0.34) {
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, ry / rx);
      const gr = ctx.createRadialGradient(0, 0, rx * 0.35, 0, 0, rx);
      gr.addColorStop(0, `rgba(10,8,44,${a})`); gr.addColorStop(1, 'rgba(10,8,44,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
      ctx.restore();
    },
    // the two crescents alone, see-through, for a form that already has a pattern painted on it
    over(p, { s = 4, l = 1.6, a = 0.26, la = 0.36 } = {}) {
      const hole = (dx, dy) => { const q = new Path2D(); q.rect(-4000, -4000, 8000, 8000); q.addPath(p, new DOMMatrix().translate(dx, dy)); return q; };
      ctx.save(); ctx.clip(p);
      if (s > 0) { ctx.fillStyle = `rgba(26,16,86,${a})`; ctx.fill(hole(-s * 0.75, -s), 'evenodd'); }
      if (l > 0) { ctx.fillStyle = `rgba(255,255,255,${la * (1 - fade * 0.6)})`; ctx.fill(hole(l * 0.8, l), 'evenodd'); }
      ctx.restore();
    },
    clip(p, fn) { ctx.save(); ctx.clip(p); fn(); ctx.restore(); },
    at(x, y, fn, sc = 1, rot = 0) {
      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (sc !== 1) ctx.scale(sc, sc);
      fn();
      ctx.restore();
    },
    // a small bright mark where the light catches
    glint(x, y, rx, ry, rot = -0.6, a = 0.7) { ctx.fillStyle = `rgba(255,255,255,${a * (1 - fade * 0.8)})`; ctx.fill(ell(x, y, rx, ry, rot)); },
  };
  return g;
}

// ---- signs of neglect, drawn only on a fading thing ----
// settled dust along a top edge: pts is a line, left to right
export function dust(g, pts, seed = 1, k = 1) {
  if (k <= 0) return;
  const { ctx } = g;
  let a = seed * 9301 + 49297;
  const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
  ctx.save();
  ctx.globalAlpha = k;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / 4.5));
    const ang = Math.atan2(y1 - y0, x1 - x0);
    for (let j = 0; j <= n; j++) {
      const u = j / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u);
      ctx.fillStyle = `rgba(214,221,250,${0.5 + rnd() * 0.3})`;
      ctx.fill(ell(x, y - 0.4, 3.2 + rnd() * 2.2, 1.1 + rnd() * 0.9, ang));
    }
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = `rgba(232,238,255,${0.35 + rnd() * 0.4})`;
      ctx.fill(circ(lerp(x0, x1, rnd()) + (rnd() - 0.5) * 4, lerp(y0, y1, rnd()) + 2 + rnd() * 7, 0.5 + rnd() * 0.8));
    }
  }
  ctx.restore();
}
// a cobweb in a corner: from (x, y), fanning between two angles
export function cobweb(g, x, y, a0, a1, R, k = 1, spokes = 5, rings = 4) {
  if (k <= 0) return;
  const { ctx } = g;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.strokeStyle = 'rgba(226,232,255,0.62)';
  ctx.lineWidth = 0.75; ctx.lineCap = 'round';
  const ang = i => lerp(a0, a1, i / (spokes - 1));
  const len = i => R * (0.82 + 0.18 * Math.sin(i * 2.3 + 1));
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) { ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang(i)) * len(i), y + Math.sin(ang(i)) * len(i)); }
  for (let r = 1; r <= rings; r++) {
    const u = r / (rings + 0.35);
    for (let i = 0; i < spokes - 1; i++) {
      const p0 = [x + Math.cos(ang(i)) * len(i) * u, y + Math.sin(ang(i)) * len(i) * u];
      const p1 = [x + Math.cos(ang(i + 1)) * len(i + 1) * u, y + Math.sin(ang(i + 1)) * len(i + 1) * u];
      const mid = (ang(i) + ang(i + 1)) / 2, sag = (len(i) + len(i + 1)) / 2 * u * 0.84;
      ctx.moveTo(p0[0], p0[1]);
      ctx.quadraticCurveTo(x + Math.cos(mid) * sag, y + Math.sin(mid) * sag, p1[0], p1[1]);
    }
  }
  ctx.stroke();
  ctx.restore();
}
