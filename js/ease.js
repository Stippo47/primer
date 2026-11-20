// Small timing kit. Everything is a pure function of time, so any frame can be drawn on its own.

export const TAU = Math.PI * 2;
export const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, k) => a + (b - a) * k;
// 0 before `a`, 1 after `b`, straight in between.
export const ramp = (t, a, b) => clamp01((t - a) / (b - a));
// 1 between a and b, with soft edges of width `e` on each side.
export const window_ = (t, a, b, e = 0.25) => Math.min(ramp(t, a, a + e), 1 - ramp(t, b - e, b));

export const out = k => 1 - Math.pow(1 - k, 3);
export const inn = k => k * k * k;
export const inOut = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

// Soft: an ease in and out whose fastest moment is only half again its average speed (a cubic in-out's is
// three times it, which reads as a snap). The camera, tracks and anything a scene moves use this.
export const soft = k => (k <= 0 ? 0 : k >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * k));

// A CSS cubic-bezier(x1, y1, x2, y2) as a function of k (0..1): the curve's x solved for k by Newton's method
// with a bisection fallback, then its y. Pure, so any frame can be drawn on its own.
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return k => {
    if (k <= 0) return 0;
    if (k >= 1) return 1;
    let t = k;
    for (let i = 0; i < 6; i++) { const e = X(t) - k, d = dX(t); if (Math.abs(e) < 1e-6) return Y(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = k;
    for (let i = 0; i < 30; i++) { const x = X(t); if (Math.abs(x - k) < 1e-6) break; if (x < k) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}

// The motion families measured in the second study (docs/research/kurzgesagt-study-2.md, 1.1), one curve and
// one usual length each. Pick by what is moving, never by taste:
//   furniture   diagram parts arriving (a label's pill, a callout's circle): ease-out, peak speed at the start,
//               no overshoot, 450 to 700 ms
//   prop        things in the world arriving (a sign's board, an object popping in): a spring to +12% in 150 ms,
//               settled by 350 ms
//   camera      the camera's moves: sine in and out, about a sentence long
//   transition  cuts, splits, a zoom through a lens: in-out cubic, ~850 ms (a zoom runs in log scale)
//   process     anything ongoing (air flowing, arrows growing up a column): linear, constant speed, or a loop
//   leader      a callout's leader line: linear, slightly quickening, ~400 ms, straight into an ease-out
//   colour      a hue that carries cause and effect (the sea warming): 1.2 s to a 10% overshoot, settled 0.9 s on
//   accumulate  something building up over many seconds (soot spreading, warm water spreading): ease-out cubic
const easeOutCubic = bezier(0.33, 1, 0.68, 1);
const inOutCubic = bezier(0.65, 0, 0.35, 1);
const PROP_PEAK = 150 / 350;
export const prop = k => {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  if (k < PROP_PEAK) { const x = k / PROP_PEAK; return 1.12 * (1 - (1 - x) * (1 - x)); }
  const s = (k - PROP_PEAK) / (1 - PROP_PEAK);
  return 1 + 0.06 * (1 + Math.cos(Math.PI * s));
};
const COLOUR_PEAK = 1.2 / 2.1;
export const colour = k => {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  if (k < COLOUR_PEAK) return 1.1 * soft(k / COLOUR_PEAK);
  const s = (k - COLOUR_PEAK) / (1 - COLOUR_PEAK);
  return 1 + 0.05 * (1 + Math.cos(Math.PI * s));
};
export const MOTION = {
  furniture: { ease: easeOutCubic, ms: 600 },
  prop: { ease: prop, ms: 350 },
  camera: { ease: soft, ms: 1600 },
  transition: { ease: inOutCubic, ms: 850 },
  process: { ease: k => clamp01(k), ms: 2000 },
  leader: { ease: k => clamp01(k) * (0.9 + 0.1 * clamp01(k)), ms: 400 },
  colour: { ease: colour, ms: 2100 },
  accumulate: { ease: k => 1 - Math.pow(1 - clamp01(k), 3), ms: 7000 },
};
// How far through a move begun at t0 is at `now`, shaped by its family (0 before, 1 after; prop and colour
// pass 1 on the way).
export const moved = (family, t0, now, ms) => { const M = MOTION[family] || MOTION.furniture; return M.ease(clamp01((now - t0) / (ms || M.ms))); };

// The eases a scene's stretch can name (docs/format.md, "A scene"): the old four, and the families above.
export const EASES = {
  soft, linear: k => clamp01(k), in: k => clamp01(k) * clamp01(k), out: k => 1 - (1 - clamp01(k)) * (1 - clamp01(k)),
  camera: soft, transition: inOutCubic, furniture: easeOutCubic, process: k => clamp01(k), accumulate: MOTION.accumulate.ease,
};

// A value that glides to wherever it's sent, softly, and can be sent somewhere new mid-glide without a jolt:
// the new glide starts from where it is, at the speed it's going (a cubic Hermite curve, so its speed never
// jumps). From rest it eases in and out like `soft`. Times are in milliseconds (performance.now()).
export class Glide {
  constructor(v = 0) { this.from = v; this.to = v; this.v0 = 0; this.t0 = 0; this.ms = 0; }
  // Where it is at `now`, and how fast it's going (per millisecond).
  at(now) {
    if (!this.ms || now >= this.t0 + this.ms) return this.to;
    const k = clamp01((now - this.t0) / this.ms), m0 = this.v0 * this.ms, d = this.to - this.from;
    const k2 = k * k, k3 = k2 * k;
    return this.from + (k3 - 2 * k2 + k) * m0 + (3 * k2 - 2 * k3) * d;
  }
  speed(now) {
    if (!this.ms || now >= this.t0 + this.ms) return 0;
    const k = clamp01((now - this.t0) / this.ms), m0 = this.v0 * this.ms, d = this.to - this.from;
    return ((3 * k * k - 4 * k + 1) * m0 + (6 * k - 6 * k * k) * d) / this.ms;
  }
  moving(now) { return !!this.ms && now < this.t0 + this.ms; }
  // Off to `to` over `ms` (0: there at once).
  go(to, ms, now) {
    if (!(ms > 0)) { this.from = this.to = to; this.v0 = 0; this.ms = 0; return this; }
    const v = this.at(now), s = this.speed(now);
    Object.assign(this, { from: v, to, v0: s, t0: now, ms });
    return this;
  }
}

// A value that moves to wherever it's sent along one of the motion families (a colour shifting with its small
// overshoot, say), rather than Glide's soft Hermite. Sent somewhere new mid-move, it starts again from where it
// is. Times in milliseconds.
export class Shift {
  constructor(v = 0, family = 'colour') { this.from = v; this.to = v; this.t0 = 0; this.ms = 0; this.family = family; }
  at(now) { if (!this.ms || now >= this.t0 + this.ms) return this.to; return this.from + (this.to - this.from) * MOTION[this.family].ease(clamp01((now - this.t0) / this.ms)); }
  moving(now) { return !!this.ms && now < this.t0 + this.ms; }
  go(to, ms, now) {
    if (!(ms > 0)) { this.from = this.to = to; this.ms = 0; return this; }
    this.from = this.at(now); this.to = to; this.t0 = now; this.ms = ms;
    return this;
  }
}

// Ease out with an overshoot. s = 0 is a plain ease out; s = 1.7 is a clear overshoot.
export const back = (k, s) => {
  const c = k - 1;
  return 1 + c * c * ((s + 1) * c + s);
};

// Ease in and out, leaning back at the start and past the end by `s`.
export const inOutBack = (k, s) => {
  const c = s * 1.525;
  return k < 0.5
    ? (Math.pow(2 * k, 2) * ((c + 1) * 2 * k - c)) / 2
    : (Math.pow(2 * k - 2, 2) * ((c + 1) * (k * 2 - 2) + c) + 2) / 2;
};

// A pop from 0 to 1 that rings. bounce = 0 settles calmly, 1 rings hard.
export const spring = (k, bounce) => {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  const decay = Math.exp(-(7 - 3 * bounce) * k);
  const swing = Math.cos(k * Math.PI * (1 + 3 * bounce));
  return 1 - decay * swing * (1 - k * k * k);
};

// Seeded random numbers, so stars and wobbles are the same on every run.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Colour helpers. Colours in the look files are #rrggbb.
const parse = hex => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgba = (hex, a = 1) => {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
};
export const mix = (hexA, hexB, k) => {
  const a = parse(hexA), b = parse(hexB);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], k)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
