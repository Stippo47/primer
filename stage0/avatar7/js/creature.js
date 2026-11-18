// The monster and the animal, from the front and from the side. Drawn from the feet at (0, 0), up is
// negative y.
//
//   Lamp, Blob (the sixth round's 1): raspberry, a wide dumpling with a lamp hanging from a stalk on its
//   forehead. Chosen for the side view because its stalk is made for it: from the front the stalk had to
//   bend off to one side; from the side it arches forward over the face and the lamp hangs in front, where
//   the eye can look up at it. Its grin is gone: a lidded eye and a small closed mouth.
//
//   Hippo (the fourth round's 2): pink, a skull on a wider muzzle, ears and eyes up top. Chosen because a
//   hippo is known by its side: the long muzzle, the eye and the ear on bumps above it. It kept its calm
//   half-lidded look from the fourth round, which suits the calm faces here.

import { circ, ell, pd, rr, soft, tube, pill, union, dEye } from './kit.js';
import { whiteEye, lid } from './face.js';
import { nearTint } from './person.js';

const PUPIL = '#2b2b3f';

const noodle = (g, d, col, w) => g.line(pd(d), col, w);
function glow(g, x, y, r, col) {
  g.fill(circ(x, y, r * 2.6), col, 0.1);
  g.fill(circ(x, y, r * 1.8), col, 0.16);
}
function bulb(g, x, y, r) {
  g.fill(circ(x, y, r), '#fff1a0');
  g.fill(circ(x - r * 0.18, y - r * 0.18, r * 0.62), '#fffbe6');
}
const line = (g, d, col, w = 2.6) => g.line(pd(d), col, w);

// =====================================================================
// LAMP
const LA = { B: '#f2557e', BD: '#ab2f76', BE: '#ffd3de', BED: '#f29ab6', FT: '#6e1a52', FTD: '#3e0a32', BR: '#5e1240', MO: '#5a1036', GL: '#ffe46a' };

// from the front, as in the sixth round, with a calm face: lidded eyes looking up at the lamp, a small mouth
export function lampFront(g) {
  const { B, BD, BE, BED, FT, BR, MO, GL } = LA;
  g.ground(48, 'pill');
  glow(g, -52, -128, 11, GL);
  for (const k of [-1, 1]) {
    g.form(pd(`M${k * 8} -20 C${k * 7} -10 ${k * 8} -5 ${k * 10} -2.5 Q${k * 22} 2.5 ${k * 34} -2 C${k * 38} -6 ${k * 34} -14 ${k * 33} -20 Z`), FT);
  }
  nub(g, [[-46, -68, 11], [-60, -80, 9], [-66, -94, 8.5]], [-67, -100], B, BD);
  nub(g, [[46, -50, 11], [58, -40, 9], [62, -30, 8.5]], [63, -26], B, BD);
  g.form(soft([[-2, -100, 8], [-3, -124, 6], [-12, -144, 4.8], [-28, -154, 4.2], [-44, -150, 3.8], [-52, -140, 3.6]]), B, { dark: BD, w: 12 });
  const body = pd('M0 -112 C34 -112 56 -88 58 -58 C60 -36 56 -18 36 -15 C22 -13 -22 -13 -36 -15 C-56 -18 -60 -36 -58 -58 C-56 -88 -34 -112 0 -112 Z');
  g.form(body, B, { dark: BD, w: 116 });
  g.clip(body, () => g.form(ell(-2, -30, 36, 17), BE, { dark: BED, w: 72 }));
  for (const k of [-1, 1]) {
    whiteEye(g, k * 16, -76, 16, 18, { look: [-2.4, -3.6], pr: [3.6, 3.9] });
    lid(g, k * 16, -76, 16, 18, 0.26, { col: B, line: BR });
  }
  for (const k of [-1, 1]) g.at(k * 16.5, -93, () => g.fill(pill(0, 0, 12, 3.8), BR), 1, k * 0.06);
  line(g, 'M-5 -58 Q0 -55.6 5 -58', MO, 3);
  bulb(g, -52, -128, 11);
}
function nub(g, pts, handAt, col, dark) {
  g.form(soft(pts), col, dark ? { dark, w: 18 } : {});
  g.form(ell(handAt[0], handAt[1], 9.5, 10.5), col, dark ? { dark, w: 18 } : {});
}

// from the side, facing left: the dumpling is a little narrower front to back; the stalk rises from the top
// of the forehead and arches forward, and the lamp hangs in front of the face. The belly shows at the front.
export function lampSide(g) {
  const { B, BD, BE, BED, FT, FTD, BR, MO, GL } = LA;
  const lampX = -74, lampY = -122;
  g.ground(46, 'pill');
  glow(g, lampX, lampY, 11, GL);
  // the far foot, darker, behind (the far arm is hidden by the body)
  g.form(pd('M4 -20 C4 -10 6 -4 8 -2 Q20 2.5 32 -2 C36 -6 32 -14 31 -20 Z'), FTD);
  g.form(pd('M-26 -20 C-27 -10 -26 -5 -24 -2.5 Q-12 2.5 0 -2 C4 -6 0 -14 -1 -20 Z'), FT);
  // the stalk
  g.form(soft([[-20, -104, 8], [-22, -126, 6], [-32, -146, 4.8], [-50, -154, 4.2], [-66, -149, 3.8], [-73, -136, 3.6], [lampX, -130, 3.4]]), B, { dark: BD, w: 12 });
  const body = pd('M-6 -112 C24 -112 48 -92 50 -62 C52 -38 48 -18 30 -15 C18 -13 -24 -13 -36 -15 C-54 -18 -58 -36 -57 -60 C-56 -90 -36 -112 -6 -112 Z');
  g.form(body, B, { dark: BD, w: 104 });
  g.clip(body, () => g.form(ell(-34, -31, 25, 15), BE, { dark: BED, w: 56 }));
  // the near arm, a short nub hanging at the side, as its arms are from the front
  nub(g, [[0, -66, 11.5], [-4, -55, 9.5], [-8, -47, 8.5]], [-10, -41], nearTint(B), BD);
  // the face, at the front: one lidded eye looking up at the lamp, a brow, a small closed mouth
  whiteEye(g, -39, -80, 12, 18, { look: [-2.4, -4], pr: [3.2, 3.8] });
  lid(g, -39, -80, 12, 18, 0.24, { col: B, line: BR });
  g.at(-39, -96, () => g.fill(pill(0, 0, 10, 3.8), BR), 1, -0.1);
  line(g, 'M-55 -61 Q-50.5 -58.4 -46 -60.6', MO, 3);
  bulb(g, lampX, lampY, 11);
}

// =====================================================================
// HIPPO
const HI = { C: '#e48fc2', CD: '#b05aa6', M: '#f8b8d4', MD: '#d985b6', DK: '#7a2d68', BE: '#f6c6dc', FT: '#a8468f', FTD: '#6a2260' };

// from the front, as in the fourth round
export function hippoFront(g) {
  const { C, CD, M, MD, DK, BE, FT } = HI;
  g.ground(40, 'pill');
  g.fill(pill(-15, -3.6, 25, 8), FT);
  g.fill(pill(15, -3.6, 25, 8), FT);
  const body = rr(-33, -72, 66, 58, [22, 22, 26, 26]);
  g.form(body, C, { dark: CD, w: 66 });
  g.clip(ell(-2, -38, 21, 20), () => g.form(body, BE, { dark: MD, w: 66 }));
  for (const k of [-1, 1]) {
    g.form(tube(k * 31, -62, k * 38, -40, 7.4), C, { dark: CD, w: 15 });
    g.fill(circ(k * 38.5, -37, 7.6), FT);
  }
  for (const k of [-1, 1]) {
    g.at(k * 22, -136, () => { g.form(ell(0, 0, 6.5, 8.5), C, { dark: CD, w: 13 }); g.fill(ell(0, 1, 3.2, 4.8), DK); }, 1, k * 0.45);
  }
  const head = union(rr(-30, -138, 60, 44, 19), rr(-41, -106, 82, 44, 20));
  g.form(head, C, { dark: CD, w: 82 });
  g.clip(rr(-60, -102, 120, 60, 0), () => g.form(head, M, { dark: MD, w: 82 }));
  for (const k of [-1, 1]) dEye(g, k * 10, -118, 17, 19, { pupil: PUPIL, look: [-0.6, 1.4], sleepy: 0.32, lid: C, lidLine: CD });
  for (const k of [-1, 1]) g.at(k * 11, -133, () => g.fill(pill(0, 0, 12, 4.6), DK), 1, k * 0.14);
  for (const k of [-1, 1]) g.fill(ell(k * 12, -94, 4, 2.8, k * 0.2), DK);
  line(g, 'M-25 -79 Q0 -69 25 -79', DK);
}

// from the side, facing left: the skull at the back, the muzzle reaching forward and down, the eye and the
// ear on bumps along the top, the nostril on a bump at the front of the muzzle, the mouth a long line
// curving up at its back end. Upright like the others, the body set back under the head to carry the muzzle.
export function hippoSide(g) {
  const { C, CD, M, MD, DK, BE, FT, FTD } = HI;
  g.ground(40, 'pill');
  // far foot and arm
  g.fill(pill(14, -3.6, 28, 8), FTD);
  g.fill(tube(14, -62, 22, -40, 7.2), CD);
  g.fill(circ(23, -37, 7.4), FTD);
  g.fill(pill(-14, -3.6, 28, 8), FT);
  const body = rr(-28, -74, 60, 60, [22, 22, 26, 26]);
  g.form(body, C, { dark: CD, w: 60 });
  g.clip(ell(-28, -38, 15, 21), () => g.form(body, BE, { dark: MD, w: 60 }));
  // the ear, at the back of the skull, tipped back
  g.at(19, -152, () => { g.form(ell(0, 0, 6, 8.5), C, { dark: CD, w: 12 }); g.fill(ell(-0.5, 1, 2.8, 4.8), DK); }, 1, 0.5);
  // the muzzle: one big light block reaching forward, the nostril on a bump at its front; then the skull
  // over its back, with the eye on a bump on top (as from the front: a light muzzle under a darker skull)
  g.form(union(rr(-64, -124, 86, 54, 25), circ(-50, -119, 8)), M, { dark: MD, w: 86 });
  g.form(union(rr(-26, -152, 54, 44, 20), circ(-15, -149, 11)), C, { dark: CD, w: 54 });
  // the near arm hangs at the front of the body
  g.form(tube(-16, -64, -24, -42, 7.2), nearTint(C), { dark: CD, w: 14 });
  g.fill(circ(-25, -38, 7.6), FT);
  // the face: one half-lidded eye up on its bump, its brow, the nostril, the mouth
  // the round-cornered eye of the fourth round, narrower from the side, its pupil at the front
  dEye(g, -15, -145, 12, 14, { pupil: PUPIL, look: [-2.6, 1.2], pw: 0.5, sleepy: 0.36, lid: C, lidLine: CD });
  g.at(-16, -155.6, () => g.fill(pill(0, 0, 9, 3.8), DK), 1, -0.06);
  g.fill(ell(-54, -122, 3.2, 2.2, 0.3), DK);
  line(g, 'M-61 -88 C-44 -86 -28 -86 -14 -93', DK);
}
