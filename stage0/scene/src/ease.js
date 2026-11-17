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
