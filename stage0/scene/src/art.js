// The picture: one canvas, drawn fresh for any moment `t`.
// Nothing here knows which look it is drawing. Every colour, weight, radius,
// glow and bounce comes from the look file.

import { geoOrthographic, geoPath, geoGraticule, geoDistance, geoInterpolate } from 'd3-geo';
import * as E from './ease.js';
import { T, VIEW, GUESS, BIRTH, TRACK, UPDRAFTS, BANDS, BAND_SHAPE } from './script.js';

const { TAU, lerp, ramp, clamp01, rgba, mix } = E;
const W = 414, H = 896;
const RAD = Math.PI / 180;
const PI = Math.PI;

// ---- path pieces, all clockwise so they can be merged into one outline ----
function rrect(p, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y); p.arc(x + w - r, y + r, r, -PI / 2, 0);
  p.lineTo(x + w, y + h - r); p.arc(x + w - r, y + h - r, r, 0, PI / 2);
  p.lineTo(x + r, y + h); p.arc(x + r, y + h - r, r, PI / 2, PI);
  p.lineTo(x, y + r); p.arc(x + r, y + r, r, PI, PI * 1.5);
  p.closePath();
}
function disc(p, x, y, r) {
  p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); p.closePath();
}
function capsule(p, x1, y1, x2, y2, r) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.moveTo(x1 + r * Math.cos(a + PI / 2), y1 + r * Math.sin(a + PI / 2));
  p.arc(x1, y1, r, a + PI / 2, a + PI * 1.5);
  p.arc(x2, y2, r, a - PI / 2, a + PI / 2);
  p.closePath();
}

// ---- sea temperature bands ----
function shapeAt(lon, col) {
  lon = (((lon + 180) % 360) + 360) % 360 - 180;
  for (let i = 0; i < BAND_SHAPE.length - 1; i++) {
    const a = BAND_SHAPE[i], b = BAND_SHAPE[i + 1];
    if (lon <= b[0]) {
      const k = (1 - Math.cos(((lon - a[0]) / (b[0] - a[0])) * PI)) / 2;
      return lerp(a[col], b[col], k);
    }
  }
  return BAND_SHAPE[0][col];
}
function bandEdge(i, lon, side, time, wobble) {
  const B = BANDS[i], L = lon * RAD;
  const w = wobble * (Math.sin(L * 7 + i * 1.7 + time * 0.55) + Math.sin(L * 13 - time * 0.4 + i) * 0.55);
  if (side > 0) return B.north + shapeAt(lon, 1) * B.pull + w;
  return (B.south === null ? shapeAt(lon, 3) : B.south + shapeAt(lon, 2) * B.pull) - w * 0.8;
}
const BAND_MID = 7; // bands bloom outward from here, a little north of the equator
function bandGeo(i, k, time, wobble) {
  const polys = [];
  for (let l0 = -180; l0 < 180; l0 += 30) {
    const north = [], south = [];
    for (let l = l0 - 0.6; l <= l0 + 30.61; l += 2.4) {
      north.push([l, BAND_MID + (bandEdge(i, l, 1, time, wobble) - BAND_MID) * k]);
      south.push([l, BAND_MID + (bandEdge(i, l, -1, time, wobble) - BAND_MID) * k]);
    }
    const ring = north.concat(south.reverse());
    ring.push(ring[0]);
    polys.push([ring]);
  }
  return { type: 'MultiPolygon', coordinates: polys };
}
function bandLine(i, side, from, to, time, wobble) {
  const pts = [];
  for (let l = from; l <= to; l += 2) pts.push([l, bandEdge(i, l, side, time, wobble)]);
  return { type: 'LineString', coordinates: pts };
}

// ---- the storm's path ----
function trackAt(u) {
  const n = TRACK.length - 1;
  const f = clamp01(u) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const k = f - i;
  const p0 = TRACK[Math.max(0, i - 1)], p1 = TRACK[i], p2 = TRACK[i + 1], p3 = TRACK[Math.min(n, i + 2)];
  const cr = d => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * k + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * k * k
    + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * k * k * k);
  return [cr(0), cr(1)];
}

export function createArt(canvas, look, world, { dpr = 2 } = {}) {
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  const { feature, mesh } = globalThis.topojson;
  const land = feature(world, world.objects.land);
  const borders = mesh(world, world.objects.countries, (a, b) => a !== b);
  const graticule = geoGraticule().step([20, 20])();

  const M = look.motion, S = look.stage, INK = look.ink;
  const pop = (t, at, dur = 0.5) => E.spring(ramp(t, at, at + dur * M.pop), M.bounce);
  const glide = k => E.inOutBack(k, M.overshoot);
  const font = (size, weight) => `${weight} ${size}px "${look.fonts.art}", system-ui, sans-serif`;

  // The stage is the picture's frame. `content` is where things are laid out;
  // `clip` may bleed past it (a full-bleed look runs under the top bar).
  const content = { x: S.inset, y: 100, w: W - 2 * S.inset, h: 532 };
  const clip = { x: content.x, y: content.y - S.bleedTop, w: content.w, h: content.h + S.bleedTop + S.bleedBottom };
  const legendBox = { w: 300, h: 52 };
  legendBox.x = W / 2 - legendBox.w / 2;
  legendBox.y = content.y + content.h - 16 - legendBox.h;
  const dock = { x: content.x + 60, y: legendBox.y - 50, r: 31 };

  const proj = geoOrthographic().clipAngle(90).precision(0.3);
  const landLayer = document.createElement('canvas');
  landLayer.width = canvas.width;
  landLayer.height = canvas.height;
  const lctx = landLayer.getContext('2d');
  let landKey = '';

  // ---- camera ----
  function cam(t) {
    const spin = E.back(ramp(t, 0, T.spinEnd), M.overshoot * 0.4);
    const zoom = E.inOut(ramp(t, T.zoom[0], T.zoom[1]));
    const follow = E.inOut(ramp(t, T.travel[0], T.travel[1] + 0.4));   // drift after the storm as it goes
    const lon = lerp(lerp(lerp(VIEW.start[0], VIEW.globe[0], spin), VIEW.close[0], zoom), VIEW.end[0], follow);
    const lat = lerp(lerp(lerp(VIEW.start[1], VIEW.globe[1], spin), VIEW.close[1], zoom), VIEW.end[1], follow);
    return {
      lon, lat, zoom, spin,
      r: lerp(166, 272, zoom),
      cx: W / 2,
      cy: lerp(content.y + 234, content.y + 250, zoom),
    };
  }
  const visible = (g, c) => geoDistance(g, [c.lon, c.lat]) < 1.48;

  // ---- stage ----
  function stagePath() {
    const p = new Path2D();
    rrect(p, clip.x, clip.y, clip.w, clip.h, S.radius);
    return p;
  }
  function drawStageBack() {
    if (S.depth) {
      const e = new Path2D();
      rrect(e, clip.x, clip.y + S.depth, clip.w, clip.h, S.radius);
      ctx.fillStyle = S.edge;
      ctx.fill(e);
    }
    const g = ctx.createLinearGradient(0, clip.y, 0, clip.y + clip.h);
    g.addColorStop(0, S.fill[0]);
    g.addColorStop(1, S.fill[1]);
    ctx.fillStyle = g;
    ctx.fill(stagePath());
  }
  function drawStageFront() {
    if (S.fade) {
      const y1 = clip.y + clip.h, g = ctx.createLinearGradient(0, y1 - S.fade, 0, y1);
      g.addColorStop(0, rgba(look.chrome.ground, 0));
      g.addColorStop(1, rgba(look.chrome.ground, 1));
      ctx.fillStyle = g;
      ctx.fillRect(clip.x, y1 - S.fade, clip.w, S.fade + 1);
    }
    if (S.borderWidth) {
      const p = new Path2D(), b = S.borderWidth / 2;
      rrect(p, clip.x + b, clip.y + b, clip.w - 2 * b, clip.h - 2 * b, S.radius - b);
      ctx.strokeStyle = S.border;
      ctx.lineWidth = S.borderWidth;
      ctx.stroke(p);
    }
  }

  // ---- the ground behind the globe ----
  const rand = E.rng(11);
  const stars = Array.from({ length: look.space.stars.count }, () => ({
    x: rand() * W, y: clip.y + rand() * clip.h, size: rand(), depth: 0.3 + rand() * 0.7,
    phase: rand() * TAU, rate: 0.6 + rand() * 1.6, glint: rand() < look.space.stars.glints,
  }));
  function drawSpace(t, c) {
    const Sp = look.space;
    Sp.blobs.forEach((b, i) => {
      const x = b.x + Math.sin(t * 0.13 + i * 2) * 8 * M.idle, y = b.y + Math.cos(t * 0.11 + i) * 6 * M.idle;
      const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
      g.addColorStop(0, rgba(b.color, b.alpha));
      g.addColorStop(1, rgba(b.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
    });
    const St = Sp.stars;
    for (const s of stars) {
      const push = 1 + c.zoom * 0.1 * s.depth;
      const x = c.cx + (s.x - c.cx) * push - (1 - c.spin) * 14 * s.depth;
      const y = c.cy + (s.y - c.cy) * push;
      const tw = 1 - St.twinkle * (0.5 + 0.5 * Math.sin(t * s.rate * M.idle + s.phase));
      const r = lerp(St.size[0], St.size[1], s.size * s.size);
      ctx.fillStyle = rgba(St.color, St.alpha * tw);
      if (s.glint) {
        const q = r * 2.6, n = r * 0.55;
        ctx.beginPath();
        ctx.moveTo(x, y - q); ctx.quadraticCurveTo(x + n * 0.4, y - n * 0.4, x + q, y);
        ctx.quadraticCurveTo(x + n * 0.4, y + n * 0.4, x, y + q);
        ctx.quadraticCurveTo(x - n * 0.4, y + n * 0.4, x - q, y);
        ctx.quadraticCurveTo(x - n * 0.4, y - n * 0.4, x, y - q);
        ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
  }

  // ---- land, kept on its own layer and only redrawn when the camera moves ----
  function renderLand(c) {
    const key = [c.lon, c.lat, c.r, c.cy].map(v => v.toFixed(3)).join();
    if (key === landKey) return;
    landKey = key;
    const L = look.land, scale = Math.sqrt(c.r / 166);
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.clearRect(0, 0, W, H);
    lctx.save();
    lctx.beginPath(); lctx.arc(c.cx, c.cy, c.r, 0, TAU); lctx.clip();
    const p = new Path2D();
    geoPath(proj, p)(land);
    lctx.lineJoin = 'round';
    if (L.depth) {
      lctx.save();
      lctx.translate(0, L.depth * scale);
      lctx.fillStyle = L.edge;
      lctx.fill(p);
      lctx.restore();
    }
    if (L.light) {
      lctx.save();
      lctx.translate(-0.5 * scale, -1.3 * scale);
      lctx.fillStyle = L.light;
      lctx.fill(p);
      lctx.restore();
    }
    if (L.coast.width) {
      lctx.strokeStyle = L.coast.color;
      lctx.lineWidth = L.coast.width * 2 * scale;
      lctx.stroke(p);
    }
    lctx.fillStyle = L.fill;
    lctx.fill(p);
    if (L.border.width) {
      const b = new Path2D();
      geoPath(proj, b)(borders);
      lctx.strokeStyle = rgba(L.border.color, L.border.alpha);
      lctx.lineWidth = L.border.width * scale;
      lctx.stroke(b);
    }
    lctx.restore();
  }

  // ---- globe ----
  function drawGlobe(t, c) {
    const G = look.globe, Sst = look.sst;
    const iso = E.inOut(ramp(t, T.markIn, T.markIn + 0.8));
    if (G.glow.alpha > 0) {
      const breathe = 1 + 0.06 * Math.sin(t * 1.3) * M.idle;
      const R = c.r * (1 + G.glow.spread * breathe);
      const g = ctx.createRadialGradient(c.cx, c.cy, c.r * 0.86, c.cx, c.cy, R);
      g.addColorStop(0, rgba(G.glow.color, G.glow.alpha));
      g.addColorStop(0.35, rgba(G.glow.color, G.glow.alpha * 0.42));
      g.addColorStop(1, rgba(G.glow.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(c.cx, c.cy, R, 0, TAU); ctx.fill();
    }
    if (G.base.depth) {
      ctx.fillStyle = G.base.color;
      ctx.beginPath(); ctx.arc(c.cx, c.cy + G.base.depth * Math.sqrt(c.r / 166), c.r, 0, TAU); ctx.fill();
    }
    ctx.save();
    ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, TAU); ctx.clip();
    ctx.fillStyle = Sst.steps[0];
    ctx.fillRect(c.cx - c.r, c.cy - c.r, c.r * 2, c.r * 2);

    // warm bands, blooming outward from the tropics, coolest first
    for (let i = 0; i < BANDS.length; i++) {
      const k = pop(t, T.sstIn + i * 0.24, 1.3);
      if (k < 0.02) continue;
      const base = Sst.steps[i + 1];
      ctx.fillStyle = i < 2 ? mix(base, Sst.steps[0], iso * Sst.dim) : base;
      const p = new Path2D();
      geoPath(proj, p)(bandGeo(i, k, t, M.idle * Sst.wobble));
      ctx.fill(p);
    }

    if (G.graticule.alpha > 0) {
      const p = new Path2D();
      geoPath(proj, p)(graticule);
      ctx.strokeStyle = rgba(G.graticule.color, G.graticule.alpha);
      ctx.lineWidth = G.graticule.width;
      ctx.stroke(p);
    }

    // the 26 degree line, drawn outward from the middle of the Atlantic
    const draw = E.out(ramp(t, T.markIn - 0.1, T.markIn + 1.0));
    if (draw > 0) {
      const I = Sst.isotherm, mid = VIEW.globe[0], reach = 110 * draw;
      const p = new Path2D(), gp = geoPath(proj, p);
      gp(bandLine(2, 1, mid - reach, mid + reach, t, M.idle * Sst.wobble));
      gp(bandLine(2, -1, mid - reach, mid + reach, t, M.idle * Sst.wobble));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (I.glow > 0) {
        ctx.strokeStyle = rgba(I.color, I.glow * 0.5);
        ctx.lineWidth = I.width * 4.5;
        ctx.stroke(p);
      }
      ctx.setLineDash(I.dash.map(d => d * Math.sqrt(c.r / 166)));
      ctx.lineDashOffset = -t * 6 * M.idle;
      ctx.strokeStyle = rgba(I.color, I.alpha);
      ctx.lineWidth = I.width * Math.sqrt(c.r / 166);
      ctx.stroke(p);
      ctx.setLineDash([]);
    }

    drawEquator(t, c);

    renderLand(c);
    ctx.drawImage(landLayer, 0, 0, W, H);

    // one light, top left: a flat shadow side and a thin lit edge
    if (G.shade.alpha > 0) {
      const p = new Path2D();
      disc(p, c.cx, c.cy, c.r * 1.01);
      disc(p, c.cx - c.r * G.shade.shift, c.cy - c.r * G.shade.shift * 1.1, c.r * G.shade.size);
      ctx.fillStyle = rgba(G.shade.color, G.shade.alpha);
      ctx.fill(p, 'evenodd');
    }
    if (G.rim.alpha > 0) {
      const p = new Path2D();
      disc(p, c.cx, c.cy, c.r * 1.01);
      disc(p, c.cx + c.r * G.rim.width, c.cy + c.r * G.rim.width * 1.15, c.r);
      ctx.fillStyle = rgba(G.rim.color, G.rim.alpha);
      ctx.fill(p, 'evenodd');
    }
    if (G.limb.alpha > 0) {
      const w = G.limb.width * Math.sqrt(c.r / 166);
      ctx.strokeStyle = rgba(G.limb.color, G.limb.alpha);
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r - w / 2 + 0.5, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    if (G.outline.width) {
      ctx.strokeStyle = G.outline.color;
      ctx.lineWidth = G.outline.width;
      ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, 0, TAU); ctx.stroke();
    }
  }

  function drawEquator(t, c) {
    const k = E.out(ramp(t, T.release + 0.45, T.release + 1.3));
    if (k <= 0) return;
    const p = new Path2D(), reach = 75 * k, mid = GUESS[0];
    geoPath(proj, p)({ type: 'LineString', coordinates: [[mid - reach, 0], [mid - reach / 2, 0], [mid, 0], [mid + reach / 2, 0], [mid + reach, 0]] });
    ctx.lineCap = 'round';
    ctx.setLineDash(INK.equator.dash);
    ctx.strokeStyle = rgba(INK.equator.color, INK.equator.alpha);
    ctx.lineWidth = INK.equator.width;
    ctx.stroke(p);
    ctx.setLineDash([]);
  }

  // ---- clouds and rising air ----
  function cloudPath(s) {
    const p = new Path2D();
    rrect(p, -1.35 * s, 0.08 * s, 2.7 * s, 0.6 * s, 0.3 * s);
    disc(p, -0.62 * s, 0.02 * s, 0.46 * s);
    disc(p, 0.02 * s, -0.3 * s, 0.64 * s);
    disc(p, 0.72 * s, 0.06 * s, 0.42 * s);
    return p;
  }
  function drawCloud(x, y, s, k, alpha = 1) {
    if (k <= 0.01) return;
    const C = look.cloud, p = cloudPath(s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.globalAlpha = alpha * C.alpha;
    if (C.strokeWidth) {
      ctx.strokeStyle = C.stroke; ctx.lineWidth = C.strokeWidth * 2; ctx.lineJoin = 'round';
      ctx.stroke(p);
    }
    if (C.depth) {
      ctx.save(); ctx.translate(0, C.depth * s / 10); ctx.fillStyle = C.shade; ctx.fill(p); ctx.restore();
    }
    ctx.fillStyle = C.fill;
    ctx.fill(p);
    ctx.restore();
  }
  function groundShadow(x, y, rx, ry, alpha) {
    if (alpha <= 0) return;
    ctx.fillStyle = rgba(look.storm.shadow, alpha);
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  }

  // a few drifting clouds, well away from the action, to give the globe a second layer
  const DRIFTERS = [[-38, 51, 13], [-15, -31, 12], [-101, 49, 11], [9, 50, 10], [62, 18, 12], [84, -22, 11], [-150, 8, 12]];
  function drawDrifters(t, c) {
    if (look.cloud.drift <= 0) return;
    for (const [lon0, lat, size] of DRIFTERS) {
      const g = [lon0 + t * 0.15 * M.idle, lat];
      const d = geoDistance(g, [c.lon, c.lat]);
      if (d > 1.3) continue;
      const [x, y] = proj(g), sc = c.r / 166, edge = clamp01((1.3 - d) / 0.25);
      groundShadow(x + 3 * sc, y + 7 * sc, size * 1.2 * sc, size * 0.45 * sc, look.storm.shadowAlpha * 0.7 * edge * look.cloud.drift);
      drawCloud(x, y - 5 * sc + Math.sin(t * 0.9 + lon0) * 1.2 * M.idle, size * sc * (0.75 + 0.25 * Math.cos(d)), 1, edge * look.cloud.drift);
    }
  }

  function drawUpdrafts(t, c) {
    const [a, b] = T.updraft;
    const k = E.window_(t, a, b, 0.45);
    if (k <= 0) return;
    const sc = c.r / 166, U = INK.updraft;
    UPDRAFTS.forEach((g, i) => {
      const start = a + i * 0.07;
      if (t < start || !visible(g, c)) return;
      const [x, y] = proj(g);
      const phase = (((t - start) / 1.3) + i * 0.37) % 1;
      const head = y - 6 * sc - E.out(phase) * 30 * sc, len = 21 * sc * Math.min(1, phase * 3.5);
      const alpha = Math.sin(Math.min(1, phase * 1.15) * PI) * k * U.alpha;
      if (alpha <= 0.01) return;
      const tail = ctx.createLinearGradient(0, head, 0, head + len);
      tail.addColorStop(0, rgba(U.color, alpha));
      tail.addColorStop(1, rgba(U.color, alpha * U.tail));
      ctx.beginPath();
      for (let u = 0; u <= 1.001; u += 0.08) {
        const px = x + Math.sin(u * 6.5 - phase * 5 + i) * U.wave * sc * Math.min(1, u * 2.2);
        const py = head + u * len;
        if (u === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = tail;
      ctx.lineWidth = U.width * sc;
      ctx.stroke();
      // a small head, so it reads as "up"
      const hs = U.width * 1.45 * sc;
      ctx.strokeStyle = rgba(U.color, alpha);
      ctx.beginPath();
      ctx.moveTo(x - hs, head + hs); ctx.lineTo(x, head); ctx.lineTo(x + hs, head + hs);
      ctx.stroke();
    });
    // the rising air ends up as cloud
    [0, 1, 3, 4, 6].forEach((idx, j) => {
      const g = UPDRAFTS[idx];
      if (!visible(g, c)) return;
      const [x, y] = proj(g);
      const k1 = pop(t, a + 1.25 + j * 0.3, 0.55) * (1 - E.inn(ramp(t, b - 0.35, b + 0.1)));
      const bob = Math.sin(t * 1.6 + j * 2) * 1.5 * M.idle;
      groundShadow(x + 1, y + 1, 7 * sc * k1, 2.6 * sc * k1, look.storm.shadowAlpha * 0.45);
      drawCloud(x, y - 37 * sc + bob, (7.2 + (j % 3) * 0.9) * sc, k1);
    });
  }

  // ---- the storm ----
  function stormShape(R, angle, sweep) {
    const p = new Path2D();
    for (let a = 0; a < 4; a++) {
      const big = a % 2 === 0;
      const turn = lerp(0.6, 3.25, sweep) * (big ? 1 : 0.62);
      const reach = R * lerp(0.72, 1.5, sweep) * (big ? 1 : 0.8);
      const base = angle + a * PI / 2;
      const outer = [], inner = [];
      for (let i = 0; i <= 20; i++) {
        const s = i / 20;
        const th = base + s * turn;
        const r = lerp(R * 0.3, reach, Math.pow(s, 0.85));
        const w = R * (big ? 0.46 : 0.34) * Math.pow(1 - s, 0.75) + 0.2;
        outer.push([Math.cos(th) * (r + w / 2), Math.sin(th) * (r + w / 2)]);
        inner.push([Math.cos(th) * (r - w / 2), Math.sin(th) * (r - w / 2)]);
      }
      p.moveTo(outer[0][0], outer[0][1]);
      for (let i = 1; i < outer.length; i++) p.lineTo(outer[i][0], outer[i][1]);
      for (let i = inner.length - 1; i >= 0; i--) p.lineTo(inner[i][0], inner[i][1]);
      p.closePath();
    }
    disc(p, 0, 0, R * 0.56);
    return p;
  }
  function drawStorm(x, y, o) {
    const St = look.storm, R = o.R;
    const p = stormShape(R, o.angle, o.sweep);
    if (St.shadowAlpha > 0) {
      ctx.save();
      ctx.translate(x + 2 + o.lift * 4, y + 5 + o.lift * 11);
      ctx.fillStyle = rgba(St.shadow, St.shadowAlpha * o.alpha);
      ctx.fill(p);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(x, y - o.lift * 9);
    ctx.globalAlpha = o.alpha;
    if (St.glowAlpha > 0) {
      const gr = R * 2.5, g = ctx.createRadialGradient(0, 0, R * 0.4, 0, 0, gr);
      g.addColorStop(0, rgba(St.glow, St.glowAlpha * o.vigor));
      g.addColorStop(1, rgba(St.glow, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.fill();
    }
    ctx.scale(1 + o.squash, 1 - o.squash);
    const fill = mix(St.tired, St.fill, o.vigor);
    ctx.lineJoin = 'round';
    if (St.strokeWidth) {
      ctx.strokeStyle = St.stroke; ctx.lineWidth = St.strokeWidth * 2;
      ctx.stroke(p);
    }
    if (St.depth) {
      ctx.save(); ctx.translate(0, St.depth); ctx.fillStyle = mix(St.tired, St.shade, o.vigor); ctx.fill(p); ctx.restore();
    }
    ctx.fillStyle = fill;
    ctx.fill(p);
    // two strokes inside the disc, so the turning shows in the middle too
    ctx.strokeStyle = rgba(St.swirl, St.swirlAlpha);
    ctx.lineWidth = Math.max(1.2, R * 0.085);
    ctx.lineCap = 'round';
    for (let a = 0; a < 2; a++) {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const s = i / 12, th = o.angle + a * PI + 0.9 + s * 2.3, r = R * lerp(0.16, 0.44, s);
        const px = Math.cos(th) * r, py = Math.sin(th) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    if (o.eye > 0.02) {
      ctx.fillStyle = St.eye;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.15 * o.eye, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // air flowing in. curl = 0 runs straight in; curl = 1 is bent into a turn.
  function drawInflow(x, y, R, t, curl, alpha) {
    if (alpha <= 0.01) return;
    const A = INK.arrow, n = 5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = A.width;
    for (let i = 0; i < n; i++) {
      const phase = ((t * 0.95 + i * 0.21) % 1) * 1.35;
      const s1 = Math.min(1, phase), s0 = Math.max(0, phase - 0.5);
      if (s1 - s0 < 0.04) continue;
      const th0 = i * TAU / n + 0.5;
      const at = s => {
        const r = lerp(R * 2.7, R * 1.3, s), th = th0 - curl * 1.25 * Math.pow(s, 1.15);
        return [x + Math.cos(th) * r, y + Math.sin(th) * r];
      };
      const fade = Math.sin(clamp01(phase / 1.35) * PI);
      ctx.strokeStyle = rgba(A.color, alpha * fade * A.alpha);
      ctx.beginPath();
      for (let j = 0; j <= 10; j++) {
        const q = at(lerp(s0, s1, j / 10));
        if (j === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
      const tip = at(s1), prev = at(s1 - 0.04);
      const dir = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), h = A.width * 2.3;
      ctx.beginPath();
      ctx.moveTo(tip[0] - Math.cos(dir - 0.6) * h, tip[1] - Math.sin(dir - 0.6) * h);
      ctx.lineTo(tip[0], tip[1]);
      ctx.lineTo(tip[0] - Math.cos(dir + 0.6) * h, tip[1] - Math.sin(dir + 0.6) * h);
      ctx.stroke();
    }
  }

  // ---- labels ----
  function chip(text, x, y, k, o = {}) {
    if (k <= 0.01) return;
    const C = look.chip;
    ctx.font = font(C.size, C.weight);
    const label = C.upper ? text.toUpperCase() : text;
    const w = ctx.measureText(label).width + C.padX * 2, h = C.size + C.padY * 2;
    const cx = o.align === 'left' ? x + w / 2 : o.align === 'right' ? x - w / 2 : x;
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(k, k);
    ctx.globalAlpha = clamp01(k * 2.5) * (o.alpha ?? 1);
    if (C.depth) {
      const e = new Path2D();
      rrect(e, -w / 2, -h / 2 + C.depth, w, h, C.radius);
      ctx.fillStyle = o.accent ? C.accentEdge : C.edge;
      ctx.fill(e);
    }
    const p = new Path2D();
    rrect(p, -w / 2, -h / 2, w, h, C.radius);
    ctx.fillStyle = o.accent ? C.accentFill : C.fill;
    ctx.fill(p);
    if (C.borderWidth) {
      ctx.strokeStyle = o.accent ? C.accentBorder : C.border;
      ctx.lineWidth = C.borderWidth;
      ctx.stroke(p);
    }
    ctx.fillStyle = o.accent ? C.accentText : C.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, C.size * 0.06);
    ctx.restore();
  }

  function drawLegend(t) {
    const k = pop(t, T.legendIn, 0.6);
    if (k <= 0.01) return;
    const P = look.plate, Sst = look.sst, { w, h, x } = legendBox;
    const y = legendBox.y + (1 - k) * 26;
    const iso = E.inOut(ramp(t, T.markIn, T.markIn + 0.8));
    ctx.save();
    ctx.globalAlpha = clamp01(k * 1.6);
    if (P.depth) {
      const e = new Path2D();
      rrect(e, x, y + P.depth, w, h, P.radius);
      ctx.fillStyle = P.edge;
      ctx.fill(e);
    }
    const p = new Path2D();
    rrect(p, x, y, w, h, P.radius);
    ctx.fillStyle = rgba(P.fill, P.alpha);
    ctx.fill(p);
    if (P.borderWidth) { ctx.strokeStyle = P.border; ctx.lineWidth = P.borderWidth; ctx.stroke(p); }
    const bx = x + 18, bw = w - 36, by = y + 11, bh = P.barHeight, seg = bw / 5;
    for (let i = 0; i < 5; i++) {
      const s = new Path2D();
      rrect(s, bx + seg * i + 1.5, by, seg - 3, bh, P.barRadius);
      ctx.fillStyle = i < 3 ? mix(Sst.steps[i], P.fill, iso * 0.45) : Sst.steps[i];
      ctx.fill(s);
      if (P.barStroke) { ctx.strokeStyle = P.barStroke; ctx.lineWidth = 1; ctx.stroke(s); }
    }
    ctx.font = font(P.size, P.weight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ['20°', '23°', '26°', '28°'].forEach((label, i) => {
      ctx.fillStyle = i === 2 ? mix(P.text, P.accent, iso) : P.text;
      ctx.fillText(label, bx + seg * (i + 1), y + h - 9);
    });
    ctx.fillStyle = P.muted;
    ctx.textAlign = 'left';
    ctx.fillText('cool', bx + 2, y + h - 9);
    ctx.textAlign = 'right';
    ctx.fillText('warm', bx + bw - 2, y + h - 9);
    ctx.restore();

    // the 26 degree marker
    const mk = pop(t, T.markIn, 0.55);
    if (mk > 0.01) {
      const mx = bx + seg * 3, top = y - 15;
      ctx.strokeStyle = P.accent;
      ctx.lineWidth = P.stem;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(mx, lerp(by, top + 6, clamp01(mk)));
      ctx.lineTo(mx, by + bh + 2);
      ctx.stroke();
      chip('26 °C', mx, top - (1 - clamp01(mk)) * 10, mk, { accent: true });
    }
  }

  // ---- the hand ----
  const handPath = (() => {
    const p = new Path2D();
    rrect(p, -8.5, -2, 17, 58, 8.5);          // pointing finger
    rrect(p, -11, 38, 50, 46, 15);            // palm
    rrect(p, 8, 28, 12.5, 26, 6.2);           // curled fingers
    rrect(p, 19.5, 31, 12, 24, 6);
    rrect(p, 30, 35.5, 10.5, 22, 5.2);
    capsule(p, -7, 64, -19, 47, 7.5);         // thumb
    return p;
  })();
  const sleevePath = (() => {
    const p = new Path2D();
    rrect(p, -6, 79, 40, 24, 7);
    return p;
  })();
  function drawHand(x, y, press, alpha) {
    if (alpha <= 0.01) return;
    const F = look.finger;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.42);
    ctx.scale(1.02 - press * 0.07, 1.02 - press * 0.07);
    ctx.globalAlpha = alpha * F.alpha;
    ctx.lineJoin = 'round';
    ctx.fillStyle = rgba(look.storm.shadow, look.storm.shadowAlpha * 0.9);
    ctx.save(); ctx.translate(5 + (1 - press) * 5, 7 + (1 - press) * 7); ctx.fill(handPath); ctx.fill(sleevePath); ctx.restore();
    if (F.strokeWidth) {
      ctx.strokeStyle = F.stroke; ctx.lineWidth = F.strokeWidth * 2;
      ctx.stroke(sleevePath); ctx.stroke(handPath);
    }
    ctx.fillStyle = F.sleeve;
    ctx.fill(sleevePath);
    if (F.depth) {
      ctx.save(); ctx.translate(F.depth, F.depth); ctx.fillStyle = F.shade; ctx.fill(handPath); ctx.restore();
    }
    ctx.fillStyle = F.fill;
    ctx.fill(handPath);
    ctx.restore();
  }

  // where the fingertip is, in screen space
  function fingerAt(t, guess) {
    const start = [dock.x + 60, content.y + content.h + 150];
    const onDock = [dock.x + 2, dock.y + 8];
    const end = [guess[0] + 3, guess[1] + 37];
    const away = [guess[0] + 110, guess[1] + 300];
    if (t < T.press) {
      const k = E.out(ramp(t, T.fingerIn, T.press));
      return { x: lerp(start[0], onDock[0], k), y: lerp(start[1], onDock[1], k), press: ramp(t, T.press - 0.12, T.press), alpha: ramp(t, T.fingerIn, T.fingerIn + 0.2) };
    }
    if (t < T.release) {
      const k = glide(ramp(t, T.press + 0.25, T.dragEnd));
      const arc = Math.sin(clamp01(k) * PI) * -26;
      return { x: lerp(onDock[0], end[0], k), y: lerp(onDock[1], end[1], k) + arc, press: 1, alpha: 1 };
    }
    const k = E.inn(ramp(t, T.release + 0.12, T.release + 0.95));
    return { x: lerp(end[0], away[0], k), y: lerp(end[1], away[1], k), press: 1 - ramp(t, T.release, T.release + 0.12), alpha: 1 - ramp(t, T.release + 0.5, T.release + 0.95) };
  }

  function ring(x, y, r, alpha, width, color) {
    if (alpha <= 0.01 || r <= 0) return;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }

  // ---- everything about the storm, the drag and the answer ----
  function drawAction(t, c) {
    if (t < T.dockIn) return;
    const guess = proj(GUESS), birth = proj(BIRTH);
    const D = look.dock;

    // the place the storm waits to be picked up
    const dk = pop(t, T.dockIn, 0.5) * (1 - E.inn(ramp(t, T.release + 0.2, T.release + 0.7)));
    if (dk > 0.01) {
      ctx.save();
      ctx.translate(dock.x, dock.y);
      ctx.scale(dk, dk);
      const held = 1 - 0.75 * ramp(t, T.press, T.press + 0.3);
      ctx.globalAlpha = held;
      if (D.depth) { ctx.fillStyle = D.edge; ctx.beginPath(); ctx.arc(0, D.depth, dock.r, 0, TAU); ctx.fill(); }
      ctx.fillStyle = rgba(D.fill, D.alpha);
      ctx.beginPath(); ctx.arc(0, 0, dock.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.setLineDash(D.dash);
      ctx.lineDashOffset = -t * 8 * M.idle;
      ctx.strokeStyle = D.ring; ctx.lineWidth = D.ringWidth;
      ctx.beginPath(); ctx.arc(0, 0, dock.r - D.ringWidth / 2, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      if (t < T.press) {
        const beat = ((t - T.dockIn) / 1.1) % 1;
        ring(dock.x, dock.y, dock.r + beat * 16, (1 - beat) * 0.7 * clamp01(dk), 2, D.pulse);
      }
    }

    // position, lift and mood of the storm through the scene
    const f = fingerAt(t, guess);
    let x, y, lift = 0, R = 19, sweep = 0.3, eye = 0, vigor = 1, angle = -0.4, squash = 0;
    const inDock = pop(t, T.dockIn + 0.15, 0.5);
    if (t < T.press) {
      x = dock.x; y = dock.y + Math.sin(t * 2.4) * 1.5 * M.idle; R = 19 * inDock;
    } else if (t < T.release) {
      lift = E.out(ramp(t, T.press, T.press + 0.25));
      const k = ramp(t, T.press, T.press + 0.25);
      x = lerp(dock.x, f.x - 3, k); y = lerp(dock.y, f.y - 37, k);
      R = lerp(19, 25, lift);
    } else {
      const drop = pop(t, T.release, 0.5);
      lift = 1 - clamp01(drop);
      squash = M.squash * Math.sin(ramp(t, T.release + 0.05, T.release + 0.45) * PI);
      const slide = glide(ramp(t, T.slide[0], T.slide[1]));
      const g = t < T.travel[0]
        ? geoInterpolate(GUESS, BIRTH)(slide)
        : trackAt(lerp(ramp(t, T.travel[0], T.travel[1]), E.inOut(ramp(t, T.travel[0], T.travel[1])), 0.55));
      [x, y] = proj(g);
      lift += Math.sin(ramp(t, T.slide[0], T.slide[1]) * PI) * 0.8;

      // on the equator: it swells, rocks, and gives up
      const swell = E.window_(t, T.release + 0.3, T.fizzle + 0.1, 0.5);
      const tired = E.inOut(ramp(t, T.fizzle - 0.1, T.fizzle + 0.5)) * (1 - E.inOut(ramp(t, T.slide[0], T.slide[1])));
      vigor = 1 - tired * 0.8;
      const rock = E.window_(t, T.release + 0.25, T.fizzle + 0.35, 0.35);
      angle = -0.4 + Math.sin((t - T.release) * 8.5) * 0.3 * rock;

      // at 12 degrees north: it winds up and goes
      const [s0, s1] = T.spinUp, w1 = look.storm.turn;
      const kk = ramp(t, s0, s1);
      const turned = t < s1 ? w1 * (s1 - s0) * kk * kk / 2 : w1 * (s1 - s0) / 2 + w1 * (t - s1);
      angle -= turned;
      const wind = E.inOut(kk);
      const go = ramp(t, T.travel[0], T.travel[1]);
      sweep = lerp(0.3, 0.72, wind) + 0.28 * E.out(ramp(go, 0, 0.5));
      eye = E.out(ramp(t, s1 - 0.3, s1 + 0.5));
      const strength = Math.sin(clamp01(go * 0.82) * PI);   // grows over warm water, eases off in the north
      R = (24 + swell * 4 - tired * 5) + wind * 1.5 + strength * 6;
      squash += M.squash * 0.6 * Math.sin(ramp(t, T.slide[1] - 0.05, T.slide[1] + 0.35) * PI);
    }

    // marks left on the map
    if (t > T.release) {
      const rp = ramp(t, T.release, T.release + 0.8);
      ring(guess[0], guess[1], 18 + E.out(rp) * 34, (1 - rp) * INK.ripple.alpha, INK.ripple.width, INK.ripple.color);
      const rp2 = ramp(t, T.release + 0.18, T.release + 1.0);
      ring(guess[0], guess[1], 18 + E.out(rp2) * 26, (1 - rp2) * INK.ripple.alpha * 0.6, INK.ripple.width, INK.ripple.color);
    }
    if (t > T.travel[0]) {
      const u1 = lerp(ramp(t, T.travel[0], T.travel[1]), E.inOut(ramp(t, T.travel[0], T.travel[1])), 0.55);
      ctx.fillStyle = rgba(INK.track.color, INK.track.alpha);
      for (let u = 0; u < u1 - 0.012; u += 0.0235) {
        const [tx, ty] = proj(trackAt(u));
        ctx.beginPath(); ctx.arc(tx, ty, INK.track.dot, 0, TAU); ctx.fill();
      }
    }
    // where it was born, once it has left
    const bornK = pop(t, T.travel[0] + 0.5, 0.5);
    if (bornK > 0.01) {
      ring(birth[0], birth[1], 5.5 * bornK, INK.track.alpha, 2, INK.track.color);
    }

    // equator label, sitting just under the line in the Gulf of Guinea
    const eqK = pop(t, T.release + 1.0, 0.45);
    if (eqK > 0.01) {
      const [ex, ey] = proj([-16.5, 0]);
      ctx.save();
      ctx.globalAlpha = clamp01(eqK) * INK.equator.labelAlpha;
      ctx.font = font(look.chip.size - 0.5, look.chip.weight);
      ctx.fillStyle = INK.equator.label;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(look.chip.upper ? 'EQUATOR' : 'Equator', ex, ey + 7);
      ctx.restore();
    }

    // air: straight in on the equator, bent into a turn further north
    const flatIn = E.window_(t, T.release + 0.3, T.fizzle + 0.25, 0.3);
    drawInflow(x, y, R, t, 0, flatIn);
    const curl = E.inOut(ramp(t, T.spinUp[0] + 0.1, T.spinUp[0] + 1.0));
    const bentIn = E.window_(t, T.spinUp[0] - 0.15, T.travel[0] + 0.7, 0.35);
    drawInflow(x, y, R * 1.05, t, curl, bentIn);

    drawStorm(x, y, { R, angle, sweep, eye, vigor, lift, squash, alpha: t < T.press ? clamp01(inDock * 2) : 1 });

    const noSpin = pop(t, T.fizzle, 0.5) * (1 - E.inn(ramp(t, T.slide[0] - 0.35, T.slide[0])));
    chip('No spin', guess[0], guess[1] - 46, noSpin, { accent: true });
    const latK = pop(t, T.slide[1] - 0.05, 0.45) * (1 - E.inn(ramp(t, T.travel[0] + 0.1, T.travel[0] + 0.45)));
    chip('12° north', birth[0] - 6, birth[1] - 52, latK);

    // touch ripples, then the hand over everything
    if (t >= T.fingerIn && t < T.release + 1) {
      const pr = ramp(t, T.press - 0.05, T.press + 0.45);
      if (pr > 0 && pr < 1) ring(dock.x, dock.y, 12 + pr * 26, (1 - pr) * 0.8, 2.5, look.finger.touch);
      drawHand(f.x, f.y, f.press, f.alpha);
    }
  }

  function render(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = look.chrome.ground;
    ctx.fillRect(0, 0, W, H);
    const c = cam(t);
    proj.translate([c.cx, c.cy]).scale(c.r).rotate([-c.lon, -c.lat, 0]);

    drawStageBack();
    ctx.save();
    ctx.clip(stagePath());
    drawSpace(t, c);
    drawGlobe(t, c);
    drawDrifters(t, c);
    drawUpdrafts(t, c);
    ctx.restore();
    drawStageFront();

    ctx.save();
    ctx.clip(stagePath());
    drawLegend(t);
    drawAction(t, c);
    ctx.restore();
  }

  return { render };
}
