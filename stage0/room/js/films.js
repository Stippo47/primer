// The scripted films and the named stills. Each is a pure function from time to a view,
// so any frame can be drawn by itself: a capture tool calls window.seek(seconds).

import { clamp01, lerp, ramp, out, inOut, inOutBack } from './ease.js';
import { ROOMS, BACK, MOTION, CASE_AT, X, Y, DOOR } from './scene.js';
import { makeView } from './view.js';
import { runBoxes, shelfPlace, SHELF, CASE } from './books.js';
import { AVATARS, LOOP } from './avatars.js';

// value at time t from keys [[time, value, ease], ...]; each key's ease shapes the move that arrives at it
function key(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, ease = inOut] = keys[i];
      return lerp(v0, v1, ease(ramp(t, t0, t1)));
    }
  }
  return keys[keys.length - 1][1];
}
const lin = k => k;
const tapAt = (t, at) => clamp01(1 - Math.abs(t - at) / 0.11);           // 1 while the finger is down for a tap
const ringAt = (t, at) => ramp(t, at, at + 0.45);
const glide = k => inOutBack(k, MOTION.overshoot * 0.5);

// ---- pan: across the bedroom, a tap on the open door, through it, and a little way into the kitchen ----
const B0 = ROOMS.bed.min, B1 = ROOMS.bed.max, K0 = ROOMS.kitchen.min, K1 = ROOMS.kitchen.max;
const DOOR_TAP = 3.55;
function pan(t) {
  const cam = key(t, [[0.6, B0], [1.3, B0 + 196, lin], [1.75, B0 + 228, out], [2.15, B0 + 228], [2.75, B1 - 18, lin], [3.15, B1, out],
    [DOOR_TAP + 0.15, B1], [DOOR_TAP + 1.25, K0, glide], [5.55, K0], [6.25, K1 - 14, lin], [6.65, K1, out]]);
  const fx = key(t, [[0.1, 400], [0.55, 352, out], [0.6, 352], [1.3, 156, lin], [1.6, 140, out], [2.05, 360], [2.15, 360], [2.75, 196, lin], [3.05, 180, out],
    [DOOR_TAP - 0.1, 334, out], [DOOR_TAP + 0.4, 334], [4.4, 360], [5.45, 330], [5.55, 330], [6.25, 200, lin], [6.55, 188, out]]);
  const fy = key(t, [[0.1, 720], [0.55, 560, out], [1.3, 552, lin], [1.6, 580], [2.05, 560], [2.75, 552, lin], [3.05, 590],
    [DOOR_TAP - 0.1, 560, out], [DOOR_TAP + 0.4, 560], [4.4, 640], [5.45, 600], [6.25, 592, lin], [6.55, 630]]);
  const drag = (t > 0.58 && t < 1.32) || (t > 2.13 && t < 2.77) || (t > 5.53 && t < 6.27);
  const press = drag ? 1 : tapAt(t, DOOR_TAP);
  const alpha = Math.min(ramp(t, 0.1, 0.35), 1 - ramp(t, 6.75, 7.05));
  return { t, cam, finger: { x: fx, y: fy, press, alpha, ring: ringAt(t, DOOR_TAP) } };
}

// ---- bookshelf: tap the bookcase, it opens, a strong run is tapped, then a fading one, then back ----
const SHELF_CAM = CASE_AT + CASE.W / 2 - 207 - 16;
const S = { tap: 0.9, open: [1.02, 1.95], a: 2.75, b: 4.55, back: 6.75, close: [6.85, 7.7] };
const place = shelfPlace(), cv = makeView({ k: SHELF.k, sx: 0 }, { yF: SHELF.k, D: 1 });
const runAt = id => { const r = runBoxes(cv).find(q => q.id === id), [a, b, c, d] = r.box; return [place.ox + ((a + c) / 2) * place.S, place.oy + ((b + d) / 2) * place.S]; };
function bookshelf(t) {
  const v = { t, cam: SHELF_CAM };
  if (t >= S.tap && t < S.open[1]) v.sel = { id: 'books', age: t - S.tap };
  v.books = t < S.close[0] ? ramp(t, S.open[0], S.open[1]) : 1 - ramp(t, S.close[0], S.close[1]);
  if (t >= S.a && t < S.b) v.run = { id: 'philosophy', age: t - S.a };
  if (t >= S.b && t < S.back) v.run = { id: 'logic', age: t - S.b };
  v.backPress = tapAt(t, S.back) > 0.3;
  const caseX = CASE_AT + CASE.W / 2 - SHELF_CAM, caseY = Y.front - 150;
  const P = { tap: [caseX + 6, caseY - 30], a: runAt('philosophy'), b: runAt('logic'), back: [BACK.x + 24, BACK.y + 26] };
  const fx = key(t, [[0.15, 330], [S.tap - 0.1, P.tap[0], out], [1.3, P.tap[0]], [1.9, 330], [2.3, 330], [S.a - 0.1, P.a[0] + 8, out], [3.2, P.a[0] + 8], [3.8, 300], [4.1, 300],
    [S.b - 0.1, P.b[0] + 6, out], [5.3, P.b[0] + 6], [5.95, 260], [6.2, 220], [S.back - 0.1, P.back[0], out], [7.0, P.back[0]], [7.6, 120]]);
  const fy = key(t, [[0.15, 720], [S.tap - 0.1, P.tap[1], out], [1.3, P.tap[1]], [1.9, 720], [2.3, 720], [S.a - 0.1, P.a[1] + 10, out], [3.2, P.a[1] + 10], [3.8, 700], [4.1, 700],
    [S.b - 0.1, P.b[1] + 12, out], [5.3, P.b[1] + 12], [5.95, 700], [6.2, 420], [S.back - 0.1, P.back[1], out], [7.0, P.back[1]], [7.6, 300]]);
  const taps = [S.tap, S.a, S.b, S.back];
  const press = Math.max(...taps.map(a => tapAt(t, a)));
  const ring = Math.max(...taps.map(a => (t >= a && t < a + 0.45 ? ringAt(t, a) : 0)));
  const alpha = Math.min(ramp(t, 0.15, 0.4), 1 - ramp(t, 7.55, 7.85));
  v.finger = { x: fx, y: fy, press, alpha, ring };
  return v;
}

export const FILMS = {
  pan: { duration: 7.2, view: pan },
  bookshelf: { duration: 8.4, view: bookshelf },
};
for (const a of AVATARS) FILMS[`avatar-${a.id}`] = { duration: LOOP, avatar: a.id };

// The stills. Each names a view; `angle`, `finger` and the film it comes from can be set per still.
const still = (film, t, extra = {}) => ({ film, t, ...extra });
const CORNER = 2;   // the bedroom corner: the end of the bed, the desk and its chair, the bookcase
export const STILLS = {
  'angle-a': { angle: 'a', view: () => ({ t: 0.6, cam: CORNER }) },
  'angle-b': { angle: 'b', view: () => ({ t: 0.6, cam: CORNER }) },
  'angle-c': { angle: 'c', view: () => ({ t: 0.6, cam: CORNER - 16 }) },
  'bedroom-left': { view: () => ({ t: 0.6, cam: B0 }) },
  'bedroom-right': { view: () => ({ t: 0.6, cam: B1 }) },
  kitchen: { view: () => ({ t: 1.2, cam: K0 + 30 }) },
  'kitchen-right': { view: () => ({ t: 1.2, cam: K1 }) },
  bookshelf: still('bookshelf', 2.45, { finger: false }),
  'bookshelf-bubble': still('bookshelf', 5.1),
  'bookshelf-zoom': still('bookshelf', 1.5, { finger: false }),
  'globe-open': { view: () => ({ t: 2, cam: B1, globe: 1 }) },
  'touch-bubble': { view: () => ({ t: 1.4, cam: B0, sel: { id: 'cup', age: 0.9 } }) },
  'fading-bubble': { view: () => ({ t: 1.4, cam: B1, sel: { id: 'guitar', age: 0.9 } }) },
};
for (const a of AVATARS) {
  STILLS[`avatar-${a.id}`] = { avatar: a.id, t: 0.5 };
  STILLS[`avatar-${a.id}-hat`] = { avatar: a.id, t: 0.5, hat: true };
}
export { X, DOOR };
