// Round 13, part 1: Button with its pill eyes lying down. Round 12's pick was the upright white capsule with no rim;
// they asked for "pills the other orientation" and a variant where the eye has a shadow. So: the same capsule turned
// on its side (wider than tall), solid white, no rim, and two shaded versions of it. Everything else is round 10's
// Button, drawn by round 10's code (../../avatar10/js/crows.js): body, colours, pose, light, scale.
//
// The light in Button's room comes from the upper left (round 10's shadow planes sit on the lower right of every
// form), so the shadows on the eye follow it:
//   shade-low   a flat band along the lower right of the capsule, laid the way round 10 lays the body's planes
//   shade-top   a flat band across the top of the capsule, as if the head above it casts it (a calmer, hooded look)
//
// As in round 12, the bird is drawn with its own eyes switched off and the capsules laid on afterwards in the same
// order (near eye, then the far eye clipped to the head and kept off the beak).

import { PLUMPS, plumpBird, vary, headOf } from '../../avatar10/js/crows.js';
import { pill, circ } from '../../avatar10/js/kit.js';

export const PILL = {
  w: 21,            // the near eye's width: round 12's height, turned on its side
  h: 10.4,          // its height
  farW: 8.6,        // the far eye, seen at a slant: much narrower, nearly as tall
  farH: 9,
  farAt: [-3, -7],  // moved from round 10's far eye, so its rounded end shows above the beak's root
  col: '#f7f7fa',   // round 11's white
  shade: '#c3c7dd', // the white in shadow: cooler and darker, toward the blue of the room
};

// round 10's beak outline (copied, as round 12 does), for keeping the far eye off it
function beakPath(x0, yTop, yBot, tx, ty, { arch = 0.1, hook = 0, round = 0 } = {}) {
  const L = tx - x0, d = yBot - yTop, p = new Path2D();
  p.moveTo(x0, yTop);
  p.bezierCurveTo(x0 + L * 0.4, yTop - L * arch, x0 + L * 0.8, ty - d * 0.35 - L * arch * 0.4, tx, ty + hook);
  if (round) p.quadraticCurveTo(tx + round * 0.4, ty + hook + round, tx - round * 1.2, ty + hook + round * 0.9);
  p.bezierCurveTo(x0 + L * 0.75, ty + d * 0.18, x0 + L * 0.3, yBot + 0.5, x0, yBot);
  p.closePath();
  return p;
}

const OFF = { shape: 'ell', rx: 0.01, ry: 0.01, ball: 'rgba(0,0,0,0)' };

// one capsule eye, centred at x, y; shade: null, 'low' or 'top'
function pillEye(g, x, y, w, h, shade) {
  const c = g.ctx, s = pill(x, y, w, h);
  c.fillStyle = PILL.col; c.fill(s);
  if (shade === 'low') {
    // the part of the capsule not covered by a copy of it moved up and to the left: a crescent on the lower right
    g.plane(s, PILL.shade, w * 0.16, h * 0.36);
  } else if (shade === 'top') {
    // a straight band across the top third, with a slight tilt down toward the back of the head
    g.clip(s, () => {
      c.fillStyle = PILL.shade;
      const p = new Path2D();
      p.moveTo(x - w, y - h); p.lineTo(x + w, y - h);
      p.lineTo(x + w, y - h / 2 + h * 0.36); p.lineTo(x - w, y - h / 2 + h * 0.44);
      p.closePath(); c.fill(p);
    });
  }
}

function lyingButton(base, shade) {
  const v = vary(base, {
    edge: null,
    eye: { ...OFF, x: base.eye.x, y: base.eye.y },
    far: { ...OFF, x: base.far.x, y: base.far.y },
  });
  const draw = g => {
    plumpBird(g, v);
    const c = g.ctx, [hx, hy] = v.hs, B = v.beak;
    pillEye(g, base.eye.x + hx, base.eye.y + hy, PILL.w, PILL.h, shade);
    const head = circ(v.head[0] + hx, v.head[1] + hy, v.head[2]);
    const beak = beakPath(B.x0 + hx, B.yTop + hy, B.yBot + hy, B.tx + hx, B.ty + hy, B);
    c.save(); c.clip(head);
    const r = new Path2D(); r.rect(-5000, -5000, 10000, 10000); r.addPath(beak); c.clip(r, 'evenodd');
    pillEye(g, base.far.x + hx + PILL.farAt[0], base.far.y + hy + PILL.farAt[1], PILL.farW, PILL.farH, shade);
    c.restore();
  };
  return { v, draw };
}

const BUTTON = PLUMPS.find(k => k.id === 'plump-button').v;

const LIST = [
  { id: 'button-lying', name: 'Lying, flat white', ...lyingButton(BUTTON, null) },
  { id: 'button-lying-shade-low', name: 'Lying, shade below', ...lyingButton(BUTTON, 'low') },
  { id: 'button-lying-shade-top', name: 'Lying, shade on top', ...lyingButton(BUTTON, 'top') },
];

export const CROWS = LIST.map(k => ({ ...k, head: headOf(k.v) }));
