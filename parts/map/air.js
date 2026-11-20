// The map's layers for the air: the wind belts blowing over the world, the ground's own speed as the Earth
// turns, the loops of air (the circulation cells) drawn on a globe's edge, and signs standing on the world.
// They're layers like the rest (layers.js): each draws from the context d, reads what its call put in d.m, and
// returns true while it wants more frames. All drawn in the series' visual code (js/code.js): moving air as
// pale running dashes, the Earth's own motion in gold.

import { Glide, soft as softEase, clamp01, lerp } from '../../js/ease.js';
import { air, arrowHead, cloud as drawCloud, sign as drawSign, label as drawLabel, mixHex, rgba as rgbaHex } from '../../js/code.js';
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
// Where each streak starts: spread evenly over the whole sphere (a golden-angle spiral, every streak with an
// equal share of the surface), and each time round shaken only within its own share, so the streaks fill the
// world evenly, with no empty pockets (round four), and still never look like a grid.
const CELL_DEG = Math.sqrt((4 * Math.PI) / N_STREAKS) * DEG;
const STREAK_AT = Array.from({ length: N_STREAKS }, (_, i) => [((i * 137.50776) % 360) - 180, Math.asin(1 - (2 * (i + 0.5)) / N_STREAKS) * DEG]);
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
      const [lonB, latB] = STREAK_AT[i];
      const lat0 = Math.max(-89, Math.min(89, latB + (hash(i * 5.7 + c * 3.3) - 0.5) * CELL_DEG));
      const lon0 = lonB + ((hash(i * 7.3 + c * 13.1) - 0.5) * CELL_DEG) / Math.max(0.2, Math.cos(lat0 * RAD));
      const name = beltOf(lat0), belt = W.belts[name];
      if (!belt) continue;
      const ba = belt.a.at(now);
      if (ba <= 0.003) continue;
      const bend = belt.bend.at(now);
      const [de, dn, st] = windAt(lat0, bend);
      if (st < 0.01) continue;
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
      // where a belt fades into the calms along its edges its streaks slow and dim, but never vanish
      const a = ba * (0.4 + 0.6 * st) * Math.sin(Math.PI * q);
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
export const GROUND = [[0, '1,670 km/h'], [15, ''], [30, '1,450 km/h'], [45, ''], [60, '840 km/h'], [75, '']];
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
// facing the equator. Each loop is a rounded band (round four: the old squashed loops read as "weird"): two
// straight runs, one along the ground and one along the top of the weather, joined by round turns, faintly
// lit inside, drawn in the moving-air code, with two arrowheads riding round it so it turns like a belt, or a
// gear. The Hadley cell rises at the equator (through a storm cloud standing there), flows
// toward the pole high up, sinks near 30 degrees and flows back along the ground; the Ferrel cell between 30
// and 60 turns the other way, its surface air flowing toward the pole; the polar cell sinks at the pole and
// flows back toward the equator. South of the equator, mirrored. Progress (0..1) draws a loop on from where it
// rises, its head leading, before it closes and starts turning.
export const CELLS = {
  hadley: { lat: [0.6, 28.5], z: [0.14, 0.84], rises: 'low', name: 'Hadley cell' },
  ferrel: { lat: [31.5, 58.5], z: [0.14, 0.7], rises: 'high', name: 'Ferrel cell' },
  polar: { lat: [61.5, 87.5], z: [0.14, 0.6], rises: 'low', name: 'Polar cell' },
};
const LAYER = 0.24;       // the air's thickness, as a share of the globe's radius
const TURN_RATE = 0.07;   // a loop's arrowheads go round once in about 14 seconds: calm
// A loop as a function of s (0..1, once round, from the foot of its rising side) to [latitude, height], for a
// globe of radius r with an air layer H pixels thick: a stadium that is round on the screen.
export function cellLoop(cell, r, H) {
  const C = CELLS[cell], [a, b] = C.lat, [z0, z1] = C.z;
  const Rm = r + ((z0 + z1) / 2) * H, perDeg = Rm * RAD;
  const L = (b - a) * perDeg, rad = ((z1 - z0) * H) / 2, run = Math.max(0, L - 2 * rad);
  const half = Math.PI * rad, P = 2 * run + 2 * half;
  // u along the ground from the loop's low-latitude end, v up from its bottom, in pixels; d from the foot of
  // its low-latitude end, going up that end first, then along the top, down the far end, back along the ground
  const uv = d => {
    d = ((d % P) + P) % P;
    if (d < half) { const th = d / rad; return [rad - rad * Math.sin(th), rad - rad * Math.cos(th)]; }
    d -= half;
    if (d < run) return [rad + d, 2 * rad];
    d -= run;
    if (d < half) { const th = d / rad; return [rad + run + rad * Math.sin(th), rad + rad * Math.cos(th)]; }
    d -= half;
    return [rad + run - d, 0];
  };
  // rising at its low-latitude end it goes that way round; rising at its high end, it starts at the foot of
  // that end and goes the other way round
  const low = C.rises === 'low';
  return s => {
    const [u, v] = uv(low ? s * P : half + run + half - s * P);
    return [a + u / perDeg, z0 + v / H];
  };
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
    const t = now / 1000;
    g.save();
    g.globalAlpha = a0;
    // the layer of air: a faint band round the edge, its top (the top of the weather) a thin line. With the
    // north alone, it reaches a little way south too, so the equator's cloud stands inside it
    const spans = M.south ? [[-90, 90]] : [[-12, 90]];
    for (const [lo, hi] of spans) {
      g.beginPath();
      const steps = 48, L = j => lo + ((hi - lo) * j) / steps;
      for (let j = 0; j <= steps; j++) { const [x, y] = at(L(j), 1); if (j) g.lineTo(x, y); else g.moveTo(x, y); }
      for (let j = steps; j >= 0; j--) { const [x, y] = at(L(j), 0); g.lineTo(x, y); }
      g.closePath();
      g.fillStyle = 'rgba(160,215,255,0.08)'; g.fill();
      g.strokeStyle = 'rgba(200,235,255,0.32)'; g.lineWidth = 1.5 * k;
      g.beginPath(); for (let j = 0; j <= steps; j++) { const [x, y] = at(L(j), 1); if (j) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    }
    // each loop's inside, lit faintly as it closes
    for (const [name, cell] of Object.entries(M.cells)) {
      const p = cell.p.at(now), fill = clamp01((p - 0.7) / 0.3);
      if (fill <= 0.01) continue;
      const loop = cellLoop(name, r, H);
      for (const s of hemis) {
        g.beginPath();
        for (let j = 0; j <= 72; j++) { const [lat, z] = loop(j / 72), [x, y] = at(s * lat, z); if (j) g.lineTo(x, y); else g.moveTo(x, y); }
        g.closePath();
        g.fillStyle = rgbaHex('#d8ecff', 0.07 * fill); g.fill();
      }
    }
    // the storm cloud where the air rises at the equator, standing out from the edge, its anvil spreading
    // along the top of the weather: the Hadley loop's rising side runs up through it
    const had = M.cells.hadley;
    if (had && had.p.at(now) > 0.02) {
      const ck = clamp01((had.p.at(now) - 0.02) / 0.3);
      const [x, y] = at(0, 0);
      // a towering cloud, short of an anvil (lying on its side out from the edge, an anvil reads as arms)
      drawCloud(g, x, y, (H * 0.8) / 4.6, { level: 0.08 + 0.6 * ck, angle: Math.PI / 2, t });
    }
    const named = [];
    for (const [name, cell] of Object.entries(M.cells)) {
      const p = cell.p.at(now);
      if (p <= 0.002) continue;
      const loop = cellLoop(name, r, H), C = CELLS[name], col = '#8fdcff';
      for (const s of hemis) {
        const pt = q => { const [lat, z] = loop(q); return at(s * lat, z); };
        // the loop in running dashes, drawn on as its progress grows, its head leading
        const pts = [], n = Math.max(2, Math.round(80 * p));
        for (let j = 0; j <= n; j++) pts.push(pt((p * j) / n));
        air(g, pts, { phase: t * 1.2, w: 4.4 * k, a: 1, head: p < 0.995, colour: col });
        // whole, it turns: two arrowheads riding round it
        if (p >= 0.995) for (const off of [0, 0.5]) {
          const q = (t * TURN_RATE + off + 0.06) % 1;
          const [x0, y0] = pt(q - 0.006), [x1, y1] = pt(q + 0.006);
          arrowHead(g, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 5 * k, col, 1);
        }
        if (s > 0 && p > 0.6 && cell.named) named.push([name, cell]);
      }
    }
    // their names, built out to the right of each loop, clear of the globe and of each other
    for (const [name, cell] of named) {
      const C = CELLS[name], lat = (C.lat[0] + C.lat[1]) / 2;
      const [x, y] = at(lat, C.z[1]);
      drawLabel(g, x, y, C.name, { age: now - cell.named, side: 1, width: v.w, rise: 18, reach: 26 });
    }
    // the air layer's thickness isn't real: a quiet note, as a film would put it
    g.font = '700 10px "Nunito", system-ui, sans-serif'; g.fillStyle = 'rgba(220,235,255,0.55)'; g.textAlign = 'right';
    const [nx, ny] = at(70, 1.12);
    g.fillText('air layer not to scale', Math.min(v.w - 8, nx + 10), ny - 4);
    g.restore();
    // the dashes always run while it shows
    return true;
  },
};

// ---------------------------------------------------------------- a parcel of air keeping its speed

// A parcel of air set off from a place toward another latitude, keeping the eastward speed it started with
// (round four: "why is the wind not moving the other way, pulled by the equator to move faster?"). Air isn't
// fixed to the ground: it slides over it. Heading for the equator, the ground beneath it moves east ever
// faster, but the parcel keeps the speed it had, so the ground pulls ahead and, seen from the ground, the
// parcel drifts west of where it was aimed; heading for a pole, the other way. Friction with the ground (drag,
// 0..1) brings its speed up toward the ground's, slowly. Drawn as a pale bubble of air at the head of the path
// it has taken (moving air, cyan), and, with speeds, two arrows from it pointing east along its latitude: its
// own speed (cyan, "Air") and the ground's beneath it (gold, "Ground"), each with its number in km/h, the
// ground's counting up as it goes.
export const EQUATOR_KMH = 1670;
const DRIFT = 148;   // degrees of westward drift a whole share of the equator's speed makes over the trip: about 12 from 30 to 2
export function parcelPath(from, toLat, drag = 0, n = 48) {
  const [lon0, lat0] = from, v0 = Math.cos(lat0 * RAD);
  const pts = [[lon0, lat0]];
  let lon = lon0;
  for (let i = 1; i <= n; i++) {
    const lat = lerp(lat0, toLat, i / n), ground = Math.cos(lat * RAD), own = v0 + drag * (ground - v0);
    lon -= (DRIFT / n) * (ground - own);
    pts.push([lon, lat]);
  }
  return pts;
}
export function makeParcel(from, toLat, { now = 0, progress = 0, seconds = 0, drag = 0, show = 'both' } = {}) {
  return { from, toLat, show, born: now, g: new Glide(0).go(clamp01(progress), seconds * 1000, now), drag: new Glide(clamp01(drag)) };
}
const fmtKmh = v => `${(Math.round(v / 10) * 10).toLocaleString('en-GB')} km/h`;
const parcels = {
  id: 'parcels', base: false,
  draw(d) {
    const { c: g, view: v, m, now, k } = d;
    if (!m.parcels || !m.parcels.length) return false;
    let busy = false;
    for (const pc of m.parcels) {
      const a = shown(pc, d, true);
      if (a <= 0.01) continue;
      const p = pc.g.at(now), drag = pc.drag.at(now);
      if (pc.g.moving(now) || pc.drag.moving(now)) busy = true;
      // the path it has taken is history: friction later (drag) changes its speed from now on, not where it went
      const path = parcelPath(pc.from, pc.toLat, 0);
      const n = path.length - 1, f = p * n, i0 = Math.min(n - 1, Math.floor(f)), u = f - i0;
      const head = [lerp(path[i0][0], path[i0 + 1][0], u), lerp(path[i0][1], path[i0 + 1][1], u)];
      g.save();
      g.globalAlpha *= a;
      // the path it has taken, running dashes, its head on the parcel
      if (pc.show !== 'speeds' && p > 0.01) {
        const pts = [];
        for (let j = 0; j <= i0; j++) if (v.visible(path[j])) pts.push(v.proj(path[j]));
        if (v.visible(head)) pts.push(v.proj(head));
        if (pts.length > 1) air(g, pts, { phase: (now / 1000) * 1.3, w: 4.2 * k, a: 1, head: false });
      }
      if (!v.visible(head)) { g.restore(); continue; }
      const [hx, hy] = v.proj(head);
      // its own speed and the ground's, east along its latitude, from the parcel
      if (pc.show !== 'path') {
        const lat = head[1], ground = EQUATOR_KMH * Math.cos(lat * RAD), v0 = EQUATOR_KMH * Math.cos(pc.from[1] * RAD), own = v0 + drag * (ground - v0);
        const SPAN = 40;   // degrees of longitude the ground's arrow spans: long enough for the two speeds' difference to show
        const arrow = (kmh, dLat, colour) => {
          const span = (SPAN * kmh) / Math.max(1, ground), pts = [];
          for (let j = 0; j <= 18; j++) { const q = [head[0] + (span * j) / 18, lat + dLat]; if (v.visible(q)) pts.push(v.proj(q)); }
          if (pts.length < 2) return null;
          air(g, pts, { phase: (now / 1000) * 1.1, w: 4.4 * k, a: 1, colour });
          return pts[pts.length - 1];
        };
        const tipG = arrow(ground, -1.4, '#ffc83d'), tipA = arrow(own, 1.1, CODE_AIR);
        g.font = `900 ${Math.round(12.5 * Math.max(0.9, k))}px "Nunito", system-ui, sans-serif`;
        const tag = (tip, words, face, under, ink, dy) => {
          if (!tip) return;
          const tw = g.measureText(words).width + 14, x = Math.min(v.w - tw - 6, tip[0] + 10), y = tip[1] + dy - 11;
          g.fillStyle = under; g.beginPath(); g.roundRect(x, y + 3, tw, 22, 8); g.fill();
          g.fillStyle = face; g.beginPath(); g.roundRect(x, y, tw, 22, 8); g.fill();
          g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(words, x + tw / 2, y + 11.5);
        };
        tag(tipA, `Air ${fmtKmh(own)}`, '#8fdcff', '#3b8fbf', '#0b1a4a', -12);
        tag(tipG, `Ground ${fmtKmh(ground)}`, '#f2a31b', '#b26f0a', '#ffffff', 12);
      }
      // the parcel: a pale bubble of air, a few molecules in it
      const pr = 13 * k;
      g.fillStyle = 'rgba(190,236,255,0.28)'; g.beginPath(); g.arc(hx, hy, pr, 0, Math.PI * 2); g.fill();
      g.setLineDash([4 * k, 3.5 * k]); g.lineDashOffset = -(now / 1000) * 8;
      g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.2 * k; g.beginPath(); g.arc(hx, hy, pr, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#e8e4ff';
      for (let j = 0; j < 4; j++) { const an = j * 1.9 + now / 700; g.beginPath(); g.arc(hx + Math.cos(an) * pr * 0.45, hy + Math.sin(an) * pr * 0.45, 1.8 * k, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    return busy || m.parcels.length > 0;
  },
};
const CODE_AIR = '#8fdcff';

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

export const AIR_LAYERS = { winds, turning, cells, parcels, signs };
