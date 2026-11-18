// The hurricane, drawn several ways. Choose one with &storm=<id> in the address,
// or with "draw" in a look's storm block.
//
//   bands     two long cloud bands wound round a thick eyewall, sea showing between them
//   paper     three cut-paper swirls, stacked, each one flat tone
//   pinwheel  a bold two-armed sign that reads at a glance
//   puffs     a swirl built from many small cloud puffs
//   disc      seen from straight above: a round deck of cloud with grooves wound into it
//   r1        the first drawing, with its glow;  r1-noglow  the same without
//
// Every drawer is given the same facts and nothing else:
//   R      size, in px          angle  how far it has turned (falling = anticlockwise)
//   sweep  0.3 a loose seed .. 1 fully wound up          eye  0 shut .. 1 open
//   vigor  1 fresh .. 0 worn out                          time seconds, for small drifting
// From those each one has to manage the whole scene: a small seed in the dock, a tired grey
// lump on the equator, winding up, and the full storm.
// Bands trail clockwise going outward, as they do north of the equator.
// Flat fills only: no blur and no halo, so it stays cheap to draw on a phone.

import * as E from './ease.js';

const { TAU, lerp, clamp01, rgba, mix } = E;
const PI = Math.PI;

export const STORMS = ['bands', 'paper', 'pinwheel', 'puffs', 'disc', 'r1', 'r1-noglow'];

// ---- path pieces, all clockwise so they can share one outline ----
function disc(p, x, y, r) {
  if (r <= 0.01) return;
  p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); p.closePath();
}
// A ribbon along a curve: at(s) is its centre line, width(s) its full width, s from 0 to 1.
function ribbon(p, at, width, n = 44) {
  const c = [];
  for (let i = 0; i <= n; i++) c.push(at(i / n));
  const a = [], b = [];
  for (let i = 0; i <= n; i++) {
    const p0 = c[Math.max(0, i - 1)], p1 = c[Math.min(n, i + 1)];
    let tx = p1[0] - p0[0], ty = p1[1] - p0[1];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    const h = width(i / n) / 2;
    a.push([c[i][0] - ty * h, c[i][1] + tx * h]);
    b.push([c[i][0] + ty * h, c[i][1] - tx * h]);
  }
  const ring = a.concat(b.reverse());
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const q = ring[i], r = ring[(i + 1) % ring.length];
    area += q[0] * r[1] - r[0] * q[1];
  }
  if (area < 0) ring.reverse();
  p.moveTo(ring[0][0], ring[0][1]);
  for (let i = 1; i < ring.length; i++) p.lineTo(ring[i][0], ring[i][1]);
  p.closePath();
}
// A spiral that opens at a steady rate, from radius r0 at angle a0 to r1 after `turn`.
const spiral = (a0, turn, r0, r1) => s => {
  const r = r0 * Math.pow(r1 / r0, s), a = a0 + turn * s;
  return [r * Math.cos(a), r * Math.sin(a)];
};
const smooth = k => k * k * (3 - 2 * k);
// mix() gives rgb(r,g,b); turn that back into #rrggbb so it can be mixed again
const hex = c => '#' + c.match(/[0-9]+/g).map(n => Number(n).toString(16).padStart(2, '0')).join('');

export function createStorms(ctx, look) {
  const St = look.storm;
  const MID = hex(mix(St.fill, St.shade, 0.5));             // halfway between the top and the underside

  // the few tones every drawing shares, greyed as the storm tires
  function tones(o) {
    const v = o.vigor;
    return {
      white: mix(St.tired, St.fill, v),
      shade: mix(St.tired, St.shade, v),
      mid: mix(St.tired, MID, v),
      deep: mix(St.tired, St.swirl, 0.35 + 0.65 * v),
      eye: St.eye,
      depth: (St.depth || 0) * o.R / 28,
    };
  }
  // a shape with thickness: its underside first, then its top
  function slab(p, fill, under, d) {
    if (d) {
      ctx.save(); ctx.translate(0, d); ctx.fillStyle = under; ctx.fill(p); ctx.restore();
    }
    ctx.fillStyle = fill;
    ctx.fill(p);
  }
  // a hole through a slab: the far wall shows at the top, the sea below it
  function eyeHole(r, d, wall, sea) {
    if (r <= 0.3) return;
    d = Math.min(d, r * 0.4);
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    ctx.fillStyle = wall;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = sea;
    ctx.beginPath(); ctx.arc(0, d, r, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ---- bands: two long bands wound round a thick eyewall, sea showing between them, thinner bands outside ----
  function bands(o, T) {
    const R = o.R, g = o.g, d = T.depth;
    // as it winds up the bands grow longer and wrap tighter
    const r0 = R * 0.26, r1 = R * lerp(0.9, 1.36, g), turn = lerp(2.6, 8.8, g), fat = lerp(0.6, 0.44, Math.min(1, g * 2.5));
    const rAt = s => r0 * Math.pow(r1 / r0, s);
    const main = new Path2D(), far = new Path2D();
    const k = clamp01((g - 0.45) / 0.55);                  // the loose pieces only show once it is wound up
    for (let j = 0; j < 2; j++) {
      const a0 = o.angle + j * PI, end = j ? 0.93 : 1;     // one band a little shorter, so it is not a perfect pair
      const line = (from, to, out) => s => {
        const q = lerp(from, to, s), r = rAt(q) * out, a = a0 + turn * q;
        return [r * Math.cos(a), r * Math.sin(a)];
      };
      ribbon(main, line(0, end, 1), s => fat * rAt(s * end) * Math.pow(clamp01((1 - s) / 0.62), 0.9) + 0.02, 72);
      if (k > 0.02) {
        const lens = w => s => R * w * k * Math.pow(Math.sin(s * PI), 0.6) + 0.01;
        ribbon(far, line(lerp(0.76, 0.56, k), 0.92, 1.34), lens(j ? 0.115 : 0.135), 40);       // a thin band outside it
      }
    }
    const wall = new Path2D();
    disc(wall, 0, 0, R * lerp(0.47, 0.37, g));
    const sil = new Path2D();
    sil.addPath(far); sil.addPath(main); sil.addPath(wall);
    return {
      sil,
      paint() {
        slab(far, T.mid, T.deep, d * 0.7);
        slab(main, T.white, T.shade, d);
        slab(wall, T.white, T.shade, d * 0.9);
        eyeHole(R * 0.16 * o.eye, d * 0.6, T.shade, T.eye);
      },
    };
  }

  // ---- paper: three flat cut-outs, stacked, the upper ones turning faster ----
  function paper(o, T) {
    const R = o.R, g = o.g;
    const layers = [
      { reach: 1.58, turn: 3.5, body: 0.74, fill: T.deep, rate: 1 / 3, a: 0 },
      { reach: 1.27, turn: 3.2, body: 0.6, fill: T.mid, rate: 2 / 3, a: 0.75 },
      { reach: 0.98, turn: 2.9, body: 0.46, fill: T.white, rate: 1, a: 1.5 },
    ].map(L => {
      const p = new Path2D();
      const reach = R * L.reach * lerp(0.66, 1, g), turn = L.turn * lerp(0.4, 1, g);
      for (let j = 0; j < 3; j++) {
        ribbon(p, spiral(L.a + o.angle * L.rate + j * TAU / 3, turn, R * L.body * 0.5, reach),
          s => R * L.body * 0.86 * Math.pow(1 - s, 0.75) + 0.01, 44);
      }
      disc(p, 0, 0, R * L.body);
      return { p, fill: L.fill };
    });
    const sil = new Path2D();
    layers.forEach(L => sil.addPath(L.p));
    const sx = R * 0.035, sy = R * 0.07;                   // how far each sheet's shadow falls on the one below
    return {
      sil,
      paint() {
        layers.forEach((L, i) => {
          if (i > 0) {
            ctx.save(); ctx.translate(sx, sy);
            ctx.fillStyle = rgba(St.shadow, 0.3); ctx.fill(L.p);
            ctx.restore();
          }
          ctx.fillStyle = L.fill;
          ctx.fill(L.p);
        });
        const r = R * 0.18 * o.eye;
        if (r > 0.3) {
          ctx.save();
          ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
          ctx.fillStyle = mix(St.eye, St.shadow, 0.55);
          ctx.fillRect(-r, -r, r * 2, r * 2);
          ctx.fillStyle = T.eye;
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
          ctx.restore();
        }
      },
    };
  }

  // ---- pinwheel: one fat body, two fat arms, a clear eye ----
  function pinwheel(o, T) {
    const R = o.R, g = o.g, d = T.depth;
    const body = R * lerp(0.64, 0.76, g);
    const p = new Path2D();
    const turn = lerp(1.7, 2.6, g), reach = R * lerp(0.98, 1.52, g);
    for (let j = 0; j < 2; j++) {
      ribbon(p, spiral(o.angle + j * PI, turn, body * 0.5, reach), s => body * lerp(0.7, 0.9, g) * Math.pow(1 - s, 0.7) + 0.01, 44);
    }
    disc(p, 0, 0, body);
    return {
      sil: p,
      paint() {
        slab(p, T.white, T.shade, d);
        // one groove along the inside of each arm, so the turning shows in the body too
        const q = new Path2D();
        for (let j = 0; j < 2 && g > 0.02; j++) {
          ribbon(q, spiral(o.angle + j * PI + 2.2, lerp(0.8, 2.3, g), body * 0.47, body * lerp(0.7, 1.02, g)),
            s => R * 0.085 * clamp01(g * 2.2) * Math.pow(Math.sin(s * PI), 0.5) + 0.01, 30);
        }
        ctx.fillStyle = T.shade;
        ctx.fill(q);
        eyeHole(R * 0.24 * o.eye, d * 0.8, T.shade, T.eye);
      },
    };
  }

  // ---- puffs: bands made of many small clouds, each riding inward along its arm ----
  function puffs(o, T) {
    const R = o.R, g = o.g, d = T.depth;
    const list = [];
    const flow = o.time * 0.75;                           // three places every four seconds
    [{ a: 0, n: 22, turn: 4.5, reach: 1.46, size: 0.2 }, { a: PI, n: 21, turn: 4.3, reach: 1.4, size: 0.2 },
      { a: PI * 1.5, n: 9, turn: 2.0, reach: 1.1, size: 0.1 }].forEach(A => {
      const turn = A.turn * lerp(0.3, 1, g), reach = R * lerp(0.84, A.reach, g), r0 = R * 0.46;
      for (let i = 0; i < A.n; i++) {
        const q = ((i + flow) % A.n) / A.n;               // 0 at the tip, 1 where the arm meets the middle
        const s = 1 - Math.pow(q, 1.15);                  // a few more, smaller puffs toward the tip
        const r = r0 * Math.pow(reach / r0, s) + R * 0.04 * Math.sin(s * 23 + A.a * 2);
        const a = o.angle + A.a + turn * s;
        const size = R * (A.size * Math.pow(1 - s, 0.6) + 0.085) * (0.88 + 0.14 * Math.sin(s * 41 + A.a))
          * Math.sqrt(clamp01(q / 0.07)) * smooth(clamp01(s / 0.1));       // each grows quickly at the tip and sinks into the middle
        if (size > R * 0.045) list.push([r * Math.cos(a), r * Math.sin(a), size]);
      }
    });
    for (let i = 0; i < 6; i++) {                         // the wall round the eye
      const a = o.angle + i * TAU / 6;
      list.push([R * 0.4 * Math.cos(a), R * 0.4 * Math.sin(a), R * (i % 2 ? 0.25 : 0.28)]);
    }
    list.push([0, 0, R * 0.3]);
    const body = new Path2D(), caps = new Path2D();
    for (const [x, y, r] of list) {
      disc(body, x, y, r);
      disc(caps, x - r * 0.16, y - r * 0.22, r * 0.7);
    }
    return {
      sil: body,
      paint() {
        slab(body, T.mid, T.shade, d);
        ctx.fillStyle = T.white;
        ctx.fill(caps);
        eyeHole(R * 0.18 * o.eye, d * 0.7, T.shade, T.eye);
      },
    };
  }

  // ---- disc: straight down on it. A round deck of cloud with grooves wound into it, a thin veil below, a raised wall round the eye ----
  function deck(o, T) {
    const R = o.R, g = o.g, d = T.depth;
    const rd = R * lerp(0.72, 0.96, g);
    // the veil: a thin round sheet below, with two short tails where its bands run out
    const veil = new Path2D(), rv = rd * lerp(1.2, 1.26, g);
    disc(veil, 0, 0, rv);
    for (let j = 0; j < 2; j++) {
      ribbon(veil, spiral(o.angle * 0.5 + 2.2 + j * PI, lerp(1.3, 1.9, g), rv * 0.74, rv * lerp(1.2, 1.3, g)), s => rv * 0.42 * Math.pow(1 - s, 0.8) + 0.01, 36);
    }
    // the deck: round, with a softly lumped rim so it reads as cloud
    const top = new Path2D();
    for (let i = 0; i < 180; i++) {
      const a = i / 180 * TAU, rr = rd * (0.975 + 0.04 * Math.abs(Math.sin(a * 5.5)));
      const x = rr * Math.cos(a + o.angle), y = rr * Math.sin(a + o.angle);
      if (i === 0) top.moveTo(x, y); else top.lineTo(x, y);
    }
    top.closePath();
    // grooves: each starts at the rim and winds inward
    const grooves = new Path2D();
    const wind = lerp(2.2, 6.4, g);
    for (let j = 0; j < 2; j++) {
      ribbon(grooves, spiral(o.angle + j * PI + 0.75, -wind, rd * 1.03, R * lerp(0.3, 0.46, g)),
        s => R * lerp(0.085, 0.03, s) * Math.pow(Math.sin(Math.min(1, s * 1.2 + 0.03) * PI), 0.5) + 0.01, 70);
    }
    const wall = new Path2D();
    disc(wall, 0, 0, R * 0.4);
    return {
      sil: veil,
      paint() {
        slab(veil, T.mid, T.deep, d * 0.7);
        slab(top, T.white, T.shade, d);
        ctx.save();
        ctx.clip(top);
        ctx.fillStyle = T.shade;
        ctx.fill(grooves);
        ctx.restore();
        if (o.eye > 0.02) slab(wall, T.white, T.shade, d * 0.8 * o.eye);
        eyeHole(R * 0.18 * o.eye, d * 0.7, T.shade, T.eye);
      },
    };
  }

  // ---- r1: the first drawing, kept as it was for comparison ----
  function r1Shape(R, angle, sweep) {
    const p = new Path2D();
    for (let a = 0; a < 4; a++) {
      const big = a % 2 === 0;
      const turn = lerp(0.6, 3.25, sweep) * (big ? 1 : 0.62);
      const reach = R * lerp(0.72, 1.5, sweep) * (big ? 1 : 0.8);
      const base = angle + a * PI / 2;
      const outer = [], inner = [];
      for (let i = 0; i <= 20; i++) {
        const s = i / 20;
        const th = base + s * turn;
        const r = lerp(R * 0.3, reach, Math.pow(s, 0.85));
        const w = R * (big ? 0.46 : 0.34) * Math.pow(1 - s, 0.75) + 0.2;
        outer.push([Math.cos(th) * (r + w / 2), Math.sin(th) * (r + w / 2)]);
        inner.push([Math.cos(th) * (r - w / 2), Math.sin(th) * (r - w / 2)]);
      }
      p.moveTo(outer[0][0], outer[0][1]);
      for (let i = 1; i < outer.length; i++) p.lineTo(outer[i][0], outer[i][1]);
      for (let i = inner.length - 1; i >= 0; i--) p.lineTo(inner[i][0], inner[i][1]);
      p.closePath();
    }
    disc(p, 0, 0, R * 0.56);
    return p;
  }
  function drawR1(x, y, o, glow) {
    const R = o.R;
    const p = r1Shape(R, o.angle, o.sweep);
    if (St.shadowAlpha > 0) {
      ctx.save();
      ctx.translate(x + 2 + o.lift * 4, y + 5 + o.lift * 11);
      ctx.fillStyle = rgba(St.shadow, St.shadowAlpha * o.alpha);
      ctx.fill(p);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, y - o.lift * 9);
    ctx.globalAlpha = o.alpha;
    if (glow && St.glowAlpha > 0) {
      const gr = R * 2.5, g = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, gr);
      g.addColorStop(0, rgba(St.glow, St.glowAlpha * o.vigor));
      g.addColorStop(1, rgba(St.glow, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.fill();
    }
    ctx.scale(1 + o.squash, 1 - o.squash);
    const fill = mix(St.tired, St.fill, o.vigor);
    ctx.lineJoin = 'round';
    if (St.strokeWidth) {
      ctx.strokeStyle = St.stroke; ctx.lineWidth = St.strokeWidth * 2;
      ctx.stroke(p);
    }
    if (St.depth) {
      ctx.save(); ctx.translate(0, St.depth); ctx.fillStyle = mix(St.tired, St.shade, o.vigor); ctx.fill(p); ctx.restore();
    }
    ctx.fillStyle = fill;
    ctx.fill(p);
    // two strokes inside the disc, so the turning shows in the middle too
    ctx.strokeStyle = rgba(St.swirl, St.swirlAlpha);
    ctx.lineWidth = Math.max(1.2, R * 0.085);
    ctx.lineCap = 'round';
    for (let a = 0; a < 2; a++) {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const s = i / 12, th = o.angle + a * PI + 0.9 + s * 2.3, r = R * lerp(0.16, 0.44, s);
        const px = Math.cos(th) * r, py = Math.sin(th) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    if (o.eye > 0.02) {
      ctx.fillStyle = St.eye;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.15 * o.eye, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  const BUILD = { bands, paper, pinwheel, puffs, disc: deck };

  // Draw storm `id` at (x, y). `o` is the list of facts at the top of this file, plus
  // lift (0 on the sea .. 1 held up), squash and alpha.
  function draw(id, x, y, o) {
    if (o.R <= 0.2 || o.alpha <= 0.01) return;
    if (!BUILD[id]) { drawR1(x, y, o, id !== 'r1-noglow'); return; }
    const facts = { ...o, g: clamp01((o.sweep - 0.3) / 0.7), time: o.time || 0 };
    const shape = BUILD[id](facts, tones(facts));
    if (St.shadowAlpha > 0) {
      ctx.save();
      ctx.translate(x + 2 + o.lift * 4, y + 5 + o.lift * 11);
      ctx.fillStyle = rgba(St.shadow, St.shadowAlpha * o.alpha);
      ctx.fill(shape.sil);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, y - o.lift * 9);
    ctx.globalAlpha = o.alpha;
    ctx.scale(1 + o.squash, 1 - o.squash);
    shape.paint();
    ctx.restore();
  }

  return { draw };
}
