// Number, as a pile. Drag the level up and storms pile into the box, five to a row, so the answer is a
// count you can see at a glance. On Check a gold line drops in at the true number: storms above it fade
// out as ones that didn't happen, and missing ones fill in gold.
import { C, E, Val, TAU, lerp, clamp01, rgba, font, chip, rrect } from '../kit.js';
import { storm } from '../art.js';

export const meta = {
  question: 'How many <span class="key">hurricanes</span> does the Atlantic get in a typical year?',
  revealMs: 1700,
};

const TRUTH = 7, WITHIN = 1, CLOSE = 3, START = 1, COLS = 5, ROWS = 8, MAXN = COLS * ROWS;

export function mount(api) {
  const { w, h } = api;
  const cv = api.canvas(api.el, w, h);
  const ctx = cv.ctx;
  const padX = 38, padR = 58, padTop = 22, bottom = h - 26;
  const rowH = (bottom - padTop) / ROWS, colW = (w - padX - padR) / COLS;
  let count = START, moved = false, revealed = null, res = null;
  const born = new Array(MAXN).fill(-9), gone = new Array(MAXN).fill(-9);
  born[0] = -9;
  const grip = new Val(1), level = new Val(START);

  const slot = i => [padX + colW * (i % COLS) + colW / 2, bottom - rowH * Math.floor(i / COLS) - rowH / 2];
  const levelY = n => bottom - (n / COLS) * rowH;
  const countAt = y => Math.max(0, Math.min(MAXN, Math.round(((bottom - y) / rowH) * COLS)));
  const setCount = (n, t) => {
    if (n === count) return;
    for (let i = count; i < n; i++) born[i] = t;
    for (let i = n; i < count; i++) gone[i] = t;
    count = n;
    level.to(n, { t, ms: 260, kind: 'out' });
    api.tick();
    moved = true;
    api.changed();
  };
  api.track(cv.el, {
    down: p => { if (api.locked) return false; grip.to(1.15, { ms: 220, kind: 'out' }); setCount(countAt(p.y - api.top), api.now()); },
    move: p => setCount(countAt(p.y - api.top), api.now()),
    up: () => grip.to(1, { ms: 420 }),
  });
  cv.el.style.touchAction = 'none';

  function render(t) {
    cv.clear();
    const frame = new Path2D(); rrect(frame, 1, 1, w - 2, h - 6, 24);
    ctx.fillStyle = C.line; ctx.save(); ctx.translate(0, 4); ctx.fill(frame); ctx.restore();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, C.stage0); g.addColorStop(1, C.stage1);
    ctx.fillStyle = g; ctx.fill(frame);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke(frame);
    // faint rows, so the pile reads as fives
    ctx.font = font(12); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let r = 1; r <= ROWS; r++) {
      ctx.strokeStyle = 'rgba(127,136,200,0.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padX - 4, bottom - r * rowH); ctx.lineTo(w - padR + 4, bottom - r * rowH); ctx.stroke();
      ctx.fillStyle = C.dim; ctx.fillText(String(r * COLS), padX - 10, bottom - r * rowH);
    }
    const kind = res ? res.kind : null, rk = revealed === null ? 0 : t - revealed;

    // the storms
    for (let i = 0; i < MAXN; i++) {
      const [x, y] = slot(i);
      const inPile = i < count;
      let s = inPile ? E.spring(clamp01((t - born[i]) / 0.42), 0.425) : 1 - E.out(clamp01((t - gone[i]) / 0.18));
      if (s <= 0.01) {
        // a storm you left out, filling in gold
        if (revealed !== null && i < TRUTH && i >= count) {
          const k = E.spring(clamp01((rk - 0.45 - (i - count) * 0.07) / 0.45), 0.425);
          if (k > 0.01) {
            ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
            ctx.fillStyle = rgba(C.gold, 0.25); ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, 19, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.restore();
          }
        }
        continue;
      }
      // storms above the truth fade, from the top down, once the answer is shown
      let a = 1;
      if (revealed !== null && i >= TRUTH && inPile) {
        const k = clamp01((rk - 0.45 - (count - 1 - i) * 0.035) / 0.3);
        a = lerp(1, 0.22, k);
        s *= lerp(1, 0.8, k);
      }
      storm(ctx, x, y, 17 * s, { angle: -t * 0.9 + i * 0.7, shadow: a > 0.9, alpha: a });
    }

    // the level, with its handle on the right
    const ly = levelY(level.at(t));
    const col = kind === 'right' ? C.teal : kind === 'wrong' ? C.pink : kind === 'close' ? C.gold : '#ffffff';
    const edge = kind === 'right' ? C.tealEdge : kind === 'wrong' ? C.pinkEdge : kind === 'close' ? C.goldEdge : C.chipEdge;
    ctx.strokeStyle = rgba(col, 0.75); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(padX - 4, ly); ctx.lineTo(w - padR + 4, ly); ctx.stroke();
    const hx = w - padR / 2 - 2, gs = grip.at(t);
    ctx.save(); ctx.translate(hx, ly); ctx.scale(gs, gs);
    const hp = new Path2D(); rrect(hp, -16, -21, 32, 42, 16);
    ctx.fillStyle = edge; ctx.save(); ctx.translate(0, 4); ctx.fill(hp); ctx.restore();
    ctx.fillStyle = col; ctx.fill(hp);
    ctx.strokeStyle = kind && kind !== 'close' ? '#ffffff' : C.navy; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(0, -11); ctx.lineTo(6, -5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(0, 11); ctx.lineTo(6, 5); ctx.stroke();
    ctx.restore();
    // the count, riding just above the level
    const ck = kind === 'right' ? 'teal' : kind === 'wrong' ? 'pink' : kind === 'close' ? 'gold' : moved ? 'plain' : 'dark';
    const below = revealed !== null && kind !== 'right' && count < TRUTH;   // keep clear of the gold one
    chip(ctx, String(count), hx, below ? ly + 48 : Math.max(22, ly - 46), { size: 22, kind: ck, padX: 12, padY: 7 });
    // the truth's gold line
    if (revealed !== null && kind !== 'right') {
      const k = clamp01((rk - 0.25) / 0.3);
      const ty = levelY(TRUTH);
      ctx.strokeStyle = rgba(C.gold, k); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(padX - 4, ty); ctx.lineTo(lerp(padX - 4, w - padR + 4, E.out(k)), ty); ctx.stroke();
      chip(ctx, String(TRUTH), hx, count > TRUTH ? ty + 32 : ty - 32, { size: 22, kind: 'gold', padX: 12, padY: 7, scale: E.spring(clamp01((rk - 0.45) / 0.45), 0.425) });
    }
  }

  return {
    render,
    answered: () => moved,
    check() {
      const d = count - TRUTH;
      const kind = Math.abs(d) <= WITHIN ? 'right' : Math.abs(d) <= CLOSE ? 'close' : 'wrong';
      const why = kind === 'right' ? 'Yes, about 7. Around 14 storms a year get a name, and half become hurricanes.'
        : kind === 'close' ? 'Close. A typical year has about 7.'
        : d > 0 ? 'Fewer. About 14 storms a year get a name, and only half become hurricanes.'
        : 'More. A typical year has about 7, and a busy one over 10.';
      res = { kind, why };
      return res;
    },
    reveal(t) { revealed = t; },
    reset(t) { count = START; moved = false; revealed = null; res = null; born.fill(-9); gone.fill(-9); level.set(START); grip.set(1); },
    ghost(attempt, G) {
      const at = n => [api.left + w - padR / 2 - 2, api.top + levelY(n)];
      const to = attempt === 'wrong' ? 20 : TRUTH;
      return G.drag(() => at(START), null, { ms: attempt === 'wrong' ? 620 : 480, path: k => at(lerp(START, to, k)) });
    },
  };
}
