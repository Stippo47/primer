// A flat-shaded globe as SVG, from the same country shapes the sample scene uses.

import { geoOrthographic, geoPath, geoGraticule, geoArea } from 'd3-geo';

let world = null;
export async function loadWorld() {
  if (!world) world = await fetch('../scene/vendor/countries-110m.json').then(r => r.json());
  return world;
}

// A band between two latitudes, as a polygon wound the way d3 wants.
function band(lat0, lat1) {
  const ring = [];
  for (let lon = -180; lon <= 180; lon += 6) ring.push([lon, lat0]);
  for (let lon = 180; lon >= -180; lon -= 6) ring.push([lon, lat1]);
  ring.push(ring[0]);
  let poly = { type: 'Polygon', coordinates: [ring] };
  if (geoArea(poly) > 2 * Math.PI) poly = { type: 'Polygon', coordinates: [ring.slice().reverse()] };
  return poly;
}

let uid = 0;

// opts: cx, cy, r, rotate [lon, lat], learned (a Set of country names, or null for all land bright),
//       sst (true to draw the warm-water bands), depth (land edge in px), glow (true/false)
export function globe(opts) {
  const { cx, cy, r, rotate = [40, -20], learned = null, sst = false, depth = 3, glow = true, equator = false, dull = false } = opts;
  const { feature, mesh } = globalThis.topojson;
  const id = `g${uid++}`;
  const proj = geoOrthographic().scale(r).translate([cx, cy]).rotate([rotate[0], rotate[1], 0]).clipAngle(90).precision(0.4);
  const path = geoPath(proj);
  const countries = feature(world, world.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
  const land = { type: 'FeatureCollection', features: countries };
  const borders = mesh(world, world.objects.countries, (a, b) => a !== b);
  const col = dull
    ? { sea: '#39416f', land: '#7d86b3', edge: '#4a5280', dim: '#59618f', border: '#4a5280' }
    : { sea: '#1b2a80', land: '#2bc4a4', edge: '#127a85', dim: '#2f3d8c', border: '#0c5a6b' };

  let s = `<defs><clipPath id="${id}c"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
    <radialGradient id="${id}s" cx="0.36" cy="0.3" r="0.8"><stop offset="0.55" stop-color="#070a2e" stop-opacity="0"/><stop offset="1" stop-color="#070a2e" stop-opacity="0.55"/></radialGradient>
    <radialGradient id="${id}g"><stop offset="0.78" stop-color="#4f7cff" stop-opacity="0.55"/><stop offset="1" stop-color="#4f7cff" stop-opacity="0"/></radialGradient></defs>`;
  if (glow) s += `<circle cx="${cx}" cy="${cy}" r="${r * 1.22}" fill="url(#${id}g)"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col.sea}"/><g clip-path="url(#${id}c)">`;
  if (sst) {
    for (const [a, b, c] of [[-24, 36, '#3b3db8'], [-15, 29, '#8b3fbf'], [-8, 22, '#ee4b7a'], [1, 13, '#ffa23a']]) {
      s += `<path d="${path(band(a, b))}" fill="${c}" opacity="0.92"/>`;
    }
  }
  s += `<path d="${path(geoGraticule().step([30, 30])())}" fill="none" stroke="#fff" stroke-opacity="0.06" stroke-width="1"/>`;
  if (learned) {
    s += `<path d="${path(land)}" fill="#1f2a6b" transform="translate(0 ${depth * 0.6})"/>`;
    s += `<path d="${path(land)}" fill="${col.dim}"/>`;
    const got = { type: 'FeatureCollection', features: countries.filter(f => learned.has(f.properties.name)) };
    s += `<path d="${path(got)}" fill="${col.edge}" transform="translate(0 ${depth})"/>`;
    s += `<path d="${path(got)}" fill="${col.land}" stroke="#7df0cf" stroke-width="1" stroke-linejoin="round"/>`;
    s += `<path d="${path(borders)}" fill="none" stroke="#141a3c" stroke-opacity="0.45" stroke-width="0.7"/>`;
  } else {
    s += `<path d="${path(land)}" fill="${col.edge}" transform="translate(0 ${depth})"/>`;
    s += `<path d="${path(land)}" fill="${col.land}"/>`;
    if (r > 60) s += `<path d="${path(borders)}" fill="none" stroke="${col.border}" stroke-opacity="0.5" stroke-width="0.7"/>`;
  }
  if (equator) {
    const line = { type: 'LineString', coordinates: Array.from({ length: 121 }, (_, i) => [-180 + i * 3, 0]) };
    s += `<path d="${path(line)}" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="2.2" stroke-dasharray="0.1 7" stroke-linecap="round"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}s)"/></g>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="none" stroke="#7fb0ff" stroke-opacity="0.5" stroke-width="${r > 60 ? 3 : 1.5}"/>`;
  return { svg: s, at: lonlat => proj(lonlat) };
}
