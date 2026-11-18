// The map's look, in one place: the house colours, the four styles, the sea's warmth bands and the ramps
// a table is coloured with. Every projection draws with these, so a globe and a flat map always match.

const lerp = (a, b, k) => a + (b - a) * k;
const parse = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
export const rgba = (hex, a = 1) => { const [r, g, b] = parse(hex); return `rgba(${r},${g},${b},${a})`; };
export const mix = (a, b, k) => { const x = parse(a), y = parse(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], k)).toString(16).padStart(2, '0')).join(''); };

// The approved motion (stage0/scene/looks/mix.json): bounce between gentle and medium.
export const MOTION = { bounce: 0.425, overshoot: 0.675 };

export const COLOURS = { gold: '#ffc83d', pink: '#ee4b7a', cyan: '#49c6ff', teal: '#2bc4a4', purple: '#a67cf5', orange: '#ffa23a', white: '#ffffff' };
export const colourOf = (c, fallback = COLOURS.gold) => COLOURS[c] || (/^#[0-9a-f]{6}$/i.test(c || '') ? c : fallback);

// sea: a gradient's three stops, light to dark (null: the warmth bands are the sea). land, edge, light:
// the land's face, its shaded side and its lit rim. four: the political colours.
export const STYLE = {
  day: { sea: ['#2a3ea6', '#1b2a80', '#141f66'], land: '#2bc4a4', edge: '#127a85', light: '#7df0cf', border: 'rgba(12,30,90,0.5)' },
  warmth: { sea: null, land: '#2bc4a4', edge: '#127a85', light: '#7df0cf', border: 'rgba(12,30,90,0.5)' },
  muted: { sea: ['#424a7c', '#39416f', '#2e355e'], land: '#7d86b3', edge: '#4a5280', light: '#a9b0d6', border: 'rgba(40,46,90,0.6)' },
  // like a political map: every country one of four colours, no two neighbours the same
  political: { sea: ['#2a3ea6', '#1b2a80', '#141f66'], land: null, edge: '#10184a', light: 'rgba(255,255,255,0.55)', border: 'rgba(10,14,46,0.6)',
    four: ['#3fcfae', '#ffd062', '#f27ba3', '#a58cf2'] },
};

// The ramps a table of numbers is coloured with, low to high. heat is the sea warmth's own colours.
export const RAMPS = {
  heat: ['#1b2a80', '#3b3db8', '#8b3fbf', '#ee4b7a', '#ffa23a', '#ffd062'],
  green: ['#3a4170', '#3d6b78', '#2f9a86', '#2bc4a4', '#8de08a'],
  blue: ['#2a2f66', '#2e4a9a', '#3a74d6', '#49c6ff', '#b8ecff'],
};
export function rampAt(name, k) {
  const r = RAMPS[name] || RAMPS.heat;
  k = Math.max(0, Math.min(1, Number.isFinite(k) ? k : 0)) * (r.length - 1);
  const i = Math.min(r.length - 2, Math.floor(k));
  return mix(r[i], r[i + 1], k - i);
}

// ---------------------------------------------------------------- the sea's warmth

// Sea surface warmth, simplified to four nested bands for a northern late summer (stage0/scene/src/script.js).
export const SST = ['#1b2a80', '#3b3db8', '#8b3fbf', '#ee4b7a', '#ffa23a'];
const BANDS = [
  { north: 37, south: -33, pull: 0.6 },
  { north: 29, south: -25, pull: 0.8 },
  { north: 21, south: -17, pull: 1 },
  { north: 13, south: null, pull: 0.5 },
];
const BAND_SHAPE = [
  [-180, 2, 0, -8], [-150, 0, 0, 2], [-120, -2, 8, 4], [-100, 2, 14, 5], [-85, 8, 12, 4],
  [-70, 9, 4, 3], [-55, 7, 0, 3], [-40, 3, -2, 3], [-25, -3, 4, 4], [-15, -5, 9, 5],
  [0, -4, 12, 6], [12, 0, 13, 6], [40, 0, 2, -6], [60, 3, 0, -8], [90, 2, -2, -9],
  [120, 4, -3, -10], [150, 3, -3, -10], [180, 2, 0, -8],
];
function shapeAt(lon, col) {
  lon = (((lon + 180) % 360) + 360) % 360 - 180;
  for (let i = 0; i < BAND_SHAPE.length - 1; i++) {
    const a = BAND_SHAPE[i], b = BAND_SHAPE[i + 1];
    if (lon <= b[0]) return lerp(a[col], b[col], (1 - Math.cos(((lon - a[0]) / (b[0] - a[0])) * Math.PI)) / 2);
  }
  return BAND_SHAPE[0][col];
}
function warmBand(i) {
  const B = BANDS[i], polys = [], DEG = 180 / Math.PI;
  const edge = (lon, side) => {
    const w = Math.sin((lon / DEG) * 7 + i * 1.7) + Math.sin((lon / DEG) * 13 + i) * 0.55;
    return side > 0 ? B.north + shapeAt(lon, 1) * B.pull + w : (B.south === null ? shapeAt(lon, 3) : B.south + shapeAt(lon, 2) * B.pull) - w * 0.8;
  };
  for (let l0 = -180; l0 < 180; l0 += 30) {
    const north = [], south = [];
    for (let l = l0 - 0.6; l <= l0 + 30.61; l += 2.4) { north.push([l, edge(l, 1)]); south.push([l, edge(l, -1)]); }
    const ring = north.concat(south.reverse());
    ring.push(ring[0]);
    polys.push([ring]);
  }
  return { type: 'MultiPolygon', coordinates: polys };
}
// Made once, the first time a warmth map is drawn, and kept: turning never rebuilds them.
let warmBands = null;
export const warmBandsNow = () => warmBands || (warmBands = BANDS.map((_, i) => warmBand(i)));
