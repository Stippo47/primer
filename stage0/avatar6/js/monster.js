// Four new monsters, each drawn in the two liked shape styles, Blob and Noodle. Drawn from the feet at
// (0, 0), up is negative y.
//
// Each differs from the others, and from every earlier monster, in three ways: its body plan, its colour,
// and the one thing that makes it a monster. None has horns, fur, a crest, fangs or more than two eyes
// (the earlier ones leaned on those), and none is purple.
//
//   Lamp     raspberry. A wide dumpling, head and body in one. A lamp hangs from a stalk on its forehead.
//   Flop     lime. A tall drop whose whole top bends over and hangs down one side, like a soft cap.
//   Hug      tangerine. A small head on a broad pear body, and two pairs of arms.
//   Wiggle   sky blue. A tall dome with arms, standing on four short tentacles instead of legs.
//
// Checked against well-known characters: a blue round body with a glowing lure is close to a known game
// creature, so the lamp one is raspberry and the blue went to the tentacle one; a four-armed one is not
// called "Four-arms", which is another show's character.
//
// Within a design the character never changes between the two styles: colours, feature, pose and face.
// What changes is the build: Blob is one soft mass with nubs that melt out of it; Noodle is a smaller body
// on long bendy limbs of even width with round hands and big feet, and its feature is drawn as a noodle too.

import { PI, circ, ell, pd, trail, smooth, soft, union } from './kit.js';
import { FACE } from './face.js';

const MO = '#3a1640', TO = '#ff7f9a';

// ---------- small shared pieces ----------
const noodle = (g, d, col, w) => g.line(pd(d), col, w);
const foot = (g, x, y, rx, ry, k, col) => g.at(x, y, () => g.fill(ell(0, 0, rx, ry), col), 1, k * 0.12);
// two soft lumps peeking out under a Blob body
function lumps(g, dx, col, h = 20) {
  for (const k of [-1, 1]) {
    g.form(pd(`M${k * (dx - 14)} ${-h} C${k * (dx - 15)} ${-h * 0.5} ${k * (dx - 14)} -5 ${k * (dx - 12)} -2.5 Q${k * dx} 2.5 ${k * (dx + 12)} -2 C${k * (dx + 16)} -6 ${k * (dx + 12)} ${-h * 0.7} ${k * (dx + 11)} ${-h} Z`), col);
  }
}
// a nub arm melting out of a Blob body: a short tapering run and a round hand
function nub(g, pts, handAt, col, dark) {
  g.form(soft(pts), col, { dark, w: 18 });
  g.form(ell(handAt[0], handAt[1], 9.5, 10.5), col, { dark, w: 18 });
}
// a noodle arm with its round hand
function arm(g, d, hx, hy, col, dark, w = 7.5, r = 8.5) {
  noodle(g, d, col, w);
  g.form(circ(hx, hy, r), col, { dark, w: r * 2 });
}
// a light: stepped rings of flat glow round a bulb, which casts no shadow
function glow(g, x, y, r, col) {
  g.fill(circ(x, y, r * 2.6), col, 0.1);
  g.fill(circ(x, y, r * 1.8), col, 0.16);
}
function bulb(g, x, y, r) {
  g.fill(circ(x, y, r), '#fff1a0');
  g.fill(circ(x - r * 0.18, y - r * 0.18, r * 0.62), '#fffbe6');
}
// the face: two eyes, brows, and a mouth that is an open grin or a closed smile; cheeks if given
function face(g, F, o) {
  const { ex, ey, ew, eh, look = [0, 0], by, bw = 12, bh = 4, brow, my, mw, mh, mouth = 'grin', cheeks } = o;
  if (cheeks) for (const k of [-1, 1]) g.fill(ell(k * cheeks[0], cheeks[1], cheeks[2], cheeks[2] * 0.62), cheeks[3]);
  F.eye(g, -ex, ey, ew, eh, { look });
  F.eye(g, ex, ey, ew, eh, { look });
  if (brow) { F.brow(g, -ex, by - 1.5, bw, bh, -0.14, brow); F.brow(g, ex, by, bw, bh, 0.14, brow); }
  if (mouth === 'grin') F.mouth(g, 0, my, mw, mh, MO, { tongue: TO });
  else if (mouth === 'smile') g.line(pd(`M${-mw / 2} ${my} Q0 ${my + mh} ${mw / 2} ${my}`), MO, 3.4);
}

// =====================================================================
// 1. Lamp: raspberry, a wide dumpling with a lamp on a stalk. It looks up at its lamp and lifts a hand to it.
const LA = { B: '#f2557e', BD: '#ab2f76', BE: '#ffd3de', BED: '#f29ab6', FT: '#6e1a52', BR: '#5e1240', GL: '#ffe46a' };
function lampBlob(g) {
  const F = FACE.blob, { B, BD, BE, BED, FT, BR, GL } = LA;
  g.ground(48, 'pill');
  glow(g, -52, -128, 11, GL);
  lumps(g, 22, FT);
  nub(g, [[-46, -68, 11], [-60, -80, 9], [-66, -94, 8.5]], [-67, -100], B, BD);
  nub(g, [[46, -50, 11], [58, -40, 9], [62, -30, 8.5]], [63, -26], B, BD);
  // the stalk: a soft taper from the forehead, up and over to the left, the lamp hanging from its end
  g.form(soft([[-2, -100, 8], [-3, -124, 6], [-12, -144, 4.8], [-28, -154, 4.2], [-44, -150, 3.8], [-52, -140, 3.6]]), B, { dark: BD, w: 12 });
  const body = pd('M0 -112 C34 -112 56 -88 58 -58 C60 -36 56 -18 36 -15 C22 -13 -22 -13 -36 -15 C-56 -18 -60 -36 -58 -58 C-56 -88 -34 -112 0 -112 Z');
  g.form(body, B, { dark: BD, w: 116 });
  g.clip(body, () => g.form(ell(-2, -30, 36, 17), BE, { dark: BED, w: 72 }));
  face(g, F, { ex: 17, ey: -78, ew: 18, eh: 21, look: [-2.4, -3.4], by: -96, bw: 13, bh: 4.5, brow: BR, my: -60, mw: 30, mh: 13 });
  bulb(g, -52, -128, 11);
}
function lampNoodle(g) {
  const F = FACE.noodle, { B, BD, BE, BED, FT, BR, GL } = LA;
  g.ground(40, 'pill');
  glow(g, -56, -144, 10.5, GL);
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 13} -62 C${k * 12} -40 ${k * 22} -30 ${k * 17} -9`, B, 9);
    foot(g, k * 22, -5.5, 13.5, 6.5, k, FT);
  }
  arm(g, 'M-34 -96 C-54 -96 -66 -100 -68 -114', -69, -120, B, BD, 8, 9);
  arm(g, 'M34 -84 C50 -78 46 -62 52 -54', 53, -50, B, BD, 8, 9);
  noodle(g, 'M-2 -124 C-4 -154 -24 -172 -42 -166 C-52 -163 -57 -160 -56 -154', B, 5.5);
  const body = circ(0, -92, 37);
  g.form(body, B, { dark: BD, w: 74 });
  g.clip(body, () => g.form(ell(-2, -53, 25, 9), BE, { dark: BED, w: 50 }));
  face(g, F, { ex: 15, ey: -102, ew: 16, eh: 20, look: [-2.2, -3.2], by: -119, bw: 12, bh: 3.6, brow: BR, my: -86, mw: 26, mh: 12 });
  bulb(g, -56, -144, 10.5);
}

// =====================================================================
// 2. Flop: lime, a tall drop whose top bends over and hangs down to the right. A calm smile, a small wave.
const FL = { L: '#a6dc3c', LD: '#3f9a58', FT: '#24603f', BR: '#2c5a2e', CH: '#f29a6a' };
function flopBlob(g) {
  const F = FACE.blob, { L, LD, FT, BR, CH } = FL;
  g.ground(46, 'pill');
  lumps(g, 21, FT);
  nub(g, [[-38, -62, 10.5], [-52, -76, 9], [-56, -90, 8.5]], [-57, -96], L, LD);
  nub(g, [[40, -46, 10.5], [52, -36, 9], [56, -26, 8.5]], [57, -22], L, LD);
  const body = pd('M0 -122 C28 -122 50 -76 50 -40 C50 -18 32 -14 0 -14 C-32 -14 -50 -18 -50 -40 C-50 -76 -28 -122 0 -122 Z');
  // the top: one thick soft run out of the body, bending over and hanging down the right side
  const top = soft([[0, -90, 30], [0, -116, 22], [5, -138, 16], [18, -153, 12.5], [34, -156, 10.5], [46, -146, 9.5], [51, -130, 9.5], [51, -120, 10]]);
  g.form(union(body, top), L, { dark: LD, w: 100 });
  face(g, F, { ex: 14, ey: -84, ew: 16, eh: 20, look: [0, 0.8], by: -101, bw: 12, bh: 4.2, brow: BR, my: -66, mw: 16, mh: 7, mouth: 'smile', cheeks: [27, -68, 7, CH] });
}
function flopNoodle(g) {
  const F = FACE.noodle, { L, LD, FT, BR, CH } = FL;
  g.ground(38, 'pill');
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 11} -48 C${k * 10} -32 ${k * 19} -24 ${k * 15} -9`, L, 8.5);
    foot(g, k * 20, -5.5, 13, 6.5, k, FT);
  }
  arm(g, 'M-24 -76 C-42 -76 -50 -88 -48 -106', -48, -112, L, LD);
  arm(g, 'M26 -62 C42 -56 38 -42 44 -34', 45, -30, L, LD);
  // the top: the drop's tip drawn out into one long noodle, over and down, rolling in at its end
  const at = t => { const a = PI * 1.1 - t * PI * 1.5, r = 8 * (1 - 0.5 * t); return [56 + r * Math.cos(a), -112 + r * Math.sin(a), 5 - 1.2 * t]; };
  const tip = trail(smooth([[0, -100, 9], [2, -126, 6.5], [14, -150, 5.5], [34, -156, 5.2], [48, -144, 5.1], [50, -124, 5]]).concat(Array.from({ length: 12 }, (_, i) => at(i / 11))));
  g.form(tip, L, { dark: LD, w: 10 });
  const body = pd('M0 -112 C20 -112 36 -76 36 -56 C36 -44 22 -42 0 -42 C-22 -42 -36 -44 -36 -56 C-36 -76 -20 -112 0 -112 Z');
  g.form(body, L, { dark: LD, w: 72 });
  face(g, F, { ex: 11, ey: -76, ew: 14, eh: 18, look: [0, 0.8], by: -91, bw: 10.5, bh: 3.4, brow: BR, my: -61, mw: 13, mh: 6, mouth: 'smile', cheeks: [21, -62, 5.5, CH] });
}

// =====================================================================
// 3. Hug: tangerine, a small head on a broad pear body. The top pair of arms cheer, the bottom
// pair spread out to the sides.
const FA = { O: '#ff8a3a', OD: '#d4463e', BE: '#ffd99a', BED: '#f2a35c', FT: '#6a2546', BR: '#7a2232' };
function hugBlob(g) {
  const F = FACE.blob, { O, OD, BE, BED, FT, BR } = FA;
  g.ground(50, 'pill');
  lumps(g, 24, FT);
  for (const k of [-1, 1]) {
    nub(g, [[k * 30, -96, 10.5], [k * 44, -110, 9], [k * 48, -124, 8.5]], [k * 49, -130], O, OD);
    nub(g, [[k * 50, -58, 10.5], [k * 64, -60, 9], [k * 74, -68, 8.5]], [k * 79, -71], O, OD);
  }
  const body = new Path2D();
  body.moveTo(-26, -124); body.arc(0, -124, 26, PI, 0);
  body.bezierCurveTo(26, -112, 24, -106, 28, -98);
  body.bezierCurveTo(42, -86, 58, -68, 58, -44);
  body.bezierCurveTo(58, -22, 40, -14, 0, -14);
  body.bezierCurveTo(-40, -14, -58, -22, -58, -44);
  body.bezierCurveTo(-58, -68, -42, -86, -28, -98);
  body.bezierCurveTo(-24, -106, -26, -112, -26, -124);
  body.closePath();
  g.form(body, O, { dark: OD, w: 100 });
  // the head keeps a shadow band sized to the head, not to the whole body
  g.clip(pd('M-90 -200 L90 -200 L90 -104 C30 -96 -30 -96 -90 -104 Z'), () => g.form(body, O, { dark: OD, w: 44 }));
  g.clip(body, () => g.form(ell(-2, -42, 36, 24), BE, { dark: BED, w: 72 }));
  face(g, F, { ex: 10.5, ey: -127, ew: 14, eh: 18, look: [-0.8, 0.6], by: -142, bw: 10, bh: 4, brow: BR, my: -111, mw: 22, mh: 10 });
}
function hugNoodle(g) {
  const F = FACE.noodle, { O, OD, BE, BED, FT, BR } = FA;
  g.ground(40, 'pill');
  for (const k of [-1, 1]) {
    noodle(g, `M${k * 12} -50 C${k * 11} -32 ${k * 20} -24 ${k * 16} -9`, O, 9);
    foot(g, k * 21, -5.5, 13.5, 6.5, k, FT);
  }
  for (const k of [-1, 1]) {
    arm(g, `M${k * 18} -92 C${k * 36} -94 ${k * 44} -106 ${k * 42} -124`, k * 42, -130, O, OD);
    arm(g, `M${k * 30} -66 C${k * 46} -64 ${k * 54} -70 ${k * 62} -80`, k * 65, -84, O, OD);
  }
  const body = pd('M0 -102 C22 -102 36 -86 37 -70 C38 -52 26 -46 0 -46 C-26 -46 -38 -52 -37 -70 C-36 -86 -22 -102 0 -102 Z');
  g.form(body, O, { dark: OD, w: 74 });
  g.clip(body, () => g.form(ell(-2, -60, 22, 13), BE, { dark: BED, w: 44 }));
  g.form(circ(0, -124, 25), O, { dark: OD, w: 40 });
  face(g, F, { ex: 10, ey: -126, ew: 13.5, eh: 18, look: [-0.8, 0.6], by: -141, bw: 10, bh: 3.4, brow: BR, my: -112, mw: 20, mh: 9 });
}

// =====================================================================
// 4. Wiggle: sky blue, a tall dome with arms, standing on four short tentacles that curl out at the floor.
const WI = { R: '#4aa8f0', RD: '#3264c4', BR: '#1f2a6b' };
// one tentacle: down from under the body, its tip curling outwards (k = -1 to the left, 1 to the right)
const tentacle = (x, k, s = 1) => soft([[x, -46, 12 * s], [x + k * 2, -24, 10 * s], [x + k * 8, -9, 8 * s], [x + k * 18, -5, 6.5 * s], [x + k * 25, -11, 5.5 * s], [x + k * 23, -18, 4.8 * s]]);
function wiggleBlob(g) {
  const F = FACE.blob, { R, RD, BR } = WI;
  g.ground(52, 'pill');
  nub(g, [[-44, -92, 10.5], [-58, -104, 9], [-62, -118, 8.5]], [-63, -124], R, RD);
  nub(g, [[44, -74, 10.5], [56, -62, 9], [60, -52, 8.5]], [61, -47], R, RD);
  const body = pd('M0 -150 C30 -150 50 -124 50 -92 C50 -66 46 -46 38 -36 L-38 -36 C-46 -46 -50 -66 -50 -92 C-50 -124 -30 -150 0 -150 Z');
  const legs = union(tentacle(-30, -1), tentacle(-10, -1), tentacle(10, 1), tentacle(30, 1));
  g.form(union(body, legs), R, { dark: RD, w: 100 });
  face(g, F, { ex: 15, ey: -106, ew: 17, eh: 21, look: [-1, 0.6], by: -124, bw: 12, bh: 4.4, brow: BR, my: -86, mw: 26, mh: 12 });
}
function wiggleNoodle(g) {
  const F = FACE.noodle, { R, RD, BR } = WI;
  g.ground(46, 'pill');
  // four long noodle tentacles hanging from the body to the floor, each curling out at its tip
  for (const [x, k] of [[-22, -1], [-8, -1], [8, 1], [22, 1]]) {
    const cx = x * 1.5 + k * 8, a0 = k > 0 ? PI : 0;
    const at = t => { const a = a0 - k * t * PI * 1.3, r = 8 * (1 - 0.4 * t); return [cx + r * Math.cos(a), -12 + r * Math.sin(a), 4.3 - t]; };
    const run = smooth([[x, -80, 5], [x * 1.2, -50, 4.8], [x * 1.45, -24, 4.5], [x * 1.5, -12, 4.3]], 8);
    g.form(trail(run.concat(Array.from({ length: 10 }, (_, i) => at(i / 9)))), R, { dark: RD, w: 9 });
  }
  arm(g, 'M-30 -108 C-50 -110 -58 -122 -56 -140', -56, -146, R, RD);
  arm(g, 'M30 -96 C46 -90 42 -74 48 -66', 49, -62, R, RD);
  const body = pd('M0 -142 C24 -142 38 -122 38 -100 C38 -84 34 -74 26 -70 L-26 -70 C-34 -74 -38 -84 -38 -100 C-38 -122 -24 -142 0 -142 Z');
  g.form(body, R, { dark: RD, w: 76 });
  face(g, F, { ex: 13.5, ey: -110, ew: 15, eh: 19, look: [-1, 0.6], by: -126, bw: 11, bh: 3.6, brow: BR, my: -94, mw: 22, mh: 11 });
}

export const MONSTERS = [
  { id: 'lamp', name: 'Lamp', text: 'Raspberry. A wide dumpling, head and body in one, with a lamp hanging from a stalk on its forehead.' },
  { id: 'flop', name: 'Flop', text: 'Lime. A tall drop whose whole top bends over and hangs down one side.' },
  { id: 'hug', name: 'Hug', text: 'Tangerine. A small head on a broad pear body, with two pairs of arms.' },
  { id: 'wiggle', name: 'Wiggle', text: 'Sky blue. A tall dome with arms, standing on four short tentacles instead of legs.' },
];
export const MONSTER = {
  'lamp-blob': lampBlob, 'lamp-noodle': lampNoodle,
  'flop-blob': flopBlob, 'flop-noodle': flopNoodle,
  'hug-blob': hugBlob, 'hug-noodle': hugNoodle,
  'wiggle-blob': wiggleBlob, 'wiggle-noodle': wiggleNoodle,
};
