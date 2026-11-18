// The person, drawn eight ways between and around the two shape styles picked in the fifth round, Blob and
// Noodle. Drawn from its feet at (0, 0), up is negative y.
//
// What never changes, in all eight: the character and the face. Brown skin, copper hair with a fringe swept
// down to the left and a high ponytail out to the right, a plain yellow body, indigo legs, dark shoes. The
// face is the same in every picture, the same size and laid out the same way (the fifth round's Noodle
// face): big eyes glancing a little to the left, the left brow raised a touch higher, an open smile. The
// pose: waving with the hand on the left of the picture, the other arm down. Where the head is its own
// circle it is the same circle in each; where it is the top of a Blob mass it is a little wider, as the
// fifth round's Blob was, and the hair and ponytail grow with it.
//
// What changes is only how the body is built: one soft mass or a head on a body, short nubs that melt out
// of it or long even noodles with round hands and feet. The ponytail is built like the arms: a soft drip
// where the arms are nubs, a soft swoop where they taper, a curl where they are noodles.

import { PI, circ, ell, pd, trail, soft } from './kit.js';
import { FACE } from './face.js';

export const COL = {
  SK: '#c98458', SKD: '#9a5662', NO: '#a65f3e',
  HR: '#ef6233', HRD: '#b63a4d', BR: '#5e1d3c',
  SU: '#ffc84a', SUD: '#e8903f',
  LG: '#4f55b8', LGD: '#363a8f', FT: '#2a2660', MO: '#7a1e3a',
};
const { SK, SKD, NO, HR, HRD, BR, SU, SUD, LG, LGD, FT, MO } = COL;
const LOOK = [-0.9, 0.5];
const R = 30;  // the head's radius where it is its own circle
const RB = 35; // the radius of the top of a Blob mass, where the face sits

// ---------- the head, drawn about its own centre ----------
const HAIR = pd('M-31 4 C-34 -18 -18 -32 2 -32 C22 -32 35 -20 31 0 C27 -14 20 -19 12 -18 C-2 -17 -20 -12 -31 4 Z');
function face(g) {
  const F = FACE.noodle;
  F.eye(g, -11, 4, 15, 20, { look: LOOK });
  F.eye(g, 11, 4, 15, 20, { look: LOOK });
  F.brow(g, -11.5, -13.2, 12, 3.6, -0.16, BR);
  F.brow(g, 11.5, -11, 12, 3.6, 0.1, BR);
  F.nose(g, 0, 16, 3.6, NO);
  F.mouth(g, 0, 22, 18, 8, MO, {});
}
// a curl of even width that rolls round at its end: (cx, cy) its middle, r its size, w its thickness
const curl = (cx, cy, r, w) => {
  const at = t => { const a = (200 - t * 400) * PI / 180, rr = r * (1 - 0.6 * t); return [cx + rr * Math.cos(a) * 1.05, cy + rr * Math.sin(a), w * (1 - 0.52 * t)]; };
  return trail([[14, -22, w], ...Array.from({ length: 22 }, (_, i) => at(i / 21))]);
};
const PONY = {
  // a soft drip from the crown, for the bodies whose arms are nubs
  drip: g => g.form(pd('M8 -30 C14 -54 46 -60 55 -40 C61 -25 55 -8 45 -2 C49 -16 45 -30 30 -30 C22 -30 17 -26 14 -20 Z'), HR, { dark: HRD, w: 30 }),
  // a thick swoop that tapers to a soft point, for limbs that taper
  swoop: g => g.form(soft([[10, -26, 9], [26, -42, 9.5], [44, -44, 8.5], [56, -34, 7], [60, -18, 5.5], [57, -6, 4]]), HR, { dark: HRD, w: 22 }),
  // the noodle curl, thin, thick and long
  curl: g => g.form(curl(40, -32, 20, 6.5), HR, { dark: HRD, w: 14 }),
  fat: g => g.form(curl(41, -33, 21, 8.5), HR, { dark: HRD, w: 17 }),
  long: g => g.form(curl(46, -40, 25, 6), HR, { dark: HRD, w: 14 }),
};
// behind the head: the ponytail and the ears
// (r: the head's radius; the hair and ponytail are drawn for R and grow to fit a wider head, the face doesn't)
function headBack(g, hy, pony, r = R) {
  g.at(0, hy, () => PONY[pony](g), r / R);
  g.at(0, hy, () => { for (const k of [-1, 1]) g.form(ell(k * (r - 1), 4, 6, 7.5), SK, { dark: SKD, w: 12 }); });
}
// the head itself (unless the body's own mass is the head), the hair and the face
function headFront(g, hy, skin = true, r = R) {
  g.at(0, hy, () => {
    if (skin) g.form(circ(0, 0, r), SK, { dark: SKD, w: 44 });
    g.at(0, 0, () => g.form(HAIR, HR, { dark: HRD, w: 46 }), r / R);
    face(g);
  });
}

// ---------- shared shapes ----------
// the Blob mass: the top of a circle round the face, then sides that flare out to the hips and round under.
// hy: the face's centre, bottom: the lowest point, hip: the half-width at the hips
function blobMass(hy, bottom, hip) {
  const R = RB, h = bottom - hy, p = new Path2D();
  p.moveTo(-R, hy);
  p.arc(0, hy, R, PI, 0);
  p.bezierCurveTo(R, hy + h * 0.17, R + 4, hy + h * 0.3, R + 7, hy + h * 0.42);
  p.bezierCurveTo(hip - 5, hy + h * 0.58, hip + 1, hy + h * 0.7, hip, hy + h * 0.83);
  p.bezierCurveTo(hip - 1, bottom - 2, hip * 0.65, bottom, 0, bottom);
  p.bezierCurveTo(-hip * 0.65, bottom, -(hip - 1), bottom - 2, -hip, hy + h * 0.83);
  p.bezierCurveTo(-(hip + 1), hy + h * 0.7, -(hip - 5), hy + h * 0.58, -(R + 7), hy + h * 0.42);
  p.bezierCurveTo(-(R + 4), hy + h * 0.3, -R, hy + h * 0.17, -R, hy);
  p.closePath();
  return p;
}
// everything below the soft curve under the chin, where the skin gives way to the yellow
const belowChin = hy => pd(`M-90 ${hy + 26} C-30 ${hy + 40} 30 ${hy + 40} 90 ${hy + 26} L90 20 L-90 20 Z`);
const below = y => pd(`M-90 ${y} L90 ${y} L90 20 L-90 20 Z`);
// a leg that tapers from the body to a rounded foot, the foot part in the shoe colour
function softLeg(g, pts, foot) {
  const leg = soft(pts), shoe = ell(...foot);
  g.form(leg, LG, { dark: LGD, w: 22 });
  g.form(shoe, LG);
  g.clip(below(foot[1] - foot[3] * 0.9), () => { g.fill(leg, FT); g.fill(shoe, FT); });
}
// a noodle limb: a stroke of even width
const noodle = (g, d, col, w) => g.line(pd(d), col, w);
const shoe = (g, x, y, rx, ry, k) => g.at(x, y, () => g.fill(ell(0, 0, rx, ry), FT), 1, k * 0.12);
const hand = (g, x, y, r) => g.form(circ(x, y, r), SK, { dark: SKD, w: r * 2 });

// =====================================================================
// 1. Softer: past Blob. Head, body and legs are one outline; the legs are only a soft notch at the
// bottom, the arms small bumps.
function softer(g) {
  const hy = -122;
  g.ground(42, 'pill');
  g.form(soft([[34, -76, 9.5], [43, -62, 8]]), SU, { dark: SUD, w: 18 });
  g.form(ell(44, -56, 8, 9), SK, { dark: SKD, w: 16 });
  g.form(soft([[-34, -84, 9.5], [-44, -97, 8]]), SU, { dark: SUD, w: 18 });
  g.form(ell(-46, -103, 8, 9), SK, { dark: SKD, w: 16 });
  headBack(g, hy, 'drip', RB);
  const p = new Path2D();
  p.moveTo(-RB, hy); p.arc(0, hy, RB, PI, 0);
  const side = [[RB, hy + 18, RB + 3, hy + 30, RB + 6, hy + 42], [45, -66, 49, -50, 48, -34], [47, -20, 42, -9, 38, -5],
    [40, 0, 30, 1.5, 21, 0.5], [11, -0.5, 6, -2, 4, -8], [3, -12, 1.5, -15, 0, -16]];
  for (const c of side) p.bezierCurveTo(...c);
  const back = [[-1.5, -15, -3, -12, -4, -8], [-6, -2, -11, -0.5, -21, 0.5], [-30, 1.5, -40, 0, -38, -5],
    [-42, -9, -47, -20, -48, -34], [-49, -50, -45, -66, -(RB + 6), hy + 42], [-(RB + 3), hy + 30, -RB, hy + 18, -RB, hy]];
  for (const c of back) p.bezierCurveTo(...c);
  p.closePath();
  g.form(p, SK, { dark: SKD, w: 56 });
  g.clip(belowChin(hy), () => g.form(p, SU, { dark: SUD, w: 56 }));
  g.clip(pd('M-90 -42 C-30 -33 30 -33 90 -42 L90 20 L-90 20 Z'), () => g.form(p, LG, { dark: LGD, w: 56 }));
  g.clip(below(-8), () => g.fill(p, FT));
  headFront(g, hy, false, RB);
}

// =====================================================================
// 2. Blob, as picked: one soft mass from the top of the head to the hips; nubs for arms; the legs two
// lumps under it.
function blob(g) {
  const hy = -128;
  g.ground(40, 'pill');
  for (const k of [-1, 1]) {
    const leg = pd(`M${k * 4} -30 C${k * 3} -16 ${k * 3} -8 ${k * 6} -3 Q${k * 17} 2.5 ${k * 28} -2 C${k * 32} -6 ${k * 27} -14 ${k * 27} -30 Z`);
    g.form(leg, LG, { dark: LGD, w: 24 });
    g.clip(leg, () => g.form(ell(k * 17, -1, 16, 8.5), FT));
  }
  g.form(soft([[30, -76, 11], [41, -60, 9], [43, -50, 8.5]]), SU, { dark: SUD, w: 20 });
  g.form(ell(44, -45, 9, 9.5), SK, { dark: SKD, w: 16 });
  g.form(soft([[-30, -84, 11], [-44, -98, 9], [-48, -112, 8.5]]), SU, { dark: SUD, w: 20 });
  g.form(ell(-49, -119, 9, 10.5), SK, { dark: SKD, w: 16 });
  headBack(g, hy, 'drip', RB);
  const mass = blobMass(hy, -24, 46);
  g.form(mass, SK, { dark: SKD, w: 56 });
  g.clip(belowChin(hy), () => g.form(mass, SU, { dark: SUD, w: 56 }));
  headFront(g, hy, false, RB);
}

// =====================================================================
// 3. Blob, longer limbs: the same mass, but the nubs grow into long soft arms and legs that taper from
// where they melt out of it.
function longer(g) {
  const hy = -140;
  g.ground(38, 'pill');
  for (const k of [-1, 1]) softLeg(g, [[k * 15, -50, 13], [k * 15, -27, 10], [k * 17, -10, 8.5]], [k * 20, -5.5, 12.5, 6.5]);
  g.form(soft([[30, -90, 11], [42, -72, 9], [47, -53, 7.5], [48, -43, 7]]), SU, { dark: SUD, w: 18 });
  g.form(ell(48, -37, 8.5, 9.5), SK, { dark: SKD, w: 16 });
  g.form(soft([[-30, -98, 11], [-44, -113, 9], [-52, -132, 7.5], [-53, -143, 7]]), SU, { dark: SUD, w: 18 });
  g.form(ell(-53, -150, 8.5, 10), SK, { dark: SKD, w: 16 });
  headBack(g, hy, 'drip', RB);
  const mass = blobMass(hy, -42, 44);
  g.form(mass, SK, { dark: SKD, w: 56 });
  g.clip(belowChin(hy), () => g.form(mass, SU, { dark: SUD, w: 56 }));
  headFront(g, hy, false, RB);
}

// =====================================================================
// 4. Blob body, Noodle limbs: a shorter Blob mass on thin even noodle legs, noodle arms, round hands, big
// oval shoes.
function blobnoodle(g) {
  const hy = -140;
  g.ground(34, 'pill');
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 13} -66 C${k * 12} -40 ${k * 21} -30 ${k * 16} -9`, LG, 8);
    shoe(g, k * 21, -5.5, 12.5, 6.5, k);
  }
  noodle(g, 'M34 -96 C50 -90 42 -70 48 -60', SU, 7);
  hand(g, 49, -55, 8);
  noodle(g, 'M-34 -102 C-54 -102 -62 -114 -59 -134', SU, 7);
  hand(g, -59, -140, 8.5);
  headBack(g, hy, 'curl', RB);
  const mass = blobMass(hy, -60, 41);
  g.form(mass, SK, { dark: SKD, w: 52 });
  g.clip(belowChin(hy), () => g.form(mass, SU, { dark: SUD, w: 52 }));
  headFront(g, hy, false, RB);
}

// =====================================================================
// 5. Noodle body, Blob softness: a head on its own small body, but the body is a soft pear the head sinks
// into, and the arms and legs taper out of it as one piece, like a Blob's nubs drawn long.
function softnoodle(g) {
  const hy = -130;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) softLeg(g, [[k * 11, -56, 11.5], [k * 12, -31, 8.5], [k * 15, -10, 6.5]], [k * 19, -5.5, 11.5, 6.5]);
  g.form(soft([[18, -88, 10.5], [30, -76, 7.5], [34, -60, 6]]), SU, { dark: SUD, w: 16 });
  g.form(ell(35, -54, 8, 9), SK, { dark: SKD, w: 16 });
  g.form(soft([[-18, -92, 10.5], [-33, -102, 7.5], [-42, -118, 6], [-43, -125, 6]]), SU, { dark: SUD, w: 16 });
  g.form(ell(-43, -131, 8, 9.5), SK, { dark: SKD, w: 16 });
  const body = pd('M0 -108 C18 -108 26 -94 28 -80 C31 -64 30 -48 0 -46 C-30 -48 -31 -64 -28 -80 C-26 -94 -18 -108 0 -108 Z');
  g.form(body, SU, { dark: SUD, w: 52 });
  headBack(g, hy, 'swoop');
  headFront(g, hy);
}

// =====================================================================
// 6. Noodle, rounder: a bigger round body, thick short noodles, big hands and shoes.
function rounder(g) {
  const hy = -128;
  g.ground(36, 'pill');
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 11} -54 C${k * 10} -38 ${k * 18} -29 ${k * 15} -11`, LG, 11.5);
    shoe(g, k * 20, -6.5, 14.5, 8, k);
  }
  noodle(g, 'M20 -86 C36 -80 30 -64 38 -56', SU, 10);
  hand(g, 39, -51, 10);
  g.form(circ(0, -74, 29), SU, { dark: SUD, w: 58 });
  noodle(g, 'M-20 -90 C-42 -90 -50 -102 -48 -120', SU, 10);
  hand(g, -48, -127, 10.5);
  headBack(g, hy, 'fat');
  headFront(g, hy);
}

// =====================================================================
// 7. Noodle, as picked: a small round body and head, long bendy limbs of even width, round hands, big feet.
function noodlePure(g) {
  const hy = -128;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 8} -54 C${k * 7} -34 ${k * 17} -26 ${k * 13} -8`, LG, 8);
    shoe(g, k * 18, -5.5, 12.5, 6.5, k);
  }
  noodle(g, 'M16 -90 C32 -84 24 -66 33 -57', SU, 7);
  hand(g, 34, -53, 8);
  g.form(pd('M0 -100 C14 -100 24 -88 24 -73 C24 -57 15 -49 0 -49 C-15 -49 -24 -57 -24 -73 C-24 -88 -14 -100 0 -100 Z'), SU, { dark: SUD, w: 48 });
  noodle(g, 'M-16 -90 C-36 -90 -46 -102 -43 -122', SU, 7);
  hand(g, -43, -128, 8.5);
  headBack(g, hy, 'curl');
  headFront(g, hy);
}

// =====================================================================
// 8. Bendier: past Noodle. A smaller body, longer and thinner limbs that bend twice, a longer curl.
function bendier(g) {
  const hy = -152;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 7} -88 C${k * 9} -64 ${k * 24} -56 ${k * 18} -36 C${k * 14} -24 ${k * 16} -15 ${k * 14} -8`, LG, 6.5);
    shoe(g, k * 19, -5.5, 12, 6, k);
  }
  noodle(g, 'M15 -114 C34 -110 26 -90 38 -80 C46 -72 40 -62 44 -55', SU, 6);
  hand(g, 44, -50, 7.5);
  g.form(pd('M0 -128 C12 -128 20 -118 20 -105 C20 -91 12 -84 0 -84 C-12 -84 -20 -91 -20 -105 C-20 -118 -12 -128 0 -128 Z'), SU, { dark: SUD, w: 40 });
  noodle(g, 'M-15 -118 C-36 -120 -34 -138 -48 -146 C-60 -152 -61 -166 -57 -176', SU, 6);
  hand(g, -57, -182, 8);
  headBack(g, hy, 'long');
  headFront(g, hy);
}

export const PEOPLE = [
  { id: 'softer', name: 'Softer', text: 'Past Blob: head, body and legs one outline, the legs only a notch, the arms small bumps.' },
  { id: 'blob', name: 'Blob', text: 'Blob as you picked it: one soft mass, nubs for arms, two lumps for legs.' },
  { id: 'longer', name: 'Long nubs', text: 'The Blob mass, its nubs grown into long soft arms and legs that taper out of it.' },
  { id: 'blobnoodle', name: 'Blob + noodles', text: 'A Blob body on thin noodle legs, with noodle arms, round hands and big shoes.' },
  { id: 'softnoodle', name: 'Soft noodle', text: 'A head on its own soft pear body, arms and legs tapering out of it as one piece.' },
  { id: 'rounder', name: 'Round noodle', text: 'Noodle with a bigger round body, thick short limbs, big hands and shoes.' },
  { id: 'noodle', name: 'Noodle', text: 'Noodle as you picked it: small round body, long bendy limbs of even width.' },
  { id: 'bendier', name: 'Bendier', text: 'Past Noodle: a smaller body, longer thinner limbs that bend twice.' },
];
export const PERSON = { softer, blob, longer, blobnoodle, softnoodle, rounder, noodle: noodlePure, bendier };
