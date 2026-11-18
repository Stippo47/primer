// Views: the ways the map can lay the world on the screen. Every view shares one camera, a centre
// [longitude, latitude] and a zoom, so every call, layer and gesture works on all of them unchanged. A
// view only answers the questions that depend on the projection:
//
//   set(w, h, centre, zoom)   point the projection (view.proj) at the camera, for a box w by h
//   clamp(centre, zoom)       the nearest centre the view can really show
//   pan(from, dx, dy)         the centre once the map has been moved dx, dy pixels from `from`
//   between(a, b)             a path from one centre to another, k (0..1) -> centre
//   visible([lon, lat])       whether a place shows (on the facing side of a globe, inside the box)
//   onMap(x, y)               the [lon, lat] under a screen point, or null off the map
//   rim(x, y, lat)            how far a screen point is from the map's edge, for names to fade there
//   size                      the drawing's size: 1 for a whole globe on an iPhone 11, more zoomed in
//   scale1, box               the projection's scale at zoom 1, and the map's bounding box on screen
//
// The globe turns: its centre is the point facing you. A flat map turns too, about the pole: its centre
// longitude runs down the middle, so dragging sideways rolls the world through the map and it never ends;
// up and down it moves like paper, stopping at the map's edge. That makes `spinTo` a pan on a flat map,
// with no special case anywhere. Adding a projection is one line in PROJECTIONS (see docs/parts.md).

import { geoOrthographic, geoEqualEarth, geoNaturalEarth1, geoMercator, geoPath, geoDistance, geoInterpolate } from 'd3-geo';

const PI = Math.PI;
export const SPHERE = { type: 'Sphere' };
const wrap = lon => ((((lon + 180) % 360) + 360) % 360) - 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// The size a whole globe has on an iPhone 11: the radius the stage 0 look was drawn at.
const BASE_R = 166;

// The flat projections, by name: any d3-geo projection that is symmetric about the equator fits here. One
// whose poles run off to infinity says which latitudes it shows: Mercator stops short of Antarctica, the
// way world maps drawn on it usually do, or it would fill a third of the map.
export const PROJECTIONS = {
  globe: null,
  'equal-earth': { make: geoEqualEarth },
  'natural-earth': { make: geoNaturalEarth1 },
  mercator: { make: geoMercator, lats: [-60, 84] },
};

export function makeView(kind) {
  return kind === 'globe' ? globeView() : flatView(PROJECTIONS[kind] || PROJECTIONS['equal-earth'], PROJECTIONS[kind] ? kind : 'equal-earth');
}

// ---------------------------------------------------------------- the globe

function globeView() {
  const proj = geoOrthographic().clipAngle(90).precision(0.5);
  const v = {
    kind: 'globe', round: true, proj,
    w: 0, h: 0, cx: 0, cy: 0, r: 0, size: 1, centre: [0, 0],
    set(w, h, centre, zoom) {
      v.w = w; v.h = h; v.cx = w / 2; v.cy = h / 2;
      v.r = (Math.min(w, h) / 2) * 0.84 * zoom;
      v.size = v.r / BASE_R;
      v.scale1 = v.r / zoom;
      v.box = [v.cx - v.r, v.cy - v.r, v.cx + v.r, v.cy + v.r];
      v.centre = centre;
      proj.translate([v.cx, v.cy]).scale(v.r).rotate([-centre[0], -centre[1], 0]);
      return v;
    },
    clamp: c => [wrap(c[0]), clamp(c[1], -75, 75)],
    // a finger's pixels turn the ball by as many degrees as the surface moves at its middle
    pan: (from, dx, dy) => v.clamp([from[0] - (dx * 180) / PI / v.r, from[1] + (dy * 180) / PI / v.r]),
    between: (a, b) => geoInterpolate(a, b),
    visible: p => geoDistance(p, v.centre) < PI / 2 - 0.02,
    onMap(x, y) {
      if (Math.hypot(x - v.cx, y - v.cy) > v.r) return null;
      const at = proj.invert([x, y]);
      return at && Number.isFinite(at[0]) ? at : null;
    },
    rim: (x, y) => v.r - Math.hypot(x - v.cx, y - v.cy),
  };
  return v;
}

// ---------------------------------------------------------------- flat maps

function flatView({ make, lats }, kind) {
  const proj = make().precision(0.5);
  // The map's outline at scale 1, worked out once: how wide and tall the whole world is.
  const unit = make().scale(1).translate([0, 0]).rotate([0, 0]);
  const yAt = lat => unit([0, lat])[1];                 // down from the equator, at scale 1
  if (lats) unit.clipExtent([[-10, yAt(lats[1])], [10, yAt(lats[0])]]);
  const shown = p => !lats || (p[1] >= lats[0] && p[1] <= lats[1]);
  const ub = geoPath(unit).bounds(SPHERE);
  const U = { x0: ub[0][0], x1: ub[1][0], y0: ub[0][1], y1: ub[1][1] };
  const halfWidthAt = lat => unit([179.999, lat])[0];   // the map's half width along a parallel, at scale 1
  const PAD = 10;
  const v = {
    kind, round: false, proj,
    w: 0, h: 0, cx: 0, cy: 0, s: 1, tx: 0, ty: 0, size: 1, centre: [0, 0],
    // the scale at which the whole world fits the box
    fit: (w, h) => Math.max(1e-3, Math.min((w - 2 * PAD) / (U.x1 - U.x0), (h - 2 * PAD) / (U.y1 - U.y0))),
    set(w, h, centre, zoom) {
      v.w = w; v.h = h; v.cx = w / 2; v.cy = h / 2;
      v.scale1 = v.fit(w, h);
      v.s = v.scale1 * zoom;
      v.size = (v.s * 1.6) / BASE_R;  // a whole flat world drawn about as finely as a whole globe
      v.centre = centre;
      v.tx = v.cx; v.ty = v.cy - v.s * yAt(centre[1]);
      v.box = [v.tx + v.s * U.x0, v.ty + v.s * U.y0, v.tx + v.s * U.x1, v.ty + v.s * U.y1];
      proj.rotate([-centre[0], 0, 0]).scale(v.s).translate([v.tx, v.ty]);
      if (lats) proj.clipExtent([[-1e6, v.ty + v.s * yAt(lats[1])], [1e6, v.ty + v.s * yAt(lats[0])]]);
      return v;
    },
    clamp(c, zoom) {
      const s = v.fit(v.w, v.h) * zoom, tall = s * (U.y1 - U.y0);
      let ty;
      if (tall <= v.h) ty = v.h / 2 - (s * (U.y0 + U.y1)) / 2;  // all of it fits: keep it in the middle
      else ty = clamp(v.cy - s * yAt(c[1]), v.h - s * U.y1, -s * U.y0);
      const lat = unit.invert([0, (v.cy - ty) / s])[1];
      return [wrap(c[0]), Number.isFinite(lat) ? lat : 0];
    },
    pan(from, dx, dy) {
      const s = v.s, perDeg = s * Math.max(1e-6, unit([1, from[1]])[0]);
      const y = s * yAt(from[1]) - dy;
      const lat = unit.invert([0, clamp(y / s, U.y0, U.y1)])[1];
      return v.clamp([from[0] - dx / perDeg, Number.isFinite(lat) ? lat : from[1]], s / v.fit(v.w, v.h));
    },
    // straight across, the short way round
    between(a, b) {
      let d = wrap(b[0] - a[0]);
      if (d === -180) d = 180;
      return k => [wrap(a[0] + d * k), a[1] + (b[1] - a[1]) * k];
    },
    visible(p) {
      const q = shown(p) && proj(p);
      return !!q && q[0] > -20 && q[0] < v.w + 20 && q[1] > -20 && q[1] < v.h + 20;
    },
    onMap(x, y) {
      const at = proj.invert([x, y]);
      if (!at || !Number.isFinite(at[0]) || !Number.isFinite(at[1]) || Math.abs(at[1]) > 90 || !shown(at)) return null;
      const back = proj(at);
      return back && Math.hypot(back[0] - x, back[1] - y) < 1 ? [wrap(at[0]), at[1]] : null;
    },
    rim(x, y, lat) {
      const half = v.s * halfWidthAt(lat ?? 0);
      return Math.min(x - (v.tx - half), v.tx + half - x, y - (v.ty + v.s * U.y0), v.ty + v.s * U.y1 - y, x, v.w - x, y, v.h - y);
    },
  };
  return v;
}
