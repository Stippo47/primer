// The Globe: the stage 0 globe as a part. Drawn on one canvas in the approved look (stage0/room/js/globe.js
// and stage0/scene/src/art.js), with the approved hurricane (the Disc, from stage0/scene/src/storms.js).
//
// Smooth on the phone: the ball (sea, land, highlights, shading) is drawn onto a layer kept aside, and
// only redrawn when it turns or its contents change. Each frame copies that layer and draws the small
// things on top. Frames run only while something moves; a still globe costs nothing. No blur: the glow
// behind the ball is a soft gradient.
//
// mount(el, settings, ctx) -> { calls, state, on, remove, where }.

import { geoOrthographic, geoPath, geoGraticule, geoContains, geoCentroid, geoDistance, geoArea, geoInterpolate, geoBounds } from 'd3-geo';

const TAU = Math.PI * 2, PI = Math.PI, DEG = 180 / Math.PI;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, k) => a + (b - a) * k;
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const back = (k, s) => { const c = k - 1; return 1 + c * c * ((s + 1) * c + s); };
const spring = (k, bounce) => {
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  return 1 - Math.exp(-(7 - 3 * bounce) * k) * Math.cos(k * PI * (1 + 3 * bounce)) * (1 - k * k * k);
};
const parse = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (hex, a = 1) => { const [r, g, b] = parse(hex); return `rgba(${r},${g},${b},${a})`; };
const mix = (a, b, k) => { const x = parse(a), y = parse(b); return '#' + x.map((v, i) => Math.round(lerp(v, y[i], k)).toString(16).padStart(2, '0')).join(''); };

// The approved motion (stage0/scene/looks/mix.json): bounce between gentle and medium.
const MOTION = { bounce: 0.425, overshoot: 0.675 };

const COLOURS = { gold: '#ffc83d', pink: '#ee4b7a', cyan: '#49c6ff', teal: '#2bc4a4', purple: '#a67cf5', orange: '#ffa23a', white: '#ffffff' };
const colourOf = c => COLOURS[c] || (/^#[0-9a-f]{6}$/i.test(c || '') ? c : COLOURS.gold);

const STYLE = {
  day: { sea: ['#2a3ea6', '#1b2a80', '#141f66'], land: '#2bc4a4', edge: '#127a85', light: '#7df0cf', border: 'rgba(12,30,90,0.5)' },
  warmth: { sea: null, land: '#2bc4a4', edge: '#127a85', light: '#7df0cf', border: 'rgba(12,30,90,0.5)' },
  muted: { sea: ['#424a7c', '#39416f', '#2e355e'], land: '#7d86b3', edge: '#4a5280', light: '#a9b0d6', border: 'rgba(40,46,90,0.6)' },
};

// Sea surface warmth, simplified to four nested bands for a northern late summer (stage0/scene/src/script.js).
const SST = ['#1b2a80', '#3b3db8', '#8b3fbf', '#ee4b7a', '#ffa23a'];
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
    if (lon <= b[0]) return lerp(a[col], b[col], (1 - Math.cos(((lon - a[0]) / (b[0] - a[0])) * PI)) / 2);
  }
  return BAND_SHAPE[0][col];
}
function warmBand(i) {
  const B = BANDS[i], polys = [];
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
// A band between two latitudes, wound the way d3 wants.
function latBand(lat0, lat1) {
  const ring = [];
  for (let lon = -180; lon <= 180; lon += 4) ring.push([lon, lat0]);
  for (let lon = 180; lon >= -180; lon -= 4) ring.push([lon, lat1]);
  ring.push(ring[0]);
  let poly = { type: 'Polygon', coordinates: [ring] };
  if (geoArea(poly) > 2 * PI) poly = { type: 'Polygon', coordinates: [ring.slice().reverse()] };
  return poly;
}
const parallel = lat => ({ type: 'LineString', coordinates: Array.from({ length: 121 }, (_, i) => [-180 + i * 3, lat]) });

// ---------------------------------------------------------------- the hurricane (the Disc, approved 2026-11-17)

const STORM = { fill: '#ffffff', shade: '#aebfff', tired: '#c3c9ee', depth: 3, swirl: '#8fa4f5', eye: '#1b2a80', shadow: '#060830', shadowAlpha: 0.27 };
function stormDisc(p, x, y, r) { if (r <= 0.01) return; p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); p.closePath(); }
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
  for (let i = 0; i < ring.length; i++) { const q = ring[i], r = ring[(i + 1) % ring.length]; area += q[0] * r[1] - r[0] * q[1]; }
  if (area < 0) ring.reverse();
  p.moveTo(ring[0][0], ring[0][1]);
  for (let i = 1; i < ring.length; i++) p.lineTo(ring[i][0], ring[i][1]);
  p.closePath();
}
const spiral = (a0, turn, r0, r1) => s => { const r = r0 * Math.pow(r1 / r0, s), a = a0 + turn * s; return [r * Math.cos(a), r * Math.sin(a)]; };

// Seen from straight above: a round deck of cloud with grooves wound into it, a thin veil below, a raised
// wall round the eye. `angle` falling turns it anticlockwise on screen.
function drawStorm(ctx, x, y, R, angle) {
  const g = 1, d = STORM.depth * R / 28;
  const T = { white: STORM.fill, shade: STORM.shade, mid: mix(STORM.fill, STORM.shade, 0.5), deep: mix(STORM.tired, STORM.swirl, 0.35 + 0.65) };
  const rd = R * lerp(0.72, 0.96, g);
  const veil = new Path2D(), rv = rd * lerp(1.2, 1.26, g);
  stormDisc(veil, 0, 0, rv);
  for (let j = 0; j < 2; j++) ribbon(veil, spiral(angle * 0.5 + 2.2 + j * PI, lerp(1.3, 1.9, g), rv * 0.74, rv * lerp(1.2, 1.3, g)), s => rv * 0.42 * Math.pow(1 - s, 0.8) + 0.01, 36);
  const top = new Path2D();
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * TAU, rr = rd * (0.975 + 0.04 * Math.abs(Math.sin(a * 5.5)));
    const px = rr * Math.cos(a + angle), py = rr * Math.sin(a + angle);
    if (i === 0) top.moveTo(px, py); else top.lineTo(px, py);
  }
  top.closePath();
  const grooves = new Path2D(), wind = lerp(2.2, 6.4, g);
  for (let j = 0; j < 2; j++) {
    ribbon(grooves, spiral(angle + j * PI + 0.75, -wind, rd * 1.03, R * lerp(0.3, 0.46, g)),
      s => R * lerp(0.085, 0.03, s) * Math.pow(Math.sin(Math.min(1, s * 1.2 + 0.03) * PI), 0.5) + 0.01, 70);
  }
  const wall = new Path2D();
  stormDisc(wall, 0, 0, R * 0.4);
  const slab = (p, fill, under, dd) => {
    if (dd) { ctx.save(); ctx.translate(0, dd); ctx.fillStyle = under; ctx.fill(p); ctx.restore(); }
    ctx.fillStyle = fill; ctx.fill(p);
  };
  ctx.save();
  ctx.translate(x + 2, y + 5);
  ctx.fillStyle = rgba(STORM.shadow, STORM.shadowAlpha);
  ctx.fill(veil);
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  slab(veil, T.mid, T.deep, d * 0.7);
  slab(top, T.white, T.shade, d);
  ctx.save(); ctx.clip(top); ctx.fillStyle = T.shade; ctx.fill(grooves); ctx.restore();
  slab(wall, T.white, T.shade, d * 0.8);
  const er = R * 0.18;
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, er, 0, TAU); ctx.clip();
  ctx.fillStyle = T.shade; ctx.fillRect(-er, -er, er * 2, er * 2);
  ctx.fillStyle = STORM.eye; ctx.beginPath(); ctx.arc(0, Math.min(d * 0.7, er * 0.4), er, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- the world's shapes, loaded once

let worldP = null;
function loadWorld() {
  if (worldP) return worldP;
  const script = globalThis.topojson ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('../../vendor/topojson-client.min.js', import.meta.url).href;
    s.onload = res;
    s.onerror = () => rej(new Error('the map script did not load'));
    document.head.append(s);
  });
  worldP = Promise.all([script, fetch(new URL('../../vendor/countries-110m.json', import.meta.url)).then(r => r.json())]).then(([, world]) => {
    const { feature, mesh } = globalThis.topojson;
    const countries = feature(world, world.objects.countries).features.map(f => ({
      f, name: f.properties.name, bounds: geoBounds(f), centroid: geoCentroid(f), area: geoArea(f),
    }));
    return {
      countries,
      byName: new Map(countries.map(c => [c.name, c])),
      land: feature(world, world.objects.land),
      borders: mesh(world, world.objects.countries, (a, b) => a !== b),
      grat: geoGraticule().step([30, 30])(),
    };
  }).catch(e => { worldP = null; throw e; });
  return worldP;
}

const inBounds = (b, [lon, lat]) => {
  if (lat < b[0][1] - 0.5 || lat > b[1][1] + 0.5) return false;
  return b[0][0] <= b[1][0] ? lon >= b[0][0] - 0.5 && lon <= b[1][0] + 0.5 : lon >= b[0][0] - 0.5 || lon <= b[1][0] + 0.5;
};

// ---------------------------------------------------------------- the part

export async function mount(el, settings, ctx = {}) {
  const W = await loadWorld();
  const S = settings;
  const feel = ctx.feel || { sound() {}, tick() {} };
  const style = STYLE[S.style] || STYLE.day;

  const canvas = document.createElement('canvas');
  canvas.className = 'pg-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Globe');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  el.append(canvas);
  const g = canvas.getContext('2d');
  const layer = document.createElement('canvas');
  const lg = layer.getContext('2d');
  const proj = geoOrthographic().clipAngle(90).precision(0.5);

  let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, r = 0;
  let centre = Array.isArray(S.view) ? [Number(S.view[0]) || 0, Number(S.view[1]) || 0] : [-40, 15];
  let vel = [0, 0], dragging = false, touchedAt = 0, spinAnim = null;
  let selected = null, selectedAt = 0, tapped = null, pin = null;
  const highlights = new Map(), bands = [], points = [], markers = [];
  let baseKey = '', contents = 0, raf = 0, last = 0, gone = false;
  const fns = { tapped: new Set(), turned: new Set() };
  const emit = (name, v) => fns[name].forEach(fn => fn(v));

  const set = () => proj.translate([cx, cy]).scale(r).rotate([-centre[0], -centre[1], 0]);
  const visible = p => geoDistance(p, centre) < PI / 2 - 0.02;

  function size() {
    const box = el.getBoundingClientRect();
    w = Math.max(10, box.width); h = Math.max(10, box.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [canvas, layer]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    cx = w / 2; cy = h / 2;
    r = (Math.min(w, h) / 2) * 0.84 * (Number(S.zoom) || 1);
    baseKey = '';
    wake();
  }

  // ---- the ball, on its own layer
  function drawBall() {
    const key = `${centre[0].toFixed(3)},${centre[1].toFixed(3)},${r},${contents},${selected}`;
    if (key === baseKey) return;
    baseKey = key;
    set();
    const c = lg, k = Math.sqrt(r / 166), depth = 3.2 * k;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const path = geoPath(proj, c);
    const fill = (geo, colour, dy = 0, dx = 0) => { c.save(); c.translate(dx, dy); c.beginPath(); path(geo); c.fillStyle = colour; c.fill(); c.restore(); };
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.clip();
    if (style.sea) {
      const sea = c.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r * 1.05);
      sea.addColorStop(0, style.sea[0]); sea.addColorStop(0.6, style.sea[1]); sea.addColorStop(1, style.sea[2]);
      c.fillStyle = sea; c.fillRect(cx - r, cy - r, r * 2, r * 2);
    } else {
      c.fillStyle = SST[0]; c.fillRect(cx - r, cy - r, r * 2, r * 2);
      BANDS.forEach((_, i) => fill(warmBand(i), SST[i + 1]));
    }
    for (const b of bands) {
      const col = colourOf(b.colour);
      for (const sgn of [1, -1]) fill(latBand(sgn * b.from, sgn * b.to), rgba(col, 0.34));
      c.save();
      c.setLineDash([0.1, 6 * k]); c.lineCap = 'round'; c.lineWidth = 2.2 * k; c.strokeStyle = rgba(col, 0.95);
      for (const lat of [b.from, b.to, -b.from, -b.to]) { c.beginPath(); path(parallel(lat)); c.stroke(); }
      c.restore();
    }
    c.beginPath(); path(W.grat); c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1; c.stroke();
    fill(W.land, style.edge, depth);
    fill(W.land, style.light, -1.2 * k, -0.5 * k);
    fill(W.land, style.land);
    for (const [name, col] of highlights) {
      const f = W.byName.get(name);
      if (!f) continue;
      fill(f.f, mix(col, '#0a0e2e', 0.35), depth * 0.6);
      fill(f.f, col);
    }
    if (selected && W.byName.has(selected)) {
      const f = W.byName.get(selected).f, up = 4 * k * spring(ramp(performance.now(), selectedAt, selectedAt + 450), MOTION.bounce);
      fill(f, style.edge, depth);
      fill(f, '#eafff8', -up - 1.2 * k);
      fill(f, '#5fe6c4', -up);
    }
    c.beginPath(); path(W.borders); c.strokeStyle = style.border; c.lineWidth = 0.7 * k; c.stroke();
    if (S.equator) {
      c.save();
      c.setLineDash([0.1, 7 * k]); c.lineCap = 'round'; c.lineWidth = 2.2 * k; c.strokeStyle = 'rgba(255,255,255,0.9)';
      c.beginPath(); path(parallel(0)); c.stroke();
      c.restore();
    }
    // one light, top left: a flat shadow side and a thin lit edge
    const hole = (ox, oy, rr) => { const p = new Path2D(); p.arc(cx, cy, r * 1.02, 0, TAU); p.closePath(); p.moveTo(cx + ox + rr, cy + oy); p.arc(cx + ox, cy + oy, rr, 0, TAU); p.closePath(); return p; };
    c.fillStyle = 'rgba(7,10,46,0.36)'; c.fill(hole(-r * 0.2, -r * 0.22, r * 1.07), 'evenodd');
    c.fillStyle = 'rgba(168,212,255,0.3)'; c.fill(hole(r * 0.028, r * 0.032, r), 'evenodd');
    const lw = 3 * k;
    c.strokeStyle = 'rgba(127,176,255,0.5)'; c.lineWidth = lw;
    c.beginPath(); c.arc(cx, cy, r - lw / 2 + 0.5, 0, TAU); c.stroke();
    c.restore();
  }

  // ---- small things on top, drawn every frame something moves
  function chip(text, x, y, k = 1, gold = false) {
    g.save();
    g.font = '800 13px "Nunito", system-ui, sans-serif';
    const tw = g.measureText(text).width + 22, th = 26;
    x = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, x));
    g.translate(x, y); g.scale(k, k); g.globalAlpha = clamp01(k * 2.5);
    g.fillStyle = gold ? '#c98a00' : '#b9c2ee'; g.beginPath(); g.roundRect(-tw / 2, -th / 2 + 3, tw, th, 11); g.fill();
    g.fillStyle = gold ? '#ffc83d' : '#ffffff'; g.beginPath(); g.roundRect(-tw / 2, -th / 2, tw, th, 11); g.fill();
    g.fillStyle = gold ? '#2a1650' : '#1b1f5e'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 0, 1);
    g.restore();
  }
  function dot(x, y, rad, ring, fillC) {
    g.fillStyle = 'rgba(6,8,48,0.35)'; g.beginPath(); g.ellipse(x + 1, y + rad * 0.9, rad * 1.1, rad * 0.45, 0, 0, TAU); g.fill();
    g.fillStyle = ring; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    g.fillStyle = fillC; g.beginPath(); g.arc(x, y, rad * 0.55, 0, TAU); g.fill();
  }
  function labels() {
    const placed = [];
    g.save();
    g.font = '800 11px "Nunito", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = 'rgba(12,20,80,0.85)'; g.fillStyle = '#ffffff';
    const minArea = 0.004 / (Number(S.zoom) || 1) ** 2;
    const list = W.countries.filter(c => c.area > minArea && geoDistance(c.centroid, centre) < 1.15).sort((a, b) => b.area - a.area);
    for (const c of list.slice(0, 40)) {
      if (placed.length >= 16 || c.name === selected) continue;
      const [x, y] = proj(c.centroid);
      const tw = g.measureText(c.name).width + 6, box = [x - tw / 2, y - 8, x + tw / 2, y + 8];
      if (placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      if (Math.hypot(x - cx, y - cy) > r - 14) continue;
      placed.push(box);
      g.strokeText(c.name, x, y); g.fillText(c.name, x, y);
    }
    g.restore();
  }

  function frame(now) {
    raf = 0;
    if (gone) return;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    let moving = false;
    // turning: a spinTo, a flick carrying on, or turning by itself
    if (spinAnim) {
      const k = clamp01((now - spinAnim.t0) / spinAnim.ms);
      centre = spinAnim.path(back(k, MOTION.overshoot * 0.4));
      if (k >= 1) { centre = spinAnim.path(1); spinAnim = null; }
      moving = true;
    } else if (!dragging && (Math.abs(vel[0]) > 0.002 || Math.abs(vel[1]) > 0.002)) {
      centre = [centre[0] - vel[0] * dt, Math.max(-75, Math.min(75, centre[1] + vel[1] * dt))];
      const f = Math.exp(-dt / 380);
      vel = [vel[0] * f, vel[1] * f];
      if (Math.abs(vel[0]) <= 0.002 && Math.abs(vel[1]) <= 0.002) { vel = [0, 0]; emit('turned', { centre: roundC() }); }
      moving = true;
    } else if (S.spin === 'auto' && !dragging && now - touchedAt > 2500) {
      centre = [centre[0] + 0.006 * dt, centre[1]];
      moving = true;
    }
    centre[0] = ((centre[0] + 540) % 360) - 180;
    const lifting = selected && now - selectedAt < 500;
    if (lifting) baseKey = '';
    drawBall();
    set();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const glow = g.createRadialGradient(cx, cy, r * 0.86, cx, cy, r * 1.16);
    glow.addColorStop(0, rgba('#4f7cff', 0.6)); glow.addColorStop(0.35, rgba('#4f7cff', 0.25)); glow.addColorStop(1, rgba('#4f7cff', 0));
    g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, r * 1.16, 0, TAU); g.fill();
    g.drawImage(layer, 0, 0, w, h);
    if (S.labels === 'countries') labels();
    if (S.equator && visible([centre[0], 0])) {
      const [x, y] = proj([centre[0], 0]);
      g.save(); g.font = '800 12px "Nunito", system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText('Equator', x, y + 6); g.restore();
    }
    for (const p of points) {
      if (!visible(p.at)) continue;
      const [x, y] = proj(p.at);
      dot(x, y, 6, '#1b1f5e', '#ffffff');
      if (p.label) chip(p.label, x, y - 24);
    }
    let storms = false;
    for (const m of markers) {
      if (!visible(m.at)) continue;
      const [x, y] = proj(m.at);
      const k = spring(ramp(now, m.t0, m.t0 + 520), MOTION.bounce);
      if (m.kind === 'storm') {
        storms = true;
        const R = Math.max(14, r * 0.12) * k, turn = (now - m.t0) / 1000 * 1.6 * (m.at[1] >= 0 ? -1 : 1);
        if (R > 0.5) drawStorm(g, x, y, R, -0.4 + turn);
        if (m.label) chip(m.label, x, y - Math.max(14, r * 0.12) - 22, k);
      } else if (m.kind === 'ring') {
        g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 11 * k, 0, TAU); g.stroke();
        if (m.label) chip(m.label, x, y - 28, k);
      } else {
        g.save(); g.translate(x, y); g.scale(k, k); dot(0, 0, 8, '#c98a00', '#ffc83d'); g.restore();
        if (m.label) chip(m.label, x, y - 26, k);
      }
      if (now - m.t0 < 600) moving = true;
    }
    if (pin && visible(pin.at)) {
      const [x, y] = proj(pin.at);
      const k = spring(ramp(now, pin.t0, pin.t0 + 480), MOTION.bounce);
      g.save(); g.translate(x, y); g.scale(k, k); dot(0, 0, 9, '#ee4b7a', '#ffffff'); g.restore();
      if (now - pin.t0 < 520) moving = true;
    }
    if (selected && S.labels === 'countries' && W.byName.has(selected)) {
      const c = W.byName.get(selected);
      if (visible(c.centroid)) { const [x, y] = proj(c.centroid); chip(selected, x, y - 26, spring(ramp(now, selectedAt, selectedAt + 450), MOTION.bounce)); }
    }
    if (moving || dragging || storms || lifting) wake();
    else last = 0;
  }
  function wake() { if (!raf && !gone) raf = requestAnimationFrame(frame); }
  const roundC = () => [Math.round(centre[0] * 10) / 10, Math.round(centre[1] * 10) / 10];

  // ---- the finger
  const local = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  let grab = null;
  const stop = ctx.track(canvas, {
    start: e => { touchedAt = performance.now(); vel = [0, 0]; spinAnim = null; grab = { c: centre.slice() }; },
    move: ({ dx, dy }) => {
      if (S.spin === 'locked' || !grab) return;
      dragging = true;
      touchedAt = performance.now();
      const k = DEG / r;
      centre = [grab.c[0] - dx * k, Math.max(-75, Math.min(75, grab.c[1] + dy * k))];
      baseKey = '';
      wake();
    },
    release: ({ vx, vy }) => {
      if (!dragging) return;
      dragging = false;
      grab = null;
      touchedAt = performance.now();
      const k = DEG / r;
      if (S.spin !== 'locked') vel = [vx * k, vy * k];
      if (!vel[0] && !vel[1]) emit('turned', { centre: roundC() });
      wake();
    },
    cancel: () => { dragging = false; grab = null; wake(); },
    tap: e => {
      const [x, y] = local(e);
      grab = null;
      if (Math.hypot(x - cx, y - cy) > r) return;
      set();
      const at = proj.invert([x, y]);
      if (!at) return;
      const hit = W.countries.find(c => inBounds(c.bounds, at) && geoContains(c.f, at));
      const country = hit ? hit.name : null;
      tapped = { lon: Math.round(at[0] * 100) / 100, lat: Math.round(at[1] * 100) / 100, land: !!hit, country };
      if (S.tap === 'pin') { pin = { at, t0: performance.now() }; feel.sound('pop'); feel.tick(); }
      if (S.tap === 'country') { selected = country; selectedAt = performance.now(); baseKey = ''; if (country) { feel.sound('select'); feel.tick(); } }
      emit('tapped', { ...tapped });
      wake();
    },
  });

  const placeOf = place => {
    if (Array.isArray(place)) return [Number(place[0]), Number(place[1])];
    const c = W.byName.get(place);
    return c ? c.centroid : null;
  };

  const ro = new ResizeObserver(() => size());
  ro.observe(el);
  size();
  if (document.fonts && document.fonts.load) document.fonts.load('800 13px "Nunito"').then(wake, () => {});

  return {
    calls: {
      spinTo(place, seconds = 1.2) {
        const to = placeOf(place);
        if (!to) return;
        const from = centre.slice();
        spinAnim = { path: geoInterpolate(from, [to[0], Math.max(-75, Math.min(75, to[1]))]), t0: performance.now(), ms: Math.max(1, Number(seconds) * 1000) };
        if (seconds === 0) { centre = spinAnim.path(1); spinAnim = null; }
        vel = [0, 0];
        wake();
      },
      highlight(countries, colour) { for (const n of [].concat(countries || [])) highlights.set(n, colourOf(colour)); contents++; wake(); },
      band(from, to, colour) { bands.push({ from: Math.min(from, to), to: Math.max(from, to), colour }); contents++; wake(); },
      point(place, label) { const at = placeOf(place); if (at) points.push({ at, label }); wake(); },
      marker(place, kind = 'ring', label) { const at = placeOf(place); if (at) markers.push({ at, kind, label, t0: performance.now() }); wake(); },
      clear() { highlights.clear(); bands.length = 0; points.length = 0; markers.length = 0; pin = null; selected = null; contents++; wake(); },
    },
    state: () => ({ selected, tapped: tapped ? { ...tapped } : null, centre: roundC() }),
    on: (name, fn) => { if (!fns[name]) return () => {}; fns[name].add(fn); return () => fns[name].delete(fn); },
    // Where a place is on the screen, for the tests and for anything laid over the globe.
    where(place) {
      const at = placeOf(place);
      if (!at) return null;
      set();
      const b = canvas.getBoundingClientRect(), [x, y] = proj(at);
      return { x: b.left + x, y: b.top + y, visible: visible(at) };
    },
    // How many frames are queued: 0 once it's still. For the tests.
    busy: () => !!raf,
    remove() {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      stop();
      fns.tapped.clear(); fns.turned.clear();
      canvas.remove();
    },
  };
}
