// The bookcase: where the less tangible topics live. Each topic is a run of books in its own colour
// with its own small mark on every spine. A topic gains a book at each milestone, so runs are different
// lengths, and empty shelf is room to grow. A topic being forgotten shows on its books: dulled and dusty.
//
// The bookcase is drawn in its own coordinates: (0, 0, 0) is its back, bottom, left corner.
// The same drawing is used in the room and, much larger and seen more from the front, when it is opened.

import { rng, lerp } from './ease.js';
import { pen, rr, circ, ell, pd, poly, cobweb, PI, TAU } from './draw.js';
import { makeView, cssGrad, ANGLES } from './view.js';

export const CASE = { W: 80, DEP: 26, H: 150 };
const SIDE = 4.5, BOT = 9, TOPB = 5, BOARD = 4, ZB = 3, ZF = 23;
const bayH = (CASE.H - TOPB - BOT - 3 * BOARD) / 4;
export const BAYS = [0, 1, 2, 3].map(i => [BOT + i * (bayH + BOARD), BOT + i * (bayH + BOARD) + bayH]);   // bottom to top
const WOOD = '#c0824f', WOOD_L = '#dba571', WOOD_D = '#9a6238';

// Made up for the sketch: the topics, how many books each has earned so far, and how well each is remembered.
export const TOPICS = [
  { id: 'philosophy', name: 'Philosophy', col: '#7a5af0', mark: 'flame', books: 7, mem: 0.86, bay: 3, h: 26, w: 4.6 },
  { id: 'ethics', name: 'Ethics', col: '#2bc4a4', mark: 'heart', books: 3, mem: 0.78, bay: 3, h: 22.5, w: 5.2 },
  { id: 'japanese', name: 'Japanese', col: '#ee4b7a', mark: 'ring', books: 5, mem: 0.7, bay: 2, h: 24, w: 4.4 },
  { id: 'rhetoric', name: 'Rhetoric', col: '#ffc83d', mark: 'speech', books: 1, mem: 0.92, bay: 2, h: 27, w: 6.4 },
  { id: 'logic', name: 'Logic', col: '#3b6fd6', mark: 'dots', books: 4, mem: 0.2, fading: true, bay: 1, h: 23, w: 5 },
  { id: 'music', name: 'Music theory', col: '#ff7a59', mark: 'note', books: 2, mem: 0.6, bay: 1, h: 25.5, w: 6 },
];

// where every book stands
export const RUNS = (() => {
  const runs = [], next = BAYS.map(() => SIDE + 1.6);
  for (const tp of TOPICS) {
    const r = rng(tp.id.length * 97 + tp.books), [hb] = BAYS[tp.bay];
    let x = next[tp.bay];
    const books = [];
    for (let i = 0; i < tp.books; i++) {
      const w = tp.w + (r() - 0.5) * 0.9, h = Math.min(bayH - 2.5, tp.h + (r() - 0.5) * 1.6);
      books.push({ x0: x, x1: x + w, h, tone: [0, 0.07, -0.05, 0.04, -0.08, 0.06, -0.02][i % 7] });
      x += w + 0.3;
    }
    runs.push({ ...tp, hb, x0: books[0].x0, x1: books[books.length - 1].x1, top: Math.max(...books.map(b => b.h)), books });
    next[tp.bay] = x + 2.6;
  }
  return runs;
})();
const BOOKENDS = BAYS.map((_, i) => ({ bay: i, x: RUNS.filter(r => r.bay === i).reduce((m, r) => Math.max(m, r.x1 + 0.5), SIDE + 1.6) }));

// a view whose origin is the bookcase's back, bottom, left corner
export function caseView(angle) { const a = typeof angle === 'string' ? ANGLES[angle] : angle; return makeView(a, { yF: a.k, D: 1 }); }

// the little mark on a spine, centred at (x, y), about s across
function mark(g, kind, x, y, s, col) {
  const { ctx } = g;
  ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'flame') {
    // a lamp's flame: a tip that curls, sitting on a little bowl
    ctx.fill(pd(`M${x + s * 0.06} ${y - s * 0.66} C${x - s * 0.14} ${y - s * 0.42} ${x + s * 0.4} ${y - s * 0.24} ${x + s * 0.3} ${y + s * 0.06} C${x + s * 0.24} ${y + s * 0.26} ${x - s * 0.24} ${y + s * 0.26} ${x - s * 0.3} ${y + s * 0.04} C${x - s * 0.36} ${y - s * 0.24} ${x - s * 0.02} ${y - s * 0.36} ${x + s * 0.06} ${y - s * 0.66}Z`));
    ctx.fill(pd(`M${x - s * 0.42} ${y + s * 0.3} L${x + s * 0.42} ${y + s * 0.3} Q${x + s * 0.36} ${y + s * 0.56} ${x} ${y + s * 0.58} Q${x - s * 0.36} ${y + s * 0.56} ${x - s * 0.42} ${y + s * 0.3}Z`));
  }
  else if (kind === 'heart') ctx.fill(pd(`M${x} ${y + s * 0.45} C${x - s * 0.6} ${y} ${x - s * 0.5} ${y - s * 0.52} ${x} ${y - s * 0.2} C${x + s * 0.5} ${y - s * 0.52} ${x + s * 0.6} ${y} ${x} ${y + s * 0.45}Z`));
  else if (kind === 'ring') { ctx.lineWidth = s * 0.2; ctx.beginPath(); ctx.arc(x, y, s * 0.36, -1.1, PI * 1.55); ctx.stroke(); }
  else if (kind === 'dots') for (const [dx, dy] of [[0, -0.3], [-0.3, 0.24], [0.3, 0.24]]) ctx.fill(circ(x + dx * s, y + dy * s, s * 0.14));
  else if (kind === 'note') { ctx.fill(ell(x - s * 0.12, y + s * 0.3, s * 0.2, s * 0.15, -0.4)); ctx.fillRect(x + s * 0.04, y - s * 0.46, s * 0.1, s * 0.76); ctx.fill(pd(`M${x + s * 0.06} ${y - s * 0.46} q${s * 0.36} ${s * 0.14} ${s * 0.26} ${s * 0.42} q-${s * 0.04} -${s * 0.2} -${s * 0.26} -${s * 0.22}Z`)); }
  else if (kind === 'speech') { ctx.fill(rr(x - s * 0.42, y - s * 0.36, s * 0.84, s * 0.56, s * 0.2)); ctx.fill(pd(`M${x - s * 0.18} ${y + s * 0.14} l-${s * 0.16} ${s * 0.32} l${s * 0.36} -${s * 0.3}Z`)); }
}

function book(g, v, b, run, detail) {
  const { ctx } = g, hb = run.hb, h1 = hb + b.h, w = b.x1 - b.x0;
  const col = b.tone >= 0 ? g.mix(run.col, '#ffffff', b.tone) : g.mix(run.col, '#1a1056', -b.tone);
  const sil = v.box(g, { x0: b.x0, x1: b.x1, z0: ZB, z1: ZF, h0: hb, h1 }, run.col, {
    r: 0.7, lt: 0.3, hl: 0.5, grad: false,
    top: () => {
      // the tops of the pages, between the covers
      g.flat(rr(b.x0 + 0.45, ZB + 0.4, w - 0.9, ZF - ZB - 1.6, 0.4), '#f4ead6');
      if (detail) for (let z = ZB + 2.2; z < ZF - 2; z += 2.4) { ctx.fillStyle = 'rgba(160,130,90,0.22)'; ctx.fillRect(b.x0 + 0.6, z, w - 1.2, 0.35); }
      if (run.fading) {
        ctx.fillStyle = 'rgba(205,212,240,0.55)'; ctx.fillRect(b.x0, ZB, w, ZF - ZB);
        const r = rng(Math.round(b.x0 * 13));
        for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(236,240,255,${0.5 + r() * 0.4})`; ctx.fill(ell(b.x0 + r() * w, ZB + r() * (ZF - ZB), 0.35 + r() * 0.4, 0.3 + r() * 0.3)); }
      }
    },
    front: () => {
      // each book a little lighter or darker than its neighbour, then two bands and the topic's mark
      ctx.fillStyle = col; ctx.fill(rr(b.x0, -h1, w, b.h, 0.7));
      ctx.fillStyle = cssGrad(ctx, b.x0, 0, b.x1, 0, [[0, 'rgba(255,255,255,0.2)'], [0.3, 'rgba(255,255,255,0)'], [0.75, 'rgba(26,16,86,0)'], [1, 'rgba(26,16,86,0.28)']]);
      ctx.fillRect(b.x0, -h1, w, b.h);
      const dark = g.dk(run.col, 0.35, 0.8);
      g.flat(rr(b.x0 + 0.35, -h1 + 2.2, w - 0.7, 0.85, 0.2), '#ffe8a8', 0.9);
      g.flat(rr(b.x0 + 0.35, -hb - 3.2, w - 0.7, 0.85, 0.2), '#ffe8a8', 0.9);
      ctx.fillStyle = dark; ctx.fillRect(b.x0 + 0.35, -h1 + 3.3, w - 0.7, 0.4);
      mark(g, run.mark, b.x0 + w / 2, -hb - b.h * 0.6, Math.min(w * 0.72, 4), g.c('#fff3d6', 0.95));
    },
  });
  return sil;
}

// The whole bookcase. v: a view whose origin is its back, bottom, left corner.
// o.detail: draw the fine lines that only show when it is large.
export function drawBookcase(g0, v, o = {}) {
  const { W, DEP, H } = CASE, g = g0, { ctx } = g;
  v.shadow(g, W / 2 + 7, DEP / 2 + 5, W / 2 + 10, DEP / 2 + 10, 0.36);
  v.box(g, { x0: 0, x1: W, z0: 0, z1: DEP, h0: 0, h1: H - TOPB }, WOOD, { r: 1.5, hl: 0, wall: 1 });
  BAYS.forEach(([hb, ht], i) => {
    const open = poly([v.P(SIDE, DEP, ht), v.P(W - SIDE, DEP, ht), v.P(W - SIDE, DEP, hb), v.P(SIDE, DEP, hb)]);
    ctx.save(); ctx.clip(open);
    // the back of the bay, its left side (seen only from the right), and its floor
    v.onFront(ctx, 0.5, () => {
      ctx.fillStyle = g.lin(0, -ht, 0, -hb, [[0, '#3d2416'], [1, '#5c3722']]);
      ctx.fillRect(SIDE - 2, -ht - 40, W - 2 * SIDE + 4, ht - hb + 80);
    });
    if (v.hasSide) g.fill(poly([v.P(SIDE, 0, hb), v.P(SIDE, DEP, hb), v.P(SIDE, DEP, ht), v.P(SIDE, 0, ht)]), g.dk(WOOD, 0.3));
    v.onTop(ctx, hb, () => {
      ctx.fillStyle = g.lin(0, 0, 0, DEP, [[0, '#7a4a2c'], [1, WOOD_L]]);
      ctx.fillRect(SIDE - 2, 0, W - 2 * SIDE + 4, DEP);
    });
    // the books, left to right, and the bookend after the last run
    const g2 = pen(ctx, 0);
    for (const run of RUNS.filter(r => r.bay === i)) {
      const gr = run.fading ? pen(ctx, 1) : g2;
      for (const b of run.books) book(gr, v, b, run, o.detail);
      if (run.fading) {
        // a cobweb strung from the tallest book up to the shelf above
        const tb = run.books.reduce((m, b) => (b.h > m.h ? b : m), run.books[0]);
        const [cx, cy] = v.P(tb.x1, ZF, hb + tb.h);
        const [, sy] = v.P(0, ZF + 2, ht);
        cobweb(gr, cx - 0.3, sy + 0.2, PI * 0.5 - 0.1, PI * 0.98, Math.max(4, (cy - sy) * 1.5), 1, 5, 3, o.detail ? 0.3 : 0.4);
        cobweb(gr, cx + 0.2, cy, -PI * 0.5, 0.05, 5, 0.9, 4, 3, o.detail ? 0.26 : 0.4);
      }
    }
    const be = BOOKENDS[i];
    v.box(g2, { x0: be.x, x1: be.x + 1.3, z0: 6, z1: ZF - 1, h0: hb, h1: hb + 13 }, '#aab4e6', { r: 0.6, lt: 0.4, hl: 0.8 });
    v.box(g2, { x0: be.x - 0.2, x1: be.x + 5.5, z0: 6, z1: ZF - 1, h0: hb, h1: hb + 0.8 }, '#9aa6dc', { hl: 0 });
    // the shadow under the shelf above
    v.onFront(ctx, DEP, () => {
      ctx.fillStyle = g.lin(0, -ht, 0, -ht + 7, [[0, '#0a0620', 0.45], [1, '#0a0620', 0]]);
      ctx.fillRect(SIDE, -ht, W - 2 * SIDE, 7);
    });
    ctx.restore();
    // the lit front edge of the shelf under this bay
    v.onFront(ctx, DEP, () => { ctx.fillStyle = 'rgba(255,236,200,0.45)'; ctx.fillRect(SIDE, -hb, W - 2 * SIDE, 0.7); });
  });
  // the kick at the bottom, and the top board
  v.onFront(ctx, DEP, () => { ctx.fillStyle = 'rgba(26,16,86,0.3)'; ctx.fillRect(SIDE, -3, W - 2 * SIDE, 3); });
  v.box(g, { x0: -1.6, x1: W + 1.6, z0: 0, z1: DEP + 1.6, h0: H - TOPB, h1: H }, WOOD_L, { r: 1.6, lt: 0.24 });
}

// Where each run is, in the bookcase's own drawing: [x0, y0, x1, y1] around its spines and tops
export function runBoxes(v) {
  return RUNS.map(run => {
    const [x0, y0] = v.P(run.x0, ZB, run.hb + run.top), [x1, y1] = v.P(run.x1, ZF, run.hb);
    return { id: run.id, run, box: [Math.min(x0, v.P(run.x0, ZF, 0)[0]), y0, x1, y1] };
  });
}

// how the opened bookcase sits on the screen: local (x, z, h) -> screen (ox + S x, oy + S (z k - h))
export const SHELF = { k: 0.17, S: 4.2, cx: 207, bottom: 770 };
export const shelfPlace = () => ({ ox: SHELF.cx - (SHELF.S * CASE.W) / 2, oy: SHELF.bottom - SHELF.S * CASE.DEP * SHELF.k, S: SHELF.S });

export { lerp };
