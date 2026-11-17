// Six candidates for the avatar: three animals, three monsters. None is a person.
// Each is drawn by rule from its feet (0, 0), about 150 tall, lit from the top left, and can wear
// the kit's hat and shirt. Idle motion is a pure function of time and loops every 4 seconds.

import { rr, circ, ell, poly, rpoly, soft, pd, limb, capsule, union, TAU, PI } from './draw.js';

export const LOOP = 4;
export const AVATARS = [
  { id: 'fox', name: 'Fox', kind: 'animal' },
  { id: 'capy', name: 'Capybara', kind: 'animal' },
  { id: 'axo', name: 'Axolotl', kind: 'animal' },
  { id: 'tuft', name: 'Tuft', kind: 'monster' },
  { id: 'glim', name: 'Glim', kind: 'monster' },
  { id: 'pebble', name: 'Pebble', kind: 'monster' },
];

// ---- idle: breathing, a bob, a blink ----
function idle(t) {
  const p = ((t % LOOP) + LOOP) % LOOP, u = p / LOOP;
  const blinkAt = x => Math.max(0, 1 - Math.abs(p - x) / 0.085);
  return {
    breath: Math.sin(u * TAU),                    // -1..1, one breath per loop
    bob: Math.sin(u * TAU * 2 + 0.8),             // two small bobs per loop
    sway: Math.sin(u * TAU * 2),
    slow: Math.sin(u * TAU + 1.2),
    blink: Math.min(1, blinkAt(1.3) + blinkAt(3.1) + blinkAt(3.36)),
    twitch: Math.max(0, 1 - Math.abs(p - 2.2) / 0.16),
  };
}

const INK = '#1b1447';
function eye(g, x, y, rx, ry, blink, glint = true) {
  const k = 1 - blink * 0.9;
  g.flat(ell(x, y, rx, Math.max(0.6, ry * k)), INK);
  if (glint && k > 0.5) { g.ctx.fillStyle = 'rgba(255,255,255,0.95)'; g.ctx.fill(circ(x - rx * 0.32, y - ry * 0.36, rx * 0.34)); }
}
// a white eyeball with a pupil; the lid colour closes over it
function ball(g, x, y, r, blink, lid, look = [0, 0], pr = 0.44) {
  const p = circ(x, y, r);
  g.f(p, '#ffffff', { s: r * 0.22, l: 0, lit: false, dk: 0.16 });
  g.flat(circ(x + look[0], y + look[1], r * pr), INK);
  g.ctx.fillStyle = '#fff'; g.ctx.fill(circ(x + look[0] - r * 0.16, y + look[1] - r * 0.18, r * 0.15));
  if (blink > 0.02) g.clip(p, () => g.flat(rr(x - r - 1, y - r - 1, r * 2 + 2, (r * 2 + 2) * Math.min(1, blink * 1.05), 0), lid));
}

// ---- the kit's hat: a knitted hat with a turned-up brim. origin: bottom centre of the brim ----
function hat(g, w) {
  const { ctx } = g, h = w * 0.66, C = '#49c6ff', B = '#1f9be0';
  const dome = pd(`M${-w * 0.47} ${-w * 0.1} C${-w * 0.5} ${-h * 1.32} ${w * 0.5} ${-h * 1.32} ${w * 0.47} ${-w * 0.1}Z`);
  g.f(circ(0, -h * 1.02, w * 0.135), '#ffffff', { s: w * 0.05, l: 0, lit: false, dk: 0.2 });
  g.flat(dome, C);
  g.clip(dome, () => {
    ctx.strokeStyle = g.dk(C, 0.3, 0.38); ctx.lineWidth = w * 0.022; ctx.lineCap = 'round';
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.13, -w * 0.1); ctx.quadraticCurveTo(i * w * 0.115, -h * 0.7, i * w * 0.03, -h * 1.05); ctx.stroke(); }
  });
  g.over(dome, { s: w * 0.1, l: w * 0.04, a: 0.24, la: 0.4 });
  const brim = rr(-w * 0.54, -w * 0.24, w * 1.08, w * 0.25, w * 0.1);
  g.flat(brim, B);
  g.clip(brim, () => {
    ctx.strokeStyle = g.dk(B, 0.36, 0.5); ctx.lineWidth = w * 0.022;
    for (let x = -w * 0.48; x < w * 0.54; x += w * 0.085) { ctx.beginPath(); ctx.moveTo(x, -w * 0.24); ctx.lineTo(x, 0.01 * w); ctx.stroke(); }
  });
  g.over(brim, { s: w * 0.06, l: w * 0.035, a: 0.26, la: 0.4 });
}
// the kit's shirt: a band of cloth cut to the body's own outline
function shirt(g, body, y0, y1, col = '#ffc83d') {
  const { ctx } = g;
  g.clip(body, () => {
    g.flat(rr(-90, y0, 180, y1 - y0, 0), col);
    ctx.fillStyle = g.dk(col, 0.3, 0.55); ctx.fillRect(-90, y1 - 3.4, 180, 3.4);
    g.flat(ell(0, y0 - 1, 11, 5.5), g.fade ? col : col);
    ctx.fillStyle = g.dk(col, 0.34); ctx.fill(ell(0, y0 - 2.2, 12, 5.6));
  });
  g.over(body, { s: 5, l: 2 });
}

// =================== animals ===================

function fox(g, e) {
  const { ctx } = g, m = e.m, O = '#ff8a3d', OD = '#e06420', CREAM = '#fff1dc', SOCK = '#4a2618';
  g.shadow(4, 2, 52, 9, 0.36);
  // tail
  ctx.save(); ctx.translate(16, -22); ctx.rotate(m.sway * 0.05);
  const tail = soft([[0, 2], [26, 6], [50, -8], [60, -36], [52, -66], [36, -74], [38, -52], [28, -32], [8, -20]], true, 0.95);
  g.flat(tail, O);
  g.clip(tail, () => g.flat(soft([[30, -78], [60, -74], [66, -46], [50, -50], [34, -52]], true, 0.9), CREAM));
  g.over(tail, { s: 6, l: 2.2 });
  ctx.restore();
  // feet
  g.f(ell(-14, -5, 12, 6.5), SOCK, { s: 2.4, l: 1.2, lt: 0.2 }); g.f(ell(14, -5, 12, 6.5), SOCK, { s: 2.4, l: 1.2, lt: 0.2 });
  ctx.save(); ctx.scale(1 - m.breath * 0.008, 1 + m.breath * 0.012);
  const body = soft([[0, -74], [19, -66], [27, -40], [23, -14], [0, -7], [-23, -14], [-27, -40], [-19, -66]], true, 0.95);
  g.flat(body, O);
  g.clip(body, () => g.flat(ell(0, -30, 15.5, 27), CREAM));
  g.over(body, { s: 6, l: 2 });
  if (e.shirt) shirt(g, body, -66, -34);
  // arms
  for (const k of [-1, 1]) {
    g.f(limb(k * 21, -56, 7, k * 29, -33, 6), O, { s: 2.6, l: 1.2 });
    g.f(circ(k * 29.5, -31, 6.4), SOCK, { s: 2, l: 1, lt: 0.2 });
  }
  // head
  ctx.translate(0, m.bob * -1.2);
  for (const k of [-1, 1]) {
    ctx.save(); ctx.translate(k * 27, -124); ctx.rotate(k * (0.12 + (k > 0 ? m.twitch * 0.16 : 0)));
    g.f(rpoly([[-15, 6], [-3, -42], [16, 2]].map(([x, y]) => [x * k, y]), 5), O, { s: 3.4, l: 1.5 });
    g.flat(rpoly([[-8, 2], [-2.5, -30], [9, 0]].map(([x, y]) => [x * k, y]), 3), SOCK);
    ctx.restore();
  }
  const head = soft([[0, -139], [25, -133], [41, -112], [55, -92], [37, -80], [18, -71], [0, -68], [-18, -71], [-37, -80], [-55, -92], [-41, -112], [-25, -133]], true, 0.9);
  g.flat(head, O);
  g.clip(head, () => g.flat(pd('M-60 -91 Q-32 -112 -9 -100 Q0 -94 9 -100 Q32 -112 60 -91 L60 -60 L-60 -60Z'), CREAM));
  g.over(head, { s: 5.5, l: 2.2, a: 0.2 });
  eye(g, -16, -103, 4.8, 6.4, m.blink); eye(g, 16, -103, 4.8, 6.4, m.blink);
  g.f(pd('M-6 -90 Q0 -93 6 -90 Q4 -83 0 -82 Q-4 -83 -6 -90Z'), '#3a1c14', { s: 1.4, l: 0.8, lt: 0.3 });
  g.line(pd('M0 -82 L0 -79 M-6 -77 Q-3 -75.5 0 -79 Q3 -75.5 6 -77'), '#3a1c14', 1.5, 0.9);
  if (e.hat) g.at(0, -131, () => hat(g, 46), 1, -0.06);
  ctx.restore();
}

function capy(g, e) {
  const { ctx } = g, m = e.m, F = '#b98250', FD = '#8a5a36', MZ = '#9c6a3c';
  g.shadow(0, 2, 48, 9, 0.36);
  for (const k of [-1, 1]) {
    g.f(ell(k * 18, -5, 14, 7), FD, { s: 2.6, l: 1.2 });
    g.line(pd(`M${k * 18 - 5} -3 v3 M${k * 18} -2.4 v3 M${k * 18 + 5} -3 v3`), '#5a3520', 1.2, 0.7);
  }
  ctx.save(); ctx.scale(1 - m.breath * 0.008, 1 + m.breath * 0.012);
  // a barrel of a body, no neck to speak of
  const body = soft([[0, -82], [29, -76], [40, -52], [39, -24], [25, -8], [0, -6], [-25, -8], [-39, -24], [-40, -52], [-29, -76]], true, 0.95);
  g.f(body, F, { s: 7, l: 2.2 });
  g.line(pd('M-14 -40 q3 4 6 0 M8 -30 q3 4 6 0 M-4 -22 q3 4 6 0'), FD, 1.6, 0.5);
  if (e.shirt) shirt(g, body, -72, -38);
  for (const k of [-1, 1]) {
    g.f(limb(k * 33, -58, 8, k * 39, -38, 7), F, { s: 2.8, l: 1.3 });
    g.f(ell(k * 39.5, -35, 7, 6), FD, { s: 2, l: 1 });
  }
  ctx.translate(0, m.slow * -1);
  // small ears, set back on the sides of a long, blunt head
  for (const k of [-1, 1]) {
    ctx.save(); ctx.translate(k * 29, -140); ctx.rotate(k * (0.5 + (k > 0 ? m.twitch * 0.3 : 0)));
    g.f(ell(0, 0, 6, 7.5), F, { s: 2, l: 1.1 });
    g.flat(ell(k * 0.5, 0.8, 3, 4.4), '#6e4426');
    ctx.restore();
  }
  const head = soft([[0, -156], [22, -153], [31, -136], [33, -106], [28, -86], [0, -79], [-28, -86], [-33, -106], [-31, -136], [-22, -153]], true, 0.95);
  g.f(head, F, { s: 6.5, l: 2.2 });
  // the big squared-off muzzle, nostrils high and wide
  g.f(rr(-25, -124, 50, 42, [16, 16, 18, 18]), MZ, { s: 4, l: 1.6, dk: 0.24, lt: 0.2 });
  g.flat(ell(-11, -113, 3, 4.4, 0.4), '#4a2a18'); g.flat(ell(11, -113, 3, 4.4, -0.4), '#4a2a18');
  g.line(pd('M0 -104 L0 -96 M-8 -93 Q-4 -91.5 0 -96 Q4 -91.5 8 -93'), '#4a2a18', 1.7, 0.85);
  g.f(rr(-3.6, -95, 7.2, 5.6, [0, 0, 2, 2]), '#fff7e4', { s: 1, l: 0, lit: false, dk: 0.16 });
  // small, calm eyes, set high and wide, half closed
  for (const k of [-1, 1]) {
    eye(g, k * 21, -136, 3.6, 4.2, m.blink);
    g.flat(pd(`M${k * 21 - 5} -141.5 h10 v2.8 q-5 -1.6 -10 0z`), F);
    g.line(pd(`M${k * 21 - 4.6} -138.8 q4.6 -1.9 9.2 0`), FD, 1.5, 0.9);
  }
  if (e.hat) g.at(0, -150, () => hat(g, 46), 1, 0.05);
  ctx.restore();
}

function axo(g, e) {
  const { ctx } = g, m = e.m, P = '#ff9ebd', PD = '#ec6f97', GILL = '#e8457f', BELLY = '#ffd9e5';
  g.shadow(4, 2, 50, 9, 0.34);
  ctx.save(); ctx.translate(12, -20); ctx.rotate(m.sway * 0.06);
  const tail = soft([[-2, 4], [22, 8], [46, -2], [58, -26], [50, -34], [36, -16], [18, -12], [2, -16]], true, 0.95);
  g.f(tail, P, { s: 4.5, l: 1.8 });
  g.line(pd('M6 -4 Q30 0 52 -26'), PD, 1.6, 0.6);
  ctx.restore();
  for (const k of [-1, 1]) {
    g.f(limb(k * 12, -16, 7, k * 16, -5, 6.2), P, { s: 2.4, l: 1.1 });
    for (const d of [-6, 0, 6]) g.f(circ(k * 17 + d, -3.4, 3.4), P, { s: 1.4, l: 0.8 });
  }
  ctx.save(); ctx.scale(1 - m.breath * 0.008, 1 + m.breath * 0.012);
  const body = soft([[0, -70], [17, -62], [23, -38], [19, -13], [0, -7], [-19, -13], [-23, -38], [-17, -62]], true, 0.95);
  g.flat(body, P);
  g.clip(body, () => g.flat(ell(0, -32, 12.5, 24), BELLY));
  g.over(body, { s: 5.5, l: 2 });
  if (e.shirt) shirt(g, body, -62, -32);
  for (const k of [-1, 1]) {
    g.f(limb(k * 19, -52, 6, k * 31, -37, 5), P, { s: 2.2, l: 1.1 });
    for (const a of [-0.7, 0, 0.7]) g.f(circ(k * (33 + Math.cos(a) * 3.4), -35.5 + Math.sin(a) * 4.2, 2.6), P, { s: 1.1, l: 0.6 });
  }
  ctx.translate(0, m.bob * -1.2);
  // gills: three feathery fronds each side
  for (const k of [-1, 1]) {
    [[-0.95, 30], [-0.32, 33], [0.3, 28]].forEach(([a, len], i) => {
      ctx.save(); ctx.translate(k * 42, -100 + i * 5); ctx.rotate(k > 0 ? a + m.sway * 0.07 * (i - 1.5) : PI - a - m.sway * 0.07 * (i - 1.5));
      const parts = [limb(0, 0, 6, len, 0, 3)];
      for (let j = 1; j <= 4; j++) { const x = len * j / 4.6; parts.push(circ(x, -4.4 + j * 0.3, 4 - j * 0.35), circ(x + 2.6, 4.4 - j * 0.3, 4 - j * 0.35)); }
      g.f(union(...parts), GILL, { s: 2.2, l: 1.1 });
      ctx.restore();
    });
  }
  const head = soft([[0, -131], [30, -127], [49, -109], [52, -94], [39, -78], [0, -71], [-39, -78], [-52, -94], [-49, -109], [-30, -127]], true, 0.95);
  g.f(head, P, { s: 6.5, l: 2.2, dk: 0.24 });
  for (const [x, y] of [[-8, -122], [0, -125], [9, -121]]) g.flat(circ(x, y, 1.5), PD, 0.7);
  g.flat(ell(-35, -90, 7, 4.2), '#ff6f9c', 0.5); g.flat(ell(35, -90, 7, 4.2), '#ff6f9c', 0.5);
  eye(g, -25, -101, 4.4, 4.8, m.blink); eye(g, 25, -101, 4.4, 4.8, m.blink);
  g.line(pd('M-17 -87 Q0 -78 17 -87'), '#b83a66', 2.2, 0.95);
  if (e.hat) g.at(0, -125, () => hat(g, 50), 1, -0.05);
  ctx.restore();
}

// =================== monsters ===================

function tuft(g, e) {
  const { ctx } = g, m = e.m, F = '#8b5cf0', FD = '#6a3fd6', BELLY = '#b9a0ff', HORN = '#fff1c9';
  g.shadow(0, 2, 58, 10, 0.38);
  // feet
  for (const k of [-1, 1]) {
    g.f(ell(k * 20, -6, 17, 8.5), FD, { s: 3, l: 1.4 });
    for (const d of [-9, 0, 9]) g.f(pd(`M${k * 20 + d - 3.2} -3 q3.2 -6 6.4 0 q-3.2 3.4 -6.4 0z`), HORN, { s: 1, l: 0, lit: false, dk: 0.2 });
  }
  ctx.save(); ctx.scale(1 - m.breath * 0.007, 1 + m.breath * 0.011);
  // arms hang long, and swing a little
  for (const k of [-1, 1]) {
    ctx.save(); ctx.translate(k * 43, -94); ctx.rotate(k * -0.16 + m.sway * 0.045);
    g.f(limb(0, 0, 11, 0, 50, 9.4), FD, { s: 3.4, l: 1.5 });
    g.f(circ(0, 55, 10.6), FD, { s: 3.4, l: 1.5 });
    for (const d of [-7, 0, 7]) g.f(circ(d, 64 - Math.abs(d) * 0.3, 3.4), HORN, { s: 1.2, l: 0, lit: false, dk: 0.2 });
    ctx.restore();
  }
  // horns, and a tuft of hair
  for (const k of [-1, 1]) g.f(pd(`M${k * 28} -134 Q${k * 46} -138 ${k * 47} -160 Q${k * 33} -154 ${k * 21} -143Z`), HORN, { s: 2.6, l: 1.2, dk: 0.26 });
  for (const [x, dx, hgt, w] of [[-10, -5, 15, 7], [2, 1 + m.sway * 1.4, 20, 8], [13, 6, 14, 7]]) g.f(pd(`M${x - w} -146 Q${x - w * 0.4} ${-152 - hgt * 0.6} ${x + dx} ${-152 - hgt} Q${x + w * 0.8} ${-152 - hgt * 0.4} ${x + w} -146Z`), F, { s: 2.4, l: 1.2 });
  // one soft mass, fluffy at the edges
  const mass = soft([[0, -154], [28, -148], [42, -122], [44, -90], [51, -54], [46, -22], [27, -8], [0, -6], [-27, -8], [-46, -22], [-51, -54], [-44, -90], [-42, -122], [-28, -148]], true, 0.95);
  const fluff = [];
  for (const k of [-1, 1]) for (const [x, y, r] of [[43, -106, 6.5], [46, -74, 7], [50, -40, 7.5], [38, -13, 7]]) fluff.push(circ(k * x, y, r));
  const body = union(mass, ...fluff);
  g.f(body, F, { s: 7.5, l: 2.4 });
  g.f(ell(0, -44, 27, 31), BELLY, { s: 0, l: 0, shade: false, lit: false });
  g.line(pd('M-12 -58 l4 4 l4 -4 M4 -40 l4 4 l4 -4 M-10 -26 l4 4 l4 -4'), F, 1.8, 0.55);
  if (e.shirt) shirt(g, body, -86, -42);
  // face
  ctx.translate(0, m.bob * -1);
  ball(g, -14, -114, 12.5, m.blink, F, [2.4, 0.8]); ball(g, 14, -114, 12.5, m.blink, F, [-2.4, 0.8]);
  const mouth = pd('M-22 -92 Q0 -84 22 -92 Q14 -74 0 -74 Q-14 -74 -22 -92Z');
  g.flat(mouth, '#32176e');
  g.clip(mouth, () => g.flat(ell(0, -72, 10, 6), '#ee4b7a'));
  for (const x of [-9.5, 9.5]) g.f(rr(x - 3.6, -84.5, 7.2, 8.4, [3.4, 3.4, 1, 1]), '#ffffff', { s: 1.4, l: 0, lit: false, dk: 0.16 });
  if (e.hat) g.at(0, -146, () => hat(g, 56), 1, 0.07);
  ctx.restore();
}

function glim(g, e) {
  const { ctx } = g, m = e.m, C = '#2fcfc0', CD = '#0f8f96', CL = '#8ff5e2';
  g.shadow(0, 2, 60, 10, 0.34);
  ctx.save(); ctx.scale(1 + m.breath * 0.022, 1 - m.breath * 0.026);
  // eye stalks
  for (const k of [-1, 1]) {
    ctx.save(); ctx.translate(k * 29, -86); ctx.rotate(k * 0.02 + m.sway * 0.06);
    g.f(limb(0, 0, 7.5, k * 11, -42, 5), C, { s: 2.4, l: 1.2 });
    ball(g, k * 12, -50, 12, m.blink, C, [k * -1.6, 1.4], 0.42);
    ctx.restore();
  }
  for (const k of [-1, 1]) g.f(limb(k * 50, -50, 6.5, k * 62, -40 + m.sway * 2, 5.4), C, { s: 2.2, l: 1.1 });
  const body = soft([[0, -106], [30, -100], [49, -76], [55, -46], [54, -18], [42, -5], [21, -9], [0, -3], [-21, -9], [-42, -5], [-54, -18], [-55, -46], [-49, -76], [-30, -100]], true, 0.95);
  g.fill(body, g.lin(0, -106, 0, 0, [[0, '#5fe3d0'], [0.55, C], [1, '#1fb0ae']]));
  g.clip(body, () => {
    // it is a jelly: lighter inside, with bubbles
    g.glow(-6, -52, 44, 40, '#c9fff2', 0.4);
    for (const [x, y, r] of [[26, -36, 5], [34, -52, 3], [-30, -30, 3.6], [16, -22, 2.4], [-18, -18, 2]]) { g.flat(circ(x, y, r), CL, 0.5); g.flat(circ(x - r * 0.3, y - r * 0.3, r * 0.34), '#ffffff', 0.8); }
  });
  g.over(body, { s: 8, l: 2.6, a: 0.3, la: 0.5 });
  g.flat(pd('M-37 -80 Q-30 -94 -14 -98 Q-26 -88 -30 -74 Q-35 -74 -37 -80Z'), '#ffffff', 0.75);
  g.flat(circ(-39, -64, 3), '#ffffff', 0.7);
  if (e.shirt) shirt(g, body, -74, -36);
  // face
  ctx.translate(0, m.bob * -0.8);
  const mouth = pd('M-17 -62 Q0 -56 17 -62 Q12 -46 0 -46 Q-12 -46 -17 -62Z');
  g.flat(mouth, '#0a5a66');
  g.clip(mouth, () => g.flat(ell(0, -45, 9, 5), '#ff7a9c'));
  g.flat(ell(-28, -58, 6.5, 3.8), '#b8fff0', 0.6); g.flat(ell(28, -58, 6.5, 3.8), '#b8fff0', 0.6);
  if (e.hat) g.at(0, -99, () => hat(g, 44), 1, -0.06);
  ctx.restore();
}

function pebble(g, e) {
  const { ctx } = g, m = e.m, S = '#8f9bd4', SL = '#b9c4f2', SD = '#5d68ac', MOSS = '#3fbf8f';
  g.shadow(0, 2, 64, 10, 0.4);
  const stone = (pts, r, o = {}) => {
    const p = rpoly(pts, r);
    g.f(p, o.col || S, { s: o.s ?? 5, l: o.l ?? 2, dk: 0.34, lt: 0.34 });
    return p;
  };
  for (const k of [-1, 1]) stone([[k * 27, 0], [k * 5, 0], [k * 8, -24], [k * 25, -24]], 4.5, { s: 3.4 });
  ctx.save(); ctx.translate(0, m.breath * -0.9);
  // the fists float beside it
  for (const k of [-1, 1]) {
    ctx.save(); ctx.translate(k * 62, -52 + Math.sin((e.t % LOOP) / LOOP * TAU + (k > 0 ? 0 : 1.9)) * 2.4);
    g.shadow(0, 54 - m.breath, 16, 4, 0.2);
    const f = stone([[-15, -16], [12, -18], [17, 2], [10, 17], [-12, 16], [-18, 0]].map(([x, y]) => [x * k, y]), 6.5);
    g.clip(f, () => { g.flat(poly([[-20, -20], [k > 0 ? 2 : 14, -20], [k > 0 ? -6 : 8, 2], [-20, 6]]), '#ffffff', 0.16); });
    g.line(pd(`M${k * -5} 11 v6 M${k * 3} 12 v6`), SD, 1.6, 0.7);
    ctx.restore();
    g.f(circ(k * 54, -84 + m.slow * 1.4, 7.5), S, { s: 2.6, l: 1.3, dk: 0.34 });
  }
  const torso = stone([[-40, -20], [40, -20], [51, -54], [45, -94], [20, -106], [-22, -106], [-47, -92], [-53, -56]], 11, { s: 7.5, l: 2.4 });
  g.clip(torso, () => {
    g.flat(poly([[-60, -112], [14, -112], [-4, -72], [-40, -58], [-60, -62]]), '#ffffff', 0.17);
    g.flat(poly([[60, -64], [22, -42], [12, -14], [60, -14]]), '#1a1056', 0.16);
  });
  g.line(pd('M-4 -72 L-40 -58 M-4 -72 L14 -108 M22 -42 L12 -18 M22 -42 L50 -58'), SD, 1.3, 0.4);
  g.line(pd('M-20 -40 l7 6 l-3 8'), SD, 1.6, 0.6);
  if (e.shirt) shirt(g, torso, -98, -52);
  // crystals on one shoulder, moss on the other
  for (const [x, y, w, h, a, c] of [[-42, -92, 7, 26, -0.5, '#6fe3ff'], [-33, -98, 8, 32, -0.16, '#8ff0ff'], [-47, -84, 5.5, 16, -0.9, '#ee6fb0']]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    const c1 = poly([[-w, 0], [-w, -h * 0.7], [0, -h], [w, -h * 0.7], [w, 0]]);
    g.flat(c1, c);
    g.clip(c1, () => { g.flat(poly([[0, 0], [0, -h], [w, -h * 0.7], [w, 0]]), '#1a1056', 0.24); g.flat(poly([[-w, 0], [-w, -h * 0.7], [0, -h], [-w * 0.4, -h * 0.66], [-w * 0.4, 0]]), '#ffffff', 0.4); });
    ctx.restore();
  }
  const moss = soft([[6, -108], [28, -107], [45, -96], [50, -80], [42, -85], [36, -75], [27, -87], [17, -84], [9, -95]], true, 0.9);
  g.f(moss, MOSS, { s: 3.4, l: 1.6 });
  ctx.translate(0, m.bob * -1);
  const head = stone([[-25, -100], [25, -100], [31, -126], [23, -149], [-19, -151], [-31, -130]], 9, { s: 6, l: 2.2 });
  g.clip(head, () => g.flat(poly([[-40, -160], [8, -160], [-6, -128], [-40, -120]]), '#ffffff', 0.17));
  g.line(pd('M-6 -128 L8 -152'), SD, 1.2, 0.4);
  // eyes: light from inside
  const glow = 0.75 + m.slow * 0.2;
  for (const k of [-1, 1]) {
    g.glow(k * 11, -124, 15, 15, '#7fefff', 0.5 * glow);
    const hh = 12 * (1 - m.blink * 0.86);
    g.flat(rr(k * 11 - 5, -124 - hh / 2, 10, hh, 4), '#dffcff');
  }
  g.line(pd('M-6 -109 q6 3 12 0'), SD, 2, 0.85);
  if (e.hat) g.at(1, -147, () => hat(g, 50), 1, 0.05);
  ctx.restore();
}

const DRAW = { fox, capy, axo, tuft, glim, pebble };
export function drawAvatar(g, id, e = {}) {
  (DRAW[id] || tuft)(g, { ...e, t: e.t || 0, m: idle(e.t || 0) });
}
