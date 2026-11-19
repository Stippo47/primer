// Round 10: variants of the two crows picked from round 9, Plump (1) and Bean (7), six of each. All flat vector:
// flat fills, at most a shade or two, a thin edge of light on some; no gradients, hatching, outlines or glows.
//
// Each family is one drawing whose settings default to round 9's own numbers (copied from ../avatar9/js/crows.js),
// so variant 1 of each family is round 9's crow unchanged, the reference. The other five change the body a little
// (rounder or taller, a neck or none, wing, tail, legs and feet, which black) and the face more: eye size and
// spacing, a dark eye or one with a white, lid height and angle, a glint or none, a small feather brow, the eye's
// colour (dark, ochre, pale), the beak's length and thickness, and how the far eye shows. Every face stays calm:
// no mouth, no grin, no frown. A lid or brow may slope down toward the back of the head (sleepy, gentle) but never
// toward the beak (that reads cross).
//
// The same pose as round 9: three-quarters on, turned a little to the right, so the beak points right, the near
// eye sits left of the beak and the far eye peeks past the head's right edge above the beak's root. Light from the
// upper left, so a shade falls on the lower right of each form; an edge of light, where there is one, runs along
// the upper left.
//
// Every crow is drawn with its feet on the floor at (0, 0), in units of about one point at room size; y grows
// downwards, so the bird stands in negative y. g is the kit's pen; g.ctx the canvas.

import { pen, rr, pill, circ, ell, poly, rpoly, limb, union, blob, clipOut, trail } from './kit.js';

// ---------- small shared helpers (as round 9) ----------
const fill = (c, p, col) => { c.fillStyle = col; c.fill(p); };
const stroke = (c, p, col, w, cap = 'round') => {
  c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round'; c.stroke(p); c.restore();
};
// the flat shadow on the floor, the same kind under all of them
function ground(g, cx, w) {
  if (!g.noGround) fill(g.ctx, ell(cx, 0.5, w, 4.5), 'rgba(10,8,44,0.34)');
}
// a crow's foot at (x, y): three toes forward (to the right, the middle one turned toward us) and one back
function foot(x, y, { len = 15, r = 2.6, tip = 1, back = 0.62 } = {}) {
  return union(
    limb(x, y, r, x + len, y + 1.5, tip),
    limb(x, y, r, x + len * 0.72, y + 4.6, tip),
    limb(x, y, r * 0.9, x - len * back, y + 0.6, tip * 0.9),
  );
}
// a leg from the body down to the floor, and its foot
const leg = (x0, y0, r0, x1, y1, r1, f) => union(limb(x0, y0, r0, x1, y1, r1), foot(x1, y1, f));
// a beak: the top edge from (x0, yTop) arching to the tip, the bottom edge back to (x0, yBot). arch lifts the
// top edge, hook bends the tip down past the lower edge, round softens the tip.
function beakPath(x0, yTop, yBot, tx, ty, { arch = 0.1, hook = 0, round = 0 } = {}) {
  const L = tx - x0, d = yBot - yTop, p = new Path2D();
  p.moveTo(x0, yTop);
  p.bezierCurveTo(x0 + L * 0.4, yTop - L * arch, x0 + L * 0.8, ty - d * 0.35 - L * arch * 0.4, tx, ty + hook);
  if (round) p.quadraticCurveTo(tx + round * 0.4, ty + hook + round, tx - round * 1.2, ty + hook + round * 0.9);
  p.bezierCurveTo(x0 + L * 0.75, ty + d * 0.18, x0 + L * 0.3, yBot + 0.5, x0, yBot);
  p.closePath();
  return p;
}
// paint(pen) drawn on a spare sheet the size of the canvas, then laid on the canvas through region in one step,
// so a picture made of several layers has no seam where the region's edge crosses it
let sheet = null;
function through(g, region, paint) {
  const c = g.ctx, cv = c.canvas;
  if (!sheet || sheet.width !== cv.width || sheet.height !== cv.height) {
    sheet = document.createElement('canvas'); sheet.width = cv.width; sheet.height = cv.height;
  }
  const o = sheet.getContext('2d');
  o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, sheet.width, sheet.height);
  o.setTransform(c.getTransform());
  paint(pen(o));
  c.save(); c.clip(region); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(sheet, 0, 0); c.restore();
}
// The near side of the face, left of a line down the beak's root that bulges forward a little, the way the
// feathers lie over the base of a crow's beak. Each crow paints its head again through this, after its beak,
// so the beak comes out of the feathers instead of being stuck on with a straight edge.
function face(x0, yTop, yBot, bulge = 7) {
  const p = new Path2D(), m = (yTop + yBot) / 2;
  p.moveTo(x0 - 160, yTop - 80);
  p.lineTo(x0 + 2, yTop - 80);
  p.lineTo(x0 + 2, yTop - 1);
  p.bezierCurveTo(x0 + bulge + 3, yTop + (m - yTop) * 0.5, x0 + bulge + 3, yBot - (yBot - m) * 0.6, x0, yBot + 2);
  p.lineTo(x0, yBot + 2);
  p.lineTo(x0 - 4, yBot + 60);
  p.lineTo(x0 - 160, yBot + 60);
  p.closePath();
  return p;
}
// the lower part of a beak (below a straight line from (x0, y0) to the tip), for a two-tone beak
const lowerHalf = (x0, y0, tx, ty) => poly([[x0 - 4, y0], [tx + 8, ty], [tx + 8, ty + 60], [x0 - 4, y0 + 60]]);
// a lid: the part of an eye above the line from (x0, y0) to (x1, y1), its edge bowed by sag in the middle (a
// negative sag bows it up, the way a lid follows the round of the eye)
function lidShape(x0, y0, x1, y1, sag) {
  const p = new Path2D();
  p.moveTo(x0, y0);
  if (sag) p.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); else p.lineTo(x1, y1);
  p.lineTo(x1, y1 - 40); p.lineTo(x0, y0 - 40); p.closePath();
  return p;
}
function lidEdge(x0, y0, x1, y1, sag) {
  const p = new Path2D();
  p.moveTo(x0, y0);
  if (sag) p.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); else p.lineTo(x1, y1);
  return p;
}
const turnPill = (cx, cy, w, h, a) => { const p = new Path2D(); p.addPath(pill(0, 0, w, h), new DOMMatrix().translate(cx, cy).rotate(a)); return p; };

// ---------- the eye ----------
// One eye from a list of settings, so any eye can go on either bird. Sizes are in units of the eye's own half
// width (rx) and half height (ry); r is in units of the smaller of the two.
//   shape  'ell' (an oval) or 'box' (a rounded box, Bean's)
//   ball   the eye's colour: dark for a dot eye, white for an eye with a white, ochre or pale for a coloured eye
//   ring   [colour, width]: a thin band round the eye
//   iris   { col, k, dx, dy }: a coloured disc inside a white, k of the eye's size
//   pupil  { col, w, h, dx, dy, shape }: w and h its whole width and height ('pill' or 'ell')
//   glint  { dx, dy, r }: a white catchlight, or none
//   lid    { at, tilt, sag, grow, col, line: [colour, width] }: at is how far down the eye the lid's edge sits
//          (0 open, 1 shut); tilt drops the back end (toward the tail) by tilt * ry and lifts the front by the
//          same, never the other way; sag bows the edge (negative: up, following the eye)
//   brow   { from, to, gap, w: [w0, w1], col }: a small feather ridge hugging the top of the eye, an arc round it
//          gap beyond its edge, from the angle from (degrees: 180 is the back, 270 straight up) to the angle to,
//          tapering from half-width w0 at the back to w1 at the front. It follows the eye's own curve, so it never
//          tilts down toward the beak.
function eyeAt(g, x, y, e, lidCol) {
  const c = g.ctx, { rx, ry } = e, m = Math.min(rx, ry);
  const shape = (grow = 0) => e.shape === 'box'
    ? rr(x - rx - grow, y - ry - grow, (rx + grow) * 2, (ry + grow) * 2, m * 0.92 + grow)
    : ell(x, y, rx + grow, ry + grow);
  if (e.ring) fill(c, shape(e.ring[1]), e.ring[0]);
  const s = shape();
  fill(c, s, e.ball);
  g.clip(s, () => {
    const I = e.iris, P = e.pupil, G = e.glint;
    if (I) fill(c, ell(x + I.dx * rx, y + I.dy * ry, I.k * rx, I.k * ry), I.col);
    if (P) {
      const px = x + P.dx * rx, py = y + P.dy * ry;
      fill(c, P.shape === 'pill' ? pill(px, py, P.w * rx, P.h * ry) : ell(px, py, P.w * rx / 2, P.h * ry / 2), P.col);
    }
    if (G) fill(c, circ(x + G.dx * rx, y + G.dy * ry, G.r * m), G.col || '#ffffff');
  });
  const L = e.lid;
  if (L) {
    // the lid's edge: a line through (x, yl), dropping toward the back by tilt
    const yl = y - ry + L.at * 2 * ry, t = (L.tilt || 0) * ry / rx;
    const x0 = x - rx - 3, x1 = x + rx + 3, y0 = yl + t * (rx + 3), y1 = yl - t * (rx + 3);
    g.clip(shape(L.grow ?? 1), () => fill(c, lidShape(x0, y0, x1, y1, L.sag), L.col || lidCol));
    if (L.line) g.clip(s, () => stroke(c, lidEdge(x0, y0, x1, y1, L.sag), L.line[0], L.line[1]));
  }
  if (e.brow) {
    const B = e.brow, n = 10, pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (B.from + (B.to - B.from) * t) * Math.PI / 180;
      pts.push([x + Math.cos(a) * (rx + B.gap), y + Math.sin(a) * (ry + B.gap), B.w[0] + (B.w[1] - B.w[0]) * t]);
    }
    fill(c, trail(pts), B.col);
  }
}

// =====================================================================================================
// PLUMP. Round and soft: an egg of a body with the head sunk into it, no neck, every edge a curve. One flat
// shade on the lower right. Short legs with round toes. A soft teardrop wing. The settings below are round 9's.
// =====================================================================================================
const PLUMP = {
  col: {
    base: '#171b44', shade: '#0e1131', wing: '#232a63', wsh: '#181d48', tail: '#13173b',
    legFar: '#10132c', legNear: '#161a38', beak: '#2c3260', beakLow: '#191d3c',
  },
  ground: [6, 58],
  plane: [12, 9], wplane: [4, 5],
  edge: null,                        // { col, w, wing, tail, beak }: a thin edge of light on the upper left
  tail: [[-26, -54], [-62, -42], [-90, -26], [-88, -13], [-60, -12], [-20, -30]],
  legs: [
    [22, -34, 4.4, 23, -7, 3.8, { len: 14, r: 3.4, tip: 2.2 }, 'legFar'],
    [-6, -32, 4.8, -7, -5, 4.2, { len: 15, r: 3.6, tip: 2.4 }, 'legNear'],
  ],
  body: [[-54, -100], [-28, -122], [8, -127], [42, -114], [58, -86], [55, -54], [34, -31], [4, -24], [-26, -29], [-48, -50], [-59, -76]],
  neck: null,
  head: [24, -127, 33],
  hs: [0, 0],                        // moves the head and everything on it (beak, face, eyes) together
  beak: { x0: 40, yTop: -138, yBot: -109, tx: 91, ty: -118, arch: 0.06, round: 3, hook: 0, split: [-122, 92, -116] },
  face: [42, 8],                     // where the feathers lie over the beak's root, and how far they bulge
  wing: [[-34, -108], [-6, -98], [4, -76], [-8, -52], [-40, -30], [-78, -18, 0], [-58, -48], [-52, -86]],
  // round 9's eyes: dark dots in a thin blue ring, a white catchlight, the top cut level by a lid
  eye: { x: 26, y: -136, shape: 'ell', rx: 7.4, ry: 7.8, ball: '#05060f', ring: ['#37417f', 1.6], glint: { dx: -0.32, dy: 0.02, r: 0.38 }, lid: { at: 0.31, grow: 1.7 } },
  far: { x: 51, y: -141, shape: 'ell', rx: 4.2, ry: 7, ball: '#05060f', ring: ['#37417f', 1.6], glint: { dx: -0.32, dy: 0.02, r: 0.38 }, lid: { at: 0.31, grow: 1.7 } },
};

function plumpBird(g, v) {
  const c = g.ctx, C = v.col, [hx, hy] = v.hs, E = v.edge;
  ground(g, ...v.ground);
  const tail = blob(v.tail);
  fill(c, tail, C.tail);
  if (E && E.tail) g.rimOn(tail, E.col, E.tail);
  for (const [x0, y0, r0, x1, y1, r1, f, col] of v.legs) fill(c, leg(x0, y0, r0, x1, y1, r1, f), C[col]);

  const body = blob(v.body);
  const head = circ(v.head[0] + hx, v.head[1] + hy, v.head[2]);
  const mass = v.neck ? union(body, head, blob(v.neck)) : union(body, head);
  const paint = k => {
    fill(k.ctx, mass, C.base);
    k.plane(mass, C.shade, ...v.plane);
    if (E) k.rimOn(mass, E.col, E.w);
  };
  paint(g);

  const B = v.beak, s = B.split;
  const beak = beakPath(B.x0 + hx, B.yTop + hy, B.yBot + hy, B.tx + hx, B.ty + hy, B);
  fill(c, beak, C.beak);
  g.clip(beak, () => fill(c, lowerHalf(B.x0 + hx, s[0] + hy, s[1] + hx, s[2] + hy), C.beakLow));
  if (E && E.beak) g.rimOn(beak, E.col, E.beak, 0.7);
  through(g, face(v.face[0] + hx, B.yTop + hy, B.yBot + hy, v.face[1]), paint);

  const wing = blob(v.wing);
  fill(c, wing, C.wing);
  g.plane(wing, C.wsh, ...v.wplane);
  if (E && E.wing) g.rimOn(wing, E.col, E.wing, 0.85);
  eyeAt(g, v.eye.x + hx, v.eye.y + hy, v.eye, C.base);
  // the far eye, peeking past the edge of the head, above the beak's root
  if (v.far) clipOut(c, head, beak, () => eyeAt(g, v.far.x + hx, v.far.y + hy, v.far, C.shade));
}

// =====================================================================================================
// BEAN. Built from simple capsules, in the family of the round 4 animals: a capsule of a body leaning forward, a
// round head, a capsule wing, a rounded fan of a tail, short stub legs and capsule feet. One broad flat shade down
// the right side. The settings below are round 9's.
// =====================================================================================================
const BEAN = {
  col: {
    base: '#262a43', shade: '#1a1d30', wing: '#363b5c', wsh: '#2c3150', tail: '#1d2034',
    legFar: '#0f1120', legNear: '#14162a', beak: '#3b4062', beakLow: '#262a44',
  },
  ground: [4, 54],
  plane: [20, 5], wplane: [7, 3],
  edge: null,
  tail: [[-30, -64, 6], [-96, -54, 9], [-84, -12, 9], [-24, -40, 6]],
  // each leg: a rounded stub [x, y, w, h] and a capsule foot [cx, cy, w, h]
  legs: [
    { leg: [17, -34, 9, 30], foot: [28, -5, 26, 9], col: 'legFar' },
    { leg: [-9, -32, 10, 30], foot: [1, -4, 28, 10], col: 'legNear' },
  ],
  body: [2, -84, 92, 126, 30],       // a capsule: centre, width, height, lean in degrees
  neck: null,
  head: [22, -146, 31],
  hs: [0, 0],
  beak: { pts: [[34, -162, 3], [104, -143, 7], [36, -126, 3]], split: [34, -144, 104, -142] },
  face: [39, 6],
  wing: [-24, -84, 38, 96, 32],
  // round 9's eyes: a white rounded box, a dark upright pupil, a lid a third of the way down with a dark line
  eye: { x: 24, y: -154, shape: 'box', rx: 7.5, ry: 8.5, ball: '#ffffff', pupil: { shape: 'pill', col: '#14163a', dx: 0.24, dy: 0.24, w: 1, h: 1.12 }, glint: { dx: 0.04, dy: 0.04, r: 0.24 }, lid: { at: 0.34, grow: 1, line: ['#11131f', 1.4] } },
  far: { x: 48, y: -160, shape: 'box', rx: 3.5, ry: 7.5, ball: '#ffffff', pupil: { shape: 'pill', col: '#14163a', dx: 0.24, dy: 0.24, w: 1, h: 1.12 }, glint: { dx: 0.04, dy: 0.04, r: 0.24 }, lid: { at: 0.34, grow: 1, line: ['#11131f', 1.4] } },
};

function beanBird(g, v) {
  const c = g.ctx, C = v.col, [hx, hy] = v.hs, E = v.edge;
  ground(g, ...v.ground);
  const tail = rpoly(v.tail);
  fill(c, tail, C.tail);
  if (E && E.tail) g.rimOn(tail, E.col, E.tail);
  for (const L of v.legs) {
    const [x, y, w, h] = L.leg, [fx, fy, fw, fh] = L.foot;
    fill(c, union(rr(x, y, w, h, w / 2), pill(fx, fy, fw, fh)), C[L.col]);
  }

  const body = turnPill(...v.body);
  const head = circ(v.head[0] + hx, v.head[1] + hy, v.head[2]);
  const mass = v.neck ? union(body, head, turnPill(...v.neck)) : union(body, head);
  const paint = k => {
    fill(k.ctx, mass, C.base);
    k.plane(mass, C.shade, ...v.plane);
    if (E) k.rimOn(mass, E.col, E.w);
  };
  paint(g);

  const B = v.beak, s = B.split;
  const beak = rpoly(B.pts.map(([x, y, r]) => [x + hx, y + hy, r]));
  fill(c, beak, C.beak);
  g.clip(beak, () => fill(c, lowerHalf(s[0] + hx, s[1] + hy, s[2] + hx, s[3] + hy), C.beakLow));
  if (E && E.beak) g.rimOn(beak, E.col, E.beak, 0.7);
  const top = Math.min(...B.pts.map(p => p[1])) + hy, bot = Math.max(...B.pts.map(p => p[1])) + hy;
  through(g, face(v.face[0] + hx, top, bot, v.face[1]), paint);

  const wing = turnPill(...v.wing);
  fill(c, wing, C.wing);
  g.plane(wing, C.wsh, ...v.wplane);
  if (E && E.wing) g.rimOn(wing, E.col, E.wing, 0.85);
  eyeAt(g, v.eye.x + hx, v.eye.y + hy, v.eye, C.base);
  // the far eye, peeking past the edge of the head, above the beak's root
  if (v.far) clipOut(c, head, beak, () => eyeAt(g, v.far.x + hx, v.far.y + hy, v.far, C.shade));
}

// a variant: the family's settings with some replaced (colours one by one, everything else whole)
const vary = (base, o) => ({ ...base, ...o, col: { ...base.col, ...(o.col || {}) } });
// where each one's head is, for the face sheets: the head's centre, moved a little toward the beak
const headOf = v => [v.head[0] + v.hs[0] + 24, v.head[1] + v.hs[1] + 2];

// =====================================================================================================
// The Plump family
// =====================================================================================================
const PLUMPS = [
  // 1  PLUMP, round 9's, unchanged.
  { id: 'plump', name: 'Plump', mood: 'calm, as round 9', v: PLUMP },

  // 2  BUTTON: curious. Big round dark eyes with no lid at all and a large glint high on the light side, set a
  //    little further from the beak; the far eye shows whole. A shorter, deeper beak. The body a touch rounder
  //    and lower, a short round tail. Charcoal (a grey black, no blue) with a thin cool edge of light.
  { id: 'plump-button', name: 'Button', mood: 'curious', v: vary(PLUMP, {
    col: { base: '#22232c', shade: '#17181f', wing: '#30323f', wsh: '#262833', tail: '#1b1c24', legFar: '#121319', legNear: '#1a1b22', beak: '#3a3c4a', beakLow: '#25262f' },
    edge: { col: '#aab6dc', w: 1.8, wing: 1.4, tail: 1.4 },
    body: [[-56, -96], [-30, -118], [8, -122], [44, -110], [60, -84], [57, -53], [35, -30], [4, -23], [-27, -28], [-50, -48], [-61, -74]],
    tail: [[-26, -54], [-58, -46], [-80, -34], [-82, -20], [-60, -14], [-22, -30]],
    hs: [0, 5],
    beak: { x0: 40, yTop: -139, yBot: -108, tx: 83, ty: -119, arch: 0.07, round: 4, hook: 0, split: [-122, 84, -117] },
    eye: { x: 23, y: -136, shape: 'ell', rx: 8.6, ry: 9, ball: '#08080d', glint: { dx: -0.3, dy: -0.34, r: 0.36 } },
    far: { x: 51, y: -141, shape: 'ell', rx: 4.4, ry: 7.4, ball: '#08080d', glint: { dx: -0.3, dy: -0.34, r: 0.36 } },
  }) },

  // 3  DROWSE: sleepy. A heavy lid half way down the eye, its edge dropping a little toward the back of the head,
  //    with a faint lighter line along it; a small glint below the lid; no ring. The far eye lidded the same, a
  //    dark sliver at the head's edge. A medium beak with the tip turned down a touch. The body lower and wider,
  //    the head sunk deeper, a short wedge of a tail and a rounder wing. Warm black, almost brown, which stands apart from the blue wall.
  { id: 'plump-drowse', name: 'Drowse', mood: 'sleepy', v: vary(PLUMP, {
    col: { base: '#2b1f26', shade: '#1c1419', wing: '#3d2c35', wsh: '#30222a', tail: '#23181e', legFar: '#170f13', legNear: '#21171c', beak: '#3f3138', beakLow: '#291e24' },
    ground: [6, 62],
    body: [[-58, -94], [-30, -114], [8, -119], [44, -108], [62, -82], [59, -52], [36, -30], [4, -23], [-28, -28], [-52, -48], [-63, -72]],
    tail: [[-26, -50], [-62, -40], [-92, -24, 0.45], [-60, -14], [-20, -28]],
    wing: [[-36, -100], [-6, -92], [4, -72], [-8, -50], [-38, -30], [-74, -20, 0], [-56, -46], [-52, -80]],
    hs: [2, 8],
    beak: { x0: 40, yTop: -138, yBot: -109, tx: 89, ty: -117, arch: 0.08, round: 2.5, hook: 2.5, split: [-122, 90, -115] },
    eye: { x: 25, y: -135, shape: 'ell', rx: 7.6, ry: 7.6, ball: '#0e0709', glint: { dx: -0.34, dy: 0.42, r: 0.24 }, lid: { at: 0.52, tilt: 0.12, grow: 1.4, line: ['#5a4550', 1.3] } },
    far: { x: 51, y: -146, shape: 'ell', rx: 4.2, ry: 6.8, ball: '#0e0709', lid: { at: 0.5, tilt: 0.12, grow: 1.4, line: ['#5a4550', 1.1] } },
  }) },

  // 4  KEEN: sharp. A smaller eye with a pale silver iris and a small dark pupil looking forward and a little
  //    down, a level lid over the top quarter, and a small feather ridge hugging the back of the eye. Set closer to
  //    the beak. A longer, slimmer beak. The body a little taller, its back rising into the head (a hint of a
  //    neck), a longer wing and tail. Round 9's blue-black, with a thin cool edge of light.
  { id: 'plump-keen', name: 'Keen', mood: 'sharp', v: vary(PLUMP, {
    edge: { col: '#9db4ff', w: 1.8, wing: 1.4, beak: 1 },
    body: [[-50, -108], [-25, -132], [6, -140], [40, -124], [56, -90], [54, -56], [34, -31], [4, -24], [-26, -29], [-48, -52], [-58, -82]],
    head: [24, -127, 31],
    tail: [[-26, -56], [-66, -44], [-106, -22, 0.4], [-64, -16], [-20, -30]],
    wing: [[-34, -112], [-6, -102], [4, -80], [-8, -56], [-44, -32], [-96, -14, 0], [-62, -50], [-52, -90]],
    hs: [0, -12],
    beak: { x0: 40, yTop: -136, yBot: -112, tx: 103, ty: -121, arch: 0.07, round: 2, hook: 0, split: [-123, 104, -119] },
    eye: { x: 28, y: -135, shape: 'ell', rx: 6.4, ry: 6.6, ball: '#c9d3e8', ring: ['#0b0e28', 1.1], pupil: { shape: 'ell', col: '#080a1c', dx: 0.24, dy: 0.2, w: 0.74, h: 0.78 }, glint: { dx: 0.08, dy: 0.04, r: 0.15 }, lid: { at: 0.28, grow: 1.4 }, brow: { from: 214, to: 290, gap: 1.9, w: [1.15, 0.45], col: '#2f3a82' } },
    far: { x: 51, y: -140, shape: 'ell', rx: 3.6, ry: 6, ball: '#c9d3e8', ring: ['#0b0e28', 1.1], pupil: { shape: 'ell', col: '#080a1c', dx: 0.2, dy: 0.2, w: 0.9, h: 0.8 }, lid: { at: 0.3, grow: 1.4 } },
  }) },

  // 5  AMBER: warm and attentive. A larger eye with an ochre iris, a round dark pupil and a glint, a thin dark
  //    ring, and a lid only a little way down whose edge curves with the eye. A shorter, thicker beak. A longer
  //    rounded tail, a wing with a pointed tip, thinner legs. Green-sheened black, the wing a deep sheen green.
  { id: 'plump-amber', name: 'Amber', mood: 'warm, attentive', v: vary(PLUMP, {
    col: { base: '#17242a', shade: '#0e181c', wing: '#1f4846', wsh: '#183a38', tail: '#132025', legFar: '#0d161a', legNear: '#142025', beak: '#2e4046', beakLow: '#1b282c' },
    tail: [[-26, -56], [-64, -48], [-98, -34], [-100, -16], [-72, -10], [-22, -30]],
    wing: [[-34, -108], [-6, -98], [4, -76], [-8, -52], [-42, -30], [-88, -14, 0], [-60, -46], [-52, -86]],
    legs: [
      [22, -34, 3.6, 23, -7, 3, { len: 15, r: 2.6, tip: 1.4 }, 'legFar'],
      [-6, -32, 3.9, -7, -5, 3.2, { len: 16, r: 2.8, tip: 1.5 }, 'legNear'],
    ],
    beak: { x0: 40, yTop: -141, yBot: -106, tx: 86, ty: -118, arch: 0.1, round: 3.5, hook: 1, split: [-122, 87, -116] },
    eye: { x: 25, y: -136, shape: 'ell', rx: 8.2, ry: 8.4, ball: '#c98f2e', ring: ['#0a1214', 1.2], pupil: { shape: 'ell', col: '#0a0a0c', dx: 0.16, dy: 0.1, w: 1.0, h: 1.0 }, glint: { dx: -0.34, dy: -0.22, r: 0.24 }, lid: { at: 0.2, sag: -1.6, grow: 1.6 } },
    far: { x: 51, y: -141, shape: 'ell', rx: 4.2, ry: 7, ball: '#c98f2e', ring: ['#0a1214', 1.2], pupil: { shape: 'ell', col: '#0a0a0c', dx: 0.2, dy: 0.1, w: 1.1, h: 1.0 }, lid: { at: 0.22, sag: -1, grow: 1.6 } },
  }) },

  // 6  SMOKE: alert. An eye with a white: a big dark iris looking forward with a glint, in a white with a thin dark
  //    ring, a lid only a fifth of the way down, and a feather ridge set higher over the eye (a raised brow). The
  //    far eye half hidden behind the beak's root, a crescent of white with its iris. A short, deep beak. A lighter body: smoky slate, with the wing and
  //    tail darker than the body, so the shape reads on the wall. The body a little taller and pear-shaped.
  { id: 'plump-smoke', name: 'Smoke', mood: 'alert', v: vary(PLUMP, {
    col: { base: '#3c4058', shade: '#2d3045', wing: '#252840', wsh: '#1d2033', tail: '#22253a', legFar: '#17192a', legNear: '#202338', beak: '#262a3f', beakLow: '#1a1d2e' },
    body: [[-52, -102], [-28, -125], [8, -130], [42, -117], [58, -86], [57, -52], [35, -29], [4, -22], [-27, -27], [-50, -48], [-59, -78]],
    head: [24, -127, 34],
    hs: [0, -4],
    beak: { x0: 41, yTop: -141, yBot: -108, tx: 85, ty: -121, arch: 0.08, round: 3.5, hook: 0, split: [-123, 86, -119] },
    face: [43, 8],
    eye: { x: 25, y: -137, shape: 'ell', rx: 7.6, ry: 8, ball: '#f1f2f7', ring: ['#15172a', 1.1], iris: { col: '#14162a', k: 0.66, dx: 0.22, dy: 0.08 }, glint: { dx: 0.0, dy: -0.18, r: 0.2 }, lid: { at: 0.18, sag: -0.8, grow: 1.4, line: ['#15172a', 1.2] }, brow: { from: 200, to: 298, gap: 3.6, w: [1.3, 0.6], col: '#262a40' } },
    far: { x: 51, y: -147, shape: 'ell', rx: 3.4, ry: 6.4, ball: '#f1f2f7', ring: ['#15172a', 1], iris: { col: '#14162a', k: 0.72, dx: 0.12, dy: 0.08 }, lid: { at: 0.2, grow: 1.4 } },
  }) },
];

// =====================================================================================================
// The Bean family
// =====================================================================================================
const BEANS = [
  // 7  BEAN, round 9's, unchanged.
  { id: 'bean', name: 'Bean', mood: 'calm, as round 9', v: BEAN },

  // 8  PIP: curious. Dark dot eyes, no white and no lid: tall rounded dark ovals with a big glint, in a thin lighter
  //    ring so they read on the dark head, set a little wider apart (the near eye further back, more of the far
  //    eye showing). A short rounded beak. The body shorter and more upright, the head a little bigger, a short
  //    round tail. Blue-black, with a thin cool edge of light.
  { id: 'bean-pip', name: 'Pip', mood: 'curious', v: vary(BEAN, {
    col: { base: '#1e2342', shade: '#151931', wing: '#2c3462', wsh: '#232a52', tail: '#191d38', legFar: '#0d0f22', legNear: '#13162c', beak: '#373e68', beakLow: '#22284a' },
    edge: { col: '#a6b8f2', w: 1.8, wing: 1.4, tail: 1.4 },
    body: [3, -80, 96, 114, 24],
    head: [22, -146, 32],
    hs: [0, 6],
    tail: [[-30, -60, 8], [-82, -58, 13], [-78, -24, 13], [-24, -40, 8]],
    wing: [-22, -80, 38, 90, 28],
    beak: { pts: [[34, -162, 3], [94, -145, 8], [36, -128, 3]], split: [34, -145, 94, -143] },
    eye: { x: 20, y: -154, shape: 'box', rx: 6.2, ry: 9, ball: '#0a0b18', ring: ['#3d4680', 1], glint: { dx: -0.18, dy: -0.36, r: 0.46 } },
    far: { x: 48, y: -159, shape: 'box', rx: 3.8, ry: 8, ball: '#0a0b18', ring: ['#3d4680', 1], glint: { dx: -0.18, dy: -0.36, r: 0.46 } },
  }) },

  // 9  NAP: sleepy. White eyes with the lid half way down, its edge dropping toward the back of the head, a
  //    thicker line along it, the pupil low; no glint. The far eye lidded the same. A shorter, blunter, thicker
  //    beak. The body leaning further forward, the head lower, a longer flatter tail. Warm black.
  { id: 'bean-nap', name: 'Nap', mood: 'sleepy', v: vary(BEAN, {
    col: { base: '#2c2328', shade: '#1e181b', wing: '#3e3238', wsh: '#33292e', tail: '#241d21', legFar: '#130e11', legNear: '#1a1417', beak: '#463a41', beakLow: '#2e2529' },
    ground: [4, 58],
    body: [3, -82, 92, 124, 36],
    hs: [3, 7],
    tail: [[-30, -62, 6], [-104, -44, 9], [-98, -16, 9], [-24, -40, 6]],
    wing: [-26, -80, 38, 100, 38],
    beak: { pts: [[34, -164, 3], [97, -144, 10], [36, -124, 3]], split: [34, -144, 97, -142] },
    eye: { x: 24, y: -154, shape: 'box', rx: 7.5, ry: 8, ball: '#f6f1ee', pupil: { shape: 'pill', col: '#1a1216', dx: 0.22, dy: 0.42, w: 0.95, h: 0.95 }, lid: { at: 0.5, tilt: 0.1, grow: 1, line: ['#140e11', 1.8] } },
    far: { x: 48, y: -165, shape: 'box', rx: 3.5, ry: 7, ball: '#f6f1ee', pupil: { shape: 'pill', col: '#1a1216', dx: 0.24, dy: 0.42, w: 1, h: 0.95 }, lid: { at: 0.52, tilt: 0.1, grow: 1, line: ['#140e11', 1.6] } },
  }) },

  // 10 SCOUT: sharp. A narrower white eye, wider than tall, a small round pupil looking forward with a small
  //    glint, a lid over the top fifth whose edge curves a little with the eye, and a small feather ridge hugging
  //    the back of the eye. A longer,
  //    slimmer beak. The body taller and slimmer, the head lifted on a short neck, longer thinner legs. Green-
  //    sheened black, the wing a deep sheen green, with a thin pale edge of light.
  { id: 'bean-scout', name: 'Scout', mood: 'sharp', v: vary(BEAN, {
    col: { base: '#1d292c', shade: '#142023', wing: '#24443f', wsh: '#1c3632', tail: '#182427', legFar: '#0d1516', legNear: '#121c1e', beak: '#33474b', beakLow: '#21302f' },
    edge: { col: '#a9d6ca', w: 1.8, wing: 1.4, tail: 1.2, beak: 1 },
    ground: [4, 52],
    body: [4, -90, 86, 128, 24],
    neck: [20, -134, 34, 40, 14],
    head: [22, -146, 29],
    hs: [2, -14],
    legs: [
      { leg: [18, -44, 7, 40], foot: [28, -5, 24, 7.5], col: 'legFar' },
      { leg: [-8, -42, 8, 40], foot: [2, -4, 26, 8.5], col: 'legNear' },
    ],
    tail: [[-30, -66, 5], [-98, -58, 7], [-90, -26, 7], [-24, -46, 5]],
    wing: [-22, -88, 34, 104, 28],
    beak: { pts: [[34, -159, 2], [114, -146, 5], [36, -133, 2]], split: [34, -146, 114, -145] },
    eye: { x: 25, y: -152, shape: 'box', rx: 7.6, ry: 6.2, ball: '#eef6f3', pupil: { shape: 'ell', col: '#0c1414', dx: 0.3, dy: 0.24, w: 0.7, h: 0.84 }, glint: { dx: 0.15, dy: 0.02, r: 0.16 }, lid: { at: 0.22, sag: -0.6, grow: 1, line: ['#0b1213', 1.1] }, brow: { from: 214, to: 290, gap: 1.9, w: [1.15, 0.45], col: '#36544f' } },
    far: { x: 46, y: -163, shape: 'box', rx: 3.4, ry: 5.8, ball: '#eef6f3', pupil: { shape: 'ell', col: '#0c1414', dx: 0.3, dy: 0.16, w: 0.9, h: 0.96 }, lid: { at: 0.26, grow: 1, line: ['#0b1213', 1.2] } },
  }) },

  // 11 HONEY: warm and attentive. A round white eye with a big ochre iris, a dark pupil and a glint, under a lid
  //    only a quarter of the way down whose edge curves with the eye. Round 9's charcoal body and build, so this is
  //    the one where only the face changes; the wing a lighter blue sheen, the tail a little shorter and rounder.
  { id: 'bean-honey', name: 'Honey', mood: 'warm, attentive', v: vary(BEAN, {
    col: { wing: '#3a4c7c', wsh: '#2f3f6a' },
    tail: [[-30, -64, 6], [-90, -58, 12], [-82, -16, 12], [-24, -40, 6]],
    eye: { x: 24, y: -154, shape: 'box', rx: 8, ry: 8.5, ball: '#ffffff', iris: { col: '#c98d2c', k: 0.78, dx: 0.14, dy: 0.12 }, pupil: { shape: 'ell', col: '#0e0c10', dx: 0.2, dy: 0.14, w: 0.8, h: 0.84 }, glint: { dx: -0.04, dy: -0.12, r: 0.22 }, lid: { at: 0.24, sag: -1.6, grow: 1, line: ['#11131f', 1.4] } },
    far: { x: 48, y: -160, shape: 'box', rx: 3.6, ry: 7.5, ball: '#ffffff', iris: { col: '#c98d2c', k: 0.8, dx: 0.3, dy: 0.12 }, pupil: { shape: 'ell', col: '#0e0c10', dx: 0.34, dy: 0.14, w: 0.9, h: 0.84 }, lid: { at: 0.26, sag: -1, grow: 1, line: ['#11131f', 1.3] } },
  }) },

  // 12 MOON: curious and a little clever. Pale silver eyes, no separate white, in a thin dark ring, a small pupil
  //    looking forward with a glint, a lid barely down; bigger eyes, set a little closer together. A medium beak.
  //    A lighter body: slate, with a darker wing and tail so the shape reads on the wall. The body rounder, the
  //    head bigger, bigger feet.
  { id: 'bean-moon', name: 'Moon', mood: 'curious, clever', v: vary(BEAN, {
    col: { base: '#3d4360', shade: '#2f344f', wing: '#282d48', wsh: '#20253d', tail: '#23283f', legFar: '#141729', legNear: '#1a1d31', beak: '#2c3150', beakLow: '#1f2340' },
    body: [2, -82, 98, 120, 28],
    head: [22, -146, 33],
    hs: [0, 0],
    legs: [
      { leg: [17, -34, 9, 30], foot: [29, -5, 30, 10], col: 'legFar' },
      { leg: [-9, -32, 10, 30], foot: [2, -4, 32, 11], col: 'legNear' },
    ],
    wing: [-24, -82, 40, 96, 32],
    beak: { pts: [[36, -163, 3], [102, -145, 7], [38, -128, 3]], split: [36, -145, 102, -143] },
    face: [40, 6],
    eye: { x: 27, y: -156, shape: 'ell', rx: 7.6, ry: 8.8, ball: '#d7deee', ring: ['#151830', 1.2], pupil: { shape: 'ell', col: '#0c0e1e', dx: 0.22, dy: 0.16, w: 0.8, h: 0.8 }, glint: { dx: 0.04, dy: -0.02, r: 0.15 }, lid: { at: 0.18, sag: -0.8, grow: 1.4, line: ['#151830', 1.2] } },
    far: { x: 49, y: -161, shape: 'ell', rx: 3.8, ry: 7.6, ball: '#d7deee', ring: ['#151830', 1.2], pupil: { shape: 'ell', col: '#0c0e1e', dx: 0.3, dy: 0.1, w: 0.9, h: 0.74 }, lid: { at: 0.16, grow: 1.4 } },
  }) },
];

export const FAMILIES = [
  { id: 'plump', name: 'Plump', crows: PLUMPS.map(k => ({ ...k, draw: g => plumpBird(g, k.v), head: headOf(k.v) })) },
  { id: 'bean', name: 'Bean', crows: BEANS.map(k => ({ ...k, draw: g => beanBird(g, k.v), head: headOf(k.v) })) },
];
export const CROWS = FAMILIES.flatMap(f => f.crows.map(k => ({ ...k, family: f.id })));
// the parts, for later rounds that build on these birds (round 11 swaps the eyes of Button and Bean)
export { PLUMPS, BEANS, plumpBird, beanBird, vary, headOf };
