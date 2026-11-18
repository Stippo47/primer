// The house, cut open at the front: two rooms side by side under one roof, their walls and floors,
// and the plain bought furniture. Everything is placed in the room as (x, z, h) and drawn through a view
// (see view.js), so the same furniture can be drawn from any of the three angles.
// Painted once onto two wide backdrops: the shell (walls, floors) and the furniture over it.
// Earned things are drawn every frame, between and over those two.

import { rng } from './ease.js';
import { pen, rr, circ, ell, poly, rpoly, soft, pd, limb, capsule, TAU, PI } from './draw.js';
import { makeView, cssGrad } from './view.js';

export const D = 250;                       // how deep the rooms are
export const WALL = 300;                    // how tall the back wall is
export const Y = { front: 690, slab: 706 }; // the front edge of the floor, the foot of the cut floor
export const X = { bedL: 14, bedR: 694, kitL: 712, kitR: 1192, end: 1206 };
export const DOOR = { z0: D - 82, h: 214, open: 1.08 }; // the doorway through the middle wall, at the front; open: its angle
export const PAD = 60;                      // spare backdrop either side of the house
export const ROOMS = {
  bed: { min: -10, max: X.kitL + 32 - 414, home: -10 },
  kitchen: { min: X.bedR - 44, max: X.end + 12 - 414, home: X.bedR - 44 },
};
export const viewFor = angle => makeView(angle, { yF: Y.front, D });

const WOOD = '#c0824f', WOOD_D = '#9a6238', WOOD_L = '#dba571', WOOD_DK = '#6e4024';

function hatch(ctx) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const h = c.getContext('2d');
  h.fillStyle = '#dfe5ff'; h.fillRect(0, 0, 16, 16);
  h.strokeStyle = '#c0c9f4'; h.lineWidth = 3.2; h.lineCap = 'square';
  for (const o of [-16, 0, 16]) { h.beginPath(); h.moveTo(o - 2, 18); h.lineTo(o + 18, -2); h.stroke(); }
  const p = ctx.createPattern(c, 'repeat');
  p.setTransform(new DOMMatrix().scale(0.5));
  return p;
}

// ================= on the walls =================

// A window with the night outside. Drawn flat on the back wall; origin: its top-left. 80 x 104.
function windowNight(g, { curtain = '#35b5a6', herbs = false } = {}) {
  const { ctx } = g, w = 80, h = 104;
  g.f(rr(-4, -4, w + 8, h + 5, 8), '#e9ecff', { s: 3, l: 1.4, dk: 0.26 });
  const glass = rr(5, 5, w - 10, h - 12, 3);
  g.fill(glass, g.lin(0, 5, 0, h, [[0, '#070a2a'], [0.7, '#1c1760'], [1, '#3a2a86']]));
  g.clip(glass, () => {
    g.glow(55, 27, 36, 36, '#b7c6ff', 0.3);
    ctx.save(); ctx.beginPath(); ctx.arc(55, 27, 10.4, 0, TAU); ctx.clip();
    g.flat(circ(55, 27, 10.4), '#ffeeb5'); g.flat(circ(60.5, 22.6, 9.8), '#0d1038');
    ctx.restore();
    const r = rng(7);
    for (let i = 0; i < 14; i++) g.flat(circ(8 + r() * (w - 16), 8 + r() * 60, 0.45 + r() * 0.7), '#dfe8ff', 0.5 + r() * 0.5);
    g.flat(soft([[0, 90], [12, 77], [26, 82], [42, 71], [58, 80], [80, 72], [84, 102], [0, 102]]), '#141446');
    g.flat(soft([[0, 96], [18, 86], [36, 91], [54, 84], [80, 90], [84, 108], [0, 108]]), '#0c0d34');
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(poly([[5, 36], [36, 5], [50, 5], [5, 50]]));
  });
  g.f(rr(w / 2 - 2.5, 5, 5, h - 12, 0), '#e9ecff', { s: 1.4, l: 0.8, dk: 0.26 });
  g.f(rr(5, 44, w - 10, 5, 0), '#e9ecff', { s: 1.4, l: 0.8, dk: 0.26 });
  if (herbs) {
    for (const [x, c1] of [[16, '#2bc4a4'], [40, '#57d68d'], [63, '#1fa78c']]) {
      for (let i = -2; i <= 2; i++) g.f(ell(x + i * 3, h - 22 - Math.abs(i) * -2, 3.1, 6.8, i * 0.32), c1, { s: 1.2, l: 0.6 });
      g.f(rpoly([[x - 7.2, h - 18], [x + 7.2, h - 18], [x + 5.4, h - 7], [x - 5.4, h - 7]], 1.5), '#e07a4f', { s: 1.8, l: 0.8 });
      g.f(rr(x - 8.2, h - 20, 16.4, 3.8, 1.5), '#f08f63', { s: 1.2, l: 0.6 });
    }
  }
  if (curtain) {
    const drape = side => {
      ctx.save();
      if (side < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      const p = soft([[-16, -8], [16, -8], [18, 12], [10, 42], [-1, 67], [6, 90], [10, 114], [-16, 116], [-17, 54]], true, 0.8);
      g.f(p, curtain, { s: 4.2, l: 1.4, dk: 0.34 });
      g.clip(p, () => {
        for (const [x0, x1, a] of [[-8.5, -11, 0.2], [1.2, -5, 0.16], [9.6, 0, 0.12]]) {
          ctx.strokeStyle = g.dk(curtain, 0.5, a + 0.12); ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.moveTo(x0, -8); ctx.bezierCurveTo(x0, 24, x1 - 4, 48, x1 - 6, 67); ctx.bezierCurveTo(x1 - 4, 84, x1, 102, x1 + 1, 118); ctx.stroke();
        }
        ctx.strokeStyle = g.lt(curtain, 0.4, 0.5); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-12.6, -6); ctx.bezierCurveTo(-13, 30, -14.4, 60, -13, 112); ctx.stroke();
      });
      g.f(rr(-10, 63.6, 13, 5.4, 2.7), '#ffc83d', { s: 1.2, l: 0.6 });
      ctx.restore();
    };
    drape(1); drape(-1);
    g.f(rr(-22, -13, w + 44, 4.4, 2.2), '#d9a66e', { s: 1.5, l: 0.8 });
    g.f(circ(-23, -11, 4), '#d9a66e', { s: 1.5, l: 0.9 });
    g.f(circ(w + 23, -11, 4), '#d9a66e', { s: 1.5, l: 0.9 });
  }
}
// the window, set in the back wall, with a sill that stands out from it
function windowOnWall(g, v, x, sill, o = {}) {
  const { ctx } = g;
  g.glow(...v.P(x + 40, 0, sill + 56), 70, 70, '#8fa4ff', 0.12);
  v.onFront(ctx, 0, () => g.at(x, -(sill + 104), () => windowNight(g, o)));
  v.box(g, { x0: x - 7, x1: x + 87, z0: 0, z1: 9, h0: sill - 5, h1: sill }, '#eef0ff', { r: 1.5, dk: 0.3, wall: 0.8 });
}

// a plank on two brackets, against the back wall. h: its top.
function wallShelf(g, v, x0, w, h, depth = 15) {
  for (const x of [x0 + 12, x0 + w - 15]) v.box(g, { x0: x, x1: x + 3, z0: 0, z1: depth - 3, h0: h - 15, h1: h - 4 }, '#4b54a8', { hl: 0, wall: 0.6 });
  v.box(g, { x0, x1: x0 + w, z0: 0, z1: depth, h0: h - 4, h1: h }, WOOD_L, { r: 1.2, wall: 0.9 });
}

function clock(g) {
  const { ctx } = g;
  g.flat(circ(1.5, 2.4, 16.2), '#0a082c', 0.3);
  g.f(circ(0, 0, 16.2), '#ee4b7a', { s: 2.6, l: 1.1 });
  g.f(circ(0, 0, 12.9), '#fff7e4', { shade: false, lit: false });
  ctx.fillStyle = 'rgba(26,16,86,0.14)'; ctx.fill(pd('M-12.9 0 A12.9 12.9 0 0 1 8.4 -9.8 A14.4 14.4 0 0 0 -11.4 3.6Z'));
  for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.flat(circ(Math.cos(a) * 10.2, Math.sin(a) * 10.2, i % 3 ? 0.6 : 1.1), '#3a3f7a'); }
  g.f(capsule(0, 0, 5.4, -4.8, 1.1), '#3a3f7a', { shade: false, lit: false });
  g.f(capsule(0, 0, -3, -8.4, 0.85), '#3a3f7a', { shade: false, lit: false });
  g.flat(circ(0, 0, 1.6), '#ee4b7a');
  g.glint(-7, -9, 2.4, 1.2, -0.7, 0.55);
}

// a round picture sign beside a doorway: where it leads. kind: 'kitchen' | 'bed'
function roomSign(g, kind) {
  const { ctx } = g;
  g.flat(circ(1, 2, 12.5), '#0a082c', 0.3);
  g.f(circ(0, 0, 12.5), kind === 'kitchen' ? '#ffa23a' : '#8b5cf0', { s: 2.2, l: 1 });
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.save(); ctx.scale(0.66, 0.66);
  if (kind === 'kitchen') {
    ctx.fill(pd('M-10 -3 H10 V5 Q10 10 5 10 H-5 Q-10 10 -10 5Z'));
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-13, -1); ctx.lineTo(-10, -1); ctx.moveTo(10, -1); ctx.lineTo(13, -1); ctx.stroke();
    ctx.fill(rr(-11, -7.5, 22, 3.2, 1.6)); ctx.fill(circ(0, -9.6, 2.2));
  } else {
    ctx.fill(rr(-12, -1, 24, 7, 2)); ctx.fill(rr(-12, -8, 4, 16, 1.5)); ctx.fill(rr(9, 0, 3, 8, 1.2)); ctx.fill(rr(-6.5, -5.5, 8, 4.5, 2.2));
  }
  ctx.restore();
}

// ================= the bedroom's furniture =================

// The bed, its head against the back wall and its foot toward us. x0: its left side.
function bed(g, v, x0) {
  const { ctx } = g, W = 96, L = 166, x1 = x0 + W;
  v.shadow(g, x0 + W / 2 + 6, L / 2 + 6, W / 2 + 10, L / 2 + 10, 0.36);
  // headboard, with a lighter panel let into it
  v.box(g, { x0: x0 - 4, x1: x1 + 4, z0: 0, z1: 7, h0: 0, h1: 86 }, WOOD, { r: 10, wall: 1, front: () => {
    g.f(rr(x0 + 6, -78, W - 12, 40, 7), WOOD_L, { s: 2, l: 0, lit: false, dk: 0.22 });
    g.line(rr(x0 + 6, -78, W - 12, 40, 7), WOOD_D, 1.1, 0.5);
  } });
  // the base and the mattress
  v.box(g, { x0, x1, z0: 7, z1: L, h0: 9, h1: 29 }, WOOD_D, { r: 3, hl: 0 });
  v.box(g, { x0: x0 + 3, x1: x1 - 3, z0: 7, z1: L - 3, h0: 28, h1: 40 }, '#e6e8fb', { r: 5, lt: 0.6, hl: 0.6 });
  // the pillow: a soft, puffed shape
  const pz0 = 11, pz1 = 40, px0 = x0 + 10, px1 = x1 - 10;
  const pil = v.outline({ x0: px0, x1: px1, z0: pz0, z1: pz1, h0: 40, h1: 51 }, 9);
  g.f(pil, '#ffffff', { s: 3, l: 1.2, dk: 0.16 });
  g.clip(pil, () => {
    const [, ya] = v.P(0, pz1, 51), [, yb] = v.P(0, pz1, 40);
    ctx.fillStyle = cssGrad(ctx, 0, ya - 2, 0, yb, [[0, 'rgba(160,168,230,0)'], [1, 'rgba(160,168,230,0.4)']]);
    ctx.fillRect(px0 - 4, ya - 2, px1 - px0 + 8, yb - ya + 4);
    v.onTop(ctx, 51, () => { g.line(pd(`M${px0 + 14} ${pz0 + 14} Q${(px0 + px1) / 2} ${pz0 + 19} ${px1 - 14} ${pz0 + 14}`), '#c9cff5', 1.2, 0.8); });
  });
  // the blanket over the lower part, with the sheet turned back over its top edge
  const bz0 = 56, bz1 = L - 1, bx0 = x0 - 1, bx1 = x1 + 1, BL = '#e8525e';
  v.onTop(ctx, 41.5, () => {
    const top = soft([[bx0 + 2, bz0], [(bx0 + bx1) / 2, bz0 - 2.5], [bx1 - 2, bz0], [bx1, bz0 + 12], [bx1, bz1], [bx0, bz1], [bx0, bz0 + 12]], true, 0.6);
    g.flat(top, BL);
    g.clip(top, () => {
      ctx.fillStyle = g.lt(BL, 0.1); ctx.fillRect(bx0, bz0, bx1 - bx0, bz1 - bz0);
      for (const x of [x0 + 14, x1 - 22]) { ctx.fillStyle = g.c('#ff9aa0', 0.85); ctx.fillRect(x, bz0, 8, bz1 - bz0); }
      ctx.fillStyle = g.c('#fffaf4'); ctx.fill(soft([[bx0 - 2, bz0 - 4], [bx1 + 2, bz0 - 4], [bx1 + 2, bz0 + 14], [(bx0 + bx1) / 2, bz0 + 16], [bx0 - 2, bz0 + 14]], true, 0.5));
      ctx.fillStyle = g.dk('#fffaf4', 0.18); ctx.fillRect(bx0, bz0 + 14.6, bx1 - bx0, 1.4);
      // soft folds, and the light from the left
      ctx.strokeStyle = g.dk(BL, 0.3, 0.35); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0 + 34, bz0 + 30); ctx.quadraticCurveTo(x0 + 44, bz0 + 62, x0 + 38, bz1 - 12); ctx.moveTo(x1 - 34, bz0 + 40); ctx.quadraticCurveTo(x1 - 28, bz0 + 74, x1 - 34, bz1 - 6); ctx.stroke();
      ctx.fillStyle = cssGrad(ctx, bx0, 0, bx1, 0, [[0, 'rgba(255,255,255,0.14)'], [0.4, 'rgba(255,255,255,0)'], [0.8, 'rgba(26,16,86,0)'], [1, 'rgba(26,16,86,0.2)']]);
      ctx.fillRect(bx0, bz0, bx1 - bx0, bz1 - bz0);
    });
  });
  // seen from the side (angle c), the blanket hangs over the right edge
  v.onSide(ctx, bx1, () => {
    const p = soft([[bz0 + 6, -42], [bz1, -42], [bz1, -20], [bz1 - 20, -18], [(bz0 + bz1) / 2, -21], [bz0 + 16, -18], [bz0 + 6, -24]], true, 0.6);
    ctx.fillStyle = g.dk(BL, 0.3); ctx.fill(p);
  });
  // the footboard: the end of the bed, facing us
  v.onFront(ctx, bz1, () => {
    const p = soft([[bx0, -41.5], [bx1, -41.5], [bx1 + 0.6, -22], [bx1 - 18, -20.5], [(bx0 + bx1) / 2, -22.5], [bx0 + 20, -20.4], [bx0 - 0.6, -22]], true, 0.55);
    g.flat(p, BL);
    g.clip(p, () => {
      for (const x of [x0 + 14, x1 - 22]) { ctx.fillStyle = g.c('#ff9aa0', 0.8); ctx.fillRect(x, -42, 8, 24); }
      ctx.fillStyle = cssGrad(ctx, bx0, 0, bx1, 0, [[0, 'rgba(255,255,255,0.12)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(26,16,86,0.22)']]); ctx.fillRect(bx0, -42, bx1 - bx0, 24);
      ctx.fillStyle = 'rgba(26,16,86,0.16)'; ctx.fillRect(bx0, -42, bx1 - bx0, 2.4);
    });
  });
  v.box(g, { x0: x0 - 4, x1: x1 + 4, z0: L, z1: L + 7, h0: 0, h1: 38 }, WOOD, { r: 7, front: () => {
    g.f(rr(x0 + 6, -31, W - 12, 18, 5), WOOD_L, { s: 2, l: 0, lit: false, dk: 0.22 });
    g.line(rr(x0 + 6, -31, W - 12, 18, 5), WOOD_D, 1.1, 0.5);
    g.flat(rr(x0 - 1, -6, 5, 6, 1.5), WOOD_DK, 0.6); g.flat(rr(x1 - 4, -6, 5, 6, 1.5), WOOD_DK, 0.6);
  } });
}

// The desk against the wall: legs on the left, drawers on the right. x0: its left end. 120 wide, 63 tall.
function desk(g, v, x0) {
  const W = 120, Dp = 50;
  v.shadow(g, x0 + W / 2 + 6, Dp / 2 + 6, W / 2 + 8, Dp / 2 + 10, 0.32);
  // the shadowy space under it, and the panel at its back
  v.onTop(g.ctx, 0, () => { g.ctx.fillStyle = 'rgba(14,10,52,0.3)'; g.ctx.fill(rr(x0 + 4, 0, 66, Dp - 2, 3)); });
  v.box(g, { x0: x0 + 6, x1: x0 + 68, z0: 1, z1: 4, h0: 24, h1: 56 }, WOOD_DK, { hl: 0, grad: false });
  v.box(g, { x0: x0 + 3, x1: x0 + 9, z0: 2, z1: 8, h0: 0, h1: 56 }, WOOD_D, { hl: 0 });
  v.box(g, { x0: x0 + 3, x1: x0 + 9, z0: Dp - 8, z1: Dp - 2, h0: 0, h1: 56 }, WOOD_D, { r: 1.5, hl: 0 });
  // the drawers
  v.box(g, { x0: x0 + 66, x1: x0 + W - 3, z0: 2, z1: Dp - 1, h0: 0, h1: 56 }, WOOD, { r: 2, hl: 0, front: () => {
    for (const [h0, h1] of [[37, 53], [20, 35], [3, 18]]) {
      const p = rr(x0 + 69.5, -h1, W - 75.5, h1 - h0, 2.4);
      g.f(p, WOOD_L, { s: 1.6, l: 0.8, dk: 0.24 });
      g.f(rr(x0 + 66 + (W - 69) / 2 - 6, -(h0 + h1) / 2 - 1.6, 12, 3.2, 1.6), '#ffc83d', { s: 1, l: 0.6 });
    }
  } });
  // the top
  v.box(g, { x0: x0 - 2, x1: x0 + W + 2, z0: 0, z1: Dp + 2, h0: 56, h1: 63 }, WOOD_L, { r: 2.5, wall: 1, top: () => {
    const c = g.ctx;
    c.strokeStyle = g.dk(WOOD_L, 0.2, 0.35); c.lineWidth = 0.9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0 + 8, 14); c.quadraticCurveTo(x0 + 60, 12, x0 + 104, 15); c.moveTo(x0 + 30, 34); c.quadraticCurveTo(x0 + 70, 36, x0 + 112, 33); c.stroke();
  } });
}

// a desk lamp, its foot at (x, z) on a surface at h. The head points down to the right.
function deskLamp(g, v, x, z, h) {
  const { ctx } = g, col = '#ff7a59';
  // the pool of light it makes
  v.onTop(ctx, h, () => g.glow(x + 34, z + 2, 34, 22, '#ffe9a8', 0.55));
  const [bx, by] = v.P(x, z, h);
  ctx.save(); ctx.translate(bx, by);
  const cone = poly([[22, -32], [35, -27], [62, -4], [14, -4]]);
  ctx.fillStyle = g.lin(0, -30, 0, -4, [[0, '#ffe9a8', 0.38], [1, '#ffe9a8', 0.03]]); ctx.fill(cone);
  ctx.restore();
  v.cyl(g, { x, z, r0: 8.5, h0: h, h1: h + 2.8 }, col, { lt: 0.3 });
  ctx.save(); ctx.translate(bx, by - 2.8);
  g.f(capsule(0, -3, -7, -25, 1.6), '#dfe5ff', { s: 0.9, l: 0.5 });
  g.f(capsule(-7, -25, 16, -38, 1.6), '#dfe5ff', { s: 0.9, l: 0.5 });
  g.f(circ(-7, -25, 2.7), col, { s: 1, l: 0.6 }); g.f(circ(0, -3.4, 2.3), col, { s: 0.9, l: 0.5 });
  ctx.translate(18, -38.4); ctx.rotate(0.62);
  g.f(pd('M-5.4 -4.2 L5.4 -4.2 Q6.6 -4.2 7.2 -3 L13.2 8.4 Q0 13.2 -13.2 8.4 L-7.2 -3 Q-6.6 -4.2 -5.4 -4.2Z'), col, { s: 2.4, l: 1.1 });
  g.flat(ell(0, 9.3, 12, 2.8), '#fff3c4');
  g.f(rr(-3, -7.2, 6, 3.6, 1.5), col, { s: 1, l: 0.5 });
  ctx.restore();
}

// three books lying flat, on a surface at h
function bookPile(g, v, x, z, h) {
  let hh = h;
  for (const [w, t, col, dx] of [[30, 5.2, '#3b6fd6', 0], [26, 4.8, '#ee4b7a', -1.5], [22, 4.4, '#ffc83d', 2]]) {
    v.box(g, { x0: x - w / 2 + dx, x1: x + w / 2 + dx, z0: z - 9, z1: z + 9, h0: hh, h1: hh + t }, col, { r: 1, lt: 0.2, hl: 0.6, front: () => {
      g.flat(rr(x + w / 2 + dx - 3.5, -(hh + t) + 1, 2.6, t - 2, 0.8), '#fff7e4');
    }, top: () => { g.flat(rr(x - w / 2 + dx + 1.2, z - 7.5, w - 2.4, 15, 1), '#ffffff', 0.12); } });
    hh += t;
  }
}

// A swivel chair, seen from behind: tucked toward the desk, facing away from us. (cx, cz): under its seat.
function chair(g, v, cx, cz) {
  const { ctx } = g, BASE = '#3a3f7a', TEAL = '#35b5a6';
  v.shadow(g, cx + 4, cz + 3, 28, 24, 0.32);
  // the five-legged foot, its back legs first
  const legs = [0, 1, 2, 3, 4].map(i => -PI / 2 + i * TAU / 5 + 0.32).map(a => ({ a, ex: cx + Math.cos(a) * 22, ez: cz + Math.sin(a) * 22 }));
  const wheel = l => { const [wx, wy] = v.P(l.ex, l.ez, 2.6); g.f(ell(wx, wy, 2.8, 2.6), '#23264f', { s: 0.9, l: 0.5, lt: 0.4 }); };
  const leg = l => v.onTop(ctx, 4.5, () => { g.f(capsule(cx, cz, l.ex, l.ez, 2.2), BASE, { s: 1, l: 0.5 }); });
  const back = legs.filter(l => Math.sin(l.a) < 0.1), front = legs.filter(l => Math.sin(l.a) >= 0.1);
  for (const l of back) { wheel(l); leg(l); }
  v.cyl(g, { x: cx, z: cz, r0: 2.4, h0: 4, h1: 31 }, '#aab4e6', { lt: 0.4 });
  for (const l of front) { leg(l); wheel(l); }
  v.cyl(g, { x: cx, z: cz, r0: 4.4, h0: 4, h1: 7 }, BASE);
  // the seat, then the bar up to the back, then the back itself
  v.box(g, { x0: cx - 13, x1: cx + 13, z0: cz - 12, z1: cz + 10, h0: 28, h1: 31.5 }, BASE, { r: 2, hl: 0 });
  v.box(g, { x0: cx - 20, x1: cx + 20, z0: cz - 18, z1: cz + 15, h0: 31, h1: 38 }, TEAL, { r: 6, lt: 0.24 });
  v.box(g, { x0: cx - 3, x1: cx + 3, z0: cz + 14, z1: cz + 18, h0: 30, h1: 50 }, BASE, { r: 1.5, hl: 0 });
  v.box(g, { x0: cx - 17, x1: cx + 17, z0: cz + 16, z1: cz + 22, h0: 44, h1: 86 }, '#2a8f86', { r: 10, lt: 0.3, front: () => {
    const p = rr(cx - 12, -81, 24, 31, 7);
    g.f(p, TEAL, { s: 2, l: 0.8, dk: 0.2 });
    g.line(pd(`M${cx} -78 L${cx} -54`), '#2a8f86', 1.1, 0.6);
  } });
}

// a plant in a pot standing on the floor at (x, z)
function plant(g, v, x, z, s = 1) {
  const { ctx } = g;
  v.shadow(g, x + 3, z + 2, 15 * s, 10 * s, 0.32);
  v.cyl(g, { x, z, r0: 8 * s, r1: 10.5 * s, h0: 0, h1: 21 * s }, '#e07a4f', { wall: 0.5 });
  const [px, py] = v.P(x, z, 24 * s);
  const leaf = (dx, len, wd, rot, col) => {
    ctx.save(); ctx.translate(px + dx, py + 2); ctx.rotate(rot);
    const p = pd(`M0 0 C${wd} ${-len * 0.25} ${wd} ${-len * 0.75} 0 ${-len} C${-wd} ${-len * 0.75} ${-wd} ${-len * 0.25} 0 0Z`);
    g.f(p, col, { s: 2.2, l: 0.9 });
    ctx.strokeStyle = g.dk(col, 0.35, 0.6); ctx.lineWidth = 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -len + 4); ctx.stroke();
    ctx.restore();
  };
  ctx.save(); ctx.translate(px, py); ctx.scale(s, s); ctx.translate(-px, -py);
  leaf(-2.4, 38, 9, -0.75, '#1fa78c'); leaf(2.4, 40, 9, 0.7, '#1fa78c');
  leaf(-1.2, 47, 10, -0.3, '#2bc4a4'); leaf(1.8, 44, 9.6, 0.32, '#2bc4a4');
  leaf(0, 53, 10, 0.02, '#4fdcbc');
  ctx.restore();
  v.cyl(g, { x, z, r0: 11.4 * s, h0: 19 * s, h1: 24 * s }, '#f08f63', { inner: () => g.flat(circ(x, z, 9.2 * s), '#5a3018') });
  // the leaves stand in front of the rim's far half: draw the near ones again over it
  ctx.save(); ctx.translate(px, py); ctx.scale(s, s); ctx.translate(-px, -py);
  leaf(1.8, 44, 9.6, 0.32, '#2bc4a4'); leaf(0, 53, 10, 0.02, '#4fdcbc');
  ctx.restore();
}

// hangs from the top of the room. (x, z): where it is in the room. drop: how far below the top it hangs.
function pendant(g, v, x, z, drop, col = '#e9ecff') {
  const { ctx } = g, top = v.yB - WALL, sy = top + drop;
  // the pool of light on the floor below, and the beam down to it
  v.onTop(ctx, 0, () => g.glow(x, z, 120, 90, '#ffe2a0', 0.14));
  const [fx, fy] = v.P(x, z, 0);
  ctx.fillStyle = cssGrad(ctx, 0, sy + 20, 0, fy, [[0, 'rgba(255,233,168,0.09)'], [1, 'rgba(255,233,168,0)']]);
  ctx.fill(poly([[x - 16, sy + 14], [x + 16, sy + 14], [fx + 90, fy], [fx - 90, fy]]));
  g.glow(x, sy + 8, 90, 70, '#ffe2a0', 0.14);
  g.flat(rr(x - 0.8, top, 1.6, drop - 6, 0), '#aab4e6');
  g.f(rr(x - 4.2, top, 8.4, 3, 1.2), '#aab4e6', { s: 1, l: 0.5 });
  g.flat(circ(x, sy + 14, 5.4), '#fff3c4');
  g.glow(x, sy + 15, 20, 18, '#fff3c4', 0.7);
  const dome = pd(`M${x - 20} ${sy + 14} C${x - 20} ${sy - 3} ${x - 8} ${sy - 4} ${x - 3.6} ${sy - 5} L${x + 3.6} ${sy - 5} C${x + 8} ${sy - 4} ${x + 20} ${sy - 3} ${x + 20} ${sy + 14}Z`);
  g.f(dome, col, { s: 3, l: 1.2, dk: 0.3 });
  g.glint(x - 11, sy + 2, 3.4, 1.4, -0.9, 0.6);
  g.f(rr(x - 21.6, sy + 12, 43.2, 4.2, 2.1), col, { s: 1.2, l: 0.6, dk: 0.36 });
}

// ================= the kitchen's furniture =================

const CAB = '#2f8f8a', CAB_L = '#49b3a8', TOPC = '#f3ead8';

// The fridge against the back wall. x0: its left side. 64 wide, 152 tall.
function fridge(g, v, x0) {
  const { ctx } = g, W = 64, C = '#f6e7c8';
  v.shadow(g, x0 + W / 2 + 6, 26, W / 2 + 8, 30, 0.34);
  v.box(g, { x0: x0 + 6, x1: x0 + 14, z0: 40, z1: 46, h0: 0, h1: 5 }, '#6b74bd', { hl: 0 });
  v.box(g, { x0: x0 + W - 14, x1: x0 + W - 6, z0: 40, z1: 46, h0: 0, h1: 5 }, '#6b74bd', { hl: 0 });
  v.box(g, { x0, x1: x0 + W, z0: 0, z1: 48, h0: 4, h1: 152 }, C, { r: 9, lt: 0.4, wall: 1, front: () => {
    ctx.strokeStyle = g.dk(C, 0.34, 0.9); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, -104); ctx.lineTo(x0 + W, -104); ctx.stroke();
    ctx.strokeStyle = g.lt(C, 0.7, 0.9); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x0 + 2, -102.4); ctx.lineTo(x0 + W - 4, -102.4); ctx.stroke();
    g.f(rr(x0 + 7, -130, 5, 18, 2.5), '#dfe5ff', { s: 1.2, l: 0.7, dk: 0.4 });
    g.f(rr(x0 + 7, -96, 5, 34, 2.5), '#dfe5ff', { s: 1.2, l: 0.7, dk: 0.4 });
    // a note held by a magnet, and two more magnets
    g.f(rr(x0 + 34, -92, 16, 17, 1.4), '#fff7c2', { s: 1.2, l: 0, lit: false, dk: 0.18 });
    ctx.strokeStyle = g.c('#c9b56a', 0.9); ctx.lineWidth = 1; ctx.lineCap = 'round';
    for (const y of [-87, -83, -79]) { ctx.beginPath(); ctx.moveTo(x0 + 37, y); ctx.lineTo(y === -79 ? x0 + 43 : x0 + 47, y); ctx.stroke(); }
    g.f(circ(x0 + 42, -92, 2.4), '#ee4b7a', { s: 0.9, l: 0.5 });
    g.f(circ(x0 + 26, -134, 2.8), '#49c6ff', { s: 1, l: 0.6 }); g.f(rr(x0 + 39, -138, 8, 6, 1.6), '#ffc83d', { s: 1, l: 0.6 });
  } });
}

// The counter: cupboards, the oven with the hob over it, and a sink. x0: its left end.
function counter(g, v, x0, w, ovenAt, sinkAt) {
  const { ctx } = g, Dp = 46, ow = 60;
  v.shadow(g, x0 + w / 2 + 6, Dp / 2 + 4, w / 2 + 12, Dp / 2 + 10, 0.34);
  v.box(g, { x0: x0 + 2, x1: x0 + w - 2, z0: 0, z1: Dp - 5, h0: 0, h1: 8 }, '#1c4f55', { hl: 0, grad: false });
  v.box(g, { x0, x1: x0 + w, z0: 0, z1: Dp - 2, h0: 7, h1: 60 }, CAB, { hl: 0, wall: 1, front: () => {
    // the oven
    const ox = ovenAt;
    g.f(rr(ox, -57, ow, 47, 3), '#e9ecff', { s: 2.4, l: 1, dk: 0.3 });
    const win = rr(ox + 6, -40, ow - 12, 25, 3);
    g.fill(win, g.lin(0, -40, 0, -15, [[0, '#231a55'], [1, '#4a2a6a']]));
    g.clip(win, () => { g.glow(ox + ow / 2, -16, 26, 14, '#ffa23a', 0.55); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(poly([[ox + 6, -24], [ox + 22, -40], [ox + 31, -40], [ox + 6, -15]])); });
    g.f(rr(ox + 8, -47, ow - 16, 3.2, 1.6), '#aab4e6', { s: 1, l: 0.6 });
    for (let i = 0; i < 4; i++) g.f(circ(ox + 11 + i * 12.6, -52.5, 2.2), i === 1 ? '#ee4b7a' : '#5b63b8', { s: 0.9, l: 0.5 });
    // cupboards either side, a drawer over each door, shared out evenly
    for (const [a, b] of [[x0 + 4, ovenAt - 4], [ovenAt + ow + 4, x0 + w - 4]]) {
      const n = Math.max(1, Math.round((b - a) / 44)), dw = (b - a - (n - 1) * 4) / n;
      for (let i = 0; i < n; i++) {
        const x = a + i * (dw + 4);
        g.f(rr(x, -57, dw, 13, 2.6), CAB_L, { s: 1.8, l: 0.8, dk: 0.3 });
        g.f(rr(x + dw / 2 - 5, -52.6, 10, 3, 1.5), TOPC, { s: 0.9, l: 0.5 });
        g.f(rr(x, -42, dw, 33, 2.6), CAB_L, { s: 1.8, l: 0.8, dk: 0.3 });
        g.f(circ(i % 2 ? x + 6 : x + dw - 6, -28, 2), TOPC, { s: 0.9, l: 0.5 });
      }
    }
  } });
  // the worktop, with the hob and the sink let into it
  v.box(g, { x0: x0 - 3, x1: x0 + w + 3, z0: 0, z1: Dp + 2, h0: 60, h1: 65.5 }, TOPC, { r: 1.8, lt: 0.32, top: () => {
    g.f(rr(ovenAt + 2, 5, ow - 4, 34, 3), '#2b2f5e', { s: 0, l: 0, shade: false, lit: false });
    for (const [bx, bz, r] of HOB(ovenAt)) {
      g.line(circ(bx, bz, r), '#545caa', 2.2);
      g.line(circ(bx, bz, r * 0.45), '#454c96', 1.6);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(poly([[ovenAt + 4, 18], [ovenAt + 18, 6], [ovenAt + 28, 6], [ovenAt + 4, 30]]));
    // the sink: a bowl let into the top, its far side lit
    const basin = rr(sinkAt, 8, 46, 30, 6);
    g.flat(rr(sinkAt - 2, 6, 50, 34, 7), '#dfe5ff');
    g.fill(basin, g.lin(0, 8, 0, 38, [[0, '#7c86c4'], [0.5, '#aab4e6'], [1, '#d6dcff']]));
    g.flat(circ(sinkAt + 23, 26, 2.4), '#5b63b8');
  } });
  // the tap, standing at the back of the sink
  const [tx, ty] = v.P(sinkAt + 23, 4, 65.5);
  ctx.save(); ctx.translate(tx, ty);
  g.f(rr(-3, -4, 6, 4, 1.5), '#cfd6f2', { s: 1, l: 0.5 });
  g.line(pd('M0 -3 L0 -18 Q0 -24 6 -24 Q11 -24 11 -18 L11 -15'), '#9aa6dc', 3.4);
  g.line(pd('M0 -3 L0 -18 Q0 -24 6 -24 Q11 -24 11 -18 L11 -15'), '#dfe5ff', 2);
  g.line(pd('M-0.6 -6 L-0.6 -17'), '#ffffff', 0.8, 0.8);
  ctx.restore();
}
export const HOB = ovenAt => [[ovenAt + 15, 14, 7], [ovenAt + 40, 14, 6], [ovenAt + 16, 31, 6], [ovenAt + 41, 31, 7.5]];

// A round table, a chair behind it facing us, and a stool. (cx, cz): under the middle of the table.
function tableSet(g, v, cx, cz) {
  const { ctx } = g, R = 44, CH = '#ee4b7a';
  // the chair behind
  const bz = cz - 44;
  v.shadow(g, cx + 4, bz + 4, 26, 20, 0.28);
  for (const [lx, lz] of [[-14, -14], [14, -14]]) v.box(g, { x0: cx + lx - 1.8, x1: cx + lx + 1.8, z0: bz + lz - 1.8, z1: bz + lz + 1.8, h0: 0, h1: 36 }, WOOD_D, { hl: 0 });
  v.box(g, { x0: cx - 18, x1: cx + 18, z0: bz - 21, z1: bz - 16, h0: 36, h1: 88 }, WOOD, { r: 9, wall: 0, front: () => {
    for (const dx of [-7, 0, 7]) g.f(rr(cx + dx - 2, -78, 4, 30, 2), WOOD_L, { s: 1, l: 0, lit: false, dk: 0.2 });
    g.f(rr(cx - 13, -84, 26, 6, 3), WOOD_L, { s: 1, l: 0.5, dk: 0.2 });
  } });
  for (const [lx, lz] of [[-14, 14], [14, 14]]) v.box(g, { x0: cx + lx - 1.8, x1: cx + lx + 1.8, z0: bz + lz - 1.8, z1: bz + lz + 1.8, h0: 0, h1: 36 }, WOOD_D, { hl: 0 });
  v.box(g, { x0: cx - 18, x1: cx + 18, z0: bz - 17, z1: bz + 17, h0: 35, h1: 40 }, CH, { r: 4 });
  // the table
  v.shadow(g, cx + 6, cz + 6, R + 6, R + 4, 0.34);
  v.cyl(g, { x: cx, z: cz, r0: 20, r1: 16, h0: 0, h1: 5 }, WOOD_D);
  v.cyl(g, { x: cx, z: cz, r0: 4.4, h0: 4, h1: 50 }, WOOD_D);
  v.cyl(g, { x: cx, z: cz, r0: R, h0: 50, h1: 55 }, WOOD_L, { lt: 0.22, inner: () => {
    ctx.strokeStyle = g.dk(WOOD_L, 0.18, 0.35); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(cx, cz, R - 5, 0, TAU); ctx.stroke();
    g.glow(cx - 14, cz - 10, 26, 18, '#ffffff', 0.18);
  } });
  // the stool, out to the front right
  const sx = cx + 62, sz = cz + 48;
  v.shadow(g, sx + 4, sz + 3, 20, 16, 0.28);
  for (const a of [-2.3, -0.8, 0.8, 2.3]) {
    const lx = sx + Math.cos(a) * 11, lz = sz + Math.sin(a) * 11;
    if (Math.sin(a) < 0) v.box(g, { x0: lx - 1.6, x1: lx + 1.6, z0: lz - 1.6, z1: lz + 1.6, h0: 0, h1: 38 }, WOOD_D, { hl: 0 });
  }
  v.cyl(g, { x: sx, z: sz, r0: 12, h0: 18, h1: 20 }, WOOD_D);
  for (const a of [-2.3, -0.8, 0.8, 2.3]) {
    const lx = sx + Math.cos(a) * 11, lz = sz + Math.sin(a) * 11;
    if (Math.sin(a) >= 0) v.box(g, { x0: lx - 1.6, x1: lx + 1.6, z0: lz - 1.6, z1: lz + 1.6, h0: 0, h1: 38 }, WOOD_D, { hl: 0 });
  }
  v.cyl(g, { x: sx, z: sz, r0: 15, h0: 38, h1: 43 }, CH);
}

function fruitBowl(g) {
  g.f(circ(-6, -10.2, 5.4), '#ff7a59', { s: 1.8, l: 0.8 }); g.f(circ(4.8, -10.8, 5.7), '#ffc83d', { s: 1.8, l: 0.8 }); g.f(circ(-0.6, -14.4, 5.1), '#ee4b7a', { s: 1.8, l: 0.8 });
  g.f(pd('M-15 -9.6 L15 -9.6 C14.4 -2.4 8.4 0 4.8 0 L-4.8 0 C-8.4 0 -14.4 -2.4 -15 -9.6Z'), '#49c6ff', { s: 2.4, l: 1 });
  g.f(ell(0, -10.2, 16.2, 3.2), '#7ad6ff', { s: 1, l: 0.6 });
}

// ================= the shell =================

function floorBoards(g, v, x0, x1) {
  const { ctx } = g, rows = 10, rd = D / rows, r = rng(5);
  const tones = ['#c98f5f', '#c2875a', '#cf9766', '#bd8254'];
  v.onTop(ctx, 0, () => {
    for (let i = 0; i < rows; i++) {
      const z = i * rd;
      let x = x0 - r() * 80;
      while (x < x1) {
        const len = 70 + r() * 80;
        g.flat(rr(x, z, len + 0.6, rd + 0.4, 0), tones[Math.floor(r() * tones.length)]);
        ctx.fillStyle = 'rgba(110,60,30,0.55)'; ctx.fillRect(x + len - 0.6, z, 1.1, rd);
        ctx.strokeStyle = 'rgba(120,70,36,0.2)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
        const gx = x + 10 + r() * (len - 40), gz = z + 6 + r() * (rd - 12);
        ctx.beginPath(); ctx.moveTo(gx, gz); ctx.quadraticCurveTo(gx + 10, gz - 1.5, gx + 22, gz + 1); ctx.stroke();
        x += len;
      }
      ctx.fillStyle = 'rgba(110,60,30,0.45)'; ctx.fillRect(x0, z - 0.9, x1 - x0, 1.8);
      ctx.fillStyle = 'rgba(255,225,180,0.16)'; ctx.fillRect(x0, z + 0.9, x1 - x0, 1.6);
    }
  });
}

function floorTiles(g, v, x0, x1) {
  const { ctx } = g, t = 38;
  v.onTop(ctx, 0, () => {
    for (let i = 0, z = 0; z < D; i++, z += t) {
      for (let k = 0, x = x0; x < x1; k++, x += t) g.flat(rr(x, z, t + 0.4, t + 0.4, 0), (i + k) % 2 ? '#f0e4cc' : '#d9825e');
      ctx.fillStyle = 'rgba(90,40,30,0.25)'; ctx.fillRect(x0, z - 0.7, x1 - x0, 1.4);
    }
    for (let x = x0 + t; x < x1; x += t) { ctx.fillStyle = 'rgba(90,40,30,0.2)'; ctx.fillRect(x - 0.6, 0, 1.2, D); }
  });
}

// the back wall of each room, flat, from h = 0 to WALL
function bedWall(g, v, x0, x1) {
  const { ctx } = g;
  v.onFront(ctx, 0, () => {
    ctx.fillStyle = g.lin(0, -WALL, 0, 0, [[0, '#212a70'], [0.5, '#293486'], [1, '#2c388e']]);
    ctx.fillRect(x0, -WALL, x1 - x0, WALL);
    for (let x = x0 + 6; x < x1; x += 23) { ctx.fillStyle = 'rgba(130,150,255,0.055)'; ctx.fillRect(x, -WALL, 11.5, WALL); }
    // the panelled lower wall
    const wy = 84;
    ctx.fillStyle = '#343f9e'; ctx.fillRect(x0, -wy, x1 - x0, wy);
    for (let x = x0 + 8; x < x1 - 30; x += 58) {
      const p = rr(x, -wy + 13, 50, 54, 3);
      g.flat(p, '#2f3992');
      ctx.strokeStyle = '#252e7c'; ctx.lineWidth = 1.3; ctx.stroke(p);
      ctx.strokeStyle = 'rgba(120,138,240,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 3, -wy + 67.6); ctx.lineTo(x + 47, -wy + 67.6); ctx.moveTo(x + 50.6, -wy + 16); ctx.lineTo(x + 50.6, -wy + 64); ctx.stroke();
    }
    g.f(rr(x0, -wy - 3, x1 - x0, 7, 0), '#4c59c2', { s: 2, l: 1, sx: 0, lx: 0 });
    g.f(rr(x0, -9, x1 - x0, 9, 0), '#262f80', { s: 0, l: 1, lx: 0, shade: false });
  });
}
function kitchenWall(g, v, x0, x1) {
  const { ctx } = g;
  v.onFront(ctx, 0, () => {
    ctx.fillStyle = g.lin(0, -WALL, 0, 0, [[0, '#15464f'], [0.5, '#1b5862'], [1, '#1f626b']]);
    ctx.fillRect(x0, -WALL, x1 - x0, WALL);
    for (let y = -WALL + 16, row = 0; y < -124; y += 18, row++) {
      for (let x = x0 + 8 + (row % 2) * 10; x < x1; x += 20) g.flat(circ(x, y, 1.3), '#3d8f95', 0.4);
    }
    const ty = 118, ts = 17;
    ctx.fillStyle = '#f3ead8'; ctx.fillRect(x0, -ty, x1 - x0, ty);
    const rt = rng(12);
    for (let row = 0, y = -ty; y < 0; row++, y += ts) {
      for (let x = x0 - (row % 2) * ts / 2; x < x1; x += ts) {
        const k = rt();
        if (k < 0.05) g.flat(rr(x, y, ts, ts, 0), '#8fd0c4'); else if (k < 0.4) g.flat(rr(x, y, ts, ts, 0), '#f8f1e2');
        ctx.fillStyle = 'rgba(160,130,90,0.4)'; ctx.fillRect(x - 0.5, y, 1, ts);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 0.5, y + 1, 0.8, ts - 2);
      }
      ctx.fillStyle = 'rgba(160,130,90,0.4)'; ctx.fillRect(x0, y - 0.5, x1 - x0, 1);
    }
    g.f(rr(x0, -ty - 5, x1 - x0, 7, 0), '#e07a4f', { s: 2, l: 1, sx: 0, lx: 0 });
    g.f(rr(x0, -8, x1 - x0, 8, 0), '#c9bfa6', { s: 0, l: 1, lx: 0, shade: false });
  });
}

// the walls' cut ends, the roof and the ground. Plain shapes, kept dark so the rooms stand out.
function structure(g, v, H) {
  const { ctx } = g, top = v.yB - WALL;
  // the ground the house sits on
  ctx.fillStyle = '#0d1236'; ctx.fillRect(-PAD, Y.slab, X.end + PAD * 2, 300);
  ctx.fillStyle = '#1b2e5a'; ctx.fillRect(-PAD, Y.slab, X.end + PAD * 2, 4);
  const r = rng(31);
  for (let x = -PAD; x < X.end + PAD; x += 7 + r() * 10) {
    const hgt = 3 + r() * 6;
    ctx.fillStyle = r() < 0.5 ? '#1f4a6a' : '#24587a';
    ctx.fill(pd(`M${x - 2} ${Y.slab + 2} Q${x} ${Y.slab - hgt} ${x + 2.6} ${Y.slab - hgt - 1} Q${x + 1.6} ${Y.slab - 2} ${x + 4} ${Y.slab + 2}Z`));
  }
  for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(120,140,220,${0.12 + r() * 0.12})`; ctx.fill(ell(-PAD + r() * (X.end + PAD * 2), Y.slab + 18 + r() * 70, 2 + r() * 4, 1 + r() * 1.6)); }
  // the roof: rows of round-ended shingles, its eaves standing out past the walls, and a chimney over the kitchen
  const ry = top - 13, peak = ry - 50;
  g.f(rr(1040, peak - 30, 30, 50, 2), '#4d3a80', { s: 3, l: 1.4, dk: 0.3 });
  g.f(rr(1036, peak - 36, 38, 8, 2.5), '#5f4896', { s: 2, l: 1, dk: 0.3 });
  const roof = poly([[-24, ry + 3], [X.end + 24, ry + 3], [X.end + 4, peak], [-4, peak]]);
  g.fill(roof, '#241c52');
  g.clip(roof, () => {
    for (let row = 0, y = peak - 2; y < ry + 4; row++, y += 8.5) {
      for (let x = -44 + (row % 2) * 8, i = 0; x < X.end + 44; x += 16, i++) {
        const tile = pd(`M${x} ${y} h16 v5.5 a8 5 0 0 1 -16 0z`);
        const c = ['#3a2f72', '#372c6c', '#3e3278'][(i * 7 + row * 3) % 3];
        g.flat(tile, c);
        ctx.fillStyle = 'rgba(14,8,44,0.45)'; ctx.fill(pd(`M${x} ${y + 5.5} a8 5 0 0 0 16 0 a8 3 0 0 1 -16 0z`));
        ctx.fillStyle = 'rgba(170,150,255,0.16)'; ctx.fillRect(x + 1, y, 14, 1.2);
      }
    }
    ctx.fillStyle = cssGrad(ctx, 0, peak, 0, ry + 3, [[0, 'rgba(255,255,255,0.05)'], [1, 'rgba(8,6,40,0.25)']]); ctx.fillRect(-30, peak, X.end + 60, ry - peak + 4);
  });
  g.f(rr(-6, peak - 5, X.end + 12, 7, 3), '#4b3c86', { s: 2, l: 1, dk: 0.3 });
  ctx.fillStyle = 'rgba(8,6,40,0.45)'; ctx.fillRect(-24, ry + 3, X.end + 48, 4);
  // the cut faces: the band under the roof, the floor's edge, the outer walls and the middle wall
  const cut = p => { ctx.fillStyle = H; ctx.fill(p); ctx.strokeStyle = '#aab4e6'; ctx.lineWidth = 1.2; ctx.stroke(p); };
  cut(rr(-6, top - 12, X.end + 12, 12.5, 3));
  ctx.fillStyle = '#8f5a35'; ctx.fillRect(X.bedL, Y.front, X.bedR - X.bedL, 3.4);
  ctx.fillStyle = '#a85a3e'; ctx.fillRect(X.kitL, Y.front, X.kitR - X.kitL, 3.4);
  cut(rr(-4, Y.front + 3.4, X.end + 8, Y.slab - Y.front - 3.4, 2.5));
  const column = (x0, x1, door) => {
    const [ax, ay] = v.P(x0, D, 0), [bx] = v.P(x1, D, 0);
    if (v.hasSide) {
      // from the side you see the wall's whole length: its top and its face toward the right
      cut(poly([v.P(x0, 0, WALL), v.P(x1, 0, WALL), v.P(x1, D, WALL), v.P(x0, D, WALL)]));
      g.fill(poly([v.P(x1, 0, 0), v.P(x1, D, 0), v.P(x1, D, WALL), v.P(x1, 0, WALL)]), x1 < X.kitL ? '#2f3a92' : '#1d5a64');
    }
    if (!door) { cut(rr(ax, top - 1, bx - ax, ay - top + 1, 0)); return; }
    // the doorway, at the front of the wall: its cut face above, and the wall's end showing through
    const [, jy] = v.P(x0, DOOR.z0, 0);
    cut(rr(ax, top - 1, bx - ax, ay - DOOR.h - top + 1, 0));
    ctx.fillStyle = g.lin(0, ay - DOOR.h, 0, jy, [[0, '#2a1650'], [0.55, '#5a3450'], [1, '#9a5a44']]); ctx.fillRect(ax, ay - DOOR.h, bx - ax, jy - (ay - DOOR.h));
    ctx.fillStyle = 'rgba(255,217,138,0.18)'; ctx.fillRect(ax + (bx - ax) * 0.55, ay - DOOR.h + 30, (bx - ax) * 0.45, jy - (ay - DOOR.h) - 30);
    ctx.fillStyle = '#b06a3c'; ctx.fillRect(ax, jy, bx - ax, ay - jy);
    ctx.fillStyle = 'rgba(255,220,160,0.3)'; ctx.fillRect(ax, jy, bx - ax, 1.4);
    // the door frame round the opening, on both faces of the wall
    for (const fx of [ax - 5, bx]) g.f(rr(fx, ay - DOOR.h - 5, 5, DOOR.h + 5, 1.2), '#f3d8a8', { s: 1.2, l: 0.7, dk: 0.3 });
    g.f(rr(ax - 6, ay - DOOR.h - 7, bx - ax + 12, 7, 2), '#f3d8a8', { s: 1.4, l: 0.7, dk: 0.3 });
  };
  column(0, X.bedL);
  column(X.kitR, X.end);
  column(X.bedR, X.kitL, true);
}

// the door between the rooms, standing open into the bedroom
function doorLeaf(g, v) {
  const { ctx } = g, w = D - DOOR.z0 - 3, a = DOOR.open, hgt = DOOR.h - 2;
  const hx = X.bedR, hz = DOOR.z0 + 1.5, sa = Math.sin(a), ca = Math.cos(a);
  const at = (u, h) => v.P(hx - u * sa, hz + u * ca, h);
  // its shadow on the floor, thrown to the right
  ctx.fillStyle = 'rgba(10,8,44,0.28)';
  ctx.fill(poly([at(0, 0), at(w, 0), at(w * 0.7, 0).map((p, i) => p + (i ? 7 : 22)), at(0, 0).map((p, i) => p + (i ? 2 : 6))]));
  // the leaf's edge, then its face
  const t = 3.4;
  ctx.fillStyle = g.c('#f6c98a');
  ctx.fill(poly([at(w, 0), at(w, hgt), [at(w, hgt)[0] - t, at(w, hgt)[1] - 1], [at(w, 0)[0] - t, at(w, 0)[1] - 1]]));
  const face = poly([at(0, 0), at(w, 0), at(w, hgt), at(0, hgt)]);
  // the face in its own flat coordinates: u from the hinge, -h up
  const m = [-sa - v.sx * ca, v.k * ca, 0, 1, hx - hz * v.sx, v.yB + hz * v.k];
  g.fill(face, '#e9a24f');
  g.clip(face, () => {
    ctx.save(); ctx.transform(...m);
    for (const [y, hh] of [[-hgt + 12, 74], [-hgt + 96, 100]]) {
      const p = rr(8, y, w - 16, hh, 3);
      g.flat(p, '#d98a3a');
      ctx.strokeStyle = g.dk('#e9a24f', 0.4, 0.7); ctx.lineWidth = 1.5; ctx.stroke(p);
      ctx.strokeStyle = g.lt('#e9a24f', 0.5, 0.7); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(10, y + hh + 1.2); ctx.lineTo(w - 10, y + hh + 1.2); ctx.stroke();
    }
    ctx.fillStyle = cssGrad(ctx, 0, 0, w, 0, [[0, 'rgba(26,16,86,0.2)'], [0.5, 'rgba(26,16,86,0)'], [1, 'rgba(255,255,255,0.08)']]);
    ctx.fillRect(0, -hgt, w, hgt);
    for (const y of [-hgt + 20, -40]) g.flat(rr(0, y, 3, 11, 1), '#aab4e6');
    ctx.restore();
  });
  const [kx, ky] = at(w - 7, 98);
  g.f(circ(kx, ky, 3.4), '#ffc83d', { s: 1.2, l: 0.8 });
}

export function paintBackdrop(shell, furn, dpr, angle = 'b') {
  const v = viewFor(angle);
  const Wd = X.end + PAD * 2;
  for (const c of [shell, furn]) { c.width = Wd * dpr; c.height = 896 * dpr; }

  // ---------- the shell: walls, floors, the roof and the ground ----------
  let ctx = shell.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, PAD * dpr, 0);
  let g = pen(ctx);
  const H = hatch(ctx);
  bedWall(g, v, X.bedL, X.bedR);
  kitchenWall(g, v, X.kitL, X.kitR);
  // the floors, cut off at the front
  ctx.save(); ctx.beginPath();
  ctx.moveTo(...v.P(X.bedL, 0, 0)); ctx.lineTo(...v.P(X.kitR, 0, 0)); ctx.lineTo(...v.P(X.kitR, D, 0)); ctx.lineTo(...v.P(X.bedL, D, 0)); ctx.closePath(); ctx.clip();
  floorBoards(g, v, X.bedL - 40, X.bedR + 9);
  floorTiles(g, v, X.bedR + 9, X.kitR + 40);
  ctx.restore();
  // shade where the floor meets the wall, under the roof, and in each corner
  for (const [a, b] of [[X.bedL, X.bedR], [X.kitL, X.kitR]]) {
    v.onTop(ctx, 0, () => { ctx.fillStyle = g.lin(0, 0, 0, 26, [[0, '#0a082c', 0.34], [1, '#0a082c', 0]]); ctx.fillRect(a, 0, b - a, 26); });
    v.onFront(ctx, 0, () => { ctx.fillStyle = g.lin(0, -WALL, 0, -WALL + 60, [[0, '#060624', 0.55], [1, '#060624', 0]]); ctx.fillRect(a, -WALL, b - a, 60); });
  }
  for (const [x, dir] of [[X.bedL, 1], [X.bedR, -1], [X.kitL, 1], [X.kitR, -1]]) {
    v.onFront(ctx, 0, () => { ctx.fillStyle = g.lin(x, 0, x + dir * 22, 0, [[0, '#060624', 0.32], [1, '#060624', 0]]); ctx.fillRect(Math.min(x, x + dir * 22), -WALL, 22, WALL); });
  }
  // a doormat on each side of the doorway, and the light from the kitchen spilling into the bedroom
  v.onTop(ctx, 0, () => {
    ctx.fillStyle = g.lin(X.bedR, 0, X.bedR - 120, 0, [[0, '#ffd98a', 0.26], [1, '#ffd98a', 0]]);
    ctx.fill(poly([[X.bedR, DOOR.z0], [X.bedR, D], [X.bedR - 140, D], [X.bedR - 60, DOOR.z0]]));
    g.f(rr(X.kitL + 8, DOOR.z0 + 8, 40, 64, 5), '#7a5ab8', { s: 0, l: 0, shade: false, lit: false });
    g.line(rr(X.kitL + 12, DOOR.z0 + 13, 32, 54, 3), '#9b7ed6', 2.4, 0.8);
  });
  g.glow(...v.P(X.kitL + 300, 0, 120), 220, 200, '#ffd98a', 0.08);
  structure(g, v, H);

  // ---------- the bought furniture ----------
  ctx = furn.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, PAD * dpr, 0);
  g = pen(ctx);
  // bedroom
  v.onFront(ctx, 0, () => g.at(674, -200, () => roomSign(g, 'kitchen')));
  windowOnWall(g, v, 54, 122);
  wallShelf(g, v, 190, 112, 150);
  pendant(g, v, 290, 150, 54);
  bed(g, v, 46);
  plant(g, v, 164, 16, 0.92);
  desk(g, v, 186);
  deskLamp(g, v, 202, 20, 63);
  bookPile(g, v, 284, 24, 63);
  chair(g, v, 240, 76);
  doorLeaf(g, v);
  // kitchen
  const K = X.kitL;
  v.onFront(ctx, 0, () => g.at(K + 46, -196, () => roomSign(g, 'bed')));
  v.onFront(ctx, 0, () => g.at(K + 46, -252, () => clock(g)));
  windowOnWall(g, v, K + 231, 128, { curtain: null, herbs: true });
  wallShelf(g, v, K + 86, 94, 168);
  fridge(g, v, K + 14);
  counter(g, v, K + 88, 230, K + 88 + 70, K + 88 + 160);
  pendant(g, v, K + 402, 150, 92, '#ffc83d');
  tableSet(g, v, K + 400, 150);
  const [fbx, fby] = v.P(K + 400, 150, 55);
  g.at(fbx, fby, () => fruitBowl(g));
  return v;
}

// The wall, the panelling and the floor around the bookcase, drawn again sharp for the zoom into it.
export function paintBedroomPatch(g, v, x0, x1) {
  const { ctx } = g;
  bedWall(g, v, x0, x1);
  ctx.save(); ctx.beginPath(); ctx.moveTo(...v.P(x0, 0, 0)); ctx.lineTo(...v.P(x1, 0, 0)); ctx.lineTo(...v.P(x1, D + 400, 0)); ctx.lineTo(...v.P(x0, D + 400, 0)); ctx.closePath(); ctx.clip();
  floorBoards(g, v, X.bedL - 40, X.bedR + 9);
  ctx.restore();
  v.onTop(ctx, 0, () => { ctx.fillStyle = g.lin(0, 0, 0, 26, [[0, '#0a082c', 0.34], [1, '#0a082c', 0]]); ctx.fillRect(x0, 0, x1 - x0, 26); });
}
