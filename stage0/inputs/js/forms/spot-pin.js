// Spot, as a pin. A pin waits in its dock, bobbing; drag it onto the picture (or tap the picture and it
// hops there). While it's held, its point rides above your finger so you can see where it is going.
// On Check the wind is drawn in as arrows, the picture zooms in on your pin and the true spot, and a line
// between them says how far off you were, with the wind speed at each.
import { C, E, Val, TAU, lerp, clamp01, rgba, font, chip, rrect, ripple } from '../kit.js';
import { storm, pin } from '../art.js';

export const meta = {
  question: 'This storm is heading north. Where is its wind <span class="key">fiercest</span>?',
  revealMs: 1700,
};

const KM_PER_PX = 0.95;

export function mount(api) {
  const { w, h } = api;
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx;
  const SX = w / 2, SY = h * 0.45, R = 100;
  const RM = 0.42, TA = -35 * Math.PI / 180;
  const truth = { x: SX + Math.cos(TA) * R * RM, y: SY + Math.sin(TA) * R * RM, r: 22 };
  const dock = { x: 46, y: h - 50 };
  let tip = null, held = false, revealed = null, res = null, fing = null;
  const px = new Val(dock.x), py = new Val(dock.y + 14), lift = new Val(0), off = new Val(0), landed = new Val(1);

  // the wind, in km/h, at a place on the picture: still in the eye, strongest in the ring around it, and
  // stronger on the side where the storm's own motion adds to it
  function wind(x, y) {
    const dx = x - SX, dy = y - SY, r = Math.hypot(dx, dy) / R, th = Math.atan2(dy, dx);
    if (r > 1.35) return 15;
    const core = r < RM ? 200 * Math.pow(r / RM, 1.6) : 200 * Math.pow(RM / r, 0.75);
    return Math.max(8, core + 30 * Math.cos(th - TA) * clamp01((r - 0.12) / 0.3));
  }

  const onPin = (x, y) => Math.hypot(x - px.at(), y - (py.at() - 30)) < 34 || Math.hypot(x - px.at(), y - py.at()) < 26;
  api.track(cv.el, {
    down: q => {
      if (api.locked) return false;
      const x = q.x - api.left, y = q.y - api.top, t = api.now();
      if (onPin(x, y)) {
        held = true;
        lift.to(1, { t, ms: 160, kind: 'out' });
        off.to(-46, { t, ms: 220, kind: 'out', from: py.at() - y });
        fing = { x, y };
        api.tick();
        return;
      }
      return false;
    },
    move: q => {
      if (!held) return;
      fing = { x: q.x - api.left, y: q.y - api.top };
    },
    up: () => {
      if (!held) return;
      const t = api.now();
      held = false;
      lift.to(0, { t, ms: 360 });
      const x = fing.x, y = fing.y + off.at(t);
      px.set(x); py.set(y);
      if (y > 8 && y < h - 8 && x > 8 && x < w - 8 && !(Math.hypot(x - dock.x, y - dock.y) < 34)) {
        tip = { x, y };
        landed.to(1, { t, ms: 420, from: 0 });
        api.tick();
      } else {   // dropped off the picture: back to its dock
        tip = null;
        px.to(dock.x, { t }); py.to(dock.y + 14, { t });
      }
      api.changed();
    },
    tap: q => {   // a tap on the picture: the pin hops there
      if (api.locked || held) return;
      const x = q.x - api.left, y = q.y - api.top, t = api.now();
      if (onPin(x, y)) return;
      tip = { x, y };
      px.to(x, { t, ms: 380, kind: 'inOut' }); py.to(y, { t, ms: 380, kind: 'inOut' });
      landed.to(1, { t: t + 0.32, ms: 420, from: 0 });
      api.tick();
      api.changed();
    },
  });
  cv.el.style.touchAction = 'none';

  function arrows(t, alpha) {
    if (alpha <= 0.01) return;
    for (const rr of [0.3, 0.46, 0.75, 1.08]) {
      const n = Math.round(5 + rr * 8);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU - t * 0.25 * (1 / rr), x = SX + Math.cos(a) * rr * R, y = SY + Math.sin(a) * rr * R;
        const v = wind(x, y), len = 6 + v * 0.11;
        const dx = Math.sin(a), dy = -Math.cos(a);       // turning counterclockwise, as seen from above in the north
        const col = v > 190 ? C.gold : v > 120 ? '#ffffff' : '#8f98dc';
        ctx.save(); ctx.globalAlpha = alpha * (v > 120 ? 1 : 0.8);
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = v > 190 ? 3.5 : 2.5; ctx.lineCap = 'round';
        const x0 = x - dx * len / 2, y0 = y - dy * len / 2, x1 = x + dx * len / 2, y1 = y + dy * len / 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1 + dx * 3, y1 + dy * 3); ctx.lineTo(x1 - dx * 4 - dy * 4, y1 - dy * 4 + dx * 4); ctx.lineTo(x1 - dx * 4 + dy * 4, y1 - dy * 4 - dx * 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }

  function render(t) {
    cv.clear();
    const rk = revealed === null ? 0 : t - revealed;
    const kind = res ? res.kind : null;
    const frame = new Path2D(); rrect(frame, 1, 1, w - 2, h - 6, 24);
    ctx.fillStyle = C.line; ctx.save(); ctx.translate(0, 4); ctx.fill(frame); ctx.restore();
    ctx.save(); ctx.clip(frame);
    ctx.fillStyle = '#16206a'; ctx.fillRect(0, 0, w, h);
    // the zoom, in on your pin and the true spot
    const zk = revealed === null ? 0 : E.inOut(clamp01((rk - 0.35) / 0.6));
    const fx = tip ? (tip.x + truth.x) / 2 : SX, fy = tip ? (tip.y + truth.y) / 2 : SY;
    const z = 1 + 0.45 * zk, cxv = lerp(SX, fx, zk), cyv = lerp(SY, fy, zk);
    const view = (x, y) => [(x - cxv) * z + SX, (y - cyv) * z + SY];
    ctx.save();
    ctx.translate(SX, SY); ctx.scale(z, z); ctx.translate(-cxv, -cyv);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let gx = -200; gx < w + 200; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, -200); ctx.lineTo(gx, h + 200); ctx.stroke(); }
    for (let gy = -200; gy < h + 200; gy += 40) { ctx.beginPath(); ctx.moveTo(-200, gy); ctx.lineTo(w + 200, gy); ctx.stroke(); }
    // where it has come from: a trail of dots up from the south
    for (let i = 1; i <= 7; i++) {
      const y = SY + R * 1.25 + i * 17;
      ctx.fillStyle = rgba('#ffffff', 0.75 - i * 0.07);
      ctx.beginPath(); ctx.arc(SX + Math.sin(i * 0.5) * 6, y, 3, 0, TAU); ctx.fill();
    }
    storm(ctx, SX, SY, R, { angle: -t * 0.35 });
    // where it's going: chevrons above it
    for (let i = 0; i < 3; i++) {
      const k = ((t * 0.8 + i / 3) % 1), y = SY - R * 1.33 - k * 26;
      ctx.strokeStyle = rgba('#ffffff', 0.85 * Math.sin(k * Math.PI)); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(SX - 13, y + 8); ctx.lineTo(SX, y - 4); ctx.lineTo(SX + 13, y + 8); ctx.stroke();
    }
    arrows(t, revealed === null ? 0 : clamp01((rk - 0.1) / 0.4));
    ctx.restore();

    // the compass letter, and the dock
    ctx.fillStyle = C.muted; ctx.font = font(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('N', w - 26, 26);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(w - 26, 52); ctx.lineTo(w - 26, 38); ctx.moveTo(w - 31, 43); ctx.lineTo(w - 26, 37); ctx.lineTo(w - 21, 43); ctx.stroke();
    ctx.fillStyle = '#0f1434'; ctx.beginPath(); ctx.arc(dock.x, dock.y, 30, 0, TAU); ctx.fill();
    ctx.strokeStyle = tip || held ? '#262d60' : C.line2; ctx.lineWidth = 2.5; ctx.stroke();

    // the truth and the gap to it
    let tipV = null;
    if (tip && !held) tipV = view(tip.x, tip.y);
    const tv = view(truth.x, truth.y);
    if (revealed !== null) {
      const m = E.spring(clamp01((rk - 0.75) / 0.45), 0.425);
      if (tipV && kind !== 'right') {
        const lk = E.out(clamp01((rk - 0.85) / 0.35));
        if (lk > 0) {
          const ex = lerp(tipV[0], tv[0], lk), ey = lerp(tipV[1], tv[1], lk);
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(tipV[0], tipV[1]); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(tipV[0], tipV[1]); ctx.lineTo(ex, ey); ctx.stroke();
          chip(ctx, `${res.km} km off`, (tipV[0] + tv[0]) / 2 + 8, (tipV[1] + tv[1]) / 2 + 30, { kind: 'dark', size: 12.5, padX: 8, padY: 4, scale: E.spring(clamp01((rk - 1.05) / 0.4), 0.425) });
        }
      }
      if (m > 0.01) {
        ctx.save(); ctx.translate(tv[0], tv[1]); ctx.scale(m, m);
        ctx.strokeStyle = C.goldEdge; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 2, 16, 0, TAU); ctx.stroke();
        ctx.strokeStyle = C.gold; ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.stroke();
        ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
        ctx.restore();
        chip(ctx, `${Math.round(wind(truth.x, truth.y) / 5) * 5} km/h`, tv[0] + 24, tv[1] - 26, { kind: 'gold', align: 'left', size: 14, scale: m });
      }
    }
    ctx.restore();   // out of the frame
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke(frame);

    // the pin
    let x = px.at(t), y = py.at(t), l = lift.at(t);
    if (held) { x = fing.x; y = fing.y + off.at(t); }
    if (tipV) { x = tipV[0]; y = tipV[1]; }
    if (!tip && !held) l = Math.max(l, 0.35 * Math.max(0, Math.sin(((t % 2.2) / 0.55) * Math.PI)) * ((t % 2.2) < 0.55 ? 1 : 0));
    const col = kind === 'right' ? C.teal : kind === 'wrong' ? C.pink : kind === 'close' ? C.gold : C.cyan;
    const edge = kind === 'right' ? C.tealEdge : kind === 'wrong' ? C.pinkEdge : kind === 'close' ? C.goldEdge : C.cyanEdge;
    if (held) {   // a small cross where the point will land
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    }
    if (tip && !held) ripple(ctx, x, y, (t - landed.s) / 0.5, { r0: 6, r1: 30, alpha: 0.7 });
    pin(ctx, x, y - l * 4, { color: col, edge, lift: l });
    if (revealed !== null && tipV && kind !== 'right') {
      const s = E.spring(clamp01((rk - 0.95) / 0.45), 0.425);
      chip(ctx, `${Math.round(wind(tip.x, tip.y) / 5) * 5} km/h`, x - 22, y + 22, { kind: 'pink', align: 'right', size: 14, scale: s });
    }
  }

  return {
    render,
    answered: () => !!tip,
    value: () => tip && { x: tip.x / w, y: tip.y / h },
    check() {
      const d = Math.hypot(tip.x - truth.x, tip.y - truth.y);
      const inEye = Math.hypot(tip.x - SX, tip.y - SY) < R * 0.2;
      const kind = d <= truth.r ? 'right' : !inEye && d <= truth.r * 1.8 ? 'close' : 'wrong';
      const why = kind === 'right' ? 'Yes: in the ring around the eye, on the side where the storm\'s own speed adds to its wind.'
        : kind === 'close' ? 'Close. The fiercest wind is in the ring around the eye, on the front right.'
        : inEye ? 'The eye is calm. The fiercest winds whirl in the ring around it, on the front right.'
        : 'The fiercest winds whirl in the ring around the eye, on the front right.';
      res = { kind, why, km: Math.round(d * KM_PER_PX) };
      return res;
    },
    reveal(t) { revealed = t; },
    reset(t) {
      tip = null; held = false; revealed = null; res = null;
      px.set(dock.x); py.set(dock.y + 14); lift.set(0); off.set(0); landed.set(1);
    },
    ghost(attempt, G) {
      const to = attempt === 'wrong' ? [SX + 3, SY + 2] : [truth.x, truth.y];
      // grab the pin's head, then carry it so its point lands on the place
      return G.drag(G.pt(dock.x, dock.y - 16), G.pt(to[0], to[1] + 46), { ms: attempt === 'wrong' ? 650 : 600, hold: 120 });
    },
  };
}
