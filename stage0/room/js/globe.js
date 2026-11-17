// The globe: the small one on its stand in the room, and the full-screen display it opens into.
// It shows what has been learned and says nothing: learned countries are filled in, a landmark
// stands on a country whose landmark was learned, a bird flies over where it lives.

import { geoOrthographic, geoPath, geoGraticule, geoDistance, geoContains, geoCentroid } from 'd3-geo';
import { clamp01, lerp, ramp, spring, out } from './ease.js';
import { pen, rr, circ, ell, poly, rpoly, soft, pd, star, TAU, PI } from './draw.js';

// Made up for the sketch: which countries, landmarks and birds have been learned.
export const LEARNED = new Set(['Canada', 'United States of America', 'Mexico', 'Cuba', 'Brazil', 'Colombia', 'Venezuela', 'Peru', 'Argentina',
  'France', 'Spain', 'Portugal', 'United Kingdom', 'Ireland', 'Italy', 'Germany', 'Iceland', 'Norway', 'Morocco', 'Algeria', 'Egypt', 'Senegal', 'Nigeria', 'Mali']);
const NAMES = { 'United States of America': 'United States', 'Dem. Rep. Congo': 'DR Congo', 'Central African Rep.': 'Central African Republic',
  'Dominican Rep.': 'Dominican Republic', 'Bosnia and Herz.': 'Bosnia and Herzegovina', 'W. Sahara': 'Western Sahara', 'S. Sudan': 'South Sudan', 'Eq. Guinea': 'Equatorial Guinea' };
export const HOME_VIEW = [30, -16];           // rotation: the Atlantic in the middle
const BIRD = { centre: [-58, -6], rx: 15, ry: 9, period: 7 };

const SEA = '#1b2a80', LAND = '#2bc4a4', EDGE = '#127a85', DIM = '#31409a', DIM_EDGE = '#222c78', LIGHT = '#7df0cf';

// ---- things that stand on the globe. origin: where they touch it ----
function tower(g) {
  const A = '#ffc83d', D = '#c98a00', L = '#ffe69a';
  g.flat(ell(1.5, 1, 15, 4), '#070a2e', 0.45);
  const body = pd('M-15 0 Q-5 -20 -3 -56 L3 -56 Q5 -20 15 0 L8 0 Q0 -15 -8 0Z');
  g.f(body, A, { s: 2.6, l: 1, dk: 0.36 });
  g.clip(body, () => g.flat(pd('M-16 0 Q-5 -20 -3 -56 L-0.5 -56 L-1 -12 Q-5.5 -9 -8 0Z'), L, 0.9));
  g.line(pd('M-9.5 -11 L9.5 -11 M-6 -27 L6 -27'), D, 1, 0.5);
  g.f(rr(-10.5, -21, 21, 3.6, 1.2), D, { s: 0, l: 0.9, shade: false });
  g.f(rr(-6.5, -37, 13, 3.2, 1), D, { s: 0, l: 0.9, shade: false });
  g.f(rr(-1.2, -66, 2.4, 11, 1.2), A, { shade: false, lit: false });
}
function pyramids(g) {
  g.flat(ell(3, 1, 22, 4), '#070a2e', 0.4);
  const one = (x, h, w) => {
    g.flat(poly([[x - w, 0], [x, -h], [x + w, 0]]), '#ffb04a');
    g.flat(poly([[x, -h], [x + w, 0], [x + w * 0.22, 0]]), '#c9701a');
    g.flat(poly([[x - w, 0], [x, -h], [x - w * 0.55, 0]]), '#ffd08a', 0.7);
  };
  one(13, 13, 11); one(-5, 20, 16);
}
const LANDMARKS = [
  { name: 'Eiffel Tower', at: [2.3, 47.6], draw: tower, h: 66 },
  { name: 'Pyramids of Giza', at: [30.6, 27.6], draw: pyramids, h: 20 },
];

// a scarlet macaw, flying to the right. flap: -1 to 1.
function macaw(g, flap) {
  const { ctx } = g, R = '#ee3b4e', RD = '#b81f33';
  // tail
  g.f(pd('M-9 3 L-44 12 Q-30 4 -9 -2Z'), RD, { s: 1.6, l: 0, lit: false });
  g.f(pd('M-9 4 L-38 19 Q-24 7 -8 1Z'), '#3b6fd6', { s: 1.6, l: 0, lit: false });
  // far wing
  ctx.save(); ctx.translate(-1, -2); ctx.rotate(-flap * 0.75 - 0.2); ctx.scale(1, 0.9);
  g.flat(pd('M-6 0 Q-12 -22 -26 -30 Q-10 -30 8 -2Z'), '#2a56c4');
  ctx.restore();
  const body = soft([[-14, 0], [-6, -7], [8, -8], [18, -6], [21, 0], [14, 6], [0, 8], [-10, 6]], true, 0.9);
  g.f(body, R, { s: 3, l: 1.4 });
  g.f(circ(17, -4, 7.6), R, { s: 2.6, l: 1.3 });
  g.flat(ell(19.6, -3.6, 4.4, 4), '#fff7ee');
  g.flat(circ(19.8, -4.4, 1.4), '#1b1447');
  g.f(pd('M23 -8.6 Q32.5 -7 28 4 Q25.5 0.6 23 -1.4Z'), '#fff0cf', { s: 1.4, l: 0.7, dk: 0.24 });
  g.flat(pd('M23 0.6 Q25.5 3 28 4 Q24.5 7 22 3.4Z'), '#2a1650');
  // near wing: red at the shoulder, then yellow, then blue
  ctx.save(); ctx.translate(2, -3); ctx.rotate(flap * 0.85 - 0.15);
  const wing = pd('M-7 2 Q-12 -24 -30 -36 Q-8 -36 9 -1 Q2 5 -7 2Z');
  g.flat(wing, '#3b6fd6');
  g.clip(wing, () => { g.flat(circ(0, 0, 24), '#ffc83d'); g.flat(circ(2, 2, 14), R); });
  g.over(wing, { s: 2.6, l: 1.2 });
  ctx.restore();
}

function cloud(g, s) {
  const p = new Path2D();
  p.addPath(rr(-1.35 * s, 0.08 * s, 2.7 * s, 0.6 * s, 0.3 * s));
  p.addPath(circ(-0.62 * s, 0.02 * s, 0.46 * s)); p.addPath(circ(0.02 * s, -0.3 * s, 0.64 * s)); p.addPath(circ(0.72 * s, 0.06 * s, 0.42 * s));
  g.ctx.save(); g.ctx.translate(0, s * 0.2); g.flat(p, '#b9c6ff'); g.ctx.restore();
  g.flat(p, '#ffffff');
}
const DRIFTERS = [[-38, 44, 11], [-18, -30, 10], [-104, 42, 9], [10, 62, 8], [-150, 8, 10], [58, 0, 9]];

export function createGlobe(world) {
  const { feature, mesh } = globalThis.topojson;
  const countries = feature(world, world.objects.countries).features.filter(f => f.properties.name !== 'Antarctica');
  const land = { type: 'FeatureCollection', features: countries };
  const got = { type: 'FeatureCollection', features: countries.filter(f => LEARNED.has(f.properties.name)) };
  const borders = mesh(world, world.objects.countries, (a, b) => a !== b);
  const grat = geoGraticule().step([30, 30])();
  const proj = geoOrthographic().clipAngle(90).precision(0.4);
  const byName = new Map(countries.map(f => [f.properties.name, f]));
  const set = v => proj.translate([v.cx, v.cy]).scale(v.r).rotate([v.rot[0], v.rot[1], 0]);

  // the ball itself. v: cx, cy, r, rot. o.pick: a country to lift, o.pickK: how far (0 to 1)
  function ball(ctx, v, o = {}) {
    const { cx, cy, r } = v, k = Math.sqrt(r / 166), depth = 3.2 * k;
    set(v);
    const path = geoPath(proj, ctx);
    const fill = (geo, color, dy = 0, dx = 0) => { ctx.save(); ctx.translate(dx, dy); ctx.beginPath(); path(geo); ctx.fillStyle = color; ctx.fill(); ctx.restore(); };
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    const sea = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.1, cx, cy, r * 1.05);
    sea.addColorStop(0, '#2a3ea6'); sea.addColorStop(0.6, SEA); sea.addColorStop(1, '#141f66');
    ctx.fillStyle = sea; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.beginPath(); path(grat); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
    // not learned yet: there, but asleep
    fill(land, DIM_EDGE, depth * 0.55);
    fill(land, DIM);
    // learned: filled in, standing a little proud of the sea
    fill(got, EDGE, depth);
    fill(got, LIGHT, -1.2 * k, -0.5 * k);
    fill(got, LAND);
    ctx.beginPath(); path(borders); ctx.strokeStyle = 'rgba(12,30,90,0.5)'; ctx.lineWidth = 0.7 * k; ctx.stroke();
    if (o.pick && byName.has(o.pick) && o.pickK > 0) {
      const f = byName.get(o.pick), up = o.pickK * 4 * k, known = LEARNED.has(o.pick);
      fill(f, known ? EDGE : DIM_EDGE, depth);
      fill(f, known ? '#eafff8' : '#aab8ff', -up - 1.2 * k);
      fill(f, known ? '#5fe6c4' : '#5466c8', -up);
    }
    // one light, top left: a flat shadow side and a thin lit edge
    const hole = (ox, oy, rr2) => { const p = new Path2D(); p.arc(cx, cy, r * 1.02, 0, TAU); p.closePath(); p.moveTo(cx + ox + rr2, cy + oy); p.arc(cx + ox, cy + oy, rr2, 0, TAU); p.closePath(); return p; };
    ctx.fillStyle = 'rgba(7,10,46,0.38)'; ctx.fill(hole(-r * 0.2, -r * 0.22, r * 1.07), 'evenodd');
    ctx.fillStyle = 'rgba(168,212,255,0.3)'; ctx.fill(hole(r * 0.028, r * 0.032, r), 'evenodd');
    const w = 3 * k;
    ctx.strokeStyle = 'rgba(127,176,255,0.5)'; ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(cx, cy, r - w / 2 + 0.5, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // the small globe for the room, drawn once
  let small = null;
  function mini(ctx, x, y, r) {
    const S = 3, size = Math.ceil(r * 2 + 4);
    if (!small || small.r !== r) {
      const c = document.createElement('canvas');
      c.width = c.height = size * S;
      const c2 = c.getContext('2d');
      c2.scale(S, S);
      ball(c2, { cx: size / 2, cy: size / 2, r, rot: HOME_VIEW });
      small = { c, r, size };
    }
    ctx.drawImage(small.c, x - small.size / 2, y - small.size / 2, small.size, small.size);
  }

  // the stand of the full-screen globe: its metal is the level
  function stand(ctx, v, level = 'gold') {
    const g = pen(ctx), { cx, cy, r } = v;
    const [m, md, ml, ink] = { bronze: ['#e09a5a', '#a8642e', '#ffd0a0', '#6e3a14'], gold: ['#ffc83d', '#d6960a', '#ffe69a', '#8a5a00'], platinum: ['#e6ecff', '#9aa6dc', '#ffffff', '#5560a8'] }[level];
    const by = cy + r + 44;
    g.shadow(cx, by + 34, 130, 12, 0.5);
    g.f(rr(cx - 12, cy + r + 10, 24, 40, 3), m, { s: 4, l: 2, dk: 0.36 });
    const arc = (rad, a0, a1) => { const p = new Path2D(); p.arc(cx, cy, rad, a0, a1); return p; };
    g.line(arc(r + 13, 0.52, PI - 0.52), md, 12);
    g.line(arc(r + 12, 0.52, PI - 0.52), m, 8.4);
    g.line(arc(r + 9.6, PI / 2 + 0.2, PI - 0.6), ml, 2.2, 0.95);
    for (const a of [0.52, PI - 0.52]) g.f(circ(cx + Math.cos(a) * (r + 12.4), cy + Math.sin(a) * (r + 12.4), 8.4), m, { s: 2.6, l: 1.4, dk: 0.36 });
    g.flat(rr(cx - 98, by + 5, 196, 32, 13), md);
    const base = rr(cx - 98, by, 196, 32, 13);
    g.f(base, m, { s: 4, l: 2, dk: 0.3 });
    g.clip(base, () => { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill(poly([[cx - 80, by], [cx - 56, by], [cx - 72, by + 32], [cx - 96, by + 32]])); });
    g.flat(star(cx + 0.8, by + 17.2, 9.5), ml, 0.9);
    g.flat(star(cx, by + 16.2, 9.5), ink, 0.8);
  }

  const visible = (lonlat, v, edge = 1.36) => geoDistance(lonlat, [-v.rot[0], -v.rot[1]]) < edge;

  // the whole display. v: cx, cy, r, rot. o: t, level, pick, pickAge, bounce
  function display(ctx, v, o = {}) {
    const g = pen(ctx), { cx, cy, r } = v, t = o.t || 0, k = r / 176;
    const pickK = o.pick ? spring(ramp(o.pickAge, 0, 0.5), o.bounce ?? 0.42) : 0;
    const sk = o.stand ?? 1;                  // the stand and the glow arrive after the ball has grown
    if (sk > 0.01) {
      ctx.save(); ctx.globalAlpha *= sk;
      g.glow(cx, cy, r * 1.3, r * 1.3, '#4f7cff', 0.3);
      stand(ctx, v, o.level);
      ctx.restore();
    }
    ball(ctx, v, { pick: o.pick, pickK });
    set(v);
    // clouds
    for (const [lon0, lat, size] of DRIFTERS) {
      const at = [lon0 + t * 0.9, lat];
      if (!visible(at, v, 1.25)) continue;
      const [x, y] = proj(at), d = geoDistance(at, [-v.rot[0], -v.rot[1]]), e = clamp01((1.25 - d) / 0.25);
      ctx.save(); ctx.globalAlpha *= e * 0.92;
      g.flat(ell(x + 3 * k, y + 8 * k, size * 1.2 * k, size * 0.42 * k), '#060830', 0.3);
      ctx.translate(x, y - 6 * k + Math.sin(t * 0.9 + lon0) * 1.2); cloud(g, size * k * (0.75 + 0.25 * Math.cos(d)));
      ctx.restore();
    }
    // landmarks, the far ones first. each leans out the way the ground under it faces.
    const marks = LANDMARKS.filter(m => visible(m.at, v)).map(m => ({ m, p: proj(m.at) })).sort((a, b) => a.p[1] - b.p[1]);
    for (const { m, p } of marks) {
      const lean = ((p[0] - cx) / r) * 0.62, flat = 0.72 + 0.28 * Math.cos(geoDistance(m.at, [-v.rot[0], -v.rot[1]]));
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(lean); ctx.scale(k * 1.04, k * 1.04 * flat);
      m.draw(g);
      ctx.restore();
    }
    // the bird, on its round
    const u = (t / BIRD.period) % 1, pos = uu => [BIRD.centre[0] + Math.cos(uu * TAU) * BIRD.rx, BIRD.centre[1] + Math.sin(uu * TAU) * BIRD.ry];
    const here = pos(u);
    if (visible(here, v, 1.3)) {
      const [bx, by] = proj(here), [nx] = proj(pos(u + 0.01)), dir = nx >= bx ? 1 : -1, lift = 30 * k;
      // where it has just been: a soft solid streak, fading out
      for (let i = 14; i >= 1; i--) {
        const q = proj(pos(u - i * 0.012));
        g.flat(circ(q[0], q[1] - lift, (3.2 - i * 0.18) * k), '#ffffff', 0.34 * (1 - i / 15));
      }
      g.flat(ell(bx, by + 2, 13 * k, 4 * k), '#060830', 0.34);
      ctx.save(); ctx.translate(bx, by - lift + Math.sin(t * 2.2) * 2); ctx.scale(dir * k * 0.92, k * 0.92);
      macaw(g, Math.sin(t * 9.5));
      ctx.restore();
    }
    // a tapped country says its name, and nothing else
    if (o.pick && pickK > 0.01) {
      const f = byName.get(o.pick), c = o.pickAt || proj(geoCentroid(f));
      label(ctx, NAMES[o.pick] || o.pick, c[0], c[1] - 30, pickK);
    }
  }

  function label(ctx, text, x, y, k) {
    ctx.save();
    ctx.font = '800 14px "Nunito", system-ui, sans-serif';
    const w = ctx.measureText(text).width + 24, h = 28;
    x = Math.max(w / 2 + 10, Math.min(414 - w / 2 - 10, x));
    ctx.translate(x, y); ctx.scale(k, k); ctx.globalAlpha = clamp01(k * 2.5);
    ctx.fillStyle = '#b9c2ee'; ctx.fill(rr(-w / 2, -h / 2 + 3, w, h, 12));
    ctx.fillStyle = '#ffffff'; ctx.fill(rr(-w / 2, -h / 2, w, h, 12));
    ctx.fill(poly([[-7, h / 2 - 1], [7, h / 2 - 1], [0, h / 2 + 7]]));
    ctx.fillStyle = '#1b1f5e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  // which country is under a point of the screen
  function pick(x, y, v) {
    if (Math.hypot(x - v.cx, y - v.cy) > v.r) return null;
    set(v);
    const at = proj.invert([x, y]);
    if (!at) return null;
    const f = countries.find(c => geoContains(c, at));
    return f ? f.properties.name : null;
  }
  const where = (lonlat, v) => { set(v); return proj(lonlat); };

  return { ball, mini, display, pick, where };
}
