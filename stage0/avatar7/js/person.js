// The person of the sixth round, from the front and, new here, from the side. Drawn from the feet at (0, 0),
// up is negative y. Brown skin, copper hair with a fringe and a high ponytail, a plain yellow body, indigo
// legs, dark shoes.
//
// From the front (copied from ../avatar6/js/person.js, with the face made swappable):
//   blobnoodle  the Blob body on noodle legs, the build the ten faces are drawn on
//   blob, noodle  the two picked styles, for the side lineup's front row
//
// From the side, facing left, so the face stays on the lit side (the light is from the top left):
//   one eye; the nose and the chin in the outline; the ear in the middle of the head; the hair a cap over the
//   top and back with the fringe at the front; the ponytail off the back of the crown. The near arm and leg
//   are in front, the far ones behind, a shade darker, peeking out where the body doesn't cover them.
//   The feet point forward.

import { PI, circ, ell, pd, trail, soft, union, mixHex } from './kit.js';
import { FACES, PROFILE } from './face.js';

export const COL = {
  SK: '#c98458', SKD: '#9a5662', NO: '#a65f3e',
  HR: '#ef6233', HRD: '#b63a4d', BR: '#5e1d3c',
  SU: '#ffc84a', SUD: '#e8903f',
  LG: '#4f55b8', LGD: '#363a8f', FT: '#2a2660', FTD: '#15122f', MO: '#7a1e3a',
};
const { SK, SKD, HR, HRD, SU, SUD, LG, LGD, FT, FTD } = COL;
const R = 30;  // the head's radius where it is its own circle
const RB = 35; // the radius of the top of a Blob body, where the face sits

// ---------- shared pieces ----------
const noodle = (g, d, col, w) => g.line(pd(d), col, w);
const shoe = (g, x, y, rx, ry, rot, col = FT) => g.at(x, y, () => g.fill(ell(0, 0, rx, ry), col), 1, rot);
const hand = (g, x, y, r, col = SK, dark = SKD) => g.form(circ(x, y, r), col, dark ? { dark, w: r * 2 } : {});
// a curl of even width that rolls round at its end: (cx, cy) its middle, r its size, w its thickness,
// starting from (sx, sy)
const curl = (cx, cy, r, w, sx = 14, sy = -22) => {
  const at = t => { const a = (200 - t * 400) * PI / 180, rr = r * (1 - 0.6 * t); return [cx + rr * Math.cos(a) * 1.05, cy + rr * Math.sin(a), w * (1 - 0.52 * t)]; };
  return trail([[sx, sy, w], ...Array.from({ length: 22 }, (_, i) => at(i / 21))]);
};

// =====================================================================
// FRONT
const HAIR = pd('M-31 4 C-34 -18 -18 -32 2 -32 C22 -32 35 -20 31 0 C27 -14 20 -19 12 -18 C-2 -17 -20 -12 -31 4 Z');
const PONY = {
  drip: g => g.form(pd('M8 -30 C14 -54 46 -60 55 -40 C61 -25 55 -8 45 -2 C49 -16 45 -30 30 -30 C22 -30 17 -26 14 -20 Z'), HR, { dark: HRD, w: 30 }),
  curl: g => g.form(curl(40, -32, 20, 6.5), HR, { dark: HRD, w: 14 }),
};
function headBack(g, hy, pony, r = R) {
  g.at(0, hy, () => PONY[pony](g), r / R);
  g.at(0, hy, () => { for (const k of [-1, 1]) g.form(ell(k * (r - 1), 4, 6, 7.5), SK, { dark: SKD, w: 12 }); });
}
function headFront(g, hy, face, skin = true, r = R) {
  g.at(0, hy, () => {
    if (skin) g.form(circ(0, 0, r), SK, { dark: SKD, w: 44 });
    g.at(0, 0, () => g.form(HAIR, HR, { dark: HRD, w: 46 }), r / R);
    FACES[face](g);
  });
}
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
const belowChin = hy => pd(`M-90 ${hy + 26} C-30 ${hy + 40} 30 ${hy + 40} 90 ${hy + 26} L90 20 L-90 20 Z`);

// the Blob body on noodle legs: the build the ten faces are drawn on (the sixth round's 4)
export function frontBlobnoodle(g, face = 'calm') {
  const hy = -140;
  g.ground(34, 'pill');
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 13} -66 C${k * 12} -40 ${k * 21} -30 ${k * 16} -9`, LG, 8);
    shoe(g, k * 21, -5.5, 12.5, 6.5, k * 0.12);
  }
  noodle(g, 'M34 -96 C50 -90 42 -70 48 -60', SU, 7);
  hand(g, 49, -55, 8);
  noodle(g, 'M-34 -102 C-54 -102 -62 -114 -59 -134', SU, 7);
  hand(g, -59, -140, 8.5);
  headBack(g, hy, 'curl', RB);
  const mass = blobMass(hy, -60, 41);
  g.form(mass, SK, { dark: SKD, w: 52 });
  g.clip(belowChin(hy), () => g.form(mass, SU, { dark: SUD, w: 52 }));
  headFront(g, hy, face, false, RB);
}
// Blob, as picked in the fifth round (the sixth round's 2)
export function frontBlob(g, face = 'calm') {
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
  headFront(g, hy, face, false, RB);
}
// Noodle, as picked in the fifth round (the sixth round's 7)
export function frontNoodle(g, face = 'calm') {
  const hy = -128;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 8} -54 C${k * 7} -34 ${k * 17} -26 ${k * 13} -8`, LG, 8);
    shoe(g, k * 18, -5.5, 12.5, 6.5, k * 0.12);
  }
  noodle(g, 'M16 -90 C32 -84 24 -66 33 -57', SU, 7);
  hand(g, 34, -53, 8);
  g.form(pd('M0 -100 C14 -100 24 -88 24 -73 C24 -57 15 -49 0 -49 C-15 -49 -24 -57 -24 -73 C-24 -88 -14 -100 0 -100 Z'), SU, { dark: SUD, w: 48 });
  noodle(g, 'M-16 -90 C-36 -90 -46 -102 -43 -122', SU, 7);
  hand(g, -43, -128, 8.5);
  headBack(g, hy, 'curl');
  headFront(g, hy, face);
}

// =====================================================================
// SIDE
// The head from the side, about its own centre, for a head of radius R; a Blob head is drawn at RB/R.
// Facing left. The front of the face is at x = -R.
//
// The hair: a cap over the top and the back, down to the nape, with its edge running up behind the ear and
// forward over it to a fringe that tips down over the forehead.
const HAIR_SIDE = pd('M-32 -11 C-35 -24 -21 -33.5 -1 -33 C17 -32.5 31.5 -21 31.8 -5 C32 4 29 11 24 15.5 ' +
  'C17 13 11 9 10 2 C9 -5 4 -10 -3 -11 C-12 -12 -20 -10 -26 -5 C-28 -7 -30 -9 -32 -11 Z');
// the ponytail off the back of the crown, as a curl or a drip (for nubs)
const PONY_SIDE = {
  curl: g => g.form(curl(47, -30, 19, 6.5, 24, -24), HR, { dark: HRD, w: 14 }),
  drip: g => g.form(pd('M16 -28 C22 -52 54 -58 63 -38 C69 -23 63 -6 53 0 C57 -14 53 -28 38 -28 C30 -28 25 -24 22 -18 Z'), HR, { dark: HRD, w: 30 }),
};
const EAR_SIDE = g => {
  g.form(ell(4, 3.5, 5.6, 7.6), SK, { dark: SKD, w: 12 });
  g.fill(ell(3.2, 4, 2.2, 3.8), SKD);
};
// A near arm that lies over a body of its own colour would vanish into it, so near limbs are a touch lighter
// (shifted towards the light's warm white) and far limbs a touch darker. Both are flat colours.
export const nearTint = col => mixHex(col, '#fff3d6', 0.3);
const SUN = nearTint(SU);

// The head of the Noodle builds: a circle with a soft jaw at the front and the nose in the outline.
const headSide = () => union(circ(0, 0, R), ell(-13, 8.5, 17.5, 18.6), circ(-30.2, 9.5, 4.6));
function noodleHeadSide(g, hx, hy, face, pony = 'curl') {
  g.at(hx, hy, () => {
    PONY_SIDE[pony](g);
    g.form(headSide(), SK, { dark: SKD, w: 44 });
    g.form(HAIR_SIDE, HR, { dark: HRD, w: 46 });
    EAR_SIDE(g);
    PROFILE[face](g, -30, 0);
  });
}

// The Blob body from the side: the top of a circle round the face, the front falling almost straight from
// the face, a soft belly, and a rounder back. hy: the face's centre, bottom: the lowest point; front and
// back: how far the body reaches forward (left) and back (right) at its widest.
function blobSide(hy, bottom, front, back) {
  const r = RB, h = bottom - hy, p = new Path2D();
  p.moveTo(-r, hy);
  p.arc(0, hy, r, PI, 0);
  p.bezierCurveTo(r, hy + h * 0.2, r + 3, hy + h * 0.36, back - 2, hy + h * 0.52);
  p.bezierCurveTo(back + 1, hy + h * 0.66, back, hy + h * 0.82, back - 3, bottom - h * 0.06);
  p.bezierCurveTo(back - 6, bottom, back * 0.5, bottom, 0, bottom);
  p.bezierCurveTo(-front * 0.5, bottom, -(front - 6), bottom, -(front - 3), bottom - h * 0.06);
  p.bezierCurveTo(-front, hy + h * 0.82, -(front + 1), hy + h * 0.62, -(front - 1), hy + h * 0.5);
  p.bezierCurveTo(-(r + 2), hy + h * 0.36, -r, hy + h * 0.2, -r, hy);
  p.closePath();
  return p;
}
// the line between skin and yellow from the side: under the chin at the front, rising to the nape
const belowChinSide = (hy, s = 1) => pd(`M-90 ${hy + 31 * s} C-40 ${hy + 35 * s} 0 ${hy + 34 * s} 20 ${hy + 24 * s} L90 ${hy + 16 * s} L90 40 L-90 40 Z`);
function blobHeadSide(g, hy, face, pony) {
  const s = RB / R;
  g.at(0, hy, () => {
    g.at(0, 0, () => g.form(HAIR_SIDE, HR, { dark: HRD, w: 46 }), s);
    g.at(0, 0, () => EAR_SIDE(g), s);
    PROFILE[face](g, -RB, 0);
  });
}

// Blob from the side: one soft mass, a nub arm, two lumps for legs, the drip ponytail
export function sideBlob(g, face = 'calm') {
  const hy = -128, s = RB / R;
  g.ground(40, 'pill');
  // the far leg and arm, behind and darker
  sideLump(g, 15, LGD, FTD);
  g.form(soft([[26, -84, 10.5], [40, -70, 9], [46, -58, 8.5]]), SUD);
  g.fill(ell(47, -52, 8.6, 9.4), SKD);
  g.at(0, hy, () => PONY_SIDE.drip(g), s);
  sideLump(g, -17, LG, FT);
  const mass = union(blobSide(hy, -24, 44, 42), circ(-35.6, hy + 9.6, 5.4));
  g.form(mass, SK, { dark: SKD, w: 56 });
  g.clip(belowChinSide(hy, s), () => g.form(mass, SU, { dark: SUD, w: 56 }));
  // the near arm, a nub that hangs at the side, a little forward
  g.form(soft([[-10, -86, 10.5], [-18, -70, 9], [-22, -56, 8.5]]), SUN, { dark: SUD, w: 20 });
  g.form(ell(-23, -50, 8.8, 9.6), SK, { dark: SKD, w: 16 });
  blobHeadSide(g, hy, face, 'drip');
}
// a Blob leg from the side: a lump under the body with the shoe's toe forward
function sideLump(g, x, col, shoeCol) {
  const leg = pd(`M${x - 13} -30 C${x - 14} -18 ${x - 16} -10 ${x - 19} -5 C${x - 22} 0 ${x - 14} 2 ${x - 4} 1.5 ` +
    `L${x + 8} 1 C${x + 14} 0 ${x + 14} -6 ${x + 13} -12 C${x + 12} -18 ${x + 12} -24 ${x + 12} -30 Z`);
  g.form(leg, col, col === LG ? { dark: LGD, w: 26 } : {});
  g.clip(leg, () => g.fill(pd(`M${x - 40} -9 C${x - 10} -11 ${x + 10} -11 ${x + 40} -9 L${x + 40} 10 L${x - 40} 10 Z`), shoeCol));
}

// Noodle from the side: a round head, a small round body, long bendy limbs, round hands, big feet
export function sideNoodle(g, face = 'calm') {
  const hy = -128, hx = -3;
  g.ground(32, 'pill');
  // far leg and arm
  noodle(g, 'M6 -54 C7 -36 16 -26 15 -9', LGD, 8);
  shoe(g, 11, -5.5, 12.5, 6.5, 0, FTD);
  noodle(g, 'M8 -90 C20 -86 24 -74 24 -62', SUD, 7);
  hand(g, 24, -57, 7.8, SKD, null);
  // near leg
  noodle(g, 'M-4 -54 C-5 -36 -14 -26 -12 -9', LG, 8);
  shoe(g, -19, -5.5, 12.5, 6.5, 0);
  // the body: a little rounder at the back
  g.form(pd('M-1 -100 C14 -100 24 -88 24 -73 C24 -57 15 -49 0 -49 C-14 -49 -22 -57 -22 -73 C-22 -88 -14 -100 -1 -100 Z'), SU, { dark: SUD, w: 46 });
  noodleHeadSide(g, hx, hy, face);
  // the near arm hangs a little forward, out of the front of the body
  noodle(g, 'M-6 -93 C-20 -90 -28 -78 -28 -64', SUN, 7);
  hand(g, -28, -59, 8);
}

// The Blob body on noodle legs from the side (the build the ten faces are drawn on)
export function sideBlobnoodle(g, face = 'calm') {
  const hy = -140, s = RB / R;
  g.ground(34, 'pill');
  noodle(g, 'M8 -66 C9 -42 17 -30 16 -9', LGD, 8);
  shoe(g, 12, -5.5, 12.5, 6.5, 0, FTD);
  noodle(g, 'M24 -98 C38 -94 42 -80 42 -68', SUD, 7);
  hand(g, 42, -63, 7.8, SKD, null);
  noodle(g, 'M-6 -66 C-7 -42 -15 -30 -12 -9', LG, 8);
  shoe(g, -19, -5.5, 12.5, 6.5, 0);
  g.at(0, hy, () => PONY_SIDE.curl(g), s);
  const mass = union(blobSide(hy, -60, 40, 39), circ(-35.6, hy + 9.6, 5.4));
  g.form(mass, SK, { dark: SKD, w: 52 });
  g.clip(belowChinSide(hy, s), () => g.form(mass, SU, { dark: SUD, w: 52 }));
  noodle(g, 'M-20 -102 C-34 -98 -44 -86 -44 -72', SUN, 7);
  hand(g, -44, -67, 8);
  blobHeadSide(g, hy, face, 'curl');
}

export const FRONT = { blobnoodle: frontBlobnoodle, blob: frontBlob, noodle: frontNoodle };
export const SIDE = { blob: sideBlob, noodle: sideNoodle, blobnoodle: sideBlobnoodle };
