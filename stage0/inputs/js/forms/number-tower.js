// Number, as a height. Pull the top of a storm cloud up a scale that starts at the sea, beside Everest
// and a jet at cruising height, so the answer is set against things of known size. Hold your finger at
// the top and the scale stretches, so the top of the picture never gives the answer away. On Check the
// true cloud rises in gold beside yours.
import { C, E, Val, TAU, lerp, clamp01, mix, rgba, font, chip, disc, rrect, rng } from '../kit.js';

export const meta = {
  question: 'How high do the tallest clouds in a <span class="key">hurricane</span> reach?',
  revealMs: 1600,
};

const TRUTH = 15, WITHIN = 2, CLOSE = 5, START = 2, MAX0 = 20;

export function mount(api) {
  const { w, h } = api;
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx;
  const seaY = h - 46, topY = 30, X = 150;     // the cloud stands at X
  const scaleMax = new Val(MAX0);
  let value = START, moved = false, revealed = null, res = null, finger = null, lastT = null, lastTick = START;
  const grip = new Val(1);
  const stars = (() => { const r = rng(7); return Array.from({ length: 40 }, () => [r() * w, r() * (h * 0.55), 0.5 + r() * 1.2, r()]); })();

  const pxPerKm = () => (seaY - topY) / scaleMax.at();
  const yOf = km => seaY - km * pxPerKm();
  const kmAt = y => Math.max(0.5, Math.round(((seaY - y) / pxPerKm()) * 2) / 2);
  const setFromY = y => {
    const v = Math.min(400, kmAt(y));
    if (v !== value) {
      value = v;
      if (Math.floor(v) !== Math.floor(lastTick)) api.tick();
      lastTick = v;
      moved = true;
      api.changed();
    }
  };
  api.track(cv.el, {
    down: p => {
      if (api.locked) return false;
      finger = p.y - api.top;
      grip.to(1.15, { ms: 220, kind: 'out' });
      setFromY(finger);
    },
    move: p => { finger = p.y - api.top; setFromY(finger); },
    up: () => { finger = null; grip.to(1, { ms: 420 }); },
  });
  cv.el.style.touchAction = 'none';

  // A storm cloud from the sea up to `top`: a column with lumpy sides, a cauliflower top, and an anvil
  // spreading out flat once it's tall.
  function towerPath(top, x = X) {
    const H = seaY - top;
    const bw = Math.min(46, 20 + H * 0.1);                  // half width of the column
    const anvil = H > 70 ? Math.min(112, bw + (H - 70) * 0.3) : 0;
    const p = new Path2D();
    const colTop = anvil ? top + 14 : top + bw * 0.7;
    rrect(p, x - bw * 0.8, colTop, bw * 1.6, seaY - colTop + 4, bw * 0.6);
    const n = Math.max(2, Math.round((seaY - colTop) / (bw * 0.8)));
    for (let i = 0; i <= n; i++) {
      const y = lerp(seaY - bw * 0.35, colTop + bw * 0.3, i / n);
      disc(p, x - bw * 0.62, y, bw * (0.5 + 0.12 * Math.sin(i * 2.3)));
      disc(p, x + bw * 0.62, y + bw * 0.3, bw * (0.48 + 0.12 * Math.cos(i * 1.9)));
    }
    if (anvil) {
      p.moveTo(x - anvil * 0.5, top + 26);
      p.quadraticCurveTo(x - anvil * 0.68, top + 4, x - anvil * 0.3, top);
      p.lineTo(x + anvil * 0.92, top);
      p.quadraticCurveTo(x + anvil * 1.1, top + 10, x + anvil * 0.82, top + 22);
      p.quadraticCurveTo(x + bw, top + 18, x, top + 30);
      p.closePath();
    } else {
      disc(p, x, top + bw * 0.62, bw * 0.66);
      disc(p, x - bw * 0.45, top + bw * 0.85, bw * 0.5);
      disc(p, x + bw * 0.45, top + bw * 0.8, bw * 0.52);
    }
    return { p, bw };
  }
  function tower(top) {
    if (seaY - top < 2) return;
    const { p, bw } = towerPath(top);
    ctx.save(); ctx.translate(0, 4); ctx.fillStyle = C.cloudShade; ctx.fill(p); ctx.restore();
    ctx.fillStyle = '#ffffff'; ctx.fill(p);
    ctx.save(); ctx.clip(p); ctx.fillStyle = rgba('#c9d4ff', 0.6);
    ctx.fillRect(X + bw * 0.3, top - 10, 200, seaY - top + 20); ctx.restore();
  }
  // the true cloud: a gold silhouette with one outline round all of it, drawn behind yours
  const ghostCv = document.createElement('canvas');
  ghostCv.width = cv.el.width; ghostCv.height = cv.el.height;
  const gctx = ghostCv.getContext("2d");
  function truthTower(top, alpha) {
    if (seaY - top < 2 || alpha <= 0.01) return;
    const { p } = towerPath(top);
    gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.clearRect(0, 0, ghostCv.width, ghostCv.height);
    const k = cv.el.width / w;
    gctx.setTransform(k, 0, 0, k, 0, 0);
    gctx.globalCompositeOperation = 'source-over';
    gctx.strokeStyle = C.gold; gctx.lineWidth = 7; gctx.lineJoin = 'round'; gctx.stroke(p);
    gctx.globalCompositeOperation = "destination-out"; gctx.fillStyle = "#000"; gctx.fill(p);
    gctx.globalCompositeOperation = 'source-over'; gctx.fillStyle = 'rgba(255,255,255,0.13)'; gctx.fill(p);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha; ctx.drawImage(ghostCv, 0, 0); ctx.restore();
  }

  function render(t) {
    const dt = lastT === null ? 0 : Math.min(0.05, t - lastT);
    lastT = t;
    // held at the top: the scale stretches, and the value follows the finger on the new scale
    if (finger !== null && finger < topY + 34 && revealed === null) {
      scaleMax.set(scaleMax.at(t) * (1 + 1.1 * dt));
      setFromY(finger);
    }
    cv.clear();
    const R = 24;
    const frame = new Path2D(); rrect(frame, 1, 1, w - 2, h - 6, R);
    ctx.fillStyle = C.line; ctx.save(); ctx.translate(0, 4); ctx.fill(frame); ctx.restore();
    ctx.save(); ctx.clip(frame);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.stage0); g.addColorStop(1, C.stage1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (const [x, y, r, a] of stars) { ctx.fillStyle = rgba('#d6e2ff', 0.25 + 0.5 * a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

    const ppk = pxPerKm(), sm = scaleMax.at(t);
    // the scale up the left side
    const st = [1, 2, 5, 10, 20, 50, 100, 200].find(x => x * ppk >= 40) || 200;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = font(12);
    for (let km = st; km <= sm * 1.05; km += st) {
      const y = yOf(km);
      if (y < topY - 12) break;
      ctx.strokeStyle = rgba('#7f88c8', 0.14); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(52, y); ctx.lineTo(w - 10, y); ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.fillText(`${km} km`, 46, y);
    }
    // Everest, to scale
    const ev = yOf(8.85), base = seaY;
    const m = new Path2D();
    m.moveTo(w - 168, base); m.lineTo(w - 112, lerp(base, ev, 0.55)); m.lineTo(w - 96, lerp(base, ev, 0.62)); m.lineTo(w - 62, ev);
    m.lineTo(w - 40, lerp(base, ev, 0.8)); m.lineTo(w - 26, lerp(base, ev, 0.7)); m.lineTo(w + 10, base); m.closePath();
    ctx.fillStyle = '#2a2f78'; ctx.fill(m);
    ctx.save(); ctx.clip(m);
    ctx.fillStyle = '#3a3f96'; ctx.beginPath(); ctx.moveTo(w - 62, ev); ctx.lineTo(w + 20, base); ctx.lineTo(w - 62, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#dde4ff'; ctx.fillRect(w - 200, ev - 2, 220, Math.max(6, (base - ev) * 0.13));
    ctx.restore();
    // a jet at cruising height, 11 km
    const jy = yOf(11) + Math.sin(t * 1.6) * 1.5, jx = w - 92;
    ctx.save(); ctx.translate(jx, jy);
    ctx.fillStyle = '#dde4ff';
    const body = new Path2D(); rrect(body, -22, -3.5, 44, 7, 3.5); ctx.fill(body);
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-12, 13); ctx.lineTo(-6, 13); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-17, -1); ctx.lineTo(-24, -10); ctx.lineTo(-19, -10); ctx.lineTo(-12, -1); ctx.closePath(); ctx.fill();
    ctx.restore();

    // the sea
    ctx.fillStyle = C.sea;
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) ctx.lineTo(x, seaY + Math.sin(x * 0.07 + t * 1.4) * 2.2);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba('#6fd6ff', 0.35); ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = 0; x <= w; x += 6) ctx.lineTo(x, seaY + Math.sin(x * 0.07 + t * 1.4) * 2.2); ctx.stroke();

    const kind = res ? res.kind : null;
    const rk = revealed === null ? 0 : t - revealed;
    // the truth rises in gold behind your cloud, then your cloud on top
    const top = yOf(value);
    if (revealed !== null && kind !== 'right') {
      const k = E.spring(clamp01((rk - 0.2) / 0.7), 0.425);
      truthTower(lerp(seaY, yOf(TRUTH), k), clamp01(rk / 0.2));
    }
    tower(top);
    if (revealed !== null) {
      const lk = clamp01((rk - 0.6) / 0.3);
      if (lk > 0 && kind !== 'right') {
        ctx.strokeStyle = rgba(C.gold, 0.7 * lk); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(52, yOf(TRUTH)); ctx.lineTo(w - 10, yOf(TRUTH)); ctx.stroke();
      }
    }
    // the labels for the things of known size go on top of everything
    chip(ctx, 'Everest', w - 62, ev - 16, { kind: 'dark', size: 11.5, padX: 7, padY: 4 });
    chip(ctx, 'Jets', jx - 28, jy, { kind: 'dark', size: 11.5, padX: 7, padY: 4, align: 'right' });
    ctx.restore();   // out of the frame's clip
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke(frame);

    // the handle on the cloud's top, and the reading beside it
    const gs = grip.at(t), col = kind === 'right' ? C.teal : kind === 'wrong' ? C.pink : kind === 'close' ? C.gold : '#ffffff';
    const edge = kind === 'right' ? C.tealEdge : kind === 'wrong' ? C.pinkEdge : kind === 'close' ? C.goldEdge : C.chipEdge;
    ctx.save(); ctx.translate(X, top); ctx.scale(gs, gs);
    const hp = new Path2D(); rrect(hp, -16, -21, 32, 42, 16);
    ctx.fillStyle = edge; ctx.save(); ctx.translate(0, 4); ctx.fill(hp); ctx.restore();
    ctx.fillStyle = col; ctx.fill(hp);
    ctx.strokeStyle = kind && kind !== 'close' ? '#ffffff' : C.navy; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(0, -11); ctx.lineTo(6, -5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(0, 11); ctx.lineTo(6, 5); ctx.stroke();
    ctx.restore();
    const label = `${value % 1 ? value.toFixed(1) : value} km`;
    chip(ctx, label, X + 26, top, { size: 18, align: 'left', kind: kind === 'right' ? 'teal' : kind === 'wrong' ? 'pink' : kind === 'close' ? 'gold' : moved ? 'plain' : 'dark' });
    if (revealed !== null && kind !== 'right') {
      const s = E.spring(clamp01((rk - 0.6) / 0.45), 0.425);
      chip(ctx, `${TRUTH} km`, X + 26, yOf(TRUTH), { size: 18, align: 'left', kind: 'gold', scale: s });
    }
  }

  return {
    render,
    answered: () => moved,
    check() {
      const d = value - TRUTH;
      const kind = Math.abs(d) <= WITHIN ? 'right' : Math.abs(d) <= CLOSE ? 'close' : 'wrong';
      const why = kind === 'right' ? 'Yes, about 15 km: higher than jets fly, which is why planes steer around them.'
        : kind === 'close' ? 'Close. The tallest reach about 15 km up.'
        : d < 0 ? 'Much higher. They tower to about 15 km, past Everest and above where jets fly.'
        : 'Not that high. At about 15 km the air stops rising, and the cloud spreads out flat.';
      res = { kind, why };
      return res;
    },
    reveal(t) {
      revealed = t;
      const need = Math.max(value, TRUTH) * 1.18;
      if (need > scaleMax.at(t) || scaleMax.at(t) > need * 2.2) scaleMax.to(Math.max(MAX0, need), { t, ms: 600, kind: 'inOut' });
    },
    reset() { value = START; moved = false; revealed = null; res = null; finger = null; lastTick = START; scaleMax.set(MAX0); grip.set(1); },
    ghost(attempt, G) {
      const at = km => [api.left + X, api.top + yOf(km)];
      if (attempt === 'wrong') return G.drag(() => at(START), null, { ms: 500, path: k => at(lerp(START, 6, k)) });
      // up past the top, a moment held there so the scale stretches, then back down to 15 km on the new scale
      let y0 = null;
      return [{ move: () => at(START) }, { down: true }, { wait: 60 },
        { drag: k => [api.left + X, lerp(api.top + yOf(START), api.top + topY + 12, k)], ms: 520 },
        { wait: 420 },
        { drag: k => { if (y0 === null) y0 = api.top + topY + 12; return [api.left + X, lerp(y0, api.top + yOf(TRUTH), k)]; }, ms: 420 },
        { wait: 60 }, { up: true }];
    },
  };
}
