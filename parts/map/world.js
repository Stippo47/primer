// The world's shapes, loaded once and shared by every map on the page (and by any later part that needs
// countries). Natural Earth's 110m countries, unpacked from TopoJSON, with what the map works out from
// them once: where each name goes, each country's area and bounds, the four political colours, the land
// as one shape, the borders as one mesh, and the four colours' shapes as one piece each.
//
// loadWorld() -> Promise of { countries, byName, land, borders, grat, byColour, clashes, places }. `places` are
// the oceans, seas and continents of places.json, by name: { kind, at: [[lon, lat], ...] }.

import { geoGraticule, geoCentroid, geoArea, geoBounds, geoContains } from 'd3-geo';

let worldP = null;

export function loadWorld() {
  if (worldP) return worldP;
  const script = globalThis.topojson ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('../../vendor/topojson-client.min.js', import.meta.url).href;
    s.onload = res;
    s.onerror = () => rej(new Error('the map script did not load'));
    document.head.append(s);
  });
  const places = fetch(new URL('./places.json', import.meta.url)).then(r => r.json()).then(j => j.places || {}).catch(() => ({}));
  worldP = Promise.all([script, fetch(new URL('../../vendor/countries-110m.json', import.meta.url)).then(r => r.json()), places]).then(([, world, named]) => {
    const { feature, mesh, neighbors } = globalThis.topojson;
    const countries = feature(world, world.objects.countries).features.map(f => {
      const main = mainPiece(f);
      return { f, name: f.properties.name, bounds: geoBounds(f), centroid: geoCentroid(f), area: geoArea(f), labelAt: geoCentroid(main), mainBounds: geoBounds(main) };
    });
    // Four colours, worked out from the shared borders in the map itself.
    const { colour, clashes } = fourColours(neighbors(world.objects.countries.geometries));
    countries.forEach((c, i) => { c.four = colour[i]; });
    return {
      countries,
      byName: new Map(countries.map(c => [c.name, c])),
      land: feature(world, world.objects.land),
      borders: mesh(world, world.objects.countries, (a, b) => a !== b),
      grat: geoGraticule().step([30, 30])(),
      byColour: [0, 1, 2, 3].map(k => joined(countries.filter(c => c.four === k))),
      clashes,
      places: new Map(Object.entries(named)),
    };
  }).catch(e => { worldP = null; throw e; });
  return worldP;
}

// Several countries as one shape, so a colour shared by many is filled in one go.
export function joined(list) {
  return { type: 'MultiPolygon', coordinates: list.flatMap(c => (c.f.geometry.type === 'Polygon' ? [c.f.geometry.coordinates] : c.f.geometry.coordinates)) };
}

// The country at a [longitude, latitude], or undefined at sea. Bounds first, so most are skipped cheaply.
export function countryAt(W, at) {
  return W.countries.find(c => inBounds(c.bounds, at) && geoContains(c.f, at));
}

const inBounds = (b, [lon, lat]) => {
  if (lat < b[0][1] - 0.5 || lat > b[1][1] + 0.5) return false;
  return b[0][0] <= b[1][0] ? lon >= b[0][0] - 0.5 && lon <= b[1][0] + 0.5 : lon >= b[0][0] - 0.5 || lon <= b[1][0] + 0.5;
};

// A country's biggest piece. Its name goes in the middle of it, so France's name sits in France and not
// out at sea between it and French Guiana, and zooming to a country frames that piece.
function mainPiece(f) {
  const g = f.geometry;
  if (!g || g.type !== 'MultiPolygon') return f;
  let best = null, size = -1;
  for (const coords of g.coordinates) {
    const p = { type: 'Polygon', coordinates: coords };
    const a = geoArea(p);
    if (a > size && a < 2 * Math.PI) { size = a; best = p; }
  }
  return best || f;
}

// Gives each country one of four colours so that no two that share a border match, the way a political
// map is coloured. Greedy, taking the most hemmed-in country first (DSATUR); where a country's neighbours
// already use all four, it swaps two colours along a chain of neighbours (a Kempe chain) to free one. If
// even that fails, it takes the colour fewest neighbours have, and counts the clash.
export function fourColours(nb) {
  const n = nb.length, colour = new Array(n).fill(-1);
  const used = v => new Set(nb[v].map(u => colour[u]).filter(c => c >= 0));
  const chain = (start, a, b) => {
    const seen = new Set([start]), list = [start];
    for (let i = 0; i < list.length; i++) for (const u of nb[list[i]]) if (!seen.has(u) && (colour[u] === a || colour[u] === b)) { seen.add(u); list.push(u); }
    return list;
  };
  for (let step = 0; step < n; step++) {
    let v = -1, sat = -1, deg = -1;
    for (let i = 0; i < n; i++) {
      if (colour[i] >= 0) continue;
      const s = used(i).size;
      if (s > sat || (s === sat && nb[i].length > deg)) { v = i; sat = s; deg = nb[i].length; }
    }
    const taken = used(v);
    const free = [0, 1, 2, 3].find(c => !taken.has(c));
    if (free !== undefined) { colour[v] = free; continue; }
    let done = false;
    for (let a = 0; a < 4 && !done; a++) {
      for (let b = 0; b < 4 && !done; b++) {
        if (a === b) continue;
        for (const u of nb[v].filter(x => colour[x] === a)) {
          const list = chain(u, a, b);
          for (const x of list) colour[x] = colour[x] === a ? b : a;
          if (!used(v).has(a)) { colour[v] = a; done = true; break; }
          for (const x of list) colour[x] = colour[x] === a ? b : a;   // didn't free it: put it back
        }
      }
    }
    if (!done) {
      const count = c => nb[v].filter(u => colour[u] === c).length;
      colour[v] = [0, 1, 2, 3].sort((p, q) => count(p) - count(q))[0];
    }
  }
  let clashes = 0;
  for (let i = 0; i < n; i++) for (const u of nb[i]) if (u > i && colour[u] === colour[i]) clashes++;
  return { colour, clashes };
}
