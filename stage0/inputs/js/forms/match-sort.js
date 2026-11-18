// Match, as sorting. Two bins, each with a picture; drop each fact into the bin it belongs to, where it
// stacks with the others. Many things can go in one bin, so this suits "which kind is it" questions.
// On Check the right ones go green and the wrong ones hop across into the other bin.
import { C, E, Val, TAU, lerp, clamp01, rgba, font, rrect, disc } from '../kit.js';
import { storm } from '../art.js';

export const meta = {
  question: '<span class="key">Hurricane</span> or <span class="key">tornado</span>? Sort them.',
  revealMs: 1400,
};

const BINS = [{ id: 'h', text: 'Hurricane' }, { id: 't', text: 'Tornado' }];
const FACTS = [
  { id: 'fast', text: 'Fastest winds on Earth', goes: 't' },
  { id: 'days', text: 'Lasts for days', goes: 'h' },
  { id: 'hangs', text: 'Hangs from one storm cloud', goes: 't' },
];

// words on lines no wider than max
function wrap(ctx, text, max) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const tryLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(tryLine).width > max && line) { out.push(line); line = word; } else line = tryLine;
  }
  if (line) out.push(line);
  return out;
}

export function mount(api) {
  const { w, h } = api;
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx;
  const BW = (w - 12) / 2, PIC = 112, BH = PIC + 34 + 3 * 54 + 8;
  const binX = b => b * (BW + 12);
  const TW = BW, TH = 58, trayTop = BH + 20;
  const homes = [{ x: 0, y: trayTop }, { x: BW + 12, y: trayTop }, { x: (w - TW) / 2, y: trayTop + TH + 10 }];
  const slotIn = (b, k) => ({ x: binX(b) + 8, y: PIC + 34 + k * 54, w: BW - 16, h: 48 });

  const tiles = FACTS.map((f, j) => ({ ...f, j, bin: null, x: new Val(homes[j].x), y: new Val(homes[j].y), ww: new Val(TW), hh: new Val(TH), lift: new Val(0), held: false, hop: null }));
  let drag = null, revealed = null, res = null, hover = -1;

  const binAt = (x, y) => BINS.findIndex((_, b) => x >= binX(b) && x <= binX(b) + BW && y >= 0 && y <= BH + 10);
  const tileAt = (x, y) => [...tiles].reverse().find(p => x >= p.x.at() && x <= p.x.at() + p.ww.at() && y >= p.y.at() && y <= p.y.at() + p.hh.at());
  // lays each bin's stack out again, so a tile taken out leaves no gap
  function settle(t, ms = 420) {
    BINS.forEach((_, b) => {
      tiles.filter(p => p.bin === b && !p.held).sort((p, q) => p.order - q.order).forEach((p, k) => {
        const s = slotIn(b, k);
        p.x.to(s.x, { t, ms }); p.y.to(s.y, { t, ms }); p.ww.to(s.w, { t, ms }); p.hh.to(s.h, { t, ms });
      });
    });
    tiles.filter(p => p.bin === null && !p.held).forEach(p => {
      p.x.to(homes[p.j].x, { t, ms }); p.y.to(homes[p.j].y, { t, ms }); p.ww.to(TW, { t, ms }); p.hh.to(TH, { t, ms });
    });
  }
  let orderN = 0;

  api.track(cv.el, {
    down: q => {
      if (api.locked) return false;
      const x = q.x - api.left, y = q.y - api.top, p = tileAt(x, y);
      if (!p) return false;
      const t = api.now();
      drag = { p, ox: (x - p.x.at()) / p.ww.at(), oy: (y - p.y.at()) / p.hh.at() };
      p.held = true;
      if (p.bin !== null) { p.bin = null; settle(t); }
      p.ww.to(TW, { t, ms: 200, kind: 'out' }); p.hh.to(TH, { t, ms: 200, kind: 'out' });
      p.lift.to(1, { t, ms: 160, kind: 'out' });
      api.tick();
      api.changed();
    },
    move: q => {
      if (!drag) return;
      const x = q.x - api.left, y = q.y - api.top, p = drag.p;
      p.x.set(x - drag.ox * TW); p.y.set(y - drag.oy * TH);
      const b = binAt(x, y);
      if (b !== hover) { hover = b; if (b >= 0) api.tick(); }
    },
    up: q => {
      if (!drag) return;
      const t = api.now(), p = drag.p, x = q.x - api.left, y = q.y - api.top;
      drag = null; p.held = false; hover = -1;
      p.lift.to(0, { t, ms: 300 });
      const b = binAt(x, y);
      if (b >= 0) { p.bin = b; p.order = orderN++; api.tick(); }
      settle(t);
      api.changed();
    },
  });
  cv.el.style.touchAction = 'none';

  function tornado(cx, top, bottom, t) {
    // the cloud it hangs from
    ctx.fillStyle = '#5d66ad';
    const cl = new Path2D();
    for (let i = 0; i < 6; i++) disc(cl, cx - 62 + i * 25, top + 8 + (i % 2) * 5, 20 + (i % 3) * 3);
    ctx.save(); ctx.translate(0, 4); ctx.fill(cl); ctx.restore();
    ctx.fillStyle = '#8f98dc'; ctx.fill(cl);
    // the funnel, swaying, with bands winding down it
    const sway = k => Math.sin(t * 1.4 + k * 2.2) * 7 * k;
    const half = k => lerp(24, 4, Math.pow(k, 0.7));
    const f = new Path2D();
    const n = 20;
    for (let i = 0; i <= n; i++) { const k = i / n, y = lerp(top + 18, bottom - 6, k); i ? f.lineTo(cx + sway(k) - half(k), y) : f.moveTo(cx + sway(k) - half(k), y); }
    for (let i = n; i >= 0; i--) { const k = i / n, y = lerp(top + 18, bottom - 6, k); f.lineTo(cx + sway(k) + half(k), y); }
    f.closePath();
    ctx.fillStyle = '#dde4ff'; ctx.fill(f);
    ctx.save(); ctx.clip(f);
    ctx.strokeStyle = '#aebfff'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 7; i++) {
      const k = ((i / 7 + t * 0.9) % 1), y = lerp(top + 18, bottom - 6, k);
      ctx.beginPath(); ctx.moveTo(cx + sway(k) - half(k), y); ctx.quadraticCurveTo(cx + sway(k), y + 5, cx + sway(k) + half(k), y - 3); ctx.stroke();
    }
    ctx.restore();
    // dust where it touches down
    ctx.fillStyle = rgba('#c9a27a', 0.75);
    for (let i = 0; i < 5; i++) {
      const a = t * 3 + i * 1.3, r = 5 + (i % 3) * 2;
      ctx.beginPath(); ctx.arc(cx + sway(1) + Math.cos(a) * 16, bottom - 6 + Math.sin(a) * 3, r, 0, TAU); ctx.fill();
    }
  }

  const TONES = {
    idle: ['#1b2250', '#364090', '#2f3678'], on: ['#222a60', '#6fd6ff', '#1b8fd1'], right: ['#1d5f63', '#2bc4a4', '#127a85'],
    wrong: ['#5a2050', '#ee4b7a', '#8f1f44'], gold: ['#3a3150', '#ffc83d', '#c98a00'],
  };
  function render(t) {
    cv.clear();
    const rk = revealed === null ? 0 : t - revealed;
    // the bins
    BINS.forEach((b, i) => {
      const x = binX(i);
      const box = new Path2D(); rrect(box, x, 0, BW, BH, 22);
      ctx.save(); ctx.translate(0, 4); ctx.fillStyle = C.line; ctx.fill(box); ctx.restore();
      ctx.fillStyle = hover === i ? '#1c2458' : C.panel; ctx.fill(box);
      ctx.strokeStyle = hover === i ? C.sky : C.line2; ctx.lineWidth = 2; ctx.stroke(box);
      // the picture
      const pic = new Path2D(); rrect(pic, x + 6, 6, BW - 12, PIC - 6, 17);
      ctx.save(); ctx.clip(pic);
      if (b.id === 'h') {
        ctx.fillStyle = C.sea; ctx.fillRect(x, 0, BW, PIC);
        storm(ctx, x + BW / 2, PIC / 2 + 3, 30, { angle: -t * 0.7 });
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, PIC);
        g.addColorStop(0, '#2c2f70'); g.addColorStop(1, '#4b3f92');
        ctx.fillStyle = g; ctx.fillRect(x, 0, BW, PIC);
        ctx.fillStyle = C.teal; ctx.fillRect(x, PIC - 22, BW, 22);
        ctx.fillStyle = C.tealEdge; ctx.fillRect(x, PIC - 22, BW, 3);
        tornado(x + BW / 2, 4, PIC - 14, t);
      }
      ctx.restore();
      ctx.fillStyle = '#ffffff'; ctx.font = font(16); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.text, x + BW / 2, PIC + 16);
      // empty places in the bin
      for (let k = 0; k < 3; k++) {
        const s = slotIn(i, k), p = new Path2D(); rrect(p, s.x, s.y, s.w, s.h, 13);
        ctx.fillStyle = 'rgba(15,20,52,0.6)'; ctx.fill(p);
      }
    });
    // the tiles, the one in the hand on top
    const order = [...tiles].sort((a, b) => (a.held - b.held) || ((a.hop !== null) - (b.hop !== null)));
    for (const p of order) {
      let x = p.x.at(t), y = p.y.at(t);
      const ww = p.ww.at(t), hh = p.hh.at(t);
      let l = p.lift.at(t);
      if (p.hop !== null) {   // a hop across: up in an arc and down into its place
        const k = clamp01((t - p.hop - 0.45) / 0.5);
        y -= Math.sin(k * Math.PI) * 46;
        l = Math.sin(k * Math.PI);
      }
      let tone = p.held ? 'on' : p.bin !== null ? 'on' : 'idle';
      if (revealed !== null) tone = p.hop === null ? 'right' : t - p.hop < 0.75 ? 'wrong' : 'gold';
      const [fill, border, edge] = TONES[tone];
      const path = new Path2D(); rrect(path, x, y, ww, hh, 14);
      ctx.save();
      ctx.translate(x + ww / 2, y + hh / 2); ctx.rotate(l * -0.03); ctx.scale(1 + l * 0.04, 1 + l * 0.04); ctx.translate(-(x + ww / 2), -(y + hh / 2));
      if (l > 0.01) { ctx.fillStyle = rgba(C.shadow, 0.35 * l); ctx.save(); ctx.translate(4 * l, 12 * l); ctx.fill(path); ctx.restore(); }
      ctx.save(); ctx.translate(0, 4 * (1 - l)); ctx.fillStyle = edge; ctx.fill(path); ctx.restore();
      ctx.fillStyle = fill; ctx.fill(path);
      ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.stroke(path);
      const size = hh < 52 ? 13.5 : 14.5;
      ctx.font = font(size); ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lines = wrap(ctx, p.text, ww - 20);
      lines.forEach((ln, i) => ctx.fillText(ln, x + ww / 2, y + hh / 2 + (i - (lines.length - 1) / 2) * size * 1.15 + 1));
      ctx.restore();
    }
  }

  return {
    render,
    answered: () => tiles.every(p => p.bin !== null),
    check() {
      const ok = tiles.filter(p => BINS[p.bin].id === p.goes).length;
      const kind = ok === tiles.length ? 'right' : 'wrong';
      const why = kind === 'right' ? 'Yes. A tornado is tiny and brief but the fiercest; a hurricane is huge and slow.'
        : 'A tornado\'s winds are the fastest on Earth, over 400 km/h, but only for minutes.';
      res = { kind, why };
      return res;
    },
    reveal(t) {
      revealed = t;
      tiles.forEach(p => {
        const want = BINS.findIndex(b => b.id === p.goes);
        if (p.bin === want) return;
        p.hop = t;
        p.bin = want;
        p.order = orderN++;
      });
      // the stacks settle after the wrong ones have shown pink a moment
      BINS.forEach((_, b) => {
        tiles.filter(p => p.bin === b).sort((p, q) => p.order - q.order).forEach((p, k) => {
          const s = slotIn(b, k), at = t + (p.hop !== null ? 0.45 : 0.4);
          p.x.to(s.x, { t: at, ms: 500, kind: 'inOut' }); p.y.to(s.y, { t: at, ms: 500, kind: 'inOut' });
        });
      });
    },
    reset() {
      revealed = null; res = null; drag = null; hover = -1; orderN = 0;
      tiles.forEach(p => { p.bin = null; p.held = false; p.hop = null; p.x.set(homes[p.j].x); p.y.set(homes[p.j].y); p.ww.set(TW); p.hh.set(TH); p.lift.set(0); });
    },
    ghost(attempt, G) {
      const plan = attempt === 'wrong' ? { fast: 0, days: 0, hangs: 1 } : { fast: 1, days: 0, hangs: 1 };
      const steps = [];
      const filled = [0, 0];
      for (const id of ['fast', 'days', 'hangs']) {
        const p = tiles.find(q => q.id === id), b = plan[id], s = slotIn(b, filled[b]++);
        steps.push(...G.drag(G.pt(homes[p.j].x + TW / 2, homes[p.j].y + TH / 2), G.pt(s.x + s.w / 2, s.y + s.h / 2),
          attempt === 'wrong' ? { ms: 300, hold: 35, after: 35 } : { ms: 250, hold: 30, after: 30, moveMs: 230 }));
      }
      return steps;
    },
  };
}
