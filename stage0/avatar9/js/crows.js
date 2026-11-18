// One crow, eight looks, all flat vector: flat fills, simple clean shapes, at most a flat shade tone or two.
// No gradients, no hatching, no texture, no heavy outlines, no glows. The eight vary moderately, inside one
// family: the body's shape and proportions, the shape language (soft curves or crisp angles), the legs and
// wings, the eye, the beak, how much shading (none, one shade, one shade and a thin light edge), and the
// colour of the black.
//
// The same bird in the same pose in all eight: three-quarters on, turned a little to the right, so the beak
// points right, the near eye sits left of the beak and the far eye peeks past the head's right edge, the
// body shows its chest and a little of its left side, the near wing lies on that side and the tail sticks
// out behind, low on the left. Light comes from the upper left, as in the rest of the app's art, so a shade
// falls on the lower right of each form.
//
// Every crow is drawn with its feet on the floor at (0, 0), in units of about one point at room size; y grows
// downwards, so the bird stands in negative y. g is the kit's pen; g.ctx the canvas.

import { pen, rr, pill, circ, ell, poly, rpoly, limb, leaf, union, blob, spline, segment, clipOut } from './kit.js';

// ---------- small shared helpers ----------
const fill = (c, p, col) => { c.fillStyle = col; c.fill(p); };
const stroke = (c, p, col, w, cap = 'round') => {
  c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round'; c.stroke(p); c.restore();
};
// a whole rectangle, to fill under a clip
const BIG = rr(-400, -400, 800, 600, 0);
// the flat shadow on the floor, the same kind under all eight
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
// top edge (a raven's beak arches more), hook bends the tip down past the lower edge, round softens the tip.
function beakPath(x0, yTop, yBot, tx, ty, { arch = 0.1, hook = 0, round = 0 } = {}) {
  const L = tx - x0, d = yBot - yTop, p = new Path2D();
  p.moveTo(x0, yTop);
  p.bezierCurveTo(x0 + L * 0.4, yTop - L * arch, x0 + L * 0.8, ty - d * 0.35 - L * arch * 0.4, tx, ty + hook);
  if (round) p.quadraticCurveTo(tx + round * 0.4, ty + hook + round, tx - round * 1.2, ty + hook + round * 0.9);
  p.bezierCurveTo(x0 + L * 0.75, ty + d * 0.18, x0 + L * 0.3, yBot + 0.5, x0, yBot);
  p.closePath();
  return p;
}
// paint(pen) drawn on a spare sheet the size of the canvas, then laid on the canvas through region in one
// step, so a picture made of several layers has no seam where the region's edge crosses it
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
// feathers lie over the base of a crow's beak. A crow paints its head again through this, after its beak,
// so the beak comes out of the feathers instead of being stuck on with a straight edge. sharp: a corner
// instead of a curve.
function face(x0, yTop, yBot, bulge = 7, sharp = false) {
  const p = new Path2D(), m = (yTop + yBot) / 2;
  p.moveTo(x0 - 160, yTop - 80);
  p.lineTo(x0 + 2, yTop - 80);
  p.lineTo(x0 + 2, yTop - 1);
  if (sharp) p.lineTo(x0 + bulge + 2, m - (yBot - yTop) * 0.1);
  else p.bezierCurveTo(x0 + bulge + 3, yTop + (m - yTop) * 0.5, x0 + bulge + 3, yBot - (yBot - m) * 0.6, x0, yBot + 2);
  p.lineTo(x0, yBot + 2);
  p.lineTo(x0 - 4, yBot + 60);
  p.lineTo(x0 - 160, yBot + 60);
  p.closePath();
  return p;
}
// the lower part of a beak (below a straight line from (x0, y0) to the tip), for a two-tone beak
const lowerHalf = (x0, y0, tx, ty) => poly([[x0 - 4, y0], [tx + 8, ty], [tx + 8, ty + 60], [x0 - 4, y0 + 60]]);
// a lid: the part of an eye above the line from (x0, y0) to (x1, y1), filled with the head's colour
const lidAbove = (x0, y0, x1, y1) => poly([[x0, y0], [x1, y1], [x1, y1 - 40], [x0, y0 - 40]]);
// the same, its edge bowed by sag in the middle (a negative sag bows it up, the way a lid follows the eye)
function lidArc(x0, y0, x1, y1, sag) {
  const p = new Path2D();
  p.moveTo(x0, y0); p.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1);
  p.lineTo(x1, y1 - 40); p.lineTo(x0, y0 - 40); p.closePath();
  return p;
}

// =====================================================================================================
// 1  PLUMP. Round and soft: an egg of a body with the head sunk into it, no neck, every edge a curve.
//    Blue-black. One flat shade on the lower right. Short thick legs with round toes. A soft teardrop wing.
//    Eyes: dark dots with a white catchlight, the top cut level by a lid.
// =====================================================================================================
function plump(g) {
  const c = g.ctx;
  const BASE = '#171b44', SHADE = '#0e1131', WING = '#232a63', WSH = '#181d48';
  ground(g, 6, 58);
  fill(c, blob([[-26, -54], [-62, -42], [-90, -26], [-88, -13], [-60, -12], [-20, -30]]), '#13173b');
  fill(c, leg(22, -34, 4.4, 23, -7, 3.8, { len: 14, r: 3.4, tip: 2.2 }), '#10132c');
  fill(c, leg(-6, -32, 4.8, -7, -5, 4.2, { len: 15, r: 3.6, tip: 2.4 }), '#161a38');

  const body = blob([[-54, -100], [-28, -122], [8, -127], [42, -114], [58, -86], [55, -54], [34, -31], [4, -24], [-26, -29], [-48, -50], [-59, -76]]);
  const head = circ(24, -127, 33);
  const mass = union(body, head);
  const paint = k => { fill(k.ctx, mass, BASE); k.plane(mass, SHADE, 12, 9); };
  paint(g);

  const eye = (x, y, rx, ry, lid) => {
    fill(c, ell(x, y, rx + 1.6, ry + 1.6), '#37417f');
    fill(c, ell(x, y, rx, ry), '#05060f');
    fill(c, circ(x - rx * 0.32, y + ry * 0.02, Math.min(rx, ry) * 0.38), '#ffffff');
    g.clip(ell(x, y, rx + 1.7, ry + 1.7), () => fill(c, rr(x - rx - 3, y - ry - 4, rx * 2 + 6, ry * 0.62 + 4, 0), lid));
  };
  // a short, stout beak with a rounded tip, the lower half a shade darker, its root in the face's feathers
  const beak = beakPath(40, -138, -109, 91, -118, { arch: 0.06, round: 3 });
  fill(c, beak, '#2c3260');
  g.clip(beak, () => fill(c, lowerHalf(40, -122, 92, -116), '#191d3c'));
  through(g, face(42, -138, -109, 8), paint);

  const wing = blob([[-34, -108], [-6, -98], [4, -76], [-8, -52], [-40, -30], [-78, -18, 0], [-58, -48], [-52, -86]]);
  fill(c, wing, WING);
  g.plane(wing, WSH, 4, 5);
  eye(26, -136, 7.4, 7.8, BASE);
  // the far eye, peeking past the edge of the head, above the beak's root
  clipOut(c, head, beak, () => eye(51, -141, 4.2, 7, SHADE));
}

// =====================================================================================================
// 2  SLEEK. Long and elegant, taking from round 8's Stilt: a slim body on a long neck, a long beak, a long
//    tail. Purple-black. One flat shade, and a thin warm edge of light only along the edges that face the
//    light. Long legs, but solid ones. A long slender wing. Eyes: half-closed almonds with a pale silver iris.
// =====================================================================================================
function sleek(g) {
  const c = g.ctx;
  const BASE = '#1d1736', SHADE = '#120e25', WING = '#2a2150', EDGE = '#f0c77c';
  ground(g, 8, 54);
  const tail = blob([[-14, -94], [-30, -108], [-54, -66], [-76, -20, 0], [-62, -18, 0], [-24, -76]]);
  fill(c, tail, '#161130');
  g.rimOn(tail, EDGE, 1.3, 0.7);
  fill(c, leg(26, -72, 3, 28, -6, 2.3, { len: 18, r: 2.2, tip: 0.9 }), '#150f2a');
  fill(c, leg(2, -70, 3.3, -2, -4, 2.5, { len: 19, r: 2.4, tip: 1 }), '#1c1636');

  const mass = blob([
    [14, -204], [36, -200], [50, -188, 0.5], [52, -172, 0.5], [40, -162], [34, -148], [46, -126], [52, -102],
    [42, -80], [20, -66], [-2, -66], [-20, -78], [-30, -106], [-26, -136], [-14, -158], [-6, -180], [-2, -198],
  ]);
  const paint = k => { fill(k.ctx, mass, BASE); k.plane(mass, SHADE, 9, 6); k.rimOn(mass, EDGE, 1.7); };
  paint(g);

  // eyes: half-closed almonds, a pale silver iris and a small pupil, the lid nearly level
  const eye = (ax, ay, bx, by, k, px, py, pr, lidCol, clipTo) => {
    const e = leaf(ax, ay, bx, by, k, k * 0.85);
    const draw = () => {
      fill(c, e, '#dde5f3');
      g.clip(e, () => {
        fill(c, circ(px, py, pr * 2.05), '#a9b9d4');
        fill(c, circ(px, py, pr), '#0a0814');
        fill(c, circ(px - pr * 0.8, py + pr * 0.45, pr * 0.36), '#ffffff');
        const midY = (ay + by) / 2 - 0.4;
        fill(c, lidAbove(ax - 3, midY + 0.6, bx + 3, midY - 1), lidCol);
        stroke(c, poly([[ax - 3, midY + 0.6], [bx + 3, midY - 1]]), EDGE, 1.3);
      });
    };
    clipTo ? g.clip(clipTo, draw) : draw();
  };
  // a long, slender beak: deep at the root, as a crow's is, its top catching the light
  const beak = beakPath(32, -187, -158, 106, -168, { arch: 0.07 });
  fill(c, beak, '#2c2644');
  g.clip(beak, () => fill(c, lowerHalf(32, -171, 106, -167), '#1a1530'));
  g.rimOn(beak, EDGE, 1.1, 0.7);
  through(g, face(36, -187, -158, 6), paint);

  const wing = blob([[-18, -152], [4, -138], [8, -108], [-6, -84], [-32, -52], [-66, -24, 0], [-42, -72], [-28, -112]]);
  fill(c, wing, WING);
  g.plane(wing, SHADE, 4, 4);
  g.rimOn(wing, EDGE, 1.5, 0.85);
  eye(10, -184, 35, -188, 0.42, 26, -184, 3.4, BASE);
  // the far eye, peeking past the edge of the head, above the beak's root
  clipOut(c, mass, beak, () => eye(40, -191, 51, -192, 0.4, 47, -190, 2.3, BASE));
}

// =====================================================================================================
// 3  HOODED. Compact and sturdy, a rounded box of a bird. Coloured like a hooded crow: a grey body with a
//    black head, bib, wings and tail. No shading at all: the two colours do the work. Sturdy legs. A folded
//    wing with two notches cut where its long feathers part. A medium beak with a slight hook. Eyes: a pale
//    cream ring round a dark centre, the top cut level by a lid.
// =====================================================================================================
function hooded(g) {
  const c = g.ctx;
  const GREY = '#a7acc5', BLACK = '#1a1b2b', LEG = '#17182a';
  ground(g, 2, 62);
  const tail = rpoly([[-34, -62, 6], [-94, -42, 9], [-96, -24, 9], [-36, -36, 6]]);
  fill(c, tail, BLACK);
  fill(c, leg(22, -34, 4, 24, -7, 3.4, { len: 15, r: 2.9, tip: 1.3 }), '#121322');
  fill(c, leg(-6, -32, 4.3, -8, -5, 3.6, { len: 16, r: 3, tip: 1.4 }), LEG);

  const body = blob([
    [-50, -118, 0.85], [-22, -136, 0.85], [18, -140, 0.85], [48, -122, 0.85], [60, -90, 0.85], [56, -56, 0.85],
    [38, -34, 0.85], [6, -26, 0.85], [-26, -30, 0.85], [-50, -50, 0.85], [-60, -84, 0.85]]);
  const head = rpoly([[-6, -158, 18], [10, -172, 16], [44, -171, 18], [56, -150, 14], [48, -130, 14], [4, -128, 14]]);
  const paint = k => {
    fill(k.ctx, body, GREY);
    // the black bib, from the throat down over the upper chest, ending in a soft point
    k.clip(body, () => fill(k.ctx, blob([[-4, -146], [46, -142], [60, -122], [52, -102], [36, -92], [16, -104], [2, -126]]), BLACK));
    fill(k.ctx, head, BLACK);
  };
  paint(g);

  const eye = (x, y, rx, ry) => {
    fill(c, ell(x, y, rx, ry), '#ece4cf');
    fill(c, ell(x + rx * 0.08, y + ry * 0.06, rx * 0.6, ry * 0.6), '#0d0d16');
    fill(c, circ(x - rx * 0.12, y - ry * 0.05, Math.min(rx, ry) * 0.17), '#ece4cf');
    g.clip(ell(x, y, rx + 1, ry + 1), () => fill(c, lidAbove(x - rx - 2, y - ry * 0.42, x + rx + 2, y - ry * 0.42), BLACK));
  };
  const beak = beakPath(41, -154, -126, 99, -135, { arch: 0.08, hook: 3, round: 2 });
  fill(c, beak, '#2b2c3e');
  g.clip(beak, () => fill(c, lowerHalf(41, -138, 98, -134), '#1c1d2c'));
  through(g, face(43, -154, -126, 7), paint);

  // the near wing, folded, a soft point at its end, with two notches cut in its lower edge where the long
  // feathers part; it's set off from the black tail by a thin line where it lies over it
  const wing = blob([[-38, -122], [-8, -114], [2, -92], [-12, -68], [-40, -48], [-88, -34, 0.5], [-66, -60], [-56, -92], [-52, -110]]);
  const notches = union(poly([[-62, -42], [-55, -44.5], [-38, -62]]), poly([[-78, -37], [-71, -39], [-54, -54]]));
  g.clip(tail, () => stroke(c, wing, '#3d3f5a', 2.6));
  clipOut(c, wing, notches, () => fill(c, BIG, BLACK));
  eye(22, -152, 7.6, 7.6);
  // the far eye, peeking past the edge of the head, above the beak's root
  clipOut(c, head, beak, () => eye(49, -158, 4.2, 7));
}

// =====================================================================================================
// 4  CRISP. Crisp angles: every part a few straight edges with the corners only just rounded, like a cut
//    out shape. Green-sheened black, the wing a deep sheen green. One flat shade, cut straight down the
//    front of the bird. Straight legs, sharp toes. A sharp wedge of a beak. Eyes: angular almonds with a
//    dark iris, cut by a straight lid.
// =====================================================================================================
function crisp(g) {
  const c = g.ctx;
  const BASE = '#1b2a2f', SHADE = '#0e181b', WING = '#21403f', WSH = '#172d2e', LEG = '#101a1e';
  ground(g, 4, 60);
  const shadeSide = poly([[36, -210], [300, -210], [300, 50], [-14, 50]]);
  const tail = rpoly([[-24, -76], [-102, -28], [-94, -15], [-18, -50]], 2);
  fill(c, tail, '#132024');
  // legs: straight, a sharp heel at the top, sharp toes
  const sharpLeg = (x0, x1, col) => {
    fill(c, poly([[x0 - 2.8, -56], [x0 + 2.8, -56], [x1 + 2.2, -3], [x1 - 2.2, -3]]), col);
    fill(c, poly([[x1 - 2, -5], [x1 + 18, -1.5], [x1 - 1, 0]]), col);
    fill(c, poly([[x1 - 1, -3], [x1 + 12, 4], [x1 - 2, 1]]), col);
    fill(c, poly([[x1 + 1, -4.5], [x1 - 12, -1], [x1, 0]]), col);
  };
  sharpLeg(22, 24, '#0c1417');
  sharpLeg(-4, -6, LEG);

  const body = rpoly([[-46, -146], [20, -160], [54, -128], [58, -90], [40, -56], [6, -44], [-26, -52], [-50, -94]], 3);
  const head = rpoly([[-10, -172], [6, -192], [40, -192], [56, -174], [54, -156], [32, -146], [0, -150]], 3);
  const mass = union(body, head);
  const paint = k => { fill(k.ctx, mass, BASE); k.clip(mass, () => fill(k.ctx, shadeSide, SHADE)); };
  paint(g);

  // eyes: angular almonds, a dark iris with a small catchlight, a straight lid about halfway down
  const eye = (pts, ix, iy, ir, lid, lidCol, clipTo) => {
    const e = poly(pts);
    const draw = () => {
      fill(c, e, '#dbe7e3');
      g.clip(e, () => {
        fill(c, circ(ix, iy, ir), '#0a1113');
        fill(c, rr(ix - ir * 0.62, iy - ir * 0.05, ir * 0.42, ir * 0.42, 0.4), '#ffffff');
        fill(c, lidAbove(...lid), lidCol);
      });
    };
    clipTo ? g.clip(clipTo, draw) : draw();
  };
  // the beak: a sharp wedge, the lower half darker, its root in a sharp point of feathers
  const beak = poly([[38, -181], [108, -164], [40, -151]]);
  fill(c, beak, '#2a3a40');
  fill(c, poly([[39, -165], [108, -164], [40, -151]]), '#172126');
  through(g, face(41, -181, -151, 11, true), paint);

  // the wing: a long triangle, its lower edge stepped where the long feathers lie
  const wing = rpoly([[-42, -146], [-4, -134], [0, -104], [-18, -78], [-36, -72], [-48, -56], [-66, -48], [-94, -28], [-72, -62], [-60, -102]], 2);
  fill(c, wing, WING);
  g.clip(wing, () => fill(c, poly([[-120, -60], [0, -124], [20, -100], [20, 0], [-120, 0]]), WSH));
  eye([[10, -175], [20, -183], [34, -182], [32, -172], [22, -169]], 24, -176, 5.4, [0, -177, 40, -181.5], BASE);
  // the far eye, peeking past the edge of the head, above the beak's root
  clipOut(c, mass, beak, () => eye([[45, -184], [53, -188], [56, -181], [50, -177]], 51, -182, 3.6, [40, -182.5, 60, -186], SHADE));
}

// =====================================================================================================
// 5  LONGTAIL. Smooth and streamlined: a teardrop of a body, a small round head and a long tail that
//    reaches nearly to the floor behind. Slate black, with a blue sheen on the wing and tail. One flat shade
//    and a thin cool edge of light. Thin straight legs. A smooth blade of a wing. Eyes: a pale iris round a
//    small pupil (the knowing look of a jackdaw), under a softly curved lid.
// =====================================================================================================
function longtail(g) {
  const c = g.ctx;
  const BASE = '#1b2133', SHADE = '#111522', WING = '#21407a', WSH = '#193266', TAIL = '#1d3264', EDGE = '#a9c4ff';
  ground(g, -6, 70);
  const tail = blob([[-30, -84], [-50, -94], [-84, -58], [-124, -12, 0], [-108, -8, 0], [-62, -48], [-28, -62]]);
  fill(c, tail, TAIL);
  g.plane(tail, WSH, 4, 4);
  g.rimOn(tail, EDGE, 1.2, 0.7);
  fill(c, leg(20, -50, 2.6, 22, -6, 2, { len: 16, r: 1.9, tip: 0.8 }), '#0e111c');
  fill(c, leg(-4, -50, 2.8, -6, -4, 2.2, { len: 17, r: 2, tip: 0.8 }), '#151a29');

  const body = blob([[-48, -128], [-16, -148], [22, -142], [48, -118], [52, -86], [38, -58], [12, -46], [-18, -50], [-46, -72], [-60, -102]]);
  const head = circ(22, -160, 25);
  const mass = union(body, head);
  const paint = k => { fill(k.ctx, mass, BASE); k.plane(mass, SHADE, 11, 8); k.rimOn(mass, EDGE, 1.2, 0.85); };
  paint(g);

  const eye = (x, y, rx, ry, lidCol) => {
    fill(c, ell(x, y, rx, ry), '#d8dde8');
    fill(c, ell(x + rx * 0.15, y + ry * 0.12, rx * 0.4, ry * 0.4), '#0b0c16');
    fill(c, circ(x - rx * 0.15, y + ry * 0.0, Math.min(rx, ry) * 0.15), '#ffffff');
    g.clip(ell(x, y, rx + 1, ry + 1), () => fill(c, lidArc(x - rx - 2, y - ry * 0.18, x + rx + 2, y - ry * 0.26, -ry * 0.16), lidCol));
  };
  const beak = beakPath(37, -166, -144, 98, -154, { arch: 0.06 });
  fill(c, beak, '#2c3246');
  g.clip(beak, () => fill(c, lowerHalf(37, -154, 98, -153), '#1a1e2c'));
  through(g, face(39, -166, -144, 6), paint);

  // the wing: a smooth blade, in the blue sheen a crow's wing shows in the light
  const wing = blob([[-34, -138], [-2, -124], [4, -98], [-14, -72], [-48, -48], [-90, -30, 0], [-62, -66], [-50, -110]]);
  fill(c, wing, WING);
  g.plane(wing, WSH, 4, 5);
  g.rimOn(wing, EDGE, 1.2, 0.7);
  eye(25, -165, 6.8, 6.8, BASE);
  // the far eye, peeking past the edge of the head, above the beak's root
  clipOut(c, head, beak, () => eye(43, -170, 3.6, 6, SHADE));
}

// =====================================================================================================
// 6  RUFF. Big and heavy, like a raven: a big flat-crowned head, a ruff of shaggy throat feathers, a deep
//    arched beak, a wedge of a tail. Warm black, almost brown. One flat shade. Strong legs, thick toes
//    ending in claws. The wing ends in three pointed feathers. Eyes: a dark brown iris under a heavy level lid.
// =====================================================================================================
function ruff(g) {
  const c = g.ctx;
  const BASE = '#2a1f28', SHADE = '#1a1218', WING = '#352834', WSH = '#261c25';
  ground(g, 4, 66);
  // tail: a raven's wedge, coming to a point
  fill(c, blob([[-24, -70], [-60, -62], [-104, -26, 0], [-62, -26], [-22, -44]]), '#221922');
  const claws = { len: 18, r: 3.4, tip: 0.6 };
  fill(c, leg(24, -46, 4.6, 26, -8, 3.8, claws), '#1a1219');
  fill(c, leg(-6, -46, 5, -8, -6, 4, claws), '#231a21');

  const body = blob([[-52, -136], [-20, -156], [22, -152], [54, -126], [64, -94], [54, -62], [28, -44], [-6, -42], [-38, -56], [-58, -90], [-62, -118]]);
  const head = blob([[-8, -176], [2, -196], [28, -203], [50, -194], [59, -176, 0.6], [52, -158], [30, -148], [6, -152], [-8, -162]]);
  // the ruff: the shaggy feathers of the throat, which make the front of the neck three soft points
  const ruffP = blob([[30, -156], [50, -154], [62, -140, 0], [56, -136], [66, -124, 0], [59, -120], [67, -106, 0], [58, -100], [36, -112]]);
  const mass = union(body, head, ruffP);
  const paint = k => { fill(k.ctx, mass, BASE); k.plane(mass, SHADE, 13, 9); };
  paint(g);

  const eye = (x, y, rx, ry, lidCol) => {
    fill(c, ell(x, y, rx, ry), '#6a4430');
    fill(c, ell(x + rx * 0.1, y + ry * 0.08, rx * 0.52, ry * 0.52), '#0f0907');
    fill(c, circ(x - rx * 0.3, y + ry * 0.12, Math.min(rx, ry) * 0.22), '#f3e6d6');
    g.clip(ell(x, y, rx + 1, ry + 1), () => fill(c, lidAbove(x - rx - 2, y - ry * 0.3, x + rx + 2, y - ry * 0.3), lidCol));
  };
  // a heavy beak, arched along the top, its base in a tuft of bristles
  const beak = beakPath(38, -180, -146, 112, -158, { arch: 0.13, hook: 3, round: 2.5 });
  fill(c, beak, '#3b2f37');
  g.clip(beak, () => fill(c, lowerHalf(38, -161, 112, -155), '#241b22'));
  through(g, face(42, -180, -146, 9), paint);

  // the wing: one shape, its end cut into three pointed feathers of even length, side by side
  const wing = blob([
    [-36, -142], [-4, -130], [4, -104], [-10, -80], [-30, -64], [-46, -54],
    [-62, -32, 0], [-60, -50, 0], [-74, -38, 0], [-70, -56, 0], [-86, -44, 0], [-68, -80], [-56, -112]]);
  fill(c, wing, WING);
  g.plane(wing, WSH, 4, 5);
  eye(24, -178, 7, 7, BASE);
  // the far eye, peeking past the edge of the head, above the beak's root
  clipOut(c, head, beak, () => eye(51, -184, 4, 6.4, SHADE));
}

// =====================================================================================================
// 7  BEAN. Built from simple capsules, in the same family as the round 4 animals: a capsule of a body
//    leaning forward, a round head, a capsule wing and tail, short stub legs and capsule feet. Charcoal
//    black. One broad flat shade down the right side. Eyes: white, with a dark pupil and a lid a third of
//    the way down.
// =====================================================================================================
function bean(g) {
  const c = g.ctx;
  const BASE = '#262a43', SHADE = '#1a1d30', WING = '#363b5c', WSH = '#2c3150', FEET = '#14162a';
  ground(g, 4, 54);
  const turnPill = (cx, cy, w, h, a) => { const p = new Path2D(); p.addPath(pill(0, 0, w, h), new DOMMatrix().translate(cx, cy).rotate(a)); return p; };
  // the tail: a fan with rounded corners, wider at its end
  fill(c, rpoly([[-30, -64, 6], [-96, -54, 9], [-84, -12, 9], [-24, -40, 6]]), '#1d2034');
  fill(c, union(rr(17, -34, 9, 30, 4.5), pill(28, -5, 26, 9)), '#0f1120');
  fill(c, union(rr(-9, -32, 10, 30, 5), pill(1, -4, 28, 10)), FEET);

  // a capsule of a body, leaning forward, and a round head on it
  const body = turnPill(2, -84, 92, 126, 30);
  const head = circ(22, -146, 31);
  const mass = union(body, head);
  const paint = k => { fill(k.ctx, mass, BASE); k.plane(mass, SHADE, 20, 5); };
  paint(g);

  // eyes: a white rounded box, a dark upright pupil, a lid a third of the way down with a dark line along it
  const eye = (x, y, w, h, lidCol) => {
    const box = (grow = 0) => rr(x - w / 2 - grow, y - h / 2 - grow, w + grow * 2, h + grow * 2, Math.min(w, h) * 0.46 + grow);
    const e = box(), lidY = y - h * 0.16;
    fill(c, e, '#ffffff');
    g.clip(e, () => {
      fill(c, pill(x + w * 0.12, y + h * 0.12, w * 0.5, h * 0.56), '#14163a');
      fill(c, circ(x + w * 0.02, y + h * 0.02, w * 0.12), '#ffffff');
    });
    g.clip(box(1), () => fill(c, lidAbove(x - w, lidY, x + w, lidY), lidCol));
    g.clip(e, () => stroke(c, poly([[x - w, lidY], [x + w, lidY]]), '#11131f', 1.4));
  };
  // the beak: a rounded wedge, the lower half darker
  const beak = rpoly([[34, -162, 3], [104, -143, 7], [36, -126, 3]]);
  fill(c, beak, '#3b4062');
  g.clip(beak, () => fill(c, lowerHalf(34, -144, 104, -142), '#262a44'));
  through(g, face(39, -162, -126, 6), paint);

  const wing = turnPill(-24, -84, 38, 96, 32);
  fill(c, wing, WING);
  g.plane(wing, WSH, 7, 3);
  eye(24, -154, 15, 17, BASE);
  // the far eye, peeking past the edge of the head, above the beak's root
  clipOut(c, head, beak, () => eye(48, -160, 7, 15, SHADE));
}

// =====================================================================================================
// 8  INK. A plain silhouette, like a printed mark: one flat near-black, no shading at all. Smooth curves that
//    meet in sharp points at the tail, the wing tip and the beak. The wing is drawn only by a thin blue
//    line along its edge. Legs: single thin strokes. Eyes: a white half-moon, flat along the top, with the
//    pupil low and forward.
// =====================================================================================================
function ink(g) {
  const c = g.ctx;
  const INK = '#101119', GAP = '#3b4687';
  ground(g, 0, 60);
  const tail = blob([[-26, -78], [-44, -94], [-110, -24, 0], [-34, -56]]);
  const body = blob([[-44, -138], [-12, -154], [24, -146], [50, -120], [54, -86], [40, -58], [12, -46], [-16, -50], [-40, -70], [-54, -104]]);
  const head = circ(20, -162, 26);
  const beak = beakPath(38, -165, -143, 106, -153, { arch: 0.07 });
  const legStroke = (pts, toes) => {
    stroke(c, spline(pts), INK, 3.2);
    toes.forEach(t => stroke(c, spline(t), INK, 2.4));
  };
  legStroke([[22, -50], [23, -26], [24, -5]], [[[24, -5], [42, -3]], [[24, -5], [36, 1]], [[24, -5], [13, -4]]]);
  legStroke([[-4, -50], [-5, -26], [-6, -4]], [[[-6, -4], [13, -2]], [[-6, -4], [7, 2]], [[-6, -4], [-18, -3]]]);
  const all = union(tail, body, head, beak);
  fill(c, all, INK);
  // the wing: the same ink, set apart from the body and tail by a thin line where it lies over them
  const wing = blob([[-38, -132], [-6, -122], [2, -98], [-18, -72], [-56, -46], [-98, -32, 0], [-62, -70], [-52, -110]]);
  g.clip(all, () => stroke(c, wing, GAP, 2.4));
  fill(c, wing, INK);

  const eye = (x, y, r, rx) => {
    const e = segment(x, y, r, y - r * 0.12);
    c.save(); c.translate(x, y); c.scale(rx / r, 1); c.translate(-x, -y);
    fill(c, e, '#eef0f8');
    g.clip(e, () => fill(c, circ(x + r * 0.32, y + r * 0.5, r * 0.5), INK));
    c.restore();
  };
  eye(24, -164, 7.6, 7.6);
  // the far eye, at the edge of the head just above the beak's root
  clipOut(c, head, beak, () => eye(41, -170, 6.2, 3.4));
}

export const CROWS = [
  { id: 'plump', name: 'Plump', draw: plump },
  { id: 'sleek', name: 'Sleek', draw: sleek },
  { id: 'hooded', name: 'Hooded', draw: hooded },
  { id: 'crisp', name: 'Crisp', draw: crisp },
  { id: 'longtail', name: 'Longtail', draw: longtail },
  { id: 'ruff', name: 'Ruff', draw: ruff },
  { id: 'bean', name: 'Bean', draw: bean },
  { id: 'ink', name: 'Ink', draw: ink },
];
