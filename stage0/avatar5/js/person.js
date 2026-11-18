// The person, drawn in the ten shape styles. Drawn from its feet at (0, 0), up is negative y.
// What never changes: brown skin, copper hair with a fringe swept down to the left and a high ponytail
// flicking out to the right, a plain yellow body (a base for clothes later), indigo legs, dark shoes.
// The pose: waving with the hand on the left of the picture, the other arm down. The face: big eyes
// glancing a little to the left, the left brow raised a touch higher, an open smile.

import { PI, rr, pill, circ, ell, poly, rpoly, pd, union, tube, limb, leaf, trail, wedge, segment, ngon } from './kit.js';
import { FACE } from './styles.js';

export const COL = {
  SK: '#c98458', SKD: '#9a5662', NO: '#a65f3e',
  HR: '#ef6233', HRD: '#b63a4d', BR: '#5e1d3c',
  SU: '#ffc84a', SUD: '#e8903f',
  LG: '#4f55b8', LGD: '#363a8f', FT: '#2a2660', MO: '#7a1e3a',
};
const { SK, SKD, NO, HR, HRD, BR, SU, SUD, LG, LGD, FT, MO } = COL;
const LOOK = [-0.9, 0.5];

// a straight bar with square ends, for the cut-out style
const bar = (x1, y1, x2, y2, w) => {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  return poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
};
// the face, laid out the same way in every style: eyes, brows (left one higher), nose, mouth
function face(g, F, o) {
  const { ex = 12, ey, ew, eh, by, bw = 13, bh = 5, ny, ns = 3.6, my, mw = 19, mh = 9, side } = o;
  F.eye(g, -ex, ey, ew, eh, { look: LOOK, side: -1 });
  F.eye(g, ex, ey, ew, eh, { look: LOOK, side: 1 });
  F.brow(g, -ex - 0.5, by - 2.2, bw, bh, -0.16, BR);
  F.brow(g, ex + 0.5, by, bw, bh, 0.1, BR);
  F.nose(g, 0, ny, ns, NO);
  F.mouth(g, 0, my, mw, mh, MO, {});
}

// =====================================================================
// 1. Blob: one soft mass, no corners. Head and body are a single gumdrop, the skin and the yellow parted by a
// soft curve at the chin; the arms are nubs that melt out of it and the legs are two lumps under it.
function blob(g) {
  const F = FACE.blob;
  g.ground(40, 'pill');
  for (const k of [-1, 1]) {
    const leg = pd(`M${k * 4} -30 C${k * 3} -16 ${k * 3} -8 ${k * 6} -3 Q${k * 17} 2.5 ${k * 28} -2 C${k * 32} -6 ${k * 27} -14 ${k * 27} -30 Z`);
    g.form(leg, LG, { dark: LGD, w: 24 });
    g.clip(leg, () => g.form(ell(k * 17, -1, 16, 8.5), FT));
  }
  // the arms melt out of the sides: a nub hanging, a nub raised in a wave
  g.form(trail([[30, -76, 11], [41, -60, 9], [43, -50, 8.5]]), SU, { dark: SUD, w: 20 });
  g.form(ell(44, -45, 9, 9.5), SK, { dark: SKD, w: 16 });
  g.form(trail([[-30, -84, 11], [-44, -98, 9], [-48, -112, 8.5]]), SU, { dark: SUD, w: 20 });
  g.form(ell(-49, -119, 9, 10.5), SK, { dark: SKD, w: 16 });
  // the ponytail: a soft drip from the crown, out to the right
  g.form(pd('M8 -158 C14 -182 46 -188 55 -168 C61 -153 55 -136 45 -130 C49 -144 45 -158 30 -158 C22 -158 17 -154 14 -148 Z'), HR, { dark: HRD, w: 30 });
  const mass = pd('M0 -162 C24 -162 37 -148 37 -126 C37 -112 33 -104 34 -94 C36 -76 46 -56 45 -42 C44 -27 30 -24 0 -24 C-30 -24 -44 -27 -45 -42 C-46 -56 -36 -76 -34 -94 C-33 -104 -37 -112 -37 -126 C-37 -148 -24 -162 0 -162 Z');
  g.form(mass, SK, { dark: SKD, w: 56 });
  g.clip(pd('M-70 -102 C-30 -88 30 -88 70 -102 L70 10 L-70 10 Z'), () => g.form(mass, SU, { dark: SUD, w: 56 }));
  const hair = pd('M-39 -118 C-43 -148 -24 -168 2 -168 C28 -168 44 -152 39 -128 C35 -143 26 -151 16 -150 C0 -149 -22 -141 -39 -118 Z');
  g.form(hair, HR, { dark: HRD, w: 52 });
  face(g, F, { ey: -124, ew: 17, eh: 20, by: -139, ny: -111, my: -106, mw: 19, mh: 9 });
}

// =====================================================================
// 2. Circles: every part a perfect circle. No arms or legs: hands and feet float.
function circles(g) {
  const F = FACE.circles;
  g.ground(30, 'pill');
  for (const k of [-1, 1]) g.form(circ(k * 11, -25, 8.5), LG, { dark: LGD, w: 17 });
  for (const k of [-1, 1]) g.form(circ(k * 14, -9, 9), FT);
  g.form(circ(0, -60, 31), SU, { dark: SUD, w: 62 });
  g.form(circ(42, -50, 8.5), SK, { dark: SKD, w: 17 });
  g.form(circ(-52, -116, 8.5), SK, { dark: SKD, w: 17 });
  // the ponytail is one big round puff
  g.form(circ(30, -161, 16), HR, { dark: HRD, w: 32 });
  for (const k of [-1, 1]) g.form(circ(k * 33, -118, 7.5), SK, { dark: SKD, w: 15 });
  // head in hair colour; the face is a second circle laid over it, and the fringe a third
  const head = circ(0, -124, 35);
  g.form(head, HR, { dark: HRD, w: 70 });
  g.clip(circ(0, -124, 35), () => {
    g.form(circ(-3, -113, 33), SK, { dark: SKD, w: 56 });
    g.form(circ(-27, -152, 17), HR, { dark: HRD, w: 34 });
  });
  face(g, F, { ey: -119, ew: 19, eh: 19, by: -135, bh: 5.5, ny: -107, ns: 3.8, my: -101, mw: 18 });
}

// =====================================================================
// 3. Noodle: a small round body and head, long bendy limbs of even width, big round hands and feet.
function noodle(g) {
  const F = FACE.noodle;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) {
    g.line(pd(`M${k * 8} -54 C${k * 7} -34 ${k * 17} -26 ${k * 13} -8`), LG, 8);
    g.at(k * 18, -5.5, () => g.fill(ell(0, 0, 12.5, 6.5), FT), 1, k * 0.12);
  }
  g.line(pd('M16 -90 C32 -84 24 -66 33 -57'), SU, 7);
  g.form(circ(34, -53, 8), SK, { dark: SKD, w: 16 });
  const body = pd('M0 -100 C14 -100 24 -88 24 -73 C24 -57 15 -49 0 -49 C-15 -49 -24 -57 -24 -73 C-24 -88 -14 -100 0 -100 Z');
  g.form(body, SU, { dark: SUD, w: 48 });
  g.line(pd('M-16 -90 C-36 -90 -46 -102 -43 -122'), SU, 7);
  g.form(circ(-43, -128, 8.5), SK, { dark: SKD, w: 17 });
  // the ponytail: one long noodle that curls round at its end
  const at = t => {
    const a = (200 - t * 400) * PI / 180, R = 20 - 12 * t;
    return [40 + R * Math.cos(a) * 1.05, -160 + R * Math.sin(a), 6.5 - 3.4 * t];
  };
  const curl = trail([[14, -150, 6.5], ...Array.from({ length: 22 }, (_, i) => at(i / 21))]);
  g.form(curl, HR, { dark: HRD, w: 14 });
  for (const k of [-1, 1]) g.form(ell(k * 29, -124, 6, 7.5), SK, { dark: SKD, w: 12 });
  const head = ell(0, -128, 30, 30);
  g.form(head, SK, { dark: SKD, w: 44 });
  const hair = pd('M-31 -124 C-34 -146 -18 -160 2 -160 C22 -160 35 -148 31 -128 C27 -142 20 -147 12 -146 C-2 -145 -20 -140 -31 -124 Z');
  g.form(hair, HR, { dark: HRD, w: 46 });
  face(g, F, { ex: 11, ey: -124, ew: 15, eh: 20, by: -139, bw: 12, bh: 3.6, ny: -112, ns: 3.6, my: -106, mw: 18, mh: 8 });
}

// =====================================================================
// 4. Pills: every part a capsule, with straight sides and fully round ends.
function pills(g) {
  const F = FACE.pills;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) g.form(pill(k * 10, -22, 14, 32), LG, { dark: LGD, w: 14 });
  for (const k of [-1, 1]) g.form(pill(k * 13, -5, 25, 10), FT);
  g.at(27, -73, () => g.form(pill(0, 0, 13, 40), SU, { dark: SUD, w: 13 }), 1, -0.3);
  g.at(33, -52, () => g.form(pill(0, 0, 12, 16), SK, { dark: SKD, w: 12 }), 1, -0.3);
  g.form(pill(0, -63, 46, 70), SU, { dark: SUD, w: 46 });
  g.at(-32, -104, () => g.form(pill(0, 0, 13, 42), SU, { dark: SUD, w: 13 }), 1, -0.75);
  g.at(-45, -125, () => g.form(pill(0, 0, 13, 17), SK, { dark: SKD, w: 13 }), 1, -0.4);
  // the ponytail: one capsule rising out of the crown, a second falling from its top down the right side
  g.at(39, -146, () => g.form(pill(0, 0, 18, 44), HR, { dark: HRD, w: 18 }), 1, -0.42);
  g.at(22, -162, () => g.form(pill(0, 0, 19, 34), HR, { dark: HRD, w: 19 }), 1, 0.62);
  for (const k of [-1, 1]) g.form(pill(k * 35, -120, 9, 16), SK, { dark: SKD, w: 9 });
  g.form(pill(0, -122, 72, 62), SK, { dark: SKD, w: 52 });
  // the hair: a capsule cap, and a second capsule swept down across the forehead to the left
  g.clip(pill(0, -122, 76, 66), () => {
    g.form(pill(0, -162, 84, 40), HR, { dark: HRD, w: 50 });
    g.at(-6, -150, () => g.form(pill(0, 0, 64, 20), HR, { dark: HRD, w: 40 }), 1, -0.38);
  });
  face(g, F, { ey: -117, ew: 14, eh: 21, by: -131, bw: 12, bh: 5, ny: -104, ns: 3.4, my: -100, mw: 18, mh: 8 });
}

// =====================================================================
// 5. Squat: short and wide, soft boxes stacked low, no neck, stubby legs.
function squat(g) {
  const F = FACE.squat;
  g.ground(44, 'pill');
  for (const k of [-1, 1]) g.form(rr(k * 19 - 8, -24, 16, 20, 6), LG, { dark: LGD, w: 16 });
  for (const k of [-1, 1]) g.form(pill(k * 21, -5, 30, 10), FT);
  g.form(tube(42, -56, 52, -38, 8.5), SU, { dark: SUD, w: 17 });
  g.form(circ(53, -34, 9.5), SK, { dark: SKD, w: 19 });
  g.form(rr(-45, -72, 90, 52, [16, 16, 22, 22]), SU, { dark: SUD, w: 90 });
  g.form(tube(-42, -60, -58, -80, 8.5), SU, { dark: SUD, w: 17 });
  g.form(circ(-60, -85, 9.5), SK, { dark: SKD, w: 19 });
  g.form(pd('M22 -112 C30 -130 56 -132 62 -116 C66 -106 60 -98 54 -97 C55 -106 50 -112 38 -112 Z'), HR, { dark: HRD, w: 30 });
  for (const k of [-1, 1]) g.form(ell(k * 43, -88, 7, 8.5), SK, { dark: SKD, w: 14 });
  const head = rr(-43, -116, 86, 56, 24);
  g.form(head, SK, { dark: SKD, w: 60 });
  g.clip(rr(-45, -120, 90, 60, 26), () => g.form(pd('M-50 -90 L-50 -130 L50 -130 L50 -98 C42 -108 32 -112 20 -110 C2 -108 -28 -104 -50 -90 Z'), HR, { dark: HRD, w: 70 }));
  face(g, F, { ex: 13, ey: -86, ew: 17, eh: 19, by: -101, ny: -75, ns: 3.8, my: -71, mw: 20, mh: 8 });
}

// =====================================================================
// 6. Tall: stretched thin, about four heads tall, long tapering limbs, a long oval head.
function tall(g) {
  const F = FACE.tall;
  g.ground(26, 'pill');
  for (const k of [-1, 1]) g.form(leaf(k * 4, -3, k * 22, -3, 0.32, 0.12), FT);
  for (const k of [-1, 1]) g.form(limb(k * 8, -98, 7.5, k * 10, -7, 4), LG, { dark: LGD, w: 14 });
  g.form(limb(20, -150, 5.5, 31, -94, 4), SU, { dark: SUD, w: 10 });
  g.form(ell(32, -89, 5, 7.5), SK, { dark: SKD, w: 10 });
  g.form(rr(-5, -170, 10, 16, 4), SK, { dark: SKD, w: 10 });
  g.form(rpoly([[-21, -158], [21, -158], [13, -92], [-13, -92]], 8), SU, { dark: SUD, w: 42 });
  g.form(limb(-19, -152, 5.5, -42, -196, 4), SU, { dark: SUD, w: 10 });
  g.form(ell(-44, -203, 5.5, 8), SK, { dark: SKD, w: 11 });
  // the ponytail streams up and out, long and thin
  const q = t => [(1 - t) ** 2 * 4 + 2 * (1 - t) * t * 30 + t * t * 60, (1 - t) ** 2 * -212 + 2 * (1 - t) * t * -250 + t * t * -222, 7 - 4.6 * t];
  g.form(trail(Array.from({ length: 14 }, (_, i) => q(i / 13))), HR, { dark: HRD, w: 18 });
  for (const k of [-1, 1]) g.form(ell(k * 23, -190, 4.5, 6.5), SK, { dark: SKD, w: 9 });
  const head = ell(0, -192, 23, 28);
  g.form(head, SK, { dark: SKD, w: 34 });
  g.clip(ell(0, -192, 25, 30), () => g.form(pd('M-30 -180 C-30 -214 -14 -226 2 -226 C20 -226 30 -214 28 -190 C24 -204 16 -209 9 -208 C-4 -206 -20 -198 -30 -180 Z'), HR, { dark: HRD, w: 36 }));
  face(g, F, { ex: 9, ey: -188, ew: 13, eh: 17, by: -201, bw: 11, bh: 4, ny: -178, ns: 3.2, my: -172, mw: 14, mh: 7 });
}

// =====================================================================
// 7. Blocks: boxes with straight sides and small rounded corners. The waving arm bends square.
function blocks(g) {
  const F = FACE.blocks;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) g.form(rr(k * 10 - 7, -36, 14, 30, 2), LG, { dark: LGD, w: 14 });
  g.form(rr(-26, -9, 22, 9, [3, 3, 1.5, 1.5]), FT);
  g.form(rr(4, -9, 22, 9, [3, 3, 1.5, 1.5]), FT);
  g.form(rr(22, -94, 12, 36, 3), SU, { dark: SUD, w: 12 });
  g.form(rr(22, -60, 12, 12, 3), SK, { dark: SKD, w: 12 });
  g.form(rr(-24, -96, 48, 64, 5), SU, { dark: SUD, w: 48 });
  g.form(rr(-42, -96, 26, 12, 3), SU, { dark: SUD, w: 12 });
  g.form(rr(-42, -124, 12, 38, 3), SU, { dark: SUD, w: 12 });
  g.form(rr(-43, -138, 14, 14, 3), SK, { dark: SKD, w: 14 });
  g.at(27, -164, () => g.form(rr(-8, -22, 16, 30, 3), HR, { dark: HRD, w: 16 }), 1, 0.5);
  for (const k of [-1, 1]) g.form(rr(k * 32 - 4, -128, 8, 13, 2), SK, { dark: SKD, w: 8 });
  const head = rr(-30, -158, 60, 64, 7);
  g.form(head, SK, { dark: SKD, w: 44 });
  // a block cap, the fringe stepping down on the left
  const hair = union(rr(-33, -166, 66, 24, [8, 8, 0, 0]), rr(-33, -144, 42, 6, [0, 0, 2, 0]), rr(-33, -140, 14, 6, [0, 0, 2, 0]), rr(25, -144, 8, 14, [0, 0, 2, 0]));
  g.form(hair, HR, { dark: HRD, w: 50 });
  face(g, F, { ey: -118, ew: 15, eh: 17, by: -130, bw: 13, bh: 4.5, ny: -106, ns: 3, my: -102, mw: 20, mh: 9 });
}

// =====================================================================
// 8. Cut-out: half circles and straight cuts with sharp corners. The shadow is one straight vertical cut.
function cutout(g) {
  const F = FACE.cutout;
  g.ground(30, 'pill');
  for (const k of [-1, 1]) g.cut(segment(k * 13, -1, 11, -1, false), FT, null);
  for (const k of [-1, 1]) g.cut(rr(k * 9 - 3.5, -38, 7, 32, 0), LG, LGD, k * 9 + 1);
  g.cut(bar(16, -92, 28, -58, 6.5), SU, SUD, 22);
  g.cut(circ(29, -54, 6.5), SK, SKD, 30);
  g.cut(poly([[-15, -98], [15, -98], [28, -32], [-28, -32]]), SU, SUD, 5);
  g.cut(bar(-16, -92, -40, -120, 6.5), SU, SUD, -28);
  g.cut(circ(-42, -124, 7), SK, SKD, -41);
  // the ponytail: a quarter-circle fan opening out from the crown
  g.cut(wedge(14, -150, 34, -PI * 0.52, 0.1), HR, HRD, 30);
  g.cut(wedge(31, -122, 7.5, -PI / 2, PI / 2), SK, SKD, 33);
  g.cut(wedge(-31, -122, 7.5, PI / 2, PI * 1.5), SK, null);
  const head = circ(0, -124, 32);
  g.cut(head, HR, HRD, 9);
  // the face is the same circle below one straight diagonal cut: the fringe
  g.clip(poly([[-40, -128], [40, -152], [40, -80], [-40, -80]]), () => g.cut(circ(0, -124, 32), SK, SKD, 9));
  face(g, F, { ey: -117, ew: 18, eh: 18, by: -131, bw: 13, bh: 4.5, ny: -107, ns: 3.4, my: -101, mw: 19 });
}

// =====================================================================
// 9. Facets: flat-sided gem shapes with no curves. The shadow is one facet down the right.
function facets(g) {
  const F = FACE.facets;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) g.cut(poly([[k * 3, -1], [k * 3, -8], [k * 13, -11], [k * 25, -6], [k * 25, -1]]), FT, null);
  for (const k of [-1, 1]) g.cut(poly([[k * 3, -40], [k * 17, -40], [k * 15, -7], [k * 5, -7]]), LG, LGD, poly([[k * 10, -40], [k * 40, -40], [k * 40, -7], [k * 10, -7]]));
  g.cut(poly([[18, -94], [27, -90], [33, -58], [24, -57]]), SU, SUD, poly([[22, -92], [40, -92], [40, -56], [28, -57]]));
  g.cut(ngon(29, -52, 7.5, 6, 0), SK, SKD, poly([[29, -60], [40, -60], [40, -44], [29, -44]]));
  const torso = poly([[-18, -98], [18, -98], [28, -80], [25, -32], [-25, -32], [-28, -80]]);
  g.cut(torso, SU, SUD, poly([[18, -98], [28, -80], [25, -32], [6, -32], [10, -80]]));
  g.cut(poly([[-16, -96], [-24, -88], [-46, -116], [-38, -122]]), SU, SUD, poly([[-20, -92], [-24, -88], [-46, -116], [-42, -119]]));
  g.cut(ngon(-43, -126, 8, 6, 0), SK, SKD, poly([[-43, -136], [-30, -136], [-30, -116], [-43, -116]]));
  // the ponytail is one shard, out to the right
  g.cut(poly([[10, -156], [26, -182], [48, -182], [57, -160], [46, -134], [40, -152], [24, -156]]), HR, HRD, poly([[48, -182], [57, -160], [46, -134], [42, -158]]));
  g.cut(ngon(33, -121, 7.5, 5, 0), SK, SKD, poly([[33, -130], [44, -130], [44, -110], [33, -110]]));
  g.cut(ngon(-33, -121, 7.5, 5, PI), SK, null);
  const head = poly([[-20, -156], [18, -157], [33, -139], [33, -112], [19, -92], [-19, -92], [-33, -112], [-33, -139]]);
  g.cut(head, SK, SKD, poly([[18, -157], [33, -139], [33, -112], [19, -92], [12, -92], [16, -126]]));
  const hair = poly([[-35, -114], [-36, -140], [-22, -162], [16, -165], [35, -148], [35, -126], [26, -140], [10, -144], [-8, -140], [-24, -130]]);
  g.cut(hair, HR, HRD, poly([[16, -165], [35, -148], [35, -126], [26, -140], [22, -150]]));
  face(g, F, { ey: -119, ew: 19, eh: 17, by: -132, bw: 14, bh: 4.5, ny: -107, ns: 3.6, my: -102, mw: 20, mh: 9 });
}

// =====================================================================
// 10. Spiky: sharp points and narrow wedges. The shadow splits each shape along a ridge.
function spiky(g) {
  const F = FACE.spiky;
  g.ground(32, 'pill');
  for (const k of [-1, 1]) g.cut(poly([[k * 3, -1], [k * 6, -10], [k * 28, -1]]), FT, null);
  for (const k of [-1, 1]) g.cut(poly([[k * 2, -42], [k * 18, -42], [k * 9, -5]]), LG, LGD, poly([[k * 10, -44], [k * 30, -44], [k * 30, 0], [k * 9, -5]]));
  g.cut(poly([[22, -96], [31, -92], [31, -60], [27, -52]]), SU, SUD, poly([[27, -94], [40, -94], [40, -50], [27, -52]]));
  g.cut(poly([[27, -64], [36, -58], [31, -42], [24, -56]]), SK, SKD, poly([[30, -62], [40, -62], [40, -40], [31, -42]]));
  const torso = poly([[-30, -98], [30, -98], [15, -36], [-15, -36]]);
  g.cut(torso, SU, SUD, poly([[2, -98], [34, -98], [20, -32], [4, -32]]));
  g.cut(poly([[-24, -98], [-32, -90], [-52, -120], [-46, -126]]), SU, SUD, poly([[-28, -94], [-32, -90], [-52, -120], [-49, -123]]));
  g.cut(poly([[-52, -142], [-42, -128], [-47, -118], [-56, -126]]), SK, SKD, poly([[-52, -142], [-42, -128], [-47, -118], [-49, -129]]));
  // the ponytail: one long blade out of the crown, up and out to the right
  g.cut(poly([[-2, -160], [30, -182], [62, -186], [46, -152], [34, -140], [18, -150]]), HR, HRD, poly([[30, -182], [62, -186], [46, -152], [34, -140], [36, -164]]));
  g.cut(poly([[33, -127], [42, -122], [39, -111], [33, -111]]), SK, SKD, poly([[37, -127], [42, -122], [39, -111], [37, -111]]));
  g.cut(poly([[-33, -127], [-42, -122], [-39, -111], [-33, -111]]), SK, null);
  const head = poly([[-33, -148], [-12, -160], [30, -154], [35, -122], [18, -98], [0, -90], [-18, -98], [-35, -122]]);
  g.cut(head, SK, SKD, poly([[8, -160], [30, -154], [35, -122], [18, -98], [0, -90], [10, -124]]));
  // a spiky cap: the fringe is three points sweeping down to the left
  const hair = poly([[-38, -112], [-38, -146], [-24, -168], [-4, -162], [14, -170], [38, -156], [36, -124], [27, -142], [14, -138], [8, -147], [-6, -133], [-12, -145], [-28, -126], [-27, -140]]);
  g.cut(hair, HR, HRD, poly([[14, -170], [38, -156], [36, -124], [27, -142], [22, -152]]));
  face(g, F, { ey: -119, ew: 15, eh: 21, by: -133, bw: 15, bh: 5, ny: -106, ns: 3.6, my: -102, mw: 20, mh: 10 });
}

export const PERSON = { blob, circles, noodle, pills, squat, tall, blocks, cutout, facets, spiky };
