// The map's layers, bottom to top. Each layer draws one kind of thing, for any view (globe or flat), from
// a draw context `d` the part hands it:
//
//   d.c        the canvas to draw on        d.view    the view (projection, size, edges; views.js)
//   d.shape(g) a Path2D of a shape, made once per view and shared by every layer that draws it
//   d.W        the world (world.js)         d.S       the part's settings
//   d.m        what's on the map: highlights, bands, the coloured table, points, markers, routes, pin...
//   d.style    the style's colours          d.k       line weight, growing gently with the map's size
//   d.now, d.dt  the time and the time since the last frame, for things that move
//   d.soft     true in a scene: things arrive and leave softly (fade and grow), never with a spring's ring
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
import { Glide, soft as softEase } from '../../js/ease.js';

const TAU = Math.PI * 2, RAD = Math.PI / 180, DEG = 180 / Math.PI;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
export const spring = (k, bounce) => {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  return 1 - Math.exp(-(7 - 3 * bounce) * k) * Math.cos(k * Math.PI * (1 + 3 * bounce)) * (1 - k * k * k);
};
// Something arriving. Lively (a lesson, the Playground): it pops in on the approved spring. Soft (a scene,
// d.soft): it grows in smoothly over a little longer, with no ring, so a narrated picture never snaps.
const pop = (d, t0, ms = 520) => (d.soft ? softEase(ramp(d.now, t0, t0 + ms * 1.4)) : spring(ramp(d.now, t0, t0 + ms), MOTION.bounce));
// How visible a thing is: fading out once `clear` sends it away (it.out), and, in a scene, fading in as it
// comes (it.born). Things that grow in by scale instead pass born: false.
export function shown(it, d, born = true) {
  let a = 1;
  if (it.out) a *= 1 - clamp01((d.now - it.out.t0) / it.out.ms);
  if (born && d.soft && it.born !== undefined) a *= softEase(clamp01((d.now - it.born) / 500));
  return a;
}

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
    const { m, c } = d;
    if (m.table) { c.globalAlpha = shown(m.table, d); for (const b of m.table.bands) fill(d, b.geo, b.col); c.globalAlpha = 1; }
    for (const b of m.bands) for (const geo of b.fills) fill(d, geo, rgba(b.col, 0.34 * shown(b, d)));
    d.c.strokeStyle = 'rgba(255,255,255,0.06)'; d.c.lineWidth = 1;
    d.c.stroke(d.shape(d.W.grat));
  },
};

// The land, raised: a shaded copy below, a lit rim above, then its face (one colour, the four political
// colours, or a table's colours), countries lit up, and the tapped country lifted on a spring.
const land = {
  id: 'land', base: true, clip: true,
  draw(d) {
    const { W, m, style, k, c } = d, depth = 3.2 * k;
    fill(d, W.land, style.edge, depth);
    fill(d, W.land, style.light, -1.2 * k, -0.5 * k);
    // four colours: the land in the first (its shape is made already), then the other three on top
    if (style.four) { fill(d, W.land, style.four[0]); for (let i = 1; i < 4; i++) fill(d, W.byColour[i], style.four[i]); }
    else fill(d, W.land, style.land);
    if (m.table) { c.globalAlpha = shown(m.table, d); for (const [name, col] of m.table.countries) { const f = W.byName.get(name); if (f) fill(d, f.f, col); } c.globalAlpha = 1; }
    for (const [name, h] of m.highlights) {
      const f = W.byName.get(name);
      if (!f) continue;
      c.globalAlpha = shown(h, d);
      fill(d, f.f, mix(h.col, '#0a0e2e', 0.35), depth * 0.6);
      fill(d, f.f, h.col);
      c.globalAlpha = 1;
    }
    if (m.selected && W.byName.has(m.selected)) {
      const f = W.byName.get(m.selected).f, up = 4 * k * pop(d, m.selectedAt, 450);
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

// Every dotted line (the equator, a parallel, a band's edges), over the sea and the land alike, so a line
// never runs under the land in one place and over it in another.
const lines = {
  id: 'lines', base: true, clip: true,
  draw(d) {
    const c = d.c;
    c.save();
    c.lineCap = 'round'; c.lineWidth = 2.2 * d.k;
    for (const b of d.m.bands) for (const line of b.lines) dotted(d, line, rgba(b.col, 0.95 * shown(b, d)), 6);
    if (d.S.equator) dotted(d, EQUATOR, 'rgba(255,255,255,0.9)', 7);
    for (const pl of d.m.parallels) dotted(d, pl.geo, `rgba(255,255,255,${(0.9 * shown(pl, d)).toFixed(3)})`, 7);
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

// Arcs, tracks, flows and spirals: a line along its smooth curve, drawn as far as its progress, on a flat
// shadow. A flow, a dotted arc, a spiral's arrows and a track ridden by an arrow end in an arrowhead pointing
// the way they go. In a scene a flow and a spiral, once drawn, carry bright dashes running along them the way
// the air goes (pulses), so a wind is seen blowing, not only drawn. A route with a label has its name beside
// its middle, once it's drawn that far.
const routes = {
  id: 'routes', base: false,
  draw(d) {
    const { c, m, now, k } = d;
    let busy = false;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const rt of m.routes) {
      const p = progressOf(rt, now), a = shown(rt, d);
      if (rt.g.moving(now) || rt.out || (d.soft && now - rt.born < 520)) busy = true;
      const line = partOf(rt, p);
      if (!line || a <= 0.003) continue;
      const path = new Path2D();
      d.pathTo(path)(line);
      const wide = rt.kind === 'flow' ? 3.6 : rt.dotted ? 4 : 3;
      c.globalAlpha = a;
      if (rt.dotted) {
        c.setLineDash([0.1, 10 * k]);
        c.save(); c.translate(1, 2 * k); c.strokeStyle = 'rgba(6,8,48,0.4)'; c.lineWidth = (wide + 1.5) * k; c.stroke(path); c.restore();
        c.strokeStyle = rt.col; c.lineWidth = wide * k; c.stroke(path);
        c.setLineDash([]);
      } else {
        c.save(); c.translate(1, 2 * k); c.strokeStyle = 'rgba(6,8,48,0.4)'; c.lineWidth = (wide + 2) * k; c.stroke(path); c.restore();
        c.strokeStyle = rt.col; c.lineWidth = wide * k; c.stroke(path);
      }
      if (rt.kind === 'flow' || rt.rider === 'arrow' || rt.dotted) arrowhead(d, rt, p, rt.col, wide);
      if (rt.kind === 'flow' && d.soft && p >= 1) { pulses(d, screenLine(d, rt.pts), rt.col, wide, now - rt.born, a); busy = true; }
      c.globalAlpha = 1;
    }
    for (const sp of m.spirals) {
      const a = shown(sp, d), drawn = sp.draw.at(now), bend = sp.bend.at(now);
      if (sp.draw.moving(now) || sp.bend.moving(now) || sp.out || (d.soft && now - sp.born < 520)) busy = true;
      if (a <= 0.003 || drawn <= 0) continue;
      c.globalAlpha = a;
      for (const arm of spiralArms(sp, bend)) {
        const n = Math.max(2, Math.round(arm.length * drawn));
        const line = { type: 'LineString', coordinates: arm.slice(0, n) };
        const path = new Path2D();
        d.pathTo(path)(line);
        c.save(); c.translate(1, 2 * k); c.strokeStyle = 'rgba(6,8,48,0.4)'; c.lineWidth = 5.6 * k; c.stroke(path); c.restore();
        c.strokeStyle = sp.col; c.lineWidth = 3.6 * k; c.stroke(path);
        pointHead(d, arm[n - 1], arm[n - 2], sp.col, 3.6);
        if (d.soft && drawn >= 1) { pulses(d, screenLine(d, arm), sp.col, 3.6, now - sp.born, a); busy = true; }
      }
      c.globalAlpha = 1;
    }
    c.restore();
    return busy;
  },
};

// Routes' names, over the marks, so a storm riding by never hides one.
const routeNames = {
  id: 'route-names', base: false,
  draw(d) {
    const placed = [];
    for (const rt of d.m.routes) if (rt.label) routeLabel(d, rt, placed);
    return false;
  },
};

// A route's name, on a plate beside its middle, once it's drawn past there. Plates keep clear of each other:
// one that would cover another slides along its line (a little on, a little back) until it's clear.
function routeLabel(d, rt, placed) {
  const { c, view: v, now } = d, p = progressOf(rt, now);
  if (p < 0.5) return;
  c.save();
  c.font = '800 13px "Nunito", system-ui, sans-serif';
  const tw = c.measureText(rt.label).width + 22, th = 26;
  c.restore();
  let best = null;
  for (const f of [0.5, 0.66, 0.34, 0.8, 0.2]) {
    const mid = headOf(rt, f);
    if (!v.visible(mid)) continue;
    const [x, y] = v.proj(mid);
    // the plate sits off the line, never on it: above it where it can be
    const before = v.proj(headOf(rt, Math.max(0, f - 0.08))), after = v.proj(headOf(rt, Math.min(1, f + 0.08)));
    let nx = -(after[1] - before[1]), ny = after[0] - before[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const cx = Math.max(tw / 2 + 6, Math.min(v.w - tw / 2 - 6, x + nx * 26)), cy = y + ny * 26;
    const box = [cx - tw / 2 - 4, cy - th / 2 - 4, cx + tw / 2 + 4, cy + th / 2 + 4];
    const clear = !placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]);
    if (!best) best = { cx, cy, box };
    if (clear) { best = { cx, cy, box }; break; }
  }
  if (!best) return;
  placed.push(best.box);
  const a = shown(rt, d, false) * softEase(clamp01((p - 0.5) / 0.25));
  if (a <= 0.01) return;
  c.save(); c.globalAlpha = a;
  chip(c, rt.label, best.cx, best.cy, { k: 1, width: v.w });
  c.restore();
}

// A route's or an arm's places, as points on the screen with the distance along to each, the hidden side of a
// globe left out (where a line goes round the back, the pulses stop there).
function screenLine(d, pts) {
  const v = d.view, out = [];
  let run = 0, last = null;
  for (const p of pts) {
    if (!v.visible(p)) { last = null; out.push(null); continue; }
    const [x, y] = v.proj(p);
    if (last) run += Math.hypot(x - last[0], y - last[1]);
    out.push([x, y, run]);
    last = [x, y];
  }
  return out;
}

// Bright dashes running along a line the way it goes: a short light stroke over the line every so many pixels,
// each fading in and out along its way, moving at an easy walking pace across the screen.
function pulses(d, sl, col, wide, ms, alpha) {
  const { c, k } = d;
  const pts = sl.filter(Boolean);
  if (pts.length < 2) return;
  const total = pts[pts.length - 1][2];
  if (total < 24) return;
  const gap = Math.max(46, Math.min(90, total / 3)), dash = Math.min(18, gap * 0.32), speed = 34;   // pixels, pixels a second
  const shift = ((ms / 1000) * speed) % gap;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = mix(col, '#ffffff', 0.72);
  c.lineWidth = Math.max(1.6, wide * 0.55) * k;
  for (let s = shift - gap; s < total; s += gap) {
    const s0 = Math.max(0, s), s1 = Math.min(total - 6 * k, s + dash);
    if (s1 <= s0) continue;
    const mid = (s0 + s1) / 2;
    c.globalAlpha = alpha * Math.sin(Math.PI * clamp01(mid / total)) ** 0.6;
    c.beginPath();
    let on = false;
    for (let i = 1; i < sl.length; i++) {
      const p0 = sl[i - 1], p1 = sl[i];
      if (!p0 || !p1) { on = false; continue; }
      if (p1[2] < s0 || p0[2] > s1) continue;
      const seg = p1[2] - p0[2] || 1;
      const a0 = clamp01((s0 - p0[2]) / seg), a1 = clamp01((s1 - p0[2]) / seg);
      const x0 = p0[0] + (p1[0] - p0[0]) * a0, y0 = p0[1] + (p1[1] - p0[1]) * a0;
      const x1 = p0[0] + (p1[0] - p0[0]) * a1, y1 = p0[1] + (p1[1] - p0[1]) * a1;
      if (!on) { c.moveTo(x0, y0); on = true; }
      c.lineTo(x1, y1);
    }
    c.stroke();
  }
  c.restore();
}

// An arrowhead at a place, pointing away from the place behind it, on the screen.
function pointHead(d, head, back, col, wide) {
  const { c, view: v, k } = d;
  if (!head || !back || !v.visible(head)) return;
  const [x, y] = v.proj(head), [bx, by] = v.proj(back);
  let dx = x - bx, dy = y - by;
  const l = Math.hypot(dx, dy);
  if (l < 0.01) return;
  dx /= l; dy /= l;
  const s = (wide * 2.2 + 3) * k;
  const tri = (ox, oy, colour) => {
    c.fillStyle = colour; c.beginPath();
    c.moveTo(x + ox + dx * s, y + oy + dy * s);
    c.lineTo(x + ox - dx * s * 0.55 - dy * s * 0.8, y + oy - dy * s * 0.55 + dx * s * 0.8);
    c.lineTo(x + ox - dx * s * 0.55 + dy * s * 0.8, y + oy - dy * s * 0.55 - dx * s * 0.8);
    c.closePath(); c.fill();
  };
  tri(1, 2 * k, 'rgba(6,8,48,0.4)');
  tri(0, 0, col);
}

// An arrowhead at a route's head, pointing along the way it's going on the screen.
function arrowhead(d, rt, p, col, wide) {
  const { c, view: v, k } = d;
  if (p <= 0) return;
  const head = headOf(rt, p), back = headOf(rt, Math.max(0, p - Math.min(0.08, (1.2 * RAD) / Math.max(rt.total, 1e-6))));
  if (!v.visible(head)) return;
  const [x, y] = v.proj(head), [bx, by] = v.proj(back);
  let dx = x - bx, dy = y - by;
  const l = Math.hypot(dx, dy);
  if (l < 0.01) return;
  dx /= l; dy /= l;
  const s = (wide * 2.2 + 3) * k;
  const tri = (ox, oy, colour) => {
    c.fillStyle = colour; c.beginPath();
    c.moveTo(x + ox + dx * s, y + oy + dy * s);
    c.lineTo(x + ox - dx * s * 0.55 - dy * s * 0.8, y + oy - dy * s * 0.55 + dx * s * 0.8);
    c.lineTo(x + ox - dx * s * 0.55 + dy * s * 0.8, y + oy - dy * s * 0.55 - dx * s * 0.8);
    c.closePath(); c.fill();
  };
  c.lineJoin = 'round';
  tri(1, 2 * k, 'rgba(6,8,48,0.4)');
  tri(0, 0, col);
}

// Country names. They used to be placed afresh every frame, so as the map moved, two names near each other
// took turns winning the same spot and each blinked on and off. Now a name that's showing keeps its place
// ahead of any newcomer (it only goes once it's truly crowded out or near the edge), names fade in and
// out rather than popping, and they fade toward the edge instead of vanishing at a line. Then the
// equator's name, the parallels' names and the places a scene has named (label).
const LABEL_FONT = '800 11px "Nunito", system-ui, sans-serif';
const names = {
  id: 'names', base: false,
  draw(d) {
    const { c: g, view: v, W, S, m, dt } = d;
    let fading = false;
    // the equator's name first, so country names keep clear of it
    const eq = [v.centre[0], 0], eqAt = S.equator && v.visible(eq) ? v.proj(eq) : null;
    if (S.labels === 'countries') {
      const shownNames = d.memo.shownNames || (d.memo.shownNames = new Map());   // name -> { a: 0..1, on }
      const widths = d.memo.widths || (d.memo.widths = new Map());              // measured once
      g.save();
      g.font = LABEL_FONT;
      const scale = v.round ? v.r : v.s, minArea = 100 / (scale * scale);
      const near = W.countries.filter(c => c.area > minArea && c.name !== m.selected && v.visible(c.labelAt));
      const isOn = c => !!(shownNames.get(c.name) || {}).on;
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
      for (const name of new Set([...shownNames.keys(), ...want])) {
        const st = shownNames.get(name) || { a: 0, on: false };
        st.on = want.has(name);
        st.a = st.on ? Math.min(1, st.a + dt / 180) : Math.max(0, st.a - dt / 140);
        if (st.a <= 0 && !st.on) shownNames.delete(name); else shownNames.set(name, st);
      }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = 'rgba(12,20,80,0.85)'; g.fillStyle = '#ffffff';
      for (const [name, st] of shownNames) {
        const p = at.get(name);
        if (!p) { shownNames.delete(name); continue; }
        const alpha = st.a * clamp01((p[2] - 2) / 22);
        if (st.a < 1 || !st.on) fading = true;
        if (alpha <= 0.01) continue;
        g.globalAlpha = alpha;
        g.strokeText(name, p[0], p[1]); g.fillText(name, p[0], p[1]);
      }
      g.restore();
    }
    // the equator's name, then each parallel's: a name that would overlap one already written moves along
    // its line, left or right, until it's clear (5° N, the equator and 5° S, close together, side by side)
    const lineNames = [];
    g.save(); g.font = '800 12px "Nunito", system-ui, sans-serif';
    const room = (x, y, text) => {
      const tw = g.measureText(text).width + 10;
      for (const step of [0, 1, -1, 2, -2, 3, -3]) {
        const cx = x + step * (tw + 12), box = [cx - tw / 2, y + 4, cx + tw / 2, y + 22];
        if (step && (box[0] < 6 || box[2] > v.w - 6)) continue;
        if (!lineNames.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) { lineNames.push(box); return cx; }
      }
      return x;
    };
    g.restore();
    if (eqAt) {
      const [x, y] = eqAt;
      g.save(); g.font = '800 12px "Nunito", system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('Equator', room(x, y, 'Equator'), y + 6); g.restore();
    }
    for (const pl of m.parallels) {
      const at = [v.centre[0], pl.lat], a = shown(pl, d);
      if (pl.out || (d.soft && d.now - pl.born < 520)) fading = true;
      if (!pl.label || a <= 0.01 || !v.visible(at)) continue;
      const [x0, y] = v.proj(at);
      g.save(); g.font = '800 12px "Nunito", system-ui, sans-serif';
      const x = room(x0, y, pl.label);
      g.globalAlpha = a; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = 'rgba(12,20,80,0.6)'; g.strokeText(pl.label, x, y + 6);
      g.fillText(pl.label, x, y + 6); g.restore();
    }
    if (placeNames(d)) fading = true;
    return fading;
  },
};

// The names a scene writes on the map with `label`: an ocean or a sea in pale blue spaced capitals, a word to
// a line; a continent or a country in white spaced capitals. Each sits at the anchor in view nearest the
// middle (and keeps it while it stays in view, so it never jumps), fades in rising a touch, fades toward the
// map's edge, and fades out when it's taken away.
const NAME_LOOK = {
  ocean: { size: 14, weight: 800, fill: '#bfeaff', lines: true, wide: true },
  sea: { size: 12, weight: 800, fill: '#bfeaff', lines: true, wide: false },
  continent: { size: 15, weight: 900, fill: '#ffffff', lines: false, wide: true },
  country: { size: 13, weight: 900, fill: '#ffffff', lines: false, wide: false },
};
const spaced = (text, wide) => [...text.toUpperCase()].join(wide ? ' ' : ' ');
function placeNames(d) {
  const { c: g, view: v, m, now } = d;
  let busy = false;
  for (const [name, L] of m.labels) {
    const anchors = L.anchors.filter(p => v.visible(p));
    if (!anchors.length) { L.at = null; continue; }
    if (!L.at || !anchors.includes(L.at)) L.at = anchors.slice().sort((a, b) => geoDistance(a, v.centre) - geoDistance(b, v.centre))[0];
    const [x, y] = v.proj(L.at), look = NAME_LOOK[L.kind] || NAME_LOOK.country;
    const rim = v.rim(x, y, L.at[1]);
    const born = d.soft ? softEase(clamp01((now - L.born) / 700)) : clamp01((now - L.born) / 250);
    const zoomed = Math.max(0.9, Math.min(1.35, 0.92 + 0.16 * Math.log2(Math.max(1, v.size))));
    const px = look.size * zoomed, words = look.lines ? name.split(' ') : [name];
    g.save();
    g.font = `${look.weight} ${px.toFixed(1)}px "Nunito", system-ui, sans-serif`;
    // it fades near the map's edge, and near the picture's: a name is never cut off
    const half = Math.max(...words.map(w => g.measureText(spaced(w, look.wide)).width)) / 2;
    const edge = Math.min(x - half, v.w - x - half, y - px, v.h - y - px);
    const a = shown(L, d, false) * born * clamp01((rim - 4) / 26) * clamp01((edge - 2) / 18);
    if (born < 1 || L.out) busy = true;
    if (a <= 0.01) { g.restore(); continue; }
    g.globalAlpha = a;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 3.6; g.strokeStyle = 'rgba(10,16,64,0.78)'; g.fillStyle = look.fill;
    const lh = px * 1.15, top = y - ((words.length - 1) * lh) / 2 + (1 - born) * 6;
    words.forEach((w, i) => { const t = spaced(w, look.wide); g.strokeText(t, x, top + i * lh); g.fillText(t, x, top + i * lh); });
    g.restore();
  }
  return busy;
}

// Points, markers (a ring, a pin, the turning storm), whatever rides a track, the finger's pin, and the
// name of the tapped country: each pops in on a spring (grows in softly, in a scene). A storm's size follows
// the map's `grow`.
const marks = {
  id: 'marks', base: false,
  draw(d) {
    const { c: g, view: v, m, now, S, W } = d, width = v.w;
    let busy = false;
    const turning = (at, t0) => ({ size: v.size, turn: (now - t0) / 1000, south: at[1] < 0 });
    const grow = m.grow.at(now);
    if (m.grow.moving(now)) busy = true;
    const scaled = (kind, k) => (kind === 'storm' ? k * grow : k);
    for (const p of m.points) {
      if (!v.visible(p.at)) continue;
      const [x, y] = v.proj(p.at), a = shown(p, d, false), k = d.soft ? pop(d, p.born) : 1;
      if (a <= 0.01) continue;
      g.save(); g.globalAlpha = a;
      if (k < 1) { g.translate(x, y); g.scale(Math.max(0.01, k), Math.max(0.01, k)); g.translate(-x, -y); }
      dot(g, x, y, 6, '#1b1f5e', '#ffffff');
      g.restore();
      if (p.label) { g.save(); g.globalAlpha = a; chip(g, p.label, x, y - 24, { k, width }); g.restore(); }
      if (k < 1 || p.out) busy = true;
    }
    for (const mk of m.markers) {
      if (!v.visible(mk.at)) continue;
      const [x, y] = v.proj(mk.at), k = pop(d, mk.t0), a = shown(mk, d, false);
      if (a <= 0.01) continue;
      g.save(); g.globalAlpha = a;
      const above = mark(g, mk.kind, x, y, { k: scaled(mk.kind, k), ...turning(mk.at, mk.t0) });
      if (mk.label) chip(g, mk.label, x, y - above, { k, width });
      g.restore();
      if (mk.kind === 'storm' || now - mk.t0 < 760 || mk.out) busy = true;
    }
    for (const rt of m.routes) {
      if (!rt.rider || rt.rider === 'none' || rt.rider === 'arrow') continue;
      const at = headOf(rt, progressOf(rt, now)), a = shown(rt, d, false);
      if (!v.visible(at) || a <= 0.01) continue;
      const [x, y] = v.proj(at), k = pop(d, rt.born);
      g.save(); g.globalAlpha = a;
      mark(g, rt.rider, x, y, { k: scaled(rt.rider, k), ...turning(at, rt.born) });
      g.restore();
      if (rt.rider === 'storm' || now - rt.born < 760 || rt.out) busy = true;
    }
    if (m.pin && v.visible(m.pin.at)) {
      const [x, y] = v.proj(m.pin.at);
      mark(g, 'tap', x, y, { k: pop(d, m.pin.t0, 480) });
      if (now - m.pin.t0 < 700) busy = true;
    }
    if (m.selected && S.labels === 'countries' && W.byName.has(m.selected)) {
      const c = W.byName.get(m.selected);
      if (v.visible(c.labelAt)) { const [x, y] = v.proj(c.labelAt); chip(g, m.selected, x, y - 26, { k: pop(d, m.selectedAt, 450), width }); }
    }
    return busy;
  },
};

// A key to the style's colours, on a plate along the top, clear of the status bar in a scene: in warmth, the
// sea's colours from the coolest to the warmest, named at each end. Only a style with a key draws one.
const KEYS = { warmth: { colours: SST, low: 'Cool', high: 'Warm', title: 'Sea surface' } };
const key = {
  id: 'key', base: false,
  draw(d) {
    const { c, m, now, view: v } = d;
    const K = KEYS[d.styleName];
    if (!m.key || !K) return false;
    const a = shown(m.key, d, false) * (d.soft ? softEase(clamp01((now - m.key.born) / 600)) : 1);
    if (a <= 0.01) return !!m.key.out;
    const wd = Math.min(250, v.w - 40), x = (v.w - wd) / 2, y = d.safeTop + 14, h = 50;
    c.save();
    c.globalAlpha = a;
    c.fillStyle = 'rgba(6,8,40,0.5)'; c.beginPath(); c.roundRect(x, y + 3, wd, h, 14); c.fill();
    c.fillStyle = 'rgba(14,18,60,0.88)'; c.beginPath(); c.roundRect(x, y, wd, h, 14); c.fill();
    const bx = x + 50, bw = wd - 100, by = y + 28, bh = 12;
    const grad = c.createLinearGradient(bx, 0, bx + bw, 0);
    K.colours.forEach((col, i) => grad.addColorStop(i / (K.colours.length - 1), col));
    c.fillStyle = grad; c.beginPath(); c.roundRect(bx, by, bw, bh, 6); c.fill();
    c.font = '800 12px "Nunito", system-ui, sans-serif'; c.textBaseline = 'middle';
    c.fillStyle = '#9fb4ff'; c.textAlign = 'right'; c.fillText(K.low, bx - 8, by + bh / 2);
    c.fillStyle = '#ffc27a'; c.textAlign = 'left'; c.fillText(K.high, bx + bw + 8, by + bh / 2);
    c.fillStyle = 'rgba(255,255,255,0.86)'; c.textAlign = 'center'; c.fillText(K.title, x + wd / 2, y + 13);
    c.restore();
    return a < 1 || !!m.key.out;
  },
};

// The stack, bottom to top.
export const LAYERS = [backdrop, sea, seaData, land, borders, lines, finish, routes, names, marks, routeNames, key];

// ---------------------------------------------------------------- shapes used by more than one call

export const parallel = lat => ({ type: 'LineString', coordinates: Array.from({ length: 121 }, (_, i) => [-180 + i * 3, lat]) });
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

// A route: a smooth curve along its places, worked out once. Two places are joined along the great circle,
// the shortest way over the Earth. Three or more make one smooth curve (a cubic B-spline, worked on the
// sphere so it bends the same on the globe and on every flat map) that starts at the first place, ends at the
// last and bends past the ones between, rounding each instead of turning a corner there: a storm's track. The
// curve is kept as close points with the distance along it to each, so a share of the way is a share of its
// length, and a rider moves along it at an even pace.
const toV = ([lon, lat]) => { const l = lon * RAD, p = lat * RAD; return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; };
const toLL = ([x, y, z]) => { const n = Math.hypot(x, y, z) || 1; return [Math.atan2(y, x) * DEG, Math.asin(Math.max(-1, Math.min(1, z / n))) * DEG]; };

export function curveThrough(places) {
  const step = 0.6 * RAD;   // a point every 0.6 degrees or so
  const pts = [places[0]];
  if (places.length < 3) {
    for (let i = 1; i < places.length; i++) {
      const at = geoInterpolate(places[i - 1], places[i]), n = Math.max(2, Math.ceil(geoDistance(places[i - 1], places[i]) / step));
      for (let j = 1; j <= n; j++) pts.push(at(j / n));
    }
  } else {
    // the ends held: each end place three times over, so the curve starts and finishes on it
    const P = places.map(toV), Q = [P[0], P[0], ...P, P[P.length - 1], P[P.length - 1]];
    for (let i = 0; i + 3 < Q.length; i++) {
      const [q0, q1, q2, q3] = Q.slice(i, i + 4);
      const n = Math.max(3, Math.ceil(geoDistance(toLL(q1), toLL(q2)) / step));
      for (let j = 1; j <= n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const w = [(1 - t) ** 3, 3 * t3 - 6 * t2 + 4, -3 * t3 + 3 * t2 + 3 * t + 1, t3];
        pts.push(toLL([0, 1, 2].map(k => (w[0] * q0[k] + w[1] * q1[k] + w[2] * q2[k] + w[3] * q3[k]) / 6)));
      }
    }
  }
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + geoDistance(pts[i - 1], pts[i]));
  return { pts, cum, total: cum[cum.length - 1] };
}

// A spiral of air rushing in toward a place from four sides (the map's spiral call). Its bend glides; its arms
// are worked out from the bend each frame (a few dozen points each, cheap). The bend is the Earth's own:
// scaled by how far from the equator the place is (the Coriolis effect grows with the sine of the latitude;
// full strength from about 20 degrees out, none on the equator), and the turn goes the hemisphere's way, so
// air bending right north of the equator swirls counterclockwise, and left south of it, clockwise.
export function makeSpiral(at, { bend = 1, size = 9, seconds = 1.4, now = 0, col = '#49c6ff' } = {}) {
  return { at, size, col, born: now, bend: new Glide(seconds > 0 ? bend : bend).go(bend, 0, now), draw: new Glide(seconds > 0 ? 0 : 1).go(1, seconds * 1000, now) };
}
const SPIRAL_ARMS = 4, SPIRAL_STEPS = 28;
export function spiralArms(sp, bend) {
  const [lon0, lat0] = sp.at, R = sp.size;
  const strength = clamp01(Math.abs(Math.sin(lat0 * RAD)) / Math.sin(20 * RAD));
  const turn = (lat0 >= 0 ? 1 : -1) * clamp01(bend) * strength;
  const k = Math.cos(lat0 * RAD) || 1;
  const arms = [];
  for (let i = 0; i < SPIRAL_ARMS; i++) {
    const a0 = (i / SPIRAL_ARMS) * TAU + 0.35;
    const arm = [];
    for (let j = 0; j <= SPIRAL_STEPS; j++) {
      const s = j / SPIRAL_STEPS;
      // inward, bending more as it goes; aimed straight, it stops short of the middle with its head on it
      const r = R * (1 - s * (0.78 - 0.2 * Math.abs(turn)));
      const a = a0 + turn * 2.1 * Math.pow(s, 1.25);
      arm.push([lon0 + (r * Math.cos(a)) / k, lat0 + r * Math.sin(a)]);
    }
    arms.push(arm);
  }
  return arms;
}

// kind: 'arc', 'track' or 'flow'. progress: how far it's drawn; it glides there from `from` over `seconds`.
export function makeRoute(places, { col, rider = 'none', progress = 1, from = progress, seconds = 0, now = 0, kind = 'track' } = {}) {
  const { pts, cum, total } = curveThrough(places);
  const g = new Glide(clamp01(from)).go(clamp01(progress), Math.max(0, seconds * 1000), now);
  return { places, pts, cum, total, col, rider, kind, g, born: now };
}
// How far along a route is now.
export const progressOf = (rt, now) => rt.g.at(now);
// The place at a share of the way along.
export function headOf(rt, p) {
  const { pts, cum, total } = rt;
  if (pts.length < 2 || !total) return pts[0];
  const want = clamp01(p) * total;
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= want) lo = mid; else hi = mid; }
  const span = cum[hi] - cum[lo];
  return span > 0 ? geoInterpolate(pts[lo], pts[hi])(clamp01((want - cum[lo]) / span)) : pts[hi];
}
// The line from the start to a share of the way along, or null before it has begun.
export function partOf(rt, p) {
  if (p <= 0 || rt.pts.length < 2) return null;
  const want = clamp01(p) * rt.total, coords = [rt.pts[0]];
  for (let i = 1; i < rt.pts.length && rt.cum[i] < want; i++) coords.push(rt.pts[i]);
  coords.push(headOf(rt, p));
  return { type: 'LineString', coordinates: coords };
}
