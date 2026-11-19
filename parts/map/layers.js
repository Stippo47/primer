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

// Arcs, tracks and flows: a line along its smooth curve, drawn as far as its progress, on a flat shadow. A
// flow, and a track ridden by an arrow, end in an arrowhead pointing the way it goes.
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
      const wide = rt.kind === 'flow' ? 3.6 : 3;
      c.globalAlpha = a;
      c.save(); c.translate(1, 2 * k); c.strokeStyle = 'rgba(6,8,48,0.4)'; c.lineWidth = (wide + 2) * k; c.stroke(path); c.restore();
      c.strokeStyle = rt.col; c.lineWidth = wide * k; c.stroke(path);
      if (rt.kind === 'flow' || rt.rider === 'arrow') arrowhead(d, rt, p, rt.col, wide);
      c.globalAlpha = 1;
    }
    c.restore();
    return busy;
  },
};

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
    if (eqAt) {
      const [x, y] = eqAt;
      g.save(); g.font = '800 12px "Nunito", system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('Equator', x, y + 6); g.restore();
    }
    for (const pl of m.parallels) {
      const at = [v.centre[0], pl.lat], a = shown(pl, d);
      if (pl.out || (d.soft && d.now - pl.born < 520)) fading = true;
      if (!pl.label || a <= 0.01 || !v.visible(at)) continue;
      const [x, y] = v.proj(at);
      g.save(); g.globalAlpha = a; g.font = '800 12px "Nunito", system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'center'; g.textBaseline = 'top';
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

// The stack, bottom to top.
export const LAYERS = [backdrop, sea, seaData, land, borders, lines, finish, routes, names, marks];

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
