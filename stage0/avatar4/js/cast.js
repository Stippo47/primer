// Ten avatar base shapes for the fourth round. Stills only: no animation, no clothes.
// Each is drawn from its feet at (0, 0), in the same units as round three (about 130 to 170 tall).
// All are drawn the middle way: Duolingo's few clean blocks, big close-set eyes and floating feet,
// with one broad hard-edged shadow plane from Kurzgesagt, and no rim or outline.
//   builds: build on the raccoon and the frog       new: new directions       bold: push the shape further

import { rr, pill, circ, ell, poly, rpoly, pd, union, tube, leaf, pen, dEye, cloud, trail } from './kit.js';

export const CAST = [
  { id: 'otter', name: 'Otter', group: 'builds' },
  { id: 'hippo', name: 'Hippo', group: 'builds' },
  { id: 'gecko', name: 'Gecko', group: 'builds' },
  { id: 'cockatiel', name: 'Cockatiel', group: 'new' },
  { id: 'bee', name: 'Bee', group: 'new' },
  { id: 'person', name: 'Person', group: 'new' },
  { id: 'sheep', name: 'Sheep', group: 'new' },
  { id: 'bat', name: 'Bat', group: 'bold' },
  { id: 'walrus', name: 'Walrus', group: 'bold' },
  { id: 'flamingo', name: 'Flamingo', group: 'bold' },
];

const STYLE = { planes: 0.5, rim: null };
const PUPIL = '#2b2b3f';

// a second colour laid over part of a mass, shaded with the mass's own plane so the shadow runs through
function patch(g, mass, region, col, dark, w, o = {}) {
  g.clip(region, () => g.form(mass, col, { dark, w, ...o }));
}
const eyes = (g, pts, o = {}) => pts.forEach(([x, y, w, h]) => dEye(g, x, y, w, h, { pupil: PUPIL, ...o }));

// =====================================================================
// 1. Otter. Builds on the raccoon: a big head and floating feet, but head and body are one sleek
// bottle-shaped mass, with a pale muzzle, paws held together, and a thick tail resting on the floor.
function otter(g) {
  const C = '#d47c45', CD = '#a8454f', F = '#ffeccc', FD = '#eea98e', DK = '#8a3446', N = '#3a1d3c';
  g.ground(40, 'pill');
  g.fill(pill(-14, -3.4, 22, 7.4), DK);
  g.fill(pill(13, -3.4, 22, 7.4), DK);
  g.form(trail([[8, -26, 12], [34, -15, 9], [60, -7, 4.5]]), C, { dark: CD, w: 30 });
  g.form(circ(-28, -126, 6.5), C, { dark: CD, w: 13 });
  g.form(circ(29, -126, 7), C, { dark: CD, w: 14 });
  const mass = union(rr(-30, -148, 60, 50, 24), rpoly([[-24, -114], [24, -114], [32, -14], [-32, -14]], 20));
  g.form(mass, C, { dark: CD, w: 62 });
  patch(g, mass, ell(-3, -107, 23, 14), F, FD, 62);
  // paws held together at the chest
  for (const [x0, x1] of [[-25, -10], [25, 4]]) g.form(tube(x0, -92, x1, -76, 5.4), C, { dark: CD, w: 11 });
  g.fill(circ(-9, -73, 6.2), DK);
  g.fill(circ(3, -73, 6.2), DK);
  eyes(g, [[-12, -128, 17, 19], [6, -128, 16, 18]], { look: [-1.2, 0.6] });
  g.fill(rr(-10, -117, 14, 8, 4), N);
  g.line(pd('M-9 -105 Q-3 -101 3 -105'), N, 2.2);
}

// =====================================================================
// 2. Hippo. Builds on the frog: eyes high on the head, a muzzle wider than the skull, no legs.
function hippo(g) {
  const C = '#e48fc2', CD = '#b05aa6', M = '#f8b8d4', MD = '#d985b6', DK = '#7a2d68', BE = '#f6c6dc', FT = '#a8468f';
  g.ground(40, 'pill');
  g.fill(pill(-15, -3.6, 25, 8), FT);
  g.fill(pill(15, -3.6, 25, 8), FT);
  const body = rr(-33, -72, 66, 58, [22, 22, 26, 26]);
  g.form(body, C, { dark: CD, w: 66 });
  patch(g, body, ell(-2, -38, 21, 20), BE, MD, 66);
  for (const k of [-1, 1]) {
    g.form(tube(k * 31, -62, k * 38, -40, 7.4), C, { dark: CD, w: 15 });
    g.fill(circ(k * 38.5, -37, 7.6), FT);
  }
  // ears on the top corners of the skull
  for (const k of [-1, 1]) {
    g.at(k * 22, -136, () => { g.form(ell(0, 0, 6.5, 8.5), C, { dark: CD, w: 13 }); g.fill(ell(0, 1, 3.2, 4.8), DK); }, 1, k * 0.45);
  }
  // the head: a skull block with a wider muzzle block below it
  const head = union(rr(-30, -138, 60, 44, 19), rr(-41, -106, 82, 44, 20));
  g.form(head, C, { dark: CD, w: 82 });
  patch(g, head, rr(-60, -102, 120, 60, 0), M, MD, 82);
  // half-closed lids: the hippo's look is calm and a little smug
  eyes(g, [[-10, -118, 17, 19], [10, -118, 17, 19]], { look: [-0.6, 1.4], sleepy: 0.32, lid: C, lidLine: CD });
  for (const k of [-1, 1]) g.at(k * 11, -133, () => g.fill(pill(0, 0, 12, 4.6), DK), 1, k * 0.14);
  for (const k of [-1, 1]) g.fill(ell(k * 12, -94, 4, 2.8, k * 0.2), DK);
  g.line(pd('M-25 -79 Q0 -69 25 -79'), DK, 2.6);
}

// =====================================================================
// 3. Gecko. Builds on the frog: a broad flat head wider than the body, a wide grin, a curled tail.
function gecko(g) {
  const C = '#4fd68a', CD = '#2a8fae', B = '#eaff9e', BD = '#a8dc8a', SP = '#ff9a3d', DK = '#1f5a6e', HD = '#7ef0a8';
  g.ground(36, 'pill');
  g.fill(pill(-13, -3.4, 21, 7.4), CD);
  g.fill(pill(12, -3.4, 21, 7.4), CD);
  // the tail curls up behind, to the right
  // the tail curls up behind, to the right: a spiral that thins as it winds in
  const at = t => { const a = (148 - t * 350) * Math.PI / 180, R = 30 - 21 * t; return [42 + R * Math.cos(a), -44 + R * Math.sin(a), 9 - 6.5 * t]; };
  const tail = trail(Array.from({ length: 29 }, (_, i) => at(i / 28)));
  g.form(tail, C, { dark: CD, w: 30 });
  g.clip(tail, () => { for (const t of [0.2, 0.5]) { const [x, y, r] = at(t); g.fill(circ(x, y, r * 0.42), SP); } });
  g.form(tube(-10, -32, -12, -12, 5.2), C, { dark: CD, w: 11 });
  g.form(tube(10, -32, 12, -12, 5.2), C, { dark: CD, w: 11 });
  const body = rpoly([[-18, -98], [18, -98], [22, -26], [-22, -26]], 15);
  g.form(body, C, { dark: CD, w: 44 });
  patch(g, body, pill(-1, -58, 22, 56), B, BD, 44);
  for (const k of [-1, 1]) {
    g.form(tube(k * 16, -86, k * 28, -64, 4.6), C, { dark: CD, w: 10 });
    g.fill(circ(k * 29, -61, 6), HD);
  }
  const head = rr(-41, -144, 82, 52, 24);
  g.form(head, C, { dark: CD, w: 82 });
  eyes(g, [[-12, -122, 21, 23], [12, -122, 21, 23]], { look: [-0.8, 0.8] });
  g.line(pd('M-28 -105 Q0 -93 28 -105'), DK, 2.6);
}

// =====================================================================
// 4. Cockatiel. A bird the middle way: one mass with the face on its front, a crest, a hooked beak.
// The yellow face gives the white eyes something to stand on.
function cockatiel(g) {
  const G = '#cfd0f2', GD = '#8e8fd8', WG = '#f6f4ff', Y = '#ffe169', YD = '#f2ad45', CRD = '#ff9a2e', BK = '#4a4b7c', BKD = '#2f2f5c', CH = '#ff7a4a', FT = '#8d90c8';
  g.ground(36, 'pill');
  g.fill(pill(-14, -3.4, 20, 7.2), FT);
  g.fill(pill(11, -3.4, 20, 7.2), FT);
  // the crest fans up and back from the top of the head
  g.form(leaf(10, -116, 32, -152, 0.3, 0.08), Y, { dark: CRD, w: 16 });
  g.form(leaf(3, -120, 14, -166, 0.3, 0.08), Y, { dark: CRD, w: 16 });
  g.form(leaf(-4, -120, -10, -160, 0.3, 0.08), Y, { dark: CRD, w: 16 });
  g.form(leaf(26, -30, 44, -12, 0.3, 0.12), G, { dark: GD, w: 14 });
  const body = rr(-37, -128, 74, 116, [37, 37, 28, 28]);
  g.form(body, G, { dark: GD, w: 74 });
  patch(g, body, ell(-16, -100, 32, 27), Y, YD, 74);
  g.form(leaf(14, -88, 30, -36, 0.28, 0.06), WG, { dark: '#c9c4f4', w: 22 });
  g.fill(ell(-1, -84, 7, 5.6), CH);
  eyes(g, [[-25, -101, 17, 19.5], [-7, -101, 16, 18.5]], { look: [-1.6, 0.6] });
  // the beak: a thick hook on top, a small lower half
  g.fill(pd('M-27 -78 L-39 -76 C-41 -70 -36 -65 -29 -67 Z'), BKD);
  g.fill(pd('M-22 -90 C-32 -93 -44 -89 -47 -79 C-48 -73 -46 -68 -43 -66 C-42 -72 -38 -76 -30 -77 L-22 -79 Z'), BK);
}

// =====================================================================
// 5. Bee. A small round creature: one rounded block, two stripes, wings and feelers breaking the outline.
function bee(g) {
  const Y = '#ffd03a', YD = '#f6a03a', PL = '#3e2b72', PLD = '#291a52', WG = '#e3e6ff', CH = '#ff8f6b';
  g.ground(36, 'pill');
  g.fill(pill(-12, -3.4, 19, 7.2), PL);
  g.fill(pill(12, -3.4, 19, 7.2), PL);
  g.fill(leaf(-16, -92, -50, -120, 0.36, 0.2), WG);
  g.fill(leaf(16, -92, 50, -122, 0.36, 0.2), WG);
  for (const k of [-1, 1]) {
    g.line(pd(`M${k * 9} -98 Q${k * 13} -114 ${k * 22} -121`), PL, 3.2);
    g.fill(circ(k * 23, -122, 4.6), PL);
  }
  const body = rr(-42, -100, 84, 86, 38);
  g.form(body, Y, { dark: YD, w: 84 });
  for (const [y0, y1] of [[-49, -38], [-29, -14]]) patch(g, body, rr(-60, y0, 120, y1 - y0, 0), PL, PLD, 84);
  // short arms at the sides, a darker tint of the body so they show on it and off it
  for (const k of [-1, 1]) {
    g.fill(tube(k * 36, -66, k * 47, -46, 4.8), '#f39a2e');
    g.fill(circ(k * 48, -43, 6), PL);
  }
  eyes(g, [[-11, -75, 19, 21], [11, -75, 19, 21]], { look: [-0.6, 0.6] });
  g.line(pd('M-6 -59 Q0 -55 6 -59'), PL, 2.4);
  g.fill(ell(-25, -61, 5, 3), CH, 0.7);
  g.fill(ell(25, -61, 5, 3), CH, 0.7);
}

// =====================================================================
// 6. Person. A person the middle way: Duolingo's big head and eyes, one shadow plane, the hair pulled
// back into one ball of a bun, a pear-shaped body, short legs. No clothes: the body is one plain colour,
// a base for a shirt later.
function person(g) {
  const SK = '#a66a47', SKD = '#7f4750', NO = '#875038', HR = '#53303c', HRD = '#341d34', SU = '#5fc4b8', SUD = '#3a86b4', LG = '#4b4fae', LGD = '#363788', FT = '#2e2a5e';
  g.ground(34, 'pill');
  g.fill(pill(-12, -3.4, 21, 7.6), FT);
  g.fill(pill(12, -3.4, 21, 7.6), FT);
  g.form(tube(-10, -34, -11, -12, 6.4), LG, { dark: LGD, w: 13 });
  g.form(tube(10, -34, 11, -12, 6.4), LG, { dark: LGD, w: 13 });
  const torso = rpoly([[-16, -98], [16, -98], [29, -30], [-29, -30]], 15);
  g.form(torso, SU, { dark: SUD, w: 52 });
  for (const k of [-1, 1]) {
    g.form(tube(k * 17, -90, k * 27, -62, 5.6), SU, { dark: SUD, w: 12 });
    g.fill(circ(k * 28.5, -58, 6.6), SK);
  }
  const back = union(rr(-31, -156, 62, 38, [26, 26, 12, 12]), circ(0, -166, 15));
  g.form(back, HR, { dark: HRD, w: 56 });
  for (const k of [-1, 1]) g.form(circ(k * 29, -116, 6.4), SK, { dark: SKD, w: 13 });
  const head = rr(-28, -150, 56, 58, 24);
  g.form(head, SK, { dark: SKD, w: 40 });
  // pulled back: the hairline dips to a parting in the middle
  const front = pd('M-44 -190 L44 -190 L44 -126 C34 -140 14 -144 0 -138 C-14 -144 -34 -140 -44 -126 Z');
  g.clip(front, () => g.form(back, HR, { dark: HRD, w: 56 }));
  eyes(g, [[-9, -117, 15.5, 18], [9, -117, 15.5, 18]], { look: [-0.8, 0.6] });
  for (const k of [-1, 1]) g.at(k * 10, -131, () => g.fill(pill(0, 0, 11, 4.6), HRD), 1, k * 0.12);
  g.fill(circ(0, -105, 4), NO);
  g.fill(pd('M-7 -99 Q0 -96.5 7 -99 Q5.5 -93 0 -93 Q-5.5 -93 -7 -99 Z'), '#7a1e3a');
}

// =====================================================================
// 7. Sheep. Fluffy with a clean outline: the wool is one cloud of equal round bumps, the face a dark block.
function sheep(g) {
  const WL = '#f5eeff', WLD = '#baa9f2', FC = '#55408c', FCD = '#3a2a6c', IN = '#ff9fbf', HV = '#4a3784';
  g.ground(38, 'pill');
  g.fill(pill(-12, -3.4, 19, 7.4), HV);
  g.fill(pill(12, -3.4, 19, 7.4), HV);
  g.fill(tube(-11, -24, -12, -12, 5), HV);
  g.fill(tube(11, -24, 12, -12, 5), HV);
  const wool = cloud(0, -58, 34, 31, 11, 13, -Math.PI / 2);
  g.form(wool, WL, { dark: WLD, w: 94 });
  // the arms stay inside the wool: only the round hands peek out at its sides
  for (const k of [-1, 1]) g.fill(circ(k * 41, -46, 6.8), HV);
  for (const k of [-1, 1]) {
    g.form(leaf(k * 18, -119, k * 46, -108, 0.36, 0.26), FC, { dark: FCD, w: 18 });
    g.fill(leaf(k * 22, -116.5, k * 41, -109.5, 0.26, 0.12), IN);
  }
  const head = rr(-23, -132, 46, 48, 19);
  g.form(head, FC, { dark: FCD, w: 46 });
  g.form(cloud(0, -133, 13, 4, 5, 8.5, Math.PI), WL, { dark: WLD, w: 40 });
  eyes(g, [[-9, -109, 16, 18], [9, -109, 16, 18]], { look: [-0.6, 0.6] });
  g.fill(pill(0, -95, 8, 4.6), IN);
  g.line(pd('M-4 -90 Q0 -88 4 -90'), IN, 1.8);
}

// =====================================================================
// 8. Bat. Bold: the head and ears are two thirds of the height, on a small body with half-open wings.
function bat(g) {
  const FU = '#ffa552', FUD = '#dc5f5c', WG = '#b14b9d', WGD = '#7e2e8e', ST = '#7e2e8e', IN = '#ffb8c8', DK = '#3a1f4e';
  g.ground(40, 'pill');
  g.fill(pill(-9, -3.2, 15, 6.4), DK);
  g.fill(pill(9, -3.2, 15, 6.4), DK);
  // wings held open: the arm runs up and out to a wrist, the skin hangs below it in three scallops
  for (const k of [-1, 1]) {
    const wing = rpoly([[k * 14, -74, 4], [k * 74, -100, 5], [k * 80, -50, 3], [k * 66, -58, 9], [k * 54, -38, 3], [k * 40, -50, 9], [k * 28, -30, 3], [k * 16, -40, 6]], 4);
    g.form(wing, WG, { dark: WGD, w: 44 });
    g.clip(wing, () => {
      g.line(pd(`M${k * 74} -98 L${k * 66} -58 M${k * 72} -98 L${k * 41} -52`), ST, 2.6);
      g.fill(tube(k * 16, -74, k * 74, -99, 3.6), ST);
    });
  }
  const body = rr(-19, -72, 38, 54, 17);
  g.form(body, FU, { dark: FUD, w: 38 });
  // tall ears, broad at the base, splayed out
  for (const k of [-1, 1]) {
    g.form(rpoly([[k * 32, -106, 6], [k * 48, -170, 8], [k * 4, -122, 6]]), FU, { dark: FUD, w: 30 });
    g.fill(rpoly([[k * 28, -111, 4], [k * 41, -158, 5], [k * 11, -122, 4]]), IN);
  }
  const head = rr(-35, -124, 70, 58, 26);
  g.form(head, FU, { dark: FUD, w: 70 });
  eyes(g, [[-12, -98, 21, 23], [12, -98, 21, 23]], { look: [-0.6, 0.8] });
  g.fill(pill(0, -82, 12, 7), DK);
  g.line(pd('M-7 -74 Q0 -70 7 -74'), DK, 2.2);
  g.fill(rpoly([[2, -73], [7, -73.5], [4.8, -67.5]], 1), '#ffffff');
}

// =====================================================================
// 9. Walrus. Bold: one big bell of a body with the face high on its front, the muzzle pushed to caricature.
function walrus(g) {
  const C = '#f0956f', CD = '#d5667a', M = '#ffd9bf', MD = '#f0a89a', TK = '#fffaf0', DK = '#5b2440', FL = '#d9645f';
  g.ground(52, 'pill');
  g.fill(pill(-24, -3.6, 30, 8), FL);
  g.fill(pill(24, -3.6, 30, 8), FL);
  for (const k of [-1, 1]) g.form(leaf(k * 50, -60, k * 72, -26, 0.32, 0.1), FL, { dark: CD, w: 18 });
  const body = pd('M-48 -12 C-62 -12 -64 -26 -62 -40 C-58 -82 -40 -132 0 -132 C40 -132 58 -82 62 -40 C64 -26 62 -12 48 -12 Z');
  g.form(body, C, { dark: CD, w: 110, kx: 0.32 });
  eyes(g, [[-10, -108, 16.5, 18.5], [10, -108, 16.5, 18.5]], { look: [-0.6, 0.6] });
  for (const k of [-1, 1]) g.at(k * 11, -122, () => g.fill(pill(0, 0, 11, 4.4), DK), 1, k * 0.14);
  g.fill(tube(-7, -78, -9, -50, 3.8), TK);
  g.fill(tube(7, -78, 9, -50, 3.8), TK);
  g.fill(circ(-12, -87, 14), M);
  g.fill(circ(12, -87, 14), M);
  g.fill(pill(0, -98, 14, 8), DK);
}

// =====================================================================
// 10. Flamingo. Bold: a round pink body on very long legs, with a bent beak.
function flamingo(g) {
  const P = '#ff8fb8', PD = '#e04f8f', WG = '#ff6fa0', LG = '#ff7d6b', BK1 = '#fff1e6', BK2 = '#2d2346';
  g.ground(30, 'pill');
  g.fill(pill(-12, -3.2, 18, 6.6), LG);
  g.fill(pill(10, -3.2, 18, 6.6), LG);
  for (const x of [-8, 8]) {
    g.fill(tube(x, -86, x, -12, 3.3), LG);
    g.fill(circ(x, -46, 4.8), LG);
  }
  g.form(leaf(26, -98, 50, -90, 0.3, 0.12), WG, { dark: PD, w: 12 });
  // a pear: the round head at the top swells into a lower body that leans back
  const body = union(rr(-28, -176, 56, 64, 28), ell(4, -106, 38, 28, -0.12));
  g.form(body, P, { dark: PD, w: 66 });
  g.form(leaf(10, -118, 36, -92, 0.34, 0.08), WG, { dark: PD, w: 18 });
  eyes(g, [[-15, -152, 16.5, 18.5], [2, -152, 15.5, 17.5]], { look: [-1.4, 0.6] });
  // the beak: thick and pale where it leaves the face, bending sharply down to a dark tip
  const beak = trail([[-20, -134, 9], [-35, -134, 8.5], [-43, -125, 6.4], [-44, -114, 3.8]]);
  g.fill(beak, BK1);
  g.clip(beak, () => g.fill(poly([[-80, -140], [-47, -133], [-35, -115], [-35, -90], [-80, -90]]), BK2));
}

const DRAW = { otter, hippo, gecko, cockatiel, bee, person, sheep, bat, walrus, flamingo };
export function drawAvatar(ctx, id, o = {}) {
  const c = CAST.find(a => a.id === id) || CAST[0];
  const g = pen(ctx, STYLE);
  if (o.noGround) g.ground = () => {};
  DRAW[c.id](g);
}
