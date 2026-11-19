// The geometric-glow style (round 13's style 1), lifted out of the gecko so any character can be drawn in it.
// A character is data (cast.js): a palette of tones and a list of parts built from this file's few shapes. This
// file owns everything that makes the style the style:
//
//   the scene     a dark violet room, a small lamp glowing in stepped flat rings to the upper left, a floor line
//   the shapes    discs, half discs, quarter discs, boxes, bars, tapering arcs, bead chains: nothing hand-curved
//   the light     every form gets a broad shadow plane on the side away from the lamp (lower right), in a hue
//                 shifted toward violet, and a thin warm rim on the side toward it (upper left); no outlines
//   the faces     a white disc eye, a dark pupil turned toward the lamp, a lid cut straight across in the skin's
//                 colour; no mouths that grin
//   the floor     a flat dark ellipse under the feet
//
// Units are round 4's and round 13's: a character is drawn from its feet at (0, 0), up is negative y, and the
// gecko stood about 150 units tall.

import { rr, circ, ell, rpoly, segment, tube, limb, trail, union, wedge, PI } from '../../avatar10/js/kit.js';

// ---------- the colours every character shares ----------
export const INK = {
  rim: '#ffe6a6',        // the warm edge of light
  rimW: 1.3,
  white: '#f6f2ff',      // eye whites, a touch violet
  pupil: '#1a1240',      // the darkest colour in the picture; no black
  floorShadow: 'rgba(8,5,30,0.55)',
  lampCore: '#ffd98c', lampHot: '#fff6dc',
};

// ---------- the scene ----------
export const LAMP = { x: 86, y: 92 };   // in CSS pixels on the 414-point picture
export function room(ctx, W, H, fy) {
  ctx.fillStyle = '#1b1446'; ctx.fillRect(0, 0, W, H);
  const { x, y } = LAMP;
  for (const [r, col] of [[150, '#1f1752'], [104, '#251b5e'], [70, '#2e2170'], [44, '#3c2b86'], [26, '#5b42a4']]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fill();
  }
  // the floor cuts the rings off where it starts
  ctx.fillStyle = '#140f36'; ctx.fillRect(0, fy, W, H - fy);
  ctx.fillStyle = '#21185a'; ctx.fillRect(0, fy, W, 5);
  ctx.fillStyle = INK.lampCore; ctx.beginPath(); ctx.arc(x, y, 11, 0, PI * 2); ctx.fill();
  ctx.fillStyle = INK.lampHot; ctx.beginPath(); ctx.arc(x - 2, y - 2, 6, 0, PI * 2); ctx.fill();
}
// a small light a character carries, in its own units: the same stepped rings as the room's lamp, see-through
function bulb(ctx, x, y, r) {
  for (const [k, a] of [[3.2, 0.07], [2.3, 0.11], [1.6, 0.17]]) {
    ctx.fillStyle = `rgba(255,217,140,${a})`; ctx.fill(circ(x, y, r * k));
  }
  ctx.fillStyle = INK.lampCore; ctx.fill(circ(x, y, r));
  ctx.fillStyle = INK.lampHot; ctx.fill(circ(x - r * 0.2, y - r * 0.2, r * 0.55));
}

// ---------- the shapes: the style's whole vocabulary ----------
const deg = a => a * PI / 180;
export const SH = {
  disc: (x, y, r) => circ(x, y, r),
  // a half disc whose round side faces `side` (up, down, left, right); its flat side runs through (x, y)
  half(x, y, r, side = 'up') {
    const a0 = { up: PI, down: 0, left: PI / 2, right: -PI / 2 }[side];
    const p = new Path2D(); p.arc(x, y, r, a0, a0 + PI); p.closePath(); return p;
  },
  // a quarter disc whose round corner faces ul, ur, dl or dr; its square corner sits at (x, y)
  quarter(x, y, r, q = 'ul') {
    const a0 = { ul: PI, ur: PI * 1.5, dr: 0, dl: PI / 2 }[q];
    return wedge(x, y, r, a0, a0 + PI / 2);
  },
  // a box from its top-left corner; r is one radius or [top-left, top-right, bottom-right, bottom-left]
  box: (x, y, w, h, r = 0) => rr(x, y, w, h, r),
  // a box with straight sides that need not be upright (a body narrowing to the shoulders)
  slab: (pts, r = 3) => rpoly(pts, r),
  // a bar of even width between two points, round at both ends
  bar: (x1, y1, x2, y2, r) => tube(x1, y1, x2, y2, r),
  // a bar that tapers from r1 to r2
  taper: (x1, y1, r1, x2, y2, r2) => limb(x1, y1, r1, x2, y2, r2),
  // a stroke along a circle, from angle a0 to a1 in degrees (0 points right, 90 down), its radius going from R0 to
  // R1 (for a curl) and its half-width from w0 to w1, swelling by `bulge` in the middle: necks, tails, curls
  arc(cx, cy, R0, a0, a1, w0, w1, { R1 = R0, bulge = 0, n = 40 } = {}) { return trail(SH.arcPts(cx, cy, R0, a0, a1, w0, w1, { R1, bulge, n })); },
  arcPts(cx, cy, R0, a0, a1, w0, w1, { R1 = R0, bulge = 0, n = 40 } = {}) {
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n, a = deg(a0 + (a1 - a0) * t), R = R0 + (R1 - R0) * t;
      return [cx + R * Math.cos(a), cy + R * Math.sin(a), w0 + (w1 - w0) * t + bulge * Math.sin(PI * t)];
    });
  },
  // a chain of n discs out from (x, y) at angle a (degrees), len long, shrinking from r0 to r1, on a thin bar:
  // gill fronds, feelers, a string of beads
  beads(x, y, a, len, n, r0, r1) {
    const ex = x + Math.cos(deg(a)) * len, ey = y + Math.sin(deg(a)) * len, ps = [tube(x, y, ex, ey, Math.min(r0, r1) * 0.55)];
    for (let i = 1; i <= n; i++) {
      const t = i / n, r = r0 + (r1 - r0) * t;
      ps.push(circ(x + (ex - x) * t, y + (ey - y) * t, r));
    }
    return union(...ps);
  },
  // a ring of n discs of radius r round a disc of radius R: wool, cloud, fluff, all from circles
  puff(cx, cy, R, n, r, a0 = -90) {
    const ps = [circ(cx, cy, R)];
    for (let i = 0; i < n; i++) { const a = deg(a0) + (i / n) * PI * 2; ps.push(circ(cx + Math.cos(a) * R, cy + Math.sin(a) * R, r)); }
    return union(...ps);
  },
  join: (...ps) => union(...ps),
  // a narrow slice of a disc: its point at (x, y), opening toward angle dir (degrees, 0 right, 90 down), span
  // degrees wide, r long. Stood on its point, it's an ear; laid down, a beak or a fin
  slice: (x, y, r, dir, span) => wedge(x, y, r, deg(dir - span / 2), deg(dir + span / 2)),
};

// ---------- painting a character ----------
// a tone is a flat colour '#rrggbb', or [base, shadow] where the shadow is the base shifted toward violet
const tone = (pal, t) => { const v = pal[t] ?? t; return Array.isArray(v) ? v : [v, null]; };
// how far a form's shadow plane reaches, from its width: the gecko's proportions
const planeOf = part => part.pl || [(part.w || 0) * 0.22, (part.w || 0) * 0.07];

// One part of a character:
//   { p: path, t: tone, w: width (sets the shadow plane; 0 = flat), pl: [dx, dy] to set the plane directly,
//     rim: false to leave off the warm edge (on by default for any shaded part),
//     in: [parts drawn inside this one]: markings, a belly, a muzzle. A marking with a shadow tone carries on the
//         shadow plane of the part it sits in, in its own darker colour, so the light stays one light. }
//   { eye: [x, y, r], sx: squash across (a far eye in a turned head), lid: how far down the lid comes, as a
//     fraction of r (0.24 is the gecko's), lidTone, look: [dx, dy] as fractions of r (default: toward the lamp) }
//   { bulb: [x, y, r] }: a small light the character carries
function paint(g, part, ch, parent = null) {
  const c = g.ctx;
  if (part.eye) return eye(g, part, ch);
  if (part.bulb) return bulb(c, ...part.bulb);
  const [base, dark] = tone(ch.pal, part.t);
  c.fillStyle = base; c.fill(part.p);
  if (parent && dark) {
    const [dx, dy] = planeOf(parent);
    if (dx || dy) g.clip(part.p, () => g.plane(parent.p, dark, dx, dy));
  }
  const [dx, dy] = planeOf(part);
  if ((dx || dy) && dark) g.plane(part.p, dark, dx, dy);
  if (part.in) g.clip(part.p, () => part.in.forEach(q => paint(g, q, ch, part)));
  if (!parent && (part.rim ?? !!part.w)) g.rimOn(part.p, INK.rim, INK.rimW);
}

function eye(g, e, ch) {
  const c = g.ctx, [x, y, r] = e.eye, lid = e.lid ?? ch.lid ?? 0.24;
  const lidCol = tone(ch.pal, e.lidTone || ch.lidTone)[0];
  const [lx, ly] = e.look || ch.look || [-0.19, -0.12];
  g.at(x, y, () => {
    const ball = circ(0, 0, r);
    c.fillStyle = INK.white; c.fill(ball);
    g.clip(ball, () => {
      c.fillStyle = INK.pupil; c.fill(circ(lx * r, ly * r, r * 0.45));
      c.fillStyle = lidCol; c.fill(segment(0, 0, r + 1, -r + r * lid, false));
    });
  }, e.sx ?? 1, 0, 1);
}

// the whole character, from its feet at (0, 0). o.noGround leaves out the floor shadow (for measuring).
export function drawCharacter(g, ch, o = {}) {
  if (!o.noGround && ch.ground) {
    const [cx, rx] = ch.ground;
    g.ctx.fillStyle = INK.floorShadow; g.ctx.fill(ell(cx, 1, rx, 4.2));
  }
  for (const part of ch.parts(SH)) paint(g, part, ch);
}
