// The cut-out person on the style dial. One drawing, person(g, s): at s = 0 it is round 5's Cut-out person to the
// number (../../avatar5/js/person.js and styles.js), and as s rises the style moves toward grown-up editorial flat
// vector. The pose never changes: standing square on, waving with the arm on the left of the picture, the other arm
// down and a little out. The shape language stays cut paper all the way: circles, half circles, straight cuts.
//
// What the dial moves, from 0 to 1:
//   proportion   the head shrinks from a third of the height to about a sixth; a neck appears; the legs grow long
//   clothes      the yellow A-line smock becomes a longer ochre coat with a straight hem and a bone collar, over
//                slim dark trousers; the shoes shrink to small flat half ovals
//   face         big white eyes with pupils, raised brows and an open grin become small dark half-oval eyes under a
//                level lid line, no brows, the cut nose kept, and no mouth: the face is calm, the pose does the waving
//   hair         the copper fan of a ponytail stays (it is the character), smaller, in rust
//   limbs        thinner, with small hands
//   colour       saturated orange, yellow and periwinkle move to rust, ochre, bone and a warm charcoal
//   shading      the same straight cut all the way (it was already the grown-up part), with a smaller step in tone
//   floor        the flat pill shadow becomes a thin flat ellipse
//
// Drawn from its feet at (0, 0), up is negative y, in round 5's units.

import { rr, circ, ell, poly, pd } from '../../avatar10/js/kit.js';
import { dial, ramp } from './dial.js';

const PI = Math.PI;

// round 5's shape makers, copied (../../avatar5/js/kit.js and person.js), so this file stands on round 10's kit
function wedge(cx, cy, r, a, b) { const p = new Path2D(); p.moveTo(cx, cy); p.arc(cx, cy, r, a, b); p.closePath(); return p; }
function segment(cx, cy, r, cutY, keepBelow = true) {
  const p = new Path2D(), dd = Math.max(-r, Math.min(r, cutY - cy)), a = Math.asin(dd / r);
  if (keepBelow) p.arc(cx, cy, r, a, PI - a); else p.arc(cx, cy, r, PI - a, PI * 2 + a);
  p.closePath();
  return p;
}
const bar = (x1, y1, x2, y2, w) => {
  const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  return poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]);
};
// the top half of an oval sitting on y (a shoe)
function halfOval(cx, y, rx, ry) { const p = new Path2D(); p.ellipse(cx, y, rx, ry, 0, PI, PI * 2); p.closePath(); return p; }

export function person(g, s) {
  const d = dial(s), c = g.ctx;

  // ---- colour: round 5's at 0, restrained at 1 ----
  const SK = d.c('#c98458', '#b47657'), SKD = d.c('#9a5662', '#93594c'), NO = d.c('#a65f3e', '#8e5240');
  const HR = d.c('#ef6233', '#b4472f'), HRD = d.c('#b63a4d', '#8a3529');
  const SU = d.c('#ffc84a', '#d3a34e'), SUD = d.c('#e8903f', '#b0813c');
  const LG = d.c('#4f55b8', '#4a3f45'), LGD = d.c('#363a8f', '#3a3136'), FT = d.c('#2a2660', '#1f1a20');
  const BR = d.c('#5e1d3c', '#4a2430'), MO = d.c('#7a1e3a', '#5a2430'), DOT = d.c('#2b2b3f', '#2a1d24');
  const BONE = '#e9e0cf', BONED = '#cbbfa8';

  // a form with its shadow as a straight cut: everything right of x in the dark tone (round 5's pen.cut)
  const cut = (p, base, dark, x) => {
    c.fillStyle = base; c.fill(p);
    if (!dark || x == null) return;
    g.clip(p, () => { c.fillStyle = dark; c.fill(rr(x, -2000, 4000, 4000, 0)); });
  };

  // ---- the floor ----
  if (!g.noGround) {
    if (s < 0.5) g.ground(30, 'pill');
    else g.ground(d(30, 34), 'ellipse', '#0a0830', 0.3, d(9, 6));
  }

  // ---- proportions ----
  const hr = d(32, 15.5);                    // the head's radius
  const top = d(-98, -136), hem = d(-32, -66); // the smock's (then the coat's) top and hem
  const shW = d(15, 18), hemW = d(28, 19.5);   // half widths at the shoulders and the hem
  const waistY = top + (hem - top) * 0.4, waistW = d(15 + 13 * 0.4, 15.5); // the waist: on the straight side at 0
  const hy = top - hr - d(-6, 5.5);          // the head's centre: sunk into the smock at first, on a neck at the end
  const legX = d(9, 6.6), legW = d(7, 8.6), legTop = hem - d(6, 4);
  const zoom = hr / 32;                      // the face and hair are round 5's, scaled with the head

  // ---- shoes and legs ----
  for (const k of [-1, 1]) {
    if (s === 0) cut(segment(k * 13, -1, 11, -1, false), FT, null);
    else cut(halfOval(k * d(13, 8.6), -1, d(11, 8), d(11, 5)), FT, null);
  }
  for (const k of [-1, 1]) cut(rr(k * legX - legW / 2, legTop, legW, -6 - legTop, 0), LG, LGD, k * legX + 1);

  // ---- the arms: the same two angles all the way, longer and thinner ----
  const aw = d(6.5, 4.4), hand = d(6.5, 4), reach = d(1, 1.48);
  // the arm down, on the right, behind the smock
  const rx0 = d(16, 16.5), ry0 = top + 6, rx1 = rx0 + 12 * reach, ry1 = ry0 + 34 * reach;
  cut(bar(rx0, ry0, rx1, ry1, aw), SU, SUD, (rx0 + rx1) / 2);
  cut(circ(rx1 + 1, ry1 + 4 * d(1, 0.8), hand), SK, SKD, rx1 + 2);

  // ---- the smock, then the coat ----
  const coat = poly([[-shW, top], [shW, top], [waistW, waistY], [hemW, hem], [-hemW, hem], [-waistW, waistY]]);
  cut(coat, SU, SUD, d(5, 4.5));
  // the collar: a bone V at the neck, from the middle of the dial
  const col = ramp(s, 0.35, 0.9);
  if (col > 0) {
    const v = poly([[-6.5 * col, top], [6.5 * col, top], [0, top + 13 * col]]);
    g.clip(coat, () => cut(v, BONE, BONED, 1.5));
    // the coat's front edge, a thin line from the collar to the hem
    g.line(pd(`M0 ${top + 13 * col} L0 ${hem}`), SUD, 1.1 * col, 1, 'butt');
  }

  // the waving arm, on the left, in front
  const lx0 = -d(16, 16.5), ly0 = top + 6, lx1 = lx0 - 24 * reach, ly1 = ly0 - 28 * reach;
  cut(bar(lx0, ly0, lx1, ly1, aw), SU, SUD, (lx0 + lx1) / 2);
  cut(circ(lx1 - 2 * d(1, 0.6), ly1 - 4 * d(1, 0.6), d(7, 4.2)), SK, SKD, lx1 - 1);

  // ---- neck, from a quarter of the way on ----
  const nk = ramp(s, 0.15, 0.6);
  if (nk > 0) {
    const nw = 6.5 * nk;
    cut(rr(-nw / 2, hy + hr * 0.6, nw, top - (hy + hr * 0.6) + 1, 0), SK, SKD, 1.2);
  }

  // ---- the ponytail: a quarter-circle fan opening out from the crown ----
  const fan = zoom;
  cut(wedge(14 * zoom, hy - 26 * zoom, 34 * fan, -PI * 0.52, 0.1), HR, HRD, 30 * zoom);
  // ears
  cut(wedge(31 * zoom, hy + 2 * zoom, 7.5 * zoom, -PI / 2, PI / 2), SK, SKD, 33 * zoom);
  cut(wedge(-31 * zoom, hy + 2 * zoom, 7.5 * zoom, PI / 2, PI * 1.5), SK, null);
  // the head: hair, and the face as the same circle below one straight diagonal cut (the fringe)
  const head = circ(0, hy, hr);
  cut(head, HR, HRD, 9 * zoom);
  g.clip(poly([[-40 * zoom, hy - 4 * zoom], [40 * zoom, hy - 28 * zoom], [40 * zoom, hy + 44 * zoom], [-40 * zoom, hy + 44 * zoom]]),
    () => cut(circ(0, hy, hr), SK, SKD, 9 * zoom));

  // ---- the face ----
  face(g, s, d, hy, zoom, { DOT, BR, NO, MO, SK });
}

// round 5's cut-out face (FACE.cutout), moving to a small calm one
function face(g, s, d, hy, z, { DOT, BR, NO, MO }) {
  const c = g.ctx;
  // round 5's numbers, against the head's centre at -124 and its radius 32
  const ex = d(12, 10.5) * z, ey = hy + d(7, 7.5) * z;
  // eyes: white and round with the bottom cut flat (cheerful) at 0; from there a small eye with its top cut flat
  // (a lid), white at first, then a dark half oval with no white
  const white = 1 - ramp(s, 0.55, 0.7);
  for (const k of [-1, 1]) {
    const x = k * ex;
    if (s === 0) {
      const r = 9 * z, p = segment(x, ey, r, ey + r * 0.62, false);
      g.fill(p, '#ffffff');
      g.clip(p, () => {
        const lx = x - 0.9, ly = ey + 0.5;
        g.fill(circ(lx, ly, r * 0.5), DOT);
        g.fill(wedge(lx - r * 0.06, ly - r * 0.06, r * 0.26, PI, PI * 1.5), '#ffffff');
      });
      continue;
    }
    const r = d(9, 4.6) * z;
    const lid = ey - r * d(0.62, 0.3);    // the lid cuts less of the eye than round 5's flat bottom did
    if (white > 0) {
      const p = segment(x, ey, r, lid, true);
      g.fill(p, '#ffffff');
      g.clip(p, () => g.fill(circ(x - 0.6 * (1 - s), ey + r * 0.15, r * 0.52), DOT));
    } else {
      g.fill(segment(x, ey, r * d(1, 0.9), lid, true), DOT);
    }
  }
  // brows: round 5's, the left one raised, thinning and levelling until they are gone
  const bk = 1 - ramp(s, 0, 0.5);
  if (bk > 0.3) {
    const by = hy - 7 * z, bw = 13 * z * d(1, 0.8), bh = 4.5 * z * bk;
    const brow = (x, y, rot) => g.at(x, y, () => g.fill(rr(-bw / 2, -bh / 2, bw, bh * 0.8, 0), BR), 1, rot * bk);
    brow(-ex - 0.5 * z, by - 2.2 * z * bk, -0.16);
    brow(ex + 0.5 * z, by, 0.1);
  }
  // the nose: round 5's cut wedge, kept all the way (the one feature the grown-up face keeps)
  const ns = d(3.4 * z, 2.5), ny = hy + d(17, 15) * z;
  g.fill(wedge(ns * 0.7, ny - ns * 0.9, ns * 1.8, PI / 2, PI), NO);
  // the mouth: round 5's open half disc, shrinking to a small closed smile, then a short line, then nothing
  const my = hy + d(23, 21.5) * z;
  if (s < 0.4) {
    const mw = 19 * z * (1 - 0.6 * ramp(s, 0, 0.45));
    g.fill(segment(0, my, mw / 2, my, true), MO);
  } else {
    const len = 7 * z * (1 - ramp(s, 0.55, 1));
    if (len > 0.3) g.line(pd(`M${-len / 2} ${my} L${len / 2} ${my}`), MO, 2.4 * z);
  }
}
