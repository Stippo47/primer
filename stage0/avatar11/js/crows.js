// Round 11: round 10's two picks, Button (Plump family, 2) and Bean (round 9's, 7), with simple round eyes, each in
// a white-eye and a black-eye version. Nothing else changes: the bodies, colours, pose, light and scale are round 10's
// own, drawn by round 10's code (../../avatar10/js/crows.js). Only the eye settings are swapped.
//
// A simple round eye: a plain circle, no lid, no ring, no brow, no coloured iris.
//   white  a white disc with a round dark pupil set a little forward, toward the beak (looking ahead). No glint.
//   black  a dark disc with one small round glint high on the light side, so it still reads on a near-black head.
// The far eye is the same eye seen at a slant (narrower), peeking past the head's edge above the beak's root, as in
// rounds 9 and 10. The near eye is the same size on both birds, so the two can be compared face to face.

import { PLUMPS, BEANS, plumpBird, beanBird, vary, headOf } from '../../avatar10/js/crows.js';

const R = 8.4;          // the near eye's radius, in the crows' own units (about one point at room size)
const SLANT = 0.5;      // how narrow the far eye is, against its height

export const EYES = {
  white: (x, y, near) => ({
    x, y, shape: 'ell', rx: near ? R : R * SLANT * 0.9, ry: near ? R : R * 0.88, ball: '#f7f7fa',
    pupil: { shape: 'ell', col: '#0b0c14', dx: near ? 0.2 : 0.3, dy: 0.04, w: near ? 1.0 : 1.4, h: 1.0 * (near ? 1 : 0.62) },
  }),
  black: (x, y, near) => ({
    x, y, shape: 'ell', rx: near ? R : R * SLANT * 0.9, ry: near ? R : R * 0.88, ball: '#07080d',
    ...(near ? { glint: { dx: -0.3, dy: -0.32, r: 0.27 } } : {}),
  }),
};

// a bird's settings with both eyes swapped for round ones of the given kind, at the bird's own eye positions
const withEyes = (v, kind) => vary(v, {
  eye: EYES[kind](v.eye.x, v.eye.y, true),
  far: EYES[kind](v.far.x, v.far.y, false),
});

const BUTTON = PLUMPS.find(k => k.id === 'plump-button').v;
const BEAN = BEANS.find(k => k.id === 'bean').v;

const LIST = [
  { id: 'button-white', name: 'Button', eyes: 'white eyes', v: withEyes(BUTTON, 'white'), draw: plumpBird },
  { id: 'button-black', name: 'Button', eyes: 'black eyes', v: withEyes(BUTTON, 'black'), draw: plumpBird },
  { id: 'bean-white', name: 'Bean', eyes: 'white eyes', v: withEyes(BEAN, 'white'), draw: beanBird },
  { id: 'bean-black', name: 'Bean', eyes: 'black eyes', v: withEyes(BEAN, 'black'), draw: beanBird },
];

export const CROWS = LIST.map(k => ({ ...k, draw: g => k.draw(g, k.v), head: headOf(k.v) }));
