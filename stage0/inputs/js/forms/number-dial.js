// Number, as a dial. Turn the knob around the dial to set the wind; the palm tree in the middle bends,
// the sea gets up and the rain comes as the wind rises. On Check, a gold mark shows the true speed and the
// picture blows up to it, so you see what that much wind looks like next to what you guessed.
import { C, E, Val, TAU, lerp, clamp01, mix, rgba, font, chip, disc, rrect } from '../kit.js';

export const meta = {
  question: 'How fast must the wind blow for a storm to be called a <span class="key">hurricane</span>?',
  revealMs: 1600,
};

const VMAX = 250, A0 = Math.PI * 0.75, SWEEP = Math.PI * 1.5, TRUTH = 119, WITHIN = 6, CLOSE = 20;
const START = 20;

export function mount(api) {
  const { w, h } = api;
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx;
  const cx = w / 2, cy = 192, PR = 184, TR = 138, TW = 22, WR = 110;
  const angleOf = v => A0 + (v / VMAX) * SWEEP;
  const pointOf = (v, r = TR) => [cx + Math.cos(angleOf(v)) * r, cy + Math.sin(angleOf(v)) * r];

  let value = START, moved = false, revealed = null, res = null;
  const knob = new Val(1), shown = new Val(START), windAt = new Val(START);
  let lastTick = Math.round(START / 10);

  const fromPoint = p => {
    const x = p.x - api.left - cx, y = p.y - api.top - cy;
    let rel = (Math.atan2(y, x) - A0) % TAU;
    if (rel < 0) rel += TAU;
    let v = rel <= SWEEP ? (rel / SWEEP) * VMAX : rel - SWEEP < (TAU - SWEEP) / 2 ? VMAX : 0;
    if (Math.abs(v - value) > VMAX * 0.6) v = value > VMAX / 2 ? VMAX : 0;   // no jumping across the gap at the bottom
    return Math.round(v);
  };
  const setValue = v => {
    if (v === value) return;
    value = v;
    shown.set(v);
    windAt.set(v);
    const step = Math.round(v / 10);
    if (step !== lastTick) { lastTick = step; api.tick(); }
    if (!moved) { moved = true; }
    api.changed();
  };
  api.track(cv.el, {
    down: p => {
      if (api.locked) return false;
      const x = p.x - api.left - cx, y = p.y - api.top - cy;
      if (Math.hypot(x, y) > PR + 10) return false;
      knob.to(1.18, { ms: 260, kind: 'out' });
      setValue(fromPoint(p));
    },
    move: p => setValue(fromPoint(p)),
    up: () => knob.to(1, { ms: 420 }),
  });
  cv.el.style.touchAction = 'none';

  // ---- the little world in the window, for a wind of v km/h
  function scene(t, v) {
    const s = clamp01(v / 150), storm = clamp01((v - 90) / 60);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, WR, 0, TAU); ctx.clip();
    // sky
    const g = ctx.createLinearGradient(0, cy - WR, 0, cy + WR);
    g.addColorStop(0, mix('#2c3a8f', '#121638', s));
    g.addColorStop(0.62, mix('#5b4bb0', '#2a2360', s));
    ctx.fillStyle = g;
    ctx.fillRect(cx - WR, cy - WR, WR * 2, WR * 2);
    // clouds, racing faster and greyer as it blows
    const drift = t * (6 + v * 0.55);
    for (let i = 0; i < 4; i++) {
      const span = WR * 2 + 120, x = cx - WR - 60 + ((i * 97 + drift) % span), y = cy - 70 + (i % 2) * 26 + i * 4;
      const col = mix('#ffffff', '#8f98dc', s * 0.8), r = 15 + (i % 3) * 5;
      ctx.fillStyle = mix('#aebfff', '#5d66ad', s * 0.8);
      const p = new Path2D(); disc(p, x - r * 0.9, y + 3, r * 0.75); disc(p, x, y, r); disc(p, x + r, y + 4, r * 0.7);
      ctx.save(); ctx.translate(0, 3); ctx.fill(p); ctx.restore();
      ctx.fillStyle = col; ctx.fill(p);
    }
    // sea, getting up
    const seaY = cy + 34, amp = 1.5 + s * 8, chop = 0.06 + s * 0.05;
    ctx.fillStyle = mix('#2b3aa8', '#1b2a80', s);
    ctx.beginPath(); ctx.moveTo(cx - WR, cy + WR);
    for (let x = -WR; x <= WR; x += 4) ctx.lineTo(cx + x, seaY + Math.sin(x * chop + t * (1.5 + v * 0.05)) * amp + Math.sin(x * chop * 2.3 - t * 2) * amp * 0.4);
    ctx.lineTo(cx + WR, cy + WR); ctx.closePath(); ctx.fill();
    // white caps once it's breezy
    const caps = Math.floor(clamp01((v - 30) / 100) * 9);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < caps; i++) {
      const x = -WR + ((i * 53 + t * (20 + v * 0.6)) % (WR * 2)), y = seaY + 14 + (i % 3) * 16;
      ctx.beginPath(); ctx.moveTo(cx + x - 6, y); ctx.quadraticCurveTo(cx + x, y - 4, cx + x + 7, y); ctx.stroke();
    }
    // the island
    const ix = cx - 26, iy = seaY + 26;
    const isle = new Path2D(); isle.ellipse(ix, iy, 64, 20, 0, Math.PI, TAU); isle.closePath();
    ctx.save(); ctx.translate(0, 3); ctx.fillStyle = C.tealEdge; ctx.fill(isle); ctx.restore();
    ctx.fillStyle = '#f2d29b'; ctx.fill(isle);
    // the palm: its top swings downwind and the fronds stream out
    const bend = Math.pow(s, 1.15) * 0.95 + Math.sin(t * (2 + v * 0.06)) * 0.03 * (0.3 + s);
    const bx = ix - 6, by = iy - 12, len = 84;
    const tipX = bx + Math.sin(bend * 1.25) * len * 0.92, tipY = by - Math.cos(bend * 1.25) * len * 0.92;
    const cxp = bx + Math.sin(bend * 0.5) * len * 0.45, cyp = by - len * 0.55;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#7a4e2e'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(bx + 1.5, by + 1); ctx.quadraticCurveTo(cxp + 1.5, cyp + 1, tipX + 1.5, tipY + 1); ctx.stroke();
    ctx.strokeStyle = '#b07a4a'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cxp, cyp, tipX, tipY); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const calm = -Math.PI / 2 + (i - 2.5) * 0.62;            // drooping all round when it's still
      const down = 0.08 + (i - 2.5) * 0.11;                     // all streaming one way in a gale
      const flap = Math.sin(t * (3 + v * 0.09) + i * 1.7) * (0.05 + s * 0.12);
      const a = lerp(calm, down, Math.pow(s, 0.8)) + flap;
      const L = lerp(36, 46, s) * (i % 2 ? 0.9 : 1);
      const ex = tipX + Math.cos(a) * L, ey = tipY + Math.sin(a) * L + lerp(10, 2, s);
      const mx = tipX + Math.cos(a) * L * 0.5 + Math.cos(a - Math.PI / 2) * lerp(-8, -3, s), my = tipY + Math.sin(a) * L * 0.5 - lerp(8, 2, s);
      ctx.strokeStyle = C.tealEdge; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(tipX, tipY + 1.5); ctx.quadraticCurveTo(mx, my + 1.5, ex, ey + 1.5); ctx.stroke();
      ctx.strokeStyle = i % 2 ? C.teal : '#3fd7b4'; ctx.lineWidth = 7.5;
      ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    }
    // streaks of wind
    const streaks = Math.floor(v / 11);
    ctx.lineCap = 'round';
    for (let i = 0; i < streaks; i++) {
      const len2 = 12 + v * 0.22, span = WR * 2 + len2 + 40;
      const x = cx - WR - len2 - 20 + ((i * 71.3 + t * (40 + v * 2.2)) % span), y = cy - WR + 18 + ((i * 37.7) % (WR * 1.55));
      ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.25 * (i % 2)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len2, y + len2 * 0.05); ctx.stroke();
    }
    // driving rain in a hurricane
    if (storm > 0) {
      const drops = Math.floor(storm * 46), slant = 0.5 + storm * 0.9;
      ctx.strokeStyle = rgba('#c9d4ff', 0.55); ctx.lineWidth = 1.6;
      for (let i = 0; i < drops; i++) {
        const span = WR * 2 + 60, x = cx - WR - 40 + ((i * 41.7 + t * 260) % span), y = cy - WR + ((i * 67.1 + t * 420) % (WR * 2));
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 9 * slant, y + 12); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function render(t) {
    cv.clear();
    const rk = revealed === null ? 0 : t - revealed;
    // the plate
    ctx.fillStyle = C.line; ctx.beginPath(); ctx.arc(cx, cy + 5, PR, 0, TAU); ctx.fill();
    ctx.fillStyle = C.panel; ctx.beginPath(); ctx.arc(cx, cy, PR, 0, TAU); ctx.fill();
    ctx.strokeStyle = C.line2; ctx.lineWidth = 2; ctx.stroke();
    // the track and its fill
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.track; ctx.lineWidth = TW;
    ctx.beginPath(); ctx.arc(cx, cy, TR, A0, A0 + SWEEP); ctx.stroke();
    const v = shown.at(t);
    const kind = res ? res.kind : null;
    const fillCol = kind === 'right' ? C.teal : kind === 'wrong' ? C.pink : kind === 'close' ? C.gold : C.cyan;
    if (v > 0.5) {
      ctx.strokeStyle = fillCol; ctx.lineWidth = TW;
      ctx.beginPath(); ctx.arc(cx, cy, TR, A0, angleOf(v)); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, TR + 6, A0 + 0.02, Math.max(A0 + 0.02, angleOf(v) - 0.02)); ctx.stroke();
    }
    // notches every 10, bigger every 50, and the numbers outside
    for (let n = 0; n <= VMAX; n += 10) {
      const a = angleOf(n), big = n % 50 === 0;
      const r0 = TR - (big ? 10 : 5), r1 = TR + (big ? 10 : 5);
      ctx.strokeStyle = n <= v ? 'rgba(14,20,54,0.45)' : (big ? '#5d66ad' : '#3d4596');
      ctx.lineWidth = big ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
      if (big) {
        ctx.fillStyle = C.muted; ctx.font = font(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(n), cx + Math.cos(a) * (TR + 28), cy + Math.sin(a) * (TR + 28));
      }
    }
    // the gap between the guess and the truth, and the truth's gold mark
    if (revealed !== null) {
      const g = E.out(clamp01((rk - 0.1) / 0.45));
      if (g > 0 && Math.abs(value - TRUTH) > 0.5) {
        ctx.strokeStyle = rgba(C.gold, 0.55); ctx.lineWidth = 8; ctx.lineCap = 'round';
        const a1 = angleOf(value), a2 = angleOf(lerp(value, TRUTH, g));
        ctx.beginPath(); ctx.arc(cx, cy, TR, Math.min(a1, a2), Math.max(a1, a2)); ctx.stroke();
      }
      const m = E.spring(clamp01((rk - 0.35) / 0.5), 0.425);
      if (m > 0.01) {
        const a = angleOf(TRUTH);
        ctx.save(); ctx.translate(cx + Math.cos(a) * TR, cy + Math.sin(a) * TR); ctx.rotate(a); ctx.scale(m, m);
        const p = new Path2D(); rrect(p, -17, -5, 34, 10, 5);
        ctx.fillStyle = C.goldEdge; ctx.save(); ctx.translate(0, 2); ctx.fill(p); ctx.restore();
        ctx.fillStyle = C.gold; ctx.fill(p);
        ctx.restore();
      }
    }
    // the window, with its world
    scene(t, windAt.at(t));
    ctx.strokeStyle = revealed !== null && rk > 0.35 ? C.gold : C.line2; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, WR + 1, 0, TAU); ctx.stroke();
    // the knob
    const [kx, ky] = pointOf(v), ks = knob.at(t);
    const knobFill = kind ? fillCol : '#ffffff', knobEdge = kind === 'right' ? C.tealEdge : kind === 'wrong' ? C.pinkEdge : kind === 'close' ? C.goldEdge : C.chipEdge;
    ctx.save(); ctx.translate(kx, ky); ctx.scale(ks, ks);
    ctx.fillStyle = knobEdge; ctx.beginPath(); ctx.arc(0, 4, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = knobFill; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.fill();
    ctx.restore();
    // the reading, under the dial
    const ry = cy + PR + 44;
    const yours = `${Math.round(v)} km/h`;
    if (revealed === null) {
      chip(ctx, yours, cx, ry, { size: 26, padX: 18, padY: 9, kind: moved ? 'plain' : 'dark' });
    } else {
      const sh = clamp01((rk - 0.35) / 0.4);
      const gap = kind === 'right' ? 0 : lerp(0, 82, E.out(sh));
      chip(ctx, yours, cx - gap, ry, { size: 26, padX: 18, padY: 9, kind: kind === 'right' ? 'teal' : kind === 'close' ? 'gold' : 'pink' });
      if (kind !== 'right') chip(ctx, `${TRUTH} km/h`, cx + gap, ry, { size: 26, padX: 18, padY: 9, kind: 'gold', scale: E.spring(sh, 0.425) });
    }
  }

  return {
    render,
    answered: () => moved,
    check() {
      const d = Math.abs(value - TRUTH);
      const kind = d <= WITHIN ? 'right' : d <= CLOSE ? 'close' : 'wrong';
      const why = kind === 'right' ? 'Yes. From 119 km/h a storm is a hurricane; below that it\'s a tropical storm.'
        : kind === 'close' ? 'Close. Hurricane winds start at 119 km/h.'
        : value < TRUTH ? 'That\'s a gale. The wind has to reach 119 km/h before it\'s a hurricane.'
        : 'That\'s already a strong hurricane. They start at 119 km/h.';
      res = { kind, why };
      return res;
    },
    reveal(t) {
      revealed = t;
      knob.to(1, { t, ms: 300 });
      windAt.to(TRUTH, { t: t + 0.35, ms: 950, kind: 'inOut', from: value });
    },
    reset(t) {
      value = START; moved = false; revealed = null; res = null; lastTick = Math.round(START / 10);
      shown.set(START); windAt.set(START); knob.set(1);
    },
    ghost(attempt, G) {
      const to = attempt === 'wrong' ? 60 : 119;
      const at = v => { const [x, y] = pointOf(v); return [api.left + x, api.top + y]; };
      return G.drag(() => at(START), null, { ms: attempt === 'wrong' ? 550 : 800, path: k => at(lerp(START, to, k)) });
    },
  };
}
