// The style dial's small helpers, shared by the two characters on it (gecko.js, person.js).
// A dial value s runs from 0 (the character exactly as first drawn, child-book) to 1 (grown-up, editorial flat
// vector). Numbers and colours slide with s; a few things switch at a point along it (a shape family, the way the
// shadow is laid), since a style has some either-or choices in it.

import { mixHex } from '../../avatar10/js/kit.js';

export const STEPS = [0, 0.25, 0.5, 0.75, 1];

export const clamp01 = x => Math.max(0, Math.min(1, x));
// 0 before a, 1 after b, a straight slide between
export const ramp = (s, a, b) => clamp01((s - a) / (b - a));

// a dial: d(a, b) is a at s = 0 and b at s = 1; d.c(a, b) the same for two colours; d.r(a, b) the ramp between
// two points of the dial
export function dial(s) {
  const d = (a, b) => a + (b - a) * s;
  d.s = s;
  d.c = (a, b) => mixHex(a, b, s);
  d.r = (a, b) => ramp(s, a, b);
  d.at = (a, b, t) => a + (b - a) * t;
  d.ca = (a, b, t) => mixHex(a, b, clamp01(t));
  return d;
}
