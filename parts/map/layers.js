// The map's layers, bottom to top. Each layer draws one kind of thing, for any view (globe or flat), from
// a draw context `d` the part hands it:
//
//   d.c        the canvas to draw on        d.view    the view (projection, size, edges; views.js)
//   d.shape(g) a Path2D of a shape, made once per view and shared by every layer that draws it
//   d.W        the world (world.js)         d.S       the part's settings
//   d.m        what's on the map: highlights, bands, the coloured table, points, markers, routes, pin...
//   d.style    the style's colours          d.k       line weight, growing gently with the map's size
//   d.now, d.dt  the time and the time since the last frame, for things that move
//
// `base` layers are drawn onto a picture kept aside, redrawn only when the view or what's on the map
// changes; the rest are drawn over it on every frame something moves. `clip` layers stay inside the
// map's edge. A layer returns true when it wants another frame (a name fading, a marker popping in).
// A new tool is a new layer here, plus a call in map.js that puts its data in d.m; it then works on every
// projection with nothing else to do. See docs/parts.md.

import { geoInterpolate, geoDistance, geoArea } from 'd3-geo';
import { SPHERE } from './views.js';
import { STYLE, SST, warmBandsNow, rgba, mix, MOTION } from './look.js';
import { dot, chip, mark } from './marks.js';

const TAU = Math.PI * 2;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
export const spring = (k, bounce) => {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  return 1 - Math.exp(-(7 - 3 * bounce) * k) * Math.cos(k * Math.PI * (1 + 3 * bounce)) * (1 - k * k * k);
};
const pop = (now, t0, ms = 520) => spring(ramp(now, t0, t0 + ms), MOTION.bounce);

// Fills a shape, nudged by dx, dy (the raised look: a shaded copy below, a lit one above).
function fill(d, geo, colour, dy = 0, dx = 0) {
  const c = d.c;
  if (dx || dy) { c.save(); c.translate(dx, dy); }
  c.fillStyle = colour;
  c.fill(d.shape(geo));
  if (dx || dy) c.restore();
}
// A dotted line, drawn over the sea and the land alike.
function dotted(d, geo, colour, gap) {
  const c = d.c;
  c.setLineDash([0.1, gap * d.k]); c.strokeStyle = colour;
  c.stroke(d.shape(geo));
}

// ---------------------------------------------------------------- base layers: the map itself

// Behind the map: a soft glow round a globe; a flat map sits on a slab of its own, like the land does.
// Gradients and offset copies only, never blur.
const backdrop = {
  id: 'backdrop', base: true,
  draw(d) {
    const { c, view: v } = d;
    if (v.round) {
      const glow = c.createRadialGradient(v.cx, v.cy, v.r * 0.86, v.cx, v.cy, v.r * 1.16);
      glow.addColorStop(0, rgba('#4f7cff', 0.6)); glow.addColorStop(0.35, rgba('#4f7cff', 0.25)); glow.addColorStop(1, rgba('#4f7cff', 0));
      c.fillStyle = glow; c.beginPath(); c.arc(v.cx, v.cy, v.r * 1.16, 0, TAU); c.fill();
      return;
    }
    const edge = d.shape(SPHERE);
    c.save();
    c.lineJoin = 'round';
    for (const [width, a] of [[22, 0.07], [13, 0.1], [6, 0.16]]) { c.lineWidth = width * d.k; c.strokeStyle = rgba('#4f7cff', a); c.stroke(edge); }
    c.restore();
    fill(d, SPHERE, '#0b1140', 4.5 * d.k);
  },
};

// The sea: a lit gradient, or in the warmth style the sea's surface warmth.
const sea = {
  id: 'sea', base: true, clip: true,
  draw(d) {
    const { c, view: v, style } = d;
    const [x0, y0, x1, y1] = d.box;
    if (style.sea) {
      const R = v.round ? v.r : Math.max(x1 - x0, y1 - y0) / 2, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      const g = c.createRadialGradient(mx - R * 0.4, my - R * 0.45, R * 0.1, mx, my, R * 1.05);
      g.addColorStop(0, style.sea[0]); g.addColorStop(0.6, style.sea[1]); g.addColorStop(1, style.sea[2]);
      c.fillStyle = g;
      c.fill(d.shape(SPHERE));
    } else {
      fill(d, SPHERE, SST[0]);
      warmBandsNow().forEach((band, i) => fill(d, band, SST[i + 1]));
    }
  },
};

// Over the sea, under the land: a table coloured by latitude, a band's tint, and the faint grid.
const seaData = {
  id: 'sea-data', base: true, clip: true,
  draw(d) {
    const { m } = d;
    if (m.table) for (const b of m.table.bands) fill(d, b.geo, b.col);
    for (const b of m.bands) for (const geo of b.fills) fill(d, geo, rgba(b.col, 0.34));
    d.c.strokeStyle = 'rgba(255,255,255,0.06)'; d.c.lineWidth = 1;
    d.c.stroke(d.shape(d.W.grat));
  },
};

// The land, raised: a shaded copy below, a lit rim above, then its face (one colour, the four political
// colours, or a table's colours), countries lit up, and the tapped country lifted on a spring.
const land = {
  id: 'land', base: true, clip: true,
  draw(d) {
    const { W, m, style, k } = d, depth = 3.2 * k;
    fill(d, W.land, style.edge, depth);
    fill(d, W.land, style.light, -1.2 * k, -0.5 * k);
    // four colours: the land in the first (its shape is made already), then the other three on top
    if (style.four) { fill(d, W.land, style.four[0]); for (let i = 1; i < 4; i++) fill(d, W.byColour[i], style.four[i]); }
    else fill(d, W.land, style.land);
    if (m.table) for (const [name, col] of m.table.countries) { const f = W.byName.get(name); if (f) fill(d, f.f, col); }
    for (const [name, col] of m.highlights) {
      const f = W.byName.get(name);
      if (!f) continue;
      fill(d, f.f, mix(col, '#0a0e2e', 0.35), depth * 0.6);
      fill(d, f.f, col);
    }
    if (m.selected && W.byName.has(m.selected)) {
      const f = W.byName.get(m.selected).f, up = 4 * k * pop(d.now, m.selectedAt, 450);
      fill(d, f, style.edge, depth);
      fill(d, f, '#eafff8', -up - 1.2 * k);
      fill(d, f, '#5fe6c4', -up);
    }
  },
};

const borders = {
  id: 'borders', base: true, clip: true,
  draw(d) {
    if (d.S.borders === false) return;
    d.c.strokeStyle = d.style.border; d.c.lineWidth = (d.style.four ? 0.9 : 0.7) * d.k;
    d.c.stroke(d.shape(d.W.borders));
  },
};

// Every dotted line (the equator, a band's edges), over the sea and the land alike, so a line never runs
// under the land in one place and over it in another.
const lines = {
  id: 'lines', base: true, clip: true,
  draw(d) {
    const c = d.c;
    c.save();
    c.lineCap = 'round'; c.lineWidth = 2.2 * d.k;
    for (const b of d.m.bands) for (const line of b.lines) dotted(d, line, rgba(b.col, 0.95), 6);
    if (d.S.equator) dotted(d, EQUATOR, 'rgba(255,255,255,0.9)', 7);
    c.restore();
  },
};

// The finish: on a globe, one light from the top left (a flat shadow side and a thin lit edge); on a flat
// map, the same lit edge round its outline.
const finish = {
  id: 'finish', base: true,
  draw(d) {
    const { c, view: v, k } = d;
    if (v.round) {
      const { cx, cy, r } = v;
      const hole = (ox, oy, rr) => { const p = new Path2D(); p.arc(cx, cy, r * 1.02, 0, TAU); p.closePath(); p.moveTo(cx + ox + rr, cy + oy); p.arc(cx + ox, cy + oy, rr, 0, TAU); p.closePath(); return p; };
      c.save(); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
      c.fillStyle = 'rgba(7,10,46,0.36)'; c.fill(hole(-r * 0.2, -r * 0.22, r * 1.07), 'evenodd');
      c.fillStyle = 'rgba(168,212,255,0.3)'; c.fill(hole(r * 0.028, r * 0.032, r), 'evenodd');
      const lw = 3 * k;
      c.strokeStyle = 'rgba(127,176,255,0.5)'; c.lineWidth = lw;
      c.beginPath(); c.arc(cx, cy, r - lw / 2 + 0.5, 0, TAU); c.stroke();
      c.restore();
      return;
    }
    c.save();
    c.strokeStyle = 'rgba(127,176,255,0.5)'; c.lineWidth = 2.4 * k; c.lineJoin = 'round';
    c.stroke(d.shape(SPHERE));
    c.restore();
  },
};

// ---------------------------------------------------------------- top layers: drawn every frame things move

// Arcs and tracks: a line along great circles, drawn as far as its progress, on a flat shadow.
const routes = {
  id: 'routes', base: false,
  draw(d) {
    const { c, m, now, k } = d;
    let busy = false;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const rt of m.routes) {
      const p = progressOf(rt, now);
      if (rt.ms && now < rt.t0 + rt.ms) busy = true;   // still gliding
      const line = partOf(rt, p);
      if (!line) continue;
      const path = new Path2D();
      d.pathTo(path)(line);
      c.save(); c.translate(1, 2 * k); c.strokeStyle = 'rgba(6,8,48,0.4)'; c.lineWidth = 5 * k; c.stroke(path); c.restore();
      c.strokeStyle = rt.col; c.lineWidth = 3 * k; c.stroke(path);
    }
    c.restore();
    return busy;
  },
};

// Country names. They used to be placed afresh every frame, so as the map moved, two names near each other
// took turns winning the same spot and each blinked on and off. Now a name that's showing keeps its place
// ahead of any newcomer (it only goes once it's truly crowded out or near the edge), names fade in and
// out rather than popping, and they fade toward the edge instead of vanishing at a line. Then the
// equator's name.
const LABEL_FONT = '800 11px "Nunito", system-ui, sans-serif';
const names = {
  id: 'names', base: false,
  draw(d) {
    const { c: g, view: v, W, S, m, dt } = d;
    let fading = false;
    // the equator's name first, so country names keep clear of it
    const eq = [v.centre[0], 0], eqAt = S.equator && v.visible(eq) ? v.proj(eq) : null;
    if (S.labels === 'countries') {
      const shown = d.memo.shownNames || (d.memo.shownNames = new Map());   // name -> { a: 0..1, on }
      const widths = d.memo.widths || (d.memo.widths = new Map());          // measured once
      g.save();
      g.font = LABEL_FONT;
      const scale = v.round ? v.r : v.s, minArea = 100 / (scale * scale);
      const near = W.countries.filter(c => c.area > minArea && c.name !== m.selected && v.visible(c.labelAt));
      const isOn = c => !!(shown.get(c.name) || {}).on;
      near.sort((a, b) => (isOn(b) - isOn(a)) || (b.area - a.area));
      const placed = eqAt ? [[eqAt[0] - 28, eqAt[1] + 4, eqAt[0] + 28, eqAt[1] + 22]] : [], want = new Set(), at = new Map();
      for (const c of near) {
        const [x, y] = v.proj(c.labelAt);
        const rim = v.rim(x, y, c.labelAt[1]);
        at.set(c.name, [x, y, rim]);
        if (placed.length >= 16 + (eqAt ? 1 : 0)) continue;
        const kept = isOn(c);
        if (rim < (kept ? 4 : 18)) continue;
        if (!widths.has(c.name)) widths.set(c.name, g.measureText(c.name).width);
        const pad = kept ? 0 : 5, tw = widths.get(c.name) + 6;
        const box = [x - tw / 2 - pad, y - 8 - pad, x + tw / 2 + pad, y + 8 + pad];
        if (placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
        placed.push([x - tw / 2, y - 8, x + tw / 2, y + 8]);
        want.add(c.name);
      }
      for (const name of new Set([...shown.keys(), ...want])) {
        const st = shown.get(name) || { a: 0, on: false };
        st.on = want.has(name);
        st.a = st.on ? Math.min(1, st.a + dt / 180) : Math.max(0, st.a - dt / 140);
        if (st.a <= 0 && !st.on) shown.delete(name); else shown.set(name, st);
      }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = 'rgba(12,20,80,0.85)'; g.fillStyle = '#ffffff';
      for (const [name, st] of shown) {
        const p = at.get(name);
        if (!p) { shown.delete(name); continue; }
        const alpha = st.a * clamp01((p[2] - 2) / 22);
        if (st.a < 1 || !st.on) fading = true;
        if (alpha <= 0.01) continue;
        g.globalAlpha = alpha;
        g.strokeText(name, p[0], p[1]); g.fillText(name, p[0], p[1]);
      }
      g.restore();
    }
    if (eqAt) {
      const [x, y] = eqAt;
      g.save(); g.font = '800 12px "Nunito", system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('Equator', x, y + 6); g.restore();
    }
    return fading;
  },
};

// Points, markers (a ring, a pin, the turning storm), whatever rides a track, the finger's pin, and the
// name of the tapped country: each pops in on a spring.
const marks = {
  id: 'marks', base: false,
  draw(d) {
    const { c: g, view: v, m, now, S, W } = d, width = v.w;
    let busy = false;
    const turning = (at, t0) => ({ size: v.size, turn: (now - t0) / 1000, south: at[1] < 0 });
    for (const p of m.points) {
      if (!v.visible(p.at)) continue;
      const [x, y] = v.proj(p.at);
      dot(g, x, y, 6, '#1b1f5e', '#ffffff');
      if (p.label) chip(g, p.label, x, y - 24, { width });
    }
    for (const mk of m.markers) {
      if (!v.visible(mk.at)) continue;
      const [x, y] = v.proj(mk.at), k = pop(now, mk.t0);
      const above = mark(g, mk.kind, x, y, { k, ...turning(mk.at, mk.t0) });
      if (mk.label) chip(g, mk.label, x, y - above, { k, width });
      if (mk.kind === 'storm' || now - mk.t0 < 600) busy = true;
    }
    for (const rt of m.routes) {
      if (!rt.rider || rt.rider === 'none') continue;
      const at = headOf(rt, progressOf(rt, now));
      if (!v.visible(at)) continue;
      const [x, y] = v.proj(at), k = pop(now, rt.born);
      mark(g, rt.rider, x, y, { k, ...turning(at, rt.born) });
      if (rt.rider === 'storm' || now - rt.born < 600) busy = true;
    }
    if (m.pin && v.visible(m.pin.at)) {
      const [x, y] = v.proj(m.pin.at);
      mark(g, 'tap', x, y, { k: pop(now, m.pin.t0, 480) });
      if (now - m.pin.t0 < 520) busy = true;
    }
    if (m.selected && S.labels === 'countries' && W.byName.has(m.selected)) {
      const c = W.byName.get(m.selected);
      if (v.visible(c.labelAt)) { const [x, y] = v.proj(c.labelAt); chip(g, m.selected, x, y - 26, { k: pop(now, m.selectedAt, 450), width }); }
    }
    return busy;
  },
};

// The stack, bottom to top.
export const LAYERS = [backdrop, sea, seaData, land, borders, lines, finish, routes, names, marks];

// ---------------------------------------------------------------- shapes used by more than one call

const parallel = lat => ({ type: 'LineString', coordinates: Array.from({ length: 121 }, (_, i) => [-180 + i * 3, lat]) });
export const EQUATOR = parallel(0);

// A band between two latitudes, wound the way d3 wants (a band never covers more than half the world).
export function latBand(lat0, lat1) {
  const ring = [];
  for (let lon = -180; lon <= 180; lon += 4) ring.push([lon, lat0]);
  for (let lon = 180; lon >= -180; lon -= 4) ring.push([lon, lat1]);
  ring.push(ring[0]);
  const poly = { type: 'Polygon', coordinates: [ring] };
  return geoArea(poly) > 2 * Math.PI ? { type: 'Polygon', coordinates: [ring.slice().reverse()] } : poly;
}
// A band north and south of the equator both, with its dotted edges: what the band call draws.
export function mirroredBand(lo, hi, col) {
  return { from: lo, to: hi, col, fills: [latBand(lo, hi), latBand(-lo, -hi)], lines: [lo, hi, -lo, -hi].map(parallel) };
}

// A route: places joined along great circles. Its lengths and the way along each leg are worked out once.
export function makeRoute(places, { col, rider = 'none', progress = 1, from = progress, seconds = 0, now = 0 } = {}) {
  const legs = [];
  let total = 0;
  for (let i = 1; i < places.length; i++) {
    const a = places[i - 1], b = places[i], at = geoInterpolate(a, b), len = geoDistance(a, b);
    legs.push({ a, b, at, len, start: total });
    total += len;
  }
  return { places, legs, total, col, rider, from, to: progress, t0: now, ms: Math.max(0, seconds * 1000), born: now };
}
// How far along a route is now, gliding from `from` to `to`.
export function progressOf(rt, now) {
  if (!rt.ms || now >= rt.t0 + rt.ms) return rt.to;
  const k = clamp01((now - rt.t0) / rt.ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  return rt.from + (rt.to - rt.from) * e;
}
// The place at a share of the way along.
export function headOf(rt, p) {
  if (!rt.legs.length) return rt.places[0];
  const want = clamp01(p) * rt.total;
  const leg = rt.legs.find(l => want <= l.start + l.len + 1e-12) || rt.legs[rt.legs.length - 1];
  return leg.len ? leg.at(clamp01((want - leg.start) / leg.len)) : leg.b;
}
// The line from the start to a share of the way along, or null before it has begun.
export function partOf(rt, p) {
  if (p <= 0 || !rt.legs.length) return null;
  const want = clamp01(p) * rt.total, coords = [rt.places[0]];
  for (const l of rt.legs) {
    if (want >= l.start + l.len) { coords.push(l.b); continue; }
    coords.push(l.at(clamp01((want - l.start) / (l.len || 1))));
    break;
  }
  return { type: 'LineString', coordinates: coords };
}
