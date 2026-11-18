// Drawings the forms share: the Disc hurricane (the one picked in stage 0), maps of the world in the
// mix look, and small marks. Flat fills and 3D edges only; no blur, no glow.
import { geoPath } from 'd3-geo';
import { createStorms } from './storms.js';
import { C, TAU, rgba, mix, lerp } from './kit.js';

// The parts of stage0/scene/looks/mix.json the drawings use.
export const LOOK = {
  storm: {
    draw: 'disc', fill: '#ffffff', shade: '#aebfff', tired: '#c3c9ee', depth: 3, swirl: '#8fa4f5', swirlAlpha: 0.9, eye: '#1b2a80',
    glow: '#bfd4ff', glowAlpha: 0.24, shadow: '#060830', shadowAlpha: 0.27, turn: 2.8, stroke: '#000000', strokeWidth: 0,
  },
  land: { fill: '#2bc4a4', edge: '#127a85', depth: 3.2, light: '#7df0cf', border: { color: '#0c5a6b', alpha: 0.5, width: 0.7 } },
};

const stormers = new WeakMap();
// The Disc hurricane at x, y with radius R. angle turns it (counterclockwise as it falls).
export function storm(ctx, x, y, R, { angle = 0, eye = 1, alpha = 1, vigor = 1, time = 0, shadow = true } = {}) {
  if (!stormers.has(ctx)) stormers.set(ctx, createStorms(ctx, { storm: { ...LOOK.storm, shadowAlpha: shadow ? LOOK.storm.shadowAlpha : 0 } }));
  stormers.get(ctx).draw('disc', x, y, { R, angle, sweep: 1, eye, vigor, lift: 0, squash: 0, alpha, time });
}

// ---- maps
let world = null, land = null, borders = null;
export async function loadWorld(detail = '50m') {
  if (world) return;
  world = await fetch(`vendor/countries-${detail}.json`).then(r => r.json());
  const { feature, mesh } = globalThis.topojson;
  land = feature(world, world.objects.land);
  borders = mesh(world, world.objects.countries, (a, b) => a !== b);
}

// Draws the land for a projection, the way the scene does: an edge below, a light rim above, the fill.
export function drawLand(ctx, proj, { scale = 1, borderAlpha = 1 } = {}) {
  const L = LOOK.land;
  const p = new Path2D();
  geoPath(proj, p)(land);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(0, L.depth * scale); ctx.fillStyle = L.edge; ctx.fill(p); ctx.restore();
  ctx.save(); ctx.translate(-0.5 * scale, -1.3 * scale); ctx.fillStyle = L.light; ctx.fill(p); ctx.restore();
  ctx.fillStyle = L.fill; ctx.fill(p);
  if (borderAlpha > 0) {
    const b = new Path2D();
    geoPath(proj, b)(borders);
    ctx.strokeStyle = rgba(L.border.color, L.border.alpha * borderAlpha);
    ctx.lineWidth = L.border.width * scale;
    ctx.stroke(b);
  }
  ctx.restore();
  return p;
}

// The sea, flat, with a faint grid of latitude and longitude (for flat maps, where those are straight lines).
export function drawSea(ctx, proj, w, h, { grid = 10, color = '#16206a' } = {}) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  const mid = proj.invert([w / 2, h / 2]);
  for (let lon = -180; lon < 180; lon += grid) {
    const x = proj([lon, mid[1]])[0];
    if (x < -1 || x > w + 1) continue;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let lat = -80; lat <= 80; lat += grid) {
    const y = proj([mid[0], lat])[1];
    if (y < -1 || y > h + 1) continue;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.restore();
}

// A map pin: a round head on a short stem, tip at x, y. lift raises it off the picture.
export function pin(ctx, x, y, { color = C.cyan, edge = C.cyanEdge, lift = 0, scale = 1, alpha = 1 } = {}) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  // the shadow stays on the picture and spreads as the pin lifts
  ctx.fillStyle = rgba(C.shadow, 0.35 * (1 - lift * 0.4));
  ctx.beginPath(); ctx.ellipse(lift * 8, 2, 6 + lift * 5, 3 + lift * 2, 0, 0, TAU); ctx.fill();
  ctx.translate(0, -lift * 14);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#dde4ff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -22); ctx.stroke();
  ctx.fillStyle = edge;
  ctx.beginPath(); ctx.arc(0, -30, 13, 0, TAU); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, -32, 13, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(-4, -36, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

export { mix, lerp };
