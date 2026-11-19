// The Section: a slice of sea and the air above it, seen from the side, in the house's flat look. One
// picture for anything that happens between the sea and the sky: the sun warming the water, water vapour
// rising, air going up and coming in along the surface, a cloud building into a storm cloud, the heat it
// gives back, rain. Every one of those is a level from 0 to 1 that glides where it's sent (js/ease.js,
// Glide), so a scene can turn them up and down on its words, or drive one across a stretch ($p). Tags put
// a name on a thing with a line to it. Its camera moves between a few framings (the whole slice, the sea,
// the surface, the air, the cloud).
//
// What it shows is the mechanism, not just the place: heat carried up with the vapour as warm sparks on the
// wisps (carry), the air getting colder with height on a strip down the side (cooling), the vapour turning
// into tiny drops under the cloud (drops), a thermometer standing in the sea reading its warmth (gauge), and
// days going by as the sun crosses the sky again and again (days).
//
// Drawing: the world is in units, x across from the middle of the slice (the column of rising air at 0),
// y up from the sea's surface (the sea floor is at -320, the cloud tops near 860). The camera fits a
// framing into the box and the sky and sea run on past it either side, so it fills any shape: the whole
// screen, half of a split, or a small inset. No blur: glows are gradients, shadows offset copies.
//
// mount(el, settings, ctx) -> { calls, state, on, remove, busy, finish, debug }.

import { Glide, soft as softEase, clamp01, lerp, rng } from '../../js/ease.js';
import { chip } from '../map/marks.js';
import { mix, rgba } from '../map/look.js';

const TAU = Math.PI * 2;
// where the sun sits: top left, inside the picture on a phone held upright
const SUN = [-175, 900];
const LEVELS = ['sun', 'warm', 'vapour', 'rise', 'cloud', 'release', 'inflow', 'rain', 'carry', 'drops', 'cooling', 'days'];
// The framings: the middle of what's shown and how much of it, in world units [x, y, width, height].
export const VIEWS = {
  wide: [0, 330, 600, 1240],
  sea: [0, -110, 520, 520],
  surface: [0, 90, 520, 560],
  air: [0, 330, 620, 760],
  cloud: [0, 620, 700, 620],
  top: [0, 820, 760, 520],
};
// Where each thing is, for a tag's line to point at, and which side its name goes.
const SPOTS = {
  sea: [[-150, -34], -1], surface: [[150, 0], 1], vapour: [[-95, 170], -1], air: [[-210, 330], -1], rise: [[0, 330], 1],
  cloud: [[0, 'top'], 1], heat: [[0, 'heart'], -1], inflow: [[230, 46], 1], sun: [['sun', 'sun'], 1], high: [[200, 800], 1], rain: [[70, 230], 1],
  drops: [[60, 405], 1],
};
// The thermometer: where it stands (its bulb in the sea, its tube up into the air) and its scale.
const GAUGE = { x: -150, bulb: -46, top: 290, lo: 10, hi: 35 };
// The sea from cool to warm: the globe's own warmth colours (look.js, SST), so the two always agree.
const SEA_RAMP = ['#2f4fc0', '#3b3db8', '#8b3fbf', '#ee4b7a', '#ffa23a'];
const seaAt = k => { k = clamp01(k) * (SEA_RAMP.length - 1); const i = Math.min(SEA_RAMP.length - 2, Math.floor(k)); return mix(SEA_RAMP[i], SEA_RAMP[i + 1], k - i); };

export async function mount(el, settings, ctx = {}) {
  const S = settings;
  const canvas = document.createElement('canvas');
  canvas.className = 'pg-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'The sea and the air above it, from the side');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  el.append(canvas);
  const g = canvas.getContext('2d');

  const now0 = performance.now();
  const lv = Object.fromEntries(LEVELS.map(k => [k, new Glide(Number(S[k]) || 0)]));
  const startView = VIEWS[S.view] || VIEWS.wide;
  const cam = startView.map(v => new Glide(v));
  const tags = new Map();   // thing -> { text, born, out }
  // the thermometer: its reading glides; shown or not
  const gauge = { value: new Glide(20), unit: '°C', born: 0, out: null, on: false };
  // the sun crossing the sky, once a day, while days pass (days): how far through the day it is
  let dayPhase = 0.35;
  let w = 0, h = 0, dpr = 1, raf = 0, gone = false, last = 0, frames = 0, flow = 0, swirl = 0;

  // The cloud: puffs, made once from a seeded random, in rows from its flat base up, each row as wide as the
  // tower bulges there, each puff with the level at which it appears. The top rows spread into the anvil.
  const R = rng(7);
  const puffs = [];
  const ROWS = 10;
  for (let r = 0; r < ROWS; r++) {
    const hk = r / (ROWS - 1), y = 470 + hk * 400;
    const half = 62 + 52 * Math.sin(Math.PI * Math.min(1, 0.25 + hk * 0.9));
    const n = 2 + Math.round(half / 42);
    for (let i = 0; i < n; i++) {
      const sx = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      puffs.push({ x: sx * half + (R() - 0.5) * 20, y: y + (R() - 0.5) * 22 + (1 - sx * sx) * 16, r: 36 + R() * 18 + (1 - Math.abs(sx)) * 14, need: 0.06 + hk * 0.76 + Math.abs(sx) * 0.03, ph: R() * TAU });
    }
  }
  for (let i = 0; i < 16; i++) {
    const sx = (i / 15) * 2 - 1;
    puffs.push({ x: sx * 300 + (R() - 0.5) * 30, y: 900 + (R() - 0.5) * 18 - Math.abs(sx) * 22, r: 30 + R() * 14, need: 0.86 + Math.abs(sx) * 0.12, ph: R() * TAU });
  }
  // vapour: a fixed set of wisps, each on its own loop up from the sea
  const wisps = Array.from({ length: 56 }, (_, i) => ({ x: (R() - 0.5) * 2 * 330, ph: R(), sway: R() * TAU, r: 4 + R() * 5, warm: i % 3 === 0 }));

  // How far down the picture is clear of the status bar in a scene (its --top).
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:var(--top, 0px);visibility:hidden;pointer-events:none';
  el.append(probe);
  let topRoom = 0;
  const topPad = () => topRoom;

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
  const cloudTop = c => 440 + Math.max(0.1, c) * 450;

  function draw(now, dt) {
    const C = camera(now), { s } = C;
    const t = now / 1000;
    const L = Object.fromEntries(LEVELS.map(k => [k, k === 'rise' ? Math.max(0, lv.rise.at(now)) : level(k, now)]));
    flow += (dt / 1000) * (0.25 + L.rise * 1.1);
    swirl += dt / 1000;
    dayPhase = (dayPhase + (dt / 1000) * L.days * 0.9) % 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sea0 = C.y(0);

    // the sky: deep at the top, lighter toward the sea; a faint warmth over a warm sea
    const sky = g.createLinearGradient(0, C.y(1100), 0, sea0);
    sky.addColorStop(0, '#11174a'); sky.addColorStop(0.55, '#222d7a'); sky.addColorStop(1, mix('#3b51b4', '#7b4fb0', L.warm * 0.35));
    g.fillStyle = sky; g.fillRect(0, 0, w, Math.max(0, sea0) + 2);

    // the sun, top left, its rays turning slowly; light falling on the sea
    const sunAt = () => {
      const fx = C.x(SUN[0]), fy = C.y(SUN[1]);
      if (L.days <= 0.001) return [fx, fy];
      // across the top of the picture, rising on the left and setting on the right
      const q = dayPhase, ax = lerp(-0.12, 1.12, q) * w, ay = Math.max(70, h * 0.06 + topPad()) + (1 - Math.sin(Math.PI * q)) * h * 0.2;
      return [lerp(fx, ax, L.days), lerp(fy, ay, L.days)];
    };
    if (L.sun > 0.01) {
      const [sx, sy] = sunAt(), sr = Math.max(14, 46 * s) * (0.7 + 0.3 * L.sun);
      g.save();
      g.globalAlpha = L.sun;
      const halo = g.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 4.2);
      halo.addColorStop(0, 'rgba(255,214,110,0.42)'); halo.addColorStop(1, 'rgba(255,214,110,0)');
      g.fillStyle = halo; g.beginPath(); g.arc(sx, sy, sr * 4.2, 0, TAU); g.fill();
      g.fillStyle = '#ffd062';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t * 0.12;
        g.beginPath();
        g.moveTo(sx + Math.cos(a - 0.09) * sr * 1.25, sy + Math.sin(a - 0.09) * sr * 1.25);
        g.lineTo(sx + Math.cos(a) * sr * 1.75, sy + Math.sin(a) * sr * 1.75);
        g.lineTo(sx + Math.cos(a + 0.09) * sr * 1.25, sy + Math.sin(a + 0.09) * sr * 1.25);
        g.fill();
      }
      g.fillStyle = '#c98a00'; g.beginPath(); g.arc(sx, sy + 3, sr, 0, TAU); g.fill();
      g.fillStyle = '#ffc83d'; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill();
      // beams: wide pale wedges down to the sea
      g.globalAlpha = L.sun * 0.12;
      g.fillStyle = '#ffe9a8';
      for (let i = 0; i < 3; i++) {
        const x0 = C.x(-120 + i * 170 + Math.sin(t * 0.3 + i) * 10);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(x0 - 40 * s, sea0); g.lineTo(x0 + 40 * s, sea0); g.closePath(); g.fill();
      }
      g.restore();
    }

    // heat given back: a warm glow round the cloud's heart, pulsing gently
    const top = cloudTop(L.cloud), heart = 440 + (top - 440) * 0.45;
    if (L.release > 0.01) {
      const hx = C.x(0), hy = C.y(heart), hr = (170 + 60 * L.cloud) * s * (1 + 0.05 * Math.sin(t * 2.1));
      const glow = g.createRadialGradient(hx, hy, hr * 0.1, hx, hy, hr * 1.6);
      glow.addColorStop(0, rgba('#ffa23a', 0.5 * L.release)); glow.addColorStop(0.5, rgba('#ee4b7a', 0.18 * L.release)); glow.addColorStop(1, rgba('#ee4b7a', 0));
      g.fillStyle = glow; g.beginPath(); g.arc(hx, hy, hr * 1.6, 0, TAU); g.fill();
    }

    // rising air: broad soft chevrons climbing the column, faster the stronger it rises
    if (L.rise > 0.01) {
      g.save();
      g.globalAlpha = Math.min(1, L.rise) * 0.55;
      g.strokeStyle = mix('#9fe3ff', '#ffd9a8', clamp01(L.release * (L.rise - 1))); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(2.6, 10 * s);
      for (let i = 0; i < 7; i++) {
        const y = ((flow * 0.9 + i / 7) % 1) * (Math.max(560, top) - 60) + 60;
        const a = Math.sin(Math.PI * clamp01((y - 60) / (Math.max(560, top) - 60)));
        g.globalAlpha = Math.min(1, L.rise) * 0.7 * a;
        const cx = C.x(0), cy = C.y(y), d = 44 * s;
        g.beginPath(); g.moveTo(cx - d * 1.4, cy + d * 0.7); g.lineTo(cx, cy - d * 0.2); g.lineTo(cx + d * 1.4, cy + d * 0.7); g.stroke();
      }
      g.restore();
    }

    // water vapour: little wavy wisps rising from the sea, drawn toward the column as the air rises; a third
    // of them carry a warm spark when the sea is warm (the heat going up with it)
    if (L.vapour > 0.01) {
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      const n = Math.round(wisps.length * L.vapour);
      for (let i = 0; i < n; i++) {
        const p = wisps[i];
        const k = (p.ph + flow * (0.32 + 0.3 * L.rise)) % 1;              // 0 at the sea, 1 at the cloud base
        const pull = clamp01(L.rise) * softEase(k);
        const x = lerp(p.x, p.x * 0.18, pull) + Math.sin(p.sway + t * 1.3 + k * 4) * 8;
        const y = 10 + k * (L.cloud > 0.05 ? 430 : 520);
        const a = Math.min(1, k * 5) * (1 - softEase(clamp01((k - 0.68) / 0.32)));
        const px = C.x(x), py = C.y(y), len = (14 + p.r * 2) * s * (1 + k * 0.5);
        g.globalAlpha = a * 0.8;
        g.strokeStyle = '#e4f6ff'; g.lineWidth = Math.max(1.4, 3.4 * s);
        g.beginPath();
        for (let j = 0; j <= 8; j++) {
          const q = j / 8, xx = px + Math.sin(q * TAU * 0.9 + t * 2.4 + p.sway) * 3.2 * s, yy = py - q * len;
          if (j) g.lineTo(xx, yy); else g.moveTo(xx, yy);
        }
        g.stroke();
        // the heat it carries: a warm spark riding the wisp, bigger and on every wisp once it's pointed out
        const spark = Math.max(p.warm && L.warm > 0.45 ? clamp01((L.warm - 0.45) / 0.4) * 0.6 : 0, L.carry);
        if (spark > 0.01) {
          const sr = Math.max(1.6, (3.6 + 3.4 * L.carry) * s);
          g.globalAlpha = a * spark * 0.35;
          g.fillStyle = '#ffb347';
          g.beginPath(); g.arc(px, py + 3 * s, sr * 2.2, 0, TAU); g.fill();
          g.globalAlpha = a * spark;
          g.fillStyle = '#ffa23a';
          g.beginPath(); g.arc(px, py + 3 * s, sr, 0, TAU); g.fill();
          g.fillStyle = '#ffe1a8';
          g.beginPath(); g.arc(px - sr * 0.3, py + 3 * s - sr * 0.3, sr * 0.4, 0, TAU); g.fill();
        }
      }
      g.restore();
    }

    // the cloud: puffs, each growing in as the level reaches it, boiling gently, cut flat along its base; a
    // lavender underside and a flat shadow
    if (L.cloud > 0.01) {
      const shown = puffs.map(p => ({ p, k: softEase(clamp01((L.cloud - p.need) / 0.12)) })).filter(x => x.k > 0.01);
      const lift = (1 - L.cloud) * 50, baseY = C.y(450 - lift);
      const at = ({ p, k }) => [C.x(p.x * (0.75 + 0.25 * L.cloud)), C.y(p.y - lift), Math.max(1, p.r * s * k * (1 + 0.04 * Math.sin(t * 0.9 + p.ph)))];
      g.save();
      g.beginPath(); g.rect(0, -10, w, baseY + 10); g.clip();
      g.fillStyle = 'rgba(8,10,46,0.26)';
      for (const x of shown) { const [px, py, r] = at(x); g.beginPath(); g.arc(px + 5 * s, py + 10 * s, r, 0, TAU); g.fill(); }
      g.fillStyle = '#9eaae6';
      for (const x of shown) { const [px, py, r] = at(x); g.beginPath(); g.arc(px, py + 8 * s, r, 0, TAU); g.fill(); }
      // each puff in the cloud's shade, then lit from the top left, so the cloud reads as round billows
      g.fillStyle = '#d3daf8';
      for (const x of shown) { const [px, py, r] = at(x); g.beginPath(); g.arc(px, py, r * 0.96, 0, TAU); g.fill(); }
      g.fillStyle = '#ffffff';
      for (const x of shown) { const [px, py, r] = at(x); g.beginPath(); g.arc(px - r * 0.14, py - r * 0.17, r * 0.8, 0, TAU); g.fill(); }
      g.restore();
      // the flat base, in the cloud's shade
      const half = Math.max(0, ...shown.filter(x => x.p.y < 560).map(x => { const [px, , r] = at(x); return Math.abs(px - C.x(0)) + r * 0.8; }));
      if (half > 0) { g.fillStyle = '#aeb9ee'; g.beginPath(); g.roundRect(C.x(0) - half, baseY - 10 * s, half * 2, 10 * s, 5 * s); g.fill(); }
    }

    // heat given back, as little warm arrows leaving the cloud
    if (L.release > 0.01) {
      g.save();
      g.strokeStyle = '#ffb347'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(2.2, 8 * s);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.3, k = (swirl * 0.45 + i * 0.37) % 1;
        const r0 = (90 + 220 * k) * (0.7 + 0.3 * L.cloud);
        const x = Math.cos(a) * r0, y = heart + Math.sin(a) * r0 * 0.8;
        g.globalAlpha = L.release * Math.sin(Math.PI * k);
        const px = C.x(x), py = C.y(y), ux = Math.cos(a), uy = -Math.sin(a) * 0.8, d = 22 * s;
        g.beginPath(); g.moveTo(px - ux * d - uy * d * 0.7, py - uy * d + ux * d * 0.7); g.lineTo(px, py); g.lineTo(px - ux * d + uy * d * 0.7, py - uy * d - ux * d * 0.7); g.stroke();
      }
      g.restore();
    }

    // rain: soft streaks under the cloud
    if (L.rain > 0.01 && L.cloud > 0.2) {
      g.save();
      g.strokeStyle = 'rgba(190,226,255,0.7)'; g.lineCap = 'round'; g.lineWidth = Math.max(1.2, 3 * s);
      const n = Math.round(40 * L.rain);
      for (let i = 0; i < n; i++) {
        const x = ((i * 37) % 100 - 50) * (2.6 + L.cloud * 1.6), k = ((swirl * 1.3) + (i * 0.618)) % 1;
        const y = 420 - k * 420;
        g.globalAlpha = L.rain * 0.8;
        g.beginPath(); g.moveTo(C.x(x - 6), C.y(y + 26)); g.lineTo(C.x(x), C.y(y)); g.stroke();
      }
      g.restore();
    }

    // the sea: its surface warmth on top, deep blue below, gentle waves along the surface
    const wave = X => Math.sin(X / 70 + t * 1.1) * 5 + Math.sin(X / 31 - t * 0.7) * 2;
    const seaPath = () => {
      g.beginPath();
      const step = Math.max(4, 6 / s);
      const x0 = C.cx - w / 2 / s - 20, x1 = C.cx + w / 2 / s + 20;
      g.moveTo(C.x(x0), C.y(wave(x0)));
      for (let X = x0; X <= x1; X += step) g.lineTo(C.x(X), C.y(wave(X)));
      g.lineTo(w + 10, h + 10); g.lineTo(-10, h + 10); g.closePath();
    };
    const body = g.createLinearGradient(0, sea0, 0, C.y(-340));
    const warmC = seaAt(L.warm);
    body.addColorStop(0, warmC); body.addColorStop(0.16, mix(warmC, '#1b2a80', 0.35)); body.addColorStop(0.32, '#1b2a80'); body.addColorStop(1, '#0c1252');
    g.save();
    g.fillStyle = mix(warmC, '#0a0e2e', 0.45);
    g.translate(0, -5 * s); seaPath(); g.fill();   // a lit lip above the surface, like the land's rim
    g.restore();
    g.fillStyle = body; seaPath(); g.fill();
    g.save();
    g.strokeStyle = rgba('#ffffff', 0.35); g.lineWidth = Math.max(1, 2.5 * s);
    g.beginPath();
    for (let X = C.cx - w / 2 / s - 20, first = true; X <= C.cx + w / 2 / s + 20; X += Math.max(4, 6 / s), first = false) {
      if (first) g.moveTo(C.x(X), C.y(wave(X))); else g.lineTo(C.x(X), C.y(wave(X)));
    }
    g.stroke();
    g.restore();
    // heat shimmer just above a warm sea
    if (L.warm > 0.55) {
      g.save();
      g.strokeStyle = '#ffd062'; g.lineCap = 'round'; g.lineWidth = Math.max(1.2, 3 * s);
      for (let i = 0; i < 6; i++) {
        const X = -260 + i * 104, k = (swirl * 0.5 + i * 0.29) % 1;
        g.globalAlpha = clamp01((L.warm - 0.55) / 0.3) * Math.sin(Math.PI * k) * 0.7;
        g.beginPath();
        for (let j = 0; j <= 8; j++) { const Y = 18 + k * 60 + j * 5; const xx = C.x(X + Math.sin(j * 0.9 + t * 3 + i) * 6); if (j) g.lineTo(xx, C.y(Y)); else g.moveTo(xx, C.y(Y)); }
        g.stroke();
      }
      g.restore();
    }

    // air rushing in along the sea toward the column, then turning up into it
    if (L.inflow > 0.01) {
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const side of [-1, 1]) {
        const path = k => { // from out at the side, along the surface, curving up near the middle
          const X = side * lerp(330, 40, softEase(Math.min(1, k * 1.15)));
          const Y = 44 + Math.pow(clamp01((k - 0.62) / 0.38), 2) * 210;
          return [X, Y];
        };
        g.strokeStyle = rgba('#7fe0ff', 0.45 * L.inflow); g.lineWidth = Math.max(2.6, 9 * s);
        g.beginPath();
        for (let j = 0; j <= 40; j++) { const [X, Y] = path(j / 40); if (j) g.lineTo(C.x(X), C.y(Y)); else g.moveTo(C.x(X), C.y(Y)); }
        g.stroke();
        g.fillStyle = '#bff0ff';
        for (let i = 0; i < 4; i++) {
          const k = (flow * 0.55 + i / 4) % 1, [X, Y] = path(k), [X2, Y2] = path(Math.min(1, k + 0.02));
          let dx = C.x(X2) - C.x(X), dy = C.y(Y2) - C.y(Y); const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
          const px = C.x(X), py = C.y(Y), d = Math.max(7, 20 * s);
          g.globalAlpha = L.inflow * Math.sin(Math.PI * k);
          g.beginPath(); g.moveTo(px + dx * d, py + dy * d); g.lineTo(px - dx * d * 0.6 - dy * d * 0.8, py - dy * d * 0.6 + dx * d * 0.8); g.lineTo(px - dx * d * 0.6 + dy * d * 0.8, py - dy * d * 0.6 - dx * d * 0.8); g.closePath(); g.fill();
        }
      }
      g.restore();
    }

    // tiny drops of water: where the rising vapour turns back into water, under and into the cloud's base
    if (L.drops > 0.01) {
      g.save();
      const n = Math.round(46 * L.drops), base = 470 - (1 - Math.max(0.3, L.cloud)) * 50;
      for (let i = 0; i < n; i++) {
        const p = wisps[i % wisps.length];
        const k = (p.ph * 1.7 + flow * 0.18 + i * 0.013) % 1;
        const x = (p.x * 0.42) + Math.sin(p.sway + t * 0.8) * 10, y = base - 90 + k * 110;
        const r = Math.max(1.6, (3 + (i % 3)) * s);
        g.globalAlpha = L.drops * Math.sin(Math.PI * k) * 0.95;
        g.fillStyle = '#5d79d6'; g.beginPath(); g.arc(C.x(x), C.y(y) + r * 0.25, r, 0, TAU); g.fill();
        g.fillStyle = '#d8f2ff'; g.beginPath(); g.arc(C.x(x), C.y(y), r * 0.85, 0, TAU); g.fill();
      }
      g.restore();
    }

    // the air colder the higher it is: a strip down the right side, warm by the sea, icy up high
    if (L.cooling > 0.01) {
      const x = w - Math.max(22, w * 0.06), y0 = Math.min(C.y(0), h * 0.78), y1 = Math.max(topPad() + 30, C.y(1250));
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

    // the thermometer: its bulb in the sea, the tube up into the air, the liquid at the reading, the
    // reading on a plate beside it
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
        // its scale: a tick every 5 degrees, numbered every 10
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

    // tags: a name on a plate, with a line to the thing
    let busy = false;
    for (const [thing, tg] of tags) {
      const spot = SPOTS[thing];
      if (!spot) continue;
      let [[X, Y], side] = spot;
      if (X === 'sun') { [X, Y] = SUN; }
      if (thing === 'drops') Y = 470 - (1 - Math.max(0.3, level('cloud', now))) * 50 - 50;
      if (Y === 'top') Y = Math.max(560, top - 60);
      if (Y === 'heart') Y = heart;
      const born = softEase(clamp01((now - tg.born) / 600)), gone = tg.out ? 1 - clamp01((now - tg.out.t0) / tg.out.ms) : 1;
      const a = born * gone;
      if (born < 1 || tg.out) busy = true;
      if (a <= 0.01) continue;
      const px = C.x(X), py = C.y(Y);
      const cx = Math.max(60, Math.min(w - 60, px + side * Math.min(110, w * 0.22))), cy = py - 42;
      g.save();
      g.globalAlpha = a;
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px, py); g.lineTo(cx, cy + 12); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px, py, 4, 0, TAU); g.fill();
      chip(g, tg.text, cx, cy, { k: 0.85 + 0.15 * born, width: w });
      g.restore();
    }
    for (const [thing, tg] of tags) if (tg.out && now >= tg.out.t0 + tg.out.ms) tags.delete(thing);
    if (gauge.out && now >= gauge.out.t0 + gauge.out.ms) { gauge.out = null; gauge.on = false; }
    return busy;
  }

  // While it's on screen it always moves (waves, wisps, the sun's rays), at the screen's own rate. Put away by
  // a scene's shot (an ancestor marked data-off), it draws nothing, but keeps its place in the frame loop so
  // it's up to date the moment it's shown again.
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
  const setLevel = k => (value = 1, seconds = 1) => { lv[k].go(k === 'rise' ? Math.max(0, Math.min(2, Number(value) || 0)) : clamp01(Number(value) || 0), ms(seconds), performance.now()); wake(); };
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
      if (!SPOTS[thing]) return;
      const now = performance.now(), old = tags.get(thing);
      if (!text) { if (old && !old.out) old.out = { t0: now, ms: 400 }; return; }
      tags.set(thing, { text: String(text), born: old && !old.out ? old.born : now });
      wake();
    },
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
        // a new thermometer starts a little below its reading and rises to it
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
      for (const tg of tags.values()) if (!tg.out) tg.out = { t0: now, ms: Math.max(1, t * 0.6) };
      if (!(t > 0)) { tags.clear(); gauge.on = false; gauge.out = null; } else if (gauge.on && !gauge.out) gauge.out = { t0: now, ms: Math.max(1, t * 0.6) };
      wake();
    },
  });

  return {
    calls,
    state: () => Object.fromEntries(LEVELS.map(k => [k, Math.round(lv[k].to * 100) / 100])),
    on: () => () => {},
    busy: () => !!raf,
    finish() {
      const now = performance.now();
      for (const k of LEVELS) lv[k].go(lv[k].to, 0, now);
      cam.forEach(c => c.go(c.to, 0, now));
      for (const [k, tg] of tags) { if (tg.out) tags.delete(k); else tg.born = now - 60000; }
      gauge.value.go(gauge.value.to, 0, now);
      if (gauge.out) { gauge.out = null; gauge.on = false; } else gauge.born = now - 60000;
      wake();
    },
    debug: () => ({ frames, levels: Object.fromEntries(LEVELS.map(k => [k, Math.round(lv[k].at(performance.now()) * 1000) / 1000])), tags: [...tags].map(([k, tg]) => ({ thing: k, text: tg.text, fading: !!tg.out })),
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
