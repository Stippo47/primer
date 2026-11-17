// The scripted films and the named stills. Each is a pure function from time to a view,
// so any frame can be drawn by itself: a capture tool calls window.seek(seconds).

import { clamp01, lerp, ramp, out, inOut, inOutBack } from './ease.js';
import { ROOMS, GLOBE, BACK, MOTION } from './scene.js';
import { HOME_VIEW } from './globe.js';
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

// ---- pan: across the bedroom, through the door, a little way into the kitchen ----
const B0 = ROOMS.bed.min, B1 = ROOMS.bed.max, K0 = ROOMS.kitchen.min;
function pan(t) {
  const cam = key(t, [[0.6, B0], [1.25, B0 + 290, lin], [1.85, B0 + 382, out], [2.1, B0 + 382], [2.75, B0 + 672, lin], [3.35, B1, out],
    [4.2, B1], [5.3, K0, glide], [5.75, K0], [6.4, K0 + 220, lin], [7.0, K0 + 284, out]]);
  const fx = key(t, [[0.1, 390], [0.55, 352, out], [0.6, 352], [1.25, 62, lin], [1.5, 50, out], [2.0, 352], [2.1, 352], [2.75, 62, lin], [3.0, 50, out],
    [3.85, 322], [4.4, 322], [4.9, 360], [5.6, 336], [5.75, 336], [6.4, 116, lin], [6.7, 100, out]]);
  const fy = key(t, [[0.1, 700], [0.55, 496, out], [1.25, 490, lin], [1.5, 520], [2.0, 496], [2.75, 490, lin], [3.0, 520],
    [3.85, 512], [4.4, 512], [4.9, 560], [5.6, 496], [6.4, 490, lin], [6.7, 530]]);
  const drag = (t > 0.58 && t < 1.27) || (t > 2.08 && t < 2.77) || (t > 5.73 && t < 6.42);
  const press = drag ? 1 : tapAt(t, 4.1);
  const alpha = Math.min(ramp(t, 0.1, 0.35), 1 - ramp(t, 6.75, 7.05));
  return { t, cam, finger: { x: fx, y: fy, press, alpha, ring: ringAt(t, 4.1) } };
}

// ---- touch: a healthy thing, a fading thing, then into the globe and back ----
const CAM = 506, T = { cup: 0.95, guitar: 3.0, globe: 5.2, open: [5.32, 6.3], brazil: 7.5, back: 9.45, close: [9.55, 10.4] };
function touch(t, scene) {
  const v = { t, cam: CAM };
  if (t >= T.cup && t < T.guitar) v.sel = { id: 'cup', age: t - T.cup };
  if (t >= T.guitar && t < T.globe) { v.sel = { id: 'guitar', age: t - T.guitar }; v.gone = { id: 'cup', age: t - T.guitar }; }
  if (t >= T.globe) {
    if (t < T.open[1]) v.sel = { id: 'globe', age: t - T.globe };
    v.gone = { id: 'guitar', age: t - T.globe };
  }
  v.globe = t < T.close[0] ? ramp(t, T.open[0], T.open[1]) : 1 - ramp(t, T.close[0], T.close[1]);
  v.rot = [HOME_VIEW[0] - Math.max(0, t - T.open[0]) * 1.1, HOME_VIEW[1]];
  const gv = { ...GLOBE, rot: v.rot };
  const brazil = scene.globe.where([-52, -10], gv);
  if (t >= T.brazil && t < T.close[0] + 0.2) v.pick = { name: 'Brazil', age: t - T.brazil, at: [brazil[0], brazil[1] - 4] };
  v.backPress = tapAt(t, T.back) > 0.3;
  const P = { cup: [68, 352], guitar: [350, 600], globe: [264, 606], brazil: [brazil[0] + 2, brazil[1] + 2], back: [BACK.x + 24, BACK.y + 26] };
  const fx = key(t, [[0.2, 150], [T.cup - 0.1, P.cup[0], out], [1.4, P.cup[0]], [1.9, 120], [2.5, 120], [T.guitar - 0.1, P.guitar[0], out], [3.5, P.guitar[0]], [4.0, 300], [4.6, 300],
    [T.globe - 0.1, P.globe[0], out], [5.5, P.globe[0]], [6.2, 330], [6.9, 330], [T.brazil - 0.1, P.brazil[0], out], [7.9, P.brazil[0]], [8.4, 300], [8.9, 300], [T.back - 0.1, P.back[0], out], [9.7, P.back[0]], [10.3, 110]]);
  const fy = key(t, [[0.2, 640], [T.cup - 0.1, P.cup[1], out], [1.4, P.cup[1]], [1.9, 470], [2.5, 470], [T.guitar - 0.1, P.guitar[1], out], [3.5, P.guitar[1]], [4.0, 740], [4.6, 740],
    [T.globe - 0.1, P.globe[1], out], [5.5, P.globe[1]], [6.2, 760], [6.9, 760], [T.brazil - 0.1, P.brazil[1], out], [7.9, P.brazil[1]], [8.4, 700], [8.9, 700], [T.back - 0.1, P.back[1], out], [9.7, P.back[1]], [10.3, 250]]);
  const taps = [T.cup, T.guitar, T.globe, T.brazil, T.back];
  const press = Math.max(...taps.map(a => tapAt(t, a)));
  const ring = Math.max(...taps.map(a => (t >= a && t < a + 0.45 ? ringAt(t, a) : 0)));
  const alpha = Math.min(ramp(t, 0.2, 0.45), 1 - ramp(t, 10.25, 10.5));
  v.finger = { x: fx, y: fy, press, alpha, ring };
  return v;
}

export const FILMS = {
  pan: { duration: 7.5, view: pan },
  touch: { duration: 10.9, view: touch },
};
for (const a of AVATARS) FILMS[`avatar-${a.id}`] = { duration: LOOP, avatar: a.id };

// The stills. Each names a view; `nav` and `finger` can be set per still.
const still = (film, t, extra = {}) => ({ film, t, ...extra });
export const STILLS = {
  'bedroom-left': { view: () => ({ t: 0.6, cam: B0 }) },
  'bedroom-right': { view: () => ({ t: 0.6, cam: B1 }) },
  kitchen: { view: () => ({ t: 1.2, cam: 1264 }) },
  'kitchen-door': { view: () => ({ t: 1.2, cam: K0 }) },
  'touch-bubble': still('touch', 2.2),
  'fading-bubble': still('touch', 4.2),
  globe: still('touch', 7.2, { finger: false }),
  'globe-label': still('touch', 8.6, { finger: false }),
  arrows: { nav: 'arrows', view: () => ({ t: 0.6, cam: 120 }) },
  'arrows-kitchen': { nav: 'arrows', view: () => ({ t: 0.6, cam: K0 + 150 }) },
};
for (const a of AVATARS) {
  STILLS[`avatar-${a.id}`] = { avatar: a.id, t: 0.5 };
  STILLS[`avatar-${a.id}-hat`] = { avatar: a.id, t: 0.5, hat: true };
}
