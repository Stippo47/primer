// Six avatar candidates, set out as a spectrum from the Kurzgesagt end to the Duolingo end.
// Each is drawn from its feet at (0, 0), about 150 units tall, and can wear the shop's hat and shirt.
// Idle motion is a pure function of time and loops every 4 seconds with no jump at the seam.

import { rr, pill, circ, ell, rpoly, pd, union, tube, limb, leaf, pen, dEye, kDot, TAU } from './kit.js';

export const LOOP = 4;
// end: place on the spectrum, 1 = Kurzgesagt, 6 = Duolingo. h: height in units, cx: middle of the outline.
export const CAST = [
  { id: 'puffin', name: 'Puffin', kind: 'bird', end: 1, h: 126, cx: -12 },
  { id: 'tall', name: 'Tall person', kind: 'person', end: 2, h: 162, cx: 0 },
  { id: 'frog', name: 'Frog', kind: 'animal', end: 3, h: 111, cx: 0 },
  { id: 'raccoon', name: 'Raccoon', kind: 'animal', end: 4, h: 154, cx: 8 },
  { id: 'toucan', name: 'Toucan', kind: 'bird', end: 5, h: 138, cx: -14 },
  { id: 'round', name: 'Round person', kind: 'person', end: 6, h: 170, cx: 0 },
];

// How each end colours a form. planes: how broad the violet shadow plane is; rim: the light's edge line.
const STYLE = {
  1: { planes: 1, rim: '#d4dcff', rimW: 1.7 },
  2: { planes: 0.9, rim: '#d4dcff', rimW: 1.5 },
  3: { planes: 0.75, rim: null },
  4: { planes: 0.4, rim: null },
  5: { planes: 0, rim: null },
  6: { planes: 0, rim: null },
};

// ---------- idle ----------
const blinkAt = (p, at) => {
  const d = p - at;
  if (d < 0 || d > 0.27) return 0;
  if (d < 0.07) return d / 0.07;
  if (d < 0.11) return 1;
  return 1 - (d - 0.11) / 0.16;
};
function idle(t) {
  const p = ((t % LOOP) + LOOP) % LOOP, u = p / LOOP, w = u * TAU;
  return {
    p, u,
    breath: Math.sin(w),                 // one slow breath per loop
    sway: Math.sin(w + 0.6),
    lag: Math.sin(w - 0.8),              // the same, a beat late: hair, crests, wings
    b2: (1 - Math.cos(2 * w)) / 2,       // two settles per loop, 0 low, 1 high
    b2lag: (1 - Math.cos(2 * w - 1.0)) / 2,
    s2: Math.sin(2 * w + 0.4),
    blink: (at, at2) => Math.min(1, blinkAt(p, at) + (at2 ? blinkAt(p, at2) : 0)),
    pulse: (at, len = 0.5) => { const d = (p - at) / len; return d < 0 || d > 1 ? 0 : Math.sin(d * Math.PI); },
  };
}
// Duolingo-end squash: the body settles down onto its feet and springs back.
function settle(g, m, pivotY, amt = 1) {
  const low = (1 - m.b2) * (1 - m.b2);
  const sx = 1 + 0.03 * amt * low, sy = 1 - 0.028 * amt * low + 0.008 * amt * m.b2;
  g.ctx.translate(0, pivotY - m.b2 * 2 * amt);
  g.ctx.scale(sx, sy);
  g.ctx.translate(0, -pivotY);
}

// ---------- the shop's things ----------
const HAT = { dome: '#49c6ff', domeD: '#3a72e6', band: '#1b8fd1', bandD: '#2453b8', pom: '#ffffff', pomD: '#c3c4ff' };
// a beanie; origin at the bottom centre of its band
function hat(g, w) {
  const h = w * 0.6;
  const dome = pd(`M${-w * 0.45} ${-w * 0.14} C${-w * 0.47} ${-h * 1.3} ${w * 0.47} ${-h * 1.3} ${w * 0.45} ${-w * 0.14} Z`);
  g.form(circ(0, -h * 1.08, w * 0.13), HAT.pom, { dark: HAT.pomD, w: w * 0.35 });
  g.form(dome, HAT.dome, { dark: HAT.domeD, w, rim: true });
  if (!g.S.planes) g.fill(rr(w * 0.12, -h * 0.98, w * 0.07, h * 0.72, w * 0.035), HAT.band); // one darker fold line, the flat way
  g.form(rr(-w * 0.52, -w * 0.27, w * 1.04, w * 0.28, w * 0.12), HAT.band, { dark: HAT.bandD, w });
}
const SHIRT = { body: '#ffc83d', dark: '#f39a3a', hem: '#e8a31a', stripe: '#49c6ff', stripeD: '#3a72e6' };
// the shirt: the torso's own outline between y0 and y1, with a round neck showing what is under it
function shirt(g, torso, y0, y1, o = {}) {
  const { w = 50, neck = [0, 11, 6], under = '#000', stripe = 0.42 } = o;
  g.clip(torso, () => g.clip(rr(-300, y0, 600, y1 - y0, 0), () => {
    g.form(torso, SHIRT.body, { dark: SHIRT.dark, w });
    const sy = y0 + (y1 - y0) * stripe;
    g.clip(rr(-300, sy, 600, (y1 - y0) * 0.16, 0), () => g.form(torso, SHIRT.stripe, { dark: SHIRT.stripeD, w, rim: false }));
    g.fill(rr(-300, y1 - 3.2, 600, 3.2, 0), SHIRT.hem);
    g.fill(ell(neck[0], y0, neck[1] + 2, neck[2] + 2), SHIRT.hem);
    g.fill(ell(neck[0], y0, neck[1], neck[2]), under);
  }));
}

// =====================================================================
// 1. Puffin: the Kurzgesagt end. One egg of a body, a calm face, broad violet shadow planes, a rim of light.
function puffin(g, e) {
  const { ctx } = g, m = e.m;
  const D = '#4b30d6', DD = '#2b1a92', P = '#f4eeff', PD = '#c0aef4', OR = '#ff7a3d', ORD = '#e2463f';
  g.ground(46, 'ellipse', '#0a0830', 0.34, 10);
  // feet: bright webbed wedges, both pointing forward-left
  for (const [x, dx] of [[-16, -3], [11, -1]]) {
    g.form(tube(x, -16, x + dx, -4, 3.8), OR, { dark: ORD, w: 8 });
    g.form(rpoly([[x + dx - 22, 0], [x + dx - 3, -9], [x + dx + 6, 0]], 3), OR, { dark: ORD, w: 20, ky: 0.5 });
  }
  ctx.save();
  ctx.rotate(-0.04 + m.sway * 0.012);
  ctx.translate(0, -m.breath * 0.5);
  ctx.scale(1 - m.breath * 0.008, 1 + m.breath * 0.016);
  // one stout mass, round on top where the head is, widest low down
  const body = pd('M-2 -124 C-26 -124 -42 -106 -42 -84 C-42 -60 -44 -36 -34 -22 C-26 -12 -12 -10 2 -10 C18 -10 32 -14 38 -26 C44 -40 44 -66 41 -86 C38 -108 22 -124 -2 -124 Z');
  g.form(body, D, { dark: DD, w: 86 });
  // a pale mask round the eye, a dark collar, a pale belly
  const face = ell(-14, -91, 30, 19, -0.1), belly = ell(-5, -30, 37, 29);
  g.clip(body, () => {
    g.form(face, P, { dark: PD, w: 36 });
    g.form(belly, P, { dark: PD, w: 56 });
  });
  if (e.shirt) shirt(g, body, -68, -16, { w: 82, neck: [-8, 13, 6], under: D });
  g.rimOn(body);
  // the wing lies along the back and lifts a little, a beat late
  g.at(20, -80, () => {
    const wing = leaf(0, 0, 16, 56, 0.3, 0.1);
    g.form(wing, D, { dark: DD, w: 26 });
  }, 1, m.lag * 0.05);
  // the eye: a small dark oval in the pale mask, with the puffin's dark streak running back from it
  const bl = m.blink(1.55);
  g.fill(rpoly([[-21, -97], [-2, -99], [-17, -93]], 1.5), '#8a7fd6');
  kDot(g, -21, -95, 3.6, 4.4, bl, '#1d0f5a');
  if (bl < 0.5) g.fill(circ(-22.3, -96.6, 1.15), '#ffffff', 0.95);
  // the beak: taller than it is long, the tip low, the lower half a darker red, a slate base and a yellow line
  const beak = pd('M-35 -111 C-50 -107 -62 -97 -67 -82 C-59 -76 -47 -71 -35 -70 Z');
  g.fill(beak, OR);
  g.clip(beak, () => {
    g.fill(pd('M-30 -89 L-70 -82 L-70 -60 L-30 -60 Z'), ORD);
    g.fill(rr(-43, -116, 8, 50, 0), '#8f99f0');
    g.fill(rr(-45.5, -116, 2.6, 50, 0), '#ffc83d');
    g.line(pd('M-52 -103 Q-57 -95 -57 -86'), '#e2463f', 1.6, 0.8);
  });
  g.fill(circ(-36, -88, 2.8), '#ffc83d');
  if (e.hat) g.at(-3, -118, () => hat(g, 48), 1, -0.1);
  ctx.restore();
}

// =====================================================================
// 2. Tall person: Kurzgesagt-leaning. Four heads tall, palette skin, a dot-eyed calm face, planes and rim.
function tall(g, e) {
  const { ctx } = g, m = e.m;
  const SK = '#ff9db4', SKD = '#e0628f', HR = '#ff6a3d', HRD = '#d0365c';
  const TOP = '#36c4ff', TOPD = '#3a6fe6', LEG = '#5b3fe0', LEGD = '#35239e', SH = '#ffd84a', SHD = '#f0923c';
  g.ground(32, 'ellipse', '#0a0830', 0.34, 9);
  // weight on the far leg: the hips sit over it, the near foot rests a little out and forward
  g.form(rr(-25, -8, 19, 8, [5, 3, 2, 3]), SH, { dark: SHD, w: 18 });
  g.form(rr(2, -8, 18, 8, [5, 3, 2, 3]), SH, { dark: SHD, w: 18 });
  ctx.save();
  ctx.translate(0, -m.breath * 0.4);
  g.form(union(tube(-6, -60, -14, -8, 6.2), tube(9, -60, 10, -8, 6.2), rr(-14, -68, 31, 16, 6)), LEG, { dark: LEGD, w: 34, kx: 0.36 });
  // breathing lifts the chest a little; the upper body leans gently against the hips
  ctx.translate(1.5, -62); ctx.rotate(-0.035); ctx.scale(1 - m.breath * 0.005, 1 + m.breath * 0.016); ctx.translate(0, 62);
  const torso = pd('M-13 -108 C-18 -108 -21 -105 -21 -99 L-18 -66 C-18 -62 -16 -60 -12 -60 L12 -60 C16 -60 18 -62 18 -66 L21 -99 C21 -105 18 -108 13 -108 Z');
  const armR = limb(16, -101, 6, 20, -66, 5), armL = limb(-16, -101, 6, -21, -67, 5);
  const top = e.shirt ? null : TOP;
  // far arm
  if (top) g.form(armR, TOP, { dark: TOPD, w: 14 }); else shirtArm(g, armR, -104, -86, SK, SKD);
  g.form(circ(20.5, -62.5, 4.8), SK, { dark: SKD, w: 9 });
  if (top) g.form(torso, TOP, { dark: TOPD, w: 42, kx: 0.38, rim: true });
  else { g.form(torso, SK, { dark: SKD, w: 42 }); shirt(g, torso, -109, -60, { w: 42, neck: [0, 7, 4], under: SK, stripe: 0.45 }); g.rimOn(torso); }
  // near arm
  if (top) g.form(armL, TOP, { dark: TOPD, w: 14, rim: true }); else shirtArm(g, armL, -104, -86, SK, SKD, true);
  g.form(circ(-21.5, -63.5, 4.8), SK, { dark: SKD, w: 9 });
  // head tilts a little, a beat behind the body
  ctx.translate(0, -110); ctx.rotate(0.06 + m.lag * 0.025); ctx.translate(0, 110);
  g.form(rr(-5, -116, 10, 10, 2), SKD);
  // short hair at the back of the head
  g.form(rr(-6, -157, 28, 33, [14, 15, 7, 9]), HRD);
  g.form(rr(-17, -151, 32, 39, 13), SK, { dark: SKD, w: 24, kx: 0.28 });
  // hair in front: one short cropped shape, parted on one side, a swoop rising off the forehead
  g.at(0, -150, () => {
    const crop = pd('M-19 15 C-22 -1 -13 -12 2 -12 C16 -12 24 -3 22 12 L22 22 C21 25 18 26 16 24 L13 16 C9 9 1 4 -6 5 C-12 6 -16 10 -19 15 Z');
    g.form(crop, HR, { dark: HRD, w: 34, kx: 0.3, ky: 0.04, rim: true });
    g.form(leaf(-10, -9, 9, -17, 0.32, 0.12), HR, { dark: HRD, w: 14, kx: 0.25 });
  }, 1, m.lag * 0.02);
  g.form(circ(12, -128, 4.6), SK, { dark: SKD, w: 9 });
  // the face: low dark eyes with no white, a small nose, a small mouth
  const bl = m.blink(1.9);
  kDot(g, -10, -129, 2.5, 3.3, bl);
  kDot(g, 3, -129, 2.5, 3.3, bl);
  g.fill(rpoly([[-4.5, -128], [-1.5, -121.5], [-6, -121]], 1.2), SKD);
  g.line(pd('M-6.5 -118 Q-3.5 -116 -0.5 -118'), '#a8205e', 1.7);
  if (e.hat) g.at(1, -150, () => hat(g, 50), 1, -0.06);
  ctx.restore();
}
// a short sleeve on an arm: the shirt colour over the top of the arm, skin below
function shirtArm(g, arm, y0, y1, sk, skd, rim = false) {
  g.form(arm, sk, { dark: skd, w: 12 });
  g.clip(arm, () => g.clip(rr(-300, y0 - 10, 600, y1 - y0 + 10, 0), () => g.form(arm, SHIRT.body, { dark: SHIRT.dark, w: 12 })));
  g.clip(arm, () => g.fill(rr(-300, y1 - 2.2, 600, 2.2, 0), SHIRT.hem));
  if (rim) g.rimOn(arm);
}

// =====================================================================
// 3. Frog: the middle. Duolingo's build and eyes, Kurzgesagt's colour and one shadow plane, no rim.
function frog(g, e) {
  const { ctx } = g, m = e.m;
  const F = '#ff7a3d', FD = '#e0434f', B = '#ffe0a6', BD = '#f6ad7c', FT = '#ff9b52', FTD = '#e85a3a';
  g.ground(46, 'ellipse', '#0a0830', 0.3, 10);
  // feet: wide, flat, a little apart from the body
  for (const k of [-1, 1]) g.form(rr(k * 21 - 15, -7, 30, 7, [4, 4, 2, 2]), FT, { dark: FTD, w: 30 });
  ctx.save();
  settle(g, m, -11, 0.6);
  const body = union(rr(-41, -94, 82, 84, [34, 34, 26, 26]), circ(-21, -94, 16), circ(21, -94, 16));
  g.form(body, F, { dark: FD, w: 84, kx: 0.34, ky: 0.1 });
  // the throat and belly swell with each breath
  const swell = 1 + Math.max(0, m.breath) * 0.06;
  g.clip(body, () => g.at(0, -40, () => g.form(ell(0, 0, 27, 28), B, { dark: BD, w: 54 }), swell));
  if (e.shirt) shirt(g, body, -60, -16, { w: 84, neck: [0, 13, 6], under: B });
  // arms: short tubes, round hands
  for (const k of [-1, 1]) {
    g.form(tube(k * 31, -58, k * 33, -32, 6), F, { dark: FD, w: 13 });
    g.form(circ(k * 33, -29, 6.4), FT, { dark: FTD, w: 13 });
  }
  // the hat nestles between the eye bumps, so it goes on before the eyes
  if (e.hat) g.at(0, -101, () => hat(g, 38), 1, 0.04);
  // eyes on their bumps; the lids are the body's colour
  const bl = m.blink(1.25, 3.35);
  const glance = m.pulse(2.3, 0.9);
  for (const k of [-1, 1]) dEye(g, k * 21, -95, 21, 21, { look: [-1 - glance * 3, 0.5], blink: bl, lid: F, lidLine: FD, pupil: '#2a1650', pw: 0.42, ph: 0.62, sleepy: 0.08 });
  // a wide, thin smile and two cheeks
  g.line(pd('M-22 -66 Q0 -56 22 -66'), '#6b1d3c', 2.6);
  g.fill(ell(-29, -69, 5.5, 3.2), '#ff5f8a', 0.55);
  g.fill(ell(29, -69, 5.5, 3.2), '#ff5f8a', 0.55);
  ctx.restore();
}

// =====================================================================
// 4. Raccoon: Duolingo-leaning. Big head block, a mask with big eyes inside it, detached feet, flat colour.
function raccoon(g, e) {
  const { ctx } = g, m = e.m;
  const G = '#a4aadb', GD = '#7c83c4', SH = '#8a8fd0', DK = '#3c3f6e', PL = '#eef0ff', HAND = '#4b4f86', BEL = '#cdd1f2';
  g.ground(34, 'pill', '#0a0830', 0.3, 8);
  g.fill(pill(-11, -3.2, 19, 6.8), HAND);
  g.fill(pill(11, -3.2, 19, 6.8), HAND);
  ctx.save();
  settle(g, m, -12, 1);
  // tail, behind, swaying
  g.at(16, -36, () => {
    const tail = pill(22, 0, 46, 17);
    g.form(tail, G, { dark: SH, w: 30, kx: 0.1, ky: 0.5 });
    g.clip(tail, () => { for (const x of [14, 26]) g.fill(rr(x, -12, 6, 24, 0), DK); g.fill(rr(37, -12, 12, 24, 0), DK); });
  }, 1, -0.75 + m.lag * 0.09);
  // legs, body, belly
  g.form(tube(-10, -30, -11, -11, 4.6), G, { dark: SH, w: 10 });
  g.form(tube(10, -30, 11, -11, 4.6), G, { dark: SH, w: 10 });
  const torso = rr(-24, -88, 48, 62, [17, 17, 22, 22]);
  g.form(torso, G, { dark: SH, w: 48 });
  g.fill(ell(0, -50, 14, 17), BEL);
  if (e.shirt) shirt(g, torso, -84, -40, { w: 48, neck: [0, 10, 5], under: G });
  for (const k of [-1, 1]) {
    g.form(tube(k * 21, -78, k * 28, -50, 5.2), G, { dark: SH, w: 12 });
    g.fill(circ(k * 28.5, -47, 6.3), HAND);
  }
  // the head bobs a beat behind the body
  ctx.translate(0, -m.b2lag * 1.4);
  const flick = m.pulse(2.6, 0.35);
  for (const k of [-1, 1]) {
    g.at(k * 26, -134, () => {
      g.fill(rpoly([[-11 * k, 8], [-4 * k, -18], [13 * k, 0]], 5), G);
      g.fill(rpoly([[-6 * k, 4], [-3 * k, -11], [7 * k, 0]], 3), GD);
    }, 1, k * (0.1 + (k > 0 ? flick * 0.25 : 0)));
  }
  const head = rr(-38, -144, 76, 60, 24);
  g.form(head, G, { dark: SH, w: 76 });
  // the mask, eyes inside it, white brows above it
  g.clip(head, () => g.fill(pill(0, -113, 82, 25), DK));
  g.fill(pill(-14, -121, 20, 13), DK);
  g.fill(pill(14, -121, 20, 13), DK);
  const bl = m.blink(1.45, 3.05), pop = m.pulse(1.4, 0.45) * 1.6;
  for (const k of [-1, 1]) dEye(g, k * 10, -113, 17, 19, { look: [-1.6, 0.6], blink: bl, lid: DK, lidLine: '#23254a', pupil: '#2b2b3f' });
  for (const k of [-1, 1]) g.at(k * 15, -133 - pop, () => g.fill(pill(0, 0, 15, 6), PL), 1, k * 0.16);
  // muzzle, a hanging nose, a small open smile
  g.fill(pill(0, -96, 30, 18), PL);
  g.fill(pd('M-6.5 -103 Q0 -106 6.5 -103 Q6 -97 0 -96.5 Q-6 -97 -6.5 -103 Z'), '#2d2f55');
  g.fill(pd('M-6 -93.5 Q0 -91 6 -93.5 Q4.5 -88 0 -88 Q-4.5 -88 -6 -93.5 Z'), '#b8344f');
  if (e.hat) g.at(0, -141, () => hat(g, 40), 1, -0.05);
  ctx.restore();
}

// =====================================================================
// 5. Toucan: Duolingo-leaning bird. One tall block for head and body, big eyes, a beak pushed to caricature.
function toucan(g, e) {
  const { ctx } = g, m = e.m;
  const BL = '#3d6cf2', BLD = '#2a4cc4', BIB = '#fff0b8', OR = '#ff9b1f', ORD = '#de6a17', YL = '#ffd23d', RD = '#ff4b4b';
  g.ground(34, 'pill', '#0a0830', 0.3, 8);
  g.fill(pill(-10, -3.2, 17, 6.8), OR);
  g.fill(pill(10, -3.2, 17, 6.8), OR);
  ctx.save();
  settle(g, m, -12, 1);
  g.at(18, -26, () => g.fill(rr(0, -6, 28, 12, 6), BLD), 1, 0.45 + m.lag * 0.05);
  const body = rr(-28, -138, 56, 126, [28, 28, 21, 21]);
  g.fill(body, BL);
  g.clip(body, () => g.fill(ell(-8, -90, 22, 20), BIB));
  if (e.shirt) shirt(g, body, -80, -30, { w: 56, neck: [-6, 13, 6], under: BIB });
  // wings as arms, with a little flap
  const flap = m.pulse(2.5, 0.5);
  for (const k of [-1, 1]) g.at(k * 24, -86, () => g.fill(limb(0, 0, 9.5, k * 6, 30, 4.5), BLD), 1, k * (0.16 + flap * 0.25));
  // big eyes, close together, and heavy brows
  const bl = m.blink(1.7, 3.55);
  dEye(g, -12, -116, 17, 19, { look: [-2.4, 0.4], blink: bl, lid: BL, lidLine: BLD });
  dEye(g, 6.5, -116, 15.5, 18, { look: [-2.4, 0.4], blink: bl, lid: BL, lidLine: BLD });
  const pop = m.pulse(1.62, 0.45) * 1.6;
  g.at(-12, -131 - pop, () => g.fill(pill(0, 0, 13, 5.5), '#1a2766'), 1, -0.12);
  g.at(7, -131 - pop, () => g.fill(pill(0, 0, 12, 5.5), '#1a2766'), 1, 0.14);
  // the beak: long, fat, three colours
  const beak = pd('M-10 -107 C-30 -112 -58 -106 -71 -86 C-60 -82 -38 -84 -10 -86 C-6 -92 -6 -101 -10 -107 Z');
  g.fill(beak, OR);
  g.clip(beak, () => {
    g.fill(pd('M-14 -112 C-34 -116 -60 -110 -74 -88 L-70 -86 C-56 -104 -34 -106 -14 -103 Z'), YL);
    g.fill(circ(-70, -88, 9), RD);
    g.fill(rr(-16, -114, 5, 32, 0), ORD);
  });
  g.line(pd('M-12 -94 C-30 -93 -46 -91 -58 -88'), ORD, 1.8);
  if (e.hat) g.at(-1, -135, () => hat(g, 44), 1, -0.04);
  ctx.restore();
}

// =====================================================================
// 6. Round person: the Duolingo end. A big head on a small body, eyes touching, bean brows and mouth,
// a nose that hangs, stick legs, detached shoes, flat colour.
function round(g, e) {
  const { ctx } = g, m = e.m;
  const SK = '#d99a6c', SKD = '#bf7c50', HR = '#7a3a26', HRD = '#552414', TOP = '#c47cff', TOPD = '#a35ee8', TR = '#1cb0f6', TRD = '#1488c4';
  g.ground(30, 'pill', '#0a0830', 0.3, 8);
  g.fill(pill(-9.5, -3.2, 18, 6.8), TOP);
  g.fill(pill(9.5, -3.2, 18, 6.8), TOP);
  ctx.save();
  settle(g, m, -12, 1);
  g.fill(tube(-8, -36, -9, -11, 4.6), TR);
  g.fill(tube(8, -36, 9, -11, 4.6), TR);
  g.fill(rr(-19, -46, 38, 15, [3, 3, 7, 7]), TR);
  const torso = rr(-24, -90, 48, 47, [20, 20, 5, 5]);
  const col = e.shirt ? SHIRT.body : TOP;
  g.fill(torso, col);
  if (e.shirt) shirt(g, torso, -92, -43, { w: 48, neck: [0, 9, 4.5], under: SK, stripe: 0.46 });
  g.fill(rr(-19, -46, 38, 3.4, 0), TRD);
  const swing = m.lag * 0.04;
  for (const k of [-1, 1]) {
    g.at(k * 20, -82, () => {
      const arm = tube(0, 0, k * 9, 31, 5.4);
      g.fill(arm, e.shirt ? SK : col);
      if (e.shirt) g.clip(arm, () => { g.fill(rr(-12, -8, 24, 22, 0), SHIRT.body); g.fill(rr(-12, 12, 24, 3, 0), SHIRT.hem); });
      g.fill(circ(k * 9.5, 34, 6.2), SK);
    }, 1, -k * 0.04 + swing);
  }
  if (!e.shirt) g.fill(pill(0, -88, 18, 6), TOPD);
  // the head bobs a beat behind
  ctx.translate(0, -m.b2lag * 1.6);
  for (const k of [-1, 1]) { g.fill(circ(k * 30, -117, 6.8), SK); g.fill(circ(k * 30.5, -117, 3.2), SKD); }
  g.fill(rr(-30, -150, 60, 62, 22), SK);
  // hair: one big flat shape with a swept fringe
  // hair: one big flat shape, a swept fringe ending in a point over one eye, and a tuft on top
  g.fill(pd('M-35 -116 C-39 -150 -22 -166 0 -166 C24 -166 38 -150 35 -118 L29 -120 C29 -131 27 -137 22 -141 C12 -134 -4 -131 -22 -128 L-28 -116 Z'), HR);
  g.fill(pd('M-6 -164 C-6 -174 2 -178 9 -177 C5 -174 4 -170 6 -165 Z'), HR);
  g.fill(pd('M6 -158 C15 -156 22 -151 25 -144 C19 -147 13 -148 7 -148 Z'), HRD);
  // eyes almost touching, pupils with a round light
  const bl = m.blink(1.35, 3.2);
  for (const k of [-1, 1]) dEye(g, k * 9, -119, 16.5, 19.5, { look: [-1.2, 0.6], blink: bl, lid: SK, lidLine: SKD, pupil: '#2b2b3f' });
  const pop = m.pulse(1.3, 0.45) * 1.8;
  for (const k of [-1, 1]) g.at(k * 10, -134 - pop, () => g.fill(pill(0, 0, 13, 5.6), HRD), 1, k * 0.14);
  // the nose hangs between and below the eyes
  g.fill(circ(0, -107, 4.6), SKD);
  // a bean of a mouth, open, teeth on top
  const mouth = pd('M-10 -100 Q0 -97 10 -100 Q8.5 -90 0 -90 Q-8.5 -90 -10 -100 Z');
  g.fill(mouth, '#a3243b');
  g.clip(mouth, () => { g.fill(rr(-12, -101, 24, 3.6, 0), '#ffffff'); g.fill(ell(0, -89.5, 6, 3.6), '#ff7a8a'); });
  if (e.hat) g.at(0, -144, () => hat(g, 66), 1, 0.05);
  ctx.restore();
}

const DRAW = { puffin, tall, frog, raccoon, toucan, round };
export function drawAvatar(ctx, id, o = {}) {
  const c = CAST.find(a => a.id === id) || CAST[0];
  const g = pen(ctx, STYLE[c.end]);
  DRAW[c.id](g, { ...o, t: o.t || 0, m: idle(o.t || 0) });
}
