// The house, cut through: two rooms side by side, their walls, floors and the plain bought furniture.
// Painted once onto a wide backdrop; the earned things and the avatar are drawn over it every frame.

import { rng } from './ease.js';
import { pen, rr, circ, ell, poly, rpoly, soft, pd, limb, capsule, TAU, PI } from './draw.js';

// heights, top to bottom (the camera only moves sideways)
export const V = { ceil: 116, wallTop: 130, floor: 640, front: 748, slab: 768, bottom: 896 };
// the world, left to right
export const X = { bedL: 16, bedR: 1100, kitL: 1124, kitR: 1836, end: 1852 };
export const DOOR = { top: 352, leafL: 1040 };
export const PAD = 40;                      // spare backdrop either side of the house
export const ROOMS = {
  bed: { min: -12, max: X.kitL + 42 - 414, home: -12 },
  kitchen: { min: X.bedR - 30, max: X.end + 12 - 414, home: X.bedR - 30 },
};

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

// ---------- plain furniture (bought with coins) ----------

function windowNight(g, { curtain = '#35b5a6', herbs = false } = {}) {
  const { ctx } = g, w = 132, h = 172;
  g.f(rr(-6, -6, w + 12, h + 8, 12), '#e9ecff', { s: 4, l: 2, dk: 0.26 });
  const glass = rr(8, 8, w - 16, h - 22, 5);
  g.fill(glass, g.lin(0, 8, 0, h, [[0, '#070a2a'], [0.7, '#1c1760'], [1, '#3a2a86']]));
  g.clip(glass, () => {
    g.glow(92, 44, 60, 60, '#b7c6ff', 0.3);
    const moon = new Path2D();
    moon.arc(92, 44, 17, 0, TAU);
    ctx.save(); ctx.clip(moon);
    g.flat(circ(92, 44, 17), '#ffeeb5');
    g.flat(circ(101, 37, 16), '#0d1038');
    ctx.restore();
    const r = rng(7);
    for (let i = 0; i < 16; i++) {
      const x = 12 + r() * (w - 26), y = 12 + r() * 100, s = 0.6 + r() * 1.1;
      g.flat(circ(x, y, s), '#dfe8ff', 0.5 + r() * 0.5);
    }
    g.flat(soft([[0, 150], [20, 128], [44, 136], [70, 118], [96, 134], [132, 120], [140, 170], [0, 170]]), '#141446');
    g.flat(soft([[0, 160], [30, 144], [60, 152], [90, 140], [132, 150], [140, 180], [0, 180]]), '#0c0d34');
    // the glass catches the room's light
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill(poly([[8, 60], [60, 8], [84, 8], [8, 84]]));
  });
  g.f(rr(w / 2 - 4, 8, 8, h - 22, 0), '#e9ecff', { s: 2, l: 1.2, dk: 0.26 });
  g.f(rr(8, 74, w - 16, 8, 0), '#e9ecff', { s: 2, l: 1.2, dk: 0.26 });
  g.f(rr(-14, h - 12, w + 28, 15, 6), '#f3f5ff', { s: 5, l: 2, dk: 0.3 });
  if (herbs) {
    for (const [x, c1] of [[26, '#2bc4a4'], [66, '#57d68d'], [104, '#1fa78c']]) {
      for (let i = -2; i <= 2; i++) g.f(ell(x + i * 5, h - 32 - Math.abs(i) * -3 - 6, 5, 11, i * 0.32), c1, { s: 2, l: 1 });
      g.f(rpoly([[x - 12, h - 30], [x + 12, h - 30], [x + 9, h - 12], [x - 9, h - 12]], 2.5), '#e07a4f', { s: 3, l: 1.2 });
      g.f(rr(x - 13.5, h - 33, 27, 6, 2.5), '#f08f63', { s: 2, l: 1 });
    }
  }
  if (curtain) {
    // two drapes, tied back
    const drape = side => {
      ctx.save();
      if (side < 0) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      const p = soft([[-26, -14], [26, -14], [30, 20], [16, 70], [-2, 112], [10, 150], [16, 190], [-26, 194], [-28, 90]], true, 0.8);
      g.f(p, curtain, { s: 7, l: 2.2, dk: 0.34 });
      g.clip(p, () => {
        for (const [x0, x1, a] of [[-14, -18, 0.2], [2, -8, 0.16], [16, 0, 0.12]]) {
          ctx.strokeStyle = g.dk(curtain, 0.5, a + 0.12); ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(x0, -14); ctx.bezierCurveTo(x0, 40, x1 - 6, 80, x1 - 10, 112); ctx.bezierCurveTo(x1 - 6, 140, x1, 170, x1 + 2, 196); ctx.stroke();
        }
        ctx.strokeStyle = g.lt(curtain, 0.4, 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-21, -10); ctx.bezierCurveTo(-22, 50, -24, 100, -22, 186); ctx.stroke();
      });
      g.f(rr(-16, 106, 22, 9, 4.5), '#ffc83d', { s: 2, l: 1 });
      ctx.restore();
    };
    drape(1); drape(-1);
    g.f(rr(-36, -22, w + 72, 7, 3.5), '#d9a66e', { s: 2.5, l: 1.2 });
    g.f(circ(-38, -18.5, 6.5), '#d9a66e', { s: 2.5, l: 1.4 });
    g.f(circ(w + 38, -18.5, 6.5), '#d9a66e', { s: 2.5, l: 1.4 });
  }
}

const WOOD = '#c0824f', WOOD_D = '#9a6238', WOOD_L = '#dba571';

// origin: floor, at the outside of the headboard. 258 long.
function bed(g) {
  const { ctx } = g;
  g.shadow(130, 2, 150, 11, 0.4);
  // the dark under the bed
  ctx.fillStyle = 'rgba(14,10,52,0.5)'; ctx.fill(rr(18, -30, 224, 30, 2));
  g.f(rr(232, -86, 22, 86, [11, 11, 3, 3]), WOOD, { s: 5, l: 2 });           // footboard
  g.f(rr(14, -50, 228, 24, 5), WOOD_D, { s: 4, l: 1.6 });                    // side rail
  g.f(rr(22, -84, 214, 40, [12, 12, 5, 5]), '#f3f0ff', { s: 5, l: 2, dk: 0.22 }); // mattress
  ctx.strokeStyle = g.dk('#f3f0ff', 0.25, 0.7); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(26, -62); ctx.lineTo(232, -62); ctx.stroke();
  // pillow
  const pil = soft([[28, -86], [34, -106], [60, -111], [86, -106], [92, -88], [84, -80], [36, -80]], true, 0.9);
  g.f(pil, '#ffffff', { s: 6, l: 2, dk: 0.2 });
  ctx.strokeStyle = g.dk('#ffffff', 0.2, 0.8); ctx.lineWidth = 1.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(44, -99); ctx.quadraticCurveTo(58, -94, 74, -100); ctx.stroke();
  // blanket, falling over the side, with the sheet turned back over its top end
  const bl = soft([[102, -89], [150, -93], [205, -92], [236, -85], [245, -62], [243, -36], [226, -32], [208, -35], [188, -32], [168, -35], [148, -32], [128, -35], [110, -32], [100, -40], [99, -70]], true, 0.75);
  g.flat(bl, '#e8525e');
  g.clip(bl, () => {
    for (const x of [178, 208]) { ctx.fillStyle = g.c('#ff9aa0', 0.9); ctx.fill(rr(x, -100, 12, 80, 0)); }
    g.flat(rr(90, -100, 32, 80, 0), '#fffaf4');
    ctx.fillStyle = g.dk('#e8525e', 0.4, 0.4); ctx.fillRect(122, -100, 2.4, 80);
    ctx.strokeStyle = g.dk('#e8525e', 0.4, 0.3); ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(152, -88); ctx.quadraticCurveTo(148, -60, 153, -38); ctx.moveTo(228, -84); ctx.quadraticCurveTo(232, -62, 229, -40); ctx.stroke();
  });
  g.over(bl, { s: 7, l: 2.2, a: 0.24 });
  g.f(rr(0, -138, 26, 138, [13, 13, 3, 3]), WOOD, { s: 6, l: 2.4 });          // headboard
  g.f(rr(5, -128, 16, 60, 8), WOOD_L, { s: 3, l: 0, lit: false, dk: 0.18 });
}

// a wall plank on two brackets. origin: top-left of the plank.
function shelf(g, w) {
  for (const x of [22, w - 22]) g.f(pd(`M${x - 3} 6 h6 v20 q-1 4 -3 5 q-2 -1 -3 -5z`), '#4b54a8', { s: 1.6, l: 0.8 });
  g.ctx.fillStyle = 'rgba(10,8,44,0.28)'; g.ctx.fill(rr(4, 9, w - 4, 7, 3));
  g.f(rr(0, 0, w, 10, 3.5), WOOD_L, { s: 3.4, l: 1.5, dk: 0.34 });
}

// origin: floor, left end. 196 wide, top at -108.
function desk(g) {
  const { ctx } = g;
  g.shadow(98, 2, 112, 9, 0.36);
  ctx.fillStyle = 'rgba(14,10,52,0.34)'; ctx.fill(rr(14, -96, 110, 96, 2));
  g.f(rr(6, -100, 11, 100, 2.5), WOOD_D, { s: 3, l: 1.4 });
  g.f(rr(16, -100, 110, 9, 2), WOOD_D, { s: 2, l: 0, lit: false });
  g.f(rr(124, -100, 66, 97, 4), WOOD, { s: 5, l: 2 });
  for (const y of [-93, -62, -31]) {
    g.f(rr(130, y, 54, 25, 4), WOOD_L, { s: 3, l: 1.3, dk: 0.26 });
    g.f(rr(149, y + 10, 16, 4.5, 2.2), '#ffc83d', { s: 1.4, l: 0.8 });
  }
  g.f(rr(128, -4, 8, 4, 1.5), WOOD_D, { shade: false, lit: false }); g.f(rr(178, -4, 8, 4, 1.5), WOOD_D, { shade: false, lit: false });
  g.f(rr(-4, -111, 204, 12, 4.5), WOOD_L, { s: 4, l: 1.6, dk: 0.34 });
}

// origin: desk top, base centre. the head points down to the right.
function deskLamp(g) {
  const { ctx } = g, col = '#ff7a59';
  // the light it throws
  const cone = poly([[36, -52], [58, -44], [100, 0], [18, 0]]);
  ctx.fillStyle = g.lin(0, -50, 0, 0, [[0, '#ffe9a8', 0.4], [1, '#ffe9a8', 0.04]]); ctx.fill(cone);
  g.glow(58, -1, 46, 7, '#ffe9a8', 0.5);
  g.f(rr(-15, -6, 30, 6, 3), col, { s: 2.4, l: 1.2 });
  g.f(capsule(0, -6, -12, -42, 2.6), '#dfe5ff', { s: 1.4, l: 0.8 });
  g.f(capsule(-12, -42, 26, -64, 2.6), '#dfe5ff', { s: 1.4, l: 0.8 });
  g.f(circ(-12, -42, 4.4), col, { s: 1.6, l: 0.9 }); g.f(circ(0, -7, 3.6), col, { s: 1.4, l: 0.8 });
  ctx.save(); ctx.translate(30, -64); ctx.rotate(0.62);
  g.f(pd('M-9 -7 L9 -7 Q11 -7 12 -5 L22 14 Q0 22 -22 14 L-12 -5 Q-11 -7 -9 -7Z'), col, { s: 4, l: 1.8 });
  g.flat(ell(0, 15.5, 20, 4.6), '#fff3c4');
  g.f(rr(-5, -12, 10, 6, 2.5), col, { s: 1.6, l: 0.8 });
  ctx.restore();
}

function books(g, list) {
  // a stack lying flat. list: [width, height, colour, x offset]; origin: surface, centre
  let y = 0;
  for (const [w, h, col, dx = 0] of list) {
    g.f(rr(-w / 2 + dx, y - h, w, h, 2), col, { s: 2.4, l: 1.2 });
    g.f(rr(w / 2 + dx - 5, y - h + 1.5, 4, h - 3, 1), '#fff7e4', { shade: false, lit: false });
    g.flat(rr(-w / 2 + dx + 6, y - h + 2, 3, h - 4, 1), '#ffffff', 0.5);
    y -= h;
  }
}

// origin: floor centre. faces left, tucked under the desk.
function chair(g) {
  g.shadow(2, 2, 34, 6, 0.3);
  g.f(limb(20, -60, 3.4, 23, -1, 2.6), WOOD_D, { s: 2, l: 1 });
  g.f(limb(-18, -58, 3.4, -21, -1, 2.6), WOOD_D, { s: 2, l: 1 });
  g.f(rr(17, -132, 8, 76, 4), WOOD, { s: 2.6, l: 1.2 });
  g.f(rr(11, -132, 16, 34, 6), '#35b5a6', { s: 3.4, l: 1.5 });
  g.f(rr(-24, -66, 50, 9, 4), WOOD, { s: 3, l: 1.3 });
  g.f(rr(-23, -73, 44, 9, 4.5), '#35b5a6', { s: 3, l: 1.4 });
}

// origin: floor, left. 116 wide, 232 tall.
function bookcase(g) {
  const { ctx } = g, w = 116, h = 232;
  g.shadow(w / 2, 2, 72, 9, 0.38);
  g.f(rr(0, -h, w, h, 6), WOOD, { s: 6, l: 2.2 });
  const cols = ['#ee4b7a', '#49c6ff', '#ffc83d', '#2bc4a4', '#8b5cf0', '#ff7a59', '#f3f0ff', '#3b6fd6'];
  const r = rng(23);
  for (let i = 0; i < 4; i++) {
    const top = -h + 10 + i * 55, bay = rr(9, top, w - 18, 46, 3);
    g.flat(bay, '#5c3722');
    g.clip(bay, () => {
      ctx.fillStyle = 'rgba(10,6,40,0.38)'; ctx.fillRect(9, top, w - 18, 12);
      let x = 12;
      const leanAt = i === 1 ? 5 : i === 3 ? 4 : -1;
      for (let k = 0; x < w - 22; k++) {
        const bw = 7 + Math.floor(r() * 6), bh = 30 + Math.floor(r() * 12), col = cols[Math.floor(r() * cols.length)];
        if (i === 2 && k === 4) {   // a gap with a little pot
          g.f(rpoly([[x + 2, top + 30], [x + 20, top + 30], [x + 17, top + 46], [x + 5, top + 46]], 2), '#e07a4f', { s: 2, l: 1 });
          for (const a of [-0.5, 0, 0.5]) g.f(ell(x + 11 + a * 10, top + 22, 4, 9, a), '#2bc4a4', { s: 1.6, l: 0.8 });
          x += 26; continue;
        }
        ctx.save();
        if (k === leanAt) { ctx.translate(x + bw + 9, top + 46); ctx.rotate(0.24); ctx.translate(-(x + bw), -(top + 46)); }
        g.f(rr(x, top + 46 - bh, bw, bh, 1.6), col, { s: 1.8, l: 1 });
        g.flat(rr(x + 1.5, top + 46 - bh + 5, bw - 3, 2.4, 1), '#ffffff', 0.55);
        g.flat(rr(x + 1.5, top + 46 - 9, bw - 3, 2.4, 1), '#1a1056', 0.3);
        ctx.restore();
        x += bw + (k === leanAt ? 12 : 1.4);
      }
    });
  }
  g.f(rr(-4, -h - 6, w + 8, 10, 4), WOOD_L, { s: 3, l: 1.4 });
}

// origin: floor centre
function plant(g, big = 1) {
  const { ctx } = g;
  g.shadow(0, 2, 30, 6);
  const leaf = (x, y, len, wd, rot, col) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    const p = pd(`M0 0 C${wd} ${-len * 0.25} ${wd} ${-len * 0.75} 0 ${-len} C${-wd} ${-len * 0.75} ${-wd} ${-len * 0.25} 0 0Z`);
    g.f(p, col, { s: 3.4, l: 1.4 });
    ctx.strokeStyle = g.dk(col, 0.35, 0.6); ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, -len + 6); ctx.stroke();
    ctx.restore();
  };
  ctx.save(); ctx.scale(big, big);
  leaf(-4, -44, 62, 15, -0.75, '#1fa78c'); leaf(4, -44, 66, 15, 0.7, '#1fa78c');
  leaf(-2, -46, 78, 17, -0.3, '#2bc4a4'); leaf(3, -46, 74, 16, 0.32, '#2bc4a4');
  leaf(0, -46, 88, 17, 0.02, '#4fdcbc');
  g.f(rpoly([[-21, -46], [21, -46], [16, 0], [-16, 0]], 4), '#e07a4f', { s: 4.5, l: 1.8 });
  g.f(rr(-24, -52, 48, 11, 4), '#f08f63', { s: 3, l: 1.4 });
  ctx.restore();
}

// hangs from the ceiling. origin: where the cord meets the ceiling.
function pendant(g, drop = 86, col = '#e9ecff') {
  const { ctx } = g;
  g.glow(0, drop + 34, 150, 120, '#ffe2a0', 0.2);
  ctx.fillStyle = g.lin(0, drop + 20, 0, drop + 330, [[0, '#ffe9a8', 0.075], [1, '#ffe9a8', 0]]);
  ctx.fill(poly([[-30, drop + 22], [30, drop + 22], [150, drop + 330], [-150, drop + 330]]));
  g.flat(rr(-1.3, 0, 2.6, drop, 0), '#aab4e6');
  g.f(rr(-7, 0, 14, 5, 2), '#aab4e6', { s: 1.6, l: 0.8 });
  g.f(circ(0, drop + 24, 9), '#fff3c4', { shade: false, lit: false });
  g.glow(0, drop + 26, 30, 30, '#fff3c4', 0.7);
  const dome = pd(`M-34 ${drop + 24} C-34 ${drop - 4} -14 ${drop - 6} -6 ${drop - 8} L6 ${drop - 8} C14 ${drop - 6} 34 ${drop - 4} 34 ${drop + 24}Z`);
  g.f(dome, col, { s: 5, l: 2, dk: 0.3 });
  g.f(rr(-36, drop + 20, 72, 7, 3.5), col, { s: 2, l: 1, dk: 0.36 });
}

// ---------- the kitchen's plain furniture ----------

const CAB = '#2f8f8a', CAB_L = '#49b3a8', TOP = '#f3ead8';

// origin: floor, left. 96 wide, 236 tall.
function fridge(g) {
  const { ctx } = g;
  g.shadow(48, 2, 62, 8, 0.36);
  g.f(rr(8, -8, 12, 8, 2), '#6b74bd', { shade: false, lit: false }); g.f(rr(76, -8, 12, 8, 2), '#6b74bd', { shade: false, lit: false });
  g.f(rr(0, -236, 96, 230, 16), '#f6e7c8', { s: 8, l: 2.6, dk: 0.24 });
  ctx.strokeStyle = g.dk('#f6e7c8', 0.34, 0.9); ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(1, -164); ctx.lineTo(95, -164); ctx.stroke();
  ctx.strokeStyle = g.lt('#f6e7c8', 0.7, 0.9); ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(3, -161.6); ctx.lineTo(90, -161.6); ctx.stroke();
  g.f(rr(11, -200, 8, 28, 4), '#dfe5ff', { s: 2, l: 1.1, dk: 0.4 });
  g.f(rr(11, -154, 8, 52, 4), '#dfe5ff', { s: 2, l: 1.1, dk: 0.4 });
  // magnets and a note
  g.f(rr(52, -146, 24, 26, 2), '#fff7c2', { s: 2, l: 0, lit: false, dk: 0.18 });
  ctx.strokeStyle = g.c('#c9b56a', 0.9); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  for (const y of [-138, -132, -126]) { ctx.beginPath(); ctx.moveTo(56, y); ctx.lineTo(y === -126 ? 66 : 72, y); ctx.stroke(); }
  g.f(circ(64, -146, 3.6), '#ee4b7a', { s: 1.4, l: 0.8 });
  g.f(circ(40, -208, 4.4), '#49c6ff', { s: 1.6, l: 0.9 }); g.f(rr(60, -214, 12, 9, 2.5), '#ffc83d', { s: 1.6, l: 0.9 });
}

// origin: floor, left. `w` wide, top at -92. An oven sits `ovenAt` from the left.
function counter(g, w, ovenAt) {
  const { ctx } = g;
  g.shadow(w / 2, 2, w / 2 + 14, 8, 0.36);
  g.flat(rr(4, -10, w - 8, 10, 0), '#1c4f55');
  g.f(rr(0, -90, w, 82, 5), CAB, { s: 5, l: 2 });
  let x = 8;
  while (x < w - 30) {
    if (Math.abs(x - ovenAt) < 2) {
      // the oven
      g.f(rr(x, -84, 84, 72, 5), '#e9ecff', { s: 4, l: 1.6, dk: 0.3 });
      const win = rr(x + 9, -60, 66, 40, 5);
      g.fill(win, g.lin(0, -60, 0, -20, [[0, '#231a55'], [1, '#4a2a6a']]));
      g.clip(win, () => { g.glow(x + 42, -22, 40, 22, '#ffa23a', 0.55); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(poly([[x + 9, -34], [x + 36, -60], [x + 50, -60], [x + 9, -20]])); });
      g.f(rr(x + 12, -70, 60, 5, 2.5), '#aab4e6', { s: 1.6, l: 0.9 });
      for (let i = 0; i < 4; i++) g.f(circ(x + 15 + i * 18, -78, 3.6), i === 1 ? '#ee4b7a' : '#5b63b8', { s: 1.4, l: 0.8 });
      x += 90;
    } else {
      const dw = Math.min(58, w - 8 - x);
      if (dw < 30) break;
      g.f(rr(x, -84, dw, 20, 4), CAB_L, { s: 3, l: 1.3, dk: 0.3 });
      g.f(rr(x + dw / 2 - 8, -77, 16, 4.5, 2.2), '#f3ead8', { s: 1.4, l: 0.7 });
      g.f(rr(x, -60, dw, 48, 4), CAB_L, { s: 3, l: 1.3, dk: 0.3 });
      g.f(circ(x + dw - 9, -40, 3), '#f3ead8', { s: 1.3, l: 0.7 });
      x += dw + 6;
    }
  }
  g.f(rr(-6, -101, w + 12, 12, 4), TOP, { s: 4, l: 1.8, dk: 0.3 });
  // the hob over the oven
  g.f(rr(ovenAt + 4, -104, 76, 5, 2), '#3a3f7a', { s: 1.6, l: 0.8 });
}

// origin: floor centre. A round table and a stool.
function table(g) {
  g.shadow(0, 2, 62, 8, 0.34);
  g.f(rpoly([[-26, 0], [26, 0], [8, -10], [-8, -10]], 3), WOOD_D, { s: 2.4, l: 1.2 });
  g.f(rr(-5, -86, 10, 80, 3), WOOD_D, { s: 2.6, l: 1.2 });
  g.f(rr(-58, -96, 116, 11, 5), WOOD_L, { s: 4, l: 1.6, dk: 0.34 });
}
function stool(g) {
  g.shadow(0, 2, 26, 5, 0.3);
  g.f(limb(-12, -50, 3, -17, -1, 2.4), WOOD_D, { s: 1.8, l: 0.9 }); g.f(limb(12, -50, 3, 17, -1, 2.4), WOOD_D, { s: 1.8, l: 0.9 });
  g.flat(rr(-14, -24, 28, 3.4, 1.5), WOOD_D);
  g.f(rr(-21, -60, 42, 11, 5.5), '#ee4b7a', { s: 3, l: 1.4 });
}
function fruitBowl(g) {
  g.f(circ(-10, -17, 9), '#ff7a59', { s: 3, l: 1.4 }); g.f(circ(8, -18, 9.5), '#ffc83d', { s: 3, l: 1.4 }); g.f(circ(-1, -24, 8.5), '#ee4b7a', { s: 3, l: 1.4 });
  g.f(pd('M-25 -16 L25 -16 C24 -4 14 0 8 0 L-8 0 C-14 0 -24 -4 -25 -16Z'), '#49c6ff', { s: 4, l: 1.6 });
  g.f(rr(-27, -19, 54, 5, 2.5), '#7ad6ff', { s: 1.6, l: 0.9 });
}

// ---------- the shell ----------

function doorLeaf(g) {
  // the door between the rooms, standing open into the bedroom. origin: the foot of its hinge, on the wall.
  // The floor runs up the picture as it goes back, so a door swung toward us hangs lower at its free edge.
  const { ctx } = g, w = 58, h = V.floor - DOOR.top - 2;
  ctx.fillStyle = 'rgba(10,8,44,0.3)'; ctx.fill(poly([[0, 0], [-w - 16, 50], [-w - 34, 50], [-10, 0]]));
  ctx.save(); ctx.transform(1, -0.86, 0, 1, 0, 0);
  g.f(rr(-w - 5, -h, 8, h, 2), '#f6c98a', { shade: false, lit: false });       // its edge, facing us
  g.f(rr(-w, -h, w, h, [5, 2, 0, 0]), '#e9a24f', { s: 5, l: 1.6, dk: 0.3 });
  for (const [y, hh] of [[-h + 16, 98], [-h + 128, 130]]) {
    g.flat(rr(-w + 9, y, w - 18, hh, 4), '#d98a3a');
    ctx.strokeStyle = g.dk('#e9a24f', 0.4, 0.75); ctx.lineWidth = 2; ctx.stroke(rr(-w + 9, y, w - 18, hh, 4));
    ctx.strokeStyle = g.lt('#e9a24f', 0.5, 0.7); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-w + 11, y + hh + 1.6); ctx.lineTo(-11, y + hh + 1.6); ctx.stroke();
  }
  for (const y of [-h + 30, -54]) g.f(rr(-3.6, y, 4, 16, 1.5), '#aab4e6', { s: 1, l: 0.6 });
  ctx.restore();
  g.f(circ(-w + 8, -h / 2 + 14 + 0.86 * (w - 8), 5.4), '#ffc83d', { s: 2, l: 1.2 });   // the knob, round whatever the door's angle
}

function clock(g) {
  const { ctx } = g;
  g.flat(circ(2.5, 4, 27), '#0a082c', 0.3);
  g.f(circ(0, 0, 27), '#ee4b7a', { s: 4, l: 1.8 });
  g.f(circ(0, 0, 21.5), '#fff7e4', { s: 0, l: 0, shade: false, lit: false });
  ctx.fillStyle = 'rgba(26,16,86,0.14)'; ctx.fill(pd('M-21.5 0 A21.5 21.5 0 0 1 14 -16.4 A24 24 0 0 0 -19 6Z'));
  for (let i = 0; i < 12; i++) { const a = i * PI / 6; g.flat(circ(Math.cos(a) * 17, Math.sin(a) * 17, i % 3 ? 1 : 1.8), '#3a3f7a'); }
  g.f(capsule(0, 0, 9, -8, 1.8), '#3a3f7a', { shade: false, lit: false });
  g.f(capsule(0, 0, -5, -14, 1.4), '#3a3f7a', { shade: false, lit: false });
  g.flat(circ(0, 0, 2.6), '#ee4b7a');
}

// a round picture sign: where a doorway leads. kind: 'kitchen' | 'bed'
function roomSign(g, kind) {
  const { ctx } = g;
  g.flat(circ(1.5, 3, 19), '#0a082c', 0.3);
  g.f(circ(0, 0, 19), kind === 'kitchen' ? '#ffa23a' : '#8b5cf0', { s: 3.4, l: 1.6 });
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'kitchen') {
    // a pot with its lid
    ctx.fill(pd('M-10 -3 H10 V5 Q10 10 5 10 H-5 Q-10 10 -10 5Z'));
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-13, -1); ctx.lineTo(-10, -1); ctx.moveTo(10, -1); ctx.lineTo(13, -1); ctx.stroke();
    ctx.fill(rr(-11, -7.5, 22, 3.2, 1.6)); ctx.fill(circ(0, -9.6, 2.2));
  } else {
    // a bed
    ctx.fill(rr(-12, -1, 24, 7, 2)); ctx.fill(rr(-12, -8, 4, 16, 1.5)); ctx.fill(rr(9, 0, 3, 8, 1.2)); ctx.fill(rr(-6.5, -5.5, 8, 4.5, 2.2));
  }
}

function floorBoards(g, x0, x1) {
  const { ctx } = g, rows = 4, rh = (V.front - V.floor) / rows, r = rng(5);
  const tones = ['#c98f5f', '#c2875a', '#cf9766', '#bd8254'];
  for (let i = 0; i < rows; i++) {
    const y = V.floor + i * rh;
    let x = x0 - r() * 120;
    while (x < x1) {
      const len = 110 + r() * 110;
      g.flat(rr(x, y, len + 0.6, rh + 0.6, 0), tones[Math.floor(r() * tones.length)]);
      ctx.fillStyle = 'rgba(110,60,30,0.5)'; ctx.fillRect(x + len - 1, y, 1.6, rh);
      // a little grain
      ctx.strokeStyle = 'rgba(120,70,36,0.22)'; ctx.lineWidth = 1; ctx.lineCap = 'round';
      const gx = x + 14 + r() * (len - 60), gy = y + 6 + r() * (rh - 12);
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + 16, gy - 2, gx + 34, gy + 1); ctx.stroke();
      x += len;
    }
    ctx.fillStyle = 'rgba(110,60,30,0.42)'; ctx.fillRect(x0, y - 0.8, x1 - x0, 1.6);
    ctx.fillStyle = 'rgba(255,225,180,0.2)'; ctx.fillRect(x0, y + 0.8, x1 - x0, 1.2);
  }
}

function floorTiles(g, x0, x1) {
  const { ctx } = g, rows = 4, rh = (V.front - V.floor) / rows, tw = 54;
  for (let i = 0; i < rows; i++) {
    for (let k = 0, x = x0; x < x1; k++, x += tw) {
      g.flat(rr(x, V.floor + i * rh, Math.min(tw, x1 - x) + 0.5, rh + 0.5, 0), (i + k) % 2 ? '#f0e4cc' : '#d9825e');
    }
    ctx.fillStyle = 'rgba(90,40,30,0.25)'; ctx.fillRect(x0, V.floor + i * rh - 0.6, x1 - x0, 1.2);
  }
  for (let x = x0 + tw; x < x1; x += tw) { ctx.fillStyle = 'rgba(90,40,30,0.2)'; ctx.fillRect(x - 0.6, V.floor, 1.2, V.front - V.floor); }
}

export function paintBackdrop(canvas, dpr) {
  const W = X.end + PAD * 2;
  canvas.width = W * dpr; canvas.height = V.bottom * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, PAD * dpr, 0);
  const g = pen(ctx), H = hatch(ctx);
  const wallH = V.floor - V.wallTop;

  // the ground outside and under the house
  ctx.fillStyle = '#0b0e2c'; ctx.fillRect(-PAD, V.front + 6, W, V.bottom - V.front);
  ctx.fillStyle = '#1b2459'; ctx.fillRect(-PAD, V.front + 4, W, 5);

  // ---- bedroom ----
  ctx.fillStyle = g.lin(0, V.wallTop, 0, V.floor, [[0, '#212a70'], [0.5, '#293486'], [1, '#2c388e']]);
  ctx.fillRect(X.bedL, V.wallTop, X.bedR - X.bedL, wallH);
  for (let x = X.bedL + 10; x < X.bedR; x += 38) { ctx.fillStyle = 'rgba(130,150,255,0.055)'; ctx.fillRect(x, V.wallTop, 19, wallH); }
  // wainscot
  const wy = 506;
  ctx.fillStyle = '#343f9e'; ctx.fillRect(X.bedL, wy, X.bedR - X.bedL, V.floor - wy);
  for (let x = X.bedL + 14; x < X.bedR - 60; x += 96) {
    const p = rr(x, wy + 22, 82, 86, 5);
    g.flat(p, '#2f3992');
    ctx.strokeStyle = '#252e7c'; ctx.lineWidth = 2; ctx.stroke(p);
    ctx.strokeStyle = 'rgba(120,138,240,0.6)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x + 5, wy + 109.4); ctx.lineTo(x + 78, wy + 109.4); ctx.moveTo(x + 83.4, wy + 27); ctx.lineTo(x + 83.4, wy + 104); ctx.stroke();
  }
  g.f(rr(X.bedL, wy - 4, X.bedR - X.bedL, 12, 0), '#4c59c2', { s: 3, l: 1.6, sx: 0, lx: 0 });
  g.f(rr(X.bedL, V.floor - 15, X.bedR - X.bedL, 15, 0), '#262f80', { s: 0, l: 1.6, lx: 0, shade: false });

  // ---- kitchen ----
  ctx.fillStyle = g.lin(0, V.wallTop, 0, V.floor, [[0, '#15464f'], [0.5, '#1b5862'], [1, '#1f626b']]);
  ctx.fillRect(X.kitL, V.wallTop, X.kitR - X.kitL, wallH);
  for (let y = V.wallTop + 26, row = 0; y < 440; y += 30, row++) {
    for (let x = X.kitL + 14 + (row % 2) * 17; x < X.kitR; x += 34) g.flat(circ(x, y, 2.2), '#3d8f95', 0.4);
  }
  // tiles on the lower wall
  const ty = 444, ts = 28;
  ctx.fillStyle = '#f3ead8'; ctx.fillRect(X.kitL, ty, X.kitR - X.kitL, V.floor - ty);
  const rt = rng(12);
  for (let row = 0, y = ty; y < V.floor; row++, y += ts) {
    for (let x = X.kitL - (row % 2) * ts / 2; x < X.kitR; x += ts) {
      const k = rt();
      if (k < 0.05) g.flat(rr(x, y, ts, ts, 0), '#8fd0c4'); else if (k < 0.4) g.flat(rr(x, y, ts, ts, 0), '#f8f1e2');
      ctx.fillStyle = 'rgba(160,130,90,0.4)'; ctx.fillRect(x - 0.7, y, 1.4, ts);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 0.7, y + 1, 1, ts - 2);
    }
    ctx.fillStyle = 'rgba(160,130,90,0.4)'; ctx.fillRect(X.kitL, y - 0.7, X.kitR - X.kitL, 1.4);
  }
  ctx.fillStyle = '#15464f'; ctx.fillRect(X.bedR, V.wallTop, X.kitL - X.bedR, wallH);
  g.f(rr(X.kitL, ty - 9, X.kitR - X.kitL, 11, 0), '#e07a4f', { s: 3, l: 1.6, sx: 0, lx: 0 });
  g.f(rr(X.kitL, V.floor - 13, X.kitR - X.kitL, 13, 0), '#c9bfa6', { s: 0, l: 1.4, lx: 0, shade: false });

  // floors
  ctx.save(); ctx.beginPath(); ctx.rect(X.bedL, V.floor, X.kitR - X.bedL, V.front - V.floor); ctx.clip();
  floorBoards(g, X.bedL, X.bedR + 12);
  floorTiles(g, X.bedR + 12, X.kitR);
  ctx.restore();
  for (const [a, b] of [[X.bedL, X.bedR], [X.kitL, X.kitR]]) {
    ctx.fillStyle = g.lin(0, V.floor, 0, V.floor + 26, [[0, '#0a082c', 0.36], [1, '#0a082c', 0]]); ctx.fillRect(a, V.floor, b - a, 26);
    ctx.fillStyle = g.lin(0, V.wallTop, 0, V.wallTop + 90, [[0, '#060624', 0.55], [1, '#060624', 0]]); ctx.fillRect(a, V.wallTop, b - a, 90);
  }
  // corner shade where a side wall meets the back wall
  for (const [x, dir] of [[X.bedL, 1], [X.bedR, -1], [X.kitL, 1], [X.kitR, -1]]) {
    ctx.fillStyle = g.lin(x, 0, x + dir * 30, 0, [[0, '#060624', 0.34], [1, '#060624', 0]]);
    ctx.fillRect(Math.min(x, x + dir * 30), V.wallTop, 30, V.front - V.wallTop);
  }

  // moonlight through the bedroom window, lamplight in the kitchen
  ctx.fillStyle = g.lin(0, V.floor, 0, V.front, [[0, '#b9c8ff', 0.2], [1, '#b9c8ff', 0.06]]);
  ctx.fill(poly([[96, V.floor], [206, V.floor], [286, V.front], [150, V.front]]));
  g.glow(X.kitL + 600, 470, 190, 200, '#ffd98a', 0.1);

  // ---- furniture against the bedroom wall ----
  g.at(70, 214, () => windowNight(g));
  g.at(28, 712, () => bed(g));
  g.at(466, 702, () => plant(g, 0.8));
  g.at(724, V.wallTop, () => pendant(g, 52));
  g.at(520, 396, () => shelf(g, 190));
  g.at(512, 706, () => desk(g));
  g.at(538, 595, () => deskLamp(g));
  g.at(660, 595, () => books(g, [[46, 9, '#3b6fd6'], [40, 8, '#ee4b7a', -2], [34, 7, '#ffc83d', 3]]));
  g.at(556, 716, () => chair(g));
  g.at(902, 702, () => bookcase(g));

  // ---- furniture in the kitchen ----
  const K = X.kitL;
  g.at(K + 46, 702, () => fridge(g));
  g.at(K + 94, 330, () => clock(g));
  g.at(K + 158, 704, () => counter(g, 336, 200));
  g.at(K + 202, 232, () => windowNight(g, { curtain: null, herbs: true }));
  g.at(K + 372, 412, () => shelf(g, 150));
  g.at(K + 600, V.wallTop, () => pendant(g, 150, '#ffc83d'));
  g.at(K + 604, 716, () => table(g));
  g.at(K + 604, 620, () => fruitBowl(g));
  g.at(K + 674, 724, () => stool(g));

  // ---- the cut faces: floor edge, slab, ceiling and walls ----
  ctx.fillStyle = '#8f5a35'; ctx.fillRect(X.bedL, V.front, X.bedR + 12 - X.bedL, 5);
  ctx.fillStyle = '#a85a3e'; ctx.fillRect(X.bedR + 12, V.front, X.kitR - X.bedR - 12, 5);
  const cut = p => { ctx.fillStyle = H; ctx.fill(p); ctx.strokeStyle = '#aab4e6'; ctx.lineWidth = 1.5; ctx.stroke(p); };
  cut(rr(-6, V.front + 5, X.end + 12, V.slab - V.front - 5, 3));
  cut(rr(-10, V.ceil, X.end + 20, V.wallTop - V.ceil, 4));
  cut(rr(0, V.wallTop - 1, X.bedL, V.front + 6 - V.wallTop, 0));
  cut(rr(X.kitR, V.wallTop - 1, X.end - X.kitR, V.front + 6 - V.wallTop, 0));
  // the wall between the rooms, with its doorway
  ctx.fillStyle = g.lin(0, DOOR.top, 0, V.front, [[0, '#2a1650'], [0.45, '#6a3a4a'], [1, '#c98052']]);
  ctx.fillRect(X.bedR, DOOR.top, X.kitL - X.bedR, V.floor - DOOR.top);
  ctx.fillStyle = '#b06a3c'; ctx.fillRect(X.bedR, V.floor, X.kitL - X.bedR, V.front - V.floor);
  ctx.fillStyle = 'rgba(255,220,160,0.25)'; ctx.fillRect(X.bedR, V.floor, X.kitL - X.bedR, 2);
  cut(rr(X.bedR, V.wallTop - 1, X.kitL - X.bedR, DOOR.top - V.wallTop + 1, [0, 0, 3, 3]));
  g.f(rr(X.bedR - 3, DOOR.top - 6, X.kitL - X.bedR + 6, 9, 3), '#e9a24f', { s: 2.4, l: 1.2 });
  // light spilling through the doorway, both ways
  ctx.fillStyle = g.lin(X.bedR, 0, X.bedR - 150, 0, [[0, '#ffd98a', 0.3], [1, '#ffd98a', 0]]);
  ctx.fill(poly([[X.bedR, V.floor], [X.bedR, V.front], [X.bedR - 150, V.front], [X.bedR - 70, V.floor]]));
  g.at(X.bedR, V.floor + 1, () => doorLeaf(g));
  g.at(X.bedR - 34, 318, () => roomSign(g, 'kitchen'));
  g.at(X.kitL + 34, 318, () => roomSign(g, 'bed'));
}
