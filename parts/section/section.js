// The Section: a slice of sea and the air above it, seen from the side, in the house's flat look. One
// picture for anything that happens between the sea and the sky: the sun warming the water, water vapour
// rising, air going up and coming in along the surface, a cloud building into a storm cloud, the heat it
// gives back, rain. Every one of those is a level from 0 to 1 that glides where it's sent (js/ease.js,
// Glide), so a scene can turn them up and down on its words, or drive one across a stretch ($p). Tags put
// a name on a thing with a line to it. Its camera moves between a few framings (the whole slice, the sea,
// the surface, the air, the cloud).
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
const LEVELS = ['sun', 'warm', 'vapour', 'rise', 'cloud', 'release', 'inflow', 'rain'];
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
};
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

  function size() {
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
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sea0 = C.y(0);

    // the sky: deep at the top, lighter toward the sea; a faint warmth over a warm sea
    const sky = g.createLinearGradient(0, C.y(1100), 0, sea0);
    sky.addColorStop(0, '#11174a'); sky.addColorStop(0.55, '#222d7a'); sky.addColorStop(1, mix('#3b51b4', '#7b4fb0', L.warm * 0.35));
    g.fillStyle = sky; g.fillRect(0, 0, w, Math.max(0, sea0) + 2);

    // the sun, top left, its rays turning slowly; light falling on the sea
    if (L.sun > 0.01) {
      const sx = C.x(SUN[0]), sy = C.y(SUN[1]), sr = 46 * s * (0.7 + 0.3 * L.sun);
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
      g.strokeStyle = '#9fe3ff'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(2, 7 * s);
      for (let i = 0; i < 7; i++) {
        const y = ((flow * 0.9 + i / 7) % 1) * (Math.max(560, top) - 60) + 60;
        const a = Math.sin(Math.PI * clamp01((y - 60) / (Math.max(560, top) - 60)));
        g.globalAlpha = Math.min(1, L.rise) * 0.5 * a;
        const cx = C.x(0), cy = C.y(y), d = 34 * s;
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
        if (p.warm && L.warm > 0.45) {
          g.globalAlpha = a * clamp01((L.warm - 0.45) / 0.4);
          g.fillStyle = '#ffa23a';
          g.beginPath(); g.arc(px, py + 3 * s, Math.max(1.4, 3.6 * s), 0, TAU); g.fill();
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
      g.fillStyle = '#aeb9ee';
      for (const x of shown) { const [px, py, r] = at(x); g.beginPath(); g.arc(px, py + 8 * s, r, 0, TAU); g.fill(); }
      g.fillStyle = '#ffffff';
      for (const x of shown) { const [px, py, r] = at(x); g.beginPath(); g.arc(px, py, r * 0.96, 0, TAU); g.fill(); }
      g.restore();
      // the flat base, in the cloud's shade
      const half = Math.max(0, ...shown.filter(x => x.p.y < 560).map(x => { const [px, , r] = at(x); return Math.abs(px - C.x(0)) + r * 0.8; }));
      if (half > 0) { g.fillStyle = '#aeb9ee'; g.beginPath(); g.roundRect(C.x(0) - half, baseY - 10 * s, half * 2, 10 * s, 5 * s); g.fill(); }
    }

    // heat given back, as little warm arrows leaving the cloud
    if (L.release > 0.01) {
      g.save();
      g.strokeStyle = '#ffb347'; g.lineCap = 'round'; g.lineWidth = Math.max(1.6, 5 * s);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.3, k = (swirl * 0.45 + i * 0.37) % 1;
        const r0 = (90 + 220 * k) * (0.7 + 0.3 * L.cloud);
        const x = Math.cos(a) * r0, y = heart + Math.sin(a) * r0 * 0.8;
        g.globalAlpha = L.release * Math.sin(Math.PI * k) * 0.9;
        const px = C.x(x), py = C.y(y), ux = Math.cos(a), uy = -Math.sin(a) * 0.8, d = 14 * s;
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
        g.strokeStyle = rgba('#7fe0ff', 0.32 * L.inflow); g.lineWidth = Math.max(2, 6 * s);
        g.beginPath();
        for (let j = 0; j <= 40; j++) { const [X, Y] = path(j / 40); if (j) g.lineTo(C.x(X), C.y(Y)); else g.moveTo(C.x(X), C.y(Y)); }
        g.stroke();
        g.fillStyle = '#bff0ff';
        for (let i = 0; i < 4; i++) {
          const k = (flow * 0.55 + i / 4) % 1, [X, Y] = path(k), [X2, Y2] = path(Math.min(1, k + 0.02));
          let dx = C.x(X2) - C.x(X), dy = C.y(Y2) - C.y(Y); const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
          const px = C.x(X), py = C.y(Y), d = 13 * s;
          g.globalAlpha = L.inflow * Math.sin(Math.PI * k);
          g.beginPath(); g.moveTo(px + dx * d, py + dy * d); g.lineTo(px - dx * d * 0.6 - dy * d * 0.8, py - dy * d * 0.6 + dx * d * 0.8); g.lineTo(px - dx * d * 0.6 + dy * d * 0.8, py - dy * d * 0.6 - dx * d * 0.8); g.closePath(); g.fill();
        }
      }
      g.restore();
    }

    // tags: a name on a plate, with a line to the thing
    let busy = false;
    for (const [thing, tg] of tags) {
      const spot = SPOTS[thing];
      if (!spot) continue;
      let [[X, Y], side] = spot;
      if (X === 'sun') { [X, Y] = SUN; }
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
    clear(seconds = 0.8) {
      const now = performance.now(), t = ms(seconds);
      for (const k of LEVELS) lv[k].go(0, t, now);
      for (const tg of tags.values()) if (!tg.out) tg.out = { t0: now, ms: Math.max(1, t * 0.6) };
      if (!(t > 0)) tags.clear();
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
      wake();
    },
    debug: () => ({ frames, levels: Object.fromEntries(LEVELS.map(k => [k, Math.round(lv[k].at(performance.now()) * 1000) / 1000])), tags: [...tags].map(([k, tg]) => ({ thing: k, text: tg.text, fading: !!tg.out })),
      view: cam.map(c => Math.round(c.at(performance.now()))), soft: ctx.motion === 'soft' }),
    remove() {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      canvas.remove();
    },
  };
}
