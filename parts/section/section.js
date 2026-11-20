// The Section: a slice of sea (or land) and the air above it, seen from the side, in the house's flat look. One
// picture for anything that happens between the surface and the sky: the sun warming the water or the ground,
// its light falling straight or slanting, water vapour rising, air rising up a column, rushing in along the
// surface, flowing out high up and sinking again (a whole loop of moving air), a parcel of air rising and
// cooling, a cloud billowing up into a storm cloud, the heat the vapour gives back, rain. Every one of those
// is a level from 0 to 1 that glides where it's sent (js/ease.js), so a scene can turn them up and down on its
// words, or drive one across a stretch ($p). Signs stand in the water or on the ground with a word or a
// number; built labels name a thing. Its camera moves between a few framings.
//
// It draws in the series' visual code (js/code.js): heat as warm triangles, moving air as running dashed
// arrows, vapour as pale puffs, a cloud as billows in three tones that grow upward out of the rising air, a
// temperature as the thing's own colour shifting plus a number. Nothing here is a squiggle.
//
// Drawing: the world is in units, x across from the middle of the slice, y up from the sea's surface (the sea
// floor is at -320, cloud bases at 450, the tops near 900). The rising column stands at x = 0 over open sea,
// or over the land when there's a shore. The camera fits a framing into the box and the sky and sea run on
// past it either side, so it fills any shape: the whole screen, half of a split, or a lens. No blur: glows are
// gradients, shadows offset copies.
//
// mount(el, settings, ctx) -> { calls, state, on, remove, busy, finish, debug }.

import { Glide, Shift, soft as softEase, clamp01, lerp, rng, MOTION } from '../../js/ease.js';
import { heat, air, loopShare, along, puff, cloud as drawCloud, sign as drawSign, label as drawLabel, glow, mixHex, rgba as rgbaHex } from '../../js/code.js';
import { chip } from '../map/marks.js';
import { mix, rgba } from '../map/look.js';

const TAU = Math.PI * 2;
const LEVELS = ['sun', 'warm', 'vapour', 'rise', 'cloud', 'release', 'inflow', 'rain', 'carry', 'drops', 'cooling', 'days',
  'ground', 'heat', 'outflow', 'sink', 'beam'];
// Levels that carry cause and effect in a colour: they move on the colour family (a 10% overshoot, then settle).
const COLOURED = new Set(['warm', 'ground']);
// The framings: the middle of what's shown and how much of it, in world units [x, y, width, height].
export const VIEWS = {
  wide: [0, 330, 600, 1240],
  sea: [0, -110, 520, 520],
  surface: [0, 90, 520, 560],
  air: [0, 330, 620, 760],
  cloud: [0, 620, 700, 620],
  top: [0, 820, 760, 520],
};
const BASE = 450;            // where vapour turns back into drops: the cloud's base
const SIGN_AT = { left: -170, middle: 0, right: 170 };
// The thermometer: where it stands (its bulb in the sea, its tube up into the air) and its scale.
const GAUGE = { x: -150, bulb: -46, top: 290, lo: 10, hi: 35 };
// The sea from cool to warm: the globe's own warmth colours (look.js, SST), so the two always agree.
const SEA_RAMP = ['#2f4fc0', '#3b3db8', '#8b3fbf', '#ee4b7a', '#ffa23a'];
const seaAt = k => { k = clamp01(k) * (SEA_RAMP.length - 1); const i = Math.min(SEA_RAMP.length - 2, Math.floor(k)); return mix(SEA_RAMP[i], SEA_RAMP[i + 1], k - i); };
// Land from cool to warm: the map's land, shifting toward a sunbaked amber.
const LAND = { cool: '#2bc4a4', warm: '#eaa04c', edgeCool: '#127a85', edgeWarm: '#a85a2a', sand: '#f3d9a0' };

export async function mount(el, settings, ctx = {}) {
  const S = settings;
  const canvas = document.createElement('canvas');
  canvas.className = 'pg-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'The sea and the air above it, from the side');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  el.append(canvas);
  const g = canvas.getContext('2d');

  const shore = ['right', 'land'].includes(S.shore) ? S.shore : 'none';
  // the column of rising air: over the land when there's a shore, else in the middle of the sea
  const colX = shore === 'right' ? 170 : 0;
  // where air sinks again, and which ways air comes in and goes out along the surface
  const sides = shore === 'right' ? [-1] : [-1, 1];
  const lv = Object.fromEntries(LEVELS.map(k => [k, COLOURED.has(k) ? new Shift(Number(S[k]) || 0, 'colour') : new Glide(Number(S[k]) || 0)]));
  const sunAngle = new Glide(Number.isFinite(Number(S.sunAngle)) ? Number(S.sunAngle) : 79);
  const startView = VIEWS[S.view] || VIEWS.wide;
  const cam = startView.map(v => new Glide(v));
  const tags = new Map();   // thing -> { text, born, out }
  const signs = new Map();  // where -> { text, colour, born, out, num, unit }
  // a parcel of air: where it is (0 at the surface, 1 at the cloud base) and the temperature on its tag
  const parcel = { h: new Glide(0), temp: new Glide(26), on: false, born: 0, out: null };
  // the thermometer: its reading glides; shown or not
  const gauge = { value: new Glide(20), unit: '°C', born: 0, out: null, on: false };
  // the sun crossing the sky, once a day, while days pass (days): how far through the day it is
  let dayPhase = 0.35;
  let w = 0, h = 0, dpr = 1, raf = 0, gone = false, last = 0, frames = 0, clock = 0;

  // The cloud: puffs, made once from a seeded random. A tower over the column, wider in the middle, and an anvil
  // spreading at the top. Each puff has the cloud level at which it's born: the middle first at every height,
  // then out to the sides, each height after the one below, so the cloud billows upward and outward from
  // the rising air (never laid out along its base first).
  const R = rng(7);
  const puffs = [];
  const ROWS = 12;
  for (let r = 0; r < ROWS; r++) {
    const hk = r / (ROWS - 1), y = 476 + hk * 390;
    // narrow where it starts, bulging through the middle, a little narrower again under the anvil
    const half = 58 + 92 * Math.sin(Math.PI * Math.min(1, 0.12 + hk * 0.95)) * (hk < 0.85 ? 1 : 0.85);
    const n = 2 + Math.round(half / 28);
    for (let i = 0; i < n; i++) {
      const sx = (i / (n - 1)) * 2 - 1, edge = Math.abs(sx);
      puffs.push({ x: sx * half + (R() - 0.5) * 26, y: y + (R() - 0.5) * 30 + (1 - sx * sx) * 22, r: 24 + R() * 14 + (1 - edge) * 30,
        need: 0.02 + hk * 0.68 + edge * 0.12 + R() * 0.03, ph: R() * TAU });
    }
  }
  // the anvil: a wide, flat-topped layer spreading out from the middle at the top of the storm
  for (let row = 0; row < 3; row++) {
    const n = 15 - row * 2;
    for (let i = 0; i < n; i++) {
      const sx = (i / (n - 1)) * 2 - 1, edge = Math.abs(sx);
      const spanX = 350 - row * 70;
      puffs.push({ x: sx * spanX + (R() - 0.5) * 24, y: 905 - row * 36 + (R() - 0.5) * 10 - edge * 16, r: (row === 0 ? 44 : 50) + R() * 12 - edge * 10, f: row === 0 ? 0.62 : 0.8,
        need: 0.82 + edge * 0.15 + row * 0.01 + R() * 0.01, ph: R() * TAU });
    }
  }
  // the first puff is a single bubble right over the column, where the rising air first makes cloud
  puffs.push({ x: 0, y: 486, r: 42, need: 0.0, ph: 0.3 });
  puffs.sort((a, b) => a.need - b.need);
  // vapour: a fixed set of puffs, each on its own loop up from the sea
  const vap = Array.from({ length: 44 }, (_, i) => ({ x: shore === 'right' ? -330 + R() * 320 : (R() - 0.5) * 2 * 330, ph: R(), sway: R() * TAU, r: 0.8 + R() * 0.5, turn: R() * TAU, i }));
  // heat rising off a warm surface, and the heat let go in the cloud
  const motes = Array.from({ length: 18 }, () => ({ x: R(), ph: R(), wob: R() * TAU }));
  const sparks = Array.from({ length: 14 }, () => ({ a: R() * TAU, ph: R(), d: 0.4 + R() * 0.6 }));

  // How far down the picture is clear of the status bar in a scene (its --top).
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:var(--top, 0px);visibility:hidden;pointer-events:none';
  el.append(probe);
  let topRoom = 0;

  function size() {
    topRoom = probe.offsetHeight || 0;
    // its layout size, not its box on screen: a scene's shot can be moving it with a transform just then
    w = Math.max(10, el.clientWidth || el.getBoundingClientRect().width); h = Math.max(10, el.clientHeight || el.getBoundingClientRect().height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    wake();
  }

  // The camera now: a scale (pixels a unit) and the screen point of a world point.
  function camera(now) {
    const [cx, cy, vw, vh] = cam.map(c => c.at(now));
    const s = Math.min(w / vw, h / vh);
    return { s, x: X => w / 2 + (X - cx) * s, y: Y => h / 2 - (Y - cy) * s, cx, cy };
  }

  const level = (k, now) => clamp01(lv[k].at(now));
  const cloudTop = c => 478 + Math.max(0.08, c) * 420;
  // the land's surface height at x (nothing where there's sea)
  const landAt = X => (shore === 'land' ? 10 + 4 * Math.sin(X / 70) : shore === 'right' && X > 18 ? Math.min(16, (X - 18) * 0.5) + 3 * Math.sin(X / 55) : null);
  const surfaceAt = (X, t) => { const l = landAt(X); return l === null ? Math.sin(X / 70 + t * 1.1) * 5 + Math.sin(X / 31 - t * 0.7) * 2 : l; };
  // the sun: along its angle from the middle of the surface, far off (it stays put unless days go by)
  const sunWorld = e => { const a = (e * Math.PI) / 180; return [-Math.cos(a) * 900, Math.sin(a) * 900]; };

  function draw(now, dt) {
    const C = camera(now), { s } = C;
    const t = now / 1000;
    clock += dt / 1000;
    const L = Object.fromEntries(LEVELS.map(k => [k, k === 'rise' ? Math.max(0, lv.rise.at(now)) : level(k, now)]));
    // warm and ground carry a small overshoot past their target: their colour may go a touch beyond, never the drawing
    const warmC = clamp01(lv.warm.at(now) * 1.0), groundC = lv.ground.at(now);
    dayPhase = (dayPhase + (dt / 1000) * L.days * 0.9) % 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sea0 = C.y(0);
    const top = cloudTop(L.cloud), heart = BASE + (top - BASE) * 0.42;
    const outY = shore === 'right' ? 640 : Math.max(700, top - 60);
    const e = sunAngle.at(now);

    // the sky: deep at the top, lighter toward the sea; a faint warmth over a warm sea or warm land
    const sky = g.createLinearGradient(0, C.y(1150), 0, sea0);
    sky.addColorStop(0, '#11174a'); sky.addColorStop(0.55, '#222d7a'); sky.addColorStop(1, mix('#3b51b4', '#7b4fb0', Math.max(warmC, groundC) * 0.35));
    g.fillStyle = sky; g.fillRect(0, 0, w, Math.max(0, sea0) + 2);
    // far stars, drifting: something always moves
    g.save();
    for (let i = 0; i < 26; i++) {
      const sx = (((i * 97.3) % 100) / 100) * w, sy = ((i * 57.1) % 100) / 100 * Math.max(10, C.y(700));
      g.globalAlpha = 0.25 + 0.25 * Math.sin(t * 0.8 + i);
      g.fillStyle = '#c9d4ff'; g.beginPath(); g.arc((sx + t * 2) % w, sy, 1.1, 0, TAU); g.fill();
    }
    g.restore();

    // the sun, its rays turning slowly
    let sunXY = null;
    if (L.sun > 0.01) {
      const [wx, wy] = sunWorld(e);
      let fx = C.x(wx), fy = C.y(wy);
      // a low sun sits on the picture's edge, not off it
      fx = Math.max(Math.min(fx, w - 30), 30); fy = Math.max(fy, topRoom + 46);
      if (L.days > 0.001) {
        const q = dayPhase, ax = lerp(-0.12, 1.12, q) * w, ay = Math.max(70, h * 0.06 + topRoom) + (1 - Math.sin(Math.PI * q)) * h * 0.2;
        fx = lerp(fx, ax, L.days); fy = lerp(fy, ay, L.days);
      }
      sunXY = [fx, fy];
      const sr = Math.max(14, 44 * s) * (0.7 + 0.3 * L.sun);
      g.save();
      g.globalAlpha = L.sun;
      glow(g, fx, fy, sr * 4.4, '#ffd06e', 0.9);
      g.fillStyle = '#ffd062';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t * 0.12;
        g.beginPath();
        g.moveTo(fx + Math.cos(a - 0.09) * sr * 1.25, fy + Math.sin(a - 0.09) * sr * 1.25);
        g.lineTo(fx + Math.cos(a) * sr * 1.75, fy + Math.sin(a) * sr * 1.75);
        g.lineTo(fx + Math.cos(a + 0.09) * sr * 1.25, fy + Math.sin(a + 0.09) * sr * 1.25);
        g.fill();
      }
      g.fillStyle = '#c98a00'; g.beginPath(); g.arc(fx, fy + 3, sr, 0, TAU); g.fill();
      g.fillStyle = '#ffc83d'; g.beginPath(); g.arc(fx, fy, sr, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,240,190,0.55)'; g.beginPath(); g.arc(fx - sr * 0.3, fy - sr * 0.32, sr * 0.36, 0, TAU); g.fill();
      g.restore();
    }

    // sunlight as a beam of one width, falling at the sun's angle: straight down it lands on a small patch;
    // slanting, the same light is spread over a long one (it heats each bit of ground less)
    let foot = null;
    if (L.beam > 0.01) {
      const a = (e * Math.PI) / 180, half = 66, sinA = Math.max(0.12, Math.sin(a));
      const x0 = -half / sinA, x1 = half / sinA;
      foot = [x0, x1];
      const back = 1600, ux = Math.cos(a), uy = Math.sin(a);
      g.save();
      g.globalAlpha = L.beam;
      const P = (X, Y) => [C.x(X), C.y(Y)];
      const quad = [P(x0, 0), P(x1, 0), P(x1 - ux * back, uy * back), P(x0 - ux * back, uy * back)];
      const grad = g.createLinearGradient(quad[3][0], quad[3][1], C.x(0), C.y(0));
      grad.addColorStop(0, 'rgba(255,226,140,0.05)'); grad.addColorStop(1, 'rgba(255,226,140,0.34)');
      g.fillStyle = grad;
      g.beginPath(); g.moveTo(...quad[0]); for (const q of quad.slice(1)) g.lineTo(...q); g.closePath(); g.fill();
      // its edges and a few rays inside, running down toward the ground
      g.strokeStyle = 'rgba(255,236,170,0.55)'; g.lineWidth = Math.max(1.4, 3 * s); g.lineCap = 'round';
      for (const f of [0, 1]) { const X = lerp(x0, x1, f); g.beginPath(); g.moveTo(...P(X, 0)); g.lineTo(...P(X - ux * back, uy * back)); g.stroke(); }
      g.setLineDash([14 * s + 4, 26 * s + 6]);
      g.lineDashOffset = -clock * 60 * s;
      g.strokeStyle = 'rgba(255,240,190,0.5)';
      for (const f of [0.25, 0.5, 0.75]) { const X = lerp(x0, x1, f); g.beginPath(); g.moveTo(...P(X - ux * back, uy * back)); g.lineTo(...P(X, 0)); g.stroke(); }
      g.setLineDash([]);
      g.restore();
    }

    // heat given back: a warm glow round the cloud's heart, pulsing gently, behind it
    if (L.release > 0.01 && L.cloud > 0.05) {
      glow(g, C.x(colX), C.y(heart), (230 + 80 * L.cloud) * s * (1 + 0.04 * Math.sin(t * 2.1)), '#ff9a3c', L.release * 0.9);
    }

    // air flowing out high up, and sinking again away from the column: the top and far side of the loop
    const P = ([X, Y]) => [C.x(X), C.y(Y)];
    const aw = Math.max(3.2, 9 * s);
    if (L.outflow > 0.01) {
      for (const side of sides.map(d => (shore === 'right' ? -1 : d))) {
        const path = k => [colX + side * lerp(40, 300, k), outY + 40 * Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k) - k * 30];
        for (let i = 0; i < 2; i++) {
          const q = (clock * 0.5 + i * 0.5) % 1, [hd, tl] = loopShare(q);
          air(g, along(path, tl, hd).map(P), { phase: clock * 1.2, w: aw, a: L.outflow * (1 - softEase(clamp01((q - 0.8) / 0.2))) });
        }
      }
    }
    if (L.sink > 0.01) {
      const xs = shore === 'right' ? [-170] : [-290, 290];
      for (const X of xs) {
        const toward = Math.sign(colX - X) || 1;
        const path = k => [X + toward * Math.pow(clamp01((k - 0.75) / 0.25), 2) * 60, lerp(outY - 70, 70, Math.min(1, k * 1.08))];
        for (let i = 0; i < 2; i++) {
          const q = (clock * 0.45 + i * 0.5) % 1, [hd, tl] = loopShare(q);
          air(g, along(path, tl, hd).map(P), { phase: clock * 1.2, w: aw, a: L.sink * (1 - softEase(clamp01((q - 0.8) / 0.2))) });
        }
      }
    }

    // rising air: dashed arrows growing up the column at a steady speed (a process), into the cloud's base
    if (L.rise > 0.01) {
      const yTop = L.cloud > 0.05 ? BASE + 60 : 560;
      const pace = 0.3 + 0.24 * Math.min(2, L.rise);
      // the column itself: a faint band of lighter air, so the arrows read as one rising current
      {
        const cx0 = C.x(colX), half = 110 * s, yb = C.y(20), yt = C.y(yTop + 40);
        const band = g.createLinearGradient(cx0 - half, 0, cx0 + half, 0);
        band.addColorStop(0, rgbaHex('#bfeaff', 0)); band.addColorStop(0.5, rgbaHex('#bfeaff', 0.1 * Math.min(1, L.rise))); band.addColorStop(1, rgbaHex('#bfeaff', 0));
        g.fillStyle = band;
        // faded at its foot and its top, in slices
        for (let j = 0; j < 8; j++) { const y0 = lerp(yb, yt, j / 8), y1 = lerp(yb, yt, (j + 1) / 8); g.globalAlpha = Math.sin(Math.PI * (j + 0.5) / 8); g.fillRect(cx0 - half, y1, half * 2, y0 - y1 + 0.5); }
        g.globalAlpha = 1;
      }
      for (let i = 0; i < 3; i++) {
        const X = colX + (i - 1) * 54, q = (clock * pace + i / 3) % 1;
        const grow = clamp01(q / 0.78), fade = 1 - softEase(clamp01((q - 0.8) / 0.2));
        const path = k => [X + Math.sin(k * 3 + i) * 6, lerp(40, yTop, k)];
        air(g, along(path, 0, grow, 16).map(P), { phase: clock * (0.8 + 0.6 * L.rise), w: aw, a: Math.min(1, L.rise) * fade, colour: mixHex('#8fdcff', '#ffd9a8', clamp01(L.release * 0.6)) });
      }
    }

    // water vapour: pale puffs rising from the sea, drawn toward the column as the air rises, growing as they
    // climb. With carry, each holds the heat it took from the sea (a warm triangle inside). At the cloud's
    // base, with drops, each turns into tiny drops of water, and with release its heat leaves it.
    if (L.vapour > 0.01) {
      const n = Math.round(vap.length * L.vapour), reach = L.cloud > 0.05 ? BASE + 8 : 520;
      for (let i = 0; i < n; i++) {
        const p = vap[i];
        const k = (p.ph + clock * (0.07 + 0.075 * Math.min(2, L.rise))) % 1;
        const pull = clamp01(L.rise) * softEase(k);
        const X = lerp(p.x, colX + (p.x - colX) * 0.16, pull) + Math.sin(p.sway + t * 0.9 + k * 4) * 8;
        const Y = 14 + k * (reach - 14);
        const turnAt = 0.8, conv = L.drops > 0.01 && L.cloud > 0.05 ? clamp01((k - turnAt) / (1 - turnAt)) : 0;
        const env = Math.min(1, k * 7) * (conv > 0 ? 1 : 1 - softEase(clamp01((k - 0.78) / 0.22)));
        const r = Math.max(5, (9 + 8 * k) * p.r * s);
        const px = C.x(X), py = C.y(Y);
        // the heat it holds, hidden inside it: a warm core seen through the puff (it shows as heat flowing,
        // triangles, only once it's let go)
        if (L.carry > 0.01) {
          const core = g.createRadialGradient(px, py + r * 0.05, 0, px, py + r * 0.05, r * 0.8);
          core.addColorStop(0, rgbaHex('#ffd08a', 0.95 * env * L.carry * (1 - conv))); core.addColorStop(0.45, rgbaHex('#ff9f45', 0.6 * env * L.carry * (1 - conv))); core.addColorStop(1, rgbaHex('#ff9f45', 0));
          g.fillStyle = core; g.beginPath(); g.arc(px, py + r * 0.05, r * 0.8, 0, TAU); g.fill();
        }
        puff(g, px, py, r * (1 - conv * 0.7), env * (1 - conv) * 0.95, p.turn + t * 0.2);
        if (conv > 0) {
          // drops of water forming where the puff was
          for (let j = 0; j < 3; j++) {
            const dx = (j - 1) * r * 0.9 * (0.4 + conv), dy = -conv * 30 * s - j * 3 * s;
            const dr = Math.max(1.3, 3.2 * s);
            g.save(); g.globalAlpha = L.drops * conv * (1 - softEase(clamp01((conv - 0.7) / 0.3)));
            g.fillStyle = '#5d79d6'; g.beginPath(); g.arc(px + dx, py + dy + dr * 0.3, dr, 0, TAU); g.fill();
            g.fillStyle = '#e4f6ff'; g.beginPath(); g.arc(px + dx, py + dy, dr * 0.85, 0, TAU); g.fill();
            g.restore();
          }
          // and the heat it carried, let go into the air beside it
          if (L.release > 0.01 && L.carry > 0.01) {
            const side = p.i % 2 ? 1 : -1, d = conv * 70 * s;
            heat(g, px + side * d, py - d * 0.6, r * 0.5, -Math.PI / 2 + side * 0.9, L.release * L.carry * Math.sin(Math.PI * Math.min(1, conv * 1.05)));
          }
        }
      }
    }

    // the cloud: puffs billowing up into place as the level reaches them, each boiling gently
    if (L.cloud > 0.005) {
      const shown = [];
      for (const p of puffs) {
        const k = clamp01((L.cloud - p.need) / 0.13);
        if (k <= 0.01) continue;
        const grow = MOTION.furniture.ease(k);
        const spread = 0.78 + 0.22 * L.cloud;
        shown.push({ x: C.x(colX + p.x * spread + Math.sin(t * 0.5 + p.ph) * 3), y: C.y(p.y - (1 - grow) * 70 + Math.sin(t * 0.7 + p.ph) * 4),
          r: Math.max(1, p.r * s * grow * (1 + 0.035 * Math.sin(t * 0.9 + p.ph))), f: p.f });
      }
      drawCloud(g, shown, { warm: L.release * 0.8 });
    }

    // the heat let go inside the cloud: warm triangles streaming out of its heart into the air around it
    if (L.release > 0.01 && L.cloud > 0.05) {
      const n = Math.round(sparks.length * L.release);
      for (let i = 0; i < n; i++) {
        const sp = sparks[i], k = (sp.ph + clock * 0.42) % 1;
        const r0 = lerp(30, 170 + 90 * L.cloud, k) * sp.d;
        const X = colX + Math.cos(sp.a) * r0 * 1.15, Y = heart + Math.sin(sp.a) * r0 * 0.9;
        heat(g, C.x(X), C.y(Y), Math.max(4, 11 * s), Math.atan2(-Math.sin(sp.a) * 0.9, Math.cos(sp.a) * 1.15), L.release * Math.sin(Math.PI * k));
      }
    }

    // rain: thin slanted streaks under the cloud
    if (L.rain > 0.01 && L.cloud > 0.2) {
      g.save();
      g.strokeStyle = 'rgba(190,226,255,0.7)'; g.lineCap = 'round'; g.lineWidth = Math.max(1.2, 3 * s);
      const n = Math.round(40 * L.rain);
      for (let i = 0; i < n; i++) {
        const X = colX + ((i * 37) % 100 - 50) * (2.6 + L.cloud * 1.6), k = ((clock * 1.3) + (i * 0.618)) % 1;
        const Y = 420 - k * 420;
        g.globalAlpha = L.rain * 0.8;
        g.beginPath(); g.moveTo(C.x(X - 6), C.y(Y + 26)); g.lineTo(C.x(X), C.y(Y)); g.stroke();
      }
      g.restore();
    }

    // the sea: deep blue, with its warmth laid over the top layer as a see-through tint, gentle waves
    const x0w = C.cx - w / 2 / s - 20, x1w = C.cx + w / 2 / s + 20, stepW = Math.max(4, 6 / s);
    const wave = X => Math.sin(X / 70 + t * 1.1) * 5 + Math.sin(X / 31 - t * 0.7) * 2;
    const seaEnd = shore === 'land' ? x0w - 1 : shore === 'right' ? Math.min(x1w, 60) : x1w;
    if (seaEnd > x0w) {
      const seaPath = () => {
        g.beginPath();
        g.moveTo(C.x(x0w), C.y(wave(x0w)));
        for (let X = x0w; X <= seaEnd; X += stepW) g.lineTo(C.x(X), C.y(wave(X)));
        g.lineTo(C.x(seaEnd), h + 10); g.lineTo(C.x(x0w), h + 10); g.closePath();
      };
      const body = g.createLinearGradient(0, sea0, 0, C.y(-340));
      body.addColorStop(0, '#2f4fc0'); body.addColorStop(0.3, '#1b2a80'); body.addColorStop(1, '#0c1252');
      g.save(); g.fillStyle = mix('#2f4fc0', '#0a0e2e', 0.45); g.translate(0, -5 * s); seaPath(); g.fill(); g.restore();
      g.fillStyle = body; seaPath(); g.fill();
      // the warm layer: the sea's warmth colour laid over the top as a tint that fades with depth
      const wk = clamp01(lv.warm.at(now)), over = lv.warm.at(now) - clamp01(lv.warm.at(now));
      if (wk > 0.01 || over > 0) {
        const tint = g.createLinearGradient(0, sea0 - 6, 0, C.y(-150));
        const col = seaAt(Math.max(0, Math.min(1.1, lv.warm.at(now))));
        tint.addColorStop(0, rgba(col, 0.9 * Math.min(1, wk + 0.25))); tint.addColorStop(0.45, rgba(col, 0.5 * Math.min(1, wk + 0.2))); tint.addColorStop(1, rgba(col, 0));
        g.fillStyle = tint; seaPath(); g.fill();
      }
      g.save();
      g.strokeStyle = rgba('#ffffff', 0.35); g.lineWidth = Math.max(1, 2.5 * s);
      g.beginPath();
      for (let X = x0w, first = true; X <= seaEnd; X += stepW, first = false) { if (first) g.moveTo(C.x(X), C.y(wave(X))); else g.lineTo(C.x(X), C.y(wave(X))); }
      g.stroke();
      // a few light flecks drifting on the water
      g.fillStyle = 'rgba(255,255,255,0.22)';
      for (let i = 0; i < 9; i++) {
        const X = x0w + (((i * 61.7 + clock * 9) % 100) / 100) * (seaEnd - x0w), Y = -30 - ((i * 37) % 5) * 26;
        g.beginPath(); g.roundRect(C.x(X), C.y(Y), 16 * s + 4, 2.5 * s + 1, 2); g.fill();
      }
      g.restore();
    }
    // the land: a slab of ground, its top shifting from cool green to sunbaked amber as it warms
    if (shore !== 'none') {
      const from = shore === 'land' ? x0w : 18;
      const landPath = () => {
        g.beginPath();
        g.moveTo(C.x(from), C.y(shore === 'land' ? landAt(from) : -26));
        for (let X = from; X <= x1w; X += stepW) g.lineTo(C.x(X), C.y(landAt(X)));
        g.lineTo(C.x(x1w), h + 10); g.lineTo(C.x(from), h + 10); g.closePath();
      };
      const gk = Math.max(0, Math.min(1.1, groundC));
      g.fillStyle = mixHex(LAND.edgeCool, LAND.edgeWarm, gk); g.save(); g.translate(0, 6 * s); landPath(); g.fill(); g.restore();
      const soil = g.createLinearGradient(0, C.y(16), 0, C.y(-300));
      soil.addColorStop(0, mixHex(LAND.cool, LAND.warm, gk)); soil.addColorStop(0.08, mixHex(LAND.edgeCool, LAND.edgeWarm, gk)); soil.addColorStop(1, '#0e1440');
      g.fillStyle = soil; landPath(); g.fill();
      if (shore === 'right') {
        // a strip of sand where the sea meets the land
        g.fillStyle = LAND.sand; g.beginPath(); g.moveTo(C.x(18), C.y(-26)); g.lineTo(C.x(60), C.y(landAt(60))); g.lineTo(C.x(64), C.y(landAt(60) - 8)); g.lineTo(C.x(30), C.y(-30)); g.closePath(); g.fill();
      }
      // grass tufts and a couple of palms' silhouettes, so it reads as land at a glance
      g.save();
      g.fillStyle = mixHex('#7df0cf', '#ffd29a', gk);
      for (let X = Math.max(from, 80); X < x1w; X += 47) { const Y = landAt(X); g.beginPath(); g.ellipse(C.x(X), C.y(Y) - 1, 9 * s + 2, 3 * s + 1, 0, Math.PI, TAU); g.fill(); }
      g.restore();
    }

    // heat rising from a warm surface into the air: warm triangles, more of them the warmer it is
    if (L.heat > 0.01) {
      const span = shore === 'right' ? [70, 330] : shore === 'land' ? [-300, 300] : [colX - 220, colX + 220];
      const n = Math.round(motes.length * L.heat);
      for (let i = 0; i < n; i++) {
        const m = motes[i], k = (m.ph + clock * 0.34) % 1;
        const X = lerp(span[0], span[1], m.x) + Math.sin(m.wob + t * 1.2) * 6;
        const Y = surfaceAt(X, t) + 14 + k * 150;
        heat(g, C.x(X), C.y(Y), Math.max(4, 10 * s), -Math.PI / 2, L.heat * Math.sin(Math.PI * k));
      }
    }
    // where the beam lands: a bright patch, and heat rising from it, the same amount however wide the patch
    if (foot && L.beam > 0.01) {
      const [fx0, fx1] = foot;
      g.save();
      g.globalAlpha = L.beam;
      g.strokeStyle = 'rgba(255,224,130,0.95)'; g.lineWidth = Math.max(3, 8 * s); g.lineCap = 'round';
      g.beginPath(); g.moveTo(C.x(fx0), C.y(surfaceAt(fx0, t)) - 1); g.lineTo(C.x(fx1), C.y(surfaceAt(fx1, t)) - 1); g.stroke();
      g.restore();
      const n = 9;
      for (let i = 0; i < n; i++) {
        const k = (i * 0.37 + clock * 0.38) % 1, X = lerp(fx0, fx1, (i + 0.5) / n);
        heat(g, C.x(X), C.y(surfaceAt(X, t) + 12 + k * 110), Math.max(4, 10 * s), -Math.PI / 2, L.beam * Math.sin(Math.PI * k));
      }
    }

    // air rushing in along the surface toward the column, then turning up into it, on a two-second loop
    if (L.inflow > 0.01) {
      for (const side of sides) {
        for (const [lane, off] of [[34, 0], [84, 0.5]]) {
          const path = k => { const X = colX + side * lerp(360, 46, softEase(Math.min(1, k * 1.12))); return [X, (landAt(X) ?? 0) + lane + Math.pow(clamp01((k - 0.62) / 0.38), 2) * 210]; };
          const q = (clock * 0.5 + off) % 1, [hd, tl] = loopShare(q);
          air(g, along(path, tl, hd).map(P), { phase: clock * 1.4, w: aw, a: L.inflow * (1 - softEase(clamp01((q - 0.82) / 0.18))) });
        }
      }
    }

    // tiny drops of water: where the rising vapour turns back into water, under and into the cloud's base
    if (L.drops > 0.01) {
      g.save();
      const n = Math.round(40 * L.drops), base = BASE + 10 - (1 - Math.max(0.3, L.cloud)) * 40;
      for (let i = 0; i < n; i++) {
        const p = vap[i % vap.length];
        const k = (p.ph * 1.7 + clock * 0.16 + i * 0.013) % 1;
        const X = colX + p.x * 0.4 + Math.sin(p.sway + t * 0.8) * 10, Y = base - 80 + k * 100;
        const r = Math.max(1.4, (2.6 + (i % 3)) * s);
        g.globalAlpha = L.drops * Math.sin(Math.PI * k) * 0.95;
        g.fillStyle = '#5d79d6'; g.beginPath(); g.arc(C.x(X), C.y(Y) + r * 0.25, r, 0, TAU); g.fill();
        g.fillStyle = '#e4f6ff'; g.beginPath(); g.arc(C.x(X), C.y(Y), r * 0.85, 0, TAU); g.fill();
      }
      g.restore();
    }

    // a parcel of air: a bubble of air rising up the column, spreading as it climbs, its colour cooling and
    // its temperature on a tag counting down
    let parcelAt = null;
    if (parcel.on || parcel.out) {
      const born = softEase(clamp01((now - parcel.born) / 500)), gone = parcel.out ? 1 - clamp01((now - parcel.out.t0) / parcel.out.ms) : 1;
      const a = born * gone, hk = clamp01(parcel.h.at(now));
      if (a > 0.01) {
        const X = colX - 110, Y = lerp(70, BASE - 40, hk), rr = (44 + 30 * hk) * s;
        const px = C.x(X), py = C.y(Y);
        parcelAt = [X, Y];
        const tint = mixHex('#ffb86b', '#7fd6ff', hk);
        g.save();
        g.globalAlpha = a;
        const fillG = g.createRadialGradient(px, py, rr * 0.1, px, py, rr);
        fillG.addColorStop(0, rgbaHex(tint, 0.36)); fillG.addColorStop(1, rgbaHex(tint, 0.12));
        g.fillStyle = fillG; g.beginPath(); g.arc(px, py, rr, 0, TAU); g.fill();
        g.setLineDash([7, 7]); g.lineDashOffset = -clock * 10;
        g.strokeStyle = rgbaHex('#ffffff', 0.8); g.lineWidth = 2.4; g.beginPath(); g.arc(px, py, rr, 0, TAU); g.stroke();
        g.setLineDash([]);
        // a few of its molecules, spreading apart as it rises
        g.fillStyle = '#e8e4ff';
        for (let i = 0; i < 9; i++) {
          const ang = i * 2.4 + t * (0.7 + (i % 3) * 0.3), d = rr * (0.25 + 0.5 * ((i * 0.37) % 1)) * (0.8 + 0.2 * Math.sin(t * 1.3 + i));
          g.beginPath(); g.arc(px + Math.cos(ang) * d, py + Math.sin(ang) * d, Math.max(1.6, 3.2 * s), 0, TAU); g.fill();
        }
        chip(g, `${Math.round(parcel.temp.at(now))} °C`, px + rr + 34, py, { k: 1, width: w, gold: true });
        g.restore();
      }
    }

    // the air colder the higher it is: a strip down the right side, warm by the sea, icy up high
    if (L.cooling > 0.01) {
      const x = w - Math.max(22, w * 0.06), y0 = Math.min(C.y(0), h * 0.78), y1 = Math.max(topRoom + 30, C.y(1250));
      if (y0 - y1 > 60) {
        g.save();
        g.globalAlpha = L.cooling;
        const grad = g.createLinearGradient(0, y0, 0, y1);
        grad.addColorStop(0, '#ffa23a'); grad.addColorStop(0.35, '#ee4b7a'); grad.addColorStop(0.65, '#5a62d8'); grad.addColorStop(1, '#bfeaff');
        g.fillStyle = 'rgba(6,8,48,0.4)'; g.beginPath(); g.roundRect(x - 6 + 2, y1 + 3, 12, y0 - y1, 6); g.fill();
        g.fillStyle = grad; g.beginPath(); g.roundRect(x - 6, y1, 12, y0 - y1, 6); g.fill();
        g.font = '900 13px "Nunito", system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
        g.lineJoin = 'round'; g.lineWidth = 3.4; g.strokeStyle = 'rgba(10,14,50,0.8)';
        g.strokeText('Cold', x - 12, y1 + 10); g.fillStyle = '#d6f3ff'; g.fillText('Cold', x - 12, y1 + 10);
        g.strokeText('Warm', x - 12, y0 - 10); g.fillStyle = '#ffc27a'; g.fillText('Warm', x - 12, y0 - 10);
        g.restore();
      }
    }

    // the thermometer: its bulb in the sea, the tube up into the air, the liquid at the reading
    if (gauge.on || gauge.out) {
      const born = softEase(clamp01((now - gauge.born) / 600)), gone = gauge.out ? 1 - clamp01((now - gauge.out.t0) / gauge.out.ms) : 1;
      const a = born * gone, v = gauge.value.at(now);
      if (a > 0.01) {
        const gx = C.x(GAUGE.x), yb = C.y(GAUGE.bulb), yt = C.y(GAUGE.top), tw = Math.max(9, 22 * s), br = tw * 1.05;
        const k = clamp01((v - GAUGE.lo) / (GAUGE.hi - GAUGE.lo)), liquid = seaAt(clamp01((v - 14) / 16));
        const yl = lerp(yb - br, yt + tw / 2, k);
        g.save();
        g.globalAlpha = a;
        g.fillStyle = 'rgba(6,8,48,0.4)';
        g.beginPath(); g.roundRect(gx - tw / 2 + 3, yt + 4, tw, yb - yt, tw / 2); g.fill(); g.beginPath(); g.arc(gx + 3, yb + 4, br, 0, TAU); g.fill();
        g.fillStyle = '#eef3ff';
        g.beginPath(); g.roundRect(gx - tw / 2, yt, tw, yb - yt, tw / 2); g.fill(); g.beginPath(); g.arc(gx, yb, br, 0, TAU); g.fill();
        g.fillStyle = liquid;
        g.beginPath(); g.arc(gx, yb, br * 0.68, 0, TAU); g.fill();
        g.beginPath(); g.roundRect(gx - tw * 0.22, yl, tw * 0.44, yb - yl, tw * 0.22); g.fill();
        g.strokeStyle = '#7f88c8'; g.lineWidth = 2; g.lineCap = 'round';
        g.font = '800 11px "Nunito", system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#c8d0ff';
        for (let deg = GAUGE.lo; deg <= GAUGE.hi; deg += 5) {
          const y = lerp(yb - br, yt + tw / 2, (deg - GAUGE.lo) / (GAUGE.hi - GAUGE.lo));
          g.beginPath(); g.moveTo(gx - tw / 2 - 2, y); g.lineTo(gx - tw / 2 - (deg % 10 ? 6 : 10), y); g.stroke();
          if (deg % 10 === 0 && s > 0.45) g.fillText(String(deg), gx - tw / 2 - 13, y);
        }
        chip(g, `${Math.round(v)} ${gauge.unit}`.trim(), gx + tw / 2 + 34, yl, { k: 0.85 + 0.15 * born, width: w, gold: true });
        g.restore();
      }
    }

    // signs standing in the water or on the ground: a word or a number, the number counting when it changes
    let busy = false;
    for (const [where, sg] of signs) {
      const X = SIGN_AT[where] ?? 0, age = now - sg.born;
      const out = sg.out ? clamp01((now - sg.out.t0) / sg.out.ms) : 0;
      if (age < 900 || sg.out || (sg.num && sg.num.moving(now))) busy = true;
      const text = sg.num ? `${fmt(sg.num.at(now), sg.digits)}${sg.unit}` : sg.text;
      const footY = C.y(surfaceAt(X, t)) + 2;
      drawSign(g, C.x(X), footY, text, { age: sg.boardFrom ? age + 500 : age, h: Math.max(56, 120 * s), colour: sg.colour, out, width: w, scale: Math.max(0.8, Math.min(1.15, s * 1.5)) });
    }
    for (const [where, sg] of signs) if (sg.out && now >= sg.out.t0 + sg.out.ms) signs.delete(where);

    // built labels: a dot on the thing, a leader, a pill that unrolls with its name
    for (const [thing, tg] of tags) {
      const spot = spotOf(thing, { now, t, top, heart, outY, sunXY, foot, parcelAt });
      if (!spot) continue;
      const [X, Y, side, screen] = spot;
      const age = now - tg.born, out = tg.out ? clamp01((now - tg.out.t0) / tg.out.ms) : 0;
      if (age < 1200 || tg.out) busy = true;
      const px = screen ? X : C.x(X), py = screen ? Y : C.y(Y);
      drawLabel(g, px, py, tg.text, { age, side, out, width: w });
    }
    for (const [thing, tg] of tags) if (tg.out && now >= tg.out.t0 + tg.out.ms) tags.delete(thing);
    if (gauge.out && now >= gauge.out.t0 + gauge.out.ms) { gauge.out = null; gauge.on = false; }
    if (parcel.out && now >= parcel.out.t0 + parcel.out.ms) { parcel.out = null; parcel.on = false; }
    return busy;
  }

  // Where a named thing is, for a label to point at: world x, y and which side its pill goes.
  function spotOf(thing, { top, heart, outY, sunXY, foot, parcelAt }) {
    switch (thing) {
      case 'sea': return [shore === 'right' ? -150 : -150, -40, -1];
      case 'surface': return [shore === 'right' ? -120 : 150, 0, 1];
      case 'vapour': return [colX + (shore === 'right' ? -150 : -95), 170, -1];
      case 'air': return [-210, 330, -1];
      case 'rise': return [colX, 330, colX > 0 ? -1 : 1];
      case 'cloud': return [colX, Math.max(560, top - 60), 1];
      case 'heat': return [colX, heart, -1];
      case 'inflow': return [colX + sides[0] * 210, 46, sides[0] * -1 > 0 ? 1 : -1];
      case 'sun': return sunXY ? [sunXY[0], sunXY[1], 1, true] : null;
      case 'high': return [200, 800, 1];
      case 'rain': return [colX + 70, 230, 1];
      case 'drops': return [colX + 60, BASE - 40, 1];
      case 'land': return shore === 'none' ? null : [shore === 'right' ? 240 : 120, landAt(shore === 'right' ? 240 : 120) ?? 0, -1];
      case 'beam': return foot ? [(foot[0] + foot[1]) / 2, 4, 1] : null;
      case 'parcel': return parcelAt ? [parcelAt[0] - 40, parcelAt[1] + 40, -1] : null;
      case 'outflow': return [colX + (shore === 'right' ? -1 : 1) * 190, outY, shore === 'right' ? -1 : 1];
      case 'sink': return [shore === 'right' ? -170 : -290, 380, 1];
      default: return null;
    }
  }

  // While it's on screen it always moves (waves, puffs, the sun's rays), at the screen's own rate. Put away by a
  // scene's shot (an ancestor marked data-off), it draws nothing, but keeps its place in the frame loop so it's
  // up to date the moment it's shown again.
  function frame(now) {
    raf = 0;
    if (gone) return;
    if (canvas.closest('[data-off]')) { last = 0; wake(); return; }
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    frames++;
    draw(now, dt);
    wake();
  }
  function wake() { if (!raf && !gone) raf = requestAnimationFrame(frame); }

  const ro = new ResizeObserver(() => size());
  ro.observe(el);
  size();

  const ms = sec => Math.max(0, Number(sec) * 1000);
  const setLevel = k => (value = 1, seconds = 1) => {
    const v = k === 'rise' ? Math.max(0, Math.min(2, Number(value) || 0)) : clamp01(Number(value) || 0);
    lv[k].go(v, COLOURED.has(k) ? Math.max(ms(seconds), ms(seconds) > 0 ? MOTION.colour.ms : 0) : ms(seconds), performance.now());
    wake();
  };
  const calls = Object.fromEntries(LEVELS.map(k => [k, setLevel(k)]));
  Object.assign(calls, {
    view(where = 'wide', seconds = 1.4) {
      const v = VIEWS[where];
      if (!v) return;
      const now = performance.now();
      cam.forEach((c, i) => c.go(v[i], ms(seconds), now));
      wake();
    },
    tag(thing, text) {
      const now = performance.now(), old = tags.get(thing);
      if (!text) { if (old && !old.out) old.out = { t0: now, ms: 400 }; return; }
      tags.set(thing, { text: String(text), born: old && !old.out && old.text === String(text) ? old.born : now });
      wake();
    },
    // A sign standing on the surface at the left, the middle or the right, with a word or a number on its
    // board; called again with new words, its board pops again, and a number counts to the new one. No text:
    // it goes.
    sign(where = 'middle', text, colour = 'pink') {
      const now = performance.now(), old = signs.get(where);
      if (text === undefined || text === null || text === '' || text === false) { if (old && !old.out) old.out = { t0: now, ms: 420 }; wake(); return; }
      text = String(text);
      const num = numberIn(text), oldNum = old && !old.out ? numberIn(old.text) : null;
      const sg = { text, colour, born: now, out: null, num: null, unit: '', digits: 0 };
      if (old && !old.out) {
        sg.born = old.born;
        if (num && oldNum && num.unit === oldNum.unit) {
          sg.num = new Glide(oldNum.value); sg.num.go(num.value, 1100, now); sg.unit = num.unit; sg.digits = num.digits;
        } else {
          // new words: the board pops again on the same pole
          sg.boardFrom = true;
          sg.born = now;
        }
      }
      signs.set(where, sg);
      wake();
    },
    // A parcel of air rising up the column: height 0 at the surface to 1 at the cloud's base, gliding there over
    // seconds, with the temperature on its tag counting to `temperature`. With no height it goes.
    parcel(height, seconds = 1.6, temperature) {
      const now = performance.now();
      if (height === undefined || height === null || height === false) { if (parcel.on && !parcel.out) parcel.out = { t0: now, ms: 450 }; wake(); return; }
      if (!parcel.on || parcel.out) { parcel.h.go(clamp01(Number(height) || 0), 0, now); parcel.born = now; parcel.on = true; parcel.out = null; }
      parcel.h.go(clamp01(Number(height) || 0), ms(seconds), now);
      if (Number.isFinite(Number(temperature))) parcel.temp.go(Number(temperature), parcel.born === now ? 0 : ms(seconds), now);
      wake();
    },
    // The sun's angle above the horizon, in degrees (90 overhead), gliding there: its beam slants with it.
    sunAngle(degrees = 79, seconds = 1.4) { sunAngle.go(Math.max(8, Math.min(90, Number(degrees) || 79)), ms(seconds), performance.now()); wake(); },
    // The thermometer in the sea, reading `value` (its liquid glides there over seconds); with no value it goes.
    gauge(value, unit = '°C', seconds = 1) {
      const now = performance.now();
      if (value === undefined || value === null || value === false) {
        if (gauge.on && !gauge.out) gauge.out = { t0: now, ms: 450 };
        wake();
        return;
      }
      const v = Math.max(GAUGE.lo - 5, Math.min(GAUGE.hi + 5, Number(value) || 0));
      if (!gauge.on || gauge.out) {
        gauge.value.go(ms(seconds) > 0 ? Math.max(GAUGE.lo, v - 9) : v, 0, now);
        gauge.born = now; gauge.out = null; gauge.on = true;
      }
      gauge.unit = String(unit ?? '');
      gauge.value.go(v, ms(seconds), now);
      wake();
    },
    clear(seconds = 0.8) {
      const now = performance.now(), t = ms(seconds);
      for (const k of LEVELS) lv[k].go(0, t, now);
      const fade = it => { if (!it.out) it.out = { t0: now, ms: Math.max(1, t * 0.6) }; };
      for (const tg of tags.values()) fade(tg);
      for (const sg of signs.values()) fade(sg);
      if (!(t > 0)) { tags.clear(); signs.clear(); gauge.on = false; gauge.out = null; parcel.on = false; parcel.out = null; }
      else { if (gauge.on && !gauge.out) gauge.out = { t0: now, ms: Math.max(1, t * 0.6) }; if (parcel.on && !parcel.out) parcel.out = { t0: now, ms: Math.max(1, t * 0.6) }; }
      wake();
    },
  });

  return {
    calls,
    state: () => ({ ...Object.fromEntries(LEVELS.map(k => [k, Math.round(lv[k].to * 100) / 100])), signs: [...signs].filter(([, sg]) => !sg.out).map(([k, sg]) => `${k}:${sg.text}`) }),
    on: () => () => {},
    busy: () => !!raf,
    finish() {
      const now = performance.now();
      for (const k of LEVELS) lv[k].go(lv[k].to, 0, now);
      sunAngle.go(sunAngle.to, 0, now);
      cam.forEach(c => c.go(c.to, 0, now));
      for (const [k, tg] of tags) { if (tg.out) tags.delete(k); else tg.born = now - 60000; }
      for (const [k, sg] of signs) { if (sg.out) signs.delete(k); else { sg.born = now - 60000; delete sg.boardFrom; if (sg.num) sg.num.go(sg.num.to, 0, now); } }
      gauge.value.go(gauge.value.to, 0, now);
      if (gauge.out) { gauge.out = null; gauge.on = false; } else gauge.born = now - 60000;
      parcel.h.go(parcel.h.to, 0, now); parcel.temp.go(parcel.temp.to, 0, now);
      if (parcel.out) { parcel.out = null; parcel.on = false; } else parcel.born = now - 60000;
      wake();
    },
    debug: () => ({ frames, levels: Object.fromEntries(LEVELS.map(k => [k, Math.round(lv[k].at(performance.now()) * 1000) / 1000])), tags: [...tags].map(([k, tg]) => ({ thing: k, text: tg.text, fading: !!tg.out })),
      signs: [...signs].map(([k, sg]) => ({ where: k, text: sg.text, fading: !!sg.out })), shore, sunAngle: Math.round(sunAngle.at(performance.now())),
      parcel: parcel.on && !parcel.out ? { height: Math.round(parcel.h.at(performance.now()) * 100) / 100, temperature: Math.round(parcel.temp.at(performance.now())) } : null,
      gauge: gauge.on && !gauge.out ? { value: Math.round(gauge.value.at(performance.now()) * 10) / 10, unit: gauge.unit } : null,
      view: cam.map(c => Math.round(c.at(performance.now()))), soft: ctx.motion === 'soft' }),
    remove() {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      canvas.remove();
      probe.remove();
    },
  };
}

// A number at the start of a sign's words, with the rest as its unit: "27 °C" -> 27, " °C".
function numberIn(text) {
  const m = /^(-?\d+(?:\.(\d+))?)(.*)$/.exec(String(text || ''));
  return m ? { value: Number(m[1]), digits: m[2] ? m[2].length : 0, unit: m[3] } : null;
}
const fmt = (v, digits) => (digits ? v.toFixed(digits) : String(Math.round(v)));
