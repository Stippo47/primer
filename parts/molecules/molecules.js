// Up close: air and water at the scale of molecules, for anything a scene explains by what the molecules do.
// Air molecules (two atoms each) fly about, bouncing off the walls; water molecules (an oxygen and two
// hydrogens) jostle in a liquid layer at the bottom, or the bottom is ground, or nothing. Every level glides
// where it's sent (js/ease.js), so a scene turns them on its words:
//
//   warm      how warm it all is: everything moves faster, and the water's colour shifts warm
//   air       how many air molecules there are: crowded or thin
//   heat      heat rising off the ground (warm triangles), warming and speeding the air just above it
//   pushes    every molecule hitting the floor is a tiny push, drawn as a short white arrow: air pressure
//   split     a wall down the middle, crowded on the left and thin on the right; open lifts the wall and the
//   open      crowded side spills into the thin one, with moving-air arrows across: wind
//   parcel    a ring round a bubble of air in the middle; inside it warms, spreads and thins, and with lift
//   lift      it rises like a bubble in water
//   escape    the fastest water molecules at the surface breaking free into the air as vapour; with carry,
//   carry     each takes a warm triangle of heat with it
//
// Built labels (js/code.js, label) follow the molecule they name as it moves. Motion is worked out from time
// alone (a molecule's path is a bounce between walls, a function of how far it has gone), so every frame can
// be drawn on its own and a film renders the same each time. Molecules are ready-made stamps, cheap on a phone.
//
// mount(el, settings, ctx) -> { calls, state, on, remove, busy, finish, debug }.

import { Glide, Shift, soft as softEase, clamp01, lerp, rng, MOTION } from '../../js/ease.js';
import { molecule, heat, air, label as drawLabel, glow, mixHex, rgba, CODE } from '../../js/code.js';

const TAU = Math.PI * 2;
const LEVELS = ['warm', 'air', 'heat', 'pushes', 'split', 'open', 'parcel', 'lift', 'escape', 'carry'];
const COLOURED = new Set(['warm']);
const N_AIR = 84, N_SPLIT_RIGHT = 20, N_VAPOUR = 8, N_PARCEL = 6, N_FAR = 46;
// a bounce between 0 and 1: where something moving at constant speed from x ends up between two walls
const tri = x => { const m = ((x % 2) + 2) % 2; return m < 1 ? m : 2 - m; };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export async function mount(el, settings, ctx = {}) {
  const S = settings;
  const canvas = document.createElement('canvas');
  canvas.className = 'pg-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Molecules of air and water, up close');
  canvas.style.cssText = 'display:block;width:100%;height:100%';
  el.append(canvas);
  const g = canvas.getContext('2d');
  const below = ['water', 'ground'].includes(S.below) ? S.below : 'none';
  const lv = Object.fromEntries(LEVELS.map(k => [k, COLOURED.has(k) ? new Shift(Number(S[k]) || 0, 'colour') : new Glide(Number(S[k]) || 0)]));
  const tags = new Map();
  let w = 0, h = 0, dpr = 1, raf = 0, gone = false, last = 0, frames = 0;
  // how far the molecules have flown: a clock that runs faster the warmer it is
  let tau = 0, tauHot = 0, clock = 0;

  const R = rng(11);
  // air: each flies straight at its own speed and bounces off the walls of its region
  const airs = Array.from({ length: N_AIR + N_SPLIT_RIGHT }, (_, i) => ({
    u: R(), v: R(), vx: (R() - 0.5) * 0.5, vy: (R() - 0.5) * 0.5, spin: (R() - 0.5) * 3, ang: R() * TAU, right: i >= N_AIR, i,
  }));
  for (const m of airs) { const sp = Math.hypot(m.vx, m.vy) || 0.1, k = (0.16 + R() * 0.12) / sp; m.vx *= k; m.vy *= k; }
  // the parcel's own molecules, bouncing inside it
  const inParcel = Array.from({ length: N_PARCEL }, () => ({ u: R(), v: R(), vx: (R() - 0.5) * 0.6 + 0.2, vy: (R() - 0.5) * 0.6 + 0.15, ang: R() * TAU, spin: (R() - 0.5) * 3 }));
  // water: a loose packing of molecules, each jostling about its place
  const waters = [];
  const COLS = 7, ROWS = 4;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) waters.push({ u: (c + 0.5 + (r % 2) * 0.5) / (COLS + 0.5), v: (r + 0.55) / ROWS, ph: R() * TAU, ph2: R() * TAU, ang: R() * TAU, spin: (R() - 0.5) * 2 });
  const vapours = Array.from({ length: N_VAPOUR }, (_, i) => ({ ph: i / N_VAPOUR + R() * 0.04, vx: (R() - 0.5) * 0.4, ang: R() * TAU, i }));
  const specks = Array.from({ length: 40 }, () => ({ u: R(), v: R(), s: 0.5 + R(), ph: R() * TAU }));
  // far molecules: smaller, dimmer and slower, behind the rest, so the picture has depth
  const far = Array.from({ length: N_FAR }, () => ({ u: R(), v: R(), vx: (R() - 0.5) * 0.12, vy: (R() - 0.5) * 0.12, ang: R() * TAU, spin: (R() - 0.5) * 2 }));

  function size() {
    w = Math.max(10, el.clientWidth || el.getBoundingClientRect().width); h = Math.max(10, el.clientHeight || el.getBoundingClientRect().height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    wake();
  }
  const level = (k, now) => clamp01(lv[k].at(now));

  function draw(now, dt) {
    const L = Object.fromEntries(LEVELS.map(k => [k, level(k, now)]));
    const warmRaw = lv.warm.at(now);
    const t = now / 1000, step = dt / 1000;
    clock += step;
    tau += step * (0.55 + 1.5 * L.warm);
    tauHot += step * (0.55 + 1.5 * Math.max(L.warm, 0.9));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const unit = Math.min(w, h * 0.62);
    const mr = Math.max(5, unit * 0.034);        // a molecule's big atom
    // the floor sits well clear of where a scene's caption goes, so what happens on it is seen
    const floorY = below === 'water' ? h * 0.64 : below === 'ground' ? h * 0.76 : h;
    const top = Math.max(0, h * 0.04);

    // the field: a deep blue-violet, warmer as it warms
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, mixHex('#0d1450', '#2a1458', warmRaw * 0.6)); bg.addColorStop(1, mixHex('#1d2a8a', '#5a2a7a', warmRaw * 0.5));
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // far specks drifting: the space between molecules is never still
    g.fillStyle = 'rgba(190,200,255,0.35)';
    for (const sp of specks) { g.beginPath(); g.arc((sp.u * w + t * 6 * sp.s) % w, sp.v * floorY + Math.sin(t * 0.6 + sp.ph) * 6, 0.8 * sp.s, 0, TAU); g.fill(); }

    // the far layer: small, dim, slow
    for (const m of far) {
      const x = w * tri(m.u + m.vx * tau * 0.6), y = floorY * 0.97 * tri(m.v + m.vy * tau * 0.6);
      molecule(g, below === 'water' && m.u < 0 ? 'water' : 'air', x, y, mr * 0.5, { angle: m.ang + m.spin * tau, a: 0.32, warm: clamp01(warmRaw) * 0.5, dpr });
    }

    // the ground, or the water, at the bottom
    if (below === 'ground') {
      const gk = L.heat;
      const soil = g.createLinearGradient(0, floorY, 0, h);
      soil.addColorStop(0, mixHex('#2bc4a4', '#f0a050', gk)); soil.addColorStop(0.12, mixHex('#127a85', '#a85a2a', gk)); soil.addColorStop(1, '#0e1440');
      g.fillStyle = soil; g.fillRect(0, floorY, w, h - floorY);
      if (gk > 0.01) glow(g, w / 2, floorY, w * 0.7, '#ff9a3c', gk * 0.7);
    }
    let waterTop = floorY;
    if (below === 'water') {
      const col = mixHex(CODE.water.mid, '#d8487a', Math.max(0, Math.min(1.1, warmRaw)) * 0.72);
      const wv = x => floorY + Math.sin(x / 40 + t * 1.3) * 3;
      const water = g.createLinearGradient(0, floorY, 0, h);
      water.addColorStop(0, col); water.addColorStop(1, CODE.water.deep);
      g.fillStyle = water;
      g.beginPath(); g.moveTo(0, wv(0)); for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, wv(x)); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, wv(0)); for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, wv(x)); g.stroke();
      // its molecules, packed close and jostling, faster the warmer
      const cell = w / (COLS + 0.5), rowH = (h - floorY) / ROWS;
      const jig = 0.18 + 0.22 * L.warm;
      for (const m of waters) {
        const x = m.u * w + Math.sin(tau * 2.6 + m.ph) * cell * jig, y = floorY + m.v * rowH * ROWS * 0.92 + Math.sin(tau * 2.2 + m.ph2) * rowH * jig * 0.6;
        molecule(g, 'water', x, y, mr * 1.3, { angle: m.ang + Math.sin(tau * 1.5 + m.ph) * 0.6 * (0.5 + L.warm), warm: clamp01(warmRaw) * 0.6, dpr });
      }
      waterTop = floorY;
    }

    // the air's region, and the wall down the middle when it's split
    const gasTop = top, gasBot = waterTop - mr * 1.2;
    const wallX = w / 2, open = L.open, split = L.split;
    const wallUp = open * (gasBot - gasTop + 40);   // the wall slides up out of the way as it opens
    const parcelOn = L.parcel, lift = L.lift;
    const pr = unit * (0.17 + 0.07 * parcelOn * L.warm) , pcx = w / 2, pcy = lerp(gasBot - pr - unit * 0.06, gasTop + pr + unit * 0.12, softEase(lift));
    const density = L.air;
    const nLeft = Math.round(N_AIR * density);

    // air molecules: across the whole box, or with the wall, most crowded into the left and a few on the right
    const placeAir = (m, kTau) => {
      let x0 = 0, x1 = w;
      if (split > 0.001) {
        if (m.right) { x0 = lerp(0, wallX, split * (1 - open)); x1 = w; }
        else { x0 = 0; x1 = lerp(w, wallX, split * (1 - open)); }
      }
      const x = x0 + mr + (x1 - x0 - 2 * mr) * tri(m.u + m.vx * kTau);
      const y = gasTop + mr + (gasBot - gasTop - 2 * mr) * tri(m.v + m.vy * kTau);
      return [x, y];
    };
    const shownAir = airs.filter(m => (m.right ? split > 0.001 && m.i - N_AIR < Math.round(N_SPLIT_RIGHT * split) : m.i < (split > 0.001 ? Math.max(nLeft, Math.round(N_AIR * 0.75 * split + nLeft * (1 - split))) : nLeft)));
    const airAt = new Map();
    // near warm ground, air moves faster: its place is taken from the hot clock there, blended by height
    const posOf = (m, back = 0) => {
      let [x, y] = placeAir(m, tau - back);
      if (L.heat > 0.01 && below === 'ground') {
        const hot = L.heat * clamp01((y - (gasBot - (gasBot - gasTop) * 0.4)) / ((gasBot - gasTop) * 0.4));
        if (hot > 0.01) { const [x2, y2] = placeAir(m, tauHot - back); x = lerp(x, x2, hot); y = lerp(y, y2, hot); }
      }
      return [x, y];
    };
    for (const m of shownAir) {
      const [x, y] = posOf(m);
      let a = 1;
      if (parcelOn > 0.01) { const d = Math.hypot(x - pcx, y - pcy); a = lerp(1, clamp01((d - pr * 0.9) / (pr * 0.25)), parcelOn); }
      airAt.set(m.i, [x, y]);
      if (a <= 0.02) continue;
      const nearFloor = below === 'ground' ? L.heat * clamp01((y - gasTop) / (gasBot - gasTop) - 0.5) * 2 : 0;
      // the fast ones leave a short faint trail: speed you can see
      if (L.warm > 0.4 || nearFloor > 0.3) {
        const back = 0.05 * (L.warm + nearFloor);
        const [tx, ty] = posOf(m, back);
        if (Math.hypot(tx - x, ty - y) < mr * 3.5) { g.strokeStyle = rgba('#d8d2ff', 0.18 * a); g.lineWidth = mr * 1.1; g.lineCap = 'round'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke(); }
      }
      molecule(g, 'air', x, y, mr * 0.9, { angle: m.ang + m.spin * tau, a, warm: Math.max(clamp01(warmRaw) * 0.7, nearFloor), dpr });
    }

    // the wall, sliding up as it opens
    if (split > 0.01 && open < 0.999) {
      g.save(); g.globalAlpha = split * (1 - open * 0.3);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.roundRect(wallX - 3, gasTop - wallUp, 6, gasBot - gasTop + 30, 3); g.fill();
      g.restore();
    }
    // wind: air pushed from the crowded side into the thin one, while it evens out
    if (open > 0.01) {
      const strength = open * (1 - softEase(clamp01((open - 0.55) / 0.45)) * 0.4);
      for (let i = 0; i < 4; i++) {
        const y = lerp(gasTop + (gasBot - gasTop) * 0.2, gasTop + (gasBot - gasTop) * 0.82, i / 3);
        const q = (clock * 0.5 + i * 0.27) % 1;
        const head = 1 - Math.pow(1 - clamp01(q / 0.8), 2), tail = Math.max(0, head - 0.55);
        const path = k => [lerp(w * 0.18, w * 0.84, k), y + Math.sin(k * 3 + i) * 6];
        const pts = []; for (let j = 0; j <= 20; j++) pts.push(path(lerp(tail, head, j / 20)));
        air(g, pts, { phase: clock * 1.5, w: Math.max(4, unit * 0.014), a: strength * (1 - softEase(clamp01((q - 0.82) / 0.18))) });
      }
    }

    // pushes: each molecule that hits the floor gives it a tiny push, drawn as a short white arrow down
    if (L.pushes > 0.01) {
      const rate = (6 + 26 * density) * (0.6 + L.warm);
      const k0 = Math.floor(clock * rate);
      const wallTargets = split > 0.01 && open < 0.5;
      for (let k = k0 - 8; k <= k0; k++) {
        const age = clock - k / rate;
        if (age < 0 || age > 0.42) continue;
        const a = L.pushes * (1 - age / 0.42);
        let x = hash(k) * w, y = gasBot;
        // with the wall up, the crowded side pushes on it far more often than the thin side
        if (wallTargets && hash(k + 0.5) < 0.5) { const left = hash(k + 0.3) < 0.8; x = wallX + (left ? -6 : 6); y = lerp(gasTop + 30, gasBot - 30, hash(k + 0.7)); pushMark(x, y, left ? 0 : Math.PI, a, mr); continue; }
        pushMark(x, y, Math.PI / 2, a, mr);
      }
    }
    function pushMark(x, y, dir, a, size) {
      const L0 = size * 2.2, dx = Math.cos(dir), dy = Math.sin(dir);
      g.save(); g.globalAlpha = a; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(2, size * 0.35); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(x - dx * L0 * 1.4, y - dy * L0 * 1.4); g.lineTo(x - dx * 2, y - dy * 2); g.stroke();
      g.beginPath(); g.moveTo(x - dx * 2 - dx * L0 * 0.5 - dy * L0 * 0.45, y - dy * 2 - dy * L0 * 0.5 + dx * L0 * 0.45); g.lineTo(x - dx * 2, y - dy * 2); g.lineTo(x - dx * 2 - dx * L0 * 0.5 + dy * L0 * 0.45, y - dy * 2 - dy * L0 * 0.5 - dx * L0 * 0.45); g.stroke();
      // a little flash where it lands
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x, y, size * 0.7 * (1 - a * 0.3), 0, TAU); g.fill();
      g.restore();
    }

    // heat rising off warm ground into the air above it
    if (L.heat > 0.01 && below === 'ground') {
      for (let i = 0; i < 12; i++) {
        const k = (hash(i) + clock * 0.32) % 1, x = (hash(i + 9) * 0.9 + 0.05) * w;
        heat(g, x + Math.sin(t + i) * 6, gasBot - k * (gasBot - gasTop) * 0.45, Math.max(5, unit * 0.022), -Math.PI / 2, L.heat * Math.sin(Math.PI * k) * 0.95);
      }
    }

    // the parcel: a ring round a bubble of air, its few molecules spread out inside, warm, rising
    let parcelAt = null;
    if (parcelOn > 0.01) {
      parcelAt = [pcx, pcy, pr];
      g.save();
      g.globalAlpha = parcelOn;
      const fill = g.createRadialGradient(pcx, pcy, pr * 0.1, pcx, pcy, pr);
      fill.addColorStop(0, rgba('#ffb86b', 0.12 + 0.2 * L.warm)); fill.addColorStop(1, rgba('#ffb86b', 0.05 + 0.08 * L.warm));
      g.fillStyle = fill; g.beginPath(); g.arc(pcx, pcy, pr, 0, TAU); g.fill();
      g.setLineDash([9, 8]); g.lineDashOffset = -clock * 12;
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.6; g.beginPath(); g.arc(pcx, pcy, pr, 0, TAU); g.stroke();
      g.setLineDash([]);
      const n = Math.round(N_PARCEL - 2 * L.warm);
      for (let i = 0; i < n; i++) {
        const m = inParcel[i], kT = tauHot * (0.8 + 0.6 * L.warm);
        const ox = (tri(m.u + m.vx * kT) * 2 - 1) * pr * 0.62, oy = (tri(m.v + m.vy * kT) * 2 - 1) * pr * 0.62;
        molecule(g, 'air', pcx + ox, pcy + oy, mr * 0.9, { angle: m.ang + m.spin * kT, warm: 0.4 + 0.5 * L.warm, dpr });
      }
      g.restore();
      // lifting: a soft upward arrow under it
      if (lift > 0.02 && lift < 0.98) air(g, [[pcx, pcy + pr + unit * 0.16], [pcx, pcy + pr + unit * 0.02]], { w: Math.max(4, unit * 0.014), a: parcelOn * Math.sin(Math.PI * lift), phase: clock * 2 });
    }

    // vapour: the fastest water molecules at the surface breaking free into the air, each with its heat
    let vapourAt = null;
    if (L.escape > 0.01 && below === 'water') {
      const n = Math.round(N_VAPOUR * L.escape), P = 5.5;
      for (let j = 0; j < n; j++) {
        const v = vapours[j], cyc = clock / P + v.ph, c = Math.floor(cyc), q = cyc - c;
        const x0 = (0.08 + 0.84 * hash(c * 7 + j)) * w;
        // breaking free: it shivers at the surface, then shoots up out of it, then flies about as a gas
        const freeAt = 0.12, up = clamp01((q - freeAt) / 0.14);
        let x, y;
        if (q < freeAt) { x = x0 + Math.sin(q * 120 + j) * mr * 0.25; y = waterTop + mr * 0.5; }
        else {
          const fly = (q - freeAt) * P;    // seconds since it broke free
          const rise = MOTION.furniture.ease(clamp01(fly / 0.9));
          const yUp = waterTop - mr - rise * (waterTop - gasTop) * 0.3;
          const drift = Math.max(0, fly - 0.6), span = gasBot - gasTop - 2 * mr;
          x = mr + (w - 2 * mr) * tri((x0 - mr) / (w - 2 * mr) + v.vx * drift * 0.5);
          y = gasTop + mr + span * tri(clamp01((yUp - gasTop - mr) / span) - 0.12 * drift);
        }
        const env = Math.min(1, q / 0.05) * (1 - softEase(clamp01((q - 0.86) / 0.14)));
        if (q >= freeAt && q < freeAt + 0.08) glow(g, x, y, mr * 4, '#bdf0ff', env * (1 - (q - freeAt) / 0.08));
        molecule(g, 'water', x, y, mr * 1.05, { angle: v.ang + clock * 2, a: env, warm: 0.15, dpr });
        if (L.carry > 0.01 && q >= freeAt) heat(g, x + mr * 1.7, y - mr * 1.5, Math.max(5, mr * 0.9), -Math.PI / 2 + 0.3, env * L.carry);
        if (j === 0 && q > freeAt + 0.05) vapourAt = [x, y];
      }
    }

    // labels, on the molecule (or the thing) they name, following it
    let busy = false;
    for (const [thing, tg] of tags) {
      let at = null;
      if (thing === 'air') { const m = shownAir.find(x => !x.right) || shownAir[0]; at = m && airAt.get(m.i); }
      else if (thing === 'water' && below === 'water') { const m = waters[2]; at = [m.u * w + Math.sin(tau * 2.6 + m.ph) * (w / (COLS + 0.5)) * (0.18 + 0.22 * L.warm), floorY + m.v * (h - floorY) * 0.92 + Math.sin(tau * 2.2 + m.ph2) * ((h - floorY) / ROWS) * (0.18 + 0.22 * L.warm) * 0.6]; }
      else if (thing === 'vapour') at = vapourAt;
      else if (thing === 'parcel' && parcelAt) at = [parcelAt[0] + parcelAt[2] * 0.7, parcelAt[1] - parcelAt[2] * 0.7];
      else if (thing === 'floor') at = [w * 0.3, gasBot + mr];
      else if (thing === 'crowded' && split > 0.01) at = [w * 0.34, gasTop + (gasBot - gasTop) * 0.22, -1];
      else if (thing === 'thin' && split > 0.01) at = [w * 0.66, gasTop + (gasBot - gasTop) * 0.22, 1];
      else if (thing === 'wind' && open > 0.01) at = [w * 0.5, gasTop + (gasBot - gasTop) * 0.45];
      if (!at) continue;
      const age = now - tg.born, out = tg.out ? clamp01((now - tg.out.t0) / tg.out.ms) : 0;
      if (age < 1200 || tg.out) busy = true;
      drawLabel(g, at[0], at[1], tg.text, { age, side: at[2] || (at[0] > w * 0.6 ? -1 : 1), out, width: w });
    }
    for (const [k, tg] of tags) if (tg.out && now >= tg.out.t0 + tg.out.ms) tags.delete(k);
    return busy;
  }

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
    const v = clamp01(Number(value) || 0);
    lv[k].go(v, COLOURED.has(k) && ms(seconds) > 0 ? Math.max(ms(seconds), MOTION.colour.ms) : ms(seconds), performance.now());
    wake();
  };
  const calls = Object.fromEntries(LEVELS.map(k => [k, setLevel(k)]));
  Object.assign(calls, {
    tag(thing, text) {
      const now = performance.now(), old = tags.get(thing);
      if (!text) { if (old && !old.out) old.out = { t0: now, ms: 400 }; return; }
      tags.set(thing, { text: String(text), born: old && !old.out && old.text === String(text) ? old.born : now });
      wake();
    },
    clear(seconds = 0.8) {
      const now = performance.now(), t = ms(seconds);
      for (const k of LEVELS) if (k !== 'air' && k !== 'warm') lv[k].go(0, t, now);
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
      for (const [k, tg] of tags) { if (tg.out) tags.delete(k); else tg.born = now - 60000; }
      wake();
    },
    debug: () => ({ frames, below, levels: Object.fromEntries(LEVELS.map(k => [k, Math.round(lv[k].at(performance.now()) * 1000) / 1000])), tags: [...tags].map(([k, tg]) => ({ thing: k, text: tg.text, fading: !!tg.out })), soft: ctx.motion === 'soft' }),
    remove() {
      gone = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      canvas.remove();
    },
  };
}
