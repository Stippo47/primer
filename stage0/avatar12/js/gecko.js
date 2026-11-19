// The gecko on the style dial. One drawing, gecko(g, s): at s = 0 it is round 4's gecko to the number
// (../../avatar4/js/cast.js), and as s rises the style moves toward grown-up editorial flat vector. The pose never
// changes: standing square on, arms out and down, the tail curled up behind on the right.
//
// What the dial moves, from 0 to 1:
//   proportion   the head shrinks from 82 wide to 62 and flattens; the body and legs grow longer and slimmer
//   head         a soft rounded box, then (from the middle) a broad, flat, six-sided gecko head, widest at the eyes
//   eyes         big white boxes with a pill pupil and a glint, close together, slide out to the sides of the head,
//                shrink, lose the glint and the white, and end as amber eyes with an upright slit and a calm lid,
//                set in a small bulge that breaks the head's outline
//   mouth        the wide grin flattens into a long, almost straight gecko mouth line
//   hands, feet  round mittens and pill feet grow splayed toes with round pads
//   tail         the tight spiral loosens into one broad curl, thicker at the root
//   markings     two orange dots become dark bands across the tail and a few spots on the crown
//   colour       mint, lemon and orange move to a restrained sage, bone and ochre, with one dark for marks
//   shading      a broad band that follows each outline narrows, and from three quarters on is a straight cut
//   floor        the flat pill shadow becomes a thin flat ellipse
//
// Drawn from its feet at (0, 0), up is negative y, in round 4's units.

import { rr, pill, circ, ell, rpoly, pd, union, tube, limb, trail } from '../../avatar10/js/kit.js';
import { dial, ramp } from './dial.js';

const PI = Math.PI;

export function gecko(g, s) {
  const d = dial(s), c = g.ctx;

  // ---- colour: round 4's at 0, restrained at 1 ----
  const C = d.c('#4fd68a', '#7aa98f');     // body
  const CD = d.c('#2a8fae', '#4f8076');    // its shadow
  const B = d.c('#eaff9e', '#e6dec4');     // belly
  const BD = d.c('#a8dc8a', '#c4b995');    // belly in shadow
  const DK = d.c('#1f5a6e', '#22393a');    // mouth line, marks
  const HD = d.c('#7ef0a8', '#7aa98f');    // hands: lighter at first, the body's own colour at the end
  const FT = d.c('#2a8fae', '#4f8076');    // feet
  const MK = d.ca('#ff9a3d', '#2f4f4a', ramp(s, 0.2, 0.6));   // markings: orange dots, then dark bands
  const EYE = '#e2a646';                   // the amber eye, at the grown-up end

  // ---- shading: a band following the outline (round 4's, narrowing), then a straight cut ----
  const CUT = s >= 0.7;
  const band = d.at(0.5, 0.26, ramp(s, 0, 0.5));
  // fill p in base, its shadow in dark; w the form's width, cx its middle (for the cut)
  const form = (p, base, dark, w, cx = 0) => {
    c.fillStyle = base; c.fill(p);
    if (!dark) return;
    if (CUT) g.clip(p, () => { c.fillStyle = dark; c.fill(rr(cx + w * 0.17, -2000, 4000, 4000, 0)); });
    else { const k = w * band; g.plane(p, dark, k * 0.42, k * 0.16); }
  };

  // ---- the floor ----
  if (!g.noGround) {
    if (s < 0.5) g.ground(36, 'pill');
    else g.ground(d(36, 44), 'ellipse', '#0a0830', 0.3, d(9, 6));
  }

  // ---- proportions ----
  const bodyTop = d(-98, -118), bodyBot = d(-26, -44);
  const sh = d(18, 13), hip = d(22, 16);
  const headTop = d(-144, -150), headBot = d(-92, -114), hw = d(41, 31);

  // ---- feet, then legs ----
  const toes = ramp(s, 0.25, 1);            // how far the toes have grown, 0 to 1
  for (const k of [-1, 1]) {
    const fx = s === 0 ? (k < 0 ? -13 : 12) : k * d(12.5, 13);
    if (toes <= 0) g.fill(pill(fx, -3.4, d(21, 9), 7.4), FT);
    else foot(g, fx, -3.6, k, toes, d, FT);
  }
  // ---- the tail: a spiral that thins as it winds in, loosening into one broad curl ----
  const tcx = d(42, 47), tcy = d(-44, -56), R0 = d(30, 32), shrink = d(21, 18), sweep = d(350, 215);
  const a0 = d(148, 152), r0 = d(9, 10.5), rTip = d(2.5, 1.4);
  const at = t => {
    const a = (a0 - t * sweep) * PI / 180, R = R0 - shrink * t;
    return [tcx + R * Math.cos(a), tcy + R * Math.sin(a), r0 - (r0 - rTip) * t];
  };
  const tail = trail(Array.from({ length: 29 }, (_, i) => at(i / 28)));
  if (CUT) {
    // a cut doesn't suit a curl: its shadow is the inside of the curl, a band on the side away from the light
    c.fillStyle = C; c.fill(tail);
    g.plane(tail, CD, 4.2, 1.6);
  } else form(tail, C, CD, 30);
  marks(g, tail, at, s, MK);

  for (const k of [-1, 1]) {
    const x0 = k * d(10, 9), y0 = d(-32, -46);
    form(tube(x0, y0, k * 12, d(-12, -7), d(5.2, 3.6)), C, CD, 11, x0);
  }

  // ---- the body, its belly ----
  const body = rpoly([[-sh, bodyTop], [sh, bodyTop], [hip, bodyBot], [-hip, bodyBot]], d(15, 6));
  form(body, C, CD, 44);
  const by = (bodyTop + bodyBot) / 2 + d(4, 2);
  // as round 4: the belly is the body's own shape seen through a pill, so the body's shadow runs on through it
  g.clip(pill(d(-1, 0), by, d(22, 12), d(56, 60)), () => form(body, B, BD, 44));

  // ---- arms and hands: the same angle all the way, a little longer and thinner ----
  for (const k of [-1, 1]) {
    const x0 = k * d(16, 11.5), y0 = bodyTop + d(12, 8), L = d(1, 1.18);
    const x1 = x0 + k * 12 * L, y1 = y0 + 22 * L;
    form(tube(x0, y0, x1, y1, d(4.6, 2.9)), C, CD, 10, x0);
    hand(g, x1, y1, k, toes, d, HD);
  }

  // ---- the head ----
  let head;
  if (s < 0.5) head = rr(-hw, headTop, hw * 2, headBot - headTop, d(24, 7));
  else {
    // broad and flat, widest at the eyes, a narrower crown and jaw; sharper corners as the dial rises
    const ey = headTop + (headBot - headTop) * 0.38, crown = hw * d(1.15, 0.64), jaw = hw * d(1.1, 0.8);
    head = rpoly([[-crown, headTop], [crown, headTop], [hw, ey], [jaw, headBot], [-jaw, headBot], [-hw, ey]], d(20, 7));
  }
  // the eyes sit in small bulges at the sides, which grow out of the head's outline
  const ex = d(12, 24.5), ey = headTop + (headBot - headTop) * d(22 / 52, 0.37);
  const ew = d(21, 12.5), eh = d(23, 12.5), bulge = ramp(s, 0.4, 1);
  if (bulge > 0) head = union(head, circ(-ex, ey, ew / 2 + 3.4 * bulge), circ(ex, ey, ew / 2 + 3.4 * bulge));
  form(head, C, CD, 82);

  // crown spots, from the middle of the dial on
  const sp = ramp(s, 0.45, 0.9);
  if (sp > 0) {
    g.clip(head, () => {
      for (const [x, y, r] of [[-9, 6.5, 2.2], [0, 4.6, 1.9], [9, 6.5, 2.2], [-4.5, 11, 1.4], [4.5, 11, 1.4]]) {
        c.fillStyle = MK; c.globalAlpha = sp; c.fill(circ(x * hw / 31, headTop + y, r * sp)); c.globalAlpha = 1;
      }
    });
  }

  for (const k of [-1, 1]) eye(g, k * ex, ey, ew, eh, k, s, d, { C, EYE });

  // nostrils, from the middle on
  const nos = ramp(s, 0.4, 0.7);
  if (nos > 0) for (const k of [-1, 1]) g.fill(ell(k * 4.6, ey + d(7, 6.5), 1.3 * nos, 0.9 * nos), DK);

  // the mouth: round 4's grin, flattening into a long gecko mouth line
  const my = headBot - d(13, 6.5), mw = d(28, 23), sag = d(12, 2.2);
  g.line(pd(`M${-mw} ${my} Q0 ${my + sag} ${mw} ${my}`), DK, d(2.6, 1.6));
}

// an eye: round 4's white rounded box with a pill pupil and a glint (dEye), moving to an amber eye with an upright
// slit and a lid
function eye(g, x, y, w, h, k, s, d, { C, EYE }) {
  const c = g.ctx;
  const amber = ramp(s, 0.25, 0.6);
  const shape = rr(x - w / 2, y - h / 2, w, h, Math.min(w, h) * d(0.46, 0.5));
  g.fill(shape, d.ca('#ffffff', EYE, amber));
  // the pupil: round 4 looks a little left and down; the slit looks ahead
  const look = 1 - ramp(s, 0, 0.6);
  const px = x - 0.8 * look, py = y + 0.8 * look + h * 0.05 * look;
  const PW = w * d(0.44, 0.17), PH = h * d(0.6, 0.86);
  g.clip(shape, () => {
    g.fill(pill(px, py, PW, PH), d.c('#2b2b3f', '#1d1a16'));
    const gl = 1 - ramp(s, 0, 0.5);
    if (gl > 0.01) g.fill(circ(px - PW * 0.08, py - PH * 0.22, PW * 0.24 * (0.5 + 0.5 * gl)), '#ffffff');
  });
  // a lid from the top, in the body's colour, from the middle on: calm, not sleepy
  const lid = ramp(s, 0.35, 1);
  if (lid > 0) {
    const edge = y - h / 2 + h * 0.3 * lid;
    g.clip(shape, () => {
      c.fillStyle = C; c.fillRect(x - w, y - h, w * 2, edge - (y - h));
      g.line(pd(`M${x - w / 2} ${edge} L${x + w / 2} ${edge}`), '#22393a', 1.1 * lid);
    });
  }
}

// a hand: round 4's round mitten, which grows four splayed toes with round pads as t goes 0 to 1
function hand(g, x, y, k, t, d, col) {
  if (t <= 0) { g.fill(circ(x + k * 1, y + 3, 6), col); return; }
  const r = d(6, 2.8), cx = x + k * d(1, 0.4), cy = y + d(3, 1.4);
  const parts = [circ(cx, cy, r)];
  // toes fan round the arm's own direction (out and down)
  const base = Math.atan2(22, k * 12);
  for (const da of [-56, -19, 19, 56]) {
    const a = base + da * PI / 180, L = 6.2 * t, tx = cx + Math.cos(a) * (r + L), ty = cy + Math.sin(a) * (r + L);
    parts.push(limb(cx, cy, 1.25, tx, ty, 1.05), circ(tx, ty, 1.15 + 0.85 * t));
  }
  g.fill(union(...parts), col);
}

// a foot: round 4's pill, turning into a small sole with four toes splayed out to the side and toward us
function foot(g, x, y, k, t, d, col) {
  const parts = [ell(x, y, d(10.5, 4.6), 3.6)];
  for (const da of [-14, 18, 52, 100]) {
    // angles measured out from the foot's own side: 0 points straight out, 90 at the viewer (down the page);
    // the floor squashes the reach toward the viewer
    const a = (k > 0 ? da : 180 - da) * PI / 180, L = 8.5 * t;
    const tx = x + Math.cos(a) * (3.6 + L), ty = y + Math.sin(a) * (2.4 + L) * 0.42;
    parts.push(limb(x, y, 1.5, tx, ty, 1.2), circ(tx, ty, 1.3 + 0.9 * t));
  }
  g.fill(union(...parts), col);
}

// the tail's markings: round 4's two orange dots, more dots, then dark bands across it
function marks(g, tail, at, s, col) {
  const c = g.ctx;
  g.clip(tail, () => {
    if (s < 0.5) {
      const ts = s === 0 ? [0.2, 0.5] : [0.16, 0.38, 0.6];
      for (const t of ts) { const [x, y, r] = at(t); g.fill(circ(x, y, r * 0.42), col); }
      return;
    }
    const wk = ramp(s, 0.5, 1);
    for (const t of [0.17, 0.35, 0.52, 0.67, 0.8]) {
      const [x, y, r] = at(t), [x2, y2] = at(t + 0.01), a = Math.atan2(y2 - y, x2 - x);
      c.save(); c.translate(x, y); c.rotate(a);
      c.fillStyle = col; c.fillRect(-r * (0.25 + 0.09 * wk), -r - 3, r * (0.5 + 0.18 * wk), r * 2 + 6);
      c.restore();
    }
  });
}
