// The series' visual code: one way of drawing each invisible thing, kept for every animation (both studies:
// "give each invisible quantity one visual vocabulary and keep it for the whole video", docs/research). Every
// part that draws on a canvas draws these from here, so the globe, the sea and sky and the close-up of
// molecules always agree, and a future topic gets them for nothing.
//
//   heat flowing     small warm rounded triangles pointing the way it flows; more of them = more heat    heat()
//   temperature      the thing's own colour shifting (with a small overshoot) and a number on a sign     sign()
//   moving air       pale cyan dashed rounded arrows, the dashes running along                           air()
//   water vapour     pale translucent round puffs                                                        puff()
//   cloud            billows of overlapping puffs in three tones: lit, lavender, violet shade            cloud()
//   spin             thin arc streaks circling a still shape                                             streaks()
//   a term           a built label: a dot, a bent leader line, a pill that unrolls with its word         label()
//   molecules        glossy stamps: water (one big atom, two small), air (two atoms)                     molecule()
//
// Everything is a pure function of what it's given (positions, an age in ms, a phase), so any frame can be
// drawn on its own, and nothing blurs: glows are gradients or ready-made stamps (DECISIONS, 2026-11-17).

import { MOTION, clamp01, lerp } from './ease.js';

const TAU = Math.PI * 2;
const parse = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgba = (hex, a = 1) => { const [r, g, b] = parse(hex); return `rgba(${r},${g},${b},${a})`; };
export const mixHex = (a, b, k) => { const x = parse(a), y = parse(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], clamp01(k))).toString(16).padStart(2, '0')).join(''); };

// The palette of the code. One meaning per colour, for the whole series.
export const CODE = {
  heat: { body: '#ffa63d', tip: '#ffe7a3', glow: '#ff9a3c' },
  air: { line: '#8fdcff', light: '#e2f7ff', shade: 'rgba(6,8,48,0.35)' },
  vapour: { fill: '#d7f1ff', light: '#ffffff' },
  cloud: { shade: '#5446a8', mid: '#a69be8', lit: '#ebe7ff', warm: '#ffd9b0' },
  water: { deep: '#0f1f78', mid: '#1c3fb0', molecule: '#36b9ff', light: '#c9f3ff', hydrogen: '#8fe1ff' },
  airMolecule: { body: '#b6aef2', light: '#f3f1ff' },
  pill: { fill: '#7b4cf0', under: '#4f2bb0', text: '#ffffff' },
  sign: { pink: ['#ee4b7a', '#b02e5a'], cyan: ['#2aa6e0', '#1a6fa6'], gold: ['#f2a31b', '#b26f0a'], violet: ['#7b4cf0', '#4f2bb0'] },
  font: '"Nunito", system-ui, sans-serif',
};

// ---------------------------------------------------------------- heat

// One mark of heat: a warm rounded triangle at x, y pointing along `angle` (radians on the screen: -PI/2 is up),
// s its half height in pixels, a its opacity. A soft warm glow sits behind it.
export function heat(g, x, y, s, angle = -Math.PI / 2, a = 1) {
  if (a <= 0.01 || s <= 0.3) return;
  g.save();
  g.translate(x, y);
  g.rotate(angle + Math.PI / 2);
  g.globalAlpha *= a;
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, s * 2.4);
  glow.addColorStop(0, rgba(CODE.heat.glow, 0.42)); glow.addColorStop(1, rgba(CODE.heat.glow, 0));
  g.fillStyle = glow; g.beginPath(); g.arc(0, 0, s * 2.4, 0, TAU); g.fill();
  const tri = k => { g.beginPath(); g.moveTo(0, -s * k); g.lineTo(s * 0.86 * k, s * 0.62 * k); g.lineTo(-s * 0.86 * k, s * 0.62 * k); g.closePath(); };
  g.lineJoin = 'round';
  g.lineWidth = s * 0.5;
  g.fillStyle = CODE.heat.body; g.strokeStyle = CODE.heat.body;
  tri(0.86); g.fill(); g.stroke();
  g.fillStyle = CODE.heat.tip; g.strokeStyle = CODE.heat.tip; g.lineWidth = s * 0.22;
  g.translate(0, -s * 0.18);
  tri(0.42); g.fill(); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- moving air

// Air moving along a line of screen points: a dashed rounded line whose dashes run the way it goes (phase:
// how far they've run, in dash lengths: a process, linear), with an arrowhead at its end. drawn (0..1) shows
// only the first part of the line, for an arrow drawing itself on; w its width; a its opacity.
export function air(g, pts, { phase = 0, drawn = 1, w = 5, a = 1, colour = CODE.air.line, head = true, dash = 2.2, gap = 1.6 } = {}) {
  if (a <= 0.01 || pts.length < 2 || drawn <= 0) return;
  const run = [0];
  for (let i = 1; i < pts.length; i++) run.push(run[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = run[run.length - 1], upto = total * clamp01(drawn);
  if (upto < 2) return;
  const line = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (run[i] <= upto) { line.push(pts[i]); continue; }
    const f = (upto - run[i - 1]) / Math.max(1e-6, run[i] - run[i - 1]);
    line.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]);
    break;
  }
  const n = line.length, end = line[n - 1], back = line[Math.max(0, n - 2)];
  let dx = end[0] - back[0], dy = end[1] - back[1];
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const hs = w * 2.1, stop = head ? hs * 0.6 : 0;
  g.save();
  g.globalAlpha *= a;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const D = dash * w, G = gap * w + w;
  const stroke = (ox, oy, col, lw) => {
    g.setLineDash([D, G]);
    g.lineDashOffset = -phase * (D + G);
    g.strokeStyle = col; g.lineWidth = lw;
    g.beginPath(); g.moveTo(line[0][0] + ox, line[0][1] + oy);
    for (let i = 1; i < n - 1; i++) g.lineTo(line[i][0] + ox, line[i][1] + oy);
    g.lineTo(end[0] - dx * stop + ox, end[1] - dy * stop + oy);
    g.stroke();
  };
  stroke(0, w * 0.45, CODE.air.shade, w);
  stroke(0, 0, colour, w);
  g.setLineDash([]);
  if (head) {
    const tri = (ox, oy, col) => {
      g.fillStyle = col; g.strokeStyle = col; g.lineWidth = w * 0.5;
      g.beginPath();
      g.moveTo(end[0] + dx * hs * 0.55 + ox, end[1] + dy * hs * 0.55 + oy);
      g.lineTo(end[0] - dx * hs * 0.7 - dy * hs * 0.75 + ox, end[1] - dy * hs * 0.7 + dx * hs * 0.75 + oy);
      g.lineTo(end[0] - dx * hs * 0.7 + dy * hs * 0.75 + ox, end[1] - dy * hs * 0.7 - dx * hs * 0.75 + oy);
      g.closePath(); g.fill(); g.stroke();
    };
    tri(0, w * 0.45, CODE.air.shade);
    tri(0, 0, colour);
  }
  g.restore();
}

// An arrowhead alone, at x, y, pointing along dx, dy, in the moving-air look (for a loop that's drawn whole).
export function arrowHead(g, x, y, dx, dy, w = 5, colour = CODE.air.line, a = 1) {
  const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const hs = w * 2.1;
  g.save();
  g.globalAlpha *= a;
  for (const [oy, col] of [[w * 0.45, CODE.air.shade], [0, colour]]) {
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = w * 0.5; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(x + dx * hs * 0.6, y + dy * hs * 0.6 + oy);
    g.lineTo(x - dx * hs * 0.65 - dy * hs * 0.75, y - dy * hs * 0.65 + dx * hs * 0.75 + oy);
    g.lineTo(x - dx * hs * 0.65 + dy * hs * 0.75, y - dy * hs * 0.65 - dx * hs * 0.75 + oy);
    g.closePath(); g.fill(); g.stroke();
  }
  g.restore();
}

// An arrow that keeps drawing itself along a path, over and over (study 2, 1.7: inflow arrows on a 2 s loop):
// at loop phase q (0..1) its head is eased out along the path and its tail follows, fading as it ends. Returns
// the [head, tail] shares of the path, for anything riding it.
export function loopShare(q, len = 0.55) {
  const head = 1 - Math.pow(1 - clamp01(q / 0.8), 2);
  return [head, Math.max(0, head - len)];
}

// Points along a path (a function of 0..1 to [x, y]) from s0 to s1.
export function along(path, s0, s1, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(path(lerp(s0, s1, i / n)));
  return out;
}

// ---------------------------------------------------------------- vapour and cloud

// One puff of water vapour: three soft round lobes as one pale, see-through shape, lit from the top left.
export function puff(g, x, y, r, a = 1, turn = 0) {
  if (a <= 0.01 || r <= 0.3) return;
  const lobes = [[0, 0, 1], [-0.62 * Math.cos(turn), 0.28, 0.68], [0.58 * Math.cos(turn + 0.6), 0.32, 0.6]];
  const shape = new Path2D();
  for (const [ox, oy, k] of lobes) { shape.moveTo(x + ox * r + k * r, y + oy * r); shape.arc(x + ox * r, y + oy * r, k * r, 0, TAU); }
  g.save();
  g.globalAlpha *= a;
  g.fillStyle = rgba(CODE.vapour.fill, 0.5);
  g.fill(shape);
  g.fillStyle = rgba(CODE.vapour.light, 0.4);
  g.beginPath(); g.arc(x - r * 0.28, y - r * 0.3, r * 0.42, 0, TAU); g.fill();
  g.restore();
}

// A cloud: puffs [{ x, y, r }] on the screen, drawn as billows in three tones (a violet shade showing in the
// gaps and below, a lavender body, a lit face up and to the left), each tone one shape so nothing overlaps
// in see-through layers. warm (0..1) tints the lit face, when heat is being let go inside it.
export function cloud(g, puffs, { warm = 0, a = 1 } = {}) {
  if (!puffs.length || a <= 0.01) return;
  const mid = mixHex(CODE.cloud.mid, '#d9a0c8', warm * 0.5), lit = mixHex(CODE.cloud.lit, CODE.cloud.warm, warm * 0.55);
  g.save();
  g.globalAlpha *= a;
  // a deep shade behind the whole cloud, showing in the gaps between billows and along its underside
  const back = new Path2D();
  for (const q of puffs) { if (q.r < 0.4) continue; back.moveTo(q.x + q.r * 0.1 + q.r * 1.04, q.y + q.r * 0.2); back.ellipse(q.x + q.r * 0.1, q.y + q.r * 0.2, q.r * 1.04, q.r * 1.04 * (q.f || 1), 0, 0, TAU); }
  g.fillStyle = CODE.cloud.shade; g.fill(back);
  // then each billow from the back (highest) to the front (lowest), each with its own shaded rim, body and lit
  // face, so the front ones overlap the ones behind with a dark scallop: the cauliflower look
  const order = puffs.filter(q => q.r >= 0.4).sort((p, q) => p.y - q.y || p.x - q.x);
  // a billow can be squashed (f < 1: flatter, as along an anvil's top)
  const disc = (x, y, r, f = 1) => { g.beginPath(); g.ellipse(x, y, r, r * f, 0, 0, TAU); g.fill(); };
  for (const q of order) {
    const f = q.f || 1;
    g.fillStyle = CODE.cloud.shade; disc(q.x + q.r * 0.05, q.y + q.r * 0.12 * f, q.r, f);
    g.fillStyle = mid; disc(q.x, q.y, q.r * 0.93, f);
    g.fillStyle = lit; disc(q.x - q.r * 0.16, q.y - q.r * 0.19 * f, q.r * 0.7, f);
  }
  g.restore();
}

// ---------------------------------------------------------------- spin

// Spin, shown by streaks, not by turning the thing (study 2, 1.8): thin translucent arcs circling a still
// shape at x, y of radius R. t in seconds; dir 1 turns counterclockwise on the screen (a storm north of the
// equator, seen from above), -1 clockwise. Inner streaks go faster.
export function streaks(g, x, y, R, t, dir = 1, a = 1) {
  if (a <= 0.01 || R < 2) return;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const rr = R * (1.02 + (i % 5) * 0.14 + Math.floor(i / 5) * 0.06);
    const speed = 1.5 * Math.pow(R / rr, 1.5);
    const span = 0.55 + ((i * 0.37) % 0.5);
    const a0 = i * 2.4 - dir * t * speed;
    const steps = 6;
    // the head leads the way it turns (at a0) and is brightest; the tail fades behind it
    for (let j = 0; j < steps; j++) {
      const f0 = j / steps, f1 = (j + 1) / steps;
      g.globalAlpha = a * 0.5 * f1 * f1;
      g.strokeStyle = '#ffffff';
      g.lineWidth = Math.max(1.2, R * 0.045) * (0.5 + 0.5 * f1);
      g.beginPath();
      g.arc(x, y, rr, a0 + dir * span * (1 - f0), a0 + dir * span * (1 - f1), dir > 0);
      g.stroke();
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- signs and labels

const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

// A sign standing in the world (study 2, 1.6: a pole rises out of the sea at constant speed, 500 ms, then the
// board pops open on a spring to +12%): x, y where its foot is, h the pole's height, age ms since it was
// called, out (0..1) how far it has gone again. colour: pink, cyan, gold or violet. width: the screen's, to
// keep the board on it. Returns the board's box.
export function sign(g, x, y, text, { age = 1e6, h = 70, colour = 'pink', out = 0, width = Infinity, scale = 1 } = {}) {
  const rise = clamp01(age / 500), board = MOTION.prop.ease(clamp01((age - 500) / 350));
  const a = 1 - clamp01(out);
  if (a <= 0.01 || rise <= 0) return null;
  const [face, under] = CODE.sign[colour] || CODE.sign.pink;
  g.save();
  g.globalAlpha *= a;
  const top = y - h * rise * scale;
  // where it stands: a small ring on the surface
  g.strokeStyle = rgba('#ffffff', 0.45); g.lineWidth = 2 * scale;
  g.beginPath(); g.ellipse(x, y, 9 * scale * rise, 2.6 * scale * rise, 0, 0, TAU); g.stroke();
  g.strokeStyle = face; g.lineWidth = 4 * scale; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, top); g.stroke();
  let box = null;
  if (board > 0.001) {
    g.font = `900 ${Math.round(16 * scale)}px ${CODE.font}`;
    const tw = g.measureText(text).width + 24 * scale, th = 32 * scale;
    let bx = x - tw / 2;
    bx = Math.max(8, Math.min(width - tw - 8, bx));
    const by = top - th;
    g.save();
    g.translate(x, top);
    g.scale(board, board);
    g.translate(-x, -top);
    g.fillStyle = under; roundRect(g, bx, by + 4 * scale, tw, th, 7 * scale); g.fill();
    g.fillStyle = face; roundRect(g, bx, by, tw, th, 7 * scale); g.fill();
    g.fillStyle = rgba('#ffffff', 0.18); roundRect(g, bx + 3 * scale, by + 3 * scale, tw - 6 * scale, th * 0.38, 5 * scale); g.fill();
    g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, bx + tw / 2, by + th / 2 + 1);
    g.restore();
    box = [bx, by, tw, th];
  }
  g.restore();
  return box;
}

// A built label (study 2, 1.3): an anchor dot pops on the thing (0 to 150 ms), a leader line bends up and
// away from it (linear, 330 ms), then a pill unrolls sideways from the leader's end with its word sliding in
// inside it (ease-out, 680 ms). Readable about 1.1 s after it starts. side: 1 to the right, -1 to the left
// (it turns round on its own if there's no room); out: 0..1 gone again. Returns the pill's box.
export function label(g, ax, ay, text, { age = 1e6, side = 1, out = 0, width = Infinity, rise = 34, reach = 26, colour = CODE.pill.fill } = {}) {
  const a = 1 - clamp01(out);
  if (a <= 0.01) return null;
  g.save();
  g.font = `800 14px ${CODE.font}`;
  const tw = g.measureText(text).width + 22, th = 28;
  const ex0 = ax + side * reach, ey = ay - rise;
  if (side > 0 && ex0 + 10 + tw > width - 6) side = -1;
  else if (side < 0 && ex0 - 10 - tw < 6) side = 1;
  const ex = ax + side * reach;
  const dotK = MOTION.furniture.ease(clamp01(age / 150));
  const lead = MOTION.leader.ease(clamp01((age - 100) / 330));
  const pill = MOTION.furniture.ease(clamp01((age - 430) / 680));
  g.globalAlpha *= a;
  // the leader: up and out from the dot, then a short level run to the pill
  const elbow = [ax + side * reach * 0.55, ey];
  const pts = [[ax, ay], elbow, [ex, ey]];
  const L1 = Math.hypot(elbow[0] - ax, elbow[1] - ay), L2 = Math.abs(ex - elbow[0]), L = L1 + L2;
  if (lead > 0) {
    g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(ax, ay);
    const d = lead * L;
    if (d <= L1) g.lineTo(lerp(ax, elbow[0], d / L1), lerp(ay, elbow[1], d / L1));
    else { g.lineTo(elbow[0], elbow[1]); g.lineTo(lerp(elbow[0], pts[2][0], (d - L1) / Math.max(1e-6, L2)), ey); }
    g.stroke();
  }
  // the dot on the thing: a white centre ringed in the pill's colour
  g.fillStyle = colour; g.beginPath(); g.arc(ax, ay, 5.5 * dotK, 0, TAU); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ax, ay, 2.8 * dotK, 0, TAU); g.fill();
  let box = null;
  if (pill > 0.001) {
    const w = tw * pill, x0 = side > 0 ? ex : ex - w;
    g.fillStyle = CODE.pill.under; roundRect(g, x0, ey - th / 2 + 3, w, th, th / 2); g.fill();
    g.fillStyle = colour; roundRect(g, x0, ey - th / 2, w, th, th / 2); g.fill();
    g.save();
    roundRect(g, x0, ey - th / 2, w, th, th / 2); g.clip();
    g.fillStyle = CODE.pill.text; g.textBaseline = 'middle'; g.textAlign = 'left';
    // the word slides in with the pill, from the leader's side
    const tx = side > 0 ? ex + 11 - (1 - pill) * tw * 0.5 : ex - tw + 11 + (1 - pill) * tw * 0.5;
    g.fillText(text, tx, ey + 1);
    g.restore();
    box = [side > 0 ? ex : ex - tw, ey - th / 2, tw, th];
  }
  g.restore();
  return box;
}

// A term's pill alone, centred at x, y (a route's name in a scene, where its line is the leader). Kept on the
// screen's width.
export function pill(g, text, x, y, { a = 1, width = Infinity, colour = CODE.pill.fill } = {}) {
  if (a <= 0.01) return;
  g.save();
  g.globalAlpha *= a;
  g.font = `800 14px ${CODE.font}`;
  const tw = g.measureText(text).width + 22, th = 28;
  x = Math.max(tw / 2 + 6, Math.min(width - tw / 2 - 6, x));
  g.fillStyle = CODE.pill.under; roundRect(g, x - tw / 2, y - th / 2 + 3, tw, th, th / 2); g.fill();
  g.fillStyle = colour; roundRect(g, x - tw / 2, y - th / 2, tw, th, th / 2); g.fill();
  g.fillStyle = CODE.pill.text; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x, y + 1);
  g.restore();
}

// ---------------------------------------------------------------- molecules

// Molecules are ready-made stamps (a gradient each, drawn once per size), placed each frame with drawImage:
// cheap enough for a few hundred on the phone. kind: water (an oxygen atom with two hydrogens) or air (two
// atoms, as nitrogen and oxygen are). r: the big atom's radius in pixels. warm (0..1) tints it.
const stamps = new Map();
function stamp(kind, r, warm, dpr) {
  const key = `${kind}:${Math.round(r * 2)}:${Math.round(warm * 6)}:${dpr}`;
  let s = stamps.get(key);
  if (s) return s;
  const R = Math.round(r * 2) / 2, pad = R * 1.9, size = Math.ceil((R + pad) * 2 * dpr);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  const o = R + pad;
  const ball = (x, y, rr, body, light) => {
    const gr = g.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.1, x, y, rr);
    gr.addColorStop(0, light); gr.addColorStop(0.55, body); gr.addColorStop(1, mixHex(body, '#0a1260', 0.35));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    g.strokeStyle = rgba(light, 0.55); g.lineWidth = Math.max(0.8, rr * 0.08); g.beginPath(); g.arc(x, y, rr * 0.92, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
  };
  const halo = (x, y, rr, col) => { const gr = g.createRadialGradient(x, y, rr * 0.6, x, y, rr * 1.9); gr.addColorStop(0, rgba(col, 0.28)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr * 1.9, 0, TAU); g.fill(); };
  if (kind === 'water') {
    const body = mixHex(CODE.water.molecule, '#ff9a6a', warm * 0.45), hyd = mixHex(CODE.water.hydrogen, '#ffc29a', warm * 0.45);
    halo(o, o, R, body);
    const hx = Math.cos(0.92) * R * 0.95, hy = Math.sin(0.92) * R * 0.95;
    ball(o - hx, o + hy * 0.15 - R * 0.55, R * 0.56, hyd, '#ffffff');
    ball(o + hx, o + hy * 0.15 - R * 0.55, R * 0.56, hyd, '#ffffff');
    ball(o, o, R, body, CODE.water.light);
  } else {
    const body = mixHex(CODE.airMolecule.body, '#ffb08a', warm * 0.5);
    halo(o, o, R, body);
    ball(o - R * 0.5, o, R * 0.78, body, CODE.airMolecule.light);
    ball(o + R * 0.5, o, R * 0.78, body, CODE.airMolecule.light);
  }
  s = { c, half: o };
  if (stamps.size > 400) stamps.clear();
  stamps.set(key, s);
  return s;
}
export function molecule(g, kind, x, y, r, { angle = 0, a = 1, warm = 0, dpr = 1 } = {}) {
  if (a <= 0.01 || r < 0.5) return;
  const s = stamp(kind, r, warm, dpr);
  g.save();
  g.globalAlpha *= a;
  g.translate(x, y);
  if (angle) g.rotate(angle);
  g.drawImage(s.c, -s.half, -s.half, s.half * 2, s.half * 2);
  g.restore();
}

// A soft glow: a gradient disc (never a blur).
export function glow(g, x, y, r, colour, a = 1) {
  if (a <= 0.01 || r <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(colour, 0.5 * a)); gr.addColorStop(0.5, rgba(colour, 0.18 * a)); gr.addColorStop(1, rgba(colour, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
