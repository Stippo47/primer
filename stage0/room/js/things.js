// The earned things: kit templates (poster, floor mat, stuffed toy, flag, statue, trophy, medal) filled in by a topic.
// Every one is drawn by rule from its own origin, lit from the top left, and takes a pen whose `fade`
// drains its colour and adds dust: that is how a topic being forgotten shows.

import { rng } from './ease.js';
import { rr, circ, ell, poly, rpoly, soft, pd, limb, capsule, star, dust, cobweb, TAU, PI } from './draw.js';

function swirlPath(r) {
  const arm = pd(`M0 ${-r * 0.42} C ${r * 0.7} ${-r * 0.75} ${r * 1.25} ${-r * 0.1} ${r * 0.85} ${r * 0.8} C ${r * 0.95} ${r * 0.1} ${r * 0.5} ${-r * 0.1} 0 ${r * 0.05} Z`);
  const p = new Path2D();
  for (let i = 0; i < 3; i++) p.addPath(arm, new DOMMatrix().rotate(i * 120));
  p.addPath(circ(0, 0, r * 0.52));
  return p;
}
function sparkle(g, x, y, r, a = 0.95) {
  const k = r * 0.16;
  g.ctx.fillStyle = `rgba(255,255,255,${a * (1 - g.fade)})`;
  g.ctx.fill(pd(`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r}Z`));
}
const GOLD = '#ffc83d', GOLD_D = '#d6960a', GOLD_L = '#ffe69a';

// ---------- Hurricanes: metal trophy. origin: base centre ----------
function stormCup(g) {
  const { ctx } = g;
  g.shadow(0, 1, 26, 4.5);
  g.f(rr(-20, -14, 40, 14, 4), '#5a3fb0', { s: 3.4, l: 1.5 });
  g.f(rr(-10, -10.5, 20, 6.5, 2.4), GOLD, { s: 1.4, l: 0.8 });
  g.f(pd('M-14 -14 C-14 -21 -4.5 -20 -4 -30 L4 -30 C4.5 -20 14 -21 14 -14Z'), GOLD, { s: 3.4, l: 1.4, dk: 0.36 });
  for (const k of [-1, 1]) {
    const h = pd(`M${k * 21} -66 C${k * 40} -69 ${k * 40} -43 ${k * 16} -40`);
    g.line(h, GOLD_D, 6); g.line(h, k < 0 ? GOLD_L : GOLD, 2.6);
  }
  const bowl = pd('M-24 -72 L24 -72 C24 -48 14 -32 5 -30 L-5 -30 C-14 -32 -24 -48 -24 -72Z');
  g.f(bowl, GOLD, { s: 7, l: 2, dk: 0.34 });
  g.clip(bowl, () => { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - g.fade * 0.7)})`; ctx.fill(pd('M-18 -74 L-11.5 -74 C-11.5 -52 -6 -37 -1 -30 L-7.5 -30 C-13 -40 -18 -54 -18 -74Z')); });
  g.at(2, -53, () => { g.flat(swirlPath(9), '#fffaf0'); g.flat(circ(0, 0, 1.9), GOLD_D); });
  g.f(ell(0, -72, 24, 5.2), GOLD_L, { s: 1.6, l: 1 });
  g.flat(ell(0, -71.5, 19.5, 3.4), '#b47600');
  sparkle(g, 18, -77, 7);
}

// ---------- Hurricanes: poster. the storm from above. origin: top-left. 100 x 128 ----------
function stormPoster(g) {
  const { ctx } = g, w = 100, h = 128;
  ctx.fillStyle = 'rgba(8,6,40,0.34)'; ctx.fill(rr(3, 5, w, h, 4));
  g.f(rr(0, 0, w, h, 4), '#fff5de', { s: 2.4, l: 0, lit: false, dk: 0.16 });
  const pic = rr(7, 7, w - 14, 92, 3);
  g.fill(pic, g.lin(0, 7, 0, 99, [[0, '#3b3db8'], [1, '#1b2a80']]));
  g.clip(pic, () => {
    // warm water, a coast, and the storm over it
    g.flat(soft([[-10, 70], [30, 62], [60, 72], [110, 60], [110, 110], [-10, 110]], true, 0.8), '#8b3fbf', 0.8);
    g.flat(soft([[-10, 84], [40, 78], [70, 88], [110, 80], [110, 110], [-10, 110]], true, 0.8), '#ee4b7a', 0.75);
    g.flat(soft([[60, -4], [72, 12], [92, 18], [104, 36], [110, 30], [110, -4]], true, 0.8), '#127a85');
    g.flat(soft([[62, -6], [73, 9], [93, 15], [105, 33], [110, 28], [110, -6]], true, 0.8), '#2bc4a4');
    ctx.save(); ctx.translate(46, 50);
    ctx.save(); ctx.translate(2, 4); g.flat(swirlPath(26), '#070a2e', 0.3); ctx.restore();
    ctx.save(); ctx.translate(0, 2.4); g.flat(swirlPath(26), '#aebfff'); ctx.restore();
    g.flat(swirlPath(26), '#ffffff');
    g.line(pd('M-4 -9 A10 10 0 0 1 9 2 M4 9 A10 10 0 0 1 -9 -2'), '#8fa4f5', 2, 0.9);
    g.flat(circ(0, 0, 3.8), '#1b2a80');
    ctx.restore();
  });
  g.flat(rr(24, 106, 52, 6, 3), '#d9c391'); g.flat(rr(32, 116, 36, 5, 2.5), '#e8d8ae');
  g.f(circ(w / 2, 4, 4), '#ffc83d', { s: 1.6, l: 0.9 });
}

// ---------- Circuits: statue. origin: base centre ----------
function bulb(g) {
  const { ctx } = g, on = 1 - g.fade;
  g.shadow(0, 1, 24, 4.5);
  if (on > 0.05) g.glow(0, -58, 56, 56, '#ffd75a', 0.42 * on);
  g.f(rr(-18, -15, 36, 15, 4), '#6a45d6', { s: 3.4, l: 1.5 });
  g.f(rr(-8, -11, 16, 6, 2.2), GOLD, { s: 1.3, l: 0.7 });
  const cap = rr(-9, -34, 18, 20, 3);
  g.f(cap, '#c7cdec', { s: 3.4, l: 1.4, dk: 0.38 });
  g.clip(cap, () => { for (const y of [-29, -24, -19]) g.line(pd(`M-10 ${y} L10 ${y + 2}`), '#6b74bd', 1.4, 0.7); });
  const glass = pd('M-8 -33 C-8 -42 -21.5 -45 -21.5 -60 A21.5 21.5 0 0 1 21.5 -60 C21.5 -45 8 -42 8 -33Z');
  g.f(glass, '#ffd75a', { s: 6, l: 2, dk: 0.26 });
  g.clip(glass, () => { g.glow(-3, -62, 20, 20, '#ffffff', 0.8 * on); ctx.fillStyle = `rgba(20,16,70,${0.18 * g.fade})`; ctx.fillRect(-30, -90, 60, 70); });
  // two posts and a little coil between them
  g.line(pd('M-3.4 -34 L-7.4 -55 M3.4 -34 L7.4 -55'), '#9a5f08', 1.5);
  for (const x of [-4.9, 0, 4.9]) g.line(circ(x, -56.5, 2.5), on > 0.5 ? '#fff6c9' : '#9a5f08', 1.5);
  g.line(pd('M-15 -64 A16 16 0 0 1 -5 -75.5'), '#ffffff', 2.8, 0.85 - g.fade * 0.35);
  g.glint(-13.5, -55, 1.6, 3, 0.2, 0.7);
  if (g.fade > 0) {
    dust(g, [[-17, -73], [-9, -79.5], [0, -81.6], [9, -79.5], [17, -73]], 3, g.fade);
    dust(g, [[-17, -15.5], [-10, -15.5]], 5, g.fade * 0.9);
    cobweb(g, 9, -15, -PI / 2 - 0.05, 0.05, 20, g.fade, 4, 3);
    cobweb(g, -18, 0, PI, PI * 1.5, 17, g.fade, 4, 3);
  }
}

// ---------- Bears: stuffed toy. a sockeye salmon, lying down, nose to the left. origin: under its belly ----------
function salmon(g) {
  const { ctx } = g, C = '#ff8466', CD = '#e45c44', B = '#ffe0d2';
  g.shadow(-2, 0, 40, 5, 0.28);
  g.f(soft([[27, -15], [42, -31], [48, -27], [43, -15], [48, -3], [42, 0], [27, -12]], true, 0.8), CD, { s: 3.4, l: 1.4 });
  g.f(soft([[-10, -28], [0, -40], [12, -36], [16, -27]], true, 0.8), CD, { s: 2.6, l: 1.2 });
  const body = soft([[-41, -14], [-33, -25], [-13, -32], [10, -30], [29, -19], [31, -12], [23, -4], [2, 0], [-22, -1], [-36, -6]], true, 0.9);
  g.flat(body, C);
  g.clip(body, () => {
    g.flat(soft([[-44, -8], [-22, -11.5], [4, -10.5], [32, -13], [32, 4], [-44, 4]], true, 0.8), B);
    const r = rng(4);
    for (let i = 0; i < 9; i++) g.flat(circ(-12 + r() * 36, -27 + r() * 10, 1 + r() * 0.9), CD, 0.75);
    // the head is greener on a sockeye
    g.flat(pd('M-46 -34 L-23 -34 C-19 -24 -19 -10 -24 2 L-46 2Z'), '#3fae8f');
    g.flat(soft([[-46, -8], [-34, -9.5], [-22, -11], [-23, 3], [-46, 3]], true, 0.8), '#d8f0df');
  });
  g.over(body, { s: 6, l: 2.2 });
  // the seam, sewn
  ctx.save(); ctx.setLineDash([2.6, 2.6]);
  g.line(pd('M-20 -10.5 Q4 -9.5 29 -13'), '#ffffff', 1.1, 0.75, 'butt');
  ctx.restore();
  g.line(pd('M-23 -31 C-19 -23 -19 -10 -24 -1'), '#2b8a72', 1.4, 0.8);
  g.f(soft([[-8, -11], [2, -6], [0, 1], [-10, -3]], true, 0.8), CD, { s: 2, l: 1 });
  g.f(circ(-32, -17, 3.4), '#1b1447', { shade: false, lit: false });
  g.glint(-33, -18.2, 1.1, 1.1, 0, 0.95);
  g.line(pd('M-40.5 -11 Q-36 -9.5 -33 -11'), '#1b1447', 1.3, 0.8);
}

// ---------- Bears: poster. origin: top-left. 108 x 148 ----------
function bearPoster(g) {
  const { ctx } = g, w = 108, h = 148;
  ctx.fillStyle = 'rgba(8,6,40,0.34)'; ctx.fill(rr(3, 5, w, h, 4));
  g.f(rr(0, 0, w, h, 4), '#fff5de', { s: 2.4, l: 0, lit: false, dk: 0.16 });
  const pic = rr(8, 8, w - 16, 104, 3);
  g.fill(pic, g.lin(0, 8, 0, 112, [[0, '#ff9e6b'], [0.55, '#ffd08a'], [1, '#ffe9b0']]));
  g.clip(pic, () => {
    g.flat(circ(72, 46, 15), '#fff6d0', 0.95);
    g.flat(poly([[-4, 86], [16, 50], [28, 62], [44, 36], [62, 64], [74, 54], [108, 84], [108, 120], [-4, 120]]), '#c96a7a');
    g.flat(poly([[44, 36], [50, 46], [45, 44], [41, 50], [38, 45]]), '#fff1e0', 0.9);
    g.flat(soft([[-6, 92], [18, 80], [44, 86], [70, 76], [112, 88], [112, 120], [-6, 120]], true, 0.7), '#7a3f78');
    // pines
    for (const [x, s] of [[14, 1], [24, 0.75], [92, 0.9], [84, 0.65]]) {
      g.flat(poly([[x, 84 - 26 * s], [x + 7 * s, 84 - 10 * s], [x + 4 * s, 84 - 10 * s], [x + 9 * s, 86], [x - 9 * s, 86], [x - 4 * s, 84 - 10 * s], [x - 7 * s, 84 - 10 * s]]), '#3d2a66');
    }
    g.flat(soft([[-6, 100], [30, 93], [60, 97], [112, 92], [112, 120], [-6, 120]], true, 0.7), '#2a1d55');
    // the bear, walking
    ctx.save(); ctx.translate(24, 58); ctx.scale(0.98, 0.98);
    const far = '#4a2a1c', fur = '#6e3f24';
    g.flat(limb(33, 28, 5.5, 31, 41, 4.2), far); g.flat(limb(17, 28, 6, 20, 41, 4.2), far);
    const body = soft([[2, 26], [5, 13], [17, 6.5], [30, 2.5], [40, 7], [47, 4.5], [55, 7.5], [62.5, 13.5], [62, 18], [54, 20], [47, 24], [44, 30], [30, 31.5], [14, 31], [4, 32]], true, 0.9);
    g.flat(union2(body, limb(41, 27, 6.2, 42, 41, 4.6), limb(9, 27, 7.2, 7, 41, 4.8), circ(47.5, 4.6, 2.8)), fur);
    g.clip(body, () => { ctx.fillStyle = g.lt(fur, 0.22); ctx.fill(soft([[4, 12], [17, 5], [30, 1], [40, 5.5], [47, 3], [56, 7], [50, 9], [40, 10], [30, 7], [17, 11], [6, 18]], true, 0.9)); });
    g.flat(circ(61.4, 14.4, 1.5), '#1b1447'); g.flat(circ(54.6, 10.6, 0.9), '#1b1447');
    ctx.restore();
  });
  // title bars, a paw for the topic, and the pin
  g.flat(rr(26, 121, 56, 6, 3), '#d9c391'); g.flat(rr(26, 132, 38, 5, 2.5), '#e8d8ae');
  g.at(14, 129, () => { g.flat(ell(0, 2, 4.6, 3.8), '#b98a52'); for (const [x, y] of [[-5, -3], [-1.8, -5.6], [1.8, -5.6], [5, -3]]) g.flat(circ(x, y, 1.7), '#b98a52'); });
  g.f(circ(w / 2, 4, 4), '#ee4b7a', { s: 1.6, l: 0.9 });
}
function union2(...ps) { const p = new Path2D(); for (const q of ps) p.addPath(q); return p; }

// ---------- Bears: floor mat. origin: centre ----------
function pawRug(g) {
  const C = '#f0d2a4', P = '#8f5a35';
  g.flat(ell(0, 4, 96, 25), '#0a082c', 0.32);
  g.flat(ell(0, 3.2, 94, 24), '#b98a52');
  g.f(ell(0, 0, 94, 24), C, { s: 2.4, l: 1.2, dk: 0.2 });
  g.line(ell(0, 0, 84, 20), '#d9a868', 2.4, 0.9);
  g.flat(ell(0, 6, 24, 9), P);
  for (const [x, y, rx] of [[-33, -2, 9], [-12, -9, 10], [12, -9, 10], [33, -2, 9]]) g.flat(ell(x, y, rx, 4.8, x * 0.012), P);
  g.flat(ell(-4, 4.6, 12, 3.4), '#a86c42', 0.9);
}

// ---------- Flags of the world: a string of flags. origin: the left pin ----------
const FLAGS = [
  (g, w, h) => { g.flat(rr(0, 0, w, h, 0), '#ffffff'); g.flat(rr(0, 0, w / 3, h, 0), '#2a4bb0'); g.flat(rr(w * 2 / 3, 0, w / 3, h, 0), '#e23a46'); },               // France
  (g, w, h) => { g.flat(rr(0, 0, w, h, 0), '#ffffff'); g.flat(circ(w / 2, h / 2, h * 0.3), '#d92a3e'); },                                                              // Japan
  (g, w, h) => { g.flat(rr(0, 0, w, h, 0), '#1f9d55'); g.flat(poly([[w / 2, 2], [w - 3, h / 2], [w / 2, h - 2], [3, h / 2]]), '#ffd23d'); g.flat(circ(w / 2, h / 2, h * 0.21), '#2a4bb0'); }, // Brazil
  (g, w, h) => { g.flat(rr(0, 0, w, h, 0), '#2a6fb5'); g.flat(rr(w * 0.3, 0, w * 0.15, h, 0), '#ffd23d'); g.flat(rr(0, h * 0.4, w, h * 0.2, 0), '#ffd23d'); },         // Sweden
  (g, w, h) => { g.flat(rr(0, 0, w, h, 0), '#ffffff'); g.flat(rr(0, 0, w / 3, h, 0), '#1f9d55'); g.flat(rr(w * 2 / 3, 0, w / 3, h, 0), '#e23a46'); },               // Italy
  (g, w, h) => { g.flat(rr(0, 0, w, h, 0), '#ffd23d'); g.flat(rr(0, 0, w, h / 2, 0), '#2a6fb5'); },                                                                   // Ukraine
  (g, w, h) => { g.flat(rr(0, 0, w, h, 0), '#1f9d55'); g.flat(rr(w / 3, 0, w / 3, h, 0), '#ffffff'); },                                                               // Nigeria
  (g, w, h) => { g.flat(rr(0, 0, w, h, 0), '#ffd23d'); g.flat(rr(0, 0, w, h * 2 / 3, 0), '#e23a46'); g.flat(rr(0, 0, w, h / 3, 0), '#2b2b33'); },                     // Germany
];
function bunting(g, e, W = 360, sag = 30) {
  const { ctx } = g, n = FLAGS.length, fw = 30, fh = 20;
  const at = u => [W * u, 4 * sag * u * (1 - u)];
  const slope = u => Math.atan2(4 * sag * (1 - 2 * u), W);
  g.line(pd(`M0 0 Q${W / 2} ${sag * 2} ${W} 0`), '#e9ecff', 1.6, 0.9);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.75) / (n + 0.5), [x, y] = at(u), sway = Math.sin((e?.t || 0) * 1.1 + i * 1.3) * 0.035;
    ctx.save(); ctx.translate(x, y); ctx.rotate(slope(u) + sway); ctx.translate(-fw / 2, 0.5);
    ctx.fillStyle = 'rgba(8,6,40,0.28)'; ctx.fill(rr(2, 3, fw, fh, 2));
    const p = rr(0, 0, fw, fh, 2);
    g.clip(p, () => {
      FLAGS[i](g, fw, fh);
      ctx.fillStyle = g.lin(0, 0, fw, 0, [[0, '#ffffff', 0.16], [0.3, '#ffffff', 0], [0.62, '#1a1056', 0], [1, '#1a1056', 0.24]]); ctx.fillRect(0, 0, fw, fh);
      ctx.fillStyle = 'rgba(26,16,86,0.2)'; ctx.fillRect(0, fh - 3, fw, 3);
    });
    g.flat(rr(-1, -2, fw + 2, 3.4, 1.4), '#e9ecff');
    ctx.restore();
  }
  for (const x of [0, W]) g.f(circ(x, 0, 3.6), '#ee4b7a', { s: 1.4, l: 0.8 });
}

// ---------- Flags of the world: medal. origin: the nail it hangs from ----------
function medal(g) {
  const { ctx } = g;
  g.flat(circ(2.5, 60, 19), '#0a082c', 0.3);
  g.f(poly([[13, 2], [3, 2], [-6, 44], [5, 44]]), '#2a56c4', { s: 2, l: 0, lit: false });
  const left = poly([[-13, 2], [-3, 2], [6, 44], [-5, 44]]);
  g.f(left, '#3b6fd6', { s: 2, l: 1 });
  g.clip(left, () => g.flat(poly([[-9.6, 2], [-6.4, 2], [2.4, 44], [-0.8, 44]]), '#ffffff'));
  g.f(circ(0, 0, 3.2), '#dfe5ff', { s: 1.2, l: 0.7 });
  g.f(rr(-7, 40, 14, 6, 2), GOLD_D, { s: 1.2, l: 0.6 });
  g.flat(circ(0, 60, 18.5), GOLD_D);
  g.f(circ(0, 58, 18.5), GOLD, { s: 4, l: 1.8, dk: 0.3 });
  g.line(circ(0, 58, 14), GOLD_D, 1.6, 0.8);
  g.flat(star(0.6, 59, 9.5), GOLD_D);
  g.flat(star(0, 58, 9.5), '#fff3c4');
  sparkle(g, -11, 47, 5);
}

// ---------- Flags of the world: the globe on its stand. origin: floor centre. the stand's metal is the level ----------
const METALS = { bronze: ['#e09a5a', '#a8642e', '#ffd0a0'], gold: [GOLD, GOLD_D, GOLD_L], platinum: ['#e6ecff', '#9aa6dc', '#ffffff'] };
function globeStand(g, e) {
  const { ctx } = g, [m, md, ml] = METALS[e.level || 'gold'], cy = -118, r = 42;
  g.shadow(0, 2, 40, 7, 0.38);
  g.flat(ell(0, -2, 31, 8), md);
  g.f(ell(0, -6, 31, 8), m, { s: 2.6, l: 1.4 });
  g.f(ell(0, -8, 17, 4.6), m, { s: 2, l: 1, dk: 0.4 });
  g.f(rr(-4.5, -70, 9, 62, 2), m, { s: 2.6, l: 1.4, dk: 0.36 });
  g.f(ell(0, -68, 9, 4), m, { s: 1.6, l: 1 });
  // the arm that holds it, tilted like the Earth
  const tilt = 0.41, arc = new Path2D();
  arc.arc(0, cy, r + 7, -PI / 2 + tilt, PI / 2 + tilt);
  g.line(arc, md, 7); g.line(arc, m, 4.2);
  const hi = new Path2D(); hi.arc(-0.6, cy - 0.8, r + 7.6, -PI / 2 + tilt + 0.1, -0.3);
  g.line(hi, ml, 1.6, 0.9);
  for (const a of [-PI / 2 + tilt, PI / 2 + tilt]) g.f(circ(Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5), 4.6), m, { s: 1.6, l: 0.9 });
  e.mini(ctx, 0, cy, r);
}

// ---------- Guitar: statue. an acoustic guitar on a stand, leaning. origin: floor centre ----------
function guitar(g) {
  const { ctx } = g, TOPC = '#f2a65a', SIDE = '#8a4520', NECK = '#b9713a', BOARD = '#3d231c';
  g.shadow(0, 2, 34, 6.5, 0.36);
  // the stand
  g.f(limb(0, -66, 2.6, -24, -1, 2.6), '#4b54a8', { s: 1.6, l: 0.9 });
  g.f(limb(0, -66, 2.6, 26, -1, 2.6), '#4b54a8', { s: 1.6, l: 0.9 });
  ctx.save(); ctx.translate(0, -2); ctx.rotate(-0.1);
  g.f(capsule(-17, -14, 17, -14, 3), '#4b54a8', { s: 1.4, l: 0.8 });
  const body = soft([[0, -12], [25, -14], [38, -28], [40, -46], [34, -63], [26, -77], [28, -91], [30, -102], [21, -115], [0, -119], [-21, -115], [-30, -102], [-28, -91], [-26, -77], [-34, -63], [-40, -46], [-38, -28], [-25, -14]], true, 0.95);
  ctx.save(); ctx.translate(3.4, 2.2); g.flat(body, SIDE); ctx.restore();
  g.f(body, TOPC, { s: 6, l: 2.2, dk: 0.3 });
  g.line(body, '#ffe9c4', 1.5, 0.7);
  g.flat(circ(0, -78, 14.5), '#d98a3a');
  g.line(circ(0, -78, 13.6), '#8a4520', 1.6, 0.8);
  g.fill(circ(0, -78, 11), g.rad(-3, -81, 1, 13, [[0, '#4a2a1f'], [1, '#22100e']]));
  g.f(pd('M-15 -79 C-25 -72 -27 -60 -19 -52 C-21 -62 -18 -70 -11 -73Z'), '#5a2f1c', { s: 2, l: 0, lit: false });
  g.f(rr(-17, -42, 34, 7, 2.5), BOARD, { s: 1.6, l: 0.9 });
  g.flat(rr(-12, -43.4, 24, 2, 1), '#fff3dc');
  // neck and head
  g.f(rr(-7.5, -194, 15, 106, 2), BOARD, { s: 2.4, l: 1.1, lt: 0.2 });
  for (let i = 0, y = -186; i < 9; i++, y += 7 + i * 0.75) g.flat(rr(-7.5, y, 15, 1.3, 0), '#dfe5ff', 0.8);
  for (const y of [-165, -146]) g.flat(circ(0, y, 1.5), '#fff3dc', 0.85);
  const head = rpoly([[-8, -194], [8, -194], [11.5, -222], [-11.5, -222]], 3.4);
  g.f(head, NECK, { s: 3, l: 1.4 });
  g.flat(rr(-8, -196, 16, 2.6, 1), '#fff3dc');
  for (const y of [-215, -207, -199.5]) for (const k of [-1, 1]) {
    g.f(rr(k * 12 - 3, y - 2.2, 6, 4.4, 2), '#dfe5ff', { s: 1.2, l: 0.6, dk: 0.4 });
    g.flat(circ(k * 5.4, y, 1.5), '#dfe5ff');
  }
  for (let i = 0; i < 6; i++) {
    const x = -5.5 + i * 2.2;
    g.line(pd(`M${x * 1.7} -41.5 L${x} -195 L${(i < 3 ? -5.4 : 5.4)} ${[-199.5, -207, -215, -215, -207, -199.5][i]}`), '#fff7ea', 0.55 + (5 - i) * 0.09, 0.9);
  }
  if (g.fade > 0) {
    dust(g, [[-29, -104], [-21, -115.5], [-9, -119]], 7, g.fade);
    dust(g, [[9, -119], [21, -115.5], [29, -104]], 8, g.fade);
    dust(g, [[-11, -222.6], [11, -222.6]], 9, g.fade);
    dust(g, [[-39, -47], [-35, -62]], 4, g.fade * 0.8);
    dust(g, [[-16, -42.6], [16, -42.6]], 2, g.fade * 0.8);
    cobweb(g, 8.5, -150, -1.2, 0.72, 46, g.fade, 5, 4);
    cobweb(g, -8, -122, PI + 0.5, PI * 1.5 - 0.05, 22, g.fade, 4, 3);
  }
  ctx.restore();
  if (g.fade > 0) cobweb(g, 23, -1, PI * 1.07, PI * 1.5 + 0.34, 22, g.fade, 4, 3);
}

// ---------- the kitchen ----------

// Bread: statue. a crusty loaf on its board. origin: counter, centre.
function loaf(g) {
  const { ctx } = g, CR = '#d98a3e', CRD = '#a85a1e';
  g.shadow(0, 0, 46, 5, 0.3);
  g.f(rr(-46, -6, 122, 6, 3), '#c0824f', { s: 2.4, l: 1.2 });
  const b = soft([[-36, -6], [-37, -20], [-26, -33], [-6, -38], [14, -35], [28, -24], [30, -6]], true, 0.95);
  g.flat(b, CR);
  g.clip(b, () => {
    g.glow(-10, -34, 34, 16, '#ffd08a', 0.75);
    // the cuts across the top, opened pale in the oven
    for (const x of [-22, -6, 10]) {
      g.flat(pd(`M${x - 3} -34 Q${x + 8} -30 ${x + 12} -16 Q${x + 3} -24 ${x - 3} -34Z`), '#ffe2b0');
      g.line(pd(`M${x + 12} -16 Q${x + 5} -22.5 ${x - 1} -31`), CRD, 1.3, 0.75);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    const r = rng(9);
    for (let i = 0; i < 26; i++) ctx.fill(circ(-30 + r() * 52, -34 + r() * 12, 0.5 + r() * 0.6));
  });
  g.over(b, { s: 6, l: 1.6, a: 0.3 });
  // the bread knife beside it
  g.f(rr(36, -9.4, 22, 3.4, 1.2), '#dfe5ff', { s: 1, l: 0.6, dk: 0.36 });
  g.f(rr(56, -10.4, 15, 5.2, 2.4), '#5a3fb0', { s: 1.4, l: 0.8 });
}

// Coffee: statue. a moka pot. origin: hob, centre.
function moka(g, e) {
  const { ctx } = g, M = '#cfd6f2';
  g.shadow(0, 0, 22, 4, 0.34);
  // a wisp of steam
  const t = e?.t || 0;
  for (let i = 0; i < 2; i++) {
    const ph = ((t * 0.4 + i * 0.5) % 1), y = -64 - ph * 26, a = Math.sin(ph * PI) * 0.4 * (1 - g.fade);
    g.line(pd(`M${14 + i * 3} ${y} q4 -5 0 -10 t0 -10`), '#ffffff', 2.4, a);
  }
  const low = poly([[-17, 0], [17, 0], [11, -26], [-11, -26]]);
  g.f(low, M, { s: 5, l: 1.8, dk: 0.34 });
  g.clip(low, () => { g.flat(poly([[-7, 0], [-4, -26], [4, -26], [7, 0]]), '#f4f6ff', 0.7); g.flat(poly([[-17, 0], [-11, -26], [-9.5, -26], [-14, 0]]), '#ffffff', 0.5); });
  g.f(rr(-12.5, -30, 25, 6, 2), '#aeb7e0', { s: 2, l: 1 });
  const top = poly([[-11, -30], [11, -30], [16.5, -58], [-16.5, -58]]);
  g.f(top, M, { s: 5, l: 1.8, dk: 0.34 });
  g.clip(top, () => { g.flat(poly([[-4, -30], [-6.5, -58], [6.5, -58], [4, -30]]), '#f4f6ff', 0.7); g.flat(poly([[-11, -30], [-16.5, -58], [-14.5, -58], [-9.5, -30]]), '#ffffff', 0.5); });
  g.f(poly([[-16.5, -58], [16.5, -58], [21, -54.5], [16.5, -51]]), M, { s: 0, l: 0, shade: false, lit: false });
  g.f(pd('M-17.5 -58 L17.5 -58 L7 -66 L-7 -66Z'), '#aeb7e0', { s: 2, l: 1 });
  g.f(circ(0, -68.5, 3.6), '#2b2b45', { s: 1.4, l: 0.9, lt: 0.4 });
  g.f(pd('M-15.5 -54 L-30 -54 Q-33 -54 -32 -50 L-27 -30 Q-26 -27 -23 -28 L-22 -29 Q-21 -30 -21.5 -32 L-24.5 -46 L-14 -46Z'), '#2b2b45', { s: 2.4, l: 1.2, lt: 0.34 });
}

// Spices: a row of jars. origin: shelf, left end of the row.
function spiceJars(g) {
  const { ctx } = g;
  const jars = [['#d9442e', '#ee4b7a'], ['#f2b21c', '#ffc83d'], ['#7a9a3a', '#2bc4a4'], ['#a5622c', '#ff7a59'], ['#3a2a2a', '#8b5cf0']];
  jars.forEach(([spice, tag], i) => {
    const x = 14 + i * 27, hgt = i % 2 ? 38 : 44;
    g.shadow(x, 0, 14, 3, 0.3);
    const jar = rr(x - 10.5, -hgt, 21, hgt, [6, 6, 3.5, 3.5]);
    g.flat(jar, '#dff0ff', 0.34);
    g.clip(jar, () => {
      g.flat(rr(x - 12, -hgt * 0.72, 24, hgt, 0), spice);
      g.flat(ell(x, -hgt * 0.72, 11, 2.4), g.fade ? spice : spice, 1);
      ctx.fillStyle = g.lt(spice, 0.28); ctx.fill(ell(x, -hgt * 0.72, 10.5, 2.2));
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill(rr(x - 8, -hgt + 4, 3, hgt - 8, 1.5));
      ctx.fillStyle = 'rgba(26,16,86,0.2)'; ctx.fill(rr(x + 6, -hgt, 6, hgt, 0));
    });
    g.line(jar, '#eaf4ff', 1.3, 0.75);
    g.f(rr(x - 6.5, -hgt * 0.5, 13, 9, 2), '#fff7e4', { s: 1.2, l: 0, lit: false, dk: 0.16 });
    g.flat(circ(x, -hgt * 0.5 + 4.5, 2.4), tag);
    g.f(rr(x - 8.5, -hgt - 6, 17, 8, 3), '#c99a62', { s: 2, l: 1 });
  });
}

// Spices: the "flag" template as a string of dried chillies. origin: the hook.
function chillies(g, e) {
  const { ctx } = g, sway = Math.sin((e?.t || 0) * 0.9) * 0.02;
  ctx.save(); ctx.rotate(sway);
  g.line(pd('M0 0 L0 92'), '#d9c391', 2);
  g.f(circ(0, 0, 3.6), '#aab4e6', { s: 1.3, l: 0.7 });
  const r = rng(17);
  for (let i = 0; i < 13; i++) {
    const y = 12 + i * 6.4, side = i % 2 ? 1 : -1, a = side * (0.5 + r() * 0.5), len = 22 + r() * 9;
    ctx.save(); ctx.translate(0, y); ctx.rotate(a);
    const col = r() < 0.2 ? '#ff7a3a' : (r() < 0.5 ? '#d92a3e' : '#ee3b4e');
    g.f(pd(`M-3.6 3 C-5 ${len * 0.5} -2 ${len * 0.9} 1.5 ${len} C3 ${len * 0.7} 4.4 ${len * 0.4} 3.6 3 Q0 0 -3.6 3Z`), col, { s: 2, l: 1.1 });
    g.f(rr(-2.4, -1, 4.8, 5, 2), '#3f8f4a', { s: 1, l: 0.6 });
    ctx.restore();
  }
  ctx.restore();
}

// Coffee: floor mat, shaped like a coffee bean. origin: centre.
function beanMat(g) {
  const C = '#9a5c34';
  g.flat(ell(0, 5, 88, 25), '#0a082c', 0.32);
  g.flat(ell(0, 3.6, 86, 24), '#5a3018');
  g.f(ell(0, 0, 86, 24), C, { s: 3.4, l: 1.6, dk: 0.3, lt: 0.3 });
  // the crease down the middle of the bean
  const crease = pd('M-72 1 C-40 12 -14 8 0 0 C14 -8 40 -12 72 -1');
  g.line(crease, '#4a260f', 6);
  g.ctx.save(); g.ctx.translate(0, 2.6); g.line(crease, '#c98a5a', 1.6, 0.8); g.ctx.restore();
  g.flat(ell(-30, -12.5, 30, 4.2, -0.04), '#ffffff', 0.18);
}

// Coffee: poster. origin: top-left. 96 x 124
function coffeePoster(g) {
  const { ctx } = g, w = 96, h = 124;
  ctx.fillStyle = 'rgba(8,6,40,0.34)'; ctx.fill(rr(3, 5, w, h, 4));
  g.f(rr(0, 0, w, h, 4), '#fff5de', { s: 2.4, l: 0, lit: false, dk: 0.16 });
  const pic = rr(7, 7, w - 14, 88, 3);
  g.flat(pic, '#e2573f');
  g.clip(pic, () => {
    g.flat(ell(52, 62, 38, 9), '#b23a2c');
    // the saucer and cup, seen from a little above
    g.f(ell(48, 58, 36, 11), '#fff7e4', { s: 3, l: 1.4, dk: 0.2 });
    g.f(pd('M24 40 L72 40 C72 56 64 62 56 62 L40 62 C32 62 24 56 24 40Z'), '#ffffff', { s: 4, l: 1.6, dk: 0.2 });
    g.line(pd('M72 44 C84 43 84 56 67 56'), '#ffffff', 4.4);
    g.line(pd('M72 44 C84 43 84 56 67 56'), '#d6d2e8', 1.2, 0.6);
    g.f(ell(48, 40, 24, 6.4), '#fff7e4', { s: 1.4, l: 0.9 });
    g.flat(ell(48, 40.6, 20.5, 4.8), '#6e3f24');
    g.flat(pd('M48 37.5 C43 39 43 43 48 44.2 C53 43 53 39 48 37.5Z'), '#f0d2a4', 0.95);
    for (let i = 0; i < 3; i++) g.line(pd(`M${38 + i * 10} 30 q5 -6 0 -11 t0 -9`), '#ffe0d2', 2.6, 0.75);
  });
  g.flat(rr(22, 102, 52, 6, 3), '#d9c391'); g.flat(rr(30, 112, 36, 5, 2.5), '#e8d8ae');
  g.f(circ(w / 2, 4, 4), '#49c6ff', { s: 1.6, l: 0.9 });
}

// Every earned thing in the house. x, y: where its origin sits in the world. hit: its touch box, around the origin.
// mem: how well its topic is remembered (0 to 1). The numbers are made up for the sketch.
const K = 1124;   // where the kitchen starts (X.kitL in shell.js)
export const THINGS = [
  { id: 'bunting', room: 'bed', name: 'Flag string', topic: 'Flags of the world', mem: 0.74, x: 268, y: 172, hit: [0, -8, 360, 84], draw: bunting, z: 1 },
  { id: 'poster', room: 'bed', name: 'Bear poster', topic: 'Bears', mem: 0.9, x: 292, y: 296, hit: [0, 0, 108, 148], draw: bearPoster, z: 1 },
  { id: 'salmon', room: 'bed', name: 'Salmon', topic: 'Bears', mem: 0.9, x: 196, y: 621, hit: [-44, -42, 50, 4], draw: salmon, z: 3 },
  { id: 'rug', room: 'bed', name: 'Paw mat', topic: 'Bears', mem: 0.9, x: 342, y: 726, hit: [-96, -24, 96, 26], draw: pawRug, z: 0, flat: true },
  { id: 'cup', room: 'bed', name: 'Storm cup', topic: 'Hurricanes', mem: 0.82, x: 572, y: 396, hit: [-30, -84, 30, 2], draw: stormCup, z: 2 },
  { id: 'bulb', room: 'bed', name: 'Light bulb', topic: 'Circuits', mem: 0.24, fading: true, x: 662, y: 396, hit: [-26, -86, 30, 2], draw: bulb, z: 2 },
  { id: 'medal', room: 'bed', name: 'Flags medal', topic: 'Flags of the world', mem: 0.74, x: 770, y: 262, hit: [-22, -4, 22, 80], draw: medal, z: 1 },
  { id: 'storm-poster', room: 'bed', name: 'Storm poster', topic: 'Hurricanes', mem: 0.82, x: 826, y: 236, hit: [0, 0, 100, 128], draw: stormPoster, z: 1 },
  { id: 'globe', room: 'bed', name: 'Globe', topic: 'Flags of the world', mem: 0.74, x: 768, y: 716, hit: [-52, -168, 52, 4], draw: globeStand, z: 3, opens: 'globe' },
  { id: 'guitar', room: 'bed', name: 'Guitar', topic: 'Guitar', mem: 0.18, fading: true, x: 856, y: 714, hit: [-44, -232, 48, 4], draw: guitar, z: 4 },
  { id: 'coffee-poster', room: 'kitchen', name: 'Coffee poster', topic: 'Coffee', mem: 0.86, x: K + 400, y: 196, hit: [0, 0, 96, 124], draw: coffeePoster, z: 1 },
  { id: 'chillies', room: 'kitchen', name: 'Chilli string', topic: 'Spices', mem: 0.7, x: K + 548, y: 330, hit: [-22, -4, 22, 128], draw: chillies, z: 1 },
  { id: 'jars', room: 'kitchen', name: 'Spice jars', topic: 'Spices', mem: 0.7, x: K + 376, y: 412, hit: [0, -54, 142, 2], draw: spiceJars, z: 2 },
  { id: 'loaf', room: 'kitchen', name: 'Crusty loaf', topic: 'Bread', mem: 0.92, x: K + 222, y: 603, hit: [-48, -42, 78, 2], draw: loaf, z: 2 },
  { id: 'moka', room: 'kitchen', name: 'Moka pot', topic: 'Coffee', mem: 0.86, x: K + 400, y: 600, hit: [-36, -76, 26, 2], draw: moka, z: 2 },
  { id: 'bean', room: 'kitchen', name: 'Bean mat', topic: 'Coffee', mem: 0.86, x: K + 300, y: 726, hit: [-88, -24, 88, 26], draw: beanMat, z: 0, flat: true },
];
