// The faces of the seventh round. The sixth round's answer: "Why is everyone so happy." Every face so far had
// big white eyes and an open grin. Here are ten faces at rest, none of them grinning with an open mouth, and
// built differently, not only feeling differently: dot eyes, eyes with whites, lidded eyes, eyes cut flat,
// closed eyes; brows or none; a small mouth or none; features set high, low, wide or close.
//
// Each face is drawn about the head's centre (0, 0), at the size the sixth round's face was drawn: eyes about
// 11 from the middle, the mouth about 24 below. The head itself is bigger (the top of the Blob body, radius
// 35) and its fringe comes down to about y -15 on the left and -20 on the right, so brows stay below that.
//
// Each one:  FACES[id](g)          the front face
// And, for the side views, profile faces that share the same parts: PROFILE[id](g, o)

import { circ, ell, pd, pill } from './kit.js';

export const FC = {
  SK: '#c98458', SKD: '#9a5662', NO: '#a65f3e', BR: '#5e1d3c', MO: '#7a1e3a',
  DOT: '#2b1a3c', PUPIL: '#2b2b3f', WHITE: '#ffffff', BLUSH: '#e0675e',
};
const { SK, NO, BR, MO, DOT, PUPIL, WHITE, BLUSH } = FC;

// ---------- parts ----------
// a dark eye with no white (Kurzgesagt's person eye), with a small catchlight if asked
export function dotEye(g, x, y, rx, ry, o = {}) {
  g.fill(ell(x, y, rx, ry), o.col || DOT);
  if (o.glint) g.fill(circ(x - rx * 0.32, y - ry * 0.34, o.glint), WHITE);
}
// a white eye: an oval, a round pupil (pr: its two radii) moved by look, and a catchlight
export function whiteEye(g, x, y, w, h, o = {}) {
  const { look = [0, 0], pr = [w * 0.23, h * 0.22], glint = true, pupil = PUPIL } = o;
  const p = ell(x, y, w / 2, h / 2);
  g.fill(p, WHITE);
  g.clip(p, () => {
    const px = x + look[0], py = y + look[1];
    g.fill(ell(px, py, pr[0], pr[1]), pupil);
    if (glint) g.fill(circ(px - pr[0] * 0.36, py - pr[1] * 0.38, Math.min(pr[0], pr[1]) * 0.36), WHITE);
  });
}
// a lid of skin over an eye, from the top (or the bottom), covering k of its height. Its edge can be tilted
// (slope: drop per unit to the right) and bowed (bow: how far the middle sags). A thin dark line runs along
// the edge, so the lid reads as a lid and not as a cut.
export function lid(g, x, y, w, h, k, o = {}) {
  const { slope = 0, bow = 0, col = SK, line = BR, lw = 2.2, from = 'top' } = o;
  const top = from === 'top';
  const ey = top ? y - h / 2 + h * k : y + h / 2 - h * k;
  const xl = x - w / 2 - 2, xr = x + w / 2 + 2, hw = w / 2 + 2;
  const edge = `M${xl} ${ey - slope * hw} Q${x} ${ey + bow * 2} ${xr} ${ey + slope * hw}`;
  const region = pd(`${edge} L${xr} ${top ? y - h : y + h} L${xl} ${top ? y - h : y + h} Z`);
  // the lid is filled over a slightly larger oval, so no white edge shows round it
  g.clip(ell(x, y, w / 2 + 0.9, h / 2 + 0.9), () => g.fill(region, col));
  if (line) g.clip(ell(x, y, w / 2 + 1.2, h / 2 + 1.2), () => g.line(pd(edge), line, lw));
}
// brows
const dash = (g, x, y, w, h, rot = 0, col = BR) => g.at(x, y, () => g.fill(ell(0, 0, w / 2, h / 2), col), 1, rot);
const bar = (g, x, y, w, h, rot = 0, col = BR) => g.at(x, y, () => g.fill(pill(0, 0, w, h), col), 1, rot);
const arch = (g, x, y, w, h, rot = 0, col = BR) =>
  g.at(x, y, () => g.line(pd(`M${-w / 2} ${h * 0.4} Q0 ${-h * 1.1} ${w / 2} ${h * 0.4}`), col, h), 1, rot);
// the nose: a small soft drop a little darker than the skin
const nose = (g, x = 0, y = 15.5, s = 3.6) => g.fill(ell(x, y, s * 0.82, s * 0.66), NO);
const line = (g, d, w = 2.5, col = MO) => g.line(pd(d), col, w);

// ---------- the ten ----------
export const FACE_LIST = [
  { id: 'calm', name: 'Calm', text: 'Dot eyes, no whites, set low and wide; short soft brows; a small closed smile.' },
  { id: 'plain', name: 'Plain', text: 'Eyes with whites, cut flat across the top, looking straight at you; straight brows; a flat mouth.' },
  { id: 'thinking', name: 'Thinking', text: 'Looking up and away, one brow up, the other knitted; the mouth pursed to one side.' },
  { id: 'sleepy', name: 'Sleepy', text: 'Heavy drooping lids over the whites, brows sliding down at the ends, a slack little mouth.' },
  { id: 'curious', name: 'Curious', text: 'Big whites with small pupils looking off to the side, brows up, a small round mouth.' },
  { id: 'unimpressed', name: 'Unimpressed', text: 'Lids flat across the middle, a side glance, flat brows resting on the lids, a flat mouth.' },
  { id: 'determined', name: 'Determined', text: 'Dark eyes cut flat across the top, thick brows angled down to the middle, a set mouth.' },
  { id: 'shy', name: 'Shy', text: 'Small dots looking down and away, brows tipped up in the middle, blush, a tiny mouth.' },
  { id: 'quiet', name: 'Quiet', text: 'Tall dark eyes with a glint, set high. No brows and no mouth at all.' },
  { id: 'dry', name: 'Dry', text: 'Eyes closed, one brow raised, a small lopsided closed smirk. Pleased with itself.' },
];

export const FACES = {
  // 1. Calm: Kurzgesagt's way of drawing a person's eyes. Small, dark, no white, set lower and wider apart.
  calm(g) {
    for (const k of [-1, 1]) dotEye(g, k * 12.5, 6, 4.3, 5.6, { glint: 1.15 });
    for (const k of [-1, 1]) dash(g, k * 13, -5.5, 10.5, 3.2, k * 0.06);
    nose(g, 0, 15.5);
    line(g, 'M-4.6 23.6 Q0 26.2 4.6 23.6', 2.5);
  },
  // 2. Plain: eyes with whites at you, their tops cut flat by the skin (no lid line: with one it read as
  // bored), straight brows, a flat mouth. Neutral.
  plain(g) {
    for (const k of [-1, 1]) {
      whiteEye(g, k * 10.5, 4, 13.5, 15.5, { look: [0, 0.8], pr: [3.2, 3.3] });
      lid(g, k * 10.5, 4, 13.5, 15.5, 0.2, { line: null });
    }
    for (const k of [-1, 1]) bar(g, k * 11, -8.2, 10.5, 2.8);
    nose(g, 0, 15.5);
    g.fill(pill(0, 24.5, 9, 2.7), MO);
  },
  // 3. Thinking: looking up and away; the left brow lifted, the right one drawn down; the mouth a short
  // twist off to one side.
  thinking(g) {
    for (const k of [-1, 1]) whiteEye(g, k * 10.5, 4, 14, 17, { look: [-3.1, -3.7], pr: [3.3, 3.8] });
    arch(g, -11, -10.8, 11.5, 3.1, -0.14);
    bar(g, 11.5, -7, 11, 3, -0.2);
    nose(g, 0, 15.5);
    line(g, 'M1.5 24.6 Q5.5 25.6 9.2 22.6', 2.5);
  },
  // 4. Sleepy: heavy lids that droop at the outer ends, the pupils low, brows sliding down at the ends.
  sleepy(g) {
    for (const k of [-1, 1]) {
      whiteEye(g, k * 11, 6, 15, 16, { look: [0, 2.6], pr: [3.4, 3.8], glint: false });
      lid(g, k * 11, 6, 15, 16, 0.56, { slope: k * 0.14, bow: 1.4 });
    }
    for (const k of [-1, 1]) dash(g, k * 12, -3.8, 11, 3, k * 0.2);
    nose(g, 0, 16);
    line(g, 'M-3.4 24.6 Q0 25.8 3.4 24.4', 2.4);
  },
  // 5. Curious: big whites, small pupils looking off to one side, brows up, a small round mouth.
  curious(g) {
    for (const k of [-1, 1]) whiteEye(g, k * 11, 3, 15.5, 18, { look: [3.4, -1.1], pr: [2.9, 3.3] });
    arch(g, -11.5, -11.2, 11, 3, -0.08);
    arch(g, 11.5, -14.2, 11, 3, 0.1);
    nose(g, 0, 15);
    g.fill(ell(1.5, 24, 2.7, 3.2), MO);
  },
  // 6. Unimpressed: lids flat across the middle, the pupils slid to one side, flat brows down on the lids,
  // a flat mouth that dips at one end.
  unimpressed(g) {
    for (const k of [-1, 1]) {
      whiteEye(g, k * 11, 5, 15, 15, { look: [-3.8, 1.8], pr: [3.3, 3.6] });
      lid(g, k * 11, 5, 15, 15, 0.5);
    }
    for (const k of [-1, 1]) bar(g, k * 11, -4.6, 13, 3.1);
    nose(g, 0, 15.5);
    line(g, 'M-6.5 24 L2.5 24 Q5.6 24.1 7.2 26', 2.5);
  },
  // 7. Determined: dark eyes cut flat along the brow's angle, thick brows angled down to the middle (not so
  // steeply that it reads as angry), a set mouth with one corner lifted.
  determined(g) {
    for (const k of [-1, 1]) {
      const x = k * 11, y = 6;
      // keep what lies below a line that runs down towards the nose
      g.clip(pd(`M${x + k * 8} ${y - 6.2} L${x - k * 8} ${y - 3.6} L${x - k * 8} ${y + 12} L${x + k * 8} ${y + 12} Z`),
        () => g.fill(ell(x, y, 5, 6.2), DOT));
      g.fill(circ(x - 1.8, y - 0.8, 1.2), WHITE);
    }
    for (const k of [-1, 1]) bar(g, k * 11, -3.6, 13.5, 4.2, -k * 0.2);
    nose(g, 0, 15.5);
    line(g, 'M-6 24.8 L3.4 24.8 Q5.8 24.7 7.2 23', 2.8);
  },
  // 8. Shy: small dots looking down and away, brows tipped up in the middle, a blush, a tiny mouth. All the
  // features sit low and close together.
  shy(g) {
    for (const k of [-1, 1]) g.fill(ell(k * 17.5, 16.5, 6, 3.3), BLUSH, 0.8);
    for (const k of [-1, 1]) dotEye(g, k * 10.5 + 2, 9.5, 3.9, 4.8, { glint: 1 });
    for (const k of [-1, 1]) dash(g, k * 11, -0.5, 10, 3, k * 0.3);
    nose(g, 0.5, 17);
    line(g, 'M-2.2 25.6 Q1 27 4.2 25.1', 2.4);
  },
  // 9. Quiet: tall dark eyes with a glint, set high and a little wider. Nothing else but the nose.
  quiet(g) {
    for (const k of [-1, 1]) dotEye(g, k * 11.5, 0.5, 4.6, 8, { glint: 1.7 });
    nose(g, 0, 15);
  },
  // 10. Dry: eyes shut in two soft lines, one brow raised, a small closed smirk to one side.
  dry(g) {
    for (const k of [-1, 1]) line(g, `M${k * 11 - 6} 5 Q${k * 11} 9.2 ${k * 11 + 6} 5`, 2.7, DOT);
    dash(g, -11.5, -4, 11, 3.1, 0.04);
    arch(g, 11.5, -10.8, 11, 3, 0.08);
    nose(g, 0, 15.5);
    line(g, 'M-4.6 24.6 Q1.6 26 6.8 21.8', 2.5);
  },
};

// ---------- profiles ----------
// The same faces seen from the side, for the side views. Facing left. Drawn about a point that is the front
// of the face at eye height (fx, fy): the eye sits about 13 behind it, the brow above, the mouth near the
// front edge below. The nose is part of the head's outline, so the builder draws it, not the face.
export const PROFILE = {
  // the calm face: one dark eye, a short brow, the corner of a small closed smile
  calm(g, fx, fy, s = 1) {
    g.at(fx, fy, () => {
      dotEye(g, 13.5, 1.5, 3.4, 5.5, { glint: 1.1 });
      dash(g, 13, -9, 8.5, 3, -0.08);
      line(g, 'M2.6 17.6 Q6 19.8 9.4 17.6', 2.5);
    }, s);
  },
  // the plain face: a white eye with its pupil at the front and a slight lid
  plain(g, fx, fy, s = 1, o = {}) {
    const { look = [-2.2, 0.6], k = 0.24 } = o;
    g.at(fx, fy, () => {
      whiteEye(g, 14, 1.5, 10.5, 15.5, { look, pr: [2.9, 3.4] });
      lid(g, 14, 1.5, 10.5, 15.5, k);
      bar(g, 13.5, -10, 9, 3, 0.04);
      line(g, 'M2.6 18 Q5.8 19.4 9 17.8', 2.5);
    }, s);
  },
};
