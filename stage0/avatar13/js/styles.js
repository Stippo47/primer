// Round 13, part 2: the round 4 gecko in ten stylised directions. Not more realistic than round 4: the same pose
// (standing square on, arms out and down, the tail curled up behind on the right), the same idea (a broad head, a
// belly, a spotted spiral tail) and about the same number of shapes. What changes is the style's voice: its shape
// language, its palette and its finish. Every one has a calm, curious face: no grin, the lids a little lowered,
// the eyes on something.
//
// Each direction: { id, name, line, label, bg(ctx, W, H, fy), draw(g, env), finish?(ctx, W, H) }
//   bg draws the backdrop in CSS pixels (W by H, the floor starting at fy)
//   draw draws the gecko in round 4's units, from its feet at (0, 0); env = { W, H, fy, px } where px is the
//     transform for drawing in CSS pixels again (for directions that print the backdrop and gecko together)
//   finish, if any, runs over the whole picture last (paper grain)

import { rr, pill, circ, ell, rpoly, poly, pd, union, tube, limb, trail, segment, leaf, ngon, blob, smooth, shadowed, rng, PI } from '../../avatar10/js/kit.js';
import { SK, spiral, tailOutline, layer, lay, printInk, wear, paper, cutPoly, ringPts, facets } from './base.js';

// a rounded box as points (for cut and faceted shapes): n points per corner
function boxPts(x, y, w, h, r, n = 4) {
  const out = [], cs = [[x + w - r, y + r, -PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, PI / 2], [x + r, y + r, PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * PI / 2; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}
// fill the room in two flat colours with the floor from fy
function flatRoom(ctx, W, H, fy, wall, floor) {
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = floor; ctx.fillRect(0, fy, W, H - fy);
}

// =====================================================================================================
// 1. GEOMETRIC GLOW. Kurzgesagt-like: built only from circles, half circles, straight-sided boxes and a tail of
// three half rings, each smaller than the last. A small lamp of light hangs in the dark to the upper left and
// glows in stepped rings; the gecko is lit by it: broad hue-shifted shadow planes on the far side, a thin warm rim
// on the near. Saturated teal, violet shadows, a yellow belly, magenta spots. It's looking at the light.
const geometric = {
  id: 'geometric', name: 'Geometric glow',
  line: 'Circles, half circles and boxes; a small lamp glowing in the dark; teal with violet shadows and a warm rim.',
  label: 'rgba(225,215,255,0.8)',
  bg(ctx, W, H, fy) {
    flatRoom(ctx, W, H, fy, '#1b1446', '#140f36');
    const gx = 86, gy = 92;
    for (const [r, col] of [[150, '#1f1752'], [104, '#251b5e'], [70, '#2e2170'], [44, '#3c2b86'], [26, '#5b42a4']]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(gx, gy, r, 0, PI * 2); ctx.fill();
    }
    // the floor cuts the rings off where it starts
    ctx.fillStyle = '#140f36'; ctx.fillRect(0, fy, W, H - fy);
    ctx.fillStyle = '#21185a'; ctx.fillRect(0, fy, W, 5);
    ctx.fillStyle = '#ffd98c'; ctx.beginPath(); ctx.arc(gx, gy, 11, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(gx - 2, gy - 2, 6, 0, PI * 2); ctx.fill();
  },
  draw(g) {
    const c = g.ctx;
    const C = '#22c3ad', CD = '#2c4fa6', RIM = '#ffe6a6', BE = '#ffcc58', BED = '#f2763c', MK = '#ff4d98', HD = '#5fe0c6';
    const form = (p, base, dark, w, rim = true) => {
      c.fillStyle = base; c.fill(p);
      if (dark) g.plane(p, dark, w * 0.22, w * 0.07);
      if (rim) g.rimOn(p, RIM, 1.3);
    };
    c.fillStyle = 'rgba(8,5,30,0.55)'; c.fill(ell(4, 1, 42, 4.2));
    // feet: half discs, flat side down
    for (const k of [-1, 1]) { c.fillStyle = CD; c.fill(segment(k * 13, 0, 8.5, 0, false)); }
    // the tail: three half rings, each smaller and thinner, ending in a disc
    const at = spiral({ R0: 30, shrink: 19, r0: 8.4, rTip: 3.2, sweep: 340 });
    const tail = trail(Array.from({ length: 41 }, (_, i) => at(i / 40)));
    form(tail, C, CD, 24);
    g.clip(tail, () => { for (const t of [0.15, 0.35, 0.55, 0.75]) { const [x, y, r] = at(t); c.fillStyle = MK; c.fill(circ(x, y, r * 0.4)); } });
    // legs: straight boxes
    for (const k of [-1, 1]) form(rr(k * 11 - 4, -34, 8, 32, 1.5), C, CD, 9);
    // body: a box narrowing to the shoulders
    const body = rpoly([[-14, -100], [14, -100], [24, -26], [-24, -26]], 3);
    form(body, C, CD, 46);
    g.clip(body, () => { c.fillStyle = BE; c.fill(rr(-9, -92, 18, 60, 9)); g.plane(rr(-9, -92, 18, 60, 9), BED, 4, 1.4); });
    // arms: straight bars, hands: discs
    for (const k of [-1, 1]) {
      form(tube(k * 15, -88, k * 28, -66, 3.6), C, CD, 9);
      form(circ(k * 29.5, -62, 5.4), HD, C, 10, false);
    }
    // head: a box with fully round upper corners, two discs on top for the eyes
    // head: a box with fully round upper corners and squarer jaw corners
    const head = rr(-43, -144, 86, 50, [24, 24, 10, 10]);
    c.fillStyle = C; c.fill(head); g.plane(head, CD, 11, 4); g.rimOn(head, RIM, 1.3);
    for (const [x, y, r] of [[-7, -137, 2.2], [0, -139.5, 2.2], [7, -137, 2.2]]) { c.fillStyle = MK; c.fill(circ(x, y, r)); }
    for (const k of [-1, 1]) {
      const ex = k * 19, ey = -124, r = 8.4, eye = circ(ex, ey, r);
      c.fillStyle = '#f6f2ff'; c.fill(eye);
      g.clip(eye, () => {
        c.fillStyle = '#1a1240'; c.fill(circ(ex - 1.6, ey - 1, 3.8));
        c.fillStyle = C; c.fill(segment(ex, ey, r + 1, ey - r + r * 0.24, false));
      });
    }
    for (const k of [-1, 1]) { c.fillStyle = CD; c.fill(circ(k * 5, -105, 1.3)); }
  },
};

// =====================================================================================================
// 2. GRAPHIC POSTER. Three flat colours and nothing else: mustard, cream and a deep bottle green. No outlines, no
// shading. The gecko is one solid green silhouette; every detail inside it is cut through to the colours behind
// (cream eyes, mustard spots, a mustard belly line). A cream disc behind the head, like a poster's sun.
const poster = {
  id: 'poster', name: 'Graphic poster',
  line: 'Three flat colours, one solid silhouette, details cut through to the colours behind; no lines, no shading.',
  label: 'rgba(23,58,53,0.85)',
  bg(ctx, W, H, fy) {
    flatRoom(ctx, W, H, fy, '#e6a63a', '#f2e6cc');
    ctx.fillStyle = '#f2e6cc'; ctx.beginPath(); ctx.arc(207, 128, 96, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#e6a63a'; ctx.fillRect(0, fy, W, 6);
  },
  draw(g) {
    const c = g.ctx, D = '#183a35', M = '#e6a63a', CR = '#f2e6cc';
    c.fillStyle = M; c.fill(ell(6, 1, 46, 4.5));
    const at = spiral({ R0: 32, shrink: 22, r0: 10, rTip: 3, sweep: 345 });
    const sil = union(
      pill(-13, -3.6, 24, 8), pill(13, -3.6, 24, 8),
      tube(-10, -32, -12, -8, 5.4), tube(10, -32, 12, -8, 5.4),
      trail(Array.from({ length: 33 }, (_, i) => at(i / 32))),
      rpoly([[-17, -100], [17, -100], [23, -26], [-23, -26]], 13),
      tube(-15, -88, -29, -64, 4.8), tube(15, -88, 29, -64, 4.8), circ(-30, -61, 6.4), circ(30, -61, 6.4),
      rr(-44, -144, 88, 52, 24),
    );
    c.fillStyle = D; c.fill(sil);
    // cut-throughs: belly line, spots, eyes
    c.fillStyle = M; c.fill(pill(0, -60, 5, 50));
    g.clip(sil, () => { for (const t of [0.16, 0.34, 0.52, 0.7]) { const [x, y, r] = at(t); c.fillStyle = M; c.fill(circ(x, y, r * 0.42)); } });
    for (const [x, y] of [[-6, -138], [0, -140.5], [6, -138]]) { c.fillStyle = M; c.fill(circ(x, y, 2.1)); }
    for (const k of [-1, 1]) {
      const ex = k * 18, ey = -123, r = 9, eye = circ(ex, ey, r);
      c.fillStyle = CR; c.fill(eye);
      g.clip(eye, () => {
        c.fillStyle = D; c.fill(circ(ex + 1.2, ey - 0.6, 4));
        c.fillStyle = D; c.fill(segment(ex, ey, r + 1, ey - r + r * 0.24, false));
      });
    }
  },
};

// =====================================================================================================
// 3. PAPERCUT. Layered cut paper: every shape a separate sheet with slightly uneven scissor-cut edges and a soft
// shadow under it, so the gecko stands a few millimetres proud of the page. Muted papers: sage, a darker green for
// the far side, cream, terracotta stripes, on a kraft wall with a pale blue hill and a cream floor. Paper grain.
const papercut = {
  id: 'papercut', name: 'Papercut',
  line: 'Layered cut-paper sheets with uneven scissor edges and soft shadows; sage, cream and terracotta on kraft.',
  label: 'rgba(70,45,20,0.8)',
  bg(ctx, W, H, fy) {
    flatRoom(ctx, W, H, fy, '#d3b289', '#efe2c8');
    const sh = (fn) => shadowed(ctx, fn, 5, 0, 2.5, 'rgba(70,40,10,0.35)');
    sh(() => { ctx.fillStyle = '#aebfca'; ctx.fill(blob([[-30, fy + 10], [-20, 210], [90, 172], [210, 196], [320, 160], [440, 200], [450, fy + 10]].map(([x, y]) => [x, y, 1]))); });
    sh(() => { ctx.fillStyle = '#efe2c8'; ctx.fill(poly(cutPoly([[-10, fy + 2], [120, fy - 2], [260, fy + 3], [430, fy - 1], [430, H + 10], [-10, H + 10]], 9, 1.2))); });
  },
  draw(g) {
    const c = g.ctx, C = '#7aa78b', CD = '#4f7d6b', BE = '#f4e9d2', MK = '#d6744a', EY = '#fbf6ea', PU = '#28362f';
    let seed = 1;
    const sheet = (pts, col, j = 0.6, round = 1.4) => {
      const p = round ? rpoly(cutPoly(pts, seed++, j), round) : poly(cutPoly(pts, seed++, j));
      shadowed(c, () => { c.fillStyle = col; c.fill(p); }, 2.6, 0.7, 1.6, 'rgba(60,35,10,0.4)');
      return p;
    };
    c.fillStyle = 'rgba(90,60,30,0.22)'; c.fill(ell(4, 1, 40, 4));
    // the far side first, in the darker green: a second sheet peeking out behind the body and head
    for (const k of [-1, 1]) sheet(ringPts(k * 13, -4, 11, 4.6, 12), CD);
    const at = spiral({ R0: 31, shrink: 21, r0: 9.4, rTip: 3 });
    const tail = sheet(tailOutline(at, 26), C, 0.5);
    g.clip(tail, () => {
      for (const t of [0.14, 0.32, 0.5, 0.68]) {
        const [x, y, r] = at(t), [x2, y2] = at(t + 0.01), a = Math.atan2(y2 - y, x2 - x);
        c.save(); c.translate(x, y); c.rotate(a);
        shadowed(c, () => { c.fillStyle = MK; c.fillRect(-2, -r - 2, 4, r * 2 + 4); }, 1.6, 0.4, 1, 'rgba(60,35,10,0.35)');
        c.restore();
      }
    });
    for (const k of [-1, 1]) sheet([[k * 10 - 5, -33], [k * 10 + 5, -33], [k * 12 + 5, -8], [k * 12 - 5, -8]], C);
    sheet([[-20, -97], [-16, -100], [16, -100], [20, -97], [25, -32], [21, -26], [-21, -26], [-25, -32]], CD, 0.4);
    sheet([[-18, -99], [-14, -102], [13, -102], [17, -99], [22, -32], [18, -27], [-20, -27], [-23, -32]], C, 0.4);
    sheet([[-8, -88], [8, -88], [11, -58], [8, -36], [-8, -36], [-11, -58]], BE, 0.5);
    for (const k of [-1, 1]) {
      sheet([[k * 13, -91], [k * 19, -86], [k * 32, -66], [k * 26, -61]], C);
      sheet(ringPts(k * 30, -61, 6.2, 6.2, 10, 0.3), C);
    }
    sheet(boxPts(-40, -143, 82, 52, 22, 3).map(([x, y]) => [x + 2.5, y + 2]), CD, 0.6);
    sheet(boxPts(-42, -144, 84, 52, 22, 3), C, 0.6);
    for (const [x, y] of [[-7, -136], [0, -138.5], [7, -136]]) sheet(ringPts(x, y, 2.3, 2.3, 7), MK, 0.15, 0);
    for (const k of [-1, 1]) {
      const ex = k * 15, ey = -122;
      sheet(ringPts(ex, ey, 9, 9.6, 16), EY, 0.4);
      sheet(ringPts(ex - 1.4, ey - 1.2, 4, 4.3, 10), PU, 0.25, 0);
      // the lid: its own sheet of the body's paper, cut straight along the bottom
      const lid = [];
      for (let i = 0; i <= 8; i++) { const a = PI + (i / 8) * PI; lid.push([ex + Math.cos(a) * 10.2, ey + Math.sin(a) * 10.6]); }
      lid.push([ex + 10.2, ey - 7.8]); lid.push([ex - 10.2, ey - 7.4]);
      sheet(lid, C, 0.25, 0);
    }
    for (const k of [-1, 1]) { c.fillStyle = CD; c.fill(circ(k * 4.5, -101, 1.2)); }
  },
  finish(ctx, W, H) { paper(ctx, W, H, { seed: 21, light: 0.035, dark: 0.06 }); },
};

// =====================================================================================================
// 4. MID-CENTURY. The angular, textured flat shapes of 1950s print: a six-sided head with almond eyes at its upper
// corners, a lozenge of a body, stick arms and legs with fine charcoal fingers and toes, a tail of straight runs.
// Dry-brush texture in every colour, the belly printed a touch out of register. Teal, mustard, burnt orange and
// charcoal on cream, with an olive boomerang and a small atomic star on the wall.
const midcentury = {
  id: 'midcentury', name: 'Mid-century',
  line: 'Angular 1950s print shapes, almond eyes, fine charcoal toes, dry-brush texture; teal, mustard, burnt orange.',
  label: 'rgba(43,40,36,0.8)',
  bg(ctx, W, H, fy) {
    flatRoom(ctx, W, H, fy, '#efe1c2', '#e2cc9e');
    const l = layer(ctx);
    l.fillStyle = '#9a9550'; l.fill(blob([[312, 118, 0.5], [326, 70], [356, 46], [392, 40, 0.5], [362, 62], [346, 96]]));
    l.fillStyle = '#d8a23f'; l.fill(rpoly([[-20, fy], [430, fy], [430, fy + 16], [-20, fy + 16]], 0));
    wear(l, { seed: 4, amount: 0.07, streak: 0.35 });
    lay(ctx, l);
    // the atomic star: thin charcoal spokes with dots
    ctx.strokeStyle = '#2b2824'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    const sx = 74, sy = 84;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + 0.2, L = i % 2 ? 16 : 26;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L); ctx.stroke();
      ctx.fillStyle = '#c45c35'; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * L, sy + Math.sin(a) * L, i % 2 ? 2 : 3, 0, PI * 2); ctx.fill();
    }
  },
  draw(g) {
    const c = g.ctx, T = '#3e7f78', M = '#d8a23f', O = '#c45c35', K = '#2b2824', CR = '#f6ead0';
    const L = layer(c), pg = { ...g, ctx: L };
    const fill = (p, col, ctx = L) => { ctx.fillStyle = col; ctx.fill(p); };
    const strokes = (segs, w = 1.3) => { L.strokeStyle = K; L.lineWidth = w; L.lineCap = 'round'; for (const [a, b, x, y] of segs) { L.beginPath(); L.moveTo(a, b); L.lineTo(x, y); L.stroke(); } };
    fill(ell(2, 1, 36, 3.2), 'rgba(43,40,36,0.25)');
    // toes: three fine lines fanned out from each foot
    for (const k of [-1, 1]) {
      const x = k * 13;
      strokes([[x, -4, x + k * 9, -1], [x, -4, x + k * 4, 1.5], [x, -4, x - k * 2, 1.5]]);
      fill(tube(k * 9, -30, x, -4, 2.4), T);
    }
    // the tail: a spiral of straight runs (few points, sharp corners)
    const at = spiral({ R0: 31, shrink: 20, r0: 8.6, rTip: 2.4, sweep: 320 });
    const tail = rpoly(tailOutline(at, 9, false), 1);
    fill(tail, T);
    pg.clip(tail, () => { for (const t of [0.2, 0.42, 0.64]) { const [x, y, r] = at(t); L.save(); L.translate(x, y); L.rotate(Math.atan2(at(t + 0.01)[1] - y, at(t + 0.01)[0] - x)); fill(rr(-1.8, -r - 2, 3.6, r * 2 + 4, 0), O); L.restore(); } });
    // the body: a lozenge, wider at the hips
    fill(rpoly([[-11, -101], [11, -101], [22, -44], [14, -25], [-14, -25], [-22, -44]], 2), T);
    // arms: sticks; hands: three fine fingers
    for (const k of [-1, 1]) {
      fill(tube(k * 11, -92, k * 27, -66, 2.4), T);
      const hx = k * 28, hy = -64;
      strokes([[hx, hy, hx + k * 6, hy + 5], [hx, hy, hx + k * 1.5, hy + 7.5], [hx, hy, hx - k * 3, hy + 6.5]]);
    }
    // the head: six-sided, widest at the eyes
    const head = rpoly([[-28, -147], [28, -147], [46, -126], [34, -100], [-34, -100], [-46, -126]], 2.5);
    fill(head, T);
    fill(rpoly([[-3.5, -142], [3.5, -142], [0, -134]], 0.5), O);
    for (const k of [-1, 1]) {
      const ex = k * 25, ey = -127, eye = leaf(ex - 10, ey + 1, ex + 10, ey - 1, 0.52);
      fill(eye, CR);
      pg.clip(eye, () => {
        fill(circ(ex - 1.2, ey - 0.6, 3.1), K);
        fill(rr(ex - 12, ey - 14, 24, 9.6, 0), T);
      });
      strokes([[ex - 8, ey - 4.2, ex + 8, ey - 4.6]], 1.2);
    }
    strokes([[-5, -108, -3, -108], [3, -108, 5, -108]], 1.4);
    wear(L, { seed: 8, amount: 0.06, streak: 0.35 });
    lay(c, L);
    // the belly, printed a little out of register over the body
    const B = layer(c);
    B.translate(1.6, 1.2);
    B.fillStyle = M; B.fill(rpoly([[-6.5, -92], [6.5, -92], [13, -48], [8, -33], [-8, -33], [-13, -48]], 2));
    wear(B, { seed: 9, amount: 0.07, streak: 0.35 });
    lay(c, B);
  },
};

// =====================================================================================================
// 5. CHUNKY. Duolingo's heft without its grin: a big head on a stout body, thick limbs, feet as separate pills,
// big white eyes close together. Flat bright colour, detail only as a darker tint of the same green (brows, spots,
// lid line), no shading. The face is calm: lids half way, one brow lifted a touch, a small closed mouth.
const chunky = {
  id: 'chunky', name: 'Chunky',
  line: 'Big heavy rounded blocks, feet apart from the legs, big eyes close together; flat colour, a calm lifted brow.',
  label: 'rgba(40,70,90,0.75)',
  bg(ctx, W, H, fy) { flatRoom(ctx, W, H, fy, '#dcebf1', '#c6dce6'); },
  draw(g) {
    const c = g.ctx, C = '#6fbe45', CD = '#559f2f', BE = '#e6f4b0', FT = '#4e9229', K = '#26331f';
    const f = (p, col) => { c.fillStyle = col; c.fill(p); };
    f(pill(2, 1, 84, 9), '#a9c8d4');
    for (const k of [-1, 1]) f(pill(k * 14, -4.5, 25, 10), FT);
    const at = spiral({ R0: 28, shrink: 16, r0: 12, rTip: 6, sweep: 300, cx: 44, cy: -46 });
    const tail = trail(Array.from({ length: 29 }, (_, i) => at(i / 28)));
    f(tail, C);
    g.clip(tail, () => { for (const t of [0.25, 0.55, 0.85]) { const [x, y, r] = at(t); f(circ(x, y, r * 0.38), CD); } });
    for (const k of [-1, 1]) f(tube(k * 11, -32, k * 12, -14, 7), C);
    const body = rr(-27, -96, 54, 72, 24);
    f(body, C);
    g.clip(body, () => f(pill(0, -56, 30, 50), BE));
    for (const k of [-1, 1]) { f(tube(k * 22, -84, k * 33, -64, 6.6), C); f(circ(k * 34, -60, 8), C); }
    const head = rr(-49, -152, 98, 62, 28);
    f(head, C);
    for (const [x, y, r] of [[-30, -138, 3.2], [-36, -128, 2.4], [32, -140, 2.8]]) f(circ(x, y, r), CD);
    for (const k of [-1, 1]) {
      const ex = k * 12.5, ey = -122, w = 22, h = 25, eye = rr(ex - w / 2, ey - h / 2, w, h, 10);
      f(eye, '#ffffff');
      g.clip(eye, () => {
        f(pill(ex + 1.4, ey - 0.4, 9.5, 13.5), K);
        f(circ(ex, ey - 3.8, 2.2), "#ffffff");
      });
      // the lid: the eye's own top in the head's colour, laid outside the eye's clip so no light seam shows round it
      const lid = ey - h / 2 + h * 0.13;
      g.clip(rr(ex - w, ey - h, w * 2, lid - (ey - h), 0), () => f(rr(ex - w / 2 - 0.6, ey - h / 2 - 0.6, w + 1.2, h + 1.2, 10.6), C));
      g.clip(eye, () => g.line(pd(`M${ex - w / 2} ${lid} L${ex + w / 2} ${lid}`), CD, 2));
      // brows: short thick beans well above the eyes, our right one lifted a little: interested, not cross
      const by = k < 0 ? -143 : -146, tilt = k < 0 ? 0 : 0.5;
      f(rpoly([[ex - 7, by + tilt], [ex + 7, by - tilt], [ex + 7, by + 3.4 - tilt], [ex - 7, by + 3.4 + tilt]], 1.7), CD);
    }
    f(pill(4, -101, 6, 3.2), '#3e7a21');
  },
};

// =====================================================================================================
// 6. MONOLINE. One even line weight round every shape, in ink, and flat pale fills laid slightly off the lines,
// like a print where the colour plate slipped. No shading. Sage, peach and coral on warm paper. The eyes are line
// circles with a dot and a straight lid line.
const monoline = {
  id: 'monoline', name: 'Monoline',
  line: 'One even ink line round every shape, pale flat fills laid a little off the lines; sage, peach, coral.',
  label: 'rgba(36,39,59,0.8)',
  bg(ctx, W, H, fy) {
    flatRoom(ctx, W, H, fy, '#f4eee2', '#ece3d2');
    ctx.strokeStyle = '#24273b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
    for (const [x, y, w] of [[40, 330, 30], [300, 318, 46], [150, 378, 22], [360, 370, 26]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
  },
  draw(g) {
    const c = g.ctx, INK = '#24273b', LW = 2.1, OFF = [-2.6, 1.8];
    const SAGE = '#a3cfb0', PEACH = '#f5c592', CORAL = '#ec8b6b', WHITE = '#fffdf8';
    const F = layer(c), Ln = layer(c);
    const moved = p => { const q = new Path2D(); q.addPath(p, new DOMMatrix().translate(...OFF)); return q; };
    // a part: its fill, slipped; its line, which also hides the lines of parts behind it
    const part = (p, fill, line = true) => {
      if (fill) { F.fillStyle = fill; F.fill(moved(p)); }
      if (!line) return;
      Ln.save(); Ln.globalCompositeOperation = 'destination-out'; Ln.fillStyle = '#000'; Ln.fill(p); Ln.restore();
      Ln.strokeStyle = INK; Ln.lineWidth = LW; Ln.lineJoin = 'round'; Ln.lineCap = 'round'; Ln.stroke(p);
    };
    const dot = (x, y, r) => { Ln.fillStyle = INK; Ln.fill(circ(x, y, r)); };
    for (const k of [-1, 1]) part(pill(k * 13, -3.6, 21, 7.4), SAGE);
    const at = spiral({ R0: 30, shrink: 20, r0: 8.6, rTip: 2.8 });
    const tail = rpoly(tailOutline(at, 44), 0.1);
    part(tail, SAGE);
    for (const t of [0.2, 0.42, 0.62]) { const [x, y, r] = at(t); part(circ(x, y, r * 0.42), CORAL); }
    for (const k of [-1, 1]) part(tube(k * 10, -32, k * 12, -9, 4.6), SAGE);
    const body = rpoly([[-18, -98], [18, -98], [22, -26], [-22, -26]], 14);
    part(body, SAGE);
    part(pill(-1, -60, 20, 50), PEACH);
    for (const k of [-1, 1]) { part(tube(k * 16, -86, k * 28, -64, 4.2), SAGE); part(circ(k * 29, -61, 5.6), SAGE); }
    const head = rr(-41, -144, 82, 52, 24);
    part(head, SAGE);
    for (const [x, y] of [[-7, -136], [0, -138.5], [7, -136]]) part(circ(x, y, 1.9), CORAL);
    for (const k of [-1, 1]) {
      const ex = k * 13.5, ey = -122, r = 7.6;
      part(circ(ex, ey, r), WHITE);
      // the pupil, then the part above the lid line cleared of it, so the lid sits over the pupil
      Ln.save(); Ln.clip(circ(ex, ey, r));
      dot(ex - 1.3, ey - 0.6, 3);
      Ln.globalCompositeOperation = 'destination-out'; Ln.fill(rr(ex - r, ey - r - 1, r * 2, r * 0.3 + 1, 0));
      Ln.restore();
      Ln.strokeStyle = INK; Ln.lineWidth = LW; Ln.lineCap = 'round';
      Ln.stroke(circ(ex, ey, r));
      Ln.beginPath(); Ln.moveTo(ex - r * 0.66, ey - r * 0.7); Ln.lineTo(ex + r * 0.66, ey - r * 0.7); Ln.stroke();
    }
    dot(-4.5, -104, 1.2); dot(4.5, -104, 1.2);
    lay(c, F); lay(c, Ln);
  },
};

// =====================================================================================================
// 7. FACETED. Flat low-poly: every form cut into flat triangles, each shaded by which way it faces, lighter toward
// the light on the upper left. Emerald greens and amber, coral marks, on a faceted slate-blue wall. Six-sided amber
// eyes with a dark diamond pupil and a flat lid.
const faceted = {
  id: 'faceted', name: 'Faceted',
  line: 'Flat low-poly: every form cut into triangles shaded by the way they face; emerald and amber on slate.',
  label: 'rgba(210,225,240,0.8)',
  bg(ctx, W, H, fy) {
    const r = rng(17), step = 70;
    const pts = [];
    for (let j = -1; j <= Math.ceil(fy / step) + 1; j++) {
      const row = [];
      for (let i = -1; i <= Math.ceil(W / step) + 1; i++) row.push([i * step + (j % 2 ? step / 2 : 0) + (r() - 0.5) * 30, j * step * 0.8 + (r() - 0.5) * 24]);
      pts.push(row);
    }
    const tones = ['#1b293c', '#1f2f45', '#23364e', '#273b55'];
    for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < pts[j].length - 1; i++) {
      const a = pts[j][i], b = pts[j][i + 1], cc = pts[j + 1][i], d = pts[j + 1][i + 1];
      for (const t of [[a, b, cc], [b, d, cc]]) { ctx.fillStyle = tones[Math.floor(r() * tones.length)]; const p = poly(t); ctx.fill(p); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.5; ctx.stroke(p); }
    }
    const ft = ['#2f4458', '#34495e', '#3a5066'];
    for (let i = -1; i < W / 60 + 1; i++) {
      const x = i * 60;
      ctx.fillStyle = ft[(i + 3) % 3]; ctx.fill(poly([[x, fy], [x + 60, fy], [x + 30 + 40, H], [x - 10, H]]));
      ctx.fillStyle = ft[(i + 4) % 3]; ctx.fill(poly([[x + 60, fy], [x + 30 + 40, H], [x + 120, H]]));
    }
    ctx.fillStyle = '#41586f'; ctx.fillRect(0, fy, W, 3);
  },
  draw(g) {
    const c = g.ctx;
    const G = ['#12584c', '#1a7660', '#259573', '#38b184', '#5bcb9b'], A = ['#b5742a', '#d6973a', '#efb853', '#f9d37a'], CO = '#e56a50';
    c.fillStyle = 'rgba(5,10,20,0.4)'; c.fill(poly([[-34, 2], [0, -2], [40, 1], [10, 4]]));
    for (const k of [-1, 1]) facets(g, [[k * 4, -1], [k * 13, -7], [k * 23, -1]], [k * 13, -2.5], G.slice(0, 3), { seed: 3 + k });
    const at = spiral({ R0: 31, shrink: 21, r0: 9, rTip: 2.6, sweep: 345 });
    // the tail: a strip of four-sided pieces, each cut in two, shaded by which way each half faces
    const n = 14;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, e = t => { const [x, y, r] = at(t), [x2, y2] = at(Math.min(1, t + 0.003)), [x1, y1] = at(Math.max(0, t - 0.003)), a = Math.atan2(y2 - y1, x2 - x1); return [[x - Math.sin(a) * r, y + Math.cos(a) * r], [x + Math.sin(a) * r, y - Math.cos(a) * r], a]; };
      const [o0, i0, a0] = e(t0), [o1, i1] = e(t1);
      // outer normal of this piece: lit if it faces up-left
      const nx = -Math.sin(a0), ny = Math.cos(a0), lit = nx * -0.62 + ny * -0.78;
      const k1 = Math.max(0, Math.min(4, Math.round(2 + lit * 1.6))), k2 = Math.max(0, Math.min(4, Math.round(2 - lit * 1.2)));
      for (const [tri, col] of [[[o0, o1, i1], G[k1]], [[o0, i1, i0], G[k2]]]) { c.fillStyle = col; const p = poly(tri); c.fill(p); c.strokeStyle = col; c.lineWidth = 0.35; c.stroke(p); }
      if (i % 4 === 1) { const m = at((t0 + t1) / 2); c.fillStyle = CO; c.fill(ngon(m[0], m[1], m[2] * 0.42, 4, 0)); }
    }
    { const [x, y, r] = at(1); c.fillStyle = G[2]; c.fill(ngon(x, y, r, 4, 0.4)); }
    for (const k of [-1, 1]) facets(g, [[k * 6, -33], [k * 14, -33], [k * 16, -8], [k * 8, -8]], [k * 11, -20], G.slice(1), { seed: 5 + k });
    facets(g, [[-16, -99], [0, -101], [16, -99], [21, -62], [22, -28], [0, -24], [-22, -28], [-21, -62]], [0, -62], G, { split: 1, seed: 7 });
    facets(g, [[-9, -90], [9, -90], [11, -58], [8, -35], [-8, -35], [-11, -58]], [0, -60], A, { seed: 8 });
    for (const k of [-1, 1]) {
      facets(g, [[k * 13, -92], [k * 19, -84], [k * 31, -66], [k * 25, -62]], [k * 22, -76], G.slice(1), { seed: 9 + k });
      facets(g, ringPts(k * 29, -61, 6.4, 6.4, 6, 0.3), [k * 29, -61], G.slice(1), { seed: 11 + k });
    }
    facets(g, [[-30, -146], [0, -150], [30, -146], [43, -132], [43, -110], [32, -93], [0, -90], [-32, -93], [-43, -110], [-43, -132]], [0, -120], G, { split: 2, seed: 13, ring: 0.6 });
    for (const [x, y] of [[-8, -140], [0, -143], [8, -140]]) { c.fillStyle = CO; c.fill(ngon(x, y, 2.4, 4, 0)); }
    for (const k of [-1, 1]) {
      const ex = k * 15, ey = -121, R = 8.6;
      const hex = ringPts(ex, ey, R, R * 0.92, 6, 0);
      facets(g, hex, [ex - 1, ey - 1], A.slice(1), { seed: 15 + k, lean: 1.4, ring: 0.5 });
      g.clip(poly(hex), () => {
        c.fillStyle = '#10171f'; c.fill(ngon(ex - 1.2, ey + 0.3, 2.5, 4, -PI / 2, 4.6));
        c.fillStyle = G[2]; c.fill(poly([[ex - R - 1, ey - R - 1], [ex + R + 1, ey - R - 1], [ex + R + 1, ey - R * 0.62], [ex - R - 1, ey - R * 0.56]]));
        c.fillStyle = G[1]; c.fill(poly([[ex - R - 1, ey - R * 0.56], [ex + R + 1, ey - R * 0.62], [ex + R + 1, ey - R * 0.52], [ex - R - 1, ey - R * 0.46]]));
      });
    }
    for (const k of [-1, 1]) { c.fillStyle = G[0]; c.fill(ngon(k * 5, -104, 1.4, 4, 0)); }
  },
};

// =====================================================================================================
// 8. BLOBBY. As few shapes as it can be: one soft blob for head, body, arms and legs together, one for the tail,
// one shade along its far side, two dark eyes. No lines on the face, no belly, no toes. A muted olive on warm grey.
const blobby = {
  id: 'blobby', name: 'Blobby minimal',
  line: 'Five soft shapes in all: one blob for the whole body, one for the tail, one shade, two small dark eyes.',
  label: 'rgba(60,62,45,0.75)',
  bg(ctx, W, H, fy) {
    flatRoom(ctx, W, H, fy, '#ebe4d8', '#e1d8c8');
  },
  draw(g) {
    const c = g.ctx, C = '#8d9d5e', CD = '#76874d', K = '#2b3022';
    c.fillStyle = '#d3c8b4'; c.fill(ell(4, 1, 44, 5));
    const at = spiral({ R0: 28, shrink: 14, r0: 10.5, rTip: 5.5, sweep: 250, a0: 150 });
    const tail = trail(Array.from({ length: 25 }, (_, i) => at(i / 24)));
    c.fillStyle = C; c.fill(tail); g.plane(tail, CD, 3, 4);
    const s = 1;
    const sil = blob([
      [-44, -128, s], [-30, -146, s], [0, -150, s], [30, -146, s], [44, -128, s], [38, -110, s], [18, -100, 0.7],
      [18, -90, s], [32, -80, s], [42, -63, 1.3], [35, -55, 1.3], [26, -66, 1.4], [22, -40, s], [21, -10, s], [27, -1, 0.7], [8, 0, 0.7], [3, -20, s],
      [-3, -20, s], [-8, 0, 0.7], [-27, -1, 0.7], [-21, -10, s], [-22, -40, s], [-26, -66, 1.4], [-35, -55, 1.3], [-42, -63, 1.3], [-32, -80, s],
      [-18, -90, s], [-18, -100, 0.7], [-38, -110, s],
    ]);
    c.fillStyle = C; c.fill(sil);
    g.plane(sil, CD, 7, 3);
    for (const k of [-1, 1]) { c.fillStyle = K; c.fill(ell(k * 22 - 1.5, -127, 3.2, 4)); }
  },
};

// =====================================================================================================
// 9. RISOGRAPH. Printed in three spot inks, teal, fluorescent pink and yellow, on off-white paper: each ink
// grainy, laid slightly out of register, and overprinting where they cross (teal and pink make the shadow plum;
// yellow and pink make the belly's shadow orange). The wall is a pale pink wash with a yellow sun.
const RISO = { paper: '#f3eee2', teal: '#00838a', pink: '#ff4fa6', yellow: '#ffd500' };
const riso = {
  id: 'riso', name: 'Risograph',
  line: 'Three grainy spot inks, teal, fluorescent pink and yellow, overprinting a little out of register on paper.',
  label: 'rgba(0,100,106,0.85)',
  bg(ctx, W, H) { ctx.fillStyle = RISO.paper; ctx.fillRect(0, 0, W, H); },
  draw(g, env) {
    const c = g.ctx, gecko = c.getTransform();
    const T = layer(c), P = layer(c), Y = layer(c);
    // the backdrop, in CSS pixels on each plate
    const px = (l, fn) => { l.save(); l.setTransform(env.px); fn(l); l.restore(); };
    px(P, l => { l.fillStyle = 'rgba(0,0,0,0.16)'; l.fillRect(0, 0, env.W, env.fy); l.fillStyle = 'rgba(0,0,0,0.75)'; l.beginPath(); l.arc(318, 92, 44, 0, PI * 2); l.fill(); });
    px(Y, l => { l.fillStyle = 'rgba(0,0,0,0.9)'; l.beginPath(); l.arc(318, 92, 44, 0, PI * 2); l.fill(); l.fillStyle = 'rgba(0,0,0,0.42)'; l.fillRect(0, env.fy, env.W, env.H - env.fy); });
    px(T, l => { l.fillStyle = 'rgba(0,0,0,0.1)'; l.fillRect(0, env.fy, env.W, env.H - env.fy); l.fillStyle = 'rgba(0,0,0,0.5)'; l.fillRect(0, env.fy, env.W, 4); });
    const shift = (l, dx, dy) => l.setTransform(gecko.translate(dx, dy));
    shift(P, 1.3, 0.9); shift(Y, -0.9, 0.6);
    const ink = (l, p, a = 1) => { l.fillStyle = `rgba(0,0,0,${a})`; l.fill(p); };
    const out = (l, p) => { l.save(); l.globalCompositeOperation = 'destination-out'; l.fill(p); l.restore(); };
    const plane = (l, p, a, dx, dy) => { const q = new Path2D(); q.addPath(p, new DOMMatrix().translate(-dx, -dy)); l.save(); l.clip(p); const r = new Path2D(); r.rect(-500, -500, 1000, 1000); r.addPath(q); l.clip(r, 'evenodd'); ink(l, rr(-500, -500, 1000, 1000, 0), a); l.restore(); };
    ink(T, ell(4, 1, 40, 4), 0.35); ink(P, ell(4, 1, 40, 4), 0.2);
    const at = spiral({ R0: 31, shrink: 21, r0: 9.4, rTip: 2.8 });
    const tail = trail(Array.from({ length: 29 }, (_, i) => at(i / 28)));
    const body = rpoly([[-18, -98], [18, -98], [22, -26], [-22, -26]], 12);
    const head = rr(-42, -144, 84, 50, 21);
    const limbs = union(pill(-13, -3.6, 21, 7.4), pill(13, -3.6, 21, 7.4), tube(-10, -32, -12, -9, 5), tube(10, -32, 12, -9, 5),
      tube(-16, -86, -28, -64, 4.4), tube(16, -86, 28, -64, 4.4), circ(-29, -61, 6), circ(29, -61, 6));
    for (const p of [tail, limbs, body, head]) { ink(T, p, 0.92); plane(P, p, 0.6, 5, 2); }
    const belly = pill(-1, -60, 21, 52);
    T.save(); T.clip(body); out(T, belly); T.restore();
    Y.save(); Y.clip(body); ink(Y, belly, 1); Y.restore();
    for (const t of [0.18, 0.4, 0.62]) { const [x, y, r] = at(t); ink(P, circ(x, y, r * 0.45), 1); }
    for (const [x, y] of [[-8, -137], [0, -139], [8, -137]]) ink(P, circ(x, y, 2.2), 1);
    for (const k of [-1, 1]) {
      const ex = k * 16, ey = -122, r = 8, eye = circ(ex, ey, r);
      for (const l of [T, P, Y]) out(l, eye);
      T.save(); T.clip(eye); ink(T, circ(ex - 1.3, ey - 0.6, 3.6), 1); ink(T, rr(ex - r - 1, ey - r - 1, 2 * r + 2, r * 0.26 + 1, 0), 0.92); T.restore();
      P.save(); P.clip(eye); ink(P, rr(ex - r - 1, ey - r - 1, 2 * r + 2, r * 0.26 + 1, 0), 0.6); P.restore();
    }
    for (const k of [-1, 1]) ink(T, circ(k * 4.5, -103, 1.3), 1);
    printInk(Y, RISO.yellow, { seed: 31 }); printInk(P, RISO.pink, { seed: 32 }); printInk(T, RISO.teal, { seed: 33 });
    lay(c, Y, 'multiply'); lay(c, P, 'multiply'); lay(c, T, 'multiply');
  },
};

// =====================================================================================================
// 10. LINOCUT. A two-block print: a red block under a dark indigo one, the gecko carved out of the dark block. The
// light side is carved into fine lines; the far side is left solid; a gouged gap separates each limb from what
// lies behind it; the belly is carved in curved bars that show the red underneath. Worn ink, cream paper.
const linocut = {
  id: 'linocut', name: 'Linocut',
  line: 'A two-block print: dark ink with carved lines for light, a red block showing through the belly; worn edges.',
  label: 'rgba(30,28,40,0.85)',
  bg(ctx, W, H, fy) {
    ctx.fillStyle = '#eee4cf'; ctx.fillRect(0, 0, W, H);
    const l = layer(ctx), r = rng(41);
    l.fillStyle = '#1e1c28';
    l.fillRect(0, fy - 2, W, 3.2);
    for (let i = 0; i < 26; i++) {
      const y = fy + 10 + r() * (H - fy - 62), x = r() * W, w = 16 + r() * 50, h = 1.4 + r() * 1.4;
      l.fill(rpoly([[x, y], [x + w * 0.5, y - h / 2], [x + w, y], [x + w * 0.5, y + h / 2]], 0.6));
    }
    wear(l, { seed: 42, amount: 0.12 });
    lay(ctx, l);
  },
  draw(g) {
    const c = g.ctx, INK = '#1e1c28', RED = '#c4452c';
    const R = layer(c), K = layer(c);
    const carve = (p, w) => { K.save(); K.globalCompositeOperation = 'destination-out'; if (w) { K.lineWidth = w; K.lineCap = 'round'; K.lineJoin = 'round'; K.stroke(p); } else K.fill(p); K.restore(); };
    // a part: gouge a gap round it in what's already cut, then ink it
    const part = (p, gap = 1.8) => { carve(p, gap * 2); K.fillStyle = INK; K.fill(p); };
    // the light side: fine carved strokes across the left of a form, longer toward its lit edge
    const hatch = (p, x0, x1, y0, y1, step = 4.2, tilt = -0.25) => {
      K.save(); K.clip(p);
      for (let y = y0; y < y1; y += step) {
        const L = (x1 - x0) * (0.55 + 0.45 * Math.sin((y - y0) * 0.9) ** 2);
        const q = new Path2D(); q.moveTo(x0 - 4, y); q.lineTo(x0 + L, y + L * tilt);
        K.save(); K.globalCompositeOperation = 'destination-out'; K.lineWidth = 1.25; K.lineCap = 'round'; K.stroke(q); K.restore();
      }
      K.restore();
    };
    K.fillStyle = 'rgba(30,28,40,0.3)'; K.fill(ell(4, 1, 40, 3.6));
    for (const k of [-1, 1]) part(pill(k * 13, -3.6, 21, 7.4), 1.4);
    const at = spiral({ R0: 31, shrink: 21, r0: 9.6, rTip: 2.6 });
    const tail = trail(Array.from({ length: 29 }, (_, i) => at(i / 28)));
    part(tail);
    // chevrons carved across the tail
    K.save(); K.clip(tail);
    for (const t of [0.12, 0.26, 0.4, 0.54, 0.68, 0.82]) {
      const [x, y, r] = at(t), [x2, y2] = at(t + 0.01), a = Math.atan2(y2 - y, x2 - x);
      const q = new Path2D(), nx = -Math.sin(a), ny = Math.cos(a), bx = Math.cos(a) * 2.6, by = Math.sin(a) * 2.6;
      q.moveTo(x + nx * r * 1.2 - bx, y + ny * r * 1.2 - by); q.lineTo(x + bx, y + by); q.lineTo(x - nx * r * 1.2 - bx, y - ny * r * 1.2 - by);
      carve(q, 1.5);
    }
    K.restore();
    for (const k of [-1, 1]) part(tube(k * 10, -32, k * 12, -9, 4.8));
    const body = rpoly([[-18, -98], [18, -98], [22, -26], [-22, -26]], 14);
    part(body);
    hatch(body, -22, -10, -94, -30, 4.6, 0.05);
    // the belly: red block underneath, carved bars across the ink
    const belly = pill(-1, -60, 21, 52);
    R.fillStyle = RED; R.fill(pill(-1, -60, 23, 54));
    K.save(); K.clip(belly);
    for (let y = -84; y < -34; y += 5.2) { const q = new Path2D(); q.moveTo(-14, y); q.quadraticCurveTo(-1, y + 3.2, 12, y); carve(q, 2.4); }
    K.restore();
    for (const k of [-1, 1]) { part(tube(k * 16, -86, k * 28, -64, 4.4)); part(circ(k * 29, -61, 5.8)); }
    const head = rr(-42, -144, 84, 52, 23);
    part(head);
    for (const [x, y] of [[-7, -136], [0, -138.5], [7, -136]]) { R.fillStyle = RED; R.fill(circ(x, y, 2.6)); carve(circ(x, y, 2)); }
    for (const t of [0.19, 0.47, 0.75]) { const [x, y, r] = at(t); R.fillStyle = RED; R.fill(circ(x, y, r * 0.6)); carve(circ(x, y, r * 0.42)); }
    for (const k of [-1, 1]) {
      const ex = k * 15, ey = -121, r = 8;
      // carve the eye below a level lid, leave the pupil standing
      carve(segment(ex, ey, r, ey - r + r * 0.28, true));
      K.fillStyle = INK; K.fill(circ(ex - 1.3, ey - 0.6, 3.3));
      carve(pd(`M${ex - r - 1} ${ey - r - 3.4} Q${ex} ${ey - r - 5.2} ${ex + r + 1} ${ey - r - 3.4}`), 1.2);
    }
    for (const k of [-1, 1]) carve(circ(k * 4.5, -103, 1.2));
    wear(R, { seed: 51, amount: 0.09 }); wear(K, { seed: 52, amount: 0.06 });
    lay(c, R, 'multiply'); lay(c, K);
  },
};

export const STYLES = [geometric, poster, papercut, midcentury, chunky, monoline, faceted, blobby, riso, linocut];
