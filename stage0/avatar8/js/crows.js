// One crow, eight looks. The same bird in the same pose in all eight: three-quarters on, turned a little to
// the right, so the beak points right of centre, the near eye sits left of the beak and the far eye at the
// head's right edge, the body shows its chest and a little of its left side, the near wing lies on that side
// and the tail sticks out behind, low on the left. What changes from one look to the next, on purpose and a
// lot, is the shape language, the shading, the legs and wings, and the eyes.
//
// Every crow is drawn with its feet (or its belly) on the floor at (0, 0), in units of about one point at
// room size; y grows downwards, so the bird stands in negative y. g is the kit's pen; g.ctx the canvas.

import {
  PI, rr, pill, circ, ell, poly, rpoly, tube, limb, leaf, union, blob, spline,
  lin, rad, rng, shadowed, clipOut, shift, wedge,
} from './kit.js';

// ---------- small shared helpers ----------
const fillWith = (c, p, style) => { c.fillStyle = style; c.fill(p); };
const strokeWith = (c, p, style, w, cap = 'round') => {
  c.save(); c.strokeStyle = style; c.lineWidth = w; c.lineCap = cap; c.lineJoin = 'round'; c.stroke(p); c.restore();
};
// a whole rectangle to fill under a clip
const BIG = rr(-400, -400, 800, 600, 0);
// a soft round shadow on the floor
function softGround(c, w, a = 0.45) {
  c.save(); c.translate(0, 1); c.scale(1, 0.14);
  c.fillStyle = rad(c, 0, 0, 0, 0, 0, w, [[0, `rgba(10,8,44,${a})`], [0.55, `rgba(10,8,44,${a * 0.6})`], [1, 'rgba(10,8,44,0)']]);
  c.fillRect(-w, -w, w * 2, w * 2);
  c.restore();
}
// a pointed feather: from base (bx, by) to tip (tx, ty), w wide at the base
function quill(bx, by, tx, ty, w, bend = 0.12) {
  const dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const p = new Path2D();
  p.moveTo(bx + nx * w / 2, by + ny * w / 2);
  p.quadraticCurveTo(bx + dx * 0.6 + nx * w * (0.55 + bend), by + dy * 0.6 + ny * w * (0.55 + bend), tx, ty);
  p.quadraticCurveTo(bx + dx * 0.6 - nx * w * (0.45 - bend), by + dy * 0.6 - ny * w * (0.45 - bend), bx - nx * w / 2, by - ny * w / 2);
  p.closePath();
  return p;
}

// =====================================================================================================
// 1  PEBBLE. Round and soft: one egg of a body, a ball of a head sunk into it, every edge a curve.
//    Shading: a soft airbrushed gradient, light from the top left, with a blue-green sheen on the head and a
//    warm glow from the floor on the belly. Legs: none showing; it sits on its round belly. Wings folded,
//    soft leaf shapes with a soft shadow under them. Eyes: big eyes with whites, the lids a third of the way
//    down, so it looks calm rather than surprised.
// =====================================================================================================
function pebble(g) {
  const c = g.ctx;
  if (!g.noGround) softGround(c, 80, 0.55);
  const ink = () => rad(c, -30, -158, 0, -24, -146, 210, [[0, '#7088e8'], [0.1, '#4152b0'], [0.3, '#232a66'], [0.62, '#11132f'], [1, '#07081a']]);
  const dark = (x, y, r) => rad(c, x, y, 0, x, y, r, [[0, '#2c357a'], [0.5, '#13163a'], [1, '#07081a']]);

  // tail, behind everything: a soft rounded fan low on the left
  const tail = blob([[-24, -62], [-66, -44], [-96, -30], [-104, -16], [-82, -8], [-24, -22]]);
  fillWith(c, tail, dark(-60, -52, 70));

  // the one mass: an egg of a body and a ball of a head, filled as one shape
  const body = ell(-4, -62, 66, 60), head = circ(20, -126, 42);
  const neck = blob([[-30, -110], [0, -132], [40, -118], [30, -84], [-20, -84]]);
  const mass = union(body, head, neck);
  fillWith(c, mass, ink());
  g.clip(mass, () => {
    // blue-green sheen on the crown, violet on the back, warm floor light on the belly
    fillWith(c, BIG, rad(c, 2, -154, 0, 2, -154, 48, [[0, 'rgba(110,235,240,0.30)'], [1, 'rgba(110,235,240,0)']]));
    fillWith(c, BIG, rad(c, -44, -86, 0, -44, -86, 60, [[0, 'rgba(170,110,255,0.20)'], [1, 'rgba(170,110,255,0)']]));
    fillWith(c, BIG, rad(c, 26, 14, 0, 26, 14, 74, [[0, 'rgba(255,165,105,0.34)'], [1, 'rgba(255,165,105,0)']]));
    // the far side of the body, turning away: a soft darkening on the right
    fillWith(c, BIG, rad(c, 86, -40, 0, 86, -40, 70, [[0, 'rgba(4,4,16,0.55)'], [1, 'rgba(4,4,16,0)']]));
  });

  // the near wing, folded on the left side, with a soft shadow under it
  const wing = blob([[-18, -110], [6, -92], [4, -60], [-20, -34], [-84, -14, 0], [-64, -46], [-54, -88]]);
  shadowed(c, () => fillWith(c, wing, rad(c, -34, -104, 0, -30, -96, 120, [[0, '#4656b4'], [0.25, '#20275e'], [0.7, '#0d0f28'], [1, '#08091c']])), 12, 4, 7, 'rgba(0,0,12,0.6)');
  g.clip(wing, () => fillWith(c, BIG, rad(c, -30, -104, 0, -30, -104, 34, [[0, 'rgba(120,225,240,0.22)'], [1, 'rgba(120,225,240,0)']])));

  // the beak: thick and straight, rounded at the tip, lighter along its top
  const beak = new Path2D();
  beak.moveTo(40, -142);
  beak.bezierCurveTo(64, -144, 92, -134, 108, -121);
  beak.quadraticCurveTo(111, -117, 106, -115);
  beak.bezierCurveTo(90, -110, 66, -104, 46, -103);
  beak.closePath();
  shadowed(c, () => fillWith(c, beak, lin(c, 0, -144, 0, -102, [[0, '#7c84a8'], [0.35, '#3a3e58'], [1, '#121320']])), 8, 0, 5, 'rgba(0,0,12,0.45)');
  strokeWith(c, spline([[50, -121], [78, -119], [104, -117]]), 'rgba(6,6,16,0.55)', 1.6);
  // soft feathers over the base of the beak
  fillWith(c, ell(46, -134, 15, 10, -0.25), ink());
  // a soft gloss on the crown
  c.save(); c.translate(2, -152); c.rotate(-0.55); c.scale(1, 0.5);
  fillWith(c, circ(0, 0, 16), rad(c, 0, 0, 0, 0, 0, 16, [[0, 'rgba(225,240,255,0.55)'], [1, 'rgba(225,240,255,0)']]));
  c.restore();

  // eyes: big whites, pupils looking along the beak, lids a third of the way down
  const eye = (x, y, rx, ry, px, pr) => {
    const e = ell(x, y, rx, ry);
    fillWith(c, e, '#f3f5ff');
    g.clip(e, () => {
      fillWith(c, BIG, rad(c, x - rx * 0.3, y + ry * 0.2, 0, x, y, rx * 1.4, [[0.55, 'rgba(160,170,230,0)'], [1, 'rgba(120,130,210,0.55)']]));
      fillWith(c, circ(px, y + ry * 0.12, pr), '#0b0c1e');
      fillWith(c, circ(px - pr * 0.4, y - ry * 0.12, pr * 0.32), '#ffffff');
      const lid = y - ry * 0.3;
      fillWith(c, BIG, lin(c, 0, lid - 1, 0, lid + 7, [[0, 'rgba(10,12,40,0.45)'], [1, 'rgba(10,12,40,0)']]));
      fillWith(c, poly([[x - rx - 2, y - ry - 2], [x + rx + 2, y - ry - 2], [x + rx + 2, lid - 1.4], [x - rx - 2, lid + 1.4]]), ink());
    });
  };
  eye(27, -142, 12.5, 13.5, 32, 6.6);
  g.clip(head, () => eye(58, -144, 8, 12.5, 61, 5));
}

// =====================================================================================================
// 2  FACET. Angular and faceted, like a cut stone: every part a few flat triangles. Shading: each facet one
//    flat tone of seven, from pale steel on the lit top left to near black underneath. Legs: thin angular
//    sticks with a bend at the ankle and sharp pointed toes. Eyes: no eye shape at all, only a single bright
//    four-pointed glint on a dark facet.
// =====================================================================================================
function facet(g) {
  const c = g.ctx;
  const T = ['#a3b9d2', '#7590b0', '#56708f', '#3d5574', '#2b3d59', '#1d2a41', '#121b2c'];
  if (!g.noGround) fillWith(c, poly([[-74, -1], [-20, -5], [52, -4], [70, 2], [10, 6], [-56, 5]]), 'rgba(10,8,44,0.36)');
  const F = (pts, t) => { const p = poly(pts); fillWith(c, p, T[t]); strokeWith(c, p, T[t], 0.7); };

  // tail
  F([[-34, -62], [-106, -22], [-98, -12]], 5);
  F([[-34, -62], [-98, -12], [-86, -6], [-20, -46]], 6);
  // far leg, darkest
  const leg = (x0, y0, x1, y1, x2, y2, t, tl) => {
    F([[x0 - 3, y0], [x0 + 3, y0], [x1 + 2.4, y1], [x1 - 2.4, y1]], t);
    F([[x1 - 2.4, y1], [x1 + 2.4, y1], [x2 + 2, y2], [x2 - 2, y2]], t);
    F([[x1 - 2.4, y1], [x1, y1 - 1], [x2, y2], [x2 - 2, y2]], tl);
    // toes: three forward to the right, one back
    F([[x2 - 2, y2 - 2], [x2 + 20, y2 + 1], [x2 + 1, y2 + 2]], t);
    F([[x2 - 1, y2 - 1], [x2 + 13, y2 + 6], [x2 - 1, y2 + 2]], t);
    F([[x2 - 2, y2 - 1], [x2 + 4, y2 + 7], [x2 - 3, y2 + 2]], t);
    F([[x2 + 1, y2 - 2], [x2 - 14, y2], [x2, y2 + 1.5]], t);
  };
  leg(20, -48, 26, -26, 22, -4, 6, 5);

  // body
  F([[-31, -158], [38, -131], [44, -126], [-38, -146]], 4);           // the short neck
  F([[-38, -146], [44, -126], [6, -100]], 3);                         // upper chest, catching light
  F([[44, -126], [60, -102], [6, -100]], 4);                          // chest front
  F([[60, -102], [46, -66], [6, -100]], 5);
  F([[6, -100], [46, -66], [16, -44], [-10, -70]], 5);
  F([[-10, -70], [16, -44], [-14, -42]], 6);                          // belly
  F([[-38, -146], [6, -100], [-10, -70], [-48, -80], [-52, -118]], 3); // left flank (under the wing)

  // near wing, on the left flank: coverts lit, flight feathers darker, a sharp tip over the tail
  F([[-36, -150], [4, -126], [-54, -112]], 1);
  F([[4, -126], [0, -94], [-54, -112]], 2);
  F([[-54, -112], [0, -94], [-20, -66]], 3);
  F([[-54, -112], [-20, -66], [-64, -72]], 3);
  F([[-64, -72], [-20, -66], [-90, -22]], 5);
  F([[-64, -72], [-90, -22], [-74, -50]], 4);
  F([[-20, -66], [-40, -46], [-90, -22]], 6);

  // near leg
  leg(-4, -44, 2, -24, -4, 0, 5, 3);

  // head and beak, drawn a little larger than the body's units: a big crow head on a short neck
  c.save(); c.translate(24, -154); c.scale(1.15, 1.15); c.translate(-24, 160);
  F([[-16, -186], [10, -198], [16, -168]], 1);
  F([[10, -198], [38, -190], [16, -168]], 2);
  F([[38, -190], [54, -176], [16, -168]], 3);
  F([[-16, -186], [16, -168], [-24, -164]], 2);
  F([[-24, -164], [16, -168], [36, -140]], 4);
  F([[16, -168], [54, -176], [58, -150]], 5);
  F([[16, -168], [58, -150], [36, -140]], 6);
  // the eye socket: one dark facet to hold the glint
  F([[13, -180], [34, -183], [27, -168]], 6);
  // beak: deep at the root, the top split into a lit ridge and a darker side
  F([[54, -176], [106, -161], [62, -167]], 1);
  F([[62, -167], [106, -161], [60, -161]], 3);
  F([[60, -161], [100, -158], [58, -150]], 5);
  F([[54, -176], [62, -167], [60, -161], [56, -154]], 4);

  // the single glint
  const star = (x, y, r, k = 0.22) => poly(Array.from({ length: 8 }, (_, i) => {
    const a = -PI / 2 + i * PI / 4, rr2 = i % 2 ? r * k : r * (i % 4 === 0 ? 1.15 : 0.85);
    return [x + Math.cos(a) * rr2, y + Math.sin(a) * rr2];
  }));
  fillWith(c, star(24.5, -177, 6.2), '#effcff');
  fillWith(c, star(50, -179, 3), 'rgba(239,252,255,0.7)');
  c.restore();
}

// =====================================================================================================
// 3  STILT. Long and elegant: a slim body on a long neck, a long beak, a long tail sweeping almost to the
//    floor. Shading: flat ink, with one bright gold rim light along every edge that faces the light.
//    Legs: feathered thighs, like slim breeches ending in a fringe, over long thin legs and long toes.
//    Eyes: half-lidded almonds with a pale silver iris and a small pupil: a knowing look.
// =====================================================================================================
function stilt(g) {
  const c = g.ctx;
  const RIM = '#ffd27e', W = 2.6;
  const body = '#18132c', wingC = '#28214a', tailC = '#120e22', legC = '#211c33';
  if (!g.noGround) fillWith(c, ell(8, 0, 56, 4.5), 'rgba(10,8,44,0.36)');
  const rimmed = (p, col, w = W, a = 1) => { fillWith(c, p, col); g.rimOn(p, RIM, w, a); };

  // tail: long and narrow, behind the legs
  rimmed(blob([[-12, -114], [-28, -120], [-52, -72], [-76, -16, 0], [-62, -12, 0], [-24, -90]]), tailC);
  // far leg and thigh
  const legs = (x0, x1, x2, y2, col, a) => {
    const L = limb(x0, -72, 2.2, x2, y2, 1.8);
    fillWith(c, L, col); g.rimOn(L, RIM, 1.4, a);
    const toes = union(limb(x2, y2, 1.7, x2 + 20, y2 + 1, 0.9), limb(x2, y2, 1.6, x2 + 13, y2 + 5, 0.9), limb(x2, y2, 1.4, x2 - 12, y2 - 1, 0.8));
    fillWith(c, toes, col); g.rimOn(toes, RIM, 1.2, a);
  };
  legs(26, 0, 30, -4, '#1a1629', 0.55);
  rimmed(blob([[18, -106], [38, -108], [35, -86], [33, -68, 0], [30, -75, 0], [26, -66, 0], [23, -74, 0], [20, -68, 0], [18, -84]]), '#17122a', 2, 0.55);

  // body, neck and head in one long outline
  const mass = blob([
    [16, -230], [40, -224], [53, -212, 0.4], [55, -194, 0.4], [41, -184], [36, -170], [46, -148], [50, -124],
    [39, -102], [18, -92], [-2, -92], [-18, -104], [-26, -134], [-22, -164], [-12, -184], [-6, -206], [0, -224],
  ]);
  // the beak: long, straight and slender, but a crow's: deep at the root. Drawn before the head, so its
  // root sits inside the head's outline.
  const beak = new Path2D();
  beak.moveTo(36, -219);
  beak.bezierCurveTo(66, -220, 94, -209, 112, -199);
  beak.lineTo(110, -196);
  beak.bezierCurveTo(90, -194, 66, -191, 40, -189);
  beak.closePath();
  rimmed(beak, '#2a2639', 2);
  strokeWith(c, spline([[52, -201], [84, -198], [108, -197]]), 'rgba(0,0,0,0.6)', 1.1);
  // near thigh: feathered down to a fringe, its top tucked under the body; then the long leg
  rimmed(blob([[-10, -112], [16, -112], [15, -84], [11, -62, 0], [8, -70, 0], [4, -60, 0], [0, -69, 0], [-4, -62, 0], [-8, -80]]), '#221b40', 2);
  legs(2, 0, -4, -1, legC, 1);
  rimmed(mass, body);
  // near wing: long and slender, lying along the left side
  rimmed(blob([[-16, -174], [6, -160], [10, -126], [-4, -98], [-30, -60], [-68, -22, 0], [-42, -78], [-28, -120]]), wingC, 2.4);


  // eyes: half-lidded almonds, pale silver iris
  const eye = (ax, ay, bx, by, k, px, py, pr, clipTo) => {
    const e = leaf(ax, ay, bx, by, k, k * 0.8);
    const draw = () => {
      fillWith(c, e, '#d7e2f4');
      g.clip(e, () => {
        fillWith(c, circ(px, py, pr * 2.1), '#9fb2cf');
        fillWith(c, circ(px, py, pr), '#0a0814');
        fillWith(c, circ(px - pr * 0.9, py + pr * 0.5, pr * 0.35), '#ffffff');
        // the upper lid, down to the middle, nearly level
        const midY = (ay + by) / 2 - 0.2;
        fillWith(c, poly([[ax - 3, midY - 14], [bx + 3, midY - 14], [bx + 3, midY - 1.2], [ax - 3, midY + 0.6]]), body);
        strokeWith(c, pd2(ax - 3, midY + 0.6, bx + 3, midY - 1.2), RIM, 1.4);
      });
    };
    clipTo ? g.clip(clipTo, draw) : draw();
  };
  eye(10, -207, 35, -211, 0.4, 27, -207, 3.2);
  eye(43, -212, 56, -213, 0.34, 51, -211, 2.2, mass);
}
const pd2 = (x0, y0, x1, y1) => { const p = new Path2D(); p.moveTo(x0, y0); p.lineTo(x1, y1); return p; };

// =====================================================================================================
// 4  CHUNK. Squat and chunky: one wide rounded box for head and body, no neck, a thick wedge of a beak.
//    Shading: inked like a comic: a bold dark outline round every shape, the wings, tail, beak and feet
//    filled solid black, the grey body flat, and its shadow side drawn in diagonal hatching. (Grey with black
//    wings is a real crow's colouring, the hooded crow's.) A wing used like an arm: the near one bent across
//    the chest, its hand of three long feathers at the chin, thinking; the far one folded. Short fat legs
//    and fat toes. Eyes: small dark beads under heavy brows.
// =====================================================================================================
function chunk(g) {
  const c = g.ctx;
  const LINE = '#0e0f1e', LW = 4.2;
  const GREY = '#69719c', BLACK = '#1b1c30', BEAK = '#2a2c42';
  if (!g.noGround) fillWith(c, pill(-4, 1, 186, 9), 'rgba(10,8,44,0.36)');
  const hatchLines = (s = 5.2, w = 1.7) => {
    c.save(); c.strokeStyle = LINE; c.lineWidth = w; c.lineCap = 'butt'; c.beginPath();
    for (let k = -520; k < 400; k += s) { c.moveTo(k, 40); c.lineTo(k + 320, -280); }
    c.stroke(); c.restore();
  };
  // outline first (twice as wide, so half of it shows outside), then the fill, then hatching on the shadow side
  const inked = (p, col, hx = 0, hy = 0, lw = LW) => {
    strokeWith(c, p, LINE, lw * 2);
    fillWith(c, p, col);
    if (hx || hy) clipOut(c, p, shift(p, -hx, -hy), () => hatchLines());
  };
  const quillShape = (bx, by, tx, ty, w) => quill(bx, by, tx, ty, w, 0.05);
  // a few pale strokes on the solid black, where it shines
  const shine = pts => strokeWith(c, spline(pts), 'rgba(170,185,240,0.55)', 1.6);

  // tail: a short thick block behind, low on the left
  inked(rpoly([[-60, -78, 6], [-118, -60, 6], [-114, -38, 6], [-58, -38, 6]]), BLACK);
  shine([[-74, -64], [-106, -52]]);
  // legs and fat toes
  const foot = (x, y) => union(tube(x, -30, x - 1, y - 4, 6.5), tube(x - 1, y - 2, x + 19, y + 1, 5), tube(x - 1, y - 2, x + 13, y + 6, 5), tube(x - 1, y - 2, x - 13, y, 4.5));
  inked(foot(32, -6), BLACK);
  // the far wing, folded: only its long tip shows, behind the body on the right
  inked(union(quillShape(54, -96, 92, -44, 22), quillShape(58, -86, 86, -36, 18)), BLACK);
  // the body: one wide rounded box, a little wider at the bottom, the head its top right corner
  const box = rpoly([[-66, -142, 40], [40, -156, 46], [78, -26, 26], [-80, -22, 26]]);
  // its hatching stays on the body's shadow side, below the face, so the far eye stays clear
  strokeWith(c, box, LINE, LW * 2);
  fillWith(c, box, GREY);
  g.clip(rr(-200, -108, 400, 200, 0), () => clipOut(c, box, shift(box, -18, -12), () => hatchLines()));
  inked(foot(-24, -2), BLACK);

  // the near wing as an arm: from the shoulder down to the elbow, then up across the chest, its hand of
  // three long feathers resting at the chin, the way someone strokes their chin while they think
  // flight feathers hang from the back of the arm, so it reads as a wing, not a sleeve
  const near = union(limb(-54, -104, 15, -34, -58, 11), limb(-34, -58, 11, 14, -70, 8.5),
    ...[-1.25, -0.92, -0.6].map((a, i) => tube(16, -72, 16 + Math.cos(a) * (18 + (i === 1 ? 2 : 0)), -72 + Math.sin(a) * (18 + (i === 1 ? 2 : 0)), 4.6)),
    quillShape(-60, -96, -76, -60, 12), quillShape(-54, -82, -66, -46, 12), quillShape(-46, -66, -54, -36, 11),
    quillShape(-30, -58, -40, -38, 10), quillShape(-16, -62, -24, -42, 9));
  inked(near, BLACK);
  shine([[-56, -98], [-44, -72]]);
  shine([[-24, -62], [2, -68]]);

  // brows and eyes
  fillWith(c, leaf(-6, -140, 26, -137, 0.36, 0.1), LINE);
  fillWith(c, leaf(27, -147, 46, -150, 0.38, 0.1), LINE);
  fillWith(c, ell(12, -124, 5, 7), LINE);
  fillWith(c, ell(38, -132, 3.6, 6.4), LINE);
  // the beak: thick, straight, a slight hook at the tip
  const beak = new Path2D();
  beak.moveTo(34, -120);
  beak.bezierCurveTo(60, -122, 92, -112, 110, -98);
  beak.quadraticCurveTo(115, -91, 106, -90);
  beak.bezierCurveTo(90, -86, 64, -82, 38, -80);
  beak.closePath();
  inked(beak, BEAK);
  fillWith(c, poly([[44, -114], [92, -108], [58, -106]]), '#575c7e');
  strokeWith(c, spline([[44, -99], [76, -96], [104, -93]]), LINE, 2.6);
}

// =====================================================================================================
// 5  BLOCKS. Built from a few bold geometric pieces and nothing else: a circle for the head, a circle for the
//    body, a half disc for the wing, a long triangle for the tail, a split triangle for the beak, two rods
//    for legs and two bars for feet. Shading: none at all, only flat colour, each piece its own.
//    Eyes: a target, an ochre ring round a dark centre.
// =====================================================================================================
function blocks(g) {
  const c = g.ctx;
  const INK = '#13152c', SLATE = '#4d5e9e', PALE = '#c0cbef', OCHRE = '#f2b33d', DEEP = '#262d5c';
  if (!g.noGround) fillWith(c, rr(-62, -2, 134, 6, 0), 'rgba(10,8,44,0.34)');
  // tail: one long triangle, behind
  fillWith(c, poly([[-18, -74], [-104, -6], [-58, -6]]), DEEP);
  // legs: rods, and bars for feet
  fillWith(c, rr(-8, -26, 5, 26, 0), INK);
  fillWith(c, rr(-8, -5, 22, 5, 0), INK);
  fillWith(c, rr(17, -28, 5, 25, 0), INK);
  fillWith(c, rr(17, -7, 22, 5, 0), INK);
  // body: a circle; a thin crescent of slate on its right edge for the chest
  const body = circ(-2, -76, 56);
  fillWith(c, body, INK);
  g.clip(body, () => fillWith(c, BIG, SLATE), true);
  fillWith(c, circ(-9, -76, 56), INK);
  // wing: a half disc on the left side, its straight edge running from shoulder to tail
  const ax = -4, ay = -122, bx = -58, by = -42, mx = (ax + bx) / 2, my = (ay + by) / 2;
  const r = Math.hypot(bx - ax, by - ay) / 2, a0 = Math.atan2(by - my, bx - mx);
  fillWith(c, wedge(mx, my, r, a0, a0 + PI), SLATE);
  // head: a circle
  const head = circ(26, -146, 35);
  fillWith(c, head, INK);
  // beak: one triangle split along its middle, slate above and ink below
  fillWith(c, poly([[50, -163], [118, -146], [54, -146]]), SLATE);
  fillWith(c, poly([[54, -146.4], [118, -146], [50, -130]]), INK);
  // eyes: targets, an ochre ring round a dark centre, each cut flat across the top by a straight lid
  const target = (x, y, r1) => {
    fillWith(c, circ(x, y, r1), OCHRE);
    fillWith(c, circ(x + r1 * 0.2, y + r1 * 0.08, r1 * 0.5), INK);
    fillWith(c, poly([[x - r1 - 1, y - r1 - 1], [x + r1 + 1, y - r1 - 1], [x + r1 + 1, y - r1 * 0.6], [x - r1 - 1, y - r1 * 0.6]]), INK);
  };
  target(30, -154, 10);
  g.clip(head, () => target(60, -156, 7.4));
}

// =====================================================================================================
// 6  SCRATCH. Organic and lopsided: a scruffy crown, a ragged throat, one shoulder hunched higher, the head
//    cocked, wing tips and tail as separate feathers. Shading: none as such; the ink body is covered in flat
//    feather marks, lighter strokes up on the lit side and darker ones low down. Legs: single tapered strokes
//    with long splayed toes and small claws. Eyes: a pale ring round a dark bead, drawn like a brush ring.
// =====================================================================================================
function scratch(g) {
  const c = g.ctx;
  const INK = '#15162b', R = rng(8);
  const MARK_L = ['#3d4a88', '#4f5fa6', '#34407a'], MARK_D = ['#0a0a17', '#0d0e1f'];
  if (!g.noGround) fillWith(c, ell(-2, 0, 64, 4.5), 'rgba(10,8,44,0.34)');
  const marks = (area, n, fn) => g.clip(area, () => { for (let i = 0; i < n; i++) fn(i); });
  // a mark: a short tapered stroke from (x, y) in direction a
  const mark = (x, y, a, L, w, col) => fillWith(c, quill(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, w, 0.1), col);

  // tail: five separate feathers, fanned, behind
  const tailTips = [[-100, -36], [-106, -24], [-100, -12], [-88, -4], [-72, -2]];
  tailTips.forEach(([tx, ty], i) => {
    const f = quill(-28 + i * 2, -58 + i * 3, tx, ty, 13 - i, 0.05);
    fillWith(c, f, i % 2 ? '#101122' : INK);
    strokeWith(c, spline([[-30 + i * 2, -56 + i * 3], [(tx - 28) / 2, (ty - 58) / 2 + 2], [tx + 6, ty - 1]]), '#2e3868', 1.2);
  });
  // legs: single tapered strokes, long toes with small claws
  const leg = (pts, toes, col) => {
    fillWith(c, union(...pts.slice(1).map((p, i) => limb(pts[i][0], pts[i][1], pts[i][2], p[0], p[1], p[2]))), col);
    for (const t of toes) fillWith(c, union(...t.slice(1).map((p, i) => limb(t[i][0], t[i][1], t[i][2], p[0], p[1], p[2]))), col);
  };
  leg([[22, -50, 3.6], [25, -26, 2.6], [24, -5, 2.3]],
    [[[24, -5, 2.2], [36, -3, 1.6], [44, 0, 0.5]], [[24, -5, 2.1], [32, 1, 1.5], [36, 5, 0.5]], [[24, -5, 2], [12, -3, 1.2], [8, -1, 0.5]]], '#121322');

  // body: lumpy, the near shoulder hunched up, the chest pushed out
  const body = blob([[-34, -152], [-8, -146], [34, -136], [54, -110], [53, -80], [38, -52], [10, -40], [-20, -46], [-44, -70], [-52, -112], [-46, -146]]);
  fillWith(c, body, INK);
  // ragged edge: little feather points along the chest and belly
  [[52, -98, 0.7], [50, -84, 0.9], [44, -66, 1.2], [30, -50, 1.5], [12, -42, 1.7], [-8, -42, 1.9]].forEach(([x, y, a]) =>
    fillWith(c, quill(x - Math.cos(a) * 8, y - Math.sin(a) * 8, x + Math.cos(a) * 6, y + Math.sin(a) * 6, 9), INK));
  marks(body, 120, () => {
    const x = -50 + R() * 104, y = -150 + R() * 112;
    const lit = (x + 60) * -0.6 + (y + 150) * -0.9 + 90 + R() * 40;
    mark(x, y, PI / 2 + 0.35 + (R() - 0.5) * 0.5, 7 + R() * 5, 4.5 + R() * 2, lit > 20 ? MARK_L[(R() * 3) | 0] : MARK_D[(R() * 2) | 0]);
  });
  // near leg, in front of the body
  leg([[-4, -46, 3.8], [-9, -24, 2.7], [-6, -3, 2.4]],
    [[[-6, -3, 2.3], [8, -1, 1.7], [17, 2, 0.5]], [[-6, -3, 2.2], [2, 3, 1.6], [5, 8, 0.5]], [[-6, -3, 2.1], [-16, 1, 1.4], [-21, 4, 0.5]], [[-6, -3, 2], [-19, -5, 1.2], [-24, -4, 0.5]]], '#1b1c2e');

  // near wing, with the flight feathers splayed at the tip
  const wing = blob([[-40, -148], [-6, -134], [4, -106], [-14, -76], [-44, -54], [-66, -42], [-58, -74], [-56, -116]]);
  fillWith(c, wing, '#181a33');
  [[-58, -70, -96, -34], [-52, -62, -88, -26], [-46, -56, -78, -20]].forEach(([bx, by, tx, ty], i) => fillWith(c, quill(bx, by, tx, ty, 11 - i * 1.5, 0.05), i % 2 ? '#14162d' : '#1c1e39'));
  marks(wing, 46, () => {
    const t = R(), x = -40 + t * 26 - 30 * t * t + (R() - 0.5) * 22, y = -140 + t * 80;
    mark(x, y, 2.0 + (R() - 0.5) * 0.25, 14 + R() * 10, 4 + R() * 1.6, t < 0.5 ? MARK_L[(R() * 3) | 0] : '#2b3466');
  });

  // head, cocked a little, with a scruffy crown and a ragged throat
  c.save(); c.translate(18, -146); c.rotate(-0.12); c.translate(-18, 146);
  [[2, -188, -12, -201], [12, -192, 2, -206], [-6, -182, -20, -191], [22, -194, 18, -204]].forEach(([bx, by, tx, ty]) => fillWith(c, quill(bx, by, tx, ty, 8, 0.1), INK));
  [[22, -144, 16, -120], [32, -146, 30, -124], [12, -144, 4, -126], [40, -150, 44, -132]].forEach(([bx, by, tx, ty]) => fillWith(c, quill(bx, by, tx, ty, 9, 0.1), INK));
  const head = blob([[-12, -168], [-2, -188], [20, -196], [42, -188], [54, -170, 0.5], [50, -152], [36, -140], [14, -138], [-8, -148]]);
  fillWith(c, head, INK);
  marks(head, 34, () => {
    const x = -10 + R() * 60, y = -194 + R() * 52;
    mark(x, y, PI * 0.85 + (R() - 0.5) * 0.4, 5 + R() * 3, 3.2, (x + y * 0.8) < -130 ? MARK_L[(R() * 3) | 0] : MARK_D[0]);
  });
  // beak: strong and straight, a lighter stroke along the ridge, bristles over the base
  const beak = new Path2D();
  beak.moveTo(42, -178);
  beak.bezierCurveTo(64, -178, 92, -168, 112, -158);
  beak.lineTo(110, -154);
  beak.bezierCurveTo(90, -152, 66, -148, 46, -146);
  beak.closePath();
  fillWith(c, beak, '#24253a');
  strokeWith(c, spline([[48, -174], [80, -169], [106, -159]]), '#646a8c', 1.8);
  strokeWith(c, spline([[50, -161], [80, -158], [108, -156]]), '#0a0a14', 1.2);
  [[36, -178, 60, -174], [38, -172, 58, -166], [34, -184, 56, -180]].forEach(([bx, by, tx, ty]) => fillWith(c, quill(bx, by, tx, ty, 7, 0.1), INK));
  // eyes: a pale brush ring round a dark bead
  const ringEye = (x, y, r, clipTo) => {
    const draw = () => {
      fillWith(c, ell(x, y, r, r * 0.94), '#ece3cc');
      fillWith(c, ell(x + r * 0.12, y + r * 0.05, r * 0.66, r * 0.62), '#07070f');
      fillWith(c, circ(x - r * 0.12, y - r * 0.2, r * 0.16), '#ece3cc');
      // a thicker stroke of the ring low on the left, as a brush would leave it
      fillWith(c, leaf(x - r * 0.95, y - r * 0.1, x + r * 0.5, y + r * 0.92, 0.28, -0.12), '#ece3cc');
      // the lid: the top of the eye covered by the head's ink, a little lower at the back
      g.clip(ell(x, y, r + 0.8, r * 0.94 + 0.8), () => fillWith(c, poly([[x - r - 2, y - r - 2], [x + r + 2, y - r - 2], [x + r + 2, y - r * 0.4], [x - r - 2, y - r * 0.4]]), INK));
    };
    clipTo ? g.clip(clipTo, draw) : draw();
  };
  ringEye(22, -168, 7.4);
  ringEye(50, -170, 5.2, head);
  c.restore();
}

// =====================================================================================================
// 7  PAPER. Cut paper: every piece a flat polygon cut with straight scissor strokes, laid in layers. Shading:
//    only the soft shadow each layer drops onto the one below. Wings: the near wing half open like a cape,
//    its long feathers cut one by one. Legs: thin paper strips with cut toes. Eyes: holes cut in a dark mask
//    across the face, with a bright teal layer showing through and a small dark pupil.
// =====================================================================================================
function paper(g) {
  const c = g.ctx;
  const SH = 'rgba(3,3,18,0.55)';
  // a sheet: the shape, the soft shadow it drops on what's under it, and a faint pale cut edge on its lit side
  const layer = (pts, col, blur = 5, dx = 1.8, dy = 2.8) => {
    const p = poly(pts);
    shadowed(c, () => fillWith(c, p, col), blur, dx, dy, SH);
    g.rimOn(p, '#c9d2ff', 1, 0.16);
  };
  if (!g.noGround) fillWith(c, poly([[-80, -2], [-10, -5], [70, -3], [60, 4], [-30, 5]]), 'rgba(10,8,44,0.34)');

  // tail, notched at the end
  layer([[-24, -68], [-86, -30], [-100, -16], [-90, -12], [-92, -4], [-78, -6], [-70, 0], [-28, -40]], '#1c1d31');
  // far leg strip and toes
  layer([[20, -46], [25, -46], [26, -4], [21, -4]], '#24253a', 3, 1, 1.5);
  layer([[21, -6], [42, -3], [24, -1]], '#24253a', 3, 1, 1.5);
  layer([[22, -5], [36, 2], [21, 0]], '#24253a', 3, 1, 1.5);
  // body and a chest panel turned away from the light
  layer([[-34, -150], [16, -154], [48, -134], [58, -100], [50, -66], [30, -44], [-2, -36], [-30, -48], [-44, -84], [-46, -124]], '#1d1e36');
  layer([[22, -146], [48, -132], [58, -100], [50, -66], [32, -46], [24, -92]], '#15162a', 4, 1.4, 2.2);
  // near leg strip and toes
  layer([[-6, -42], [0, -42], [-1, -2], [-7, -2]], '#2a2b42', 3, 1, 1.5);
  layer([[-7, -4], [16, 0], [-3, 1]], '#2a2b42', 3, 1, 1.5);
  layer([[-6, -3], [8, 6], [-7, 2]], '#2a2b42', 3, 1, 1.5);
  layer([[-4, -4], [-20, -2], [-6, 1]], '#2a2b42', 3, 1, 1.5);

  // near wing, held a little open and drooping like a cape: a shoulder piece and five broad feathers,
  // each cut on its own and laid over the one before
  const tips = [[-92, -58], [-92, -42], [-86, -27], [-74, -15], [-58, -9]];
  tips.forEach(([tx, ty], i) => {
    const bx = -54 + i * 7, by = -112 + i * 5, dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy), nx = -dy / L * 10, ny = dx / L * 10;
    layer([[bx + nx, by + ny], [tx + nx * 0.7 - dx * 0.1, ty + ny * 0.7 - dy * 0.1], [tx, ty], [tx - nx * 0.7 - dx * 0.16, ty - ny * 0.7 - dy * 0.16], [bx - nx, by - ny]], i % 2 ? '#202238' : '#292c4b', 4, 1.6, 2.4);
  });
  layer([[-40, -146], [0, -134], [-4, -104], [-12, -94], [-20, -101], [-28, -90], [-36, -98], [-45, -88], [-52, -98], [-62, -94], [-58, -124]], '#30375f');
  layer([[-36, -136], [-6, -128], [-9, -112], [-17, -105], [-24, -112], [-32, -103], [-40, -110]], '#3b4573', 3, 1.2, 1.8);

  // throat feathers: one piece with a cut zigzag edge, hanging under the head
  layer([[-4, -150], [44, -146], [50, -132], [44, -122], [38, -130], [32, -118], [26, -128], [18, -116], [12, -128], [4, -120], [0, -134]], '#24263f', 4, 1.4, 2.2);
  // head
  layer([[-18, -166], [-10, -188], [14, -200], [40, -194], [56, -176], [58, -154], [40, -140], [10, -138], [-12, -148]], '#25263d');
  // the bright layer under the mask, with dark pupils on it
  const eyeLayer = poly([[6, -184], [62, -186], [62, -164], [6, -164]]);
  g.clip(poly([[-18, -166], [-10, -188], [14, -200], [40, -194], [56, -176], [58, -154], [40, -140], [10, -138], [-12, -148]]), () => {
    fillWith(c, eyeLayer, '#45e3c6');
    layer([[25, -178], [31, -178.5], [31.5, -172], [25.5, -171.5]], '#0b0c18', 2, 0.6, 1);
    layer([[53, -180], [56.5, -180], [56.5, -175], [53, -175]], '#0b0c18', 2, 0.6, 1);
  });
  // the mask: a dark band across the face with the eyes cut out of it
  const mask = new Path2D();
  mask.addPath(poly([[-6, -184], [24, -190], [58, -184], [60, -162], [30, -160], [0, -164]]));
  mask.addPath(poly([[10, -180], [33, -181], [36, -173], [27, -166], [14, -168]]));
  mask.addPath(poly([[47, -182], [58, -183], [58.5, -174], [50, -172]]));
  g.clip(poly([[-18, -166], [-10, -188], [14, -200], [40, -194], [56, -176], [58, -154], [40, -140], [10, -138], [-12, -148]]), () =>
    shadowed(c, () => { c.fillStyle = '#0c0d1a'; c.fill(mask, 'evenodd'); }, 4, 1.4, 2.2, SH));
  // beak: two paper triangles, and a cut tuft over its base
  layer([[52, -168], [106, -156], [54, -156]], '#30344f', 3, 1.2, 2);
  layer([[48, -180], [120, -162], [56, -164]], '#6d7499', 4, 1.4, 2.4);
  layer([[40, -182], [66, -174], [46, -166]], '#25263d', 3, 1, 1.8);
}

// =====================================================================================================
// 8  LANTERN. Crescents and hooks: the wing a sickle, the tail two curling sickles, hackles hanging from the
//    throat in crescents, talons like hooks. Shading: light from below, a warm glow coming up off the floor
//    that lights every underside in amber and leaves the tops in deep indigo. Legs: short and strong, with
//    big hooked talons. Eyes: dark, with the warm light caught as a crescent along the bottom, under a brow
//    whose underside is lit too.
// =====================================================================================================
function lantern(g) {
  const c = g.ctx;
  const BASE = '#130f27', WARM = '#ff9f4f', HOT = '#ffd08a';
  if (!g.noGround) {
    c.save(); c.translate(6, 0); c.scale(1, 0.2);
    fillWith(c, circ(0, 0, 110), rad(c, 0, 0, 0, 0, 0, 110, [[0, 'rgba(255,190,110,0.55)'], [0.5, 'rgba(255,170,90,0.22)'], [1, 'rgba(255,170,90,0)']]));
    c.restore();
    fillWith(c, ell(6, 1, 50, 4), 'rgba(40,14,10,0.35)');
  }
  // the warm light, rising from the floor: a gradient over the lower part of each shape, then a lit band
  // along each underside and a thin hot edge at the very bottom
  const lit = (p, glowTop = -120, band = 8, edge = 2.2) => {
    fillWith(c, p, BASE);
    g.clip(p, () => fillWith(c, BIG, lin(c, 0, 4, 0, glowTop, [[0, 'rgba(255,150,70,0.75)'], [0.45, 'rgba(200,90,70,0.28)'], [1, 'rgba(120,60,90,0)']])));
    if (band) g.plane(p, 'rgba(255,159,79,0.85)', 0, band);
    if (edge) g.plane(p, HOT, 0, edge);
  };
  const sickle = (x0, y0, cx1, cy1, x1, y1, cx2, cy2) => {
    const p = new Path2D(); p.moveTo(x0, y0); p.quadraticCurveTo(cx1, cy1, x1, y1); p.quadraticCurveTo(cx2, cy2, x0 + 0.01, y0 + 0.01); p.closePath(); return p;
  };

  // tail: two sickles curling down to the left
  lit(sickle(-30, -64, -70, -66, -114, -38, -68, -38), -66, 5, 1.6);
  lit(sickle(-26, -50, -60, -40, -104, -14, -58, -18), -52, 5, 1.6);
  // far leg and its talons
  const talons = (x, y) => union(
    sickle(x, y - 3, x + 12, y - 12, x + 24, y + 1, x + 12, y - 4),
    sickle(x, y - 2, x + 8, y - 6, x + 15, y + 5, x + 6, y - 1),
    sickle(x, y - 3, x - 8, y - 10, x - 16, y + 1, x - 8, y - 4));
  lit(union(limb(22, -44, 5, 26, -10, 4), talons(26, -6)), -40, 3, 1.4);
  // body
  const body = blob([[-24, -152], [14, -156], [46, -142], [62, -110], [58, -72], [40, -46], [10, -36], [-18, -44], [-36, -72], [-40, -114]]);
  lit(body, -130, 10, 2.6);
  // near leg and talons
  lit(union(limb(-4, -42, 5.4, -6, -8, 4.2), talons(-6, -4)), -40, 3, 1.4);
  // the near wing: one big sickle from the shoulder to a sharp point over the tail, lying on the body,
  // with a smaller crescent of feathers inside it
  lit(sickle(-16, -150, -86, -124, -94, -16, -14, -84), -110, 8, 2.2);
  lit(sickle(-18, -140, -58, -122, -56, -66, -26, -96), -100, 5, 1.6);
  // head
  const head = blob([[-8, -176], [2, -196], [26, -202], [48, -192], [57, -174, 0.6], [50, -154], [28, -144], [4, -146], [-10, -158]]);
  // beak: strong, straight, the tip just hooked; its underside lit. Drawn before the head, so its root
  // sits inside the head's outline.
  const beak = new Path2D();
  beak.moveTo(36, -184);
  beak.bezierCurveTo(64, -186, 96, -176, 116, -166);
  beak.quadraticCurveTo(121, -161, 114, -160);
  beak.bezierCurveTo(94, -156, 66, -152, 40, -152);
  beak.closePath();
  lit(beak, -175, 5, 1.8);
  strokeWith(c, spline([[50, -165], [84, -163], [112, -161]]), 'rgba(255,170,90,0.7)', 1.2);
  lit(head, -190, 5, 1.8);
  // brows: their undersides catch the light
  const brow = (x0, y0, x1, y1, k) => { const p = leaf(x0, y0, x1, y1, k, -k * 0.35); fillWith(c, p, BASE); g.plane(p, WARM, 0, 1.8); };
  // eyes: dark, the light caught along the bottom as a crescent
  const eye = (x, y, r, clipTo) => {
    const draw = () => {
      fillWith(c, circ(x, y, r), '#06050d');
      clipOut(c, circ(x, y, r), circ(x - r * 0.08, y - r * 0.34, r), () => fillWith(c, BIG, WARM));
      fillWith(c, circ(x + r * 0.42, y + r * 0.42, r * 0.18), '#fff3cf');
    };
    clipTo ? g.clip(clipTo, draw) : draw();
  };
  eye(25, -175, 7.6);
  eye(54, -177, 5.4, head);
  brow(9, -189, 37, -190, 0.2);
}

export const CROWS = [
  { id: 'pebble', name: 'Pebble', draw: pebble },
  { id: 'facet', name: 'Facet', draw: facet },
  { id: 'stilt', name: 'Stilt', draw: stilt },
  { id: 'chunk', name: 'Chunk', draw: chunk },
  { id: 'blocks', name: 'Blocks', draw: blocks },
  { id: 'scratch', name: 'Scratch', draw: scratch },
  { id: 'paper', name: 'Paper', draw: paper },
  { id: 'lantern', name: 'Lantern', draw: lantern },
];
