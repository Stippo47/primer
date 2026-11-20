// The map's layers for the air: the wind belts blowing over the world, the ground's own speed as the Earth
// turns, the loops of air (the circulation cells) drawn on a globe's edge, and signs standing on the world.
// They're layers like the rest (layers.js): each draws from the context d, reads what its call put in d.m, and
// returns true while it wants more frames. All drawn in the series' visual code (js/code.js): moving air as
// pale running dashes, the Earth's own motion in gold.

import { Glide, soft as softEase, clamp01, lerp } from '../../js/ease.js';
import { air, arrowHead, cloud as drawCloud, sign as drawSign, label as drawLabel } from '../../js/code.js';
import { shown } from './layers.js';

const RAD = Math.PI / 180, DEG = 180 / Math.PI;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- the wind belts

// Which way the surface wind blows at a latitude, as [east, north] (a unit-ish vector) and how strong (0..1),
// for a belt with its bend: 0 is how it would blow if the Earth stood still (straight toward the equator, or
// toward the pole), 1 as it really blows (swung toward the west in the trade winds and the polar easterlies,
// toward the east in the westerlies). North and south of the equator mirror each other.
export const BELTS = {
  trades: { from: 0, to: 30, name: 'Trade winds', at: 16, toPole: false, swing: -62 },
  westerlies: { from: 30, to: 60, name: 'Westerlies', at: 46, toPole: true, swing: 65 },
  polar: { from: 60, to: 90, name: 'Polar easterlies', at: 72, toPole: false, swing: -60 },
};
export function beltOf(lat) {
  const a = Math.abs(lat);
  return a < 30 ? 'trades' : a < 60 ? 'westerlies' : 'polar';
}
// [east, north, strength]: the east part is the swing (west negative), the north part along the meridian.
export function windAt(lat, bend) {
  const B = BELTS[beltOf(lat)], a = Math.abs(lat), north = lat >= 0 ? 1 : -1;
  const strength = Math.pow(Math.max(0, Math.sin(Math.PI * clamp01((a - B.from - 2) / (B.to - B.from - 4)))), 0.7);
  const th = clamp01(bend) * B.swing * RAD;
  return [Math.sin(th), (B.toPole ? 1 : -1) * north * Math.cos(th), strength];
}

const N_STREAKS = 560, LIFE = 2.4, PACE = 7.5;   // streaks, seconds each lives, degrees a second at full strength
export function makeWinds() { return { belts: {}, names: { on: false, born: 0 }, clock: 0 }; }

const winds = {
  id: 'winds', base: false, clip: false,
  draw(d) {
    const W = d.m.winds;
    if (!W) return false;
    const { c: g, view: v, now, k } = d;
    const shownBelts = Object.entries(W.belts).filter(([, b]) => b.a.at(now) > 0.003 || b.a.moving(now));
    if (!shownBelts.length) return false;
    W.clock += d.dt / 1000;
    const tclk = W.clock;
    g.save();
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < N_STREAKS; i++) {
      const cyc = tclk / LIFE + hash(i * 3.1), c = Math.floor(cyc), q = cyc - c;
      const lon0 = hash(i * 7.3 + c * 13.1) * 360 - 180, lat0 = Math.asin(hash(i * 5.7 + c * 3.3) * 2 - 1) * DEG;
      const name = beltOf(lat0), belt = W.belts[name];
      if (!belt) continue;
      const ba = belt.a.at(now);
      if (ba <= 0.003) continue;
      const bend = belt.bend.at(now);
      const [de, dn, st] = windAt(lat0, bend);
      if (st < 0.05) continue;
      const pts = [];
      const cosL = Math.max(0.15, Math.cos(lat0 * RAD));
      for (let j = 0; j <= 6; j++) {
        const age = Math.max(0, q * LIFE - (6 - j) * 0.13);
        const dist = age * PACE * (0.55 + 0.45 * st);
        const p = [lon0 + (de * dist) / cosL, lat0 + dn * dist];
        if (!v.visible(p)) { pts.length = 0; continue; }
        pts.push(v.proj(p));
      }
      if (pts.length < 2) continue;
      const a = ba * st * Math.sin(Math.PI * q);
      // a comet: a tail thinning and fading behind a bright head
      g.lineCap = 'butt';
      for (let j = 1; j < pts.length; j++) {
        const f = j / (pts.length - 1);
        g.globalAlpha = a * (0.2 + 0.75 * f);
        g.strokeStyle = '#bfeaff'; g.lineWidth = (1.2 + 2.2 * f) * k;
        g.beginPath(); g.moveTo(pts[j - 1][0], pts[j - 1][1]); g.lineTo(pts[j][0], pts[j][1]); g.stroke();
      }
      g.lineCap = 'round';
      const hd = pts[pts.length - 1];
      g.globalAlpha = a; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(hd[0], hd[1], 2.2 * k, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    // the belts' names, built on the side facing us
    if (W.names.on || W.names.out) {
      const out = W.names.out ? clamp01((now - W.names.out.t0) / W.names.out.ms) : 0;
      for (const [name, b] of shownBelts) {
        const B = BELTS[name];
        const at = [v.centre[0] - 6, B.at];
        if (!v.visible(at) || b.a.at(now) < 0.3) continue;
        const [x, y] = v.proj(at);
        drawLabel(g, x, y, B.name, { age: now - Math.max(W.names.born, b.born), side: x > v.w * 0.55 ? -1 : 1, out, width: v.w });
      }
      if (W.names.out && out >= 1) { W.names.out = null; W.names.on = false; }
    }
    return true;
  },
};

// ---------------------------------------------------------------- the ground's own speed

// Gold arrows along the latitudes, each covering the same share of a turn (so in the same time, each bit of
// ground goes round once a day): long at the equator, where the ground has farthest to go, short near the
// poles. Speeds named at the equator, 30 and 60 degrees.
export const GROUND = [[0, '1,670 km/h'], [15, ''], [30, '1,450 km/h'], [45, ''], [60, '835 km/h'], [75, '']];
const turning = {
  id: 'turning', base: false,
  draw(d) {
    const T = d.m.turning;
    if (!T) return false;
    const { c: g, view: v, now, k } = d;
    const a0 = shown(T, d, false);
    if (a0 <= 0.003) return !!T.out;
    const span = 34, lonC = v.centre[0] - span / 2 + 4;
    for (const [n, [lat, words]] of GROUND.entries()) {
      for (const hemi of T.both ? [1, -1] : [1]) {
        if (hemi < 0 && lat === 0) continue;
        const L = lat * hemi, age = now - T.born - n * 140;
        const drawn = softEase(clamp01(age / 1100));
        const pts = [];
        for (let j = 0; j <= 24; j++) { const p = [lonC + (span * j) / 24, L]; if (v.visible(p)) pts.push(v.proj(p)); }
        if (pts.length < 2) continue;
        air(g, pts, { phase: (now / 1000) * 1.1, drawn, w: 4.2 * k, a: a0, colour: '#ffc83d' });
        if (words && T.labels && hemi > 0 && drawn >= 1) {
          const hd = pts[pts.length - 1];
          const la = a0 * softEase(clamp01((age - 1100) / 500));
          if (la > 0.01) {
            g.save(); g.globalAlpha = la;
            g.font = '900 13px "Nunito", system-ui, sans-serif';
            const tw = g.measureText(words).width + 16;
            const bx = Math.min(v.w - tw - 6, hd[0] + 10), by = hd[1] - 12;
            g.fillStyle = '#b26f0a'; g.beginPath(); g.roundRect(bx, by + 3, tw, 24, 8); g.fill();
            g.fillStyle = '#f2a31b'; g.beginPath(); g.roundRect(bx, by, tw, 24, 8); g.fill();
            g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(words, bx + tw / 2, by + 12.5);
            g.restore();
          }
        }
      }
    }
    // the gold dashes always run while it shows
    return true;
  },
};

// ---------------------------------------------------------------- the loops of air, on a globe's edge

// The circulation cells, drawn as loops of moving air in a thin layer of air on the globe's right-hand edge
// (its thickness wildly exaggerated: the real layer is about 15 km on a 6,400 km Earth), best with the globe
// facing the equator. Each loop is four arrows, drawn in turn as its progress goes from 0 to 1: the Hadley cell
// rises at the equator, flows toward the pole high up, sinks near 30 degrees and flows back along the ground;
// the Ferrel cell between 30 and 60 turns the other way, like a gear, its surface air flowing toward the pole;
// the polar cell sinks at the pole and flows back toward the equator. South of the equator, mirrored.
export const CELLS = {
  hadley: { lat: [3, 28], z: [0.16, 0.84], start: 1.25, dir: -1, name: 'Hadley cell' },
  ferrel: { lat: [32, 58], z: [0.16, 0.66], start: -0.75, dir: 1, name: 'Ferrel cell' },
  polar: { lat: [62, 87], z: [0.16, 0.56], start: 0.25, dir: -1, name: 'Polar cell' },
};
const LAYER = 0.3;   // the air's thickness, as a share of the globe's radius
function cellPoint(cell, s) {
  const C = CELLS[cell];
  const a = (C.start + C.dir * 2 * s) * Math.PI;
  const lc = (C.lat[0] + C.lat[1]) / 2, la = (C.lat[1] - C.lat[0]) / 2, zc = (C.z[0] + C.z[1]) / 2, za = (C.z[1] - C.z[0]) / 2;
  const sq = x => Math.sign(x) * Math.pow(Math.abs(x), 0.45);
  return [lc + la * sq(Math.cos(a)), zc + za * sq(Math.sin(a))];
}
export function makeCells() { return { cells: {}, born: 0, out: null }; }
const cells = {
  id: 'cells', base: false,
  draw(d) {
    const M = d.m.cells;
    if (!M || !d.view.round) return false;
    const { c: g, view: v, now, k } = d;
    const a0 = shown(M, d, false);
    if (a0 <= 0.003) return !!M.out;
    const { cx, cy, r } = v, H = r * LAYER;
    const at = (lat, z) => { const th = lat * RAD; return [cx + (r + z * H) * Math.cos(th), cy - (r + z * H) * Math.sin(th)]; };
    const hemis = M.south ? [1, -1] : [1];
    g.save();
    g.globalAlpha = a0;
    // the layer of air: a pale band round the edge, its top dotted
    for (const s of hemis) {
      g.beginPath();
      const steps = 40;
      for (let j = 0; j <= steps; j++) { const [x, y] = at(s * (j / steps) * 90, 1.08); if (j) g.lineTo(x, y); else g.moveTo(x, y); }
      for (let j = steps; j >= 0; j--) { const [x, y] = at(s * (j / steps) * 90, 0); g.lineTo(x, y); }
      g.closePath();
      g.fillStyle = 'rgba(160,215,255,0.13)'; g.fill();
      g.setLineDash([2, 7 * k]); g.strokeStyle = 'rgba(200,235,255,0.7)'; g.lineWidth = 2 * k;
      g.beginPath(); for (let j = 0; j <= steps; j++) { const [x, y] = at(s * (j / steps) * 90, 1.08); if (j) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
      g.setLineDash([]);
    }
    // a tall cloud where the air rises at the equator
    const had = M.cells.hadley;
    if (had && had.p.at(now) > 0.05) {
      const ck = clamp01((had.p.at(now) - 0.05) / 0.25);
      const puffs = [];
      for (let j = 0; j < 9; j++) { const z = 0.12 + (j / 8) * 0.78 * ck; for (const s of hemis) { const [x, y] = at(s * (1 + (j % 3)) * 1.4, z); puffs.push({ x: x + Math.sin(now / 900 + j) * 1.5, y, r: H * (0.22 + 0.06 * Math.sin(j * 1.7)) * ck }); } }
      drawCloud(g, puffs, { a: a0 });
    }
    for (const [name, cell] of Object.entries(M.cells)) {
      const p = cell.p.at(now);
      if (p <= 0.002) continue;
      for (const s of hemis) {
        // one loop of running dashes, drawn on as its progress grows, its head leading; drawn whole, a head
        // halfway along each of its four branches shows which way it turns
        const pts = [], n = Math.max(2, Math.round(64 * p));
        for (let j = 0; j <= n; j++) { const [lat, z] = cellPoint(name, (p * j) / n); pts.push(at(s * lat, z)); }
        air(g, pts, { phase: (now / 1000) * 1.2, w: 4.4 * k, a: a0, head: p < 0.995 });
        if (p >= 0.995) for (const m of [0.125, 0.375, 0.625, 0.875]) {
          const [l0, z0] = cellPoint(name, m - 0.01), [l1, z1] = cellPoint(name, m + 0.01);
          const [x0, y0] = at(s * l0, z0), [x1, y1] = at(s * l1, z1);
          arrowHead(g, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 4.4 * k, undefined, a0);
        }
        if (s > 0 && p > 0.6 && cell.named) {
          const [lat, z] = [(CELLS[name].lat[0] + CELLS[name].lat[1]) / 2, (CELLS[name].z[0] + CELLS[name].z[1]) / 2];
          const [x, y] = at(lat, z);
          drawLabel(g, x, y, CELLS[name].name, { age: now - cell.named, side: -1, width: v.w, rise: 30, reach: 40 });
        }
      }
    }
    // the air layer's thickness isn't real: a quiet note, as a film would put it
    g.font = '700 10px "Nunito", system-ui, sans-serif'; g.fillStyle = 'rgba(220,235,255,0.6)'; g.textAlign = 'right';
    const [nx, ny] = at(62, 1.25);
    g.fillText('air layer not to scale', Math.min(v.w - 8, nx + 10), ny - 4);
    g.restore();
    // the dashes always run while it shows
    return true;
  },
};

// ---------------------------------------------------------------- signs on the world

// A sign standing on the world at a place: a pole rising from it and a board springing open on top, with a
// word or a number ("High", "+2 °C"). It stands up the screen, whichever way the globe is turned.
const signs = {
  id: 'signs', base: false,
  draw(d) {
    const { c: g, view: v, m, now } = d;
    if (!m.signs || !m.signs.length) return false;
    let busy = false;
    for (const sg of m.signs) {
      if (!v.visible(sg.at)) continue;
      const [x, y] = v.proj(sg.at), age = now - sg.born, out = sg.out ? clamp01((now - sg.out.t0) / sg.out.ms) : 0;
      if (age < 900 || sg.out) busy = true;
      drawSign(g, x, y, sg.text, { age, colour: sg.colour, out, width: v.w, h: 58 });
    }
    return busy;
  },
};

export const AIR_LAYERS = { winds, turning, cells, signs };
