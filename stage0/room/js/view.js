// One way of seeing the room, and the few solid shapes every piece of furniture is built from.
//
// A point in a room is (x, z, h): x along the back wall, z out from the back wall toward us, h up from the floor.
// An angle turns that into the picture with two numbers: k, how much of a level surface we see
// (0 is dead level with it), and sx, how far we stand to the right (0 is straight in front).
// Each angle is a parallel view, so every face of a box is a flat parallelogram, and anything drawn
// on a face (a drawer, a pillow's seam) is drawn in that face's own flat coordinates.
//
// One light, top left: tops are lightest, fronts are the base colour, right sides are darkest.

import { poly, rpoly, rr, ell, TAU } from './draw.js';

export const ANGLES = {
  a: { k: 0.13, sx: 0 },        // straight on, a shallow floor
  b: { k: 0.45, sx: 0 },        // a little from above: fronts and tops (the one chosen)
  c: { k: 0.3, sx: 0.34 },      // from above and to the right: fronts, tops and right sides
};

// a gradient from colours already written as css
export function cssGrad(ctx, x0, y0, x1, y1, stops) {
  const gr = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}

// the outline around a set of points
export function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 1e-9) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 1e-9) hi.pop(); hi.push(q); }
  lo.pop(); hi.pop();
  return lo.concat(hi);
}

// yF: where the front edge of the floor is on screen. D: how deep the rooms are.
export function makeView(angle, { yF, D }) {
  const { k, sx } = typeof angle === 'string' ? ANGLES[angle] : angle;
  const yB = yF - D * k;                       // the foot of the back wall
  const P = (x, z, h) => [x - z * sx, yB + z * k - h];
  const hasSide = sx > 0.01;

  // draw in a face's own coordinates. front: (x, -h) at depth z. top: (x, z) at height h. side: (z, -h) at x.
  const onFront = (ctx, z, fn) => { ctx.save(); ctx.transform(1, 0, 0, 1, -z * sx, yB + z * k); fn(); ctx.restore(); };
  const onTop = (ctx, h, fn) => { ctx.save(); ctx.transform(1, 0, -sx, k, 0, yB - h); fn(); ctx.restore(); };
  const onSide = (ctx, x, fn) => { if (!hasSide) return; ctx.save(); ctx.transform(-sx, k, 0, 1, x, yB); fn(); ctx.restore(); };

  const corners = ({ x0, x1, z0, z1, h0, h1 }) => [[x0, z0, h0], [x1, z0, h0], [x1, z1, h0], [x0, z1, h0], [x0, z0, h1], [x1, z0, h1], [x1, z1, h1], [x0, z1, h1]].map(q => P(...q));
  const faces = ({ x0, x1, z0, z1, h0, h1 }) => ({
    top: poly([P(x0, z0, h1), P(x1, z0, h1), P(x1, z1, h1), P(x0, z1, h1)]),
    front: poly([P(x0, z1, h1), P(x1, z1, h1), P(x1, z1, h0), P(x0, z1, h0)]),
    side: hasSide ? poly([P(x1, z1, h1), P(x1, z0, h1), P(x1, z0, h0), P(x1, z1, h0)]) : null,
  });

  // the silhouette of a box, its corners rounded by r
  const outline = (b, r = 0) => { const h = hull(corners(b)); return r > 0 ? rpoly(h, r) : poly(h); };

  // A solid box. col: its base colour. o: r (corner rounding), lt / dk (how far top and side go),
  // front / top / side (functions that draw details on that face), hl (the lit edge, 0 for none),
  // wall (cast a soft shadow on the back wall behind it), grad (a soft fall of light down the front).
  function box(g, b, col, o = {}) {
    const { ctx } = g, f = faces(b), sil = outline(b, o.r || 0);
    if (o.wall) wallShadow(g, sil, o.wall);
    ctx.save();
    const [, yTop] = P(b.x0, b.z1, b.h1), [, yBot] = P(b.x0, b.z1, b.h0);
    ctx.fillStyle = g.c(col);
    ctx.fill(sil);
    if (o.grad !== false) { ctx.fillStyle = cssGrad(ctx, 0, yTop, 0, yBot, [[0, 'rgba(255,255,255,0.05)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(26,16,86,0.13)']]); ctx.fill(sil); }
    ctx.clip(sil);
    if (k > 0.02) g.fill(f.top, o.topCol ? g.c(o.topCol) : g.lt(col, o.lt ?? 0.26));
    if (f.side) g.fill(f.side, o.sideCol ? g.c(o.sideCol) : g.dk(col, o.dk ?? 0.3));
    // a rounded box turns away from the light down its right edge, and toward it down its left
    if (o.r && !hasSide) {
      const [xr] = P(b.x1, b.z1, b.h0), [xl] = P(b.x0, b.z1, b.h0), w = Math.min(o.r * 0.7, (b.x1 - b.x0) * 0.2);
      ctx.fillStyle = cssGrad(ctx, xr - w, 0, xr, 0, [[0, 'rgba(26,16,86,0)'], [1, 'rgba(26,16,86,0.24)']]);
      ctx.fillRect(xr - w, yTop - 400, w, 800);
      const wl = Math.min(o.r * 0.45, (b.x1 - b.x0) * 0.12);
      ctx.fillStyle = cssGrad(ctx, xl, 0, xl + wl, 0, [[0, `rgba(255,255,255,${0.16 * (1 - g.fade * 0.6)})`], [1, 'rgba(255,255,255,0)']]);
      ctx.fillRect(xl, yTop, wl, yBot - yTop);
    }
    if (o.top) { ctx.save(); ctx.clip(f.top); onTop(ctx, b.h1, () => o.top(g)); ctx.restore(); }
    if (o.side && f.side) { ctx.save(); ctx.clip(f.side); onSide(ctx, b.x1, () => o.side(g)); ctx.restore(); }
    if (o.front) { ctx.save(); ctx.clip(f.front); onFront(ctx, b.z1, () => o.front(g)); ctx.restore(); }
    // where the light catches: the front edge of the top, brightest at its left end
    const hl = o.hl ?? 1;
    if (hl > 0 && k > 0.02) {
      const [ax, ay] = P(b.x0, b.z1, b.h1), [bx] = P(b.x1, b.z1, b.h1);
      ctx.fillStyle = g.lin(ax, 0, bx, 0, [[0, '#ffffff', 0.55 * hl * (1 - g.fade * 0.6)], [0.45, '#ffffff', 0.18 * hl * (1 - g.fade * 0.6)], [1, '#ffffff', 0]]);
      ctx.fillRect(ax, ay - 0.6, bx - ax, 1.3);
    }
    ctx.restore();
    return sil;
  }

  // An upright cylinder (or a cone, if r1 differs from r0). The body is lit on its left.
  function cyl(g, { x, z, r0, r1 = r0, h0, h1, rz = 1 }, col, o = {}) {
    const { ctx } = g, N = 44;
    const ring = (r, h) => Array.from({ length: N }, (_, i) => { const a = (i / N) * TAU; return P(x + Math.cos(a) * r, z + Math.sin(a) * r * rz, h); });
    const bot = ring(r0, h0), top = ring(r1, h1);
    const sil = poly(hull(bot.concat(top)));
    const [cx] = P(x, z, h1), ex = Math.max(r0, r1) * Math.hypot(1, sx);
    if (o.wall) wallShadow(g, sil, o.wall);
    ctx.save();
    ctx.fillStyle = cssGrad(ctx, cx - ex, 0, cx + ex, 0, [[0, g.lt(col, 0.22)], [0.3, g.c(col)], [0.72, g.c(col)], [1, g.dk(col, 0.32)]]);
    ctx.fill(sil);
    ctx.clip(sil);
    if (o.bands) o.bands(g);
    const tp = poly(top);
    if (o.top !== false && k > 0.02) g.fill(tp, o.topCol ? g.c(o.topCol) : g.lt(col, o.lt ?? 0.26));
    if (o.inner && k > 0.02) { ctx.save(); ctx.clip(tp); onTop(ctx, h1, () => o.inner(g)); ctx.restore(); }
    ctx.restore();
    return sil;
  }

  // a soft shadow lying on the floor (or any level surface at h), stretched with the view
  function shadow(g, x, z, rx, rz, a = 0.32, h = 0) {
    onTop(g.ctx, h, () => g.shadow(x, z, rx, rz, a));
  }
  // a thing standing against the back wall throws a soft shadow down and to the right on it
  function wallShadow(g, p, a = 1) {
    const { ctx } = g;
    ctx.save();
    for (const [dx, dy, al] of [[2.4, 1.6, 0.16], [5, 3.4, 0.1], [8, 5.4, 0.05]]) {
      ctx.save(); ctx.translate(dx, dy); ctx.fillStyle = `rgba(8,6,40,${al * a})`; ctx.fill(p); ctx.restore();
    }
    ctx.restore();
  }

  return { k, sx, yB, yF, D, P, hasSide, onFront, onTop, onSide, faces, outline, box, cyl, shadow, wallShadow };
}

// a flat shape lying on a level surface: path drawn in (x, z)
export const floorPath = { rr: (x, z, w, d, r) => rr(x, z, w, d, r), ell: (x, z, rx, rz) => ell(x, z, rx, rz) };
