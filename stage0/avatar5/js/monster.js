// The monster, drawn in the ten shape styles. Drawn from its feet at (0, 0), up is negative y.
// What never changes: a mint body that is head and body in one, a pale belly, a coral crest of three pieces
// on top (the middle one tallest), three eyes (the middle one higher and larger), a wide open grin with two
// fangs and a coral tongue, short legs with dark teal feet. The pose: both hands up at the sides, a playful
// "boo". The look: glancing a little to the left, like the person.
// It is not the purple horned furry monster of the second round: no horns, no fur, no purple.

import { PI, rr, pill, circ, ell, poly, pd, tube, limb, leaf, trail, wedge, segment, ngon } from './kit.js';
import { FACE, hex } from './styles.js';

export const COL = {
  C: '#5fd6a8', CD: '#2f8fae',
  BE: '#ecffb8', BED: '#a6dc95',
  CR: '#ff6f8e', CRD: '#c83c78',
  FT: '#24697f', MO: '#3c1848', TO: '#ff7f9a',
};
const { C, CD, BE, BED, CR, CRD, FT, MO, TO } = COL;
const LOOK = [-0.9, 0.5];

const bar = (x1, y1, x2, y2, w) => {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  return poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
};
// three eyes and the grin, laid out the same way in every style
function face(g, F, o) {
  const { ex = 21, ey, ew, eh, up = 6, big = 1.14, my, mw = 38, mh = 14, fdx = 9, fw = 6, fh = 6 } = o;
  F.eye(g, -ex, ey, ew, eh, { look: LOOK, side: -1 });
  F.eye(g, ex, ey, ew, eh, { look: LOOK, side: 1 });
  F.eye(g, 0, ey - up, ew * big, eh * big, { look: LOOK, side: 0 });
  F.mouth(g, 0, my, mw, mh, MO, { fangs: [[-fdx, fw, fh], [fdx, fw, fh]], tongue: TO });
}

// =====================================================================
// 1. Blob: one soft gumdrop, no corners. The crest is three soft dollops.
function blob(g) {
  const F = FACE.blob;
  g.ground(40, 'pill');
  // a gumdrop that slumps wide at the bottom; the feet are two lumps peeking out under it
  for (const k of [-1, 1]) {
    const foot = pd(`M${k * 8} -20 C${k * 7} -10 ${k * 8} -5 ${k * 10} -2.5 Q${k * 21} 2.5 ${k * 33} -2 C${k * 37} -6 ${k * 33} -14 ${k * 32} -20 Z`);
    g.form(foot, FT);
  }
  for (const [x, y, rx, ry] of [[-18, -126, 10, 11], [18, -126, 10, 11], [0, -134, 12, 15]]) g.form(ell(x, y, rx, ry), CR, { dark: CRD, w: 22 });
  for (const k of [-1, 1]) {
    g.form(trail([[k * 36, -74, 11], [k * 50, -84, 9], [k * 56, -98, 8.5]]), C, { dark: CD, w: 18 });
    g.form(ell(k * 58, -104, 9.5, 10.5), C, { dark: CD, w: 18 });
  }
  const body = pd('M0 -133 C28 -133 40 -112 42 -88 C44 -62 55 -42 53 -28 C51 -15 34 -14 0 -14 C-34 -14 -51 -15 -53 -28 C-55 -42 -44 -62 -42 -88 C-40 -112 -28 -133 0 -133 Z');
  g.form(body, C, { dark: CD, w: 92 });
  g.clip(body, () => g.form(ell(-2, -38, 30, 20), BE, { dark: BED, w: 60 }));
  face(g, F, { ey: -100, ew: 17, eh: 20, my: -81, mw: 36, mh: 14 });
}

// =====================================================================
// 2. Circles: a ball with three balls on top. Hands and feet float.
function circles(g) {
  const F = FACE.circles;
  g.ground(40, 'pill');
  for (const k of [-1, 1]) g.form(circ(k * 19, -10, 10), FT);
  for (const k of [-1, 1]) g.form(circ(k * 20, -117, 10.5), CR, { dark: CRD, w: 21 });
  g.form(circ(0, -126, 13), CR, { dark: CRD, w: 26 });
  for (const k of [-1, 1]) g.form(circ(k * 66, -98, 10.5), C, { dark: CD, w: 21 });
  const body = circ(0, -73, 51);
  g.form(body, C, { dark: CD, w: 102 });
  g.clip(body, () => g.form(circ(-2, -34, 25), BE, { dark: BED, w: 50 }));
  face(g, F, { ex: 22, ey: -98, ew: 19, eh: 19, up: 7, my: -80, mw: 32, fdx: 8, fw: 7 });
}

// =====================================================================
// 3. Noodle: a bean on long bendy legs, long bendy arms, the crest three curls.
function noodle(g) {
  const F = FACE.noodle;
  g.ground(38, 'pill');
  for (const k of [-1, 1]) {
    g.line(pd(`M${k * 13} -44 C${k * 12} -28 ${k * 22} -22 ${k * 17} -8`), C, 9);
    g.at(k * 22, -5.5, () => g.fill(ell(0, 0, 13.5, 6.5), FT), 1, k * 0.12);
  }
  // each curl is a stem that rises out of the head and rolls into a spiral at its tip.
  // (bx, by) where it leaves the head, (px, py) where the spiral starts, dir 1 rolls to the right, -1 to the left
  const curl = (bx, by, px, py, dir, R) => {
    const cx = px + dir * R, a0 = dir > 0 ? PI : 0;
    const at = t => { const a = a0 + dir * t * 1.55 * PI, r = R * (1 - 0.55 * t); return [cx + r * Math.cos(a), py + r * Math.sin(a), 5 - 2.4 * t]; };
    return trail([[bx, by, 5.6], [(bx + px) / 2, (by + py) / 2, 5.2], ...Array.from({ length: 16 }, (_, i) => at(i / 15))]);
  };
  g.form(curl(-15, -126, -25, -142, -1, 7), CR, { dark: CRD, w: 12 });
  g.form(curl(15, -126, 25, -142, 1, 7), CR, { dark: CRD, w: 12 });
  g.form(curl(0, -132, 0, -154, 1, 8.5), CR, { dark: CRD, w: 12 });
  for (const k of [-1, 1]) {
    g.line(pd(`M${k * 32} -82 C${k * 50} -82 ${k * 62} -90 ${k * 58} -110`), C, 8);
    g.form(circ(k * 58, -116, 9), C, { dark: CD, w: 18 });
  }
  const body = pd('M0 -136 C26 -136 38 -116 38 -92 C38 -62 30 -40 0 -40 C-30 -40 -38 -62 -38 -92 C-38 -116 -26 -136 0 -136 Z');
  g.form(body, C, { dark: CD, w: 76 });
  g.clip(body, () => g.form(ell(-2, -54, 21, 14), BE, { dark: BED, w: 42 }));
  face(g, F, { ex: 18, ey: -106, ew: 14, eh: 19, up: 6, my: -86, mw: 32, mh: 13, fdx: 8, fw: 5.5, fh: 6 });
}

// =====================================================================
// 4. Pills: one tall capsule, with capsules for the crest, arms, legs and feet.
function pills(g) {
  const F = FACE.pills;
  g.ground(40, 'pill');
  for (const k of [-1, 1]) g.form(pill(k * 14, -20, 16, 28), C, { dark: CD, w: 16 });
  for (const k of [-1, 1]) g.form(pill(k * 17, -5, 28, 10), FT);
  for (const k of [-1, 1]) g.at(k * 17, -134, () => g.form(pill(0, 0, 13, 28), CR, { dark: CRD, w: 13 }), 1, k * 0.42);
  g.form(pill(0, -144, 15, 36), CR, { dark: CRD, w: 15 });
  for (const k of [-1, 1]) {
    g.at(k * 50, -84, () => g.form(pill(0, 0, 15, 42), C, { dark: CD, w: 15 }), 1, k * 0.62);
    g.at(k * 61, -106, () => g.form(pill(0, 0, 15, 19), C, { dark: CD, w: 15 }), 1, k * 0.3);
  }
  const body = pill(0, -80, 84, 118);
  g.form(body, C, { dark: CD, w: 84 });
  g.clip(body, () => g.form(pill(-2, -43, 44, 44), BE, { dark: BED, w: 44 }));
  face(g, F, { ex: 21, ey: -104, ew: 15, eh: 22, up: 6, my: -84, mw: 36, mh: 13, fdx: 9, fw: 6, fh: 6 });
}

// =====================================================================
// 5. Squat: very wide and low, a soft box with tiny legs; the crest three low bumps.
function squat(g) {
  const F = FACE.squat;
  g.ground(56, 'pill');
  for (const k of [-1, 1]) g.form(rr(k * 26 - 9, -24, 18, 18, 6), C, { dark: CD, w: 18 });
  for (const k of [-1, 1]) g.form(pill(k * 28, -5, 32, 10), FT);
  for (const [x, y, rx, ry] of [[-26, -90, 13, 9], [26, -90, 13, 9], [0, -95, 15, 12]]) g.form(ell(x, y, rx, ry), CR, { dark: CRD, w: 28 });
  for (const k of [-1, 1]) {
    g.form(tube(k * 58, -62, k * 72, -80, 9.5), C, { dark: CD, w: 19 });
    g.form(circ(k * 74, -85, 10.5), C, { dark: CD, w: 21 });
  }
  const body = rr(-64, -92, 128, 72, 32);
  g.form(body, C, { dark: CD, w: 128 });
  g.clip(body, () => g.form(ell(-3, -30, 38, 14), BE, { dark: BED, w: 76 }));
  face(g, F, { ex: 25, ey: -71, ew: 18, eh: 20, up: 5, my: -58, mw: 44, mh: 13, fdx: 11, fw: 7, fh: 6 });
}

// =====================================================================
// 6. Tall: a tall egg on long thin legs, long arms, the crest three tall plumes.
function tall(g) {
  const F = FACE.tall;
  g.ground(28, 'pill');
  for (const k of [-1, 1]) g.form(leaf(k * 6, -3, k * 26, -3, 0.32, 0.12), FT);
  for (const k of [-1, 1]) g.form(limb(k * 11, -104, 6.5, k * 13, -7, 4), C, { dark: CD, w: 13 });
  g.form(leaf(0, -196, 0, -244, 0.3, 0.3), CR, { dark: CRD, w: 14 });
  for (const k of [-1, 1]) g.form(leaf(k * 9, -194, k * 26, -230, 0.3, 0.2), CR, { dark: CRD, w: 12 });
  for (const k of [-1, 1]) {
    g.form(limb(k * 24, -146, 5.5, k * 52, -194, 4), C, { dark: CD, w: 11 });
    g.form(ell(k * 54, -200, 6, 8.5), C, { dark: CD, w: 12 });
  }
  const body = pd('M0 -212 C22 -212 31 -186 31 -154 C31 -116 24 -96 0 -96 C-24 -96 -31 -116 -31 -154 C-31 -186 -22 -212 0 -212 Z');
  g.form(body, C, { dark: CD, w: 62 });
  g.clip(body, () => g.form(ell(-2, -126, 18, 24), BE, { dark: BED, w: 36 }));
  face(g, F, { ex: 13, ey: -178, ew: 11.5, eh: 16, up: 6, my: -160, mw: 22, mh: 10, fdx: 5.5, fw: 4.5, fh: 5 });
}

// =====================================================================
// 7. Blocks: one box with a stepped crest of three blocks; arms bend square.
function blocks(g) {
  const F = FACE.blocks;
  g.ground(40, 'pill');
  for (const k of [-1, 1]) g.form(rr(k * 15 - 8, -30, 16, 24, 2), C, { dark: CD, w: 16 });
  g.form(rr(-32, -9, 26, 9, [3, 3, 1.5, 1.5]), FT);
  g.form(rr(6, -9, 26, 9, [3, 3, 1.5, 1.5]), FT);
  g.form(rr(-24, -142, 13, 18, 2), CR, { dark: CRD, w: 13 });
  g.form(rr(11, -142, 13, 18, 2), CR, { dark: CRD, w: 13 });
  g.form(rr(-8, -152, 16, 28, 2), CR, { dark: CRD, w: 16 });
  for (const k of [-1, 1]) {
    g.form(rr(k > 0 ? 40 : -60, -78, 20, 13, 3), C, { dark: CD, w: 13 });
    g.form(rr(k > 0 ? 47 : -60, -104, 13, 36, 3), C, { dark: CD, w: 13 });
    g.form(rr(k > 0 ? 46 : -61, -118, 15, 15, 3), C, { dark: CD, w: 15 });
  }
  const body = rr(-43, -130, 86, 106, 8);
  g.form(body, C, { dark: CD, w: 86 });
  g.clip(body, () => g.form(rr(-26, -62, 50, 44, 5), BE, { dark: BED, w: 50 }));
  face(g, F, { ex: 21, ey: -100, ew: 16, eh: 17, up: 6, my: -82, mw: 36, mh: 13, fdx: 9, fw: 6, fh: 6 });
}

// =====================================================================
// 8. Cut-out: an arch (a half circle on straight sides), a crest of three fans, straight thin limbs.
// The shadow is one straight vertical cut.
function cutout(g) {
  const F = FACE.cutout;
  g.ground(38, 'pill');
  for (const k of [-1, 1]) g.cut(segment(k * 17, -1, 12, -1, false), FT, null);
  for (const k of [-1, 1]) g.cut(rr(k * 13 - 4, -34, 8, 30, 0), C, CD, k * 13 + 1);
  g.cut(wedge(-21, -112, 20, -PI, -PI * 0.5), CR, null);
  g.cut(wedge(21, -112, 20, -PI * 0.5, 0), CR, CRD, 30);
  g.cut(wedge(0, -122, 28, -PI * 0.75, -PI * 0.25), CR, CRD, 6);
  for (const k of [-1, 1]) {
    g.cut(bar(k * 36, -72, k * 58, -100, 8), C, CD, k * 48 + 2);
    g.cut(circ(k * 60, -104, 8.5), C, CD, k * 60 + 2);
  }
  const body = new Path2D();
  body.moveTo(-42, -22); body.lineTo(-42, -86); body.arc(0, -86, 42, PI, 0); body.lineTo(42, -22); body.closePath();
  g.cut(body, C, CD, 12);
  g.clip(body, () => g.cut(segment(0, -60, 28, -60, true), BE, BED, 12));
  face(g, F, { ex: 22, ey: -96, ew: 18, eh: 18, up: 7, my: -80, mw: 36, fdx: 7, fw: 6, fh: 7 });
}

// =====================================================================
// 9. Facets: a cut gem with three crystal shards on top. The shadow is one facet down the right.
function facets(g) {
  const F = FACE.facets;
  g.ground(40, 'pill');
  for (const k of [-1, 1]) g.cut(poly([[k * 6, -1], [k * 6, -8], [k * 18, -11], [k * 31, -6], [k * 31, -1]]), FT, null);
  for (const k of [-1, 1]) g.cut(poly([[k * 7, -34], [k * 23, -34], [k * 21, -7], [k * 9, -7]]), C, CD, poly([[k * 15, -34], [k * 40, -34], [k * 40, -7], [k * 15, -7]]));
  g.cut(poly([[-26, -124], [-30, -144], [-18, -150], [-10, -128]]), CR, null);
  g.cut(poly([[26, -124], [30, -144], [18, -150], [10, -128]]), CR, CRD, poly([[24, -150], [40, -150], [40, -120], [26, -124]]));
  g.cut(poly([[-10, -128], [-8, -156], [2, -164], [10, -154], [10, -128]]), CR, CRD, poly([[2, -164], [10, -154], [10, -128], [3, -128]]));
  for (const k of [-1, 1]) {
    g.cut(poly([[k * 34, -78], [k * 40, -66], [k * 62, -96], [k * 55, -102]]), C, CD, k > 0 ? poly([[48, -84], [40, -66], [62, -96], [58, -99]]) : null);
    g.cut(ngon(k * 61, -106, 10, 6, 0), C, CD, k > 0 ? poly([[61, -118], [74, -118], [74, -94], [61, -94]]) : poly([[-61, -118], [-50, -118], [-50, -94], [-61, -94]]));
  }
  const body = poly([[-26, -132], [26, -132], [44, -110], [46, -50], [30, -24], [-30, -24], [-46, -50], [-44, -110]]);
  g.cut(body, C, CD, poly([[26, -132], [44, -110], [46, -50], [30, -24], [14, -24], [26, -78]]));
  g.clip(body, () => g.cut(hex(-2, -48, 56, 40), BE, BED, poly([[12, -70], [40, -70], [40, -20], [6, -20]])));
  face(g, F, { ex: 21, ey: -100, ew: 19, eh: 17, up: 6, my: -84, mw: 38, mh: 15, fdx: 9, fw: 7, fh: 7 });
}

// =====================================================================
// 10. Spiky: a shape with pointed shoulders, a crest of three spikes, claws and pointed feet.
// The shadow splits each shape along a ridge.
function spiky(g) {
  const F = FACE.spiky;
  g.ground(40, 'pill');
  for (const k of [-1, 1]) g.cut(poly([[k * 6, -1], [k * 9, -11], [k * 34, -1]]), FT, null);
  for (const k of [-1, 1]) g.cut(poly([[k * 6, -36], [k * 26, -36], [k * 14, -6]]), C, CD, poly([[k * 16, -40], [k * 40, -40], [k * 40, 0], [k * 14, -6]]));
  g.cut(poly([[-30, -120], [-30, -152], [-10, -128]]), CR, null);
  g.cut(poly([[30, -120], [30, -152], [10, -128]]), CR, CRD, poly([[30, -120], [30, -152], [24, -126]]));
  g.cut(poly([[-12, -128], [0, -172], [12, -128]]), CR, CRD, poly([[0, -128], [0, -172], [12, -128]]));
  for (const k of [-1, 1]) {
    g.cut(poly([[k * 34, -80], [k * 42, -64], [k * 60, -100], [k * 54, -104]]), C, CD, k > 0 ? poly([[48, -84], [42, -64], [60, -100], [57, -102]]) : null);
    // a hand of three claws
    g.cut(poly([[k * 52, -100], [k * 50, -122], [k * 57, -110], [k * 62, -126], [k * 64, -110], [k * 72, -118], [k * 66, -98], [k * 58, -94]]), C, CD, k > 0 ? poly([[62, -126], [64, -110], [72, -118], [66, -98], [60, -100]]) : null);
  }
  const body = poly([[-34, -126], [0, -134], [34, -126], [52, -78], [36, -24], [-36, -24], [-52, -78]]);
  g.cut(body, C, CD, poly([[0, -134], [34, -126], [52, -78], [36, -24], [16, -24], [20, -80]]));
  g.clip(body, () => g.cut(poly([[-26, -62], [24, -62], [16, -36], [-2, -26], [-18, -36]]), BE, BED, poly([[4, -62], [24, -62], [16, -36], [-2, -26]])));
  face(g, F, { ex: 22, ey: -100, ew: 15, eh: 21, up: 5, my: -82, mw: 38, mh: 16, fdx: 9, fw: 6, fh: 7 });
}

export const MONSTER = { blob, circles, noodle, pills, squat, tall, blocks, cutout, facets, spiky };
